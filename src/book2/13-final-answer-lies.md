# 19. Why Final-Answer Accuracy Lies

Here's the failure mode that made me stop trusting accuracy as the primary metric for agent evaluation.

> **Note:** The numbers below (50 cases, 92% accuracy, 84% compliance) are **illustrative** — the pattern is real, but they come from a hypothetical evaluation run, not a bundled dataset you can reproduce exactly. CaseBot's runnable checks are the property functions in `casebot_regulated.py` and `evals/casebot.py`.

I was testing CaseBot on a dataset of 50 cases. The setup: each case gives the agent an account and asks it to review it for fraud indicators, then either close the case or flag the account. Outcome accuracy: 92%. 46 out of 50 cases returned the correct answer.

But when I looked at the trajectories for those 46 passing cases, I found eight where the agent had flagged the account *without calling `getAccount` first*. The flags happened to be correct — the LLM inferred from the task description that the account was suspicious. But the process was wrong. In a regulated workflow, you cannot flag an account based on inference. You must read the account data first. The flag was correct. The method was a compliance violation.

Accuracy: 92%. Compliance rate: 84%. The gap is what matters.

## What accuracy measures

Final-answer accuracy compares the agent's output to a reference:

```python
def accuracy(outcomes: list[str], expected: list[str]) -> float:
    correct = sum(
        1 for o, e in zip(outcomes, expected)
        if e.lower() in o.lower()
    )
    return correct / len(outcomes)
```

This checks the last line of the agent's output. It does not check anything about how the agent got there:

- Was the required lookup performed?
- Was the constraint present in context when the decision was made?
- Were destructive tools gated by the correct permissions?
- Did the agent loop or retry unnecessarily?
- Was PII properly handled?

For a search agent or a coding assistant, accuracy is usually sufficient. For a regulated case-resolution agent, it tells you nothing useful about compliance.

## The trajectory tells the truth

Let me show you exactly what the gap looks like:

```
Case 1: flagged account 456 — correct answer
  outcome_correct:        true  ✓
  lookup_before_flag:     true  ✓   ← agent called getAccount first
  bounded_steps:          true  ✓
  → ALL PASS

Case 2: flagged account 457 — correct answer
  outcome_correct:        true  ✓
  lookup_before_flag:     false ✗   ← flagged without reading account data
  bounded_steps:          true  ✓
  → FAIL on compliance property

Case 3: closed case 458 — correct answer
  outcome_correct:        true  ✓
  lookup_before_flag:     true  ✓
  bounded_steps:          false ✗   ← took 18 steps for a 3-step case
  → FAIL on efficiency property
```

Case 2 and Case 3 both count as "correct" under final-answer accuracy. Neither passes the compliance requirements. In production, Case 2 is a compliance incident. Case 3 is a cost incident (you paid for 15 extra LLM calls).

## Running the evaluation

```python
from evals.casebot import evaluate_casebot_file
import json

# Load and evaluate a trajectory file
result = evaluate_casebot_file("logs/case456.json")

print(f"All properties passed: {result['all_properties_passed']}")
for name, detail in result["property_results"].items():
    status = "PASS" if detail["passed"] else "FAIL"
    print(f"  {status}  {name}: {detail['message']}")
```

```bash
# Run and evaluate good run:
python3 examples/casebot_regulated.py --dry-run --export logs/case_good.json
python3 -c "
from evals.casebot import evaluate_casebot_file; import json
print(json.dumps(evaluate_casebot_file('logs/case_good.json'), indent=2))
"

# Run and evaluate bad run:
python3 examples/casebot_regulated.py --dry-run --bad-run --export logs/case_bad.json
python3 -c "
from evals.casebot import evaluate_casebot_file; import json
print(json.dumps(evaluate_casebot_file('logs/case_bad.json'), indent=2))
"
```

The good run: all PASS. The bad run: `lookup_before_flag` FAIL, `ends_with_answer_or_escalate` — depends on whether the escalation step is logged.

## Building a CaseBot evaluation suite

The property functions live in `evals/casebot.py`. Each one checks one thing:

```python
def lookup_before_flag(traj: Trajectory) -> tuple[bool, str]:
    """getAccount must appear before flagAccount in the tool call sequence."""
    tools = [s.action.get("tool") for s in traj.tool_calls]
    if "flagAccount" not in tools:
        return True, "no flag attempted"   # pass — no flag, nothing to check
    if "getAccount" not in tools:
        return False, "flagAccount without prior getAccount"
    ok = tools.index("getAccount") < tools.index("flagAccount")
    return ok, "ok" if ok else "wrong ordering"

def bounded_steps(traj: Trajectory, limit: int = 12) -> tuple[bool, str]:
    """Total step count must not exceed the configured limit."""
    n = len(traj.steps)
    return n <= limit, f"{n} steps (limit {limit})"

def no_duplicate_tool_calls(traj: Trajectory) -> tuple[bool, str]:
    """No (tool, args) pair appears twice."""
    sigs = [
        json.dumps({"tool": s.action.get("tool"), "args": s.action.get("args")}, sort_keys=True)
        for s in traj.tool_calls
    ]
    for sig in sigs:
        if sigs.count(sig) > 1:
            return False, f"duplicate: {sig}"
    return True, "ok"

def ends_with_answer_or_escalate(traj: Trajectory) -> tuple[bool, str]:
    """The final step must be an answer or escalation, not a dangling tool call."""
    if not traj.steps:
        return False, "empty trajectory"
    final = traj.steps[-1].action_type
    ok = final in (ActionType.RESPONSE, ActionType.ESCALATION)
    return ok, f"final: {final.value}"
```

The signature is fixed: `(Trajectory) -> (bool, str)`. Any function with this signature can be added to the suite. When you add a new compliance requirement, you write a new function.

## The release report I actually send

When evaluating a release candidate, the report includes both numbers:

```
CaseBot release candidate — evaluation report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dataset:  50 cases (illustrative)
Model:    gpt-4o-mini

Outcome accuracy:        92%
All properties passed:   84%

Property breakdown:
  lookup_before_flag:     88%   ← 6 cases missed getAccount
  bounded_steps:          96%
  no_duplicate_tool_calls: 98%
  ends_with_answer_or_escalate: 100%

Failure analysis (6 lookup_before_flag failures):
  5/6: account balance was in memory from a previous turn
       planner reasoned "I already have this data, no need to re-fetch"
  1/6: planner hallucinated tool call order

Fix: add episode cell expiry so previous-turn data doesn't leak into
     the current case; add explicit ordering instruction to planner prompt.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Release recommendation: HOLD — fix lookup_before_flag failures first
```

The failure analysis is the most valuable part. Five of the six failures had the same root cause: stale memory from a previous turn. That's a context scoping problem, not a model quality problem. You fix the memory policy, not the prompt.

## What this chapter is really saying

Evaluation drives what you optimize. If you measure outcome accuracy, you'll optimize outcome accuracy — and be surprised when compliance violations slip through. If you measure property pass rates, you'll optimize the properties that actually matter.

The tools exist. `evals/casebot.py` runs property checks on any trajectory file in under a second. `evals/run_evals.py --suite trajectory` runs the full harness. The friction is low. The cost of not measuring is high.

**Next →** [Trajectory Properties](./14-trajectory-properties.md)
