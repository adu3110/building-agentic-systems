# 21. Regression Suites

## Agents regress silently

Change the planner prompt → tool order breaks.  
Upgrade the model → recency sensitivity shifts.  
Tweak context assembly → constraints drop.

**Fix:** run property suites on every change.

## CI layout

```yaml
# .github/workflows/agent-regression.yml
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -e ./stateful-agent-lab -e ./llm-evals-from-scratch
      - run: python agent/agent.py --task "smoke test" --export /tmp/traj.json
      - run: llmevals --trajectory /tmp/traj.json --expect-all-properties
```

## Smoke vs full

| Suite | When | Duration |
|-------|------|----------|
| Smoke | Every PR | < 30s, stub tools |
| Integration | Nightly | Real APIs, subset |
| Full benchmark | Release | All cases, all models |

Start smoke-only. Expand as flakiness is controlled.

## Golden trajectories

Store expected trajectory JSON for canonical tasks. Diff on PR:

```python
def test_trajectory_structure():
    run = casebot.run(TASK_456)
    assert property_lookup_before_flag(run.trajectory)
    assert run.step_count <= 10
```

**Next →** [Production Readiness](./22-production.md)
