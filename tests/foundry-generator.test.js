import test from 'node:test';
import assert from 'node:assert/strict';
import {recipeFor,compileRecipe,makeGeneratedRef,resolveGenerated,generatedDigest} from '../src/foundry/generator.js';
import {resolveAssetRequest,GenerationRegistry,classifyAsset} from '../src/director/foundry.js';
import {direct} from '../src/director/index.js';
import {evaluateGraph} from '../src/core/graph.js';
import {meshCommands} from '../src/foundry/instances.js';
test('AF07 bounded deterministic canonical geometry and tamper detection',()=>{
 const families=['survey-beacon','ceramic-insulator','specimen-canister'];const refs=families.map(f=>makeGeneratedRef(recipeFor(f)));
 assert.equal(new Set(refs.map(x=>x.fingerprint)).size,3);
 for(const ref of refs){assert.equal(makeGeneratedRef(recipeFor(ref.recipe.family)).digest,ref.digest);assert.ok(resolveGenerated(ref).triangles>0);const bad=structuredClone(ref);bad.digest='0'.repeat(64);assert.throws(()=>resolveGenerated(bad),/digest/);}
});
test('AF07 rejects cycles, missing references, duplicate IDs, unsafe material and expansion bombs',()=>{
 for(const mutate of [r=>r.nodes.at(-1).children.push('root'),r=>r.nodes.at(-1).children.push('missing'),r=>r.nodes.push(r.nodes[0]),r=>r.nodes[0].material='shader-code',r=>r.nodes[0].params=[Array(1000).fill(1),0],r=>r.nodes[1].ref='../other',r=>{r.nodes.at(-1).children=Array(60).fill('foot-at')}]){
 const r=recipeFor('survey-beacon');mutate(r);assert.throws(()=>compileRecipe(r));}
});
test('AF07 alias reuse and explicit staging and promotion',async()=>{
 const registry=new GenerationRegistry();const a=await resolveAssetRequest('survey beacon',{registry}),b=await resolveAssetRequest('field signal beacon',{registry});
 assert.equal(a.status,'generate',a.reason);assert.equal(b.status,'generate',b.reason);assert.equal(a.ref.digest,b.ref.digest);assert.equal(b.reused,true);assert.equal(registry.size,1);assert.equal(a.evidence.humanReview,'unreviewed');
 assert.throws(()=>registry.promote(a.ref.digest,{}));assert.equal(registry.promote(a.ref.digest,{decision:'approve',reviewer:'test fixture',evidenceDigest:a.evidence.digest,revision:a.ref.revision}).status,'approved');assert.equal(registry.resolve(a.ref.digest).status,'staged');
 assert.equal(classifyAsset('cell phone').id,'smartphone');assert.equal(classifyAsset('articulated octopus').status,'unsupported');
});
test('AF07 bounded provider repair and unavailable typed outcome',async()=>{
 let calls=0;const adapter={generate:async()=>({text:++calls===1?'{"code":"eval"}':'{"version":1,"family":"survey-beacon"}'})};
 const x=await resolveAssetRequest('survey beacon',{adapter});assert.equal(x.status,'generate',x.reason);assert.equal(x.attempts.length,2);assert.equal(calls,2);
 const y=await resolveAssetRequest('survey beacon',{adapter:{generate:async()=>{throw Error('offline')}}});assert.equal(y.status,'provider-unavailable');
 const z=await resolveAssetRequest('survey beacon',{adapter:{generate:async()=>({text:'{}'})},maxRepairs:2});assert.equal(z.status,'reject');assert.equal(z.attempts.length,3);
 assert.equal((await resolveAssetRequest('survey beacon',{requireProvider:true})).status,'provider-unavailable');
});
test('AF07 Director story pins generated revisions and matched backend commands',async()=>{
 const q={version:1,id:'af07-test',topic:'Signal laboratory',seconds:30},options={foundryRequests:['survey beacon','ceramic insulator','specimen canister']};
 const cpu=await direct(q,options),three=await direct({...q,backend:'three'},options);
 assert.equal(cpu.project.shots.length,6);assert.equal(cpu.project.shots.reduce((n,s)=>n+s.durationFrames,0),900);
 for(let i=0;i<6;i++){const a=cpu.project.shots[i],b=three.project.shots[i];assert.deepEqual({...a,backend:'three'},b);assert.equal(a.assets[1].generatedRef.digest,cpu.project.shots[i%3].assets[1].generatedRef.digest);const ca=meshCommands(evaluateGraph(a,.5)),cb=meshCommands(evaluateGraph(b,.5));assert.deepEqual(ca.map(c=>c.meshRef),cb.map(c=>c.meshRef));assert.ok(ca.some(c=>c.id.startsWith('prop/')));}
});
