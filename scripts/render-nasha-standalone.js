/* Export the implemented page as one offline review file. No deployment. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const ix=process.argv.indexOf('--out');
const out=path.resolve(ix>=0?process.argv[ix+1]:'deliverables/nasha-ecosystem/nasha-preview.html');
let html=fs.readFileSync('nasha-ai-preview.html','utf8');
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>'<style>'+fs.readFileSync(file,'utf8')+'</style>');
html=html.replace(/<script src="([^"]+)" defer><\/script>/g,(_,file)=>'<script>'+fs.readFileSync(file,'utf8')+'</script>');
const portraits=Object.fromEntries(fs.readdirSync('assets/nasha/specialists').filter(f=>f.endsWith('.svg')).map(f=>[path.basename(f,'.svg'),'data:image/svg+xml;base64,'+fs.readFileSync('assets/nasha/specialists/'+f).toString('base64')]));
const original='art.src="assets/nasha/specialists/"+name.toLowerCase()+".svg";';
if(!html.includes(original))throw Error('Specialist image adapter changed; update the export.');
html=html.replace(original,'art.src='+JSON.stringify(portraits)+'[name.toLowerCase()];');
for(const file of ['recruiter.html','nasha-lab.html'])html=html.replaceAll('href="'+file,'href="https://riteshmamidi0905-lab.github.io/'+file);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);console.log('Saved standalone offline preview:',out);
