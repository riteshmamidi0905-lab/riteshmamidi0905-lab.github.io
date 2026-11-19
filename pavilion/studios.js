// Plate coordinates use the uncropped 1600 × 893 atrium photograph at 90% scale.
export const plan={width:1440,height:803.7,aisle:619,horizon:474,vanishingX:691};
const desks=[
  ['AETHON',69,618,'Strategy table','#adbc9d','drafting','Smoked ash'],
  ['CORTEX',257,622,'Research library','#c29d75','archive','Waxed walnut'],
  ['PYRIX',443,617,'Test kitchen','#cb9676','island','Honed stone'],
  ['ZYBREW',954,618,'Brewing console','#c99d65','process','Brushed copper'],
  ['VECTRA',1137,622,'Inventory racks','#a4b291','archive','Oiled steel'],
  ['NEXORA',1316,618,'Supplier board','#a6b9b6','drafting','Linen & bronze'],
  ['NOVARA',86,774,'Campaign studio','#be996f','easel','Limewash & oak'],
  ['ECHON',312,785,'Customer desk','#a2b7a4','listening','Felt & ash'],
  ['SYNAPSE',535,773,'Orchestration board','#bcad82','process','Blackened steel'],
  ['VERITAS',764,785,'Evaluation lab','#b4c4b6','island','Enamel & nickel'],
  ['QUANTIX',989,773,'Ledger wall','#c6af79','drafting','Bronze & vellum'],
  ['AEGIS',1220,785,'Audit terminal','#b2b7c3','archive','Slate & pewter']
];
export const studios=Object.fromEntries(desks.map(([name,x,ground,title,color,bench,finish])=>{
  const depth=.67+(ground-617)*.00215;
  return [name,{x,y:ground-94*depth,depth,ground,title,color,bench,finish}];
}));
