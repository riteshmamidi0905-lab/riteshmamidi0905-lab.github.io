"""Preview boundary regressions; no network download or paid service is used."""
import importlib.util
from pathlib import Path
import socket
import signal
import subprocess
import sys
import time
import urllib.request
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('preview', Path(__file__).with_name('start-safari-preview.py'))
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)


class PreviewBoundaryTests(unittest.TestCase):
    def test_private_wifi_addresses_only(self):
        for ip in ['10.0.0.12', '172.16.0.2', '172.31.255.254', '192.168.1.12']:
            self.assertEqual(P.private_ipv4(ip), ip)
        for ip in ['127.0.0.1', '0.0.0.0', '8.8.8.8', '172.32.0.1', '::1', 'bad']:
            with self.assertRaises(ValueError):
                P.private_ipv4(ip)

    def test_archive_refuses_traversal_and_wrong_root(self):
        for name in ['../outside', '/' + P.ROOT_NAME + '/index.html', 'other/index.html', P.ROOT_NAME + '/../outside']:
            with tempfile.TemporaryDirectory() as tmp:
                zpath = Path(tmp) / 'bad.zip'
                with zipfile.ZipFile(zpath, 'w') as z:
                    z.writestr(name, 'bad')
                with self.assertRaises(ValueError):
                    P.unpack(zpath, Path(tmp) / 'extract')
                self.assertFalse((Path(tmp) / 'extract').exists())

    def test_archive_refuses_symlinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            zpath = Path(tmp) / 'bad.zip'
            with zipfile.ZipFile(zpath, 'w') as z:
                item = zipfile.ZipInfo(P.ROOT_NAME + '/link')
                item.create_system = 3
                item.external_attr = 0o120777 << 16
                z.writestr(item, '/etc/passwd')
            with self.assertRaises(ValueError):
                P.unpack(zpath, Path(tmp) / 'extract')

    def test_bad_download_digest_does_not_extract(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / 'download.zip'
            archive.write_bytes(b'wrong candidate')
            with self.assertRaises(ValueError):
                P.prepare(Path(tmp) / 'work', archive)
            self.assertFalse((Path(tmp) / 'work' / P.ROOT_NAME).exists())

    def test_known_archive_root_extracts(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / 'ok.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr(P.ROOT_NAME + '/example.txt', 'fixture')
            path = P.unpack(archive, Path(tmp) / 'extract')
            self.assertEqual((path / 'example.txt').read_text(), 'fixture')

    def test_occupied_port_is_not_replaced(self):
        with socket.socket() as occupied:
            occupied.bind(('127.0.0.1', 0))
            occupied.listen()
            with self.assertRaises(OSError):
                P.serve(Path(tempfile.gettempdir()), occupied.getsockname()[1])

    def test_second_bind_failure_closes_first_listener(self):
        with socket.socket() as occupied:
            occupied.bind(('127.0.0.1', 0))
            port = occupied.getsockname()[1]
        original = P.http.server.ThreadingHTTPServer
        calls = []
        def bind(address, handler):
            calls.append(address)
            if len(calls) == 2:
                raise OSError('simulated unavailable Wi-Fi interface')
            return original(address, handler)
        with patch.object(P.http.server, 'ThreadingHTTPServer', side_effect=bind):
            with self.assertRaises(OSError):
                P.serve(Path(tempfile.gettempdir()), port, '192.168.255.254')
        self.assertEqual(calls, [('127.0.0.1', port), ('192.168.255.254', port)])
        with socket.socket() as check:
            check.bind(('127.0.0.1', port))


    def test_interrupt_stops_server_and_releases_port(self):
        with tempfile.TemporaryDirectory() as tmp:
            with socket.socket() as free:
                free.bind(('127.0.0.1', 0))
                port = free.getsockname()[1]
            module = str(Path(__file__).with_name('start-safari-preview.py').resolve())
            code = "import importlib.util;from pathlib import Path;s=importlib.util.spec_from_file_location('p',%r);p=importlib.util.module_from_spec(s);s.loader.exec_module(p);p.serve(Path(%r),%r)" % (module, tmp, port)
            proc = subprocess.Popen([sys.executable, '-c', code], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                deadline = time.monotonic() + 5
                while True:
                    try:
                        with urllib.request.urlopen('http://127.0.0.1:%s/' % port, timeout=.3) as response:
                            self.assertEqual(response.status, 200)
                        break
                    except OSError:
                        if time.monotonic() > deadline:
                            self.fail('Preview did not start')
                        time.sleep(.05)
                proc.send_signal(signal.SIGINT)
                self.assertEqual(proc.wait(timeout=5), 0)
                with socket.socket() as released:
                    released.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    released.bind(('127.0.0.1', port))
            finally:
                if proc.poll() is None:
                    proc.kill()
                    proc.wait()


if __name__ == '__main__':
    unittest.main(verbosity=2)
