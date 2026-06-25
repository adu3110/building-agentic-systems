# 26. Conflict Detection and Resolution

## When agents disagree

Investigator writes:

```json
{"key": "risk_level", "value": "low"}
```

Policy agent writes:

```json
{"key": "risk_level", "value": "high"}
```

Same key, incompatible values → **CONFLICT** entry auto-raised.

## Detection

```python
def detect_conflicts(entries) -> list[Conflict]:
    state = {}
    conflicts = []
    for e in entries:
        if e.etype == EntryType.OBSERVATION:
            key = e.content.get("key")
            val = e.content.get("value")
            if key in state and state[key] != val:
                conflicts.append(Conflict(key, state[key], val, e.agent))
            state[key] = val
    return conflicts
```

## Resolution

A dedicated **Resolver** agent (or human) appends:

```
RESOLUTION — {"key": "risk_level", "value": "high", "reason": "policy override"}
```

Downstream agents read resolved state only.

## No silent merge

Never "average" conflicting facts. Explicit resolution or escalate.

## CaseBot example

Investigator: account normal.  
External fraud API tool: account flagged.  
→ CONFLICT → Resolver checks constraint cells → RESOLUTION → flag stands.

**Next →** [Replay and Checkpoints](./27-replay.md)
