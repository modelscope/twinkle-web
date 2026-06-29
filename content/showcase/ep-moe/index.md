---
title: EP + MoE (DeepSeek V4 / Qwen3.5 MoE)
linkTitle: EP + MoE
weight: 40
---

Expert-parallel + FSDP2 for Mixture-of-Experts models like DeepSeek V4 and Qwen3.5 MoE.

[View full source →](https://github.com/modelscope/twinkle/blob/main/cookbook/transformers/ep_fsdp2_lora_deepseek_v4.py)

```python
import twinkle
from twinkle import DeviceMesh, Platform, get_logger
from twinkle.cli import CLI
from twinkle.model import TransformersModel

args = CLI.from_args()
device_mesh = DeviceMesh.from_sizes(
    fsdp_size=args.infra.fsdp_size,
    dp_size=args.infra.dp_size,
    ep_size=args.infra.ep_size,  # Expert Parallelism
    device_type=Platform.get_platform().device_prefix(),
)
twinkle.initialize(mode=args.infra.mode, global_device_mesh=device_mesh)

model = TransformersModel(model_id='ms://deepseek-ai/DeepSeek-V4')
# ... standard training loop (same as SFT recipe)
```
