---
title: Multi-Turn RL (OpenEnv)
linkTitle: Multi-Turn RL
weight: 70
---

Multi-turn GRPO with interactive environments — the agent takes actions via tool calls and learns from episode rewards.

[View full source →](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/multi_turn/multi_turn_grpo.py)

```python
import twinkle
from twinkle import DeviceMesh, DeviceGroup
from twinkle.advantage import GRPOAdvantage
from twinkle.sampler import vLLMSampler
from twinkle.model import TransformersModel
from twinkle_agentic.envs import OpenEnv, EnvTool
from twinkle_agentic.rollout.multi_turn import MultiTurnRollout
from twinkle_agentic.tools.tool_manager import ToolManager

# Initialize Ray with model + sampler groups
twinkle.initialize(mode='ray', nproc_per_node=8, groups=device_groups)

model = TransformersModel(model_id=MODEL_ID, remote_group='model')
sampler = vLLMSampler(model_id=MODEL_ID, remote_group='sampler')

rollout = MultiTurnRollout(sampler=sampler, template=template,
                           sampling_params=sampling_params, max_turns=6)

for step in range(MAX_STEPS):
    # 1. Reset environments and get initial observations
    trajectories, tool_managers, env_tools = prepare_trajectories(n, env_url, tool_schema)
    # 2. Multi-turn rollout: model generates tool calls, env responds
    all_trajectories = rollout(trajectories, tool_manager=tool_managers)
    # 3. Extract episode rewards from environments
    rewards = extract_rewards(env_tools)
    # 4. GRPO advantage → forward_backward → step
    advantages = GRPOAdvantage()(rewards, num_generations=8, scale='group')
    model.forward_backward(inputs=all_trajectories, advantages=advantages)
    model.clip_grad_and_step()
```
