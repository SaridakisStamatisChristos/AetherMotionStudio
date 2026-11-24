import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {defaultSpeech,productionId,matchedProject,normalizedProject,matchedTargetFrames,projectProfile,sharedArtifacts,verifyShared,SPEECH_SHARED,AUTHORED_SHARED} from '../src/studio/production.js';
import {parseProduction} from '../scripts/production-options.mjs';
import {validateProject} from '../src/core/timeline.js';
const fixture=JSON.parse(readFileSync(new URL('../examples/release.request.json',import.meta.url),'utf8'));
test('one-click request preserves explicit backend, script and speech target',()=>{
 const o=parseProduction(['--request','fixture','--backend','both','--repair'],{read:()=>JSON.stringify(fixture)});
 assert.deepEqual(o.ids,['release-cpu-polished','release-three-polished']);assert.deepEqual(o.backends,['cpu','three']);assert.equal(o.request.speech.targetFrames,900);assert.equal(o.repair,true);
 assert.deepEqual(parseProduction(['--topic','How a molecule is built','--seconds','30','--backend','three'],{newId:()=> 'demo'}).backends,['three']);
 assert.throws(()=>parseProduction(['--topic','x','--backend','gpu']));
 assert.throws(()=>parseProduction(['--topic','x','--id','../escape']));
 assert.throws(()=>parseProduction(['--topic','x','--seconds','301']));
 assert.throws(()=>parseProduction(['--topic','x','--topic','y']));
 assert.throws(()=>parseProduction(['--request','fixture','--seconds','20'],{read:()=>JSON.stringify({...fixture,speech:defaultSpeech(30)})}));
 assert.throws(()=>productionId('a'.repeat(33),'cpu','polished'));
});
test('release Director plan has same normalized scene for both backends and one binding budget',async()=>{
 const q={...fixture,speech:defaultSpeech(30)};
 const [a,b]=await Promise.all([direct({...q,id:'release-prepared',backend:'cpu'}),direct({...q,id:'release-three-polished',backend:'three'})]);
 assert.equal(a.manifest.mode,'curated-topic-pattern');assert.equal(a.project.shots.length,3);
 assert.equal(a.project.speech.targetFrames,900);assert.ok(a.project.shots.every(x=>x.durationFrames===null));
 assert.deepEqual(normalizedProject(a.project),normalizedProject(b.project));
 assert.equal(validateProject(a.project),a.project);
 assert.throws(()=>matchedProject(a.project,null,'release-three-polished','three')); // never render with absent measured timeline
});
// LOCAL-02: authored matched production
const example=name=>readFileSync(new URL('../examples/'+name,import.meta.url),'utf8');
const files=name=>({read:p=>example(p)});
test('authored project mode shares one scene definition and exact authored budget',()=>{
 const o=parseProduction(['--project','cinematic-cpu-polished.json','--pair','cinematic-three-polished.json','--backend','both','--id','local-02-a'],files());
 assert.equal(o.mode,'project');assert.deepEqual(o.backends,['cpu','three']);assert.deepEqual(o.ids,['local-02-a-cpu-polished','local-02-a-three-polished']);
 assert.equal(o.targetFrames,360);assert.equal(o.request,null);assert.deepEqual(o.sources,{project:'cinematic-cpu-polished.json',pair:'cinematic-three-polished.json'});
 const six=parseProduction(['--project','foundry-af09-lab-cpu-polished.json','--pair','foundry-af09-lab-three-polished.json','--backend','both','--id','x'],files());
 assert.equal(six.targetFrames,6*225);
 assert.equal(parseProduction(['--project','cinematic-cpu.json','--id','x'],files()).ids[0],'x-cpu-original');
 // Director mode unchanged: backend still taken from the request when --backend is absent.
 assert.deepEqual(parseProduction(['--request','f'],{read:()=>JSON.stringify({...fixture,backend:'three'})}).backends,['three']);
});
test('authored mode rejects pair mismatch, retiming options and ambiguous sources',()=>{
 assert.throws(()=>parseProduction(['--project','foundry-af09-optimized-cpu-polished.json','--pair','foundry-af09-optimized-three-polished.json','--backend','both','--id','x'],files()),/pair differs/);
 assert.throws(()=>parseProduction(['--project','cinematic-cpu-polished.json','--pair','cinematography-three-polished.json','--id','x'],files()),/pair differs/);
 for(const extra of [['--seconds','20'],['--voice','am_adam'],['--script','x'],['--profile','original'],['--seed','3']])
  assert.throws(()=>parseProduction(['--project','cinematic-cpu-polished.json','--id','x',...extra],files()),/cannot modify an authored/);
 assert.throws(()=>parseProduction(['--project','cinematic-cpu-polished.json','--topic','x'],files()),/exactly one/);
 assert.throws(()=>parseProduction(['--topic','x','--pair','cinematic-three-polished.json']),/only valid with --project/);
 assert.throws(()=>parseProduction(['--project','cinematic-cpu-polished.json','--id','../x'],files()));
 assert.throws(()=>parseProduction(['--project','robot-treasure.json','--id','x'],files())); // v1 scene is not a matched graph project
});
test('matched budget and profile contracts reject unfixed or mixed authored data',()=>{
 const p=JSON.parse(example('foundry-af01-cpu-polished.json'));
 assert.equal(matchedTargetFrames(p),900);assert.equal(projectProfile(p),'polished');
 const open=structuredClone(p);open.shots[2].durationFrames=null;assert.throws(()=>matchedTargetFrames(open),/fixed durationFrames/);
 const mixed=structuredClone(p);delete mixed.shots[1].fidelity;assert.throws(()=>projectProfile(mixed),/Mixed fidelity/);
 const other=structuredClone(p);other.shots[0].template='title-card';assert.throws(()=>matchedTargetFrames(other),/cinematic-graph/);
 assert.throws(()=>matchedProject(p,null,'x-cpu-polished','cpu'),/measured shared timeline/);
 assert.throws(()=>matchedProject(p,{},'x-gpu-polished','gpu'),/backend/);
});
test('shared inventory selects artifacts by mode and detects tampering',()=>{
 assert.deepEqual(sharedArtifacts({speech:{}}),SPEECH_SHARED);assert.deepEqual(sharedArtifacts({}),AUTHORED_SHARED);
 assert.ok(AUTHORED_SHARED.every(x=>SPEECH_SHARED.includes(x))&&AUTHORED_SHARED.includes('mix.wav'));
 const expected={'timeline.json':'a','mix.wav':'b'};
 assert.equal(verifyShared(expected,n=>expected[n]),true);
 assert.throws(()=>verifyShared(expected,n=>n==='mix.wav'?'tampered':expected[n],'x-three'),/changed in x-three: mix.wav/);
 assert.throws(()=>verifyShared(expected,n=>n==='timeline.json'?null:expected[n]),/missing.*timeline.json/);
 assert.throws(()=>verifyShared({},()=>'a'),/Empty/);
});
