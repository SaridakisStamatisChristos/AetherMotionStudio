// TALK-02 dialogue: listeners look at the active speaker. A shot with `dialogue: {listen: true, turn?, cheat?}` and at
// least two bound speakers (`speakerAssets`, TALK-01) gets face chains generated from the measured phrase bounds of the
// timeline: every bound character looks at whoever is speaking; while speaking itself it keeps looking at the previous
// speaker (or, before anyone else has spoken, at the next one). Turns take `turn` seconds and every look is cheated
// toward the camera by `cheat` radians. Deterministic: derived only from the shot and the measured timeline.
const fail=(p,m)=>{throw Error(p+': '+m)};
export const DIALOGUE_LIMITS=Object.freeze({turn:[.1,1.5],defaultTurn:.35,cheat:[0,1],defaultCheat:.5});
export function validateDialogue(project){
 project.shots.forEach((s,i)=>{
  if(s.dialogue===undefined)return;
  const p='shots['+i+'].dialogue',x=s.dialogue;
  if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');
  for(const k of Object.keys(x))if(!['listen','turn','cheat'].includes(k))fail(p+'.'+k,'unknown field');
  if(x.listen!==true)fail(p+'.listen','true required');
  if(x.turn!==undefined&&!(typeof x.turn==='number'&&x.turn>=DIALOGUE_LIMITS.turn[0]&&x.turn<=DIALOGUE_LIMITS.turn[1]))fail(p+'.turn','seconds 0.1–1.5 required');
  if(x.cheat!==undefined&&!(typeof x.cheat==='number'&&x.cheat>=DIALOGUE_LIMITS.cheat[0]&&x.cheat<=DIALOGUE_LIMITS.cheat[1]))fail(p+'.cheat','radians 0–1 required');
  const bound=Object.values(s.speakerAssets??{});
  if(bound.length<2)fail(p,'at least two bound speakers (speakerAssets) required');
  for(const id of bound)if(s.assets.find(a=>a.id===id).face!==undefined)fail(p,'bound character '+id+' must not have an authored face (dialogue drives it)');
 });
}
const firstX=a=>{const x=a.tracks?.x;return Array.isArray(x)&&x.length?x[0][1]:0;};
// Focus changes per character: [{at: progress, target: assetId}] from the timeline shot `t`.
export function focusPlan(s,t){
 const bound=s.speakerAssets,ids=[...new Set(Object.values(bound))],n=(t.endFrame-t.startFrame)*1600,base=t.startFrame*1600;
 const turns=t.segments.map(g=>({at:(g.startSample-base)/n,who:bound[g.speaker??'default']})).filter(x=>x.who!==undefined);
 const plan={};
 for(const c of ids){
  const list=[];let current=null;
  for(const [k,x] of turns.entries()){
   const target=x.who!==c?x.who:current??turns.slice(k+1).find(y=>y.who!==c)?.who??ids.find(o=>o!==c);
   if(target!==current){list.push({at:list.length?x.at:0,target});current=target;}
  }
  if(!list.length)list.push({at:0,target:ids.find(o=>o!==c)});
  plan[c]=list;
 }
 return plan;
}
// Returns the shot with generated `face` (single window or chain) on every bound character; unchanged without dialogue.
export function dialogueShot(s,t){
 if(!s?.dialogue?.listen||s.template!=='cinematic-graph'||!t?.segments)return s;
 const seconds=(t.endFrame-t.startFrame)/30,turn=s.dialogue.turn??DIALOGUE_LIMITS.defaultTurn,cheat=s.dialogue.cheat??DIALOGUE_LIMITS.defaultCheat;
 const plan=focusPlan(s,t),byId=new Map(s.assets.map(a=>[a.id,a]));
 return {...s,assets:s.assets.map(a=>{
  const list=plan[a.id];if(!list)return a;
  const windows=list.map((f,k)=>{const end=k+1<list.length?list[k+1].at:1,span=Math.max(1e-6,end-f.at);
   const dx=firstX(byId.get(f.target))-firstX(a);
   return {target:f.target,start:+f.at.toFixed(6),end:+end.toFixed(6),blend:k?+Math.min(.5,turn/(span*seconds)).toFixed(6):0,offset:dx===0?0:-Math.sign(dx)*cheat,...(k===list.length-1?{hold:true}:{})};});
  return {...a,face:windows.length===1?{...windows[0],start:0,end:1}:windows};
 })};
}
