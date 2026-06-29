---
title: On-Policy Distillation (GKD)
linkTitle: GKD Distill
weight: 60
---

Generalized Knowledge Distillation: student generates on-policy, teacher provides top-k logprobs, student learns to match teacher's distribution.

[View full source →](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/gkd/gkd_on_policy.py)

```python
import twinkle
from twinkle import DeviceMesh, DeviceGroup
from twinkle.checkpoint_engine import CheckpointEngineManager
from twinkle.data_format import SamplingParams
from twinkle.dataloader import DataLoader
from twinkle.dataset import DatasetMeta, LazyDataset
from twinkle.loss import GKDLoss
from twinkle.model import TransformersModel
from twinkle.sampler import vLLMSampler

device_groups = [
    DeviceGroup(name='student_model', ranks=4, device_type='cuda'),
    DeviceGroup(name='student_sampler', ranks=2, device_type='cuda'),
    DeviceGroup(name='teacher_sampler', ranks=2, device_type='cuda'),
]
twinkle.initialize(mode='ray', nproc_per_node=8, groups=device_groups)

student_model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B', remote_group='student_model')
student_model.set_loss(GKDLoss(beta=0.5, temperature=1.0))

student_sampler = vLLMSampler(model_id='ms://Qwen/Qwen3.5-4B', remote_group='student_sampler')
teacher_sampler = vLLMSampler(model_id='ms://Qwen/Qwen3.5-9B', remote_group='teacher_sampler')

ckpt_manager = CheckpointEngineManager(model=student_model, sampler=student_sampler)

dataset = LazyDataset(DatasetMeta('ms://AI-ModelScope/OlympiadBench'))
dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B')
dataloader = DataLoader(dataset=dataset, batch_size=4)

for batch in dataloader:
    ckpt_manager.sync_weights(merge_and_sync=False)
    # Student generates on-policy completions
    student_output = student_sampler.sample(batch, SamplingParams(max_tokens=2048))
    input_data = [seq.new_input_feature for r in student_output for seq in r.sequences]
    # Teacher scores the student's completions (top-k logprobs)
    teacher_output = teacher_sampler.sample(
        input_data, SamplingParams(max_tokens=0, prompt_logprobs=64))
    # convert_topk_prompt_logprobs: utility defined in the full source
    # converts vLLM topk_prompt_logprobs → {teacher_topk_logprobs, teacher_topk_indices} tensors
    teacher_logprobs = convert_topk_prompt_logprobs(
        [resp.topk_prompt_logprobs for resp in teacher_output])
    # GKD backward
    student_model.forward_backward(inputs=input_data, **teacher_logprobs)
    student_model.clip_grad_and_step()
```
