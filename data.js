/* Canonical portfolio data. Reviewed against repository snapshots in content/project-evidence.json. */
const GH="https://github.com/riteshmamidi0905-lab/";
const CATLABEL={"data":"Data Engineering","genai":"GenAI · LLM","mlops":"MLOps","analytics":"Analytics","vision":"Vision · Speech · NLP"};
const FLAG=[
  {
    "c": "data",
    "num": "01",
    "n": "Real-Time Streaming Pipeline",
    "r": "realtime-streaming-pipeline",
    "one": "Detect fraud on a live event stream — without waiting for a nightly batch.",
    "impact": "Event-time windows & watermarks with a one-command Docker stack",
    "tech": [
      "Kafka",
      "Spark Structured Streaming",
      "Cassandra",
      "Docker"
    ],
    "gfx": "stream",
    "cs": {
      "problem": "Fraud signals decay in minutes; a nightly batch is far too slow to act on them.",
      "arch": [
        "Synthetic events",
        "Kafka",
        "Fraud rules + windows",
        "Cassandra"
      ],
      "approach": "Event-time processing with watermarks handles late and out-of-order events correctly, while a Dockerized stack makes the whole system reproducible with a single command.",
      "tech": "Kafka for durable ingestion, Spark Structured Streaming for stateful windowed aggregation, Cassandra for low-latency serving.",
      "result": "Runnable Docker stack writing per-transaction verdicts and one-minute merchant metrics to Cassandra.",
      "lessons": "Checkpointing and Cassandra keys need to be reviewed together when assessing replay behavior. I would validate sink idempotency under failure and restart.",
      "evaluation": "Pure Spark transforms are tested on static DataFrames: JSON parsing, fraud-rule decisions, and event-time merchant aggregations. A full Kafka/Cassandra runtime is a separate integration check.",
      "decision": "Explainable rules make each fraud flag inspectable. Event-time windows and watermarks bound late-data state; separate checkpoints track transaction and aggregate sinks.",
      "limit": "Synthetic transactions and rule-based detection; this is not a deployed payment-risk model."
    }
  },
  {
    "c": "data",
    "num": "02",
    "n": "Spark Data Lakehouse",
    "r": "spark-data-lakehouse",
    "one": "Turn 300K+ raw events into clean, query-ready marts with a medallion architecture.",
    "impact": "Bronze → Silver → Gold with data-quality gates and AQE tuning",
    "tech": [
      "PySpark",
      "Parquet",
      "AQE",
      "Medallion"
    ],
    "gfx": "lake",
    "cs": {
      "problem": "Raw event data is duplicated, unenriched, and unqueryable — analysts can't trust or use it directly.",
      "arch": [
        "Raw events",
        "Bronze",
        "Silver",
        "Gold marts",
        "BI / SQL"
      ],
      "approach": "A layered medallion design isolates ingestion, cleaning/enrichment, and business marts, with data-quality checks between layers so bad data never reaches the gold tier.",
      "tech": "PySpark with broadcast-join enrichment, partitioned Parquet output, and Adaptive Query Execution for skew handling.",
      "result": "Partitioned gold marts ready for BI, plus quality checks that fail loudly when inputs drift.",
      "lessons": "Deduplication belongs as early as possible. Next: automate the quality checks into a contract per layer.",
      "evaluation": "Unit tests cover cleaning, deterministic deduplication, enrichment, and gold aggregates. Data-quality rules inspect nulls, negative quantities and invalid enums.",
      "decision": "Small dimensions use broadcast joins; partitioned Parquet and AQE target avoidable shuffle and scan work.",
      "limit": "Local Spark and synthetic inputs demonstrate the processing architecture, not production scale."
    }
  },
  {
    "c": "genai",
    "num": "03",
    "n": "LLM Evaluation Framework",
    "r": "llm-eval-framework",
    "dm": "demos/llm-eval-framework.html",
    "one": "Evaluate model outputs with repeatable rubrics, hard gates, and inspectable failure cases.",
    "impact": "14 deterministic metrics + optional LLM judges",
    "tech": [
      "LLM Eval",
      "LLM-as-Judge",
      "FastAPI",
      "Dashboard"
    ],
    "gfx": "eval",
    "cs": {
      "problem": "Teams ship LLM features without a repeatable way to measure whether answers are grounded or hallucinated.",
      "arch": [
        "Test cases",
        "Model outputs",
        "Rubric judge",
        "Scores",
        "Dashboard"
      ],
      "approach": "JSON/YAML rubrics define weighted criteria and hard thresholds. Deterministic metrics run offline; optional model judges score custom criteria through a vendor-neutral interface.",
      "tech": "FastAPI service, structured rubric prompts, and a self-contained interactive results dashboard.",
      "result": "A reusable harness that turns 'it seems fine' into per-criterion faithfulness, hallucination, and refusal scores.",
      "lessons": "Judge calibration matters as much as the rubric. I'd add human-agreement tracking to trust the judge.",
      "evaluation": "The repository includes an 18-case RAG-QA benchmark, deterministic scoring tests, threshold checks, API/report tests, and a CI fail-under option.",
      "decision": "Weighted rubric scores and hard thresholds are separate: a high overall score cannot override a required safety or grounding check.",
      "limit": "Token-overlap faithfulness is a heuristic. Optional LLM judges need calibration; neither proves factual reliability on its own."
    }
  },
  {
    "c": "genai",
    "num": "04",
    "n": "GenAI Document Assistant",
    "r": "genai-doc-assistant",
    "one": "Answer questions from your own documents — grounded, cited, and streamed.",
    "impact": "Offline extractive mode + configurable retrieval and generation backends",
    "tech": [
      "RAG",
      "FastAPI",
      "SSE",
      "pgvector"
    ],
    "gfx": "rag",
    "cs": {
      "problem": "General chatbots hallucinate and can't cite; teams need answers grounded in their own corpus.",
      "arch": [
        "Query",
        "Retriever",
        "Relevant chunks",
        "LLM",
        "Cited answer"
      ],
      "approach": "Retrieval-augmented generation grounds every answer in retrieved passages, a tool-using router-agent decides when to search vs. answer, and responses stream token-by-token.",
      "tech": "FastAPI, feature-hashing or sentence-transformer embeddings, cosine retrieval with keyword re-ranking, optional pgvector storage, and Ollama/Gemini/OpenAI generation backends.",
      "result": "A full-stack assistant that returns grounded, cited answers you can trace back to source.",
      "lessons": "The repository already blends vector similarity with keyword overlap. Next I would test retrieval failures across a broader corpus and measure abstention quality.",
      "evaluation": "A sample-corpus harness checks retrieval hit-rate, reciprocal rank, faithfulness and answer relevance, with CI thresholds. Tests cover retrieval, routing, streaming and API behavior.",
      "decision": "An offline extractive reader keeps the default path reproducible. Embedding, store and generation backends can be switched by configuration.",
      "limit": "Sample-corpus evaluation and local load testing are not evidence of performance across arbitrary documents or live users."
    }
  },
  {
    "c": "mlops",
    "num": "05",
    "n": "MLOps Platform",
    "r": "mlops-platform",
    "dm": "demos/mlops-platform.html",
    "one": "The full model lifecycle — track, register, serve, and watch for drift.",
    "impact": "Registry with stage promotion + PSI/KS drift monitoring",
    "tech": [
      "Model Registry",
      "FastAPI",
      "PSI / KS",
      "Feature Store"
    ],
    "gfx": "mlops",
    "cs": {
      "problem": "Models get trained once and forgotten; nobody notices when live data drifts away from training data.",
      "arch": [
        "Feature store",
        "Experiments",
        "Registry",
        "Serving",
        "Drift monitor"
      ],
      "approach": "Experiment tracking feeds a model registry with explicit stage promotion, FastAPI serves the promoted model, and PSI/KS statistics continuously compare live inputs to the training distribution.",
      "tech": "Feature store, experiment tracking, model registry, FastAPI serving, drift statistics, live dashboard.",
      "result": "A local end-to-end lifecycle: train candidates, select and register a model, promote a version, serve predictions and inspect drift.",
      "lessons": "Drift detection is easy; deciding the alert threshold is hard. Next: automated retraining triggers.",
      "evaluation": "Tests cover serving readiness, authentication, registry promotion and prediction monitoring. Seeded covariate shifts exercise PSI/KS drift alerts.",
      "decision": "A model bundle keeps the scaler and feature view with the model. Registry promotion archives the previous Production version for traceable serving.",
      "limit": "Production is a registry stage name; the portfolio does not claim a running customer deployment. Drift indicates distribution change, not automatically model degradation."
    }
  },
  {
    "c": "analytics",
    "num": "06",
    "n": "Experimentation Toolkit",
    "r": "experimentation-toolkit",
    "one": "Run A/B tests that survive scrutiny — from power analysis to a ship-or-kill call.",
    "impact": "CUPED variance reduction, guardrails, FDR, and a scorecard",
    "tech": [
      "A/B Testing",
      "CUPED",
      "Bootstrap",
      "Stats"
    ],
    "gfx": "exp",
    "cs": {
      "problem": "Naïve A/B tests ship on noise — no power analysis, no variance reduction, no multiple-comparison control.",
      "arch": [
        "Design + power",
        "Assignment",
        "z / Welch / bootstrap",
        "CUPED + guardrails",
        "Scorecard"
      ],
      "approach": "The toolkit covers the full lifecycle: sample-size design up front, robust test statistics, CUPED to cut variance, guardrail metrics, and FDR control before a ship-or-kill scorecard.",
      "tech": "Statistical test suite (z-test, Welch, bootstrap), CUPED, false-discovery-rate control.",
      "result": "An end-to-end analysis that turns a raw experiment into a defensible decision.",
      "lessons": "Guardrails catch the wins that quietly break something else. Next: sequential testing for early stopping.",
      "evaluation": "Tests cover statistical helpers, CUPED, guardrails, multiple-comparison adjustments, decisions and scorecard generation on seeded data.",
      "decision": "Power and minimum detectable effect guide design before analysis. Guardrails and FDR help prevent a nominal win from becoming a bad product decision.",
      "limit": "The checkout experiment is synthetic. Its effect sizes are demonstration output, not commercial impact."
    }
  }
];
const P=[
  {
    "c": "genai",
    "n": "Support Escalation Copilot",
    "r": "support-escalation-copilot",
    "feat": true,
    "d": "Approval-gated AI case workflow for a fictional B2B SaaS support team: tenant isolation in PostgreSQL, typed actions, deterministic policy, exact-action approvals, idempotent execution and a hash-chained audit log. Reference implementation; the model is a rule-based stand-in, not an LLM.",
    "t": ["Python", "PostgreSQL", "pgvector", "Row-level security"]
  },
  {
    "c": "genai",
    "n": "AI Agent Runtime: from first principles",
    "r": "ai-agent-from-scratch",
    "feat": true,
    "d": "Agent runtime in standard-library Python: explicit loop, tools, state, memory, planning, evaluation, reliability and security, then served by FastAPI with PostgreSQL and resumable SSE.",
    "t": ["Python", "FastAPI", "PostgreSQL", "SSE"]
  },
  {
    "c": "data",
    "n": "Spark Data Lakehouse",
    "r": "spark-data-lakehouse",
    "d": "End-to-end PySpark medallion (bronze→silver→gold) lakehouse on 300K+ events: dedup, broadcast-join enrichment, partitioned Parquet marts, AQE tuning, data-quality checks.",
    "t": [
      "PySpark",
      "Parquet",
      "AQE"
    ]
  },
  {
    "c": "data",
    "n": "Real-Time Streaming Pipeline",
    "r": "realtime-streaming-pipeline",
    "d": "Kafka → Spark Structured Streaming → Cassandra fraud detection with event-time windows, watermarks, and a one-command Dockerized stack.",
    "t": [
      "Kafka",
      "Spark",
      "Cassandra"
    ]
  },
  {
    "c": "data",
    "n": "SQL Analytics Warehouse",
    "r": "sql-analytics-warehouse",
    "d": "Synthetic e-commerce warehouse plus a library of advanced SQL: CTEs, window functions, cohort retention, and RFM segmentation.",
    "t": [
      "SQL",
      "Warehouse",
      "RFM"
    ]
  },
  {
    "c": "genai",
    "n": "GenAI Document Assistant",
    "r": "genai-doc-assistant",
    "d": "Full-stack RAG with an extractive offline reader, source citations, arithmetic routing, SSE streaming, evaluation gates and configurable storage/generation backends.",
    "t": [
      "RAG",
      "Agents",
      "FastAPI"
    ]
  },
  {
    "c": "genai",
    "n": "LLM Evaluation Framework",
    "r": "llm-eval-framework",
    "dm": "demos/llm-eval-framework.html",
    "d": "14 deterministic metrics, weighted JSON/YAML rubrics, hard gates, optional LLM judges, FastAPI, a CLI and an inspectable results dashboard.",
    "t": [
      "LLM Eval",
      "Judge",
      "API"
    ]
  },
  {
    "c": "genai",
    "n": "RAG Document Q&A",
    "r": "rag-doc-qa",
    "d": "Dependency-light retrieval-augmented Q&amp;A: sentence-aware chunking, from-scratch TF-IDF retrieval, grounded citable answers, FastAPI + Docker.",
    "t": [
      "RAG",
      "TF-IDF",
      "Docker"
    ]
  },
  {
    "c": "genai",
    "n": "AI Agent Toolkit",
    "r": "ai-agent-toolkit",
    "dm": "demos/ai-agent-toolkit.html",
    "d": "ReAct tool/action/observation loop with a deterministic offline planner, a restricted AST calculator, unit conversion and knowledge retrieval; optional Gemini/OpenAI policies.",
    "t": [
      "Agents",
      "Tools",
      "LLM"
    ]
  },
  {
    "c": "genai",
    "n": "AI Skills Platform",
    "r": "ai-skills-platform",
    "d": "One unified API gateway exposing eight AI skills, with authentication and a live dashboard — an aggregation layer over multiple models.",
    "t": [
      "API Gateway",
      "Auth",
      "Dashboard"
    ]
  },
  {
    "c": "mlops",
    "n": "MLOps Platform",
    "r": "mlops-platform",
    "dm": "demos/mlops-platform.html",
    "d": "End-to-end ML platform: feature store, experiment tracking, model registry with stage promotion, FastAPI serving, and PSI/KS drift monitoring.",
    "t": [
      "Registry",
      "Serving",
      "Drift"
    ]
  },
  {
    "c": "mlops",
    "n": "Vision Inference API",
    "r": "vision-inference-api",
    "d": "Train &amp; serve a CNN image classifier with confidence-based human-in-the-loop review routing. PyTorch + FastAPI + Docker, offline dataset included.",
    "t": [
      "PyTorch",
      "FastAPI",
      "HITL"
    ]
  },
  {
    "c": "analytics",
    "n": "Product Analytics — Funnel &amp; Retention",
    "r": "product-analytics-funnel-retention",
    "d": "Funnel, retention &amp; cohort analysis for a consumer app with channel LTV and a self-contained HTML growth dashboard.",
    "t": [
      "Funnel",
      "Cohorts",
      "LTV"
    ]
  },
  {
    "c": "analytics",
    "n": "Experimentation Toolkit",
    "r": "experimentation-toolkit",
    "d": "End-to-end A/B analysis: power &amp; sample-size design, z-test/Welch/bootstrap, CUPED variance reduction, guardrails, FDR, and a ship-or-kill scorecard.",
    "t": [
      "A/B",
      "CUPED",
      "Stats"
    ]
  },
  {
    "c": "analytics",
    "n": "SaaS KPI Dashboard",
    "r": "saas-kpi-dashboard",
    "d": "SaaS revenue analytics: MRR movement decomposition, NRR/GRR, churn, ARPA — with a self-contained executive KPI dashboard.",
    "t": [
      "MRR",
      "NRR",
      "KPI"
    ]
  },
  {
    "c": "analytics",
    "n": "Customer Churn Prediction",
    "r": "customer-churn-prediction",
    "d": "Subscription churn prediction (logistic regression + random forest), driver analysis, KMeans segmentation, revenue-at-risk, and an HTML report.",
    "t": [
      "Churn",
      "ML",
      "Segmentation"
    ]
  },
  {
    "c": "vision",
    "n": "Neural Machine Translation",
    "r": "neural-machine-translation",
    "dm": "demos/neural-machine-translation.html",
    "d": "Seq2seq translator with attention (PyTorch), EN→FR, a from-scratch BLEU implementation, and attention heatmaps showing learned reordering.",
    "t": [
      "Seq2Seq",
      "Attention",
      "BLEU"
    ]
  },
  {
    "c": "vision",
    "n": "Sign Language Recognition",
    "r": "sign-language-recognition",
    "d": "Web-based hand-gesture / sign-language recognition: a PyTorch CNN behind a Flask web app with an upload UI and JSON API. Reconstruction of a VIT M.Tech AI project.",
    "t": [
      "CNN",
      "Flask",
      "Vision"
    ]
  },
  {
    "c": "vision",
    "n": "Video Intelligence",
    "r": "video-intelligence",
    "dm": "demos/video-intelligence.html",
    "d": "OpenCV shot boundaries, optical-flow motion, centroid tracking and hue-based scene labels; evaluated on generated clips with known ground truth.",
    "t": [
      "Video",
      "Detection",
      "CV"
    ]
  },
  {
    "c": "vision",
    "n": "Speech Intelligence",
    "r": "speech-intelligence",
    "dm": "demos/speech-intelligence.html",
    "d": "Offline eight-command recognition using MFCC features and Random Forest, plus formant speech synthesis. Optional Google Cloud backends support broader speech tasks.",
    "t": [
      "Speech",
      "Audio",
      "DSP"
    ]
  },
  {
    "c": "vision",
    "n": "NLP Text Intelligence",
    "r": "nlp-text-intelligence",
    "dm": "demos/nlp-text-intelligence.html",
    "d": "Offline sentiment, regex/gazetteer entities, TF-IDF topic classification, keywords and extractive summaries; optional Google Cloud backend.",
    "t": [
      "NLP",
      "Text",
      "API"
    ]
  },
  {
    "c": "vision",
    "n": "Document OCR &amp; Vision",
    "r": "document-ocr-vision",
    "dm": "demos/document-ocr-vision.html",
    "d": "OpenCV denoise/deskew, Tesseract OCR and structured receipt fields, evaluated using CER, WER and field accuracy on generated documents.",
    "t": [
      "OCR",
      "Documents",
      "Vision"
    ]
  },
  {
    "c": "vision",
    "n": "Face Recognition Biometrics",
    "r": "face-recognition-biometrics",
    "d": "Face-recognition biometric pipeline: OpenCV Haar detection, Eigenfaces + LBPH recognizers, and an open-set 'not in database' gate. Reconstruction of a VIT Biometrics project.",
    "t": [
      "OpenCV",
      "Biometrics",
      "LBPH"
    ]
  },
  {
    "c": "vision",
    "n": "Bird-Deterrent Signal Intelligence",
    "r": "bird-deterrent-signal-intelligence",
    "d": "Crop-protection via signal intelligence: MFCC/spectral DSP, a bird detector, and a habituation-aware acoustic deterrent controller. Reconstruction of a VIT project.",
    "t": [
      "DSP",
      "MFCC",
      "Detection"
    ]
  }
];
module.exports={GH,CATLABEL,FLAG,P};
