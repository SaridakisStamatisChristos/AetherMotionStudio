import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {restoreLibrary,continuityLedger,validateLibrary,resolveIdentity,canonical} from '../src/core/identity.js';
import {identityEvidence,geometryRecord} from '../src/director/identity-evidence.js';
import {handAnchor} from '../src/core/cinematography.js';
import {evaluateGraph} from '../src/core/graph.js';
import {validateProject} from '../src/core/timeline.js';
import {OBJECT_CATALOG} from '../src/visual/catalog.js';
import {recipeRig} from '../src/visual/catalog-rig.js';
const q=JSON.parse(readFileSync(new URL('../examples/continuity-cpu-polished.request.json',import.meta.url)));
test('persistent identities, independent compilation and explicit events',async()=>{
 const a=await direct(q),b=await direct({...q,id:'new-project',backend:'three',identityLibrary:restoreLibrary(JSON.parse(canonical(q.identityLibrary)))});
 assert.equal(a.project.shots.length,5);assert.equal(a.project.shots.reduce((n,s)=>n+s.durationFrames,0),1500);
 const l=continuityLedger(a.project);assert.equal(l.shots[0].heldAtEnd.length,0);assert.equal(l.shots[1].heldAtEnd[0].prop,'repair-tool');assert.equal(l.shots[2].heldAtStart[0].holder,'orion');assert.equal(l.shots[2].location,'city-station');assert.equal(l.shots[3].identities[0].variant,'active');assert.equal(l.shots[4].heldAtEnd.length,0);
 assert.equal(a.manifest.identityLibraryDigest,b.manifest.identityLibraryDigest);assert.deepEqual(identityEvidence(a.project),identityEvidence(b.project));
 b.project.id=a.project.id;b.project.shots.forEach(s=>s.backend='cpu');assert.deepEqual(a.project,b.project);
 const x=await direct({...q,id:'another',story:undefined,topic:'A new introduction',seconds:15,identityLibrary:restoreLibrary(q.identityLibrary)});
 assert.equal(x.project.shots[0].assets[0].identity,'orion');assert.equal(x.project.shots[0].assets[0].params.primary,a.project.shots[0].assets[0].params.primary);
});
test('reject drift, missing events, lost holdings, unknown identities and conflicting definitions',async()=>{
 const p=(await direct(q)).project;
 for(const mutate of [
 x=>x.shots[0].assets[0].params.primary='#ffffff',x=>x.shots[0].assets[0].asset='service-robot',x=>x.shots[0].assets[0].variant='unknown',x=>x.shots[0].assets[0].identityPose.scale=.7,x=>x.shots[1].continuity.events=[],x=>x.shots[2].assets[1].attachment.start=.2,x=>x.shots[2].assets.pop(),x=>x.shots[2].continuity.events=[],x=>x.shots[3].continuity.events=[],x=>x.shots[4].continuity.events=[],x=>x.shots[3].layers='solar-field',x=>x.shots[0].assets[1].identity='orion',x=>delete x.identityLibrary
 ]){const b=structuredClone(p);mutate(b);assert.throws(()=>validateProject(b));}
 const bad=structuredClone(q.identityLibrary);bad.definitions[0].variants[0].appearance.width=1.2;assert.throws(()=>validateLibrary(bad));
 const dup=structuredClone(q.identityLibrary);dup.definitions.push(dup.definitions[0]);assert.throws(()=>validateLibrary(dup),/duplicate/);
});
test('hand anchors match actual procedural mesh under transformed human and robot poses',()=>{
 for(const asset of ['explorer-robot','engineer']){
  const pose={origin:[.7,.2,-.3],yaw:.7,scale:1.1,params:{width:1.15,height:.9,depth:1.2},armPitch:-.9,armSpread:.3,open:.4,walking:.5,grip:.6};
  const anchor=handAnchor(asset,pose),rows=geometryRecord(asset,pose.params,pose);
  assert.ok(rows.some(row=>row.corners[0].map((v,i)=>(v+row.corners[7][i])/2).every((v,i)=>Math.abs(v-anchor[i])<1e-7)));
  assert.notDeepEqual(anchor,handAnchor(asset,{...pose,armPitch:0,armSpread:0}));
 }
});
test('hold follows hand; smooth pickup, deterministic detach and sampled appearance',async()=>{
 const p=(await direct(q)).project,s=p.shots[2],[c,prop]=evaluateGraph(s,.5).assets,anchor=handAnchor(c.asset,c.pose);
 assert.ok(Math.hypot(...prop.pose.origin.map((v,i)=>v-anchor[i]))<.3);
 assert.deepEqual(evaluateGraph(p.shots[4],.85).assets[1].pose.origin,evaluateGraph(p.shots[4],1).assets[1].pose.origin);
 const a=evaluateGraph(p.shots[1],.28).assets[1].pose.origin,b=evaluateGraph(p.shots[1],.279999).assets[1].pose.origin;assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<1e-6);
 const before=identityEvidence(p);for(const t of [1,0,.91,.2])evaluateGraph(s,t);assert.deepEqual(before,identityEvidence(p));assert.equal(Object.keys(before.neutralGeometryFingerprints).length,3);
});
test('all 250 neutral geometries finite and deterministic; acyclic rig metadata; family variants',()=>{
 assert.equal(OBJECT_CATALOG.length,250);
 for(const a of OBJECT_CATALOG){const rows=geometryRecord(a.id);assert.ok(rows.length>0);assert.deepEqual(rows,geometryRecord(a.id));const rig=recipeRig(a.id),seen=new Set();for(const c of rig.components){assert.ok(!seen.has(c.id));assert.ok(c.parent===null||seen.has(c.parent));seen.add(c.id);}}
 for(const asset of ['engineer','explorer-robot','robot-dog']){
  const d={id:'test',name:'Test',kind:'character',recipeVersion:1,asset,appearance:{primary:'#112233'},variants:[{id:'active',appearance:{primary:'#abcdef'}}],defaultPose:{walking:0}};
  const map=validateLibrary({version:1,definitions:[d]});assert.notDeepEqual(geometryRecord(asset,resolveIdentity(map,'test').params),geometryRecord(asset,resolveIdentity(map,'test','active').params));
 }
});
