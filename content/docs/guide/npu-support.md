---
title: NPU Support
weight: 6
---

Twinkle supports Huawei Ascend NPU for training. This guide covers installation and usage in NPU environments.

## Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| Python | >= 3.11, < 3.13 | 3.11 recommended |
| Ascend HDK | Latest | Hardware driver and firmware |
| CANN Toolkit | 8.3.RC1+ | ~10GB disk space |
| PyTorch | 2.7.1 | Must match torch_npu |
| torch_npu | 2.7.1 | Must match PyTorch |

{{% callout type="warning" %}}
torch and torch_npu versions **must be exactly the same** (e.g., both 2.7.1)
{{% /callout %}}

## Supported Hardware

- Ascend 910 series
- Other compatible Ascend accelerator cards

## Installation

{{% steps %}}

### Install NPU Environment

Follow the [torch_npu Official Installation Guide](https://gitcode.com/Ascend/pytorch/overview) to install:
- Ascend driver (HDK)
- CANN toolkit
- PyTorch and torch_npu

### Install Twinkle

```bash
git clone https://github.com/modelscope/twinkle.git
cd twinkle
pip install -e ".[transformers,ray]"
```

### Install vLLM (Optional)

For vLLMSampler support:

```bash
pip install vllm==0.11.0
pip install vllm-ascend==0.11.0rc3
```

{{% callout type="info" %}}
Install in order above, ignoring dependency conflict warnings. Activate CANN first: `source /usr/local/Ascend/ascend-toolkit/set_env.sh`
{{% /callout %}}

### Verify Installation

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

## Quick Start Examples

### SFT LoRA Fine-tuning (4-card DP+FSDP)

**Example**: [cookbook/transformers/fsdp2.py](https://github.com/modelscope/twinkle/blob/main/cookbook/transformers/fsdp2.py)

```bash
export ASCEND_RT_VISIBLE_DEVICES=0,1,2,3
python cookbook/transformers/fsdp2.py
```

### GRPO Reinforcement Learning (8-card)

**Example**: [cookbook/rl/grpo.py](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/grpo.py)

```bash
export ASCEND_RT_VISIBLE_DEVICES=0,1,2,3,4,5,6,7
python cookbook/rl/grpo.py
```

### DP + FSDP Configuration

```python
import numpy as np
from twinkle import DeviceMesh

# 4 cards: DP=2, FSDP=2
device_mesh = DeviceMesh(
    device_type='npu',
    mesh=np.array([[0, 1], [2, 3]]),
    mesh_dim_names=('dp', 'fsdp')
)
```

## Parallelization Support

| Strategy | Description | NPU Support | Status |
|----------|-------------|-------------|--------|
| DP | Data Parallel | ✅ | Verified |
| FSDP | Fully Sharded Data Parallel | ✅ | Verified |
| TP | Tensor Parallel (Megatron) | 🚧 | To be verified |
| PP | Pipeline Parallel (Megatron) | 🚧 | To be verified |
| CP | Context Parallel | 🚧 | To be verified |
| EP | Expert Parallel (MoE) | 🚧 | To be verified |

## Feature Support Matrix

| Feature | GPU | NPU | Example | Notes |
|---------|-----|-----|---------|-------|
| SFT + LoRA | ✅ | ✅ | cookbook/transformers/fsdp2.py | Verified |
| GRPO | ✅ | ✅ | cookbook/rl/grpo.py | Verified |
| DP Parallelism | ✅ | ✅ | cookbook/transformers/fsdp2.py | Verified |
| FSDP Parallelism | ✅ | ✅ | cookbook/transformers/fsdp2.py | Verified |
| Ray Distributed | ✅ | ✅ | cookbook/transformers/fsdp2.py | Verified |
| TorchSampler | ✅ | ✅ | cookbook/rl/grpo.py | Verified |
| vLLMSampler | ✅ | ✅ | cookbook/rl/grpo.py | Verified |
| Full Fine-tuning | ✅ | 🚧 | - | To be verified |
| QLoRA | ✅ | ❌ | - | Quantization not supported |
| DPO | ✅ | 🚧 | - | To be verified |
| Megatron TP/PP | ✅ | 🚧 | - | To be verified |
| Flash Attention | ✅ | ⚠️ | - | Some operators not supported |

**Legend**: ✅ Verified | 🚧 To be verified | ⚠️ Partial support | ❌ Not supported

## Troubleshooting

### torch_npu Version Mismatch

```bash
# Check versions
python -c "import torch; import torch_npu; print(torch.__version__, torch_npu.__version__)"

# Reinstall matching versions
pip uninstall torch torch_npu -y
pip install torch==2.7.1
pip install torch_npu-2.7.1-cp311-cp311-linux_aarch64.whl
```

### CANN Compatibility

Check [Ascend Community Version Compatibility Table](https://www.hiascend.com/document/detail/zh/CANNCommunityEdition/80RC1alpha002/softwareinstall/instg/atlasdeploy_03_0015.html)

### Debug Logging

```bash
export ASCEND_GLOBAL_LOG_LEVEL=1
python your_script.py
```

## Resources

- [Ascend Community](https://www.hiascend.com/)
- [CANN Installation Guide](https://www.hiascend.com/document/detail/zh/CANNCommunityEdition/80RC1alpha002/softwareinstall/instg/atlasdeploy_03_0001.html)
- [torch_npu GitHub](https://github.com/Ascend/pytorch)
- [Twinkle GitHub](https://github.com/modelscope/twinkle)
