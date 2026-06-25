# 1. Introduction

## What is an agentic system?

An **agentic system** is a program that:

1. Maintains **state** beyond the current prompt
2. **Decides** when to act, when to retrieve, when to ask
3. **Calls tools** in the outside world
4. **Updates** its state from observations
5. **Stops** when a goal is met or escalation is required

A chatbot that answers one question and forgets is not an agent. A RAG pipeline that retrieves chunks and generates is not quite an agent either — it has no persistent typed state, no explicit action loop, and no trajectory.

This book builds the missing middle layer.

## Our example: the case-resolution agent

We will build **CaseBot** — an agent that handles regulated customer account cases:

- Look up account status and recent transactions
- Apply business rules (e.g. never waive fees without supervisor approval)
- Flag accounts for review when patterns match
- Log every step for audit

CaseBot runs in Python with direct LLM API calls. No LangChain. No agent framework.

By the end of Book 1 you will have:

```
observe → plan → act → update memory → log trajectory → repeat
```

## What this book covers

| Chapter | Layer |
|---------|-------|
| 2 | Philosophy — what to build vs what to buy |
| 3 | The minimal agent loop |
| 4–5 | State and typed memory |
| 6 | Context assembly |
| 7 | Tools from scratch |
| 8 | Planning |
| 9 | Stop / escalate |
| 10 | Trajectory logging |
| 11 | Full integration |

## Companion code

Clone [stateful-agent-lab](https://github.com/adu3110/stateful-agent-lab) and run:

```bash
cd stateful-agent-lab
python agent/agent.py --task "Look up account 456 and summarize its status"
```

The demo uses stub tools (no API key) so you can see the architecture immediately. Each chapter maps to a module in that repo.

## How to read this book

Read in order. Each chapter adds one subsystem. Skipping to tools before memory will feel convenient and break in production.

When you see code, type it or run the companion repo — don't just read.

**Next →** [Overview and Philosophy](./02-philosophy.md)
