// GEN-01: lessons from the TALK-04/05 still reviews made automatic for every project: motion-speed and visibility
// checks, general dialogue staging talk-v1, opt-in calmTurns, aim.phrase and Director pointing at a named set piece.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {motionCheck,visibilityCheck,estimatedTimeline,MOTION_POLICY,VISIBILITY_POLICY} from '../src/quality/motion-check.js';
import {stageProject,stageShot,talkBinding,TALK_STAGE} from '../src/core/staging.js';
import {calmTurns} from '../src/core/calm.js';
import {phraseAims,dialogueShot} from '../src/core/dialogue.js';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {plannedTimeline,setStaging} from '../src/studio/model.js';
import {direct} from '../src/director/index.js';
import {mentions} from '../src/director/dialogue.js';
import {compositionGate} from '../src/quality/composition.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const est=p=>estimatedTimeline(p,plannedTimeline(p));
const examples=readdirSync(new URL('../examples/',import.meta.url)).filter(f=>f.endsWith('.json')&&!f.includes('request')).map(f=>f.slice(0,-5))
 .filter(n=>{const p=read(n);return p.version===2&&p.shots?.some(s=>s.template==='cinematic-graph');});
// Known findings in older accepted films (preserved unchanged; recorded, not hidden). New examples must add none.
const KNOWN_MOTION=new Set(['art01-handoff/handoff/receiver','art02-studio/handoff/receiver','art05-workshop/handoff/receiver','workshop-extended/toolbox/scientist','workshop-extended/steps/robot','workshop-extended/teach/robot','workshop-extended/shelf/robot','workshop-extended/handoff/receiver']);
const KNOWN_HIDDEN=new Set(['talk02-dialogue/meeting/table','talk03-body/meeting/table']);
const base=n=>n.replace(/-(cpu|three)(-polished)?$/,'');

test('motion-speed-v1 and visibility-v1 on every example: only the recorded historical findings',()=>{
 assert.equal(MOTION_POLICY.version,'motion-speed-v1');assert.equal(VISIBILITY_POLICY.version,'visibility-v1');
 const motion=new Set(),hidden=new Set();
 for(const n of examples){const p=read(n);
  for(const w of motionCheck(p,est(p)).warnings)motion.add(base(n)+'/'+w.shot+'/'+w.asset);
  for(const w of visibilityCheck(p).warnings)hidden.add(base(n)+'/'+w.shot+'/'+w.asset);}
 assert.deepEqual([...motion].sort(),[...KNOWN_MOTION].sort());assert.deepEqual([...hidden].sort(),[...KNOWN_HIDDEN].sort());
 assert.ok(examples.length>=40,String(examples.length));
});
test('checks flag the TALK-04 r1 hidden set piece and a fast authored turn; estimated vs measured is labelled',async()=>{
 const p=(await direct(read('talk04-dialogue.request'))).project,hidden=structuredClone(p);
 for(const s of hidden.shots){const o=s.assets.find(a=>a.id==='object-1');o.tracks.x=[[0,0]];o.tracks.z=[[0,-1.1]];o.tracks.scale=[[0,.6]];}
 assert.deepEqual(visibilityCheck(p).warnings,[]);
 assert.equal(visibilityCheck(hidden).warnings.filter(w=>w.asset==='object-1').length,p.shots.length,'every hidden set piece flagged');
 const fast=structuredClone(read('talk01-faces-cpu-polished'));fast.shots[0].assets.push({id:'spinner',asset:'engineer',tracks:{x:[[0,-1.5]],yaw:[[0,0],[.5,0],[.52,3]]}});
 const m=motionCheck(fast,est(fast));assert.equal(m.timeline,'estimated');assert.ok(m.warnings.some(w=>w.code==='FAST_TURN'&&w.asset==='spinner'&&w.degPerSec>MOTION_POLICY.maxTurnDegPerSec));
 const t=est(p);delete t.estimated;assert.equal(motionCheck(p,t).timeline,'measured');assert.deepEqual(motionCheck(p,est(p)).warnings,[]);
});

const talk02=()=>read('talk02-dialogue-cpu-polished');
const autoCam=s=>{s.camera={};delete s.cameraInterpolation;return s;};
const bare=()=>{const p=talk02();for(const s of p.shots){delete s.speakerAssets;delete s.dialogue;}return p;};
test('talk-v1: binds speakers by name, re-blocks free conversations, sets pieces beside the line, adds calm behaviour',()=>{
 const p=bare();autoCam(p.shots[0]);
 const s=stageProject(p,'talk-v1').shots[0];
 assert.deepEqual(s.speakerAssets,{eng:'engineer',sci:'scientist',robo:'robot'});
 assert.deepEqual(s.dialogue,{listen:true,turn:TALK_STAGE.turn,cheat:TALK_STAGE.cheat});assert.deepEqual(s.bodyLanguage,{beats:true,nods:true,blinks:true,sway:true});
 assert.deepEqual(s.assets.filter(a=>a.id!=='table').map(a=>[a.tracks.x[0][1],a.tracks.z[0][1]]),TALK_STAGE.line[3]);
 assert.deepEqual([s.assets.find(a=>a.id==='table').tracks.x[0][1],s.assets.find(a=>a.id==='table').tracks.z[0][1]],TALK_STAGE.prop[3][0]);
 assert.deepEqual(visibilityCheck({...p,shots:[s]}).warnings,[],'the table is no longer hidden');
 assert.deepEqual(stageProject(stageProject(p,'talk-v1'),'talk-v1'),stageProject(p,'talk-v1'),'idempotent');
 assert.deepEqual(setStaging(p,'talk-v1'),stageProject(p,'talk-v1'),'Studio uses the same pass');
 // Single speaker: bound, no dialogue (needs two), not re-blocked.
 const r=stageProject(p,'talk-v1').shots[1];assert.deepEqual(r.speakerAssets,{robo:'robot'});assert.equal(r.dialogue,undefined);assert.equal(r.assets[0].tracks.x[0][1],0);
});
test('talk-v1 negatives: no guessing, authored blocking and cameras kept, non-speech untouched',()=>{
 const p=bare();
 // Authored camera tracks keep authored positions (re-blocking under a fixed camera cropped TALK-05 shots).
 const kept=stageProject(p,'talk-v1').shots[0];assert.equal(kept.assets[0].tracks.x[0][1],-1.35);assert.ok(kept.dialogue);
 // Ambiguous: two unnamed speakers and two unnamed characters → nothing bound, shot unchanged except nothing.
 const amb=structuredClone(p);amb.speech.speakers={a:{name:'Ann',voice:'af_heart',language:'en-us'},b:{name:'Bob',voice:'am_adam',language:'en-us'},c:{name:'Cy',voice:'am_michael',language:'en-us'}};
 amb.speech.shotSpeakers={meeting:['a','b','c','a','b','c'],ready:['c']};
 assert.equal(talkBinding(amb.shots[0],amb.speech),null);assert.deepEqual(stageProject(amb,'talk-v1').shots[0],amb.shots[0]);
 assert.deepEqual(talkBinding(amb.shots[1],amb.speech),{c:'robot'},'one speaker, one character');
 // Aimers and authored faces are authored blocking.
 const aim=structuredClone(p);autoCam(aim.shots[0]);
 aim.shots[0].assets[0].aim={target:'table',start:.2,end:.5};assert.equal(stageProject(aim,'talk-v1').shots[0].assets[1].tracks.x[0][1],0);
 const face=structuredClone(p);face.shots[0].assets[0].face={target:'robot',start:0,end:1};const f=stageProject(face,'talk-v1').shots[0];assert.equal(f.dialogue,undefined);assert.deepEqual(f.assets[0].face,{target:'robot',start:0,end:1});
 const plain=read('art05-workshop-cpu-polished');assert.deepEqual(stageProject(plain,'talk-v1').shots,plain.shots,'no line speakers: unchanged');
 assert.deepEqual(stageShot(read('blockchain-60s').shots[0],'talk-v1'),read('blockchain-60s').shots[0]);
});

test('calmTurns: widens a fast authored yaw turn into its holds, reports face-driven turns, never makes a turn worse',()=>{
 const ext=read('workshop-extended-cpu-polished'),r=calmTurns(ext);validateProject(r.project);
 const c=r.changes.find(x=>x.shot==='shelf');assert.ok(c.degPerSecBefore>200&&c.degPerSecAfter<MOTION_POLICY.maxTurnDegPerSec,JSON.stringify(c));
 assert.deepEqual(r.changes.map(x=>x.shot),['shelf']);
 for(const u of r.unresolved)assert.ok(u.degPerSec>MOTION_POLICY.maxTurnDegPerSec&&u.reason);
 assert.ok(r.unresolved.some(u=>u.shot==='handoff'&&/face/.test(u.reason)),'face-driven turn left as is');
 const h=r.project.shots.find(s=>s.id==='handoff'),h0=ext.shots.find(s=>s.id==='handoff');assert.deepEqual(h,h0,'unchanged');
 assert.deepEqual(ext,read('workshop-extended-cpu-polished'),'input not mutated');
 const slow=calmTurns(read('talk01-faces-cpu-polished'));assert.deepEqual(slow.changes,[]);
});

test('aim.phrase: validated, follows the measured line, estimate without a timeline',()=>{
 const p=read('talk01-faces-cpu-polished'),s=structuredClone(p.shots[2]);s.assets[0].aim={...s.assets[0].aim,phrase:0};
 validateProject({...p,shots:[p.shots[0],p.shots[1],s]});
 for(const bad of [1,-1,.5,'0'])assert.throws(()=>validateProject({...p,shots:[p.shots[0],p.shots[1],{...s,assets:[{...s.assets[0],aim:{...s.assets[0].aim,phrase:bad}},s.assets[1]]}]}),/phrase/);
 const ts={startFrame:100,endFrame:200,segments:[{startSample:120*1600,endSample:160*1600}]},out=phraseAims(s,ts).assets[0].aim;
 assert.deepEqual([out.start,out.end],[+(.2-s.assets[0].aim.blend).toFixed(6),+(.6+s.assets[0].aim.blend).toFixed(6)]);
 assert.equal(phraseAims(s,null),s);assert.equal(dialogueShot(s,ts).assets[0].aim.start,out.start,'applied at render via dialogueShot');
});
test('Director: the speaker of a line that names the set piece points at it (aim.phrase), staged by talk-v1',async()=>{
 assert.ok(mentions('Routers examine destination information','router'));assert.ok(!mentions('A network of links','network-switch'));assert.ok(mentions('the network switch hums','network-switch'));
 const x=await direct(read('talk04-dialogue.request')),aims=x.project.shots.flatMap(s=>s.assets.filter(a=>a.aim).map(a=>[s,a]));
 assert.equal(aims.length,1);const [s,a]=aims[0];assert.equal(a.aim.target,'object-1');assert.match(s.narration[a.aim.phrase],/Router/);assert.equal(a.id,x.project.speech.shotSpeakers[s.id][a.aim.phrase]);
 const t=est(x.project),i=x.project.shots.indexOf(s);assert.deepEqual(compositionGate(dialogueShot(s,t.shots[i])).warnings,[]);
 assert.deepEqual(motionCheck(x.project,t).warnings,[]);assert.deepEqual(visibilityCheck(x.project).warnings,[]);
});
