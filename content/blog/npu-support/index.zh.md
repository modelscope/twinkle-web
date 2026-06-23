---
title: "昇腾 NPU 支持：融合算子与 Flash Linear Attention"
date: 2026-06-05
tags:
  - NPU
  - 昇腾
  - 国产硬件
  - Kernel 优化
  - MoE
categories:
  - 技术深度解析
---

Twinkle 通过全面的 monkey-patching 系统为**华为昇腾 NPU** 提供一等公民级别的支持，自动将标准 CUDA 算子替换为 NPU 优化的融合算子。本文介绍 kernel 架构与各项优化细节。

<!--more-->

## Kernel 架构

Twinkle 的 kernel 模块（`twinkle.kernel`）提供统一入口 `kernelize_model()`，自动检测设备类型并应用对应优化：

```python
from twinkle.kernel import kernelize_model
model = kernelize_model(model, device='npu')  # 或自动检测
```

在 NPU 设备上，以下融合算子会被**无条件应用**：

| 算子 | NPU 实现 | 收益 |
|------|---------|------|
| RMSNorm | `torch_npu.npu_rms_norm` | 融合归一化，~2x 加速 |
| RoPE | `torch_npu.npu_rotary_mul` | 融合旋转嵌入，支持部分 RoPE |
| SwiGLU | `torch_npu.npu_swiglu` | 融合 gate+up 激活 |
| SDPA | NPU 兼容的 `scaled_dot_product_attention` | NPU 正确的 mask 处理 |
| MoE GMM | `torch_npu.npu_grouped_matmul` | EP 感知的分组矩阵乘 |
| FLA | MindSpeed Triton 后端 | Qwen3.5 Flash Linear Attention |

## 融合算子详解

### 带残差参数化的 RMSNorm

Twinkle 的 `NpuRMSNorm` 在初始化时即检测 Qwen3.5 使用的**残差参数化**模式（`scale = 1.0 + weight`），避免在热路径中执行 CPU 同步的 `Tensor.item()` 调用：

```python
class NpuRMSNorm(nn.Module):
    def __init__(self, hidden_size, eps=1e-6):
        self.weight = nn.Parameter(torch.ones(hidden_size))
        # 初始化时一次性检测
        self._residual_param = abs(self.weight.data.mean().item()) < 0.3

    def forward(self, hidden_states):
        scale = (1.0 + self.weight) if self._residual_param else self.weight
        return torch_npu.npu_rms_norm(hidden_states, scale, epsilon=self.eps)[0]
```

### EP 感知的 MoE 优化

MoE 分组矩阵乘 patch 是 **EP 感知**的——仅在开启 Expert Parallelism 时激活（每个 rank 持有部分专家，权重小且连续）。未开启 EP 时，每个 rank 持有**所有**专家，转置+连续化拷贝会产生约 ~8x 开销：

```
TWINKLE_NPU_GMM_PATCH 未设置 → 跳过（默认安全）
TWINKLE_NPU_GMM_PATCH=1 + EP 开启  → 应用（高效）
TWINKLE_NPU_GMM_PATCH=1 + EP 未开启 → 跳过（避免 8x 开销）
```

`GmmFunction` 自定义 autograd function 封装了 `torch_npu.npu_grouped_matmul`，支持完整的反向传播。权重通过 `_version` 自动缓存失效检测（全参训练时 `_version` 递增，LoRA 模式下保持不变）。

### Qwen3.5 Flash Linear Attention

Qwen3.5 引入了标准注意力与线性注意力层的混合架构。Twinkle 通过 MindSpeed 的 Triton 实现在 NPU 上启用 **FLA 快速路径**（`chunk_gated_delta_rule`）：

1. 强制设置 `is_flash_linear_attention_available = True`
2. 将 `chunk_gated_delta_rule` 替换为 MindSpeed NPU 兼容实现
3. 遍历已实例化模型，逐层 patch
4. 禁用在 NPU 上会失败的 CUDA-only `FusedRMSNormGated`

MindSpeed 实现提供分块 forward/backward（WY 表示），支持通过 `cu_seqlens` 处理变长序列。

## 环境变量控制

每项优化均可独立控制：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TWINKLE_NPU_PATCH` | `1` | 所有 NPU patch 的主开关 |
| `TWINKLE_NPU_FUSED_OPS` | `1` | 融合算子（RMSNorm/RoPE/SwiGLU/SDPA） |
| `TWINKLE_NPU_GMM_PATCH` | 未设置 | MoE 分组矩阵乘（EP 感知） |
| `TWINKLE_NPU_FLA` | `1` | Flash Linear Attention |
| `TWINKLE_NPU_GATED_RMSNorm_FP32` | `0` | 强制 Gated RMSNorm 使用 FP32 |

## 支持的模型系列

Patching 系统会自动发现并 patch 兼容的模型系列：

- **Qwen3** / **Qwen3-MoE** — 完整算子融合
- **Qwen3.5** / **Qwen3.5-MoE** — 完整融合 + FLA + Gated RMSNorm
- **Qwen2.5-VL** — 完整融合 + 多模态 RoPE
- **动态发现** — 未知模型会被扫描检测兼容的 RMSNorm/RoPE/SwiGLU 模式

## 快速开始

```bash
# 安装 NPU 依赖
pip install torch-npu mindspeed

# 训练时自动启用 NPU 优化
CUDA_VISIBLE_DEVICES=0,1,2,3 torchrun --nproc_per_node=4 train.py
```

更多详情请参阅 [NPU 支持指南](/docs/guide/npu-support/)。
