# Building Agentic Systems

A framework-free guide to building agentic systems from first principles — loop, memory, tools, planning, evaluation, and coordination. No LangChain. No magic in the middle.

---

## About This Series

Most tutorials show you how to wrap an LLM in LangChain and call it an agent. That hides the hard parts: **state**, **memory**, **tool reliability**, **planning**, **evaluation**, and **coordination**.

This series builds each layer from scratch — TypeScript, HTTP, JSON, SQLite — and treats the LLM as a replaceable component, not the architecture. The ideas come from building open-source repos, running regulated agent workflows, and debugging what breaks in production.

## The Running Example

Throughout all three books we build one system: a **regulated case-resolution agent** that handles customer accounts in a financially regulated workflow. Not a coding assistant. Not a chatbot. A system that must remember constraints, call tools safely, log every step, and survive audit.

Companion repos:

| Repo | Layer |
|------|-------|
| [stateful-agent-lab](https://github.com/adu3110/stateful-agent-lab) | Loop, memory, planning, trajectory |
| [long-context-bench](https://github.com/adu3110/long-context-bench) | Context and memory benchmarks |
| [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch) | Trajectory and retrieval evaluation |
| [memcell-rl](https://github.com/adu3110/memcell-rl) | Memory policy and RL transitions |
| [agent-ledger](https://github.com/adu3110/agent-ledger) | Multi-agent coordination |

## The Three Books

**Book 1 — Building an Agentic System** covers the foundation: one agent, one loop, typed memory, tools, planning, stop conditions, and trajectory logging. Repo: [stateful-agent-lab](https://github.com/adu3110/stateful-agent-lab).

**Book 2 — Making Agentic Systems Reliable** covers measurement: why final-answer accuracy lies, trajectory property checks, long-context failure modes, memory policies, and RL-ready transition logging. Repos: [long-context-bench](https://github.com/adu3110/long-context-bench) · [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch) · [memcell-rl](https://github.com/adu3110/memcell-rl).

**Book 3 — Scaling and Coordinating Agentic Systems** covers multiple agents: append-only coordination logs, conflict detection, replay, permissions, human-in-the-loop, and regulated deployment. Repo: [agent-ledger](https://github.com/adu3110/agent-ledger).

## Who This Is For

- Engineers building agent workflows in production
- Researchers who want inspectable, auditable agent architectures
- Teams in regulated domains — finance, healthcare, compliance
- Anyone tired of demo agents that break on week two

## Prerequisites

- TypeScript / Node.js basics
- Basic LLM API usage (OpenAI-compatible endpoints)
- No agent framework experience required — we build the layers

## What You Will Not Find Here

- LangChain / CrewAI / AutoGen tutorials disguised as architecture
- Prompt-engineering-only advice with no systems design
- Coding-agent UI patterns (terminals, file trees, diff views)

## About the Author

Hi — I'm **Aditi Chatterji**. I build AI systems from first principles: small transformers, evaluation harnesses, memory architectures, and agent workflows.

Most of my work lives on [GitHub](https://github.com/adu3110). I apply these ideas through [Kyne AI](https://www.kynelabs.ai/) (agent OS for regulated workflows) and [Squirrels Tech](https://www.squirrelstech.org/) (AI education from first principles).

Background: Master's from IISc, CS at UPenn, Stanford LEAD. Earlier work in credit risk, stress testing, and applied ML at HSBC, Wizely, and KPMG — three filed patents, 75% scorecard cost reduction.

[GitHub](https://github.com/adu3110) · [Contact](https://www.linkedin.com/in/aditi-chatterji-69082b75/)

---

**Start reading →** [1. Overview and Philosophy](./book1/02-philosophy.md)
