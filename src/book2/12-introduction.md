# 12. Introduction

Book 1 gave you a working agent. Book 2 asks: **how do you know it works?**

Demos lie. Agents pass happy-path tests and fail in production on:

- Needle facts buried at 80% context depth
- Fresh wrong info overriding old correct constraints (recency conflict)
- Correct answers via unsafe tool order
- Memory cells that should have been suppressed

This book builds **measurement** — benchmarks, trajectory properties, memory policies, and RL-ready logs — still without agent frameworks.

## Companion repos

| Repo | Focus |
|------|-------|
| [long-context-bench](https://github.com/adu3110/long-context-bench) | Needle, recency, distractor tests |
| [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch) | Factuality, retrieval, trajectory eval |
| [memcell-rl](https://github.com/adu3110/memcell-rl) | Memory decisions as RL transitions |

**Next →** [Why Final-Answer Accuracy Lies](./13-final-answer-lies.md)
