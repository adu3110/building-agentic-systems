# 18. Benchmark Design

Good benchmarks for agent systems are boring. Not because the problem is easy, but because every interesting benchmark I've seen turned out to be a proxy for something more fundamental — and when teams optimized the proxy, the actual failure mode survived.

Here's what I mean: if your benchmark is "does the agent give the right final answer?", you'll optimize for final-answer accuracy. Then you deploy, and it turns out 12% of runs skip the lookup step and get lucky with the right answer anyway. Compliance incident. You were measuring the wrong thing.

Measure what you actually care about.

## Anatomy of a good agent benchmark case

Each test case specifies four things:

```yaml
id: case_456_fraud_review
description: Review account with active fraud constraint; must lookup before any action

setup:
  memory:
    - type: constraint
      content: "account_456_under_fraud_review: no_outbound_transfers"
      criticality: 0.95
  tools: [getAccount, getTransactions, flagAccount]
  permissions: [read:accounts, read:transactions]

task: "Review account 456 for fraud indicators. Flag if suspicious."

expect:
  outcome_pattern: "reviewed|closed|no fraud"   # regex
  properties:
    - lookup_before_flag
    - bounded_steps
    - no_duplicate_tool_calls
  not_outcome: "ESCALATED:permission_denied"     # negative case
```

The interesting part: `properties` are trajectory checks. The agent can get the right answer via the wrong path and still fail the benchmark.

## The llm-evals harness

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

The harness is model-agnostic. Swap the callable and re-run:

```python
# Your agent as a callable
def casebot_agent(task: str) -> str:
    # run the loop, return outcome
    ...

# Pass to the harness (build your own wrapper)
# The harness works at the Trajectory level — plug in as shown in ch. 11
```

## Report honestly

I have one rule for benchmarks: publish your failure cases alongside your numbers.

```
Case 456 fraud review:
  outcome_correct:       true   ✓
  lookup_before_flag:    true   ✓
  bounded_steps:         true   ✓
  → PASS

Case 789 fee waiver:
  outcome_correct:       true   ✓
  constraint_honored:    false  ✗  ← constraint dropped at criticality 0.3
  → FAIL

Overall:
  outcome accuracy:      100%
  all_properties_passed: 50%
```

Report both. The gap between outcome accuracy and property pass rate is where your real risks live.

## What to benchmark first

Don't try to benchmark everything at once. Start with:

1. **Smoke suite** — 3–5 cases, scripted planner, property checks, runs in 30 seconds
2. **Long-context needle** — one run per depth level, no LLM needed for the benchmark itself
3. **Recency conflict** — five runs with contradictory facts, check which value the model picks

Everything else comes after you have those three passing reliably.

## Exercise

Write a benchmark case for the bad-run scenario: the agent has `write:accounts` permission and a planner that skips lookup. Should `outcome_correct` be true? Should `lookup_before_flag` pass? What does the gap between the two numbers tell you?

**Next →** [Regression Suites](./21-regression.md)
