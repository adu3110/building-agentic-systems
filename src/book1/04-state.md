# 5. Chat history is not memory

Most demos store "memory" as a growing chat list and send the last N tokens to the model. Run the failure:

```bash
python3 examples/build/step05_chat_memory.py
```

```
turn  1: context  1214 chars  constraint visible=False
turn  2: context  1214 chars  constraint visible=False
...
turn 12: context  1214 chars  constraint visible=False

Constraint from turn 1 is gone. Agent can violate policy.
```

Turn 1 adds: `POLICY: no outbound transfers until review closes`.  
Turns 2–12 add fat tool output. The assembler keeps the **last** 1200 characters. The constraint was at the **start** — gone after turn 1.

This is not "the model forgot." **You never stored the rule as durable state.**

## Three different things

```
chat history   = everything said (grows forever)
context window = what the LLM sees this turn (budget capped)
memory         = typed state you control (scoped, ranked, lifecycle)
```

Chapter 7 assembles context **from** memory. This chapter is why memory must exist separately from chat.

## The naive assembler (what not to do)

```python
def context_from_chat(messages, max_chars=1200):
    blob = "\n".join(messages)
    return blob[-max_chars:]  # keep recent only → drops old constraints
```

Fix in chapter 6: constraints live in a cell store, injected **before** ranking everything else.

**Next →** [Typed memory cells](./05-typed-memory.md)
