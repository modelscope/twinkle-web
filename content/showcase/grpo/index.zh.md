---
title: GRPO (强化学习)
linkTitle: GRPO
weight: 50
---

Group Relative Policy Optimization — 使用 vLLM 采样 + 自定义奖励函数（如 GSM8K 数学）。

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/grpo/grpo.py)

```python
import twinkle
from twinkle import DeviceMesh, DeviceGroup, get_logger
from twinkle.advantage import GRPOAdvantage
from twinkle.checkpoint_engine import CheckpointEngineManager
from twinkle.cli import CLI
from twinkle.data_format import SamplingParams
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.model import TransformersModel
from twinkle.processor import InputProcessor
from twinkle.reward import GSM8KAccuracyReward, GSM8KFormatReward
from twinkle.sampler import vLLMSampler

args = CLI.from_args()
MODEL_GPUS, SAMPLER_GPUS = 4, 4

device_groups = [
    DeviceGroup(name='model', ranks=list(range(MODEL_GPUS)), device_type='GPU'),
    DeviceGroup(name='sampler', ranks=list(range(MODEL_GPUS, MODEL_GPUS + SAMPLER_GPUS)), device_type='GPU'),
]
twinkle.initialize(mode='ray', nproc_per_node=MODEL_GPUS + SAMPLER_GPUS, groups=device_groups)

model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B',
                          device_mesh=DeviceMesh.from_sizes(world_size=MODEL_GPUS, dp_size=MODEL_GPUS),
                          remote_group='model')
model.set_loss('GRPOLoss', epsilon=0.2)

sampler = vLLMSampler(model_id='ms://Qwen/Qwen3.5-4B',
                      engine_args={'gpu_memory_utilization': 0.8, 'max_model_len': 4496},
                      device_mesh=DeviceMesh.from_sizes(world_size=SAMPLER_GPUS, dp_size=SAMPLER_GPUS),
                      remote_group='sampler')

ckpt_manager = CheckpointEngineManager(model=model, sampler=sampler)
advantage_fn = GRPOAdvantage()

dataset = Dataset(dataset_meta=DatasetMeta('ms://modelscope/gsm8k'))
dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B')
dataset.encode(add_generation_prompt=True)
dataloader = DataLoader(dataset=dataset, batch_size=8)

for batch in dataloader:
    ckpt_manager.sync_weights(merge_and_sync=False)
    expand_prompts = [p for prompt in batch for p in [prompt] * 8]  # 组采样
    responses = sampler.sample(expand_prompts, SamplingParams(max_tokens=4096, logprobs=1))
    # 从响应中提取轨迹、旧 log-probs 并计算奖励
    inputs = [seq.new_input_feature for r in responses for seq in r.sequences]
    old_logps = [[lp[0][1] for lp in seq.logprobs] for r in responses for seq in r.sequences]
    rewards = [a + f for a, f in zip(
        GSM8KAccuracyReward()(inputs), GSM8KFormatReward()(inputs))]
    advantages = advantage_fn(rewards, num_generations=8, scale='group')
    model.forward_backward(inputs=inputs, old_logps=old_logps, advantages=advantages)
    model.clip_grad_and_step()
```
