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

COMMIT = 'bdf18992bc1162eac6fceaff8abec1e677ed1b6d'
ARCHIVE_SHA256 = '0bdcbe859c850012c983d59555d3c2017955e52e53c6510f9e43234756853281'
TREE_SHA256 = '197cbbdbaa970dfd596cceb2de614b8fdd88a3693521094e76e0af3c055cd170'
URL = 'https://codeload.github.com/riteshmamidi0905-lab/riteshmamidi0905-lab.github.io/zip/' + COMMIT
ROOT_NAME = 'riteshmamidi0905-lab.github.io-' + COMMIT


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


def prepare(work, archive=None):
    work = Path(work)
    work.mkdir(parents=True, exist_ok=True)
    target = work / 'candidate.zip'
    data = Path(archive).read_bytes() if archive else urllib.request.urlopen(URL, timeout=60).read()
    if hashlib.sha256(data).hexdigest() != ARCHIVE_SHA256:
        raise ValueError('Downloaded archive checksum differs. Nothing was extracted or started.')
    target.write_bytes(data)
    source = unpack(target, work)
    public = source / 'work' / 'mac-preview'
    for script, args in [('build-pages-artifact.py', ['--out', str(public)]), ('verify-pages-artifact.py', [str(public)])]:
        subprocess.run([sys.executable, str(source / 'scripts' / script)] + args, cwd=source, check=True)
    entries = json.loads((source / 'scripts/publish-manifest.json').read_text())['files']
    digest = hashlib.sha256(''.join('%s\t%s\n' % (e['path'], e['sha256']) for e in sorted(entries, key=lambda e: e['path'])).encode()).hexdigest()
    if digest != TREE_SHA256 or len(entries) != 167:
        raise ValueError('Candidate artifact digest or file count differs. Server not started.')
    receipt = dict(candidate_commit=COMMIT, archive_sha256=ARCHIVE_SHA256, artifact_tree_digest=digest,
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lan', action='store_true', help='Also bind your Mac private Wi-Fi address for iPhone testing')
    parser.add_argument('--lan-ip', help='Explicit private Wi-Fi IPv4 address if automatic discovery is unavailable')
    parser.add_argument('--port', type=int, default=8864)
    parser.add_argument('--verify-only', action='store_true', help='Verify/build the candidate without starting a server')
    parser.add_argument('--archive', type=Path, help='Use an already downloaded exact candidate ZIP')
    parser.add_argument('--output', type=Path, help='New empty preview directory; defaults to a unique temporary directory')
    args = parser.parse_args()
    try:
        if not 1024 <= args.port <= 65535:
            raise ValueError('Use a port between 1024 and 65535')
        lan_ip = private_ipv4(args.lan_ip) if args.lan_ip else wifi_ip() if args.lan else None
        if args.output and args.output.exists() and any(args.output.iterdir()):
            raise ValueError('Output directory must be empty; existing work will not be overwritten')
        work = args.output or Path(tempfile.mkdtemp(prefix='nasha-visual-prototype-'))
        public = prepare(work, args.archive)
        if not args.verify_only:
            serve(public, args.port, lan_ip)
    except (ValueError, OSError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print('Preview not started: ' + str(error), file=sys.stderr)
        print('If the port is occupied, stop the previous preview or retry with --port 8865.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
