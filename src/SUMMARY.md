# Summary

[Building Agentic Systems](./introduction.md)

---

# Book 0: How LLMs Work

- [Introduction to Book 0](./book0/00-introduction-to-book0.md)
- [1. What a neural network actually is](./book0/01-neural-networks.md)
- [2. Tokens — the alphabet of a language model](./book0/02-tokens.md)
- [3. Embeddings — turning integers into meaning](./book0/03-embeddings.md)
- [4. Attention — Q, K, V from scratch](./book0/04-attention.md)
- [5. Transformer layers — stacking attention into depth](./book0/05-transformer-layers.md)
- [6. Generation — how the model produces text](./book0/06-generation.md)
- [7. What the model cannot do alone](./book0/07-llm-limits.md)
- [8. Workflows vs agents — when to use each](./book0/08-workflows-vs-agents.md)

---

# Book 1: Building an Agentic System

Build path: from `repos/memcell-rl/` (this workspace) or a cloned [`memcell-rl`](https://github.com/adu3110/memcell-rl) repo, run `examples/build/step01` … `step09`, then `casebot_regulated.py`.

- [9. Overview — a task is not an agent](./book1/02-philosophy.md)
- [10. The minimal loop](./book1/03-agent-loop.md)
- [11. Tools from scratch](./book1/07-tools.md)
- [12. Trajectory logging](./book1/10-trajectory.md)
- [13. Chat history is not memory](./book1/04-state.md)
- [14. Typed memory cells](./book1/05-typed-memory.md)
- [15. Context assembly under a budget](./book1/06-context-assembly.md)
- [16. Planning and scratchpads](./book1/08-planning.md)
- [17. Stop conditions and escalation](./book1/09-stop-escalate.md)
- [18. Putting it together — CaseBot](./book1/11-together.md)

---

# Book 2: Making Agentic Systems Reliable

- [19. Why Final-Answer Accuracy Lies](./book2/13-final-answer-lies.md)
- [20. Trajectory Properties](./book2/14-trajectory-properties.md)
- [21. Model Failure vs System Failure](./book2/15-model-vs-system.md)
- [22. Long-Context Failure Modes](./book2/16-long-context.md)
- [23. Retrieval vs Memory vs Context](./book2/17-retrieval-memory-context.md)
- [24. Memory Policies and Forgetting](./book2/18-memory-policies.md)
- [25. RL-Ready Transitions](./book2/19-rl-transitions.md)
- [26. Benchmark Design](./book2/20-benchmarks.md)
- [27. Regression Suites](./book2/21-regression.md)
- [28. Production Readiness](./book2/22-production.md)

---

# Book 3: Scaling and Coordinating Agentic Systems

- [29. Why Direct Messaging Breaks](./book3/24-no-direct-messaging.md)
- [30. Append-Only Coordination Logs](./book3/25-ledger.md)
- [31. Conflict Detection and Resolution](./book3/26-conflicts.md)
- [32. Replay and Checkpoints](./book3/27-replay.md)
- [33. Permissions and Sensitive Memory](./book3/28-permissions.md)
- [34. Human-in-the-Loop](./book3/29-hitl.md)
- [35. Cost and Latency Control](./book3/30-cost-latency.md)
- [36. Multi-Agent Orchestration](./book3/31-orchestration.md)
- [37. Regulated Deployment](./book3/32-regulated.md)
- [38. Lessons Learned](./book3/33-lessons.md)
