# Building Agentic Systems

A framework-free guide to building agentic systems from first principles — memory, tools, planning, evaluation, and coordination.

**Read online:** [adu3110.github.io/building-agentic-systems](https://adu3110.github.io/building-agentic-systems/)

## Structure

| Book | Topic |
|------|-------|
| **Book 1** | Building an Agentic System — loop, memory, tools, planning |
| **Book 2** | Making Agentic Systems Reliable — eval, benchmarks, memory policy |
| **Book 3** | Scaling and Coordinating Agentic Systems — ledger, multi-agent, regulated deployment |

## Build locally

```bash
# Install mdBook (pick one)
brew install mdbook          # macOS
# cargo install mdbook       # if you have Rust

cd building-agentic-systems
mdbook build
mdbook serve   # http://localhost:3000
```

Output is in `book/`.

## Companion repos

- [stateful-agent-lab](https://github.com/adu3110/stateful-agent-lab)
- [memcell-rl](https://github.com/adu3110/memcell-rl)
- [long-context-bench](https://github.com/adu3110/long-context-bench)
- [llm-evals-from-scratch](https://github.com/adu3110/llm-evals-from-scratch)
- [agent-ledger](https://github.com/adu3110/agent-ledger)

## Deploy

Push to `main` — GitHub Actions builds with mdBook and publishes to GitHub Pages.

## License

MIT
