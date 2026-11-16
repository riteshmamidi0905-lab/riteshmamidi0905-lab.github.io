#!/usr/bin/env python3
"""Verify registry derivation and fail-closed evidence boundaries."""
import importlib.util, json, shutil, tempfile, unittest
from pathlib import Path
from unittest import mock

spec=importlib.util.spec_from_file_location('registry',Path(__file__).parent/'twelve-agents/build_registry.py')
R=importlib.util.module_from_spec(spec);spec.loader.exec_module(R)

class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        for folder in ['assets/img/agents','nasha-universe/replays']:
            shutil.copytree(R.ROOT/folder,self.root/folder)
        for name in ['data/image-register.json','nasha-universe/living-hq/hq-data.json','scripts/cinematic-proof/scene.glb']:
            p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(R.ROOT/name,p)
        self.patch=mock.patch.object(R,'ROOT',self.root);self.patch.start()
    def tearDown(self):
        self.patch.stop();self.temp.cleanup()
    def alter_hq(self, edit):
        p=self.root/'nasha-universe/living-hq/hq-data.json';data=json.loads(p.read_text());edit(data);p.write_text(json.dumps(data))
    def test_committed_registry_reproduces_and_covers_twelve(self):
        registry,audit=R.derive()
        self.assertEqual(registry,json.loads((R.HERE/'registry.json').read_text()))
        self.assertEqual(audit,json.loads((R.HERE/'asset-readiness.json').read_text()))
        self.assertEqual([a['slug'] for a in registry['agents']],R.NAMES)
        for a in registry['agents']:
            self.assertEqual({x['status'] for x in a['capabilities']},{'Implemented','Recorded','Deterministic Simulation','Conceptual','Not Implemented'})
            self.assertTrue(a['recordings']);self.assertTrue(a['responsibilities']);self.assertTrue(a['tool_contracts'])
        self.assertFalse(audit['faithful_animation_accepted'])
    def test_tampered_recording_refused(self):
        p=self.root/'nasha-universe/replays/mission-a-approved.json';p.write_bytes(p.read_bytes()+b' ')
        with self.assertRaisesRegex(ValueError,'Recording checksum'):R.derive()
    def test_changed_artwork_refused(self):
        (self.root/'assets/img/agents/vectra.webp').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'Artwork approval/hash'):R.derive()
    def test_invented_responsibility_refused(self):
        self.alter_hq(lambda d:d['agents'][0]['assignments'].update({'A':'Invented action'}))
        with self.assertRaisesRegex(ValueError,'Responsibility'):R.derive()
    def test_forged_tool_counts_refused(self):
        self.alter_hq(lambda d:d['agents'][0]['tools'][0].update({'calls':999}))
        with self.assertRaisesRegex(ValueError,'Tool call count'):R.derive()
    def test_forged_participation_refused(self):
        self.alter_hq(lambda d:d['agents'][0].update({'events':999}))
        with self.assertRaisesRegex(ValueError,'participation count'):R.derive()
    def test_new_unreviewed_model_forces_reassessment(self):
        (self.root/'assets/img/agents/vectra.glb').write_bytes(b'new unreviewed model')
        with self.assertRaisesRegex(ValueError,'reassess'):R.derive()

if __name__=='__main__':unittest.main(verbosity=2)
