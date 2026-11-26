import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {request,safeJson} from '../src/director/schema.js';
import {digest} from '../src/director/catalog.js';
import {validateProject} from '../src/core/timeline.js';
import {defaultSpeech,productionId,matchedTargetFrames,projectProfile,normalizedProject} from '../src/studio/production.js';
export function parseProduction(args,{read=p=>readFileSync(resolve(p),'utf8'),newId=()=> 'film-'+randomBytes(6).toString('hex')}={}){
 const o={},flags=new Set(['repair']),values=new Set(['request','topic','project','pair','script','script-file','seconds','backend','profile','voice','language','id','seed','import']);
 const queue=[...args];while(queue.length){
  const raw=queue.shift();if(!raw.startsWith('--'))throw Error('Expected --option');const k=raw.slice(2);
  if(Object.hasOwn(o,k))throw Error('Duplicate option: '+k);
  if(flags.has(k))o[k]=true;
  else if(values.has(k)&&queue.length&&!queue[0].startsWith('--'))o[k]=queue.shift();
  else throw Error('Unknown or missing option: '+k);
 }
 if([o.request,o.topic,o.project].filter(x=>x!==undefined).length!==1)throw Error('Specify exactly one of --topic, --request or --project');
 const choose=m=>{const b=m==='both'?['cpu','three']:[m];if(b.some(x=>!['cpu','three'].includes(x)))throw Error('Choose cpu, three or both');return b};
 if(o.project!==undefined)return authored(o,choose(o.backend??'cpu'),read,newId);
 if(o.pair!==undefined)throw Error('--pair is only valid with --project');
 if(o.script&&o['script-file'])throw Error('Choose --script or --script-file');
 const input=o.request?safeJson(read(o.request)):{version:1,topic:o.topic,seconds:30,id:newId()};
 const patch={};for(const k of ['id','profile','voice','language','script'])if(o[k]!==undefined)patch[k]=o[k];
 for(const k of ['seconds','seed'])if(o[k]!==undefined)patch[k]=Number(o[k]);
 if(o['script-file'])patch.script=read(o['script-file']);
 const directorBackends=choose(o.backend??input.backend??'cpu');
 const raw={...input,...patch,backend:directorBackends[0]},id=raw.id??newId();
 // Owner 2026-11-26 (roles in captions "Off by default"): a dialogue request without its own speech gets speech that
 // hides the speaker names, the same default the Director uses; a request's own speech is kept as it is.
 const quiet=s=>({...s,captions:{...s.captions,speakerNames:false}});
 // DUAL-01: a content-mode request (explainer-v1, mixed-v1) without its own speech is fitted to its speech (Fix A
 // speech-v1, as dialogue films are), so a short script does not leave long pauses. Other requests are unchanged.
 // They also get the mix-v2 master that dialogue films use (about -16 LUFS; dual01-explainer-r3 without it: -18.7).
 const fitted=s=>raw.content?{...s,fit:'speech-v1',mix:{...s.mix,master:'mix-v2'}}:s;
 raw.id=id;const q=request({...raw,speech:raw.speech??fitted(raw.dialogue?quiet(defaultSpeech(raw.seconds)):defaultSpeech(raw.seconds))});
 // Strictly reject conflicting supplied speech target, never silently retime authored data.
 const ids=directorBackends.map(b=>productionId(id,b,q.profile));
 return {mode:'director',request:q,id,backends:directorBackends,ids,repair:o.repair===true,imported:o.import?read(o.import):null,targetFrames:q.seconds*30,sources:null,project:null};
}
// LOCAL-02 authored mode: an existing validated v2 project is the single scene definition for every backend.
function authored(o,backends,read,newId){
 for(const k of ['script','script-file','seconds','profile','voice','language','seed','import'])if(o[k]!==undefined)throw Error('--'+k+' cannot modify an authored --project; edit the project file instead');
 const load=p=>validateProject(safeJson(read(p)));
 const project=load(o.project),targetFrames=matchedTargetFrames(project),profile=projectProfile(project);
 if(o.pair!==undefined){
  const pair=load(o.pair);
  if(digest(normalizedProject(pair))!==digest(normalizedProject(project)))throw Error('Authored backend pair differs after normalization; refusing matched production');
 }
 const id=o.id??newId();
 return {mode:'project',request:null,project,id,backends,ids:backends.map(b=>productionId(id,b,profile)),repair:o.repair===true,imported:null,targetFrames,profile,sources:{project:o.project,pair:o.pair??null}};
}
