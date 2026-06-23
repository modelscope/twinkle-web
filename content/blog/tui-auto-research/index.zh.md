---
title: "TUI 与 Auto-Research：用 AI Agent 控制训练"
date: 2026-06-01
tags:
  - TUI
  - Agent
  - Auto-Research
  - LLM 工具
  - 终端界面
categories:
  - 技术深度解析
---

Twinkle 内置了一个终端 UI（TUI），集成 LLM Agent，可以自主启动、监控、暂停和调试 ML 训练任务。本文介绍 TUI 的架构设计、Agent 循环以及让「自动化研究」成为可能的工具系统。

<!--more-->

## 架构概览

TUI 基于 [Textual](https://textual.textualize.io/) 构建，由四个面板组成 2x3 网格布局：

| 面板 | 位置 | 功能 |
|------|------|------|
| **StatusBar** | 顶部，全宽 | Run ID、模型、步数、训练状态 |
| **MetricsPanel** | 中左 | 实时 loss/reward/grad_norm 图表 |
| **LogPanel** | 右侧，跨 2 行 | 训练进程的流式 stdout 输出 |
| **ChatPanel** | 左下 | 与 Agent 的自然语言交互 |

```css
Screen {
    layout: grid;
    grid-size: 2 3;
    grid-rows: auto 2fr 3fr;
    grid-columns: 2fr 1fr;
}
```

## Agent 循环

TUI 的核心是 `AgentLoop`——一个异步工具调用 Agent，支持任何 **OpenAI 兼容 API**（本地 Ollama、云端 API 等）：

```python
agent = AgentLoop(
    connection=connection,
    llm_base_url='http://localhost:11434/v1',
    llm_model='qwen3.5',
    llm_api_key='not-needed',
)
```

循环遵循标准的 ReAct 模式：

1. 用户通过 ChatPanel 发送消息
2. Agent 携带对话历史 + 工具 schema 调用 LLM
3. LLM 直接回复或生成工具调用
4. 执行工具，将结果回传 LLM
5. 重复直到 LLM 产生最终文本回复（最多 10 轮）

关键设计决策：
- **流式输出**：Token 实时流式传输到 UI。如果在流中检测到工具调用，`on_stream_reset` 会丢弃已部分显示的输出
- **历史修剪**：对话上限 50 条消息（不含系统提示），始终在 `user` 消息边界裁剪，避免破坏工具调用序列
- **异步技能加载**：技能在后台加载——Agent 立即可用，技能就绪后通过 `inject_skills()` 注入

## 工具系统

Agent 拥有 15+ 个工具，按类别组织：

### 训练生命周期
| 工具 | 说明 |
|------|------|
| `start_server` | 启动 Ray 集群 + Twinkle Server（GPU 分区、配置生成） |
| `shutdown_server` | 关停 Server 并释放 GPU 资源 |
| `start_training` | 编写训练脚本、启动进程、开始监控 |
| `pause_training` | SIGKILL 客户端进程（Server 保留状态） |
| `resume_training` | 从保存的状态重新启动客户端脚本 |
| `stop_training` | 优雅停止并保存 checkpoint |
| `update_script` | 归档当前脚本，写入新版本 |

### 发现与搜索
| 工具 | 说明 |
|------|------|
| `list_training_runs` | 列出活跃和历史训练任务 |
| `get_training_status` | 获取任务状态 + 最近指标 |
| `search_models` | 在 ModelScope Hub 搜索模型 |
| `search_datasets` | 在 ModelScope Hub 搜索数据集 |
| `list_supported_models` | 查询 Server 支持的模型 |
| `get_cluster_info` | 检测 GPU 资源（Ray 或 nvidia-smi） |

### 可视化
| 工具 | 说明 |
|------|------|
| `zoom_metrics` | 平移/缩放指标图表 |
| `select_metrics` | 选择显示哪些指标（最多 4 个） |
| `select_run` | 切换监控的训练任务 |

## Server 启动流水线

`start_server` 工具编排完整的服务端部署：

1. **硬件检测** — `nvidia-smi` 获取 GPU 数量
2. **GPU 分配** — 在训练模型和采样器/教师模型之间分区
3. **配置生成** — 自动生成包含 Ray Serve 应用的 `server_config.yaml`
4. **Ray 集群启动** — 多节点 GPU 分区，每个角色使用独立 raylet
5. **Server 启动** — `python -m twinkle.server launch --config ...`
6. **健康检查** — 轮询 `/api/v1/healthz` + 采样器引擎就绪检测

配置生成器支持**多模型拓扑**：一个训练模型 + N 个采样器/教师模型，按 GPU 数量降序排列（最大 PG 优先部署以避免调度死锁）。

## 技能系统

TUI 支持可扩展的 **Skills**——可插拔能力，从三个来源加载：

1. **内置技能** — 随 `twinkle_client` 包一起发布
2. **本地技能** — 用户自定义，放在 `~/.cache/twinkle/tui/skills/local/`
3. **社区技能** — 从 ModelScope 获取（10 秒超时）

技能在 Agent 启动后异步加载，因此 TUI 立即可交互。

## TrainingRuntime：训练脚本集成

训练脚本通过 `TrainingRuntime` 与 TUI 集成：

```python
from twinkle_client.tui.runtime import TrainingRuntime

rt = TrainingRuntime(run_id='grpo-gsm8k')
rt.start(model_id='Qwen/Qwen3.5-4B', config={...})
rt.register_graceful_shutdown(model, dataloader)

for step, batch in enumerate(dataloader):
    loss = train(batch)
    rt.log_metrics(step=step, loss=loss, reward=reward)
    rt.log(f'Step {step}, loss={loss:.4f}')

rt.finish()
```

核心功能：
- **metrics.jsonl** — 结构化指标，自动时间戳，实时流式传输到 TUI
- **优雅停机** — SIGTERM 处理器保存 checkpoint（LoRA 权重 + 优化器状态 + dataloader 位置）
- **自动续训** — `get_resume_info()` 从 `meta.json` 读取最后保存的步数
- **脚本归档** — 每次 `update_script` 调用将 `train.py` 归档为 `train_v{N}.py`

## 快速开始

```bash
# 使用本地 LLM 启动 TUI
twinkle tui --llm-base-url http://localhost:11434/v1 --llm-model qwen3.5

# 或指定运行 ID
twinkle tui --run-id my-grpo-run
```

TUI 将 ML 训练变成一场对话——描述你想训练什么，Agent 自动处理服务器部署、脚本编写、监控和排障。
