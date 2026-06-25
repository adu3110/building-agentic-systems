# 19. RL-Ready Transitions

## Every memory decision is an action

At step `t`:

- **State** `s_t` — features of current cells, task, budget
- **Action** `a_t` — which cells kept/suppressed
- **Reward** `r_t` — task outcome + safety signals
- **Next state** `s_{t+1}` — memory after decision

```python
@dataclass
class MemoryTransition:
    state_features: dict
    action: list[str]   # cell ids selected
    reward: float | None
    next_state_features: dict | None
```

Log every transition. Export for offline RL:

```bash
curl http://localhost:8000/v1/rl/dataset?min_reward=0.5
```

## Why RL-native memory?

Rule policies (`baseline_v0`) work until:

- Domain has hundreds of cell types
- Tradeoffs are non-obvious (latency vs accuracy vs compliance)
- You have logged transitions from production

Then train a policy on **your** data — not a generic RAG template.

## Framework-free integration

`memcell-rl` is HTTP — any agent loop calls it:

```python
requests.post(f"{MEMCELL}/v1/cells/write", json=cell)
resp = requests.post(f"{MEMCELL}/v1/cells/decide", json={"scope": scope, "token_budget": 2000})
selected = resp.json()["selected_cells"]
# assemble context from selected only
```

No LangChain memory class required.

**Companion:** [memcell-rl examples/real_agent_test.py](https://github.com/adu3110/memcell-rl/blob/main/examples/real_agent_test.py)

**Next →** [Benchmark Design](./20-benchmarks.md)
