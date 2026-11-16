#!/usr/bin/env python3
"""Security regressions for the isolated visual-proof transfer boundary."""
import hashlib,importlib.util,json,tempfile,types,unittest
from pathlib import Path
from unittest import mock
spec=importlib.util.spec_from_file_location('proof_launcher',Path(__file__).with_name('start-cinematic-proof.py'));P=importlib.util.module_from_spec(spec);spec.loader.exec_module(P)
class ProofBoundaryTests(unittest.TestCase):
    def test_registry_experience_uses_separate_builder_and_receipt(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);archive=root/'archive.zip';archive.write_bytes(b'pinned archive')
            source=root/'source';source.mkdir();helper=types.SimpleNamespace(require_pr_head=mock.Mock(),unpack=mock.Mock(return_value=source))
            argv=['proof','--commit','a'*40,'--archive-sha256',hashlib.sha256(archive.read_bytes()).hexdigest(),'--proof-tree-sha256','1'*64,'--pr-number','15','--archive',str(archive),'--output',str(root/'preview'),'--experience','registry','--verify-only']
            with mock.patch.object(P.sys,'argv',argv),mock.patch.object(P,'load_helper',return_value=helper),mock.patch.object(P.subprocess,'run') as run,mock.patch.object(P,'verify',return_value=[]):
                self.assertEqual(P.main(),0)
            self.assertEqual(Path(run.call_args.args[0][1]).name,'build-agent-registry.py')
            receipt=json.loads((root/'preview/proof-receipt.json').read_text())
            self.assertIn('REGISTRY',receipt['scope']);self.assertEqual(helper.require_pr_head.call_count,2)
    def fixture(self,root):
        (root/'index.html').write_text('review only');data=(root/'index.html').read_bytes();files=[{'path':'index.html','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}];digest=hashlib.sha256(('index.html\t'+files[0]['sha256']+'\n').encode()).hexdigest();(root/'proof-manifest.json').write_text(json.dumps({'files':files,'tree_sha256':digest}));return digest
    def test_independent_inventory(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);digest=self.fixture(root);self.assertEqual(len(P.verify(root,digest)),1)
    def test_modified_file_refused(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);digest=self.fixture(root);(root/'index.html').write_text('changed')
            with self.assertRaises(ValueError):P.verify(root,digest)
    def test_extra_file_refused(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);digest=self.fixture(root);(root/'private.txt').write_text('must not serve')
            with self.assertRaises(ValueError):P.verify(root,digest)
    def test_nested_manifest_cannot_hide_an_extra_file(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);digest=self.fixture(root);(root/'extra').mkdir();(root/'extra/proof-manifest.json').write_text('not an allowed exception')
            with self.assertRaises(ValueError):P.verify(root,digest)
    def test_symlink_refused(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);digest=self.fixture(root);(root/'link').symlink_to('/etc/passwd')
            with self.assertRaises(ValueError):P.verify(root,digest)
    def test_external_tree_pin_required(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);self.fixture(root)
            with self.assertRaises(ValueError):P.verify(root,'0'*64)
    def test_helper_mismatch_is_not_executed(self):
        with tempfile.TemporaryDirectory() as t,mock.patch.object(P,'download',return_value=b'not the trusted helper'),mock.patch.object(P.importlib.util,'spec_from_file_location') as load:
            with self.assertRaises(ValueError):P.load_helper(Path(t),'a'*40)
            load.assert_not_called()
    def test_macos_uses_verified_system_curl(self):
        with tempfile.TemporaryDirectory() as t,mock.patch.object(P.sys,'platform','darwin'),mock.patch.object(P.subprocess,'run') as run:
            target=Path(t)/'download';target.write_bytes(b'source');self.assertEqual(P.download('https://example.org/source',target),b'source');args=run.call_args.args[0];self.assertEqual(args[:2],['/usr/bin/curl','-q']);self.assertIn('--proto',args);self.assertIn('--proto-redir',args);self.assertNotIn('-k',args);self.assertNotIn('--insecure',args)
    def test_bad_archive_digest_never_extracts(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t);archive=root/'source.zip';archive.write_bytes(b'wrong');helper=types.SimpleNamespace(require_pr_head=mock.Mock(),unpack=mock.Mock())
            argv=['proof','--commit','a'*40,'--archive-sha256','0'*64,'--proof-tree-sha256','1'*64,'--pr-number','13','--archive',str(archive),'--output',str(root/'preview')]
            with mock.patch.object(P.sys,'argv',argv),mock.patch.object(P,'load_helper',return_value=helper):self.assertEqual(P.main(),1)
            helper.unpack.assert_not_called()
    def test_wrong_pr_head_never_downloads_source(self):
        with tempfile.TemporaryDirectory() as t:
            helper=types.SimpleNamespace(require_pr_head=mock.Mock(side_effect=ValueError('Wrong PR head')),download_https=mock.Mock(),unpack=mock.Mock());argv=['proof','--commit','a'*40,'--archive-sha256','0'*64,'--proof-tree-sha256','1'*64,'--pr-number','13','--output',str(Path(t)/'preview')]
            with mock.patch.object(P.sys,'argv',argv),mock.patch.object(P,'load_helper',return_value=helper):self.assertEqual(P.main(),1)
            helper.download_https.assert_not_called();helper.unpack.assert_not_called()
    def test_second_bind_failure_closes_unstarted_socket(self):
        first=mock.Mock()
        with mock.patch.object(P.http.server,'ThreadingHTTPServer',side_effect=[first,OSError('occupied')]):
            with self.assertRaises(OSError):P.serve(Path('/tmp'),8874,'192.168.1.2')
        first.server_close.assert_called_once();first.shutdown.assert_not_called()
    def test_directory_listing_refused(self):
        handler=object.__new__(P.Handler);handler.send_error=mock.Mock();self.assertIsNone(handler.list_directory('/tmp'));handler.send_error.assert_called_once_with(404)
if __name__=='__main__':unittest.main(verbosity=2)
