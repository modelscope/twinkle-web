---
title: 'Twinkle'
date: 2026-02-10
type: landing

design:
  spacing: "2rem"

sections:
  # ═══════════════════════════════════════════════════════════════════════════
  # HERO
  # ═══════════════════════════════════════════════════════════════════════════
  - block: hero
    content:
      title: '<span class="hero-title-with-logo"><img src="../slogan.png" alt="Twinkle" class="hero-logo" /></span>'
      text: |
        <p style="font-size: 1.5rem; font-weight: 500; margin-bottom: 0.5rem;">让你的模型闪闪发光的训练工作台 ✨</p>
        <p style="font-size: 1.1rem; color: #64748b;">一套框架，任意规模。从笔记本到千卡集群。</p>
        <p style="margin-top: 1rem;"><a href="https://www.modelscope.cn/organization/twinkle-kit" style="color: #624aff; text-decoration: none; font-weight: 500;">ModelScope 组织主页 →</a></p>
      primary_action:
        text: 快速开始
        url: docs/getting-started/
        icon: rocket-launch
      secondary_action:
        text: 查看文档
        url: docs/
      announcement:
        text: "🚀 v0.4.0 — DeepSeek V4、Gemma 4、Qwen3.5 MoE GatedDeltaNet、EP LoRA 与 NPU 加速"
        link:
          text: "查看更新 →"
          url: "https://github.com/modelscope/twinkle/releases/tag/v0.4.0"
    design:
      spacing:
        padding: ["3rem", 0, "2rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # STATS
  # ═══════════════════════════════════════════════════════════════════════════
  - block: stats
    content:
      items:
        - statistic: "全模态"
          description: |
            主流模型
            LLM · VLM · MoE
        - statistic: "3 运行模式"
          description: |
            本地 · Ray · Client
        - statistic: "服务化"
          description: |
            训练即服务
            云原生 · 多租户
        - statistic: "<5分钟"
          description: |
            上手时间
            pip install 即用
    design:
      spacing:
        padding: ["1rem", 0, "1rem", 0]

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

        ```bash
        pip install 'twinkle-kit[ray]'
        ```

        ```python
        import twinkle
        from twinkle import DeviceGroup
        from twinkle.dataloader import DataLoader
        from twinkle.dataset import Dataset, DatasetMeta
        from twinkle.model import TransformersModel

        # 选择运行模式: 'local' (torchrun), 'ray', 或 'http'
        twinkle.initialize(mode='ray', groups=[DeviceGroup(name='default', ranks=8)])

        # 准备数据 — 支持魔搭和 Hugging Face
        dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
        dataset.set_template('Qwen3_5Template', model_id='ms://Qwen/Qwen3.5-4B')
        dataset.encode()

        # 创建模型 — 默认全参数训练
        model = TransformersModel(model_id='ms://Qwen/Qwen3.5-4B', remote_group='default')
        # 可选：添加 LoRA 进行参数高效训练
        # from peft import LoraConfig
        # model.add_adapter_to_model('default', LoraConfig(r=8, lora_alpha=32))
        model.set_optimizer(optimizer_cls='AdamW', lr=1e-4)

        # 训练 — 你掌控循环
        for batch in DataLoader(dataset=dataset, batch_size=8):
            model.forward_backward(inputs=batch)
            model.clip_grad_and_step()

        model.save('my-finetuned-model')
        ```

        ### 或通过魔搭 TaaS 训练 — 无需本地 GPU

        ```python
        import os
        from twinkle import init_tinker_client
        from twinkle.dataloader import DataLoader
        from twinkle.dataset import Dataset, DatasetMeta
        from twinkle.preprocessor import SelfCognitionProcessor
        from twinkle.server.common import input_feature_to_datum

        # 使用魔搭社区官方 TaaS 端点 — 免费，无需本地 GPU
        base_url = 'https://www.modelscope.cn/twinkle'
        api_key = os.environ.get('MODELSCOPE_TOKEN')
        base_model = 'Qwen/Qwen3.6-27B'

        # 本地准备数据
        dataset = Dataset(dataset_meta=DatasetMeta('ms://swift/self-cognition'))
        dataset.set_template('Qwen3_5Template', model_id=f'ms://{base_model}', max_length=256)
        dataset.map(SelfCognitionProcessor('My Model', 'My Team'))
        dataset.encode(batched=True)

        # 连接魔搭 TaaS 服务
        init_tinker_client()
        from tinker import ServiceClient, types

        service_client = ServiceClient(base_url=base_url, api_key=api_key)
        training_client = service_client.create_lora_training_client(
            base_model=base_model, rank=16
        )

        # 训练 — 相同的循环，运行在魔搭集群上
        for batch in DataLoader(dataset=dataset, batch_size=8):
            training_client.forward_backward(
                [input_feature_to_datum(f) for f in batch], 'cross_entropy'
            )
            training_client.optim_step(types.AdamParams(learning_rate=1e-4))

        training_client.save_state('my-lora').result()
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
            <h4 style="color: #6366f1; margin-bottom: 0.5rem;">🔌 三套 API</h4>
            <p style="font-size: 0.9rem; opacity: 0.8;">OpenAI 兼容 /chat/completions、原生 Twinkle API、Tinker 兼容 API</p>
          </div>
          <div style="text-align: center;">
            <h4 style="color: #6366f1; margin-bottom: 0.5rem;">🧩 模块化</h4>
            <p style="font-size: 0.9rem; opacity: 0.8;">25+ 组件：Dataset、Template、Model、Sampler、Loss、Reward、Metric...</p>
          </div>
          <div style="text-align: center;">
            <h4 style="color: #6366f1; margin-bottom: 0.5rem;">🔀 后端无关</h4>
            <p style="font-size: 0.9rem; opacity: 0.8;">Transformers 或 Megatron —— 一行配置切换</p>
          </div>
        </div>
    design:
      columns: '1'
      spacing:
        padding: ["2rem", 0, "2rem", 0]

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
            同一份接口运行在笔记本和千卡集群。从 `torchrun` 切换到 Ray 或 HTTP 部署，无需修改训练逻辑。
        - name: 内置多租户
          icon: users
          description: |
            一个基座模型同时训练 N 个不同的 LoRA。每个租户拥有独立的优化器、数据流水线和损失函数 —— 只共享算力。
        - name: 你掌控训练循环
          icon: code-bracket
          description: |
            没有隐藏的魔法。查看和控制每一个 forward、backward 和优化器步骤。自由组合算法，完全定制。
        - name: 训练即服务
          icon: cloud-arrow-up
          description: |
            为生产级 TaaS 部署而构建，支持自动化集群管理、动态扩缩容和企业级多租户隔离。
        - name: 全训练方法
          icon: academic-cap
          description: |
            SFT、预训练、GRPO、DPO、GKD 等。稠密模型和 MoE 架构。完整的 FSDP、张量并行、流水线并行支持。
        - name: 广泛的模型支持
          icon: cpu-chip
          description: |
            Qwen 3.6/3.5/3/2.5、DeepSeek R1/V4、Gemma 4、GLM-4、InternLM2 等。同时支持 Hugging Face 和魔搭模型库。
    design:
      spacing:
        padding: ["2rem", 0, "2rem", 0]

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
        | **A** | 全参数, 私有数据 | SFT 微调 |
        | **B** | LoRA r=32, Hub 数据集 | 增量预训练 |
        | **C** | GRPO 损失 + Sampler | 强化学习 |
        | **D** | 推理模式 | 对数概率计算 |

        每个租户**完全隔离** —— 不同的优化器、数据流水线、损失函数。
        只共享基座模型的算力。检查点自动同步到魔搭或 Hugging Face。

        </div>
    design:
      columns: '1'
      spacing:
        padding: ["2rem", 0, "2rem", 0]

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
          <span class="model-tag" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">Qwen 3.6</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">Qwen 3.5</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">Qwen 2.5</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">DeepSeek R1 / V4</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">LLaMA 3</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">GLM-4</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);">InternLM 2.5</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);">Mistral</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);">Yi</span>
        </div>
        <div style="margin: 1rem 0;">
          <span class="model-tag" style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);">Qwen VL</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #64748b 0%, #475569 100%);">InternVL</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #78716c 0%, #57534e 100%);">Qwen Embedding</span>
          <span class="model-tag" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">Gemma 4</span>
        </div>

        <p style="opacity: 0.7; font-size: 0.9rem;">
          支持主流 LLM 与 VLM · NVIDIA · 昇腾 NPU · SFT / PT / GRPO / DPO / GKD / Embedding
        </p>

        </div>
    design:
      columns: '1'
      css_class: "bg-gray-50"
      spacing:
        padding: ["2rem", 0, "2rem", 0]

  # ═══════════════════════════════════════════════════════════════════════════
  # USER JOURNEY
  # ═══════════════════════════════════════════════════════════════════════════
  - block: markdown
    content:
      title: ""
      text: |
        <div style="max-width: 900px; margin: 0 auto; text-align: center; padding: 1rem 0;">

        ## 三步上手

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-top: 2rem; text-align: left;">
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
            <h4 style="margin: 0 0 0.5rem 0;">1. 安装</h4>
            <code style="background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">pip install 'twinkle-kit[ray]'</code>
            <p style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.5rem;">30 秒完成。Python 3.11+，PyTorch 2.7+。</p>
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
            <h4 style="margin: 0 0 0.5rem 0;">2. 选择配方</h4>
            <p style="font-size: 0.85rem; opacity: 0.7;">浏览 <a href="/zh/showcase/">Cookbook</a> — SFT、GRPO、DPO、GKD、Embedding、多模态等。</p>
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
            <h4 style="margin: 0 0 0.5rem 0;">3. 训练与部署</h4>
            <p style="font-size: 0.85rem; opacity: 0.7;">本地 <code>torchrun</code> 运行，Ray 集群扩展，或使用 <a href="/zh/blog/modelscope-taas/">TaaS</a> 零基础设施训练。</p>
          </div>
        </div>

        </div>
    design:
      columns: '1'
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
