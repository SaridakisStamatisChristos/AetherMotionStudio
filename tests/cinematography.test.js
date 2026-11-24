import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject,shotAt} from '../src/core/timeline.js';
import {evaluateGraph,emitGraph} from '../src/core/graph.js';
import {CAMERA_RIGS,geometryBounds,sampleCameraRig,composePose} from '../src/core/cinematography.js';
import {createProjection} from '../src/visual/mesh.js';
import {robotHandAnchor} from '../src/visual/assets.js';
import {overlayLayout,validateOverlays} from '../src/core/overlays.js';
const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url)));
const cpu=load('cinematography-cpu-polished'),three=load('cinematography-three-polished');
test('matched 45s cinematic projects and all previous fixtures validate',()=>{
 for(const name of ['robot-treasure','blockchain-explainer','robot-lab','blockchain-60s','auto-robot','cinematic-cpu','cinematic-three','cinematic-cpu-polished','cinematic-three-polished','asset-showcase-cpu-polished','asset-showcase-three-polished'])validateProject(load(name));
 validateProject(cpu);validateProject(three);assert.equal(cpu.shots.reduce((n,s)=>n+s.durationFrames,0),1350);
 const other=structuredClone(three);other.id=cpu.id;other.shots.forEach(s=>s.backend='cpu');assert.deepEqual(cpu,other);
});
test('all camera paths finite; common projection matches perspective formula',()=>{
 for(const preset of Object.keys(CAMERA_RIGS))for(const t of [0,.21,.5,.9,1]){
  const c=sampleCameraRig({preset},t,{}),project=createProjection(c.position,c.target,c.zoom,[360,640]),v=project(c.target);
  assert.ok(v.every(Number.isFinite));assert.ok(Math.abs(v[0]-360)<1e-8&&Math.abs(v[1]-640)<1e-8);
  const fov=2*Math.atan(640/c.zoom),focal=640/Math.tan(fov/2);assert.ok(Math.abs(focal-c.zoom)<1e-8);
  assert.ok(project(c.position).every(Number.isFinite));assert.ok(project(c.position)[2]<=.1);
 }
});
test('deterministic out-of-order sampling, common geometry, finite bounds',()=>{
 for(const s of cpu.shots){
  const a=evaluateGraph(s,.52);for(const t of [1,0,.2,.98])evaluateGraph(s,t);
  assert.deepEqual(a,evaluateGraph(s,.52));
  const b=evaluateGraph({...s,backend:'three'},.52);assert.deepEqual(a,b);
  const bounds=geometryBounds(a.assets);assert.ok(bounds.lo.every(Number.isFinite));assert.ok(bounds.hi.every(Number.isFinite));
  let count=0;emitGraph(a,(c,z,col,tf=p=>p)=>{assert.ok(tf(c).every(Number.isFinite));count++});assert.ok(count>0);
 }
});
test('explicit tracks override actions, later actions override earlier',()=>{
 const a={tracks:{walking:[[0,.2]]},actions:[{name:'walk',start:0,end:1},{name:'carry',start:0,end:1},{name:'point',start:0,end:1}]};
 const p=composePose(a,{walking:.2,armPitch:0},.5,{armPitch:[-2.8,1],grip:[0,1],armSpread:[-.4,.9]});
 assert.equal(p.walking,.2);assert.equal(p.armPitch,-1.3);assert.equal(p.grip,1);
});
test('attachment follows exact hand anchor and detach freezes world position',()=>{
 const s=cpu.shots[2],a=evaluateGraph(s,.55),g=a.assets.find(x=>x.id==='guide'),tool=a.assets.find(x=>x.id==='tool');
 const expected=robotHandAnchor(g.pose);assert.ok(Math.hypot(...tool.pose.origin.map((x,i)=>x-expected[i]))<.3);
 assert.deepEqual(evaluateGraph(s,.88).assets[1].pose.origin,evaluateGraph(s,1).assets[1].pose.origin);
 const bad=structuredClone(cpu);bad.shots[2].assets[0].attachment={parent:'guide',anchor:'right-hand',start:0,end:1};assert.throws(()=>validateProject(bad),/cycle/);
});
test('bad rig, unsupported articulation, chart and transition rejected',()=>{
 for(const mutate of [x=>x.shots[0].cameraRig.subject='missing',x=>x.shots[0].assets[1].actions=[{name:'wave',start:0,end:1}],x=>x.shots[2].overlays[0].data[0].value=-1,x=>x.shots[2].transition='teleport',x=>x.shots[1].assets[0].assembly.distance=Infinity]){
  const x=structuredClone(cpu);mutate(x);assert.throws(()=>validateProject(x));
 }
 assert.throws(()=>validateOverlays([{type:'network',slot:'lower',text:'x',data:['a','b'],edges:[[0,2]]}]));
 for(const slot of ['upper','center','lower']){const l=overlayLayout(slot);assert.ok(l.x>=40&&l.x+l.w<=680&&l.y+l.h<=1030&&l.y>=310);}
});
test('assembly reveal is deterministic and shot indexing retains exact boundaries',()=>{
 const s=cpu.shots[1],sample=p=>{let n=0;emitGraph(evaluateGraph(s,p),()=>n++);return n};
 assert.equal(sample(0),sample(1));const x=structuredClone(s);x.assets[0].assembly.type='reveal';let a=0,b=0;emitGraph(evaluateGraph(x,0),()=>a++);emitGraph(evaluateGraph(x,1),()=>b++);assert.ok(b>a);
 const t={durationFrames:1350,shots:cpu.shots.map((s,i)=>({startFrame:i*225,endFrame:(i+1)*225,segments:[]}))};assert.equal(shotAt(t,224).index,0);assert.equal(shotAt(t,225).index,1);assert.equal(shotAt(t,1349).progress,1);
});
