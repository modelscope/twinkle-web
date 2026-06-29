---
title: Megatron 张量并行训练
linkTitle: Megatron TP
weight: 30
---

通过 Megatron 后端进行张量并行训练 — 适用于单卡放不下的大模型。

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/megatron/tp.py)

```python
from peft import LoraConfig

import twinkle
from twinkle import DeviceMesh, get_logger
from twinkle.cli import CLI
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.model import MegatronModel
from twinkle.preprocessor import SelfCognitionProcessor

args = CLI.from_args()
device_mesh = DeviceMesh.from_sizes(dp_size=args.infra.dp_size, tp_size=args.infra.tp_size, pp_size=args.infra.pp_size)
twinkle.initialize(mode=args.infra.mode, global_device_mesh=device_mesh)

dataset = Dataset(dataset_meta=DatasetMeta(args.dataset.dataset_id))
dataset.set_template(args.template.template_cls, model_id=args.model.model_id)
dataset.map(SelfCognitionProcessor('twinkle大模型', 'ModelScope社区'))
dataset.encode()

dataloader = DataLoader(dataset=dataset, batch_size=args.training.batch_size)
model = MegatronModel(model_id=args.model.model_id)
model.add_adapter_to_model('default', LoraConfig(**args.get_lora_args()))
model.set_optimizer(optimizer_cls='default', lr=args.optimizer.learning_rate)
model.set_lr_scheduler(scheduler_cls='default', lr_warmup_steps=args.scheduler.num_warmup_steps,
                       lr_decay_steps=len(dataloader))

for batch in dataloader:
    model.forward_backward(inputs=batch)
    model.clip_grad_and_step()
model.save('last-checkpoint', output_dir=args.training.output_dir)
```
