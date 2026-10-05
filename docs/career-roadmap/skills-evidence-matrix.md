# Skills evidence matrix

Status key: **HAVE** = a public repo demonstrates it with tests · **PARTIAL** = present but shallow/offline-only · **MISSING** = no evidence. "Proof" names the repository that would carry it. Based on the 2026-10-05 scan of all 22 repos (see `project-upgrade-matrix.md`); statuses reflect README + code signals, so a PARTIAL may be fairly good and a HAVE may still have gaps.

| Capability | Status | What exists | Proof today | New project needed? |
|---|---|---|---|---|
| Python engineering, testing | HAVE | Typed, tested libraries throughout | all repos | no |
| FastAPI | HAVE | API in genai-doc-assistant, ai-skills-platform, mlops-platform, llm-eval-framework | those repos | no |
| Async systems | PARTIAL | FastAPI handlers; little real `asyncio` concurrency | — | no → from-scratch agent runtime (async tool execution) |
| LLM APIs | PARTIAL | Provider hooks (Gemini/OpenAI) exist but run offline in CI | genai-doc-assistant | no → real provider adapters with mocked + one recorded live run |
| Structured outputs | MISSING | Offline planners emit structured steps; no schema-validated model output | — | no → from-scratch agent V0 |
| Tool calling | PARTIAL | Tool registry in ai-agent-toolkit, no schema validation/errors model | ai-agent-toolkit | no → from-scratch agent V1 |
| Agents / orchestration | PARTIAL | ReAct loop; router-agent | ai-agent-toolkit, genai-doc-assistant | **this is the first milestone** |
| MCP | MISSING | none | — | no → expose the from-scratch tools via MCP |
| RAG, embeddings | HAVE (offline) | Chunking, hashed embeddings, hybrid retrieval, citations | genai-doc-assistant | no |
| Vector databases | MISSING | In-memory/file store only | — | no → pgvector in a later upgrade |
| Hybrid retrieval, reranking | PARTIAL | vector+keyword blend; no cross-encoder/RRF | genai-doc-assistant | no |
| Evaluation | HAVE | Retrieval hit-rate/MRR, rubric gates, A/B stats | genai-doc-assistant, llm-eval-framework | no → agent-level eval (V6) |
| LLM observability | MISSING | logging only | — | no → structured events/traces (V9) |
| Prompt-injection defense, guardrails | MISSING | extractive abstention only | — | no → V8 |
| Human-in-the-loop | PARTIAL | confidence review in vision-inference-api | vision-inference-api | no → approval gates (V7/V8) |
| Provider abstraction | PARTIAL | interface exists per repo | genai-doc-assistant | no → V0 |
| Caching, queues | MISSING | none | — | only if a project needs them |
| PostgreSQL | PARTIAL | ai-skills-platform request log (verify), SQL warehouse | ai-skills-platform | no |
| Redis | MISSING | none | — | only if justified |
| Docker, CI/CD | HAVE (3 repos) | genai-doc-assistant, mlops-platform, ai-skills-platform | those | no |
| Cloud deployment | PARTIAL | render.yaml / fly.toml present, not verified live | genai-doc-assistant | no |
| Monitoring | PARTIAL | drift monitor (mlops) | mlops-platform | no |
| Failure handling, latency/cost optimisation | PARTIAL | retries/abstention in places; no measured latency/cost | — | no → V6/V7 measure them |
| SQL, data pipelines | HAVE | warehouse, lakehouse, streaming | sql-analytics-warehouse, spark-data-lakehouse | no |
| Customer discovery, ambiguous requirements, business impact | MISSING | no project begins from a customer scenario | — | **yes** → customer-support intelligence (later) |
| Enterprise integration (CRM/SQL/Slack), workflow automation | MISSING | ai-skills-platform has the gateway shape only | ai-skills-platform | yes, same later project |
| Security constraints, customer-specific configuration | MISSING | API-key auth only | — | yes, same later project |
| Technical communication | PARTIAL | good READMEs/portfolio; no incident write-ups or design docs for a customer | — | produce with the FDE project |

## Reading this
Two new projects are genuinely necessary in the whole plan: the from-scratch agent runtime, and one customer-scenario FDE system. Everything else is an upgrade of what exists.
