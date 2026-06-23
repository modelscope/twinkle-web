---
title: "Multi-LoRA: Concurrent Multi-Tenant Training on Shared GPUs"
date: 2026-06-01
tags:
  - Multi-LoRA
  - Multi-Tenant
  - LoRA
  - FSDP
  - Megatron
categories:
  - Technical Deep Dive
---

Twinkle's Multi-LoRA architecture enables multiple tenants to train independent LoRA adapters on a **single shared model** simultaneously. This post explains the technical design, covering both the Transformers and Megatron backends.

<!--more-->

## Why Multi-LoRA?

Traditional LoRA training loads a full base model per user. For a 70B model this means ~140 GB of GPU memory per tenant — an enormous waste when the frozen base weights are identical across all users. Multi-LoRA solves this by:

- **Sharing the base model**: All tenants share one copy of frozen base weights.
- **Pre-allocating adapter slots**: A fixed pool of LoRA adapter slots (`max_loras × max_r`) is allocated at initialization, avoiding runtime memory fragmentation.
- **Dynamic tenant switching**: Tenants acquire/release adapters on-the-fly with near-zero context-switch overhead.

## Architecture Overview

```
┌──────────────────────────────────────────┐
│           Shared Base Model              │
│  (Frozen weights, loaded once)           │
├──────────────────────────────────────────┤
│         MultiLora Manager                │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Slot 0 │ │ Slot 1 │ │ Slot 2 │ ...   │
│  │Tenant A│ │Tenant B│ │  Free  │       │
│  └────────┘ └────────┘ └────────┘       │
├──────────────────────────────────────────┤
│  Per-Tenant: Optimizer, LR Scheduler,    │
│  Template, Gradient Accumulation         │
└──────────────────────────────────────────┘
```

The `MultiLora` class manages the lifecycle:

1. **`patch(model)`** — Patches every `LoLayer` forward method to iterate over active adapters, applying LoRA weights with proper scaling.
2. **`acquire_lora(tenant, config)`** — Assigns a pre-allocated slot to a tenant with the given `LoraConfig`.
3. **`adapter(name)`** — Context manager that activates a specific adapter for forward/backward passes.
4. **`release_lora(tenant)`** — Restores initial weights and returns the slot to the free pool.

## Transformers Backend

`MultiLoraTransformersModel` wraps the standard `TransformersModel` with per-adapter isolation:

```python
model = MultiLoraTransformersModel(model_id='Qwen/Qwen3.5-72B', max_loras=5)

# Tenant A registers their adapter
model.add_adapter_to_model('tenant_a', LoraConfig(r=16, target_modules='all-linear'))
model.set_optimizer(optimizer_cls=Adam, lr=1e-4, adapter_name='tenant_a')

# Tenant B registers independently
model.add_adapter_to_model('tenant_b', LoraConfig(r=8, target_modules='all-linear'))
model.set_optimizer(optimizer_cls=Adam, lr=2e-4, adapter_name='tenant_b')

# Each tenant trains independently — gradients are isolated
model.forward_backward(inputs=batch_a, adapter_name='tenant_a')
model.clip_grad_and_step(adapter_name='tenant_a')
```

Key design choices:

- **Optimizer Groups**: Each adapter has its own optimizer, LR scheduler, and gradient accumulation settings stored in an `OptimizerGroup`.
- **Context-switched forward**: Every `forward_backward`, `step`, and `zero_grad` call is wrapped with `self.multi_adapter.adapter(name)` to ensure gradient isolation.
- **Independent checkpointing**: `save()` extracts only the active adapter's state dict, so tenants never see each other's weights.

## Megatron Backend

`MultiLoraMegatronModel` extends Megatron's tensor/pipeline parallel training with multi-tenant support. The key challenge is that Megatron uses a **distributed optimizer** that sees all parameters — but we need per-adapter gradient isolation.

The solution: **`optimizer_context` manager** that temporarily replaces `named_parameters()` on each pipeline-parallel module, filtering to only yield parameters matching the active adapter's regex pattern:

```python
@contextmanager
def optimizer_context(self, adapter_name: str):
    pattern = re.compile(rf'\.lora_\w+\.{re.escape(adapter_name)}\.')
    for module in self.model:
        orig = module.named_parameters
        module.named_parameters = make_filtered(orig, pattern)
    yield
    # restore original named_parameters
```

This ensures the optimizer only updates the target adapter's LoRA weights, even in a distributed setting with TP/PP sharding.

Additional Megatron-specific features:

- **Per-rank optimizer checkpointing**: Each rank saves its own optimizer state, enabling efficient multi-GPU resume.
- **HF + Megatron format export**: Save adapters in either HuggingFace PEFT format or native Megatron format.
- **RNG state isolation**: Global RNG is intentionally *not* restored when loading a tenant checkpoint to avoid silently affecting other active tenants' dropout behavior.

## Performance

By sharing base model weights across tenants, Multi-LoRA reduces GPU memory usage proportionally:

| Tenants | Traditional (N × full model) | Multi-LoRA (1 model + N adapters) |
|---------|------------------------------|-----------------------------------|
| 1       | 140 GB                       | 140 GB + 0.1 GB                   |
| 5       | 700 GB                       | 140 GB + 0.5 GB                   |
| 10      | 1400 GB                      | 140 GB + 1.0 GB                   |

*Estimates for a 70B model with LoRA r=16.*

## Getting Started

See the [Multi-LoRA DPO Cookbook](https://github.com/modelscope/twinkle/blob/main/cookbook/rl/dpo/dpo_multi_lora.py) for a complete example.
