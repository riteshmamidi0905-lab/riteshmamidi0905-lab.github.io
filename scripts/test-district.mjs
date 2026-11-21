import test from 'node:test';
import {readFileSync} from 'node:fs';
import {simulateStadium} from '../pavilion/stadium-model.js';
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

test('Venue cards report the actual event minute, including off-day and settlement events',()=>{
 const model=simulateStadium();
 for(const [day,minute] of [[1,20],[3,20],[3,21],[3,58],[3,59],[3,144],[3,154],[3,158],[3,162]]){
  const expected=model.events.filter(event=>event.day===day && event.minute===minute);
  const result=activity(model,day,minute);
  assert.deepEqual(result.events,expected);
  assert.deepEqual(result.owners,[...new Set(expected.map(event=>event.owner))]);
  for(const event of result.events) for(const id of event.outputs) assert.ok(model.records[id]);
 }
 assert.deepEqual(activity(model,3,58).owners,['SYNAPSE']);
 assert.deepEqual(activity(model,3,59).owners,[]);
 assert.deepEqual(activity(model,3,154).owners,['QUANTIX']);
});

test('The no-JavaScript atlas is the current rendered seven-building map',()=>{
 const html=readFileSync(new URL('../pavilion/district.html',import.meta.url),'utf8');
 assert.ok(html.includes('<div id="district-atlas">'+mapDrawing()+'</div>'));
});
