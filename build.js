/* build.js — static site generation. data.js + content/*.json (+ index.src.html skeleton) → index.html and recruiter.html.
   Run: node build.js            (PREVIEW=1 node build.js --out dir  → noindex copy for branch previews) */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./scripts/render');
const { worldHTML, worldsJSON } = require('./scripts/worlds-html');
const { FLAG, P } = require('./data.js');

const SITE = __dirname;
let tpl = fs.readFileSync(path.join(SITE, 'index.src.html'), 'utf8');
const map = {
  '<!--NAV-->': R.navHTML(), '<!--HERO-->': R.heroHTML(), '<!--BUILD-->': R.buildHTML(), '<!--COPILOT-->': R.copilotHTML(), '<!--RUNTIME-->': R.runtimeHTML(), '<!--EVALUATION-->': R.evaluationHTML(), '<!--SUPPORTING-->': R.supportingIntroHTML(), '<!--FLAGSHIPS-->': R.flagshipsHTML(),
  '<!--EXPERIENCE-->': R.experienceHTML(), '<!--PROJECTS-->': R.projectsHTML(), '<!--ABOUT-->': R.aboutHTML(), '<!--CONTACT-->': R.contactHTML(),
  '<!--FOOTER-->': R.footerHTML(), '<!--PDETAIL-->': R.detailDialog(), '<!--WORLDS-JSON-->': worldsJSON(R.flagStepsConfig()),
};
for (const [k, v] of Object.entries(map)) { if (!tpl.includes(k)) throw new Error('missing placeholder ' + k); tpl = tpl.replace(k, () => v); }
tpl = tpl.replace(/<!--CHAPTER:(\w+)-->/g, (m, id) => R.chapterHTML(id));
if (/<!--[A-Z]+[:\w-]*-->/.test(tpl)) throw new Error('unreplaced build placeholder');
const preview = process.env.PREVIEW === '1';
const outDir = preview ? path.resolve(process.argv[process.argv.indexOf('--out') + 1] || 'preview-out') : SITE;
const robots = preview ? '\n<meta name="robots" content="noindex,nofollow"><meta name="preview" content="branch preview — not the live site">' : '';
if (preview) { tpl = tpl.replace('<meta name="robots" content="index,follow">', ''); }
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), preview ? tpl.replace('</head>', robots + '\n</head>') : tpl);
fs.writeFileSync(path.join(outDir, 'recruiter.html'), R.recruiterHTML(preview ? robots : ''));
/* case-study page: same design system, its own skeleton */
{
  const CPR = R.CPR; let page = fs.readFileSync(path.join(SITE, 'copilot.src.html'), 'utf8');
  const pm = { '<!--NAV-->': R.navHTML(...CPR.pageNavArgs()), '<!--MAIN-->': CPR.pageMain(), '<!--FOOTER-->': R.footerHTML(), '<!--WORLDS-JSON-->': worldsJSON(R.flagStepsConfig()) };
  for (const [k, v] of Object.entries(pm)) { if (!page.includes(k)) throw new Error('missing placeholder ' + k); page = page.replace(k, () => v); }
  if (/<!--[A-Z]+[:\w-]*-->/.test(page)) throw new Error('unreplaced build placeholder (case study)');
  if (preview) page = page.replace('<meta name="robots" content="index,follow">', '').replace('</head>', robots + '\n</head>');
  fs.writeFileSync(path.join(outDir, 'support-escalation-copilot.html'), page);
}
console.log(`Built index.html — ${FLAG.length} flagships, ${P.length} projects, ${tpl.length} bytes${preview ? ' (preview, noindex)' : ''}.`);
