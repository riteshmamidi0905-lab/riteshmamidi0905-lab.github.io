# M7 — public portfolio and GitHub transformation

What changed, why, and how the claims are kept honest. Nothing here describes professional AI-engineering employment: the portfolio says plainly that the professional role is Data & AI Analyst (LLM and ML output validation, client engagement) and that the AI engineering shown is independent, open-source work.

## Positioning

- Hero: *Product-minded AI builder. Agent systems, evaluation, and the controls around the model.* Under it, a three-item proof strip: the Support Escalation Copilot and the AI Agent Runtime with their evidence labels, and the current professional role. GitHub and résumé are in the first screen; the recruiter view is in the navigation.
- No page, meta tag or structured-data field titles Ritesh an AI or ML engineer (`jobTitle` is "Data & AI Analyst"). The status line says what roles he is open to; that is not a title.
- Career story (Experience): product and data problem solving (professional) → AI evaluation (professional, plus the open-source llmeval) → agent engineering → production controls → customer-scenario AI systems (independent builds). Each step is labelled Professional or Independent build.

## Flagship hierarchy

1. **Support Escalation Copilot** (`v0.6.0`, commit `d259c57`): a pinned ten-step scene (customer problem → ticket → tenant scope → evidence → diagnosis → typed action → policy → approval → idempotent execution → audit and recovery), a compact adversarial story and its residual, and a dedicated case-study page with an attack replay, recorded draft checks, the retrieval evaluation, three real screenshots, and every portfolio-eligible claim in a filterable evidence table.
2. **AI Agent Runtime — From First Principles to Production** (commit `231b186`, unchanged evidence).
3. **LLM evaluation**: llmeval (33 tests and 14 metrics re-run at `99e6121`; its 18-case benchmark is hand-written and tests the metric suite, not a model) and MAREF, which is a proposal with no repository or result and is labelled *not evaluated*.

The earlier six "flagship builds" (streaming, lakehouse, document assistant, MLOps, experimentation, and llmeval itself) are now supporting evidence and keep their existing, already-qualified text.

## Evidence labels

One vocabulary, defined once in `scripts/claims.js` and derived from the source manifest's own fields: **Verified** (tested or measured in the public repository at the pinned commit), **Simulated** (real code with a scripted stand-in for the model, a customer system or an approver), **Limitation** (a stated gap), **Not evaluated** (not run; no result claimed). Labels carry a shape as well as a colour.

## Claim governance

See the README section of the same name. In short: the Copilot's numbers are tokens resolved from a vendored copy of the repository's `content/public-claims.json`; a claim the repository did not mark `suitable_for.portfolio` cannot be rendered; the 280/315 stand-in outcome figure is withheld by the source and therefore absent; every figure in the narrative must appear in an eligible claim; the attack replay and draft examples are rows of the repository's own reports; CI re-fetches the vendored files from the pinned commit. `python3 scripts/mutate-claim-guards.py` deliberately breaks each guard and requires the checks to fail (18 of 18 caught on the day it was written; two gaps found while writing it were closed).

## GitHub profile

`profile/README.md` is generated (`npm run profile`) from the same claims and is copied into the profile repository by hand. Repository descriptions and topics were added where they were missing; nothing else in any other repository was changed. Pinned repositories, the profile bio and the display name cannot be set through the API with the available token and need to be set in the GitHub UI: pin `support-escalation-copilot`, `ai-agent-from-scratch` and `llm-eval-framework`.

## What is deliberately not here

No production users, revenue, latency, accuracy, cost, deployment-scale or real-LLM claims. No screenshots other than those from the Copilot repository at the pinned commit. No statement that the Copilot was deployed, or that its model is a language model.
