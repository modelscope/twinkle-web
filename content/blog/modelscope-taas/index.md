---
title: "Free LLM Training on ModelScope: Twinkle Training-as-a-Service"
date: 2026-03-15
tags:
  - ModelScope
  - TaaS
  - Cloud Training
  - Free
categories:
  - Tutorials
---

We're excited to announce that **Twinkle Training-as-a-Service (TaaS)** is now available on ModelScope! Developers can experience Twinkle's training API for free—no GPU cluster required.

<!--more-->

## What is TaaS?

Training-as-a-Service lets you fine-tune large language models through a simple API, without managing infrastructure. The model runs on ModelScope's backend servers; you just send data and receive trained adapters.

Currently available model: **[Qwen/Qwen3.6-35B-A3B](https://www.modelscope.cn/models/Qwen/Qwen3.6-35B-A3B)**

## Getting Started

### Step 1: Join Twinkle-Explorers

1. Register at [ModelScope](https://www.modelscope.cn/)
2. Apply to join [Twinkle-Explorers](https://modelscope.cn/organization/twinkle-explorers) organization
3. Once approved, get your API key at: https://www.modelscope.cn/my/access/token

**Endpoint**: `base_url="https://www.modelscope.cn/twinkle"`

### Step 2: Train Your First LoRA

Here's a complete example training a self-cognition LoRA:

```python
import os
from tqdm import tqdm
from tinker import types
from twinkle import init_tinker_client
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.preprocessor import SelfCognitionProcessor
from twinkle.server.common import input_feature_to_datum

base_model = 'Qwen/Qwen3.6-35B-A3B'
base_url = 'http://www.modelscope.cn/twinkle'
api_key = os.environ.get('MODELSCOPE_TOKEN')

# Load and preprocess dataset
dataset = Dataset(
    dataset_meta=DatasetMeta('ms://swift/self-cognition', data_slice=range(500))
)
dataset.set_template('Qwen3_5Template', model_id=f'ms://{base_model}', max_length=256)
dataset.map(
    SelfCognitionProcessor('Twinkle Model', 'ModelScope Team'), 
    load_from_cache_file=False
)
dataset.encode(batched=True, load_from_cache_file=False)
dataloader = DataLoader(dataset=dataset, batch_size=8)

# Initialize client
init_tinker_client()
from tinker import ServiceClient

service_client = ServiceClient(base_url=base_url, api_key=api_key)
training_client = service_client.create_lora_training_client(
    base_model=base_model, 
    rank=16
)

# Training loop
for epoch in range(2):
    for step, batch in tqdm(enumerate(dataloader)):
        input_datum = [input_feature_to_datum(f) for f in batch]

        fwdbwd_future = training_client.forward_backward(input_datum, "cross_entropy")
        optim_future = training_client.optim_step(types.AdamParams(learning_rate=1e-4))

        fwdbwd_result = fwdbwd_future.result()
        optim_result = optim_future.result()
        print(f'Training Metrics: {optim_result}')

    # Save checkpoint
    result = training_client.save_state(f"twinkle-lora-{epoch}").result()
    print(f'Saved checkpoint for epoch {epoch} to {result.path}')
```

### Step 3: Inference with Your LoRA

After training, use your LoRA for inference:

```python
import os
from tinker import types
from twinkle.data_format import Message, Trajectory
from twinkle.template import Template
from twinkle import init_tinker_client

init_tinker_client()
from tinker import ServiceClient

base_model = 'Qwen/Qwen3.6-35B-A3B'
base_url = 'http://www.modelscope.cn/twinkle'

service_client = ServiceClient(
    base_url=base_url,
    api_key=os.environ.get('MODELSCOPE_TOKEN')
)

# Load your trained LoRA
sampling_client = service_client.create_sampling_client(
    model_path='twinkle://xxx-Qwen_Qwen3.6-35B-A3B-xxx/weights/twinkle-lora-1',
    base_model=base_model
)

# Prepare prompt
template = Template(model_id=f'ms://{base_model}')
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
    temperature=0.7,
    stop=['\n']
)

future = sampling_client.sample(prompt=prompt, sampling_params=params, num_samples=1)
result = future.result()

for i, seq in enumerate(result.sequences):
    print(f'{i}: {repr(template.decode(seq.tokens))}')
```

## Supported Training Methods

| Method | Support |
|--------|---------|
| SFT (Supervised Fine-Tuning) | ✅ |
| PT (Pre-training) | ✅ |
| Agentic Training | ✅ |
| GRPO | ✅ |
| RLOO | ✅ |
| GKD / On-policy Distillation | ✅ (bring your own teacher) |

## LoRA Constraints

The free tier has some limitations:

| Parameter | Limit |
|-----------|-------|
| Max Rank | 32 |
| modules_to_save | Not supported |
| Multimodal | Text-only (Qwen3.6-35B) |

## What You Can Customize

- **Datasets**: Bring your own data
- **Templates**: Custom prompt formats  
- **Reward Functions**: For RL training
- **Advantage Functions**: Custom reward shaping

> **Note**: Custom loss functions require whitelisting for security. Contact us via GitHub issues to enable your loss implementation.

## Export and Deploy

After training, you can:
1. Merge the LoRA with the base model
2. Deploy on your own infrastructure
3. Use standard OpenAI-compatible APIs

## Get Started Now

1. Join [Twinkle-Explorers](https://modelscope.cn/organization/twinkle-explorers)
2. Check out the [Cookbook](https://github.com/modelscope/twinkle/tree/main/cookbook/client/tinker)
3. Start training!

Questions? Open an issue on [GitHub](https://github.com/modelscope/twinkle/issues) or join our WeChat group.
