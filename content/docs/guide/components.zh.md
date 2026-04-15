---
title: 组件
weight: 1
---

Twinkle 提供模块化的组件生态，各组件可独立使用，也可自由组合。

## Dataset

数据加载与预处理，支持 ModelScope 和 HuggingFace 数据集。

```python
from twinkle.dataset import Dataset, DatasetMeta

# 从 ModelScope 加载
dataset = Dataset(dataset_meta=DatasetMeta(
    'ms://swift/self-cognition',
    data_slice=range(1000)
))

# 从 HuggingFace 加载
dataset = Dataset(dataset_meta=DatasetMeta('hf://dataset-name'))

# 设置编码模板
dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B')

# 应用预处理
dataset.map(SelfCognitionProcessor('Model Name', 'Author'))

# 编码
dataset.encode()
```

### PackingDataset

Bin-packing 数据打包，最大化 GPU 利用率：

```python
from twinkle.dataset import PackingDataset

dataset = PackingDataset(dataset_meta)
dataset.pack_dataset()
```

## DataLoader

支持 device mesh 感知的分布式数据加载：

```python
from twinkle.dataloader import DataLoader

dataloader = DataLoader(
    dataset=dataset,
    batch_size=8,
    min_batch_size=8,
    device_mesh=device_mesh,
    remote_group='model'
)

for batch in dataloader:
    model.forward_backward(inputs=batch)
```

## Model

支持多框架的大模型封装：

### TransformersModel

```python
from twinkle.model import TransformersModel

model = TransformersModel(
    model_id='ms://Qwen/Qwen3.5-4B',
    remote_group='default',
    device_mesh=device_mesh
)
```

### MegatronModel

```python
from twinkle.model.megatron import MegatronModel

model = MegatronModel(
    model_id='ms://Qwen/Qwen3.5-4B',
    device_mesh=model_mesh,
    remote_group='model',
    mixed_precision='bf16'
)
```

### 添加 LoRA 适配器

```python
from peft import LoraConfig

lora_config = LoraConfig(
    r=8,
    lora_alpha=32,
    target_modules='all-linear'
)

model.add_adapter_to_model(
    'default',
    lora_config,
    gradient_accumulation_steps=2
)
```

### 设置优化器与调度器

```python
model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)
model.set_lr_scheduler(
    scheduler_cls='CosineWarmupScheduler',
    num_warmup_steps=5,
    num_training_steps=100
)
```

### 设置损失函数

```python
# SFT 训练
model.set_loss('CrossEntropyLoss')

# GRPO 训练
model.set_loss('GRPOLoss', epsilon=0.2, beta=0.0)
```

## Sampler

用于推理和 RL 训练的采样组件：

```python
from twinkle.sampler import vLLMSampler
from twinkle.data_format import SamplingParams

sampler = vLLMSampler(
    model_id='ms://Qwen/Qwen3.5-4B',
    engine_args={
        'gpu_memory_utilization': 0.8,
        'max_model_len': 4096,
        'enable_lora': True,
    },
    device_mesh=sampler_mesh,
    remote_group='sampler'
)

sampling_params = SamplingParams(
    max_tokens=1024,
    num_samples=4,
    logprobs=1
)

responses = sampler.sample(prompts, sampling_params)
```

## Template

针对不同模型架构的分词模板：

```python
from twinkle.template import Template

dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B', max_length=2048)
sampler.set_template(Template, model_id='ms://Qwen/Qwen3.5-4B')
```

## Preprocessor

数据预处理与过滤：

```python
from twinkle.preprocessor import SelfCognitionProcessor

# 内置预处理器
dataset.map(SelfCognitionProcessor('Model Name', 'Author'))

# 自定义预处理器
class MyProcessor(Preprocessor):
    def __call__(self, example):
        # Transform example
        return transformed_example
```

## Loss

内置及可定制的损失函数：

```python
from twinkle.loss import Loss

class CustomLoss(Loss):
    def forward(self, logits, labels, **kwargs):
        # Compute loss
        return loss
```

## Reward & Advantage

用于强化学习训练：

```python
from twinkle.reward import GSM8KAccuracyReward
from twinkle.advantage import GRPOAdvantage

# 计算奖励
accuracy_reward = GSM8KAccuracyReward()
rewards = accuracy_reward(trajectories)

# 计算优势
advantage_fn = GRPOAdvantage()
advantages = advantage_fn(rewards, num_generations=8, scale='group')
```

## Metric

训练指标收集：

```python
from twinkle.metric import CompletionRewardMetric

metrics = CompletionRewardMetric()
metrics.accumulate(completion_lengths=lengths, rewards=rewards)
log_dict = metrics.calculate()
```

## CheckpointEngine

RL 训练的权重同步：

```python
from twinkle.checkpoint_engine import CheckpointEngineManager

ckpt_manager = CheckpointEngineManager(model=model, sampler=sampler)

# 同步权重到 sampler
ckpt_manager.sync_weights(merge_and_sync=False)
```
