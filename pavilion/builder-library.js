import {optionalText} from './builder-copy.js';
const prefix='nasha.builder.v1.business.',currentKey='nasha.builder.v1.current';
export class BusinessLibrary{
 constructor(storage){
   this.storage=storage;this.entries=new Map();this.history=new Map();this.current=null;this.persistent=Boolean(storage);
   try{
     for(let i=0;i<(storage?.length||0);i++){
       const key=storage.key(i);if(!key?.startsWith(prefix))continue;
       try{const entry=JSON.parse(storage.getItem(key));if(entry?.id===key.slice(prefix.length)&&entry.business?.values&&entry.original?.values){
         for(const plan of [entry.business,entry.original]){
           if(!optionalText(plan.values.city))plan.values.city='Unspecified';
         }
         this.entries.set(entry.id,entry);
       }}catch{/* Other saved workspaces remain usable. */}
     }
     const last=storage?.getItem(currentKey);this.current=this.entries.has(last)?last:null;
   }catch{this.persistent=false;}
 }
 get active(){return this.entries.get(this.current);}
 write(entry){
   this.entries.set(entry.id,entry);this.current=entry.id;
   try{this.storage?.setItem(prefix+entry.id,JSON.stringify(entry));this.storage?.setItem(currentKey,entry.id);}
   catch{this.persistent=false;}
   return entry.business;
 }
 add(b,label=b.values.concept,original=b){
   const id=globalThis.crypto.randomUUID?.()??Array.from(crypto.getRandomValues(new Uint32Array(4)),v=>v.toString(16)).join('-');
   return this.write({id,label,business:structuredClone(b),original:structuredClone(original)});
 }
 select(id){
   if(!this.entries.has(id))throw Error('This workspace is unavailable.');
   this.current=id;try{this.storage?.setItem(currentKey,id);}catch{this.persistent=false;}
   return this.active.business;
 }
 stack(){if(!this.history.has(this.current))this.history.set(this.current,{past:[],future:[]});return this.history.get(this.current);}
 edit(b){
   const h=this.stack();h.past.push(this.active.business);if(h.past.length>30)h.past.shift();h.future=[];
   return this.write({...this.active,business:b});
 }
 travel(direction){
   const h=this.stack(),from=direction==='undo'?h.past:h.future,to=direction==='undo'?h.future:h.past;
   if(!from.length)return this.active.business;
   to.push(this.active.business);return this.write({...this.active,business:from.pop()});
 }
 duplicate(){
   const entry=this.active,names=new Set([...this.entries.values()].map(e=>e.label));let n=2;
   while(names.has(entry.business.values.concept+' · version '+n))n++;
   return this.add(entry.business,entry.business.values.concept+' · version '+n,entry.original);
 }
 reset(){return this.edit(structuredClone(this.active.original));}
}
export function browserLibrary(){
 let store=null;try{store=window.localStorage;}catch{/* In-memory mode stays available. */}
 return new BusinessLibrary(store);
}
