# 5. Context Assembly Under a Token Budget

Context assembly is the step nobody talks about until it causes an incident. The LLM doesn't read memory. It reads a prompt. Context assembly is the deterministic function that decides what goes into that prompt, given everything you know and a fixed token budget.

Get this wrong and your constraints disappear under load. Get it right and you have predictable, auditable context at every step.

## The problem is always budget

Here's the math at step 15 of case 456:

```
System prompt:                  300 tokens
Task description:               200 tokens
Active constraint × 2:          160 tokens   ← must include, non-negotiable
Account balance fact:            80 tokens
Transaction list:               320 tokens
KYC status fact:                 90 tokens
Linked accounts fact:           200 tokens
Episode summary × 4:            600 tokens   ← compressible
───────────────────────────────────────────
Total if we send everything:   1950 tokens

Your budget:                    800 tokens
Deficit:                       1150 tokens   ← something must be dropped
```

"Send everything" costs money and degrades performance (longer context → slower response, more tokens billed). "Send nothing" breaks the agent. The assembler's job is to fill the budget with the highest-priority content.

## The selection algorithm

memcell-rl's `baseline_v0` runs five steps in order:

```
1. INJECT constraints unconditionally (criticality ≥ 0.85)
   → These enter regardless of budget. They cannot be dropped.

2. CALCULATE remaining budget
   used = tokens(system_prompt) + tokens(task) + tokens(constraints)
   remaining = budget_tokens - used

3. RANK all other active cells
   score = criticality × recency_factor × query_relevance
   recency_factor = 1.0 for cells written this turn, decays by ~0.1/turn
   query_relevance = cosine similarity of content embedding to task query

4. FILL remaining budget
   for cell in sorted(cells, key=score, descending):
       if tokens(cell) <= remaining:
           selected.append(cell)
           remaining -= tokens(cell)

5. RETURN selected + record suppressed (for RL logging)
```

Step 1 is the crucial guarantee: **constraints are not ranked**. They don't compete with facts. They're injected before the budget calculation for the rest.

## What `decide()` actually returns

```python
decision = memcell_post("/v1/cells/decide", {
    "query": "Review account 456 for fraud indicators",
    "scope": {"case": "456"},
    "budget_tokens": 800,
    "k": 10,
})
```

Response:

```json
{
  "query_id": "qry_abc123",
  "transition_id": "tr_def456",
  "selected_cells": [
    {
      "cell_id": "cell_001",
      "mode": "constraint",
      "score": 0.950,
      "reason": "hard rule — always inject"
    },
    {
      "cell_id": "cell_002",
      "mode": "context",
      "score": 0.712,
      "reason": "high criticality, relevant to query"
    },
    {
      "cell_id": "cell_003",
      "mode": "context",
      "score": 0.431,
      "reason": "medium criticality, moderate relevance"
    }
  ],
  "suppressed_cells": [
    {
      "cell_id": "cell_004",
      "reason": "budget_exhausted",
      "criticality": 0.15
    },
    {
      "cell_id": "cell_005",
      "reason": "expired",
      "criticality": 0.60
    }
  ]
}
```

Two types of suppression: `budget_exhausted` (low-criticality cell lost the ranking race) and `expired` (cell's `valid_until` passed). Both are logged as RL transitions — Book 2 shows how to learn from these decisions.

## Building the context string

CaseBot's `fetch_memcell_context()`:

```python
def fetch_memcell_context(task: str) -> str:
    resp = memcell_post("/v1/cells/decide", {
        "query": task,
        "scope": {"case": "456"},
        "budget_tokens": 800,
        "k": 10,
    })
    if not resp or "selected_cells" not in resp:
        return "[memory unavailable]"

    lines = []
    for sel in resp["selected_cells"]:
        cell = memcell_post("/v1/cells/get", {"cell_id": sel["cell_id"]})
        if not cell:
            continue
        if sel["mode"] == "constraint":
            lines.append(f"CONSTRAINT: {cell['content']}")
        else:
            lines.append(f"CONTEXT: {cell['content']}")

    return "\n".join(lines) if lines else "[no context]"
```

What the planner actually receives:

```
CONSTRAINT: account_456_under_fraud_review — no_outbound_transfers until review closes
CONTEXT: {"account_id": "456", "status": "active", "balance_usd": 142.5, "fraud_review": true}
CONTEXT: {"transactions": [{"txn_id": "t1", "amount_usd": 50.0, "status": "settled"}, ...]}
```

Constraints first, labeled. Facts second. Nothing from other cases. Nothing expired. Nothing over budget.

## What breaks when you skip this

**The naive approach:** pass the last N tool results to the planner.

```python
# Naive — works for 5 turns, breaks for 50
def naive_context(trajectory):
    last_3 = trajectory.steps[-3:]
    return "\n".join(str(s.result) for s in last_3 if s.result)
```

Problems:

1. **Constraints written at turn 1 never appear after turn 4.** The sliding window moved on.

2. **Two stale values for the same fact.** Turn 2: balance $142.50. Turn 8: balance updated to $97.25. With a naive window, both can appear. The model sees two balances and guesses.

3. **No scope isolation.** If you're running multiple cases in the same process (workers), tool results from case 789 can appear in case 456's context.

4. **No suppression log.** When something goes wrong, you have no record of what was in context at the failing step. With `decide()`, you have `query_id` and `transition_id` — you can reconstruct exactly what the planner saw.

## The constraint injection guarantee

I want to spell this out because it's the most important part:

```python
# Wrong — constraints compete with facts for budget
cells = sorted(all_active_cells, key=lambda c: c.score, reverse=True)
selected = cells[:budget_k]  # constraint might get dropped if many high-score facts

# Right — constraints are never in the competition
constraints = [c for c in cells if c.type == "constraint"]  # always in
ranked_rest  = sorted([c for c in cells if c.type != "constraint"], key=lambda c: c.score)
selected = constraints + fill_budget(ranked_rest, budget - tokens(constraints))
```

If you have 10 constraints and the system prompt takes 600 tokens, and your budget is 800, you have 200 tokens left for ranked cells. The assembler fills those 200 tokens with the highest-scoring facts. No constraint gets dropped to make room.

## Why `budget_tokens: 800`?

It's a parameter, not a magic number. The right value depends on your model and use case. The tradeoffs:

```
Small budget (200):  fast, cheap, constraint-only context
  → good for simple lookups where extra facts don't help
  → bad for complex cases where the model needs account history

Medium budget (800): CaseBot default — constraints + top 3-4 facts
  → handles 80% of case types well
  → misses long transaction histories

Large budget (3000): slower, more expensive, more complete
  → for complex cases or when policy docs need to be included
  → watch for recency bias (Ch. 14) with large contexts
```

CaseBot uses 800 because cases are short (< 10 turns) and the decisions are simple (flag or close). If you're building a multi-hour investigation agent, increase it.

## Seeing it in action

```bash
uvicorn memcell_rl.app:app --port 8000

# Seed many cells
curl -X POST http://localhost:8000/v1/cells/write \
  -d '{"type":"constraint","scope":{"case":"456"},"content":"no_outbound_transfers","policy_features":{"criticality":0.95}}'

for i in 1 2 3 4 5; do
  curl -X POST http://localhost:8000/v1/cells/write \
    -d "{\"type\":\"fact\",\"scope\":{\"case\":\"456\"},\"content\":\"fact number $i\",\"policy_features\":{\"criticality\":0.$((RANDOM % 9 + 1))}}"
done

# Call decide with small budget — watch what gets suppressed
curl -X POST http://localhost:8000/v1/cells/decide \
  -d '{"query":"review account 456","scope":{"case":"456"},"budget_tokens":100,"k":10}'
```

Read the response. The constraint is always in `selected_cells`. The facts compete for the remaining budget based on their criticality scores.

## Exercise

1. Seed one constraint (criticality 0.95) and four facts with criticality 0.8, 0.6, 0.4, 0.2. Call `decide()` with `budget_tokens: 150`. Which facts make it in? How does the selection change at `budget_tokens: 300`?

2. Write a fact, then supersede it. Call `decide()`. Confirm the old cell appears in neither `selected_cells` nor `suppressed_cells` — it's invisible to `decide()` entirely (status: superseded). Confirm it's still retrievable by cell ID directly.

3. Write a fact for case 456 and a different fact for case 789 (different scope). Call `decide()` scoped to case 456. Confirm the case 789 cell never appears. This is the scope isolation guarantee.

**Next →** [Tools from Scratch](./07-tools.md)
