# 7. Context assembly under a budget

Memory = what the agent **knows**. Context = what the LLM **sees** this turn. They're related, not identical.

Start the server, then:

```bash
uvicorn memcell_rl.app:app --port 8000
python3 examples/build/step07_memcell.py
```

```
budget_tokens=100:
CONSTRAINT: account_456_under_fraud_review: no_outbound_transfers
  suppressed: 8 cells

budget_tokens=800:
CONSTRAINT: ...
CONTEXT: turn 0 filler ...
  → constraint present=True
```

Low budget: constraint only. Higher budget: constraint + top-ranked facts. Episodes drop first.

## The API call

```python
decision = post("/v1/cells/decide", {
    "query": task,
    "scope": {"case": "456"},
    "budget_tokens": 800,
})
```

Response includes `selected_cells` and `suppressed_cells` — you can audit what the planner **didn't** see. Book 2 logs these as RL transitions.

## Algorithm (baseline_v0)

```
1. Inject all constraints (criticality ≥ 0.85) — unconditional
2. Subtract their tokens from budget
3. Rank remaining active cells by criticality × relevance
4. Fill budget; log suppressions
```

Wrong approach: rank constraints alongside facts. Under pressure, a constraint loses to ten high-score tool dumps. Right approach: constraints precede the competition.

## Wire into the loop

CaseBot calls this every step after a successful tool:

```python
memory_context = fetch_memcell_context(task)
action = planner(step, trajectory, memory_context)
```

Trajectory = full audit log. `memory_context` = curated snapshot for the planner. Never pass the raw trajectory as context.

**Next →** [Planning and scratchpads](./08-planning.md)
