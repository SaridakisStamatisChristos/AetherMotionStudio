// TALK-02: dialogue scenes (face chains, listeners look at the active speaker from measured phrase bounds).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {validateGraph,evaluateGraph} from '../src/core/graph.js';
import {focusPlan,dialogueShot} from '../src/core/dialogue.js';

const load=b=>JSON.parse(readFileSync(new URL('../examples/talk02-dialogue-'+b+'-polished.json',import.meta.url),'utf8'));
const shotOf=()=>({...load('cpu').shots[0],durationFrames:600});
const timeline=s=>({startFrame:0,endFrame:600,segments:['eng','sci','robo','eng','sci','robo'].map((sp,k)=>({speaker:sp,startSample:(20+k*95)*1600,endSample:(95+k*95)*1600}))});
const base={id:'f',template:'cinematic-graph',backend:'cpu',durationFrames:120,transitionFrames:0,heading:'F',subheading:'f',environment:'amber',camera:{},effects:[],narration:['x'],
 assets:[{id:'a',asset:'engineer',tracks:{x:[[0,0]]}},{id:'b',asset:'scientist',tracks:{x:[[0,-1.2]]}},{id:'c',asset:'scientist',tracks:{x:[[0,1.2]]}}]};
const withFace=face=>({...base,assets:[{...base.assets[0],face},base.assets[1],base.assets[2]]});

test('face chains: validation and negatives; a single face window is unchanged',()=>{
 validateGraph(withFace([{target:'b',start:0,end:.5},{target:'c',start:.5,end:1,blend:.3,hold:true}]));
 for(const bad of [[{target:'b',start:0,end:1}],[{target:'b',start:0,end:.6},{target:'c',start:.5,end:1}],[{target:'b',start:0,end:.5},{target:'a',start:.5,end:1}],[{target:'b',start:0,end:.5},{target:'zz',start:.5,end:1}],
  Array.from({length:17},(_,k)=>({target:k%2?'b':'c',start:k/17,end:(k+1)/17}))])assert.throws(()=>validateGraph(withFace(bad)),/face/);
 const single=withFace({target:'b',start:0,end:1,offset:.2});assert.deepEqual(evaluateGraph(single,.5).assets[0].pose,evaluateGraph(structuredClone(single),.5).assets[0].pose);
});
test('face chains: contiguous windows blend from the previous target (no snap back to the authored yaw)',()=>{
 const s=withFace([{target:'b',start:0,end:.5},{target:'c',start:.5,end:1,blend:.4,hold:true}]),yaw=t=>evaluateGraph(s,t).assets[0].pose.yaw;
 assert.ok(Math.abs(yaw(.4999)-yaw(.5001))<.01,'continuous at the boundary');
 assert.ok(yaw(.3)<-1&&yaw(.95)>1,'faces b (left) then c (right)');
 // A 180° turn over the blend (.4 × half the shot = 24 frames) peaks at ~1.5× the mean step (smoothstep): ~0.2 rad.
 let max=0;for(let f=1;f<120;f++)max=Math.max(max,Math.abs(yaw(f/119)-yaw((f-1)/119)));assert.ok(max<1.6*Math.PI/24,'smooth turn, max step '+max);
});
test('dialogue validation: negatives',()=>{
 const p=load('cpu');validateProject(p);
 for(const mut of [s=>{s.shots[0].dialogue.listen=false;},s=>{s.shots[0].dialogue.extra=1;},s=>{s.shots[0].dialogue.turn=2;},s=>{s.shots[0].dialogue.cheat=1.5;},s=>{s.shots[0].dialogue='on';},
  s=>{s.shots[0].speakerAssets={eng:'engineer'};},s=>{s.shots[0].assets[0].face={target:'robot',start:0,end:1};},s=>{s.shots[1].dialogue={listen:true};}])
  {const q=structuredClone(p);mut(q);assert.throws(()=>validateProject(q),/dialogue/);}
});
test('focus plan: listeners look at the speaker, speakers keep looking at the previous speaker',()=>{
 const s=shotOf(),plan=focusPlan(s,timeline(s)),at=(c,k)=>plan[c].filter(x=>x.at<=(20+k*95)/600+1e-9).at(-1).target;
 // Phrase order: eng, sci, robo, eng, sci, robo.
 assert.equal(at('engineer',0),'scientist','first speaker looks at the next speaker');
 assert.equal(at('scientist',0),'engineer');assert.equal(at('robot',0),'engineer');
 assert.equal(at('engineer',1),'scientist');assert.equal(at('robot',1),'scientist');assert.equal(at('scientist',1),'engineer','speaker keeps the previous speaker');
 assert.equal(at('engineer',2),'robot');assert.equal(at('scientist',2),'robot');assert.equal(at('robot',2),'scientist');
 assert.equal(plan.engineer[0].at,0);
});
test('dialogueShot: generated faces validate, are deterministic and turn smoothly; no-op without dialogue',()=>{
 const s=shotOf(),t=timeline(s),d=dialogueShot(s,t);validateGraph(d);assert.deepEqual(dialogueShot(structuredClone(s),t),d);
 assert.ok(d.assets.filter(a=>['engineer','scientist','robot'].includes(a.id)).every(a=>Array.isArray(a.face)));
 assert.ok(d.assets.find(a=>a.id==='engineer').face.every(w=>w.offset===-1),'engineer cheats toward camera (targets to its right)');
 for(const id of ['engineer','scientist','robot']){let max=0,prev=null;for(let f=0;f<600;f+=2){const y=evaluateGraph(d,f/599).assets.find(a=>a.id===id).pose.yaw;if(prev!==null)max=Math.max(max,Math.abs(y-prev));prev=y;}assert.ok(max<.2,id+' max yaw step '+max);}
 const plain={...s};delete plain.dialogue;assert.equal(dialogueShot(plain,t),plain);assert.equal(dialogueShot(s,null),s);
});
test('TALK-02 example: generator reproduces both backends; three voices; dialogue on the meeting shot',async()=>{
 const {build}=await import('../scripts/talk02-dialogue.mjs');for(const b of ['cpu','three'])assert.deepEqual(build(b),load(b));
 const p=load('cpu');assert.deepEqual(Object.values(p.speech.speakers).map(x=>x.voice),['af_heart','bf_emma','am_michael']);
 assert.deepEqual(p.shots[0].dialogue,{listen:true,turn:.4,cheat:1});assert.equal(p.shots[1].dialogue,undefined);
});
