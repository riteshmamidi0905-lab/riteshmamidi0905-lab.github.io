#!/usr/bin/env python3
"""Compile observed reference facts; unavailable visual evidence stays unavailable."""
import collections, csv, hashlib, json
from pathlib import Path
HERE=Path(__file__).resolve().parent
WORK=HERE.parents[1]/'work/design-research'
RECOMMENDATIONS={
 'cinematic_portfolio':('Spatial storytelling and editorial entry','Optional exploration plus immediate recruiter exit; do not copy a studio scene.','Loading/consent overlays can obscure the first viewport; retain a semantic entry and motion controls.'),
 'webgl_experience':('3D discovery and inspectable controls','Use the existing Three.js pipeline after faithful assets exist; do not change engine to disguise missing art.','Canvas content needs equivalent semantic controls/state, keyboard access and a non-3D path.'),
 'premium_technology':('Product hierarchy and direct actions','Use a focused architectural hero with clear project/resume/evidence actions; original composition only.','Keep headings/actions usable before media; no scroll-dependent access to professional information.'),
 'architecture':('Architectural context and image-led project navigation','Use one coherent plan, material/detail shots and useful captions, not disconnected generated rooms.','Provide descriptive alternatives, readable overlays and mobile crops; a photograph does not prove a working 3D environment.'),
 'interactive_storytelling':('Narrative and data exploration','Tie each visitor-controlled beat to actual synthetic or recorded state and permit direct timeline selection.','Expose non-animated summaries and avoid forced progress, time limits or camera movement.'),
 'ai_product':('Capability discovery and demonstration boundaries','Connect project demonstrations to actual code and tests; clearly label recorded versus live.','Avoid presenting a marketing example as an independently evaluated model or an accessible production service.'),
 'enterprise_analytics':('Data/navigation hierarchy','Use drill-through synthetic records with source/denominator/time-window labels; no invented performance dashboard values.','Use tables and text status alongside color/graphs; source markup is not an accessibility audit.'),
 'character_interface':('Character identity and controllable presentation','Preserve approved character proportions; validate VECTRA before a common animation adapter.','Decorative character motion must pause and reduce; never gate evidence or imply autonomous decisions.'),
 'digital_twin':('Spatial/system context','Connect explicit operational records and environment state using stable scenario keys; no cross-dataset joins by name.','Keep inspection available in 2D; recorded demonstrations and vendor claims are not NASHA implementations.'),
 'accessible_motion':('Documented motion/access patterns','Use reduced-motion, pause/stop, keyboard and meaningful semantic alternatives as requirements.','Documentation references inform design; neither their source markup nor a screenshot proves NASHA conformance.'),
}
if __name__=='__main__':
    observations=json.loads((WORK/'render-observations.json').read_text())
    if len(observations)!=100 or len({r['final_url'] for r in observations})!=100:raise ValueError('Need 100 distinct inspected sources')
    records=[]
    for r in observations:
        technique,relevance,access=RECOMMENDATIONS[r['category']]
        p=WORK/r.get('screenshot','not-a-screenshot')
        capture=p.is_file() and not r.get('runtime_error')
        counts=r['source_elements']
        record={k:r[k] for k in ['id','category','url','final_url','title','checked_at_utc','status','source_sha256','source_bytes','headings','source_elements','inline_reduced_motion_reference','stylesheet_count']}
        record.update(observed_technique=technique,source_observation=f"HTML source contains {counts['nav']} nav, {counts['h1']} h1, {counts['img']} img, {counts['video']} video and {counts['canvas']} canvas elements. Dynamic DOM may differ.",technical_feasibility=relevance,accessibility_implications=access,relevance_to_nasha=relevance,runtime_observation=r.get('runtime'),runtime_status=r.get('runtime_status'),runtime_review=r.get('runtime_review','Unavailable'),runtime_error=r.get('runtime_error'),capture_available=capture,capture_sha256=hashlib.sha256(p.read_bytes()).hexdigest() if capture else None,limitation='Source facts and bounded initial viewport only; no global ranking, full interaction, motion, performance, license or accessibility certification.')
        records.append(record)
    report={'scope':'100-source evidence benchmark, not a global ranking or 100 full visual/interaction audits','method':'Verified HTTPS source inspection; bounded headless Chromium initial-view attempts through TLS-verifying transport. No login/access challenges bypassed, no TLS verification disabled. Screenshots remain local and are not published or reused as assets.','reference_count':len(records),'categories':dict(collections.Counter(r['category'] for r in records)),'actual_initial_viewport_captures':sum(r['capture_available'] for r in records),'not_visually_concluded':sum(not r['capture_available'] for r in records),'references':records}
    (HERE/'references.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    with (HERE/'references.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,lineterminator='\n',fieldnames=['id','category','url','title','source_observation','technical_feasibility','accessibility_implications','capture_available']);writer.writeheader();writer.writerows({k:r[k] for k in writer.fieldnames} for r in records)
    print(json.dumps({k:v for k,v in report.items() if k!='references'}))
