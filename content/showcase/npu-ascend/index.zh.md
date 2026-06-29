---
title: 昇腾 NPU — Megatron + MindSpeed
linkTitle: NPU（昇腾）
weight: 35
---

使用 Megatron 后端在华为昇腾 NPU 上训练，集成 MindSpeed 加速。
Twinkle 通过 `kernelize_model()` 自动应用融合 NPU 算子（RMSNorm、RoPE、SwiGLU、SDPA）。

提供三种配方——基础 TP、MoE + EP、MoE + Context Parallelism。

## 1. 张量并行（TP + PP + DP）

启动命令：`ASCEND_RT_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 torchrun --nproc_per_node=8 tp_npu.py`

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/megatron/ascend/tp_npu.py)

```python
from twinkle import DeviceMesh
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.model import MegatronModel
import twinkle

MODEL_ID = 'ms://Qwen/Qwen3-4B'

# 8 卡 TP/PP/DP 布局，运行在 NPU 上
device_mesh = DeviceMesh.from_sizes(dp_size=2, tp_size=2, pp_size=2, device_type='npu')
twinkle.initialize(mode='local', global_device_mesh=device_mesh)

dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
dataset.set_template('Template', model_id=MODEL_ID)
dataset.encode()
dataloader = DataLoader(dataset=dataset, batch_size=8, num_workers=0)

model = MegatronModel(model_id=MODEL_ID)
# 默认全参数训练；可选添加 LoRA：
# from peft import LoraConfig
# model.add_adapter_to_model('default', LoraConfig(r=8, lora_alpha=32, target_modules='all-linear'))
model.set_optimizer(optimizer_cls='default', lr=1e-4)

for step, batch in enumerate(dataloader):
    model.forward_backward(inputs=batch)
    model.clip_grad_and_step()
```

## 2. MoE + Expert Parallel（TP + PP + DP + EP）

启动命令：`ASCEND_RT_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 torchrun --nproc_per_node=8 tp_moe_npu.py`

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/megatron/ascend/tp_moe_npu.py)

```python
MODEL_ID = 'ms://Qwen/Qwen3-30B-A3B'

# MoE 布局：添加 ep_size=2 启用专家并行
device_mesh = DeviceMesh.from_sizes(dp_size=2, tp_size=2, pp_size=2, cp_size=1, ep_size=2, device_type='npu')
twinkle.initialize(mode='local', global_device_mesh=device_mesh)
```

## 3. MoE + Context Parallelism（TP + PP + CP + EP）

启动命令：`ASCEND_RT_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 torchrun --nproc_per_node=8 tp_moe_cp_npu.py`

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/megatron/ascend/tp_moe_cp_npu.py)

```python
MODEL_ID = 'ms://Qwen/Qwen3-30B-A3B'

# 全并行：TP=2, PP=2, CP=2, EP=2
device_mesh = DeviceMesh.from_sizes(dp_size=1, tp_size=2, pp_size=2, cp_size=2, ep_size=2, device_type='npu')
twinkle.initialize(mode='local', global_device_mesh=device_mesh)
```

> **注意**：使用 `ASCEND_RT_VISIBLE_DEVICES` 代替 `CUDA_VISIBLE_DEVICES`。`device_type='npu'` 标志会自动启用 NPU 专用 kernel patch。
