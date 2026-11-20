import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraFrame,homeCamera,stationCamera} from '../pavilion/free-camera.js';
import {overview} from '../pavilion/floor-staging.js';
import {floorOrder} from '../pavilion/iso-geometry.js';

for(const [w,h] of [[1440,522],[390,321],[320,235],[2048,700]])test('All twelve rooms fit on arrival at '+w+' pixels',()=>{
 const f=cameraFrame(w,h,homeCamera()),[x,y,a,b]=overview;
 assert.ok(f.x-f.visibleWidth/2<x&&f.x+f.visibleWidth/2>x+a);
 assert.ok(f.y-f.visibleHeight/2<y&&f.y+f.visibleHeight/2>y+b);
 for(const room of floorOrder){const s=stationCamera(room,w,h);assert.ok(s.zoom>f.zoom&&s.x>=x&&s.x<=x+a&&s.y>=y&&s.y<=y+b,room);}
});
test('Pan and optical zoom stop at world limits',()=>{
 const [x,y,w,h]=overview;
 assert.deepEqual(['x','y','zoom'].map(k=>cameraFrame(900,400,{x:-5000,y:-5000,zoom:0})[k]),[x,y,.84]);
 assert.deepEqual(['x','y','zoom'].map(k=>cameraFrame(900,400,{x:5000,y:5000,zoom:99})[k]),[x+w,y+h,8]);
});
