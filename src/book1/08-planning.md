# 8. Planning and scratchpads

"Ask the LLM what to do next" every step is not a plan. The agent doesn't know what it already did or what's left.

```bash
python3 examples/build/step08_planner.py
```

```
--- good planner ---
step 0: tool_call getAccount
step 1: tool_call getTransactions
step 2: answer Case closed.
tools_used: ['getAccount', 'getTransactions']

--- bad planner — flag before lookup ---
step 0: tool_call flagAccount
step 1: answer Flagged.
tools_used: ['flagAccount']
```

Same loop. Different planner function. That's the separation that makes testing work.

## Planner signature

```python
def planner(step: int, tools_used: list[str]) -> Action:
    ...
```

Later: `(step, trajectory, memory_context)`. The loop doesn't care if inside you call OpenAI or a hardcoded list.

## Scripted first, LLM second

Steps 1–9 use a script. Reason: if property checks fail with a script, the bug is in loop/tools/memory — not the model.

When you add the LLM, the prompt includes:

- task
- `tools_used` so far (or full trajectory summary)
- `memory_context` from `decide()`

The LLM **proposes**. Python **validates** via registry and stop conditions.

## Scratchpad vs memory

| Scratchpad | Memory cell |
|------------|-------------|
| "balance looks normal vs avg" | `balance_usd: 142.50` |
| Ephemeral — discard after case | Durable — supersede, audit |
| Planner working notes | World state |

Don't persist scratchpads as facts. You'll pollute the next case.

**Next →** [Stop conditions and escalation](./09-stop-escalate.md)
