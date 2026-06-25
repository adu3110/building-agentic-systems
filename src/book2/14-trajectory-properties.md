# 12. Trajectory Properties

## Properties are boolean invariants over steps

A **metric** is a number. A **property** is a pass/fail contract.

```typescript
// src/eval/properties.ts
import type { Trajectory } from "../trajectory.js";

export interface PropertyCheck {
  name: string;
  fn: (traj: Trajectory) => boolean;
}

// ── 1. Required ordering ──────────────────────────────────────────────────────

export const lookupBeforeFlag: PropertyCheck = {
  name: "lookup_before_flag",
  fn: (traj) => {
    const tools = traj.toolsUsed();
    if (!tools.includes("flagAccount")) return true;
    const lookupIdx = tools.findIndex(t => t === "getAccount");
    const flagIdx   = tools.findIndex(t => t === "flagAccount");
    return lookupIdx !== -1 && lookupIdx < flagIdx;
  },
};

// ── 2. No destructive action without prior permission check ───────────────────

export const destructiveRequiresLookup: PropertyCheck = {
  name: "destructive_requires_lookup",
  fn: (traj) => {
    const steps = traj.steps;
    const flagStep = steps.findIndex(s => s.action?.tool === "flagAccount");
    if (flagStep === -1) return true;
    return steps.slice(0, flagStep).some(s => s.action?.tool === "getAccount");
  },
};

// ── 3. Bounded execution ──────────────────────────────────────────────────────

export const stepsWithinBudget = (max: number): PropertyCheck => ({
  name: `steps_within_${max}`,
  fn: (traj) => traj.steps.length <= max,
});

// ── 4. No duplicate tool calls ────────────────────────────────────────────────

export const noDuplicateToolCalls: PropertyCheck = {
  name: "no_duplicate_tool_calls",
  fn: (traj) => {
    const sigs = traj.steps
      .filter(s => s.actionType === "toolCall")
      .map(s => JSON.stringify({ tool: s.action?.tool, args: s.action?.args }));
    return new Set(sigs).size === sigs.length;
  },
};

// ── 5. All tool calls succeeded ───────────────────────────────────────────────

export const allToolCallsSucceeded: PropertyCheck = {
  name: "all_tool_calls_succeeded",
  fn: (traj) => traj.failedToolCalls() === 0,
};

// ── 6. Answer before escalate ─────────────────────────────────────────────────

export const answeredOrEscalated: PropertyCheck = {
  name: "answered_or_escalated",
  fn: (traj) => {
    const outcome = traj.outcome();
    return outcome === "answer" || outcome === "escalate";
  },
};

// ── 7. No PII in logs (regex check on trajectory JSON) ────────────────────────

export const noPIILeaked = (piiPatterns: RegExp[]): PropertyCheck => ({
  name: "no_pii_leaked",
  fn: (traj) => {
    const json = JSON.stringify(traj.export());
    return !piiPatterns.some(p => p.test(json));
  },
});
```

## Composing a property suite

```typescript
// src/eval/casebot_suite.ts
import type { PropertyCheck } from "./properties.js";
import {
  lookupBeforeFlag,
  destructiveRequiresLookup,
  stepsWithinBudget,
  noDuplicateToolCalls,
  allToolCallsSucceeded,
  answeredOrEscalated,
  noPIILeaked,
} from "./properties.js";

export const CASEBOT_PROPERTIES: PropertyCheck[] = [
  lookupBeforeFlag,
  destructiveRequiresLookup,
  stepsWithinBudget(12),
  noDuplicateToolCalls,
  answeredOrEscalated,
  noPIILeaked([/\b\d{16}\b/]),  // no raw credit card numbers in logs
];
```

## What each property catches

```
lookupBeforeFlag
  catches: agent infers from scratchpad instead of calling getAccount
  impact:  wrong data, compliance failure

destructiveRequiresLookup
  catches: flagAccount called without prior data fetch
  impact:  wrong flag, regulatory exposure

stepsWithinBudget(12)
  catches: infinite loops, confused planners
  impact:  cost, latency, repeated tool charges

noDuplicateToolCalls
  catches: planner confusion, retry loops without backoff
  impact:  cost, API rate limits

noPIILeaked
  catches: raw SSN or card numbers in exported trajectory file
  impact:  data breach, compliance violation
```

## Running properties on a trajectory file

```typescript
// src/eval/check.ts
import { readFileSync } from "fs";
import { CASEBOT_PROPERTIES } from "./casebot_suite.js";

const path = process.argv[2];
const raw  = JSON.parse(readFileSync(path, "utf8"));

let allPass = true;
for (const check of CASEBOT_PROPERTIES) {
  const pass = check.fn(raw as any);
  console.log(`${pass ? "✓" : "✗"} ${check.name}`);
  if (!pass) allPass = false;
}
process.exit(allPass ? 0 : 1);
```

```bash
ts-node src/eval/check.ts logs/case456.json
# ✓ lookup_before_flag
# ✓ destructive_requires_lookup
# ✓ steps_within_12
# ✓ no_duplicate_tool_calls
# ✓ answered_or_escalated
# ✓ no_pii_leaked
```

**Companion:** [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch)

**Next →** [Model Failure vs System Failure](./15-model-vs-system.md)
