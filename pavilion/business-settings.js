const plain=(value,max)=>typeof value==='string' && value===value.trim() && value.length>0 && value.length<=max && !/[<>\u0000-\u001f]/.test(value);
function integer(value,min,max,name){if(!Number.isSafeInteger(value)||value<min||value>max)throw Error('Invalid '+name+' (expected '+min+'–'+max+').');return value;}
export const defaultStaff=['Rowan','Mika','Sol'];
export function settings(input) {
 const out={};
 if(input.menu!==undefined){
   const count=input.template==='brewery'?3:2;
   if(!Array.isArray(input.menu)||input.menu.length!==count)throw Error('Provide one menu entry for each recipe.');
   out.menu=input.menu.map(r=>{if(!r||!plain(r.name,48))throw Error('Enter a 1–48 character menu name.');return {name:r.name,priceCents:integer(r.priceCents,1,100000,'menu price in cents')};});
 }
 const maxStaff=input.edition>=5&&input.template==='brewery'?7:5;
 if(input.staff!==undefined){if(!Array.isArray(input.staff)||input.staff.length<1||input.staff.length>maxStaff||!input.staff.every(s=>plain(s,36))||new Set(input.staff).size!==input.staff.length)throw Error('Enter 1–'+maxStaff+' distinct staff names, up to 36 characters each.');out.staff=[...input.staff];}
 if(input.pricePercent!==undefined)out.pricePercent=integer(input.pricePercent,-50,100,'menu price adjustment');
 if(input.edition===6&&input.template==='brewery'&&input.weeklyPurchaseCeilingCents!==undefined)
   out.weeklyPurchaseCeilingCents=integer(input.weeklyPurchaseCeilingCents,0,100000000,'weekly purchasing ceiling in cents');
 if(input.leadDays!==undefined)out.leadDays=integer(input.leadDays,0,5,'supplier lead days');
 if(input.humanReview!==undefined){if(typeof input.humanReview!=='boolean')throw Error('Invalid approval mode.');out.humanReview=input.humanReview;}
 if(input.decisions!==undefined){
   if(!out.humanReview||!Array.isArray(input.decisions)||input.decisions.length>84)throw Error('Invalid decision history.');
   const used=new Set();out.decisions=input.decisions.map(row=>{if(!row||typeof row.key!=='string'||!/^D(?:[1-9]|1\d|2[0-8])-MAT-[1-3]-\d+-\d+$/.test(row.key)||used.has(row.key)||!['approved','rejected'].includes(row.choice))throw Error('Invalid or repeated purchase decision.');used.add(row.key);return {key:row.key,choice:row.choice};});
 }
 return out;
}
export function readWizard(params,config,templates) {
 const names=templates[config.template];if(!names)return config;
 if(params.has('staffNames'))config.staff=params.get('staffNames').split(',').map(s=>s.trim());
 if(params.has('menu1')){
   const defaults=[[names[1],850],[names[2],625],['Chicken 65 Totopos',1950]];
   config.menu=defaults.slice(0,config.template==='brewery'?3:2).map(([label,cents],i)=>{
     const name=params.get('menu'+(i+1))?.trim()||label;
     const value=params.get('price'+(i+1));if(value&&!/^\d{1,4}(\.\d{1,2})?$/.test(value))throw Error('Use a positive menu price with up to two decimal places.');
     return {name,priceCents:value?Math.round(Number(value)*100):cents};
   });
 }
 return config;
}
