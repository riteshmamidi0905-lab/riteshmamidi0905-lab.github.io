# M10: MAREF integration and the three-layer hierarchy

Scope: the smallest change that (1) shows MAREF once it is public, with exactly the approved card and its caveats, and (2) lets a reader see within seconds how the three flagships relate. The visual system, the pinned scenes, the labs, the Copilot claim governance and the career story are unchanged.

## The hierarchy (hero, flagship list, recruiter view, profile README)
| Layer | Statement | Work |
|---|---|---|
| A | I build AI agents | Support Escalation Copilot (application-level agentic system) |
| B | I build the infrastructure they run on | AI Agent Runtime (reusable agent infrastructure) |
| C | I evaluate how they fail | llmeval (output level) and MAREF (run level; a research prototype; **not an agent**) |

The relationship is stated where it matters: MAREF evaluates the runs recorded by the Agent Runtime Benchmark (ARB-1), which exercises the AI Agent Runtime. They are separate pieces of work, **not one production deployment** (flagship list heading and recruiter/profile copy say so). The product / data / quality experience stays the bridge: the hero still opens with "Product-minded AI builder", the current role chip is unchanged, and the experience section is untouched.

## The MAREF card (exact, approved)
> MAREF · Research prototype · MIXED
> 33/33 labelled failures detected · 36/154 clean runs flagged · 151/187 overall agreement
> Pre-registered advantage vs shipped llmeval gates; no demonstrated advantage over stronger baselines or for trajectory-specific failures.
> Full evaluation →

The link is the pinned public canonical evaluation (`docs/EVALUATION.md` at the commit named in `content/evidence/maref/SOURCE.json`). Beside it: the same-author / not-independent-validation disclosure (with the evidence label *Limitation*), the canonical claim (`CLAIM.md`), and links to the MAREF and ARB repositories. The hero chip says only "MAREF: Research prototype · MIXED" (no figures).

## What else changed (only where the new facts made existing text false)
* The MAREF scene, explorer abstract, status line and playground relabelled: MAREF is no longer "in development", "on paper" or "a proposal"; the scene and playground are labelled illustrations (six of MAREF's eight dimensions; proxy metrics from llmeval), not MAREF and not its results.
* The runtime's first limitation ("No real language model has been exercised") was replaced by the ARB-1 statement with its caveats (one small local model, 48 author-written tasks, heuristic oracles, a control gap found, not a safety claim about the runtime), and the ARB repository was added to the runtime links.
* The evaluation card's bridge sentence about the Copilot now says no real-model result is claimed for the published v0.6.0 (the Copilot claims are unchanged and still come only from the vendored v0.6.0 manifest).

## Guards (`scripts/check-site.js`, mutation-checked by `scripts/mutate-claim-guards.py`)
Card text exact; every card line present in the vendored canonical claim; figures equal the recorded frozen-primary-label results; card identical in the home page and the recruiter view; link exact; `33/33` never without `36/154` and `151/187` within the same passage on any surface; banned wording absent; "validated" never adjacent to MAREF; disclosure present; hierarchy labels identical in the hero and flagship list; MAREF never described as an agent.

## Updating the pin
Change `sha` in `content/llm-eval-framework.json` (key `maref`) and `content/evidence/maref/SOURCE.json`, re-fetch `docs/CLAIM.md` and `results/test/results.json` at that commit, recompute the hashes, rebuild, run the checks. The card wording must change only when MAREF's `docs/CLAIM.md` does.
