"""Verify the additional, explicitly registered concept-art class without changing screenshot clearance."""
import hashlib
import json
import posixpath
import re
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

LABEL = "AI-generated concept art"
KIND = "ai-generated-concept-art"

def webp_size(data):
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        raise ValueError("Invalid WebP header")
    offset = 12
    while offset + 8 <= len(data):
        kind = data[offset:offset+4]
        length = int.from_bytes(data[offset+4:offset+8], 'little')
        chunk = data[offset+8:offset+8+length]
        if kind == b'VP8X':
            return [1+int.from_bytes(chunk[4:7], 'little'), 1+int.from_bytes(chunk[7:10], 'little')]
        if kind == b'VP8 ' and chunk[3:6] == b'\x9d\x01\x2a':
            return [int.from_bytes(chunk[6:8], 'little') & 16383, int.from_bytes(chunk[8:10], 'little') & 16383]
        if kind == b'VP8L' and chunk[0] == 47:
            bits = int.from_bytes(chunk[1:5], 'little')
            return [1+(bits & 16383), 1+((bits >> 14) & 16383)]
        offset += 8 + length + (length % 2)
    raise ValueError("Missing WebP dimensions")

class Uses(HTMLParser):
    void = set("area base br col embed hr img input link meta param source track wbr".split())
    def __init__(self, page):
        super().__init__()
        self.page = page
        self.stack = []
        self.images = []
        self.labels = []
        self.sequence = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.sequence += 1
        hidden = ('hidden' in a or a.get('aria-hidden') == 'true' or
                  re.search(r'display\s*:\s*none|visibility\s*:\s*hidden', a.get('style',''), re.I) or
                  tag in ('script','style','template','noscript'))
        scope = self.stack[-1][1] if self.stack else frozenset()
        if hidden: scope = scope | {self.sequence}
        if tag in ('img','source','image'):
            paths = [a.get('src',''), a.get('href',''), a.get('xlink:href','')]
            paths += [v.strip().split()[0] for v in a.get('srcset','').split(',') if v.strip()]
            for path in filter(None, paths):
                u = urlsplit(path)
                if not u.netloc and not u.scheme:
                    self.images.append((posixpath.normpath(posixpath.join(posixpath.dirname(self.page), u.path)), scope))
        if tag not in self.void:
            self.stack.append((tag,scope))
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.void: self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                return
    def handle_data(self, text):
        if text.strip()==LABEL:
            self.labels.append(self.stack[-1][1] if self.stack else frozenset())

def validate(root, pages, published):
    root = Path(root)
    entries = json.loads((root/'pavilion/art-provenance.json').read_text())['assets']
    registered = {}
    for a in entries:
        path = a['file']
        assert path not in registered and re.fullmatch(r'assets/img/pavilion/[a-z0-9-]+\.webp',path), path
        assert a.get('kind') == KIND and a.get('label') == LABEL, path
        for field in ('prompt','model','date','licenseNote','licenseUrl','generation'):
            assert isinstance(a.get(field),str) and a[field].strip(), (path,field)
        date.fromisoformat(a['date'][:10])
        assert type(a.get('credits')) is int and a['credits'] >= 0, (path,'credits')
        data = (root/path).read_bytes()
        assert a['sha256'] == hashlib.sha256(data).hexdigest() and a['bytes'] == len(data), path
        assert a['dimensions'] == webp_size(data), (path,'dimensions')
        assert path in published, path
        registered[path] = a
    expected = {p for p in published if p.startswith('assets/img/pavilion/')}
    assert set(registered)==expected, ('concept-art coverage', sorted(expected ^ set(registered)))
    used = set()
    for page in pages:
        parser=Uses(page)
        parser.feed((root/page).read_text())
        for path,scope in parser.images:
            if path in registered:
                used.add(path)
                assert any(label <= scope for label in parser.labels), ('visible concept art label',page,path)
    assert used==expected, ('unused or undeclared concept art',sorted(expected-used))
    return registered
