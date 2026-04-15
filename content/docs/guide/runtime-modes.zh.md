---
title: 运行模式
weight: 2
---

Twinkle 支持多种运行模式以适配不同部署场景。同一训练代码可在所有模式下运行，改动极小。

## 单卡

最简单的模式，适用于开发和小规模训练：

```python
from twinkle.model import TransformersModel
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta

def train():
    dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
    dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B')
    dataset.encode()
    
    dataloader = DataLoader(dataset=dataset, batch_size=8)
    model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
    
    for batch in dataloader:
        model.forward_backward(inputs=batch)
        model.clip_grad_and_step()

if __name__ == '__main__':
    train()
```

直接运行：
```bash
python train.py
```

## torchrun 模式

使用 PyTorch 原生启动器进行分布式训练，无需 Ray 依赖。

```python
import twinkle
from twinkle import DeviceMesh

# 构建 device mesh：FSDP=4, DP=2
device_mesh = DeviceMesh.from_sizes(fsdp_size=4, dp_size=2)

# 以 local 模式初始化
twinkle.initialize(mode='local', global_device_mesh=device_mesh)

def train():
    # 训练代码与单卡完全相同
    ...

if __name__ == '__main__':
    train()
```

使用 torchrun 启动：
```bash
CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 torchrun --nproc_per_node=8 train.py
```

### DeviceMesh 选项

```python
# FSDP + 数据并行
DeviceMesh.from_sizes(fsdp_size=4, dp_size=2)

# 张量并行 + 流水线并行
DeviceMesh.from_sizes(tp_size=2, pp_size=4)

# 完整 3D 并行
DeviceMesh.from_sizes(tp_size=2, pp_size=2, dp_size=2)
```

## Ray 模式

跨 Ray 集群的分布式训练，支持高级资源管理：

```python
import twinkle
from twinkle import DeviceMesh, DeviceGroup

# 定义资源组
device_groups = [
    DeviceGroup(name='model', ranks=4, device_type='cuda'),
    DeviceGroup(name='sampler', ranks=4, device_type='cuda'),
]

# 定义并行拓扑
model_mesh = DeviceMesh.from_sizes(world_size=4, dp_size=4)
sampler_mesh = DeviceMesh.from_sizes(world_size=4, dp_size=4)

# 初始化 Ray 模式
twinkle.initialize(
    mode='ray',
    nproc_per_node=8,
    groups=device_groups,
    lazy_collect=False
)

def train():
    model = TransformersModel(
        model_id='ms://Qwen/Qwen3.5-4B',
        remote_group='model',
        device_mesh=model_mesh
    )
    
    sampler = vLLMSampler(
        model_id='ms://Qwen/Qwen3.5-4B',
        device_mesh=sampler_mesh,
        remote_group='sampler'
    )
    ...

if __name__ == '__main__':
    train()
```

### 启动 Ray 集群

```bash
# 启动 head 节点
CUDA_VISIBLE_DEVICES=0,1 ray start --head --port=6379 --num-gpus=2

# 添加 worker 节点
CUDA_VISIBLE_DEVICES=2,3 ray start --address=127.0.0.1:6379 --num-gpus=2

# 纯 CPU 节点
CUDA_VISIBLE_DEVICES="" ray start --address=127.0.0.1:6379 --num-gpus=0
```

运行训练：
```bash
python train.py
```

## HTTP 模式

将训练部署为 HTTP 服务，支持多租户访问：

### 服务端配置

```python
# server.py
import twinkle
from twinkle import DeviceGroup, DeviceMesh

device_groups = [
    DeviceGroup(name='model', ranks=4, device_type='cuda'),
    DeviceGroup(name='sampler', ranks=4, device_type='cuda'),
]

twinkle.initialize(mode='http', groups=device_groups)

# 启动服务
# Model 集群、Sampler 集群、Utility 集群
```

```bash
python server.py
```

### 客户端训练

```python
from twinkle_client import init_twinkle_client
from twinkle_client.model import MultiLoraTransformersModel
from twinkle_client.sampler import vLLMSampler

# 连接服务端
client = init_twinkle_client(
    base_url='http://localhost:8000',
    api_key='your-api-key'
)

# 配置模型
model = MultiLoraTransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
model.add_adapter_to_model('default', lora_config)
model.set_optimizer('AdamW', lr=1e-4)

# 配置采样器
sampler = vLLMSampler(model_id='ms://Qwen/Qwen3.5-4B')

# 训练循环
for batch in dataloader:
    responses = sampler.sample(inputs=batch, sampling_params=params)
    model.forward_backward(inputs=responses, advantages=advantages)
    model.step()
```

## 模式对比

| 模式 | 适用场景 | 依赖 | 规模 |
|:-----|:---------|:-----|:-----|
| 单卡 | 开发、小模型 | 无 | 1 GPU |
| torchrun | 多卡训练 | PyTorch | 单节点 |
| Ray | 多节点、RL 训练 | Ray | 多节点集群 |
| HTTP | TaaS、多租户 | Ray + FastAPI | 企业级 |

## 最佳实践

1. **开发阶段**：使用单卡模式快速迭代
2. **扩展训练**：使用 torchrun 进行多卡训练
3. **RL 训练**：使用 Ray 模式协调 model 和 sampler
4. **生产部署**：使用 HTTP 模式提供多租户服务
