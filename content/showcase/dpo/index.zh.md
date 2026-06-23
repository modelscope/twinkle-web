---
title: DPO (偏好优化)
linkTitle: DPO
weight: 80
---

Direct Preference Optimization — 使用人类偏好数据对齐模型，无需显式 reward 建模。支持 sigmoid/hinge/IPO/SimPO/ORPO/CPO 变体。

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/dpo/dpo_full.py)

```python
import twinkle
from twinkle import DeviceGroup, DeviceMesh
from twinkle.loss import DPOLoss
from twinkle.metric import DPOMetric
from twinkle.model import TransformersModel
from twinkle.processor import InputProcessor

device_groups = [
    DeviceGroup(name='policy', ranks=list(range(4)), device_type='GPU'),
    DeviceGroup(name='reference', ranks=list(range(4, 8)), device_type='GPU'),
]
twinkle.initialize(mode='ray', nproc_per_node=8, groups=device_groups)

policy_model = TransformersModel(model_id=MODEL_ID, remote_group='policy')
policy_model.set_loss(DPOLoss(beta=0.1, loss_type='sigmoid'))
policy_model.add_metric(DPOMetric, beta=0.1)

ref_model = TransformersModel(model_id=MODEL_ID, remote_group='reference')

for batch in dataloader:
    dpo_batch = prepare_dpo_batch(batch)  # 交错排列 [pos, neg, pos, neg, ...]
    ref_outputs = ref_model.forward_only(inputs=dpo_batch)
    policy_model.forward_backward(inputs=dpo_batch, ref_outputs=ref_outputs)
    policy_model.clip_grad_and_step()
```
