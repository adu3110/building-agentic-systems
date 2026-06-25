# 4. State: Chat History Is Not Memory

## The mistake everyone makes

```python
messages = []  # "memory"
messages.append({"role": "user", "content": "Never waive fees without approval."})
# ... 40 turns later ...
# Agent waives a fee. Constraint lost in the middle of the transcript.
```

Chat history is a **log of conversation**, not a **model of world state**.

## Three different things

| Concept | What it is | Example |
|---------|------------|---------|
| **Chat history** | Ordered messages for the LLM | User said X, assistant said Y |
| **Context** | Subset selected for this prompt | Last 4k tokens + 3 memory cells |
| **Memory / state** | Structured facts the system maintains | `constraint: no_fee_waive_without_approval` |

Confusing these causes "the agent forgot" bugs that are actually **retrieval bugs**.

## What belongs in state

For CaseBot:

- **Task** — current case ID and goal
- **Constraints** — hard rules (compliance, permissions)
- **Facts** — account status, balances (with timestamps)
- **Plan progress** — which steps completed
- **Scratchpad** — working notes (may be discarded)

None of these should require parsing natural language from turn 2 of the chat.

## Minimal state store

```python
@dataclass
class MemoryEntry:
    key: str
    value: Any
    kind: str  # "constraint" | "fact" | "observation" | "plan"
    created_at: str
    source: str  # "user" | "tool:get_account" | "policy"

class MemoryStore:
    def __init__(self):
        self._entries: list[MemoryEntry] = []

    def write(self, key: str, value: Any, kind: str, source: str):
        self._entries.append(MemoryEntry(key, value, kind, now(), source))

    def get_constraints(self) -> list[MemoryEntry]:
        return [e for e in self._entries if e.kind == "constraint"]

    def snapshot(self) -> dict:
        return {"entries": [asdict(e) for e in self._entries]}
```

The LLM never owns this store directly. The **agent code** writes to it after validated events.

## Anti-pattern: "summarize history into memory"

Periodic summarization feels like memory. It loses structure, timestamps, and provability. Use summarization only for **context compression**, not as the source of truth.

## Key insight

> A million tokens of context is not memory.  
> Memory is what survives compression, retrieval, and replay.

Book 2 expands this with benchmarks. For now: **write typed entries**.

**Companion:** `stateful-agent-lab/agent/memory.py`

**Next →** [Typed Memory Objects](./05-typed-memory.md)
