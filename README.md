# Building Agentic Systems

A framework-free guide to building agentic systems from first principles — loop, memory, tools, planning, evaluation, and coordination. No LangChain. No magic in the middle.

Every code block runs. Every chapter follows one case.

## Quick start

```bash
# Terminal 1 — memory service
cd memcell-rl && uvicorn memcell_rl.app:app --port 8000

# Terminal 2 — CaseBot (Book 1 running example)
python examples/casebot_regulated.py --dry-run

# Compliance failure demo
python examples/casebot_regulated.py --dry-run --bad-run

# Multi-agent coordination (Book 3)
cd agent-ledger/python && OPENAI_API_KEY=sk-... python ledger.py

# Evaluation harness (Book 2)
cd llm-evals-from-scratch && python -m evals.run_evals --suite trajectory
```

## Companion repos

| Repo | What it provides |
|------|-----------------|
| [`memcell-rl`](https://github.com/adu3110/memcell-rl) | Typed memory cells, HTTP API, RL transitions |
| [`llm-evals-from-scratch`](https://github.com/adu3110/llm-evals-from-scratch) | Trajectory eval, property checks, factuality, retrieval |
| [`agent-ledger`](https://github.com/adu3110/agent-ledger) | Append-only coordination ledger, conflict detection, replay |
| [`long-context-bench`](https://github.com/adu3110/long-context-bench) | Long-context benchmarks |

## Build the book locally

```bash
brew install mdbook
mdbook serve   # http://localhost:3000
```

## License

MIT
