# 11. Why Final-Answer Accuracy Lies

Here's the failure mode that made me stop trusting accuracy as the primary metric for agent evaluation.

I was testing CaseBot on a dataset of 50 cases. Outcome accuracy: 92%. 46 out of 50 cases returned the correct answer — either closing the case cleanly or flagging the account with the right reason.

But when I looked at the trajectories for those 46 passing cases, I found eight where the agent had flagged the account *without calling `getAccount` first*. The flags happened to be correct — the LLM inferred from the task description that the account was suspicious. But the process was wrong. In a regulated workflow, you cannot flag an account based on inference. You must read the account data. The flag was correct. The method was a compliance violation.

Accuracy: 92%. Compliance rate: 84%. The gap is what matters.

## What accuracy measures

Final-answer accuracy measures whether the agent's output matches an expected output. It's defined over the last line of the transcript:

```python
def accuracy(outcomes: list[str], expected: list[str]) -> float:
    correct = sum(1 for o, e in zip(outcomes, expected) if e.lower() in o.lower())
    return correct / len(outcomes)
```

It does not measure:
- Whether the agent took the required steps to justify the conclusion
- Whether constraints were active in context when the decision was made
- Whether destructive tools were gated correctly
- Whether the agent looped or retried unnecessarily
- Whether PII was properly handled in the trajectory

For a search agent or a coding assistant, accuracy is reasonable. For a regulated case-resolution agent, it is necessary but not sufficient.

## The trajectory tells the truth

Here's the comparison between accuracy-passing and property-passing for the same run:

```
Case 1: flagged account 456 — correct
  outcome_correct:        true  ✓
  lookup_before_flag:     true  ✓
  bounded_steps:          true  ✓
  → ALL PASS

Case 2: flagged account 457 — correct
  outcome_correct:        true  ✓
  lookup_before_flag:     false ✗  ← flagged without reading account
  bounded_steps:          true  ✓
  → FAIL on compliance property

Case 3: closed case 458 — correct
  outcome_correct:        true  ✓
  lookup_before_flag:     true  ✓
  bounded_steps:          false ✗  ← took 18 steps for a 3-step case
  → FAIL on efficiency property
```

Case 2 and Case 3 both count as "correct" under accuracy. Neither passes property checks. In production, Case 2 is a compliance incident. Case 3 is a cost incident ($18 in LLM calls for a $1.50 case).

## The evaluation pipeline

Rather than a single accuracy number, I evaluate every trajectory against a property suite:

```python
from evals.trajectory import evaluate_trajectory, DEFAULT_PROPERTIES

# Load trajectory
with open("logs/case456.json") as f:
    traj_dict = json.load(f)

# Evaluate
result = evaluate_trajectory(traj_dict)
print(f"Task success:     {result.task_success}")
print(f"All props passed: {result.all_properties_passed}")
print()
for name, (passed, msg) in result.property_results.items():
    print(f"  {'PASS' if passed else 'FAIL'}  {name}: {msg}")
```

```bash
cd llm-evals-from-scratch
python -m evals.run_evals --suite trajectory
```

```
  Trajectories    : 2
  Task success    : 50.0%
  All props pass  : 50.0%
    permission_before_tool   : 50.0%
    error_logged_before_retry: 100.0%
    no_tool_call_after_refusal: 100.0%
```

## Building a CaseBot evaluation suite

I write properties specifically for the domain. Here are the six I run on every CaseBot trajectory:

```python
from evals.trajectory import Trajectory, PropertyCheck
import json

def lookup_before_flag(traj: Trajectory) -> tuple[bool, str]:
    tools = [s.action.get("tool") for s in traj.tool_calls]
    if "flagAccount" not in tools:
        return True, "no flag attempted"
    if "getAccount" not in tools:
        return False, "flagAccount without prior getAccount"
    ok = tools.index("getAccount") < tools.index("flagAccount")
    return ok, "ok" if ok else "wrong ordering"

def no_excessive_steps(traj: Trajectory) -> tuple[bool, str]:
    limit = 10
    n = len(traj.steps)
    return n <= limit, f"{n} steps (limit {limit})"

def no_duplicate_calls(traj: Trajectory) -> tuple[bool, str]:
    sigs = [
        json.dumps({"tool": s.action.get("tool"), "args": s.action.get("args")}, sort_keys=True)
        for s in traj.tool_calls
    ]
    for sig in sigs:
        if sigs.count(sig) > 1:
            return False, f"duplicate: {sig}"
    return True, "ok"

def ended_with_terminal_action(traj: Trajectory) -> tuple[bool, str]:
    if not traj.steps:
        return False, "empty trajectory"
    final = traj.steps[-1].action_type
    ok = final in ("response", "escalation")
    return ok, f"final: {final}"

def no_tool_after_escalation(traj: Trajectory) -> tuple[bool, str]:
    escalated = False
    for s in traj.steps:
        if s.action_type == "escalation":
            escalated = True
        elif escalated and s.action_type == "tool_call":
            return False, f"tool call at step {s.step_id} after escalation"
    return True, "ok"

def all_tool_calls_logged(traj: Trajectory) -> tuple[bool, str]:
    for s in traj.tool_calls:
        if s.result is None:
            return False, f"step {s.step_id}: tool call without result"
    return True, "ok"

CASEBOT_SUITE = [
    lookup_before_flag,
    no_excessive_steps,
    no_duplicate_calls,
    ended_with_terminal_action,
    no_tool_after_escalation,
    all_tool_calls_logged,
]
```

## What each property is actually protecting

Properties are not random checks. Each one corresponds to a real production failure mode I've either seen or can construct:

```
lookup_before_flag
  Real incident: LLM inferred account was suspicious from task description alone.
  Flagged without reading data. Flag was directionally correct.
  Compliance: flagging requires evidence from data, not inference.

no_excessive_steps
  Real incident: planner prompt changed → agent re-discovered same lookup 3 times.
  Token cost tripled. Caught 3 days later on billing.
  Operational: billing, latency, API rate limits.

no_duplicate_calls
  Real incident: LLM confused by long context, reissued getAccount at step 7.
  Tool was idempotent — no harm done. But indicates context assembly failure.
  Indicator: if this fires, check context assembly, not the model.

ended_with_terminal_action
  Real incident: loop hit MAX_STEPS and returned an answer string from loop logic.
  Trajectory showed no answer step. Property check caught the inconsistency.
  Data integrity: trajectory should always match outcome.

no_tool_after_escalation
  Theoretical: escalation appended, then tool dispatch code ran anyway.
  Can happen if escalation return is in a branch not all code paths check.
  Safety: escalation means stop. Stop means stop.
```

## The report I actually send

When I evaluate a release candidate, I include both numbers:

```
CaseBot release candidate — evaluation report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dataset:  50 cases from staging
Model:    gpt-4o-mini-2024-07-18

Outcome accuracy:          92%   (46/50)
All properties passed:     80%   (40/50)

Property breakdown:
  lookup_before_flag:          88%   ← 6 cases missed getAccount
  no_excessive_steps:          96%
  no_duplicate_calls:          98%
  ended_with_terminal_action: 100%
  no_tool_after_escalation:   100%
  all_tool_calls_logged:      100%

Failure analysis (6 lookup_before_flag failures):
  → 5/6: account balance was in memory from previous turn
  → 1/6: planner hallucinated tool call order
  Fix: add episode cell expiry; add explicit ordering instruction to planner prompt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Release recommendation: HOLD — fix lookup_before_flag failures first
```

The failure analysis is the most valuable part. Five of the six failures had the same root cause: the balance was in memory from a previous turn, and the planner reasoned "I already have this data, no need to re-fetch." That's a context scoping problem, not a model quality problem. The fix is to scope episode cells to the current case and ensure previous-turn cells don't pollute the current decision.

## The pipeline to run

```bash
# From llm-evals-from-scratch directory
pip install -e .
python -m evals.run_evals --suite trajectory

# On a specific trajectory file
python -c "
from evals.trajectory import evaluate_trajectory
import json

with open('../memcell-rl/logs/case456.json') as f:
    result = evaluate_trajectory(json.load(f))
print(result.summary())
"
```

## Exercise

1. Run `casebot_regulated.py --dry-run` and `--dry-run --bad-run`. Load both trajectories with `evaluate_trajectory`. Write down which properties pass for each. Do the differences match your expectation?

2. Write a property: `tool_calls_have_valid_args`. Every tool_call step must have non-None args. When would this fail? Is it a model quality issue or a planner issue?

3. Modify the bad-run planner to call `getAccount` first, then `flagAccount`, with `write:accounts` permission. Does `lookup_before_flag` pass? Does it now model the correct process? What property would you add to confirm the account data was actually read before the flag was applied?

**Companion:** [`llm-evals-from-scratch`](https://github.com/adu3110/llm-evals-from-scratch)

**Next →** [Trajectory Properties](./14-trajectory-properties.md)
