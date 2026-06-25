# 10. Trajectory Logging

## Log steps, not just messages

A **trajectory** is an ordered list of typed steps:

```python
class ActionType(Enum):
    PLAN = "plan"
    TOOL_CALL = "tool_call"
    OBSERVATION = "observation"
    MEMORY_WRITE = "memory_write"
    ANSWER = "answer"
    ESCALATE = "escalate"

@dataclass
class TrajectoryStep:
    step: int
    action_type: ActionType
    payload: dict
    timestamp: str
```

Every loop iteration appends one step. Export to JSON for eval (Book 2).

## Why trajectories matter

Final answer: *"Account flagged for review."*

Questions audit asks:

- Was `flag_account` called?
- Was fraud review constraint checked first?
- Was permission present?

Only trajectories answer these.

## Implementation sketch

```python
class Trajectory:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.steps: list[TrajectoryStep] = []

    def log(self, action_type: ActionType, **payload):
        self.steps.append(TrajectoryStep(
            step=len(self.steps),
            action_type=action_type,
            payload=payload,
            timestamp=utcnow(),
        ))

    def export(self, path: Path):
        path.write_text(json.dumps(asdict(self), indent=2))
```

Run CaseBot with:

```bash
python agent/agent.py --export logs/run.json
```

## Property checks (preview)

Book 2 adds evaluators like:

```python
def flag_requires_prior_lookup(trajectory) -> bool:
    tools = [s.payload.get("tool") for s in trajectory.steps if s.action_type == TOOL_CALL]
    if "flag_account" in tools:
        return "get_account" in tools and tools.index("get_account") < tools.index("flag_account")
    return True
```

Same final answer can pass or fail this check.

**Companion:** `stateful-agent-lab/agent/trajectory.py`

**Next →** [Putting It Together](./11-together.md)
