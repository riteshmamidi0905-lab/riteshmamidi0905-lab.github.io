/* All amounts are integer USD cents; quantities are whole recipe units. */
import {additionalAccounts,operatingTerms,operatingDay,taxFor,verifyLot,weeklyClose} from './finance.js';
import {settings} from './business-settings.js';
import {brewpub,pubTerms,pubDemand,openingUnits,missingVisits,defaultCrew,serviceRating,purchaseBudget} from './brewpub.js';
import {stampTasks} from './shift-schedule.js';
export const templates = Object.freeze({
  brewery: ['Brewery & Kitchen','Court lager','Lime spritz','Malt measure','Citrus measure'],
  coffee: ['Coffee Roaster','House espresso','Cold brew','Coffee measure','Filter pack'],
  bakery: ['Bakery','Morning loaf','Butter roll','Flour measure','Butter portion'],
  retail: ['Retail Boutique','Field notebook','Studio stationery set','Paper set','Binding kit']
});
export const preset = Object.freeze({template:'brewery',name:'NASHA Brewery',location:'Limestone Court',size:'Studio',budget:15000,seed:27});
const scales={Studio:1,House:2,Campus:3};
function freeze(x) {
  if(x && typeof x==='object' && !Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}
  return x;
}
Object.values(templates).forEach(freeze);
function validate(c) {
  if(!c || !Object.hasOwn(templates,c.template) || !Object.hasOwn(scales,c.size))throw Error('Select a listed template and size.');
  for(const k of ['name','location'])if(typeof c[k]!=='string'||c[k]!==c[k].trim()||!c[k]||c[k].length>56||/[<>\x00-\x1f]/.test(c[k]))throw Error('Use 1–56 plain-text characters for the name and fictional location.');
  if(!Number.isInteger(c.budget)||c.budget<500||c.budget>1000000)throw Error('Opening budget must be 500–1,000,000 whole dollars.');
  if(!Number.isInteger(c.seed)||c.seed<1||c.seed>999999)throw Error('Use a whole-number seed from 1 to 999999.');
}
export function simulate(input=preset){return operate(input,false);}
// Unversioned callers retain the archived v2 ledger. New website and Builder sessions
// select the current edition explicitly so old source links still identify the same record.
export function simulateOperatingPeriod(input=preset){return operate(input,true,[3,4,5,6].includes(input.edition) && input.template==='brewery');}
export function simulateCurrentPeriod(input=preset){return simulateOperatingPeriod({...input,edition:6});}
function operate(input,monthly,calibrated=false){
  validate(input);
  const c=Object.fromEntries(Object.keys(preset).map(k=>[k,input[k]]));
  const extra=monthly?settings(input):{};
  const originalKey=Object.values(c).map(encodeURIComponent).join('/');
  Object.assign(c,extra);
  if(calibrated)c.edition=input.edition;
  const scenario=(calibrated?'builder-v'+c.edition+'/':monthly?'builder-v2/':'builder-v1/')+originalKey+(Object.keys(extra).length?'/'+encodeURIComponent(JSON.stringify(extra)):'');
  const scale=scales[c.size], [,p1,p2,i1,i2]=templates[c.template];
  let rng=c.seed;
  function roll(n){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return Math.floor(rng/4294967296*n);}
  const records={},events=[],days=[],weeks=[];
  function record(id,kind,data){if(records[id])throw Error('Duplicate record '+id);records[id]={scenario,id,kind,...data};return id;}
  const brewery=c.template==='brewery';
  const campaignNames={brewery:'Courtyard food and beer tastings',coffee:'Opening-week coffee flight',bakery:'Morning bread tasting',retail:'Stationery launch selection'};
  const supplierNames=['Court Supply','West Arcade Supply','Arcade Kitchen Supply'];
  const materials=[[i1,85],[i2,70]];
  if(brewery)materials.push(['Prepared Chicken 65 and totopos portion',395]);
  if(calibrated){
    const labels=['Lager pour at batch cost','Lime spritz ingredients','Chicken 65 kitchen portion'];
    materials.forEach((mat,i)=>{mat[0]=labels[i];mat[1]=brewpub.ingredientCents[i];});
  }
  const suppliers=materials.map((_,i)=>'SUP-'+String.fromCharCode(65+i));
  const profile=record('PLAN','Opening plan',{...c,scenario,dataset:brewery&&c.name===preset.name?'NASHA Brewery — built from scratch':c.name+' — built from scratch',openingCashCents:c.budget*100,staff:c.staff||(calibrated?[...defaultCrew(c.edition)]:null)||['Rowan · production','Mika · counter','Sol · shift lead'],supplierIds:suppliers,campaign:campaignNames[c.template],purchaseApprovalLimitCents:(calibrated?brewpub.approvalLimit:1800)*scale,...(monthly?{operatingTermsId:'TERMS'}:{})});
  const ingredients=materials.map(([name,cost],i)=>record('MAT-'+(i+1),'Ingredient',{name,supplierId:suppliers[i],unitCostCents:cost}));
  suppliers.forEach((id,i)=>record(id,'Fictional supplier',{name:supplierNames[i],materialId:ingredients[i]}));
  const products=[p1,p2].map((name,i)=>record('SKU-'+(i+1),'Product recipe',{name,priceCents:[850,625][i],recipe:{'MAT-1':i?1:2,'MAT-2':1}}));
  if(brewery)products.push(record('SKU-3','Product recipe',{name:'Chicken 65 Totopos',priceCents:1450,recipe:{'MAT-2':1,'MAT-3':1}}));
  products.forEach((id,i)=>{const product=records[id];
    if(calibrated){product.priceCents=brewpub.menuCents[i];product.recipe={['MAT-'+(i+1)]:1};}
    if(c.menu)Object.assign(product,c.menu[i]);if(c.pricePercent)product.priceCents=Math.max(1,Math.round(product.priceCents*(100+c.pricePercent)/100));});
  const terms=monthly?records[(calibrated?pubTerms:operatingTerms)(scale,record,c.staff,c.edition)]:null;
  const lostVisitsByDay=Array.from({length:32},()=>[]);
  let weekFulfillments=[];
  let budgetId, committedThisWeek = 0, lastCommitment;

  const deliveries=[], decisions=new Map((c.decisions||[]).map(row=>[row.key,row.choice]));
  function receive(item,posts,moves){
    const {po,decision,mat,units,cents}=item;
    const receipt=save('Receiving',{purchaseId:po,approvalId:decision,materialId:mat,units});
    const move=movement(mat,units,receipt);moves.push(move);posts.push(post('stock','cash',cents,receipt));
    event('VECTRA','Receive approved stock',[decision,po],[receipt,move]);
  }
  const stock=Object.fromEntries(ingredients.map(k=>[k,0])),account={cash:0,stock:0,equity:0,sales:0,refunds:0,cost:0,...(monthly?additionalAccounts:{})};
  let day=0, seq=0;
  const event=(owner,action,inputs,outputs)=>{for(const k of [...inputs,...outputs])if(!records[k])throw Error('Missing source '+k);events.push({id:'EV-'+day+'-'+String(events.length+1).padStart(3,'0'),scenario,day,owner,action,inputs,outputs});};
  function save(kind,data){return record('D'+day+'-'+String(++seq).padStart(3,'0'),kind,data);}
  function post(debit,credit,cents,source){
    if(!Number.isSafeInteger(cents)||cents<0)throw Error('Invalid posting');
    account[debit]+=cents;account[credit]-=cents;
    return save('Journal',{debit,credit,cents,source});
  }
  function movement(mat,units,source){stock[mat]+=units;if(stock[mat]<0)throw Error('Negative stock');return save('Movement',{materialId:mat,units,source});}
  function close(opening,postings,moves){
    const counts={...opening};for(const id of moves){const r=records[id];counts[r.materialId]+=r.units;}
    const inventoryValueCents=ingredients.reduce((v,k)=>v+counts[k]*records[k].unitCostCents,0);
    const trialBalanceCents=Object.values(account).reduce((a,b)=>a+b,0);
    const tradingProfitCents=-account.sales-account.refunds-account.cost;
    const incomeCents=tradingProfitCents-(monthly?account.payroll+account.rent+account.utilities:0);
    const liabilities=monthly?-account.salesTaxPayable-account.operatingPayable:0;
    if(ingredients.some(k=>counts[k]!==stock[k])||inventoryValueCents!==account.stock||trialBalanceCents||account.cash<0||account.cash+inventoryValueCents!==-account.equity+incomeCents+liabilities)throw Error('Unbalanced close');
    const id=save('Balance sheet',{day,accounts:{...account},openingStock:opening,closingStock:counts,inventoryValueCents,incomeCents,...(monthly?{tradingProfitCents,liabilitiesCents:liabilities}:{}),trialBalanceCents,journalIds:postings,movementIds:moves});
    event('QUANTIX','Close the books',postings.concat(moves),[id]);days.push(id);return id;
  }
  const opening={...stock},startJournal=[post('cash','equity',c.budget*100,profile)],startMoves=[];
  for(const mat of ingredients){
    const units=calibrated?openingUnits(ingredients.indexOf(mat),scale,c.budget*100):9*scale, receipt=save('Opening inventory',{materialId:mat,units,supplierId:records[mat].supplierId});
    startMoves.push(movement(mat,units,receipt));startJournal.push(post('stock','cash',units*records[mat].unitCostCents,receipt));
  }
  close(opening,startJournal,startMoves);
  for(day=1;day<=(monthly?28:7);day++){
    const prior=days.at(-1),open={...stock},posts=[],moves=[];
    for(const item of deliveries.filter(it=>it.due===day))receive(item,posts,moves);
    if(c.edition===6 && (day-1)%7===0){
      budgetId=save('Weekly purchase budget',purchaseBudget(day,terms,c.pricePercent||0,products,records,c.weeklyPurchaseCeilingCents));
      committedThisWeek=0;
      lastCommitment=null;
      event('QUANTIX','Open forecast purchasing budget',[terms.id,...products,...ingredients],[budgetId]);
    }
    const shift=save('Shift',{day,priorClose:prior,staff:records.PLAN.staff});event('SYNAPSE','Open the shift',[profile,prior],[shift]);
    const campaign=save('Campaign plan',{channel:'Courtyard invitation',state:'Synthetic plan',featuredProductId:products[day%products.length]});event('NOVARA','Prepare campaign',[profile,shift],[campaign]);
    const service=calibrated?pubDemand(day,terms,c.pricePercent||0,roll,c.edition>=4?lostVisitsByDay[day]:undefined,records[weeks.at(-1)]):null;
    const demand=service?.units||Object.fromEntries(products.map(k=>[k,(3+roll(7))*scale]));
    const orderable=service?.orderable||demand;
    const forecast=save('Demand forecast',{...(service||{}),units:demand,campaignId:campaign});event('AETHON','Forecast demand',[shift,campaign,...(service?.lostGuestSources||[]).map(s=>s.fulfillmentId),...(service?.ratingSourceId?[service.ratingSourceId]:[])],[forecast]);
    const dossier=save('Recipe evidence',{productIds:products,materialIds:ingredients});event('CORTEX','Retrieve recipe evidence',products.concat(ingredients),[dossier]);
    const need=Object.fromEntries(ingredients.map(k=>[k,products.reduce((s,p)=>s+orderable[p]*(records[p].recipe[k]||0),0)]));
    const recipe=save('Ingredient requirement',{required:need,forecastId:forecast});event('PYRIX','Translate recipes into requirements',[dossier,forecast],[recipe]);
    const short=Object.fromEntries(ingredients.map(k=>[k,Math.max(0,need[k]-stock[k])]));
    const target={...need};
    if(calibrated&&c.leadDays){
      // Order against the demand horizon, using ordinary forecast covers and no future random draws.
      for(let offset=1;offset<=c.leadDays&&day+offset<=28;offset++){
        const expected=pubDemand(day+offset,terms,c.pricePercent||0,()=>4,c.edition>=4?lostVisitsByDay[day+offset]:undefined,records[weeks.at(-1)]).orderable;
        for(const [sku,units] of Object.entries(expected))for(const [mat,count] of Object.entries(records[sku].recipe))target[mat]+=count*units;
      }
    }
    const reorderGap=calibrated?Object.fromEntries(ingredients.map(k=>[k,Math.max(0,target[k]-stock[k])])):short;
    const inventory=save('Availability check',{available:{...stock},required:need,shortage:short,...(calibrated?{orderTarget:target,leadDays:c.leadDays||0}:{})});
    event('VECTRA','Check ingredient availability',[prior,recipe],[inventory]);
    for(const mat of ingredients.filter(k=>reorderGap[k]>0)){
      const incoming=deliveries.filter(it=>it.due>day && it.mat===mat).reduce((n,it)=>n+it.units,0);
      if(incoming>=reorderGap[mat])continue;
      const buffer=calibrated?Math.max(1,Math.ceil(need[mat]*brewpub.bufferPercent/100)):3*scale;
      const units=reorderGap[mat]-incoming+buffer,cents=units*records[mat].unitCostCents;
      const key='D'+day+'-'+mat+'-'+units+'-'+cents;
      const po=save('Purchase proposal',{materialId:mat,units,cents,supplierId:records[mat].supplierId,...(c.humanReview||budgetId?{decisionKey:key}:{})});
      event('NEXORA','Prepare a reorder',[inventory,records[mat].supplierId],[po]);
      const free=account.cash-deliveries.filter(it=>it.due>day).reduce((n,it)=>n+it.cents,0);
      let decision, approved;
      if(budgetId){
        const remaining=records[budgetId].budgetCents-committedThisWeek;
        const overLimit=cents>records.PLAN.purchaseApprovalLimitCents;
        const needsReview=overLimit || cents>remaining || cents>free;
        const evidence={purchaseId:po,decisionKey:key,budgetId,cents,availableCashCents:free,
          committedBeforeCents:committedThisWeek,remainingBudgetCents:remaining,
          limitCents:records.PLAN.purchaseApprovalLimitCents};
        const inputs=[po,budgetId,...(lastCommitment?[lastCommitment]:[])];
        let reviewId, choice;
        if(needsReview){
          reviewId=save('Pending purchase review',{...evidence,queue:'Owner purchase approval',
            trigger:overLimit?'Above auto-approval threshold':cents>remaining?'Weekly budget constraint':'Cash constraint'});
          event('AEGIS','Escalate purchase for review',inputs,[reviewId]);
          if(c.humanReview){
            choice=decisions.get(key);
            if(!choice)continue;
            if(choice==='approved' && (cents>free || cents>remaining))throw Error('Approval exceeds uncommitted cash or the weekly purchase budget.');
            decisions.delete(key);
          }
        }
        approved=cents<=remaining && cents<=free && choice!=='rejected';
        const reason=cents>remaining?'Weekly purchasing budget exceeded':cents>free?'Insufficient uncommitted cash':
          choice==='rejected'?'Rejected by visitor':choice==='approved'?'Approved by visitor within budget and cash':
          overLimit?'Owner-policy replay approved within weekly budget and cash':'Within auto-approval threshold, budget and cash';
        decision=save('Approval record',{...evidence,approved,reason,...(reviewId?{reviewId}:{}),
          authority:choice?'Builder visitor':needsReview?'Synthetic owner-policy replay':'Synthetic policy fixture'});
        event('AEGIS',choice?'Record visitor purchase decision':needsReview?'Record simulated owner decision':'Check purchase policy',
          [...inputs,...(reviewId?[reviewId]:[])],[decision]);
        if(approved){committedThisWeek+=cents;lastCommitment=decision;}
      }else{
        const policy=cents<=records.PLAN.purchaseApprovalLimitCents && cents<=free;
        const manual=c.humanReview && !policy;
        const choice=manual?decisions.get(key):undefined;
        let reviewId;
        if(manual){
          reviewId=save('Pending purchase review',{purchaseId:po,decisionKey:key,availableCashCents:free,cents});
          event('AEGIS','Escalate purchase for review',[po,profile],[reviewId]);
          if(!choice)continue;
        }
        if(manual){decisions.delete(key);if(choice==='approved'&&cents>free)throw Error('Approval exceeds uncommitted cash.');}
        approved=manual?choice==='approved':policy;
        decision=save('Approval record',{purchaseId:po,approved,authority:manual?'Builder visitor':'Synthetic policy fixture',limitCents:records.PLAN.purchaseApprovalLimitCents,availableCashCents:free,reason:manual?'Explicit visitor decision':approved?'Within limit and cash available':'Limit or cash exceeded',...(manual?{decisionKey:key,reviewId}:{})});
        event('AEGIS',manual?'Record visitor purchase decision':'Check purchase policy',manual?[po,reviewId]:[po,profile],[decision]);
      }
      if(approved){
        const item={po,decision,mat,units,cents,due:day+(c.leadDays||0)};
        if(item.due===day)receive(item,posts,moves);else deliveries.push(item);
      }
    }
    const orders=[],payments=[],lots=[];let sold=0;
    for(const p of products){
      const spec=records[p],quantity=Math.min(orderable[p],!calibrated&&c.staff?3*c.staff.length*scale:Infinity,...Object.entries(spec.recipe).map(([k,n])=>Math.floor(stock[k]/n)));
      const inputs=moves.filter(id=>Object.hasOwn(spec.recipe,records[id].materialId)&&(monthly||records[id].units>0));
      if(monthly)verifyLot(spec.recipe,demand[p],stock,quantity);
      const batch=save(c.template==='brewery'&&p===products[0]?'Brewing batch':'Production lot',{productId:p,requested:demand[p],completed:quantity,unfilled:demand[p]-quantity,...(monthly?{stockBefore:{...stock},stockEvidenceIds:[prior,...inputs]}:{})});
      lots.push(batch);
      const used=quantity?Object.entries(spec.recipe).map(([k,n])=>movement(k,-quantity*n,batch)):[];moves.push(...used);
      event((brewery&&p===products[0])||(monthly&&c.template==='coffee'&&p==='SKU-2')?'ZYBREW':p==='SKU-3'?'PYRIX':'SYNAPSE',quantity?'Complete production lot':'Record blocked lot',[recipe,inventory,...(monthly?[prior]:[]),...inputs],[batch,...used]);
      if(!quantity)continue;
      const order=save('Sale',{productId:p,batchId:batch,quantity,unitPriceCents:spec.priceCents,campaignId:campaign});
      const net=spec.priceCents*quantity,tax=monthly?taxFor(net,terms.salesTaxBasisPoints):0;
      const pay=save('Payment',{orderId:order,cents:net+tax,...(monthly?{netCents:net,taxCents:tax,termsId:terms.id}:{})});
      const saleJournals=[post('cash','sales',net,pay),post('cost','stock',ingredients.reduce((s,k)=>s+quantity*(spec.recipe[k]||0)*records[k].unitCostCents,0),batch)];
      if(tax)saleJournals.push(post('cash','salesTaxPayable',tax,pay));
      posts.push(...saleJournals);
      event('QUANTIX','Record sale and payment',[batch,p,campaign],[order,pay,...saleJournals]);
      sold+=quantity;orders.push(order);payments.push(pay);
    }
    const actualUnits=lots.reduce((n,k)=>n+records[k].completed,0);
    const plannedUnits=lots.reduce((n,k)=>n+records[k].requested,0);
    const quality=save('Fulfillment check',{...(service?{potentialCovers:service.potentialCovers,staffedCovers:service.staffedCovers,mealsServed:records[lots[2]].completed}:{}),lotIds:lots,plannedUnits,actualUnits,unfilledUnits:plannedUnits-actualUnits,state:actualUnits===plannedUnits?'Complete':'Partial fulfillment'});
    if(c.edition>=5){
      Object.assign(records[quality],{waitMinutes:service.waitMinutes,walkouts:service.walkouts,peakArrivals:service.peakArrivals,capacityRefusals:service.potentialCovers-service.walkouts-service.staffedCovers,stockoutCovers:service.staffedCovers-records[quality].mealsServed,forecastId:forecast});
      weekFulfillments.push(records[quality]);
    }
    if(c.edition>=4){
      const unserved=service.potentialCovers-records[quality].mealsServed;
      const next=missingVisits(unserved,terms.lostGuestPercent,terms.lostGuestTiming);
      Object.assign(records[quality],{unservedCovers:unserved,lostVisitsByLag:next});
      next.forEach((covers,index)=>{if(covers)lostVisitsByDay[day+index+1].push({fulfillmentId:quality,covers});});
    }
    event('AEGIS','Check fulfillment against plan',lots.concat(forecast),[quality]);
    const attributed=save('Campaign attribution',{campaignId:campaign,orderIds:orders,paymentIds:payments,paidCents:payments.reduce((n,k)=>n+records[k].cents,0),basis:'Direct order campaign ID; gross collected before refunds'});
    event('NOVARA','Attribute campaign orders',[campaign,...orders,...payments],[attributed]);
    if(orders.length){
      const units=day%3===1?1:0;
      const feedback=save('Customer case',{orderId:orders[0],classification:units?'Refund requested':'Routine feedback',refundUnits:units});
      event('ECHON','Classify customer feedback',orders,[feedback]);
      if(units){
        const net=records[orders[0]].unitPriceCents,paid=records[payments[0]];
        // Reverse the rounding on the remaining units, capped by tax actually collected.
        const tax=monthly?paid.taxCents-taxFor(paid.netCents-net,terms.salesTaxBasisPoints):0;
        const refund=save('Refund',{paymentId:payments[0],caseId:feedback,cents:net+tax,restocked:false,...(monthly?{netCents:net,taxCents:tax}:{})});
        const refundJournals=[post('refunds','cash',net,refund)];
        if(tax)refundJournals.push(post('salesTaxPayable','cash',tax,refund));
        posts.push(...refundJournals);
        event('QUANTIX','Post customer refund',[feedback,payments[0]],[refund,...refundJournals]);
      }
    }
    if(monthly)operatingDay({day,terms,shift,fulfillmentId:quality,records,account,save,post,event,posts,committedCents:deliveries.filter(it=>it.due>day).reduce((n,it)=>n+it.cents,0)});
    const closeId=close(open,posts,moves);
    const paidMatches=orders.every(k=>{
      const order=records[k], payment=payments.find(p=>records[p].orderId===k);
      return order.quantity===records[order.batchId].completed && payment && (monthly?records[payment].netCents:records[payment].cents)===order.quantity*order.unitPriceCents;
    });
    const evidence=save('Evaluation',{check:'Paid order amounts and produced quantities agree; trial balance is zero',sold,passed:paidMatches&&actualUnits===sold&&records[closeId].trialBalanceCents===0});
    event('VERITAS','Verify shift evidence',[closeId,quality,...orders,...payments],[evidence]);
    if(monthly && day%7===0){
      const quality=c.edition>=5?serviceRating(weekFulfillments,terms.servicePolicy):null;
      weeks.push(weeklyClose(day,days,records,save,event,quality));
      weekFulfillments=[];
    }
  }
  if(decisions.size)throw Error('A decision no longer matches an eligible source proposal.');
  if(monthly)stampTasks(events);
  return freeze({scenario,config:c,products,ingredients,records,events,days,...(monthly?{weeks}:{})});
}
