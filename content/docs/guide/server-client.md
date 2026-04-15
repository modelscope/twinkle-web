---
title: Server & Client
weight: 4
---

Twinkle provides a complete HTTP Server/Client architecture for deploying models as services and remotely calling them for training and inference.

## Core Concepts

The architecture decouples **model hosting (Server)** and **training logic (Client)**:

- **Server**: Deployed with Ray Serve, hosts model weights and handles forward/backward, sampling, and weight management
- **Client**: Runs locally, handles data preparation, training loop, and hyperparameter configuration

```
┌──────────────────┐          HTTP          ┌──────────────────────────┐
│      Client      │ ◄───────────────────► │         Server           │
│  ┌────────────┐  │                       │  ┌────────────────────┐  │
│  │  Dataset   │  │     Data + Commands   │  │    Base Model      │  │
│  │  Template  │  │ ──────────────────►   │  ├────────────────────┤  │
│  │  Optimizer │  │                       │  │ LoRA A │ LoRA B │..│  │
│  └────────────┘  │  ◄──────────────────  │  └────────────────────┘  │
│                  │     Gradients + Metrics│                          │
└──────────────────┘                       └──────────────────────────┘
```

## Two Model Backends

| Backend | use_megatron | Description |
|---------|--------------|-------------|
| **Transformers** | `false` | HuggingFace Transformers, suitable for most scenarios |
| **Megatron** | `true` | Megatron-LM, for ultra-large-scale models with advanced parallelization |

## Two Client Modes

| Client | Initialization | Description |
|--------|----------------|-------------|
| **Twinkle Client** | `init_twinkle_client` | Native client, change `from twinkle import` to `from twinkle_client import` |
| **Tinker Client** | `init_tinker_client` | Patches Tinker SDK, reuse existing Tinker training code |

### How to Choose

| Scenario | Recommendation |
|----------|----------------|
| Existing Twinkle local code, want remote | Twinkle Client — just change imports |
| Existing Tinker code, want to reuse | Tinker Client — only need init patch |
| New project | Twinkle Client — simpler API |

## Server Configuration

### Basic Server Setup

Create `server_config.yaml`:

```yaml
model:
  model_id: Qwen/Qwen3.5-4B
  use_megatron: false
  torch_dtype: bfloat16

server:
  host: 0.0.0.0
  port: 8000
  num_replicas: 1

ray:
  num_gpus: 4
```

Start the server:

```python
# server.py
from twinkle.server import TwinkleServer

server = TwinkleServer.from_config('server_config.yaml')
server.run()
```

```bash
python server.py
```

### Megatron Backend

For ultra-large models with tensor/pipeline parallelism:

```yaml
model:
  model_id: Qwen/Qwen3.5-9B
  use_megatron: true
  torch_dtype: bfloat16
  tensor_parallel_size: 4
  pipeline_parallel_size: 2

server:
  host: 0.0.0.0
  port: 8000

ray:
  num_gpus: 8
```

## Client Usage

### Twinkle Client

```python
import os
from twinkle_client import init_twinkle_client

# Initialize client
init_twinkle_client()

from twinkle_client import ServiceClient
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.preprocessor import SelfCognitionProcessor

# Connect to server
service_client = ServiceClient(
    base_url='http://localhost:8000',
    api_key=os.environ.get('API_KEY')
)

# Create training client
training_client = service_client.create_lora_training_client(
    base_model='Qwen/Qwen3.5-4B',
    rank=16
)

# Prepare data locally
dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B')
dataset.map(SelfCognitionProcessor('My Model', 'My Team'))
dataset.encode()
dataloader = DataLoader(dataset=dataset, batch_size=8)

# Training loop
for epoch in range(2):
    for batch in dataloader:
        training_client.forward_backward(batch, "cross_entropy")
        training_client.optim_step(learning_rate=1e-4)

# Save checkpoint
training_client.save_state("my-lora-checkpoint")
```

### Tinker Client

For compatibility with existing Tinker code:

```python
import os
from twinkle import init_tinker_client

# Patch Tinker SDK
init_tinker_client()

# Now use Tinker API as usual
from tinker import ServiceClient, types

service_client = ServiceClient(
    base_url='http://localhost:8000',
    api_key=os.environ.get('API_KEY')
)

training_client = service_client.create_lora_training_client(
    base_model='Qwen/Qwen3.5-4B',
    rank=16
)

# ... rest of Tinker training code
```

## Inference / Sampling

After training, use your LoRA for inference:

```python
from twinkle.data_format import Message, Trajectory
from twinkle.template import Template

# Create sampling client with trained LoRA
sampling_client = service_client.create_sampling_client(
    model_path='twinkle://my-lora-checkpoint',
    base_model='Qwen/Qwen3.5-4B'
)

# Prepare prompt
template = Template(model_id='ms://Qwen/Qwen3.5-4B')
trajectory = Trajectory(
    messages=[
        Message(role='system', content='You are a helpful assistant'),
        Message(role='user', content='Who are you?'),
    ]
)

input_feature = template.encode(trajectory, add_generation_prompt=True)
prompt = types.ModelInput.from_ints(input_feature['input_ids'].tolist())

# Sample
params = types.SamplingParams(
    max_tokens=128,
    temperature=0.7
)

result = sampling_client.sample(prompt=prompt, sampling_params=params)
print(template.decode(result.sequences[0].tokens))
```

## Cookbook Examples

Complete examples in `cookbook/client/`:

```
cookbook/client/
├── server/                         # Server configurations
│   ├── transformer/
│   │   ├── server.py
│   │   └── server_config.yaml
│   └── megatron/
│       ├── server.py
│       └── server_config.yaml
├── twinkle/                        # Twinkle Client examples
│   ├── self_host/
│   │   ├── grpo.py                 # GRPO training
│   │   ├── sample.py               # Inference
│   │   └── self_cognition.py       # SFT training
│   └── modelscope/
│       └── self_cognition.py
└── tinker/                         # Tinker Client examples
    ├── self_host/
    │   ├── lora.py
    │   ├── sample.py
    │   └── short_math_grpo.py
    └── modelscope/
        ├── sample.py
        └── self_cognition.py
```

## Running

```bash
# 1. Start Server
python cookbook/client/server/megatron/server.py

# 2. Run Client (in another terminal)
# Tinker Client
python cookbook/client/tinker/self_host/self_cognition.py

# Or Twinkle Client
python cookbook/client/twinkle/self_host/self_cognition.py
```
