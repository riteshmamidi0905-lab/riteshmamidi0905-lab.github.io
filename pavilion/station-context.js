import {studios} from './studios.js';

const sectorNames = {
  salon: ['Salon supplies', 'Service bay'], retail: ['Merchandise stock', 'Merchandise bay'],
  coffee: ['Coffee supplies', 'Coffee preparation'], bakery: ['Bakery supplies', 'Bakehouse bench'],
  truck: ['Truck supplies', 'Service kitchen']
};
const unused = new WeakMap();
export function unusedStation(model, name) {
  if (!model || model.config.template === 'brewery' || !['ZYBREW','PYRIX'].includes(name)) return false;
  if (!unused.has(model)) unused.set(model, new Set(model.events.map(event => event.owner)));
  return !unused.get(model).has(name);
}
export function stationTitle(model, name) {
  const sector = model && sectorNames[model.config.template];
  if (!sector) return studios[name].title;
  if (name === 'VECTRA') return sector[0];
  if (name === 'ZYBREW') return 'Production bay';
  if (name === 'PYRIX') return sector[1];
  return studios[name].title;
}
export function idleMessage(model, name) {
  return unusedStation(model,name) ? 'Not used for this business — idle. No source events are assigned to this specialist.' :
    'Reviewing the queue. No source task is assigned at this minute.';
}
export function taskTitle(model, event) {
  if (!sectorNames[model.config.template]) return event.action;
  const record = model.records[event.outputs[0]];
  switch (record.kind) {
    case 'Availability check': {
      const required = Object.keys(record.required).filter(id => record.required[id] > 0);
      const material = required.find(id => record.shortage[id] > 0) || required[0];
      return material ? 'Check supply availability · ' + model.records[material].name : 'Check supply availability';
    }
    case 'Receiving': return 'Receive approved supply · ' + model.records[record.materialId].name;
    case 'Purchase proposal': return 'Prepare reorder · ' + model.records[record.materialId].name;
    case 'Appointment fulfillment':
    case 'Production lot': {
      const product = model.records[record.productId].name;
      if (!record.completed) return 'Record unfilled demand · ' + product;
      const verb = {salon:'Fulfill service',retail:'Pick merchandise',coffee:'Prepare order',bakery:'Prepare bakery order',truck:'Prepare truck order'};
      return verb[model.config.template] + ' · ' + product;
    }
    case 'Recipe evidence': return 'Check offering and supply records';
    case 'Ingredient requirement': return 'Calculate supply requirements';
    default: return event.action;
  }
}

