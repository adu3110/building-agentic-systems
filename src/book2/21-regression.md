# 2.9 Regression Suites

Agents regress silently. This is the thing I find teams underestimate most. Change the system prompt slightly — a new sentence added for clarity — and the planner starts returning steps in a different order. Upgrade the model from `gpt-4o-mini` to a newer version — recency sensitivity shifts and constraints at medium depth start getting missed. Tweak context assembly criticality thresholds — a different subset of facts enters context and a property check that was passing for three months quietly starts failing.

None of these changes feel dangerous when you make them. The regression only shows up in production.

The fix is property suites running on every change — not optional, not on a separate team.

## CI layout

```yaml
# .github/workflows/agent-regression.yml
name: Agent regression

on: [push, pull_request]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install deps
        run: pip install -e ./memcell-rl -e ./llm-evals-from-scratch

      - name: Start memcell-rl
        run: uvicorn memcell_rl.app:app --port 8000 &
             sleep 3

      - name: Run CaseBot smoke test
        run: python examples/casebot_regulated.py --dry-run --export /tmp/case456.json

      - name: Check properties
        run: python -c "
from examples.casebot_regulated import load_trajectory, PROPERTY_CHECKS
traj = load_trajectory('/tmp/case456.json')
failed = [(n, m) for n, fn in PROPERTY_CHECKS if not (ok := fn(traj))[0] for _, m in [ok]]
if failed:
    print('FAILED:', failed)
    exit(1)
print('All properties passed')
"
```

The dry-run needs no API key. CI runs in seconds.

## Smoke vs full suite

| Suite | Trigger | Duration | Scope |
|-------|---------|----------|-------|
| Smoke | Every PR | < 30s | Scripted planner, stub tools, 3–5 cases |
| Integration | Nightly | 2–5 min | Real LLM, subset of cases |
| Full benchmark | Release | 20–60 min | All cases, all models, long-context bench |

Start with smoke only. Expand when flakiness is controlled. Flaky CI is worse than no CI — teams learn to ignore it.

## Golden trajectories

For canonical tasks, store the expected trajectory structure and diff on PR:

```python
import json

def test_case_456_structure():
    # Run the dry-run and check trajectory shape
    traj = run_casebot_dryrun(task="Review account 456 for fraud")
    assert traj.tools_used() == ["getAccount", "getTransactions"]
    assert len(traj.steps) == 3
    assert not traj.outcome.startswith("ESCALATED")

def test_case_456_bad_run_escalates():
    traj = run_casebot_dryrun(task="...", bad_run=True)
    assert traj.outcome.startswith("ESCALATED")
    ok, msg = lookup_before_flag(traj)
    assert not ok, f"Expected failure but got: {msg}"
```

These tests are fast, exact, and document intended behavior. When they break, you know immediately which change caused it.

## One hard rule

**Every property that matters in production gets a regression test before you ship.**

If `lookup_before_flag` is a compliance requirement, it must be in CI. Not in a manual checklist. Not in a quarterly audit. In CI. Failing the build if it breaks.

## Exercise

Add a regression test that seeds memcell-rl with a constraint, runs `--dry-run`, and verifies the constraint appears in the trajectory's context (by checking `fetch_memcell_context` output). Commit this test. Now change the constraint criticality to 0.1 and see if the test catches the regression.

**Next →** [Production Readiness](./22-production.md)
