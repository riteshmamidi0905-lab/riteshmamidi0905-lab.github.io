# Project upgrade matrix

Source: every one of the 22 repositories cloned and scanned on 2026-10-05. Columns marked "yes" come from **file/keyword scans** (tests dir, FastAPI/Flask, DB library imports, Dockerfile/compose, `.github/workflows`, logging/tracing libs, eval/metric code, auth/guardrail terms). They are a screening heuristic, not a code review — "yes" means the signal exists, not that it is deep. Tiers and actions are my judgment from READMEs plus those signals.

Tiers: **S** serious engineering evidence · **A** strong, worth upgrading · **B** useful supporting · **C** old/basic, keep in library · **REPLACE** superseded.

| Project | Tier | Maturity | AI-Eng value | FDE value | LOC | Tests | API | DB | Docker | CI | Obs. | Eval | Security | Action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| genai-doc-assistant | S | High | High | High | 2061 | yes | yes | yes | yes | yes | yes | yes | yes | KEEP + upgrade later |
| llm-eval-framework | S | High | High | Med | 1433 | yes | yes | — | — | — | — | yes | yes | KEEP |
| mlops-platform | S | High | Med | Med | 1219 | yes | yes | — | yes | yes | yes | yes | yes | KEEP |
| ai-skills-platform | A | Med-High | High | High | 601 | yes | yes | yes | yes | yes | — | yes | yes | UPGRADE (candidate) |
| experimentation-toolkit | A | Med-High | Med | High | 839 | yes | — | — | — | — | — | yes | yes | KEEP |
| realtime-streaming-pipeline | A | Med | Med | High | 368 | yes | — | yes | yes | — | — | yes | — | UPGRADE later |
| spark-data-lakehouse | A | Med | Low | High | 438 | yes | — | — | — | — | — | — | — | UPGRADE later |
| vision-inference-api | A | Med | Med | Low | 628 | yes | yes | — | yes | — | — | yes | yes | KEEP |
| ai-agent-toolkit | B | Low-Med | Med | Low | 694 | yes | — | — | — | — | — | yes | yes | REPLACE by ai-agent-from-scratch |
| customer-churn-prediction | B | Low-Med | Low | Med | 477 | yes | — | — | — | — | — | yes | yes | KEEP |
| nlp-text-intelligence | B | Low-Med | Med | Low | 822 | yes | — | — | — | — | — | yes | yes | KEEP |
| product-analytics-funnel-retention | B | Med | Low | Med | 497 | yes | — | — | — | — | — | yes | yes | KEEP |
| rag-doc-qa | B | Low-Med | Med | Low | 619 | yes | yes | — | yes | — | — | yes | yes | REPLACE (superseded) |
| saas-kpi-dashboard | B | Low-Med | Low | Med | 415 | yes | — | — | — | — | — | yes | yes | KEEP |
| sql-analytics-warehouse | B | Med | Low | High | 418 | yes | — | yes | — | — | — | — | yes | KEEP |
| bird-deterrent-signal-intelligence | C | Low | Low | Low | 593 | yes | — | — | — | — | — | yes | yes | ARCHIVE |
| document-ocr-vision | C | Low | Low | Low | 594 | yes | — | — | — | — | — | yes | yes | ARCHIVE |
| face-recognition-biometrics | C | Low | Low | Low | 525 | yes | — | — | — | — | — | yes | yes | ARCHIVE |
| neural-machine-translation | C | Low | Low | Low | 646 | yes | — | — | — | — | — | yes | yes | ARCHIVE |
| sign-language-recognition | C | Low | Low | Low | 539 | yes | yes | — | — | — | — | yes | yes | ARCHIVE |
| speech-intelligence | C | Low | Low | Low | 595 | yes | — | — | — | — | — | yes | yes | ARCHIVE |
| video-intelligence | C | Low | Low | Low | 580 | yes | — | — | — | — | — | yes | yes | ARCHIVE |

## Notes per project
- **genai-doc-assistant** — Full RAG app: FastAPI, Docker, CI, eval gate, streaming. Missing: real vector DB, prompt-injection defense, tracing.
- **llm-eval-framework** — Weighted rubric + hard gates, REST API, CLI. No Docker/CI of its own; LLM judge is opt-in only.
- **mlops-platform** — Registry, serving, PSI/KS drift, CI, Docker. Missing: real cloud deploy, retraining automation.
- **ai-skills-platform** — Only repo with API + DB + Docker + CI + auth + request logging. Best base for customer-integration (FDE) work; not on the portfolio flagship list.
- **experimentation-toolkit** — Strong statistics (power, CUPED, guardrails). No API/CI.
- **realtime-streaming-pipeline** — Kafka+Spark+Cassandra compose stack; runtime integration untested, no CI, small (368 LOC). Honest A, not S.
- **spark-data-lakehouse** — Medallion pipeline, tests on transforms; no CI/orchestration/data-quality gate.
- **vision-inference-api** — API + Docker + human-in-the-loop review idea; vision is off the target roles.
- **ai-agent-toolkit** — ReAct loop with offline planner (581 LOC agent code). No state model, safety, tracing, API, CI.
- **customer-churn-prediction** — Classic ML; useful business framing.
- **product-analytics-funnel-retention** — Funnel/retention analytics.
- **rag-doc-qa** — Smaller predecessor of genai-doc-assistant.
- **sql-analytics-warehouse** — Advanced SQL; SQL fluency matters for FDE work.
- **face-recognition-biometrics** — Sensitive domain; keep out of the foreground.
- **sign-language-recognition** — Older CV project.

## What the matrix says
1. Only **three** repositories (genai-doc-assistant, mlops-platform, ai-skills-platform) have API + Docker + CI together. Everything else is a good library without production scaffolding.
2. **Nobody has real observability** (tracing/metrics beyond logging) or **prompt-injection/tool-permission** work. These are the most requested AI-engineer gaps and are absent everywhere.
3. The agent evidence is the weakest relative to the target role: `ai-agent-toolkit` is a ReAct demo with a canned planner.
4. The portfolio's six flagships are a topical choice (agents/RAG/eval/streaming/MLOps/experimentation). By engineering depth, `ai-skills-platform` deserves flagship consideration and the streaming/lakehouse repos are thinner than their site placement implies. The site already labels their limits honestly; no change is needed now.

## Choice for the first deep milestone
**A new from-scratch agent runtime (`ai-agent-from-scratch`)**, replacing `ai-agent-toolkit` as the agent evidence. Why first: agents are the most valuable single gap for AI Engineer, they feed every later FDE project (the customer-support project needs an agent runtime with permissions and approvals), and the existing agent repo is the shallowest of the AI repos. Upgrading `ai-skills-platform` is the best next milestone after that.
