# 6. Tools from Scratch

## What a production tool layer looks like

```
┌───────────────────────────────────────────────────────────────┐
│  LLM emits: { "type": "toolCall", "tool": "getAccount",       │
│               "args": { "accountId": "456" } }                │
│                             │                                 │
│                             ▼                                 │
│  ToolRegistry.run()                                           │
│    │                                                          │
│    ├─ 1. Lookup schema by name ── not found → error           │
│    ├─ 2. Validate args against schema ─── missing → error     │
│    ├─ 3. Check permissions ─────────────── denied → error     │
│    ├─ 4. Execute function                                     │
│    └─ 5. Catch exceptions → ToolResult { success: false }     │
│                             │                                 │
│                             ▼                                 │
│  ToolResult { success: true, data: {...} }                    │
│  written to memory as observation                             │
└───────────────────────────────────────────────────────────────┘
```

## Types

```typescript
// src/tools.ts

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, "string" | "number" | "boolean">;
  required: string[];
  requiredPermissions: string[];
  isDestructive: boolean;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

type ToolFn = (args: Record<string, unknown>) => Promise<unknown>;
```

## Registry

```typescript
// src/tools.ts (continued)

export class ToolRegistry {
  private tools = new Map<string, { schema: ToolSchema; fn: ToolFn }>();

  register(schema: ToolSchema, fn: ToolFn): void {
    this.tools.set(schema.name, { schema, fn });
  }

  async run(
    name: string,
    args: Record<string, unknown>,
    agentPermissions: Set<string> = new Set(),
  ): Promise<ToolResult> {
    const entry = this.tools.get(name);
    if (!entry) {
      return { success: false, error: `unknown_tool:${name}` };
    }

    const { schema, fn } = entry;

    // Permission check — before touching any real data
    for (const perm of schema.requiredPermissions) {
      if (!agentPermissions.has(perm)) {
        return { success: false, error: `permission_denied:${perm}` };
      }
    }

    // Arg validation
    for (const key of schema.required) {
      if (args[key] == null) {
        return { success: false, error: `missing_param:${key}` };
      }
    }

    // Type validation (lightweight)
    for (const [key, expectedType] of Object.entries(schema.parameters)) {
      if (args[key] != null && typeof args[key] !== expectedType) {
        return { success: false, error: `wrong_type:${key}:expected_${expectedType}` };
      }
    }

    // Execute
    try {
      const data = await fn(args);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  schemas(): ToolSchema[] {
    return [...this.tools.values()].map(e => e.schema);
  }

  // OpenAI tools format for the API call
  openAITools() {
    return this.schemas().map(s => ({
      type: "function" as const,
      function: {
        name: s.name,
        description: s.description,
        parameters: {
          type: "object",
          properties: Object.fromEntries(
            Object.entries(s.parameters).map(([k, t]) => [k, { type: t }]),
          ),
          required: s.required,
        },
      },
    }));
  }
}
```

## CaseBot tools

```typescript
// src/casebot_tools.ts
import { ToolRegistry } from "./tools.js";

export function buildRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register(
    {
      name: "getAccount",
      description: "Look up an account by ID",
      parameters: { accountId: "string" },
      required: ["accountId"],
      requiredPermissions: ["read:accounts"],
      isDestructive: false,
    },
    async ({ accountId }) => {
      // Replace with real API call
      return {
        id: accountId,
        status: "active",
        plan: "pro",
        balanceUsd: 142.50,
        createdAt: "2024-01-15",
      };
    },
  );

  registry.register(
    {
      name: "getTransactions",
      description: "Get recent transactions for an account",
      parameters: { accountId: "string" },
      required: ["accountId"],
      requiredPermissions: ["read:transactions"],
      isDestructive: false,
    },
    async ({ accountId }) => ({
      accountId,
      transactions: [
        { id: "tx_001", amount: 99.99,  status: "settled", date: "2024-06-20" },
        { id: "tx_002", amount: 42.51,  status: "settled", date: "2024-06-18" },
      ],
    }),
  );

  registry.register(
    {
      name: "flagAccount",
      description: "Flag an account for review",
      parameters: { accountId: "string", reason: "string" },
      required: ["accountId", "reason"],
      requiredPermissions: ["write:accounts"],   // ← destructive: needs extra permission
      isDestructive: true,
    },
    async ({ accountId, reason }) => ({
      flagged: true,
      accountId,
      reason,
      flaggedAt: new Date().toISOString(),
    }),
  );

  return registry;
}
```

## Permission model

```
┌──────────────────────────────────────────────────────────────┐
│  Agent Role          │  Permissions                          │
├──────────────────────────────────────────────────────────────┤
│  InvestigatorAgent   │  read:accounts, read:transactions     │
│  PolicyAgent         │  read:accounts, read:constraints      │
│  ResolverAgent       │  read:accounts, write:resolutions     │
│  SupervisorAgent     │  read:accounts, write:accounts        │
└──────────────────────────────────────────────────────────────┘

flagAccount requires write:accounts
→ InvestigatorAgent cannot call it directly
→ must escalate to SupervisorAgent (Book 3)
```

## What the LLM sees vs what runs

```typescript
// What the LLM is told (via system prompt + tool schema):
// "Call flagAccount with { accountId, reason }"

// What actually happens before fn() runs:
//   1. schema lookup     — does flagAccount exist?
//   2. permission check  — does this agent have write:accounts?
//   3. arg validation    — is accountId a non-null string?
//   4. then and only then — fn({ accountId, reason })

// The LLM proposes. TypeScript disposes.
```

**Companion:** `stateful-agent-lab/src/tools.ts`

**Next →** [Planning and Scratchpads](./08-planning.md)
