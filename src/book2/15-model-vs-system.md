# 13. Model Failure vs System Failure

When CaseBot gives a wrong answer, the instinct is to blame the model and adjust the prompt. Most of the time, that is wrong. The failure is somewhere else in the stack — and if you don't know where, you'll spend weeks tuning prompts while the real bug stays in production.

I've seen this happen. A team spent three weeks shortening their system prompt because the agent "kept forgetting the fraud constraint." The constraint was in the prompt. It was being dropped by the context assembler under token pressure because it had `criticality: 0.3`. The model was fine.

## The failure taxonomy

```
Wrong agent answer
        │
        ├── Was the correct data ever stored in memory?
        │        │
        │        ├── NO  → memory write failure
        │        │         tool returned wrong data, or writeObservation skipped
        │        │
        │        └── YES
        │                 │
        │                 ├── Was it in context at decision step?
        │                 │        │
        │                 │        ├── NO  → retrieval failure
        │                 │        │         criticality too low, wrong scope, budget pressure
        │                 │        │
        │                 │        └── YES
        │                 │                 │
        │                 │                 ├── Did a constraint get violated?
        │                 │                 │        YES → policy failure
        │                 │                 │             stop condition missing
        │                 │                 │
        │                 │                 └── NO → model reasoning failure
        │                 │                          genuinely the LLM's fault
        │                 │
        │                 └── Did a tool error go unhandled?
        │                          YES → tool failure
        │                               error not propagated, planner confused
        │
        └── Did two agents disagree without resolution?
                 YES → coordination failure (Book 3)
```

Diagnose before you fix.

## Implementing the diagnostic

Here's a Python function that walks this flowchart for a CaseBot trajectory:

```python
from dataclasses import dataclass
from evals.trajectory import Trajectory

@dataclass
class Diagnosis:
    category: str   # "model" | "retrieval" | "memory_write" | "tool" | "policy"
    evidence: str
    fix: str

def diagnose(
    traj: Trajectory,
    expected_key: str,       # what should have been in context (e.g. "fraud_review")
    memory_snapshot: dict,   # context that was assembled at the failing step
    tool_errors: list[str],  # any ToolResult.error values in trajectory
    constraint_violated: bool,
) -> Diagnosis:

    if constraint_violated:
        return Diagnosis(
            category="policy",
            evidence="Constraint active but action was not gated",
            fix="Raise criticality to 1.0; add stop condition before destructive tool",
        )

    if tool_errors:
        return Diagnosis(
            category="tool",
            evidence="; ".join(tool_errors),
            fix="Check tool implementation, API connectivity, schema validation",
        )

    context_str = str(memory_snapshot)
    if expected_key not in context_str:
        # Was it ever stored at all?
        ever_stored = any(
            expected_key in str(s.result)
            for s in traj.tool_calls
            if s.result
        )
        if not ever_stored:
            return Diagnosis(
                category="memory_write",
                evidence=f"'{expected_key}' never appeared in any tool result",
                fix="Verify tool returns this field; check writeObservation path",
            )
        return Diagnosis(
            category="retrieval",
            evidence=f"'{expected_key}' was stored but not in context at decision step",
            fix="Raise criticality; check scope filter; reduce context pressure",
        )

    return Diagnosis(
        category="model",
        evidence="Correct data was in context; model reasoned incorrectly",
        fix="Adjust model, temperature, or add explicit reasoning step",
    )
```

## Real example: fee waiver incident

This incident happened in a staging environment:

```
Case 567: CaseBot waived a $50 fee without supervisor approval.

Trajectory:
  step 0: getAccount("567")     → balance $50, fee_owed $50
  step 1: getTransactions("567") → last_payment 2023-01-01
  step 2: waivedFee("567", "customer_hardship")  ← no constraint check

Diagnosis:
  - Constraint "fee_waiver_requires_approval" was written at criticality 0.5
  - Context assembly dropped it under token pressure (ranked below balance fact)
  - Stop condition for waivedFee was not wired in

Category: policy failure (with retrieval as contributing factor)

Fix:
  1. Set fee_waiver_requires_approval criticality to 1.0
  2. Add waivedFee to DESTRUCTIVE_TOOLS in registry
  3. Add property: constraint_honored_before_waiver
```

None of this required touching the LLM. The model was doing exactly what the context told it to do.

## How to use this in practice

Every time CaseBot fails in staging:

1. Export the trajectory JSON
2. Check tool errors: `[s.result for s in traj.tool_calls if not s.result.get("success")]`
3. Check what was in context at the failing step (log `fetch_memcell_context` output)
4. Run `diagnose()` — it forces you to walk the flowchart instead of guessing

If the category is `model`, only then adjust the prompt or model.

## Exercise

Intentionally write a constraint with `criticality: 0.1` for case 456. Run `--dry-run`. Does CaseBot still honor it? Check the trajectory to confirm whether the constraint appeared in context. What category would `diagnose()` return?

**Next →** [Long-Context Failure Modes](./16-long-context.md)
