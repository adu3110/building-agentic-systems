# 8. Planning and Scratchpads

## Planning is not "ask the LLM what to do next" without structure

CaseBot uses a **TaskPlanner** that maintains:

- Decomposed steps
- Completed steps
- Current focus
- Scratchpad notes

```python
class TaskPlanner:
    def __init__(self, task: str):
        self.task = task
        self.steps: list[str] = []
        self.completed: set[int] = set()
        self.scratchpad: list[str] = []

    def decompose(self, llm) -> list[str]:
        # One LLM call: break task into ordered steps
        self.steps = llm.decompose(self.task)
        return self.steps

    def next(self, memory_snapshot) -> Action:
        # Pick next incomplete step; decide tool vs answer
        ...
```

## Decompose once, execute many

Don't re-decompose every loop iteration. Plan at start; **replan** only on:

- Tool failure
- New constraint discovered
- Step count exceeded

## Scratchpad

Working memory the planner uses but may not inject into user-facing context:

```python
self.scratchpad.append(f"Account 456 balance $142.50 — within normal range")
```

Scratchpad entries are `kind=scratch` — lower criticality, droppable under token pressure.

## Structured next-action

Planner returns an `Action` dataclass, not free text:

```python
@dataclass
class Action:
    type: str          # tool | answer | escalate | replan
    tool: str | None
    args: dict | None
    text: str | None
    reason: str | None
```

The agent loop switches on `action.type`. The LLM proposes; Python disposes.

## CaseBot example plan

Task: *"Review account 456 for fraud indicators and flag if suspicious."*

```
Steps:
1. Fetch account details
2. Fetch recent transactions
3. Apply fraud heuristics
4. Flag or close case with summary
```

Each step maps to one or more tool calls. Trajectory logs which step was active.

## When planning fails

If the planner emits an unknown tool name → catch at registry → return structured error → trigger replan or escalate.

**Companion:** `stateful-agent-lab/agent/planner.py`

**Next →** [Stop Conditions and Escalation](./09-stop-escalate.md)
