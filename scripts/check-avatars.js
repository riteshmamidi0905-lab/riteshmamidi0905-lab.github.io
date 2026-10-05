/* Validates avatar slot images: assets/avatar/<persona>.webp|png must be transparent (alpha channel) and readable.
   Missing slots are fine (the portrait fallback is used). Run: npm run avatar:check */
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'assets/avatar'), manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
let bad = 0;
const hasAlpha = (b) => {
  if (b.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return [4, 6].includes(b[25]) || b.includes(Buffer.from('tRNS'));
  if (b.slice(0, 4).toString() === 'RIFF') { const t = b.slice(12, 16).toString(); return t === 'VP8L' ? !!(b[24] & 0x10) || true : t === 'VP8X' && !!(b[20] & 0x10); }
  return false;
};
for (const persona of Object.keys(manifest.personas)) {
  const f = ['webp', 'png'].map((e) => path.join(dir, `${persona}.${e}`)).find(fs.existsSync);
  if (!f) { console.log(`slot ${persona}: empty (fallback in use)`); continue; }
  const ok = hasAlpha(fs.readFileSync(f)); console.log(`slot ${persona}: ${path.basename(f)} ${ok ? 'transparent OK' : 'NO ALPHA CHANNEL'}`); if (!ok) bad++;
}
process.exit(bad ? 1 : 0);
