# 2. Overview and Philosophy

## The agent stack

Most "agent frameworks" bundle six separable layers:

```
┌─────────────────────────────────────────┐
│  Application (your domain logic)        │
├─────────────────────────────────────────┤
│  Agent loop (observe / act / update)    │
├─────────────────────────────────────────┤
│  Memory & state (typed, not chat)       │
├─────────────────────────────────────────┤
│  Context assembly (what enters prompt)  │
├─────────────────────────────────────────┤
│  Tools & permissions (actions + gates)  │
├─────────────────────────────────────────┤
│  Evaluation & logging (trajectories)    │
└─────────────────────────────────────────┘
         LLM API (replaceable)
```

Frameworks collapse these into opaque objects. That works for demos. It fails when:

- Memory grows and the agent "forgets" constraints buried in turn 3
- A tool succeeds but the agent misinterprets the observation
- You need to prove what happened for compliance
- You need to swap the LLM without rewriting the agent

**Our philosophy:** own the layers you will debug at 2am.

## Design principles

### 1. State is explicit

If the agent "knows" something, it lives in a named memory object — not implicitly in chat history.

### 2. Actions are typed

Every tool call has a schema, permission check, and logged result. No free-form string execution.

### 3. The unit of evaluation is the trajectory

A correct final answer reached by unsafe tool use is a failure in regulated domains.

### 4. Framework-free core, framework-optional edges

The loop, memory store, tool registry, and trajectory logger are ~500 lines of Python. LLM calls are HTTP. Storage is SQLite or files.

### 5. Build the naive version first

Start with chat-only. Watch it fail. Then add the layer that fixes that failure. This book follows that order.

## What we are not building

- A general-purpose coding assistant UI (terminal, file tree, diff views)
- A multi-agent swarm in Book 1 (that's Book 3)
- An RL-trained policy in Book 1 (Book 2 introduces RL-ready logging)

## Architecture preview

CaseBot's core loop:

```python
while not done:
    observation = env.observe()
    plan = planner.next_step(observation, memory)
    if plan.action == "tool":
        result = tools.dispatch(plan.tool, plan.args)
        memory.write_observation(result)
        trajectory.log(ActionType.TOOL_CALL, plan, result)
    elif plan.action == "answer":
        trajectory.log(ActionType.ANSWER, plan)
        done = True
    elif plan.action == "escalate":
        trajectory.log(ActionType.ESCALATE, plan)
        done = True
```

We will implement each piece across the next chapters.

**Next →** [The Minimal Agent Loop](./03-agent-loop.md)
