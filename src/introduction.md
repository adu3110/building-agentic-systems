# Building Agentic Systems

Welcome to a framework-free guide for building agentic systems that actually work in production.

## About This Series

Most tutorials show you how to wrap an LLM in LangChain and call it an agent. That hides the hard parts: **state**, **memory**, **tool reliability**, **planning**, **evaluation**, and **coordination**.

This series does the opposite. We build each layer from scratch — plain Python, HTTP, JSON, SQLite — and only mention frameworks at the end as a map of what they bundle.

## The Running Example

Throughout all three books we evolve one system: a **regulated case-resolution agent** that handles customer accounts in a financially regulated workflow. Not a coding assistant. Not a chatbot. A system that must remember constraints, call tools safely, log every step, and survive audit.

Companion repos (all open source):

| Repo | Book | Layer |
|------|------|-------|
| [stateful-agent-lab](https://github.com/adu3110/stateful-agent-lab) | 1 | Loop, memory, planning, trajectory |
| [long-context-bench](https://github.com/adu3110/long-context-bench) | 2 | Context/memory benchmarks |
| [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch) | 2 | Trajectory and retrieval eval |
| [memcell-rl](https://github.com/adu3110/memcell-rl) | 2 | Memory policy + RL transitions |
| [agent-ledger](https://github.com/adu3110/agent-ledger) | 3 | Multi-agent coordination |

## The Three Books

### Book 1: Building an Agentic System

The foundation. One agent, one loop, typed memory, tools, planning, and trajectory logging — no framework required.

**Start with Book 1 →**

### Book 2: Making Agentic Systems Reliable

Measurement. Why final answers lie, how to evaluate trajectories, long-context failure modes, memory policies, and RL-ready logging.

**Continue with Book 2 →**

### Book 3: Scaling and Coordinating Agentic Systems

Multiple agents, append-only ledgers, conflict resolution, permissions, human-in-the-loop, and regulated deployment.

**Continue with Book 3 →**

## Who This Is For

- Engineers building agent workflows in production
- Researchers who want inspectable agent architectures
- Teams in regulated domains (finance, healthcare, compliance)
- Anyone tired of demo agents that break on week two

## Prerequisites

- Python 3.11+
- Basic LLM API usage (OpenAI-compatible endpoints)
- Comfort reading ~200 lines of Python per chapter
- No agent framework experience required — we build the framework

## What You Will Not Find Here

- LangChain / CrewAI / AutoGen tutorials disguised as architecture
- Prompt-engineering-only advice with no systems design
- Coding-agent-specific UI patterns (terminals, file trees, diff views)

Those are valid topics. They are not this series.

---

**Ready?** → [Book 1: Introduction](./book1/01-introduction.md)
