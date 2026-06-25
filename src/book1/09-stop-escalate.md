# 8. Stop Conditions and Escalation

## Stop is not an error

In regulated workflows, a correct `ESCALATE` beats a wrong `ANSWER`. Escalation is a first-class outcome, not a fallback.

```
┌──────────────────────────────────────────────────────────────┐
│  Terminal states                                             │
│                                                              │
│  ANSWER     → task completed by the agent                   │
│  ESCALATE   → agent correctly defers to human               │
│  FAIL       → unrecoverable error (max steps, crash)        │
└──────────────────────────────────────────────────────────────┘
```

## Stop conditions

```typescript
// src/stop_conditions.ts
import type { Trajectory } from "./trajectory.js";
import type { MemoryStore } from "./memory.js";
import type { Action } from "./types.js";

export interface StopCondition {
  name: string;
  check(params: {
    step: number;
    action: Action;
    trajectory: Trajectory;
    memory: MemoryStore;
  }): { stop: boolean; reason?: string };
}

// ── 1. Max steps ──────────────────────────────────────────────────────────────

export const maxStepsCondition = (max: number): StopCondition => ({
  name: "max_steps",
  check: ({ step }) => ({ stop: step >= max, reason: "max_steps_exceeded" }),
});

// ── 2. Duplicate tool call ────────────────────────────────────────────────────

export const duplicateToolCondition: StopCondition = {
  name: "duplicate_tool",
  check: ({ action, trajectory }) => {
    if (action.type !== "toolCall") return { stop: false };
    const sig = JSON.stringify({ tool: action.tool, args: action.args });
    const seen = trajectory.steps.some(
      s => s.actionType === "toolCall" &&
           JSON.stringify({ tool: s.action?.tool, args: s.action?.args }) === sig,
    );
    return { stop: seen, reason: "duplicate_tool_call" };
  },
};

// ── 3. Constraint violation ───────────────────────────────────────────────────

export const constraintViolationCondition: StopCondition = {
  name: "constraint_violation",
  check: ({ action, memory }) => {
    if (action.type !== "toolCall") return { stop: false };

    const constraints = memory.getConstraints();
    for (const c of constraints) {
      const content = typeof c.value === "string" ? c.value : JSON.stringify(c.value);

      // Example: constraint says "no_outbound_transfers" and agent tries to transfer
      if (content.includes("no_outbound_transfers") && action.tool === "initiateTransfer") {
        return { stop: true, reason: "constraint_violation:no_outbound_transfers" };
      }
    }
    return { stop: false };
  },
};

// ── 4. Destructive action without approval ────────────────────────────────────

export const destructiveWithoutApprovalCondition = (
  registry: { schemas(): Array<{ name: string; isDestructive: boolean }> },
  approvedTools: Set<string>,
): StopCondition => ({
  name: "destructive_without_approval",
  check: ({ action }) => {
    if (action.type !== "toolCall") return { stop: false };
    const schema = registry.schemas().find(s => s.name === action.tool);
    if (schema?.isDestructive && !approvedTools.has(action.tool!)) {
      return { stop: true, reason: `destructive_action_requires_approval:${action.tool}` };
    }
    return { stop: false };
  },
});
```

## Using stop conditions in the loop

```typescript
// src/agent.ts (updated)
export class AgentLoop {
  constructor(
    private task: string,
    private memory: MemoryStore,
    private planner: TaskPlanner,
    private tools: ToolRegistry,
    private trajectory: Trajectory,
    private stopConditions: StopCondition[] = [],
    private maxSteps = 10,
  ) {}

  async run(): Promise<string> {
    this.memory.writeTask(this.task);

    for (let step = 0; step < this.maxSteps; step++) {
      const action = await this.planner.next(this.memory.snapshot());

      // Check all stop conditions before dispatching
      for (const condition of this.stopConditions) {
        const { stop, reason } = condition.check({
          step, action, trajectory: this.trajectory, memory: this.memory,
        });
        if (stop) return this.escalate(reason ?? condition.name, step);
      }

      if (action.type === "toolCall") {
        const result = await this.tools.run(action.tool!, action.args ?? {});
        this.memory.writeObservation(action.tool!, result);
        this.trajectory.log({ step, actionType: "toolCall", action, result });
        result.success
          ? this.planner.markStepDone(action.tool)
          : this.planner.markStepFailed(result.error!);

      } else if (action.type === "answer") {
        this.trajectory.log({ step, actionType: "answer", action });
        return action.text ?? "";

      } else if (action.type === "escalate") {
        return this.escalate(action.reason ?? "agent_request", step);
      }
    }

    return this.escalate("max_steps_exceeded", this.maxSteps);
  }

  private escalate(reason: string, step: number): string {
    this.trajectory.log({ step, actionType: "escalate", reason });
    return `ESCALATED:${reason}`;
  }
}
```

## Escalation payload

When escalating, give the human everything they need:

```typescript
interface EscalationPayload {
  caseId: string;
  reason: string;
  trajectoryId: string;
  stepCount: number;
  memorySnapshot: object;
  proposedAction?: object;
}

function buildEscalationPayload(
  caseId: string, reason: string,
  trajectory: Trajectory, memory: MemoryStore,
  pendingAction?: Action,
): EscalationPayload {
  return {
    caseId,
    reason,
    trajectoryId: trajectory.id,
    stepCount: trajectory.steps.length,
    memorySnapshot: memory.snapshot(),
    proposedAction: pendingAction,
  };
}
```

## Decision table

```
Condition                          Action
──────────────────────────────────────────────────────────
step >= maxSteps                   ESCALATE max_steps_exceeded
duplicate (tool, args)             ESCALATE duplicate_tool_call
constraint violated                ESCALATE constraint_violation
destructive without approval       ESCALATE approval_required
tool returns permission_denied     ESCALATE (let planner decide)
plan failed after maxReplans       ESCALATE replan_exhausted
model returns escalate action      ESCALATE agent_request
```

**Next →** [Trajectory Logging](./10-trajectory.md)
