---
title: 'Twinkle'
date: 2026-02-10
type: landing

design:
  spacing: "3rem"

sections:
  # ═══════════════════════════════════════════════════════════════════════════
  # HERO
  # ═══════════════════════════════════════════════════════════════════════════
  - block: hero
    content:
      title: '<span class="hero-title-with-logo"><img src="../slogan.png" alt="Twinkle" class="hero-logo" /></span>'
      text: |
        <p style="font-size: 1.5rem; font-weight: 500; margin-bottom: 0.5rem;">让你的模型闪闪发光 ✨</p>
        <p style="font-size: 1.1rem; color: #64748b;">一个框架，任意规模。从笔记本到千卡集群。</p>
      primary_action:
        text: 快速开始
        url: docs/getting-started/
        icon: rocket-launch
      secondary_action:
        text: 查看源码
        url: https://github.com/modelscope/twinkle
      announcement:
        text: "✨ GKD 训练 & Qwen3.5 MoE 支持"
        link:
          text: "查看更新 →"
          url: "https://github.com/modelscope/twinkle/releases"
    design:
      spacing:
        padding: ["5rem", 0, "3rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # STATS
  # ═══════════════════════════════════════════════════════════════════════════
  - block: stats
    content:
      items:
        - statistic: "全"
          description: |
            主流模型
            LLM · VLM · MoE
        - statistic: "3"
          description: |
            运行模式
            本地 · Ray · HTTP
        - statistic: "∞"
          description: |
            多租户
            并行 LoRA 训练
        - statistic: "<5分钟"
          description: |
            上手时间
            pip install 即用
    design:
      spacing:
        padding: ["2rem", 0, "2rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # WHAT IS TWINKLE
  # ═══════════════════════════════════════════════════════════════════════════
  - block: markdown
    content:
      title: ""
      text: |
        <div style="max-width: 800px; margin: 0 auto; text-align: center; padding: 2rem 0;">
        
        ## 什么是 Twinkle？
        
        Twinkle 是一个 **客户端-服务端 LLM 训练框架**，将*训练什么*与*如何训练*分离。
        
        使用简洁的 Python API 编写训练逻辑，然后部署到任何地方 —— 本地 `torchrun`、
        Ray 集群，或无服务器 Training-as-a-Service。
        
        由 **ModelScope** 的 [ms-swift](https://github.com/modelscope/ms-swift) 团队构建。
        
        </div>
    design:
      columns: '1'
      spacing:
        padding: ["1rem", 0, "2rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # CODE EXAMPLE
  # ═══════════════════════════════════════════════════════════════════════════
  - block: markdown
    content:
      title: ""
      text: |
        <div style="max-width: 800px; margin: 0 auto;">
        
        ## 20 行代码开始训练
        
        ```python
        import twinkle
        from peft import LoraConfig
        from twinkle import DeviceGroup
        from twinkle.dataloader import DataLoader
        from twinkle.dataset import Dataset, DatasetMeta
        from twinkle.model import TransformersModel
        
        # 选择运行模式: 'local' (torchrun), 'ray', 或 'http'
        twinkle.initialize(mode='ray', groups=[DeviceGroup(name='default', ranks=8)])
        
        # 准备数据 — 支持魔搭和 Hugging Face
        dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
        dataset.set_template('Template', model_id='ms://Qwen/Qwen3.5-4B')
        dataset.encode()
        
        # 创建带 LoRA 的模型
        model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B', remote_group='default')
        model.add_adapter_to_model('default', LoraConfig(r=8, lora_alpha=32))
        model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)
        
        # 训练 — 你掌控循环
        for batch in DataLoader(dataset=dataset, batch_size=8):
            model.forward_backward(inputs=batch)
            model.clip_grad_and_step()
        
        model.save('my-finetuned-model')
        ```
        
        </div>
    design:
      columns: '1'
      css_class: "bg-gray-50"
      spacing:
        padding: ["3rem", 0, "3rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # ARCHITECTURE
  # ═══════════════════════════════════════════════════════════════════════════
  - block: markdown
    content:
      title: ""
      text: |
        <div style="text-align: center; padding: 2rem 0;">
          <img src="../framework.jpg" alt="Twinkle 架构" style="max-width: 720px; width: 100%;" />
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; max-width: 900px; margin: 2rem auto;">
          <div style="text-align: center;">
            <h4 style="color: #6366f1; margin-bottom: 0.5rem;">🔌 双 API</h4>
            <p style="font-size: 0.9rem; opacity: 0.8;">原生 Twinkle API 功能完整，Tinker 兼容 API 便于迁移</p>
          </div>
          <div style="text-align: center;">
            <h4 style="color: #6366f1; margin-bottom: 0.5rem;">🧩 模块化</h4>
            <p style="font-size: 0.9rem; opacity: 0.8;">15+ 组件：Dataset、Template、Model、Sampler、Loss、Reward、Metric...</p>
          </div>
          <div style="text-align: center;">
            <h4 style="color: #6366f1; margin-bottom: 0.5rem;">🔀 后端无关</h4>
            <p style="font-size: 0.9rem; opacity: 0.8;">Transformers 或 Megatron —— 一行配置切换</p>
          </div>
        </div>
    design:
      columns: '1'
      css_class: "bg-gray-50"
      spacing:
        padding: ["3rem", 0, "3rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # FEATURES
  # ═══════════════════════════════════════════════════════════════════════════
  - block: features
    id: features
    content:
      title: 为什么选择 Twinkle？
      text: ""
      items:
        - name: 无需重写即可扩展
          icon: arrow-trending-up
          description: |
            相同代码运行在笔记本和千卡集群。从 `torchrun` 切换到 Ray 或 HTTP 部署，无需修改训练逻辑。
        - name: 内置多租户
          icon: users
          description: |
            一个基座模型同时训练 N 个不同的 LoRA。每个租户拥有独立的优化器、数据流水线和损失函数 —— 只共享算力。
        - name: 你掌控训练循环
          icon: code-bracket
          description: |
            没有隐藏的魔法。查看和控制每一个 forward、backward 和优化器步骤。自由调试，完全定制。
        - name: 训练即服务
          icon: cloud-arrow-up
          description: |
            为生产级 TaaS 部署而构建，支持自动化集群管理、动态扩缩容和企业级多租户隔离。
        - name: 全训练方法
          icon: academic-cap
          description: |
            SFT、预训练、GRPO、GKD 等。稠密模型和 MoE 架构。完整的 FSDP、张量并行、流水线并行支持。
        - name: 广泛的模型支持
          icon: cpu-chip
          description: |
            Qwen 3.5/3/2.5、DeepSeek R1/V2、GLM-4、InternLM2 等。同时支持 Hugging Face 和魔搭模型库。
    design:
      spacing:
        padding: ["3rem", 0, "3rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # MULTI-TENANCY
  # ═══════════════════════════════════════════════════════════════════════════
  - block: markdown
    content:
      title: ""
      text: |
        <div style="max-width: 900px; margin: 0 auto;">
        
        ## 多租户：N 个任务，1 个基座模型
        
        <div style="text-align: center; margin: 2rem 0;">
          <img src="../multi_lora.png" alt="多租户" style="max-width: 500px; width: 100%; display: block; margin: 0 auto;" />
        </div>
        
        在共享部署上运行完全不同的训练任务：
        
        | 租户 | 配置 | 任务 |
        |:---:|------|-----|
        | **A** | LoRA r=8, 私有数据 | SFT 微调 |
        | **B** | LoRA r=32, Hub 数据集 | 增量预训练 |
        | **C** | GRPO 损失 + Sampler | 强化学习 |
        | **D** | 推理模式 | 对数概率计算 |
        
        每个租户**完全隔离** —— 不同的优化器、数据流水线、损失函数。
        只共享基座模型的算力。检查点自动同步到魔搭或 Hugging Face。
        
        </div>
    design:
      columns: '1'
      spacing:
        padding: ["3rem", 0, "3rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # SUPPORTED MODELS
  # ═══════════════════════════════════════════════════════════════════════════
  - block: markdown
    content:
      title: ""
      text: |
        <div style="text-align: center; padding: 2rem 0;">
        
        ## 支持的模型
        
        <div style="margin: 1.5rem 0;">
          <span class="model-tag" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">Qwen 3.5</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">Qwen MoE</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">DeepSeek R1</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">GLM-4</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);">InternLM2</span>
        </div>
        
        <p style="opacity: 0.7; font-size: 0.9rem;">
          支持主流 LLM · NVIDIA · 昇腾 NPU · SFT / PT / GRPO / GKD
        </p>
        
        </div>
    design:
      columns: '1'
      css_class: "bg-gray-50"
      spacing:
        padding: ["2rem", 0, "2rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # CTA
  # ═══════════════════════════════════════════════════════════════════════════
  - block: cta-card
    content:
      title: "准备好让模型发光了吗？"
      text: |
        安装 Twinkle，5 分钟内开始训练。
      button:
        text: 快速开始 →
        url: docs/getting-started/
    design:
      card:
        css_class: "bg-primary-700"
---
