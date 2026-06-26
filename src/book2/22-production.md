# 20. Production Readiness

"Production-ready" is not a state you reach. It's a set of properties you can verify. Here's the checklist I use before any agent system handles real cases.

## Observability

Every run must produce an artifact a human can inspect after the fact. Not a log file full of LLM tokens — a structured record of what the agent did.

- [ ] Every run has a `case_id`, trajectory export, and outcome string
- [ ] Tool errors are structured (`ToolResult.success, ToolResult.error`), not stack traces in the prompt
- [ ] Latency per step is logged (`timestamp` on every `TrajectoryStep`)
- [ ] Memory context assembled for each step is loggable (the string returned by `fetch_memcell_context`)

CaseBot writes `logs/case456.json` on every run. That file answers compliance question 1: "what did the agent do?"

## Safety

The bad path must fail loudly, not silently produce a wrong answer.

- [ ] Destructive tools are gated by permission check in the registry
- [ ] Constraints with `criticality: 1.0` are tested to actually appear in context under pressure
- [ ] Escalation path is tested: known bad inputs produce `ESCALATED:...` outcomes
- [ ] Stop conditions cover: duplicate calls, max steps, tool errors, permission denied

Run both `--dry-run` and `--dry-run --bad-run` in CI. Both must exit cleanly — one with PASS, one with FAIL on property checks.

## Evaluation

You cannot ship an agent you can't measure.

- [ ] Property suite is green on the release commit
- [ ] Needle, recency, and distractor benchmarks have been run on the target model
- [ ] Failure taxonomy (ch. 13) is used for any failure during staging
- [ ] "All properties passed" rate reported alongside outcome accuracy

## Operations

Agents spend money in loops. Control the spending.

- [ ] Token budget per case is enforced in context assembly
- [ ] `max_steps` is set per task type, not a single global value
- [ ] LLM API rate limits handled with backoff (not silent failure)
- [ ] Tool calls that hit external APIs are idempotent where possible (or deduplicated by the loop)
- [ ] memcell-rl is behind a health check — agent loop degrades gracefully if memory service is down

## What production-ready is not

- A demo video where the agent succeeds on the happy path
- 95% outcome accuracy on one case type
- "We use a production LLM provider" — the LLM provider's uptime doesn't cover your loop's correctness
- Passing a compliance review by showing the system prompt contains the right rules

## Before you go live

Run this mental checklist:

**If the LLM returns garbage for one step, does the loop escalate cleanly?**  
(Tool result validation + stop conditions → yes)

**If memcell-rl is unreachable, does the loop degrade gracefully or crash?**  
(`except URLError` in `fetch_memcell_context` — CaseBot falls back to hardcoded context)

**If a new case type is added with a missing constraint, how fast does a failure show up in CI?**  
(Property suite runs on every PR — immediately)

**If a regulator asks "what did the agent know when it flagged account 456?", can you answer?**  
(Trajectory JSON + superseded memory cells → yes)

If all four answers are "yes," you're close enough to production.

## Book 2 complete

Book 1 gave you a working loop. Book 2 gave you the ability to measure whether it's working correctly — and the vocabulary to diagnose when it's not.

Book 3 extends CaseBot to multiple agents: coordination, conflict resolution, human approval, and audit-grade deployment.

**→** [Book 3: Why Direct Messaging Breaks](../book3/24-no-direct-messaging.md)
