---
title: Cookbook
weight: 5
---

Practical examples for common training scenarios.

## FSDP Training

Fully Sharded Data Parallel training with Transformers:

```python
from peft import LoraConfig
import twinkle
from twinkle import DeviceMesh
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.model import TransformersModel
from twinkle.preprocessor import SelfCognitionProcessor

# FSDP with 4 shards, 2-way data parallel
device_mesh = DeviceMesh.from_sizes(fsdp_size=4, dp_size=2)
twinkle.initialize(mode='local', global_device_mesh=device_mesh)

def train():
    dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
    dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B')
    dataset.map(SelfCognitionProcessor('Twinkle', 'ModelScope'))
    dataset.encode()
    
    dataloader = DataLoader(dataset=dataset, batch_size=8)
    model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
    
    lora_config = LoraConfig(r=8, lora_alpha=32, target_modules='all-linear')
    model.add_adapter_to_model('default', lora_config)
    model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)
    model.set_lr_scheduler(
        scheduler_cls='CosineWarmupScheduler',
        num_warmup_steps=5,
        num_training_steps=len(dataloader)
    )
    
    for step, batch in enumerate(dataloader):
        model.forward_backward(inputs=batch)
        model.clip_grad_and_step()
    
    model.save('fsdp-checkpoint')

if __name__ == '__main__':
    train()
```

Run with:
```bash
torchrun --nproc_per_node=8 train.py
```

## MoE Training

Training Mixture of Experts models:

```python
from twinkle import DeviceMesh
from twinkle.model import TransformersModel

# Expert parallelism + FSDP
device_mesh = DeviceMesh.from_sizes(ep_size=2, fsdp_size=4)
twinkle.initialize(mode='local', global_device_mesh=device_mesh)

model = TransformersModel(model_id='ms://Qwen/Qwen3.6-35B-A3B')
```

## Sequence Parallelism

For long context training:

```python
device_mesh = DeviceMesh.from_sizes(sp_size=4, dp_size=2)
twinkle.initialize(mode='local', global_device_mesh=device_mesh)

model = TransformersModel(
    model_id='ms://Qwen/Qwen3.5-4B',
    sequence_parallel=True
)
```

## GRPO Training

Group Relative Policy Optimization:

```python
import twinkle
from twinkle import DeviceMesh, DeviceGroup
from twinkle.advantage import GRPOAdvantage
from twinkle.data_format import SamplingParams
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.metric import CompletionRewardMetric
from twinkle.model import TransformersModel
from twinkle.reward import GSM8KAccuracyReward, GSM8KFormatReward
from twinkle.sampler import vLLMSampler

MODEL_ID = 'ms://Qwen/Qwen3.5-4B'
NUM_GENERATIONS = 8

device_groups = [
    DeviceGroup(name='model', ranks=4, device_type='cuda'),
    DeviceGroup(name='sampler', ranks=4, device_type='cuda'),
]
model_mesh = DeviceMesh.from_sizes(world_size=4, dp_size=4)
sampler_mesh = DeviceMesh.from_sizes(world_size=4, dp_size=4)
twinkle.initialize(mode='ray', nproc_per_node=8, groups=device_groups)

def train():
    # Dataset
    dataset = Dataset(DatasetMeta('ms://modelscope/gsm8k', split='train'))
    dataset.set_template('Qwen3_5Template', model_id=MODEL_ID)
    dataset.encode(add_generation_prompt=True)
    dataloader = DataLoader(dataset=dataset, batch_size=16)
    
    # Model
    model = TransformersModel(
        model_id=MODEL_ID,
        remote_group='model',
        device_mesh=model_mesh
    )
    model.set_loss('GRPOLoss', epsilon=0.2)
    model.set_optimizer('AdamW', lr=1e-5)
    
    # Sampler
    sampler = vLLMSampler(
        model_id=MODEL_ID,
        device_mesh=sampler_mesh,
        remote_group='sampler'
    )
    
    # Reward and Advantage
    accuracy_reward = GSM8KAccuracyReward()
    format_reward = GSM8KFormatReward()
    advantage_fn = GRPOAdvantage()
    
    sampling_params = SamplingParams(max_tokens=4096, num_samples=1)
    
    for batch in dataloader:
        # Sample completions
        responses = sampler.sample(batch * NUM_GENERATIONS, sampling_params)
        
        # Compute rewards
        accuracy = accuracy_reward(responses)
        format_r = format_reward(responses)
        total_rewards = [a + f for a, f in zip(accuracy, format_r)]
        
        # Compute advantages
        advantages = advantage_fn(
            total_rewards,
            num_generations=NUM_GENERATIONS,
            scale='group'
        ).tolist()
        
        # Extract data
        inputs = [seq.new_input_feature for r in responses for seq in r.sequences]
        old_logps = [[lp[0][1] for lp in seq.logprobs] for r in responses for seq in r.sequences]
        
        # Train
        model.forward_backward(
            inputs=inputs,
            old_logps=old_logps,
            advantages=advantages
        )
        model.clip_grad_and_step()
    
    model.save('grpo-checkpoint')

if __name__ == '__main__':
    train()
```

## GKD Training

Generalized Knowledge Distillation:

```python
from twinkle.model import TransformersModel

# Teacher and student models
teacher = TransformersModel(model_id='ms://Qwen/Qwen3.5-9B', requires_grad=False)
student = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B')

student.set_loss('GKDLoss', teacher=teacher, temperature=2.0)

for batch in dataloader:
    student.forward_backward(inputs=batch)
    student.clip_grad_and_step()
```

## Megatron Training

Using Megatron backend for 3D parallelism:

```python
from twinkle import DeviceMesh
from twinkle.model.megatron import MegatronModel

# Tensor + Pipeline + Data parallelism
device_mesh = DeviceMesh.from_sizes(tp_size=2, pp_size=2, dp_size=2)
twinkle.initialize(mode='ray', global_device_mesh=device_mesh)

model = MegatronModel(
    model_id='ms://Qwen/Qwen3.5-4B',
    device_mesh=device_mesh,
    mixed_precision='bf16'
)

model.add_adapter_to_model('default', lora_config)
model.set_optimizer('default', lr=1e-4)

for batch in dataloader:
    model.forward_backward(inputs=batch)
    model.clip_grad_and_step()
```

## Custom Reward Function

Implementing domain-specific rewards:

```python
from twinkle.reward.base import Reward
from typing import List

class MyCustomReward(Reward):
    def __call__(self, trajectories: List[dict], ground_truths: List[dict]) -> List[float]:
        rewards = []
        for traj in trajectories:
            # Extract completion
            messages = traj.get('messages', [])
            completion = ''
            for msg in reversed(messages):
                if msg.get('role') == 'assistant':
                    completion = msg.get('content', '')
                    break
            
            # Custom scoring logic
            score = self.compute_score(completion)
            rewards.append(score)
        
        return rewards
    
    def compute_score(self, completion: str) -> float:
        # Your scoring logic here
        return 1.0 if 'correct' in completion else 0.0
```

## Using HuggingFace Models

Switch from ModelScope to HuggingFace:

```python
# ModelScope
model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B')

# HuggingFace
model = TransformersModel(model_id='hf://Qwen/Qwen3.5-4B')
```

## NPU Support

Training on Ascend NPUs:

```python
device_group = [
    DeviceGroup(name='default', ranks=8, device_type='npu')
]

twinkle.initialize(mode='local', groups=device_group)
```

See the [Twinkle cookbook](https://github.com/modelscope/twinkle/tree/main/cookbook) for more examples.
