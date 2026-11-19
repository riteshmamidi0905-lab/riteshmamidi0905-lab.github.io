// Screen-space separation keeps two visitors from occupying the same aisle marker.
export const overview = [-18, -28, 1080, 625];
export function lightAt(index, length) {
  const progress = index / Math.max(1, length - 1);
  if (progress < .25) return 'Morning';
  if (progress < .59) return 'Midday';
  if (progress < .80) return 'Dusk';
  return 'Night';
}
export function placeTokens(desired, clearance) {
  const placed = new Map();
  function fits(x,y) {
    for (const [a,b] of placed.values()) {
      if (Math.abs(a-x)<clearance && Math.abs(b-y)<clearance) return false;
    }
    return true;
  }
  for (const {name,x,y,direction=1} of desired) {
    if (fits(x,y)) { placed.set(name,[x,y]); continue; }
    // Enumerate near lanes first. A stationary colleague always retains its position.
    let found=false;
    for (let ring=1;!found;ring++) {
      for (const [i,j] of [[0,-1],[0,1],[direction,0],[-direction,0],[1,-1],[-1,1],[1,1],[-1,-1]]) {
        const a=x+i*ring*clearance, b=y+j*ring*clearance;
        if (fits(a,b)) { placed.set(name,[a,b]); found=true; break; }
      }
    }
  }
  return placed;
}
export function recentEvents(events, minute) {
  return events.filter(e=>e.startMinute<=minute).sort((a,b)=>b.startMinute-a.startMinute || b.id.localeCompare(a.id,undefined,{numeric:true})).slice(0,5);
}
