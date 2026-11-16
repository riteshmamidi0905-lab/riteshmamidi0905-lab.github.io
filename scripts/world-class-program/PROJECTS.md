# Project inventory and engineering-laboratory map

The read-only audit resolves **29 portfolio entries**, **28 distinct public source repositories**, and **25 entries historically labeled VERIFIED**, with two PROTOTYPE and two UNVERIFIED entries. All 28 public pinned commit references resolve and their source trees were inspected for README, tests, docs and CI paths. Project tests, models and inference were not executed in this audit, so these are not 25 fresh verification results.

The GitHub owner has **33 public repositories** at the audit timestamp. The remaining five are the brewery concept, profile/site and preview/rehearsal repositories; repo count is not engineering-project count. The NASHA AI Lab inventory entry has no public source URL. Follow-up connector inspection located an external lab branch, but not the historical source commit cited by the recordings; it is not promoted to freshly verified status. `projects.html` is a separate legacy page with 24 items; `data/projects.json` is the 29-entry inventory. Do not label all 29 “verified” or invent five projects to reconcile page counts.

Full immutable commits, source-tree URLs, actual test/doc/CI paths, historical evidence and limits are in `project-audit.json`. Presence of tests is not proof they pass. Existing project demos remain intact; this iteration does not rerun embedded databases, train models, download models or deploy services.

## Proposed laboratory organization using existing work

| Laboratory | Existing source projects to inspect | Presentation and evidence boundary |
|---|---|---|
| Applied AI / evaluation | llm-eval-framework, production-ai-agent-platform, support-escalation-copilot | Actual code, recorded test/evaluation evidence and explicit deterministic/provider limits |
| GenAI / retrieval | genai-doc-assistant, rag-doc-qa | Sources, retrieval traces and documented evaluation; no new live chat claim |
| Agents / FDE | ai-agent-from-scratch, ai-agent-toolkit, agent-runtime-bench, production-ai-agent-platform | Business trigger → requirement → contract → failure handling → evaluation → deployment considerations |
| Governance / reliability | mcp-weir, llm-eval-framework, maref | Policy and negative controls; preserve prototype status and same-author evaluation limits |
| Product analytics / experimentation | experimentation-toolkit, product-analytics-funnel-retention, saas-kpi-dashboard | Real formulas, cohorts and tests; no employment or real-customer outcome invention |
| Data engineering / BI | sql-analytics-warehouse, spark-data-lakehouse, realtime-streaming-pipeline | Source/test docs; streaming remains historically UNVERIFIED until actually retested |
| AI/ML engineering | customer-churn-prediction, mlops-platform, nlp-text-intelligence, speech-intelligence, vision-inference-api and other inventoried modality projects | Individual source and scope, synthetic/sample data limits; no training or production-readiness claims from a category label |

Do not count a laboratory, demo lens, recorded scenario or reused dependency as another distinct project. Before unifying legacy/new page counts, choose the canonical inventory and explicitly state total, historical verification class and source availability. A later presentation update should derive counts rather than hard-code them; no approved PDF or employment content is modified by this map.
