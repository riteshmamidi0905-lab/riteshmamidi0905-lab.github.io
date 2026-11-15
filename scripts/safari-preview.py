#!/usr/bin/env python3
"""Build and serve only the reviewed artifact for manual Mac/iPhone Safari checks."""
import argparse,functools,http.server,json,socket,subprocess,sys,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
import pages_policy as P
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--lan',action='store_true',help='Allow devices on your trusted local network to open the public-only preview');p.add_argument('--port',type=int,default=8864);args=p.parse_args()
if not 1024<=args.port<=65535:raise SystemExit('Use a port from 1024 to 65535')
if subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip():raise SystemExit('Use a clean candidate checkout so the preview matches its commit. Save your local work or clone the release branch into a new directory.')
(root/'work').mkdir(exist_ok=True);parent=Path(tempfile.mkdtemp(prefix='safari-',dir=root/'work'));dest=parent/'public'
subprocess.run([sys.executable,str(root/'scripts/build-pages-artifact.py'),'--out',str(dest)],check=True,cwd=root)
subprocess.run([sys.executable,str(root/'scripts/verify-pages-artifact.py'),str(dest)],check=True,cwd=root)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
manifest=json.loads((root/'scripts/publish-manifest.json').read_text());receipt={'candidate_commit':commit,'artifact_tree_digest':P.tree_digest({e['path']:(e['bytes'],e['sha256']) for e in manifest['files']}),'preview_directory':str(dest),'scope':'Public-only local preview, not a production deployment'}
(parent/'preview-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2),flush=True)
print('Mac Safari: http://127.0.0.1:'+str(args.port)+'/nasha-universe/living-hq/index.html',flush=True)
if args.lan:
 print('iPhone: same trusted Wi-Fi, http://<your-Mac-LAN-IP>:'+str(args.port)+'/nasha-universe/living-hq/index.html',flush=True)
 print('Mac LAN IP: System Settings > Wi-Fi > Details > TCP/IP. No private source or directories are served.',flush=True)
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(dest))
try:
 with http.server.ThreadingHTTPServer(('0.0.0.0' if args.lan else '127.0.0.1',args.port),handler) as server:
  print('Stop with Control-C. The preview is not exposed through a public tunnel.',flush=True);server.serve_forever()
except KeyboardInterrupt:pass
