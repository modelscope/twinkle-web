---
title: Quick Start
date: 2026-02-10
weight: 1
---

Get Twinkle up and running in minutes.

## What is Twinkle?

Twinkle is a production-oriented large model training framework with a component-based architecture:

- **Loosely Coupled Architecture** · Standardized Interfaces
- **Multiple Runtime Modes** · torchrun / Ray / HTTP
- **Multi-Framework Compatible** · Transformers / Megatron
- **Multi-Tenant Support** · Single Base Model Deployment

### When to Choose Twinkle

- You want to understand model mechanisms and training methods
- You are a researcher who wants to customize models or training algorithms
- You prefer writing explicit training loops
- You need to build enterprise-level training platforms

### When to Choose ms-swift

- You don't care about the training process, just want to provide data
- You need more model support and dataset varieties
- You need inference, deployment, quantization capabilities
- You need day-0 support for new models

## Prerequisites

| Component | Requirement | Notes |
|-----------|-------------|-------|
| Python | >= 3.11, < 3.13 | 3.11 recommended |
| PyTorch | >= 2.0 | 2.7.1 for NPU |
| GPU | A10/A100/H100/RTX | T4/V100 limited support |
| NPU | Ascend 910 series | Optional |

## Installation

{{% steps %}}

### Install Twinkle

```bash
# Install from PyPI
pip install 'twinkle-kit'

# Or install from source
git clone https://github.com/modelscope/twinkle.git
cd twinkle
pip install -e .
```

### Install Client (Optional)

If you need to use Twinkle's Client for remote training:

```bash
# Mac or Linux
sh INSTALL_CLIENT.sh

# Windows (PowerShell)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\INSTALL_CLIENT.ps1
```

### Install Megatron Dependencies (Optional)

For ultra-large-scale model training with Megatron backend:

```bash
sh INSTALL_MEGATRON.sh
```

{{% /steps %}}

## Your First Training

### Single GPU Training

```python
from peft import LoraConfig
from twinkle import get_device_placement, get_logger
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.model import TransformersModel
from twinkle.preprocessor import SelfCognitionProcessor

logger = get_logger()

def train():
    # Load dataset (1000 samples)
    dataset = Dataset(dataset_meta=DatasetMeta(
        'ms://swift/self-cognition', 
        data_slice=range(1000)
    ))
    # Set template for encoding
    dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B')
    # Preprocess to standard format
    dataset.map(SelfCognitionProcessor('Twinkle LLM', 'ModelScope'))
    # Encode dataset
    dataset.encode()
    
    # Create dataloader (global batch size = 8)
    dataloader = DataLoader(dataset=dataset, batch_size=8)
    
    # Load model
    model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
    
    # Add LoRA adapter
    lora_config = LoraConfig(r=8, lora_alpha=32, target_modules='all-linear')
    model.add_adapter_to_model('default', lora_config, gradient_accumulation_steps=2)
    
    # Set optimizer and scheduler
    model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)
    model.set_lr_scheduler(
        scheduler_cls='CosineWarmupScheduler',
        num_warmup_steps=5,
        num_training_steps=len(dataloader)
    )
    
    # Training loop
    for step, batch in enumerate(dataloader):
        model.forward_backward(inputs=batch)
        model.clip_grad_and_step()
        if step % 20 == 0:
            metric = model.calculate_metric(is_training=True)
            logger.info(f'Step {step}/{len(dataloader)}, metric: {metric}')
    
    model.save('last-checkpoint')

if __name__ == '__main__':
    train()
```

### Multi-GPU Training (8 GPUs)

Just add initialization with DeviceMesh:

```python
import twinkle
from twinkle import DeviceMesh

# Build device_mesh: fsdp=4, dp=2, using 8 GPUs
device_mesh = DeviceMesh.from_sizes(fsdp_size=4, dp_size=2)
twinkle.initialize(mode='local', global_device_mesh=device_mesh)

# ... rest of training code remains the same
```

Run with torchrun:

```bash
torchrun --nproc_per_node=8 train.py
```

### Using Only Partial Components

You can use only a portion of Twinkle's components with your existing code:

```python
from twinkle.dataset import PackingDataset, DatasetMeta
from twinkle.dataloader import DataLoader
from twinkle.preprocessor import SelfCognitionProcessor

dataset_meta = DatasetMeta(
    dataset_id='ms://swift/self-cognition',
)

dataset = PackingDataset(dataset_meta)
dataset.map(SelfCognitionProcessor(
    model_name='Twinkle Model', 
    model_author='ModelScope Community'
))
dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B', max_length=512)
dataset.encode()
dataset.pack_dataset()

dataloader = DataLoader(dataset, batch_size=8)

for data in dataloader:
    # Use with your custom training code
    print(data.keys())  # input_ids, position_ids, ...
    break
```

## Supported Hardware

| Hardware | Notes |
|----------|-------|
| GPU A10/A100/H100/RTX | Full support |
| GPU T4/V100 | No bfloat16, no Flash-Attention |
| Ascend NPU | Some operators not supported |
| PPU | Supported |
| CPU | Partial components (dataset, dataloader) |

## Next Steps

{{< cards >}}
  {{< card url="../guide/architecture" title="Architecture" icon="cpu-chip" subtitle="Understand the client-server architecture" >}}
  {{< card url="../guide/components" title="Components" icon="puzzle-piece" subtitle="Explore Dataset, Model, Sampler, and more" >}}
  {{< card url="../guide/runtime-modes" title="Runtime Modes" icon="server-stack" subtitle="torchrun, Ray, and HTTP deployment" >}}
  {{< card url="../guide/server-client" title="Server & Client" icon="arrows-right-left" subtitle="HTTP training service architecture" >}}
  {{< card url="../guide/multi-tenancy" title="Multi-Tenancy" icon="user-group" subtitle="Train multiple LoRAs on shared base model" >}}
  {{< card url="../guide/npu-support" title="NPU Support" icon="chip" subtitle="Ascend NPU training guide" >}}
  {{< card url="../guide/taas" title="Training as a Service" icon="cloud" subtitle="Deploy enterprise-grade training services" >}}
  {{< card url="../guide/cookbook" title="Cookbook" icon="book-open" subtitle="FSDP, MoE, RL training examples" >}}
{{< /cards >}}
