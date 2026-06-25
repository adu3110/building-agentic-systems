# 32. Regulated Deployment

## What regulators and enterprise security ask

1. What decision was made?
2. What data informed it?
3. Who / what agent acted?
4. Can you reproduce state at decision time?
5. Was policy violated?

Ledger + trajectory + typed memory answers all five.

## Deployment topology

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  CaseBot    │────►│ memcell-rl   │     │  LLM API    │
│  agents     │     │ (memory API) │     │  (vendor)   │
└──────┬──────┘     └──────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ agent-ledger│────►│ Object store │
│ (LEDGER.md) │     │ (audit archive)│
└─────────────┘     └──────────────┘
```

- Agents run in your VPC
- Memory and ledger stay local
- LLM is stateless replaceable component
- Export ledgers to immutable storage (WORM) daily

## Data retention

Align memory cell TTL and ledger archive with policy:

- PII cells expire or anonymize
- Ledgers retained N years
- Trajectory exports redacted for ops, full for audit role

## Change management

Model upgrade = re-run regression suite + long-context bench.  
Policy change = version `baseline_v0` → `baseline_v1`, parallel run in shadow mode.

## Real domain: Kyne AI

Agent OS for financially regulated enterprises — debt collection as initial domain. Same architecture: typed memory, trajectory eval, human approval, audit log.

**Next →** [Lessons Learned](./33-lessons.md)
