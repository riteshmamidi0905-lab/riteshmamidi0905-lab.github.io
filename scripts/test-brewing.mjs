import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const pages=['index','menu','brewhouse','space','story','visit'];
for(const slug of pages)test('Brewing hospitality and disclosure · '+slug,()=>{
 const {document}=parseHTML(read('brewing/'+slug+'.html'));const text=document.body.textContent;
 assert.equal(document.querySelector('.concept-note').textContent,'Concept in development — not yet open');
 assert.deepEqual([...document.querySelectorAll('#navigation a')].map(a=>a.getAttribute('href')),pages.map(p=>p+'.html'));
 for(const [label,href] of [['Original concept site',parseHTML(read('pavilion/bridge.html')).document.querySelector('a[rel=noreferrer][href^=https]').getAttribute('href')],['Run this brewery in NASHA','../pavilion/simulator.html?template=brewery']]){
  assert.ok([...document.querySelectorAll('a')].some(a=>a.textContent===label&&a.getAttribute('href')===href));
 }
 assert.equal(document.querySelectorAll('form,input,iframe,script').length,0);
 assert.doesNotMatch(text,/\$\s*\d|book a table|reservations open|five.star|reviews? from|open since/i);
 if(slug==='visit')assert.ok(text.includes('Austin, TX — opening date to be announced.'));
 if(slug==='menu'||slug==='brewhouse')assert.equal(document.querySelectorAll('article .pair').length,5);
 if(document.querySelector('img')){assert.ok(text.includes('AI-generated concept art'));assert.equal(document.querySelector('img').getAttribute('src'),'../assets/img/pavilion/brewery.webp');}
});
