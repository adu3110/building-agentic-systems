# 22. Append-Only Coordination Logs

Book 1 was one agent, one case. Book 3 is multiple agents on the same case — or on related cases running in parallel. The first question is: how do they share state?

The wrong answer, which most teams reach for first: a shared dict or direct agent-to-agent messages. Chapter 21 explains why those break. The right answer is an append-only, hash-chained log that all agents can read and any agent can write to (within their permissions). That log is the ledger.

## What a ledger gives you

An append-only ledger with typed entries provides four things that matter for regulated systems:

**Ordering** — every entry has a sequence number. You can always reconstruct what each agent knew at any point, by replaying entries up to that sequence.

**Attribution** — every entry has an `agent` field. You know who wrote what.

**Conflict detection** — when two agents disagree about the same fact, the ledger detects the contradiction automatically.

**Tamper evidence** — a SHA-256 hash chain means you can detect if any historical entry was modified. `verify_chain()` returns `False` if the ledger was altered after the fact.

```mermaid
flowchart LR
  A1[InvestigatorAgent] --> L[(LEDGER.md\nhash-chained\nappend-only)]
  A2[PolicyAgent] --> L
  A3[ResolverAgent] --> L
  L --> A1
  L --> A2
  L --> A3
  L --> S[(Immutable\narchive)]
```

## The data structure

From `agent-ledger/python/ledger.py`:

```python
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
import hashlib, json, time

class EntryType(str, Enum):
    PLAN        = "PLAN"         # task assignment
    TOOL_CALL   = "TOOL_CALL"    # agent called an external tool
    OBSERVATION = "OBSERVATION"  # agent wrote a fact to shared state
    CONFLICT    = "CONFLICT"     # ledger detected contradiction
    RESOLUTION  = "RESOLUTION"   # resolver resolved conflict
    ESCALATE    = "ESCALATE"     # requires human action
    HUMAN_APPROVAL = "HUMAN_APPROVAL"  # human approved/rejected
    CHECKPOINT  = "CHECKPOINT"   # snapshot for fast replay
    ANSWER      = "ANSWER"       # final case resolution

@dataclass
class LedgerEntry:
    seq: int               # 0-indexed sequence
    agent: str             # who wrote this
    etype: EntryType       # what kind of entry
    content: dict[str, Any]
    prev_hash: str         # SHA-256 of previous entry's hash
    entry_hash: str        # SHA-256 of this entry's content + prev_hash
    ts: str                # ISO 8601

class AgentLedger:
    def __init__(self, path: str):
        self.path = path
        self.entries: list[LedgerEntry] = []
        self._load()

    def append(
        self,
        agent: str,
        etype: EntryType,
        content: dict,
    ) -> LedgerEntry:
        seq = len(self.entries)
        prev_hash = self.entries[-1].entry_hash if self.entries else "0" * 64

        # Compute this entry's hash
        raw = json.dumps({
            "seq": seq, "agent": agent, "etype": etype.value,
            "content": content, "prev_hash": prev_hash,
        }, sort_keys=True)
        entry_hash = hashlib.sha256(raw.encode()).hexdigest()

        entry = LedgerEntry(
            seq=seq, agent=agent, etype=etype, content=content,
            prev_hash=prev_hash, entry_hash=entry_hash,
            ts=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )
        self.entries.append(entry)
        self._persist(entry)
        return entry

    def verify_chain(self) -> tuple[bool, str]:
        for i, entry in enumerate(self.entries):
            expected_prev = self.entries[i-1].entry_hash if i > 0 else "0" * 64
            if entry.prev_hash != expected_prev:
                return False, f"chain broken at seq {i}"
            raw = json.dumps({
                "seq": entry.seq, "agent": entry.agent,
                "etype": entry.etype, "content": entry.content,
                "prev_hash": entry.prev_hash,
            }, sort_keys=True)
            if hashlib.sha256(raw.encode()).hexdigest() != entry.entry_hash:
                return False, f"hash mismatch at seq {i}"
        return True, "ok"
```

The hash chain is the tamper-evidence mechanism. Each entry's hash includes the previous entry's hash. If you modify entry 3, entry 4's `prev_hash` no longer matches entry 3's `entry_hash`. `verify_chain()` detects it in O(n) time.

## What the LEDGER.md file looks like

The ledger persists as a Markdown file with one JSON block per entry:

```markdown
<!-- seq=0 agent=InvestigatorAgent etype=PLAN ts=2026-01-15T14:30:00Z -->
```json
{"assignments": [{"agent": "InvestigatorAgent", "task": "gather_account_data"}]}
```
<!-- hash=a3f8b2... prev=000000... -->

<!-- seq=1 agent=InvestigatorAgent etype=TOOL_CALL ts=2026-01-15T14:30:01Z -->
```json
{"tool": "getAccount", "args": {"accountId": "456"}, "result": {"balance": 142.50}}
```
<!-- hash=7c9d1f... prev=a3f8b2... -->

<!-- seq=2 agent=InvestigatorAgent etype=OBSERVATION ts=2026-01-15T14:30:02Z -->
```json
{"key": "account_status", "value": "active"}
```
<!-- hash=2b4e8a... prev=7c9d1f... -->
```

Human-readable. Machine-parseable. Each entry's position in the file corresponds to its sequence number.

## Running it

```bash
cd agent-ledger/python
pip install -e .
OPENAI_API_KEY=sk-... python ledger.py
```

The demo runs two agents (Investigator and PolicyAgent) against a shared ledger, introduces a deliberate OBSERVATION conflict, and shows the Resolver handling it:

```
[seq=0] InvestigatorAgent: PLAN
[seq=1] InvestigatorAgent: TOOL_CALL getAccount
[seq=2] InvestigatorAgent: OBSERVATION requires_migration=False
[seq=3] PolicyAgent: OBSERVATION requires_migration=True    ← conflict!
[seq=4] InvestigatorAgent: CONFLICT on key requires_migration
[seq=5] ResolverAgent: RESOLUTION → requires_migration=True (policy override)
[seq=6] InvestigatorAgent: ANSWER → migration required, escalating

Chain valid: True
```

After the run, open `LEDGER.md`. Every entry is visible. Every entry is linked to the one before it via the hash chain.

## State reconstruction

The ledger's `state()` method replays all entries to compute current state:

```python
def state(self) -> dict:
    s = {}
    for e in self.entries:
        if e.etype == EntryType.OBSERVATION:
            s[e.content.get("key", "")] = e.content.get("value")
        elif e.etype == EntryType.RESOLUTION:
            # Resolved value from conflict
            key = e.content.get("key")
            val = e.content.get("resolved_value")
            if key:
                s[key] = val
        elif e.etype == EntryType.CHECKPOINT:
            s = dict(e.content.get("snapshot", {}))
    return s
```

Any agent can call `ledger.state()` to read current state. No agent can modify past entries. This is exactly the contract you want for regulated coordination.

## Why the ledger beats shared dicts

```
Shared mutable dict:
  agent_a["risk"] = "low"
  agent_b["risk"] = "high"   ← last write wins, no history
  # who wrote "high"? when? what did agent_a think it was overwriting?

Append-only ledger:
  seq=2  InvestigatorAgent: OBSERVATION risk=low    (14:32:01)
  seq=3  PolicyAgent:       OBSERVATION risk=high   (14:32:03)
  seq=4  Resolver:          CONFLICT on key risk
  seq=5  Resolver:          RESOLUTION risk=high (policy override, fraud_engine_v2)
  # complete history, attribution, conflict resolution, audit trail
```

The dict approach loses information. The ledger accumulates it.

## Linking to Book 1 trajectories

Each Book 1 trajectory is a single-agent step log. Each ledger is a multi-agent coordination log. They're linked by `case_id`:

```python
# Single agent (Book 1)
trajectory = Trajectory(case_id="456", task=task)
# logs to logs/case456.json

# Multi-agent coordination (Book 3)
ledger = AgentLedger("cases/456/LEDGER.md")
# each agent's tool calls + observations logged here
```

For a complete audit of case 456: combine the per-agent `Trajectory` exports with the shared `LEDGER.md`. The trajectory shows what each agent did step by step. The ledger shows how they coordinated.

## Exercise

1. Run the agent-ledger demo. Inspect `LEDGER.md`. Count the entries. Verify the hash chain manually: compute `sha256(entry_0)` and confirm it matches `prev_hash` in entry 1.

2. Manually edit one character in `LEDGER.md` (in the content of seq=2). Run `verify_chain()`. Does it detect the modification? At which sequence?

3. Add a fourth agent: `AuditAgent`. It should run after the Resolver and append a summary OBSERVATION: `{"key": "audit_complete", "value": True}`. Check that `ledger.state()["audit_complete"] == True` after the run.

**Companion:** [`agent-ledger/python/ledger.py`](https://github.com/adu3110/agent-ledger/blob/main/python/ledger.py)

**Next →** [Conflict Detection and Resolution](./26-conflicts.md)
