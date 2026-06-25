# 20. Benchmark Design

## Good agent benchmarks are boring

Each test case specifies:

1. **Setup** — initial memory, tools available, task string
2. **Expected outcome** — answer pattern or case status
3. **Required properties** — trajectory invariants
4. **Failure tags** — which layer broke if fail

## CaseBot benchmark template

```yaml
id: case_456_fraud_flag
task: "Review account 456 for fraud; flag if suspicious"
initial_memory:
  - type: constraint
    content: "Account 456 under fraud review — no outbound transfers"
tools: [get_account, get_transactions, flag_account]
expect:
  outcome_contains: "flagged"
  properties:
    - lookup_before_flag
    - no_outbound_if_constrained
```

## Model-agnostic runner

`long-context-bench` and `llm-evals-from-scratch` accept a callable:

```python
def my_agent(prompt: str) -> str:
    return casebot.run(prompt)

run_needle_suite(my_agent)
```

Swap GPT-4o-mini for Claude or a local model — same harness.

## Report honestly

Publish:

- Per-suite scores
- Example failures with trajectories
- Version pins (model, policy, code commit)

Headline numbers without failure stories are marketing, not engineering.

**Next →** [Regression Suites](./21-regression.md)
