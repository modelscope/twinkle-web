---
title: 快速开始
date: 2026-02-10
weight: 1
---

几分钟内启动并运行 Twinkle。

## 什么是 Twinkle？

Twinkle 是一个面向生产的大模型训练框架，采用组件化架构：

- **松耦合架构** · 标准化接口
- **多运行模式** · torchrun / Ray / HTTP
- **多框架兼容** · Transformers / Megatron
- **多租户支持** · 单基座模型部署

### 何时选择 Twinkle

- 你想了解模型机制和训练方法
- 你是研究人员，想定制模型或训练算法
- 你喜欢编写显式的训练循环
- 你需要构建企业级训练平台

### 何时选择 ms-swift

- 你不关心训练过程，只想提供数据
- 你需要更多模型支持和数据集种类
- 你需要推理、部署、量化能力
- 你需要新模型的 day-0 支持

## 环境要求

| 组件 | 要求 | 备注 |
|------|------|------|
| Python | >= 3.11, < 3.13 | 推荐 3.11 |
| PyTorch | >= 2.0 | NPU 需要 2.7.1 |
| GPU | A10/A100/H100/RTX | T4/V100 支持有限 |
| NPU | 昇腾 910 系列 | 可选 |

## 安装

{{% steps %}}

### 安装 Twinkle

```bash
# 从 PyPI 安装
pip install 'twinkle-kit'

# 或从源码安装
git clone https://github.com/modelscope/twinkle.git
cd twinkle
pip install -e .
```

### 安装客户端（可选）

如果需要使用 Twinkle 的客户端进行远程训练：

```bash
# Mac 或 Linux
sh INSTALL_CLIENT.sh

# Windows (PowerShell)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\INSTALL_CLIENT.ps1
```

### 安装 Megatron 依赖（可选）

用于 Megatron 后端的超大规模模型训练：

```bash
sh INSTALL_MEGATRON.sh
```

{{% /steps %}}

## 第一次训练

### 单卡训练

```python
from peft import LoraConfig
from twinkle import get_device_placement, get_logger
from twinkle.dataloader import DataLoader
from twinkle.dataset import Dataset, DatasetMeta
from twinkle.model import TransformersModel
from twinkle.preprocessor import SelfCognitionProcessor

logger = get_logger()

def train():
    # 加载数据集（1000 条样本）
    dataset = Dataset(dataset_meta=DatasetMeta(
        'ms://swift/self-cognition', 
        data_slice=range(1000)
    ))
    # 设置模板用于编码
    dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B')
    # 预处理为标准格式
    dataset.map(SelfCognitionProcessor('Twinkle LLM', 'ModelScope'))
    # 编码数据集
    dataset.encode()
    
    # 创建 dataloader（全局 batch size = 8）
    dataloader = DataLoader(dataset=dataset, batch_size=8)
    
    # 加载模型
    model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B')
    
    # 添加 LoRA 适配器
    lora_config = LoraConfig(r=8, lora_alpha=32, target_modules='all-linear')
    model.add_adapter_to_model('default', lora_config, gradient_accumulation_steps=2)
    
    # 设置优化器和调度器
    model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)
    model.set_lr_scheduler(
        scheduler_cls='CosineWarmupScheduler',
        num_warmup_steps=5,
        num_training_steps=len(dataloader)
    )
    
    # 训练循环
    for step, batch in enumerate(dataloader):
        model.forward_backward(inputs=batch)
        model.clip_grad_and_step()
        if step % 20 == 0:
            metric = model.calculate_metric(is_training=True)
            logger.info(f'Step {step}/{len(dataloader)}, metric: {metric}')
    
    model.save('last-checkpoint')

if __name__ == '__main__':
    train()
```

### 多卡训练（8 卡）

只需添加 DeviceMesh 初始化：

```python
import twinkle
from twinkle import DeviceMesh

# 构建 device_mesh：fsdp=4, dp=2，共使用 8 张卡
device_mesh = DeviceMesh.from_sizes(fsdp_size=4, dp_size=2)
twinkle.initialize(mode='local', global_device_mesh=device_mesh)

# ... 其余训练代码保持不变
```

使用 torchrun 运行：

```bash
torchrun --nproc_per_node=8 train.py
```

### 仅使用部分组件

你可以只使用 Twinkle 的部分组件，与现有代码结合：

```python
from twinkle.dataset import PackingDataset, DatasetMeta
from twinkle.dataloader import DataLoader
from twinkle.preprocessor import SelfCognitionProcessor

dataset_meta = DatasetMeta(
    dataset_id='ms://swift/self-cognition',
)

dataset = PackingDataset(dataset_meta)
dataset.map(SelfCognitionProcessor(
    model_name='Twinkle Model', 
    model_author='ModelScope Community'
))
dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B', max_length=512)
dataset.encode()
dataset.pack_dataset()

dataloader = DataLoader(dataset, batch_size=8)

for data in dataloader:
    # 与你的自定义训练代码结合使用
    print(data.keys())  # input_ids, position_ids, ...
    break
```

## 支持的硬件

| 硬件 | 备注 |
|------|------|
| GPU A10/A100/H100/RTX | 完整支持 |
| GPU T4/V100 | 不支持 bfloat16，不支持 Flash-Attention |
| 昇腾 NPU | 部分算子不支持 |
| PPU | 支持 |
| CPU | 部分组件（dataset, dataloader）|

## 下一步

{{< cards >}}
  {{< card url="../guide/architecture" title="架构" icon="cpu-chip" subtitle="理解客户端-服务端架构" >}}
  {{< card url="../guide/components" title="组件" icon="puzzle-piece" subtitle="探索 Dataset、Model、Sampler 等" >}}
  {{< card url="../guide/runtime-modes" title="运行模式" icon="server-stack" subtitle="torchrun、Ray 和 HTTP 部署" >}}
  {{< card url="../guide/server-client" title="服务端与客户端" icon="arrows-right-left" subtitle="HTTP 训练服务架构" >}}
  {{< card url="../guide/multi-tenancy" title="多租户" icon="user-group" subtitle="在共享基座模型上训练多个 LoRA" >}}
  {{< card url="../guide/npu-support" title="NPU 支持" icon="chip" subtitle="昇腾 NPU 训练指南" >}}
  {{< card url="../guide/taas" title="训练即服务" icon="cloud" subtitle="部署企业级训练服务" >}}
  {{< card url="../guide/cookbook" title="Cookbook" icon="book-open" subtitle="FSDP、MoE、RL 训练示例" >}}
{{< /cards >}}
