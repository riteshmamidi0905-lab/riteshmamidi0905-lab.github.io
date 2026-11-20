import test from 'node:test';
import assert from 'node:assert/strict';
import {lots,mapDrawing} from '../pavilion/district-map.js';
import {districtBusiness,activity,customLot} from '../pavilion/district-state.js';
import {defaults} from '../pavilion/idea-profiles.js';
test('Every operating district lamp and source ID matches its business at the selected minute',()=>{
 for(const {id} of lots.filter(l=>l.id!=='stadium')){
   const m=districtBusiness(id);for(const d of [1,7,14,28])for(const minute of [0,20,31,61,115,400]){
     const s=activity(m,d,minute),expected=m.events.filter(e=>e.day===d&&e.startMinute<=minute&&e.endMinute>minute);
     assert.deepEqual(s.ids,expected.map(e=>e.id));assert.deepEqual(s.owners,[...new Set(expected.map(e=>e.owner))]);
   }
 }
});
test('The accessible district map preserves city identity and a custom confirmed business',()=>{
 const lot=customLot({...defaults('salon'),concept:'Salon & Studio'},'a'.repeat(32),0);
 const svg=mapDrawing([...lots,lot]);for(const l of [...lots,lot])assert.ok(svg.includes('data-lot="'+l.id+'"'));
 assert.match(svg,/Salon &amp; Studio/);assert.match(svg,/hq\.html#sim=a{32}/);assert.throws(()=>districtBusiness('unknown'));
});
