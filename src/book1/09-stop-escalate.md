# 9. Stop conditions and escalation

An agent that never stops burns tokens. An agent that stops silently is worse. Every exit must be named and logged.

```bash
python3 examples/build/step09_stops.py
```

```
step 0: getAccount → ok
step 1: ESCALATED:duplicate_tool_call
```

Change the script to call `flagAccount` once (with `write:accounts` permission):

```
step 0: flagAccount → ESCALATED:tool_error:permission_denied: write:accounts required
```

Two different stops. Same mechanism: check before continuing.

## Three stops CaseBot uses

**Duplicate call** — hash `(tool, args)`, reject repeat:

```python
sig = json.dumps({"tool": tool, "args": args}, sort_keys=True)
if sig in seen:
    return "ESCALATED:duplicate_tool_call"
```

**Tool error** — `ToolResult.success == False` → escalate, don't continue:

```python
if not result.success:
    return f"ESCALATED:tool_error:{result.error}"
```

**Max steps** — hard ceiling:

```python
for step in range(MAX_STEPS):
    ...
return "ESCALATED:max_steps_exceeded"
```

## Escalation is success

`ESCALATED:approval_required` is the system working — handing off to a human. Not a crash.

Route by prefix:

- `approval_required` → supervisor queue
- `duplicate_tool_call` → engineering alert
- `tool_error` → ops

## Prevention vs detection

Stop conditions **prevent** bad actions during the loop. Property checks (Book 2) **detect** them after. Use both. Chapter 9 in the full CaseBot also blocks destructive tools without `write:accounts` in the registry.

**Next →** [Putting it together — CaseBot](./11-together.md)
