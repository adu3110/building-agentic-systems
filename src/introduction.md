# Building Agentic Systems

# About This Series

Most tutorials show you how to wrap an LLM in LangChain and call it an agent. That hides the hard parts: **state**, **memory**, **tool reliability**, **planning**, **evaluation**, and **coordination**.

This series is a framework-free guide to building agentic systems from first principles — plain Python, HTTP, JSON, SQLite. We build each layer ourselves and treat the LLM as a replaceable component, not the architecture.

Nothing here is copied from anyone else's site. The ideas come from building open-source repos, running regulated agent workflows, and debugging what breaks in production.

# The Running Example

Throughout the series we use one system: a **regulated case-resolution agent** that handles customer accounts in a financially regulated workflow. Not a coding assistant. Not a chatbot. A system that must remember constraints, call tools safely, log every step, and survive audit.

Companion repos (all open source):

| Repo | Layer |
|------|-------|
| [stateful-agent-lab](https://github.com/adu3110/stateful-agent-lab) | Loop, memory, planning, trajectory |
| [long-context-bench](https://github.com/adu3110/long-context-bench) | Context and memory benchmarks |
| [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch) | Trajectory and retrieval evaluation |
| [memcell-rl](https://github.com/adu3110/memcell-rl) | Memory policy and RL transitions |
| [agent-ledger](https://github.com/adu3110/agent-ledger) | Multi-agent coordination |

# The Three Books

The series is organized in three books. Each book covers a distinct layer of the stack.

# Book 1: Building an Agentic System

The foundation — one agent, one loop:

- The minimal agent loop (observe → plan → act → update)
- Typed memory instead of chat history
- Context assembly under a token budget
- Tools from scratch (schema, dispatch, permissions)
- Planning and scratchpads
- Stop conditions and escalation
- Trajectory logging

**Repo:** [stateful-agent-lab](https://github.com/adu3110/stateful-agent-lab)

# Book 2: Making Agentic Systems Reliable

Measurement — how you know the agent actually works:

- Why final-answer accuracy lies
- Trajectory properties and invariants
- Separating model failure from system failure
- Long-context failure modes (needle, recency, distractors)
- Retrieval vs memory vs context
- Memory policies, forgetting, and RL-ready transitions

**Repos:** [long-context-bench](https://github.com/adu3110/long-context-bench) · [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch) · [memcell-rl](https://github.com/adu3110/memcell-rl)

# Book 3: Scaling and Coordinating Agentic Systems

Multiple agents without chaos:

- Why direct agent-to-agent messaging breaks
- Append-only coordination logs
- Conflict detection and resolution
- Replay and checkpoints
- Permissions and sensitive memory
- Human-in-the-loop and regulated deployment

**Repo:** [agent-ledger](https://github.com/adu3110/agent-ledger)

# Who This Is For

- Engineers building agent workflows in production
- Researchers who want inspectable agent architectures
- Teams in regulated domains (finance, healthcare, compliance)
- Anyone tired of demo agents that break on week two

# Prerequisites

- Python 3.11+
- Basic LLM API usage (OpenAI-compatible endpoints)
- Comfort reading Python and systems design
- No agent framework experience required — we build the layers ourselves

# What You Will Not Find Here

- LangChain / CrewAI / AutoGen tutorials disguised as architecture
- Prompt-engineering-only advice with no systems design
- Coding-agent UI patterns (terminals, file trees, diff views)

Those are valid topics. They are not this series.

# About the Author

Hi — I'm **Aditi Chatterji**. I build AI systems from first principles: small transformers, evaluation harnesses, memory architectures, and agent workflows.

Most of my work lives on [GitHub](https://github.com/adu3110). I apply these ideas through [Kyne AI](https://www.kynelabs.ai/) (agent OS for regulated workflows) and [Squirrels Tech](https://www.squirrelstech.org/) (AI education from first principles).

Background: Master's from IISc, graduate study in CS at UPenn, Stanford LEAD. Earlier work in credit risk, stress testing, and applied ML at HSBC, Wizely, and KPMG — including three filed patents and a 75% scorecard cost reduction.

For the latest: [GitHub](https://github.com/adu3110) · [Contact](https://www.linkedin.com/in/aditi-chatterji-69082b75/)
