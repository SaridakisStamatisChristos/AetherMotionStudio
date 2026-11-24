import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct,allocateFrames} from '../src/director/index.js';
import {baseline,offlineIR} from '../src/director/offline.js';
import {request,safeJson} from '../src/director/schema.js';
import {directorCatalog,retrieveAssets} from '../src/director/catalog.js';
import {provider,mockProvider} from '../src/director/providers.js';
import {validateProject} from '../src/core/timeline.js';
const q={version:1,id:'test-film',topic:'How computers send messages across a network',seconds:60,backend:'cpu',profile:'polished'};
test('offline held-out request constraints and distinct retrieval',async()=>{
 for(const [topic,seconds,backend,profile] of [['How solar panels work',15,'cpu','original'],['Water molecules',30,'three','polished'],['Arch bridges',60,'cpu','polished'],['Supply chain logistics',60,'three','original'],['Ancient philosophy',30,'cpu','polished']]){
  const x=await direct({...q,topic,seconds,backend,profile});validateProject(x.project);assert.equal(x.project.shots.reduce((n,s)=>n+s.durationFrames,0),seconds*30);assert.ok(x.project.shots.every(s=>s.backend===backend&&Object.hasOwn(s,'fidelity')===(profile==='polished')));assert.equal(x.manifest.tokens.input,null);assert.ok(x.manifest.catalogReduction>0);
 }
 assert.notDeepEqual(retrieveAssets('bridge').map(x=>x.id),retrieveAssets('computer network').map(x=>x.id));
 assert.equal(directorCatalog().objects.length,250);
});
test('matched director fixtures are generated deterministically',async()=>{
 const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.request.json',import.meta.url)));
 const a=await direct(load('director-cpu-polished')),b=await direct(load('director-three-polished')),c=await direct(load('director-cpu-polished'));
 b.project.id=a.project.id;b.project.shots.forEach(s=>s.backend='cpu');assert.deepEqual(a.project,b.project);assert.deepEqual(a.project,c.project);assert.equal(a.manifest.projectDigest,c.manifest.projectDigest);
});
test('script preserved verbatim and import works',async()=>{
 const input={...q,script:'One message starts here. It travels through a network. The receiver gets the data.',seconds:15};
 const x=await direct(input);assert.equal(x.project.shots.flatMap(s=>s.narration).join(' '),input.script);
 const y=await direct(input,{imported:JSON.stringify(x.ir)});assert.deepEqual(y.project,x.project);
 const bad=structuredClone(x.ir);bad.shots[0].narration=['Changed text'];await assert.rejects(direct(input,{imported:JSON.stringify(bad)}),/preserved exactly/);
});
test('malformed, unknown, incompatible data fail; bounded regeneration works',async()=>{
 const req=request(q),ir=offlineIR(req,baseline(req));let calls=0;
 const p=mockProvider(async()=>({text:++calls===1?'not json':JSON.stringify(ir),usage:{input:100,output:50}}));
 const x=await direct(q,{adapter:p,maxRepairs:1});assert.equal(calls,2);assert.equal(x.manifest.repairs,1);assert.equal(x.manifest.tokens.input,200);
 for(const mutation of [a=>a.shots[0].assets[0].asset='https://invalid/model',a=>a.shots[0].assets[0].action='wave',a=>a.shots[0].camera='unknown',a=>a.shots[0].backend='three',a=>a.shots[0].assets[0].scale=99,a=>a.shots[0].effect='unknown']){
  const bad=structuredClone(ir);mutation(bad);await assert.rejects(direct(q,{imported:JSON.stringify(bad)}));
 }
 await assert.rejects(direct(q,{adapter:mockProvider(async()=>({text:'{}'})),maxRepairs:0}),/director/);
});
test('size depth unsafe keys and explicit voice/backend constraints',()=>{
 assert.throws(()=>safeJson('['.repeat(25)+']'.repeat(25)),/depth/);assert.throws(()=>safeJson('{"__proto__":{}}'),/unsafe/);assert.throws(()=>safeJson(' '.repeat(262145)),/size/);
 for(const bad of [{backend:'automatic'},{voice:'unknown'},{language:'el'},{language:'en-gb',voice:'af_heart'},{seconds:301},{id:'../x'}])assert.throws(()=>request({...q,...bad}));
 for(let n=1;n<=20;n++){const s=Array.from({length:n},(_,i)=>({narration:['word '.repeat(i+1).trim()]}));assert.equal(allocateFrames(s,1234).reduce((a,b)=>a+b,0),1234);}
});
test('provider remote opt-in, usage, errors, timeout; no actual network',async()=>{
 assert.throws(()=>provider('local',{model:'m',endpoint:'https://example.com/v1'}),/loopback/);
 assert.throws(()=>provider('openai-compatible',{model:'m',endpoint:'https://example.com/v1',apiKey:'test'}),/opt-in/);
 const conf={model:'m',endpoint:'http://127.0.0.1:11434/v1',timeoutMs:100};
 const p=provider('local',conf,async(url,opts)=>{assert.equal(url,conf.endpoint+'/chat/completions');assert.equal(opts.redirect,'error');return new Response(JSON.stringify({choices:[{message:{content:'{}'}}],usage:{prompt_tokens:12,completion_tokens:3}}));});
 assert.deepEqual((await p.generate('test')).usage,{input:12,output:3});
 const http=provider('local',conf,async()=>new Response('error',{status:503}));await assert.rejects(http.generate('test'),/HTTP 503/);
 const timeout=provider('local',conf,async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('abort')),{once:true})));await assert.rejects(timeout.generate('test'),/timeout/);
 const g=provider('gemini',{model:'test-model',apiKey:'secret',allowRemote:true},async(url,o)=>{assert.ok(url.endsWith('/models/test-model:generateContent'));assert.equal(o.headers['x-goog-api-key'],'secret');return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{}'}]}}],usageMetadata:{promptTokenCount:8,candidatesTokenCount:2}}));});
 assert.deepEqual((await g.generate('test')).usage,{input:8,output:2});
});
