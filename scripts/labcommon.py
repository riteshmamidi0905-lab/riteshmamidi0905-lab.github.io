"""Shared helpers for the generated pages. Concept images appear only when cleared for public release; nothing is emitted otherwise."""
import html, json, os, shutil
from pathlib import Path
def concept_figures(root, E):
    """Concept images are NOT part of the public build: nothing is shown and no placeholder is emitted. A local-only preview exists for the maintainer:
    the private rules file named by PORTFOLIO_PRIVATE_RULES (kept outside this repository, see scripts/disclosure.py) may define "preview_spec", the path
    of a private figure list. Without it this returns an empty string. Never commit preview output."""
    cfg = os.environ.get("PORTFOLIO_PRIVATE_RULES")
    if not cfg: return ""
    spec_path = json.loads(Path(cfg).read_text()).get("preview_spec")
    if not spec_path: return ""
    spec = json.loads(Path(spec_path).read_text())
    out = []
    for fg in spec["figures"]:
        f = fg["file"]; src = root.parent / "pending-assets" / Path(f).name
        if not (root / f).exists() and src.exists(): (root / f).parent.mkdir(parents=True, exist_ok=True); shutil.copy(src, root / f)
        out.append(f'<figure><img src="{f}" width="1536" height="1024" loading="lazy" alt="{E(fg["alt"])}"><figcaption>{E(fg["caption"])}</figcaption></figure>')
    return "".join(out)



NAV_ITEMS = [("Overview", "index.html", ("index.html",)), ("NASHA AI Lab", "lab-explorer.html", ("lab-explorer.html", "nasha-lab.html")), ("Enterprise Demo", "demo/index.html", ()), ("Data Lab", "data-lab.html", ("data-lab.html",)), ("Case studies", "case-studies.html", ("case-studies.html",)), ("Projects", "verified-projects.html", ("verified-projects.html", "projects.html")), ("AI engineering", "ai-engineering.html", ("ai-engineering.html",)), ("For recruiters", "recruiter.html", ("recruiter.html",))]
def nav_html(page):
    cur = lambda names: ' aria-current="page"' if page in names or (page.startswith("case-") and page != "case-studies.html" and "case-studies.html" in names) else ""
    return '<nav id="navigation" aria-label="Main navigation">' + "".join(f'<a href="{h}"{cur(n)}>{l}</a>' for l, h, n in NAV_ITEMS) + "</nav>"
def apply_nav(root):
    apply_font_preload(root)
    import re
    for f in sorted(Path(root).glob("*.html")):
        t = f.read_text()
        n = re.sub(r'<nav id="navigation".*?</nav>', lambda m: nav_html(f.name), t, count=1, flags=re.S)
        if n != t: f.write_text(n)

FONT_PRELOADS = ('<link rel="preload" href="assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>'
                 '<link rel="preload" href="assets/fonts/jetbrains-mono-latin.woff2" as="font" type="font/woff2" crossorigin>')
def apply_font_preload(root):
    """Preload both webfonts on every top-level page. Measured: without it the homepage showed an intermittent font-swap layout shift (CLS 0.111 in 4 of 10 runs) once first paint was no longer hidden; with it CLS was 0 in 12 of 12 runs."""
    import re
    for f in sorted(Path(root).glob("*.html")):
        t = f.read_text()
        t2 = re.sub(r'<link rel="preload" href="assets/fonts/[^>]*>', "", t)
        if "<title>" in t2: t2 = t2.replace("<title>", FONT_PRELOADS + "<title>", 1)
        if t2 != t: f.write_text(t2)
