---
title: "魔搭社区免费 LLM 训练：Twinkle 训练即服务"
date: 2026-03-15
authors:
  - admin
tags:
  - ModelScope
  - TaaS
  - 云端训练
  - 免费
categories:
  - 教程
---

我们很高兴地宣布，**Twinkle 训练即服务（TaaS）** 现已在魔搭社区上线！开发者可以免费体验 Twinkle 的训练 API——无需 GPU 集群。

<!--more-->

## 什么是 TaaS？

训练即服务（Training-as-a-Service）让你通过简单的 API 微调大语言模型，无需管理基础设施。模型运行在魔搭的后台服务器上；你只需发送数据，即可获得训练好的适配器。

当前可用模型：**[Qwen/Qwen3-30B-A3B-Instruct-2507](https://www.modelscope.cn/models/Qwen/Qwen3-30B-A3B-Instruct-2507)**

## 快速开始

### 第一步：加入 Twinkle-Explorers

1. 在 [魔搭社区](https://www.modelscope.cn/) 注册账号
2. 申请加入 [Twinkle-Explorers](https://modelscope.cn/organization/twinkle-explorers) 组织
3. 获批后，在此获取 API Key：https://www.modelscope.cn/my/access/token

**调用端点**：`base_url="https://www.modelscope.cn/twinkle"`

### 第二步：训练你的第一个 LoRA

以下是训练自我认知 LoRA 的完整示例：

```python
import os
from tqdm import tqdm
from tinker import types
from twinkle_client import init_tinker_client
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.preprocessor import SelfCognitionProcessor
from twinkle.server.common import input_feature_to_datum

base_model = 'ms://Qwen/Qwen3-30B-A3B-Instruct-2507'
base_url = 'http://www.modelscope.cn/twinkle'
api_key = os.environ.get('MODELSCOPE_TOKEN')

# 加载并预处理数据集
dataset = Dataset(
    dataset_meta=DatasetMeta('ms://swift/self-cognition', data_slice=range(500))
)
dataset.set_template('Template', model_id=base_model, max_length=256)
dataset.map(
    SelfCognitionProcessor('Twinkle Model', 'ModelScope Team'), 
    load_from_cache_file=False
)
dataset.encode(batched=True, load_from_cache_file=False)
dataloader = DataLoader(dataset=dataset, batch_size=8)

# 初始化客户端
init_tinker_client()
from tinker import ServiceClient

service_client = ServiceClient(base_url=base_url, api_key=api_key)
training_client = service_client.create_lora_training_client(
    base_model=base_model[len('ms://'):], 
    rank=16
)

# 训练循环
for epoch in range(2):
    for step, batch in tqdm(enumerate(dataloader)):
        input_datum = [input_feature_to_datum(f) for f in batch]

        fwdbwd_future = training_client.forward_backward(input_datum, "cross_entropy")
        optim_future = training_client.optim_step(types.AdamParams(learning_rate=1e-4))

        fwdbwd_result = fwdbwd_future.result()
        optim_result = optim_future.result()
        print(f'Training Metrics: {optim_result}')

    # 保存检查点
    result = training_client.save_state(f"twinkle-lora-{epoch}").result()
    print(f'Saved checkpoint for epoch {epoch} to {result.path}')
```

### 第三步：使用你的 LoRA 进行推理

训练完成后，使用你的 LoRA 进行推理：

```python
import os
from tinker import types
from twinkle.data_format import Message, Trajectory
from twinkle.template import Template
from twinkle import init_tinker_client

init_tinker_client()
from tinker import ServiceClient

base_model = 'Qwen/Qwen3-30B-A3B-Instruct-2507'
base_url = 'http://www.modelscope.cn/twinkle'

service_client = ServiceClient(
    base_url=base_url,
    api_key=os.environ.get('MODELSCOPE_TOKEN')
)

# 加载训练好的 LoRA
sampling_client = service_client.create_sampling_client(
    model_path='twinkle://xxx-Qwen_Qwen3-30B-A3B-Instruct-2507-xxx/weights/twinkle-lora-1',
    base_model=base_model
)

# 准备提示词
template = Template(model_id=f'ms://{base_model}')
trajectory = Trajectory(
    messages=[
        Message(role='system', content='You are a helpful assistant'),
        Message(role='user', content='Who are you?'),
    ]
)

input_feature = template.encode(trajectory, add_generation_prompt=True)
prompt = types.ModelInput.from_ints(input_feature['input_ids'].tolist())

# 采样
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

## 支持的训练方式

| 方法 | 支持情况 |
|------|----------|
| SFT（监督微调） | ✅ |
| PT（预训练） | ✅ |
| Agentic 训练 | ✅ |
| GRPO | ✅ |
| RLOO | ✅ |
| GKD / On-policy 蒸馏 | ✅（需自备 Teacher 模型） |

## LoRA 限制

免费版有一些限制：

| 参数 | 限制 |
|------|------|
| 最大 Rank | 32 |
| modules_to_save | 不支持 |
| 多模态 | 仅支持文本（Qwen3-30B） |

## 可自定义的内容

- **数据集**：使用自己的数据
- **模板**：自定义提示格式
- **奖励函数**：用于 RL 训练
- **优势函数**：自定义奖励塑形

> **注意**：自定义损失函数出于安全原因需要白名单。通过 GitHub issue 或答疑群联系我们，将对应组件开放白名单即可使用。

## 导出和部署

训练完成后，你可以：
1. 将 LoRA 与基座模型合并
2. 部署在自己的基础设施上
3. 使用 OpenAI 标准接口调用

## 立即开始

1. 加入 [Twinkle-Explorers](https://modelscope.cn/organization/twinkle-explorers)
2. 查看 [Cookbook](https://github.com/modelscope/twinkle/tree/main/cookbook/client/tinker)
3. 开始训练！

有问题？在 [GitHub](https://github.com/modelscope/twinkle/issues) 上提 issue 或加入我们的微信群。
