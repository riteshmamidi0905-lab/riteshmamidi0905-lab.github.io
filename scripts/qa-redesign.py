#!/usr/bin/env python3
"""Browser QA for the redesign candidate: layout overflow, console errors, accessibility (axe-core), keyboard operation, reduced motion, and slow-network paint metrics.
Usage: python3 -m http.server 8011 &   python3 scripts/qa-redesign.py [--out docs/redesign/qa-results.json]
Requires: playwright (python) + a Chromium executable (CHROMIUM_PATH), axe-core file (AXE_PATH)."""
import json, os, sys, glob
from playwright.sync_api import sync_playwright

BASE = os.environ.get("QA_BASE", "http://127.0.0.1:8011/")
PAGES = ["index.html", "nasha.html", "recruiter.html", "reliability.html", "security.html", "growthos.html", "launch.html", "projects.html"]
VPS = {"desktop": (1440, 900), "laptop": (1280, 720), "tablet": (820, 1180), "mobile": (390, 844), "narrow": (320, 640)}
CH = os.environ.get("CHROMIUM_PATH") or (glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome") or [None])[0]
AXE = os.environ.get("AXE_PATH") or (glob.glob("/usr/local/lib/python3*/dist-packages/axe_playwright_python/axe.min.js") or [None])[0]
out = {"base": BASE, "checks": [], "axe": [], "metrics": {}}


def add(name, ok, detail=""):
    out["checks"].append({"check": name, "pass": bool(ok), "detail": detail})


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CH, args=["--no-sandbox"])
    for vp, (w, h) in VPS.items():
        ctx = b.new_context(viewport={"width": w, "height": h}, has_touch=vp in ("mobile", "tablet", "narrow"), is_mobile=vp in ("mobile", "narrow"))
        pg = ctx.new_page()
        errs, fails = [], []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("response", lambda r: fails.append(f"{r.status} {r.url}") if r.status >= 400 else None)
        for name in PAGES:
            pg.goto(BASE + name, wait_until="networkidle")
            pg.wait_for_timeout(500)
            sw = pg.evaluate("document.documentElement.scrollWidth"); iw = pg.evaluate("innerWidth")
            add(f"{name} {vp}: no horizontal overflow", sw <= iw, f"scrollWidth {sw} vs {iw}")
            # clipped text: any element whose content is wider than its box and hides overflow, excluding intentional scroll areas
            clipped = pg.evaluate("""()=>[...document.querySelectorAll('h1,h2,h3,p,li,a,button,span')].filter(e=>{const s=getComputedStyle(e);return (s.overflow==='hidden'||s.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+1&&!e.closest('svg')&&!e.classList.contains('sr')&&!e.classList.contains('skip')}).slice(0,5).map(e=>e.tagName+':'+(e.textContent||'').slice(0,30))""")
            add(f"{name} {vp}: no clipped text", not clipped, str(clipped))
            beyond = pg.evaluate("""()=>{const out=[];for(const e of document.querySelectorAll('body *')){if(e.closest('svg')||e.closest('[tabindex="0"]')||e.classList.contains('sr')||e.classList.contains('skip'))continue;const r=e.getBoundingClientRect();if(r.width&&r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed')out.push(e.tagName+'.'+e.className+':'+Math.round(r.right))}return out.slice(0,6)}""")
            add(f"{name} {vp}: no element extends past the viewport edge (overflow-x is hidden, so scrollWidth alone cannot catch this)", not beyond, str(beyond))
            small = pg.evaluate("""()=>[...document.querySelectorAll('a,button,[role=tab]')].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&(r.height<36||r.width<36)&&!e.classList.contains('skip')&&!e.closest('.proofs,p,li')}).slice(0,6).map(e=>(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,24)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))""")
            add(f"{name} {vp}: touch targets >= 36px (standalone controls)", not small, str(small))
            if vp in ("desktop", "mobile") and AXE:
                pg.add_script_tag(path=AXE)
                res = pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','best-practice']}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,help:v.help,targets:v.nodes.slice(0,3).map(n=>n.target.join(' '))})))")
                out["axe"].append({"page": name, "viewport": vp, "violations": res})
                bad = [v for v in res if v["impact"] in ("serious", "critical")]
                add(f"{name} {vp}: axe serious/critical violations == 0", not bad, json.dumps(bad)[:400])
        add(f"{vp}: no console errors", not errs, str(errs[:3]))
        add(f"{vp}: no failed requests", not fails, str(fails[:3]))
        ctx.close()
    # keyboard: tab to the replay controls, arrow keys move between tabs, Enter/Space operate buttons
    ctx = b.new_context(viewport={"width": 1280, "height": 800}); pg = ctx.new_page()
    pg.goto(BASE + "nasha.html", wait_until="networkidle")
    pg.focus("#tab-0"); pg.keyboard.press("ArrowRight"); sel = pg.evaluate("document.querySelector('[role=tab][aria-selected=true]').id")
    add("keyboard: ArrowRight selects the next scenario tab", sel == "tab-1", sel)
    pg.keyboard.press("End"); sel = pg.evaluate("document.querySelector('[role=tab][aria-selected=true]').id")
    add("keyboard: End selects the last tab", sel == "tab-7", sel)
    pg.focus("#step"); pg.keyboard.press("Enter"); on = pg.evaluate("document.querySelectorAll('.step.on').length")
    add("keyboard: Step button advances the replay", on == 1, str(on))
    first = pg.evaluate("(()=>{const e=document.querySelector('.skip');return e?e.getAttribute('href'):null})()")
    add("skip link present and targets #main", first == "#main", str(first))
    # pipeline film: keyboard and buttons move the stage; stage content is present
    pg.focus("#film [data-act=next]"); pg.keyboard.press("Enter"); st = pg.evaluate("document.querySelector('#film .rn.on').dataset.i")
    add("film: Next button advances to stage 2", st == "1", st)
    pg.focus("#film .rn >> nth=4") if False else pg.evaluate("document.querySelectorAll('#film .rn')[4].focus()"); pg.keyboard.press("Enter"); st = pg.evaluate("document.querySelector('#film .rn.on').dataset.i")
    add("film: rail node is a keyboard-operable button to stage 5", st == "4", st)
    add("film: exactly one stage visible while pinned", pg.evaluate("document.querySelectorAll('#film .fp:not([hidden])').length") == 1)
    # dashboards: provenance toggle and incident selector work from the keyboard
    pg.goto(BASE + "reliability.html", wait_until="networkidle")
    pg.focus("#srcbtn"); pg.keyboard.press("Enter"); on = pg.evaluate("document.body.classList.contains('show-src')")
    add("reliability: Show sources toggles provenance with the keyboard", on)
    add("reliability: every rendered metric has a source pointer", pg.evaluate("[...document.querySelectorAll('.mv')].every(e=>e.dataset.src&&e.dataset.src.includes('#'))"), "")
    add("reliability: audit-incident panel renders three recorded figures", pg.evaluate("document.querySelectorAll('#inc-kpis .kpi').length") == 3)
    add("reliability: audit-incident timelines are real tables with captions and column headers", pg.evaluate("[...document.querySelectorAll('#incident table.tl')].length==2&&[...document.querySelectorAll('#incident table.tl')].every(t=>t.caption&&t.querySelectorAll('thead th[scope=col]').length==3)"))
    pg.focus("#incident summary"); pg.keyboard.press("Enter"); add("reliability: engineering detail opens from the keyboard", pg.evaluate("document.querySelector('#incident details').open"))
    add("reliability: incident detail names the PostgreSQL error and the fix", pg.evaluate("(t=>t.includes('audit_log_pkey')&&t.includes('with self.con.transaction()'))(document.querySelector('#incident').innerText)"))
    pg.goto(BASE + "security.html", wait_until="networkidle")
    n0 = pg.evaluate("document.querySelectorAll('#inc-out .qa div').length")
    pg.select_option("#inc-pick", index=1); n1 = pg.evaluate("document.querySelectorAll('#inc-out .qa div').length")
    add("security: incident explorer renders answers and switches scenario", n0 >= 6 and n1 >= 6, f"{n0},{n1}")
    pg.goto(BASE + "nasha.html", wait_until="networkidle")
    # architecture explorer keyboard
    pg.focus(".gnode"); pg.keyboard.press("Enter"); pressed = pg.evaluate("document.querySelectorAll('.gnode[aria-pressed=true]').length")
    add("keyboard: architecture node can be selected with Enter", pressed == 1, str(pressed))
    # Growth OS: replay steps and refusal cases operate from the keyboard, content comes from recorded evidence, screenshots load
    pg.goto(BASE + "growthos.html", wait_until="networkidle")
    pg.focus("#steps li:nth-child(5) button"); pg.keyboard.press("Enter"); panel = pg.evaluate("document.querySelector('#step-panel h3').textContent")
    add("growthos: replay step 5 selected by keyboard shows the CRM update", panel == "CRM update", panel)
    add("growthos: CRM-update step shows the recorded lead status and one audit row", pg.evaluate("(()=>{const s=[...document.querySelectorAll('#step-panel .wstate strong')].map(e=>e.textContent);return s[0]==='qualified'&&s[1]==='1'&&s[2]==='0'})()"))
    pg.focus("#refusal-btns .fbtn >> nth=1"); pg.keyboard.press("Enter"); r = pg.evaluate("document.querySelector('#refusal-out h3').textContent")
    add("growthos: refusal case selected by keyboard shows its recorded result", "Replay" in r and "APPROVAL_REPLAY" in pg.evaluate("document.querySelector('#refusal-out').textContent"), r)
    # entrepreneur platform case study: steps by keyboard; the financial sliders select recorded model outputs
    pg.goto(BASE + "launch.html", wait_until="networkidle")
    pg.focus("#lsteps li:nth-child(4) button"); pg.keyboard.press("Enter")
    p0 = pg.evaluate("document.querySelector('#fres strong').textContent")
    pg.evaluate("(()=>{const s=document.getElementById('s-c');s.value=3;s.dispatchEvent(new Event('input'))})()")
    p1 = pg.evaluate("document.querySelector('#fres strong').textContent")
    add("launch: moving a slider shows a different recorded operating profit", p0 != p1 and "$" in p1, f"{p0} -> {p1}")
    pg.focus("#lsteps li:nth-child(3) button"); pg.keyboard.press("Enter")
    t3 = pg.evaluate("document.querySelector('#lpanel').textContent")
    add("launch: suppliers step labels real leads as not verified and states external verification is incomplete", "Lead, not verified" in t3 and "INCOMPLETE" in t3 and "none published" in t3)
    bad2 = []
    for i in range(pg.evaluate("document.querySelectorAll('#lshot-btns .fbtn').length")):
        pg.evaluate(f"document.querySelectorAll('#lshot-btns .fbtn')[{i}].click()"); pg.wait_for_function("document.getElementById('lshot-img').complete"); pg.wait_for_timeout(100)
        if not pg.evaluate("document.getElementById('lshot-img').naturalWidth > 0"):
            bad2.append(i)
    add("launch: every interface screenshot loads", not bad2, str(bad2))
    add("launch: all eight launch mutants are rendered", pg.evaluate("document.querySelectorAll('#lmut li').length") == 8)
    # Milestone 4: the recorded twelve-step journey, the model-status panel, the evaluations and the architecture flows
    add("launch m4: the recorded journey has twelve keyboard-operable steps, all marked recorded and checked", pg.evaluate("document.querySelectorAll('#jsteps button').length") == 12 and pg.evaluate("document.querySelector('#jpanel').textContent.includes('Recorded and checked')"))
    pg.focus("#jsteps li:nth-child(6) button"); pg.keyboard.press("Enter")
    t6 = pg.evaluate("document.querySelector('#jpanel').textContent")
    add("launch m4: the start-up step shows the requirement, the funding gap and its labelled-simulated formulas", "Requirement before" in t6 and "Funding gap" in t6 and "simulated" in t6 and pg.evaluate("document.querySelectorAll('#jpanel details li').length") >= 8)
    pg.focus("#jsteps li:nth-child(7) button"); pg.keyboard.press("Enter")
    t7 = pg.evaluate("document.querySelector('#jpanel').textContent")
    add("launch m4: the recommendation step says no language model was used and lists computed uncertainty", "No language model was used" in t7 and "What remains uncertain" in t7 and "synthetic" in t7.lower())
    pg.focus("#jsteps li:nth-child(3) button"); pg.keyboard.press("Enter")
    t3b = pg.evaluate("document.querySelector('#jpanel').textContent")
    add("launch m4: the supplier step shows information categories and that sources are search-result snippets", "Unverified public-search lead" in t3b and "snippet" in t3b.lower() and "Synthetic fixture" in t3b)
    add("launch m4: the model-status table states that no language model has run", "No." in pg.evaluate("document.querySelector('#mfacts').textContent") and "not claimed" in pg.evaluate("document.querySelector('#mfacts').textContent").lower())
    n_all = pg.evaluate("document.querySelectorAll('#bcases tbody tr').length")
    pg.focus("#bfilt [data-f=rejected]"); pg.keyboard.press("Enter")
    rej = pg.evaluate("[...document.querySelectorAll('#bcases tbody tr')].map(r=>r.children[1].textContent)")
    add("launch m4: the verdict filter works by keyboard and shows only rejected outputs", 0 < len(rej) < n_all and all(v == "rejected" for v in rej), f"{len(rej)} of {n_all}")
    add("launch m4: three evaluation cards each list their mutants", pg.evaluate("document.querySelectorAll('#evals .evc').length") == 3 and pg.evaluate("[...document.querySelectorAll('#evals .evc details')].every(d=>d.querySelectorAll('li').length>=9)"))
    add("launch m4: both architecture flows render with their steps", pg.evaluate("[...document.querySelectorAll('ol.flow')].map(o=>o.children.length).join(',')") == "4,6")
    add("launch m4: phone captures load with descriptive alt text", pg.evaluate("[...document.querySelectorAll('#phones img')].length") == 3 and pg.evaluate("[...document.querySelectorAll('#phones img')].every(i=>i.alt.length>30)"))
    pg.evaluate("document.querySelectorAll('#phones img').forEach(i=>{i.loading='eager'})"); pg.wait_for_timeout(600)
    add("launch m4: the phone captures decode", pg.evaluate("[...document.querySelectorAll('#phones img')].every(i=>i.complete&&i.naturalWidth>0)"))
    add("launch m4: the page keeps its positioning (no cultural-fusion wording; NASHA shown as the flagship hospitality launch case study)", "fusion" not in pg.evaluate("document.body.innerText").lower() and "Flagship Hospitality Launch Case Study" in pg.evaluate("document.body.innerText"))
    # Milestone 5: one architecture, two businesses
    add("launch m5: the studio journey has nine keyboard-operable steps, all recorded and checked", pg.evaluate("document.querySelectorAll('#bz-steps button').length") == 9 and pg.evaluate("document.querySelector('#bz-panel').textContent.includes('Recorded and checked')"))
    pg.focus("#bz-steps li:nth-child(4) button"); pg.keyboard.press("Enter")
    tb = pg.evaluate("document.querySelector('#bz-panel').textContent")
    add("launch m5: the studio recommendation step says no recipe is used and names where needs came from", "No recipe is used" in tb and "requirements" in tb.lower())
    sh = pg.evaluate("document.querySelector('#bz-shared').textContent")
    add("launch m5: shared architecture lists shared code paths, tables and the configuration-only differences", "Shared" in sh and "Differs" in sh and pg.evaluate("document.querySelectorAll('#bz-shared tbody tr').length") >= 10)
    sp = pg.evaluate("document.querySelector('#bz-suppliers').textContent")
    add("launch m5: supplier research shows zero verified from a primary page and every evidence tier", "verified from a primary page" in sp and "Official page opened and read" in sp and "Directory, press or encyclopedia" in sp and pg.evaluate("document.querySelector('#bz-suppliers .kpi .big-n').textContent") == "12")
    ev = pg.evaluate("document.querySelector('#bz-eval').textContent")
    add("launch m5: development and held-out evaluations are shown side by side, with the held-out misses listed", "Held-out set" in ev and "Development set" in ev and "Not detected as the same business" in ev)
    add("launch m5: the authorisation mutants are all caught", pg.evaluate("document.querySelectorAll('#bz-authz details li').length") == 6 and "SURVIVED" not in pg.evaluate("document.querySelector('#bz-authz').textContent"))
    md = pg.evaluate("document.querySelector('#bz-model').textContent")
    add("launch m5: model status states that no language model has run and names the decision needed", "No language model has run" in md and "huggingface.co" in md)
    pg.evaluate("document.querySelectorAll('#bz-shots img').forEach(i=>{i.loading='eager'})"); pg.wait_for_timeout(700)
    add("launch m5: captures decode and carry descriptive alt text", pg.evaluate("[...document.querySelectorAll('#bz-shots img')].length") == 3 and pg.evaluate("[...document.querySelectorAll('#bz-shots img')].every(i=>i.complete&&i.naturalWidth>0&&i.alt.length>30)"))
    pg.goto(BASE + "growthos.html", wait_until="networkidle")
    bad = []
    for i in range(pg.evaluate("document.querySelectorAll('#shot-btns .fbtn').length")):
        pg.evaluate(f"document.querySelectorAll('#shot-btns .fbtn')[{i}].click()"); pg.wait_for_function("document.getElementById('shot-img').complete"); pg.wait_for_timeout(120)
        if not pg.evaluate("document.getElementById('shot-img').naturalWidth > 0"):
            bad.append(i)
    add("growthos: every interface screenshot loads", not bad, str(bad))
    add("growthos: every capability, mutant and oracle row is rendered from the evidence file", pg.evaluate("document.querySelectorAll('#caps .cap').length===25&&document.querySelectorAll('#wmut li').length===8&&document.querySelectorAll('#mut li').length===11&&document.querySelectorAll('#oracle tbody tr').length===5"))
    ctx.close()
    # reduced motion
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce"); pg = ctx.new_page()
    pg.goto(BASE + "index.html", wait_until="networkidle"); pg.wait_for_timeout(600)
    vis = pg.evaluate("[...document.querySelectorAll('.reveal')].every(e=>getComputedStyle(e).opacity==='1')")
    anim = pg.evaluate("[...document.querySelectorAll('.flow')].every(e=>getComputedStyle(e).animationName==='none')")
    add("reduced motion: all content visible without scrolling triggers", vis)
    add("reduced motion: CSS animations disabled", anim)
    ctx.close()
    # slow network + CPU throttle: LCP / CLS / transfer size on mobile profile
    for name in PAGES:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True); pg = ctx.new_page()
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Network.enable"); cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 1.6 * 1024 * 1024 / 8, "uploadThroughput": 750 * 1024 / 8})
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        pg.add_init_script("""window.__m={lcp:0,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__m.cls+=e.value}).observe({type:'layout-shift',buffered:true});""")
        sizes = []
        pg.on("response", lambda r: sizes.append((r.url.split('/')[-1], int(r.headers.get('content-length', '0') or 0))))
        pg.goto(BASE + name, wait_until="load"); pg.wait_for_timeout(2500)
        m = pg.evaluate("window.__m"); nav = pg.evaluate("(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd}})()")
        js = sum(s for n, s in sizes if n.endswith('.js')); css = sum(s for n, s in sizes if n.endswith('.css')); total = sum(s for n, s in sizes)
        out["metrics"][name] = {"profile": "mobile 390x844, 150 ms RTT, 1.6 Mbps down, 4x CPU slowdown (emulated)", "lcp_ms": round(m["lcp"]), "cls": round(m["cls"], 4), "dom_content_loaded_ms": round(nav["dcl"]), "load_ms": round(nav["load"]),
                                "js_bytes": js, "css_bytes": css, "total_bytes": total}
        add(f"{name} slow network: LCP <= 2500 ms", m["lcp"] <= 2500, f'{round(m["lcp"])} ms')
        add(f"{name} slow network: CLS <= 0.1", m["cls"] <= 0.1, str(round(m["cls"], 4)))
        add(f"{name}: JavaScript <= 40 KB, CSS <= 45 KB (uncompressed, served by python http.server)", js <= 40960 and css <= 46080, f"js {js} css {css}")
        ctx.close()
    b.close()
passed = sum(c["pass"] for c in out["checks"])
out["summary"] = {"checks": len(out["checks"]), "passed": passed, "failed": [c for c in out["checks"] if not c["pass"]]}
path = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "docs/redesign/qa-results.json"
open(path, "w").write(json.dumps(out, indent=1))
print(f"{passed}/{len(out['checks'])} checks passed")
for c in out["summary"]["failed"]:
    print("FAIL", c["check"], "-", c["detail"][:200])
