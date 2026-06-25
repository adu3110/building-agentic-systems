# 5. Typed Memory Objects

## Why types matter

Untyped key-value stores devolve into JSON soup. Types encode **how the agent must treat** each entry:

| Type | Behavior |
|------|----------|
| `constraint` | Always inject; never silently drop |
| `fact` | May expire; show timestamp |
| `preference` | Soft guidance |
| `episode` | Past case fragment; retrievable |
| `observation` | Raw tool output (may be large) |

`memcell-rl` calls these **MemoryStateCell** objects with `cell_type`, `scope`, `status`, `sensitivity`, and `criticality`. Same idea, production-grade fields.

## MemoryStateCell (conceptual)

```python
@dataclass
class MemoryCell:
    id: str
    cell_type: str       # constraint | fact | preference | episode
    scope: str           # case:123 | user:456 | global
    content: str
    status: str          # active | superseded | quarantined
    sensitivity: str     # public | internal | pii
    criticality: float   # 0.0–1.0, used in retention policy
    created_at: str
    expires_at: str | None = None
```

## Write path

Only the agent runtime writes cells — after:

1. User states a constraint → `write(constraint)`
2. Tool returns data → `write(fact, source=tool_name)`
3. Policy engine fires → `write(constraint, source=policy)`

The LLM can *request* a write via a structured action; code validates before persisting.

## Supersede, don't delete

When account balance changes, **supersede** the old fact:

```python
def supersede(self, old_id: str, new_cell: MemoryCell):
    self.mark_status(old_id, "superseded")
    self.write(new_cell)
```

Audit trails require history. Hard deletes hide mistakes.

## Scope

CaseBot scopes memory by case:

```python
scope = f"case:{case_id}"
cells = store.list_active(scope=scope)
```

Cross-case leakage is a common production bug. Scope every cell.

## Exercise

Add a `constraint` cell: *"Account 456 is under fraud review — no outbound transfers."* Verify it appears in every planner input until the case closes.

**Companion:** [memcell-rl](https://github.com/adu3110/memcell-rl) `/v1/cells/write` API

**Next →** [Context Assembly Under a Token Budget](./06-context-assembly.md)
