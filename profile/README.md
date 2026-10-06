<h1 align="center">Ritesh Mamidi</h1>

<p align="center">
  <b>Product-minded AI builder.</b><br>
  Agent systems, evaluation, and the controls around the model.
</p>

<p align="center">
  Austin, TX · Data &amp; AI Analyst (LLM and ML output quality, client engagement)<br>
  <a href="https://riteshmamidi0905-lab.github.io/">Portfolio</a> · <a href="https://riteshmamidi0905-lab.github.io/recruiter.html">Recruiter view</a> · <a href="https://riteshmamidi0905-lab.github.io/ritesh_mamidi_resume.pdf">Résumé</a> · <a href="https://linkedin.com/in/riteshmamidi0905">LinkedIn</a>
</p>

---

I build AI systems in the open and publish the evidence next to the claims. Professionally I validate LLM and ML outputs against policy and quality rubrics and build QA and reporting in Python and SQL. The three repositories below are independent work, and each one says what was verified, what was simulated and what was not evaluated.

## Flagship systems

### 1 · [Support Escalation Copilot](https://github.com/riteshmamidi0905-lab/support-escalation-copilot) `v0.6.0`
An approval-gated AI case workflow for a fictional B2B SaaS support team. The model helps with reading and drafting; everything that can hurt a customer stays in deterministic code and in human hands.

- **VERIFIED** 472 automated tests pass; 92 / 92 catalogued attacks have executable tests; mutation checks kill 31/31 of the control-plane mutations.
- **SIMULATED** The model is a deterministic rule-based stand-in, not an LLM. Across 32 injection runs, including a deliberately obedient scripted model, 0 invariants were violated.
- **NOT EVALUATED** Real-model evaluation was not executed: no local language-model runtime was available, and no paid API was used; the method is frozen and hash-locked for a future run.
- **LIMITATION** Fictional customer, synthetic data, never deployed.

[Interactive case study](https://riteshmamidi0905-lab.github.io/support-escalation-copilot.html) · [Repository](https://github.com/riteshmamidi0905-lab/support-escalation-copilot) · [Public claims manifest](https://github.com/riteshmamidi0905-lab/support-escalation-copilot/blob/d259c57255992c21cda4d00fe21b3cd833a1fb9c/content/public-claims.json) · evidence commit `d259c57`

### 2 · [AI Agent Runtime — From First Principles to Production](https://github.com/riteshmamidi0905-lab/ai-agent-from-scratch)
Agent runtime in standard-library Python: explicit loop, tools, state, memory, planning, evaluation, reliability and security, then served by FastAPI with PostgreSQL and resumable SSE.

- **VERIFIED** 89 tests; CI on Python 3.9 · 3.12; PostgreSQL 16 integration tests; a Docker Compose smoke-and-restart job in CI; 13/13 evaluation scenarios reached the expected status (7 are deliberate failures).
- **SIMULATED** Runtime evaluation using deterministic stand-in and scripted models; not a benchmark of LLM quality.
- **LIMITATION** No real language model has been exercised. A real-model demo and an optional test exist in the repository, but they were not run, and CI never calls a paid API.

[Case study](https://riteshmamidi0905-lab.github.io/#runtime) · [Repository](https://github.com/riteshmamidi0905-lab/ai-agent-from-scratch) · evidence commit `231b186`

### 3 · [llm-eval-framework](https://github.com/riteshmamidi0905-lab/llm-eval-framework)
Rubric-driven evaluation of model outputs with weighted scores, hard per-criterion gates and inspectable failures.

- **VERIFIED** 33 tests pass and 14 deterministic metrics (re-run 2026-10-06 at `99e6121`).
- **SIMULATED** The 18-case benchmark uses hand-written cases with constructed outputs, so it tests that the metric suite separates good answers from bad ones. It is not an evaluation of any language model, and token-overlap faithfulness is a heuristic.
- **NOT EVALUATED** MAREF, a proposed reliability framework for LLM agents, has no repository, no experiment and no result yet.

[Case study](https://riteshmamidi0905-lab.github.io/#evaluation) · [Repository](https://github.com/riteshmamidi0905-lab/llm-eval-framework)

## How the evidence is labelled

| Label | Meaning |
| :-- | :-- |
| **VERIFIED** | Tested or measured in the public repository at the pinned commit. The qualification beside it says what that does and does not show. |
| **SIMULATED** | Real code was run, but a scripted stand-in plays the model, a customer system or an approver. It tests the controls, not a language model. |
| **LIMITATION** | A known gap, stated on purpose. |
| **NOT EVALUATED** | Not run. No result is claimed. |

## Supporting work

Smaller or older projects. Their repositories carry their own tests and notes; I make no numeric claims about them here.

**Data Engineering**

| Project | What it does |
| :-- | :-- |
| [spark-data-lakehouse](https://github.com/riteshmamidi0905-lab/spark-data-lakehouse) | End-to-end PySpark medallion (bronze→silver→gold) lakehouse on 300K+ events: dedup, broadcast-join enrichment, partitioned Parquet marts, AQE tuning, data-quality checks. |
| [realtime-streaming-pipeline](https://github.com/riteshmamidi0905-lab/realtime-streaming-pipeline) | Kafka → Spark Structured Streaming → Cassandra fraud detection with event-time windows, watermarks, and a one-command Dockerized stack. |
| [sql-analytics-warehouse](https://github.com/riteshmamidi0905-lab/sql-analytics-warehouse) | Synthetic e-commerce warehouse plus a library of advanced SQL: CTEs, window functions, cohort retention, and RFM segmentation. |

**GenAI · LLM**

| Project | What it does |
| :-- | :-- |
| [genai-doc-assistant](https://github.com/riteshmamidi0905-lab/genai-doc-assistant) | Full-stack RAG with an extractive offline reader, source citations, arithmetic routing, SSE streaming, evaluation gates and configurable storage/generation backends. |
| [rag-doc-qa](https://github.com/riteshmamidi0905-lab/rag-doc-qa) | Dependency-light retrieval-augmented Q&A: sentence-aware chunking, from-scratch TF-IDF retrieval, grounded citable answers, FastAPI + Docker. |
| [ai-agent-toolkit](https://github.com/riteshmamidi0905-lab/ai-agent-toolkit) | ReAct tool/action/observation loop with a deterministic offline planner, a restricted AST calculator, unit conversion and knowledge retrieval; optional Gemini/OpenAI policies. |
| [ai-skills-platform](https://github.com/riteshmamidi0905-lab/ai-skills-platform) | One unified API gateway exposing eight AI skills, with authentication and a live dashboard — an aggregation layer over multiple models. |

**MLOps**

| Project | What it does |
| :-- | :-- |
| [mlops-platform](https://github.com/riteshmamidi0905-lab/mlops-platform) | End-to-end ML platform: feature store, experiment tracking, model registry with stage promotion, FastAPI serving, and PSI/KS drift monitoring. |
| [vision-inference-api](https://github.com/riteshmamidi0905-lab/vision-inference-api) | Train & serve a CNN image classifier with confidence-based human-in-the-loop review routing. PyTorch + FastAPI + Docker, offline dataset included. |

**Analytics**

| Project | What it does |
| :-- | :-- |
| [product-analytics-funnel-retention](https://github.com/riteshmamidi0905-lab/product-analytics-funnel-retention) | Funnel, retention & cohort analysis for a consumer app with channel LTV and a self-contained HTML growth dashboard. |
| [experimentation-toolkit](https://github.com/riteshmamidi0905-lab/experimentation-toolkit) | End-to-end A/B analysis: power & sample-size design, z-test/Welch/bootstrap, CUPED variance reduction, guardrails, FDR, and a ship-or-kill scorecard. |
| [saas-kpi-dashboard](https://github.com/riteshmamidi0905-lab/saas-kpi-dashboard) | SaaS revenue analytics: MRR movement decomposition, NRR/GRR, churn, ARPA — with a self-contained executive KPI dashboard. |
| [customer-churn-prediction](https://github.com/riteshmamidi0905-lab/customer-churn-prediction) | Subscription churn prediction (logistic regression + random forest), driver analysis, KMeans segmentation, revenue-at-risk, and an HTML report. |

**Vision · Speech · NLP**

| Project | What it does |
| :-- | :-- |
| [neural-machine-translation](https://github.com/riteshmamidi0905-lab/neural-machine-translation) | Seq2seq translator with attention (PyTorch), EN→FR, a from-scratch BLEU implementation, and attention heatmaps showing learned reordering. |
| [sign-language-recognition](https://github.com/riteshmamidi0905-lab/sign-language-recognition) | Web-based hand-gesture / sign-language recognition: a PyTorch CNN behind a Flask web app with an upload UI and JSON API. Reconstruction of a VIT M.Tech AI project. |
| [video-intelligence](https://github.com/riteshmamidi0905-lab/video-intelligence) | OpenCV shot boundaries, optical-flow motion, centroid tracking and hue-based scene labels; evaluated on generated clips with known ground truth. |
| [speech-intelligence](https://github.com/riteshmamidi0905-lab/speech-intelligence) | Offline eight-command recognition using MFCC features and Random Forest, plus formant speech synthesis. Optional Google Cloud backends support broader speech tasks. |
| [nlp-text-intelligence](https://github.com/riteshmamidi0905-lab/nlp-text-intelligence) | Offline sentiment, regex/gazetteer entities, TF-IDF topic classification, keywords and extractive summaries; optional Google Cloud backend. |
| [document-ocr-vision](https://github.com/riteshmamidi0905-lab/document-ocr-vision) | OpenCV denoise/deskew, Tesseract OCR and structured receipt fields, evaluated using CER, WER and field accuracy on generated documents. |
| [face-recognition-biometrics](https://github.com/riteshmamidi0905-lab/face-recognition-biometrics) | Face-recognition biometric pipeline: OpenCV Haar detection, Eigenfaces + LBPH recognizers, and an open-set 'not in database' gate. Reconstruction of a VIT Biometrics project. |
| [bird-deterrent-signal-intelligence](https://github.com/riteshmamidi0905-lab/bird-deterrent-signal-intelligence) | Crop-protection via signal intelligence: MFCC/spectral DSP, a bird detector, and a habituation-aware acoustic deterrent controller. Reconstruction of a VIT project. |

## Stack

Python · SQL · PostgreSQL (row-level security, pgvector) · FastAPI · PyTorch · scikit-learn · pandas · Spark · Kafka · Docker · GitHub Actions · Power BI · Tableau

## Education and certifications

- **MS, Business Analytics**, St. Francis College · United States
- **M.Tech (Integrated), Software Engineering**, Vellore Institute of Technology (VIT) · India
- **IBM AI Engineering — Professional Certificate**, Coursera
- **Google Advanced Data Analytics — Professional Certificate**, Coursera

<p align="center"><i>Open to applied AI, agent and LLM engineering, AI evaluation and reliability, forward-deployed and AI-focused product-analytics roles in the US</i></p>
