---
title: "序列并行与 Ring Attention：超长上下文训练技术解析"
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

现代大语言模型对上下文窗口的需求不断增长——128K、256K 甚至 1M tokens。单卡 GPU 无法容纳如此长的序列。Twinkle 的 **Sequence Parallel** 模块通过在多设备间切分序列维度来解决这一问题，结合 **Ulysses All-to-All** 并行与 **ZigZag Ring Attention**，实现近线性扩展。

<!--more-->

## 为什么需要序列并行？

标准数据并行在每个设备上复制完整序列。对于 128K token 输入，如果单卡只能容纳 8K 的 KV cache 和注意力矩阵，根本无法放下。序列并行（SP）将序列切分到多设备上，每张 GPU 只处理一个分片。

| 挑战 | Twinkle 的解决方案 |
|---|---|
| Attention 需要完整 KV 上下文 | Ulysses All-to-All 或 Ring 通信 |
| 切分后的因果掩码 | ZigZag 交错排布保持因果性 |
| 变长 packed 批次 | 基于 `cu_seqlens` 的 varlen FlashAttention |
| MoE 辅助 loss 需要全局视图 | 前向后聚合 router logits |

## 架构概览

Twinkle 的 SP 模块位于 `src/twinkle/model/transformers/strategy/sequence_parallel/`，由三层组成：

```
┌─────────────────────────────────────────────────────────┐
│          SequenceParallelStrategy（API 层）              │
│   • initialize() • preprocess_inputs() • postprocess()  │
├─────────────────────────────────────────────────────────┤
│             SequenceParallel（核心逻辑）                  │
│   • pad / split / gather   • DeviceMesh 进程组初始化     │
│   • Flash Attention hook   • Forward pre-hook（pad+split）│
├───────────────────────┬─────────────────────────────────┤
│  Ulysses (All-to-All) │  ZigZag Ring Attention          │
│  _SeqAllToAll         │  RingComm P2P 收发              │
│  DistributedAttention │  zigzag_ring_flash_attn_varlen  │
└───────────────────────┴─────────────────────────────────┘
```

## 两种并行策略

### 1. Ulysses（All-to-All）

Ulysses 并行利用注意力头维度。在 attention 前，每张 GPU 持有完整长度的**本地 head 分片**。通过 All-to-All 转置，变为每张 GPU 持有**所有 head** 的局部序列分片——从而可以执行标准 attention 计算。

```python
# 沿 head 维度 scatter，沿 seq 维度 gather
query_layer = _SeqAllToAll.apply(sp_group, query, scatter_idx=2, gather_idx=1)
key_layer   = _SeqAllToAll.apply(sp_group, key,   scatter_idx=2, gather_idx=1)
value_layer = _SeqAllToAll.apply(sp_group, value, scatter_idx=2, gather_idx=1)

# 本地 attention：完整序列，head 子集
context = local_flash_attention(query_layer, key_layer, value_layer)

# 反向：沿 seq scatter，沿 head gather
output = _SeqAllToAll.apply(sp_group, context, gather_idx=2, scatter_idx=1)
```

**约束**：`num_kv_heads` 必须能被 `sp_world_size` 整除。

### 2. ZigZag Ring Attention

当 KV head 数少于 SP 大小时（例如 GQA 有 8 个 KV head 但 16 张 GPU），Twinkle 自动派生 **ring attention** 组。Ring attention 在 GPU 之间以环形拓扑传递 KV block——无需全局 All-to-All。

**ZigZag** 模式是关键：不是朴素的顺序切分，每张 GPU 持有两个不连续的块——从前面取第 i 块和从后面取第 i 块：

```
序列:  [chunk_0 | chunk_1 | chunk_2 | chunk_3 | chunk_4 | chunk_5 | chunk_6 | chunk_7]

GPU 0: [chunk_0, chunk_7]   (前-0 + 后-0)
GPU 1: [chunk_1, chunk_6]   (前-1 + 后-1)
GPU 2: [chunk_2, chunk_5]   (前-2 + 后-2)
GPU 3: [chunk_3, chunk_4]   (前-3 + 后-3)
```

这确保了因果 attention 的**负载均衡**——每张 GPU 计算大致相同数量的注意力对，避免朴素切分导致的 GPU 空闲问题。

### 混合模式：Ulysses + Ring

当 `seq_world_size > num_kv_heads` 时，Twinkle 自动计算：

```python
sp_world_size = gcd(num_kv_heads, seq_world_size)   # Ulysses 组大小
rp_world_size = seq_world_size // sp_world_size      # Ring 组大小
```

形成两级层次：子组内部走 Ulysses All-to-All，子组之间走 Ring P2P。

## Ring 通信：`RingComm` 类

核心 P2P 通信由 `RingComm` 处理：

```python
class RingComm:
    def __init__(self, process_group):
        self.send_rank = (self.rank + 1) % self.world_size
        self.recv_rank = (self.rank - 1) % self.world_size

    def send_recv_kv(self, k, v, k_buffer=None, v_buffer=None):
        """异步发送 KV 到下一个 rank，从上一个 rank 接收。"""
        next_k = self.send_recv(k, k_buffer)
        next_v = self.send_recv(v, v_buffer)
        self.commit()  # batch_isend_irecv
        return next_k, next_v
```

每个 ring step：
1. **发送**当前 KV 到下一张 GPU
2. **接收**上一张 GPU 的 KV
3. **计算**本地 attention block
4. **累积**输出（使用 log-sum-exp 校正）

## 前向传播：ZigZag Ring FlashAttention

前向过程迭代 `world_size` 个 ring step：

```python
for step in range(comm.world_size):
    if step + 1 != comm.world_size:
        next_k, next_v = comm.send_recv_kv(k, v)  # 异步

    if step == 0:
        # Self-attention（因果）
        block_out, block_lse = flash_attn_varlen(q, k, v, causal=True)
    elif step <= comm.rank:
        # 与接收 KV 的前半部分做完整 cross-attention
        block_out, block_lse = flash_attn_varlen(q, k[front], v[front], causal=False)
    else:
        # 只有 Q 的后半部分与完整接收 KV 做 attention
        block_out, block_lse = flash_attn_varlen(q[back], k, v, causal=False)

    # 在线 softmax 校正（数值稳定）
    out, lse = update_out_and_lse(out, lse, block_out, block_lse)

    comm.wait()  # 同步通信
    k, v = next_k, next_v
```

`update_out_and_lse` 函数使用 **在线 softmax 技巧**——利用 log-sum-exp 值增量合并来自不同 KV block 的注意力输出：

```python
def update_out_and_lse(out, lse, block_out, block_lse):
    diff = block_lse - lse
    sig_diff = torch.sigmoid(diff)
    out = out - sig_diff * (out - block_out)
    lse = lse - F.logsigmoid(lse - block_lse)
    return out, lse
```

## Pad → Split → Compute → Gather 流水线

模型前向前，一个 pre-hook 自动处理 SP 生命周期：

```
输入 [B, S, D]
    │
    ▼
Pad 到 (sp_size × rp_size × 2) 的倍数
    │
    ▼
沿序列维度 Split（Ring 用 ZigZag，Ulysses 用 chunk）
    │
    ▼
模型前向（每张 GPU 看到 [B, S/sp_size, D]）
    │
    ▼
跨 SP 组 Gather logits / loss
    │
    ▼
裁剪 padding → 输出 [B, S, V]
```

关键实现细节：**padding 使用 `position_ids = -1`** 标记无效 token，注意力掩码自动排除这些位置。

## 在 Twinkle 中使用

通过一个配置参数即可启用序列并行：

```python
# 训练配置 YAML：
sequence_parallel_size: 4   # 在 4 张 GPU 间切分

# 或编程方式：
from twinkle.model.transformers.strategy.sequence_parallel import SequenceParallelStrategy

strategy = SequenceParallelStrategy(
    device_mesh=mesh,
    sp_config={'ulysses_size': 4, 'gather_logits': True},
    model=model,
    tokenizer_id='Qwen/Qwen2.5-7B',
)
strategy.initialize()
```

框架自动处理：
- 根据 `num_kv_heads` 自动推导 `sp_world_size` / `rp_world_size`
- 支持 FlashAttention2 和 SDPA 后端（ring 要求 FA2）
- 变长 packed 批次（`padding_free` 模式）
- MoE router logit 聚合以计算正确的辅助 loss
- Qwen3.5 线性注意力（GatedDeltaNet）SP 支持

## 性能特性

| 配置 | 通信模式 | 每卡显存 | 最佳场景 |
|---|---|---|---|
| 纯 Ulysses (sp=4, rp=1) | All-to-All（高带宽） | S/4 | KV head 多的模型（≥ sp_size 个 head） |
| 纯 Ring (sp=1, rp=4) | P2P ring（低带宽） | S/4 | GQA 少量 KV head 的模型 |
| 混合 (sp=2, rp=2) | All-to-All + P2P | S/4 | 均衡型模型 |

**核心洞察**：Ulysses 需要高 All-to-All 带宽（最适合 NVLink 域内），而 Ring 只需点对点通信（可跨节点）。Twinkle 的自动推导会选择最优切分方案。

## 反向传播

反向过程逐 block 重计算 attention（节省显存），使用相同的 ring 通信模式。dQ 在本地累积，dK/dV 沿反向环形方向通信：

```python
# 前向 ring：rank → rank+1
# dK/dV ring：rank → rank-1（反向）
next_dk, next_dv = d_kv_comm.send_recv_kv(dk, dv)
```

## 总结

Twinkle 的序列并行模块提供：

1. **透明集成** —— 一个 `sequence_parallel_size` 配置即可启用 SP，无需修改代码
2. **自动策略选择** —— 根据模型架构自动选择 Ulysses / Ring / 混合模式
3. **生产就绪** —— 支持 packed 批次、MoE、多模态模型（Qwen-VL）和线性注意力（Qwen3.5）
4. **数值正确** —— 在线 softmax 校正确保与单卡 attention 结果一致

对于超长上下文训练（128K+ tokens），序列并行是关键使能技术——上下文窗口随 GPU 数量线性扩展。
