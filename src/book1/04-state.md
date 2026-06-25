# 3. State: Chat History Is Not Memory

## The confusion

```
chat history  ≠  context window  ≠  memory
```

```
┌──────────────────────────────────────────────────────────────────┐
│  CHAT HISTORY                                                    │
│  Ordered array of messages. Grows every turn.                    │
│  { role: "user" | "assistant", content: string }[]               │
├──────────────────────────────────────────────────────────────────┤
│  CONTEXT WINDOW                                                  │
│  Subset sent to the LLM this turn. Budget-limited (~8k tokens).  │
│  Chapter 5 controls selection.                                   │
├──────────────────────────────────────────────────────────────────┤
│  MEMORY / STATE                                                  │
│  Structured program state the agent explicitly maintains.        │
│  Typed. Queryable. Durable. Does not grow unbounded.             │
└──────────────────────────────────────────────────────────────────┘
```

## Why chat history fails as memory

```
turn  1:  "Account 456 is under fraud review. No outbound transfers."
turn  2:  getAccount("456") → { balance: 142.50, status: "active" }
...
turn 28:  agent initiates outbound transfer of $500
          ← turn 1's constraint is now 4000 tokens back
          ← recent observations dominated attention
          ← constraint violated
```

This is not a prompt engineering problem. It is a **memory architecture problem**. The constraint was never stored as a durable, typed object — it was a message that got buried.

## The fix: explicit typed state store

```typescript
// src/memory.ts

export type MemoryKind = "constraint" | "fact" | "observation" | "plan" | "scratch";
export type MemoryStatus = "active" | "superseded" | "quarantined" | "expired";

export interface MemoryEntry {
  id: string;
  key: string;
  value: unknown;
  kind: MemoryKind;
  source: string;          // "user" | "tool:getAccount" | "policy"
  criticality: number;     // 0.0–1.0; 1.0 = always injected
  createdAt: string;
  expiresAt?: string;
  status: MemoryStatus;
}

export interface MemorySnapshot {
  task: unknown;
  constraints: MemoryEntry[];
  facts: MemoryEntry[];
  plan: MemoryEntry[];
  recentObservations: MemoryEntry[];
}

export class MemoryStore {
  private entries: MemoryEntry[] = [];
  private seq = 0;

  write(params: {
    key: string;
    value: unknown;
    kind: MemoryKind;
    source: string;
    criticality?: number;
    expiresAt?: string;
  }): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem_${++this.seq}`,
      status: "active",
      criticality: 0.5,
      createdAt: new Date().toISOString(),
      ...params,
    };
    this.entries.push(entry);
    return entry;
  }

  writeTask(task: string): void {
    this.write({ key: "currentTask", value: task, kind: "plan", source: "user", criticality: 1.0 });
  }

  writeObservation(tool: string, result: unknown): void {
    this.write({
      key: `obs_${tool}_${this.seq}`,
      value: result,
      kind: "observation",
      source: `tool:${tool}`,
      criticality: 0.4,
    });
  }

  supersede(key: string, newValue: unknown, source: string): void {
    // Mark old entries superseded — keep for audit
    for (const e of this.entries) {
      if (e.key === key && e.status === "active") e.status = "superseded";
    }
    this.write({ key, value: newValue, kind: "fact", source, criticality: 0.6 });
  }

  quarantine(key: string): void {
    for (const e of this.entries) {
      if (e.key === key && e.status === "active") e.status = "quarantined";
    }
  }

  getActive(kind?: MemoryKind): MemoryEntry[] {
    return this.entries.filter(
      e => e.status === "active" && (kind == null || e.kind === kind),
    );
  }

  getConstraints(): MemoryEntry[] {
    return this.getActive("constraint");
  }

  snapshot(): MemorySnapshot {
    const obs = this.getActive("observation");
    return {
      task: this.getValue("currentTask"),
      constraints: this.getActive("constraint"),
      facts: this.getActive("fact"),
      plan: this.getActive("plan"),
      recentObservations: obs.slice(-3),
    };
  }

  private getValue(key: string): unknown {
    return [...this.entries].reverse().find(e => e.key === key && e.status === "active")?.value;
  }
}
```

## Writing a constraint that survives 40 turns

```typescript
const memory = new MemoryStore();

// Turn 1: user establishes constraint
memory.write({
  key: "fraudReview456",
  value: { accountId: "456", restriction: "no_outbound_transfers" },
  kind: "constraint",
  source: "user",
  criticality: 1.0,   // ← always injected, even under token pressure
});

// ... 40 turns of tool calls and observations ...

// Turn 41: context assembler still sees this
const snapshot = memory.snapshot();
console.log(snapshot.constraints.length); // 1 — still there
console.log(snapshot.constraints[0].status); // "active"
```

## Memory lifecycle

```
write()
  │
  ├── active ──── supersede(key, newValue) ──► superseded  (kept for audit)
  │
  ├── active ──── quarantine(key) ──────────► quarantined  (conflict, needs resolution)
  │
  └── active ──── expiresAt reached ────────► expired      (excluded from context)
```

### Example: balance changes mid-case

```typescript
// Initial account data
memory.write({
  key: "balance456",
  value: { usd: 142.50, asOf: "2024-06-20T10:00:00Z" },
  kind: "fact",
  source: "tool:getAccount",
  criticality: 0.6,
});

// ... later, balance changes ...

memory.supersede(
  "balance456",
  { usd: 97.25, asOf: "2024-06-20T14:30:00Z" },
  "tool:getAccount",
);
// Old entry now has status: "superseded"
// New entry is active with updated value
```

## What belongs in each kind

```
constraint   Hard rule — survives context pressure, never dropped
             "never waive fee without approval"
             "account 456: no outbound transfers"

fact         World state with a timestamp; may be superseded
             Account balance, transaction list, risk score

plan         Current task, steps, progress tracker

observation  Raw tool output — may be large, low priority
             Compressible; only recent 3 injected by default

scratch      Planner working notes — discarded after case closes
```

## Anti-pattern: summarise-to-remember

```typescript
// Feels like memory. Loses: structure, provenance, timestamps, auditability.
const "memory" = await llm.summarise(messages);

// Use summarisation only for context compression (Chapter 5),
// never as the primary state store.
```

**Companion:** `stateful-agent-lab/src/memory.ts`

**Next →** [Typed Memory Objects](./05-typed-memory.md)
