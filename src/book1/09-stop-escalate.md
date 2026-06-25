# 9. Stop Conditions and Escalation

## When to stop

An agent must terminate explicitly:

| Condition | Action |
|-----------|--------|
| Task answered | `answer` + log |
| Max steps hit | escalate or fail closed |
| Permission denied on required tool | escalate |
| Constraint violation detected | refuse + escalate |
| Duplicate tool call | escalate |
| Low confidence (optional) | ask human |

```python
if step >= max_steps:
    return escalate("max_steps_exceeded")
if duplicate_tool_call(trajectory, plan):
    return escalate("loop_detected")
```

## Escalation is success, not failure

In regulated workflows, **correct escalation** beats **wrong automation**.

CaseBot escalation payload:

```python
{
    "case_id": "456",
    "reason": "destructive_action_required_but_not_authorized",
    "trajectory_id": "tr_abc123",
    "memory_snapshot": store.snapshot(),
}
```

Human reviewers need state, not chat logs.

## Permission gates

Before destructive tools:

```python
if schema.is_destructive and not human_approved(case_id, action):
    return Action(type="escalate", reason="supervisor_approval_required")
```

Book 3 adds multi-agent approval via ledger.

## Refusal

Some requests violate hard constraints — refuse without tool calls:

```python
if violates_constraint(user_request, store.get_constraints()):
    return Action(type="answer", text="Cannot proceed: fee waiver requires approval.")
```

## Confidence gating (optional)

`reasoning-trace` computes per-token entropy from logprobs. High entropy on a tool-selection token → escalate instead of act. Not required for CaseBot v1, but useful for high-stakes domains.

**Companion:** [reasoning-trace](https://github.com/adu3110/reasoning-trace)

**Next →** [Trajectory Logging](./10-trajectory.md)
