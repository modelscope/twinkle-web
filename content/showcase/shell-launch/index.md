---
title: Shell Launch (torchrun)
linkTitle: Shell Launch
weight: 10
date: 2026-05-01
---

The standard way to launch local multi-GPU training with torchrun:

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

[View full source →](https://github.com/modelscope/twinkle/blob/main/cookbook/transformers/fsdp2.sh)
