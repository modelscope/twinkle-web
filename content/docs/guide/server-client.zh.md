---
title: 服务端与客户端
weight: 4
---

Twinkle 提供完整的 HTTP Server/Client 架构，用于将模型部署为服务并远程调用进行训练和推理。

## 核心概念

该架构解耦了**模型托管（Server）**和**训练逻辑（Client）**：

- **服务端**：基于 Ray Serve 部署，托管模型权重，处理 forward/backward、采样和权重管理
- **客户端**：本地运行，处理数据准备、训练循环和超参数配置

```
┌──────────────────┐          HTTP          ┌──────────────────────────┐
│      客户端       │ ◄───────────────────► │          服务端           │
│  ┌────────────┐  │                       │  ┌────────────────────┐  │
│  │  Dataset   │  │      数据 + 命令      │  │      基座模型       │  │
│  │  Template  │  │ ──────────────────►   │  ├────────────────────┤  │
│  │  Optimizer │  │                       │  │ LoRA A │ LoRA B │..│  │
│  └────────────┘  │  ◄──────────────────  │  └────────────────────┘  │
│                  │      梯度 + 指标       │                          │
└──────────────────┘                       └──────────────────────────┘
```

## 两种模型后端

| 后端 | use_megatron | 说明 |
|------|--------------|------|
| **Transformers** | `false` | HuggingFace Transformers，适用于大多数场景 |
| **Megatron** | `true` | Megatron-LM，用于超大规模模型的高级并行化 |

## 两种客户端模式

| 客户端 | 初始化方式 | 说明 |
|--------|------------|------|
| **Twinkle Client** | `init_twinkle_client` | 原生客户端，将 `from twinkle import` 改为 `from twinkle_client import` |
| **Tinker Client** | `init_tinker_client` | 打补丁到 Tinker SDK，复用现有 Tinker 训练代码 |

### 如何选择

| 场景 | 推荐 |
|------|------|
| 已有 Twinkle 本地代码，想远程化 | Twinkle Client — 只需更改 import |
| 已有 Tinker 代码，想复用 | Tinker Client — 只需初始化补丁 |
| 新项目 | Twinkle Client — API 更简单 |

## 服务端配置

### 基本服务端设置

创建 `server_config.yaml`：

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

启动服务端：

```python
# server.py
from twinkle.server import TwinkleServer

server = TwinkleServer.from_config('server_config.yaml')
server.run()
```

```bash
python server.py
```

### Megatron 后端

用于超大模型的张量/流水线并行：

```yaml
model:
  model_id: Qwen/Qwen3.5-72B
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

## 客户端使用

### Twinkle Client

```python
import os
from twinkle_client import init_twinkle_client

# 初始化客户端
init_twinkle_client()

from twinkle_client import ServiceClient
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.preprocessor import SelfCognitionProcessor

# 连接服务端
service_client = ServiceClient(
    base_url='http://localhost:8000',
    api_key=os.environ.get('API_KEY')
)

# 创建训练客户端
training_client = service_client.create_lora_training_client(
    base_model='Qwen/Qwen3.5-4B',
    rank=16
)

# 本地准备数据
dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B')
dataset.map(SelfCognitionProcessor('My Model', 'My Team'))
dataset.encode()
dataloader = DataLoader(dataset=dataset, batch_size=8)

# 训练循环
for epoch in range(2):
    for batch in dataloader:
        training_client.forward_backward(batch, "cross_entropy")
        training_client.optim_step(learning_rate=1e-4)

# 保存检查点
training_client.save_state("my-lora-checkpoint")
```

### Tinker Client

兼容现有 Tinker 代码：

```python
import os
from twinkle import init_tinker_client

# 打补丁到 Tinker SDK
init_tinker_client()

# 现在可以正常使用 Tinker API
from tinker import ServiceClient, types

service_client = ServiceClient(
    base_url='http://localhost:8000',
    api_key=os.environ.get('API_KEY')
)

training_client = service_client.create_lora_training_client(
    base_model='Qwen/Qwen3.5-4B',
    rank=16
)

# ... 其余 Tinker 训练代码
```

## 推理 / 采样

训练完成后，使用你的 LoRA 进行推理：

```python
from twinkle.data_format import Message, Trajectory
from twinkle.template import Template

# 使用训练好的 LoRA 创建采样客户端
sampling_client = service_client.create_sampling_client(
    model_path='twinkle://my-lora-checkpoint',
    base_model='Qwen/Qwen3.5-4B'
)

# 准备提示词
template = Template(model_id='ms://Qwen/Qwen3.5-4B')
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
    temperature=0.7
)

result = sampling_client.sample(prompt=prompt, sampling_params=params)
print(template.decode(result.sequences[0].tokens))
```

## Cookbook 示例

完整示例在 `cookbook/client/` 目录：

```
cookbook/client/
├── server/                         # 服务端配置
│   ├── transformer/
│   │   ├── server.py
│   │   └── server_config.yaml
│   └── megatron/
│       ├── server.py
│       └── server_config.yaml
├── twinkle/                        # Twinkle Client 示例
│   ├── self_host/
│   │   ├── grpo.py                 # GRPO 训练
│   │   ├── sample.py               # 推理
│   │   └── self_cognition.py       # SFT 训练
│   └── modelscope/
│       └── self_cognition.py
└── tinker/                         # Tinker Client 示例
    ├── self_host/
    │   ├── lora.py
    │   ├── sample.py
    │   └── short_math_grpo.py
    └── modelscope/
        ├── sample.py
        └── self_cognition.py
```

## 运行

```bash
# 1. 启动服务端
python cookbook/client/server/megatron/server.py

# 2. 运行客户端（在另一个终端）
# Tinker Client
python cookbook/client/tinker/self_host/self_cognition.py

# 或 Twinkle Client
python cookbook/client/twinkle/self_host/self_cognition.py
```
