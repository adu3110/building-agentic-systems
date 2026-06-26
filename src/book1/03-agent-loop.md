# 2. The minimal loop

An agent loop is: **decide → act → observe → repeat**.

Run step 2:

```bash
python3 examples/build/step02_loop.py
```

```
Task: Review account 456 for fraud indicators.

step 0: getAccount {'accountId': '456'}
  → {'balance_usd': 142.5, 'status': 'active'}
step 1: getTransactions {'accountId': '456'}
  → ERROR: tool not defined

We have a loop shape. Next: a tool registry so dispatch is explicit.
```

Step 1 fails because we haven't built tools yet. Good — the loop already shows *where* the next layer goes.

## The code (~40 lines)

```python
ACCOUNTS = {"456": {"balance_usd": 142.50, "status": "active"}}

def get_account(account_id: str) -> dict:
    return ACCOUNTS[account_id]

script = [
    ("getAccount", {"accountId": "456"}),
    ("getTransactions", {"accountId": "456"}),
    ("answer", {"text": "Case closed."}),
]

for step, (name, args) in enumerate(script):
    print(f"step {step}: {name} {args}")
    if name == "getAccount":
        data = get_account(args["accountId"])
        print(f"  → {data}")
    elif name == "answer":
        print(f"  → {args['text']}")
        break
    else:
        print("  → ERROR: tool not defined")
        break
```

This is not production code. It's the skeleton:

- **`script`** — what to do (later: planner)
- **`for step`** — the loop
- **inline `if name ==`** — dispatch (later: registry)

## Why not just call the LLM once?

One-shot: `llm("Review account 456")` → text.

Problems:

1. LLM doesn't have account 456's balance — you need a tool.
2. No record of which APIs were called — compliance needs a trail.
3. No way to block `flagAccount` before `getAccount` — you need code between decide and act.

The loop puts **your code** between the model and the world.

## Change one line

In `step02_loop.py`, swap step 1 to `("getAccount", {"accountId": "456"})` again. You'd call the same lookup twice. That's why chapter 9 adds duplicate detection — but first we need tools and a log.

**Next →** [Tools from scratch](./07-tools.md)
