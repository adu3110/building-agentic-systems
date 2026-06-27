# Building Agentic Systems

A framework-free guide to building agentic systems from first principles — loop, memory, tools, planning, evaluation, and coordination. No LangChain. No magic in the middle.

Every code block runs. Book 1 is a build path: run `step01` … `step09`, then CaseBot.

## Book 1 build path

```bash
cd repos/memcell-rl   # from Aditi-website workspace; or cd memcell-rl if cloned standalone
python3 examples/build/step01_task.py
python3 examples/build/step02_loop.py
# … through step09_stops.py

# Step 10 — full CaseBot (memcell server required for live memory):
uvicorn memcell_rl.app:app --port 8000   # terminal 1
python3 examples/casebot_regulated.py --dry-run   # terminal 2
```

## Quick start (CaseBot only)

```bash
# Terminal 1 — memory service
cd memcell-rl && uvicorn memcell_rl.app:app --port 8000

# Terminal 2 — CaseBot (Book 1 finished artifact)
python3 examples/casebot_regulated.py --dry-run

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
