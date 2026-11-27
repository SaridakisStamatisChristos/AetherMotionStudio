import {FORMAT,TEMPLATES,VOICES,validateScene} from './contract.js';
import {validateGraph} from './graph.js';
import {validateFormat} from './formats.js';
import {continuityLedger} from './identity.js';
import {validateSpeechConfig,validateSpeechTimeline} from './speech.js';
import {validateSpeakerAssets,validateEnvelope,validateVisemes} from './talk.js';
import {validateDialogue} from './dialogue.js';
import {validateBodyLanguage} from './body.js';
export const FPS=30,SAMPLE_RATE=48000,SAMPLES_PER_FRAME=1600,MAX_FRAMES=9000,MAX_SHOT=3600;
export const CHAPTERS=Object.freeze(['transactions','blocks','hashes','network','verification']);
const fail=(p,m)=>{throw Error(p+': '+m)};
function fields(x,keys,p,optional=[]){if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');for(const k of Object.keys(x))if(!keys.includes(k)&&!optional.includes(k))fail(p+'.'+k,'unknown field');for(const k of keys)if(!Object.hasOwn(x,k))fail(p+'.'+k,'required');}
function str(x,p,max){if(typeof x!=='string'||!x.trim()||x.length>max||/[\u0000-\u001f\u007f]/.test(x))fail(p,'invalid text');}
function integer(x,min,max,p){if(!Number.isSafeInteger(x)||x<min||x>max)fail(p,'integer out of range');}
function slug(x,p){if(typeof x!=='string'||!/^[a-z0-9][a-z0-9-]{0,47}$/.test(x)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(x))fail(p,'unsafe ID');}
export function validateProject(s){
 if(s?.version===1)return validateScene(s);
 fields(s,['version','id','title','voice','shots'],'film',['identityLibrary','speech','audio','delivery','format']);
 // GEN-09 opt-in delivery layout (src/core/reels.js); absent = the historical layout.
 if(s.delivery!==undefined&&s.delivery!=='reels-v1')fail('film.delivery','reels-v1 or absent');
 if(s.version!==2)fail('version','only 1 or 2 supported');
 // POLISH-02 item 8: opt-in mastering profile for the timeline mixer (speech projects keep their own mix contract).
 if(s.audio!==undefined){if(!s.audio||typeof s.audio!=='object'||Array.isArray(s.audio))fail('audio','object required');const ks=Object.keys(s.audio);if(!ks.length)fail('audio','master or placement required');for(const k of ks)if(!['master','placement'].includes(k))fail('audio.'+k,'unknown field');if(s.audio.master!==undefined&&s.audio.master!=='mix-v2')fail('audio.master','mix-v2 required');
  // POLISH-03: narration placement inside each shot ('center' historical, 'lead' = speak early, silence at the end).
  if(s.audio.placement!==undefined&&!['center','lead'].includes(s.audio.placement))fail('audio.placement','center or lead required');if(s.speech!==undefined)fail('audio','speech projects use speech.mix.master and speech.placement');}
 // DUAL-06: opt-in output format (src/core/formats.js); only tested combinations (checked before the shots).
 if(Array.isArray(s.shots))validateFormat(s);
 slug(s.id,'id');str(s.title,'title',100);if(!VOICES.includes(s.voice))fail('voice','unsupported');
 if(!Array.isArray(s.shots)||s.shots.length<1||s.shots.length>60)fail('shots','1–60 required');
 const ids=new Set();let minimum=0;
 for(const [i,x] of s.shots.entries()){
  const p='shots['+i+']',chapter=x?.template==='blockchain-chapter',graph=x?.template==='cinematic-graph';
  fields(x,['id','template','durationFrames','transitionFrames','narration',...(chapter?['chapter','heading','subheading']:graph?['backend','heading','subheading','environment','camera','assets','effects']:['copy'])],p,graph?['fidelity','cameraRig','overlays','layers','transition','continuity','geometryProfile','materialProfile','lodPolicy','cameraInterpolation','lighting','speakerAssets','dialogue','bodyLanguage','titleHold','look','titles','composition']:[]);
  if(Object.hasOwn(x,'titleHold')&&x.titleHold!==true)fail(p+'.titleHold','true or absent');
  if(x.titleHold&&i===0)fail(p+'.titleHold','the first shot has nothing to continue');
  slug(x.id,p+'.id');if(ids.has(x.id))fail(p,'duplicate ID');ids.add(x.id);
  if(x.durationFrames!==null)integer(x.durationFrames,60,MAX_SHOT,p+'.durationFrames');
  integer(x.transitionFrames,0,15,p+'.transitionFrames');if(i===0&&x.transitionFrames!==0)fail(p,'first shot must start without transition');if(Object.hasOwn(x,'transition')&&!['cut','fade','wipe','slide','match'].includes(x.transition))fail(p+'.transition','unknown transition');if(x.transition==='cut'&&x.transitionFrames!==0)fail(p,'cut requires zero transitionFrames');
  if(!Array.isArray(x.narration)||x.narration.length<1||x.narration.length>8)fail(p,'1–8 narration phrases required');
  x.narration.forEach((t,j)=>str(t,p+'.narration['+j+']',180));
  if(chapter){if(!CHAPTERS.includes(x.chapter))fail(p,'unknown chapter');str(x.heading,p+'.heading',42);str(x.subheading,p+'.subheading',64);}
  else if(graph)validateGraph(x,p,{format:s.format});
  else{if(!TEMPLATES.includes(x.template))fail(p,'unknown template');validateScene({version:1,id:x.id,template:x.template,title:s.title,voice:s.voice,copy:x.copy,narration:[{start:0,end:1,text:'Validation'}],captions:[]});}
  minimum+=x.durationFrames??60;
 }
 if(minimum>MAX_FRAMES)fail('shots','film exceeds maximum 300 seconds');
 continuityLedger(s);if(s.speech!==undefined)validateSpeechConfig(s.speech,s.shots);
 validateSpeakerAssets(s);
 validateDialogue(s);
 validateBodyLanguage(s);
 return s;
}
export function validateTimeline(s,t){
 validateProject(s);if(s.version!==2)fail('timeline','requires v2 project');
 fields(t,['version','fps','sampleRate','durationFrames','shots'],'timeline',['captions','alignment','speechEnvelope','visemes']);
 if(t.version!==1||t.fps!==FPS||t.sampleRate!==SAMPLE_RATE)fail('timeline','unsupported timebase');
 integer(t.durationFrames,60,MAX_FRAMES,'durationFrames');
 if(!Array.isArray(t.shots)||t.shots.length!==s.shots.length)fail('timeline.shots','length mismatch');
 let previous=0;
 t.shots.forEach((x,i)=>{
  const y=s.shots[i],p='timeline.shots['+i+']';
  fields(x,['id','startFrame','endFrame','transitionFrames','segments'],p);
  if(x.id!==y.id||x.startFrame!==previous||x.transitionFrames!==y.transitionFrames)fail(p,'shot identity or continuity mismatch');
  integer(x.endFrame,x.startFrame+60,Math.min(MAX_FRAMES,x.startFrame+MAX_SHOT),p+'.endFrame');
  if(y.durationFrames!==null&&x.endFrame-x.startFrame!==y.durationFrames)fail(p,'fixed duration mismatch');
  if(!Array.isArray(x.segments)||x.segments.length!==y.narration.length)fail(p,'speech count mismatch');
  let last=x.startFrame*SAMPLES_PER_FRAME;
  for(const [j,a] of x.segments.entries()){
   fields(a,['text','startSample','endSample','speed'],p+'.segments['+j+']',['speaker','voice','language']);
   if(a.text!==y.narration[j])fail(p,'speech text mismatch');
   integer(a.startSample,last,x.endFrame*SAMPLES_PER_FRAME-1,p+'.startSample');
   integer(a.endSample,a.startSample+1,x.endFrame*SAMPLES_PER_FRAME,p+'.endSample');
   // GEN-05b: readable captions may slow single phrases down to the pace floor (0.85)
   if(!Number.isFinite(a.speed)||a.speed<(s.speech?.captions?.readable?.85:s.speech?.pace??1)||a.speed>1.25)fail(p,'speed out of range');
   last=a.endSample;
  }
  previous=x.endFrame;
 });
 if(previous!==t.durationFrames)fail('timeline','total length mismatch');
 validateSpeechTimeline(s,t);
 validateEnvelope(s,t);validateVisemes(s,t);
 return t;
}
export function shotAt(t,frame){
 if(!Number.isSafeInteger(frame)||frame<0||frame>=t.durationFrames)fail('frame','outside timeline');
 let lo=0,hi=t.shots.length-1;while(lo<hi){let m=(lo+hi)>>1;if(frame<t.shots[m].endFrame)hi=m;else lo=m+1;}
 const shot=t.shots[lo],local=frame-shot.startFrame;
 // A caption is visible only in frames intersecting its measured speech.
 const a=frame*SAMPLES_PER_FRAME,b=a+SAMPLES_PER_FRAME;
 const caption=shot.segments.find(s=>s.startSample<b&&s.endSample>a)?.text??null;
 return {index:lo,shot,local,caption,progress:local/Math.max(1,shot.endFrame-shot.startFrame-1)};
}
export function filmFrames(scene,timeline){return scene.version===1?FORMAT.frames:validateTimeline(scene,timeline).durationFrames;}
export function transitionAlpha(t,index,local){
 const shot=t.shots[index],incoming=shot.transitionFrames,outgoing=t.shots[index+1]?.transitionFrames??0,n=shot.endFrame-shot.startFrame;
 // Two halves of fade-through-dark, no timeline overlap or dropped frames.
 return Math.max(incoming?Math.max(0,1-local/incoming):0,outgoing?Math.max(0,1-(n-1-local)/outgoing):0);
}
