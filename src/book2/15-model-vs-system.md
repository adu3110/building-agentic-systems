# 21. Model Failure vs System Failure

When CaseBot gives a wrong answer, the instinct is to blame the model and tune the prompt. Most of the time, that is wrong. The failure is somewhere else in the stack — and if you don't diagnose before fixing, you'll spend weeks on the wrong layer while the real bug stays in production.

I've seen this happen: a team spent three weeks shortening their system prompt because the agent "kept forgetting the fraud constraint." The constraint was in the prompt. It was being dropped by the context assembler because it had been given `criticality: 0.3`. The model was fine. The memory policy was misconfigured.

## The failure taxonomy

When an agent fails, work down this tree:

```
Wrong agent output
        │
        ├── Was the correct data ever stored in memory?
        │        │
        │        ├── NO  → memory write failure
        │        │         tool returned wrong data, or fact was never seeded
        │        │
        │        └── YES
        │                 │
        │                 ├── Was it in context at the decision step?
        │                 │        │
        │                 │        ├── NO  → retrieval/assembly failure
        │                 │        │         criticality too low, wrong scope, budget pressure
        │                 │        │
        │                 │        └── YES
        │                 │                 │
        │                 │                 ├── Did a constraint get violated?
        │                 │                 │        YES → policy failure
        │                 │                 │             stop condition missing
        │                 │                 │
        │                 │                 └── NO → model reasoning failure
        │                 │                          the LLM made a wrong call
        │                 │
        │                 └── Did a tool error go unhandled?
        │                          YES → tool failure
        │                               error not propagated, planner confused
        │
        └── Did two agents disagree without resolution?
                 YES → coordination failure (Book 3)
```

Diagnose before you fix. The tree tells you which layer failed.

## Implementing the diagnostic

```python
def diagnose_failure(traj_path: str, expected_outcome: str) -> dict:
    import json
    data = json.loads(open(traj_path).read())
    
    result = {
        "case_id": data["case_id"],
        "outcome": data["outcome"],
        "expected": expected_outcome,
        "outcome_correct": expected_outcome.lower() in data["outcome"].lower(),
    }
    
    # Check 1: Was data ever in memory?
    # (For CaseBot, check if getAccount was in tools_used)
    result["data_fetched"] = "getAccount" in data["tools_used"]
    
    # Check 2: Did a tool error occur?
    tool_errors = [
        s for s in data["steps"]
        if s["action_type"] == "tool_call"
        and s.get("result", {}).get("success") is False
    ]
    result["tool_errors"] = [
        {"tool": s["action"]["tool"], "error": s["result"]["error"]}
        for s in tool_errors
    ]
    
    # Check 3: Was it a duplicate call loop?
    tools_called = [s["action"].get("tool") for s in data["steps"]
                    if s["action_type"] == "tool_call"]
    result["duplicate_detected"] = len(tools_called) != len(set(tools_called))
    
    # Check 4: Did it hit max steps?
    result["hit_max_steps"] = "max_steps_exceeded" in data["outcome"]
    
    # Classify
    if result["tool_errors"]:
        result["failure_layer"] = "tool"
    elif result["hit_max_steps"] or result["duplicate_detected"]:
        result["failure_layer"] = "planning"
    elif not result["data_fetched"]:
        result["failure_layer"] = "memory"
    elif not result["outcome_correct"]:
        result["failure_layer"] = "model_reasoning"
    else:
        result["failure_layer"] = None  # success
    
    return result
```

Run this on every failing trajectory before doing anything else. The `failure_layer` field tells you where to look.

## The four layers and what fixes each

**Memory write failure.** The agent called a tool, the tool succeeded, but the result wasn't written to memory (or was written with the wrong scope). Fix: check `seed_case_memory()` runs correctly, verify the scope matches the query scope.

**Retrieval / assembly failure.** The fact was in the cell store, but the assembler excluded it. Fix: check the cell's criticality, verify it wasn't superseded, check the `budget_tokens` setting. Increase criticality for important constraints. Check suppressed_cells in the decide() response.

**Policy failure.** The constraint was in context, but the agent violated it anyway and the stop condition didn't fire. Fix: add or tighten the stop condition. Check that the permission guard covers the violating tool. Increase the constraint's criticality to ensure it's unmissable in context.

**Model reasoning failure.** Data was present, constraint was in context, no stop condition should have fired — and the model still made the wrong call. This is the genuine model failure. Now you tune the prompt or switch models. Not before.

## Why prompt tuning fails when the problem is elsewhere

Prompts have a cost. Longer prompts mean more tokens per call. They also make context management harder — more to fit in the budget, more for the model to attend to.

When you tune the prompt to fix a memory assembly failure (adding "IMPORTANT: always remember constraint X" because the constraint kept getting dropped), you're paying a permanent token cost to paper over a policy bug. And it's fragile — add a longer case with more tool outputs and the constraint gets dropped again despite the "IMPORTANT" heading.

The prompt is for guiding the model's reasoning. It is not for compensating for infrastructure failures.

## Exercise: diagnose before you fix

Take the bad-run trajectory (`logs/case456.json` after `--bad-run`). Run `diagnose_failure()` on it. What layer does it report?

Now intentionally seed a constraint with `criticality: 0.1` and run the good planner. The agent should fail the `lookup_before_flag` check because the constraint never reached context. What layer does the diagnosis report now?

The same *behavioral* failure (wrong ordering) can arise from two different layers (model reasoning, policy enforcement). The fix is completely different in each case.

**Next →** [Long-Context Failure Modes](./16-long-context.md)
