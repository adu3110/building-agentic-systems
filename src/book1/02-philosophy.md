# 1. Overview — a task is not an agent

Run this:

```bash
cd memcell-rl
python3 examples/build/step01_task.py
```

```
Task: Review account 456 for fraud indicators. Flag only if suspicious after full lookup.

Nothing happens. No lookup. No audit trail. No stop condition.
An agent needs a loop that acts, observes results, and repeats.
```

That's the whole point of chapter 1. A task string is input. An agent is a **program** that turns that input into a sequence of validated actions with a log.

## What we're building

CaseBot resolves case 456 in a regulated workflow:

1. Read account data (tool call)
2. Read transactions (tool call)
3. Decide: flag or close
4. Log every step (trajectory)
5. Stop safely when something goes wrong (escalate)

We'll add one of those per chapter. No framework. Mostly plain Python.

## What usually breaks (so you know where we're headed)

| Symptom | Layer we'll add |
|---------|-----------------|
| Agent "forgets" a rule from turn 2 | Typed memory (ch 6) |
| Agent flags without reading data | Trajectory + property checks (ch 4, Book 2) |
| Same tool call six times | Stop conditions (ch 9) |
| Constraint buried under tool output | Context assembly (ch 7) |

You don't need this table memorized. You'll **see** each failure when we break the naive version on purpose.

## Rules for this book

1. **Run before you understand.** Output first, explanation second.
2. **One new mechanism per chapter.** If a chapter introduces two big ideas, I split it.
3. **The LLM comes last.** Steps 1–9 use a scripted planner. The loop must work without an API key.
4. **Same case throughout.** Account 456. Same fixtures. Same compliance rules.

**Next →** [The minimal loop](./03-agent-loop.md)
