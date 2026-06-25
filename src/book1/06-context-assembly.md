# 6. Context Assembly Under a Token Budget

## The problem

You have:

- 200 memory cells
- 10 tool observations (some 2k tokens each)
- System prompt + task + plan

The model accepts 8k tokens. **What goes in?**

Context assembly is a **deterministic function**, not "send everything."

## Assembly order (recommended)

1. **System prompt** (fixed)
2. **All active constraints** for this scope (never drop)
3. **Current task + plan state**
4. **Top-k relevant facts** (by recency + relevance score)
5. **Latest observation** (truncated if needed)
6. **Chat tail** (last N turns, if any)

```python
def assemble_context(store, task, token_budget=6000) -> str:
    parts = [SYSTEM_PROMPT]
    parts += format_constraints(store.get_constraints())
    parts.append(f"Task: {task}")
    parts += format_facts(store.rank_facts(task, k=5))
    parts.append(format_latest_observation(store, max_tokens=800))
    text = "\n\n".join(parts)
    return truncate_to_budget(text, token_budget)
```

## Constraints are not negotiable

If token pressure forces a drop, drop **old observations** and **low-criticality facts** first. Never drop constraints silently — if they don't fit, **escalate**.

## Relevance without embeddings

Simple baseline (good enough for CaseBot):

```python
def score_fact(fact: MemoryCell, task: str) -> float:
    overlap = len(set(task.lower().split()) & set(fact.content.lower().split()))
    recency = 1.0 / (1 + age_hours(fact.created_at))
    return overlap + 0.3 * recency + fact.criticality
```

Upgrade to embeddings when lexical overlap fails — but measure first (Book 2).

## Observation truncation

Tool outputs can be huge. Store full JSON in memory; inject **summary + key fields** into context:

```python
def summarize_observation(obs: dict, max_chars=1200) -> str:
    return json.dumps({k: obs[k] for k in ("id", "status", "balance_usd")}, indent=2)
```

## Failure mode: recency bias

Models overweight the last thing they read. If a stale fact appears after a fresh constraint, behavior gets weird. **Order matters** — constraints first, always.

**Companion:** [long-context-bench](https://github.com/adu3110/long-context-bench) — recency conflict tests

**Next →** [Tools from Scratch](./07-tools.md)
