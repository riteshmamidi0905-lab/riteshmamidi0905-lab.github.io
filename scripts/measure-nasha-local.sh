#!/usr/bin/env bash
# Reproducible lab measurements, not production/real-network claims.
set -euo pipefail
mkdir -p work/qa
tools_dir=work/perf-tools
if [ ! -f "$tools_dir/node_modules/lighthouse/cli/index.js" ]; then
  npm install --prefix "$tools_dir" --no-audit --no-fund --ignore-scripts lighthouse@13.5.0
fi
export CHROME_PATH="${CHROME_PATH:-/usr/bin/chromium}"
preview_url="${NASHA_LOCAL_URL:-http://127.0.0.1:8000/nasha-ai-preview.html}"
case "$preview_url" in http://127.0.0.1:*|http://localhost:*) ;; *) echo 'This runner is restricted to local HTTP.' >&2; exit 1;; esac
for mode in mobile desktop; do
  for run in 1 2 3; do
    extra=()
    if [ "$mode" = desktop ]; then extra+=(--preset=desktop); fi
    node "$tools_dir/node_modules/lighthouse/cli/index.js" "$preview_url" \
      --only-categories=performance,accessibility \
      --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage' \
      --output=json --output-path="work/qa/lighthouse-$mode-$run.json" --quiet "${extra[@]}"
    echo "Measured local $mode run $run"
  done
done
python3 - <<'PY'
import json,pathlib,statistics,platform,subprocess,hashlib
rows=[]
for mode in ['mobile','desktop']:
 for i in range(1,4):
  file=pathlib.Path(f'work/qa/lighthouse-{mode}-{i}.json');p=json.loads(file.read_text());a=p['audits']
  rows.append(dict(mode=mode,run=i,performance=round(p['categories']['performance']['score']*100),accessibility=round(p['categories']['accessibility']['score']*100),lcpMs=a['largest-contentful-paint']['numericValue'],cls=a['cumulative-layout-shift']['numericValue'],tbtMs=a['total-blocking-time']['numericValue'],transferBytes=a['total-byte-weight']['numericValue'],requestCount=len(a['network-requests']['details']['items']),warnings=p['runWarnings'],settings=p['configSettings'],lighthouseVersion=p['lighthouseVersion'],fetchTime=p['fetchTime'],userAgent=p['userAgent'],rawReport=str(file),rawSha256=hashlib.sha256(file.read_bytes()).hexdigest()))
medians={mode:{k:statistics.median(r[k] for r in rows if r['mode']==mode) for k in ['performance','accessibility','lcpMs','cls','tbtMs','transferBytes','requestCount']} for mode in ['mobile','desktop']}
report=dict(scope='LOCAL HTTP LAB ONLY. Python http.server, no gzip/cache/CDN. Default Lighthouse simulated throttling. Not a public preview, field data or real-network measurement.',sourceNote='sourceHead is the base HEAD at measurement time; pageSha256 identifies exact tested bytes, including the favicon fix. Final commit is verified separately in Actions.',sourceHead=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),pageSha256=hashlib.sha256(pathlib.Path('nasha-ai-preview.html').read_bytes()).hexdigest(),environment=dict(platform=platform.platform(),node=subprocess.check_output(['node','--version'],text=True).strip(),chromium=subprocess.check_output(['/usr/bin/chromium','--version'],text=True).strip()),medians=medians,runs=rows)
pathlib.Path('docs/nasha-ecosystem/evidence/lighthouse-local.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(medians,indent=2))
PY
