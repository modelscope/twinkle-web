---
title: Training as a Service
weight: 4
---

Twinkle provides built-in capabilities for deploying enterprise-grade Training as a Service (TaaS).

## ModelScope TaaS

Twinkle powers the training service on ModelScope. You can experience Twinkle's training API for free:

1. Join the [Twinkle-Explorers](https://modelscope.cn/organization/twinkle-explorers) organization
2. Use the API endpoint: `base_url=https://www.modelscope.cn/twinkle`

## Serverless Training

Access the hosted training service via Tinker-compatible APIs:

```python
from tinker import ServiceClient, types
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.preprocessor import SelfCognitionProcessor
from twinkle.server.common import input_feature_to_datum

# The base model (currently Qwen3.6-27B)
base_model = 'Qwen/Qwen3.6-27B'

# Prepare dataset
dataset = Dataset(dataset_meta=DatasetMeta(
    'ms://swift/self-cognition',
    data_slice=range(500)
))
dataset.set_template('Qwen3_5Template', model_id=f'ms://{base_model}', max_length=256)
dataset.map(SelfCognitionProcessor('Twinkle Model', 'ModelScope'))
dataset.encode(batched=True)

dataloader = DataLoader(dataset=dataset, batch_size=8)

# Connect to ModelScope TaaS
service_client = ServiceClient(
    base_url='https://www.modelscope.cn/twinkle',
    api_key='your-api-key'
)

# Create training client
training_client = service_client.create_lora_training_client(
    base_model=base_model,
    rank=16
)

# Training loop
for epoch in range(3):
    for step, batch in enumerate(dataloader):
        input_datum = [input_feature_to_datum(f) for f in batch]
        
        # Forward-backward pass
        fwdbwd_future = training_client.forward_backward(
            input_datum,
            'cross_entropy'
        )
        
        # Optimizer step
        optim_future = training_client.optim_step(
            types.AdamParams(learning_rate=1e-4)
        )
        
        fwdbwd_future.result()
        optim_result = optim_future.result()
        print(f'Step {step}: {optim_result}')
    
    # Save checkpoint after each epoch
    save_result = training_client.save_state(f'epoch-{epoch}').result()
    print(f'Saved to {save_result.path}')
```

## Self-Hosted Deployment

Deploy your own TaaS instance:

### 1. Start Ray Cluster

```bash
# Head node
CUDA_VISIBLE_DEVICES=0,1,2,3 ray start --head --port=6379 --num-gpus=4

# Worker nodes (optional)
CUDA_VISIBLE_DEVICES=4,5,6,7 ray start --address=head:6379 --num-gpus=4
```

### 2. Start Training Server

```python
# server.py
import twinkle
from twinkle import DeviceGroup

device_groups = [
    DeviceGroup(name='model', ranks=4, device_type='cuda'),
    DeviceGroup(name='sampler', ranks=4, device_type='cuda'),
]

twinkle.initialize(mode='http', groups=device_groups)

# Server starts on http://0.0.0.0:8000
```

```bash
python server.py
```

### 3. Connect Clients

```python
from twinkle_client import init_twinkle_client

client = init_twinkle_client(
    base_url='http://your-server:8000',
    api_key='your-api-key'
)
```

## Supported Models

| Model | Size | HuggingFace ID | Megatron |
|:------|:-----|:---------------|:---------|
| Qwen3.6 | 4B-35B-A3B | Qwen/Qwen3.6-* | Yes |
| Qwen3.5 | 2B-27B | Qwen/Qwen3.5-* | Yes |
| Qwen3 | 0.6B-32B | Qwen/Qwen3-* | Yes |
| Qwen2.5 | 0.5B-72B | Qwen/Qwen2.5-* | Yes |
| DeepSeek-R1 | Various | deepseek-ai/DeepSeek-R1 | Yes |

## Supported Hardware

| Platform | Status |
|:---------|:-------|
| NVIDIA GPUs | Full support |
| Ascend NPU | Partial support |
| PPU | Supported |
| CPU | Dataset/DataLoader only |

## API Endpoints

### Training

- `POST /forward_backward` - Compute gradients
- `POST /optim_step` - Update weights
- `POST /save_state` - Save checkpoint

### Sampling

- `POST /sample` - Generate completions

### Management

- `GET /health` - Service health check
- `GET /metrics` - Training metrics

## Monitoring

Track training progress and resource usage:

```python
# Get training metrics
metrics = model.calculate_metric(is_training=True)
print(f'Loss: {metrics["loss"]}, LR: {metrics["lr"]}')
```

## Security

- **API Key Authentication**: All requests require valid API key
- **Tenant Isolation**: Each tenant's data and weights are isolated
- **Checkpoint Access Control**: Checkpoints stored per-tenant
