# 6. Typed memory cells

A constraint is not a message. It's a cell: typed, scoped, ranked, with a lifecycle.

```bash
python3 examples/build/step06_typed_memory.py
```

```
Selected cells under budget=800:
  [constraint] criticality=0.95  no_outbound_transfers until review closes…
  [fact] criticality=0.6  balance $142.50 from getAccount…
  [fact] criticality=0.1  episode turn 0: …

Constraint always selected: True
Episode cells selected: 3 / 12
```

Same 12 turns of filler as chapter 5. Constraint still selected — it's not in the chat stream; the assembler pulls it first.

## In-process store (mirrors memcell-rl)

```python
@dataclass
class MemoryCell:
    cell_type: str      # constraint | fact | episode
    scope: dict         # {"case": "456"}
    content: str
    criticality: float  # 0.95 = never drop

def decide(store, scope, budget_chars):
    constraints = [c for c in store if c.cell_type == "constraint"]
    rest = sorted(other cells, key=-criticality)
    return constraints + fit_in_budget(rest, budget)
```

**Constraints are not ranked.** They're injected, then the rest competes for leftover budget.

## Fields that matter

| Field | Role |
|-------|------|
| `type` | constraint vs fact vs episode — different drop rules |
| `scope` | `{"case": "456"}` — case 789 never leaks in |
| `criticality` | higher = survives token pressure |
| `status` | active / superseded — update balance without deleting audit trail |

## Production: memcell-rl

Step 6 is ~50 lines in-process. CaseBot uses HTTP:

```bash
uvicorn memcell_rl.app:app --port 8000
python3 examples/build/step07_memcell.py
```

Same semantics. Memory survives process restarts. Multiple agents can share scoped cells (Book 3).

**Next →** [Context assembly under a budget](./06-context-assembly.md)
