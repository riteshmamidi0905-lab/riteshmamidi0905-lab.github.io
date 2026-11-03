"""Generate lab-explorer.html and verified-projects.html from data/*.json, patch the shared navigation, and refresh release-files.json. Stdlib only; run from the repo root: python3 scripts/build-lab.py"""
# The legal employer is deliberately not written out anywhere in this repository; it is rebuilt here only to strip it from source text.
EMPLOYER = "".join(map(chr, (77, 111, 118, 97, 116, 101)))
import hashlib, html, json, re
from pathlib import Path
root = Path(__file__).resolve().parents[1]
E = html.escape

import sys
sys.path.insert(0, str(root / 'scripts'))
from labcommon import concept_figures, apply_nav
lab = json.loads((root / "data/lab.json").read_text()); projects = json.loads((root / "data/projects.json").read_text())
LABEL = dict(VERIFIED="Verified implementation", UNVERIFIED="Implemented, unverified", PROTOTYPE="Prototype", PLANNED="Planned", CONCEPT="Concept", FAIL="Evaluation not passed")
ARROW = '<svg class="arrow-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 14 14 4M4 4h10v10"/></svg>'
src = (root / "recruiter.html").read_text()
head_tpl = src[:src.index("<title>")]
NAV = ('<nav id="navigation" aria-label="Main navigation"><a href="index.html">Overview</a><a href="ai-engineering.html">AI engineering</a>'
       '<a href="nasha-lab.html"{a1}>NASHA AI Lab</a><a href="lab-explorer.html"{a2}>Lab explorer</a><a href="verified-projects.html"{a3}>Verified projects</a>'
       '<a href="projects.html">Projects</a><a href="recruiter.html">For recruiters</a></nav>')
def header(cur):
    h = src[src.index('<body>'):src.index('<main')]
    h = re.sub(r'<nav id="navigation".*?</nav>', NAV.format(a1="", a2=' aria-current="page"' if cur == 2 else "", a3=' aria-current="page"' if cur == 3 else ""), h, flags=re.S)
    return h
footer = src[src.index('</main>'):]
def page(name, title, desc, cur, body, extra_head=""):
    h = head_tpl.replace('recruiter.html', name).replace('Professional experience, independent AI projects, skills, education, résumé and contact details for Ritesh Mamidi.', E(desc))
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{E(desc)}">', h)
    h += f'<title>{E(title)}</title><link rel="icon" href="mark.svg" type="image/svg+xml"><link rel="stylesheet" href="cinematic.css"><link rel="stylesheet" href="lab.css"><script src="cinematic.js" defer></script><script src="lab.js" defer></script></head>'
    (root / name).write_text(h + header(cur) + f'<main id="main" tabindex="-1">{body}</main>' + footer[len('</main>'):])
def chip(s): return f'<span class="chip {s}">{LABEL[s]}</span>'
def legend(): return '<ul class="legend" aria-label="Status legend">' + "".join(f'<li>{chip(s)}</li>' for s in ("VERIFIED", "UNVERIFIED", "PROTOTYPE", "FAIL", "PLANNED", "CONCEPT")) + '</ul>'
def filter_bar(values):
    btns = '<button type="button" data-value="ALL" aria-pressed="true">All</button>' + "".join(f'<button type="button" data-value="{v}" aria-pressed="false">{LABEL[v]}</button>' for v in values)
    return f'<div class="filters" data-filter-bar role="group" aria-label="Filter by status">{btns}</div><p class="note" data-filter-count aria-live="polite"></p>'
CTA = ('<div class="actions"><a class="button primary" href="ritesh_mamidi_resume.pdf">View résumé</a><a class="button" href="projects.html">Explore projects</a>'
       '<a class="button" href="nasha-lab.html">NASHA AI Lab story</a><a class="button" href="https://github.com/riteshmamidi0905-lab">View GitHub</a>'
       '<a class="button" href="https://linkedin.com/in/riteshmamidi0905">Connect on LinkedIn</a><a class="button" href="mailto:riteshmamidi0905@gmail.com">Contact me</a></div>')
# ---- lab-explorer
nodes_by = {}
for n in lab["nodes"]: nodes_by.setdefault(n["layer"], []).append(n)
def node_html(n):
    links = "".join(f'<a href="verified-projects.html#{E(l)}">{E(l)}</a>' for l in n["links"])
    return (f'<details class="node reveal" id="{E(n["id"])}" data-status="{n["status"]}"><summary><span>{chip(n["status"])}</span><h4>{E(n["title"])}</h4><span class="note">{E(n["summary"])}</span></summary>'
            f'<div class="body"><dl><dt>Evidence</dt><dd>{E(n["evidence"])}</dd></dl><p class="limits"><strong>Limits:</strong> {E(n["limits"])}</p>' + (f'<p class="links"><strong>Repositories:</strong> {links}</p>' if links else "") + '</div></details>')
layers = "".join(f'<section class="layer" aria-labelledby="layer{i}"><h3 id="layer{i}">{i+1}. {E(name)}</h3><div class="cards">{"".join(node_html(n) for n in nodes_by.get(i, []))}</div></section>' for i, name in enumerate(lab["layers"]))
KIND = [("concept", "Business concept"), ("simulation", "Synthetic simulation"), ("component", "Implemented engineering component"), ("planned", "Planned capability")]
def kinds_html(s): return '<ul class="kinds" aria-label="What exists for this scenario">' + "".join(f'<li class="{"on" if k in s["kinds"] else "off"}"><span class="kd {k}"></span>{lbl}<span class="sr"> ({"present" if k in s["kinds"] else "not present"})</span></li>' for k, lbl in KIND) + '</ul>'
sc = "".join(f'<article class="scenario" id="sc{i}" data-name="{E(s["name"])}"><h3>{E(s["name"])}</h3>{kinds_html(s)}<p>{chip(s["status"])} <span class="sim-tag">{"Simulated on synthetic data" if "simulation" in s["kinds"] else "Not simulated"}; the NASHA business is a concept</span></p><p><strong>What it would do:</strong> {E(s["what"])}</p><p><strong>Basis:</strong> {E(s["basis"])}</p><p class="links"><strong>Connected components:</strong> ' + " ".join(f'<a href="#{E(x)}">{E(next(n["title"] for n in lab["nodes"] if n["id"] == x))}</a>' for x in s["nodes"]) + '</p></article>' for i, s in enumerate(lab["scenarios"]))
reg = "".join(f'<tr data-status="{ {"TESTED":"VERIFIED","INTEGRATED":"VERIFIED","IMPLEMENTED":"UNVERIFIED","DESIGNED":"PLANNED","NOT STARTED":"CONCEPT"}.get(r["status"],"PLANNED") }"><td>{r["n"]}</td><td>{E(r["name"])}</td><td><span class="chip {"VERIFIED" if r["status"] in ("TESTED","INTEGRATED") else "UNVERIFIED" if r["status"]=="IMPLEMENTED" else "PLANNED"}">{E(r["status"])}</span></td><td>{E(r["done"])}</td><td>{E(r["missing"])}</td></tr>' for r in lab["register"])
counts = {}
for r in lab["register"]: counts[r["status"]] = counts.get(r["status"], 0) + 1
rules = " ".join(f'<strong>{E(k)}</strong>: {E(v)}.' for k, v in lab["register_rules"].items())
_fig = concept_figures(root, E)
body = f'''<section class="page-intro wrap"><p class="eyebrow"><span class="signal"></span>NASHA AI LAB / ECOSYSTEM EXPLORER</p><h1>A business concept.<br><em>An engineering laboratory.</em></h1>
<p class="lead">NASHA AI Lab is my independent AI engineering ecosystem. The proposed NASHA brewery is a business concept that gives it a realistic scenario: how could AI help create, plan and operate a business, and how would we measure, secure and govern it?</p>
<div class="status-strip" role="note"><span><strong>Concept:</strong> the NASHA brewery is a proposal, not an operating business.</span><span><strong>In development:</strong> NASHA AI Lab.</span><span><strong>Not passed:</strong> the live model evaluation has not met its acceptance criteria (failed).</span><span><strong>Not deployed.</strong></span></div></section>
<section class="wrap content-section" id="ecosystem"><p class="eyebrow">01 / ECOSYSTEM MAP</p><h2>What exists, what is verified,<br><em>and what is only planned.</em></h2>
<p class="note">Every component carries a status. "Verified" means the repository's offline tests were re-run on 2026-11-01 in a clean environment and passed; it does not mean production readiness. Open a card for the evidence and the limits.</p>{legend()}{filter_bar(["VERIFIED","UNVERIFIED","PROTOTYPE","FAIL","PLANNED","CONCEPT"])}
<p><button type="button" class="button" data-toggle-all="open">Expand all</button> <button type="button" class="button" data-toggle-all="close">Collapse all</button></p>{layers}</section>
<section class="wrap content-section" id="business-lab"><p class="eyebrow">02 / BUSINESS LABORATORY</p><h2>Eleven business questions,<br><em>honestly mapped.</em></h2><p class="note">Each scenario is labelled by what actually exists: a business concept, a simulation on synthetic data, an implemented engineering component, or a planned capability. It is linked to the components that would support it.</p>{('<div class="concept-row">' + _fig + '</div>') if _fig else ''}<ul class="legend" aria-label="Scenario key"><li><span class="kd concept"></span> Business concept</li><li><span class="kd simulation"></span> Synthetic simulation</li><li><span class="kd component"></span> Implemented engineering component</li><li><span class="kd planned"></span> Planned capability</li></ul><div data-scenarios>{sc}</div></section>
<section class="wrap content-section" id="register"><p class="eyebrow">03 / CAPABILITY REGISTER</p><h2>The lab's own register,<br><em>unedited.</em></h2><p class="note">Source: the lab's capability register ({E(lab["source"])}); {len(lab["register"])} capabilities in the growth-workflow part of the lab: {", ".join(f"{v} {k.lower()}" for k, v in counts.items())}. Rules: {rules} This register covers the growth-workflow side of the lab, not brewery operations, and I did not re-run each entry's tests.</p>
<div class="table-wrap" tabindex="0" role="region" aria-label="Capability register table (scrollable)"><table class="reg"><caption class="note">Capability register ({len(lab["register"])} capabilities)</caption><thead><tr><th scope="col">#</th><th scope="col">Capability</th><th scope="col">Status</th><th scope="col">What exists</th><th scope="col">What is missing</th></tr></thead><tbody>{reg}</tbody></table></div></section>
<section class="wrap content-section"><p class="eyebrow">04 / NEXT</p><h2>Inspect the evidence,<br><em>or start a conversation.</em></h2><p><a class="button primary" href="verified-projects.html">All verified projects</a></p>{CTA}</section>'''
page("lab-explorer.html", "NASHA AI Lab ecosystem explorer · Ritesh Mamidi", "NASHA AI Lab: an interactive map of an AI engineering ecosystem and a proposed business concept, with every component labelled verified, unverified, prototype, planned or concept.", 2, body)
# ---- verified-projects
def proj(p):
    ov = f'<p class="note"><strong>Overlap:</strong> {E(p["overlap"])}</p>' if p["overlap"] else ""
    return (f'<article class="proj reveal" id="{E(p["name"])}" data-status="{p["status"]}"><h2>{(f'<a href="{E(p["repo"])}">{E(p["name"])}</a>' if p["repo"] else E(p["name"]))} {chip(p["status"])}</h2><div class="meta"><span>Commit <code>{E(p["commit"])}</code></span><span>{E(p["stack"])}</span></div>'
            f'<p>{E(p["problem"])}</p><p><strong>Evidence:</strong> {E(p["evidence"])}</p><p><strong>Demonstration:</strong> <code>{E(p["demo"])}</code></p><p><strong>Business relevance:</strong> {E(p["business"])}</p><p class="limits"><strong>Limits:</strong> {E(p["limits"])}</p>{ov}</article>')
nv = sum(p["status"] == "VERIFIED" for p in projects)
body = f'''<section class="page-intro wrap"><p class="eyebrow"><span class="signal"></span>VERIFIED PROJECTS / EVIDENCE INVENTORY</p><h1>{len(projects)} projects.<br><em>Evidence, not adjectives.</em></h1>
<p class="lead">Each entry shows the repository, the commit I tested, the result of re-running its tests in a clean environment on 2026-11-01, a demonstration command, and its limits.</p>
<div class="status-strip" role="note"><span><strong>Read this first:</strong> these are offline unit and integration tests on synthetic or bundled data. They show the code behaves as tested; they do not show production readiness, and none involved a live model or cloud service.</span></div></section>
<section class="wrap content-section"><p class="note">{nv} of {len(projects)} are verified implementations; the rest are labelled. <a href="projects.html">Original 24-project catalog</a>. Related repositories are noted so overlapping work is not counted as independent systems.</p>{legend()}{filter_bar(["VERIFIED","UNVERIFIED","PROTOTYPE"])}<div class="search"><label for="project-search">Search projects</label><input id="project-search" type="search" placeholder="e.g. RAG, Spark, evaluation"></div>
{"".join(proj(p) for p in projects)}</section><section class="wrap content-section">{CTA}</section>'''
page("verified-projects.html", "Verified projects · Ritesh Mamidi", f"Evidence inventory of {len(projects)} independent projects: repository, commit, test results re-run on 2026-11-01, demonstration, and limits.", 3, body)
# ---- patch nav on existing pages; remove the public employer name
for n in ("index.html", "ai-engineering.html", "nasha-lab.html", "projects.html", "recruiter.html", "404.html"):
    p = root / n; t = p.read_text()
    t = re.sub(r'<a href="nasha-lab\.html"( aria-current="page")?>NASHA AI</a>', lambda m: f'<a href="nasha-lab.html"{m.group(1) or ""}>NASHA AI Lab</a><a href="lab-explorer.html">Lab explorer</a><a href="verified-projects.html">Verified projects</a>', t)
    t = t.replace(EMPLOYER + " · Apple client engagement", "Apple client engagement")
    t = t.replace("<h3>Business / Data Analyst</h3>", "<h3>Business Analyst</h3>").replace("<h3>Data / Business Analyst</h3>", "<h3>Data Analyst</h3>").replace("<span>PySpark</span><span>Kafka</span>", "<span>PySpark</span>")  # master-résumé titles; Kafka is not a supported skill claim
    p.write_text(t)
apply_nav(root)
sm = root / "sitemap.xml"; s = sm.read_text()
for u in ("lab-explorer.html", "verified-projects.html", "case-studies.html", "data-lab.html", "demo/index.html") + tuple(sorted(x.name for x in root.glob("case-*.html") if x.name != "case-studies.html")):
    tag = f'<url><loc>https://riteshmamidi0905-lab.github.io/{u}</loc></url>'
    if tag not in s: s = s.replace('</urlset>', tag + '</urlset>')
sm.write_text(s)
# ---- manifest
man = [m for m in json.loads((root / "release-files.json").read_text()) if (root / m["path"]).exists()]; have = {m["path"] for m in man}
for new in tuple(sorted(__import__("glob").glob("case-*.html", root_dir=root))) + tuple(sorted(str(x.relative_to(root)) for x in (root/"assets/img/cases").glob("*.jpg"))) + ("data/cases.json", "lab-explorer.html", "verified-projects.html", "lab.css", "lab.js", "data/lab.json", "data/projects.json", "data/image-register.json", "data-lab.html", "datalab.js", "data/datalab/lab-data.json", "demo/index.html", "demo/demo.css", "demo/data.js", "demo/engine.js", "demo/app.js"):
    if new not in have: man.append(dict(path=new, bytes=0, sha256=""))
for m in man:
    b = (root / m["path"]).read_bytes(); m["bytes"] = len(b); m["sha256"] = hashlib.sha256(b).hexdigest()
(root / "release-files.json").write_text(json.dumps(man, indent=2) + "\n")
print("built; manifest entries:", len(man))
