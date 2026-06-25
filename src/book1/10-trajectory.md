# 9. Trajectory Logging

## Why log steps, not just messages

Final answer: *"Account 456 flagged for review."*

Questions compliance asks:
1. Was `getAccount` called before `flagAccount`?
2. Was the fraud-review constraint present and active?
3. Was supervisor permission checked before the destructive action?
4. Did the agent loop unnecessarily?

A chat transcript cannot answer these. A **typed trajectory** can.

## Implementation

```typescript
// src/trajectory.ts
import { randomUUID } from "crypto";
import { writeFileSync } from "fs";
import type { Action, ActionType, ToolResult } from "./types.js";

export interface TrajectoryStep {
  step:       number;
  actionType: ActionType;
  action?:    Action;
  result?:    ToolResult;
  reason?:    string;
  timestamp:  string;
}

export class Trajectory {
  readonly id: string = randomUUID();
  readonly steps: TrajectoryStep[] = [];
  readonly startedAt = new Date().toISOString();

  log(params: Omit<TrajectoryStep, "timestamp">): void {
    this.steps.push({ ...params, timestamp: new Date().toISOString() });
  }

  // Export for eval harness (Book 2)
  export(): object {
    return {
      id:         this.id,
      startedAt:  this.startedAt,
      stepCount:  this.steps.length,
      toolsUsed:  this.toolsUsed(),
      outcome:    this.outcome(),
      steps:      this.steps,
    };
  }

  saveJSON(path: string): void {
    writeFileSync(path, JSON.stringify(this.export(), null, 2));
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  toolsUsed(): string[] {
    return this.steps
      .filter(s => s.actionType === "toolCall")
      .map(s => s.action?.tool ?? "unknown");
  }

  outcome(): "answer" | "escalate" | "incomplete" {
    const last = this.steps.at(-1);
    if (!last) return "incomplete";
    if (last.actionType === "answer")   return "answer";
    if (last.actionType === "escalate") return "escalate";
    return "incomplete";
  }

  successfulToolCalls(): number {
    return this.steps.filter(
      s => s.actionType === "toolCall" && s.result?.success === true,
    ).length;
  }

  failedToolCalls(): number {
    return this.steps.filter(
      s => s.actionType === "toolCall" && s.result?.success === false,
    ).length;
  }
}
```

## Example trajectory output

```json
{
  "id": "a3f2b1c0-...",
  "startedAt": "2024-06-20T10:30:00Z",
  "stepCount": 5,
  "toolsUsed": ["getAccount", "getTransactions", "flagAccount"],
  "outcome": "answer",
  "steps": [
    {
      "step": 0,
      "actionType": "toolCall",
      "action": { "type": "toolCall", "tool": "getAccount", "args": { "accountId": "456" } },
      "result": { "success": true, "data": { "id": "456", "status": "active", "balanceUsd": 142.50 } },
      "timestamp": "2024-06-20T10:30:01Z"
    },
    {
      "step": 1,
      "actionType": "toolCall",
      "action": { "type": "toolCall", "tool": "getTransactions", "args": { "accountId": "456" } },
      "result": { "success": true, "data": { "transactions": [...] } },
      "timestamp": "2024-06-20T10:30:02Z"
    },
    {
      "step": 2,
      "actionType": "think",
      "action": { "type": "think", "text": "Balance normal, transactions settled. No fraud indicators." },
      "timestamp": "2024-06-20T10:30:03Z"
    },
    {
      "step": 3,
      "actionType": "answer",
      "action": { "type": "answer", "text": "Account 456 reviewed. No fraud indicators. Case closed." },
      "timestamp": "2024-06-20T10:30:04Z"
    }
  ]
}
```

## Property checks (preview of Book 2)

```typescript
// tests/properties.test.ts

function lookupBeforeFlag(traj: Trajectory): boolean {
  const tools = traj.toolsUsed();
  if (!tools.includes("flagAccount")) return true;           // no flag, no issue
  return tools.includes("getAccount") &&
         tools.indexOf("getAccount") < tools.indexOf("flagAccount");
}

function noDestructiveWithoutLookup(traj: Trajectory): boolean {
  return lookupBeforeFlag(traj);
}

function boundedSteps(traj: Trajectory, max: number): boolean {
  return traj.steps.length <= max;
}

function noDuplicateToolCalls(traj: Trajectory): boolean {
  const sigs = traj.steps
    .filter(s => s.actionType === "toolCall")
    .map(s => JSON.stringify({ tool: s.action?.tool, args: s.action?.args }));
  return new Set(sigs).size === sigs.length;
}

// Run on exported trajectory file
function checkProperties(traj: Trajectory): Record<string, boolean> {
  return {
    lookupBeforeFlag:         lookupBeforeFlag(traj),
    noDestructiveWithoutLookup: noDestructiveWithoutLookup(traj),
    boundedSteps:             boundedSteps(traj, 12),
    noDuplicateToolCalls:     noDuplicateToolCalls(traj),
  };
}
```

## Run with export

```bash
ts-node src/agent.ts \
  --task "Review account 456 for fraud" \
  --export logs/case456.json

# Output
cat logs/case456.json | jq '.toolsUsed'
# ["getAccount", "getTransactions"]
```

**Companion:** `stateful-agent-lab/src/trajectory.ts`

**Next →** [Putting It Together](./11-together.md)
