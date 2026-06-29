---
title: 多模态 SFT (VLM)
linkTitle: 多模态
weight: 90
---

视觉语言模型微调，支持图片输入（如 LaTeX OCR、Gemma4）。

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/mm/fsdp2.py)

```python
import twinkle
from twinkle import DeviceMesh
from twinkle.cli import CLI
from twinkle.data_format import Trajectory, Message
from twinkle.dataloader import DataLoader
from twinkle.dataset import LazyDataset, DatasetMeta
from twinkle.model import TransformersModel
from twinkle.preprocessor import Preprocessor

args = CLI.from_args()
device_mesh = DeviceMesh.from_sizes(fsdp_size=args.infra.fsdp_size, dp_size=args.infra.dp_size)
twinkle.initialize(mode=args.infra.mode, global_device_mesh=device_mesh)

class LatexOCRProcessor(Preprocessor):
    def preprocess(self, row) -> Trajectory:
        return Trajectory(messages=[
            Message(role='user', content=[{'type': 'image', 'image': row['image']},
                                          {'type': 'text', 'text': '转换为 LaTeX。'}]),
            Message(role='assistant', content=row['text']),
        ])

dataset = LazyDataset(DatasetMeta('ms://linxy/LaTeX_OCR'))
dataset.map(LatexOCRProcessor())
dataset.set_template('Qwen3_5Template', model_id=args.model.model_id, max_length=2048)
dataloader = DataLoader(dataset=dataset, batch_size=args.training.batch_size)

model = TransformersModel(model_id=args.model.model_id)
model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)

for batch in dataloader:
    model.forward_backward(inputs=batch)
    model.clip_grad_and_step()
model.save('last-checkpoint', output_dir=args.training.output_dir)
```
