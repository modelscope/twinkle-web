---
title: SFT — Transformers FSDP2
linkTitle: SFT (FSDP2)
weight: 20
---

Supervised fine-tuning with FSDP2 sharding and the Muon optimizer. Supports both full-parameter and LoRA training.

[View full source →](https://github.com/modelscope/twinkle/blob/main/cookbook/transformers/fsdp2.py)

```python
from torch.optim import Muon

import twinkle
from twinkle import DeviceMesh, get_logger
from twinkle.cli import CLI
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.model import TransformersModel
from twinkle.preprocessor import SelfCognitionProcessor

args = CLI.from_args()
device_mesh = DeviceMesh.from_sizes(fsdp_size=args.infra.fsdp_size, dp_size=args.infra.dp_size)
twinkle.initialize(mode=args.infra.mode, global_device_mesh=device_mesh)

dataset = Dataset(dataset_meta=DatasetMeta(args.dataset.dataset_id))
dataset.set_template(args.template.template_cls, model_id=args.model.model_id)
dataset.map(SelfCognitionProcessor('twinkle大模型', 'ModelScope社区'))
dataset.encode()

dataloader = DataLoader(dataset=dataset, batch_size=args.training.batch_size)
model = TransformersModel(model_id=args.model.model_id)
# Full-parameter training by default; optionally add LoRA:
# from peft import LoraConfig
# model.add_adapter_to_model('default', LoraConfig(**args.get_lora_args()),
#                            gradient_accumulation_steps=args.training.gradient_accumulation_steps)
model.set_optimizer(optimizer_cls=Muon, lr=args.optimizer.learning_rate, adjust_lr_fn='match_rms_adamw')
model.set_lr_scheduler(scheduler_cls=args.scheduler.scheduler_cls,
                       num_warmup_steps=args.scheduler.num_warmup_steps,
                       num_training_steps=len(dataloader))

for batch in dataloader:
    model.forward_backward(inputs=batch)
    model.clip_grad_and_step()
model.save('last-checkpoint', output_dir=args.training.output_dir)
```
