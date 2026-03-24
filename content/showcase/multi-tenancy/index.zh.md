---
title: "多租户训练"
date: 2026-03-01
summary: "在单一共享基座模型上并发训练多个 LoRA。"
image:
  filename: multi_lora.png
  caption: "Twinkle 多租户架构"
---

Twinkle 支持在共享基座模型上同时进行多租户训练，大幅降低部署成本，同时允许每个租户使用灵活的配置。

## 核心特性

- **资源高效**: 单一基座模型服务多个并发训练会话
- **完全隔离**: 每个租户拥有独立的 LoRA 权重、优化器和损失函数
- **异构配置**: 每个租户可使用不同的 rank、学习率和训练目标
- **并发访问**: 训练会话之间互不干扰

## 使用场景

| 租户 | 数据集 | LoRA Rank | 训练类型 |
|:-----|:-------|:----------|:---------|
| A | 私有数据 | 8 | SFT |
| B | 开源数据 | 32 | 预训练 |
| C | RL 数据 | 16 | GRPO |
| D | 推理 | - | 对数概率 |

## 示例

```python
from twinkle_client import init_twinkle_client
from twinkle_client.model import MultiLoraTransformersModel

client = init_twinkle_client(base_url='http://server:8000')

model = MultiLoraTransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
model.add_adapter_to_model('tenant_a', LoraConfig(r=8))
model.set_loss('GRPOLoss', epsilon=0.2)

for batch in dataloader:
    model.forward_backward(inputs=batch)
    model.step()
```
