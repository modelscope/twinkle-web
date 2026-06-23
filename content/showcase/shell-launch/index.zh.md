---
title: Shell 启动 (torchrun)
linkTitle: Shell 启动
weight: 10
---

标准多卡本地训练的 torchrun 启动方式：

```bash
#!/usr/bin/env bash
CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 \
  torchrun --nproc_per_node=8 fsdp2.py \
    --model-id ms://Qwen/Qwen3.5-4B \
    --dataset-id ms://swift/self-cognition \
    --template-cls Qwen3_5Template \
    --fsdp-size 2 \
    --dp-size 4 \
    --batch-size 8 \
    --lr 1e-4 \
    --gradient-accumulation-steps 2 \
    --output-dir ./output/fsdp2 \
    --adapter-name default \
    --scheduler-cls CosineWarmupScheduler \
    --num-warmup-steps 5 \
    --train-samples 1000
```

[查看完整源码 →](https://github.com/modelscope/twinkle/blob/main/cookbook/transformers/fsdp2.sh)
