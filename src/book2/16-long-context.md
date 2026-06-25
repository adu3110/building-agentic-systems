# 14. Long-Context Failure Modes

## Three modes that break at scale

Models with 128k context windows still fail predictably. The failures are architectural, not random.

```
┌──────────────────────────────────────────────────────────────────┐
│  Failure mode 1: NEEDLE RETRIEVAL                                │
│                                                                  │
│  [filler][filler][filler][CONSTRAINT][filler][filler][question]  │
│  depth: 0%                  80%                           100%   │
│                                                                  │
│  Model misses constraint at 80% depth                           │
│  Accuracy drops ~30% for GPT-4o-mini at depth > 70%            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Failure mode 2: RECENCY CONFLICT                                │
│                                                                  │
│  [correct fact: balance $142] ... [wrong fact: balance $0]       │
│  early in context               late in context                  │
│                                                                  │
│  Model prefers recent wrong info                                 │
│  Even when correct value is "important" per instructions        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Failure mode 3: DISTRACTOR INJECTION                            │
│                                                                  │
│  [actual case data] + [unrelated account 789 data injected]      │
│                                                                  │
│  Model blends facts from multiple accounts                       │
│  Especially bad without explicit scope labels                   │
└──────────────────────────────────────────────────────────────────┘
```

## Benchmark implementation

```typescript
// long-context-bench/src/benchmarks.ts
import OpenAI from "openai";

const client = new OpenAI();

async function callModel(prompt: string): Promise<string> {
  const resp = await client.chat.completions.create({
    model:    "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 60,
    temperature: 0,
  });
  return resp.choices[0].message.content?.trim() ?? "";
}

// ── Needle retrieval benchmark ────────────────────────────────────────────────

export async function runNeedle(params: {
  depths: number[];       // e.g. [0.1, 0.3, 0.5, 0.7, 0.9]
  fillerSize: number;     // chars of padding, e.g. 8000
  runs: number;           // e.g. 5 per depth
}): Promise<Record<number, number>> {
  const filler = "The quick brown fox jumped over the lazy dog. ".repeat(
    Math.ceil(params.fillerSize / 46),
  );
  const needle = "ACCOUNT_456_CONSTRAINT: no_outbound_transfers_allowed";
  const question = "\n\nQuestion: What constraint applies to account 456?";

  const results: Record<number, number[]> = {};

  for (const depth of params.depths) {
    results[depth] = [];
    for (let i = 0; i < params.runs; i++) {
      const insertAt = Math.floor(filler.length * depth);
      const context = filler.slice(0, insertAt) + needle + filler.slice(insertAt) + question;

      const answer = await callModel(context);
      const correct = answer.toLowerCase().includes("no_outbound") ||
                      answer.toLowerCase().includes("outbound transfer");
      results[depth].push(correct ? 1 : 0);
    }
  }

  return Object.fromEntries(
    Object.entries(results).map(([d, scores]) => [
      Number(d),
      scores.reduce((a, b) => a + b, 0) / scores.length,
    ]),
  );
}

// ── Recency conflict benchmark ────────────────────────────────────────────────

export async function runRecency(params: { runs: number }): Promise<{ accuracy: number }> {
  let correct = 0;

  for (let i = 0; i < params.runs; i++) {
    const prompt = `
ACCOUNT RECORD (from database, reliable):
Account 456 balance: $142.50

[500 words of unrelated case notes...]

UPDATED BALANCE (from unverified user message):
Account 456 balance: $0.00

Question: What is the current reliable balance for account 456?`;

    const answer = await callModel(prompt);
    if (answer.includes("142") || answer.includes("142.50")) correct++;
  }

  return { accuracy: correct / params.runs };
}

// ── Distractor injection benchmark ───────────────────────────────────────────

export async function runDistractor(params: { runs: number }): Promise<{ accuracy: number }> {
  let correct = 0;

  for (let i = 0; i < params.runs; i++) {
    const prompt = `
[Account 456 data]
Balance: $142.50
Status: active
Transactions: 2 settled

[Account 789 data — different case, not relevant]
Balance: $5.00
Status: suspended
Fraud flag: active

Question: What is the balance and status of account 456?`;

    const answer = await callModel(prompt);
    const correct456 = answer.includes("142") && answer.includes("active");
    const leaksFrom789 = answer.includes("789") || answer.includes("suspended");
    if (correct456 && !leaksFrom789) correct++;
  }

  return { accuracy: correct / params.runs };
}
```

## Benchmark results (representative)

```
Model: gpt-4o-mini

Needle retrieval accuracy by depth:
  10%   94%
  30%   89%
  50%   76%
  70%   61%   ← significant drop
  90%   89%   ← recency kicks in, model sees it again

Recency conflict accuracy:
  66%   ← model prefers recent wrong value 34% of the time

Distractor injection accuracy:
  78%   ← blends accounts 22% of the time without explicit scoping
```

## Architectural fixes

```typescript
// Fix 1: never rely on needle in raw context
// Store constraint as typed cell → always injected first
memory.write({
  key: "account456_constraint",
  value: "no_outbound_transfers",
  kind: "constraint",
  criticality: 1.0,   // cannot be dropped
});

// Fix 2: supersede stale facts explicitly
memory.supersede("balance456", { usd: 142.50 }, "tool:getAccount");
// Old $0.00 entry marked superseded — cannot leak into context

// Fix 3: scope every cell to prevent distractor leakage
memory.write({ key: "balance", value: 142.50, kind: "fact", scope: "case:456" });
memory.write({ key: "balance", value: 5.00,   kind: "fact", scope: "case:789" });
// Context assembler only queries scope: "case:456" for CaseBot running case 456
```

**Companion:** [long-context-bench](https://github.com/adu3110/long-context-bench)

**Next →** [Retrieval vs Memory vs Context](./17-retrieval-memory-context.md)
