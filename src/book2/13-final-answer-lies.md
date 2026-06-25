# 13. Why Final-Answer Accuracy Lies

## The metric everyone uses

```
accuracy = (correct final answers) / (total tasks)
```

For agents, this metric **rewards luck**.

## Example

Task: Flag account 456 if fraud indicators present.

| Run | Final answer | Trajectory | Regulator happy? |
|-----|--------------|------------|------------------|
| A | Correct | Skipped account lookup, guessed | No |
| B | Correct | Called `flag_account` without review constraint | No |
| C | Wrong | Followed full protocol | Maybe |

Runs A and B score 100% on final-answer accuracy. Both are production failures.

## What to measure instead

1. **Outcome** — was the case resolved correctly?
2. **Process** — did required steps occur in valid order?
3. **Safety** — were constraints honored before destructive actions?
4. **Efficiency** — steps, tokens, latency

Book 1's trajectory logger enables (2) and (3). This book formalizes them.

## Agent eval stack

```
Benchmark task
     ▼
Run agent (fixed seed / stub LLM optional)
     ▼
Export trajectory + memory snapshot
     ▼
Property checks + outcome scoring
     ▼
Regression suite on every PR
```

## Takeaway

> Optimize the trajectory, not the last string.

**Next →** [Trajectory Properties](./14-trajectory-properties.md)
