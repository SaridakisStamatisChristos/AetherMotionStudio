// TALK-02 dialogue: listeners look at the active speaker. A shot with `dialogue: {listen: true, turn?, cheat?}` and at
// least two bound speakers (`speakerAssets`, TALK-01) gets face chains generated from the measured phrase bounds of the
// timeline: every bound character looks at whoever is speaking; while speaking itself it keeps looking at the previous
// speaker (or, before anyone else has spoken, at the next one). Turns take `turn` seconds and every look is cheated
// toward the camera by `cheat` radians. Deterministic: derived only from the shot and the measured timeline.
const fail=(p,m)=>{throw Error(p+': '+m)};
export const DIALOGUE_LIMITS=Object.freeze({turn:[.1,1.5],defaultTurn:.35,cheat:[0,1],defaultCheat:.5});
// GEN-03 speaker follow (dialogue.camera 'follow', needs cameraRig.framing 'group'): calm by construction.
// establish: seconds on the whole group first; minLine: lines shorter than this do not move the camera; transition:
// seconds per move, starting lead seconds before the line; consecutive lines by the same speaker hold.
export const FOLLOW_PLAN=Object.freeze({establish:1.2,minLine:1.5,transition:1.8,lead:.5});
export function validateDialogue(project){
 project.shots.forEach((s,i)=>{
  if(s.dialogue===undefined)return;
  const p='shots['+i+'].dialogue',x=s.dialogue;
  if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');
  for(const k of Object.keys(x))if(!['listen','turn','cheat','camera'].includes(k))fail(p+'.'+k,'unknown field');
  if(x.camera!==undefined&&(x.camera!=='follow'||s.cameraRig?.framing!=='group'))fail(p+'.camera','follow requires cameraRig.framing group');
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
// GEN-01: an `aim` with `phrase: k` points during narration line k: its window becomes the line's measured bounds
// (progress in the shot, widened by the blend so the arm is up when the line starts). Without a timeline the authored
// start/end stay (estimate). Assets without aim.phrase are returned as they are.
export function phraseAims(s,t){
 if(s?.template!=='cinematic-graph'||!t?.segments||!s.assets.some(a=>a.aim?.phrase!==undefined))return s;
 const n=(t.endFrame-t.startFrame)*1600,base=t.startFrame*1600;
 return {...s,assets:s.assets.map(a=>{const g=a.aim?.phrase===undefined?null:t.segments[a.aim.phrase];if(!g)return a;
  const b=a.aim.blend??0,start=Math.max(0,(g.startSample-base)/n-b),end=Math.min(1,(g.endSample-base)/n+b);
  return end-start>1e-6?{...a,aim:{...a.aim,start:+start.toFixed(6),end:+end.toFixed(6)}}:a;})};
}
// Camera focus entries for dialogue.camera 'follow' from the measured lines of timeline shot t.
export function followPlan(s,t){
 const bound=s.speakerAssets??{},frames=t.endFrame-t.startFrame,seconds=frames/30,n=frames*1600,base=t.startFrame*1600,P=FOLLOW_PLAN,blend=Math.min(.5,P.transition/seconds),out=[];
 for(const g of t.segments){const who=bound[g.speaker??'default'];if(!who||!s.cameraRig.subjects.includes(who)||(g.endSample-g.startSample)/48000<P.minLine)continue;
  if(out.at(-1)?.subject===who)continue;
  let at=Math.max(P.establish/seconds,(g.startSample-base)/n-P.lead/seconds);const prev=out.at(-1);if(prev)at=Math.max(at,prev.at+prev.blend);
  if(at+blend>1)continue;out.push({at:+at.toFixed(6),subject:who,blend:+blend.toFixed(6)});}
 return out;
}
// Returns the shot with generated `face` (single window or chain) on every bound character; unchanged without dialogue.
export function dialogueShot(s,t){
 s=phraseAims(s,t);
 if(!s?.dialogue?.listen||s.template!=='cinematic-graph'||!t?.segments)return s;
 const seconds=(t.endFrame-t.startFrame)/30,turn=s.dialogue.turn??DIALOGUE_LIMITS.defaultTurn,cheat=s.dialogue.cheat??DIALOGUE_LIMITS.defaultCheat;
 const plan=focusPlan(s,t),byId=new Map(s.assets.map(a=>[a.id,a]));
 const follow=s.dialogue.camera==='follow'&&s.cameraRig?.framing==='group'?followPlan(s,t):[];
 return {...s,...(follow.length?{cameraRig:{...s.cameraRig,focus:follow}}:{}),assets:s.assets.map(a=>{
  const list=plan[a.id];if(!list)return a;
  const windows=list.map((f,k)=>{const end=k+1<list.length?list[k+1].at:1,span=Math.max(1e-6,end-f.at);
   const dx=firstX(byId.get(f.target))-firstX(a);
   return {target:f.target,start:+f.at.toFixed(6),end:+end.toFixed(6),blend:k?+Math.min(.5,turn/(span*seconds)).toFixed(6):0,offset:dx===0?0:-Math.sign(dx)*cheat,...(k===list.length-1?{hold:true}:{})};});
  return {...a,face:windows.length===1?{...windows[0],start:0,end:1}:windows};
 })};
}
