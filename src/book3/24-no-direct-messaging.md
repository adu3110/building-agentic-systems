# 24. Why Direct Messaging Breaks

## The multi-agent antipattern

```python
agent_a.tell(agent_b, "I think account 456 is fine")
agent_b.tell(agent_a, "Flag it anyway")
# Who wins? Where was this logged? Can compliance replay it?
```

Direct agent-to-agent messages:

- Are hard to audit
- Race under parallel execution
- Hide implicit state
- Resemble human Slack, not systems design

## Shared state without a ledger

Shared Python dict:

```python
shared = {"account_456_status": "active"}  # both agents mutate
```

Works until two agents write concurrently. Last write wins. Debugging is nightmare fuel.

## The ledger model

Agents **only**:

1. Read current reconstructed state from ledger
2. Append one typed entry
3. Never mutate past entries

Coordination emerges from **ordered log**, not chat.

## When direct messaging is OK

- Research prototypes
- Single-user demos
- Low-stakes brainstorming sub-agents that don't commit actions

Not for regulated CaseBot production.

**Next →** [Append-Only Coordination Logs](./25-ledger.md)
