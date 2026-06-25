# 7. Tools from Scratch

## Tools are not "functions the LLM feels like calling"

A production tool layer has:

1. **Schema** — name, parameters, types, required fields
2. **Registry** — lookup by name
3. **Dispatch** — validate args, execute, catch errors
4. **Permissions** — who can call what
5. **Result type** — structured success/failure

## ToolSchema

```python
@dataclass
class ToolSchema:
    name: str
    description: str
    parameters: dict[str, type]
    required_params: list[str]
    required_permissions: list[str]
    is_destructive: bool = False

class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, tuple[ToolSchema, Callable]] = {}

    def register(self, schema: ToolSchema):
        def decorator(fn):
            self._tools[schema.name] = (schema, fn)
            return fn
        return decorator

    def run(self, name: str, args: dict, agent_permissions: set[str]) -> ToolResult:
        schema, fn = self._tools[name]
        if not set(schema.required_permissions) <= agent_permissions:
            return ToolResult.fail("permission_denied")
        for p in schema.required_params:
            if p not in args:
                return ToolResult.fail(f"missing_param:{p}")
        try:
            return ToolResult.ok(fn(**args))
        except Exception as e:
            return ToolResult.fail(str(e))
```

## ToolResult

Never throw raw exceptions into the LLM context:

```python
@dataclass
class ToolResult:
    success: bool
    data: Any = None
    error: str | None = None

    @classmethod
    def ok(cls, data): return cls(True, data=data)
    @classmethod
    def fail(cls, error): return cls(False, error=error)
```

The planner sees: `Observation: {"success": false, "error": "permission_denied"}` and can escalate.

## CaseBot tools

From `stateful-agent-lab`:

- `get_account(account_id)` — read
- `get_transactions(account_id)` — read
- `flag_account(account_id, reason)` — **destructive**, requires `write:accounts`

Destructive tools need explicit permission gates (Chapter 9).

## LLM tool-calling format

You can use OpenAI `tools` JSON schema or plain structured output:

```json
{"tool": "get_account", "args": {"account_id": "456"}}
```

Parse with `json.loads` + validate against `ToolSchema`. No framework required.

## Anti-pattern: exec()

Never let the model emit code that runs directly. Always map to registered tools.

**Companion:** `stateful-agent-lab/agent/tools.py`

**Next →** [Planning and Scratchpads](./08-planning.md)
