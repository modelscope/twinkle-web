---
title: "TUI & Auto-Research: An AI Agent for Training Control"
date: 2026-06-01
tags:
  - TUI
  - Agent
  - Auto-Research
  - LLM Tools
  - Terminal UI
categories:
  - Technical Deep Dive
---

Twinkle ships a terminal-based UI (TUI) powered by an embedded LLM agent that can autonomously start, monitor, pause, and debug ML training runs. This post covers the architecture of the TUI, the agent loop, and the tool system that makes "auto-research" possible.

<!--more-->

## Architecture Overview

The TUI is built on [Textual](https://textual.textualize.io/) and consists of four panels in a 2x3 grid layout:

| Panel | Position | Purpose |
|-------|----------|---------|
| **StatusBar** | Top, full width | Run ID, model, step counter, training state |
| **MetricsPanel** | Middle left | Real-time loss/reward/grad_norm charts |
| **LogPanel** | Right, spanning 2 rows | Streaming stdout from training process |
| **ChatPanel** | Bottom left | Natural language interaction with the agent |

```css
Screen {
    layout: grid;
    grid-size: 2 3;
    grid-rows: auto 2fr 3fr;
    grid-columns: 2fr 1fr;
}
```

## The Agent Loop

At the heart of the TUI is `AgentLoop` — an async tool-calling agent that uses any **OpenAI-compatible API** (local Ollama, cloud API, etc.):

```python
agent = AgentLoop(
    connection=connection,
    llm_base_url='http://localhost:11434/v1',
    llm_model='qwen3.5',
    llm_api_key='not-needed',
)
```

The loop follows a standard ReAct pattern:

1. User sends a message via ChatPanel
2. Agent calls LLM with conversation history + tool schemas
3. LLM either responds directly or generates tool calls
4. Tools are executed, results fed back to LLM
5. Repeat until LLM produces a final text response (max 10 rounds)

Key design decisions:
- **Streaming**: Tokens are streamed to the UI in real-time. If tool calls are detected mid-stream, `on_stream_reset` discards partial output
- **History pruning**: Conversation is capped at 50 messages (excluding system prompt), with cuts always at `user` message boundaries to avoid breaking tool-call sequences
- **Async skills loading**: Skills are loaded in the background — the agent is usable immediately, skills are injected via `inject_skills()` when ready

## Tool System

The agent has access to 15+ tools organized into categories:

### Training Lifecycle
| Tool | Description |
|------|-------------|
| `start_server` | Launch Ray cluster + Twinkle Server (GPU partition, config generation) |
| `shutdown_server` | Stop server and release GPU resources |
| `start_training` | Write training script, launch process, begin monitoring |
| `pause_training` | SIGKILL client process (server retains state) |
| `resume_training` | Re-launch client script from saved state |
| `stop_training` | Graceful stop with checkpoint saving |
| `update_script` | Archive current script, write new version |

### Discovery & Search
| Tool | Description |
|------|-------------|
| `list_training_runs` | List active and historical runs |
| `get_training_status` | Get run state + recent metrics |
| `search_models` | Search ModelScope Hub for models |
| `search_datasets` | Search ModelScope Hub for datasets |
| `list_supported_models` | Query server for available models |
| `get_cluster_info` | Detect GPU resources (Ray or nvidia-smi) |

### Visualization
| Tool | Description |
|------|-------------|
| `zoom_metrics` | Pan/zoom the metrics chart |
| `select_metrics` | Choose which metrics to display (max 4) |
| `select_run` | Switch monitoring to a different run |

## Server Startup Pipeline

The `start_server` tool orchestrates a complete server deployment:

1. **Hardware detection** — `nvidia-smi` GPU count
2. **GPU allocation** — Partition GPUs between training model and sampler/teacher models
3. **Config generation** — Auto-generate `server_config.yaml` with Ray Serve applications
4. **Ray cluster start** — Multi-node GPU partitioning with separate raylets per role
5. **Server launch** — `python -m twinkle.server launch --config ...`
6. **Health check** — Poll `/api/v1/healthz` + sampler engine readiness

The config generator supports **multi-model topology**: one training model + N sampler/teacher models, with GPU sorting by size (largest PG deploys first to avoid scheduling deadlock).

## Skills System

The TUI supports extensible **skills** — pluggable capabilities loaded from three sources:

1. **Bundled skills** — shipped with the `twinkle_client` package
2. **Local skills** — user-defined in `~/.cache/twinkle/tui/skills/local/`
3. **Community skills** — fetched from ModelScope (with 10s timeout)

Skills are loaded asynchronously after the agent starts, so the TUI is interactive immediately.

## TrainingRuntime: Script-Side Integration

Training scripts integrate with the TUI via `TrainingRuntime`:

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

Key features:
- **metrics.jsonl** — structured metrics with auto-timestamp, streamed to TUI in real-time
- **Graceful shutdown** — SIGTERM handler saves checkpoint (LoRA weights + optimizer state + dataloader position)
- **Auto-resume** — `get_resume_info()` reads last saved step from `meta.json`
- **Script archival** — each `update_script` call archives `train.py` as `train_v{N}.py`

## Getting Started

```bash
# Start TUI with local LLM
twinkle tui --llm-base-url http://localhost:11434/v1 --llm-model qwen3.5

# Or with a specific run
twinkle tui --run-id my-grpo-run
```

The TUI turns ML training into a conversation — describe what you want to train, and the agent handles server setup, script writing, monitoring, and troubleshooting.
