# 3. Tools from scratch

Tools are how the agent touches the world. Every call needs: a name, validated args, and a structured result — never a raw exception in the prompt.

```bash
python3 examples/build/step03_tools.py
```

```
getAccount: success=True  data={'account_id': '456', 'balance_usd': 142.5, ...}  error=None
getTransactions: success=True  data={'transactions': [...]}  error=None
flagAccount: success=False  data=None  error=unknown_tool:flagAccount
```

`flagAccount` fails with `unknown_tool` — we haven't registered it yet. That's intentional. The registry rejects what you didn't explicitly allow.

## ToolResult

```python
@dataclass
class ToolResult:
    success: bool
    data: dict | None = None
    error: str | None = None
```

The loop checks `success`. On failure it escalates — it does not paste stack traces into the LLM context.

## Registry

```python
class ToolRegistry:
    def run(self, name: str, args: dict) -> ToolResult:
        if name == "getAccount":
            aid = args.get("accountId", "")
            if aid not in ACCOUNTS:
                return ToolResult(success=False, error=f"account_not_found:{aid}")
            return ToolResult(success=True, data=ACCOUNTS[aid])
        # ...
        return ToolResult(success=False, error=f"unknown_tool:{name}")
```

Three properties:

1. **Explicit surface** — only registered tools run
2. **Validation before side effects** — bad args return `ToolResult`, not exceptions
3. **LLM never touches the DB** — registry sits in the middle

## Add flagAccount (your turn)

Copy `step03_tools.py` to `step03b.py`. Add:

```python
if name == "flagAccount":
    return ToolResult(success=True, data={"account_id": args["accountId"], "flagged": True})
```

Re-run. `flagAccount` succeeds — but there's still no check that `getAccount` ran first. Chapter 4 logs order; Book 2 checks it.

**Next →** [Trajectory logging](./10-trajectory.md)
