# 30. Cost and Latency Control

## Agents spend money in loops

Each step = LLM call + tool API + memory decide. Unbounded loops burn budget.

## Controls

| Control | Mechanism |
|---------|-----------|
| Step cap | `max_steps` in loop |
| Token cap | Context assembly budget |
| Tool cap | Max calls per case |
| Model routing | Small model for plan, large for final answer |
| Cache | Memoize idempotent tool reads |

```python
if case.total_tokens > TOKEN_BUDGET:
    escalate("token_budget_exceeded")
```

## Parallelism (careful)

Read-only tools (`get_account`, `get_transactions`) can parallelize. Destructive tools serialize.

Parallel without ledger ordering → conflicts increase. Book 3 pattern: parallel read, serial write.

## Measure per case

Log:

```python
metrics = {
    "llm_calls": 7,
    "tool_calls": 3,
    "total_tokens": 12400,
    "latency_ms": 8900,
    "estimated_cost_usd": 0.04,
}
```

Optimize what you measure.

**Next →** [Multi-Agent Orchestration](./31-orchestration.md)
