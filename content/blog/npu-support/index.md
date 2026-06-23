---
title: "Ascend NPU Support: Fused Operators and Flash Linear Attention"
date: 2026-06-05
tags:
  - NPU
  - Ascend
  - Domestic Hardware
  - Kernel Optimization
  - MoE
categories:
  - Technical Deep Dive
---

Twinkle provides first-class support for **Huawei Ascend NPU** through a comprehensive monkey-patching system that replaces standard CUDA operators with NPU-optimized fused kernels. This post covers the kernel architecture and the optimizations enabled.

<!--more-->

## Kernel Architecture

Twinkle's kernel module (`twinkle.kernel`) provides a unified entry point `kernelize_model()` that automatically detects the device and applies appropriate optimizations:

```python
from twinkle.kernel import kernelize_model
model = kernelize_model(model, device='npu')  # or auto-detected
```

On NPU devices, the following fused operators are applied **unconditionally**:

| Operator | NPU Implementation | Benefit |
|----------|-------------------|---------|
| RMSNorm | `torch_npu.npu_rms_norm` | Fused normalization, ~2x faster |
| RoPE | `torch_npu.npu_rotary_mul` | Fused rotary embedding with partial RoPE support |
| SwiGLU | `torch_npu.npu_swiglu` | Fused gate+up projection activation |
| SDPA | NPU-compatible `scaled_dot_product_attention` | Correct mask handling for NPU |
| MoE GMM | `torch_npu.npu_grouped_matmul` | EP-aware grouped matrix multiply |
| FLA | MindSpeed Triton backend | Flash Linear Attention for Qwen3.5 |

## Fused Operators in Detail

### RMSNorm with Residual Parameterization

Twinkle's `NpuRMSNorm` detects the **residual parameterization** pattern used by Qwen3.5 (where `scale = 1.0 + weight`) at initialization time, avoiding CPU-synchronizing `Tensor.item()` calls in the hot path:

```python
class NpuRMSNorm(nn.Module):
    def __init__(self, hidden_size, eps=1e-6):
        self.weight = nn.Parameter(torch.ones(hidden_size))
        # Detect once at init
        self._residual_param = abs(self.weight.data.mean().item()) < 0.3

    def forward(self, hidden_states):
        scale = (1.0 + self.weight) if self._residual_param else self.weight
        return torch_npu.npu_rms_norm(hidden_states, scale, epsilon=self.eps)[0]
```

### EP-Aware MoE Optimization

The MoE grouped matmul patch is **EP-aware** — it only activates when Expert Parallelism is enabled (each rank holds a subset of experts, weights are small and contiguous). Without EP, each rank holds **all** experts, and the transpose+contiguous copy creates ~8x overhead:

```
TWINKLE_NPU_GMM_PATCH not set → skip (default safe)
TWINKLE_NPU_GMM_PATCH=1 + EP enabled  → apply (efficient)
TWINKLE_NPU_GMM_PATCH=1 + EP disabled → skip (avoid 8x overhead)
```

The `GmmFunction` autograd function wraps `torch_npu.npu_grouped_matmul` with full backward support, and weights are cached with automatic invalidation when updated (full-param training bumps `_version`, LoRA keeps it stable).

### Flash Linear Attention for Qwen3.5

Qwen3.5 introduces a hybrid architecture mixing standard attention with linear attention layers. Twinkle enables the **FLA fast path** on NPU via MindSpeed's Triton implementation of `chunk_gated_delta_rule`:

1. Force `is_flash_linear_attention_available = True` in transformers
2. Replace `chunk_gated_delta_rule` with MindSpeed NPU-compatible implementation
3. Traverse instantiated model to patch per-layer instances
4. Disable CUDA-only `FusedRMSNormGated` that would fail on NPU

The MindSpeed implementation provides chunked forward/backward with WY representation, supporting variable-length sequences via `cu_seqlens`.

## Environment Variable Control

Every optimization is independently controllable:

| Variable | Default | Description |
|----------|---------|-------------|
| `TWINKLE_NPU_PATCH` | `1` | Master switch for all NPU patches |
| `TWINKLE_NPU_FUSED_OPS` | `1` | Fused operators (RMSNorm/RoPE/SwiGLU/SDPA) |
| `TWINKLE_NPU_GMM_PATCH` | unset | MoE grouped matmul (EP-aware) |
| `TWINKLE_NPU_FLA` | `1` | Flash Linear Attention |
| `TWINKLE_NPU_GATED_RMSNorm_FP32` | `0` | Force FP32 for Gated RMSNorm |

## Supported Model Families

The patching system automatically discovers and patches compatible model families:

- **Qwen3** / **Qwen3-MoE** — Full operator fusion
- **Qwen3.5** / **Qwen3.5-MoE** — Full fusion + FLA + Gated RMSNorm
- **Qwen2.5-VL** — Full fusion + multimodal RoPE
- **Dynamic discovery** — Unknown models are scanned for compatible RMSNorm/RoPE/SwiGLU patterns

## Getting Started

```bash
# Install NPU dependencies
pip install torch-npu mindspeed

# Training automatically uses NPU optimizations
CUDA_VISIBLE_DEVICES=0,1,2,3 torchrun --nproc_per_node=4 train.py
```

See the [NPU Support Guide](/docs/guide/npu-support/) for detailed setup instructions.
