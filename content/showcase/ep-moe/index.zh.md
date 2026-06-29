---
title: EP + MoE (DeepSeek V4 / Qwen3.5 MoE)
linkTitle: EP + MoE
weight: 40
---

专家并行 + FSDP2，适用于 DeepSeek V4、Qwen3.5 MoE 等 MoE 模型。

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/transformers/ep_fsdp2_lora_deepseek_v4.py)

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
# ... 标准训练循环（同 SFT 示例）
```
