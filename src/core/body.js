// TALK-03 body language while talking. A shot with bound speakers (speakerAssets) may opt into
// `bodyLanguage: {beats?, nods?, blinks?, sway?}`. Everything is derived per frame from the measured timeline:
// - beats: the speaker's arm lifts briefly at loudness peaks of the shared speech envelope (measured emphasis peaks,
//   not word-level or forced alignment), with a small head nod;
// - nods: listeners nod as another speaker finishes a phrase;
// - blinks: each bound character blinks on a fixed per-character schedule (hash of its ID);
// - sway: heads of all bound characters tilt slowly and continuously.
// Applied after graph evaluation (head pose keys, blink, additive arm pitch). Beats skip characters that hold props,
// aim, or have authored arm tracks/actions, so attachments and aims never drift. Bounded and deterministic.
import {speakerAt} from './talk.js';
import {smooth} from './motion.js';

const fail=(p,m)=>{throw Error(p+': '+m)};
// Speeds tuned after owner review ("the heads move too fast"): first version peaked ~93°/s on nods and the sway jumped
// when a listener became the speaker. Now: gentle nods (≤ ~30°/s), continuous sway on every bound character.
export const BODY=Object.freeze({beatFrames:18,beatNodFrames:20,minGap:20,peakMin:600,peakRadius:5,beatPitch:.35,beatNod:.05,nodFrames:30,nodLead:10,listenNod:.12,swayAmp:.03,swayPeriod:150,blinkFrames:[.55,.15,.1,.35,.8]});
const KEYS=['beats','nods','blinks','sway'];
const ARM_ACTIONS=['point','wave','reach','grasp','release','carry'];
export function validateBodyLanguage(project){
 project.shots.forEach((s,i)=>{
  if(s.bodyLanguage===undefined)return;
  const p='shots['+i+'].bodyLanguage',x=s.bodyLanguage;
  if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');
  for(const [k,v] of Object.entries(x)){if(!KEYS.includes(k))fail(p+'.'+k,'unknown field');if(typeof v!=='boolean')fail(p+'.'+k,'boolean required');}
  if(!KEYS.some(k=>x[k]===true))fail(p,'enable at least one of beats, nods, blinks, sway');
  if(s.speakerAssets===undefined)fail(p,'speakerAssets required');
 });
}
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
// Rise (40 %) then settle: 0 at u=0 and u=1, 1 at u=.4.
const bump=u=>u<0||u>=1?0:u<.4?smooth(u/.4):1-smooth((u-.4)/.6);
const peakCache=new WeakMap();
// Emphasis peaks: local maxima of the envelope above peakMin, at least minGap frames apart (earliest wins on ties).
export function emphasisPeaks(t){
 let c=peakCache.get(t);if(c)return c;
 const v=t.speechEnvelope?.values??[],out=[],R=BODY.peakRadius;let last=-Infinity;
 for(let f=0;f<v.length;f++){
  if(v[f]<BODY.peakMin||f-last<BODY.minGap)continue;
  let top=true;for(let k=Math.max(0,f-R);k<=Math.min(v.length-1,f+R);k++)if(v[k]>v[f]||(v[k]===v[f]&&k<f)){top=false;break;}
  if(top){out.push(f);last=f;}
 }
 peakCache.set(t,out);return out;
}
export function beatEligible(s,id){
 const a=s.assets.find(x=>x.id===id);if(!a)return false;
 if(a.aim||Object.hasOwn(a.tracks??{},'armPitch')||Object.hasOwn(a.tracks??{},'leftArmPitch')||(a.actions??[]).some(x=>ARM_ACTIONS.includes(x.name)))return false;
 return !s.assets.some(o=>{const w=o.attachment===undefined?[]:Array.isArray(o.attachment)?o.attachment:[o.attachment];return w.some(x=>x.parent===id);});
}
// Per bound character at `frame` of timeline shot `index`: {nod?, tilt?, blink?, beat?}.
export function bodyAt(project,t,frame,index){
 const s=project.shots[index],bl=s?.bodyLanguage;if(!bl||!s.speakerAssets)return null;
 const ts=t.shots[index],out={};
 for(const [sp,id] of Object.entries(s.speakerAssets)){
  const o={};
  // A started beat or nod always finishes (no cut when the speaker changes): gated by the peak's own phrase speaker.
  if(bl.beats&&beatEligible(s,id)){
   const span=Math.max(BODY.beatFrames,BODY.beatNodFrames),p=emphasisPeaks(t).filter(f=>f<=frame&&f>=ts.startFrame&&frame-f<span&&speakerAt(t,index,f)===sp).at(-1);
   if(p!==undefined){const a=bump((frame-p)/BODY.beatFrames),n=bump((frame-p)/BODY.beatNodFrames);if(a>0)o.beat=-BODY.beatPitch*a;if(n>0)o.nod=BODY.beatNod*n;}
  }
  if(bl.nods){
   for(const g of ts.segments){const e=Math.floor(g.endSample/1600),who=s.speakerAssets[g.speaker??'default'];if(who===undefined||who===id)continue;
    const u=(frame-(e-BODY.nodLead))/BODY.nodFrames;if(u>=0&&u<1){o.nod=Math.max(o.nod??0,BODY.listenNod*bump(u));}}
  }
  // Sway on every bound character (continuous across speaker changes).
  if(bl.sway)o.tilt=BODY.swayAmp*Math.sin(2*Math.PI*frame/BODY.swayPeriod+(hash(id)%628)/100);
  if(bl.blinks&&!Object.hasOwn(s.assets.find(x=>x.id===id)?.tracks??{},'blink')){
   const h=hash(id),period=75+h%60,phase=(frame+h%period)%period;o.blink=phase<BODY.blinkFrames.length?BODY.blinkFrames[phase]:1;
  }
  out[id]=o;
 }
 return out;
}
export function applyBody(state,body){
 if(!body)return state;
 for(const a of state.assets){const o=body[a.id];if(!o)continue;const pose={...a.pose};
  if(o.nod!==undefined||o.tilt!==undefined){pose.nod=o.nod??0;pose.tilt=o.tilt??0;}
  if(o.blink!==undefined)pose.blink=o.blink;
  if(o.beat!==undefined)pose.armPitch=Math.max(-2.8,Math.min(1,(pose.armPitch??0)+o.beat));
  a.pose=pose;}
 return state;
}
