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
const tk = (e) => C.token(e), A = RT.arb;
const ALSO = site.alsoBuilt.groups.flatMap((g) => g.items);

const md = `<h1 align="center">${pr.name}</h1>

<p align="center">
  <b>${site.hero.tagline[0]}</b><br>
  ${site.hero.tagline[1]} ${site.hero.tagline[2]}
</p>

<p align="center">
  Austin, TX · Data &amp; AI Analyst (LLM and ML output quality, client engagement)<br>
  <a href="${SITE}">Portfolio</a> · <a href="${SITE}recruiter.html">Recruiter view</a> · <a href="${SITE}${pr.resume}">Résumé</a> · <a href="${pr.linkedin}">LinkedIn</a>
</p>

---

**Professionally** I validate LLM and ML outputs against policy and quality rubrics and build QA and reporting in Python and SQL. **In independent, open-source work** I build AI agents, the infrastructure they run on, and the evaluation of how they fail, and publish the evidence next to the claims. The three layers below are separate pieces of work, not one deployment; each says what was verified, what was simulated and what its limits are.

## I build AI agents

### ${link(CP.title, REPO_URL)} \`${REL}\`
${CP.oneLine}

- ${badge('verified')} ${stat('test-suite').value} automated tests pass; ${stat('threat-catalogue').value} catalogued attacks have executable tests.
- ${badge('verified')} **One real-model run** (a small local model, one pass): ${tk('real-model-expected-outcomes.expected_outcome_attained')} of ${tk('real-model-expected-outcomes.cases')} cases reached the frozen expected outcome (not accuracy). It failed at the interface (schema, evidence handles, action parameters, drafts) while the four deterministic invariants held.
- ${badge('simulated')} The default model is a deterministic rule-based stand-in, not an LLM; approvers are simulated.
- ${badge('limitation')} Fictional customer, synthetic data, never deployed.

${link('Case study', SITE + CP.caseStudy)} · ${link('Repository', REPO_URL)} · ${link('Release ' + REL, `${REPO_URL}/releases/tag/${REL}`)}

## I build the infrastructure they run on

### ${link(RT.short, GH + RT.repo)} + ${link('Agent Runtime Benchmark', GH + A.repo)}
${RT.oneLine}

- ${badge('verified')} ${rt('tests')[0]} tests; ${rt('scenarios')[0].replace(/\s/g, '')} evaluation scenarios reached the expected status (scripted models, not a benchmark of LLM quality).
- ${badge('verified')} ARB-1, one small model through the unmodified runtime: **${A.results[0][0]}** tasks passed the frozen oracles; the runtime's **${A.results[1][0]}** controls held ${A.results[1][2]}.
- ${badge('limitation')} It still found a hole (${A.results[2][0]}): ${A.results[2][2]}, and every control held. The lesson: ${A.lessonTitle}.

${link('Case study', SITE + 'agent-runtime.html')} · ${link('Runtime', GH + RT.repo)} · ${link('Benchmark results', `${GH}${A.repo}/blob/${A.sha}/docs/RESULTS.md`)}

## I evaluate how they fail

### ${link('llmeval', GH + EVAL.repo)} + ${link('MAREF', 'https://github.com/' + EVAL.maref.repo)}
- ${badge('verified')} llmeval: ${EVAL.stats[0][0]} tests pass and ${EVAL.stats[1][0]} deterministic metrics (hand-written cases, not an evaluation of any model).
- ${badge('limitation')} MAREF evaluates runs of an agent (it is not an agent). It is a research prototype with a same-author, pre-registered evaluation: not independent validation, and its test split is spent.

> **${EVAL.maref.card.title}**<br>
> ${EVAL.maref.card.numbers}<br>
> ${EVAL.maref.card.claim}<br>
> ${link(EVAL.maref.card.link, `https://github.com/${EVAL.maref.repo}/blob/${EVAL.maref.sha}/docs/EVALUATION.md`)}

${link('Evaluation page', SITE + 'evaluation.html')} · ${link('llmeval', GH + EVAL.repo)} · ${link('MAREF', 'https://github.com/' + EVAL.maref.repo)} · ${link('Canonical claim', `https://github.com/${EVAL.maref.repo}/blob/${EVAL.maref.sha}/docs/CLAIM.md`)}

## How the evidence is labelled

| Label | Meaning |
| :-- | :-- |
${Object.entries(C.BADGES).map(([k, [name, def]]) => `| ${badge(k)} | ${def} |`).join('\n')}

## Also built

${ALSO.map(([r, line]) => `- ${link(r, GH + r)}: ${line}`).join('\n')}

All ${P.length} projects, with code, tests and limits: ${link('portfolio', SITE + 'projects.html')}.

## Stack, education and certifications

Python · SQL · PostgreSQL (row-level security, pgvector) · FastAPI · PyTorch · scikit-learn · pandas · Spark · Kafka · Docker · GitHub Actions · Power BI · Tableau

${site.education.map((e) => `- **${e[0]}**, ${e[1]}`).join('\n')}
${site.certs.map((e) => `- **${e[0]}**, ${e[1]}`).join('\n')}

<p align="center"><i>${site.person.status}</i></p>
`;
fs.mkdirSync(path.join(root, 'profile'), { recursive: true });
const out = path.join(root, 'profile/README.md');
if (require.main === module) { fs.writeFileSync(out, md); console.log('profile/README.md written, ' + md.length + ' bytes'); }
module.exports = { md, out };
