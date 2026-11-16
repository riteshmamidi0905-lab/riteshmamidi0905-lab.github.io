#!/usr/bin/env python3
"""Download, verify and serve the exact NASHA candidate on your own Mac. No Git required."""
import argparse
import hashlib
import http.server
import ipaddress
import json
from pathlib import Path, PurePosixPath
import re
import signal
import subprocess
import sys
import tempfile
import threading
import urllib.request
import zipfile

# The living-enterprise branch never silently serves an earlier candidate.
# The release handoff supplies all pins for the exact validated PR head.
COMMIT = ''
ARCHIVE_SHA256 = ''
TREE_SHA256 = ''
EXPECTED_FILES = 0
CANDIDATE_PR = None
PREVIEW_PORT = 8864
URL = ''
ROOT_NAME = 'unconfigured-preview'
REPOSITORY = 'riteshmamidi0905-lab/riteshmamidi0905-lab.github.io'


def private_ipv4(value):
    address = ipaddress.ip_address(value)
    networks = ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')
    if address.version != 4 or not any(address in ipaddress.ip_network(n) for n in networks):
        raise ValueError('iPhone preview requires your Mac Wi-Fi IPv4 address in a private network')
    return str(address)


def wifi_ip():
    text = subprocess.check_output(['networksetup', '-listallhardwareports'], text=True)
    match = re.search(r'Hardware Port: (?:Wi-Fi|AirPort)\s+Device: (\S+)', text)
    if not match:
        raise ValueError('Wi-Fi device not found; use --lan-ip with its private IPv4 address')
    return private_ipv4(subprocess.check_output(['ipconfig', 'getifaddr', match.group(1)], text=True).strip())


def unpack(archive, destination):
    with zipfile.ZipFile(archive) as z:
        for item in z.infolist():
            p = PurePosixPath(item.filename)
            mode = item.external_attr >> 16
            if p.is_absolute() or '..' in p.parts or not p.parts or p.parts[0] != ROOT_NAME or mode & 0o170000 == 0o120000:
                raise ValueError('Unexpected or unsafe archive member: ' + item.filename)
        if z.testzip() is not None:
            raise ValueError('Archive CRC verification failed')
        z.extractall(destination)
    return destination / ROOT_NAME


def download_https(url, target):
    """Use macOS system curl's trust configuration; never disable TLS verification."""
    if sys.platform == 'darwin':
        # -q must be first: ignore user curlrc options, including accidental insecure flags.
        subprocess.run([
            '/usr/bin/curl', '-q', '--fail', '--location',
            '--proto', '=https', '--proto-redir', '=https', '--tlsv1.2',
            '--connect-timeout', '15', '--max-time', '90',
            '--silent', '--show-error', '--output', str(target), url,
        ], check=True)
        return Path(target).read_bytes()
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def download_archive(target):
    return download_https(URL, target)


def require_pr_head(pr_number, work):
    data = json.loads(download_https('https://api.github.com/repos/' + REPOSITORY + '/pulls/' + str(pr_number), Path(work) / 'pr-head.json'))
    if data['number'] != pr_number or data['head']['sha'] != COMMIT or data['head']['repo']['full_name'] != REPOSITORY:
        raise ValueError('Current PR head differs from the pinned candidate; server not started')


def prepare(work, archive=None, localhost_only=True):
    work = Path(work)
    work.mkdir(parents=True, exist_ok=True)
    target = work / 'candidate.zip'
    data = Path(archive).read_bytes() if archive else download_archive(target)
    if hashlib.sha256(data).hexdigest() != ARCHIVE_SHA256:
        raise ValueError('Downloaded archive checksum differs. Nothing was extracted or started.')
    target.write_bytes(data)
    source = unpack(target, work)
    public = source / 'work' / 'mac-preview'
    for script, args in [('build-pages-artifact.py', ['--out', str(public)]), ('verify-pages-artifact.py', [str(public)])]:
        subprocess.run([sys.executable, str(source / 'scripts' / script)] + args, cwd=source, check=True)
    entries = json.loads((source / 'scripts/publish-manifest.json').read_text())['files']
    digest = hashlib.sha256(''.join('%s\t%s\n' % (e['path'], e['sha256']) for e in sorted(entries, key=lambda e: e['path'])).encode()).hexdigest()
    if digest != TREE_SHA256 or len(entries) != EXPECTED_FILES:
        raise ValueError('Candidate artifact digest or file count differs. Server not started.')
    receipt = dict(candidate_label='PR #%s — LIVING ENTERPRISE CANDIDATE' % CANDIDATE_PR, repository=REPOSITORY, pr_number=CANDIDATE_PR, publication_validation='PASSED', localhost_only=localhost_only, preview_url='http://127.0.0.1:%s/nasha-universe/living-hq/' % PREVIEW_PORT, candidate_commit=COMMIT, archive_sha256=ARCHIVE_SHA256, artifact_tree_digest=digest,
                   files=len(entries), public_directory=str(public), scope='Verified local-only candidate; no public hosting')
    (work / 'preview-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2), flush=True)
    return public


def serve(public, port, lan_ip=None):
    import functools
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(public))
    servers = []
    started = []
    previous_interrupt = signal.signal(signal.SIGINT, signal.default_int_handler)
    try:
        # Explicit addresses only: never 0.0.0.0, never a public interface.
        for address in ['127.0.0.1'] + ([private_ipv4(lan_ip)] if lan_ip else []):
            servers.append(http.server.ThreadingHTTPServer((address, port), handler))
        print('Mac Safari: http://127.0.0.1:%s/nasha-universe/living-hq/' % port, flush=True)
        if lan_ip:
            print('iPhone Safari: http://%s:%s/nasha-universe/living-hq/' % (lan_ip, port), flush=True)
        print('Keep this Terminal open. Stop with Control-C. No tunnel or public listener is created.', flush=True)
        for server in servers:
            threading.Thread(target=server.serve_forever, daemon=True).start()
            started.append(server)
        threading.Event().wait()
    except KeyboardInterrupt:
        pass
    finally:
        for server in servers:
            if server in started:
                server.shutdown()
            server.server_close()
        signal.signal(signal.SIGINT, previous_interrupt)


def main():
    global COMMIT, ARCHIVE_SHA256, TREE_SHA256, EXPECTED_FILES, ROOT_NAME, URL, CANDIDATE_PR, PREVIEW_PORT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', required=True, help='Exact verified PR head (40 hex characters)')
    parser.add_argument('--archive-sha256', required=True, help='SHA-256 of that source archive')
    parser.add_argument('--tree-sha256', required=True, help='Expected public artifact tree digest')
    parser.add_argument('--files', required=True, type=int, help='Exact number of public files')
    parser.add_argument('--pr-number', required=True, type=int, help='PR whose current head must match')
    parser.add_argument('--lan', action='store_true', help='Also bind your Mac private Wi-Fi address for iPhone testing')
    parser.add_argument('--lan-ip', help='Explicit private Wi-Fi IPv4 address if automatic discovery is unavailable')
    parser.add_argument('--port', type=int, default=8864)
    parser.add_argument('--verify-only', action='store_true', help='Verify/build the candidate without starting a server')
    parser.add_argument('--archive', type=Path, help='Use an already downloaded exact candidate ZIP')
    parser.add_argument('--output', type=Path, help='New empty preview directory; defaults to a unique temporary directory')
    args = parser.parse_args()
    try:
        if not re.fullmatch(r'[0-9a-f]{40}', args.commit) or not all(re.fullmatch(r'[0-9a-f]{64}', x) for x in (args.archive_sha256, args.tree_sha256)) or not 1 <= args.files <= 5000 or args.pr_number < 1:
            raise ValueError('Exact commit, SHA-256 pins, public file count and PR number required')
        COMMIT, ARCHIVE_SHA256, TREE_SHA256, EXPECTED_FILES, CANDIDATE_PR = args.commit, args.archive_sha256, args.tree_sha256, args.files, args.pr_number
        ROOT_NAME = 'riteshmamidi0905-lab.github.io-' + COMMIT
        URL = 'https://codeload.github.com/' + REPOSITORY + '/zip/' + COMMIT
        if not 1024 <= args.port <= 65535:
            raise ValueError('Use a port between 1024 and 65535')
        PREVIEW_PORT = args.port
        lan_ip = private_ipv4(args.lan_ip) if args.lan_ip else wifi_ip() if args.lan else None
        if args.output and args.output.exists() and any(args.output.iterdir()):
            raise ValueError('Output directory must be empty; existing work will not be overwritten')
        work = args.output or Path(tempfile.mkdtemp(prefix='nasha-living-enterprise-'))
        work.mkdir(parents=True, exist_ok=True)
        require_pr_head(CANDIDATE_PR, work)
        public = prepare(work, args.archive, localhost_only=not bool(lan_ip))
        require_pr_head(CANDIDATE_PR, work)
        if not args.verify_only:
            serve(public, args.port, lan_ip)
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print('Preview not started: ' + str(error), file=sys.stderr)
        print('For certificate/download errors, keep TLS verification enabled and report the error above. You may use --archive with the exact pinned ZIP; its SHA-256 is still mandatory.', file=sys.stderr)
        print('For an occupied port, stop the previous preview or retry with --port 8865.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
