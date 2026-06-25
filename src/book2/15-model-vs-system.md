# 13. Model Failure vs System Failure

## Same symptom, completely different fix

```
Symptom: agent gave wrong answer

Possible causes:
  A. LLM reasoned wrong despite good context        → model failure
  B. Right data in memory, wrong data in context    → retrieval failure
  C. Correct data never stored in the first place   → memory write failure
  D. Constraint present but violated anyway         → policy / permission failure
  E. Two agents disagreed and neither resolved it   → coordination failure (Book 3)
```

Fixing A (prompt tuning) when the real cause is C (tool write path) wastes weeks.

## Diagnostic flowchart

```
Wrong answer reported
        │
        ▼
Was the correct information ever stored in memory?
        │
        ├── NO  →  tool failed? memory.write() missing? schema mismatch?
        │           → fix: memory write path
        │
        └── YES
              │
              ▼
        Was it in the context snapshot at decision step?
              │
              ├── NO  →  ranking dropped it? token budget? wrong scope?
              │           → fix: context assembly
              │
              └── YES
                    │
                    ▼
              Did the tool return correct data?
                    │
                    ├── NO  →  API error? stale cache? mocked wrong?
                    │           → fix: tool implementation
                    │
                    └── YES
                          │
                          ▼
                    Did a constraint exist but get violated?
                          │
                          ├── YES  →  permission gate missing, policy not enforced
                          │           → fix: stop condition or tool gate
                          │
                          └── NO   →  genuine model reasoning failure
                                       → fix: model, prompt, CoT, temperature
```

## Implement the diagnostic in TypeScript

```typescript
// src/eval/diagnostics.ts
import type { Trajectory } from "../trajectory.js";
import type { MemoryStore } from "../memory.js";

export type FailureCategory =
  | "model_reasoning"
  | "retrieval"
  | "memory_write"
  | "tool_error"
  | "policy_violation"
  | "coordination";

export interface Diagnosis {
  category: FailureCategory;
  evidence: string;
  fix: string;
}

export function diagnose(params: {
  traj: Trajectory;
  memoryAtDecisionStep: object;    // snapshot at the failing step
  expectedKeyInContext: string;    // what should have been visible
  toolErrors: string[];            // any tool failure messages
  constraintViolated: boolean;
}): Diagnosis {
  const { traj, toolErrors, constraintViolated, expectedKeyInContext, memoryAtDecisionStep } = params;

  if (constraintViolated) {
    return {
      category: "policy_violation",
      evidence: `Constraint active but action not gated`,
      fix: "Add stop condition: destructiveWithoutApprovalCondition",
    };
  }

  if (toolErrors.length > 0) {
    return {
      category: "tool_error",
      evidence: toolErrors.join("; "),
      fix: "Check tool implementation and API connectivity",
    };
  }

  const contextStr = JSON.stringify(memoryAtDecisionStep);
  if (!contextStr.includes(expectedKeyInContext)) {
    const wasEverStored = traj.steps.some(
      s => JSON.stringify(s.result?.data ?? "").includes(expectedKeyInContext),
    );
    if (!wasEverStored) {
      return {
        category: "memory_write",
        evidence: `"${expectedKeyInContext}" never appeared in any tool result`,
        fix: "Verify the tool returns this field; check memory.writeObservation()",
      };
    }
    return {
      category: "retrieval",
      evidence: `"${expectedKeyInContext}" was stored but not in context at decision step`,
      fix: "Increase criticality, fix scope filter, or reduce context pressure",
    };
  }

  return {
    category: "model_reasoning",
    evidence: "Correct data was in context; model reached wrong conclusion",
    fix: "Adjust model, temperature, CoT prompt, or add explicit reasoning step",
  };
}
```

## Failure taxonomy for postmortems

```
Use this taxonomy in every production incident ticket:

CATEGORY          FIRST THING TO CHECK
──────────────────────────────────────────────────────────────
model_reasoning   Was context fully correct at failing step?
retrieval         Was data in store? Was criticality too low?
memory_write      Did the tool actually return the field?
tool_error        Tool logs, API status, schema mismatch
policy_violation  Which stop condition was missing?
coordination      Which agent wrote the conflicting entry? (Book 3)
```

## Real example: fee waiver incident

```
Incident: CaseBot waived a $50 fee on account 567 without supervisor approval.

Step 1: Get account → stored fact: { balance: 50.00, fee_owed: 50.00 }
Step 2: Get transactions → stored fact: { last_payment: "2023-01-01" }
Step 3: waivedFee("567", "customer_hardship")  ← no constraint check

Diagnosis:
  - constraint "fee_waiver_requires_approval" was set as criticality: 0.5
  - context assembled under token pressure dropped it (ranked below balance fact)
  - stop condition destructiveWithoutApprovalCondition was not wired in

Category: policy_violation (+ retrieval contributing factor)
Fix:
  1. Set constraint criticality to 1.0
  2. Wire in destructiveWithoutApprovalCondition for waivedFee
  3. Add property check: constraintHonoredBeforeWaiver
```

**Next →** [Long-Context Failure Modes](./16-long-context.md)
