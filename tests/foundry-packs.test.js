import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {builtinPack,makePack,verifyPack,PackRegistry,searchRegistry,assetEntry,heroDependency,compilePackedShot} from '../src/foundry/packs.js';
import {generatedDigest} from '../src/foundry/generator.js';
import {compilePackedStory,packedDirectorSelection} from '../src/director/packed-story.js';
import {addFoundryAsset,removeAsset} from '../src/studio/model.js';
import {validateProject} from '../src/core/timeline.js';
import {createStudio} from '../scripts/studio-server.mjs';
const story=JSON.parse(await readFile(new URL('../examples/foundry-af08-story.json',import.meta.url),'utf8'));
const packs=story.packs.map(builtinPack);
test('AF08 compact pack digest, portable dependencies, no silent conflict',()=>{
 const p=packs[0],registry=new PackRegistry();assert.equal(registry.import(p).reused,false);assert.equal(registry.import(structuredClone(p)).reused,true);
 const other=makePack(p.id,p.entries.slice(0,1),p.revision);assert.throws(()=>registry.import(other),/conflict/);
 const bad=structuredClone(p);bad.entries[0].digest='a'.repeat(64);const {digest,...body}=bad;bad.digest=generatedDigest(body);assert.throws(()=>verifyPack(bad),/dependency/);
 assert.throws(()=>makePack('../unsafe',p.entries));assert.throws(()=>makePack('duplicate',[p.entries[0],p.entries[0]]));assert.throws(()=>verifyPack({...p,extra:'x'}));
 assert.deepEqual(registry.get(p.id),p);
});
test('AF08 indexed search filters and compact Director shortlist',()=>{
 const r=new PackRegistry();r.import(packs[1]);const rows=searchRegistry({kind:'hero',category:'characters',pack:'retro-lab',backend:'cpu',lod:1});assert.ok(rows.some(x=>x.id==='retro-robot'));assert.ok(rows.every(x=>x.category==='characters'));
 assert.ok(searchRegistry({q:'cell phone'}).some(x=>x.id==='smartphone'));
 const metal=searchRegistry({kind:'generated',q:'beacon',material:'brushed-steel',maxHeight:2},r);assert.ok(metal.length);
 assert.equal(searchRegistry({kind:'generated',lod:3}).length,0);assert.throws(()=>searchRegistry({limit:10000}));
 const shortlist=packedDirectorSelection({kind:'generated',q:'beacon'},r);assert.ok(shortlist.length);assert.ok(shortlist.every(x=>!x.ref&&!x.recipe));
});
test('AF08 authored portable story pins shared prop and hero; missing dependency rejected',()=>{
 const a=compilePackedStory(story,packs),b=compilePackedStory(story,JSON.parse(JSON.stringify(packs)),'three');
 assert.deepEqual(a.shots.map(s=>({...s,backend:'three'})),b.shots);
 assert.equal(a.shots[0].assets[0].heroPin.digest,heroDependency('retro-robot').digest);
 assert.equal(a.shots[0].assets[1].generatedRef.digest,a.shots[4].assets[1].generatedRef.digest);
 assert.throws(()=>compilePackedStory(story,[packs[0]]));const bad=structuredClone(a);bad.shots[0].assets[0].heroPin.digest='0'.repeat(64);assert.throws(()=>validateProject(bad),/dependency/);
 const e=packs[1].entries[0],x=addFoundryAsset(a,0,e,0);assert.equal(x.shots[0].assets.length,3);assert.deepEqual(removeAsset(x,0,x.shots[0].assets[2].id),a);
 assert.throws(()=>addFoundryAsset(a,0,e,3));
});
test('AF08 Studio HTTP pack persistence across restart and on-demand preview',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'af08-'));let s;try{
 s=await createStudio({root:dir,dataDir:join(dir,'data')});let origin=await s.listen(0);
 const post=(p)=>fetch(origin+'/api/foundry/pack',{method:'POST',headers:{'Content-Type':'application/json','X-Aether-Studio':'1'},body:JSON.stringify({pack:p})});
 assert.equal((await post(packs[1])).status,200);assert.equal((await post(makePack(packs[1].id,packs[1].entries.slice(0,1)))).status,400);
 const project=compilePackedStory(story,packs);const saved=await fetch(origin+'/api/projects/'+project.id,{method:'PUT',headers:{'Content-Type':'application/json','X-Aether-Studio':'1'},body:JSON.stringify({project,revision:null})});assert.equal(saved.status,200);
 await s.close();s=null;s=await createStudio({root:dir,dataDir:join(dir,'data')});origin=await s.listen(0);
 const list=await (await fetch(origin+'/api/foundry/packs')).json();assert.equal(list.installed[0].digest,packs[1].digest);
 const restored=await (await fetch(origin+'/api/projects/'+project.id)).json();assert.deepEqual(restored.project,project);
 const preview=await (await fetch(origin+'/api/foundry/asset?kind=generated&id=survey-beacon')).json();assert.ok(preview.preview.startsWith('data:image/bmp;base64,'));assert.ok(preview.info.metrics.visiblePixels>0);
 assert.equal((await fetch(origin+'/api/foundry/asset?kind=generated&id=../bad')).status,400);
 }finally{if(s)await s.close();await rm(dir,{recursive:true,force:true});}
});
