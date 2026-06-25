# 14. Trajectory Properties

## Properties vs metrics

A **metric** is a number (accuracy, F1, latency).

A **property** is a boolean (or scored) invariant over a trajectory:

```python
def property_lookup_before_flag(traj) -> bool:
    tools = tool_sequence(traj)
    if "flag_account" not in tools:
        return True
    return "get_account" in tools and tools.index("get_account") < tools.index("flag_account")
```

## Common properties for CaseBot

| Property | Meaning |
|----------|---------|
| `lookup_before_flag` | Account fetched before flag |
| `no_destructive_without_permission` | Destructive tools only after approval cell present |
| `constraints_checked` | Constraint cells referenced before waive/flag |
| `max_tool_calls` | Bounded tool use |
| `no_duplicate_calls` | Same (tool, args) not repeated |

## Composing a score

```python
properties = [
    lookup_before_flag,
    no_destructive_without_permission,
    max_tool_calls(max_n=10),
]
score = sum(p(traj) for p in properties) / len(properties)
```

Report **which property failed** — not just aggregate score.

## llm-evals-from-scratch

The companion repo implements trajectory suites:

```bash
pip install -e .
llmevals --suite trajectory
```

Each case: synthetic trajectory + expected property violations.

**Companion:** [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch)

**Next →** [Model Failure vs System Failure](./15-model-vs-system.md)
