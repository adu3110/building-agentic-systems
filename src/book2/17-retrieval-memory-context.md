# 15. Retrieval vs Memory vs Context

## Three things agents confuse

```
┌─────────────────────────────────────────────────────────────────────┐
│  RETRIEVAL                                                          │
│  Fetching semantically similar chunks from a vector index at        │
│  query time. Stateless. Results vary per query.                     │
│  "Find me facts about account 456"                                  │
├─────────────────────────────────────────────────────────────────────┤
│  MEMORY                                                             │
│  Typed, named, durable state the agent explicitly maintains.        │
│  Deterministic lookup. Survives turns, replans, restarts.           │
│  memory.getConstraints("case:456") → same result every time         │
├─────────────────────────────────────────────────────────────────────┤
│  CONTEXT                                                            │
│  What is actually in the prompt window this turn.                   │
│  Assembled from memory (+ optional retrieval) under token budget.   │
│  Ephemeral — not stored, not persisted.                             │
└─────────────────────────────────────────────────────────────────────┘
```

## When to use each

```
Constraint "no outbound transfers"      → MEMORY  (deterministic, criticality 1.0)
Account balance fetched from API        → MEMORY  (typed fact, supersedable)
Business policy doc (PDF, 200 pages)    → RETRIEVAL  (too large for context)
Agent's current decision               → CONTEXT  (in this prompt only)
Past case summaries for reference      → RETRIEVAL + selective MEMORY
```

## Retrieval is not a substitute for memory

```typescript
// Anti-pattern: use retrieval for everything
async function getConstraints(caseId: string): Promise<string[]> {
  return await vectorDB.query(`constraints for case ${caseId}`);
  // Problems:
  //   - non-deterministic: may miss a constraint
  //   - no criticality: no guarantee it appears in context
  //   - no status: can return superseded / quarantined entries
  //   - expensive: embedding call every turn
}

// Correct: constraints live in typed memory
function getConstraints(caseId: string, store: CellStore): MemoryStateCell[] {
  return store.constraints(caseId);  // always returns all active constraints
}
```

## Hybrid: retrieval for background knowledge

For large knowledge bases (e.g. policy documents), retrieval fills in facts that are too bulky to store as typed cells.

```typescript
// src/hybrid_assembler.ts
import type { CellStore } from "./memory_cell.js";

interface VectorChunk {
  text: string;
  score: number;
  source: string;
}

interface VectorDB {
  query(text: string, topK: number): Promise<VectorChunk[]>;
}

export async function assembleHybridContext(params: {
  store: CellStore;
  vectorDB: VectorDB;
  task: string;
  scope: string;
  budget: number;
}): Promise<string> {
  const parts: string[] = [];
  const budgetChars = params.budget * 4;
  let used = 0;

  // 1. Constraints — mandatory, budget overrides
  const constraints = params.store.constraints(params.scope);
  const constraintBlock = constraints
    .map(c => `[constraint] ${typeof c.content === "string" ? c.content : JSON.stringify(c.content)}`)
    .join("\n");
  parts.push(`## Constraints\n${constraintBlock}`);
  used += constraintBlock.length;

  // 2. Typed facts from memory
  const facts = params.store.active({ scope: params.scope, cellType: "fact" });
  const factBlock = facts.map(f => `[fact:${f.source}] ${JSON.stringify(f.content)}`).join("\n");
  if (used + factBlock.length < budgetChars * 0.6) {
    parts.push(`## Known Facts\n${factBlock}`);
    used += factBlock.length;
  }

  // 3. Retrieved policy chunks for remaining budget
  const remaining = budgetChars - used;
  if (remaining > 500) {
    const chunks = await params.vectorDB.query(params.task, 3);
    const retrieved = chunks
      .filter(c => c.score > 0.75)
      .map(c => `[policy:${c.source}] ${c.text}`)
      .join("\n");
    const trimmed = retrieved.slice(0, remaining);
    parts.push(`## Relevant Policy\n${trimmed}`);
  }

  return parts.join("\n\n");
}
```

## What lives where in CaseBot

```
Store                What                       Why
──────────────────────────────────────────────────────────────
CellStore            constraints, facts, plan   Typed, critical, deterministic
VectorDB             policy documents           Large, background, fuzzy-match ok
Context (per turn)   Assembled slice of above   Ephemeral, budget-capped
```

**Next →** [Memory Policies and Forgetting](./18-memory-policies.md)
