# 7. Planning and Scratchpads

## Why "ask the LLM what to do next" is not planning

Without a planner, every loop iteration asks the LLM the full open-ended question: *"What should I do?"* This leads to:

- Non-deterministic step ordering
- Re-discovering the same next step repeatedly
- No progress tracking — the agent doesn't know it's done step 2 of 4
- No structured replan when a tool fails

A `TaskPlanner` holds state **between steps**:

```
┌─────────────────────────────────────────────────────────────┐
│  TaskPlanner                                                │
│                                                             │
│  task: "Review account 456 for fraud; flag if suspicious"  │
│                                                             │
│  steps:                                                     │
│    [0] "fetch account details"    → DONE                    │
│    [1] "fetch transactions"       → DONE                    │
│    [2] "apply fraud heuristics"   → IN_PROGRESS             │
│    [3] "flag or close with summary" → PENDING               │
│                                                             │
│  scratchpad:                                                │
│    "balance $142.50, 2 settled txns, no unusual amounts"    │
│                                                             │
│  replansRemaining: 2                                        │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

```typescript
// src/planner.ts
import OpenAI from "openai";
import type { Action } from "./types.js";

type StepStatus = "pending" | "in_progress" | "done" | "failed";

interface PlanStep {
  index: number;
  description: string;
  status: StepStatus;
  toolUsed?: string;
  failureReason?: string;
}

export class TaskPlanner {
  private steps: PlanStep[] = [];
  private scratchpad: string[] = [];
  private replansRemaining: number;
  private client = new OpenAI();

  constructor(
    private task: string,
    private maxReplans = 2,
  ) {
    this.replansRemaining = maxReplans;
  }

  // ── Decompose ─────────────────────────────────────────────────────────────

  async decompose(): Promise<PlanStep[]> {
    const resp = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Break this task into ordered steps (max 5). Return JSON:
{"steps": ["step description", ...]}

Task: ${this.task}
Available tools: getAccount, getTransactions, flagAccount`,
      }],
    });

    const { steps } = JSON.parse(resp.choices[0].message.content ?? "{}") as { steps: string[] };
    this.steps = steps.map((description, index) => ({
      index, description, status: "pending" as StepStatus,
    }));
    return this.steps;
  }

  // ── Next action ───────────────────────────────────────────────────────────

  async next(memorySnapshot: object): Promise<Action> {
    if (this.steps.length === 0) await this.decompose();

    const current = this.currentStep();
    if (!current) return { type: "answer", text: this.summarise() };

    current.status = "in_progress";

    const resp = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `You are executing step ${current.index + 1}/${this.steps.length}:
"${current.description}"

Memory: ${JSON.stringify(memorySnapshot, null, 2)}
Scratchpad: ${this.scratchpad.join("; ")}

Reply with JSON:
  { "type": "toolCall", "tool": "<name>", "args": {...}, "note": "<scratchpad update>" }
  { "type": "answer",   "text": "<final answer>" }
  { "type": "escalate", "reason": "<why>" }`,
      }],
    });

    const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
    if (raw.note) this.scratchpad.push(raw.note);

    return raw as Action;
  }

  // ── Feedback ──────────────────────────────────────────────────────────────

  markStepDone(toolName?: string): void {
    const step = this.currentStep();
    if (step) { step.status = "done"; step.toolUsed = toolName; }
  }

  markStepFailed(reason: string): void {
    const step = this.currentStep();
    if (!step) return;
    step.status = "failed";
    step.failureReason = reason;

    if (this.replansRemaining > 0) {
      this.replansRemaining--;
      this.replan(reason);
    }
  }

  // ── Replan ────────────────────────────────────────────────────────────────

  private replan(failureReason: string): void {
    // Mark remaining steps pending so next() re-evaluates from current position
    for (const step of this.steps) {
      if (step.status === "pending" || step.status === "in_progress") {
        step.status = "pending";
      }
    }
    this.scratchpad.push(`[replan triggered: ${failureReason}]`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private currentStep(): PlanStep | undefined {
    return this.steps.find(s => s.status === "pending" || s.status === "in_progress");
  }

  private summarise(): string {
    return `Task complete. Steps: ${this.steps.map(s => `${s.description}(${s.status})`).join(", ")}. Notes: ${this.scratchpad.join("; ")}`;
  }

  progress(): { total: number; done: number; failed: number } {
    return {
      total:  this.steps.length,
      done:   this.steps.filter(s => s.status === "done").length,
      failed: this.steps.filter(s => s.status === "failed").length,
    };
  }
}
```

## Integrating planner with the loop

```typescript
// In AgentLoop.run():
const action = await this.planner.next(this.memory.snapshot());

if (action.type === "toolCall") {
  const result = await this.tools.run(action.tool!, action.args ?? {});
  this.memory.writeObservation(action.tool!, result);
  this.trajectory.log({ step, actionType: "toolCall", action, result });

  if (result.success) {
    this.planner.markStepDone(action.tool);       // ← advance planner
  } else {
    this.planner.markStepFailed(result.error!);   // ← trigger replan
  }
}
```

## Decompose once, replan on failure

```
initial plan:  fetch account → fetch transactions → apply heuristics → flag or close
                                        ↓
              getTransactions fails (API timeout)
                                        ↓
              replan: retry getTransactions → apply heuristics with partial data → escalate
```

## Scratchpad vs memory

```
Scratchpad:
  - Planner's working notes during a task
  - "balance $142.50, no unusual amounts"
  - Lost when case closes — not durable
  - Injected into context as a "soft hint"
  - kind: "scratch" in MemoryStore, low criticality

Memory:
  - Durable across steps and cases
  - Typed, queryable, auditable
  - Survives replans and model swaps
```

**Companion:** `stateful-agent-lab/src/planner.ts`

**Next →** [Stop Conditions and Escalation](./09-stop-escalate.md)
