"use strict";
/* Isolated preview: evidence-labeled deterministic simulations, not recorded traces. */
const BASE="https://github.com/riteshmamidi0905-lab/INDO-MEX-BREWERY/blob/career/enterprise-platform-integration/lab/nasha_lab/";
const ROLE_DATA=[
["AETHON","ATLAS","Strategy Intelligence","◇","#c5adf9","Evidence-based founder strategy and decisions","objective, evidence","decision brief","SCRIBE, PULSE, SYNAPSE","specialists.py"],
["ZYBREW","BREWMASTER","Brewing Intelligence","◈","#efb95c","Unbrewed beer concept and ingredient requirements","style, batch_liters, ingredients","unbrewed batch plan","CORTEX, VECTRA, PYRIX","specialists.py"],
["PYRIX","FORGE","Culinary Innovation","△","#f08e74","Menu proposals and no-beef/no-pork checks","dish, ingredients, cost","untested menu proposal","ZYBREW, AEGIS","specialists.py"],
["VECTRA","SENTINEL","Inventory Intelligence","⬡","#66e3c3","Stock shortfall and replenishment signals","on_hand, reorder_point","shortfall and reorder flag","NEXORA, QUANTIX","specialists.py"],
["NEXORA","MERIDIAN","Procurement Intelligence","↗","#d2a3f3","Synthetic supplier quote comparison; draft only","supplier_quotes","recommended supplier draft","VECTRA, AEGIS, THE WEIR","specialists.py"],
["QUANTIX","PULSE","Financial Analytics","⌁","#6ac7fa","Scenario revenue, cost and margin","units, unit_price, unit_cost","financial scenario","AETHON, NEXORA","specialists.py"],
["ECHON","ECHO","Customer Intelligence","◌","#f3a2d4","Keyword-based classification of synthetic feedback","synthetic_feedback","sentiment labels","NOVARA, QUANTIX","specialists.py"],
["NOVARA","SPARK","Marketing Intelligence","✳","#ffc58a","Human-reviewed campaign proposal","insight, campaign_goal","unpublished campaign draft","ECHON, AEGIS","specialists.py"],
["SYNAPSE","NEXUS","Workflow Orchestration","◎","#9eb9ff","Aggregates structured specialist handoffs","handoffs","review-required workflow summary","all specialists","specialist_workflows.py"],
["AEGIS","GUARDIAN","Quality & Compliance","⬟","#8ce0a0","Dietary restrictions and evidence presence checks","ingredients, evidence","quality result","PYRIX, VERITAS","specialists.py"],
["CORTEX","SCRIBE","Knowledge & Research","▤","#96d6e6","Lexical evidence retrieval; distinct from existing RAG","question, documents","source identifiers","AETHON, ZYBREW","specialists.py"],
["VERITAS","LUMEN","AI Evaluation","✧","#d8b2ff","Deterministic pass/fail contract checks","checks","evaluation summary","AEGIS, SYNAPSE","specialists.py"]
];
const FLOW_DATA={
seasonal:{title:"Seasonal beer development",roles:["AETHON","CORTEX","ZYBREW","VECTRA","NEXORA","QUANTIX","PYRIX","AEGIS","VERITAS","SYNAPSE"],detail:"Synthetic proposal, ingredient requirements, supplier comparison and founder-review checkpoint.",state:"REQUIRES_HUMAN_APPROVAL"},
inventory:{title:"Inventory & procurement",roles:["VECTRA","QUANTIX","NEXORA","AEGIS","VERITAS"],detail:"Executable synthetic analytical handoffs. Real THE WEIR approval and protected execution are NOT verified.",state:"REQUIRES_HUMAN_APPROVAL"},
customer:{title:"Customer intelligence",roles:["ECHON","QUANTIX","AETHON","NOVARA","AEGIS","VERITAS","SYNAPSE"],detail:"Synthetic feedback, simple sentiment labels, scenario analytics, unpublished campaign draft.",state:"REQUIRES_HUMAN_APPROVAL"}
};
const $=s=>document.querySelector(s);
const container=$("#roles");
const dialog=$("#agent-dialog");
const byDisplay=Object.fromEntries(ROLE_DATA.map(r=>[r[0],r]));
function addText(parent,tag,value,cls){const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;parent.append(n);return n}
for(const r of ROLE_DATA){
 const [name,internal,purpose,glyph,color,description]=r;
 const card=document.createElement("article");card.className="card";card.style.setProperty("--accent",color);
 addText(card,"div",glyph,"mark").setAttribute("aria-hidden","true");
 addText(card,"h3",name);addText(card,"p",purpose);addText(card,"span","IMPLEMENTED • DETERMINISTIC SERVICE","badge");
 const btn=addText(card,"button","Explore "+name);btn.type="button";btn.addEventListener("click",()=>openProfile(r));
 container.append(card);
}
function openProfile(r){
 const [name,internal,purpose,glyph,color,description,inputs,outputs,partners,file]=r;
 $("#profile-title").textContent=name+" / "+internal;
 $("#profile-specialty").textContent=purpose;
 $("#profile-description").textContent=description;
 const dl=$("#profile-facts");dl.replaceChildren();
 for(const [k,v] of [["Internal role",internal],["Inputs",inputs],["Outputs",outputs],["Collaborators",partners],["Implementation","Deterministic callable specialist; CI #116 verified; individual evaluation metrics not published"],["Permissions","No protected purchase or publication exposed through specialist interface"]]){
 addText(dl,"dt",k);addText(dl,"dd",v)}
 $("#profile-code").href=BASE+file;
 dialog.showModal();
}
$("#profile-close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
let current="seasonal",index=0,timer=null;
function pause(){if(timer){clearInterval(timer);timer=null}$("#replay-toggle").textContent="Play illustrative replay"}
function render(){
 const f=FLOW_DATA[current];$("#workflow-title").textContent=f.title;
 $("#workflow-description").textContent=f.detail;
 $("#workflow-state").textContent=f.state+" • ILLUSTRATIVE REPLAY";
 const steps=$("#trace-steps");steps.replaceChildren();
 f.roles.forEach((role,i)=>{const b=addText(steps,"button",String(i+1).padStart(2,"0")+" / "+role);b.type="button";if(i===index)b.setAttribute("aria-current","step");b.addEventListener("click",()=>{pause();index=i;render()})});
 const role=f.roles[index],meta=byDisplay[role];
 $("#trace-role").textContent=role;
 $("#trace-description").textContent=meta?meta[5]:"External policy gateway (architecture only)";
 $("#trace-evidence").textContent=meta?"Source: "+meta[1]+" specialist interface. Demonstration is an illustrative sequence, not a recorded execution trace.":"Integration and approval lifecycle are not end-to-end verified.";
 $("#trace-counter").textContent=(index+1)+" / "+f.roles.length;
 document.querySelectorAll("[data-workflow]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.workflow===current)));
}
document.querySelectorAll("[data-workflow]").forEach(b=>b.addEventListener("click",()=>{pause();current=b.dataset.workflow;index=0;render()}));
$("#replay-toggle").addEventListener("click",()=>{
 if(timer){pause();return}
 $("#replay-toggle").textContent="Pause illustrative replay";
 timer=setInterval(()=>{const max=FLOW_DATA[current].roles.length;if(index>=max-1){pause();return}index++;render()},1200);
});
$("#replay-next").addEventListener("click",()=>{pause();index=(index+1)%FLOW_DATA[current].roles.length;render()});
render();
