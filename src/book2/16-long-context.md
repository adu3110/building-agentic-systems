# 16. Long-Context Failure Modes

## Context length ≠ memory

Models with 128k windows still fail predictably. `long-context-bench` tests three modes:

### 1. Needle retrieval

Hide a fact at depth 80% in filler text. Ask for the fact.

**Failure:** model misses needle or hallucinates.

**System fix:** don't rely on needle in raw context — store as typed `fact` cell after extraction.

### 2. Recency conflict

Place correct fact early, misleading fact late.

**Failure:** model prefers recent wrong info.

**System fix:** constraints first in assembly; supersede stale facts; benchmark recency explicitly.

### 3. Distractor injection

Add plausible but irrelevant passages.

**Failure:** answer drifts toward distractor theme.

**System fix:** scope memory; rank by relevance; reduce raw filler in context.

## Running the benchmark

```bash
git clone https://github.com/adu3110/long-context-bench
cd long-context-bench
pip install -e .
export OPENAI_API_KEY=sk-...
lcbench --suite needle --model gpt-4o-mini
lcbench --suite recency --model gpt-4o-mini
```

Report per-mode accuracy, not one number.

## Design implication

If needle accuracy drops at depth > 32k tokens, **your architecture must not depend on raw retrieval at depth**. External memory is mandatory.

**Companion:** [long-context-bench](https://github.com/adu3110/long-context-bench)

**Next →** [Retrieval vs Memory vs Context](./17-retrieval-memory-context.md)
