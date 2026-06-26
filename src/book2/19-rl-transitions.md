# 17. RL-Ready Transitions

Every time memcell-rl's `decide()` runs, it records a transition:

- **State** `s_t` — what cells were active, what the query was, how much budget remained
- **Action** `a_t` — which cells were selected vs suppressed
- **Reward** `r_t` — did the task succeed? Was there a stale memory error? Under budget?
- **Next state** `s_{t+1}` — memory state after the agent updated it

That's a `(state, action, reward, next_state)` tuple. The exact format offline RL expects.

The reason this matters: rule policies like `baseline_v0` work for known domains. But as the domain grows — more cell types, subtler tradeoffs, compliance-specific priorities — you want a policy trained on **your** data. memcell-rl logs every decision to make that possible without any extra instrumentation.

## What a transition looks like

```python
# After running casebot_regulated.py --dry-run, inspect the RL dataset:
import urllib.request, json

with urllib.request.urlopen("http://localhost:8000/v1/rl/dataset") as r:
    dataset = json.loads(r.read())

for t in dataset:
    print(f"transition: {t['transition_id'][:8]}")
    print(f"  reward:        {t['reward']['reward_value']:+.3f}")
    print(f"  task_success:  {t['reward']['task_success']}")
    print(f"  tokens_used:   {t['reward']['tokens_used']}")
    print(f"  state cells:   {len(t['state'].get('cell_features', []))}")
```

Each transition has:

```python
{
  "transition_id": "tr_abc123",
  "state": {
    "cell_features": [...],   # feature vector for each active cell
    "budget_tokens": 800,
    "query": "Review account 456...",
  },
  "action": {
    "selected_cell_ids": ["cell_x", "cell_y"],
    "suppressed_cell_ids": ["cell_z"],
  },
  "reward": {
    "reward_value": 0.82,
    "task_success": True,
    "unsafe_action": False,
    "stale_memory_error": False,
    "tokens_used": 820,
    "latency_ms": 340,
  },
  "next_state": {...},
}
```

## Running the real agent test

`real_agent_test.py` in memcell-rl is a three-turn conversation that exercises the full cycle:

```bash
uvicorn memcell_rl.app:app --port 8000
OPENAI_API_KEY=sk-... python examples/real_agent_test.py
```

It seeds two cells, runs three turns, logs feedback, and prints the RL dataset:

```
[Turn 1] User: What is my current account balance?
  decide → selected=1 suppressed=1
  [constraint] score=0.950 hard rule — always inject
  [preference] suppressed — budget

[2] RL dataset export:
  transition ab12…  reward=+0.820  success=True  tokens=234
  transition cd34…  reward=+0.751  success=True  tokens=198
```

That's two training examples generated from one test run. Run production cases and you accumulate a dataset tuned to your domain.

## When rule policies break down

`baseline_v0` works for CaseBot's ten-cell cases. It starts failing when:

- You have fifty cell types with domain-specific priority ordering
- Tradeoffs are non-obvious: a low-criticality cell about a high-risk transaction pattern matters more than a high-criticality routine balance fact for this query
- You want to optimize for latency-weighted task success, not just accuracy

At that point, export the dataset and train. The RL setup is entirely your choice — the transitions are format-agnostic. You don't need to use memcell-rl's policy — you can export the data and train with any offline RL library.

## No framework required

```python
# memcell-rl is HTTP — any language, any loop calls it
import urllib.request, json

def decide(task: str, case_id: str, budget: int) -> list[str]:
    resp = urllib.request.urlopen(
        urllib.request.Request(
            "http://localhost:8000/v1/cells/decide",
            data=json.dumps({"query": task, "scope": {"case": case_id}, "budget_tokens": budget}).encode(),
            headers={"Content-Type": "application/json"},
        )
    )
    return [s["cell_id"] for s in json.loads(resp.read())["selected_cells"]]
```

No LangChain memory module. No abstraction layer. One HTTP call.

## Exercise

Run `real_agent_test.py` with `task_success: False` in the feedback (simulate a failed case). Export the RL dataset. Compare `reward_value` to a successful run. What signals drove the difference?

**Companion:** [`memcell-rl/examples/real_agent_test.py`](https://github.com/adu3110/memcell-rl/blob/main/examples/real_agent_test.py)

**Next →** [Benchmark Design](./20-benchmarks.md)
