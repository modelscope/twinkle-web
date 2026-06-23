---
title: "Sequence Parallel & Ring Attention: Training with Ultra-Long Contexts"
date: 2026-06-22
tags:
  - Sequence Parallel
  - Ring Attention
  - Long Context
  - Distributed Training
  - FlashAttention
categories:
  - Technical Deep Dive
---

Modern LLMs demand ever-longer context windows — 128K, 256K, even 1M tokens. A single GPU cannot hold such long sequences in memory. Twinkle's **Sequence Parallel** module solves this by splitting the sequence dimension across multiple devices, combining **Ulysses-style All-to-All** parallelism with **ZigZag Ring Attention** to achieve near-linear scaling.

<!--more-->

## Why Sequence Parallel?

Standard data parallelism replicates the full sequence on every device. For a 128K-token input with 8K per-device memory budget, you simply cannot fit the KV cache and attention matrices on one GPU. Sequence parallel (SP) partitions the sequence across devices so each GPU only processes a shard.

| Challenge | Solution in Twinkle |
|---|---|
| Attention needs full KV context | Ulysses All-to-All or Ring communication |
| Causal masking with split sequences | ZigZag interleaving preserves causality |
| Variable-length packed batches | `cu_seqlens`-based varlen FlashAttention |
| MoE auxiliary loss needs global view | Post-forward router logit gathering |

## Architecture Overview

Twinkle's SP module lives at `src/twinkle/model/transformers/strategy/sequence_parallel/` and is composed of three layers:

```
┌─────────────────────────────────────────────────────────┐
│            SequenceParallelStrategy (API)                │
│   • initialize() • preprocess_inputs() • postprocess()  │
├─────────────────────────────────────────────────────────┤
│               SequenceParallel (Core)                    │
│   • pad / split / gather   • DeviceMesh group init      │
│   • Flash Attention hook   • Forward pre-hook (pad+split)│
├───────────────────────┬─────────────────────────────────┤
│  Ulysses (All-to-All) │  ZigZag Ring Attention          │
│  _SeqAllToAll         │  RingComm P2P send/recv         │
│  DistributedAttention │  zigzag_ring_flash_attn_varlen  │
└───────────────────────┴─────────────────────────────────┘
```

## Two Parallelism Strategies

### 1. Ulysses (All-to-All)

Ulysses parallelism exploits the head dimension. Before attention, each GPU holds a full-length shard of **local heads**. An All-to-All transpose converts this to each GPU holding **all heads** for a local sequence shard — enabling standard attention computation.

```python
# Scatter along head dim, gather along seq dim
query_layer = _SeqAllToAll.apply(sp_group, query, scatter_idx=2, gather_idx=1)
key_layer   = _SeqAllToAll.apply(sp_group, key,   scatter_idx=2, gather_idx=1)
value_layer = _SeqAllToAll.apply(sp_group, value, scatter_idx=2, gather_idx=1)

# Local attention on full seq, subset of heads
context = local_flash_attention(query_layer, key_layer, value_layer)

# Reverse: scatter along seq, gather along head
output = _SeqAllToAll.apply(sp_group, context, gather_idx=2, scatter_idx=1)
```

**Constraint**: `num_kv_heads` must be divisible by `sp_world_size`.

### 2. ZigZag Ring Attention

When KV heads are fewer than the SP size (e.g., GQA with 8 KV heads but 16 GPUs), Twinkle automatically derives a **ring attention** group. Ring attention passes KV blocks between GPUs in a ring topology — no global All-to-All needed.

The **ZigZag** pattern is key: instead of naive sequential splitting, each GPU holds two non-contiguous chunks — the i-th from the front and the i-th from the back:

```
Sequence:  [chunk_0 | chunk_1 | chunk_2 | chunk_3 | chunk_4 | chunk_5 | chunk_6 | chunk_7]

GPU 0:     [chunk_0, chunk_7]   (front-0 + back-0)
GPU 1:     [chunk_1, chunk_6]   (front-1 + back-1)
GPU 2:     [chunk_2, chunk_5]   (front-2 + back-2)
GPU 3:     [chunk_3, chunk_4]   (front-3 + back-3)
```

This ensures **load balance** for causal attention — each GPU computes roughly the same number of attention pairs, avoiding the idle-GPU problem of naive splits.

### Hybrid: Ulysses + Ring

When `seq_world_size > num_kv_heads`, Twinkle automatically computes:

```python
sp_world_size = gcd(num_kv_heads, seq_world_size)   # Ulysses group size
rp_world_size = seq_world_size // sp_world_size      # Ring group size
```

This creates a two-level hierarchy: Ulysses All-to-All within sub-groups, Ring P2P across sub-groups.

## Ring Communication: The `RingComm` Class

The core P2P communication is handled by `RingComm`:

```python
class RingComm:
    def __init__(self, process_group):
        self.send_rank = (self.rank + 1) % self.world_size
        self.recv_rank = (self.rank - 1) % self.world_size

    def send_recv_kv(self, k, v, k_buffer=None, v_buffer=None):
        """Asynchronously send KV to next rank, receive from previous."""
        next_k = self.send_recv(k, k_buffer)
        next_v = self.send_recv(v, v_buffer)
        self.commit()  # batch_isend_irecv
        return next_k, next_v
```

Each ring step:
1. **Send** current KV to the next GPU
2. **Receive** KV from the previous GPU
3. **Compute** local attention block with received KV
4. **Accumulate** output using log-sum-exp correction

## Forward Pass: ZigZag Ring FlashAttention

The forward iterates over `world_size` ring steps:

```python
for step in range(comm.world_size):
    if step + 1 != comm.world_size:
        next_k, next_v = comm.send_recv_kv(k, v)  # async

    if step == 0:
        # Self-attention (causal)
        block_out, block_lse = flash_attn_varlen(q, k, v, causal=True)
    elif step <= comm.rank:
        # Full cross-attention with front-half of received KV
        block_out, block_lse = flash_attn_varlen(q, k[front], v[front], causal=False)
    else:
        # Only back-half of Q attends to full received KV
        block_out, block_lse = flash_attn_varlen(q[back], k, v, causal=False)

    # Online softmax correction (numerically stable)
    out, lse = update_out_and_lse(out, lse, block_out, block_lse)

    comm.wait()  # sync communication
    k, v = next_k, next_v
```

The `update_out_and_lse` function uses the **online softmax trick** — it incrementally merges attention outputs from different KV blocks using their log-sum-exp values:

```python
def update_out_and_lse(out, lse, block_out, block_lse):
    diff = block_lse - lse
    sig_diff = torch.sigmoid(diff)
    out = out - sig_diff * (out - block_out)
    lse = lse - F.logsigmoid(lse - block_lse)
    return out, lse
```

## The Pad → Split → Compute → Gather Pipeline

Before the model forward, a pre-hook automatically handles the SP lifecycle:

```
Input [B, S, D]
    │
    ▼
Pad to multiple of (sp_size × rp_size × 2)
    │
    ▼
Split along seq dim (ZigZag for ring, chunk for Ulysses)
    │
    ▼
Model Forward (each GPU sees [B, S/sp_size, D])
    │
    ▼
Gather logits / loss across SP group
    │
    ▼
Trim padding → Output [B, S, V]
```

Key implementation detail: **padding uses `position_ids = -1`** to mark invalid tokens. The attention mask automatically excludes these positions.

## Usage in Twinkle

Enable sequence parallel with a single config parameter:

```python
# In your training config YAML:
sequence_parallel_size: 4   # Split across 4 GPUs

# Or programmatically:
from twinkle.model.transformers.strategy.sequence_parallel import SequenceParallelStrategy

strategy = SequenceParallelStrategy(
    device_mesh=mesh,
    sp_config={'ulysses_size': 4, 'gather_logits': True},
    model=model,
    tokenizer_id='Qwen/Qwen2.5-7B',
)
strategy.initialize()
```

The framework handles:
- Automatic `sp_world_size` / `rp_world_size` derivation from `num_kv_heads`
- FlashAttention2 and SDPA backend support (ring requires FA2)
- Variable-length packed batches (`padding_free` mode)
- MoE router logit gathering for correct auxiliary loss
- Qwen3.5 linear attention (GatedDeltaNet) SP support

## Performance Characteristics

| Configuration | Communication | Memory per GPU | Best Use Case |
|---|---|---|---|
| Pure Ulysses (sp=4, rp=1) | All-to-All (high bandwidth) | S/4 per GPU | High KV-head models (≥ sp_size heads) |
| Pure Ring (sp=1, rp=4) | P2P ring (low bandwidth) | S/4 per GPU | GQA models with few KV heads |
| Hybrid (sp=2, rp=2) | All-to-All + P2P | S/4 per GPU | Balanced models |

**Key insight**: Ulysses requires high all-to-all bandwidth (best within NVLink domains), while Ring only needs point-to-point (works across nodes). Twinkle's automatic derivation picks the optimal split.

## Backward Pass

The backward pass recomputes attention block-by-block (to save memory) and uses the same ring communication pattern. Gradients for dQ accumulate locally, while dK/dV are communicated in reverse ring direction:

```python
# Forward ring: rank → rank+1
# dK/dV ring: rank → rank-1 (reverse direction)
next_dk, next_dv = d_kv_comm.send_recv_kv(dk, dv)
```

## Summary

Twinkle's sequence parallel module provides:

1. **Transparent integration** — a single `sequence_parallel_size` config enables SP with no code changes
2. **Automatic strategy selection** — Ulysses vs Ring vs Hybrid based on model architecture
3. **Production-ready** — supports packed batches, MoE, multimodal models (Qwen-VL), and linear attention (Qwen3.5)
4. **Numerically correct** — online softmax correction ensures identical results to single-GPU attention

For ultra-long context training (128K+ tokens), sequence parallel is the key enabler — scaling the context window linearly with the number of GPUs.
