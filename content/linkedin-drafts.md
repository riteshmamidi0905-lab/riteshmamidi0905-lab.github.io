# LinkedIn approval package

Status: DRAFT — no posts have been published. Each publication requires Ritesh’s specific approval.

These films use diagram-led storytelling, a stock synthetic narrator (Kokoro am_michael), and synchronized English WebVTT captions. No personal voice is cloned and no presenter footage is fabricated. All diagrams are illustrative workflows, not live production telemetry. Final spoken scripts and timings are in `video-timings.json`. Runway sign-in was verified; its speech models require a paid upgrade, so narration was generated locally without charges.

## Catch the signal before the batch.

Format: 35-second project teaser

Video: [Preview](../assets/media/streaming-teaser.mp4) · [SRT captions](../assets/media/streaming-teaser.srt) · [Thumbnail](../assets/media/streaming-poster.webp)

### Proposed caption

A streaming pipeline needs more than a fast broker.

In my Kafka → Spark → Cassandra project, the useful engineering decisions are event-time windows, bounded late-data state, explainable fraud rules, and sink schemas that match the query pattern.

The input is synthetic and the detector is rule-based. The point is to make the processing and failure modes inspectable. This short diagram film explains the flow.

Code and tests:
https://github.com/riteshmamidi0905-lab/realtime-streaming-pipeline

Portfolio: https://riteshmamidi0905-lab.github.io/

#DataEngineering #GenerativeAI #ProductAnalytics

### Script / on-screen captions

1. A nightly batch is too late for a streaming signal.
   Visual note: A reproducible, synthetic transaction pipeline

2. Kafka receives transactions. Spark parses the JSON and applies explainable fraud rules.
   Visual note: High amount · high-risk country · non-positive amount

3. Event-time windows summarize merchants. Watermarks bound the state kept for late events.
   Visual note: One-minute windows · two-minute watermark

4. Cassandra stores transaction verdicts and merchant metrics in separate tables.
   Visual note: Inspect the transforms, tests and Docker stack on GitHub.

## A good average can hide a bad answer.

Format: 40-second project teaser

Video: [Preview](../assets/media/evaluation-teaser.mp4) · [SRT captions](../assets/media/evaluation-teaser.srt) · [Thumbnail](../assets/media/evaluation-poster.webp)

### Proposed caption

A good average can hide a required failure.

My LLM evaluation framework separates weighted rubric scores from hard thresholds. An output can score well overall and still fail a required criterion.

It combines deterministic metrics with optional model judges and makes per-case failures visible through a dashboard, API and CLI. Token-overlap checks are useful signals, but they are not proof of semantic truth.

Implementation and benchmark:
https://github.com/riteshmamidi0905-lab/llm-eval-framework

Portfolio: https://riteshmamidi0905-lab.github.io/

#LLMEvaluation #AIEngineering #RAG

### Script / on-screen captions

1. Would you ship an answer that scores well overall, but fails a required grounding check?
   Visual note: Make the failure visible before release.

2. My evaluator separates weighted rubric scores from hard thresholds.
   Visual note: JSON/YAML criteria · normalized weights · explicit gates

3. Fourteen deterministic metrics run offline. Optional LLM judges score custom criteria.
   Visual note: Heuristics and judges both have limitations.

4. Inspect per-case failures through the dashboard, REST API or command-line CI gate.
   Visual note: Explore the code and bundled RAG-QA benchmark.

## An answer needs a path back to evidence.

Format: 40-second project teaser

Video: [Preview](../assets/media/rag-teaser.mp4) · [SRT captions](../assets/media/rag-teaser.srt) · [Thumbnail](../assets/media/rag-poster.webp)

### Proposed caption

I want an answer I can trace back to evidence.

My document assistant uses sentence-aware chunks, vector retrieval with keyword re-ranking, and an extractive offline reader that can abstain when context is missing.

The interesting part is the path from retrieval to a cited answer, plus the evaluation checks around that path. Sample-corpus scores do not establish reliability on every document.

Code and evaluation harness:
https://github.com/riteshmamidi0905-lab/genai-doc-assistant

Portfolio: https://riteshmamidi0905-lab.github.io/

#LLMEvaluation #AIEngineering #RAG

### Script / on-screen captions

1. A fluent answer is not enough. Can you trace it back to a source?
   Visual note: GenAI Document Assistant · offline extractive mode

2. Documents become sentence-aware chunks. Retrieval blends vector similarity with keyword overlap.
   Visual note: Feature hashing · cosine search · re-ranking

3. The default reader extracts from retrieved context and abstains when evidence is missing.
   Visual note: Source citations · arithmetic routing · streamed responses

4. An evaluation harness checks retrieval and grounding on a sample corpus.
   Visual note: Inspect the implementation and limitations on GitHub.

## How I evaluate model outputs.

Format: 75-second technical explainer

Video: [Preview](../assets/media/evaluation-explainer.mp4) · [SRT captions](../assets/media/evaluation-explainer.srt) · [Thumbnail](../assets/media/evaluation-poster.webp)

### Proposed caption

What does a repeatable LLM evaluation actually need?

A reference, a rubric, clear thresholds and inspectable failure cases.

This 75-second walkthrough explains how my evaluator brings those pieces together. I also cover the limitation that matters: neither deterministic heuristics nor an uncalibrated model judge should be treated as ground truth.

Explore the implementation:
https://github.com/riteshmamidi0905-lab/llm-eval-framework

Portfolio: https://riteshmamidi0905-lab.github.io/

#LLMEvaluation #AIEngineering #RAG

### Script / on-screen captions

1. The problem: quality guidelines are often prose, while releases need repeatable decisions.
   Visual note: Turn the guideline into an inspectable evaluation contract.

2. Each case carries an input, an output and the reference or context needed to judge it.
   Visual note: The repository includes an 18-case RAG-QA benchmark.

3. JSON and YAML rubrics define criteria, weights and optional hard thresholds.
   Visual note: A hard gate can fail a case even when its weighted score is high.

4. Deterministic metrics check overlap, exact matches, numbers, structure and other constraints.
   Visual note: 14 built-in metrics · no API key required for core evaluation

5. An optional model judge uses a vendor-neutral chat interface for custom criteria.
   Visual note: Judge scores still need calibration and human review.

6. The engine produces per-case breakdowns, JSON reports and an interactive HTML dashboard.
   Visual note: CLI fail-under gates connect the evaluation to CI.

7. Token overlap is not semantic truth. A passing benchmark does not prove broad reliability.
   Visual note: Inspect failure cases and expand the test set before trusting a new use case.

8. The repository shows the scoring code, tests and benchmark. Explore it from my portfolio.
   Visual note: riteshmamidi0905-lab.github.io · LLM Evaluation Framework

## Inside a grounded document assistant.

Format: 3-minute project walkthrough

Video: [Preview](../assets/media/rag-walkthrough.mp4) · [SRT captions](../assets/media/rag-walkthrough.srt) · [Thumbnail](../assets/media/rag-poster.webp)

### Proposed caption

A closer look inside my document assistant.

This three-minute diagram walkthrough follows the offline path from ingestion and chunking to retrieval, extractive answers, citations and evaluation. It also shows where optional generation and storage backends fit.

I focused on interfaces and reproducibility so the default path runs without model downloads or API credentials. The next question is how well the evaluation holds on a wider corpus.

Project:
https://github.com/riteshmamidi0905-lab/genai-doc-assistant

Portfolio: https://riteshmamidi0905-lab.github.io/

#LLMEvaluation #AIEngineering #RAG

### Script / on-screen captions

1. Start with the question: how do we answer from a document collection without inventing missing information?
   Visual note: Walkthrough of the offline default path, not a live customer deployment.

2. The application connects a FastAPI backend with a browser chat interface.
   Visual note: Separate services and interfaces keep each stage inspectable.

3. Ingestion splits documents into sentence-aware chunks instead of arbitrary character slices.
   Visual note: Chunk boundaries affect what evidence retrieval can recover.

4. The default feature-hashing embedder works without downloading a model.
   Visual note: Reproducible offline development · configurable embeddings

5. A cosine vector store finds candidates. Re-ranking blends similarity with keyword overlap.
   Visual note: Retrieval quality determines which evidence reaches the reader.

6. The extractive reader answers from retrieved context and abstains when the context is insufficient.
   Visual note: The default is extractive, not unrestricted generative completion.

7. Source citations connect the answer to its originating chunk.
   Visual note: A citation is useful only if the passage supports the claim.

8. A router sends arithmetic questions to a restricted AST calculator and other questions to RAG.
   Visual note: Tool routing is explicit and returned to the interface.

9. Server-Sent Events stream responses through the chat endpoint.
   Visual note: Streaming changes delivery; it does not itself improve factual quality.

10. The evaluation harness checks retrieval hit-rate, reciprocal rank, faithfulness and answer relevance.
   Visual note: Sample-corpus thresholds are gated in CI.

11. Configuration can swap in sentence-transformers, pgvector, Ollama, Gemini or OpenAI backends.
   Visual note: Optional integrations require their own runtime setup and evaluation.

12. The limitation: sample-corpus checks do not establish reliability across arbitrary documents.
   Visual note: Broader corpora, adversarial missing-evidence cases and abstention tests come next.

13. Explore the backend, tests and evaluation code. The best evidence is the implementation itself.
   Visual note: riteshmamidi0905-lab.github.io · GenAI Document Assistant

## Research post — text draft

An answer can be correct and still be unreliable.

I’m developing MAREF, a proposed framework for evaluating agents across Task Accuracy, Groundedness, Hallucination Resistance, Instruction Adherence, Consistency and Task Completion. Separating those dimensions can make hidden failure modes easier to inspect.

The interactive portfolio explanation is illustrative, not experimental results. Dataset design, rubric validation and agreement with human reviewers are still work to do.

Explore the proposal: https://riteshmamidi0905-lab.github.io/#research

#AgentEvaluation #LLMReliability #AIResearch


## Portfolio launch — text draft

I’ve rebuilt my portfolio around the questions I’d want answered when reviewing an AI or data project: what problem does it solve, how does the system work, and what evidence supports the claims?

The site brings together 22 open-source projects, six detailed case studies, architecture animations and five short technical films. The work spans streaming data, lakehouses, RAG, model evaluation, MLOps and product experimentation.

I’ve also added MAREF, my proposed framework for examining agent reliability across six dimensions. It’s research in progress, with illustrative explanations clearly separated from experimental results.

I’m exploring AI/ML, data engineering and product analytics opportunities across the US. You can inspect the implementation and limitations behind each project here:

https://riteshmamidi0905-lab.github.io/

#AIEngineering #DataEngineering #ProductAnalytics

Suggested visual: `assets/media/streaming-poster.webp` or the portfolio hero.

Publication status: Awaiting specific approval; do not publish automatically.


## AI/data engineering positioning — text draft

The part of AI engineering I enjoy most is making a system inspectable.

Across my open-source work, that means tracing an event through Kafka and Spark, following a retrieved passage into a cited answer, or examining the exact criterion that caused an evaluation gate to fail.

My portfolio connects those engineering decisions with data and product questions: what should we measure, what can go wrong, and what evidence would justify the next decision?

I’m interested in AI/ML, data engineering and product analytics roles where those questions matter. The code, case studies and limitations are available here:

https://riteshmamidi0905-lab.github.io/#work

#AIEngineering #LLMEvaluation #ProductAnalytics

Suggested video: `evaluation-teaser.mp4`; synthetic narration with English captions.

Publication status: Awaiting specific approval; do not publish automatically.
