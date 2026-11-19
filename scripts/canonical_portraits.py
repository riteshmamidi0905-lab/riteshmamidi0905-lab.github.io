"""Validate the twelve independently verified, previously public portrait files."""
import hashlib
import json
from pathlib import Path
from concept_art import LABEL, Uses

# Exact serialised inventory verified against the public Git objects at revision 10f53a1.
INVENTORY_DIGEST = "8be73bed32503cbf7e96e7b0a4aae02ff6e96ea30a0c53026feea24091c9684f"

def validate(root, pages, published):
    root = Path(root)
    data = (root / 'pavilion/canonical-portraits.json').read_bytes()
    assert hashlib.sha256(data).hexdigest() == INVENTORY_DIGEST, 'canonical portrait inventory mismatch'
    inventory = json.loads(data)
    rows = {p['file']:p for p in inventory['portraits']}
    assert len(rows)==12
    assert set(rows)=={p for p in published if p.startswith('assets/img/agents/')}, 'canonical portrait coverage'
    for path, row in rows.items():
        raw=(root/path).read_bytes()
        assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256'], path
    used=set()
    for page in pages:
        parser=Uses(page)
        parser.feed((root/page).read_text())
        for path, scope in parser.images:
            if path in rows:
                assert any(label<=scope for label in parser.labels), ('visible canonical portrait label',page,path)
                used.add(path)
    assert used==set(rows), 'all twelve canonical portraits must appear on labeled pages'
    return rows
