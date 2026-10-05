# AI Engineer roadmap (evidence-first)

Principle: each step upgrades one repository until it proves a capability, and the portfolio changes only after the repository does.

## Where the evidence stands (2026-10-05)
Strong: Python/FastAPI services, RAG internals, evaluation harnesses, statistics, MLOps drift, CI in three repos.
Thin: agent runtime, structured outputs/tool calling with real models, observability, prompt-injection and tool security, vector DB, async concurrency.
Absent: MCP, caching/queues, cost/latency measurement.

## Milestones
| # | Milestone | Proves | Repo | Done when |
|---|---|---|---|---|
| 1 | From-scratch agent runtime, V0–V9 | provider abstraction, structured output, tool calling, agent loop, state, memory, planning, evaluation, reliability, security, tracing | `ai-agent-from-scratch` | tests green, eval report from the repo, learning notes written, public repo |
| 2 | Same runtime: API, streaming, Postgres, Docker, CI (V10–V12) | production packaging | same | CI green, Docker build verified |
| 3 | Framework comparison (OpenAI Agents SDK, LangGraph, MCP) | judgement about abstractions | same, `comparisons/` | written trade-off doc + working equivalents |
| 4 | Upgrade `ai-skills-platform` | auth, DB, queues-if-justified, observability | itself | live metrics from its own request log |
| 5 | Upgrade `genai-doc-assistant` | pgvector, reranking, injection defense, tracing | itself | eval gate covers injection set |
| 6 | Agent-level eval service | evaluation at scale | `llm-eval-framework` | traces from milestone 1 scored by it |

## Interview questions the milestone-1 repo must let you answer from your own code
What is an agent · the loop · how tool calling works · where state lives · what memory is (four kinds) · stopping infinite loops · evaluating agents · recovering from tool failure · securing tools · LangGraph vs custom · what MCP solves. Notes: `docs/learning-notes/` in the agent repo.

## Rules
No metric is quoted unless the repo can regenerate it. Offline/deterministic models are labelled as such. Real-model results are reported only from recorded runs.
