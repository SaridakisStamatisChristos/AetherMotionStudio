// TALK-04 director dialogue authoring. Opt-in `request.dialogue: {speakers: [{id, name, voice, language, character}],
// style?: 'conversation'|'interview'}` makes the Director produce a dialogue project: every narration line gets a
// speaker (IR `shots[].speakers`, parallel to `narration`), compile builds the speech config (speakers, shotSpeakers,
// placement 'lead', mix-v2) and stages the speakers as characters in an open line facing the camera with TALK-01..03
// opt-ins (speakerAssets, dialogue, bodyLanguage, turnSteps). The offline director does not write new lines: it splits
// its existing offline narration into sentences and hands them out in turns. Absent `dialogue`: nothing changes.
import {fields,choice,literal} from '../core/cinematography.js';
import {VOICES} from '../core/contract.js';
import {VOICE_METADATA,SPEECH_PACE} from '../core/speech.js';
import {mouthSupported} from '../core/talk.js';
import {recipeSpec} from '../visual/catalog-rig.js';
import {locomotionRig} from '../core/locomotion.js';
import {defaultSpeech} from '../studio/production.js';
import {TALK_STAGE} from '../core/staging.js';
import {aimSupported} from '../core/aim.js';

const bad=(p,m)=>{throw Error(p+': '+m)};
export const DIALOGUE_STYLES=Object.freeze(['conversation','interview']);
// Cameras that keep an open line of speakers readable (frontal or gently angled); others show backs or lose faces.
export const DIALOGUE_CAMERAS=Object.freeze(['medium','dolly-in','push-in','pull-back','establishing']);
// Calm defaults from the owner's TALK-03 reviews (0.8 s turns, cheat 1.0). GEN-01: layout and behaviour now come from
// the general staging mode talk-v1 (src/core/staging.js TALK_STAGE), shared with Studio and authored projects.
export const DIALOGUE_STAGE=Object.freeze({turn:TALK_STAGE.turn,cheat:TALK_STAGE.cheat,line:TALK_STAGE.line,prop:Object.freeze({2:TALK_STAGE.prop[2][0],3:TALK_STAGE.prop[3][0]}),propScale:.85});
const human=asset=>recipeSpec(asset)?.family==='human';

export function validateDialogueRequest(q){
 if(q.dialogue===undefined)return;
 const d=q.dialogue,p='request.dialogue';
 fields(d,['speakers','style','pace','singles'],p,['speakers']);
 if(d.singles!==undefined&&typeof d.singles!=='boolean')bad(p+'.singles','boolean required');
 if(d.style!==undefined)choice(d.style,DIALOGUE_STYLES,p+'.style');
 if(d.pace!==undefined&&(typeof d.pace!=='number'||!Number.isFinite(d.pace)||d.pace<SPEECH_PACE.min||d.pace>1))bad(p+'.pace','number from '+SPEECH_PACE.min+' to 1 required');
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
  shotSpeakers:Object.fromEntries(ir.shots.map((s,i)=>['shot-'+(i+1),[...s.speakers]])),placement:'lead',mix:{...base.mix,master:'mix-v2'},
  // GEN-05 (owner: "speech a bit slower"): dialogue speaks at pace 0.92 unless the request sets dialogue.pace (1 = TALK-04 speed).
  ...((q.dialogue.pace??SPEECH_PACE.dialogue)<1?{pace:q.dialogue.pace??SPEECH_PACE.dialogue}:{}),
  // Fix A (owner: "do these: Fix A"): dialogue films are as long as their speech plus calm pauses, at most the requested
  // seconds, unless the request's speech says fit 'none'.
  fit:base.fit??'speech-v1'};
}
// Speakers (bound by ID) and the set piece; compile then applies staging talk-v1, which places the line and the set piece
// beside it and adds dialogue/bodyLanguage/lighting. A provider's set-piece x is replaced when talk-v1 places it.
export function stageDialogueAssets(q,prop){
 const sp=q.dialogue.speakers,line=DIALOGUE_STAGE.line[sp.length],[px,pz]=DIALOGUE_STAGE.prop[sp.length];
 const chars=sp.map((s,j)=>({id:s.id,asset:s.character,...(human(s.character)?{params:{detail:2}}:{}),tracks:{x:[[0,line[j][0]]],z:[[0,line[j][1]]]},...(locomotionRig(s.character)?{turnSteps:true}:{})}));
 const object={id:'object-1',asset:prop.asset,tracks:{x:[[0,prop.x??px]],z:[[0,pz]],scale:[[0,prop.scale??DIALOGUE_STAGE.propScale]]},...(prop.action&&prop.action!=='idle'?{actions:[{name:prop.action,start:.06,end:.94,blend:.1,...(['walk','run'].includes(prop.action)?{mode:'loop',speed:2}:{})}]}:{})};
 return [...chars,object];
}
// GEN-01: the first line that names the set piece (its catalog ID words, plurals allowed) makes its speaker point at it
// while saying it: aim.phrase follows the measured line at render; start/end are a word-share estimate for previews.
const stem=w=>w.length>3&&w.endsWith('s')?w.slice(0,-1):w;
export function mentions(text,assetId){const w=String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(stem),parts=assetId.split('-');
 for(let i=0;i+parts.length<=w.length;i++)if(parts.every((p,j)=>w[i+j]===p))return true;return false;}
// GEN-09 finding (Reels network film, 120.7°/s): a longer ease into the pointing keeps the body-cheat turn calm
// whatever the camera (was 0.08 of the shot).
export const AIM_BLEND=.12;
export function pointAtSetPiece(q,s,assets){
 const prop=assets.find(a=>a.id==='object-1'),k=prop?s.narration.findIndex(t=>mentions(t,prop.asset)):-1;if(k<0)return assets;
 const who=assets.find(a=>a.id===s.speakers[k]);if(!who||!aimSupported(who.asset))return assets;
 const words=s.narration.map(t=>t.trim().split(/s+/).length),total=words.reduce((a,b)=>a+b,0),before=words.slice(0,k).reduce((a,b)=>a+b,0);
 const start=+(.05+.9*before/total).toFixed(3),end=+(.05+.9*(before+words[k])/total).toFixed(3);
 return assets.map(a=>a===who?{...a,aim:{target:'object-1',start,end,blend:AIM_BLEND,cheat:.5,phrase:k}}:a);
}
export function dialogueShotFields(q){
 return {speakerAssets:Object.fromEntries(q.dialogue.speakers.map(s=>[s.id,s.id]))};
}
