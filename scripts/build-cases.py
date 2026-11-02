"""Generate case-studies.html and one page per case study from data/cases.json (stdlib only). Run after build-lab.py: python3 scripts/build-cases.py"""
import html, json, re
from pathlib import Path
root = Path(__file__).resolve().parents[1]; E = html.escape
cases = json.loads((root / "data/cases.json").read_text())
LABEL = dict(VERIFIED="Verified implementation", FAIL="Evaluation not passed")
chip = lambda s: f'<span class="chip {s}">{LABEL[s]}</span>'
ARROW = '<svg class="arrow-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 14 14 4M4 4h10v10"/></svg>'
src = (root / "recruiter.html").read_text(); head_tpl = src[:src.index("<title>")]
NAV = ('<nav id="navigation" aria-label="Main navigation"><a href="index.html">Overview</a><a href="ai-engineering.html">AI engineering</a><a href="nasha-lab.html">NASHA AI Lab</a>'
       '<a href="lab-explorer.html">Lab explorer</a><a href="case-studies.html"{a}>Case studies</a><a href="verified-projects.html">Verified projects</a><a href="projects.html">Projects</a><a href="recruiter.html">For recruiters</a></nav>')
def header(cur):
    h = src[src.index('<body>'):src.index('<main')]
    return re.sub(r'<nav id="navigation".*?</nav>', NAV.format(a=' aria-current="page"' if cur else ""), h, flags=re.S)
footer = src[src.index('</main>'):]
def page(name, title, desc, body, cur=True):
    h = head_tpl.replace('recruiter.html', name)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{E(desc)}">', h)
    h += f'<title>{E(title)}</title><link rel="icon" href="mark.svg" type="image/svg+xml"><link rel="stylesheet" href="cinematic.css"><link rel="stylesheet" href="lab.css"><script src="cinematic.js" defer></script><script src="lab.js" defer></script></head>'
    (root / name).write_text(h + header(cur) + f'<main id="main" tabindex="-1">{body}</main>' + footer[len('</main>'):])
def diagram(c):
    d = c["diagram"]; assert all(len(n[2]) <= 30 and len(n[1]) <= 34 for n in d["nodes"]), [n for n in d["nodes"] if len(n[2]) > 30 or len(n[1]) > 34]; W, H, X0, Y0, GX, GY = 172, 64, 14, 14, 34, 30
    nodes = {n[0]: n for n in d["nodes"]}; cols = max(n[3] for n in d["nodes"]) + 1; rows = max(n[4] for n in d["nodes"]) + 1
    vw = X0 * 2 + cols * W + (cols - 1) * GX; vh = Y0 * 2 + rows * H + (rows - 1) * GY
    pos = lambda n: (X0 + n[3] * (W + GX), Y0 + n[4] * (H + GY))
    out = [f'<svg class="dg" viewBox="0 0 {vw} {vh}" role="group" aria-labelledby="dg-t" aria-describedby="dg-d"><title id="dg-t">Architecture of {E(c["title"])}</title><desc id="dg-d">{E("; ".join(f"{nodes[a][1]} to {nodes[b][1]}" for a, b in d["edges"]))}</desc><defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" fill="currentColor"/></marker></defs>']
    for a, b in d["edges"]:
        na, nb = nodes[a], nodes[b]; (xa, ya), (xb, yb) = pos(na), pos(nb)
        if na[3] != nb[3]:
            x1, y1 = (xa + W, ya + H / 2) if nb[3] > na[3] else (xa, ya + H / 2); x2, y2 = (xb, yb + H / 2) if nb[3] > na[3] else (xb + W, yb + H / 2)
            mx = (x1 + x2) / 2; out.append(f'<path class="dg-e" d="M{x1:.0f} {y1:.0f} C{mx:.0f} {y1:.0f} {mx:.0f} {y2:.0f} {x2:.0f} {y2:.0f}" marker-end="url(#ah)" data-from="{a}" data-to="{b}"/>')
        else:
            x1, y1 = xa + W / 2, (ya + H if nb[4] > na[4] else ya); x2, y2 = xb + W / 2, (yb if nb[4] > na[4] else yb + H)
            out.append(f'<path class="dg-e" d="M{x1:.0f} {y1:.0f} L{x2:.0f} {y2:.0f}" marker-end="url(#ah)" data-from="{a}" data-to="{b}"/>')
    for nid, label, sub, col, row, kind in d["nodes"]:
        x, y = pos(nodes[nid]); sub_t = f'<text x="{x+W/2:.0f}" y="{y+H-14}" text-anchor="middle" class="dg-s">{E(sub)}</text>' if sub else ""
        out.append(f'<g class="dg-n {kind}" data-node="{nid}"><rect x="{x}" y="{y}" width="{W}" height="{H}" rx="8"/><text x="{x+W/2:.0f}" y="{y+(24 if sub else 36)}" text-anchor="middle" class="dg-l">{E(label)}</text>{sub_t}</g>')
    return "".join(out) + "</svg>"
def case_page(c):
    facts = f'<dl class="facts"><div><dt>Repository</dt><dd>{(f'<a href="{E(c["repo"])}">{E(c["repo"].split("github.com/")[1])}</a>' if c["repo"] else "Not published: the public repository shows an earlier state")}</dd></div><div><dt>Commit tested</dt><dd><code>{E(c["commit"])}</code></dd></div><div><dt>Stack</dt><dd>{E(c["stack"])}</dd></div></dl>'
    steps = "".join(f'<li><button type="button" class="step" data-nodes="{",".join(s[2])}" aria-pressed="false">{i+1}. {E(s[0])}</button></li>' for i, s in enumerate(c["steps"]))
    texts = "".join(f'<p class="step-text" data-step-text="{i}" hidden>{E(s[1])}</p>' for i, s in enumerate(c["steps"]))
    plain = "".join(f'<li><strong>{E(s[0])}.</strong> {E(s[1])}</li>' for s in c["steps"])
    ver = "".join(f'<tr><th scope="row">{E(a)}</th><td>{E(b)}</td></tr>' for a, b in c["verification"])
    shot = ""
    if c["shot"]:
        f, cap, prov = c["shot"]; shot = f'<figure class="shot"><img src="assets/img/cases/{E(f)}" loading="lazy" alt="{E(cap)}"><figcaption>{E(cap)} {E(prov)}</figcaption></figure>'
    dec = "".join(f'<li><strong>{E(a)}.</strong> {E(b)}</li>' for a, b in c["decisions"])
    r = c["run"]
    runit = (f'<p class="note">{E(r["note"])}</p>' if not r["commands"] else f'<p class="note">Copied from the project\'s own documentation ({E(r["where"])}). {E(r["note"])} Results are only those in the verification table above; running these on your machine may differ.</p><div class="runbox" tabindex="0" role="region" aria-label="Commands for {E(c["title"])} (scrollable)"><pre><code>{E(chr(10).join(r["commands"]))}</code></pre></div>')
    body = f'''<section class="page-intro wrap"><p class="eyebrow"><span class="signal"></span>CASE STUDY / <a href="case-studies.html">ALL SIX</a></p><h1>{E(c["title"])}</h1><p class="lead">{E(c["tagline"])}</p>
<div class="status-strip" role="note"><span>{chip(c["status"])}</span><span><strong>Independent project</strong>, not employer or client work.</span><span>{E(c["evidence_line"])}</span></div>{facts}</section>
<section class="wrap content-section"><p class="eyebrow">01 / THE PROBLEM</p><h2>Why it exists</h2><p class="prose">{E(c["problem"])}</p></section>
<section class="wrap content-section" data-steps-root><p class="eyebrow">02 / ARCHITECTURE</p><h2>How it fits together</h2><p class="note">Choose a step to highlight the parts involved. Drawn from the project's own documentation; the list below the diagram carries the same information as text.</p>
<div class="dg-wrap" tabindex="0" role="region" aria-label="Architecture diagram (scrollable on small screens)">{diagram(c)}</div><ul class="legend dg-legend" aria-label="Diagram key"><li><span class="swatch det"></span>deterministic code</li><li><span class="swatch model"></span>model / untrusted</li><li><span class="swatch store"></span>data store</li><li><span class="swatch human"></span>person</li></ul>
<ul class="steps" aria-label="Explanation steps">{steps}</ul><div aria-live="polite">{texts}</div><details class="plain"><summary>Text version of the architecture</summary><ol>{plain}</ol></details></section>
<section class="wrap content-section"><p class="eyebrow">03 / IMPLEMENTATION</p><h2>What was built</h2><ul class="prose-list">{"".join(f"<li>{E(i)}</li>" for i in c["implementation"])}</ul></section>
<section class="wrap content-section"><p class="eyebrow">04 / ENGINEERING DECISIONS</p><h2>Choices and trade-offs</h2><ul class="prose-list">{dec}</ul></section>
<section class="wrap content-section"><p class="eyebrow">05 / VERIFICATION</p><h2>What I actually ran</h2><p class="note">Run on 2026-11-01 in clean scratch environments. Offline tests on synthetic or bundled data show the code behaves as tested; they do not show production readiness.</p><div class="table-wrap" tabindex="0" role="region" aria-label="Verification commands and results (scrollable)"><table class="reg"><caption class="note">Commands and results</caption><tbody>{ver}</tbody></table></div>{shot}</section>
<section class="wrap content-section"><p class="eyebrow">06 / RUN IT</p><h2>Run it yourself</h2>{runit}</section>
<section class="wrap content-section"><p class="eyebrow">07 / LIMITATIONS</p><h2>What this does not show</h2><ul class="prose-list limits-list">{"".join(f"<li>{E(i).replace('**','')}</li>" for i in c["limits"])}</ul></section>
<section class="wrap content-section"><p class="eyebrow">08 / BUSINESS RELEVANCE</p><h2>Where it matters</h2><p class="prose">{E(c["business"])}</p><div class="actions">{(f'<a class="button primary" href="{E(c["repo"])}">View repository</a>' if c["repo"] else '')}<a class="button{'' if c["repo"] else ' primary'}" href="verified-projects.html">All 29 projects</a><a class="button" href="lab-explorer.html">NASHA AI Lab explorer</a><a class="button" href="ritesh_mamidi_resume.pdf">View résumé</a><a class="button" href="mailto:riteshmamidi0905@gmail.com">Contact me</a></div></section>'''
    page(f"case-{c['slug']}.html", f"{c['title']} · case study · Ritesh Mamidi", c["tagline"], body, cur=False)
for c in cases: case_page(c)
cards = "".join(f'<article class="evi"><h2><a href="case-{E(c["slug"])}.html">{E(c["title"])}</a></h2><p>{chip(c["status"])}</p><p>{E(c["tagline"])}</p><p class="note">{E(c["evidence_line"])}</p></article>' for c in cases)
page("case-studies.html", "Engineering case studies · Ritesh Mamidi", "Six engineering case studies with architecture, decisions, verification evidence and limits.", f'''<section class="page-intro wrap"><p class="eyebrow"><span class="signal"></span>ENGINEERING CASE STUDIES</p><h1>Six systems.<br><em>Evidence and limits.</em></h1><p class="lead">Each case study states the problem, the architecture, the engineering decisions, what I actually ran, and what the evidence does not show. They are independent projects, separate from my professional experience.</p></section><section class="wrap content-section"><div class="cards">{cards}</div><p class="note">Offline tests on synthetic or bundled data are not evidence of production readiness. NASHA is a business concept, not an operating brewery.</p></section>''')
# nav on other pages: add Case studies link after Lab explorer (idempotent)
for n in ("index.html", "ai-engineering.html", "nasha-lab.html", "projects.html", "recruiter.html", "404.html", "lab-explorer.html", "verified-projects.html"):
    p = root / n; t = p.read_text()
    if 'href="case-studies.html"' not in t:
        t = t.replace('<a href="lab-explorer.html"', '<a href="lab-explorer.html"', 1); t = re.sub(r'(<a href="lab-explorer\.html"[^>]*>Lab explorer</a>)', r'\1<a href="case-studies.html">Case studies</a>', t, count=1); p.write_text(t)
print("case pages:", len(cases) + 1)
