/* Deterministic, isolated browser simulation. No external orders or identity assurance. */
(function(root){'use strict';
const catalog=[['chicken65','Chicken65 Totopos','Menu',24,1299,8],['paneer','Paneer Tikka Taco','Menu',32,899,12],['quesadilla','Butter Chicken Rajas Quesadilla','Menu',18,1499,8],['gobi','Mango Habanero Gobi','Appetizer',16,1099,8],['hefe','Hefeweizen','Beer',48,699,24],['lager','Mexican lager','Beer',36,599,24],['amber','Vienna amber','Beer',24,699,24],['mango','Mango','Ingredient',12,250,10],['tortillas','Tortillas','Ingredient',60,35,40]];
function seed(){return {items:catalog.map(([id,name,category,qty,cents,daily])=>({id,name,category,qty,cents,daily,expiryDays:category==='Beer'?30:category==='Ingredient'?5:2})),counts:[],requests:[],events:[],incident:false,demand:1};}
function validInt(n){return Number.isSafeInteger(n)&&n>=0&&n<=10000;}
function apply(state,action){const s=JSON.parse(JSON.stringify(state));const item=s.items.find(i=>i.id===action.item);let detail='';
 switch(action.type){
 case 'quantity':if(action.actor!=='operator'||!item||!validInt(action.qty))throw Error('Operator and quantity 0–10000 required');item.qty=action.qty;detail=item.id+':'+item.qty;break;
 case 'demand':if(action.actor!=='operator')throw Error('Operator required');if(!Number.isFinite(action.value)||action.value<0.5||action.value>3)throw Error('Demand must be 0.5–3');s.demand=action.value;break;
 case 'request':if(action.actor!=='operator'||!item||!validInt(action.qty)||action.qty===0)throw Error('Valid operator request required');if(s.requests.some(r=>r.key===action.key))return s;if(!/^[a-z0-9-]{1,64}$/.test(action.key||''))throw Error('Idempotency key required');s.requests.push({key:action.key,item:item.id,qty:action.qty,requester:action.actor,status:'pending'});detail=action.key;break;
 case 'count':if(action.actor!=='operator'||!item||!validInt(action.qty))throw Error('Valid operator count required');s.counts.push({id:s.counts.length+1,item:item.id,expected:item.qty,counted:action.qty,status:'pending'});detail=item.id+': discrepancy '+(action.qty-item.qty);break;
 case 'reconcile':{const c=s.counts.find(c=>c.id===action.id);if(action.actor!=='reviewer'||!c||c.status!=='pending')throw Error('Reviewer and pending count required');const target=s.items.find(i=>i.id===c.item);if(target.qty!==c.expected)throw Error('Stock changed since count; submit a fresh count');target.qty=c.counted;c.status='reconciled';detail=c.item+':'+c.counted;break;}
 case 'approve':{const r=s.requests.find(r=>r.key===action.key);if(action.actor!=='reviewer'||!r||r.status!=='pending'||r.requester===action.actor)throw Error('Independent reviewer and pending request required');r.status='approved';detail=r.key;break;}
 case 'receive':{const r=s.requests.find(r=>r.key===action.key);if(action.actor!=='operator'||!r)throw Error('Operator and existing request required');if(r.status==='received')return s;if(s.incident)throw Error('Receiver unavailable; approved request retained for retry');if(r.status!=='approved')throw Error('Approval required before receiving');const target=s.items.find(i=>i.id===r.item);if(!validInt(target.qty+r.qty))throw Error('Quantity limit exceeded');target.qty+=r.qty;r.status='received';detail=r.key;break;}
 case 'incident':if(action.actor!=='operator')throw Error('Operator required');s.incident=true;break;
 case 'recover':if(action.actor!=='operator')throw Error('Operator required');s.incident=false;break;
 default:throw Error('Unknown action');}
 const prev=s.events.length?s.events[s.events.length-1].hash:'GENESIS';const event={seq:s.events.length+1,type:action.type,actor:action.actor||'simulation',detail,previous:prev};event.hash=hash(JSON.stringify(event));s.events.push(event);return s;}
function hash(text){if(root.NashaEngine)return root.NashaEngine.sha256(text);if(typeof require==='function')return require('node:crypto').createHash('sha256').update(text).digest('hex');throw Error('Hash implementation unavailable');}
function verify(s){let prev='GENESIS';return s.events.every((e,i)=>{const {hash:h,...v}=e;const ok=e.seq===i+1&&e.previous===prev&&h===hash(JSON.stringify(v));prev=h;return ok;});}
function view(s){return s.items.map(i=>({...i,forecast:Math.ceil(i.daily*s.demand*3),shortfall:Math.max(0,Math.ceil(i.daily*s.demand*3)-i.qty),valueCents:i.qty*i.cents}));}
const api={seed,apply,view,verify};if(typeof module!=='undefined')module.exports=api;root.NashaInventory=api;
})(typeof window!=='undefined'?window:globalThis);
