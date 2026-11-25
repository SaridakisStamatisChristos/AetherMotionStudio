// TALK-03 body language while talking. A shot with bound speakers (speakerAssets) may opt into
// `bodyLanguage: {beats?, nods?, blinks?, sway?}`. Everything is derived per frame from the measured timeline:
// - beats: at most one per line: the speaker's arm lifts briefly at the line's loudest frame of the shared speech
//   envelope (measured emphasis, not word-level or forced alignment);
// - nods: only the addressee (whom the speaker is looking at) nods as a line ends, at most once per 4 s;
// - blinks: each bound character blinks on a fixed per-character schedule (hash of its ID);
// - sway: heads of all bound characters tilt slowly and continuously.
// Applied after graph evaluation (head pose keys, blink, additive arm pitch). Beats skip characters that hold props,
// aim, or have authored arm tracks/actions, so attachments and aims never drift. Bounded and deterministic.
import {speakerAt} from './talk.js';
import {focusPlan} from './dialogue.js';
import {smooth} from './motion.js';
import {recipeSpec} from '../visual/catalog-rig.js';

const fail=(p,m)=>{throw Error(p+': '+m)};
// Speeds tuned after owner review ("the heads move too fast"): first version peaked ~93°/s on nods and the sway jumped
// when a listener became the speaker. Now: gentle nods (≤ ~30°/s), continuous sway on every bound character.
// Second owner review ("too many movements and nods"): r2 had 8–9 nods and 4–5 beats per character in 17 s. Now a
// per-shot event plan: at most one arm beat per line (its loudest frame, lines ≥ beatMinPhrase frames), no head nod on
// beats, and only the addressee nods as a line ends, at most once per nodMinGap frames.
// Third owner review ("still a bit much movement, especially nodding"): smaller nods (0.07 rad), at most one per
// character per 8 s, none from an addressee who replies next (the reply acknowledges), and half the sway.
// GEN-11 opt-in weight shift (bodyLanguage.weight): each bound character stands on one leg for 6–9 s (per-character
// schedule from its ID), then moves its hips over the other foot in 1.5 s. Lean ±0.022 rad about the ground point,
// peak ≈ 2.5°/s: calm, below every motion limit.
export const WEIGHT=Object.freeze({amp:.022,holdMin:180,holdSpread:90,move:45});
export const BODY=Object.freeze({beatFrames:18,beatMinPhrase:45,minGap:20,peakMin:600,peakRadius:5,beatPitch:.35,nodFrames:30,nodLead:10,nodMinGap:240,listenNod:.07,swayAmp:.015,swayPeriod:150,blinkFrames:[.55,.15,.1,.35,.8]});
const KEYS=['beats','nods','blinks','sway','weight'];
const ARM_ACTIONS=['point','wave','reach','grasp','release','carry'];
export function validateBodyLanguage(project){
 project.shots.forEach((s,i)=>{
  if(s.bodyLanguage===undefined)return;
  const p='shots['+i+'].bodyLanguage',x=s.bodyLanguage;
  if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');
  for(const [k,v] of Object.entries(x)){if(!KEYS.includes(k))fail(p+'.'+k,'unknown field');if(typeof v!=='boolean')fail(p+'.'+k,'boolean required');}
  if(!KEYS.some(k=>x[k]===true))fail(p,'enable at least one of beats, nods, blinks, sway, weight');
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
const planCache=new WeakMap();
// Per-shot event plan from the measured timeline: beats [{id, frame}] and nods [{id, frame}] (frame = motion start).
export function bodyPlan(project,t,index){
 let byShot=planCache.get(t);if(!byShot){byShot=new Map();planCache.set(t,byShot);}
 if(byShot.has(index))return byShot.get(index);
 const s=project.shots[index],ts=t.shots[index],v=t.speechEnvelope?.values??[],beats=[],nods=[],lastNod={};
 const focus=focusPlan({...s,durationFrames:ts.endFrame-ts.startFrame},ts),n=(ts.endFrame-ts.startFrame)*1600,base=ts.startFrame*1600;
 for(const [k,g] of ts.segments.entries()){
  const who=s.speakerAssets[g.speaker??'default'];if(who===undefined)continue;
  const a=Math.ceil(g.startSample/1600),e=Math.floor(g.endSample/1600);
  if(e-a>=BODY.beatMinPhrase&&beatEligible(s,who)){let best=-1;for(let f=a;f<e;f++)if(best<0||(v[f]??0)>(v[best]??0))best=f;if(best>=0&&(v[best]??0)>=BODY.peakMin)beats.push({id:who,frame:best});}
  const at=(g.startSample-base)/n,addressee=(focus[who]??[]).filter(x=>x.at<=at+1e-9).at(-1)?.target;
  const next=ts.segments[k+1],replies=next!==undefined&&s.speakerAssets[next.speaker??'default']===addressee;
  const start=e-BODY.nodLead;if(addressee&&addressee!==who&&!replies&&(lastNod[addressee]===undefined||start-lastNod[addressee]>=BODY.nodMinGap)){nods.push({id:addressee,frame:start});lastNod[addressee]=start;}
 }
 const plan={beats,nods};byShot.set(index,plan);return plan;
}
export function bodyAt(project,t,frame,index){
 const s=project.shots[index],bl=s?.bodyLanguage;if(!bl||!s.speakerAssets)return null;
 const out={},plan=bodyPlan(project,t,index);
 for(const [sp,id] of Object.entries(s.speakerAssets)){
  const o={};
  // Started beats and nods always finish (no cut when the speaker changes).
  if(bl.beats)for(const x of plan.beats){if(x.id!==id)continue;const a=bump((frame-x.frame)/BODY.beatFrames);if(a>0)o.beat=-BODY.beatPitch*a;}
  if(bl.nods)for(const x of plan.nods){if(x.id!==id)continue;const u=bump((frame-x.frame)/BODY.nodFrames);if(u>0)o.nod=Math.max(o.nod??0,BODY.listenNod*u);}
  // Sway on every bound character (continuous across speaker changes).
  if(bl.sway)o.tilt=BODY.swayAmp*Math.sin(2*Math.PI*frame/BODY.swayPeriod+(hash(id)%628)/100);
  if(bl.weight&&weightEligible(s,id))o.hip=weightAt(id,frame);
  if(bl.blinks&&!Object.hasOwn(s.assets.find(x=>x.id===id)?.tracks??{},'blink')){
   const h=hash(id),period=75+h%60,phase=(frame+h%period)%period;o.blink=phase<BODY.blinkFrames.length?BODY.blinkFrames[phase]:1;
  }
  out[id]=o;
 }
 return out;
}
// GEN-11: hip lean at a frame (deterministic per character ID; continuous, smooth moves between the two sides).
export function weightAt(id,frame){
 const h=hash(id+'/weight'),period=WEIGHT.holdMin+h%WEIGHT.holdSpread,t=Math.max(0,frame+h%period),k=Math.floor(t/period),u=t-k*period;
 const side=k%2?1:-1,from=k===0&&u<WEIGHT.move?0:-side,v=u<WEIGHT.move?from+(side-from)*smooth(u/WEIGHT.move):side;
 return Math.round(WEIGHT.amp*v*1e5)/1e5;
}
// Weight shifts only for human and robot rigs that stand (no x/z tracks or walking): walkers already move their hips.
function weightEligible(s,id){
 const a=s.assets.find(x=>x.id===id);if(!a)return false;
 const fam=recipeSpec(a.asset)?.family;if(fam!=='human'&&fam!=='robot')return false;
 const moves=k=>{const tr=a.tracks?.[k];return Array.isArray(tr)&&tr.some(q=>q[1]!==tr[0][1]);};
 return !moves('x')&&!moves('z')&&!a.tracks?.walking;
}
export function applyBody(state,body){
 if(!body)return state;
 for(const a of state.assets){const o=body[a.id];if(!o)continue;const pose={...a.pose};
  if(o.nod!==undefined||o.tilt!==undefined){pose.nod=o.nod??0;pose.tilt=o.tilt??0;}
  if(o.blink!==undefined)pose.blink=o.blink;
  if(o.hip!==undefined)pose.hip=o.hip;
  if(o.beat!==undefined)pose.armPitch=Math.max(-2.8,Math.min(1,(pose.armPitch??0)+o.beat));
  a.pose=pose;}
 return state;
}
