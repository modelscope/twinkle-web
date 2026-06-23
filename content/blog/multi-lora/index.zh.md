---
title: "Multi-LoRA：共享 GPU 上的多租户并行训练"
date: 2026-06-01
tags:
  - Multi-LoRA
  - 多租户
  - LoRA
  - FSDP
  - Megatron
categories:
  - 技术深度解析
---

Twinkle 的 Multi-LoRA 架构支持多个租户在**同一份共享模型**上同时训练各自独立的 LoRA 适配器。本文介绍其技术方案，涵盖 Transformers 和 Megatron 两种后端。

<!--more-->

## 为什么需要 Multi-LoRA？

传统 LoRA 训练中，每个用户都要加载一份完整的基座模型。对于 70B 模型，这意味着每个租户占用 ~140 GB 显存——当所有用户的冻结基座权重完全相同时，这是巨大的浪费。Multi-LoRA 的解决思路：

- **共享基座模型**：所有租户共享一份冻结的基座权重。
- **预分配适配器槽位**：初始化时分配固定的 LoRA 适配器槽位池（`max_loras × max_r`），避免运行时内存碎片化。
- **动态租户切换**：租户可以即时获取/释放适配器，上下文切换开销接近零。

## 架构概览

```
┌──────────────────────────────────────────┐
│           共享基座模型                     │
│  (冻结权重，仅加载一次)                    │
├──────────────────────────────────────────┤
│         MultiLora 管理器                  │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ 槽位 0 │ │ 槽位 1 │ │ 槽位 2 │ ...   │
│  │ 租户 A │ │ 租户 B │ │  空闲  │       │
│  └────────┘ └────────┘ └────────┘       │
├──────────────────────────────────────────┤
│  每租户独立：优化器、学习率调度器、          │
│  模板、梯度累积                           │
└──────────────────────────────────────────┘
```

`MultiLora` 类管理完整生命周期：

1. **`patch(model)`** — 为每个 `LoLayer` 的 forward 方法打补丁，使其遍历所有活跃适配器并施加 LoRA 权重。
2. **`acquire_lora(tenant, config)`** — 从预分配池中为租户分配一个槽位。
3. **`adapter(name)`** — 上下文管理器，在 forward/backward 期间激活指定适配器。
4. **`release_lora(tenant)`** — 恢复初始权重，将槽位归还空闲池。

## Transformers 后端

`MultiLoraTransformersModel` 在标准 `TransformersModel` 之上实现了逐适配器隔离：

```python
model = MultiLoraTransformersModel(model_id='Qwen/Qwen3.5-72B', max_loras=5)

# 租户 A 注册适配器
model.add_adapter_to_model('tenant_a', LoraConfig(r=16, target_modules='all-linear'))
model.set_optimizer(optimizer_cls=Adam, lr=1e-4, adapter_name='tenant_a')

# 租户 B 独立注册
model.add_adapter_to_model('tenant_b', LoraConfig(r=8, target_modules='all-linear'))
model.set_optimizer(optimizer_cls=Adam, lr=2e-4, adapter_name='tenant_b')

# 各租户独立训练——梯度隔离
model.forward_backward(inputs=batch_a, adapter_name='tenant_a')
model.clip_grad_and_step(adapter_name='tenant_a')
```

核心设计：

- **优化器组**：每个适配器拥有独立的优化器、学习率调度器和梯度累积配置，存储在 `OptimizerGroup` 中。
- **上下文切换 forward**：所有 `forward_backward`、`step`、`zero_grad` 调用都被 `self.multi_adapter.adapter(name)` 包裹，确保梯度隔离。
- **独立 checkpoint**：`save()` 仅提取当前活跃适配器的状态字典，租户之间互不可见。

## Megatron 后端

`MultiLoraMegatronModel` 在 Megatron 张量/流水线并行训练的基础上支持多租户。核心挑战在于 Megatron 使用**分布式优化器**，它能看到所有参数——但我们需要按适配器隔离梯度。

解决方案：**`optimizer_context` 上下文管理器**，临时替换每个流水线并行模块上的 `named_parameters()`，使其仅返回匹配当前活跃适配器正则模式的参数：

```python
@contextmanager
def optimizer_context(self, adapter_name: str):
    pattern = re.compile(rf'\.lora_\w+\.{re.escape(adapter_name)}\.')
    for module in self.model:
        orig = module.named_parameters
        module.named_parameters = make_filtered(orig, pattern)
    yield
    # 恢复原始 named_parameters
```

这确保了即使在 TP/PP 分片的分布式环境中，优化器也只更新目标适配器的 LoRA 权重。

Megatron 特有功能：

- **按 rank 保存优化器状态**：每个 rank 独立保存优化器状态，高效支持多 GPU 恢复。
- **HF + Megatron 双格式导出**：支持以 HuggingFace PEFT 格式或原生 Megatron 格式保存适配器。
- **RNG 状态隔离**：加载租户 checkpoint 时，全局 RNG 故意*不*恢复，以避免影响其他活跃租户的 dropout 行为。

## 性能对比

通过跨租户共享基座模型权重，Multi-LoRA 按比例降低显存使用：

| 租户数 | 传统方式（N × 完整模型） | Multi-LoRA（1 模型 + N 适配器） |
|--------|--------------------------|--------------------------------|
| 1      | 140 GB                   | 140 GB + 0.1 GB                |
| 5      | 700 GB                   | 140 GB + 0.5 GB                |
| 10     | 1400 GB                  | 140 GB + 1.0 GB                |

*基于 70B 模型、LoRA r=16 的估算。*

## 快速开始

完整示例请参考 [Multi-LoRA DPO Cookbook](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/dpo/dpo_multi_lora.py)。
