---
title: API 参考
weight: 3
---

本节介绍 Twinkle 的组件 API 和定制选项。

## 核心组件

| 组件 | 模块 | 描述 |
|:-----|:-----|:-----|
| Dataset | `twinkle.dataset` | 支持 ModelScope/HuggingFace 的数据加载 |
| DataLoader | `twinkle.dataloader` | 支持 device mesh 的分布式数据加载 |
| Model | `twinkle.model` | TransformersModel 和 MegatronModel 封装 |
| Sampler | `twinkle.sampler` | 基于 vLLM 的推理/RL 采样 |
| Loss | `twinkle.loss` | CrossEntropy、GRPO、GKD 损失函数 |
| Reward | `twinkle.reward` | RL 训练的奖励函数 |
| Advantage | `twinkle.advantage` | 优势估计（GRPO、GAE） |
| Metric | `twinkle.metric` | 训练指标收集 |
| Template | `twinkle.template` | 分词模板 |
| Preprocessor | `twinkle.preprocessor` | 数据 ETL 转换 |

## 初始化

```python
import twinkle
from twinkle import DeviceMesh, DeviceGroup

# 定义设备组
device_groups = [
    DeviceGroup(name='model', ranks=4, device_type='cuda'),
    DeviceGroup(name='sampler', ranks=4, device_type='cuda'),
]

# 定义并行拓扑
device_mesh = DeviceMesh.from_sizes(fsdp_size=4, dp_size=2)

# 初始化
twinkle.initialize(
    mode='ray',           # 'local', 'ray', 或 'http'
    nproc_per_node=8,
    groups=device_groups,
    global_device_mesh=device_mesh
)
```

## Model API

```python
from twinkle.model import TransformersModel
from peft import LoraConfig

model = TransformersModel(
    model_id='ms://Qwen/Qwen3.5-4B',
    remote_group='model',
    device_mesh=device_mesh
)

# 添加 LoRA 适配器
lora_config = LoraConfig(r=8, lora_alpha=32, target_modules='all-linear')
model.add_adapter_to_model('default', lora_config, gradient_accumulation_steps=2)

# 设置优化器和调度器
model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)
model.set_lr_scheduler(scheduler_cls='CosineWarmupScheduler', num_warmup_steps=5)

# 设置损失函数
model.set_loss('GRPOLoss', epsilon=0.2)

# 训练步骤
model.forward_backward(inputs=batch)
model.clip_grad_and_step()

# 保存检查点
model.save('checkpoint-name')
```

## Sampler API

```python
from twinkle.sampler import vLLMSampler
from twinkle.data_format import SamplingParams

sampler = vLLMSampler(
    model_id='ms://Qwen/Qwen3.5-4B',
    engine_args={'gpu_memory_utilization': 0.8, 'enable_lora': True},
    device_mesh=sampler_mesh,
    remote_group='sampler'
)

sampling_params = SamplingParams(max_tokens=1024, num_samples=4, logprobs=1)
responses = sampler.sample(prompts, sampling_params)
```

## Dataset API

```python
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.dataloader import DataLoader

dataset = Dataset(dataset_meta=DatasetMeta(
    'ms://swift/self-cognition',
    data_slice=range(1000)
))
dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B')
dataset.map(SelfCognitionProcessor('Model', 'Author'))
dataset.encode()

dataloader = DataLoader(dataset=dataset, batch_size=8)
```

## Client API

```python
from twinkle_client import init_twinkle_client
from twinkle_client.model import MultiLoraTransformersModel

client = init_twinkle_client(base_url='http://server:8000', api_key='key')

model = MultiLoraTransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
model.add_adapter_to_model('tenant_a', lora_config)
model.forward_backward(inputs=batch)
model.step()
```

更多详情请参阅 [Cookbook](../guide/cookbook/) 示例。
