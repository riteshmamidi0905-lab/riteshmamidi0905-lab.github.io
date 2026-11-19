// Fictional assumptions. Rates are cents per hour, quantities are whole minutes and money is integer cents.
export function operatingTerms(scale,record,staff){
  const slots=[['Rowan','Production',1850,150],['Mika','Counter',1650,120],['Sol','Shift lead',2200,90],['Ari','Service',1650,120],['Lou','Production',1850,150]];
  const staffIds=slots.slice(0,staff?.length||3).map(([defaultName,role,hourlyRateCents,minutes],i)=>
    record('STAFF-'+(i+1),'Fictional employee',{name:staff?.[i]||defaultName,role,hourlyRateCents,scheduledMinutes:minutes*scale}));
  return record('TERMS','Synthetic operating terms',{staffIds,handlingCentsPerMinute:4,salesTaxBasisPoints:800,dailyRentCents:3500*scale,dailyUtilityBaseCents:425*scale,utilitiesPerCompletedUnitCents:9,
    settlement:'Accrue costs daily. At week end remit available sales tax first, then pay operating liabilities with available cash. Carry unpaid balances forward.'});
}
export const taxFor=(net,rate)=>Math.floor((net*rate+5000)/10000);
export const additionalAccounts={payroll:0,rent:0,utilities:0,salesTaxPayable:0,operatingPayable:0};
export function operatingDay({day,terms,shift,fulfillmentId,records,account,save,post,event,posts,committedCents=0}){
  const shiftIds=terms.staffIds.map(id=>{
    const employee=records[id],minutes=employee.scheduledMinutes;
    return save('Staff timesheet',{day,employeeId:id,shiftId:shift,minutes,hourlyRateCents:employee.hourlyRateCents,wagesCents:Math.round(minutes*employee.hourlyRateCents/60)});
  });
  const payroll=shiftIds.reduce((n,id)=>n+records[id].wagesCents,0);
  const sold=records[fulfillmentId].actualUnits;
  const bills={payroll,rent:terms.dailyRentCents,utilities:terms.dailyUtilityBaseCents+sold*terms.utilitiesPerCompletedUnitCents};
  const expense=save('Operating expenses',{day,termsId:terms.id,shiftIds,fulfillmentId,completedUnits:sold,...bills,totalCents:Object.values(bills).reduce((a,b)=>a+b,0)});
  const journals=Object.entries(bills).map(([debit,cents])=>post(debit,'operatingPayable',cents,expense));
  posts.push(...journals);event('QUANTIX','Accrue shift costs',[terms.id,shift,fulfillmentId,...shiftIds],[expense,...journals]);
  if(day%7)return;
  const fields={day,cashBeforeCents:account.cash,taxDueCents:-account.salesTaxPayable,operatingDueCents:-account.operatingPayable};
  const available=Math.max(0,account.cash-committedCents);
  const taxPaidCents=Math.min(fields.taxDueCents,available);
  const costsPaidCents=Math.min(fields.operatingDueCents,available-taxPaidCents);
  const settlement=save('Weekly settlement',{...fields,taxPaidCents,costsPaidCents,termsId:terms.id});
  const payments=[];
  if(taxPaidCents)payments.push(post('salesTaxPayable','cash',taxPaidCents,settlement));
  if(costsPaidCents)payments.push(post('operatingPayable','cash',costsPaidCents,settlement));
  posts.push(...payments);event('QUANTIX','Settle weekly obligations',[terms.id,expense],[settlement,...payments]);
}
export function weeklyClose(day,days,records,save,event,serviceQuality=null){
  const start=records[days[day-7]],end=records[days[day]],closeIds=days.slice(day-6,day+1);
  const movement=k=>end.accounts[k]-start.accounts[k];
  const journals=closeIds.flatMap(id=>records[id].journalIds.map(j=>records[j]));
  const posted=(debit,credit)=>journals.filter(j=>j.debit===debit&&j.credit===credit).reduce((s,j)=>s+j.cents,0);
  const remitted=journals.filter(j=>j.debit==='salesTaxPayable'&&records[j.source].kind==='Weekly settlement').reduce((s,j)=>s+j.cents,0);
  const id=save('Weekly close',{...(serviceQuality?{serviceQuality}:{}),week:day/7,from:day-6,through:day,openingCloseId:start.id,dailyCloseIds:closeIds,
    salesCents:0-movement('sales'),refundCents:movement('refunds'),ingredientCostCents:movement('cost'),
    payrollCents:movement('payroll'),rentCents:movement('rent'),utilitiesCents:movement('utilities'),netIncomeCents:end.incomeCents-start.incomeCents,
    taxCollectedCents:posted('cash','salesTaxPayable'),taxRefundedCents:posted('salesTaxPayable','cash')-remitted,
    taxRemittedCents:remitted,
    operatingCostsPaidCents:posted('operatingPayable','cash'),taxDueCents:Math.abs(end.accounts.salesTaxPayable),operatingDueCents:Math.abs(end.accounts.operatingPayable),
    openingCashCents:start.accounts.cash,closingCashCents:end.accounts.cash,closingInventoryCents:end.accounts.stock,trialBalanceCents:end.trialBalanceCents});
  event('QUANTIX','Close the operating week',[start.id,...closeIds,...(serviceQuality?.fulfillmentIds||[])],[id]);return id;
}
export function verifyLot(recipe,requested,stock,completed){
  for(const [id,units] of Object.entries(recipe)){
    if(!Number.isSafeInteger(stock[id])||!Number.isSafeInteger(units)||units<=0||stock[id]<completed*units)
      throw Error('Insufficient ingredient '+id+' for completed lot');
  }
  if(!Number.isSafeInteger(completed)||completed<0||completed>requested)throw Error('Invalid completed quantity');
}
