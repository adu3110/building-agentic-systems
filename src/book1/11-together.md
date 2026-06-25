# 11. Putting It Together

## CaseBot v1 architecture

```
                    ┌──────────────┐
                    │   Task       │
                    └──────┬───────┘
                           ▼
              ┌────────────────────────┐
              │      TaskPlanner       │
              └───────────┬────────────┘
                          ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ MemoryStore │◄───│  Agent Loop  │───►│ Trajectory  │
└──────┬──────┘    └──────┬───────┘    └─────────────┘
       │                  │
       │           ┌──────▼───────┐
       │           │ ToolRegistry │
       │           └──────┬───────┘
       │                  ▼
       │           ┌──────────────┐
       └──────────►│ Context      │──► LLM API
                   │ Assembler    │
                   └──────────────┘
```

## Module map (`stateful-agent-lab`)

| Module | Responsibility |
|--------|----------------|
| `agent.py` | Loop orchestration |
| `memory.py` | Typed state |
| `planner.py` | Decompose + next action |
| `tools.py` | Schema + dispatch |
| `trajectory.py` | Step logging |

## Run the full demo

```bash
git clone https://github.com/adu3110/stateful-agent-lab
cd stateful-agent-lab
python agent/agent.py \
  --task "Look up account 456, check transactions, flag if balance anomaly" \
  --export logs/case456.json
```

Expected trajectory:

1. `PLAN` — steps decomposed
2. `TOOL_CALL` — `get_account`
3. `OBSERVATION` — account data
4. `TOOL_CALL` — `get_transactions`
5. `MEMORY_WRITE` — facts stored
6. `TOOL_CALL` or `ANSWER` — depending on heuristics

## What Book 1 did not cover

- Benchmarking failure modes → Book 2
- RL-trained memory policy → Book 2 (`memcell-rl`)
- Multi-agent coordination → Book 3 (`agent-ledger`)

## Checklist before Book 2

- [ ] Loop terminates on answer, escalate, or max steps
- [ ] Constraints stored as typed cells, injected first in context
- [ ] Tools registered with schemas and permissions
- [ ] Every tool call logged in trajectory
- [ ] No framework in the critical path

**Book 1 complete.** → [Book 2: Introduction](../book2/12-introduction.md)
