import json, shutil, tempfile, unittest
from pathlib import Path
from canonical_portraits import validate

class PortraitChecks(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        source=Path(__file__).resolve().parents[1]
        (self.root/'pavilion').mkdir()
        manifest='pavilion/canonical-portraits.json'
        shutil.copy(source/manifest,self.root/manifest)
        self.rows=json.loads((source/manifest).read_text())['portraits']
        self.files={r['file'] for r in self.rows}
        for file in self.files:
            target=self.root/file;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy(source/file,target)
        self.html='<p>AI-generated concept art</p>'+''.join('<img src="../'+f+'" alt="">' for f in sorted(self.files))
        self.page=self.root/'pavilion/agents.html'
        self.page.write_text(self.html)
    def check(self):return validate(self.root,['pavilion/agents.html'],self.files)
    def test_all_verified(self):self.assertEqual(len(self.check()),12)
    def test_different_pixels(self):
        (self.root/self.rows[0]['file']).write_bytes(b'changed')
        with self.assertRaises(AssertionError):self.check()
    def test_hidden_label(self):
        self.page.write_text(self.html.replace('<p>','<p hidden>'))
        with self.assertRaises(AssertionError):self.check()
    def test_unsigned_extra_file(self):
        self.files.add('assets/img/agents/extra.webp')
        with self.assertRaises(AssertionError):self.check()
    def test_changed_reference(self):
        p=self.root/'pavilion/canonical-portraits.json';p.write_text(p.read_text().replace('10f53a1','0000000'))
        with self.assertRaises(AssertionError):self.check()
if __name__=='__main__':unittest.main()
