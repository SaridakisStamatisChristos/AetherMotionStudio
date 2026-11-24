import {fields,finite,choice,literal,LAYERED_ENVIRONMENTS,supportedChannels} from './cinematography.js';
import {OBJECT_CATALOG,validateAssetParams} from '../visual/catalog.js';
import {recipeRig} from '../visual/catalog-rig.js';
const fail=(p,m)=>{throw Error(p+': '+m)};
const list=(x,min,max,p)=>{if(!Array.isArray(x)||x.length<min||x.length>max)fail(p,'invalid list size');};
const id=(x,p)=>{if(typeof x!=='string'||!/^[a-z0-9][a-z0-9-]{0,31}$/.test(x)||['constructor','prototype','base'].includes(x))fail(p,'invalid identity ID');};
const catalog=new Map(OBJECT_CATALOG.map(x=>[x.id,x]));
const limits={x:[-2.4,2.4],y:[0,.7],z:[-1.2,1.2],yaw:[-8,8],scale:[.5,1.25],walking:[-1,1],open:[0,1],headRoll:[-.5,.5],headYaw:[-.8,.8],blink:[.1,1],pulse:[-1,1],armPitch:[-2.8,1],armSpread:[-.4,.9],grip:[0,1]};
export const canonical=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const equal=(a,b)=>canonical(a)===canonical(b);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x};
export function validateLibrary(lib){
 fields(lib,['version','definitions'],'library',['version','definitions']);if(lib.version!==1)fail('library.version','unsupported');
 list(lib.definitions,1,64,'library.definitions');const map=new Map();
 for(const d of lib.definitions){
  const p='library.definition';fields(d,['id','name','kind','recipeVersion','asset','appearance','variants','defaultPose','environment','layers'],p,['id','name','kind','recipeVersion']);
  id(d.id,p+'.id');if(map.has(d.id))fail(p,'duplicate identity');literal(d.name,60,p+'.name');choice(d.kind,['character','prop','environment'],p+'.kind');if(d.recipeVersion!==1)fail(p,'unsupported recipe version');
  if(d.kind==='environment'){
   if(['asset','appearance','variants','defaultPose'].some(k=>Object.hasOwn(d,k)))fail(p,'object fields on environment');
   choice(d.environment,['laboratory','midnight','amber'],p+'.environment');if(d.layers!==undefined)choice(d.layers,LAYERED_ENVIRONMENTS,p+'.layers');
  }else{
   if(Object.hasOwn(d,'environment')||Object.hasOwn(d,'layers'))fail(p,'environment fields on object');
   const a=catalog.get(d.asset);if(!a||((a.category==='characters')!==(d.kind==='character')))fail(p,'wrong or unknown recipe family');
   if(!Object.hasOwn(d,'appearance')||!Object.hasOwn(d,'variants')||!Object.hasOwn(d,'defaultPose'))fail(p,'appearance, variants and defaultPose required');
   if(!a.configurable)fields(d.appearance,[],p+'.appearance');else validateAssetParams(d.asset,d.appearance);
   list(d.variants,0,8,p+'.variants');const vs=new Set();
   for(const v of d.variants){
    fields(v,['id','appearance'],p+'.variant',['id','appearance']);id(v.id,p+'.variant.id');if(vs.has(v.id))fail(p,'duplicate variant');vs.add(v.id);
    if(!a.configurable)fail(p,'legacy recipe has immutable colors');
    fields(v.appearance,['primary','secondary','accent'],p+'.variant.appearance');if(!Object.keys(v.appearance).length)fail(p,'empty variant');validateAssetParams(d.asset,v.appearance);
   }
   fields(d.defaultPose,supportedChannels(d.asset),p+'.defaultPose');for(const [k,v] of Object.entries(d.defaultPose))finite(v,...limits[k],p+'.defaultPose.'+k);
  }
  map.set(d.id,d);
 }
 return map;
}
export function restoreLibrary(lib){validateLibrary(lib);return freeze(JSON.parse(canonical(lib)));}
export function resolveIdentity(map,identity,variant='base'){
 const d=map.get(identity);if(!d||d.kind==='environment')fail('identity','unknown object '+identity);
 const v=variant==='base'?null:d.variants.find(x=>x.id===variant);
 if(variant!=='base'&&!v)fail('identity','unknown variant '+variant);
 return {identity:d.id,variant,asset:d.asset,identityPose:{...d.defaultPose},...(catalog.get(d.asset).configurable?{params:{...d.appearance,...v?.appearance}}:{})};
}
export function compactIdentities(q){
 if(!q.identityLibrary)return [];
 const map=validateLibrary(q.identityLibrary);list(q.cast,1,8,'request.cast');const ids=new Set();
 return q.cast.map(k=>{id(k,'cast');const d=map.get(k);if(!d||ids.has(k))fail('cast','unknown or duplicate identity');ids.add(k);
 return d.kind==='environment'?{id:d.id,name:d.name,kind:d.kind,environment:d.environment,layers:d.layers}:{id:d.id,name:d.name,kind:d.kind,asset:d.asset,variants:['base',...d.variants.map(v=>v.id)],rig:recipeRig(d.asset)};
 });
}
export function validateIdentityRequest(q){
 if(q.identityLibrary===undefined){if(q.cast!==undefined||q.story!==undefined)fail('request','cast/story requires identityLibrary');return;}
 const cast=compactIdentities(q);
 if(!cast.some(d=>d.kind==='character')||!cast.some(d=>d.kind==='environment'))fail('cast','requires character and environment');
 if(q.story!==undefined){
  choice(q.story,['delivery'],'request.story');
  if(q.script!==undefined||q.seconds<45||q.seconds>90||cast.filter(d=>d.kind==='character').length!==1||cast.filter(d=>d.kind==='prop').length!==1||cast.filter(d=>d.kind==='environment').length!==2||!cast.find(d=>d.kind==='character').rig.anchors.includes('right-hand'))fail('story','delivery requires 45–90 seconds, one hand-rig character, one prop, two locations, no supplied script');
 }
}
export function compileIdentityAssets(q,shot,assets){
 const map=validateLibrary(q.identityLibrary),byIdentity=new Map();
 const result=assets.map((a,i)=>{const ir=shot.assets[i];if(!ir.identity)return a;byIdentity.set(ir.identity,a.id);return {...a,...resolveIdentity(map,ir.identity,ir.variant??'base')};});
 for(const [i,ir] of shot.assets.entries())if(ir.hold){
  if(!ir.identity||!byIdentity.has(ir.hold.holder))fail('hold','unknown holder or prop');
  const {holder,...hold}=ir.hold;result[i].attachment={...hold,parent:byIdentity.get(holder),...(hold.start>0?{blendIn:Math.min(.08,(hold.end-hold.start)/2)}:{})};
 }
 return result;
}
export function identityLocation(q,shot){
 const d=validateLibrary(q.identityLibrary).get(shot.location);
 if(!q.cast.includes(shot.location)||d?.kind!=='environment'||shot.environment!==d.environment)fail('location','unselected location or mismatch');
 return {environment:d.environment,...(d.layers?{layers:d.layers}:{}),continuity:{location:d.id,events:shot.events}};
}
export function continuityLedger(project){
 const lib=project.identityLibrary;
 if(lib===undefined){
  for(const s of project.shots??[])if(s.continuity!==undefined||s.assets?.some(a=>['identity','variant','identityPose'].some(k=>Object.hasOwn(a,k))))fail('continuity','identity library required');
  return null;
 }
 const map=validateLibrary(lib),ledger=[],warnings=[],known=new Map(),held=new Map();let prior=null,last=new Set();
 for(const s of project.shots){
  const p='continuity.'+s.id;if(s.template!=='cinematic-graph')fail(p,'identity film requires graph shots');
  fields(s.continuity,['location','events'],p,['location','events']);
  const loc=map.get(s.continuity.location);if(loc?.kind!=='environment'||s.environment!==loc.environment||s.layers!==loc.layers)fail(p,'location appearance drift');
  list(s.continuity.events,0,32,p+'.events');
  const expected=[],seen=new Map(),byLocal=new Map(s.assets.map(a=>[a.id,a]));
  if(prior&&prior!==loc.id)expected.push({type:'move',from:prior,to:loc.id});
  for(const a of s.assets){
   if(!Object.hasOwn(a,'identity')){if(a.variant!==undefined||a.identityPose!==undefined)fail(p,'orphan variant or pose');continue;}
   if(seen.has(a.identity))fail(p,'duplicate identity instance');seen.set(a.identity,a);
   const binding=resolveIdentity(map,a.identity,a.variant);
   for(const k of ['identity','variant','asset','params','identityPose'])if(!equal(a[k],binding[k]))fail(p,'identity appearance or default pose drift: '+a.identity+'.'+k);
   const old=known.get(a.identity)??'base';if(old!==a.variant)expected.push({type:'variant',identity:a.identity,from:old,to:a.variant});
   if(known.has(a.identity)&&!last.has(a.identity))warnings.push({shot:s.id,code:'reentry',identity:a.identity});
   known.set(a.identity,a.variant);
  }
  for(const [prop,h] of held)if(!seen.has(prop)||!seen.has(h.holder))fail(p,'held prop or holder disappeared');
  const startHeld=new Map(held),intervals=[];
  for(const a of s.assets){
   if(Array.isArray(a.attachment)&&(a.identity||a.attachment.some(x=>byLocal.get(x.parent)?.identity)))fail(p,'handoff chains are not yet supported by the identity continuity ledger');
   if(!a.identity){if(a.attachment&&byLocal.get(a.attachment.parent)?.identity)fail(p,'untracked prop on tracked character');continue;}
   const def=map.get(a.identity),old=held.get(a.identity),x=a.attachment;
   if(!x){if(old)fail(p,'held prop detached without release');continue;}
   const parent=byLocal.get(x.parent);
   if(def.kind!=='prop'||!parent?.identity||map.get(parent.identity)?.kind!=='character')fail(p,'attachment requires tracked prop and character');
   const h={holder:parent.identity,anchor:x.anchor};
   if(old){if(x.start!==0||!equal(old,h))fail(p,'unexplained holder or hand change');}
   else expected.push({type:'pickup',prop:a.identity,...h,at:x.start});
   intervals.push({key:h.holder+':'+h.anchor,start:x.start,end:x.end});
   if(x.end<1){expected.push({type:'release',prop:a.identity,...h,at:x.end});held.delete(a.identity);}else held.set(a.identity,h);
  }
  for(let i=0;i<intervals.length;i++)for(let j=i+1;j<intervals.length;j++){const a=intervals[i],b=intervals[j];if(a.key===b.key&&Math.max(a.start,b.start)<Math.min(a.end,b.end))fail(p,'hand occupied by multiple props');}
  if(!equal(s.continuity.events.map(canonical).sort(),expected.map(canonical).sort()))fail(p,'explicit state transition mismatch; expected '+JSON.stringify(expected));
  const holdings=m=>[...m].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([prop,h])=>({prop,...h}));
  ledger.push({shot:s.id,location:loc.id,identities:[...seen].map(([identity,a])=>({identity,variant:a.variant,appearance:a.params??{},defaultPose:a.identityPose})),heldAtStart:holdings(startHeld),heldAtEnd:holdings(held),events:expected});
  prior=loc.id;last=new Set(seen.keys());
 }
 return {version:1,shots:ledger,warnings};
}
