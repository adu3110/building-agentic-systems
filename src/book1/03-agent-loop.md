# 3. The Minimal Agent Loop

## The smallest useful agent

Before memory, tools, or planning — the loop:

```python
def run_agent(task: str, llm, max_steps: int = 10) -> str:
    messages = [
        {"role": "system", "content": "You are a case-resolution assistant."},
        {"role": "user", "content": task},
    ]
    for step in range(max_steps):
        response = llm.chat(messages)
        if response.stop_reason == "final_answer":
            return response.text
        if response.tool_call:
            result = execute_tool(response.tool_call)
            messages.append({"role": "assistant", "content": str(response.tool_call)})
            messages.append({"role": "user", "content": f"Observation: {result}"})
        else:
            messages.append({"role": "assistant", "content": response.text})
    return "Max steps exceeded"
```

This is the skeleton every framework wraps. Understand it first.

## Step types

Every iteration is one of:

| Step | Meaning |
|------|---------|
| **Think** | LLM produces internal reasoning (optional, may be hidden) |
| **Tool call** | LLM requests an external action |
| **Observation** | Environment returns tool result |
| **Answer** | LLM declares task complete |
| **Escalate** | Agent refuses or requests human |

Your loop must handle all five explicitly — not collapse them into "assistant message."

## CaseBot loop (structured)

From `stateful-agent-lab`:

```python
class StatefulAgent:
    def run(self, max_steps: int = 8) -> str:
        self.memory.write_task(self.task)
        for step in range(max_steps):
            next_action = self.planner.next(self.memory.snapshot())
            if next_action.type == "tool":
                result = self.tools.run(next_action.tool, next_action.args)
                self.memory.write_tool_result(next_action.tool, result)
                self.trajectory.log(ActionType.TOOL_CALL, next_action, result)
            elif next_action.type == "answer":
                self.trajectory.log(ActionType.ANSWER, next_action)
                return next_action.text
            elif next_action.type == "escalate":
                self.trajectory.log(ActionType.ESCALATE, next_action)
                return f"ESCALATED: {next_action.reason}"
        return "Max steps exceeded"
```

Note: **planner** and **memory** are separate objects. The LLM may power the planner, but the loop does not depend on a framework's `AgentExecutor`.

## Failure mode: infinite tool loops

Naive agents call the same tool repeatedly. Fix with:

1. **Step budget** (`max_steps`)
2. **Duplicate detection** — same `(tool, args)` twice → escalate
3. **Trajectory inspection** — log every step (Chapter 10)

## Failure mode: silent context overflow

Appending observations to `messages` grows unbounded. Book 1 Chapter 6 fixes this with context assembly; for now, cap message count and notice when quality drops.

## Exercise

Implement a 20-line loop that calls one stub tool (`get_account`) and stops on answer. No framework. Run it on task: *"What is the status of account 456?"*

**Companion:** `stateful-agent-lab/agent/agent.py`

**Next →** [State: Chat History Is Not Memory](./04-state.md)
