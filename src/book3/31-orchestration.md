# 28. Multi-Agent Orchestration

There are three patterns worth knowing. I'll describe each, say when I'd use it, and note what goes wrong with each in regulated contexts.

## Pattern 1: Pipeline

Agents run sequentially. Each stage reads the current ledger state, does its work, appends entries, and stops. The next stage starts when triggered.

```
InvestigatorAgent → ledger entries → PolicyAgent → ledger entries → ResolverAgent (if conflict) → FixerAgent
```

```python
def run_pipeline(case_id: str):
    ledger = AgentLedger(f"cases/{case_id}/LEDGER.md")

    # Stage 1: gather data
    investigator.run(ledger)

    # Stage 2: check policy
    policy_agent.run(ledger)

    # Stage 3: resolve conflicts if any
    conflicts = detect_conflicts(ledger.entries)
    if conflicts:
        resolver.run(ledger, conflicts)

    # Stage 4: destructive action if approved
    state = ledger.state()
    if state.get("approved_for_flag"):
        fixer.run(ledger)
```

**Good for:** CaseBot v1. Simple, auditable, easy to debug. Each stage's contribution is clearly attributed.

**Fails when:** stages are very slow or one stage's output rarely changes the next stage's decision — you pay full latency for the pipeline even when stage 2 is a no-op.

## Pattern 2: Blackboard (ledger as blackboard)

All agents watch the ledger. Each appends when it has something useful. No fixed ordering.

```python
def blackboard_loop(case_id: str):
    ledger = AgentLedger(f"cases/{case_id}/LEDGER.md")
    pending = [investigator, policy_agent]

    while pending:
        for agent in list(pending):
            if agent.ready(ledger):
                agent.run(ledger)
                pending.remove(agent)

        if detect_conflicts(ledger.entries):
            resolver.run(ledger, detect_conflicts(ledger.entries))
            break
```

**Good for:** cases where agents have independent subtasks that can proceed in any order.

**Fails when:** the "ready" condition is tricky to define correctly. Agents may write in unexpected order, creating subtle race conditions even with an append-only ledger.

## Pattern 3: Supervisor

A lightweight orchestrator emits `PLAN` entries assigning subtasks to specific agents. Sub-agents don't talk to the supervisor directly — they append results to the ledger. The supervisor reads the updated state.

```python
def supervisor_run(case_id: str):
    ledger = AgentLedger(f"cases/{case_id}/LEDGER.md")

    # Supervisor emits plan
    ledger.append("Supervisor", EntryType.PLAN, {
        "assignments": [
            {"agent": "InvestigatorAgent", "task": "gather_account_data"},
            {"agent": "PolicyAgent",       "task": "check_fraud_policy"},
        ]
    })

    # Agents run, append to ledger independently
    investigator.run_task(ledger, "gather_account_data")
    policy_agent.run_task(ledger, "check_fraud_policy")

    # Supervisor reads updated state, decides next step
    state = ledger.state()
    if state.get("risk_level") == "high":
        ledger.append("Supervisor", EntryType.ESCALATE, {"reason": "high_risk"})
```

**Good for:** complex cases where the supervisor needs to adapt routing based on intermediate results.

**Fails when:** the supervisor becomes a bottleneck or tries to do too much reasoning — it should route, not re-implement the agents' logic.

## Recommended for CaseBot: pipeline first

Start with the pipeline. It's the most debuggable. The ledger already gives you ordering and attribution. You don't need a supervisor until you have more than three or four stages with non-trivial routing logic.

The key property of any orchestration pattern for regulated workflows:

```
No destructive TOOL_CALL after a CONFLICT entry without an intervening RESOLUTION or HUMAN_APPROVAL.
```

Write this as a property check. Run it in CI.

## Exercise

Implement the CaseBot pipeline in `agent-ledger`. Run it with a deliberate conflict (Investigator: `risk_level: low`, PolicyAgent: `risk_level: high`). Confirm that the Resolver appends a RESOLUTION before the FixerAgent runs. Check the property above against the resulting ledger.

**Next →** [Regulated Deployment](./32-regulated.md)
