---
title: API Reference
weight: 3
---

This section covers Twinkle's component APIs and customization options.

## Core Components

| Component | Module | Description |
|:----------|:-------|:------------|
| Dataset | `twinkle.dataset` | Data loading with ModelScope/HuggingFace support |
| DataLoader | `twinkle.dataloader` | Distributed data loading with device mesh |
| Model | `twinkle.model` | TransformersModel and MegatronModel wrappers |
| Sampler | `twinkle.sampler` | vLLM-based sampling for inference/RL |
| Loss | `twinkle.loss` | CrossEntropy, GRPO, GKD loss functions |
| Reward | `twinkle.reward` | Reward functions for RL training |
| Advantage | `twinkle.advantage` | Advantage estimation (GRPO, GAE) |
| Metric | `twinkle.metric` | Training metrics collection |
| Template | `twinkle.template` | Tokenization templates |
| Preprocessor | `twinkle.preprocessor` | Data ETL transformations |

## Initialization

```python
import twinkle
from twinkle import DeviceMesh, DeviceGroup

# Define device groups
device_groups = [
    DeviceGroup(name='model', ranks=4, device_type='cuda'),
    DeviceGroup(name='sampler', ranks=4, device_type='cuda'),
]

# Define parallel topology
device_mesh = DeviceMesh.from_sizes(fsdp_size=4, dp_size=2)

# Initialize
twinkle.initialize(
    mode='ray',           # 'local', 'ray', or 'http'
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

# Add LoRA adapter
lora_config = LoraConfig(r=8, lora_alpha=32, target_modules='all-linear')
model.add_adapter_to_model('default', lora_config, gradient_accumulation_steps=2)

# Set optimizer and scheduler
model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)
model.set_lr_scheduler(scheduler_cls='CosineWarmupScheduler', num_warmup_steps=5)

# Set loss function
model.set_loss('GRPOLoss', epsilon=0.2)

# Training step
model.forward_backward(inputs=batch)
model.clip_grad_and_step()

# Save checkpoint
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
dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B')
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

For more details, see the [Cookbook](../guide/cookbook/) examples.
