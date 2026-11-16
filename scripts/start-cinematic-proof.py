#!/usr/bin/env python3
"""Verify and serve an exact isolated NASHA visual proof. Never deploys or hosts publicly."""
import argparse,functools,hashlib,http.server,importlib.util,json,re,subprocess,sys,tempfile,threading,urllib.request,zipfile
from pathlib import Path
REPO='riteshmamidi0905-lab/riteshmamidi0905-lab.github.io'
HELPER_SHA256='bcb40000bf0433e4135d7efd08db2a2e2f674ab04269241ae5969749ba01d028'
def download(url,target):
    if sys.platform=='darwin':
        subprocess.run(['/usr/bin/curl','-q','--fail','--location','--proto','=https','--proto-redir','=https','--tlsv1.2','--silent','--show-error','--connect-timeout','15','--max-time','90','--output',str(target),url],check=True)
        return target.read_bytes()
    with urllib.request.urlopen(url,timeout=60) as response:return response.read()
def load_helper(work,commit):
    target=work/'verified-preview-helper.py';data=download('https://raw.githubusercontent.com/'+REPO+'/'+commit+'/scripts/start-safari-preview.py',target)
    if hashlib.sha256(data).hexdigest()!=HELPER_SHA256:raise ValueError('Shared preview helper checksum differs')
    target.write_bytes(data);spec=importlib.util.spec_from_file_location('verified_nasha_preview',target);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
def verify(folder,expected):
    manifest=json.loads((folder/'proof-manifest.json').read_text());actual=[]
    for p in sorted(folder.rglob('*')):
        if p.is_symlink():raise ValueError('Symlink in review artifact')
        if p.is_file() and p!=folder/'proof-manifest.json':actual.append({'path':str(p.relative_to(folder)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    digest=hashlib.sha256(''.join(e['path']+'\t'+e['sha256']+'\n' for e in actual).encode()).hexdigest()
    if actual!=manifest['files'] or digest!=expected or digest!=manifest['tree_sha256']:raise ValueError('Independent proof inventory or tree checksum differs')
    return actual
class Handler(http.server.SimpleHTTPRequestHandler):
    def list_directory(self,path):self.send_error(404);return None
def serve(folder,port,lan=None):
    servers=[];started=[]
    try:
        for host in ['127.0.0.1']+([lan] if lan else []):servers.append(http.server.ThreadingHTTPServer((host,port),functools.partial(Handler,directory=str(folder))))
        for s in servers:threading.Thread(target=s.serve_forever,daemon=True).start();started.append(s)
        print('Mac Safari visual proof: http://127.0.0.1:%s/'%port,flush=True)
        if lan:print('iPhone Safari visual proof: http://%s:%s/'%(lan,port),flush=True)
        print('Keep Terminal open. Control-C stops the private proof. This is not a production release.',flush=True);threading.Event().wait()
    except KeyboardInterrupt:pass
    finally:
        for s in servers:
            if s in started:s.shutdown()
            s.server_close()
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--commit',required=True);p.add_argument('--archive-sha256',required=True);p.add_argument('--proof-tree-sha256',required=True);p.add_argument('--pr-number',required=True,type=int);p.add_argument('--archive',type=Path);p.add_argument('--port',type=int,default=8874);p.add_argument('--lan',action='store_true');p.add_argument('--lan-ip');p.add_argument('--verify-only',action='store_true');p.add_argument('--output',type=Path);a=p.parse_args()
    try:
        if not re.fullmatch('[a-f0-9]{40}',a.commit) or not all(re.fullmatch('[a-f0-9]{64}',x) for x in [a.archive_sha256,a.proof_tree_sha256]) or not 1024<=a.port<=65535 or a.pr_number<1:raise ValueError('Exact candidate, checksum pins, PR and valid port required')
        work=a.output or Path(tempfile.mkdtemp(prefix='nasha-visual-proof-'))
        if a.output and work.exists() and any(work.iterdir()):raise ValueError('Output must be empty; existing work is never overwritten')
        work.mkdir(parents=True,exist_ok=True);helper=load_helper(work,a.commit);helper.COMMIT=a.commit;helper.ROOT_NAME='riteshmamidi0905-lab.github.io-'+a.commit
        lan=helper.private_ipv4(a.lan_ip) if a.lan_ip else helper.wifi_ip() if a.lan else None
        helper.require_pr_head(a.pr_number,work)
        data=a.archive.read_bytes() if a.archive else helper.download_https('https://codeload.github.com/'+REPO+'/zip/'+a.commit,work/'source.zip')
        if hashlib.sha256(data).hexdigest()!=a.archive_sha256:raise ValueError('Source archive checksum differs; no extraction performed')
        archive=work/'source.zip';archive.write_bytes(data);source=helper.unpack(archive,work);public=work/'proof'
        subprocess.run([sys.executable,str(source/'scripts/build-cinematic-proof.py'),'--out',str(public)],check=True,cwd=source)
        files=verify(public,a.proof_tree_sha256);helper.require_pr_head(a.pr_number,work)
        receipt={'scope':'VISUAL PROOF ONLY — NOT A PRODUCTION RELEASE','commit':a.commit,'pr':a.pr_number,'archive_sha256':a.archive_sha256,'proof_tree_sha256':a.proof_tree_sha256,'files':len(files),'localhost_only':not bool(lan),'url':'http://127.0.0.1:%s/'%a.port,'verification':'PASSED'}
        (work/'proof-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2),flush=True)
        if not a.verify_only:serve(public,a.port,lan)
    except (ValueError,KeyError,OSError,subprocess.CalledProcessError,zipfile.BadZipFile) as e:print('Proof not started: '+str(e)+'. TLS verification remains enabled.',file=sys.stderr);return 1
    return 0
if __name__=='__main__':sys.exit(main())
