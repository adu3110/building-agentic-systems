# 38. Lessons Learned

I want to end with what actually mattered — not a summary of chapters, but the things that changed how I think about building these systems. The ideas that seem simple in a book but took real experience to actually believe.

## Chat history is not memory. This one error causes more bugs than all others combined.

I've seen this in every team I've worked with. They build the agent, pass the conversation history as the prompt, and it works. For demos. For small context windows. For cases with 3-4 turns.

Then it hits production. Thirty turns in, the constraint from the system prompt is buried under forty lines of tool output. The model uses a balance from turn 3 when the actual balance changed at turn 18. A case for client A bleeds context into client B because the history wasn't scoped.

Typed memory cells with scope, criticality, and lifecycle fix these problems. They're more work to set up. They're cheaper than a compliance incident.

The clearest indicator you have this bug: the model gives right answers 90% of the time, but every wrong answer involves something that was "said earlier" in the conversation. That's the chat-history-as-memory pattern failing.

## Final answers lie. Trajectories tell the truth.

A 90% accuracy number tells you the agent was right nine times out of ten. It tells you nothing about whether it followed the right process, whether constraints were honored, whether the reasoning was sound or lucky.

A trajectory that shows `flagAccount` before `getAccount` is a compliance violation, regardless of whether the flag was correct. The trajectory tells you the truth. The final answer hides it.

Log trajectories from day one. Not when the first production incident appears. Not when a regulator asks. From day one. The storage cost is trivial. The cost of not having them is unbounded.

## Diagnose before you fix.

The failure taxonomy in chapter 21 exists because I've watched teams spend weeks in the wrong layer. A memory assembly bug looks like a model reasoning bug if you don't check whether the relevant cell was actually in context. A prompt that seems to make things worse might be fighting against a context assembly problem that would be trivially fixed by adjusting one criticality value.

Before you change anything: check the trajectory, check what was in memory, check what the context assembler selected, check whether any tool errored. Then fix the right thing.

Prompt engineering is the last resort, not the first.

## The loop you understand beats the framework you don't.

`casebot_regulated.py` is under 200 lines of core agent logic. `agent-ledger/python/ledger.py` is a few hundred. `memcell-rl` is a few thousand. You can read all of it.

A major framework wrapping these concepts might be 50,000 lines. Most of them are fine when things work. When something goes wrong at 3am and the agent is doing something unexpected, you need to be able to trace through the code. That's much harder with 50,000 lines of abstractions.

Use frameworks after you understand what they're hiding. Not before. The chapters in this series correspond directly to the pieces major frameworks abstract:

| Framework concept | Where it is in this book |
|------------------|--------------------------|
| AgentExecutor / RunLoop | Ch 10: The Agent Loop |
| Memory / VectorstoreMemory | Ch 13–14, Book 2 Ch 22–24 |
| Tools / StructuredTool | Ch 11: Tools from scratch |
| Evaluators | Book 2: Evaluation |
| Multi-agent / AutoGen | Book 3 |

Read the chapter first. Then look at the framework implementation. You'll see exactly what it's doing, what it's missing, and where it might fail for your use case.

## Escalation is success.

This one is counterintuitive and worth sitting with.

When CaseBot returns `ESCALATED:approval_required`, it didn't fail. It correctly identified a case where it cannot proceed safely without human judgment, and it stopped. In regulated financial services, that is the right outcome for a non-trivial fraction of cases.

The alternative — an agent that never escalates — means the agent makes every decision autonomously. Some of those decisions will be wrong. For irreversible actions, "wrong" can mean a regulatory violation, a financial loss, or a customer harmed.

An agent that knows when to stop is more valuable than one that never stops. Design escalation as a first-class outcome. Test it. Celebrate when it works correctly. Route escalated cases to humans quickly.

## Long context does not mean reliable context.

Before you extend the context window and trust the model to find things in it: run the needle retrieval benchmark, the recency conflict benchmark, and the distractor injection benchmark from chapter 22.

The degradation at 70% depth is real and model-version-dependent. A constraint that reliably appears at depth 10% may be missed 39% of the time at depth 70%. The fix is not a longer context window — it's typed memory with forced injection.

This is the architectural insight that Book 0 + Books 1–2 are building toward: the model is one component, and an imperfect one. Design the system to not depend on the model's ability to find needles in haystacks.

## Ledgers over group chats.

Multi-agent "group chats" are appealing. Agents talking to each other, synthesizing information, arguing toward a conclusion. Great for demos.

When something goes wrong in production, you're reading a chat transcript trying to figure out which message caused the error. Was it agent A's claim that overrode agent B's? Was there a race condition? Which value was acted on and why?

An append-only ledger with typed entries answers all these questions automatically. `detect_conflicts()` finds contradictions without you having to grep logs. `verify_chain()` confirms the log was never tampered with. `replay(up_to_seq=7)` reconstructs the exact state the agents were in at sequence 7.

The coordination looks less like a conversation and more like an event log — which is exactly what it should be for a system handling real decisions.

## What I'd do differently from the start

1. **Trajectory logging from day one.** Not week four. Not after the incident.
2. **Run long-context benchmarks before claiming the model "handles it."** The numbers are sobering.
3. **Scope every memory cell at write time.** Retrofitting scope onto existing cells is painful.
4. **Set `valid_until` on all PII at write time.** TTL is easier to set than to add later.
5. **Add CHECKPOINT entries to the ledger from the first release.** Replay without checkpoints on a 10,000-entry ledger is slow.
6. **Write property checks before writing the LLM planner.** If your property checks pass with a scripted planner, you've verified the infrastructure. Then add the LLM.

## The companion repos

| Repo | What it covers |
|------|---------------|
| [memcell-rl](https://github.com/adu3110/memcell-rl) | Typed memory server, context policy, RL transitions |
| [long-context-bench](https://github.com/adu3110/long-context-bench) | Needle, recency, distractor benchmarks |
| [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch) | Trajectory evaluation, property checks, CaseBot adapter |
| [agent-ledger](https://github.com/adu3110/agent-ledger) | Append-only multi-agent coordination log |

---

The series is complete. Book 0 gave you the machine. Book 1 built the system around it. Book 2 gave you the tools to know whether the system works. Book 3 extended it to multiple agents.

The pieces connect: the trajectory properties from Book 2 run on the ledger entries from Book 3. The memory cells from Book 1 feed the context assembler that Books 2 benchmarks. CaseBot runs through all of it.

Read the code. Run it. Break it. The understanding you get from running `--bad-run` and watching the compliance failure in real time is worth ten chapters of explanation.

Questions, corrections, and additions: [GitHub Issues](https://github.com/adu3110/building-agentic-systems/issues)
