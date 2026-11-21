// Original architectural elevations for the industry selector. Each shares the same scale and palette.
export function elevation(kind){
 const colors={sports:['#b8c7b4','#294b40','#985c36'],beauty:['#e1cbbc','#5c6c61','#a26950'],retail:['#cec7ab','#34483d','#9b6345'],food:['#d6c6a7','#455747','#965b38']}[kind];
 const [sky,shade,trim]=colors;
 const ground='<path d="M0 166L410 127l230 27v86H0z" fill="#b8b39b"/><path d="M0 204l410-50 230 37v49H0z" fill="#d6ceba"/>';
 const tree=(x,y,s)=>'<g transform="translate('+x+' '+y+') scale('+s+')"><ellipse cy="6" cx="8" rx="25" ry="6" fill="#676e59" opacity=".34"/><path d="M0 4v-63" stroke="#695943" stroke-width="5"/><path d="M-24-29q-14-20 6-30-2-23 18-25 19-2 23 20 24 11 9 31-5 14-22 12-21 6-34-8" fill="'+shade+'"/><path d="M-24-29q-14-20 6-30-2-22 17-25l9 0q-22 13-17 33-15 4-15 22" fill="#87927a"/></g>';
 const entry='<path d="M99 95l245-45 160 34v83l-247 45-158-39z" fill="#b59574"/><path d="M99 95l246-44v83L99 174z" fill="#f0dfbd"/><path d="M345 51l159 33v82l-159-32z" fill="#ae9877"/><path d="M87 92l257-48 174 37-14 9-160-32L99 102z" fill="'+shade+'"/>';
 let building='';
 if(kind==='sports'){
   const bowl='<path d="M77 104l230-66 227 50 17 48-234 82-237-60z" fill="#997b56"/><path d="M82 99l226-64 228 49-219 79z" fill="#f0dcad"/><path d="M119 102l192-52 180 37-175 61z" fill="#476552"/><path d="M141 104l172-46 155 31-153 52z" fill="#819974"/><path d="M156 105l158-42 139 27-139 45z M231 84l148 32" fill="none" stroke="#e6debd" stroke-width="2"/><path d="M79 110l238 61 228-79v9l-228 82-237-60z" fill="'+shade+'"/>';
   building=bowl+Array.from({length:15},(_,i)=>'<path d="M'+(92+i*15.3)+' '+(126+i*3.91)+'v28m237-43v19" stroke="#d2b787" stroke-width="4"/>').join('')+'<g stroke="#385044" stroke-width="3"><path d="M94 102V61m6 1h-14m223-29V8m7 1h-14m202 74V44m7 0h-15"/></g>';
 }else{
   const windows=Array.from({length:7},(_,i)=>'<g transform="translate('+(110+i*31)+' '+(111-i*5.7)+') skewY(-10.3)"><rect width="25" height="47" fill="'+shade+'"/><path d="M3 4h19l-7 26H3z" fill="#8b9a86"/><path d="M13 0v47m-12-30h24" stroke="#c7b58f" stroke-width="1.8"/></g>').join('');
   const canopy=kind==='beauty'?'<path d="M91 116l247-44-13 13-247 45z" fill="#93594e"/>':kind==='retail'?'<path d="M91 116l247-44-13 13-247 45z" fill="#445d4e"/>':'<path d="M91 116l247-44-13 13-247 45z" fill="#a86c42"/>';
   let interior='';
   if(kind==='food'){
     for(const [x,y] of [[123,181],[171,177],[220,170]])interior+='<g transform="translate('+x+' '+y+')"><ellipse rx="19" ry="6" fill="#5c624e" opacity=".28"/><path d="M0-3v-24m-8 25h16" stroke="#5a5442" stroke-width="2"/><path d="M-19-18l19-13 19 10-16 6z" fill="#d9ab6c"/><ellipse cy="-6" rx="10" ry="3" fill="#966d49"/></g>';
     interior+='<path d="M384 78V46q0-8 7-8h6v6h-5v36m25 7V53q0-8 7-8h6v6h-5v37" fill="#9c9f92"/>';
   }else if(kind==='beauty'){
     for(const [x,y] of [[123,121],[185,110],[249,98]])interior+='<g transform="translate('+x+' '+y+') skewY(-10)"><path d="M0 23V6q0-10 8-10t8 10v17z" fill="#d5b599"/><path d="M3 21V6q0-6 5-6t5 6v15" fill="#83968b"/><path d="M6 31v-9h10v8l-5 2v4" fill="#914f48"/></g>';
     interior+='<path d="M75 171l13-3 6-28-13 2z" fill="#b9a793"/><path d="M81 141q-12-23-3-33 15 9 7 31 2-25 20-28-1 19-20 31" fill="#63795e"/>';
   }else{
     for(const [x,y] of [[124,119],[185,108],[248,96]])interior+='<g transform="translate('+x+' '+y+') skewY(-10)"><path d="M0 15h23m-23 11h23" stroke="#e2c593" stroke-width="2"/><path d="M2 7h6v8H2zm9-4h6v12h-6zm7 18h5v5h-5z" fill="#b07c58"/><path d="M2 20h9v5H2z" fill="#e5caaa"/></g>';
     interior+='<path d="M370 83l90 20v20l-90-20z" fill="#eee0ba"/><path d="M378 92l72 15m-59-7l45 10" stroke="#77775b" stroke-width="2"/><path d="M121 97l186-34-12-7-181 34z" fill="#7d886a"/>';
   }
   building=entry+windows+canopy+interior+'<path d="M345 70l158 33m-158-18l158 33m-158-17l158 33" fill="none" stroke="#b99e78" stroke-width="2"/>';
 }
 return '<svg viewBox="0 0 640 240" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><rect width="640" height="240" fill="'+sky+'"/><circle cx="500" cy="48" r="26" fill="#f3e7c3"/><path d="M0 114l138-34 70 11 123-23 71 15 126-30 112 30v50H0z" fill="#a6af99"/>'+ground+tree(63,148,.62)+building+tree(550,163,.78)+tree(45,193,.8)+'<path d="M8 221l621-76" fill="none" stroke="'+trim+'" opacity=".26"/></svg>';
}
