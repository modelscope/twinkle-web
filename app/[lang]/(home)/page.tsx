import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
  ArrowRight, Boxes, Cpu, GitBranch, Layers, Monitor, Network,
  Rocket, Sparkles, Terminal, Wrench, BookOpen,
} from 'lucide-react';
import { GithubIcon as Github } from '@/components/github-icon';
import { Reveal } from '@/components/home/reveal';
import { CopyButton } from '@/components/home/copy';
import { InstallPanel } from '@/components/home/install';
import { WechatQr } from '@/components/home/wechat-qr';
import { asset, citation, site } from '@/lib/site';
import { LATEST_VERSION } from '@/lib/versions';
import news from '@/content/news.json';
import siteData from '@/content/site-data.json';
import perf from '@/content/perf.json';

// README 的 examples 链接属于代码仓库，组织/模型链接属于 ModelScope 模型页。
function NewsText({ markdown }: { markdown: string }) {
  return markdown.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!link) return <span key={i}>{part}</span>;
    const href = /^https?:\/\//.test(link[2]) ? link[2]
      : link[2].startsWith('examples/') ? `${site.repos.swift}/tree/main/${link[2]}`
      : `https://modelscope.cn/models/${link[2]}`;
    return <a key={i} href={href} target="_blank" rel="noreferrer">{link[1]}</a>;
  });
}

// 动画只表达组件关系，不绘制虚构的训练指标或性能曲线。
function FeatureVisual({ kind }: { kind: string }) {
  if (kind === 'models') return (
    <div className="swift-model-orbit" aria-hidden="true">
      <div className="swift-orbit-ring" /><div className="swift-orbit-ring swift-orbit-ring-inner" />
      <div className="swift-orbit-core"><Boxes size={26} /></div>
      {['Qwen', 'DeepSeek', 'GLM', 'Llama', 'Gemma', 'BGE / GTE'].map((label, i) => (
        <span key={label} className={`swift-orbit-label orbit-${i}`}>{label}</span>
      ))}
    </div>
  );
  if (kind === 'methods') return (
    <div className="swift-methods-visual" aria-hidden="true">
      {['Pre-train', 'SFT', 'DPO / KTO', 'GRPO / PPO', 'Distill', 'Agentic'].map((name, i) => (
        <span key={name} style={{ '--delay': `${i * -0.7}s` } as CSSProperties}><i />{name}</span>
      ))}
      <div className="swift-methods-line" />
    </div>
  );
  if (kind === 'hardware') return (
    <div className="swift-chip-visual" aria-hidden="true">
      <div className="swift-chip-lines" />
      <div className="swift-chip"><Cpu size={32} /><span>SWIFT</span></div>
      <span className="swift-chip-label chip-left">CUDA</span><span className="swift-chip-label chip-right">NPU</span>
      <span className="swift-chip-label chip-bottom">torch_npu</span>
    </div>
  );
  if (kind === 'custom') return (
    <div className="swift-code-visual" aria-hidden="true">
      <div><span className="swift-code-purple">swift</span> sft <span className="swift-code-cyan">--tuner</span> lora</div>
      <div className="swift-code-muted"># CLI · Config · Code API</div>
      <div><span className="swift-code-purple">loss</span> · reward · template<span className="swift-cursor" /></div>
    </div>
  );
  if (kind === 'remote') return (
    <div className="swift-remote-visual" aria-hidden="true">
      <div><Terminal size={22} /><span>Driver</span></div>
      <span className="swift-packet-track"><i /><i /><i /></span>
      <div className="swift-remote-server"><Network size={26} /><span>twinkle-server</span></div>
      <span className="swift-packet-track"><i /><i /><i /></span>
      <div><Cpu size={22} /><span>Cluster</span></div>
    </div>
  );
  return (
    <div className="swift-tool-visual" aria-hidden="true">
      {([[ 'EvalScope', BookOpen ], [ 'Inference', Rocket ], [ 'Quantization', Layers ], [ 'Deploy', Network ]] as const)
        .map(([label, Icon]) => <span key={label}><Icon size={21} />{label}</span>)}
    </div>
  );
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const zh = lang === 'zh';
  const n = zh ? news.zh : news.en;
  const docs = `/${lang}/docs/${LATEST_VERSION}/`;
  const features = [
    { kind: 'models', icon: Boxes, label: 'MODEL ECOSYSTEM', title: zh ? '新模型，第一时间。' : 'New models. Day one.',
      body: zh ? `${siteData.modelLoaderCount} 个注册模型 loader，覆盖语言、多模态、embedding 与 reranker。`
        : `${siteData.modelLoaderCount} registered model loaders. Language, multimodal, embedding and reranker, together.`,
      href: `${docs}get-started/models-and-datasets/`, tags: ['Qwen', 'DeepSeek', 'GLM', 'Gemma', 'Llama'] },
    { kind: 'methods', icon: Layers, label: 'TRAINING & ALIGNMENT', title: zh ? '从预训练，到对齐。' : 'Pre-train. Fine-tune. Align.',
      body: zh ? '预训练、SFT、偏好对齐、在线 RL 与蒸馏，统一训练体系；覆盖 Agentic 与多种任务头。'
        : 'Pre-training, SFT, preference alignment, online RL and distillation in one stack. Agentic workflows included.',
      href: `${docs}alignment/`, tags: ['PT', 'SFT', 'DPO', 'GRPO', 'GKD', 'Agentic'] },
    { kind: 'hardware', icon: Cpu, label: 'HARDWARE FLEXIBILITY', title: zh ? '让硬件，为你所用。' : 'Your hardware. Your choice.',
      body: zh ? '支持 NVIDIA GPU 与昇腾 NPU，结合多种训练后端与并行方式，适配你的计算环境。'
        : 'NVIDIA GPUs and Ascend NPUs. Multiple training backends and parallelism options for your compute environment.',
      href: `${docs}get-started/installation/`, tags: ['CUDA', 'Ascend NPU', 'HF', 'Megatron'] },
    { kind: 'custom', icon: Terminal, label: 'OWN YOUR TRAINING LOOP', title: zh ? '每一步，都由你掌控。' : 'Every step. In your hands.',
      body: zh ? '命令行开箱即用，Config 与代码 API 灵活组合。自定义 loss、reward、数据与模板，不必重写训练栈。'
        : 'Start with the CLI. Compose with Config and code APIs. Customize loss, reward, data and templates without rebuilding the stack.',
      href: `${docs}interfaces/code-api/`, tags: ['CLI', 'Config', 'Code API', 'Plugins'] },
    { kind: 'remote', icon: Network, label: 'LOCAL CODE · REMOTE COMPUTE', title: zh ? '代码在手边。算力无边界。' : 'Local code. Remote compute.',
      body: zh ? '用 --mode remote 连接 twinkle-server，将训练放到远端。驱动逻辑留在本地，算力按任务部署。'
        : 'Connect to twinkle-server with --mode remote. Keep your driver local and place training where the compute lives.',
      href: `${docs}interfaces/mp-separation/`, tags: ['Ray', 'Remote', 'twinkle-server'] },
    { kind: 'tools', icon: Wrench, label: 'THE COMPLETE TOOLCHAIN', title: zh ? '不止训练，贯穿全程。' : 'Beyond training. End to end.',
      body: zh ? 'EvalScope 评测、量化、推理与部署，配合可组合的 twinkle 组件，让模型从实验走向应用。'
        : 'Evaluation with EvalScope, quantization, inference and deployment. Composable twinkle components, from experiments to applications.',
      href: `/${lang}/services/`, tags: ['EvalScope', 'vLLM', 'SGLang', 'Quantization'] },
  ];

  return (
    <div id="nd-page" className="swift-home">
      <section className="swift-hero" aria-labelledby="hero-heading">
        <div className="swift-aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="swift-hero-grid" aria-hidden="true" />
        <div className="swift-hero-orbits" aria-hidden="true"><i /><i /><i /></div>
        <div className="swift-hero-content swift-container">
          <div className="swift-hero-badge"><span className="swift-live-dot" /> SWIFT 5 <span className="swift-badge-separator">/</span> BUILT ON TWINKLE</div>
          <h1 id="hero-heading" className="swift-hero-title">
            {zh ? '写单机代码。' : 'Your code.'}<br />
            <span className="swift-hero-gradient">{zh ? '训任意规模。' : 'Any scale.'}</span>
          </h1>
          <p className="swift-hero-description">
            {zh ? '大模型训练的一站式开源框架。' : 'The open-source stack for large-model training.'}<br />
            {zh ? '从微调、对齐到部署，让想法跨越算力的边界。' : 'Fine-tune, align and deploy. Take your ideas beyond the limits of a single machine.'}
          </p>
          <div className="swift-hero-actions">
            <Link href={`${docs}get-started/quick-start/`} className="swift-button swift-button-primary">
              {zh ? '开始训练' : 'Start building'}<ArrowRight size={17} />
            </Link>
            <Link href={`/${lang}/webui/`} className="swift-button swift-button-glass"><Monitor size={17} />{zh ? '探索 WebUI' : 'Explore WebUI'}</Link>
            <a href={site.repos.swift} className="swift-hero-github" target="_blank" rel="noreferrer"><Github size={17} /> GitHub <ArrowRight size={14} /></a>
          </div>
          <InstallPanel zh={zh} />
          <div className="swift-hero-footnote"><span />OPEN SOURCE<span />CLI · CODE API · WEBUI<span />{LATEST_VERSION}</div>
        </div>
      </section>

      <section className="swift-ecosystem swift-container" aria-label={zh ? '支持的模型生态' : 'Model ecosystem'}>
        <p>{zh ? '面向你正在使用的模型' : 'BUILT FOR THE MODELS YOU WORK WITH'}</p>
        <div className="swift-model-wordmarks">
          <span>Qwen<Sparkles size={17} className="swift-wordmark-star" aria-hidden="true" /></span><span>DeepSeek</span><span>GLM</span><span>Gemma</span><span>Llama</span><span>InternLM</span>
        </div>
        <div className="swift-news">
          <span className="swift-news-label"><Rocket size={14} />NEWS</span>
          <time>{n.date}</time><p><NewsText markdown={n.markdown} /></p>
          <a href={n.source} target="_blank" rel="noreferrer" aria-label={zh ? '查看新闻来源' : 'View news source'}><ArrowRight size={16} /></a>
        </div>
      </section>

      <section className="swift-capabilities swift-container" aria-labelledby="features-heading">
        <Reveal className="swift-section-heading">
          <span className="swift-eyebrow"><Sparkles size={14} /> ONE STACK. EVERY POSSIBILITY.</span>
          <h2 id="features-heading">{zh ? '完整的能力。自由的组合。' : 'All the power. None of the limits.'}</h2>
          <p>{zh ? '以 SWIFT 编排训练，用 Twinkle 组合能力。让工具适应你的工作，而不是反过来。'
            : 'Orchestrated by SWIFT. Composed with Twinkle. A toolkit that works the way you do.'}</p>
        </Reveal>
        <div className="swift-feature-grid">
          {features.map((feature, i) => (
            <Reveal key={feature.kind} className={`swift-feature swift-feature-${feature.kind}`} delay={i * 45}>
              <div className="swift-feature-top"><span className="swift-feature-icon"><feature.icon size={19} /></span><span>{feature.label}</span><span className="swift-feature-number">0{i + 1}</span></div>
              <FeatureVisual kind={feature.kind} />
              <h3>{feature.title}</h3><p className="swift-feature-description">{feature.body}</p>
              <div className="swift-feature-tags">{feature.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <Link href={feature.href} className="swift-feature-link">{zh ? '深入了解' : 'Explore'}<ArrowRight size={16} /><span className="sr-only"> — {feature.title}</span></Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="swift-workbench swift-container" aria-labelledby="workbench-heading">
        <Reveal className="swift-workbench-card">
          <div className="swift-workbench-copy">
            <span className="swift-eyebrow"><Monitor size={15} /> THE VISUAL WORKBENCH</span>
            <h2 id="workbench-heading">{zh ? '让训练，看得见。' : 'A new view of your workflow.'}</h2>
            <p>{zh ? '在 WebUI 中管理训练，通过拖拽画布编排工作流，用 AutoResearch 探索实验。代码与可视化，各取所长。'
              : 'Manage training, compose workflows on a drag-and-drop canvas, and explore experiments with AutoResearch. Code and visual tools, working together.'}</p>
            <div className="swift-workbench-tags"><span>Training</span><span>Workflow</span><span>AutoResearch</span></div>
            <Link href={`/${lang}/webui/quick-start/`} className="swift-button swift-button-primary">{zh ? '打开使用指南' : 'Meet the workbench'}<ArrowRight size={16} /></Link>
          </div>
          <div className="swift-workbench-preview">
            <div className="swift-window-bar"><span className="swift-terminal-dots" aria-hidden="true"><i /><i /><i /></span><span>SWIFT WebUI</span><span className="swift-window-tag">WORKBENCH</span></div>
            {/* 真实界面素材，无虚构的训练状态或指标。 */}
            <img src={asset(zh ? '/images/web-ui.jpg' : '/images/web-ui-en.jpg')} alt={zh ? 'SWIFT WebUI 界面' : 'SWIFT WebUI interface'} width={1523} height={991} loading="lazy" />
          </div>
        </Reveal>
      </section>

      <section className="swift-performance swift-container">
        <Reveal className="swift-performance-card">
          <span className="swift-performance-icon"><GitBranch size={22} /></span>
          <div><span className="swift-eyebrow">MEASURED, NOT ASSUMED.</span>
            <h2>{zh ? '每个结果，都有据可查。' : 'Results you can trace.'}</h2>
            <p>{perf.status === 'ready'
              ? (zh ? 'v4 / v5-ray / v5-remote 实测对比，数据可追溯至运行日志。' : 'Measured v4 / v5-ray / v5-remote comparisons, traceable to run logs.')
              : (zh ? '性能基准结果待发布。只展示经过验证的数据，不提前给出性能数字。' : 'Benchmark results are pending. Verified measurements only. No premature performance claims.')}</p>
          </div>
          <Link href={`/${lang}/performance/`} className="swift-button swift-button-outline">{zh ? '基准测试' : 'Benchmarks'}<ArrowRight size={16} /></Link>
        </Reveal>
      </section>

      <section className="swift-community swift-container">
        <Reveal className="swift-section-heading">
          <span className="swift-eyebrow">OPEN SOURCE. BUILT TOGETHER.</span>
          <h2>{zh ? '下一次突破，一起创造。' : 'Build the next breakthrough.'}</h2>
          <p>{zh ? '与研究者、开发者一起交流，让新的训练方法从想法变成现实。' : 'Join researchers and developers turning new training ideas into reality.'}</p>
          <div className="swift-community-links">
            <a href={site.repos.swift} target="_blank" rel="noreferrer"><Github size={17} />SWIFT<ArrowRight size={14} /></a>
            <a href={site.repos.twinkle} target="_blank" rel="noreferrer"><Boxes size={17} />Twinkle<ArrowRight size={14} /></a>
            <a href={site.discord} target="_blank" rel="noreferrer">Discord<ArrowRight size={14} /></a>
            <WechatQr label={zh ? '微信群' : 'WeChat'} />
          </div>
        </Reveal>
        <Reveal className="swift-citation">
          <div><BookOpen size={18} /><span>{zh ? '在研究中使用 SWIFT？' : 'Using SWIFT in your research?'}</span><CopyButton text={citation} label={zh ? '复制 BibTeX' : 'Copy BibTeX'} /></div>
          <details><summary>{zh ? '查看引用信息' : 'View citation'}</summary><pre><code>{citation}</code></pre></details>
        </Reveal>
      </section>
      <footer className="swift-footer swift-container"><span>SWIFT <span className="swift-footer-cross">×</span> TWINKLE</span><p>{zh ? '开源、可组合的大模型训练体系。' : 'Open-source, composable large-model training.'}</p><span>ModelScope</span></footer>
    </div>
  );
}
