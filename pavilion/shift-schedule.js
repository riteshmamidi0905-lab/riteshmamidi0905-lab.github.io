// Synthetic handling minutes depend only on quantities of recorded references.
export function stampTasks(events) {
  const finished = new Map(), staff = new Map();
  for (const event of events) {
    const ownerKey = event.day + '/' + event.owner;
    const dependency = Math.max(0, ...event.inputs.map(id => finished.get(event.day + '/' + id) || 0));
    event.startMinute = Math.max(dependency, staff.get(ownerKey) || 0);
    event.endMinute = event.startMinute + 2 + event.inputs.length + event.outputs.length;
    staff.set(ownerKey, event.endMinute);
    for (const id of event.outputs) finished.set(event.day + '/' + id, event.endMinute);
  }
}

export function scheduleDay(model, day) {
  let events = model.events.filter(e => e.day === day);
  if(events.some(e=>e.startMinute===undefined)){events=events.map(e=>({...e}));stampTasks(events);}
  const producers = new Map(), edges = [];
  for (const event of events) {
    const senders = new Set();
    for (const id of event.inputs) {
      const from = producers.get(id);
      if (from && from.owner !== event.owner && !senders.has(from.id)) {
        edges.push({from:from.owner, to:event.owner, record:id, producer:from.id, consumer:event.id, minute:event.startMinute});
        senders.add(from.id);
      }
    }
    for (const id of event.outputs) producers.set(id, event);
  }
  const moments = [...new Set(events.map(e => e.startMinute))].sort((a,b) => a-b);
  return moments.flatMap(minute => {
    const active = events.filter(e => e.startMinute <= minute && e.endMinute > minute);
    const transfers = edges.filter(edge => edge.minute === minute);
    const starts=events.filter(e=>e.startMinute===minute), batches=[];
    for(let i=0;i<Math.max(transfers.length,1);i+=5)batches.push({minute,active,starts,transfers,batch:transfers.slice(i,i+5),waiting:transfers.slice(i+5)});
    return batches;
  });
}
