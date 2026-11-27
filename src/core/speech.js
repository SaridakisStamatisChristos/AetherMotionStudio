import {VOICES} from './contract.js';
import {fields,finite,choice,literal} from './cinematography.js';
// DUAL-06 caption styles for burned-in captions (box-v1 = the historical dark box). Text and highlight contrast
// against the box: at least 4.5:1, and 7:1 for contrast-v1 (tests/themes.test.js).
export const CAPTION_STYLES=Object.freeze({
 'box-v1':Object.freeze({fill:'rgba(5,15,28,.94)',solid:'#050f1c',edge:'#567485',edgeWidth:2,text:'#f5f9ff',highlight:'#ffd47a',speaker:'#9bdef3'}),
 'paper-v1':Object.freeze({fill:'rgba(250,246,236,.96)',solid:'#faf6ec',edge:'#c7b994',edgeWidth:2,text:'#1b2129',highlight:'#a3401b',speaker:'#2f4a96'}),
 'contrast-v1':Object.freeze({fill:'rgba(0,0,0,.97)',solid:'#000000',edge:'#ffffff',edgeWidth:3,text:'#ffffff',highlight:'#ffe14d',speaker:'#9fe6ff'})
});
export const SOUNDTRACKS=Object.freeze(['mix','silent']);
export const VOICE_METADATA=Object.freeze(VOICES.map(id=>Object.freeze({id,language:id.startsWith('b')?'en-gb':'en-us',engine:'kokoro-onnx'})));
const fail=(p,m)=>{throw Error(p+': '+m)};
export const SPEECH_PACE=Object.freeze({min:.85,dialogue:.92});
const words=s=>s.trim().split(/\s+/);
const norm=s=>words(s).join(' ');
const int=(v,a,b,p)=>{if(!Number.isSafeInteger(v)||v<a||v>b)fail(p,'integer out of range');};
function arr(x,max,p){if(!Array.isArray(x)||x.length>max)fail(p,'invalid array');}
const bool=(x,p)=>{if(typeof x!=='boolean')fail(p,'boolean required');};
const map=(x,p,max)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length>max)fail(p,'invalid mapping');};
export function validateSpeechConfig(c,shots=null){
 fields(c,['version','targetFrames','fixedShots','speakers','shotSpeakers','pronunciations','captions','mix','cues','syncActions','placement','pace','mouths','fit','soundtrack'],'speech',['version','targetFrames','fixedShots','speakers','shotSpeakers','pronunciations','captions','mix','cues','syncActions']);
 // POLISH-03 opt-ins: placement of narration inside shots, and mastering profile mix-v2 inside speech.mix.
 if(c.placement!==undefined&&!['center','lead'].includes(c.placement))fail('speech.placement','center or lead required');
 // DUAL-06 explicit silent soundtrack: narration still sets timing and captions; the delivered audio is declared
 // digital silence and every check treats it as requested silence, never as a speech failure.
 if(c.soundtrack!==undefined&&!SOUNDTRACKS.includes(c.soundtrack))fail('speech.soundtrack',SOUNDTRACKS.join(' or ')+' or absent');
 // GEN-05 opt-in: starting Kokoro speed below 1 (slightly slower, easier-to-read speech). Absent = 1 (unchanged).
 if(c.pace!==undefined)finite(c.pace,SPEECH_PACE.min,1,'speech.pace');
 // GEN-10 opt-in estimated mouth shapes for bound speakers (src/core/talk.js VISEMES, scripts/visemes.py)
 if(c.mouths!==undefined&&c.mouths!=='visemes-v1')fail('speech.mouths','visemes-v1 or absent required');
 // Fix A opt-in: 'speech-v1' = the film is as long as the measured speech plus calm pauses, at most targetFrames
 // (scripts/speech_plan.py fit_target); 'none' or absent = exactly targetFrames (unchanged).
 if(c.fit!==undefined&&!SPEECH_FIT.includes(c.fit))fail('speech.fit','speech-v1, none or absent required');
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
 fields(c.captions,['mode','highlight','maxChars','maxLines','maxCps','readable','speakerNames','style'],'captions',['mode','highlight','maxChars','maxLines','maxCps']);
 // DUAL-06 opt-in burned-in caption style (absent = box-v1, the historical look).
 if(c.captions.style!==undefined&&!Object.hasOwn(CAPTION_STYLES,c.captions.style))fail('captions.style',Object.keys(CAPTION_STYLES).join(', ')+' or absent');
 // GEN-05b opt-in: balanced cue splits and a short hold into the following pause (scripts/speech_plan.py caption_cues)
 if(c.captions.readable!==undefined&&c.captions.readable!==true)fail('captions.readable','true or absent required');
 // Owner (Studio checkbox "Speaker names in captions"): false hides the speaker name above burned-in captions and in
 // the .srt/.vtt sidecars; absent = names whenever a film has more than one speaker (unchanged).
 if(c.captions.speakerNames!==undefined&&c.captions.speakerNames!==false)fail('captions.speakerNames','false or absent required');choice(c.captions.mode,['burn-in','sidecar','both'],'captions.mode');bool(c.captions.highlight,'captions.highlight');int(c.captions.maxChars,24,36,'captions.maxChars');int(c.captions.maxLines,1,2,'captions.maxLines');int(c.captions.maxCps,12,24,'captions.maxCps');
 if(ids&&shots.some(s=>s.narration.some(t=>words(t).some(w=>Array.from(w).length>c.captions.maxChars))))fail('captions','word exceeds configured line limit');
 fields(c.mix,['narration','music','ambience','sfx','duck','fadeSeconds','peak','master'],'mix',['narration','music','ambience','sfx','duck','fadeSeconds','peak']);
 if(c.mix.master!==undefined&&c.mix.master!=='mix-v2')fail('mix.master','mix-v2 required');
 for(const k of ['narration','music','ambience','sfx','duck'])finite(c.mix[k],0,1,'mix.'+k);finite(c.mix.fadeSeconds,0,.5,'mix.fadeSeconds');finite(c.mix.peak,.5,.98,'mix.peak');
 if(c.mix.narration<.2)fail('mix.narration','narration gain must be at least .2');
 arr(c.cues,120,'cues');for(const x of c.cues){fields(x,['shot','anchor','phrase','type','gain'],'cue',['shot','anchor','type','gain']);shotId(x.shot,'cue.shot');choice(x.anchor,['shot-start','speech-start','speech-end'],'cue.anchor');choice(x.type,['chime','whoosh','tick'],'cue.type');finite(x.gain,0,1,'cue.gain');if(x.anchor==='shot-start'){if(x.phrase!==undefined)fail('cue','phrase not allowed');}else int(x.phrase,0,ids?ids.get(x.shot).narration.length-1:7,'cue.phrase');}
 bool(c.syncActions,'syncActions');return c;
}
export const SPEECH_FIT=Object.freeze(['speech-v1','none']);
// Exact target without fit; with fit 'speech-v1' any whole length from 180 frames (6 s) up to the target.
export function fitsTarget(c,frames){return c.fit==='speech-v1'?Number.isSafeInteger(frames)&&frames>=180&&frames<=c.targetFrames:frames===c.targetFrames;}
export function speakerFor(c,shot,i,voice){const id=c.shotSpeakers[shot]?.[i];return id?{id,...c.speakers[id]}:{id:'default',name:'Narrator',voice,language:voice.startsWith('b')?'en-gb':'en-us'};}
export function validateSpeechTimeline(scene,t){
 if(!scene.speech){if(t.captions!==undefined||t.alignment!==undefined||t.shots.some(s=>s.segments.some(x=>x.speaker!==undefined||x.voice!==undefined||x.language!==undefined)))fail('timeline','speech config required');return;}
 const c=scene.speech;
 if(!fitsTarget(c,t.durationFrames)||t.alignment!=='estimated-word/measured-phrase')fail('timeline','speech target or alignment mismatch');
 if(!Array.isArray(t.captions)||t.captions.length>12000)fail('captions','invalid cue array');
 const segments=t.shots.flatMap(s=>s.segments),groups=segments.map(()=>[]);let previous=0;
 for(const s of t.shots)for(const [i,a] of s.segments.entries()){
  const expected=speakerFor(c,s.id,i,scene.voice);
  if(a.speaker!==expected.id||a.voice!==expected.voice||a.language!==expected.language)fail('speech','speaker binding mismatch');
 }
 for(const x of t.captions){
  fields(x,['phrase','speaker','startSample','endSample','lines','words','holdSample'],'caption',['phrase','speaker','startSample','endSample','lines','words']);
  int(x.phrase,0,segments.length-1,'caption.phrase');const a=segments[x.phrase];
  int(x.startSample,Math.max(previous,a.startSample),a.endSample-1,'caption.start');int(x.endSample,x.startSample+1,a.endSample,'caption.end');
  if(x.speaker!==a.speaker)fail('caption','speaker mismatch');
  arr(x.lines,c.captions.maxLines,'caption.lines');if(!x.lines.length||x.lines.some(l=>typeof l!=='string'||!l.trim()||Array.from(l).length>c.captions.maxChars||/[\u0000-\u001f\u007f]/.test(l)))fail('caption','invalid lines');
  arr(x.words,180,'caption.words');if(!x.words.length)fail('caption','empty words');
  let cursor=x.startSample;for(const w of x.words){fields(w,['text','startSample','endSample'],'word',['text','startSample','endSample']);literal(w.text,c.captions.maxChars,'word.text');if(/\s/.test(w.text)||w.startSample!==cursor)fail('word','invalid token or gap');int(w.endSample,cursor+1,x.endSample,'word.end');cursor=w.endSample;}
  if(cursor!==x.endSample||x.words.map(w=>w.text).join(' ')!==x.lines.join(' '))fail('caption','word coverage mismatch');
  // GEN-05b: a readable caption may stay shown into the pause after its phrase (≤ 1 s), never into the next caption
  if(x.holdSample!==undefined){if(!c.captions.readable)fail('caption.hold','captions.readable required');int(x.holdSample,x.endSample+1,Math.min(x.endSample+48000,t.durationFrames*1600),'caption.hold');}
  if(x.holdSample!==undefined&&x.startSample<previous)fail('caption.hold','overlaps the previous caption');
  groups[x.phrase].push(x);previous=x.holdSample??x.endSample;
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
 while(lo<hi){const m=(lo+hi)>>1;if((t.captions[m].holdSample??t.captions[m].endSample)<=sample)lo=m+1;else hi=m;}
 const cue=t.captions[lo];return cue&&cue.startSample<=sample?{cue,active:cue.words.findIndex(w=>w.startSample<=sample&&sample<w.endSample)}:null;
}
export function speechDrivenShot(s,t,c){
 if(!c?.syncActions||s.template!=='cinematic-graph'||s.continuity||s.assets.some(a=>a.attachment)||!t.segments.length)return s;
 const n=(t.endFrame-t.startFrame)*1600,base=t.startFrame*1600,a=(t.segments[0].startSample-base)/n,b=(t.segments.at(-1).endSample-base)/n;
 if(b-a<.1)return s;
 return {...s,assets:s.assets.map(o=>({...o,...(o.actions?{actions:o.actions.map(x=>({...x,start:a+x.start*(b-a),end:a+x.end*(b-a)}))}:{})}))};
}
