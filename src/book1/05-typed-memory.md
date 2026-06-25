# 4. Typed Memory Objects

## Adding scope, sensitivity, and cell type

Chapter 3's `MemoryEntry` works for one agent on one case. Production adds three fields that become critical at scale: **scope** (which case / user owns this), **sensitivity** (who can read it), and stricter **cellType** semantics.

```
┌────────────────────────────────────────────────────────────────┐
│  MemoryStateCell                                               │
│                                                                │
│  id            string (UUID)                                   │
│  cellType      "constraint" | "fact" | "preference" | "episode"│
│  scope         "case:456" | "user:789" | "global"              │
│  content       string | Record<string, unknown>                │
│  status        "active" | "superseded" | "quarantined"         │
│  sensitivity   "public" | "internal" | "pii" | "restricted"    │
│  criticality   0.0–1.0  retention priority under token budget  │
│  createdAt     ISO timestamp                                    │
│  expiresAt?    optional TTL                                     │
│  source        "user" | "tool:X" | "policy:Y"                  │
└────────────────────────────────────────────────────────────────┘
```

## Full implementation

```typescript
// src/memory_cell.ts
import { randomUUID } from "crypto";

export type CellType    = "constraint" | "fact" | "preference" | "episode";
export type CellStatus  = "active" | "superseded" | "quarantined" | "expired";
export type Sensitivity = "public" | "internal" | "pii" | "restricted";

const SENSITIVITY_ORDER: Sensitivity[] = ["public", "internal", "pii", "restricted"];

export interface MemoryStateCell {
  id:          string;
  cellType:    CellType;
  scope:       string;
  content:     string | Record<string, unknown>;
  source:      string;
  sensitivity: Sensitivity;
  criticality: number;
  status:      CellStatus;
  createdAt:   string;
  expiresAt?:  string;
}

function makeCell(params: Omit<MemoryStateCell, "id" | "status" | "createdAt">): MemoryStateCell {
  return { id: randomUUID(), status: "active", createdAt: new Date().toISOString(), ...params };
}

export class CellStore {
  private cells: MemoryStateCell[] = [];

  // ── Write ────────────────────────────────────────────────────────────────

  write(cell: MemoryStateCell): MemoryStateCell {
    this.cells.push(cell);
    return cell;
  }

  constraint(scope: string, content: string, source = "policy", criticality = 1.0) {
    return this.write(makeCell({ cellType: "constraint", scope, content, source,
      sensitivity: "internal", criticality }));
  }

  fact(scope: string, content: Record<string, unknown>, source = "tool", sensitivity: Sensitivity = "internal") {
    return this.write(makeCell({ cellType: "fact", scope, content, source,
      sensitivity, criticality: 0.6 }));
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  supersede(cellId: string, newContent: unknown, source: string): MemoryStateCell {
    const old = this.byId(cellId);
    if (old) old.status = "superseded";
    return this.write(makeCell({
      cellType: old?.cellType ?? "fact",
      scope: old?.scope ?? "global",
      content: newContent as string,
      source,
      sensitivity: old?.sensitivity ?? "internal",
      criticality: old?.criticality ?? 0.5,
    }));
  }

  quarantine(cellId: string): void {
    const cell = this.byId(cellId);
    if (cell) cell.status = "quarantined";
  }

  expireByScope(scope: string): number {
    let count = 0;
    for (const c of this.cells) {
      if (c.scope === scope && c.status === "active") { c.status = "expired"; count++; }
    }
    return count;
  }

  // ── Query ────────────────────────────────────────────────────────────────

  active(params: {
    scope?: string;
    cellType?: CellType;
    maxSensitivity?: Sensitivity;
  } = {}): MemoryStateCell[] {
    return this.cells.filter(c => {
      if (c.status !== "active") return false;
      if (params.scope && c.scope !== params.scope && c.scope !== "global") return false;
      if (params.cellType && c.cellType !== params.cellType) return false;
      if (params.maxSensitivity) {
        const allowed = SENSITIVITY_ORDER.indexOf(params.maxSensitivity);
        if (SENSITIVITY_ORDER.indexOf(c.sensitivity) > allowed) return false;
      }
      return true;
    });
  }

  constraints(scope: string): MemoryStateCell[] {
    return this.active({ scope, cellType: "constraint" });
  }

  private byId(id: string): MemoryStateCell | undefined {
    return this.cells.find(c => c.id === id);
  }
}
```

## Scoping: the most-missed feature

Every cell has a `scope`. Mixing scopes causes cross-case leakage — one of the most common production bugs.

```typescript
// Case 456 opens
store.constraint("case:456", "fraud_review_active");

// Case 457 opens (different customer)
store.constraint("case:457", "fee_waiver_allowed");

// Agent answering case 457 must query only case 457
const wrong = store.active();                           // ← gets both cases
const right  = store.active({ scope: "case:457" });    // ← only 457 + global
```

**Never call `store.active()` without a scope in production.**

## Sensitivity gating

An `InvestigatorAgent` cannot see PII:

```typescript
// InvestigatorAgent: public + internal only
const investigatorView = store.active({
  scope: "case:456",
  maxSensitivity: "internal",   // pii and restricted excluded
});

// AuditorAgent: full access
const auditView = store.active({
  scope: "case:456",
  maxSensitivity: "restricted",
});
```

## CaseBot: a complete write sequence

```typescript
const store = new CellStore();

// 1. Policy fires at case open
store.constraint(
  "case:456",
  "account_under_fraud_review:no_outbound_transfers",
  "policy:fraud_engine",
  1.0,
);

// 2. Tool returns account data
const accountResult = await tools.run("getAccount", { accountId: "456" });
const factCell = store.fact(
  "case:456",
  { accountId: "456", ...accountResult.data as object },
  "tool:getAccount",
  "internal",
);

// 3. Balance changes mid-case → supersede, never delete
const updated = await tools.run("getAccount", { accountId: "456" });
store.supersede(factCell.id, updated.data, "tool:getAccount");

// 4. Verify
console.log(store.constraints("case:456").length);   // 1, still active
console.log(store.active({ scope: "case:456", cellType: "fact" }).length); // 1 (new)
// Old fact still in cells array with status: "superseded" — audit trail preserved
```

## memcell-rl: the HTTP API version

The same architecture as an HTTP microservice. The agent calls it over localhost; state survives process restarts.

```bash
# Start the server
uvicorn memcell_rl.app:app --port 8000

# Write a constraint
curl -s -X POST http://localhost:8000/v1/cells/write \
  -H "Content-Type: application/json" \
  -d '{
    "cell_type": "constraint",
    "scope": "case:456",
    "content": "no_outbound_transfers",
    "source": "policy",
    "criticality": 1.0
  }'

# Fetch active cells for the case
curl "http://localhost:8000/v1/cells/list?scope=case:456&cell_type=constraint"
```

**Companion:** [memcell-rl](https://github.com/adu3110/memcell-rl)

**Next →** [Context Assembly Under a Token Budget](./06-context-assembly.md)
