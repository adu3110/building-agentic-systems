# 5. Context Assembly Under a Token Budget

## The problem

At step 15 of a case you have:

```
System prompt:            300 tokens
Active constraints:       150 tokens   ← must always include
Current task + plan:      200 tokens   ← must always include
20 tool observations:    4000 tokens   ← most can be dropped
50 memory facts:         3000 tokens   ← rank by relevance
Chat tail (last 5 turns): 800 tokens   ← nice to have
───────────────────────────────────────
Total:                   8450 tokens   ← exceeds 8k context
```

You must make a deterministic decision about what to drop. "Send everything" is not a strategy.

## Assembly pipeline

```
┌────────────────────────────────────────────────────────────────┐
│  All memory cells                                              │
│       │                                                        │
│       ▼                                                        │
│  1. MUST-INCLUDE: constraints (criticality=1.0) ──────────────►┐│
│       │                                                        ││
│       ▼                                                        ││
│  2. MUST-INCLUDE: current task + plan                          ││
│       │                                                        ││
│       ▼                                                        ││
│  3. RANKED: facts by (relevance × recency × criticality)       ││
│       │                                                        ││
│       ▼                                                        ││
│  4. RANKED: observations (most recent 2–3 only)                ││
│       │                                                        ││
│       ▼                                                        ││
│  5. FIT-IN: truncate until under budget                        ││
│       │                                                        ││
│       └────────────────────────────────────── prompt ◄────────┘│
└────────────────────────────────────────────────────────────────┘
```

## Implementation

```typescript
// src/context_assembler.ts
import type { MemoryStateCell, CellStore } from "./memory_cell.js";

const SYSTEM_PROMPT = `You are a case-resolution agent in a regulated financial workflow.
You have access to: getAccount, getTransactions, flagAccount.
Always check constraints before taking destructive actions.`;

export interface AssemblyConfig {
  tokenBudget: number;   // e.g. 6000
  taskScope: string;     // e.g. "case:456"
  maxFacts: number;      // e.g. 8
  maxObs: number;        // e.g. 3
}

export function assembleContext(store: CellStore, task: string, cfg: AssemblyConfig): string {
  const parts: string[] = [SYSTEM_PROMPT, `\nTask: ${task}`];

  // 1. Constraints — always included, never dropped
  const constraints = store.constraints(cfg.taskScope);
  if (constraints.length > 0) {
    parts.push("\n## Active Constraints (MUST be honored)");
    for (const c of constraints) {
      parts.push(`- [${c.source}] ${formatContent(c.content)}`);
    }
  }

  // 2. Facts — ranked by score
  const facts = rankCells(
    store.active({ scope: cfg.taskScope, cellType: "fact" }),
    task,
  ).slice(0, cfg.maxFacts);

  if (facts.length > 0) {
    parts.push("\n## Known Facts");
    for (const f of facts) {
      parts.push(`- [${f.source} @ ${f.createdAt.slice(0, 10)}] ${formatContent(f.content)}`);
    }
  }

  // 3. Recent observations — capped
  const obs = store.active({ scope: cfg.taskScope, cellType: "observation" })
    .slice(-cfg.maxObs);
  if (obs.length > 0) {
    parts.push("\n## Recent Observations");
    for (const o of obs) {
      parts.push(`- [${o.source}] ${truncate(formatContent(o.content), 400)}`);
    }
  }

  const full = parts.join("\n");
  return fitInBudget(full, cfg.tokenBudget);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rankCells(cells: MemoryStateCell[], task: string): MemoryStateCell[] {
  const taskWords = new Set(task.toLowerCase().split(/\W+/));

  return cells
    .map(c => {
      const text = formatContent(c.content).toLowerCase();
      const overlap = text.split(/\W+/).filter(w => taskWords.has(w)).length;
      const ageHours = (Date.now() - new Date(c.createdAt).getTime()) / 3_600_000;
      const recency = 1 / (1 + ageHours);
      const score = overlap + 0.3 * recency + c.criticality;
      return { cell: c, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ cell }) => cell);
}

function fitInBudget(text: string, budget: number): string {
  // Rough estimate: 1 token ≈ 4 chars
  const limit = budget * 4;
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "\n[context truncated to fit token budget]";
}

function formatContent(content: string | Record<string, unknown>): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + "…";
}
```

## Why constraints must never be dropped

```typescript
// Dangerous naive implementation
function naiveAssemble(store: CellStore, budget: number): string {
  const all = store.active({ scope: "case:456" })
    .sort((a, b) => b.criticality - a.criticality); // sorted but then truncated

  let text = SYSTEM_PROMPT;
  for (const cell of all) {
    const candidate = text + "\n" + formatContent(cell.content);
    if (candidate.length > budget * 4) break; // ← constraint may be dropped here!
    text = candidate;
  }
  return text;
}

// If a high-criticality constraint is the 5th item and you hit the budget
// after item 4, the constraint is silently missing from the prompt.

// Fix: inject constraints FIRST before applying budget
```

## Constraint escalation if budget is insufficient

```typescript
function assembleOrEscalate(store: CellStore, task: string, cfg: AssemblyConfig): string | "ESCALATE" {
  const constraintText = store.constraints(cfg.taskScope)
    .map(c => formatContent(c.content))
    .join("\n");

  if (constraintText.length > cfg.tokenBudget * 4 * 0.25) {
    // Constraints alone exceed 25% of budget — this case needs human review
    return "ESCALATE";
  }

  return assembleContext(store, task, cfg);
}
```

## Recency bias: a real benchmark result

From [long-context-bench](https://github.com/adu3110/long-context-bench):

```
Needle position   Accuracy (gpt-4o-mini)
─────────────────────────────────────────
  10% depth         94%
  50% depth         76%
  80% depth         61%   ← constraint buried here gets missed
  95% depth         89%   ← recency kicks in, model sees it again
```

This is why ordering matters. Constraints first. Always.

**Next →** [Tools from Scratch](./07-tools.md)
