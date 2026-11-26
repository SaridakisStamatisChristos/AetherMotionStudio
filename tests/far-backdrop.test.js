// Unit 5 (owner "implement 1-2-3 and 5"; OPEN-2): far backdrops that fit the place ('<set>-2' layers) and sets
// 'topic-v3' (the dialogue default). topic-v2 and the '-set' layers stay exactly as accepted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DRESSED_SETS,FAR_SETS,FAR_BACKDROPS,LAYERED_ENVIRONMENTS,emitEnvironment} from '../src/core/cinematography.js';
import {emitAsset} from '../src/visual/assets.js';
import {SETS_V2,SETS_V3,topicSetFor} from '../src/director/sets.js';
import {direct} from '../src/director/index.js';
import {validateProject} from '../src/core/timeline.js';
import {defaultSpeech} from '../src/studio/production.js';
import {estimatedTimeline,motionCheck} from '../src/quality/motion-check.js';
import {crowdingCheck} from '../src/quality/crowding.js';
import {visibility2Check} from '../src/quality/visibility.js';
import {plannedTimeline} from '../src/studio/model.js';
const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const interview=read('gen01-interview.request');
const film=async(topic,extra={})=>(await direct({...interview,topic,speech:defaultSpeech(interview.seconds),...extra})).project;
const emit=layers=>{const out=[];emitEnvironment({layers},(c,s,col,tf=p=>p,lit=false,bias=0)=>out.push({c:tf(c),s,col,lit,bias}));return out;};
const TOPICS=['Why is the sky blue?','How does the internet move a message?','How do forests clean the air?','How do banks lend money?','How do bridges carry trucks?','How do I brew coffee at home?'];

test('every far set: a backdrop behind the pieces, the same pieces as its dressed set, valid and repeatable',()=>{
 assert.deepEqual(Object.values(FAR_SETS).map(x=>x[1]).sort(),Object.keys(DRESSED_SETS).sort(),'one far set per dressed set');
 for(const [name,[backdrop,base]] of Object.entries(FAR_SETS)){
  assert.ok(LAYERED_ENVIRONMENTS.includes(name),name);assert.equal(typeof FAR_BACKDROPS[backdrop],'function');
  const far=[];FAR_BACKDROPS[backdrop]((c,s,col)=>far.push({c,s,col}));
  assert.ok(far.length>=10,name+' has a real backdrop: '+far.length);
  for(const b of far){
   assert.ok(b.c.every(Number.isFinite)&&b.s.every(x=>Number.isFinite(x)&&x>0)&&/^#[0-9a-f]{6}$/i.test(b.col),name+' '+JSON.stringify(b));
   assert.ok(b.c[2]+b.s[2]/2<=-5.6+1e-9,name+': backdrop box reaches past z -5.6: '+JSON.stringify(b));
  }
  const pieces=[];for(const [id,x,z,yaw,scale] of DRESSED_SETS[base].pieces)emitAsset(id,(c,s,col,tf=p=>p)=>pieces.push(tf(c)),{origin:[x,0,z],yaw,scale});
  const all=emit(name);assert.equal(all.length,far.length+pieces.length,name);
  assert.deepEqual(all.slice(far.length).map(b=>b.c),pieces,name+': the pieces are exactly the dressed set\'s');
  assert.deepEqual(emit(name),all,name+': deterministic');
  // lit boxes and details in front of a wall carry the sort bias (CPU painter); nothing is brighter by accident
  for(const b of all.slice(0,far.length).filter(b=>b.lit))assert.ok(b.bias>0,name+': lit backdrop detail without bias');
 }
});
test('the old layers are unchanged: the -set layers still draw the five skyline blocks and their pieces',()=>{
 for(const [name,set] of Object.entries(DRESSED_SETS)){
  const old=[];const box=(c,s,col,tf=p=>p,lit=false,bias=0)=>old.push({c:tf(c),s,col,lit,bias});
  for(let i=0;i<5;i++)box([(i-2)*2.6,1.2+(i%3)*.38,-5.5],[1.8,2.4+(i%3)*.76,.8],set.palette[i%3]);
  for(const [id,x,z,yaw,scale] of set.pieces)emitAsset(id,box,{origin:[x,0,z],yaw,scale});
  assert.deepEqual(emit(name),old,name);
 }
 for(const l of ['solar-field','city-dusk','energy-hub'])assert.ok(emit(l).length>0,l);
});
test('topic-v3 is the dialogue default; it is topic-v2 with the far layers (same place, same pieces); v2 by name is unchanged',async()=>{
 assert.deepEqual(Object.values(SETS_V3.layers),Object.values(SETS_V2.layers).map(l=>l+'-2'));
 for(const topic of TOPICS){
  const v3=await film(topic),v2=await film(topic,{sets:'topic-v2'});validateProject(v3);
  const strip=p=>JSON.stringify(p.shots.map(s=>({...s,layers:undefined})));
  assert.equal(strip(v3),strip(v2),topic+': only the layers differ');
  assert.ok(v2.shots.every(s=>DRESSED_SETS[s.layers]),topic+': v2 keeps the -set layers');
  assert.ok(v3.shots.every(s=>FAR_SETS[s.layers]&&FAR_SETS[s.layers][1]===v2.shots[0].layers),topic+': v3 uses the far version of the same set');
  const t=estimatedTimeline(v3,plannedTimeline(v3));
  assert.deepEqual(motionCheck(v3,t).warnings,[],topic);assert.deepEqual(crowdingCheck(v3,t).warnings,[],topic);assert.deepEqual(visibility2Check(v3,t).warnings,[],topic);
 }
 assert.equal(topicSetFor('topic-v3',{topic:'How do forests clean the air?'},{shots:[]}).layers,'forest-set-2');
 assert.equal(topicSetFor('topic-v3',{topic:'Nothing matches qqq'},{shots:[]}).layers,null,'no category: no set');
 const legacy=(await direct(read('speech-cpu-polished.request'))).project;assert.ok(legacy.shots.every(s=>s.layers===undefined),'narrator films unchanged');
});
test('negatives: unknown sets version and unknown layers are refused',async()=>{
 await assert.rejects(direct({...interview,speech:defaultSpeech(interview.seconds),sets:'topic-v9'}),/request.sets/);
 const p=await film('How do forests clean the air?');
 for(const bad of ['forest-set-3','forest-2','FOREST-SET-2','__proto__']){const x=structuredClone(p);x.shots[0].layers=bad;assert.throws(()=>validateProject(x),bad);}});
