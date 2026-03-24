---
title: Components
weight: 1
---

Twinkle provides a modular ecosystem of components that can be used independently or combined.

## Dataset

Data loading and preprocessing with support for ModelScope and HuggingFace datasets.

```python
from twinkle.dataset import Dataset, DatasetMeta

# Load from ModelScope
dataset = Dataset(dataset_meta=DatasetMeta(
    'ms://swift/self-cognition',
    data_slice=range(1000)
))

# Load from HuggingFace
dataset = Dataset(dataset_meta=DatasetMeta('hf://dataset-name'))

# Set template for encoding
dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B')

# Apply preprocessing
dataset.map(SelfCognitionProcessor('Model Name', 'Author'))

# Encode
dataset.encode()
```

### PackingDataset

For bin-packing data to maximize GPU utilization:

```python
from twinkle.dataset import PackingDataset

dataset = PackingDataset(dataset_meta)
dataset.pack_dataset()
```

## DataLoader

Distributed data loading with device mesh awareness:

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

Large model wrapper supporting multiple frameworks:

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

### Adding LoRA Adapters

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

### Setting Optimizer and Scheduler

```python
model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)
model.set_lr_scheduler(
    scheduler_cls='CosineWarmupScheduler',
    num_warmup_steps=5,
    num_training_steps=100
)
```

### Setting Loss Function

```python
# For SFT
model.set_loss('CrossEntropyLoss')

# For GRPO
model.set_loss('GRPOLoss', epsilon=0.2, beta=0.0)
```

## Sampler

Sampling component for inference and RL training:

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

Tokenization templates for different model architectures:

```python
from twinkle.template import Template

dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B', max_length=2048)
sampler.set_template(Template, model_id='ms://Qwen/Qwen3.5-4B')
```

## Preprocessor

Data preprocessing and filtering:

```python
from twinkle.preprocessor import SelfCognitionProcessor

# Built-in preprocessor
dataset.map(SelfCognitionProcessor('Model Name', 'Author'))

# Custom preprocessor
class MyProcessor(Preprocessor):
    def __call__(self, example):
        # Transform example
        return transformed_example
```

## Loss

Built-in and customizable loss functions:

```python
from twinkle.loss import Loss

class CustomLoss(Loss):
    def forward(self, logits, labels, **kwargs):
        # Compute loss
        return loss
```

## Reward & Advantage

For reinforcement learning training:

```python
from twinkle.reward import GSM8KAccuracyReward
from twinkle.advantage import GRPOAdvantage

# Compute rewards
accuracy_reward = GSM8KAccuracyReward()
rewards = accuracy_reward(trajectories)

# Compute advantages
advantage_fn = GRPOAdvantage()
advantages = advantage_fn(rewards, num_generations=8, scale='group')
```

## Metric

Training metrics collection:

```python
from twinkle.metric import CompletionRewardMetric

metrics = CompletionRewardMetric()
metrics.accumulate(completion_lengths=lengths, rewards=rewards)
log_dict = metrics.calculate()
```

## CheckpointEngine

Weight synchronization for RL training:

```python
from twinkle.checkpoint_engine import CheckpointEngineManager

ckpt_manager = CheckpointEngineManager(model=model, sampler=sampler)

# Sync weights to sampler
ckpt_manager.sync_weights(merge_and_sync=False)
```
