---
title: Embedding Training
linkTitle: Embedding
weight: 60
---

Train embedding models with InfoNCE contrastive loss. Supports both full-parameter and LoRA fine-tuning.

[View full source →](https://github.com/modelscope/twinkle/blob/main/cookbook/exp/embedding/train_embedding_full_ddp.py)

```python
import twinkle
from twinkle import DeviceMesh
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.loss import InfonceLoss
from twinkle.metric import EmbeddingMetric
from twinkle.model import TransformersModel
from twinkle.processor import InputProcessor

device_mesh = DeviceMesh.from_sizes(fsdp_size=4, dp_size=4)
twinkle.initialize(mode='ray', global_device_mesh=device_mesh)

dataset = Dataset(dataset_meta=DatasetMeta('ms://your-embedding-dataset'))
dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B')
dataset.encode()
dataloader = DataLoader(dataset=dataset, batch_size=32)

model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
model.set_processor(InputProcessor)
model.set_loss(InfonceLoss, temperature=0.07, use_batch=True)
model.set_optimizer(optimizer_cls='AdamW', lr=1e-5)
model.add_metric(EmbeddingMetric, is_training=True)

for batch in dataloader:
    model.forward_backward(inputs=batch, task='embedding')
    model.clip_grad_and_step()
model.save('last-checkpoint', output_dir='./output/embedding')
```
