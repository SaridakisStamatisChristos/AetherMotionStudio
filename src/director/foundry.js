import {OBJECT_CATALOG} from '../visual/catalog.js';
import {HERO_IDS} from '../foundry/hero.js';
import {GENERATED_ID,GENERATED_PROFILE,recipeFor,makeGeneratedRef,generatedCommands,generatedDigest} from '../foundry/generator.js';
import {inspectCommands,viewCamera,renderInspection,assessPreview,VIEWS} from '../foundry/inspection.js';
import {validateProject} from '../core/timeline.js';
import {safeJson} from './schema.js';
const aliases=new Map([['cell-phone','smartphone'],['mobile-phone','smartphone'],['portable-computer','laptop'],['field-signal-beacon','survey-beacon'],['high-voltage-insulator','ceramic-insulator'],['sample-capsule','specimen-canister']]);
const families=new Set(['survey-beacon','ceramic-insulator','specimen-canister']);
const existing=new Set([...OBJECT_CATALOG.map(x=>x.id),...HERO_IDS]);
const normalize=s=>s.trim().toLowerCase().replace(/\s+/g,'-');
export function classifyAsset(text){
 if(typeof text!=='string'||!text.trim()||text.length>120||!/^[a-z0-9 -]+$/i.test(text)||/\b(eval|script|execute|shell)\b/i.test(text))return {status:'reject',reason:'unsafe or invalid request'};
 const raw=normalize(text),id=aliases.get(raw)??raw;
 if(existing.has(id))return {status:'reuse',id,profile:HERO_IDS.includes(id)?'foundry-af04':'legacy'};
 if(families.has(id))return {status:'generate',family:id};
 if(['instrument','tool','object','device','prop'].includes(id)||/\band\b/i.test(text))return {status:'clarify',reason:'ambiguous identity'};
 return {status:'unsupported',reason:'no supported semantic recipe'};
}
export function inspectGenerated(ref){
 const commands=generatedCommands({id:'subject',generatedRef:ref,pose:{origin:[0,0,0],yaw:0,scale:1}});
 const structure=inspectCommands(commands);
 const views=VIEWS.map(([name,dir])=>{const camera=viewCamera(structure.bounds,dir),v=renderInspection(commands,camera,'studio',144);return {name,camera,...v.metrics,warnings:assessPreview(v.metrics)}});
 if(views.some(v=>v.empty||v.clipped))throw Error('generated inspection failed: empty or clipped view');
 return {structure,views,backend:'cpu',humanReview:'unreviewed',digest:generatedDigest([structure.contentDigest,views])};
}
export class GenerationRegistry{
 #entries=new Map();#fingerprints=new Map();#approved=new Map();
 get size(){return this.#entries.size}
 stage(ref,evidence){
 if(ref.status!=='staged'||evidence.humanReview!=='unreviewed')throw Error('invalid staging state');
 const actual=inspectGenerated(ref);if(actual.digest!==evidence.digest)throw Error('inspection evidence mismatch');
 const duplicate=this.#fingerprints.get(ref.fingerprint);if(duplicate)return {entry:duplicate,reused:true};
 if(this.#entries.size>=64)throw Error('staging capacity');
 const entry=JSON.parse(JSON.stringify({ref,evidence,trace:{compiler:ref.compiler,revision:ref.revision},status:'staged'}));this.#entries.set(ref.digest,entry);this.#fingerprints.set(ref.fingerprint,entry);return {entry:JSON.parse(JSON.stringify(entry)),reused:false};
 }
 resolve(digest){const x=this.#entries.get(digest);if(!x)throw Error('missing staged revision');return JSON.parse(JSON.stringify(x))}
 promote(digest,review){
 const entry=this.resolve(digest);
 if(!review||review.decision!=='approve'||typeof review.reviewer!=='string'||!review.reviewer.trim()||review.reviewer.length>128||review.evidenceDigest!==entry.evidence.digest||review.revision!==entry.ref.revision)throw Error('explicit matching human review required');
 if(this.#approved.has(entry.ref.identity)&&this.#approved.get(entry.ref.identity).ref.revision!==entry.ref.revision)throw Error('approved revision conflict');
 const approved={...entry,status:'approved',review:{decision:review.decision,reviewer:review.reviewer,evidenceDigest:review.evidenceDigest,revision:review.revision}};this.#approved.set(entry.ref.identity,approved);return JSON.parse(JSON.stringify(approved));
 }
}
export async function resolveAssetRequest(text,{registry=new GenerationRegistry(),adapter=null,requireProvider=false,maxRepairs=1}={}){
 const classified=classifyAsset(text),attempts=[];
 if(classified.status!=='generate')return {...classified,attempts};
 if(!Number.isInteger(maxRepairs)||maxRepairs<0||maxRepairs>2)throw Error('repair budget');
 if(requireProvider&&!adapter)return {status:'provider-unavailable',attempts};
 let family=classified.family;
 if(adapter){
 for(let i=0;i<=maxRepairs;i++){
 let response;try{response=await adapter.generate('Return ONLY JSON with exactly {"version":1,"family":"'+family+'"} for the supported semantic request. No code. '+(i?'Repair invalid schema.':''),{seed:0})}
 catch(e){return {status:'provider-unavailable',attempts:[...attempts,{status:'unavailable',message:String(e.message).slice(0,180)}]}}
 try{const spec=safeJson(response.text);if(!spec||Object.keys(spec).length!==2||spec.version!==1||spec.family!==family)throw Error('unsupported specification');attempts.push({status:'valid',usage:response.usage??null});break}
 catch(e){attempts.push({status:'invalid',message:String(e.message).slice(0,180),usage:response.usage??null});if(i===maxRepairs)return {status:'reject',reason:'provider specification invalid',attempts}}
 }
 }
 try{const ref=makeGeneratedRef(recipeFor(family)),evidence=inspectGenerated(ref),staged=registry.stage(ref,evidence);return {status:'generate',family,ref:staged.entry.ref,evidence:staged.entry.evidence,reused:staged.reused,attempts}}
 catch(e){return {status:'reject',reason:String(e.message).slice(0,240),attempts}}
}
// Opt-in Director lane: explicit asset requests, one recurring premium character, no provider geometry in prompt.
export async function directFoundry(q,{foundryRequests,adapter,maxRepairs=1}){
 if(q.identityLibrary||q.speech||q.script||q.seconds!==30||q.profile!=='polished'||!Array.isArray(foundryRequests)||foundryRequests.length!==3)throw Error('AF07 story contract: 30s polished, exactly three supported missing prop requests, no custom script/cast/speech');
 const registry=new GenerationRegistry(),resolved=[];
 for(const text of foundryRequests){const x=await resolveAssetRequest(text,{registry,adapter,maxRepairs});if(x.status!=='generate')throw Error('AF07 missing asset: '+x.status+' '+(x.reason??''));resolved.push(x)}
 if(new Set(resolved.map(x=>x.ref.digest)).size!==3)throw Error('three distinct generated props required');
 const shots=Array.from({length:6},(_,i)=>{
 const x=resolved[i%3],label=x.family.replaceAll('-',' '),id='prop';
 return {id:'shot-'+(i+1),template:'cinematic-graph',backend:q.backend,durationFrames:150,transitionFrames:i?10:0,heading:label.toUpperCase(),subheading:i<3?'A new object enters the laboratory.':'The same pinned object returns.',environment:i%2?'midnight':'laboratory',camera:{x:[[0,1.6],[1,.3]],y:[[0,3.1],[1,2.7]],z:[[0,8.1],[1,7.3]],zoom:[[0,1150],[1,1300]]},cameraRig:{preset:'medium',framing:'medium',strength:.8,padding:.16},assets:[{id:'robot',asset:'retro-robot',tracks:{x:[[0,-1.0]],scale:[[0,.85]],headYaw:[[0,-.15],[1,.25]]}},{id,asset:GENERATED_ID,generatedRef:x.ref,tracks:{x:[[0,.75]],yaw:[[0,-.35],[1,.55]],scale:[[0,1.1]]}}],effects:[],narration:[i<3?'The explorer studies the '+label+'.':'The '+label+' keeps its identity.'],fidelity:{bloom:.15,atmosphere:.15,contactShadow:.7,surfaceDetail:.65,depthOfField:.04,motionBlur:0,grain:.08,grade:.25,particles:0,typography:1,lightShafts:0},geometryProfile:GENERATED_PROFILE,lodPolicy:{version:1,quality:'cinematic',selection:'explicit',overrides:[{asset:'robot',level:1},{asset:id,level:0}]}};
 });
 const project={version:2,id:q.id,title:q.topic,voice:q.voice,shots};validateProject(project);
 return {request:q,project,manifest:{version:1,status:'planned',provider:adapter?.name??'offline',targetFrames:900,plannedFrames:900,generator:resolved.map(x=>({identity:x.ref.identity,revision:x.ref.revision,digest:x.ref.digest,inspection:x.evidence.digest,attempts:x.attempts,status:'staged'})),humanReview:'unreviewed',nativeThree:'deferred'},stages:{assets:resolved},prompt:'Explicit bounded asset requests; no geometry passed to a model.',catalogSelection:[],ir:null};
}
