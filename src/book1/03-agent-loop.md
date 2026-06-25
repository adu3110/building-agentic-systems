# 2. The Minimal Agent Loop

## Architecture

```
                    ┌──────────────────────────────┐
       task ──────► │           LOOP               │
                    │                              │
                    │  observe()                   │
                    │      │                       │
                    │      ▼                       │
                    │  planner.next(memory)  ───── ┼──► LLM API
                    │      │                       │
                    │      ▼                       │
                    │  dispatch(action)             │
                    │   ├─ toolCall ───────────────┼──► external API
                    │   ├─ answer  ────────────────┼──► return
                    │   └─ escalate ───────────────┼──► human queue
                    │      │                       │
                    │      ▼                       │
                    │  memory.update(result)        │
                    │  trajectory.log(step)         │
                    │      └──────── loop ──────── ┘
                    └──────────────────────────────┘
```

## Types

```typescript
// src/types.ts

export type ActionType = "toolCall" | "answer" | "escalate" | "think";

export interface Action {
  type: ActionType;
  tool?: string;
  args?: Record<string, unknown>;
  text?: string;
  reason?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface TrajectoryStep {
  step: number;
  actionType: ActionType;
  action?: Action;
  result?: ToolResult;
  reason?: string;
  timestamp: string;
}
```

## The loop

```typescript
// src/agent.ts
import OpenAI from "openai";
import type { Action, ActionType, ToolResult, TrajectoryStep } from "./types.js";
import type { MemoryStore } from "./memory.js";
import type { TaskPlanner } from "./planner.js";
import type { ToolRegistry } from "./tools.js";
import type { Trajectory } from "./trajectory.js";

export class AgentLoop {
  private seenCalls = new Set<string>();

  constructor(
    private task: string,
    private memory: MemoryStore,
    private planner: TaskPlanner,
    private tools: ToolRegistry,
    private trajectory: Trajectory,
    private maxSteps = 10,
  ) {}

  async run(): Promise<string> {
    this.memory.writeTask(this.task);

    for (let step = 0; step < this.maxSteps; step++) {
      const action = await this.planner.next(this.memory.snapshot());

      if (action.type === "toolCall") {
        const sig = JSON.stringify({ tool: action.tool, args: action.args });
        if (this.seenCalls.has(sig)) {
          return this.escalate("duplicate_tool_call", step);
        }
        this.seenCalls.add(sig);

        const result = await this.tools.run(action.tool!, action.args ?? {});
        this.memory.writeObservation(action.tool!, result);
        this.trajectory.log({ step, actionType: "toolCall", action, result });

      } else if (action.type === "answer") {
        this.trajectory.log({ step, actionType: "answer", action });
        return action.text ?? "";

      } else if (action.type === "escalate") {
        return this.escalate(action.reason ?? "agent_request", step);

      } else if (action.type === "think") {
        this.trajectory.log({ step, actionType: "think", action });
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

## Minimal planner (direct LLM call)

```typescript
// src/planner_simple.ts
import OpenAI from "openai";
import type { Action } from "./types.js";

const client = new OpenAI();

const SYSTEM = `You are a case-resolution agent.
Given the current memory state and task, decide your next action.
Reply with JSON only — one of:
  { "type": "toolCall", "tool": "<name>", "args": { ... } }
  { "type": "answer",   "text": "<final answer>" }
  { "type": "escalate", "reason": "<why>" }
Available tools: getAccount, getTransactions, flagAccount`;

export async function nextAction(memorySnapshot: object): Promise<Action> {
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user",   content: JSON.stringify(memorySnapshot) },
    ],
  });

  const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
  return raw as Action;
}
```

## Step types

```
┌────────────┬──────────────────────────────────────────────────────┐
│ ActionType │ What happens                                         │
├────────────┼──────────────────────────────────────────────────────┤
│ think      │ logged, not dispatched — internal scratchpad         │
│ toolCall   │ validated against registry, result stored in memory  │
│ answer     │ loop terminates, text returned to caller             │
│ escalate   │ loop terminates, human queue notified                │
└────────────┴──────────────────────────────────────────────────────┘
```

## Failure modes

### Duplicate tool calls

```typescript
// Without duplicate detection:
// step 0: getAccount("456") → ok
// step 1: getAccount("456") → ok  (LLM confused)
// step 2: getAccount("456") → ok  (3 identical calls, burning tokens)

// Fix: track call signatures
const sig = JSON.stringify({ tool: action.tool, args: action.args });
if (this.seenCalls.has(sig)) return this.escalate("duplicate_tool_call", step);
this.seenCalls.add(sig);
```

### Silent context overflow

```
step  1:  user message          ~  50 tokens
step 10:  10 observations       ~ 800 tokens
step 20:  20 observations       ~2000 tokens  ← quality drops
step 40:  40 observations       ~4000 tokens  ← old constraints invisible
step 80:  80 observations       ~8000 tokens  ← model limit, crash
```

The loop above passes a **bounded snapshot** to the planner — never the raw growing array. Chapter 5 handles what goes into that snapshot.

### No termination

Always set `maxSteps`. Sensible defaults:

```typescript
const MAX_STEPS: Record<string, number> = {
  simpleLookup:      5,
  caseResolution:   12,
  multiAgent:       30,   // Book 3
};
```

## Exercise

Implement the loop stub with no LLM and no real tools. Hard-code `planner.next()` to return:

```typescript
const steps: Action[] = [
  { type: "toolCall", tool: "getAccount",      args: { accountId: "456" } },
  { type: "toolCall", tool: "getTransactions", args: { accountId: "456" } },
  { type: "answer",   text: "Account 456 active, 2 settled transactions." },
];
```

Verify the loop terminates and `trajectory.steps.length === 3`.

**Companion:** `stateful-agent-lab/src/agent.ts`

**Next →** [State: Chat History Is Not Memory](./04-state.md)
