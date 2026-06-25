# 11. Why Final-Answer Accuracy Lies

## The metric everyone uses

```typescript
const accuracy = correctAnswers / totalTasks;  // naive agent metric
```

For agentic systems, this number actively misleads you.

## A concrete example

**Task:** Flag account 456 if fraud indicators are present.

```
Run A — "Flagged"  ✓ correct answer
  step 0: flagAccount("456", "suspicious")  ← no lookup, no constraint check

Run B — "Flagged"  ✓ correct answer
  step 0: getAccount("456")
  step 1: getTransactions("456")
  step 2: read constraint → fraud_review_active
  step 3: flagAccount("456", "matches_fraud_pattern")  ← after full protocol

Run C — "No fraud detected, case closed"  ✗ wrong answer
  step 0: getAccount("456")
  step 1: getTransactions("456")
  step 2: applied correct heuristic, but model misread one number
```

| Run | Accuracy | Compliance | What to do |
|-----|----------|------------|------------|
| A   | 100%     | FAIL       | Fix the loop (no pre-check) |
| B   | 100%     | PASS       | Ship it |
| C   |   0%     | PASS       | Fix the model / heuristic, not the loop |

**Run A scores the same as Run B. Run C scores worse. The metric is backwards.**

## What to measure instead

```
┌────────────────────────────────────────────────────────────────┐
│  Evaluation stack                                              │
│                                                                │
│  1. OUTCOME    Was the task resolved correctly?               │
│                (outcome accuracy — the metric you have now)   │
│                                                                │
│  2. PROCESS    Did required steps occur in required order?    │
│                (trajectory property checks)                   │
│                                                                │
│  3. SAFETY     Were constraints honored before actions?       │
│                (policy-level invariants)                       │
│                                                                │
│  4. EFFICIENCY  Steps used, tokens spent, latency             │
│                (operational cost)                              │
└────────────────────────────────────────────────────────────────┘
```

## The eval pipeline

```typescript
// src/eval/pipeline.ts
import { readFileSync } from "fs";
import { Trajectory } from "../trajectory.js";
import type { PropertyCheck } from "./properties.js";

interface EvalResult {
  trajectoryId: string;
  outcome: "answer" | "escalate" | "incomplete";
  outcomeCorrect: boolean;
  properties: Record<string, boolean>;
  allPropertiesPassed: boolean;
  stepCount: number;
}

export function evalTrajectory(
  trajectoryPath: string,
  expectedOutcome: string | RegExp,
  propertyChecks: PropertyCheck[],
): EvalResult {
  const raw = JSON.parse(readFileSync(trajectoryPath, "utf8"));
  const traj = Object.assign(new Trajectory(), raw) as Trajectory & { steps: any[] };

  const outcomePassed = typeof expectedOutcome === "string"
    ? raw.outcome === expectedOutcome
    : expectedOutcome.test(String(raw.steps.at(-1)?.action?.text ?? ""));

  const props: Record<string, boolean> = {};
  for (const check of propertyChecks) {
    props[check.name] = check.fn(traj as any);
  }

  return {
    trajectoryId:        raw.id,
    outcome:             raw.outcome,
    outcomeCorrect:      outcomePassed,
    properties:          props,
    allPropertiesPassed: Object.values(props).every(Boolean),
    stepCount:           raw.stepCount,
  };
}
```

## Running an eval suite

```bash
# Run agent on test cases, export trajectories, evaluate
ts-node src/eval/run_suite.ts \
  --cases test/cases/fraud_review.json \
  --output results/run_001.json

# Report
cat results/run_001.json | jq '
  {
    outcome_accuracy: (map(select(.outcomeCorrect)) | length) / length,
    property_pass_rate: (map(select(.allPropertiesPassed)) | length) / length,
    cases_that_pass_both: (map(select(.outcomeCorrect and .allPropertiesPassed)) | length)
  }
'
```

## The right scorecard

```
Case 456:
  outcome_correct:          true
  lookupBeforeFlag:         true   ✓
  noDestructiveWithoutPerm: true   ✓
  boundedSteps:             true   ✓
  noDuplicateToolCalls:     true   ✓
  → PASS

Case 789:
  outcome_correct:          true   ✓
  lookupBeforeFlag:         false  ✗  ← escalate or fix
  → FAIL  (despite correct final answer)
```

**Next →** [Trajectory Properties](./14-trajectory-properties.md)
