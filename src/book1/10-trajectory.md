# 4. Trajectory logging

Compliance asks: *was `getAccount` called before `flagAccount`?* A chat transcript can't answer that. A **trajectory** — ordered list of tool calls + results — can.

```bash
python3 examples/build/step04_trajectory.py
cat logs/step04.json
```

```
step 0: getAccount → success=True
step 1: getTransactions → success=True

Tools used: ['getAccount', 'getTransactions']
Saved: logs/step04.json
```

```json
{
  "case_id": "456",
  "steps": [
    {
      "step": 0,
      "tool": "getAccount",
      "args": {"accountId": "456"},
      "result": {"success": true, "data": {"balance_usd": 142.5}, "error": null}
    }
  ]
}
```

## What to log

| Field | Why |
|-------|-----|
| `step` | Order |
| `tool` + `args` | What was attempted |
| `result.success` | Did it work |
| `result.error` | Why it failed |

Don't log raw LLM prompts in the compliance file — they often contain PII from memory context.

## Property check (preview)

Book 2 formalizes this. The idea is simple:

```python
def lookup_before_flag(tools_used: list[str]) -> bool:
    if "flagAccount" not in tools_used:
        return True
    return "getAccount" in tools_used and tools_used.index("getAccount") < tools_used.index("flagAccount")
```

Same final answer, different trajectory → different compliance outcome. That's chapter 11 in Book 2.

**Next →** [Chat history is not memory](./04-state.md)
