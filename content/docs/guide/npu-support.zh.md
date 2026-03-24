---
title: NPU 支持
weight: 6
---

Twinkle 支持华为昇腾 NPU 进行训练。本指南介绍 NPU 环境下的安装和使用方法。

## 环境要求

| 组件 | 版本 | 备注 |
|------|------|------|
| Python | >= 3.11, < 3.13 | 推荐 3.11 |
| 昇腾 HDK | 最新版 | 硬件驱动和固件 |
| CANN Toolkit | 8.3.RC1+ | 约 10GB 磁盘空间 |
| PyTorch | 2.7.1 | 必须与 torch_npu 一致 |
| torch_npu | 2.7.1 | 必须与 PyTorch 一致 |

{{% callout type="warning" %}}
torch 和 torch_npu 版本**必须完全一致**（例如都是 2.7.1）
{{% /callout %}}

## 支持的硬件

- 昇腾 910 系列
- 其他兼容的昇腾加速卡

## 安装

{{% steps %}}

### 安装 NPU 环境

按照 [torch_npu 官方安装指南](https://gitcode.com/Ascend/pytorch/overview) 安装：
- 昇腾驱动（HDK）
- CANN 工具包
- PyTorch 和 torch_npu

### 安装 Twinkle

```bash
git clone https://github.com/modelscope/twinkle.git
cd twinkle
pip install -e ".[transformers,ray]"
```

### 安装 vLLM（可选）

用于 vLLMSampler 支持：

```bash
pip install vllm==0.11.0
pip install vllm-ascend==0.11.0rc3
```

{{% callout type="info" %}}
按上述顺序安装，忽略依赖冲突警告。安装前先激活 CANN：`source /usr/local/Ascend/ascend-toolkit/set_env.sh`
{{% /callout %}}

### 验证安装

```python
import torch
import torch_npu

print(f"PyTorch version: {torch.__version__}")
print(f"torch_npu version: {torch_npu.__version__}")
print(f"NPU available: {torch.npu.is_available()}")
print(f"NPU device count: {torch.npu.device_count()}")

if torch.npu.is_available():
    x = torch.randn(3, 3).npu()
    y = torch.randn(3, 3).npu()
    z = x + y
    print(f"NPU computation test passed: {z.shape}")
```

{{% /steps %}}

## 快速开始示例

### SFT LoRA 微调（4 卡 DP+FSDP）

**示例**：[cookbook/transformers/fsdp2.py](https://github.com/modelscope/twinkle/blob/main/cookbook/transformers/fsdp2.py)

```bash
export ASCEND_RT_VISIBLE_DEVICES=0,1,2,3
python cookbook/transformers/fsdp2.py
```

### GRPO 强化学习（8 卡）

**示例**：[cookbook/rl/grpo.py](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/grpo.py)

```bash
export ASCEND_RT_VISIBLE_DEVICES=0,1,2,3,4,5,6,7
python cookbook/rl/grpo.py
```

### DP + FSDP 配置

```python
import numpy as np
from twinkle import DeviceMesh

# 4 卡：DP=2, FSDP=2
device_mesh = DeviceMesh(
    device_type='npu',
    mesh=np.array([[0, 1], [2, 3]]),
    mesh_dim_names=('dp', 'fsdp')
)
```

## 并行策略支持

| 策略 | 说明 | NPU 支持 | 状态 |
|------|------|----------|------|
| DP | 数据并行 | ✅ | 已验证 |
| FSDP | 全分片数据并行 | ✅ | 已验证 |
| TP | 张量并行（Megatron） | 🚧 | 待验证 |
| PP | 流水线并行（Megatron） | 🚧 | 待验证 |
| CP | 上下文并行 | 🚧 | 待验证 |
| EP | 专家并行（MoE） | 🚧 | 待验证 |

## 功能支持矩阵

| 功能 | GPU | NPU | 示例 | 备注 |
|------|-----|-----|------|------|
| SFT + LoRA | ✅ | ✅ | cookbook/transformers/fsdp2.py | 已验证 |
| GRPO | ✅ | ✅ | cookbook/rl/grpo.py | 已验证 |
| DP 并行 | ✅ | ✅ | cookbook/transformers/fsdp2.py | 已验证 |
| FSDP 并行 | ✅ | ✅ | cookbook/transformers/fsdp2.py | 已验证 |
| Ray 分布式 | ✅ | ✅ | cookbook/transformers/fsdp2.py | 已验证 |
| TorchSampler | ✅ | ✅ | cookbook/rl/grpo.py | 已验证 |
| vLLMSampler | ✅ | ✅ | cookbook/rl/grpo.py | 已验证 |
| 全参数微调 | ✅ | 🚧 | - | 待验证 |
| QLoRA | ✅ | ❌ | - | 量化不支持 |
| DPO | ✅ | 🚧 | - | 待验证 |
| Megatron TP/PP | ✅ | 🚧 | - | 待验证 |
| Flash Attention | ✅ | ⚠️ | - | 部分算子不支持 |

**图例**：✅ 已验证 | 🚧 待验证 | ⚠️ 部分支持 | ❌ 不支持

## 常见问题

### torch_npu 版本不匹配

```bash
# 检查版本
python -c "import torch; import torch_npu; print(torch.__version__, torch_npu.__version__)"

# 重新安装匹配版本
pip uninstall torch torch_npu -y
pip install torch==2.7.1
pip install torch_npu-2.7.1-cp311-cp311-linux_aarch64.whl
```

### CANN 兼容性

查看 [昇腾社区版本兼容表](https://www.hiascend.com/document/detail/zh/CANNCommunityEdition/80RC1alpha002/softwareinstall/instg/atlasdeploy_03_0015.html)

### 调试日志

```bash
export ASCEND_GLOBAL_LOG_LEVEL=1
python your_script.py
```

## 参考资源

- [昇腾社区](https://www.hiascend.com/)
- [CANN 安装指南](https://www.hiascend.com/document/detail/zh/CANNCommunityEdition/80RC1alpha002/softwareinstall/instg/atlasdeploy_03_0001.html)
- [torch_npu GitHub](https://github.com/Ascend/pytorch)
- [Twinkle GitHub](https://github.com/modelscope/twinkle)
