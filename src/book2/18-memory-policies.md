# 18. Memory Policies and Forgetting

## Not everything should stay active

Without forgetting:

- Token budget always exceeded
- Stale facts compete with fresh ones
- PII accumulates past retention policy

Forgetting is a **policy**, not `del cell`.

## baseline_v0 rules (memcell-rl)

1. **Hard suppress** — expired, quarantined, or superseded cells
2. **Constraint keep** — always active until explicit release
3. **Token budget** — drop lowest-criticality background cells first
4. **Sensitivity gate** — PII cells require scope match

```python
def baseline_v0(cells, token_budget, task):
    active = [c for c in cells if c.status == "active"]
    constraints = [c for c in active if c.cell_type == "constraint"]
    rest = rank_by_criticality([c for c in active if c not in constraints])
    selected = constraints + fit_in_budget(rest, token_budget)
    return selected
```

## Quarantine

When a fact conflicts with a new observation, don't delete — **quarantine** until resolved:

```python
store.mark_status(old_id, "quarantined")
store.write(new_cell, status="pending_review")
```

## Feedback loop

After task completion, score memory decisions:

```python
# memcell-rl /v1/cells/feedback
{
  "transition_id": "tr_abc",
  "reward": 0.82,
  "signals": {
    "task_success": true,
    "stale_memory_error": false,
    "token_budget_ok": true
  }
}
```

Bad suppress decisions get negative reward — training data for later policy improvement.

**Next →** [RL-Ready Transitions](./19-rl-transitions.md)
