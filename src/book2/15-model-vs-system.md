# 15. Model Failure vs System Failure

## Same wrong answer, different fixes

| Symptom | Likely layer | Fix |
|---------|--------------|-----|
| Wrong fact in answer | Model / reasoning | Better model, prompt, or CoT |
| Right fact in memory, wrong in answer | Context assembly | Fix ranking, ordering |
| Fact never in memory | Tool / write path | Fix tool call or memory write |
| Constraint in memory, violated in action | Policy / permissions | Gate before tool dispatch |
| Two agents disagree | Coordination | Ledger + conflict resolution (Book 3) |

## Diagnostic workflow

1. Export trajectory + memory snapshot at failure step
2. Check: was correct information **ever stored**?
3. Check: was it **in context** at decision step?
4. Check: did **tools return** expected data?
5. Only then blame the LLM

## Failure taxonomy (use in postmortems)

```
MODEL       — bad reasoning despite good context
RETRIEVAL   — wrong cells selected for context
MEMORY      — write/supersede/forget bug
TOOL        — API error, schema mismatch, stale data
PLANNING    — wrong step order, no replan
POLICY      — permission or constraint gate missing
COORDINATION — multi-agent conflict (Book 3)
```

Tag every production incident. Patterns emerge fast.

**Next →** [Long-Context Failure Modes](./16-long-context.md)
