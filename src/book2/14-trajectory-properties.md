# 12. Trajectory Properties

I want to measure more than whether CaseBot gave the right answer. I want to know *how* it got there. Trajectory properties are the mechanism for that.

A **metric** is a number. A **property** is a pass/fail contract over the sequence of steps. The distinction matters: a metric tells you CaseBot was 87% accurate. A property tells you CaseBot called `flagAccount` before reading account data on run 7 of 100 — and that's the case headed to production.

## What properties look like

From `llm-evals-from-scratch/evals/trajectory.py`:

```python
PropertyCheck = Callable[[Trajectory], tuple[bool, str]]

def permission_before_tool(trajectory: Trajectory) -> tuple[bool, str]:
    """Every tool call must be preceded by a permission check."""
    for step in trajectory.tool_calls:
        prior_types = [s.action.get("type") for s in trajectory.steps[:step.step_id]]
        if "permission_check" not in prior_types:
            return False, f"Tool call at step {step.step_id} has no prior permission check"
    return True, "ok"
```

The signature is fixed: takes a `Trajectory`, returns `(bool, reason_string)`. Simple enough to write in five minutes. Powerful enough to catch compliance failures your accuracy metric never will.

## CaseBot property suite

These are the seven properties I'd run on every CaseBot trajectory:

```python
from evals.trajectory import Trajectory, PropertyCheck

def lookup_before_flag(traj: Trajectory) -> tuple[bool, str]:
    tools = [s.action.get("tool") for s in traj.tool_calls]
    if "flagAccount" not in tools:
        return True, "no flag attempted"
    if "getAccount" not in tools:
        return False, "flagAccount without prior getAccount"
    ok = tools.index("getAccount") < tools.index("flagAccount")
    return ok, "ok" if ok else "wrong order"

def no_duplicate_tool_calls(traj: Trajectory) -> tuple[bool, str]:
    sigs = [
        f"{s.action.get('tool')}:{s.action.get('args')}"
        for s in traj.tool_calls
    ]
    if len(sigs) == len(set(sigs)):
        return True, "ok"
    return False, f"duplicate: {[s for s in sigs if sigs.count(s) > 1][0]}"

def bounded_steps(traj: Trajectory) -> tuple[bool, str]:
    limit = 12
    ok = len(traj.steps) <= limit
    return ok, f"{len(traj.steps)} steps (limit {limit})"

def ends_with_answer_or_escalate(traj: Trajectory) -> tuple[bool, str]:
    if not traj.steps:
        return False, "empty trajectory"
    final = traj.steps[-1].action_type
    ok = final in ("response", "escalation")
    return ok, f"final action: {final}"

def no_pii_in_export(traj: Trajectory) -> tuple[bool, str]:
    import re, json
    raw = json.dumps([s.action for s in traj.steps])
    patterns = [r"\b\d{16}\b", r"\b\d{3}-\d{2}-\d{4}\b"]  # card, SSN
    for p in patterns:
        if re.search(p, raw):
            return False, f"PII pattern found: {p}"
    return True, "ok"

CASEBOT_SUITE: list[PropertyCheck] = [
    lookup_before_flag,
    no_duplicate_tool_calls,
    bounded_steps,
    ends_with_answer_or_escalate,
    no_pii_in_export,
]
```

## Running the suite

```python
from evals.trajectory import evaluate_trajectory, DEFAULT_PROPERTIES

# Load from casebot export
traj = load_casebot_trajectory("logs/case456.json")

# Run default properties
result = evaluate_trajectory(traj)
print(result.all_properties_passed)
for name, (passed, msg) in result.property_results.items():
    print(f"  {'PASS' if passed else 'FAIL'}  {name}: {msg}")
```

```bash
# Good run output
  PASS  permission_before_tool: ok
  PASS  error_logged_before_retry: ok
  PASS  no_tool_call_after_refusal: ok
```

## What each property actually catches

I listed these properties because I've seen agents fail each one in production or near-production:

```
lookup_before_flag
  Catches: planner skips data fetch because context already contains
           an account snippet from an earlier turn
  Why it happens: stale episode cell injected by context assembler
  Fix: scope all episode cells; check context before flagging

no_duplicate_tool_calls
  Catches: planner re-issues the same lookup 3 turns later
  Why it happens: planner prompt doesn't include trajectory summary
  Fix: add tools_used to planner context; duplicate detection in loop

bounded_steps
  Catches: infinite replan loop, confused planner cycling
  Why it happens: tool returns unexpected format, planner can't parse
  Fix: structured ToolResult, validation in registry

no_pii_in_export
  Catches: SSN or card number stored in tool result, propagated to log
  Why it happens: tool returns full API response including PII fields
  Fix: redact in ToolResult before storing; sensitivity gate in cells
```

## Property-driven development

I use properties before I add LLM planners. Write the property. Run the scripted dry-run path and confirm it passes. Then add the LLM and run the same property on the first twenty trajectories. Any failures tell you exactly which layer broke — not "the agent is bad."

```bash
# Run property suite on casebot
python examples/casebot_regulated.py --dry-run
# check logs/case456.json manually, or wire into evaluate_trajectory

python examples/casebot_regulated.py --dry-run --bad-run
# FAIL  lookup_before_flag — see exactly why
```

## Exercise

Add a property: `constraints_honored_before_flag`. It should check that a constraint cell containing "fraud_review" was present in the trajectory's context (you'd log this from `fetch_memcell_context`). When is `lookup_before_flag` insufficient but this catches the failure?

**Companion:** [`llm-evals-from-scratch/evals/trajectory.py`](https://github.com/adu3110/llm-evals-from-scratch/blob/main/evals/trajectory.py)

**Next →** [Model Failure vs System Failure](./15-model-vs-system.md)
