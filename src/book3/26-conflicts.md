# 23. Conflict Detection and Resolution

Two agents can look at the same case and reach different conclusions. That's not a bug — that's the system working. The bug is when the conflict is invisible.

In CaseBot's multi-agent extension: the `InvestigatorAgent` calls `getAccount` and concludes `risk_level: low`. The `PolicyAgent` checks the fraud engine API and writes `risk_level: high`. Both append their observations to the ledger. The ledger detects the contradiction.

## Detection

`agent-ledger`'s `detect_conflicts()` scans OBSERVATION entries for the same key with different values:

```python
def detect_conflicts(entries: list[LedgerEntry]) -> list[tuple[LedgerEntry, LedgerEntry]]:
    state: dict[str, LedgerEntry] = {}
    conflicts = []
    for e in entries:
        if e.etype != EntryType.OBSERVATION:
            continue
        key = e.content.get("key", "")
        if key in state and state[key].content.get("value") != e.content.get("value"):
            conflicts.append((state[key], e))
        state[key] = e
    return conflicts
```

Two `OBSERVATION` entries with the same key, different values → conflict pair.

## Resolution

A `ResolverAgent` appends a `RESOLUTION` entry:

```python
class ResolverAgent(Agent):
    def resolve(self, conflict: tuple[LedgerEntry, LedgerEntry]) -> LedgerEntry:
        a, b = conflict
        # Could call an LLM, check policy rules, or escalate to human
        reasoning = llm_call(
            f"Two agents disagree on '{a.content['key']}': "
            f"'{a.content['value']}' vs '{b.content['value']}'. Which is correct?"
        )
        self.ledger.append("ResolverAgent", EntryType.CONFLICT, {
            "key": a.content["key"],
            "agent_a": a.agent, "value_a": str(a.content["value"]),
            "agent_b": b.agent, "value_b": str(b.content["value"]),
        })
        return self.ledger.append("ResolverAgent", EntryType.RESOLUTION, {
            "resolution": reasoning,
        })
```

After resolution, `ledger.state()` includes the resolved value. Downstream agents read resolved state.

## No silent merging

I want to emphasize: **never average or silently merge conflicting facts.** For a risk score, `(low + high) / 2 = medium` is a compliance disaster — you obscured two contradictory assessments with a fabricated middle ground. Either resolve explicitly (which value and why) or escalate to a human.

## Run it

```bash
cd agent-ledger/python
OPENAI_API_KEY=sk-... python ledger.py
```

The demo introduces a deliberate conflict on `requires_migration` and shows the Resolver handling it. Inspect `LEDGER.md` to see the CONFLICT and RESOLUTION entries.

## Exercise

Modify `ledger.py` to introduce a conflict on `risk_level` with CaseBot values: `low` from InvestigatorAgent and `high` from PolicyAgent. Write a `resolve()` function that escalates to HITL (appends an ESCALATION entry instead of a RESOLUTION) when the key is `risk_level`. What entries does the ledger contain after this run?

**Companion:** [`agent-ledger/python/ledger.py`](https://github.com/adu3110/agent-ledger/blob/main/python/ledger.py)

**Next →** [Replay and Checkpoints](./27-replay.md)
