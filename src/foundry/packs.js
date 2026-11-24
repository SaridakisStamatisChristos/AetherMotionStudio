// AF08 compact portable manifests. Browser-safe, no storage or network side effects.
import {HERO_IDS,HERO_REGISTRY,HERO_PACKS,heroCommands,heroAnchors,heroBounds} from './hero.js';
import {GENERATED_ID,GENERATED_PROFILE,makeGeneratedRef,recipeFor,resolveGenerated,generatedCommands,generatedBounds,generatedDigest} from './generator.js';
import {COMPILER_VERSION} from './digest.js';
import {strict,hex} from './import-bundle.js';
import {OBJECT_CATALOG} from '../visual/catalog.js';
export const PACK_LIMITS=Object.freeze({assets:32,bytes:512*1024,packs:64});
const fail=m=>{throw Error('pack: '+m)};
const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x)&&!['constructor','prototype'].includes(x);
const pose={origin:[0,0,0],scale:1,yaw:0,walking:0,open:0,headYaw:0,blink:1};
const moved={...pose,walking:.5,open:.8,headYaw:.3,armPitch:-.4,armSpread:.2,grip:.5};
const heroCache=new Map();
export function heroDependency(id){
 if(!HERO_IDS.includes(id))fail('unknown premium identity');
 if(heroCache.has(id))return heroCache.get(id);
 const a={id:'subject',asset:id,pose};
 const samples=[0,1,2,3].map(lod=>heroCommands(a,lod).map(c=>[c.id,c.meshRef,c.origin,c.axes,c.pivot,c.surface]));
 const motion=heroCommands({...a,pose:moved},1).map(c=>[c.id,c.meshRef,c.origin,c.axes,c.pivot,c.surface]);
 const fingerprint=generatedDigest({compiler:COMPILER_VERSION,id,revision:HERO_REGISTRY[id].revision,samples,motion,anchors:heroAnchors(a)});
 const value=Object.freeze({kind:'hero',id,revision:HERO_REGISTRY[id].revision,digest:fingerprint,license:'project-policy',attribution:'AetherMotion original procedural design'});
 heroCache.set(id,value);return value;
}
export function validateHeroPin(id,pin){
 strict(pin,['revision','digest']);const d=heroDependency(id);if(pin.revision!==d.revision||pin.digest!==d.digest)fail('premium dependency mismatch '+id);return true;
}
export function generatedDependency(ref){
 resolveGenerated(ref);return {kind:'generated',id:ref.recipe.family,revision:ref.revision,digest:ref.digest,license:'project-policy',attribution:'AetherMotion original procedural recipe',ref};
}
function validateEntry(e){
 if(e?.kind==='hero'){strict(e,['kind','id','revision','digest','license','attribution']);const d=heroDependency(e.id);if(generatedDigest(d)!==generatedDigest(e))fail('missing or changed hero dependency '+e.id);return}
 if(e?.kind==='generated'){strict(e,['kind','id','revision','digest','license','attribution','ref']);const d=generatedDependency(e.ref);if(generatedDigest(d)!==generatedDigest(e))fail('generated dependency mismatch '+e.id);return}
 fail('unknown dependency type');
}
function header(p){
 strict(p,['version','id','revision','entries','digest']);
 if(p.version!==1||!slug(p.id)||typeof p.revision!=='string'||!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(p.revision)||!Array.isArray(p.entries)||!p.entries.length||p.entries.length>PACK_LIMITS.assets||!hex(p.digest))fail('manifest header');
}
export function verifyPack(p){
 header(p);
 const ids=new Set();for(const e of p.entries){validateEntry(e);if(ids.has(e.id))fail('duplicate identity');ids.add(e.id)}
 if(JSON.stringify(p).length>PACK_LIMITS.bytes)fail('pack byte budget');
 const {digest,...body}=p;if(generatedDigest(body)!==digest)fail('manifest digest mismatch');return p;
}
export function makePack(id,entries,revision='1.0.0'){
 const body={version:1,id,revision,entries:[...entries].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)};
 return verifyPack({...body,digest:generatedDigest(body)});
}
export function builtinPack(id){
 if(Object.hasOwn(HERO_PACKS,id))return makePack(id,HERO_PACKS[id].map(heroDependency));
 if(id==='generated-lab')return makePack(id,['survey-beacon','ceramic-insulator','specimen-canister'].map(f=>generatedDependency(makeGeneratedRef(recipeFor(f)))));
 fail('unknown built-in pack');
}
export const BUILTIN_PACKS=Object.freeze([...Object.keys(HERO_PACKS),'generated-lab']);
const legacy=OBJECT_CATALOG.map(a=>({id:a.id,name:a.id.replaceAll('-',' '),kind:'legacy',category:a.category,tags:[a.category,a.family],pack:null,revision:'legacy-1.0.0',quality:'legacy',license:'project-policy',backends:['cpu','three'],lods:[],materials:null,motion:null}));
const heroMeta=HERO_IDS.map(id=>{const a=HERO_REGISTRY[id];return {id,name:a.name,kind:'hero',category:a.category,tags:[a.category,a.pack,...a.anchors],pack:a.pack,revision:a.revision,quality:'candidate',license:a.license,backends:['cpu','three'],lods:[0,1,2,3],motion:a.category==='characters'?['root','articulated']:['laptop','robot-arm'].includes(id)?['root','open']:['root'],materials:null}});
const generatedMeta=e=>({id:e.id,name:e.id.replaceAll('-',' '),kind:'generated',category:e.id==='specimen-canister'?'science':'technology',tags:['generated','static',...e.id.split('-')],pack:'generated-lab',revision:e.revision,quality:'staged',license:e.license,backends:['cpu','three'],lods:[0],motion:['root'],materials:null,digest:e.digest});
const generatedIds=['survey-beacon','ceramic-insulator','specimen-canister'];
const lazyGenerated=new Map();
function getGenerated(id){if(!generatedIds.includes(id))fail('unknown generated identity');if(!lazyGenerated.has(id))lazyGenerated.set(id,generatedDependency(makeGeneratedRef(recipeFor(id))));return lazyGenerated.get(id)}
export class PackRegistry{
 #packs=new Map();
 import(pack){
  verifyPack(pack);const key=pack.id+'@'+pack.revision,prior=this.#packs.get(key);
  if(BUILTIN_PACKS.includes(pack.id)&&pack.revision==='1.0.0'&&builtinPack(pack.id).digest!==pack.digest)fail('built-in pack revision conflict');
  if(prior&&prior.digest!==pack.digest)fail('pack revision conflict');
  for(const e of pack.entries)for(const p of this.#packs.values())for(const old of p.entries)if(old.id===e.id&&old.revision===e.revision&&old.digest!==e.digest)fail('asset revision conflict');
  if(!prior&&this.#packs.size>=PACK_LIMITS.packs)fail('registry capacity');
  this.#packs.set(key,structuredClone(pack));return {key,digest:pack.digest,reused:!!prior};
 }
 get(id,revision='1.0.0'){const p=this.#packs.get(id+'@'+revision);if(p)return structuredClone(p);if(revision!=='1.0.0')fail('missing pack revision');return builtinPack(id)}
 list(){return [...this.#packs.values()].map(p=>({id:p.id,revision:p.revision,digest:p.digest,assets:p.entries.length})).sort((a,b)=>a.id.localeCompare(b.id))}
 entries(){return [...this.#packs.values()].flatMap(p=>p.entries.map(e=>({pack:p.id,entry:structuredClone(e)})))}
}
export function assetEntry(kind,id,revision,registry=new PackRegistry()){
 if(kind==='hero'){const e=heroDependency(id);if(revision&&revision!==e.revision)fail('unknown hero revision');return e}
 if(kind==='generated'){const imported=registry.entries().map(x=>x.entry).find(e=>e.kind===kind&&e.id===id&&(!revision||e.revision===revision));const e=imported??getGenerated(id);if(revision&&revision!==e.revision)fail('unknown generated revision');return e}
 fail('legacy objects do not have portable premium dependencies');
}
export function assetDetails(entry,lod=0){
 validateEntry(entry);if(entry.kind==='generated'&&lod!==0)fail('generated LOD0 only');
 const a={id:'subject',asset:entry.kind==='hero'?entry.id:GENERATED_ID,pose,...(entry.kind==='generated'?{generatedRef:entry.ref}:{})};
 const commands=entry.kind==='hero'?heroCommands(a,lod):generatedCommands(a),b=entry.kind==='hero'?heroBounds(a):generatedBounds(a);
 return {commands,bounds:b,dimensions:b.hi.map((v,i)=>v-b.lo[i]),materials:[...new Set(commands.map(c=>c.surface.preset))].sort(),anchors:entry.kind==='hero'?heroAnchors(a):entry.ref.recipe.anchors};
}
export function searchRegistry(query={},registry=new PackRegistry()){
 strict(query,['q','category','tag','kind','pack','backend','quality','license','lod','material','motion','maxHeight','limit']);
 const limit=query.limit??100;if(!Number.isInteger(limit)||limit<1||limit>300)fail('search limit');
 for(const k of ['q','category','tag','kind','pack','backend','quality','license','material','motion'])if(query[k]!==undefined&&(typeof query[k]!=='string'||query[k].length>100))fail('invalid query');
 if(query.lod!==undefined&&![0,1,2,3].includes(query.lod)||query.maxHeight!==undefined&&(!Number.isFinite(query.maxHeight)||query.maxHeight<=0||query.maxHeight>100))fail('invalid dimension or LOD filter');
 // Ordinary search never loads geometry; generated built-in revisions are derived on demand for details.
 const builtGenerated=generatedIds.map(id=>({id,name:id.replaceAll('-',' '),kind:'generated',category:id==='specimen-canister'?'science':'technology',tags:['generated','static',...id.split('-')],pack:'generated-lab',revision:null,quality:'staged',license:'project-policy',backends:['cpu','three'],lods:[0],motion:['root'],materials:null}));
 const imported=registry.entries().map(({pack,entry:e})=>({...e.kind==='hero'?heroMeta.find(x=>x.id===e.id):generatedMeta(e),pack}));
 const rows=[...legacy,...heroMeta,...builtGenerated,...imported],seen=new Set(),out=[];
 const terms=(query.q??'').toLowerCase().replace(/\bcell phone\b/g,'smartphone').replace(/\bportable computer\b/g,'laptop').split(/[^a-z0-9]+/).filter(Boolean);
 for(const a of rows){
  const hay=[a.id,a.name,...a.tags].join(' ').toLowerCase();if(!terms.every(t=>hay.includes(t)))continue;
  if(['category','kind','pack','quality','license'].some(k=>query[k]&&a[k]!==query[k])||query.tag&&!a.tags.includes(query.tag)||query.backend&&!a.backends.includes(query.backend)||query.lod!==undefined&&!a.lods.includes(query.lod)||query.motion&&!a.motion?.includes(query.motion))continue;
  const key=[a.kind,a.id,a.revision,a.pack].join(':');if(seen.has(key))continue;seen.add(key);
  let row=a;if(query.material||query.maxHeight!==undefined){if(a.kind==='legacy')continue;const d=assetDetails(assetEntry(a.kind,a.id,a.revision,registry));if(query.material&&!d.materials.includes(query.material)||query.maxHeight!==undefined&&d.dimensions[1]>query.maxHeight)continue;row={...a,materials:d.materials,dimensions:d.dimensions}}
  out.push(row);if(out.length===limit)break;
 }
 return out;
}
export function pinAsset(entry,id,tracks){
 validateEntry(entry);
 return entry.kind==='hero'?{id,asset:entry.id,heroPin:{revision:entry.revision,digest:entry.digest},tracks}:{id,asset:GENERATED_ID,generatedRef:structuredClone(entry.ref),tracks};
}
// Explicit pack dependency references resolve before existing scene validation.
export function compilePackedShot(shot,packs){
 const manifests=new Map();for(const p of packs){verifyPack(p);if(manifests.has(p.id))fail('ambiguous pack identity');manifests.set(p.id,p)}
 if(!Array.isArray(shot.assets)||shot.assets.length>8)fail('asset count');
 const assets=shot.assets.map(a=>{strict(a,['id','pack','packDigest','asset','revision','digest','tracks','lod']);const p=manifests.get(a.pack);if(!p||p.digest!==a.packDigest)fail('missing pack or dependency digest');const e=p.entries.find(x=>x.id===a.asset&&x.revision===a.revision&&x.digest===a.digest);if(!e)fail('missing pinned asset');return pinAsset(e,a.id,a.tracks)});
 return {...shot,assets,geometryProfile:GENERATED_PROFILE,lodPolicy:{version:1,quality:'cinematic',selection:'explicit',overrides:shot.assets.map(a=>({asset:a.id,level:a.lod}))}};
}
