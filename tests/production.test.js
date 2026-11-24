import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {defaultSpeech,productionId,matchedProject,normalizedProject} from '../src/studio/production.js';
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
