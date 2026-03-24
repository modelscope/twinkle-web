---
title: Runtime Modes
weight: 2
---

Twinkle supports multiple runtime modes for different deployment scenarios. The same training code runs across all modes with minimal changes.

## Single GPU

The simplest mode for development and small-scale training:

```python
from twinkle.model import TransformersModel
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta

def train():
    dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
    dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B')
    dataset.encode()
    
    dataloader = DataLoader(dataset=dataset, batch_size=8)
    model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
    
    for batch in dataloader:
        model.forward_backward(inputs=batch)
        model.clip_grad_and_step()

if __name__ == '__main__':
    train()
```

Run directly:
```bash
python train.py
```

## torchrun Mode

Distributed training using PyTorch's native launcher. No Ray dependencies required.

```python
import twinkle
from twinkle import DeviceMesh

# Construct device mesh: FSDP=4, DP=2
device_mesh = DeviceMesh.from_sizes(fsdp_size=4, dp_size=2)

# Initialize in local mode
twinkle.initialize(mode='local', global_device_mesh=device_mesh)

def train():
    # Same training code as single GPU
    ...

if __name__ == '__main__':
    train()
```

Launch with torchrun:
```bash
CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 torchrun --nproc_per_node=8 train.py
```

### Device Mesh Options

```python
# FSDP + Data Parallelism
DeviceMesh.from_sizes(fsdp_size=4, dp_size=2)

# Tensor + Pipeline Parallelism
DeviceMesh.from_sizes(tp_size=2, pp_size=4)

# Full 3D Parallelism
DeviceMesh.from_sizes(tp_size=2, pp_size=2, dp_size=2)
```

## Ray Mode

Distributed training across Ray clusters with advanced resource management:

```python
import twinkle
from twinkle import DeviceMesh, DeviceGroup

# Define resource groups
device_groups = [
    DeviceGroup(name='model', ranks=4, device_type='cuda'),
    DeviceGroup(name='sampler', ranks=4, device_type='cuda'),
]

# Define parallel topology
model_mesh = DeviceMesh.from_sizes(world_size=4, dp_size=4)
sampler_mesh = DeviceMesh.from_sizes(world_size=4, dp_size=4)

# Initialize Ray mode
twinkle.initialize(
    mode='ray',
    nproc_per_node=8,
    groups=device_groups,
    lazy_collect=False
)

def train():
    model = TransformersModel(
        model_id='ms://Qwen/Qwen3.5-4B',
        remote_group='model',
        device_mesh=model_mesh
    )
    
    sampler = vLLMSampler(
        model_id='ms://Qwen/Qwen3.5-4B',
        device_mesh=sampler_mesh,
        remote_group='sampler'
    )
    ...

if __name__ == '__main__':
    train()
```

### Starting Ray Cluster

```bash
# Start head node
CUDA_VISIBLE_DEVICES=0,1 ray start --head --port=6379 --num-gpus=2

# Add worker nodes
CUDA_VISIBLE_DEVICES=2,3 ray start --address=127.0.0.1:6379 --num-gpus=2

# CPU-only node
CUDA_VISIBLE_DEVICES="" ray start --address=127.0.0.1:6379 --num-gpus=0
```

Run training:
```bash
python train.py
```

## HTTP Mode

Deploy training as an HTTP service for multi-tenant access:

### Server Setup

```python
# server.py
import twinkle
from twinkle import DeviceGroup, DeviceMesh

device_groups = [
    DeviceGroup(name='model', ranks=4, device_type='cuda'),
    DeviceGroup(name='sampler', ranks=4, device_type='cuda'),
]

twinkle.initialize(mode='http', groups=device_groups)

# Start server services
# Model cluster, Sampler cluster, Utility cluster
```

```bash
python server.py
```

### Client Training

```python
from twinkle_client import init_twinkle_client
from twinkle_client.model import MultiLoraTransformersModel
from twinkle_client.sampler import vLLMSampler

# Connect to server
client = init_twinkle_client(
    base_url='http://localhost:8000',
    api_key='your-api-key'
)

# Configure model
model = MultiLoraTransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
model.add_adapter_to_model('default', lora_config)
model.set_optimizer('AdamW', lr=1e-4)

# Configure sampler
sampler = vLLMSampler(model_id='ms://Qwen/Qwen3.5-4B')

# Training loop
for batch in dataloader:
    responses = sampler.sample(inputs=batch, sampling_params=params)
    model.forward_backward(inputs=responses, advantages=advantages)
    model.step()
```

## Mode Comparison

| Mode | Use Case | Dependencies | Scale |
|:-----|:---------|:-------------|:------|
| Single GPU | Development, small models | None | 1 GPU |
| torchrun | Multi-GPU training | PyTorch | Single node |
| Ray | Multi-node, RL training | Ray | Multi-node cluster |
| HTTP | TaaS, Multi-tenancy | Ray + FastAPI | Enterprise |

## Best Practices

1. **Development**: Start with single GPU mode for rapid iteration
2. **Scaling**: Move to torchrun for multi-GPU training
3. **RL Training**: Use Ray mode for model-sampler coordination
4. **Production**: Deploy HTTP mode for multi-tenant services
