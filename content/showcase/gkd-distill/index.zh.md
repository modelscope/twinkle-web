---
title: On-Policy 蒸馏 (GKD)
linkTitle: GKD 蒸馏
weight: 60
---

广义知识蒸馏：学生 on-policy 生成，教师提供 top-k logprobs，学生学习匹配教师分布。

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/gkd/gkd_on_policy.py)

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
    # 学生 on-policy 生成
    student_output = student_sampler.sample(batch, SamplingParams(max_tokens=2048))
    input_data = [seq.new_input_feature for r in student_output for seq in r.sequences]
    # 教师对学生生成内容打分（top-k logprobs）
    teacher_output = teacher_sampler.sample(
        input_data, SamplingParams(max_tokens=0, prompt_logprobs=64))
    # convert_topk_prompt_logprobs: 完整源码中定义的工具函数
    # 将 vLLM topk_prompt_logprobs 转换为 {teacher_topk_logprobs, teacher_topk_indices} 张量
    teacher_logprobs = convert_topk_prompt_logprobs(
        [resp.topk_prompt_logprobs for resp in teacher_output])
    # GKD 反向传播
    student_model.forward_backward(inputs=input_data, **teacher_logprobs)
    student_model.clip_grad_and_step()
```
