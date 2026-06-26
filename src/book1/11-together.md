# 10. Putting it together — CaseBot

Steps 1–9 were slices. Step 10 is the full system — everything in one file.

```bash
# terminal 1
uvicorn memcell_rl.app:app --port 8000

# terminal 2
python3 examples/casebot_regulated.py --dry-run
python3 examples/casebot_regulated.py --dry-run --bad-run
```

**Good run:**

```
[memcell] context loaded (85 chars)
Outcome: Account 456 reviewed. Balance $142.50. ...
Tools:   ['getAccount', 'getTransactions']
Steps:   3
  PASS  lookup_before_flag
  PASS  bounded_steps
Saved:   logs/case456.json
```

**Bad run:**

```
Outcome: ESCALATED:tool_error:permission_denied: write:accounts required
  FAIL  lookup_before_flag: flagAccount without prior getAccount
```

Two failures at once: permission (registry) and process (flag without lookup). Fixing one doesn't fix the other.

## Map steps → CaseBot

| Build step | CaseBot module |
|------------|----------------|
| step02 loop | `AgentLoop.run()` |
| step03 tools | `ToolRegistry` |
| step04 trajectory | `Trajectory.save()` |
| step05–06 memory | `seed_case_memory()`, memcell-rl |
| step07 context | `fetch_memcell_context()` |
| step08 planner | `good_run_planner` / `bad_run_planner` |
| step09 stops | duplicate check, max steps, permissions |

~350 lines total. You built each piece already.

## Before Book 2

Verify:

```bash
python3 examples/casebot_regulated.py --dry-run          # exit 0, both PASS
python3 examples/casebot_regulated.py --dry-run --bad-run  # exit 1, lookup FAIL
cat logs/case456.json
```

Book 2 asks: **how do you know this keeps working after you change the prompt, model, or memory policy?** Property suites, failure taxonomy, regression CI — same CaseBot, stronger measurement.

**Book 1 complete.** → [Why Final-Answer Accuracy Lies](../book2/13-final-answer-lies.md)
