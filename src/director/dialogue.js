// TALK-04 director dialogue authoring. Opt-in `request.dialogue: {speakers: [{id, name, voice, language, character}],
// style?: 'conversation'|'interview'}` makes the Director produce a dialogue project: every narration line gets a
// speaker (IR `shots[].speakers`, parallel to `narration`), compile builds the speech config (speakers, shotSpeakers,
// placement 'lead', mix-v2) and stages the speakers as characters in an open line facing the camera with TALK-01..03
// opt-ins (speakerAssets, dialogue, bodyLanguage, turnSteps). The offline director does not write new lines: it splits
// its existing offline narration into sentences and hands them out in turns. Absent `dialogue`: nothing changes.
import {fields,choice,literal} from '../core/cinematography.js';
import {VOICES} from '../core/contract.js';
import {VOICE_METADATA} from '../core/speech.js';
import {mouthSupported} from '../core/talk.js';
import {recipeSpec} from '../visual/catalog-rig.js';
import {locomotionRig} from '../core/locomotion.js';
import {defaultSpeech} from '../studio/production.js';

const bad=(p,m)=>{throw Error(p+': '+m)};
export const DIALOGUE_STYLES=Object.freeze(['conversation','interview']);
// Cameras that keep an open line of speakers readable (frontal or gently angled); others show backs or lose faces.
export const DIALOGUE_CAMERAS=Object.freeze(['medium','dolly-in','push-in','pull-back','establishing']);
// Calm defaults from the owner's TALK-03 reviews: 0.8 s turns, cheat 1.0, body language as merged in TALK-03.
export const DIALOGUE_STAGE=Object.freeze({turn:.8,cheat:1,line:{2:[[-1,.35],[1,.35]],3:[[-1.35,.35],[0,-.2],[1.35,.35]]},propZ:-1.1,propScale:.6});
const human=asset=>recipeSpec(asset)?.family==='human';

export function validateDialogueRequest(q){
 if(q.dialogue===undefined)return;
 const d=q.dialogue,p='request.dialogue';
 fields(d,['speakers','style'],p,['speakers']);
 if(d.style!==undefined)choice(d.style,DIALOGUE_STYLES,p+'.style');
 if(!Array.isArray(d.speakers)||d.speakers.length<2||d.speakers.length>3)bad(p+'.speakers','2–3 speakers required');
 const ids=new Set();
 d.speakers.forEach((s,i)=>{
  const v=p+'.speakers['+i+']';
  fields(s,['id','name','voice','language','character'],v,['id','name','voice','language','character']);
  if(typeof s.id!=='string'||!/^[a-z][a-z0-9-]{0,23}$/.test(s.id)||/^object-/.test(s.id)||['constructor','prototype','default'].includes(s.id))bad(v+'.id','unsafe or reserved ID');
  if(ids.has(s.id))bad(v+'.id','duplicate speaker');ids.add(s.id);
  literal(s.name,24,v+'.name');if(/[<>&]/.test(s.name))bad(v+'.name','markup forbidden');
  choice(s.voice,VOICES,v+'.voice');choice(s.language,['en-us','en-gb'],v+'.language');
  if(VOICE_METADATA.find(x=>x.id===s.voice).language!==s.language)bad(v,'voice/language mismatch');
  if(typeof s.character!=='string'||!mouthSupported(s.character,{detail:2}))bad(v+'.character','catalog human or robot with a mouth required');
 });
 if(q.identityLibrary!==undefined||q.story!==undefined||q.cast!==undefined)bad(p,'not combinable with identity libraries or stories');
 if(q.staging!==undefined)bad(p,'dialogue stages its own shots; omit request.staging');
 // Speech may supply captions/mix/pronunciations/fixed shots; speakers and line speakers come from the dialogue.
 if(q.speech!==undefined&&(Object.keys(q.speech.speakers).length||Object.keys(q.speech.shotSpeakers).length))bad(p,'speech.speakers and speech.shotSpeakers are derived from the dialogue; leave them empty');
}
// IR check (dialogue on): speakers parallel to narration, known IDs, exactly one set-piece object, dialogue camera.
export function validateDialogueShot(s,q,p){
 if(q.dialogue===undefined){if(s.speakers!==undefined)bad(p+'.speakers','request.dialogue required');return;}
 const ids=q.dialogue.speakers.map(x=>x.id);
 if(!Array.isArray(s.speakers)||s.speakers.length!==s.narration.length)bad(p+'.speakers','one speaker per narration line required');
 s.speakers.forEach((id,j)=>{if(!ids.includes(id))bad(p+'.speakers['+j+']','unknown speaker');});
 if(s.assets.length!==1)bad(p+'.assets','dialogue shots take exactly one set-piece object (speakers are added)');
 choice(s.camera,DIALOGUE_CAMERAS,p+'.camera');
}
// Offline: split each shot's existing narration into sentences (split only at whitespace after . ! ?, so the joined
// text is unchanged) and assign them in turns. conversation: round-robin; interview: host (first speaker) alternates
// with each guest in order. The counter runs across the whole film.
export function sentences(narration){
 const out=narration.flatMap(t=>t.split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean));
 while(out.length>8){const last=out.pop();out[out.length-1]+=' '+last;}
 return out;
}
export function turnSpeaker(d,k){
 const ids=d.speakers.map(s=>s.id);
 if((d.style??'conversation')==='interview'&&ids.length>2)return k%2===0?ids[0]:ids[1+((k-1)/2)%(ids.length-1)];
 return ids[k%ids.length];
}
export function offlineDialogue(q,ir){
 const d=q.dialogue;let k=0;
 const cams=['medium','dolly-in','push-in'];
 return {...ir,treatment:(ir.treatment+' Dialogue: the offline narration split into turns between '+d.speakers.map(s=>s.name).join(', ')+'.').slice(0,420),
  shots:ir.shots.map((s,i)=>{const narration=sentences(s.narration),speakers=narration.map(()=>turnSpeaker(d,k++));
   const {effect,overlay,...rest}=s,prop=s.assets.find(a=>a.asset!=='retro-robot')??s.assets[0];
   return {...rest,narration,speakers,camera:cams[(i+q.seed)%cams.length],assets:[{asset:prop.asset,...(prop.action&&prop.action!=='idle'?{action:prop.action}:{})}]};})};
}
export function dialogueSpeech(q,ir){
 const base=q.speech??defaultSpeech(q.seconds);
 return {...base,speakers:Object.fromEntries(q.dialogue.speakers.map(s=>[s.id,{name:s.name,voice:s.voice,language:s.language}])),
  shotSpeakers:Object.fromEntries(ir.shots.map((s,i)=>['shot-'+(i+1),[...s.speakers]])),placement:'lead',mix:{...base.mix,master:'mix-v2'}};
}
// Speakers in an open line facing the camera (TALK-02/03 layout: x ±1.35, middle z −0.2), the set piece behind them.
export function stageDialogueAssets(q,prop){
 const sp=q.dialogue.speakers,line=DIALOGUE_STAGE.line[sp.length];
 const chars=sp.map((s,j)=>({id:s.id,asset:s.character,...(human(s.character)?{params:{detail:2}}:{}),tracks:{x:[[0,line[j][0]]],z:[[0,line[j][1]]]},...(locomotionRig(s.character)?{turnSteps:true}:{})}));
 const object={id:'object-1',asset:prop.asset,tracks:{x:[[0,prop.x??0]],z:[[0,DIALOGUE_STAGE.propZ]],scale:[[0,prop.scale??DIALOGUE_STAGE.propScale]]},...(prop.action&&prop.action!=='idle'?{actions:[{name:prop.action,start:.06,end:.94,blend:.1,...(['walk','run'].includes(prop.action)?{mode:'loop',speed:2}:{})}]}:{})};
 return [...chars,object];
}
export function dialogueShotFields(q){
 return {lighting:'parity-v1',speakerAssets:Object.fromEntries(q.dialogue.speakers.map(s=>[s.id,s.id])),dialogue:{listen:true,turn:DIALOGUE_STAGE.turn,cheat:DIALOGUE_STAGE.cheat},bodyLanguage:{beats:true,nods:true,blinks:true,sway:true}};
}
