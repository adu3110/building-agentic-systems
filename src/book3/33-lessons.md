# 33. Lessons Learned

## What actually mattered

1. **Chat history is not memory** — every production bug we traced came back to this confusion.
2. **Trajectories over answers** — regulators and good engineers ask *how*, not just *what*.
3. **Framework-free core** — ~500 lines you own beats 50k lines you don't.
4. **Measure failure modes** — needle, recency, distractor before blaming the model.
5. **Ledger over group chat** — multi-agent systems need append-only coordination.
6. **Escalation is success** — especially in regulated domains.
7. **RL-ready logging early** — even rule policies benefit from transition logs.

## What we'd do differently

- Start trajectory logging on day one (not week three)
- Benchmark recency conflict before claiming "long context solved it"
- Checkpoints in ledger from the start for long cases

## Companion repos (full list)

| Repo | Layer |
|------|-------|
| [stateful-agent-lab](https://github.com/adu3110/stateful-agent-lab) | Loop, memory, planning |
| [memcell-rl](https://github.com/adu3110/memcell-rl) | Memory policy + RL |
| [long-context-bench](https://github.com/adu3110/long-context-bench) | Context benchmarks |
| [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch) | Eval harness |
| [agent-ledger](https://github.com/adu3110/agent-ledger) | Multi-agent coordination |
| [reasoning-trace](https://github.com/adu3110/reasoning-trace) | Uncertainty / entropy |

## Appendix: where frameworks fit

| Framework piece | This series chapter |
|-----------------|---------------------|
| AgentExecutor | Ch 3 loop |
| Memory | Ch 4–5, Book 2 Ch 17–19 |
| Tools | Ch 7 |
| Evaluators | Book 2 |
| Multi-agent | Book 3 |

Use frameworks after you understand the layer they hide.

---

**Series complete.** Re-read Book 1 with Book 2 eval glasses, then implement Book 3 ledger on your CaseBot fork.

Questions or fixes: [GitHub Issues](https://github.com/adu3110/building-agentic-systems/issues)
