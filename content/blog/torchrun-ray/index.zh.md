---
title: "两种执行模式：torchrun（本地）与 Ray（分布式）"
date: 2026-06-03
tags:
  - 基础设施
  - Ray
  - torchrun
  - 分布式训练
  - 多机训练
categories:
  - 技术深度解析
---

Twinkle 的 `infra` 模块提供统一的编程模型，无缝支持两种运行模式：**local**（单机 torchrun）和 **ray**（多机 Ray 集群）。本文介绍其架构设计、基于装饰器的 API，以及各模式的适用场景。

<!--more-->

## 两种模式概览

| | Local (torchrun) | Ray (分布式) |
|---|---|---|
| 启动方式 | `torchrun --nproc_per_node=N` | `ray start` + 驱动脚本 |
| 适用范围 | 单机，共享文件系统 | 多机集群 |
| 进程模型 | 每 GPU 一个进程，torch.distributed | Ray Actor + PlacementGroup |
| 最适合 | 快速实验、单机训练 | 生产环境多机、异构资源 |

两种模式使用**完全相同的用户代码**——切换只需修改 `twinkle.infra.initialize()` 的 `mode` 参数。

## 初始化

```python
import twinkle.infra as infra

# Local 模式 — 从 torchrun 环境变量自动检测 ranks 和设备
infra.initialize(mode='local', seed=42)

# Ray 模式 — 需要显式定义 DeviceGroup
infra.initialize(
    mode='ray',
    nproc_per_node=8,
    groups=[
        DeviceGroup(name='model', ranks=list(range(4)), device_type='cuda'),
        DeviceGroup(name='sampler', ranks=list(range(4, 8)), device_type='cuda'),
    ],
    seed=42,
)
```

**Local 模式**下，Twinkle 从环境变量读取 `WORLD_SIZE`、`RANK`、`LOCAL_RANK`（由 torchrun 设置），创建一个涵盖所有 GPU 的默认 `DeviceGroup`，并自动构建带 `dp` 维度的 `DeviceMesh`。

**Ray 模式**下，`RayHelper.initialize()` 创建 `ResourceManager`：
1. 查询 Ray 集群所有活跃节点的 GPU/NPU 资源
2. 为每个节点创建 `PlacementGroup` 包，保证资源共置
3. 通过 `visible_devices` 发现将逻辑 rank 映射到物理 GPU

## 装饰器 API

Twinkle 的核心抽象是两个装饰器，让任何类都能透明地分布式化：

### `@remote_class`

封装类的 `__init__`，在本地直接运行或创建 Ray Actor：

```python
@infra.remote_class(execute='all')
class MyModel:
    def __init__(self, device_mesh: DeviceMesh):
        self.model = load_model()
        ...
```

Local 模式下 `__init__` 正常执行。Ray 模式下，`RayHelper.create_workers()` 为每个 GPU rank 创建一个 Ray Actor，每个 Actor 具备：
- 独立的 `CUDA_VISIBLE_DEVICES`，指向分配的物理 GPU
- 用于 torch.distributed 初始化的 `MASTER_ADDR` / `MASTER_PORT`
- 正确的 `WORLD_SIZE` / `RANK` 环境变量

### `@remote_function`

为方法添加分发、执行和聚合语义：

```python
@infra.remote_function(dispatch='slice_dp', collect='mean')
def train_step(self, batch):
    loss = self.model(batch)
    return {'loss': loss.item()}
```

三个参数控制分布式行为：

**dispatch** — 参数如何分配给 worker：
- `'all'`：所有 worker 收到相同参数
- `'slice'`：参数均匀分片
- `'slice_dp'`：按 DeviceMesh 的数据并行维度分片（EP 感知）

**execute** — 哪些 worker 执行：
- `'all'`：所有 worker（默认）
- `'first'`：仅第一个 worker
- `'peer'`：仅对等 worker（用于跨组通信）

**collect** — 结果如何聚合：
- `'none'`：返回原始列表
- `'mean'` / `'sum'`：数值归约
- `'first'`：返回第一个 worker 的结果
- `'last_pp'`：返回最后一个流水线并行阶段的结果
- `Callable`：自定义聚合函数

## LazyCollect：延迟结果聚合

Ray 模式下的一个关键优化是 **LazyCollect**。远程调用不会立即阻塞 `ray.get()`，而是返回一个 `LazyCollect` 可调用对象：

```python
result = model.train_step(batch)   # 返回 LazyCollect（非阻塞）
# ... 执行其他工作 ...
actual_result = result()           # 需要值时才阻塞
```

这使得计算和通信可以重叠——驱动端可以同时向多个组（model、sampler、processor）分发任务，仅在真正消费结果时阻塞。

LazyCollect 还支持 `__iter__` 和 `__len__`，对大部分消费代码完全透明。

## ResourceManager：GPU 分配

`ResourceManager` 处理 GPU 到节点映射的复杂逻辑：

1. **节点发现** — 查询 Ray 获取所有活跃节点及 GPU 数量
2. **PlacementGroup 创建** — 每节点一个 PG，包含 `{GPU: N, CPU: node_cpu//2}` 资源包
3. **GPU 映射** — 发现每个节点的实际 `CUDA_VISIBLE_DEVICES`，正确映射逻辑 rank 到物理 GPU
4. **多加速器支持** — 通过 `Platform` 抽象支持 GPU、NPU 等多种加速器。使用 `RAY_EXPERIMENTAL_NOSET_*` 环境变量防止 Ray 覆盖设备可见性
5. **CPU Worker 支持** — 为纯 CPU 进程（数据处理器）创建独立的 PlacementGroup

## 设备拓扑可视化

Twinkle 提供 `get_device_placement()` 渲染训练拓扑：

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           DEVICE PLACEMENT TOPOLOGY                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────┐
│ ◈ DeviceGroup: model                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│  ├─ Device Type : cuda                                                     │
│  └─ Ranks       : [0, 1, 2, 3]                                            │
│  ┌─ DeviceMesh: MyModel                                                    │
│  │  Dimensions : dp=4                                                      │
│  │  Parallelism: DP=4                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 错误处理与通知

远程函数会自动捕获**驱动端调用位置**，并附加到 worker 内部抛出的异常中：

```
[twinkle driver caller: train.py:42] CUDA out of memory
```

可通过 `initialize()` 传入可选的 `notifier`（如钉钉 webhook），在任何远程函数失败时发送告警——适用于长时间运行的分布式任务。

## 如何选择模式

**使用 Local 模式：**
- 单机 1-8 张 GPU
- 快速原型验证和调试
- 简单数据并行训练

**使用 Ray 模式：**
- 多机集群
- 异构资源分配（模型 GPU + 采样器 GPU + CPU 处理器）
- 生产级训练，需要容错机制
- 多模型部署（训练 + 推理在同一集群）

Twinkle 设计的优雅之处在于——你的训练代码保持不变，只需修改 `initialize()` 调用即可切换模式。
