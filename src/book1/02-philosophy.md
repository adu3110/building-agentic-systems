# 1. Overview and Philosophy

## The agent stack, exposed

Every agent framework bundles the same six layers. They just don't tell you that.

```
┌─────────────────────────────────────────────────────────────┐
│  Your domain logic (CaseBot: account review, flag, close)   │
├─────────────────────────────────────────────────────────────┤
│  Agent loop  (observe → decide → act → update → repeat)     │
├─────────────────────────────────────────────────────────────┤
│  Memory & state  (typed cells, not chat transcript)         │
├─────────────────────────────────────────────────────────────┤
│  Context assembly  (what actually enters the prompt)        │
├─────────────────────────────────────────────────────────────┤
│  Tools & permissions  (registered actions + access gates)   │
├─────────────────────────────────────────────────────────────┤
│  Evaluation & logging  (trajectory, properties, audit)      │
└─────────────────────────────────────────────────────────────┘
              LLM API  (HTTP, replaceable)
```

LangChain, CrewAI, AutoGen all ship an opaque version of this stack. They optimise for "first demo in 20 lines." That's fine until you need to answer: *Why did the agent waive a fee without approval?*

This series builds every layer so you can answer that question.

## What breaks in production (and which layer is responsible)

| Incident | Real cause | Layer |
|----------|------------|-------|
| Agent "forgot" the constraint set in turn 2 | Constraint not in typed store | Memory |
| Agent called `flagAccount` before reading transactions | Wrong step order | Loop / Planner |
| Agent waived fee without supervisor approval | Permission gate missing | Tools |
| Agent looped the same tool call 6 times | No duplicate detection | Loop |
| Correct data stored, wrong answer produced | Wrong cells in context | Context assembly |
| Passed demo, failed at 50 messages | Unbounded transcript growth | Context assembly |

You cannot fix layer-3 bugs by tuning the prompt. You need to own the layer.

## Design principles

### 1. State is a program, not a transcript

```typescript
// Bad: state is implicit in message position
const messages = [
  { role: "user",      content: "Never waive fees without approval." },
  // 40 turns of conversation...
  { role: "assistant", content: "I'll waive the $50 fee." }  // violated
];

// Good: state is a named, typed object
memory.write({
  key: "feeWaiverPolicy",
  value: "requires_supervisor_approval",
  kind: "constraint",
  criticality: 1.0,   // always injected, never dropped under token pressure
});
```

### 2. Actions are typed and validated before dispatch

```typescript
// Bad: let the LLM emit whatever it wants
eval(llmResponse);  // never

// Good: registered schema, validated args, permission check
const result = await registry.run({
  name: "flagAccount",
  args: { accountId: "456", reason: "unusual_pattern" },
  agentPermissions: new Set(["read:accounts"]),
  // missing "write:accounts" → ToolResult { success: false, error: "permission_denied" }
});
```

### 3. The unit of evaluation is the trajectory, not the final answer

```
Task: Review account 456 for fraud. Flag if suspicious.

Run A — Final answer: "Flagged"  ✓ correct
  step 1: flagAccount("456")  ← no prior lookup, no constraint check

Run B — Final answer: "Flagged"  ✓ correct
  step 1: getAccount("456")
  step 2: getTransactions("456")
  step 3: check constraints → fraud_review_active = true
  step 4: flagAccount("456")  ← after full protocol
```

Run A scores 100% on accuracy. Run A is a compliance failure.

### 4. The LLM is a component, not the architecture

```
LLM decides WHAT to do.
TypeScript decides WHETHER it's allowed.
TypeScript decides WHAT state is updated.
TypeScript decides WHAT gets logged.
```

Swap `gpt-4o` for `claude-3-5-sonnet` without touching the loop, memory, tools, or eval.

### 5. Build naive first, measure the failure, add the layer

Week 1: chat-only loop. Works on demos.
Week 2: first constraint violation. Add typed memory.
Week 3: context overflow at 40 turns. Add context assembly.
Week 4: tool loop in production. Add duplicate detection + step budget.

This book follows that progression.

## The running example: CaseBot

CaseBot is a regulated case-resolution agent:
- Looks up customer accounts and transaction history
- Applies business rules (some require supervisor approval)
- Flags accounts for review when patterns match
- Logs every step for compliance audit

```
stateful-agent-lab/
├── src/
│   ├── agent.ts        ← loop
│   ├── memory.ts       ← typed state
│   ├── planner.ts      ← planning
│   ├── tools.ts        ← registry + dispatch
│   └── trajectory.ts   ← logging
└── tests/
    └── properties.test.ts  ← trajectory invariants
```

**Next →** [The Minimal Agent Loop](./03-agent-loop.md)
