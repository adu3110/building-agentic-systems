# Book 0: How LLMs Work

Before we build an agent, we need to understand the machine at the center of it.

This book covers what a large language model actually is — not at a high level ("it's a neural network trained on text") but at the level where you can explain every step of the computation, read the research, and understand why each design choice was made.

We go through:

1. **Neural networks** — what a neuron is, what a layer is, what learning means
2. **Tokens** — the vocabulary the model uses and why
3. **Embeddings** — how integers become vectors with meaning
4. **Attention** — the Q/K/V mechanism that lets tokens look at each other, derived from scratch with actual numbers
5. **Transformer layers** — multi-head attention, feedforward blocks, residuals, LayerNorm, why we stack them
6. **Generation** — how logits become text, what temperature is, why generation is autoregressive
7. **What the model cannot do** — the specific structural limits that motivate everything in Books 1–3
8. **Workflows vs agents** — when to use each, with a decision framework and concrete examples

None of this requires a math degree. It requires patience and a willingness to trace through a few dozen lines of Python.

At the end of this book, you will understand exactly what you're building around in Books 1–3.

**Start here:** [What a neural network actually is](./01-neural-networks.md)
