# 31. Multi-Agent Orchestration

## Orchestration patterns

### Pipeline

Investigator → Policy → Resolver → Answer

Each stage reads ledger, appends, stops. Simple, auditable.

### Blackboard (ledger as blackboard)

All agents read latest state; append when they have something useful. Resolver runs when CONFLICT appears.

### Supervisor (lightweight)

One orchestrator agent emits `PLAN` entries assigning subtasks. Sub-agents don't talk to supervisor in chat — they append to ledger.

## Anti-pattern: autonomous swarm

Ten agents with open conversation and no shared log → non-deterministic, un-auditable.

## CaseBot pipeline (recommended v1)

```
1. InvestigatorAgent — TOOL_CALLs for data → OBSERVATIONs
2. PolicyAgent       — reads state, writes risk assessment
3. If conflict       — ResolverAgent
4. If destructive    — HITL gate
5. FixerAgent        — ANSWER or flag tool
```

Each handoff = new ledger entries, not hidden function calls.

## Testing multi-agent systems

Property: **every ANSWER must follow CHECKPOINT or full replay from PLAN**.

Property: **no destructive TOOL_CALL after CONFLICT without RESOLUTION**.

**Next →** [Regulated Deployment](./32-regulated.md)
