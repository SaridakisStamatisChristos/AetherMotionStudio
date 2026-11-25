import {fields,finite,choice,literal} from '../core/cinematography.js';
import {compactIdentities,validateIdentityRequest} from '../core/identity.js';
import {ACTIONS,supportedChannels} from '../core/cinematography.js';
import {validateSpeechConfig} from '../core/speech.js';
import {VOICES} from '../core/contract.js';
import {validateDialogueRequest,validateDialogueShot} from './dialogue.js';
export const REQUEST_VERSION=1,IR_VERSION=1,MAX_JSON_BYTES=262144;
const bad=(p,m)=>{throw Error(p+': '+m)};
export function safeText(s,max,p){literal(s,max,p);if(/https?:\/\/|file:\/\/|javascript:|<\/?script\b|<iframe\b|\x60\x60\x60/i.test(s))bad(p,'URLs or executable markup not permitted');}
export function safeJson(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw)>MAX_JSON_BYTES)bad('json','size limit');
 // Scan nesting before parsing to bound parser input; quoted braces are ignored.
 let depth=0,quoted=false,escaped=false;
 for(const c of raw){
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;continue;}if(c==='{'||c==='['){if(++depth>24)bad('json','depth limit');}else if(c==='}'||c===']')depth--;
 }
 const x=JSON.parse(raw,(k,v)=>{if(['__proto__','prototype','constructor'].includes(k))bad('json','unsafe key');if(typeof v==='number'&&!Number.isFinite(v))bad('json','nonfinite number');return v});
 return x;
}
export const normalize=s=>s.trim().replace(/\s+/g,' ');
export function request(input){
 fields(input,['version','id','topic','script','seconds','audience','tone','style','language','voice','backend','profile','seed','identityLibrary','cast','story','speech','staging','promptVersion','dialogue','delivery','sets','look'], 'request',['version','id','topic','seconds']);
 // GEN-09 opt-in delivery mode (Instagram Reels layout and framing); absent = unchanged output.
 if(input.delivery!==undefined&&input.delivery!=='reels-v1')bad('request.delivery','reels-v1 or absent');
 // GEN-12 topic-fitting sets: 'topic-v1' or 'none'; absent = topic-v1 for dialogue films, unchanged output otherwise.
 if(input.sets!==undefined&&!['topic-v1','none'].includes(input.sets))bad('request.sets','topic-v1, none or absent');
 if(input.sets!==undefined&&input.identityLibrary)bad('request.sets','identity stories keep their authored locations');
 // GEN-15 look: 'crafted-v1' or 'none'; absent = crafted-v1 for dialogue films, unchanged output otherwise.
 if(input.look!==undefined&&!['crafted-v1','none'].includes(input.look))bad('request.look','crafted-v1, none or absent');
 const q={audience:'general audience',tone:'clear',style:'cinematic explainer',language:'en',voice:'af_heart',backend:'cpu',profile:'polished',seed:0,...input};
 if(q.version!==REQUEST_VERSION)bad('request.version','unsupported');
 if(typeof q.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,47}$/.test(q.id)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(q.id))bad('request.id','unsafe ID');
 for(const [k,max] of [['topic',180],['audience',80],['tone',60],['style',80]])safeText(q[k],max,'request.'+k);
 if(q.script!==undefined){if(typeof q.script!=='string'||!q.script.trim()||q.script.length>12000)bad('request.script','invalid script');q.script=normalize(q.script);safeText(q.script,12000,'request.script');}
 if(!Number.isSafeInteger(q.seconds)||q.seconds<6||q.seconds>300)bad('request.seconds','integer 6–300 required');
 if(!Number.isSafeInteger(q.seed)||q.seed<0||q.seed>2147483647)bad('request.seed','invalid seed');
 choice(q.language,['en','en-us','en-gb'],'request.language');choice(q.voice,VOICES,'request.voice');
 if(q.language==='en-gb'&&!q.voice.startsWith('b')||q.language==='en-us'&&q.voice.startsWith('b'))bad('request.voice','language/voice mismatch');
 if(q.staging!==undefined)choice(q.staging,['art-v1','art-v2'],'request.staging');
 // POLISH-02: opt-in compact prompt; absent keeps director-ir-v1.1 (unchanged digests).
 if(q.promptVersion!==undefined)choice(q.promptVersion,['director-ir-v1.1','director-ir-v1.2','director-ir-v1.3'],'request.promptVersion');
 // TALK-04: opt-in dialogue; its prompt is director-ir-v1.3 (selected automatically), which requires dialogue.
 if(q.dialogue!==undefined){if(q.promptVersion===undefined)q.promptVersion='director-ir-v1.3';else if(q.promptVersion!=='director-ir-v1.3')bad('request.promptVersion','dialogue requires director-ir-v1.3');}
 else if(q.promptVersion==='director-ir-v1.3')bad('request.promptVersion','director-ir-v1.3 requires request.dialogue');
 choice(q.backend,['cpu','three'],'request.backend');choice(q.profile,['original','polished'],'request.profile');validateIdentityRequest(q);if(q.speech!==undefined){validateSpeechConfig(q.speech);if(q.speech.targetFrames!==q.seconds*30)bad('speech','targetFrames must equal seconds*30');}validateDialogueRequest(q);return q;
}
export function validateIR(ir,q,selection){
 fields(ir,['version','title','treatment','shots'],'ir',['version','title','treatment','shots']);
 if(ir.version!==IR_VERSION)bad('ir.version','unsupported');safeText(ir.title,100,'ir.title');safeText(ir.treatment,420,'ir.treatment');
 const cast=new Map(compactIdentities(q).map(x=>[x.id,x]));
 if(!Array.isArray(ir.shots)||ir.shots.length!==selection.length)bad('ir.shots','required shot count '+selection.length);
 for(const [i,s] of ir.shots.entries()){
  const p='ir.shots['+i+']';
  fields(s,['heading','subheading','narration','camera','environment','assets','effect','overlay','location','events','speakers'],p,['heading','subheading','narration','camera','environment','assets']);
  if(q.identityLibrary){if(cast.get(s.location)?.kind!=='environment'||!Array.isArray(s.events)||s.events.length>32)bad(p,'location and explicit events required');}else if(s.location!==undefined||s.events!==undefined)bad(p,'identity library required');
  safeText(s.heading,42,p+'.heading');safeText(s.subheading,64,p+'.subheading');
  if(!Array.isArray(s.narration)||s.narration.length<1||s.narration.length>8)bad(p+'.narration','1–8 phrases');
  s.narration.forEach((t,j)=>safeText(t,180,p+'.narration['+j+']'));
  if(!Array.isArray(s.assets)||s.assets.length<1||s.assets.length>3)bad(p+'.assets','1–3 objects');
  const allowed=new Map(selection[i].map(o=>[o.id,o])),ids=new Set();
  for(const [j,a] of s.assets.entries()){
   const v=p+'.assets['+j+']';
   fields(a,['asset','identity','variant','hold','action','x','scale'],v);
   let key,actions;
   if(a.identity!==undefined){
    const d=cast.get(a.identity);if(!d||d.kind==='environment'||a.asset!==undefined)bad(v,'unknown identity or conflicting asset');
    choice(a.variant??'base',d.variants,v+'.variant');key='identity:'+d.id;
    actions=Object.keys(ACTIONS).filter(n=>Object.keys(ACTIONS[n]).every(ch=>supportedChannels(d.asset).includes(ch)));
    if(a.hold!==undefined){
     if(d.kind!=='prop')bad(v,'only props may be held');
     // POLISH-01: hold may be one window or a handoff chain of 2–4 sequential windows.
     const holds=Array.isArray(a.hold)?a.hold:[a.hold];if(Array.isArray(a.hold)&&(holds.length<2||holds.length>4))bad(v,'hold chain requires 2–4 windows');
     holds.forEach((x,k)=>{const q=Array.isArray(a.hold)?v+'.hold['+k+']':v+'.hold';
      fields(x,['holder','anchor','start','end','offset'],q,['holder','anchor','start','end']);
      const h=cast.get(x.holder);if(h?.kind!=='character'||!['right-hand','left-hand'].includes(x.anchor)||!h.rig.anchors.includes(x.anchor))bad(v,'unknown holder or anchor');
      finite(x.start,0,1,q+'.start');finite(x.end,0,1,q+'.end');if(x.start>=x.end)bad(v,'invalid hold window');if(k&&x.start<holds[k-1].end)bad(v,'hold windows must be sequential');});
    }
   }else{
    if(a.variant!==undefined||a.hold!==undefined||!allowed.has(a.asset))bad(v,'unknown asset or orphan identity fields');key='asset:'+a.asset;actions=allowed.get(a.asset).actions;
   }
   if(ids.has(key))bad(v,'duplicate identity or asset');ids.add(key);
   if(a.action!==undefined)choice(a.action,actions,v+'.action');
   if(a.x!==undefined)finite(a.x,-2.4,2.4,v+'.x');if(a.scale!==undefined)finite(a.scale,.5,1.25,v+'.scale');
  }
  validateDialogueShot(s,q,p);
  // The final shared graph validator is the source of truth for cameras, overlays and effects.
  if(s.overlay!==undefined)fields(s.overlay,['type','slot','text','start','end','animation','data','unit','axis','from','to','edges'],p+'.overlay',['type','slot','text']);
 }
 if(q.script!==undefined&&normalize(ir.shots.flatMap(s=>s.narration).join(' '))!==q.script)bad('ir.shots.narration','supplied script must be preserved exactly (normalized whitespace)');
 return ir;
}
