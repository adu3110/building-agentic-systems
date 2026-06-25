# 22. Production Readiness

## Checklist before real users

### Observability
- [ ] Every run has `task_id`, trajectory export, memory snapshot
- [ ] Tool errors structured, not stack traces in prompt
- [ ] Latency per step logged

### Safety
- [ ] Destructive tools gated
- [ ] Constraints never silently dropped
- [ ] Escalation path tested

### Evaluation
- [ ] Property suite green on release commit
- [ ] Long-context benchmarks run on target model
- [ ] Failure taxonomy used in incident reviews

### Operations
- [ ] Token budget per case enforced
- [ ] Rate limits on LLM and tools
- [ ] Idempotent tool calls where possible

## What "production-ready" is not

- Demo video
- 95% on one happy-path accuracy number
- "We use LangChain so it's enterprise-grade"

## Book 2 summary

You can now **measure** CaseBot — not just run it. Book 3 adds **multiple agents** and **audit-grade coordination**.

**Book 2 complete.** → [Book 3: Why Direct Messaging Breaks](../book3/24-no-direct-messaging.md)
