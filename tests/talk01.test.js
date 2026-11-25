// TALK-01: speaking faces (speakerAssets binding, speech envelope, mouth channel).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {talkAt,applyTalk,speakerAt,mouthSupported,validateEnvelope} from '../src/core/talk.js';
import {emitAsset} from '../src/visual/assets.js';
import {evaluateGraph} from '../src/core/graph.js';

const load=b=>JSON.parse(readFileSync(new URL('../examples/talk01-faces-'+b+'-polished.json',import.meta.url),'utf8'));
// Synthetic timeline for the example: shots of fixed length, phrases at known samples, envelope ramps.
function timelineFor(p){
 let start=0;const shots=p.shots.map((s,i)=>{const n=s.durationFrames??240,seg=s.narration.map((text,j)=>({text,startSample:(start+20+j*100)*1600,endSample:(start+80+j*100)*1600,speed:1,speaker:p.speech.shotSpeakers[s.id][j],voice:'af_heart',language:'en-us'}));const x={id:s.id,startFrame:start,endFrame:start+n,transitionFrames:s.transitionFrames,segments:seg};start+=n;return x;});
 return {version:1,fps:30,sampleRate:48000,durationFrames:start,shots,speechEnvelope:{version:1,unit:'permille-rms',values:Array.from({length:start},(_,f)=>f%10*100)}};
}
const boxes=(id,pose)=>{const out=[];emitAsset(id,(c,sz,col,tf=q=>q)=>out.push(JSON.stringify([tf(c).map(v=>+v.toFixed(9)),sz.map(v=>+v.toFixed(9)),col])),pose);return out;};

test('mouth support: detail-2/3 humans and catalog robots only',()=>{
 assert.equal(mouthSupported('engineer',{detail:2}),true);assert.equal(mouthSupported('engineer',{detail:3}),true);
 assert.equal(mouthSupported('engineer'),false);assert.equal(mouthSupported('service-robot'),true);
 assert.equal(mouthSupported('table'),false);assert.equal(mouthSupported('retro-robot'),false);
});
test('speakerAssets validation: negatives',()=>{
 const p=load('cpu');validateProject(p);
 for(const mut of [s=>{s.shots[0].speakerAssets={ghost:'engineer'};},s=>{s.shots[0].speakerAssets={eng:'nobody'};},s=>{s.shots[0].speakerAssets={};},s=>{s.shots[0].speakerAssets=[];},
  s=>{s.shots[0].speakerAssets={eng:'engineer',robo:'engineer'};},s=>{s.shots[0].assets[0].params={};},s=>{s.shots[1].speakerAssets={robo:'robot',eng:'robot'};}]){
  const q=structuredClone(p);mut(q);assert.throws(()=>validateProject(q),/speakerAssets/);}
 const plain=structuredClone(p);delete plain.speech;for(const s of plain.shots){s.speakerAssets={default:s.assets[0].id};s.durationFrames=s.durationFrames??240;}validateProject(plain);
});
test('speech envelope: required with talk, strict format',()=>{
 const p=load('cpu');for(const s of p.shots)s.durationFrames=s.durationFrames??240;p.speech.targetFrames=720;delete p.speech.fixedShots.hello;p.speech.fixedShots={hello:240,learn:240,reply:240};
 const t=timelineFor(p);validateEnvelope(p,t);
 const none=structuredClone(t);delete none.speechEnvelope;assert.throws(()=>validateEnvelope(p,none),/required/);
 for(const mut of [e=>e.values.pop(),e=>{e.values[0]=1001;},e=>{e.values[1]=.5;},e=>{e.unit='db';},e=>{e.version=2;},e=>{e.extra=1;}]){const x=structuredClone(t);mut(x.speechEnvelope);assert.throws(()=>validateEnvelope(p,x));}
 const plain=structuredClone(p);for(const s of plain.shots)delete s.speakerAssets;validateEnvelope(plain,none);
});
test('talkAt: active speaker opens, other bound characters stay closed, pauses close everyone',()=>{
 const p=load('cpu');for(const s of p.shots)s.durationFrames=s.durationFrames??240;const t=timelineFor(p);
 assert.equal(speakerAt(t,0,50),'eng');assert.equal(speakerAt(t,0,150),'robo');assert.equal(speakerAt(t,0,90),null);
 const a=talkAt(p,t,55,0);assert.ok(a.engineer>0&&a.robot===0,JSON.stringify(a));
 const b=talkAt(p,t,155,0);assert.ok(b.robot>0&&b.engineer===0);
 assert.deepEqual(talkAt(p,t,90,0),{engineer:0,robot:0});
 const v=t.speechEnvelope.values;assert.equal(a.engineer,Math.round((v[54]+2*v[55]+v[56])/4)/1000);
 assert.deepEqual(talkAt(p,t,55,0),a,'deterministic');
 const noTalk=structuredClone(p);delete noTalk.shots[0].speakerAssets;assert.equal(talkAt(noTalk,t,55,0),null);
});
test('mouth geometry: closed mouth identical to no mouth on humans; opening grows it; robots gain a lit mouth',()=>{
 const pose={origin:[0,0,0],yaw:.1,params:{detail:2}};
 assert.deepEqual(boxes('engineer',{...pose,mouth:0}),boxes('engineer',pose));
 const open=boxes('engineer',{...pose,mouth:1}),closed=boxes('engineer',pose);assert.equal(open.length,closed.length);assert.notDeepEqual(open,closed);
 const r0=boxes('service-robot',{origin:[0,0,0],yaw:0}),r1=boxes('service-robot',{origin:[0,0,0],yaw:0,mouth:.5});assert.equal(r1.length,r0.length+1);
 const lit=m=>boxes('service-robot',{origin:[0,0,0],yaw:0,mouth:m}).map(JSON.parse).find(b=>Math.abs(b[0][1]-1.7*.775)<1e-6)[1][1];assert.ok(lit(1)>lit(0));
});
test('applyTalk sets pose.mouth on bound assets only and leaves graph evaluation untouched',()=>{
 const s=load('cpu').shots[0],a=evaluateGraph(s,.5),b=applyTalk(evaluateGraph(s,.5),{engineer:.6});
 assert.equal(b.assets.find(x=>x.id==='engineer').pose.mouth,.6);assert.equal(b.assets.find(x=>x.id==='robot').pose.mouth,undefined);
 assert.equal(evaluateGraph(s,.5).assets.find(x=>x.id==='engineer').pose.mouth,undefined);assert.deepEqual(applyTalk(a,null),a);
});
test('TALK-01 example: generator reproduces both backends; two voices bound per phrase',async()=>{
 const {build}=await import('../scripts/talk01-faces.mjs');for(const b of ['cpu','three'])assert.deepEqual(build(b),load(b));
 const p=load('cpu');assert.deepEqual(p.speech.shotSpeakers.hello,['eng','robo']);assert.deepEqual(p.shots[0].speakerAssets,{eng:'engineer',robo:'robot'});
 assert.equal(p.speech.mix.master,'mix-v2');assert.equal(p.speech.placement,'lead');
 const t=structuredClone(load('three'));t.id=p.id;t.shots.forEach(s=>s.backend='cpu');assert.deepEqual(t,p);
});
