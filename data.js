/* ============================================================
   CANONICAL PROJECT DATA — single source of truth.
   Consumed by build.js (static HTML generation) at repo-generation
   time. The browser does NOT load this file; the page ships the
   generated static markup and app.js only enhances it.
   ============================================================ */
/* ============ DATA ============ */
const GH="https://github.com/riteshmamidi0905-lab/";
const CATLABEL={data:"Data Engineering",genai:"GenAI · LLM",mlops:"MLOps",analytics:"Analytics",vision:"Vision · Speech · NLP"};

/* Flagship projects (the star) */
const FLAG=[
  {c:"data",num:"01",n:"Real-Time Streaming Pipeline",r:"realtime-streaming-pipeline",
   one:"Detect fraud on a live event stream — without waiting for a nightly batch.",
   impact:"Event-time windows & watermarks with a one-command Docker stack",
   tech:["Kafka","Spark Structured Streaming","Cassandra","Docker"],
   gfx:"stream",
   cs:{problem:"Fraud signals decay in minutes; a nightly batch is far too slow to act on them.",
       arch:["Event sources","Kafka","Spark Streaming","Windowing + ML","Cassandra","Alerts"],
       approach:"Event-time processing with watermarks handles late and out-of-order events correctly, while a Dockerized stack makes the whole system reproducible with a single command.",
       tech:"Kafka for durable ingestion, Spark Structured Streaming for stateful windowed aggregation, Cassandra for low-latency serving.",
       result:"A continuously-running pipeline that scores events as they arrive and writes flagged transactions to a queryable store.",
       lessons:"Watermark tuning is the real work — too tight drops valid late events, too loose balloons state. I'd add exactly-once sink guarantees next."}},
  {c:"data",num:"02",n:"Spark Data Lakehouse",r:"spark-data-lakehouse",
   one:"Turn 300K+ raw events into clean, query-ready marts with a medallion architecture.",
   impact:"Bronze → Silver → Gold with data-quality gates and AQE tuning",
   tech:["PySpark","Parquet","AQE","Medallion"],
   gfx:"lake",
   cs:{problem:"Raw event data is duplicated, unenriched, and unqueryable — analysts can't trust or use it directly.",
       arch:["Raw events","Bronze","Silver","Gold marts","BI / SQL"],
       approach:"A layered medallion design isolates ingestion, cleaning/enrichment, and business marts, with data-quality checks between layers so bad data never reaches the gold tier.",
       tech:"PySpark with broadcast-join enrichment, partitioned Parquet output, and Adaptive Query Execution for skew handling.",
       result:"Partitioned gold marts ready for BI, plus quality checks that fail loudly when inputs drift.",
       lessons:"Deduplication belongs as early as possible. Next: automate the quality checks into a contract per layer."}},
  {c:"genai",num:"03",n:"LLM Evaluation Framework",r:"llm-eval-framework",dm:"demos/llm-eval-framework.html",
   one:"Score LLM and agent outputs on faithfulness, hallucination, and refusal — automatically.",
   impact:"LLM-as-judge, REST API, and an interactive dashboard",
   tech:["LLM Eval","LLM-as-Judge","FastAPI","Dashboard"],
   gfx:"eval",
   cs:{problem:"Teams ship LLM features without a repeatable way to measure whether answers are grounded or hallucinated.",
       arch:["Test cases","Model outputs","Rubric judge","Scores","Dashboard"],
       approach:"A rubric-driven LLM-as-judge scores each output across dimensions, exposed as a REST API so evaluation runs in CI, with a dashboard for humans to inspect failures.",
       tech:"FastAPI service, structured rubric prompts, and a self-contained interactive results dashboard.",
       result:"A reusable harness that turns 'it seems fine' into per-criterion faithfulness, hallucination, and refusal scores.",
       lessons:"Judge calibration matters as much as the rubric. I'd add human-agreement tracking to trust the judge."}},
  {c:"genai",num:"04",n:"GenAI Document Assistant",r:"genai-doc-assistant",
   one:"Answer questions from your own documents — grounded, cited, and streamed.",
   impact:"Router-agent + swappable Claude / Gemini / OpenAI backends",
   tech:["RAG","Agents","FastAPI","Streaming"],
   gfx:"rag",
   cs:{problem:"General chatbots hallucinate and can't cite; teams need answers grounded in their own corpus.",
       arch:["Query","Retriever","Relevant chunks","LLM","Cited answer"],
       approach:"Retrieval-augmented generation grounds every answer in retrieved passages, a tool-using router-agent decides when to search vs. answer, and responses stream token-by-token.",
       tech:"FastAPI backend, a chat UI, pluggable LLM backends, and citation-aware prompting.",
       result:"A full-stack assistant that returns grounded, cited answers you can trace back to source.",
       lessons:"Retrieval quality dominates output quality. Next: hybrid (keyword + vector) retrieval and re-ranking."}},
  {c:"mlops",num:"05",n:"MLOps Platform",r:"mlops-platform",dm:"demos/mlops-platform.html",
   one:"The full model lifecycle — track, register, serve, and watch for drift.",
   impact:"Registry with stage promotion + PSI/KS drift monitoring",
   tech:["Model Registry","FastAPI","PSI / KS","Feature Store"],
   gfx:"mlops",
   cs:{problem:"Models get trained once and forgotten; nobody notices when live data drifts away from training data.",
       arch:["Feature store","Experiments","Registry","Serving","Drift monitor"],
       approach:"Experiment tracking feeds a model registry with explicit stage promotion, FastAPI serves the promoted model, and PSI/KS statistics continuously compare live inputs to the training distribution.",
       tech:"Feature store, experiment tracking, model registry, FastAPI serving, drift statistics, live dashboard.",
       result:"An end-to-end platform where a model can go from experiment to monitored production with an audit trail.",
       lessons:"Drift detection is easy; deciding the alert threshold is hard. Next: automated retraining triggers."}},
  {c:"analytics",num:"06",n:"Experimentation Toolkit",r:"experimentation-toolkit",
   one:"Run A/B tests that survive scrutiny — from power analysis to a ship-or-kill call.",
   impact:"CUPED variance reduction, guardrails, FDR, and a scorecard",
   tech:["A/B Testing","CUPED","Bootstrap","Stats"],
   gfx:"exp",
   cs:{problem:"Naïve A/B tests ship on noise — no power analysis, no variance reduction, no multiple-comparison control.",
       arch:["Design + power","Assignment","z / Welch / bootstrap","CUPED + guardrails","Scorecard"],
       approach:"The toolkit covers the full lifecycle: sample-size design up front, robust test statistics, CUPED to cut variance, guardrail metrics, and FDR control before a ship-or-kill scorecard.",
       tech:"Statistical test suite (z-test, Welch, bootstrap), CUPED, false-discovery-rate control.",
       result:"An end-to-end analysis that turns a raw experiment into a defensible decision.",
       lessons:"Guardrails catch the wins that quietly break something else. Next: sequential testing for early stopping."}}
];

/* Full project shelf */
const P=[
  {c:"data",n:"Spark Data Lakehouse",r:"spark-data-lakehouse",d:"End-to-end PySpark medallion (bronze→silver→gold) lakehouse on 300K+ events: dedup, broadcast-join enrichment, partitioned Parquet marts, AQE tuning, data-quality checks.",t:["PySpark","Parquet","AQE"]},
  {c:"data",n:"Real-Time Streaming Pipeline",r:"realtime-streaming-pipeline",d:"Kafka → Spark Structured Streaming → Cassandra fraud detection with event-time windows, watermarks, and a one-command Dockerized stack.",t:["Kafka","Spark","Cassandra"]},
  {c:"data",n:"SQL Analytics Warehouse",r:"sql-analytics-warehouse",d:"Synthetic e-commerce warehouse plus a library of advanced SQL: CTEs, window functions, cohort retention, and RFM segmentation.",t:["SQL","Warehouse","RFM"]},
  {c:"genai",n:"GenAI Document Assistant",r:"genai-doc-assistant",d:"Full-stack RAG app: chat UI + FastAPI, grounded cited answers, a tool-using router-agent, streaming, and swappable Claude/Gemini/OpenAI backends.",t:["RAG","Agents","FastAPI"]},
  {c:"genai",n:"LLM Evaluation Framework",r:"llm-eval-framework",dm:"demos/llm-eval-framework.html",d:"Rubric-driven platform scoring LLM/agent outputs on faithfulness, hallucination &amp; refusal — LLM-as-judge, REST API, and an interactive dashboard.",t:["LLM Eval","Judge","API"]},
  {c:"genai",n:"RAG Document Q&A",r:"rag-doc-qa",d:"Dependency-light retrieval-augmented Q&amp;A: sentence-aware chunking, from-scratch TF-IDF retrieval, grounded citable answers, FastAPI + Docker.",t:["RAG","TF-IDF","Docker"]},
  {c:"genai",n:"AI Agent Toolkit",r:"ai-agent-toolkit",dm:"demos/ai-agent-toolkit.html",d:"A toolkit for building tool-using AI agents — planning, tool routing, and structured execution over an extensible interface.",t:["Agents","Tools","LLM"]},
  {c:"genai",n:"AI Skills Platform",r:"ai-skills-platform",d:"One unified API gateway exposing eight AI skills, with authentication and a live dashboard — an aggregation layer over multiple models.",t:["API Gateway","Auth","Dashboard"]},
  {c:"mlops",n:"MLOps Platform",r:"mlops-platform",dm:"demos/mlops-platform.html",d:"End-to-end ML platform: feature store, experiment tracking, model registry with stage promotion, FastAPI serving, and PSI/KS drift monitoring.",t:["Registry","Serving","Drift"]},
  {c:"mlops",n:"Vision Inference API",r:"vision-inference-api",d:"Train &amp; serve a CNN image classifier with confidence-based human-in-the-loop review routing. PyTorch + FastAPI + Docker, offline dataset included.",t:["PyTorch","FastAPI","HITL"]},
  {c:"analytics",n:"Product Analytics — Funnel &amp; Retention",r:"product-analytics-funnel-retention",d:"Funnel, retention &amp; cohort analysis for a consumer app with channel LTV and a self-contained HTML growth dashboard.",t:["Funnel","Cohorts","LTV"]},
  {c:"analytics",n:"Experimentation Toolkit",r:"experimentation-toolkit",d:"End-to-end A/B analysis: power &amp; sample-size design, z-test/Welch/bootstrap, CUPED variance reduction, guardrails, FDR, and a ship-or-kill scorecard.",t:["A/B","CUPED","Stats"]},
  {c:"analytics",n:"SaaS KPI Dashboard",r:"saas-kpi-dashboard",d:"SaaS revenue analytics: MRR movement decomposition, NRR/GRR, churn, ARPA — with a self-contained executive KPI dashboard.",t:["MRR","NRR","KPI"]},
  {c:"analytics",n:"Customer Churn Prediction",r:"customer-churn-prediction",d:"Subscription churn prediction (logistic regression + random forest), driver analysis, KMeans segmentation, revenue-at-risk, and an HTML report.",t:["Churn","ML","Segmentation"]},
  {c:"vision",n:"Neural Machine Translation",r:"neural-machine-translation",dm:"demos/neural-machine-translation.html",d:"Seq2seq translator with attention (PyTorch), EN→FR, a from-scratch BLEU implementation, and attention heatmaps showing learned reordering.",t:["Seq2Seq","Attention","BLEU"]},
  {c:"vision",n:"Sign Language Recognition",r:"sign-language-recognition",d:"Web-based hand-gesture / sign-language recognition: a PyTorch CNN behind a Flask web app with an upload UI and JSON API.",t:["CNN","Flask","Vision"]},
  {c:"vision",n:"Video Intelligence",r:"video-intelligence",dm:"demos/video-intelligence.html",d:"Video understanding toolkit — frame analysis, detection, and scene-level intelligence over a clean processing pipeline.",t:["Video","Detection","CV"]},
  {c:"vision",n:"Speech Intelligence",r:"speech-intelligence",dm:"demos/speech-intelligence.html",d:"Speech processing toolkit — transcription, audio features, and signal analysis packaged as a reusable service.",t:["Speech","Audio","DSP"]},
  {c:"vision",n:"NLP Text Intelligence",r:"nlp-text-intelligence",dm:"demos/nlp-text-intelligence.html",d:"NLP toolkit for text — classification, extraction, and language features over a clean, testable API.",t:["NLP","Text","API"]},
  {c:"vision",n:"Document OCR &amp; Vision",r:"document-ocr-vision",dm:"demos/document-ocr-vision.html",d:"OCR + document-vision pipeline extracting structured data from invoices and documents to feed downstream reporting.",t:["OCR","Documents","Vision"]},
  {c:"vision",n:"Face Recognition Biometrics",r:"face-recognition-biometrics",d:"Face-recognition biometric pipeline: OpenCV Haar detection, Eigenfaces + LBPH recognizers, and an open-set 'not in database' gate.",t:["OpenCV","Biometrics","LBPH"]},
  {c:"vision",n:"Bird-Deterrent Signal Intelligence",r:"bird-deterrent-signal-intelligence",d:"Crop-protection via signal intelligence: MFCC/spectral DSP, a bird detector, and a habituation-aware acoustic deterrent controller.",t:["DSP","MFCC","Detection"]}
];

if (typeof module !== 'undefined' && module.exports) { module.exports = { GH, CATLABEL, FLAG, P }; }
