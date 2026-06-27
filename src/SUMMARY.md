# Summary

[Building Agentic Systems](./introduction.md)

---

# Book 0: How LLMs Work

- [Book 0 Roadmap — the LLM stack in order](./book0/00-introduction-to-book0.md)
- [0.1 What a neural network actually is](./book0/01-neural-networks.md)
- [0.2 Tokens — the alphabet of a language model](./book0/02-tokens.md)
- [0.3 Embeddings — turning integers into meaning](./book0/03-embeddings.md)
- [0.4 Attention — Q, K, V from scratch](./book0/04-attention.md)
- [0.5 Transformer layers — stacking attention into depth](./book0/05-transformer-layers.md)
- [0.6 Generation — how the model produces text](./book0/06-generation.md)
- [0.7 What the model cannot do alone](./book0/07-llm-limits.md)
- [0.8 Workflows vs agents — when to use each](./book0/08-workflows-vs-agents.md)

---

# Book 1: Building an Agentic System

Build path: from `repos/memcell-rl/` (this workspace) or a cloned [`memcell-rl`](https://github.com/adu3110/memcell-rl) repo, run `examples/build/step01` … `step09`, then `casebot_regulated.py`.

- [Book 1 Roadmap — building CaseBot layer by layer](./book1/00-roadmap.md)
- [1.1 A task is not an agent](./book1/02-philosophy.md)
- [1.2 The minimal loop](./book1/03-agent-loop.md)
- [1.3 Tools from scratch](./book1/07-tools.md)
- [1.4 Trajectory logging](./book1/10-trajectory.md)
- [1.5 Chat history is not memory](./book1/04-state.md)
- [1.6 Typed memory cells](./book1/05-typed-memory.md)
- [1.7 Context assembly under a budget](./book1/06-context-assembly.md)
- [1.8 Planning and scratchpads](./book1/08-planning.md)
- [1.9 Stop conditions and escalation](./book1/09-stop-escalate.md)
- [1.10 Putting it together — CaseBot](./book1/11-together.md)

---

# Book 2: Making Agentic Systems Reliable

- [Book 2 Roadmap — five acts from measure to ship](./book2/00-roadmap.md)
- [2.1 Why Final-Answer Accuracy Lies](./book2/13-final-answer-lies.md)
- [2.2 Trajectory Properties](./book2/14-trajectory-properties.md)
- [2.3 Model Failure vs System Failure](./book2/15-model-vs-system.md)
- [2.4 Long-Context Failure Modes](./book2/16-long-context.md)
- [2.5 Retrieval vs Memory vs Context](./book2/17-retrieval-memory-context.md)
- [2.6 Memory Policies and Forgetting](./book2/18-memory-policies.md)
- [2.7 RL-Ready Transitions](./book2/19-rl-transitions.md)
- [2.8 Benchmark Design](./book2/20-benchmarks.md)
- [2.9 Regression Suites](./book2/21-regression.md)
- [2.10 Production Readiness](./book2/22-production.md)

---

# Book 3: Scaling and Coordinating Agentic Systems

- [Book 3 Roadmap — from one agent to many](./book3/00-roadmap.md)
- [3.1 Why Direct Messaging Breaks](./book3/24-no-direct-messaging.md)
- [3.2 Append-Only Coordination Logs](./book3/25-ledger.md)
- [3.3 Conflict Detection and Resolution](./book3/26-conflicts.md)
- [3.4 Replay and Checkpoints](./book3/27-replay.md)
- [3.5 Permissions and Sensitive Memory](./book3/28-permissions.md)
- [3.6 Human-in-the-Loop](./book3/29-hitl.md)
- [3.7 Cost and Latency Control](./book3/30-cost-latency.md)
- [3.8 Multi-Agent Orchestration](./book3/31-orchestration.md)
- [3.9 Regulated Deployment](./book3/32-regulated.md)
- [3.10 Lessons Learned](./book3/33-lessons.md)
