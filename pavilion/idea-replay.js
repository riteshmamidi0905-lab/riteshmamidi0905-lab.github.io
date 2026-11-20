// Only a tab-local key and navigation controls travel in a URL fragment.
// The prompt, settings and records never enter requests, query strings or referrers.
import {validateIdea} from './idea-profiles.js';
export function rememberIdea(idea){
  validateIdea(idea);
  const id=crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint32Array(4)),x=>x.toString(16).padStart(8,'0')).join('');
  sessionStorage.setItem('pavilion-idea-'+id,JSON.stringify(idea));return id;
}
export function recallIdea(id){
  if(!/^[a-f0-9-]{32,36}$/.test(id||''))throw Error('Invalid local replay. Open the simulator to confirm an idea.');
  const stored=sessionStorage.getItem('pavilion-idea-'+id);
  if(!stored)throw Error('This idea belongs to a different or expired tab. Return to the simulator to start a local replay.');
  return validateIdea(JSON.parse(stored));
}
export function replayLink(page,id,shocks=[],day=1,extra={}){
  const p=new URLSearchParams({sim:id,day,...extra});
  if(shocks.length)p.set('case',shocks.join(','));
  return page+'.html#'+p;
}
