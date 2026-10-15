# Claims audit, Block 4.5 (NASHA AI Operations Lab)

Each claim was checked for: number, scope, qualifier, synthetic disclosure, limitation, source. Surfaces: homepage, nasha-lab.html, recruiter view, project cards, profile README, LinkedIn draft, resume draft.

| Misreading to prevent | Where it was at risk | Change | Guard |
|---|---|---|---|
| "LLMs are worse than deterministic systems" | NASHA page title/hero ("The LLM didn't win", "It didn't"), homepage chip, LinkedIn hook "It lost.", CASE-STUDY heading | Now "a deterministic planner beat small local LLMs on synthetic scenarios"; "two small local LLM planners did not win on these scenarios"; hook names the planner and scenarios | check-nasha BAN + bare "It lost." ban on homepage/recruiter/profile/LinkedIn |
| "BM25 is better than embeddings" | LinkedIn ("BM25 still beat them"), recruiter line | "on this identifier-heavy corpus BM25 still led overall"; hybrids ahead on the least word-overlapping questions; page already says not a claim about neural retrieval in general | BAN regex requiring corpus/benchmark qualifier |
| "100% real-world accuracy" | 259/259 (100%) pass rate | Kept only as scenario pass rate on author-written synthetic scenarios with same-author note | BAN on "100% ... accuracy" |
| "NASHA is an operating company" | hero disclosure | Already "not a live operating restaurant: no customers, revenue, suppliers, orders or deployment", working name, not employment | BAN on "is a(n) operating/live/real company|business|restaurant" |
| "metrics are business outcomes" | resume short form | Added "same-author, not a claim about LLMs in general ... not employment; no business results" | BAN on "are/show/deliver business results/outcomes/impact" |

Other fixes: the purchase-order rule gap is reported as a Block 4 finding and a NEW Block 4.5 fix (versioned quantity-aware rule; frozen Block 3 results unchanged). production-ai-agent-platform: README-based only, reported tests not run, no CI result cited. The "229 tests in CI" figure is the Block 3 CI count and is left as labelled evidence; the current local suite is larger and no new CI count is claimed.
