import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectProject,repairProject} from '../src/quality/preflight.js';
import {validateProject} from '../src/core/timeline.js';
const q=JSON.parse(readFileSync(new URL('../examples/quality-cpu-polished.json',import.meta.url)));
const protectedShot=s=>{const {camera,cameraRig,...rest}=s;return rest};
test('controlled crop is discovered and bounded camera repair improves it without changing content',()=>{
 const before=inspectProject(q),original=before.shots[2].metrics;
 assert.ok(original.croppedFraction>.015);
 const off=repairProject(q);assert.deepEqual(off.project,q);assert.equal(off.report.candidateEvaluations,0);
 const a=repairProject(q,null,{enabled:true}),b=repairProject(q,null,{enabled:true});
 assert.deepEqual(a,b);assert.ok(a.report.candidateEvaluations<=20);
 assert.ok(a.report.accepted.some(x=>x.shot==='shot-3'));
 assert.ok(a.report.after.shots[2].metrics.croppedFraction<original.croppedFraction);
 assert.deepEqual(a.project.shots.map(protectedShot),q.shots.map(protectedShot));
 assert.deepEqual(a.project.speech,q.speech);assert.equal(a.report.renderCost.extraNativeRenders,0);
 validateProject(a.project);
});
test('matched pair keeps independent backends and same repaired camera data',()=>{
 const other=JSON.parse(readFileSync(new URL('../examples/quality-three-polished.json',import.meta.url)));
 const a=repairProject(q,null,{enabled:true}),b=repairProject(other,null,{enabled:true});
 assert.deepEqual(a.report.accepted,b.report.accepted);
 b.project.id=a.project.id;b.project.shots.forEach(s=>s.backend='cpu');assert.deepEqual(a.project,b.project);
});
test('predeclared geometry challenge cases, including clean and deliberately cropped variants',()=>{
 const cases=[
 ['scientist','desk','laptop'],['compact-car','freight-truck','delivery-van'],['molecule-water','atom-model','microscope'],['oak-tree','pine-tree','birch-tree']
 ];
 for(const [i,assets] of cases.entries()){
  const p=structuredClone(q);p.id='challenge-'+i;
  p.shots[2].assets.forEach((a,j)=>{a.asset=assets[j];});
  const before=inspectProject(p),result=repairProject(p,null,{enabled:true,maxCandidates:40,maxPasses:2}),after=result.report.after;
  assert.ok(result.report.candidateEvaluations<=40);
  assert.ok(after.shots[2].metrics.croppedFraction<=before.shots[2].metrics.croppedFraction);
  assert.ok(after.shots[2].metrics.nearPlaneVertices<=before.shots[2].metrics.nearPlaneVertices);
  assert.deepEqual(result.project.shots.map(protectedShot),p.shots.map(protectedShot));
 }
 const unchanged=repairProject(q,null,{enabled:true,maxCandidates:0});assert.deepEqual(unchanged.project,q);
 assert.throws(()=>repairProject(q,null,{enabled:true,maxPasses:100}));
 const malformed=structuredClone(q);malformed.shots[2].assets[0].asset='unknown';assert.throws(()=>inspectProject(malformed));
});
test('structural content findings are advisory and never rewrite narration',()=>{
 const p=structuredClone(q);p.shots[1].narration=p.shots[0].narration;p.shots[1].heading=p.shots[0].heading;
 const a=repairProject(p,null,{enabled:true});
 assert.ok(a.report.after.issues.some(x=>x.code==='REPEATED_HEADING'));
 assert.ok(a.report.after.issues.some(x=>x.code==='REPEATED_NARRATION'));
 assert.deepEqual(a.project.shots[1].narration,p.shots[1].narration);
});
