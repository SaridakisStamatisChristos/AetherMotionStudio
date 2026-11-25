// GEN-02: group framing for vertical (9:16) social video — characters fill the safe area between heading and captions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {GROUP_FRAMING} from '../src/core/cinematography.js';
import {dialogueShot} from '../src/core/dialogue.js';
import {compositionReport,compositionGate} from '../src/quality/composition.js';
import {estimatedTimeline,visibilityCheck,motionCheck} from '../src/quality/motion-check.js';
import {plannedTimeline} from '../src/studio/model.js';
import {inspectProject} from '../src/quality/preflight.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const project=async n=>{const r=read(n+'.request');return (await direct({...r,speech:defaultSpeech(r.seconds)})).project;};
const speakerHeight=p=>{const t=estimatedTimeline(p,plannedTimeline(p)),v=[];
 for(const [i,s] of p.shots.entries()){const d=dialogueShot(s,t.shots[i]);for(const id of Object.values(s.speakerAssets??{}))v.push(compositionReport(d,{subject:id}).subjectHeightOfSafe.mean);}
 return v.reduce((a,b)=>a+b,0)/v.length;};

test('group framing: characters 1.4–1.7x larger; no new preflight errors, gate, visibility or motion findings',async()=>{
 // Before GEN-02 (GEN-01 framing of the whole set): interview 0.285, network 0.267 of the safe height.
 for(const [n,min] of [['gen01-interview',.42],['talk04-dialogue',.33]]){const p=await project(n),h=speakerHeight(p),t=estimatedTimeline(p,plannedTimeline(p));
  assert.ok(h>=min,n+' speaker height '+h.toFixed(3));
  assert.deepEqual(inspectProject(p).issues.filter(i=>i.severity!=='review'),[],n);
  for(const [i,s] of p.shots.entries())assert.deepEqual(compositionGate(dialogueShot(s,t.shots[i])).warnings,[],n+' '+s.id);
  assert.deepEqual(visibilityCheck(p).warnings,[],n);assert.deepEqual(motionCheck(p,t).warnings,[],n);}
 const p5=read('talk05-first-words-cpu-polished');assert.ok(speakerHeight(p5)>=.46);
 for(const id of ['morning','table','mistake','thanks'])assert.equal(p5.shots.find(s=>s.id===id).cameraRig.framing,'group',id);
 assert.equal(p5.shots.find(s=>s.id==='tools').cameraRig.framing,'medium','authored camera kept');
});
test('group framing: rest-pose bounds keep the zoom steady while characters turn toward speakers',async()=>{
 const p=await project('gen01-interview'),t=estimatedTimeline(p,plannedTimeline(p)),s=dialogueShot(p.shots[0],t.shots[0]),n=t.shots[0].endFrame-t.shots[0].startFrame;
 const zooms=[],targets=[];// one zoom per shot (tightest fit over the dolly), so it never breathesfor(let f=0;f<n;f+=5){const c=evaluateGraph({...s,durationFrames:n},f/(n-1)).camera;zooms.push(c.zoom);targets.push(c.target[0]);}
 const step=v=>Math.max(...v.slice(1).map((z,i)=>Math.abs(z-v[i])));
 assert.ok(step(zooms)<8,'zoom change per 5 frames '+step(zooms).toFixed(2));assert.ok(Math.min(...zooms)>=GROUP_FRAMING.zoom[0]&&Math.max(...zooms)<=GROUP_FRAMING.zoom[1]);
});
test('group framing contract negatives; other framings unchanged',()=>{
 const p=read('talk02-dialogue-cpu-polished'),rig=r=>{const x=structuredClone(p);x.shots[0].cameraRig={preset:'medium',...r};return x;};
 validateProject(rig({framing:'group',subjects:['engineer','robot']}));
 for(const [r,re] of [[{framing:'group'},/subjects/],[{subjects:['engineer','robot']},/subjects/],[{framing:'group',subjects:['engineer']},/2–4/],
  [{framing:'group',subjects:['engineer','engineer']},/2–4/],[{framing:'group',subjects:['engineer','ghost']},/unknown subject/],[{framing:'group',subjects:['engineer','robot'],subject:'robot'},/not both/],
  [{framing:'group',subjects:'engineer'},/2–4/],[{framing:'wide'},/framing/]])assert.throws(()=>validateProject(rig(r)),re,JSON.stringify(r));
 // An explicit zoom track stays authoritative.
 const z=rig({framing:'group',subjects:['engineer','robot']});z.shots[0].camera.zoom=[[0,900]];delete z.shots[0].cameraInterpolation.zoom;
 assert.equal(evaluateGraph(z.shots[0],.5).camera.zoom,900);
});

// ---- GEN-03 speaker follow (dialogue.camera 'follow') ----
import {followPlan,FOLLOW_PLAN} from '../src/core/dialogue.js';
import {FOLLOW} from '../src/core/cinematography.js';
import {CAMERA_POLICY} from '../src/quality/motion-check.js';
import {createProjection} from '../src/visual/mesh.js';
test('follow plan: opens on an early first speaker, skips short lines, holds on repeated speakers, never overlaps moves',()=>{
 const s={cameraRig:{framing:'group',subjects:['a','b']},speakerAssets:{x:'a',y:'b'}},F=30*1600,t={startFrame:0,endFrame:600,segments:[
  {speaker:'x',startSample:0,endSample:3*F},{speaker:'x',startSample:3.5*F,endSample:6*F},{speaker:'y',startSample:6.2*F,endSample:6.9*F},{speaker:'y',startSample:8*F,endSample:11*F},{speaker:'x',startSample:11.2*F,endSample:14*F},{speaker:'x',startSample:19.5*F,endSample:20*F}]};
 const plan=followPlan(s,t);assert.deepEqual(plan.map(f=>f.subject),['a','b','a']);
 assert.equal(plan[0].at,0,'first line starts at once: open on its speaker');
 const late={...t,segments:t.segments.map(g=>({...g,startSample:g.startSample+4*F,endSample:g.endSample+4*F}))},lp=followPlan(s,late);
 assert.ok(lp[0].at>=FOLLOW_PLAN.establish/20-1e-9,'a shot that starts with a pause shows the group first');assert.ok(plan.every((f,k)=>!k||f.at>=plan[k-1].at+plan[k-1].blend-1e-9));assert.ok(plan.every(f=>f.at+f.blend<=1));
 assert.equal(plan[0].blend,+(FOLLOW_PLAN.transition/20).toFixed(6));
});
// Owner review of GEN-03 r2: "the camera move makes characters out of screen" (host 28 % off the left edge).
import {FRAME_POLICY} from '../src/quality/motion-check.js';
test('follow never puts a character out of frame; it only moves when that is possible (three speakers), calmly',async()=>{
 for(const n of ['gen01-interview','talk04-dialogue']){const p=await project(n),t=estimatedTimeline(p,plannedTimeline(p)),m=motionCheck(p,t);
  assert.deepEqual(m.warnings,[],n);// GEN-06: singles (one speaker, framing 'single') have no follow; every group shot still follows.
  assert.ok(p.shots.filter(s=>s.cameraRig.framing==='group').every(s=>s.dialogue.camera==='follow'));assert.ok(p.shots.filter(s=>s.cameraRig.framing!=='group').every(s=>s.id.endsWith('-single')&&!s.dialogue?.camera));
  for(const s of m.shots){for(const v of Object.values(s.offFrame))assert.equal(v.outside,0,n+' '+s.shot);
   assert.ok(s.camera.panDegPerSec.value<=CAMERA_POLICY.maxPanDegPerSec&&s.camera.zoomPerSec.value<=CAMERA_POLICY.maxZoomPerSec,JSON.stringify(s.camera));}}
 const p5=read('talk05-first-words-cpu-polished'),m5=motionCheck(p5,estimatedTimeline(p5,plannedTimeline(p5)));assert.deepEqual(m5.warnings,[]);
 // Three speakers + set piece: the follow can leave the set piece and frame the speakers closer.
 const p=await project('talk04-dialogue'),t=estimatedTimeline(p,plannedTimeline(p));let gained=0,checked=0;
 for(const [i,s0] of p.shots.entries()){const s=dialogueShot(s0,t.shots[i]),ts=t.shots[i],n=ts.endFrame-ts.startFrame;if(!s.cameraRig.focus)continue;
  for(const f of s.cameraRig.focus){const k=Math.min(n-1,Math.round((f.at+f.blend)*(n-1))+2),z=evaluateGraph({...s,durationFrames:n},k/(n-1)).camera.zoom,zb=evaluateGraph({...s,cameraRig:{...s.cameraRig,focus:undefined},durationFrames:n},k/(n-1)).camera.zoom;
   assert.ok(z<=zb*FOLLOW.push+1e-6);if(z>zb*1.03)gained++;checked++;}}
 assert.ok(checked>=4&&gained>=checked/2,gained+'/'+checked);
});
test('OFF_FRAME: a camera that crops a character is flagged',()=>{
 const p=structuredClone(read('talk02-dialogue-cpu-polished')),s=p.shots[0];s.camera.zoom=[[0,2300]];delete s.cameraInterpolation.zoom;
 const w=motionCheck(p,estimatedTimeline(p,plannedTimeline(p))).warnings.filter(x=>x.code==='OFF_FRAME');
 assert.ok(w.some(x=>x.shot==='meeting'&&x.outside>FRAME_POLICY.maxOutside),JSON.stringify(w));
});
test('follow contract negatives',()=>{
 const p=read('talk02-dialogue-cpu-polished'),withRig=(rig,dlg)=>{const x=structuredClone(p);x.shots[0].cameraRig={preset:'medium',...rig};if(dlg)x.shots[0].dialogue={...x.shots[0].dialogue,...dlg};return x;};
 const G={framing:'group',subjects:['engineer','robot']};validateProject(withRig({...G,focus:[{at:.2,subject:'robot',blend:.1},{at:.5,subject:null,blend:.1}]},{camera:'follow'}));
 for(const [r,d,re] of [[{},{camera:'follow'},/follow requires/],[G,{camera:'pan'},/follow requires/],[{...G,focus:[]},null,/focus/],[{focus:[{at:.2,subject:null,blend:.1}]},null,/focus/],
  [{...G,focus:[{at:.2,subject:'scientist',blend:.1}]},null,/subject/],[{...G,focus:[{at:.5,subject:null,blend:.1},{at:.2,subject:null,blend:.1}]},null,/time order/],
  [{...G,focus:[{at:.2,subject:null,blend:0}]},null,/blend/],[{...G,focus:[{at:.2,subject:null}]},null,/blend|required/]])assert.throws(()=>validateProject(withRig(r,d)),re,JSON.stringify([r,d]));
});
