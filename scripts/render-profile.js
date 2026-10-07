/* render-profile.js — the GitHub profile README (repository riteshmamidi0905-lab/riteshmamidi0905-lab), generated from the same sources as the portfolio so the
   numbers and the labels cannot drift: scripts/claims.js (vendored manifest), content/agent-runtime.json, content/llm-eval-framework.json, content/site.json, data.js.
   Run: node scripts/render-profile.js   (writes profile/README.md; `npm test` fails if the committed copy is stale). Copy the file into the profile repository by hand. */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const { GH, CATLABEL, P } = require(path.join(root, 'data.js'));
const site = require(path.join(root, 'content/site.json')), RT = require(path.join(root, 'content/agent-runtime.json')), EVAL = require(path.join(root, 'content/llm-eval-framework.json'));
const { CP, REPO_URL, SHORT, REL } = require('./render-copilot'); const C = require('./claims');
const SITE = 'https://riteshmamidi0905-lab.github.io/', pr = site.person;
const unesc = (t) => String(t).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const stat = (id) => CP.stats.find((s) => s.claim === id);
const rt = (k) => RT.stats.find((x) => x[1].startsWith(k));
const badge = (k) => `**${C.BADGES[k][0].toUpperCase()}**`;
const link = (t, h) => `[${t}](${h})`;
const supporting = P.filter((p) => !['support-escalation-copilot', RT.repo, 'llm-eval-framework'].includes(p.r));
const groups = Object.entries(CATLABEL).map(([k, label]) => [label, supporting.filter((p) => p.c === k)]).filter(([, ps]) => ps.length);

const md = `<h1 align="center">${pr.name}</h1>

<p align="center">
  <b>${site.hero.tagline[0]}</b><br>
  ${site.hero.tagline[1]} ${site.hero.tagline[2].replace(/^and/, 'and')}
</p>

<p align="center">
  Austin, TX · Data &amp; AI Analyst (LLM and ML output quality, client engagement)<br>
  <a href="${SITE}">Portfolio</a> · <a href="${SITE}recruiter.html">Recruiter view</a> · <a href="${SITE}${pr.resume}">Résumé</a> · <a href="${pr.linkedin}">LinkedIn</a>
</p>

---

I build AI agents, the infrastructure they run on, and the evaluation of how they fail, in the open, and publish the evidence next to the claims. Professionally I validate LLM and ML outputs against policy and quality rubrics and build QA and reporting in Python and SQL. The three layers below are separate pieces of independent work, not one deployment, and each one says what was verified, what was simulated and what was not evaluated.

## Flagship systems

### 1 · I build AI agents: ${link(CP.title, REPO_URL)} \`${REL}\`
${CP.oneLine}

- ${badge('verified')} ${stat('test-suite').value} automated tests pass; ${stat('threat-catalogue').value} catalogued attacks have executable tests; mutation checks kill ${stat('mutation-checks').value} of the control-plane mutations.
- ${badge('simulated')} The model is a deterministic rule-based stand-in, not an LLM. Across ${C.claim('invariants-held-in-scenario-runs').value.injection_runs} injection runs, including a deliberately obedient scripted model, ${C.claim('invariants-held-in-scenario-runs').value.invariant_violations} invariants were violated.
- ${badge('not-evaluated')} ${C.claim('real-model-evaluation-status').claim}
- ${badge('limitation')} Fictional customer, synthetic data, never deployed.

${link('Interactive case study', SITE + CP.caseStudy)} · ${link('Repository', REPO_URL)} · ${link('Public claims manifest', `${REPO_URL}/blob/${C.SOURCE.sha}/content/public-claims.json`)} · evidence commit \`${SHORT}\`

### 2 · I build the infrastructure they run on: ${link(RT.title, GH + RT.repo)}
${RT.oneLine}

- ${badge('verified')} ${rt('tests')[0]} tests; CI on Python ${rt('Python')[0]}; PostgreSQL 16 integration tests; a Docker Compose smoke-and-restart job in CI; ${rt('scenarios')[0].replace(/\s/g, '')} evaluation scenarios reached the expected status (7 are deliberate failures).
- ${badge('simulated')} ${RT.qualifier}
- ${badge('limitation')} ${RT.limitations[0]}

${link('Case study', SITE + '#runtime')} · ${link('Repository', GH + RT.repo)} · evidence commit \`${RT.sha.slice(0, 7)}\`

### 3 · I evaluate how they fail: ${link('llm-eval-framework', GH + 'llm-eval-framework')} and ${link('MAREF', 'https://github.com/' + EVAL.maref.repo)}
Rubric-driven evaluation of model outputs with weighted scores, hard per-criterion gates and inspectable failures.

- ${badge('verified')} ${EVAL.stats[0][0]} tests pass and ${EVAL.stats[1][0]} deterministic metrics (re-run ${EVAL.verifiedOn} at \`${EVAL.sha.slice(0, 7)}\`).
- ${badge('simulated')} ${EVAL.qualifier}
- ${badge('limitation')} MAREF evaluates runs of an agent (it is not an agent). It is a research prototype with a same-author, pre-registered evaluation: not independent validation, and its test split is spent.

> **${EVAL.maref.card.title}**<br>
> ${EVAL.maref.card.numbers}<br>
> ${EVAL.maref.card.claim}<br>
> ${link(EVAL.maref.card.link, `https://github.com/${EVAL.maref.repo}/blob/${EVAL.maref.sha}/docs/EVALUATION.md`)}

MAREF evaluates the runs recorded by the Agent Runtime Benchmark (${link('ARB-1', GH + 'agent-runtime-bench')}), which exercises the AI Agent Runtime above.

${link('Case study', SITE + '#evaluation')} · ${link('llmeval', GH + 'llm-eval-framework')} · ${link('MAREF', 'https://github.com/' + EVAL.maref.repo)} · ${link('Canonical claim', `https://github.com/${EVAL.maref.repo}/blob/${EVAL.maref.sha}/docs/CLAIM.md`)}

## How the evidence is labelled

| Label | Meaning |
| :-- | :-- |
${Object.entries(C.BADGES).map(([k, [name, def]]) => `| ${badge(k)} | ${def} |`).join('\n')}

## Supporting work

Smaller or older projects. Their repositories carry their own tests and notes; I make no numeric claims about them here.

${groups.map(([label, ps]) => `**${label}**\n\n| Project | What it does |\n| :-- | :-- |\n${ps.map((p) => `| ${link(p.r, GH + p.r)} | ${unesc(p.d)} |`).join('\n')}`).join('\n\n')}

## Stack

Python · SQL · PostgreSQL (row-level security, pgvector) · FastAPI · PyTorch · scikit-learn · pandas · Spark · Kafka · Docker · GitHub Actions · Power BI · Tableau

## Education and certifications

${site.education.map((e) => `- **${e[0]}**, ${e[1]}`).join('\n')}
${site.certs.map((e) => `- **${e[0]}**, ${e[1]}`).join('\n')}

<p align="center"><i>${site.person.status}</i></p>
`;
fs.mkdirSync(path.join(root, 'profile'), { recursive: true });
const out = path.join(root, 'profile/README.md');
if (require.main === module) { fs.writeFileSync(out, md); console.log('profile/README.md written, ' + md.length + ' bytes'); }
module.exports = { md, out };
