# 17. Retrieval vs Memory vs Context

## Three operations people conflate

| Operation | Question | Mechanism |
|-----------|----------|-----------|
| **Write (memory)** | What should we persist? | `MemoryStore.write()` / API |
| **Retrieve** | What stored items match this query? | Search over cells |
| **Assemble (context)** | What enters the prompt this turn? | Policy + budget |

RAG tutorials often skip (1) and (4) — they retrieve documents into context without typed persistence.

## Retrieve ≠ assemble

Retrieval returns candidates:

```python
candidates = store.retrieve(query="account 456 balance", k=10)
```

Assembly applies policy:

```python
context = assemble(
    constraints=store.all_constraints(),  # not from retrieve
    facts=rank(candidates, budget=2000),
)
```

Constraints bypass retrieval ranking — they are **always included**.

## memcell-rl: decide()

`memcell-rl` adds an explicit **decide** step:

```
cells in store → policy → KEEP_AS_CONSTRAINT | KEEP_AS_CONTEXT | SUPPRESS
```

Every decision is logged as an RL transition `(state, action, reward)`.

```bash
curl -X POST http://localhost:8000/v1/cells/decide \
  -H "Content-Type: application/json" \
  -d '{"scope": "case:456", "token_budget": 2000, "task": "review fraud"}'
```

This separates **what exists** from **what the agent sees** — the core of reliable memory.

**Companion:** [memcell-rl](https://github.com/adu3110/memcell-rl)

**Next →** [Memory Policies and Forgetting](./18-memory-policies.md)
