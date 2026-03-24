# Twinkle

**Training workbench to make your model glow**

Twinkle is a lightweight, client-server training framework engineered with modular, high-cohesion interfaces for LLM training.

## Key Features

- **Loosely Coupled Architecture** — Standardized interfaces with backward compatibility. Use only what you need.
- **Multiple Runtime Modes** — Run locally with torchrun, scale across Ray clusters, or deploy as HTTP services.
- **Multi-Framework Support** — Works with both Transformers and Megatron backends.
- **Multi-Tenancy Training** — Train multiple LoRAs on a shared base model with isolated configurations.
- **Training as a Service** — Built-in capabilities for automated cluster management and dynamic scaling.
- **Full Training Control** — Retain control over forward, backward, and step operations for easy debugging.

## Links

- **Source Code**: [github.com/modelscope/twinkle](https://github.com/modelscope/twinkle)
- **Documentation**: [modelscope.github.io/twinkle-web/docs/](https://modelscope.github.io/twinkle-web/docs/)
- **Releases**: [github.com/modelscope/twinkle/releases](https://github.com/modelscope/twinkle/releases)

## License

Apache License 2.0
