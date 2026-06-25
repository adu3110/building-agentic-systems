# 25. Append-Only Coordination Logs

## Ledger entries

From `agent-ledger`:

```python
class EntryType(str, Enum):
    PLAN        = "PLAN"
    TOOL_CALL   = "TOOL_CALL"
    OBSERVATION = "OBSERVATION"
    CONFLICT    = "CONFLICT"
    RESOLUTION  = "RESOLUTION"
    CHECKPOINT  = "CHECKPOINT"
    ANSWER      = "ANSWER"
```

Each entry:

```python
@dataclass
class LedgerEntry:
    seq: int
    timestamp: str
    agent: str
    etype: EntryType
    content: dict
    prev_hash: str
    hash: str
```

## Hash chain

```python
def compute_hash(seq, prev_hash, content) -> str:
    payload = f"{seq}|{prev_hash}|{json.dumps(content, sort_keys=True)}"
    return hashlib.sha256(payload.encode()).hexdigest()[:16]
```

Tamper any entry → `verify_chain()` fails. Audit-friendly.

## Human-readable output

Ledger writes `LEDGER.md`:

```markdown
## [0001] PLAN — InvestigatorAgent
hash=8adecb7c6f006b85
{"steps": ["fetch account", "fetch transactions"]}
```

Git-diff friendly. Compliance teams can read it.

## Run the demo

```bash
git clone https://github.com/adu3110/agent-ledger
cd agent-ledger
python python/ledger.py
# → LEDGER.md, 22 entries, hash chain valid
```

Zero npm/pip dependencies beyond stdlib for core protocol.

**Next →** [Conflict Detection and Resolution](./26-conflicts.md)
