# 3.5 Permissions and Sensitive Memory

Two separate things that are often conflated: ledger immutability and access control. An append-only ledger guarantees no one can change the past. It does not guarantee that every agent can read every entry. Those are different problems.

## Agent identity

Each agent has an identity that determines what it can do:

```python
from dataclasses import dataclass, field

@dataclass
class AgentIdentity:
    name: str
    permissions: set[str] = field(default_factory=set)

INVESTIGATOR = AgentIdentity(
    name="InvestigatorAgent",
    permissions={"read:accounts", "read:transactions", "write:ledger"},
)
POLICY = AgentIdentity(
    name="PolicyAgent",
    permissions={"read:accounts", "read:constraints", "write:ledger"},
)
RESOLVER = AgentIdentity(
    name="ResolverAgent",
    permissions={"read:accounts", "read:ledger", "write:resolution"},
)
AUDITOR = AgentIdentity(
    name="AuditorAgent",
    permissions={"read:all", "export:trajectory", "read:pii"},
)
```

The tool registry in Book 1 already checks permissions before dispatching. The ledger checks the agent's identity before accepting an entry type:

```python
def append(self, agent: AgentIdentity, etype: EntryType, content: dict) -> LedgerEntry:
    required = {
        EntryType.PLAN: "write:plan",
        EntryType.RESOLUTION: "write:resolution",
        EntryType.TOOL_CALL: "write:ledger",
        EntryType.OBSERVATION: "write:ledger",
    }
    perm = required.get(etype)
    if perm and perm not in agent.permissions:
        raise PermissionError(f"{agent.name} lacks {perm} for {etype.value}")
    # ... rest of append
```

`InvestigatorAgent` can write OBSERVATION entries. It cannot write RESOLUTION entries — that's the Resolver's job.

## Sensitive memory cells

Memory cells in memcell-rl have a `sensitivity` field:

```python
{
    "type": "fact",
    "scope": {"case": "456"},
    "content": "SSN: ***-**-1234",
    "sensitivity": "pii",   # pii | internal | public
    "policy_features": {"criticality": 0.9},
}
```

The context assembler checks the agent's permissions before injecting a cell:

```python
def can_read_cell(agent: AgentIdentity, cell: dict) -> bool:
    sensitivity = cell.get("sensitivity", "public")
    if sensitivity == "pii":
        return "read:pii" in agent.permissions
    if sensitivity == "internal":
        return "read:internal" in agent.permissions
    return True
```

`InvestigatorAgent` doesn't have `read:pii`. Even if the cell is in memcell-rl with `criticality: 0.9`, it will not appear in Investigator's context assembly. It will appear in AuditorAgent's.

## Three separate access layers

```
WRITE ACCESS     who can append ledger entries (by entry type)
READ ACCESS      who can replay ledger entries (full vs redacted)
EXPORT ACCESS    who can get trajectory/ledger downloads (ops vs audit)
```

Ledger immutability handles the "no one can change the past" guarantee. These three access layers handle "not everyone can see everything."

## In practice: CaseBot roles

| Agent | Tool permissions | Ledger write | Ledger read | Memory sensitivity |
|---|---|---|---|---|
| InvestigatorAgent | read:accounts, read:transactions | TOOL_CALL, OBSERVATION | full | internal |
| PolicyAgent | read:constraints | OBSERVATION | full | internal |
| ResolverAgent | — | CONFLICT, RESOLUTION | full | internal |
| AuditorAgent | — | — | full + export | pii + all |

Destructive tool calls require a prior RESOLUTION or HUMAN_APPROVAL entry in the ledger — the registry checks this before executing.

## Exercise

Add a `sensitivity: "pii"` cell to memcell-rl with an SSN. Create two agents: one with `read:pii`, one without. Run `decide()` for each. Verify the PII cell appears only in the first agent's `selected_cells`.

**Next →** [Human-in-the-Loop](./29-hitl.md)
