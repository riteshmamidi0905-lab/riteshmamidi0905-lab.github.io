// Original two-ink catalog drawings. The same category key follows each item into its storefront.
const drawings={
 scissors:['Haircut scissors','<g fill="none"><circle cx="55" cy="67" r="12"/><circle cx="83" cy="78" r="12"/><path d="m62 58 51-36-30 40-5 5m-1 0-32-42 47 32"/><circle cx="77" cy="59" r="3"/></g>'],
 chair:['Salon chair','<path d="M52 31q0-7 7-7h37q7 0 7 8l-4 22H55zM45 48h9l5 13h42l5-13h9l-6 24H53z"/><path d="M75 72h10v14l18 3v4H57v-4l18-3z"/>'],
 bottle:['Care bottle','<path d="M69 30v-8h27v5H78v3m-10 1h15v9l8 6v41H60V46l8-6z"/><path d="M63 56h25v18H63z" fill="var(--art-paper)"/><path d="m70 68 5-7 5 7" fill="none"/>'],
 cup:['Espresso cup','<path d="M43 43h66l-5 23q-5 15-28 15T48 66z"/><ellipse cx="76" cy="43" rx="32" ry="6" fill="var(--art-paper)"/><path d="M108 47q21-4 15 11-3 11-18 10M38 84q39 8 79 0M68 32q-7-8 1-16m11 16q-7-8 1-16" fill="none"/>'],
 beans:['Coffee beans','<g transform="rotate(-24 60 58)"><ellipse cx="60" cy="58" rx="17" ry="27"/><path d="M60 33q-15 16-1 25 13 10 1 25" fill="none"/></g><g transform="rotate(31 98 52)"><ellipse cx="98" cy="52" rx="16" ry="25"/><path d="M98 29q-12 13-1 23t0 23" fill="none"/></g>'],
 pastry:['Folded pastry','<path d="m34 64 12-19 18-9 24-2 22 11 14 22-8 10-19-8-14 7-17-5-13 6-16-5z"/><path d="m48 46 19 26m-2-34 14 35m9-36 7 32m15-22-1 25" fill="none"/>'],
 cake:['Layer cake','<path d="m43 52 54-27 20 23-1 28-73 7z"/><path d="m43 53 72-5m-70 16 70-7m-70 16 70-7" fill="none"/><circle cx="91" cy="28" r="6"/>'],
 loaf:['Scored loaf','<path d="M30 72q-1-31 33-36 28-9 53 9 17 15 11 30-53 12-97-3z"/><path d="m56 47-7 14m31-20-10 20m33-16-11 19" fill="none"/>'],
 pint:['Beer glass','<path d="m57 31 7 52h32l7-52z"/><path d="M57 38q6-9 13-3 7-8 15-2 13-6 17 4l1-10q-5-9-14-6-12-8-18-1-12-6-15 8z" fill="var(--art-paper)"/><path d="m69 46 3 25" fill="none"/>'],
 spritz:['Citrus drink','<path d="m58 39 7 46h31l7-46z"/><circle cx="100" cy="35" r="13" fill="var(--art-paper)"/><path d="m98 35 8-8m-8 8 10 1m-9-1-2-9M76 53l8-34h14" fill="none"/>'],
 plate:['Kitchen plate','<ellipse cx="80" cy="59" rx="42" ry="23"/><ellipse cx="80" cy="58" rx="32" ry="15" fill="var(--art-paper)"/><path d="m62 60 14-14 10 12 9-6 6 9z"/><path d="M25 37v45m-5-45v15q5 7 10 0V37m105 0-5 22h5v23" fill="none"/>'],
 chips:['Basket of chips','<path d="m41 59 14 22h48l15-22z"/><path d="m44 56 12-28 15 26 15-30 8 27 12-13 10 18z" fill="var(--art-paper)"/><path d="m56 66 7 9m10-9 5 9m12-9 4 9" fill="none"/>'],
 taco:['Folded taco','<path d="M31 73q1-39 43-44 39-3 54 36-49 21-97 8z"/><path d="M42 68q4-26 35-31 27 2 40 23" fill="none"/><path d="m48 53 9-12 8 3 11-10 9 3 10-3 11 10" fill="none"/>'],
 accessory:['Accessories','<path d="M55 42h49l8 39H47z"/><path d="M66 43v-8q0-15 14-15t14 15v8m-30 16h31" fill="none"/>'],
 gift:['Ribboned gift','<path d="M47 49h66v34H47zm-4-12h74v13H43z"/><path d="M74 37h11v46H74z" fill="var(--art-paper)"/><path d="M81 36q-28-3-20-14 9-9 20 14 9-24 20-14 8 11-20 14z" fill="none"/>'],
 vessel:['Studio vessel','<path d="M67 23h26l-2 14q-1 5 12 16 16 17 1 29-23 12-48-1-15-14 2-29 12-10 11-15z"/><path d="M67 28h26M57 66q19 9 47 1" fill="none"/>'],
 jersey:['Team jersey','<path d="m66 26-18 5-16 21 17 11 10-13v32h43V50l10 13 16-11-17-21-18-5q-13 14-27 0z"/><path d="m71 42 16-2-9 25M47 43l-9 12m77-12 8 12" fill="none"/>'],
 cap:['Ball cap','<path d="M39 61q8-42 45-36 28 3 30 37l-32 7z"/><path d="M81 67q24-10 35-9l17 11q-19 8-52 0z"/><path d="M83 27q-13 11-13 33" fill="none"/>']
};
const rules=[
 [/scissor|haircut|\bcut\b|trim/i,'scissors'],[/color|treatment|styling|blowout/i,'chair'],[/conditioner|shampoo|care product|serum/i,'bottle'],
 [/roast|beans/i,'beans'],[/coffee|espresso|latte/i,'cup'],[/cake/i,'cake'],[/pastry|bun|croissant/i,'pastry'],[/loaf|bread/i,'loaf'],[/lager|beer|\bipa\b/i,'pint'],
 [/drink|citrus|spritz|juice/i,'spritz'],[/taco/i,'taco'],[/chips|snack/i,'chips'],[/grill|plate|meal|kitchen|food/i,'plate'],
 [/gift/i,'gift'],[/accessor|bag/i,'accessory'],[/cap|hat/i,'cap'],[/merch|terrace goods|jersey/i,'jersey']
];
export function artCategory(type,item){
 const match=rules.find(([pattern])=>pattern.test(item.name));
 return match?.[1]??({salon:'chair',coffee:'cup',bakery:'loaf',truck:'plate',brewery:'plate',stadium:'plate',retail:'vessel'}[type]||'vessel');
}
export function itemArt(category){
 const [label,shape]=Object.hasOwn(drawings,category)?drawings[category]:drawings.vessel;
 return '<svg class="item-print" data-art="'+(Object.hasOwn(drawings,category)?category:'vessel')+'" viewBox="0 0 160 100" role="img" aria-label="'+label+' illustration"><path d="M13 86h134M15 89h130" fill="none" stroke="currentColor" opacity=".24"/><g fill="var(--art-fill,#c0a077)" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">'+shape+'</g></svg>';
}
