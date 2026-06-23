---
title: "Two Execution Modes: torchrun (Local) vs Ray (Distributed)"
date: 2026-06-03
tags:
  - Infrastructure
  - Ray
  - torchrun
  - Distributed Training
  - Multi-Node
categories:
  - Technical Deep Dive
---

Twinkle's `infra` module provides a unified programming model that runs seamlessly in two modes: **local** (single-node via torchrun) and **ray** (multi-node via Ray cluster). This post explains the architecture, the decorator-based API, and when to use each mode.

<!--more-->

## The Two Modes at a Glance

| | Local (torchrun) | Ray (Distributed) |
|---|---|---|
| Launch | `torchrun --nproc_per_node=N` | `ray start` + driver script |
| Scope | Single node, shared filesystem | Multi-node cluster |
| Process model | One process per GPU, torch.distributed | Ray actors with PlacementGroups |
| Best for | Quick experiments, single-machine training | Production multi-node, heterogeneous resources |

Both modes share the **same user code** — switching requires only changing the `mode` parameter in `twinkle.infra.initialize()`.

## Initialization

```python
import twinkle.infra as infra

# Local mode — auto-detects ranks and devices from torchrun env vars
infra.initialize(mode='local', seed=42)

# Ray mode — requires explicit DeviceGroup definitions
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

In **local mode**, Twinkle reads `WORLD_SIZE`, `RANK`, and `LOCAL_RANK` from the environment (set by torchrun) and creates a single default `DeviceGroup` spanning all GPUs. A `DeviceMesh` is auto-constructed with a `dp` dimension.

In **ray mode**, `RayHelper.initialize()` creates a `ResourceManager` that:
1. Queries Ray cluster nodes for available GPUs/NPUs
2. Creates `PlacementGroup` bundles — one per node — to guarantee co-located resources
3. Maps each logical rank to a physical GPU via `visible_devices` discovery

## The Decorator API

Twinkle's key abstraction is two decorators that make any class distributed-transparent:

### `@remote_class`

Wraps a class so that `__init__` runs either locally or creates Ray actors:

```python
@infra.remote_class(execute='all')
class MyModel:
    def __init__(self, device_mesh: DeviceMesh):
        self.model = load_model()
        ...
```

In local mode, `__init__` runs normally. In Ray mode, `RayHelper.create_workers()` spawns one Ray actor per GPU rank in the specified `DeviceGroup`, each with:
- Isolated `CUDA_VISIBLE_DEVICES` pointing to its assigned physical GPU
- `MASTER_ADDR` / `MASTER_PORT` for torch.distributed init
- Proper `WORLD_SIZE` / `RANK` environment variables

### `@remote_function`

Wraps methods with dispatch, execution, and collection semantics:

```python
@infra.remote_function(dispatch='slice_dp', collect='mean')
def train_step(self, batch):
    loss = self.model(batch)
    return {'loss': loss.item()}
```

Three knobs control distributed behavior:

**dispatch** — how arguments are split across workers:
- `'all'`: Every worker receives the same arguments
- `'slice'`: Arguments are evenly partitioned across workers
- `'slice_dp'`: Arguments are partitioned along the data-parallel dimension of the DeviceMesh (EP-aware)

**execute** — which workers run:
- `'all'`: All workers (default)
- `'first'`: Only the first worker
- `'peer'`: Only peer workers (for inter-group communication)

**collect** — how results are aggregated:
- `'none'`: Return raw list of results
- `'mean'` / `'sum'`: Reduce numerically
- `'first'`: Return first worker's result
- `'last_pp'`: Return results from the last pipeline-parallel stage
- `Callable`: Custom aggregation function

## LazyCollect: Deferred Result Aggregation

A key optimization in Ray mode is **LazyCollect**. Instead of blocking on `ray.get()` immediately after each remote call, results are wrapped in a `LazyCollect` callable:

```python
result = model.train_step(batch)   # returns LazyCollect (non-blocking)
# ... do other work ...
actual_result = result()           # blocks only when value is needed
```

This enables overlapping computation and communication — the driver can dispatch work to multiple groups (model, sampler, processor) and only block when results are actually consumed.

LazyCollect also supports `__iter__` and `__len__`, making it transparent to most consumer code.

## ResourceManager: GPU Allocation

The `ResourceManager` handles the complexity of GPU-to-node mapping:

1. **Node discovery** — Queries Ray for all live nodes and their GPU counts
2. **PlacementGroup creation** — Creates one PG per node with `{GPU: N, CPU: node_cpu//2}` bundles
3. **GPU mapping** — Discovers actual `CUDA_VISIBLE_DEVICES` on each node to correctly map logical ranks to physical GPUs
4. **Multi-accelerator support** — Works with GPU, NPU, and other accelerators via `Platform` abstraction. Uses `RAY_EXPERIMENTAL_NOSET_*` env vars to prevent Ray from overriding device visibility
5. **CPU worker support** — Separate PlacementGroups for CPU-only processes (data processors)

## Device Placement Visualization

Twinkle provides `get_device_placement()` to render the training topology:

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

## Error Handling and Notifications

Remote functions automatically capture the **driver-side call site** and attach it to any exception raised inside workers:

```
[twinkle driver caller: train.py:42] CUDA out of memory
```

An optional `notifier` (e.g. DingTalk webhook) can be passed to `initialize()` to receive alerts when any remote function fails — useful for long-running distributed jobs.

## When to Use Which Mode

**Use local mode when:**
- Single machine with 1-8 GPUs
- Quick prototyping and debugging
- Simple data-parallel training

**Use Ray mode when:**
- Multi-node clusters
- Heterogeneous resource allocation (model GPUs + sampler GPUs + CPU processors)
- Production training with fault tolerance needs
- Multi-model deployments (training + inference in the same cluster)

The beauty of Twinkle's design is that your training code stays the same — only the `initialize()` call changes.
