# 27. Replay and Checkpoints

## Replay = event sourcing for agents

```python
def replay(entries: list[LedgerEntry]) -> dict:
    state = {}
    for e in entries:
        if e.etype == EntryType.OBSERVATION:
            state.update(e.content)
        elif e.etype == EntryType.RESOLUTION:
            state[e.content["key"]] = e.content["value"]
        elif e.etype == EntryType.CHECKPOINT:
            state = dict(e.content["snapshot"])
    return state
```

Any past moment reconstructible by replaying up to sequence `N`.

## Checkpoints

Long ledgers slow replay. Periodic **CHECKPOINT** entries snapshot state:

```python
ledger.append(EntryType.CHECKPOINT, {"snapshot": state.copy()})
```

Replay from latest checkpoint forward — not from genesis every time.

## Debugging production incidents

1. Export ledger for case ID
2. `verify_chain()` — tamper check
3. Replay to step before wrong action
4. Inspect agent entries + memory at that seq

Faster than reading chat logs.

## Integration with Book 1 trajectories

Trajectory = single-agent step log.  
Ledger = multi-agent coordination log.

Export both linked by `case_id`.

**Next →** [Permissions and Sensitive Memory](./28-permissions.md)
