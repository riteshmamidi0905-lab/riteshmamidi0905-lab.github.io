"""Negative release-policy fixtures run against actual bytes from a cleared derivative."""
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from concept_art import validate, LABEL

class ArtRules(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        src=Path(__file__).resolve().parents[1]
        self.row=json.loads((src/'pavilion/art-provenance.json').read_text())['assets'][0]
        self.asset=self.row['file']
        target=self.root/self.asset
        target.parent.mkdir(parents=True)
        shutil.copyfile(src/self.asset,target)
        (self.root/'pavilion').mkdir()
        self.write([self.row],'<img src="'+self.asset+'"><p>'+LABEL+'</p>')
    def write(self,rows,html):
        (self.root/'pavilion/art-provenance.json').write_text(json.dumps({'assets':rows}))
        (self.root/'index.html').write_text(html)
    def check(self):return validate(self.root,['index.html'],{self.asset})
    def test_valid(self):self.assertIn(self.asset,self.check())
    def test_missing_manifest_entry(self):
        self.write([], '<img src="'+self.asset+'">')
        with self.assertRaises(AssertionError):self.check()
    def test_missing_or_hidden_label(self):
        for label in ['', '<span hidden>'+LABEL+'</span>', '<script>'+LABEL+'</script>']:
            self.write([self.row],'<picture><source srcset="'+self.asset+' 780w"></picture>'+label)
            with self.assertRaises(AssertionError):self.check()
    def test_missing_provenance(self):
        for field in ['prompt','model','date','credits','licenseNote','sha256','dimensions']:
            row=self.row.copy()
            del row[field]
            self.write([row],'<img src="'+self.asset+'"><p>'+LABEL+'</p>')
            with self.assertRaises((AssertionError,KeyError)):self.check()
    def test_mismatched_pixels(self):
        self.write([{**self.row,'dimensions':[1,1]}],'<img src="'+self.asset+'"><p>'+LABEL+'</p>')
        with self.assertRaises(AssertionError):self.check()
if __name__=='__main__':
    unittest.main()
