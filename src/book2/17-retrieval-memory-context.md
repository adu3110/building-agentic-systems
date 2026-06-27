# 2.5 Retrieval vs Memory vs Context

Three different things. Agents confuse them constantly. Let me pin down exactly what each one is and when to use each.

## Three different things

```mermaid
flowchart TB
  subgraph R [Retrieval]
    direction LR
    Q[query] --> V[(vector index)] --> C1[relevant chunks]
  end
  subgraph M [Memory]
    direction LR
    W[write typed cell] --> S[(cell store)] --> L[deterministic lookup]
  end
  subgraph C [Context]
    direction LR
    A[assemble this turn] --> P[prompt window] --> LLM[LLM]
  end
```

| | Retrieval | Memory | Context |
|---|---|---|---|
| What it is | Fuzzy search over a corpus | Named, typed, durable state | What the LLM sees this turn |
| Deterministic? | No | Yes | Yes (once assembled) |
| Survives restarts? | Yes (index) | Yes (cell store) | No |
| Grows unbounded? | Yes | Controlled by lifecycle | No (budget-capped) |
| Example | Policy PDFs, case history | Fraud constraint, account balance | Assembled slice of memory |

## When to use each

I think about it this way:

```
Constraint "no outbound transfers"    → MEMORY
  It must always be in context. Non-negotiable. criticality=1.0.
  If it misses once, it's a compliance incident.

Account balance from getAccount       → MEMORY
  Typed fact. Supersedable. Scoped. Will be in context if criticality high enough.

200-page regulatory policy PDF        → RETRIEVAL
  Too large to store as typed cells. Query at turn time for relevant sections.

Agent's current decision              → CONTEXT only
  Ephemeral. Not stored. Just in this prompt.

Past case summaries for reference     → RETRIEVAL (+ optionally MEMORY for key facts)
  Retrieve similar cases. Extract key constraints into typed cells.
```

## The anti-pattern: retrieval for everything

I see this often: teams put all their agent "memory" in a vector database and retrieve it every turn.

```python
# Anti-pattern
async def get_constraints(case_id: str) -> list[str]:
    return await vector_db.query(f"constraints for case {case_id}", top_k=5)
    # Problems:
    #   - non-deterministic: may miss a constraint on this query
    #   - no criticality: no guarantee it enters context
    #   - no status: may return superseded or quarantined entries
    #   - expensive: embedding call every step
```

For constraints and critical facts, this is wrong. Retrieval is fuzzy by design. You don't want a fuzzy lookup deciding whether the fraud constraint appears in the prompt.

```python
# Correct
def get_constraints(case_id: str) -> list[dict]:
    # memcell-rl: deterministic, scoped, status-filtered
    resp = memcell_post("/v1/cells/decide", {
        "query": f"constraints for {case_id}",
        "scope": {"case": case_id},
        "budget_tokens": 800,
    })
    return [s for s in resp["selected_cells"] if s["mode"] == "constraint"]
```

## Hybrid: retrieval for background knowledge

Retrieval does have a role — large background corpora that don't fit in typed cells:

```python
def assemble_hybrid_context(task: str, case_id: str, budget_tokens: int) -> str:
    parts = []

    # 1. Typed memory (mandatory + ranked facts) — always first
    ctx = fetch_memcell_context(task)   # from Book 1
    parts.append(ctx)
    used = len(ctx.split())

    # 2. Retrieval for background policy docs — only if budget remains
    remaining = budget_tokens - used
    if remaining > 200:
        chunks = vector_db.query(task, top_k=3)
        for chunk in chunks:
            if chunk["score"] > 0.75:
                parts.append(f"[policy:{chunk['source']}] {chunk['text']}")

    return "\n\n".join(parts)
```

Memory goes in first, unconditionally. Retrieval fills remaining budget.

## What lives where in CaseBot

```
memcell-rl (typed memory)
  constraints     fraud_review, no_outbound_transfers   criticality 1.0
  facts           account balance, transaction list      criticality 0.6
  episodes        turn summaries                         criticality 0.2 compressible

vector index (if needed)
  policy docs     regulatory handbook, product rules     fuzzy, background

context (this turn)
  assembled from memory + optional retrieval chunks
  ephemeral — not stored, not persisted
```

## Exercise

CaseBot doesn't currently use a vector DB. That's intentional — for Book 1, everything fits in typed cells. Think about when you'd add retrieval: if the fraud review policy was a 50-page PDF, how would you structure the hybrid assembler? What stays in memcell-rl and what goes into the vector index?

**Next →** [Memory Policies and Forgetting](./18-memory-policies.md)
