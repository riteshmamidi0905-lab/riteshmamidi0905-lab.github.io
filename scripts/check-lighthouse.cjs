/* Report actual measurements and enforce the unchanged release minimum. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),failed=[];
for(const page of ['home','demo','lab','hq','operations','recruiter'])for(const profile of ['mobile','desktop']){
 const r=JSON.parse(fs.readFileSync(path.join('work',`lighthouse-${page}-${profile}.json`),'utf8'));
 const scores=Object.fromEntries(['performance','accessibility','best-practices','seo'].map(k=>[k,r.categories[k].score]));
 const measured=Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(k=>[k,r.audits[k]?.numericValue]));
 console.log(JSON.stringify({page,profile,scores,measured}));
 for(const[k,score]of Object.entries(scores))if(typeof score!=='number'||score<.95)failed.push(`${page} ${profile} ${k}: ${score} below 0.95`);
}
if(failed.length)throw Error(failed.join('; '));
