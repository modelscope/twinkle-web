---
title: Ascend NPU — Megatron on MindSpeed
linkTitle: NPU (Ascend)
weight: 35
---

Training on Huawei Ascend NPUs using the Megatron backend with MindSpeed integration.
Twinkle automatically applies fused NPU operators (RMSNorm, RoPE, SwiGLU, SDPA) via `kernelize_model()`.

Three recipes are provided — basic TP, MoE with EP, and MoE with Context Parallelism.

## 1. Tensor Parallel (TP + PP + DP)

Launch: `ASCEND_RT_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 torchrun --nproc_per_node=8 tp_npu.py`

[View full source →](https://github.com/modelscope/twinkle/blob/main/cookbook/megatron/ascend/tp_npu.py)

```python
from twinkle import DeviceMesh
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.model import MegatronModel
import twinkle

MODEL_ID = 'ms://Qwen/Qwen3-4B'

# 8-card TP/PP/DP layout on NPU
device_mesh = DeviceMesh.from_sizes(dp_size=2, tp_size=2, pp_size=2, device_type='npu')
twinkle.initialize(mode='local', global_device_mesh=device_mesh)

dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
dataset.set_template('Template', model_id=MODEL_ID)
dataset.encode()
dataloader = DataLoader(dataset=dataset, batch_size=8, num_workers=0)

model = MegatronModel(model_id=MODEL_ID)
# Full-parameter training by default; optionally add LoRA:
# from peft import LoraConfig
# model.add_adapter_to_model('default', LoraConfig(r=8, lora_alpha=32, target_modules='all-linear'))
model.set_optimizer(optimizer_cls='default', lr=1e-4)

for step, batch in enumerate(dataloader):
    model.forward_backward(inputs=batch)
    model.clip_grad_and_step()
```

## 2. MoE with Expert Parallel (TP + PP + DP + EP)

Launch: `ASCEND_RT_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 torchrun --nproc_per_node=8 tp_moe_npu.py`

[View full source →](https://github.com/modelscope/twinkle/blob/main/cookbook/megatron/ascend/tp_moe_npu.py)

```python
MODEL_ID = 'ms://Qwen/Qwen3-30B-A3B'

# MoE layout: add ep_size=2 for expert parallelism
device_mesh = DeviceMesh.from_sizes(dp_size=2, tp_size=2, pp_size=2, cp_size=1, ep_size=2, device_type='npu')
twinkle.initialize(mode='local', global_device_mesh=device_mesh)
```

## 3. MoE + Context Parallelism (TP + PP + CP + EP)

Launch: `ASCEND_RT_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 torchrun --nproc_per_node=8 tp_moe_cp_npu.py`

[View full source →](https://github.com/modelscope/twinkle/blob/main/cookbook/megatron/ascend/tp_moe_cp_npu.py)

```python
MODEL_ID = 'ms://Qwen/Qwen3-30B-A3B'

# Full parallelism: TP=2, PP=2, CP=2, EP=2
device_mesh = DeviceMesh.from_sizes(dp_size=1, tp_size=2, pp_size=2, cp_size=2, ep_size=2, device_type='npu')
twinkle.initialize(mode='local', global_device_mesh=device_mesh)
```

> **Note**: Use `ASCEND_RT_VISIBLE_DEVICES` instead of `CUDA_VISIBLE_DEVICES`. The `device_type='npu'` flag enables NPU-specific kernel patches automatically.
