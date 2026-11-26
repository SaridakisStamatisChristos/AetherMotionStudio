// GEN-12 topic-fitting sets (request.sets 'topic-v1'; default for dialogue films, 'none' off): one location per film
// (palette + layered backdrop) from the topic category, and dialogue set pieces from that category without repeats.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {SETS,topicSet,applySet,fitPieces} from '../src/director/sets.js';
import {OBJECT_CATALOG} from '../src/visual/catalog.js';
import {estimatedTimeline,motionCheck} from '../src/quality/motion-check.js';
import {crowdingCheck} from '../src/quality/crowding.js';
import {visibility2Check} from '../src/quality/visibility.js';
import {inspectProject} from '../src/quality/preflight.js';
import {plannedTimeline} from '../src/studio/model.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const interview=read('gen01-interview.request');
const film=async(topic,extra={})=>(await direct({...interview,topic,speech:defaultSpeech(interview.seconds),...extra})).project;
const pieces=p=>p.shots.filter(s=>!s.id.endsWith('-single')).map(s=>s.assets.find(a=>!Object.values(s.speakerAssets??{}).includes(a.id))?.asset).filter(Boolean);
const cat=id=>OBJECT_CATALOG.find(o=>o.id===id)?.category;

test('topicSet: category from topic and narration; palette and backdrop per category',()=>{
 const one=(topic,narration=[])=>topicSet({topic},{shots:[{heading:'',narration,assets:[]}]});
 assert.equal(one('How do forests clean the air?').category,'nature');
 assert.equal(one('How do banks lend money?').category,'business');
 assert.equal(one('How do vaccines train the body?').category,'science','health words outweigh the verb "train"');
 assert.equal(one('How does the internet move a message?').category,'technology');
 const n=one('How do forests clean the air?');assert.deepEqual([n.environment,n.layers],['amber','solar-field']);
 const none=one('Why?');assert.equal(none.category,null);
 const p={shots:[{template:'cinematic-graph',environment:'midnight'}]};
 assert.equal(applySet(p,none).project,p,'no match: unchanged');assert.equal(applySet(p,none).report.reason,'no topic words matched');
 for(const c of Object.values(SETS.categories)){assert.ok(['laboratory','midnight','amber'].includes(c.environment));assert.ok(c.layers===null||['solar-field','city-dusk','energy-hub'].includes(c.layers));}
});
test('fitPieces: category pieces without repeats; fitting originals kept; everyday never random',()=>{
 const shot=(asset,narration=['A line.'])=>({heading:'H',narration,assets:[{asset}]});
 const q={topic:'How do forests clean the air?'},set=topicSet(q,{shots:[shot('3d-printer')]});
 const {ir,changes}=fitPieces(q,{shots:[shot('3d-printer'),shot('3d-printer'),shot('cactus'),shot('cactus')]},set);
 const got=ir.shots.map(s=>s.assets[0].asset);assert.equal(new Set(got).size,4,'no repeats: '+got);assert.ok(got.every(a=>cat(a)==='nature'));assert.equal(got[2],'cactus','a fitting original stays');
 assert.equal(changes.length,3);
 const cq={topic:'How do you brew coffee at home?'},cs={...topicSet(cq,{shots:[shot('coffee-machine')]}),category:'everyday'};
 const c=fitPieces(cq,{shots:[shot('coffee-machine'),shot('coffee-machine')]},cs).ir.shots.map(s=>s.assets[0].asset);assert.deepEqual(c,['coffee-machine','coffee-machine'],'no random everyday object');
 const nq={topic:'Why?'},ns=topicSet(nq,{shots:[]});assert.equal(fitPieces(nq,{shots:[shot('chair')]},ns).changes.length,0);
});
test('Director: dialogue films get one topic location and fitting pieces; sets none and legacy requests unchanged; negatives',async()=>{
 // GEN-15 step 2 made topic-v2 the dialogue default (tests/gen15b.test.js); topic-v1 is pinned here by name.
 const forest=await film('How do forests clean the air?',{sets:'topic-v1'});
 const env=new Set(forest.shots.map(s=>s.environment+'/'+s.layers));assert.deepEqual([...env],['amber/solar-field']);
 const ps=pieces(forest);assert.ok(ps.length>=3&&ps.every(a=>cat(a)==='nature'));assert.equal(new Set(ps).size,ps.length);
 const off=await film('How do forests clean the air?',{sets:'none'});assert.ok(off.shots.every(s=>s.layers===undefined));assert.ok(new Set(off.shots.map(s=>s.environment)).size>1,'Director alternation without sets');
 // legacy (non-dialogue) requests: no sets unless asked, prompt unchanged by the field
 const legacy=read('speech-cpu-polished.request'),a=await direct(structuredClone(legacy)),b=await direct({...structuredClone(legacy),sets:'topic-v1'});
 assert.ok(a.project.shots.every(s=>s.layers===undefined));assert.equal(a.manifest.promptDigest,b.manifest.promptDigest,'sets does not reach the model prompt');
 assert.ok(new Set(b.project.shots.map(s=>s.environment)).size===1);
 await assert.rejects(direct({...interview,sets:'forest'}),/request.sets/);
 const lib=read('continuity-cpu-polished.request');await assert.rejects(direct({...lib,sets:'topic-v1'}),/identity stories/);
});
test('fresh topics: every quality check stays clean with the topic sets',async()=>{
 for(const topic of ['How do forests clean the air?','How do banks lend money?','How do vaccines train the body?']){
  const p=await film(topic),t=estimatedTimeline(p,plannedTimeline(p));
  assert.deepEqual(motionCheck(p,t).warnings,[],topic);assert.deepEqual(crowdingCheck(p,t).warnings,[],topic);assert.deepEqual(visibility2Check(p,t).warnings,[],topic);
  assert.deepEqual(inspectProject(p).issues.filter(x=>x.severity!=='review'),[],topic);
 }
});
