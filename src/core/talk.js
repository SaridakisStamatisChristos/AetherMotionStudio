// TALK-01 speaking faces. A shot may bind narration speakers to characters (`speakerAssets: {speakerId: assetId}`).
// The measured narration PCM is reduced once during preparation to a per-frame RMS envelope stored in the shared,
// hashed timeline (`timeline.speechEnvelope`); at render time the active phrase's speaker opens its character's mouth
// by that envelope. Envelope-driven, not phoneme/viseme alignment. Frame-addressed and deterministic.
import {recipeSpec} from '../visual/catalog-rig.js';

const fail=(p,m)=>{throw Error(p+': '+m)};
export const ENVELOPE_VERSION=1;
export const SAMPLES_PER_FRAME=1600;
export function mouthSupported(asset,params){
 const q=recipeSpec(asset);if(!q)return false;
 return q.family==='robot'||(q.family==='human'&&(params?.detail===2||params?.detail===3||params?.detail===4));
}
export function speakerIds(project){return ['default',...Object.keys(project.speech?.speakers??{})];}
export function usesTalk(project){return project.version===2&&project.shots.some(s=>s.speakerAssets!==undefined);}
export function validateSpeakerAssets(project){
 const ids=speakerIds(project);
 project.shots.forEach((s,i)=>{
  if(s.speakerAssets===undefined)return;
  const p='shots['+i+'].speakerAssets',x=s.speakerAssets;
  if(s.template!=='cinematic-graph')fail(p,'cinematic-graph shot required');
  if(!x||typeof x!=='object'||Array.isArray(x)||!Object.keys(x).length)fail(p,'non-empty object required');
  const used=new Set();
  for(const [speaker,id] of Object.entries(x)){
   if(!ids.includes(speaker))fail(p+'.'+speaker,'unknown speaker');
   const a=s.assets.find(y=>y.id===id);
   if(!a)fail(p+'.'+speaker,'asset ID in this shot required');
   if(!mouthSupported(a.asset,a.params))fail(p+'.'+speaker,'asset has no mouth (detail-2/3 human or catalog robot required)');
   if(used.has(id))fail(p+'.'+speaker,'one speaker per character');used.add(id);
  }
 });
}
// GEN-10 opt-in estimated mouth shapes (speech.mouths 'visemes-v1'): one code per frame in timeline.visemes, made in
// preparation from the speech model's own phonemizer with ESTIMATED timing (scripts/visemes.py). Never lip-sync or
// forced alignment. Loudness still sets how far the mouth opens; the shape scales it and sets the mouth width.
export const VISEMES=Object.freeze({version:'viseme-estimated-v1',codes:'XMFEAO',
 shapes:Object.freeze({X:{open:1,width:1},M:{open:0,width:1},F:{open:.25,width:1.05},E:{open:.6,width:1.25},A:{open:1,width:1},O:{open:.8,width:.62}})});
// GPU-06 opt-in measured mouth shapes (speech.mouths 'rhubarb-v1', owner-approved Rhubarb Lip Sync, tools-lock.json):
// the same codes, timed from the spoken audio itself (scripts/visemes_rhubarb.py). Each mode has its own version and timing.
export const MOUTH_MODES=Object.freeze({'visemes-v1':Object.freeze({version:VISEMES.version,timing:'estimated'}),'rhubarb-v1':Object.freeze({version:'viseme-rhubarb-v1',timing:'measured'})});
export function usesVisemes(project){return Object.hasOwn(MOUTH_MODES,project.speech?.mouths??'')&&usesTalk(project);}
export function validateVisemes(project,t){
 const v=t.visemes;
 if(v===undefined){if(usesVisemes(project))fail('timeline.visemes','required when speech.mouths is '+project.speech.mouths+' and a shot binds speakerAssets');return;}
 if(!usesVisemes(project))fail('timeline.visemes','speech.mouths visemes-v1 and bound speakers required');
 if(!v||typeof v!=='object'||Array.isArray(v))fail('timeline.visemes','object required');
 for(const k of Object.keys(v))if(!['version','phonemizer','timing','values'].includes(k))fail('timeline.visemes.'+k,'unknown field');
 const m=MOUTH_MODES[project.speech.mouths];if(v.version!==m.version||v.timing!==m.timing)fail('timeline.visemes','unsupported version or timing');
 if(typeof v.phonemizer!=='string'||!v.phonemizer||v.phonemizer.length>80)fail('timeline.visemes.phonemizer','name required');
 if(typeof v.values!=='string'||v.values.length!==t.durationFrames||![...v.values].every(c=>VISEMES.codes.includes(c)))fail('timeline.visemes.values','one code (XMFEAO) per frame required');
}
export function validateEnvelope(project,t){
 const e=t.speechEnvelope;
 if(e===undefined){if(usesTalk(project))fail('timeline.speechEnvelope','required when a shot binds speakerAssets');return;}
 if(!e||typeof e!=='object'||Array.isArray(e))fail('timeline.speechEnvelope','object required');
 for(const k of Object.keys(e))if(!['version','unit','values'].includes(k))fail('timeline.speechEnvelope.'+k,'unknown field');
 if(e.version!==ENVELOPE_VERSION||e.unit!=='permille-rms')fail('timeline.speechEnvelope','unsupported envelope');
 if(!Array.isArray(e.values)||e.values.length!==t.durationFrames)fail('timeline.speechEnvelope.values','one value per frame required');
 for(const v of e.values)if(!Number.isInteger(v)||v<0||v>1000)fail('timeline.speechEnvelope.values','integers 0–1000 required');
}
// Speaker of the phrase sounding at the centre of `frame` in timeline shot `t.shots[index]`, or null in a pause.
export function speakerAt(t,index,frame){
 const c=frame*SAMPLES_PER_FRAME+SAMPLES_PER_FRAME/2;
 for(const g of t.shots[index].segments)if(c>=g.startSample&&c<g.endSample)return g.speaker??'default';
 return null;
}
// Mouth openness per bound asset at `frame` (0 for bound characters that are not speaking). Light 1-2-1 smoothing.
export function talkAt(project,t,frame,index){
 const s=project.shots[index];if(!s?.speakerAssets||!t.speechEnvelope)return null;
 const v=t.speechEnvelope.values,at=f=>v[Math.max(0,Math.min(v.length-1,f))];
 const level=Math.min(1,(at(frame-1)+2*at(frame)+at(frame+1))/4000),speaker=speakerAt(t,index,frame),out={};
 const shape=t.visemes&&Object.hasOwn(MOUTH_MODES,project.speech?.mouths??'')?visemeAt(t,frame):null;
 for(const [sp,id] of Object.entries(s.speakerAssets)){
  if(!shape){out[id]=sp===speaker?Math.round(level*1000)/1000:0;continue;}
  out[id]=sp===speaker?{mouth:Math.round(level*shape.open*1000)/1000,width:shape.width}:{mouth:0,width:1};
 }
 return out;
}
// GEN-10: open factor and width at a frame, 1-2-1 smoothed over neighbouring frames (calm shape changes).
export function visemeAt(t,frame){
 const v=t.visemes.values,at=f=>VISEMES.shapes[v[Math.max(0,Math.min(v.length-1,f))]];
 const a=at(frame-1),b=at(frame),c=at(frame+1),r=x=>Math.round(x*1000)/1000;
 // a closure (M) is held at its own frame: lips meet even when the neighbours are open
 return {open:b.open===0?0:r((a.open+2*b.open+c.open)/4),width:r((a.width+2*b.width+c.width)/4)};
}
// Applies talk values to an evaluated graph state (pose.mouth on bound assets only).
export function applyTalk(state,talk){
 if(!talk)return state;
 for(const a of state.assets)if(Object.hasOwn(talk,a.id)){const v=talk[a.id];a.pose=typeof v==='number'?{...a.pose,mouth:v}:{...a.pose,mouth:v.mouth,mouthWidth:v.width};}
 return state;
}
