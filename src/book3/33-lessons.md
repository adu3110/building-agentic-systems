# 30. Lessons Learned

I want to end with what actually mattered — not a summary of the chapters, but the things that changed how I think about building these systems.

## Chat history is not memory

This is the single mistake I've seen most often. Teams build agents and pass the full conversation history as memory. It's fine for demos. In production: the context bloats, stale facts compete with current ones, the model has no way to distinguish "we discussed this at turn 3" from "this is the current state of the account."

Typed, scoped, lifecycle-managed memory cells are different. They are explicit state you control, not implicit context you accumulate. Every bug I've traced back to "the agent used stale data" was a chat-history-as-memory bug.

## Trajectories matter more than answers

A 90% accuracy number tells you the agent was right nine times out of ten. A trajectory tells you what it did when it was wrong. In regulated domains, the *how* is as important as the *what* — sometimes more. The regulator asking "what data did the system have when it flagged this account?" doesn't care about your accuracy number.

Log trajectories from day one. I've seen teams add them in week four of a production incident. That's too late.

## ~500 lines you own beats 50k lines you don't

The loop in `casebot_regulated.py` is under 200 lines. The memcell-rl HTTP server is a few hundred more. The agent-ledger is another few hundred. Total: roughly 500 lines of core agent logic you can read, debug, and modify.

A framework wraps this in abstractions that seem helpful until they break in a way that requires reading 50k lines of source to understand. I'm not anti-framework — use them after you understand the layer they're hiding. Not before.

## Measure failure modes before blaming the model

Needle retrieval at 70% depth. Recency conflict. Distractor injection. Run these three benchmarks before you adjust any prompt. I've watched teams spend two weeks on prompt engineering for a problem that was a context assembly issue. The benchmark takes 10 minutes to run and tells you exactly where to look.

## Ledgers over group chats

Multi-agent "group chats" are fun to watch and impossible to debug. You can't replay them. You can't attribute decisions. You can't detect conflicts. When something goes wrong in production, you're reading a chat log trying to figure out which message "caused" the error.

An append-only ledger with typed entries solves all of this. The coordination looks less like a conversation and more like an event log — which is exactly what it should be for a system that handles real decisions.

## Escalation is success

This one is counterintuitive. When CaseBot escalates, it didn't fail — it correctly identified a case it shouldn't resolve autonomously and handed it to a human. In regulated financial services, that's the right outcome for a non-trivial fraction of cases.

Build escalation as a first-class path, not an error handler. Define the conditions upfront. Test that they trigger. An agent that escalates appropriately is more valuable than one that never escalates and gets things wrong.

## What I'd do differently from the start

1. Start trajectory logging on day one, not when the first production issue appears
2. Run recency conflict and needle benchmarks before claiming the model handles long context
3. Add CHECKPOINT entries to the ledger from the start — retrofitting them is painful
4. Set memory cell `valid_until` on all PII fields at write time — TTL is easier to set than to add later

## Companion repos

| Repo | What it covers |
|------|---------------|
| [memcell-rl](https://github.com/adu3110/memcell-rl) | Typed memory, context policy, RL transitions |
| [long-context-bench](https://github.com/adu3110/long-context-bench) | Needle, recency, distractor benchmarks |
| [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch) | Trajectory evaluation, property checks |
| [agent-ledger](https://github.com/adu3110/agent-ledger) | Append-only multi-agent coordination log |

## Where frameworks fit

Every major framework has a concept that corresponds to a chapter in this series:

| Framework piece | Chapter |
|----------------|---------|
| `AgentExecutor` | Ch 2: The Agent Loop |
| Memory / VectorstoreMemory | Ch 4–5, Book 2 Ch 15–16 |
| Tools / StructuredTool | Ch 7 |
| Evaluators / Criteria | Book 2: Evaluation |
| Multi-agent / AutoGen | Book 3 |

Read the relevant chapter first. Then the framework's implementation will make sense — and you'll know immediately when it's doing something you don't want.

---

That's the series. Re-read Book 1 with the evaluation vocabulary from Book 2. Then implement Book 3's ledger as an extension to your CaseBot fork. The pieces connect.

Questions, corrections, or additions: [GitHub Issues](https://github.com/adu3110/building-agentic-systems/issues)
