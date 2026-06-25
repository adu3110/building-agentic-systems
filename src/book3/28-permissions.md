# 28. Permissions and Sensitive Memory

## Agent identity matters

Each agent has:

```python
@dataclass
class AgentIdentity:
    name: str
    permissions: set[str]  # read:accounts, write:accounts, resolve:conflicts
```

Tool registry checks permissions before dispatch (Book 1). Ledger entries record **which agent** acted.

## Sensitive cells

Memory cells tagged `sensitivity: pii | internal | public`.

Rules:

- PII cells only visible to agents with `read:pii`
- Never inject PII into context for agents without scope
- Redact in trajectory exports for non-auditor roles

## Ledger immutability ≠ access control

Append-only does not mean world-readable. Separate:

- **Write access** — who can append
- **Read access** — who can replay
- **Export access** — who gets full trajectory downloads

## CaseBot roles

| Agent | Permissions |
|-------|-------------|
| Investigator | read:accounts, read:transactions |
| Policy | read:constraints, read:accounts |
| Resolver | resolve:conflicts |
| Auditor | read:all, export:trajectory |

Destructive tools require Resolver approval entry in ledger before execution.

**Next →** [Human-in-the-Loop](./29-hitl.md)
