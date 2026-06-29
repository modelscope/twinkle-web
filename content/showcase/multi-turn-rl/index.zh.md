---
title: 多轮 RL (OpenEnv)
linkTitle: 多轮 RL
weight: 70
---

多轮 GRPO + 交互式环境 — Agent 通过 tool call 与环境交互，从 episode reward 中学习。

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/multi_turn/multi_turn_grpo.py)

```python
import twinkle
from twinkle import DeviceMesh, DeviceGroup
from twinkle.advantage import GRPOAdvantage
from twinkle.data_format import SamplingParams
from twinkle.sampler import vLLMSampler
from twinkle.model import TransformersModel
from twinkle_agentic.envs import OpenEnv, EnvTool
from twinkle_agentic.rollout.multi_turn import MultiTurnRollout
from twinkle_agentic.tools.tool_manager import ToolManager

MODEL_ID = 'ms://Qwen/Qwen3.5-4B'
MODEL_GPUS, SAMPLER_GPUS = 4, 4
MAX_STEPS = 1000

device_groups = [
    DeviceGroup(name='model', ranks=list(range(MODEL_GPUS)), device_type='GPU'),
    DeviceGroup(name='sampler', ranks=list(range(MODEL_GPUS, MODEL_GPUS + SAMPLER_GPUS)), device_type='GPU'),
]
twinkle.initialize(mode='ray', nproc_per_node=8, groups=device_groups)

model = TransformersModel(model_id=MODEL_ID, remote_group='model')
sampler = vLLMSampler(model_id=MODEL_ID, remote_group='sampler')

sampling_params = SamplingParams(max_tokens=2048)
rollout = MultiTurnRollout(sampler=sampler,
                           sampling_params=sampling_params, max_turns=6)

for step in range(MAX_STEPS):
    # 1. 重置环境，获取初始观测
    # prepare_trajectories: 创建 OpenEnv 连接，重置环境，构建初始 trajectory 字典
    trajectories, tool_managers, env_tools = prepare_trajectories(
        n_trajectories=BATCH_SIZE * 8, env_url='http://localhost:8000',
        tool_schema=TOOL_SCHEMA, system_prompt=SYSTEM_PROMPT)
    # 2. 多轮 rollout：模型生成 tool call，环境返回观测
    all_trajectories = rollout(trajectories, tool_manager=tool_managers)
    # 3. 从环境提取 episode reward
    # extract_rewards: 从每个 EnvTool 实例读取累积奖励
    rewards = extract_rewards(env_tools)
    # 4. GRPO advantage → forward_backward → step
    advantages = GRPOAdvantage()(rewards, num_generations=8, scale='group')
    model.forward_backward(inputs=all_trajectories, advantages=advantages)
    model.clip_grad_and_step()
```
