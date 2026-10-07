<h1 align="center">Ritesh Mamidi</h1>

<p align="center">
  <b>Product-minded AI builder.</b><br>
  I build AI agents and the infrastructure they run on, and evaluate how they fail.
</p>

<p align="center">
  Austin, TX · Data &amp; AI Analyst (LLM and ML output quality, client engagement)<br>
  <a href="https://riteshmamidi0905-lab.github.io/">Portfolio</a> · <a href="https://riteshmamidi0905-lab.github.io/recruiter.html">Recruiter view</a> · <a href="https://riteshmamidi0905-lab.github.io/ritesh_mamidi_resume.pdf">Résumé</a> · <a href="https://linkedin.com/in/riteshmamidi0905">LinkedIn</a>
</p>

---

**Professionally** I validate LLM and ML outputs against policy and quality rubrics and build QA and reporting in Python and SQL. **In independent, open-source work** I build AI agents, the infrastructure they run on, and the evaluation of how they fail, and publish the evidence next to the claims. The three layers below are separate pieces of work, not one deployment; each says what was verified, what was simulated and what its limits are.

## I build AI agents

### [Support Escalation Copilot](https://github.com/riteshmamidi0905-lab/support-escalation-copilot) `v0.7.1`
An approval-gated AI case workflow for a fictional B2B SaaS support team. The model helps with reading and drafting; everything that can hurt a customer stays in deterministic code and in human hands.

- **VERIFIED** 489 automated tests pass; 92 / 92 catalogued attacks have executable tests.
- **VERIFIED** **One real-model run** (a small local model, one pass): 10 of 22 cases reached the frozen expected outcome (not accuracy). It failed at the interface (schema, evidence handles, action parameters, drafts) while the four deterministic invariants held.
- **SIMULATED** The default model is a deterministic rule-based stand-in, not an LLM; approvers are simulated.
- **LIMITATION** Fictional customer, synthetic data, never deployed.

[Case study](https://riteshmamidi0905-lab.github.io/support-escalation-copilot.html) · [Repository](https://github.com/riteshmamidi0905-lab/support-escalation-copilot) · [Release v0.7.1](https://github.com/riteshmamidi0905-lab/support-escalation-copilot/releases/tag/v0.7.1)

## I build the infrastructure they run on

### [AI Agent Runtime](https://github.com/riteshmamidi0905-lab/ai-agent-from-scratch) + [Agent Runtime Benchmark](https://github.com/riteshmamidi0905-lab/agent-runtime-bench)
Agent runtime in standard-library Python: explicit loop, tools, state, memory, planning, evaluation, reliability and security, then served by FastAPI with PostgreSQL and resumable SSE.

- **VERIFIED** 89 tests; 13/13 evaluation scenarios reached the expected status (scripted models, not a benchmark of LLM quality).
- **VERIFIED** ARB-1, one small model through the unmodified runtime: **43/48** tasks passed the frozen oracles; the runtime's **7/7** controls held in 240/240 agent-mode runs across six run sets.
- **LIMITATION** It still found a hole (MT-02): a permitted read tool returned a secret and the model wrote it into its answer, and every control held. The lesson: Action safety ≠ information-flow safety.

[Case study](https://riteshmamidi0905-lab.github.io/agent-runtime.html) · [Runtime](https://github.com/riteshmamidi0905-lab/ai-agent-from-scratch) · [Benchmark results](https://github.com/riteshmamidi0905-lab/agent-runtime-bench/blob/679fa28213837c2a53f244700bdbabc6cc6dced5/docs/RESULTS.md)

## I evaluate how they fail

### [llmeval](https://github.com/riteshmamidi0905-lab/llm-eval-framework) + [MAREF](https://github.com/riteshmamidi0905-lab/maref)
- **VERIFIED** llmeval: 33 tests pass and 14 deterministic metrics (hand-written cases, not an evaluation of any model).
- **LIMITATION** MAREF evaluates runs of an agent (it is not an agent). It is a research prototype with a same-author, pre-registered evaluation: not independent validation, and its test split is spent.

> **MAREF · Research prototype · MIXED**<br>
> 33/33 labelled failures detected · 36/154 clean runs flagged · 151/187 overall agreement<br>
> Pre-registered advantage vs shipped llmeval gates; no demonstrated advantage over stronger baselines or for trajectory-specific failures.<br>
> [Full evaluation →](https://github.com/riteshmamidi0905-lab/maref/blob/1c00c9034adbe7d0d1ccf9a740c99201ec84de20/docs/EVALUATION.md)

[Evaluation page](https://riteshmamidi0905-lab.github.io/evaluation.html) · [llmeval](https://github.com/riteshmamidi0905-lab/llm-eval-framework) · [MAREF](https://github.com/riteshmamidi0905-lab/maref) · [Canonical claim](https://github.com/riteshmamidi0905-lab/maref/blob/1c00c9034adbe7d0d1ccf9a740c99201ec84de20/docs/CLAIM.md)

## How the evidence is labelled

| Label | Meaning |
| :-- | :-- |
| **VERIFIED** | Tested or measured in the public repository at the pinned commit. The qualification beside it says what that does and does not show. |
| **SIMULATED** | Real code was run, but a scripted stand-in plays the model, a customer system or an approver. It tests the controls, not a language model. |
| **LIMITATION** | A known gap, stated on purpose. |
| **NOT EVALUATED** | Not run. No result is claimed. |

## Also built

- [experimentation-toolkit](https://github.com/riteshmamidi0905-lab/experimentation-toolkit): A/B analysis from power and sample size to a ship-or-kill call: CUPED, guardrails, false-discovery control.
- [product-analytics-funnel-retention](https://github.com/riteshmamidi0905-lab/product-analytics-funnel-retention): Funnel, retention and cohort analysis with channel LTV and a self-contained growth dashboard.
- [saas-kpi-dashboard](https://github.com/riteshmamidi0905-lab/saas-kpi-dashboard): MRR movement, NRR/GRR and churn with a self-contained executive KPI dashboard.
- [sql-analytics-warehouse](https://github.com/riteshmamidi0905-lab/sql-analytics-warehouse): A synthetic e-commerce warehouse and a library of advanced SQL: CTEs, window functions, cohorts, RFM.
- [mlops-platform](https://github.com/riteshmamidi0905-lab/mlops-platform): Feature store, experiment tracking, model registry, FastAPI serving and PSI/KS drift monitoring.
- [genai-doc-assistant](https://github.com/riteshmamidi0905-lab/genai-doc-assistant): RAG with an extractive offline reader, source citations, streaming and evaluation gates.
- [spark-data-lakehouse](https://github.com/riteshmamidi0905-lab/spark-data-lakehouse): A PySpark medallion lakehouse on 300K+ events with data-quality checks between layers.
- [realtime-streaming-pipeline](https://github.com/riteshmamidi0905-lab/realtime-streaming-pipeline): Kafka, Spark Structured Streaming and Cassandra fraud rules with event-time windows and watermarks.

All 24 projects, with code, tests and limits: [portfolio](https://riteshmamidi0905-lab.github.io/projects.html).

## Stack, education and certifications

Python · SQL · PostgreSQL (row-level security, pgvector) · FastAPI · PyTorch · scikit-learn · pandas · Spark · Kafka · Docker · GitHub Actions · Power BI · Tableau

- **MS, Business Analytics**, St. Francis College · United States
- **M.Tech (Integrated), Software Engineering**, Vellore Institute of Technology (VIT) · India
- **IBM AI Engineering — Professional Certificate**, Coursera
- **Google Advanced Data Analytics — Professional Certificate**, Coursera

<p align="center"><i>Open to applied AI, agent and LLM engineering, AI evaluation and reliability, forward-deployed and AI-focused product-analytics roles in the US</i></p>
