# Forward Deployed Engineer roadmap

FDE evidence is a *shape of work*, not a framework list: understand a messy customer problem, integrate with systems you don't control, ship quickly, operate it, and explain the impact. None of the 22 repos starts from a customer; that is the gap.

## Loop every FDE project must show
Customer → problem → constraints → data → existing systems → success metrics → design → build → integrate → deploy → observe → evaluate → improve → business-impact write-up.

## Sequence
1. **Foundation first** (AI Engineer milestones 1–3): an agent runtime with permissions, approvals and traces. FDE work leans on this.
2. **Customer Support Intelligence** (the one new FDE project): synthetic-but-realistic company data (tickets, docs, CRM rows in SQL, an escalation webhook). Each deliverable begins with a one-page brief (customer, constraints, success metrics). Build ingestion, retrieval, customer-context joins, an approval-gated agent workflow, ticket clustering, an API and a small dashboard. Measure retrieval quality, task completion, latency, failure rate, human-acceptance rate on a labelled set, and clearly-labelled outcome proxies.
3. **Second customer scenario with different constraints** (e.g. data stays on-prem, no external LLM): proves configuration and security trade-offs, not just reuse.
4. **Incident write-up**: break something deliberately, debug, write the post-mortem.

## Capability map
| FDE capability | Where it will be proven |
|---|---|
| Discovery, ambiguity | project briefs + "assumptions & open questions" docs |
| Rapid prototyping | milestone timeline in each repo's README |
| API/enterprise data integration, SQL | CRM/SQL connectors in the support project (ai-skills-platform gateway as base) |
| Workflow automation | escalation + approval flow |
| Security, customer-specific config | per-tenant config and permission tests |
| Deploy, debug, observe | Docker/CI, traces, post-mortem |
| Communication, product judgement, impact | brief, ADRs, results write-up with honest limits |

## Gate
Do not start step 2 until the agent runtime has tool permissions, approval gates and tracing (milestone 1 V7–V9).
