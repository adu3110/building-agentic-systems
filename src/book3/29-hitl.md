# 26. Human-in-the-Loop

HITL is not a fallback. In regulated workflows it's a designed state — a point in the case where the system intentionally stops and waits for a human before proceeding. The agent knows this. The case status says so. The ledger records it.

The mistake I see in most HITL designs: it's bolted on as an error path. The agent fails, something catches the exception, a notification fires, a human looks. That's an incident response process wearing a HITL costume. Real HITL means the system was designed from the start to pause at specific decision points.

## Case status as a state machine

```python
from enum import Enum

class CaseStatus(Enum):
    AUTOMATED     = "automated"      # agent running
    PENDING_HUMAN = "pending_human"  # waiting for human decision
    HUMAN_APPROVED = "human_approved"  # human approved, agents resume
    CLOSED        = "closed"         # final state
```

Escalation is a transition from `AUTOMATED` to `PENDING_HUMAN`. It's not an error — it's the agent doing its job:

```python
def escalate(ledger: AgentLedger, agent: str, reason: str, pending_action: dict):
    ledger.append(agent, EntryType.ESCALATE, {
        "reason": reason,
        "pending_action": pending_action,
        "case_status": CaseStatus.PENDING_HUMAN.value,
    })
    # Agent loop stops here. No further tool calls.
```

## Human approval entry

A human reviewer looks at the case summary (from memory snapshot) and the proposed action. They click approve. Your system appends:

```python
ledger.append("supervisor:42", EntryType.HUMAN_APPROVAL, {
    "approved_by": "supervisor:42",
    "approved_action": "flagAccount",
    "case_status": CaseStatus.HUMAN_APPROVED.value,
    "timestamp": datetime.utcnow().isoformat() + "Z",
})
```

Now automated agents can resume. The fixer reads ledger state, sees `case_status: human_approved`, and proceeds with the flagging.

## What the reviewer needs to see

I've found that reviewers need exactly five things:

1. **Case summary** — one paragraph from memory snapshot (not raw trajectory JSON)
2. **Proposed action** — `flagAccount(456, "fraud_indicator")` with parameters
3. **Why the agent escalated** — the `reason` field from the ESCALATE entry
4. **One-click approve / reject** — not a form with twelve fields
5. **Audit trail** — the HUMAN_APPROVAL entry that their click creates

No framework prescribes this. A minimal HTTP endpoint + a simple web form is enough.

## Persistence across restarts

HITL cases may wait hours. A case in `PENDING_HUMAN` state must survive agent process restarts.

That means:
- Case state lives in the ledger (on disk or DB), not in-memory
- The agent loop checks `case_status` at startup and resumes from the right state
- memcell-rl cells persist independently of the agent process

```python
# On startup or resume
status = ledger.state().get("case_status", CaseStatus.AUTOMATED.value)
if status == CaseStatus.PENDING_HUMAN.value:
    print("Case waiting for human approval. Exiting.")
    exit(0)
elif status == CaseStatus.HUMAN_APPROVED.value:
    # Resume from post-approval step
    proceed_with_approved_action()
```

## The compliance angle

In regulated domains, some actions are irreversible (flagging an account, waiving a fee, blocking a card). Human approval before irreversible actions is not just good UX — it's a regulatory requirement in many jurisdictions.

The combination of ledger + HITL + typed permissions gives you: an audit trail of the agent's reasoning, a human decision with identity and timestamp, and proof that the irreversible action only occurred after explicit approval.

## Exercise

Add an ESCALATE entry to the agent-ledger demo when `risk_level: high` is detected. Then write a stub `human_approve()` function that appends a HUMAN_APPROVAL entry. Replay the ledger and confirm `case_status` transitions from `automated` → `pending_human` → `human_approved`.

**Next →** [Cost and Latency Control](./30-cost-latency.md)
