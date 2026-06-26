# 3. State: Chat History Is Not Memory

Let me show you the exact moment this breaks.

CaseBot is running case 456. At turn 1, a policy fires and injects the fraud constraint:

```
system: You are a case resolution agent.
user: Review account 456.
assistant: I'll review account 456 now.
user: POLICY: account_456_under_fraud_review — no outbound transfers until review closes.
```

That constraint is now four tokens from the top of the transcript. Good.

Twelve turns later, the agent has been gathering account data:

```
user: result of getAccount: {"balance": 142.50, "status": "active"}
assistant: I see the balance is $142.50.
user: result of getTransactions: [{"txn": "t1", ...}, {"txn": "t2", ...}]
assistant: Two settled transactions found.
user: result of getCustomerProfile: {"name": "...", "tier": "gold", "joined": "2019", ...}
assistant: Account has been active since 2019.
user: result of getLinkedAccounts: [{"id": "457", ...}, {"id": "789", ...}]
...
```

Each tool response is 200–400 tokens. After twelve turns, the transcript is 4000+ tokens. Your LLM context window is 8192 tokens. The system prompt takes 300. The constraint — which is 40 tokens — is now **3700 tokens from the end**. Some models truncate from the middle. Most attend better to the beginning and end. The middle disappears.

The agent initiates an outbound transfer.

This is not a model capability issue. The model has a 128k context window. The issue is that **you stored a compliance rule the same way you store a turn of conversation**, and turns of conversation are by definition ephemeral. Twelve turns later, the rule got buried.

## What memory actually needs to be

A constraint is not a message. It's a persistent, named, durable fact that must remain accessible regardless of how many turns have elapsed. A fact about the current balance is different: it can be superseded when the balance changes, and it can be dropped from context if the budget is tight.

These have different lifecycles and different priorities. Treating them all as messages loses both dimensions.

```
Chat history model:
  message 1: user says X
  message 2: assistant says Y
  message 3: policy constraint fires
  message 4: tool result
  ...
  message 40: token budget exceeded — something gets dropped
  → who decides what gets dropped? nothing does. truncation is arbitrary.

Typed memory model:
  cell id=C1, type=constraint, criticality=0.95: no outbound transfers
  cell id=C2, type=fact, criticality=0.6: balance $142.50
  cell id=C3, type=episode, criticality=0.15: account active since 2019
  → at token budget: C1 always in, C2 usually in, C3 dropped first
```

The constraint doesn't get buried — it's not in the message stream at all. It's in a separate store that the context assembler queries every turn.

## Concrete comparison

With chat history, here's what the planner sees at turn 12 under token pressure (budget: 1200 tokens):

```
[TRUNCATED — 3600 tokens dropped]
user: result of getLinkedAccounts: [...]
assistant: Two linked accounts found.
user: result of getRecentAlerts: {"alert": "none", "last_check": "2024-01"}
assistant: No recent alerts.
user: result of getKYCStatus: {"kyc": "complete", "verified": "2023"}
```

The constraint is gone. The planner proposes an outbound transfer.

With typed memory, here's what the planner sees at turn 12 under the same budget:

```
CONSTRAINT: account_456_under_fraud_review — no outbound transfers until review closes
CONSTRAINT: flagAccount requires supervisor approval

CONTEXT: balance $142.50 (from getAccount, turn 2)
CONTEXT: 2 settled transactions (from getTransactions, turn 3)

[12 other cells suppressed — budget exhausted]
```

The constraint is always first. It never gets dropped. Not because the model has a good memory — because the context assembler always injects it unconditionally.

## The write call

When case 456 opens:

```python
memcell_post("/v1/cells/write", {
    "type": "constraint",
    "scope": {"case": "456"},
    "content": "account_456_under_fraud_review: no_outbound_transfers until review closes",
    "confidence": 0.99,
    "sensitivity": "restricted",
    "source_refs": ["policy:fraud_engine"],
    "policy_features": {
        "criticality": 0.95,    # never dropped
        "compressibility": 0.05,
    },
})
```

`criticality: 0.95` tells the context assembler: this cell takes priority over everything else. It is injected before any facts, before any preferences, before any episodes.

A tool result gets written with much lower criticality:

```python
memcell_post("/v1/cells/write", {
    "type": "fact",
    "scope": {"case": "456"},
    "content": json.dumps(result.data),
    "source_refs": ["tool:getAccount"],
    "policy_features": {"criticality": 0.6},
})
```

Under budget pressure, the tool result might get dropped. The constraint never does.

## Memory lifecycle

When the balance changes mid-case, you don't delete the old value — you supersede it:

```python
# Balance changes from $142.50 to $97.25 (payment received)
memcell_post("/v1/cells/supersede", {
    "old_cell_id": fact_cell_id,
    "new_content": json.dumps({"balance_usd": 97.25}),
    "source_refs": ["tool:getAccount:refresh"],
})
```

The old cell gets `status: superseded` — invisible to `decide()`, still in the database. Auditors can read it: *at step 0, balance was $142.50; at step 4, it changed to $97.25.* The planner after step 4 sees only the new value.

**Never delete memory cells in a regulated workflow.** Deletion removes audit evidence. Supersession preserves history while keeping context clean.

## What belongs in each type

| Type | When to write it | Criticality | Lives how long |
|------|-----------------|-------------|----------------|
| `constraint` | Policy fires at case open | 0.85–0.99 | Until review closes |
| `fact` | Tool returns data | 0.4–0.8 | Until superseded |
| `preference` | Account settings, user prefs | 0.3–0.6 | Persistent |
| `episode` | Compressed turn summaries | 0.1–0.2 | Compressible, disposable |

## The anti-pattern you'll be tempted to use

```python
# "Memory via summarisation"
memory_string = llm.call(
    f"Summarise the important points from this conversation:\n{chat_history}"
)
# Then inject memory_string into the next prompt
```

This seems like it solves the problem. It doesn't. A summarised string loses:
- **Structure** — which cell is a constraint vs a fact?
- **Provenance** — did this come from `getAccount` or from the user?
- **Status** — is this superseded?
- **Criticality** — what's mandatory vs nice-to-have?

You cannot enforce "always inject constraints first" on an unstructured string. You cannot supersede one part of it. You cannot filter by sensitivity. You cannot answer the compliance question: *which constraints were active at step 7?*

Use typed cells. The string comes out of the assembler.

## Try it

```bash
uvicorn memcell_rl.app:app --port 8000
python examples/casebot_regulated.py --dry-run
```

CaseBot calls `seed_case_memory()` before the loop. It writes one constraint cell and nothing else. The loop then writes fact cells as tools return data. At each step, `fetch_memcell_context()` calls `decide()` and gets back the current selection.

Add a low-criticality episode cell and watch it get suppressed:

```bash
curl -X POST http://localhost:8000/v1/cells/write \
  -H "Content-Type: application/json" \
  -d '{
    "type": "episode",
    "scope": {"case": "456"},
    "content": "User mentioned this account is used for payroll",
    "policy_features": {"criticality": 0.1}
  }'
```

Re-run with `budget_tokens: 100`. The constraint appears. The episode doesn't.

## Exercise

Write three fact cells for case 456 with criticality 0.8, 0.5, and 0.2. Call `decide()` with `budget_tokens: 80`. Which one gets selected? What does the suppression list contain? Now set `budget_tokens: 200` — what changes?

**Next →** [Typed Memory Objects](./05-typed-memory.md)
