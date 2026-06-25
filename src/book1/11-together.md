# 10. Putting It Together

## CaseBot v1 architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CaseBot v1                                  │
│                                                                      │
│   task string                                                        │
│       │                                                              │
│       ▼                                                              │
│  ┌────────────┐   next()   ┌─────────────────────────────────────┐  │
│  │ TaskPlanner│◄──────────►│ AgentLoop                          │  │
│  └────────────┘  action    │                                     │  │
│        │                   │  for step in 0..maxSteps:           │  │
│        │ decompose()        │    action = planner.next(snapshot) │  │
│        ▼                   │    checkStopConditions(action)      │  │
│   LLM API                  │    if toolCall → tools.run()        │  │
│   (gpt-4o-mini)            │    if answer  → return text         │  │
│                            │    if escalate→ return ESCALATED:…  │  │
│  ┌─────────────────┐       │                                     │  │
│  │  CellStore      │       │  memory.writeObservation()          │  │
│  │  constraints    │◄──────│  trajectory.log()                   │  │
│  │  facts          │       └─────────────────────────────────────┘  │
│  │  observations   │                                                 │
│  └─────────────────┘                                                 │
│        │                   ┌─────────────────────────────────────┐  │
│        │ snapshot()         │  ToolRegistry                      │  │
│        └──────────────────►│  getAccount                         │  │
│                            │  getTransactions                    │  │
│                            │  flagAccount  (write:accounts perm) │  │
│                            └─────────────────────────────────────┘  │
│                                                                      │
│  trajectory → logs/case456.json → property checks → CI              │
└──────────────────────────────────────────────────────────────────────┘
```

## Wire-up

```typescript
// src/casebot.ts
import { AgentLoop } from "./agent.js";
import { MemoryStore } from "./memory.js";
import { TaskPlanner } from "./planner.js";
import { buildRegistry } from "./casebot_tools.js";
import { Trajectory } from "./trajectory.js";
import {
  maxStepsCondition,
  duplicateToolCondition,
  constraintViolationCondition,
  destructiveWithoutApprovalCondition,
} from "./stop_conditions.js";

export async function runCase(params: {
  caseId: string;
  task: string;
  initialConstraints?: string[];
  agentPermissions?: string[];
  exportPath?: string;
}): Promise<{ outcome: string; trajectoryPath?: string }> {
  const memory     = new MemoryStore();
  const planner    = new TaskPlanner(params.task);
  const registry   = buildRegistry();
  const trajectory = new Trajectory();
  const permissions = new Set(params.agentPermissions ?? ["read:accounts", "read:transactions"]);

  // Load constraints
  for (const constraint of params.initialConstraints ?? []) {
    memory.write({
      key:         `constraint_${Date.now()}`,
      value:       constraint,
      kind:        "constraint",
      source:      "system",
      criticality: 1.0,
    });
  }

  const loop = new AgentLoop(
    params.task,
    memory,
    planner,
    registry,
    trajectory,
    [
      maxStepsCondition(12),
      duplicateToolCondition,
      constraintViolationCondition,
      destructiveWithoutApprovalCondition(registry, new Set<string>()),
    ],
    12,
  );

  const outcome = await loop.run();

  if (params.exportPath) {
    trajectory.saveJSON(params.exportPath);
    console.log(`Trajectory saved: ${params.exportPath}`);
  }

  return { outcome, trajectoryPath: params.exportPath };
}
```

## Run it

```typescript
// src/index.ts
import { runCase } from "./casebot.js";

const { outcome } = await runCase({
  caseId: "case:456",
  task: "Review account 456 for fraud indicators. Flag if suspicious.",
  initialConstraints: [
    "account_456_under_fraud_review:no_outbound_transfers",
  ],
  agentPermissions: ["read:accounts", "read:transactions"],  // no write:accounts
  exportPath: "logs/case456.json",
});

console.log(outcome);
// → "Account 456 reviewed. Balance $142.50. 2 settled transactions. No fraud indicators."
// → "ESCALATED:approval_required" if flagAccount was attempted
```

```bash
npx ts-node src/index.ts
cat logs/case456.json | jq '{outcome: .outcome, tools: .toolsUsed, steps: .stepCount}'
```

## Module map

| File | Chapter | Responsibility |
|------|---------|----------------|
| `src/types.ts` | 2 | Action, ToolResult, TrajectoryStep types |
| `src/agent.ts` | 2 | Loop orchestration |
| `src/memory.ts` | 3 | MemoryStore (entries, snapshot) |
| `src/memory_cell.ts` | 4 | CellStore (scope, sensitivity, TTL) |
| `src/context_assembler.ts` | 5 | Token-budget-aware prompt assembly |
| `src/tools.ts` | 6 | Registry, schema, dispatch, permissions |
| `src/casebot_tools.ts` | 6 | CaseBot-specific tool implementations |
| `src/planner.ts` | 7 | Decompose, step tracking, replan |
| `src/stop_conditions.ts` | 8 | Pluggable termination guards |
| `src/trajectory.ts` | 9 | Step logging, JSON export |
| `src/casebot.ts` | 10 | Wire-up and entry point |

## Book 1 checklist

- [ ] Loop terminates on answer, escalate, or max steps
- [ ] Constraints written as typed cells with `criticality: 1.0`
- [ ] Context assembler always injects constraints first
- [ ] Tools registered with schemas, required params, and permissions
- [ ] Destructive tools gated by permission check
- [ ] Every step logged to trajectory
- [ ] Trajectory exported and property-checked on every run
- [ ] No agent framework in the critical path

**Book 1 complete.** → [Why Final-Answer Accuracy Lies](../book2/13-final-answer-lies.md)
