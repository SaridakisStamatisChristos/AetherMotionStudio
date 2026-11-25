import {VOICES} from './contract.js';
import {fields,finite,choice,literal} from './cinematography.js';
export const VOICE_METADATA=Object.freeze(VOICES.map(id=>Object.freeze({id,language:id.startsWith('b')?'en-gb':'en-us',engine:'kokoro-onnx'})));
const fail=(p,m)=>{throw Error(p+': '+m)};
const words=s=>s.trim().split(/\s+/);
const norm=s=>words(s).join(' ');
const int=(v,a,b,p)=>{if(!Number.isSafeInteger(v)||v<a||v>b)fail(p,'integer out of range');};
function arr(x,max,p){if(!Array.isArray(x)||x.length>max)fail(p,'invalid array');}
const bool=(x,p)=>{if(typeof x!=='boolean')fail(p,'boolean required');};
const map=(x,p,max)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length>max)fail(p,'invalid mapping');};
export function validateSpeechConfig(c,shots=null){
 fields(c,['version','targetFrames','fixedShots','speakers','shotSpeakers','pronunciations','captions','mix','cues','syncActions','placement'],'speech',['version','targetFrames','fixedShots','speakers','shotSpeakers','pronunciations','captions','mix','cues','syncActions']);
 // POLISH-03 opt-ins: placement of narration inside shots, and mastering profile mix-v2 inside speech.mix.
 if(c.placement!==undefined&&!['center','lead'].includes(c.placement))fail('speech.placement','center or lead required');
 if(c.version!==1)fail('speech.version','unsupported');int(c.targetFrames,180,9000,'speech.targetFrames');
 const ids=shots?new Map(shots.map(s=>[s.id,s])):null;
 const shotId=(id,p)=>{if(!/^[a-z0-9][a-z0-9-]{0,47}$/.test(id)||['constructor','prototype'].includes(id)||ids&&!ids.has(id))fail(p,'unknown or unsafe shot');};
 map(c.fixedShots,'fixedShots',60);let fixed=0;
 for(const [id,n] of Object.entries(c.fixedShots)){shotId(id,'fixedShots');int(n,60,3600,'fixed duration');fixed+=n;if(ids&&ids.get(id).durationFrames!==n)fail('fixedShots','authored duration mismatch');}
 if(fixed>c.targetFrames)fail('fixedShots','budget exceeded');
 if(ids){const auto=shots.length-Object.keys(c.fixedShots).length;if(fixed+60*auto>c.targetFrames||fixed+3600*auto<c.targetFrames)fail('speech','target infeasible');for(const s of shots)if(s.narration.some(t=>words(t).some(w=>Array.from(w).length>32)))fail('speech','word exceeds caption line limit');}
 map(c.speakers,'speakers',8);for(const [id,s] of Object.entries(c.speakers)){
  if(!/^[a-z][a-z0-9-]{0,31}$/.test(id)||['constructor','prototype'].includes(id))fail('speaker','unsafe ID');
  fields(s,['name','voice','language'],'speaker',['name','voice','language']);literal(s.name,24,'speaker.name');
  if(/[<>&]/.test(s.name))fail('speaker.name','markup forbidden');choice(s.voice,VOICES,'speaker.voice');choice(s.language,['en-us','en-gb'],'speaker.language');
  if(VOICE_METADATA.find(v=>v.id===s.voice).language!==s.language)fail('speaker','voice/language mismatch');
 }
 map(c.shotSpeakers,'shotSpeakers',60);
 for(const [id,v] of Object.entries(c.shotSpeakers)){shotId(id,'shotSpeakers');arr(v,8,'shotSpeakers');if(!v.length||ids&&v.length!==ids.get(id).narration.length||v.some(k=>!Object.hasOwn(c.speakers,k)))fail('shotSpeakers','unknown speaker or phrase count mismatch');}
 map(c.pronunciations,'pronunciations',64);for(const [k,v] of Object.entries(c.pronunciations)){if(!/^[A-Za-z0-9][A-Za-z0-9'-]{0,31}$/.test(k)||['constructor','prototype'].includes(k))fail('pronunciations','invalid token');if(typeof v!=='string'||!/^[A-Za-z0-9][A-Za-z0-9 ',-]{0,79}$/.test(v))fail('pronunciations','invalid replacement');}
 fields(c.captions,['mode','highlight','maxChars','maxLines','maxCps'],'captions',['mode','highlight','maxChars','maxLines','maxCps']);choice(c.captions.mode,['burn-in','sidecar','both'],'captions.mode');bool(c.captions.highlight,'captions.highlight');int(c.captions.maxChars,24,36,'captions.maxChars');int(c.captions.maxLines,1,2,'captions.maxLines');int(c.captions.maxCps,12,24,'captions.maxCps');
 if(ids&&shots.some(s=>s.narration.some(t=>words(t).some(w=>Array.from(w).length>c.captions.maxChars))))fail('captions','word exceeds configured line limit');
 fields(c.mix,['narration','music','ambience','sfx','duck','fadeSeconds','peak','master'],'mix',['narration','music','ambience','sfx','duck','fadeSeconds','peak']);
 if(c.mix.master!==undefined&&c.mix.master!=='mix-v2')fail('mix.master','mix-v2 required');
 for(const k of ['narration','music','ambience','sfx','duck'])finite(c.mix[k],0,1,'mix.'+k);finite(c.mix.fadeSeconds,0,.5,'mix.fadeSeconds');finite(c.mix.peak,.5,.98,'mix.peak');
 if(c.mix.narration<.2)fail('mix.narration','narration gain must be at least .2');
 arr(c.cues,120,'cues');for(const x of c.cues){fields(x,['shot','anchor','phrase','type','gain'],'cue',['shot','anchor','type','gain']);shotId(x.shot,'cue.shot');choice(x.anchor,['shot-start','speech-start','speech-end'],'cue.anchor');choice(x.type,['chime','whoosh','tick'],'cue.type');finite(x.gain,0,1,'cue.gain');if(x.anchor==='shot-start'){if(x.phrase!==undefined)fail('cue','phrase not allowed');}else int(x.phrase,0,ids?ids.get(x.shot).narration.length-1:7,'cue.phrase');}
 bool(c.syncActions,'syncActions');return c;
}
export function speakerFor(c,shot,i,voice){const id=c.shotSpeakers[shot]?.[i];return id?{id,...c.speakers[id]}:{id:'default',name:'Narrator',voice,language:voice.startsWith('b')?'en-gb':'en-us'};}
export function validateSpeechTimeline(scene,t){
 if(!scene.speech){if(t.captions!==undefined||t.alignment!==undefined||t.shots.some(s=>s.segments.some(x=>x.speaker!==undefined||x.voice!==undefined||x.language!==undefined)))fail('timeline','speech config required');return;}
 const c=scene.speech;
 if(t.durationFrames!==c.targetFrames||t.alignment!=='estimated-word/measured-phrase')fail('timeline','speech target or alignment mismatch');
 if(!Array.isArray(t.captions)||t.captions.length>12000)fail('captions','invalid cue array');
 const segments=t.shots.flatMap(s=>s.segments),groups=segments.map(()=>[]);let previous=0;
 for(const s of t.shots)for(const [i,a] of s.segments.entries()){
  const expected=speakerFor(c,s.id,i,scene.voice);
  if(a.speaker!==expected.id||a.voice!==expected.voice||a.language!==expected.language)fail('speech','speaker binding mismatch');
 }
 for(const x of t.captions){
  fields(x,['phrase','speaker','startSample','endSample','lines','words'],'caption',['phrase','speaker','startSample','endSample','lines','words']);
  int(x.phrase,0,segments.length-1,'caption.phrase');const a=segments[x.phrase];
  int(x.startSample,Math.max(previous,a.startSample),a.endSample-1,'caption.start');int(x.endSample,x.startSample+1,a.endSample,'caption.end');
  if(x.speaker!==a.speaker)fail('caption','speaker mismatch');
  arr(x.lines,c.captions.maxLines,'caption.lines');if(!x.lines.length||x.lines.some(l=>typeof l!=='string'||!l.trim()||Array.from(l).length>c.captions.maxChars||/[\u0000-\u001f\u007f]/.test(l)))fail('caption','invalid lines');
  arr(x.words,180,'caption.words');if(!x.words.length)fail('caption','empty words');
  let cursor=x.startSample;for(const w of x.words){fields(w,['text','startSample','endSample'],'word',['text','startSample','endSample']);literal(w.text,c.captions.maxChars,'word.text');if(/\s/.test(w.text)||w.startSample!==cursor)fail('word','invalid token or gap');int(w.endSample,cursor+1,x.endSample,'word.end');cursor=w.endSample;}
  if(cursor!==x.endSample||x.words.map(w=>w.text).join(' ')!==x.lines.join(' '))fail('caption','word coverage mismatch');
  groups[x.phrase].push(x);previous=x.endSample;
 }
 for(const [i,a] of segments.entries()){
  const xs=groups[i];let cursor=a.startSample;
  for(const x of xs){if(x.startSample!==cursor)fail('caption','phrase coverage gap');cursor=x.endSample;}
  if(!xs.length||cursor!==a.endSample||xs.flatMap(x=>x.words.map(w=>w.text)).join(' ')!==norm(a.text))fail('caption','phrase coverage mismatch');
 }
}
export function cueAt(t,frame){
 if(!t.captions)return null;
 const sample=frame*1600+800;let lo=0,hi=t.captions.length;
 while(lo<hi){const m=(lo+hi)>>1;if(t.captions[m].endSample<=sample)lo=m+1;else hi=m;}
 const cue=t.captions[lo];return cue&&cue.startSample<=sample?{cue,active:cue.words.findIndex(w=>w.startSample<=sample&&sample<w.endSample)}:null;
}
export function speechDrivenShot(s,t,c){
 if(!c?.syncActions||s.template!=='cinematic-graph'||s.continuity||s.assets.some(a=>a.attachment)||!t.segments.length)return s;
 const n=(t.endFrame-t.startFrame)*1600,base=t.startFrame*1600,a=(t.segments[0].startSample-base)/n,b=(t.segments.at(-1).endSample-base)/n;
 if(b-a<.1)return s;
 return {...s,assets:s.assets.map(o=>({...o,...(o.actions?{actions:o.actions.map(x=>({...x,start:a+x.start*(b-a),end:a+x.end*(b-a)}))}:{})}))};
}
