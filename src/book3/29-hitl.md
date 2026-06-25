# 29. Human-in-the-Loop

## HITL is a first-class state

Not an error path — a **mode**:

```python
class CaseStatus(Enum):
    AUTOMATED = "automated"
    PENDING_HUMAN = "pending_human"
    HUMAN_APPROVED = "human_approved"
    CLOSED = "closed"
```

Escalation appends ledger entry:

```
ESCALATE — {"reason": "supervisor_approval_required", "pending_action": "flag_account"}
```

Human appends:

```
HUMAN_APPROVAL — {"approved_by": "supervisor_42", "action": "flag_account"}
```

Then automated agents resume.

## UI requirements (minimal)

Human reviewer needs:

1. Case summary (from memory snapshot)
2. Trajectory or ledger excerpt
3. Proposed action + one-click approve/reject
4. Audit log of human decision

No framework prescribes this UI. HTTP API + simple web form suffices.

## Latency expectations

HITL cases may wait hours. Agent state must **persist** across restarts — SQLite, files, or DB. Not in-memory only.

## Kyne AI angle

Regulated financial workflows (debt collection, compliance) require HITL by design. Automate gathering and drafting; humans commit irreversible actions.

**Next →** [Cost and Latency Control](./30-cost-latency.md)
