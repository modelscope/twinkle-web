---
title: 训练即服务
weight: 4
---

Twinkle 内置企业级训练即服务（TaaS）部署能力。

## 魔搭 TaaS

Twinkle 驱动魔搭社区的训练服务。你可以免费体验 Twinkle 的训练 API：

1. 加入 [Twinkle-Explorers](https://modelscope.cn/organization/twinkle-explorers) 组织
2. 使用 API 端点：`base_url=https://www.modelscope.cn/twinkle`

## 无服务器训练

通过 Tinker 兼容 API 访问托管训练服务：

```python
from tinker import ServiceClient, types
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.preprocessor import SelfCognitionProcessor
from twinkle.server.common import input_feature_to_datum

# 基座模型（当前为 Qwen3.6-27B）
base_model = 'Qwen/Qwen3.6-27B'

# 准备数据集
dataset = Dataset(dataset_meta=DatasetMeta(
    'ms://swift/self-cognition',
    data_slice=range(500)
))
dataset.set_template('Qwen3_5Template', model_id=f'ms://{base_model}', max_length=256)
dataset.map(SelfCognitionProcessor('Twinkle Model', 'ModelScope'))
dataset.encode(batched=True)

dataloader = DataLoader(dataset=dataset, batch_size=8)

# 连接魔搭 TaaS
service_client = ServiceClient(
    base_url='https://www.modelscope.cn/twinkle',
    api_key='your-api-key'
)

# 创建训练客户端
training_client = service_client.create_lora_training_client(
    base_model=base_model,
    rank=16
)

# 训练循环
for epoch in range(3):
    for step, batch in enumerate(dataloader):
        input_datum = [input_feature_to_datum(f) for f in batch]
        
        # 前向-反向传播
        fwdbwd_future = training_client.forward_backward(
            input_datum,
            'cross_entropy'
        )
        
        # 优化器步进
        optim_future = training_client.optim_step(
            types.AdamParams(learning_rate=1e-4)
        )
        
        fwdbwd_future.result()
        optim_result = optim_future.result()
        print(f'Step {step}: {optim_result}')
    
    # 每个 epoch 后保存检查点
    save_result = training_client.save_state(f'epoch-{epoch}').result()
    print(f'Saved to {save_result.path}')
```

## 自建部署

部署你自己的 TaaS 实例：

### 1. 启动 Ray 集群

```bash
# Head 节点
CUDA_VISIBLE_DEVICES=0,1,2,3 ray start --head --port=6379 --num-gpus=4

# Worker 节点（可选）
CUDA_VISIBLE_DEVICES=4,5,6,7 ray start --address=head:6379 --num-gpus=4
```

### 2. 启动训练服务端

```python
# server.py
import twinkle
from twinkle import DeviceGroup

device_groups = [
    DeviceGroup(name='model', ranks=4, device_type='cuda'),
    DeviceGroup(name='sampler', ranks=4, device_type='cuda'),
]

twinkle.initialize(mode='http', groups=device_groups)

# 服务启动于 http://0.0.0.0:8000
```

```bash
python server.py
```

### 3. 连接客户端

```python
from twinkle_client import init_twinkle_client

client = init_twinkle_client(
    base_url='http://your-server:8000',
    api_key='your-api-key'
)
```

## 支持的模型

| 模型 | 规模 | HuggingFace ID | Megatron |
|:-----|:-----|:---------------|:---------|
| Qwen3.6 | 4B-35B-A3B | Qwen/Qwen3.6-* | 支持 |
| Qwen3.5 | 2B-27B | Qwen/Qwen3.5-* | 支持 |
| Qwen3 | 0.6B-32B | Qwen/Qwen3-* | 支持 |
| Qwen2.5 | 0.5B-72B | Qwen/Qwen2.5-* | 支持 |
| DeepSeek-R1 | 多种 | deepseek-ai/DeepSeek-R1 | 支持 |

## 支持的硬件

| 平台 | 状态 |
|:-----|:-----|
| NVIDIA GPU | 完整支持 |
| 昇腾 NPU | 部分支持 |
| PPU | 支持 |
| CPU | 仅 Dataset/DataLoader |

## API 端点

### 训练

- `POST /forward_backward` - 计算梯度
- `POST /optim_step` - 更新权重
- `POST /save_state` - 保存检查点

### 采样

- `POST /sample` - 生成补全

### 管理

- `GET /health` - 服务健康检查
- `GET /metrics` - 训练指标

## 监控

跟踪训练进度和资源使用：

```python
# 获取训练指标
metrics = model.calculate_metric(is_training=True)
print(f'Loss: {metrics["loss"]}, LR: {metrics["lr"]}')
```

## 安全

- **API Key 认证**：所有请求需要有效的 API Key
- **租户隔离**：每个租户的数据和权重完全隔离
- **检查点访问控制**：检查点按租户独立存储
