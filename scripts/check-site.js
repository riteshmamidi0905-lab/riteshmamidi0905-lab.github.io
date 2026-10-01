'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');const {P,FLAG}=require('../data');const {document}=parseHTML(fs.readFileSync('index.html','utf8'));
assert.equal(document.querySelectorAll('.pcard').length,P.length);assert.equal(document.querySelectorAll('.flagw').length,FLAG.length);
const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);assert.equal(new Set(ids).size,ids.length,'Duplicate IDs');
for(const el of document.querySelectorAll('[href],[src],[srcset]'))for(const attr of ['href','src','srcset']){let url=el.getAttribute(attr);if(!url||/^(https?:|mailto:|data:)/.test(url))continue;if(url.startsWith('#'))assert.ok(document.getElementById(url.slice(1)),url);else assert.ok(fs.existsSync(path.join(process.cwd(),url.split('?')[0].split('#')[0])),url);}
for(const img of document.querySelectorAll('img')){assert.ok(img.hasAttribute('alt'));assert.ok(img.hasAttribute('width'));assert.ok(img.hasAttribute('height'));}
assert.equal(document.querySelectorAll('h1').length,1);assert.equal(document.querySelectorAll('main').length,1);assert.equal(document.querySelectorAll('.dimension').length,6);assert.equal(document.querySelectorAll('video').length,5);assert.equal(document.querySelectorAll('track[kind="captions"]').length,5);
assert.ok(document.querySelector('#research').textContent.includes('Illustrative Example — Not Experimental Results'));
assert.ok(!document.querySelector('.hero-avatar').textContent.includes('AI generated'));
const before=fs.readFileSync('index.html','utf8');require('../build');assert.equal(fs.readFileSync('index.html','utf8'),before,'Generated HTML is stale');
console.log('PASS: project counts, local assets/links, unique IDs, image sizing/alt, main/heading structure, research labels, video captions and deterministic build');
