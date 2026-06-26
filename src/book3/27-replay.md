# 24. Replay and Checkpoints

An append-only ledger gives you something that most agent systems don't have: the ability to reconstruct exactly what any agent knew at any point in the case's history.

This is not a nice-to-have. In regulated financial services, the question "what did the system know when it flagged this account?" has a legal answer. Replay is how you compute it.

## Replaying to a given state

The ledger's `state()` method replays all entries from genesis to reconstruct current state. To get the state at sequence `N`:

```python
from agent_ledger import AgentLedger, EntryType

ledger = AgentLedger("LEDGER.md")

def state_at_seq(n: int) -> dict:
    state = {}
    for entry in ledger.entries:
        if entry.seq > n:
            break
        if entry.etype == EntryType.OBSERVATION:
            state.update({entry.content["key"]: entry.content["value"]})
        elif entry.etype == EntryType.RESOLUTION:
            # Resolved value overwrites observation
            res = entry.content.get("resolution", "")
            state["_last_resolution"] = res
        elif entry.etype == EntryType.CHECKPOINT:
            state = dict(entry.content.get("snapshot", {}))
    return state
```

Replay to `seq=7`. Compare it to `seq=12`. The difference tells you exactly what changed between those two moments.

## Checkpoints

For long cases (50+ entries), replaying from genesis every time is slow. Checkpoints snapshot state at a known point:

```python
def checkpoint(ledger: AgentLedger, agent_name: str) -> None:
    current = ledger.state()
    ledger.append(agent_name, EntryType.CHECKPOINT, {"snapshot": current})
```

Replay starts from the latest CHECKPOINT entry, not from entry 0. The full history is still there for audit — you just don't re-process it on every read.

## Debugging production incidents

When a production case goes wrong:

```python
# 1. Get the ledger for the case
ledger = AgentLedger(f"cases/{case_id}/LEDGER.md")

# 2. Tamper check
chain_ok, err = ledger.verify_chain()
if not chain_ok:
    print(f"INTEGRITY FAILURE: {err}")  # ledger was altered

# 3. Find the step before the wrong action
wrong_seq = int(input("Sequence number of wrong action: "))
state_before = state_at_seq(wrong_seq - 1)

# 4. Inspect what each agent saw
print("State before wrong action:")
for k, v in state_before.items():
    print(f"  {k}: {v}")
```

This is faster and more exact than reading logs. Logs tell you what happened. The ledger tells you what state each agent operated on.

## Linking trajectories and ledgers

Each Book 1 trajectory is a single-agent step log. Each Book 3 ledger is a multi-agent coordination log. They're linked by `case_id`:

```python
# Single agent produces
trajectory = Trajectory(case_id="456", task=task)

# Multi-agent coordination recorded in
ledger = AgentLedger(f"cases/456/LEDGER.md")
```

For a full audit: combine the trajectory export from each agent with the ledger for the case. You have every decision, every observation, and the coordination log that ties them together.

## Exercise

Run the `agent-ledger` demo and generate 15+ entries. Manually insert a CHECKPOINT at entry 8. Replay from the CHECKPOINT and confirm the state matches a full replay to the same point. Check `verify_chain()` — does it pass?

**Companion:** [`agent-ledger`](https://github.com/adu3110/agent-ledger)

**Next →** [Permissions and Sensitive Memory](./28-permissions.md)
