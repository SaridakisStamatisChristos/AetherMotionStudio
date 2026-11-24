// ART-02 slice 1: composition report and telephoto product hero framing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {inspectShot} from '../src/quality/preflight.js';
import {compositionReport,cameraAngle,SAFE} from '../src/quality/composition.js';
import {RIG_CAMERA_LIMITS} from '../src/core/cinematography.js';

const read=name=>JSON.parse(readFileSync(new URL('../examples/'+name+'.json',import.meta.url),'utf8'));
const project=s=>({version:2,id:'art02-test',title:'t',voice:'af_heart',shots:[s]});

test('art02-product: matched pair; only the camera differs from the owner-approved ART-01 choreography',()=>{
 const a=read('art02-product-cpu-polished'),b=read('art02-product-three-polished'),o=read('art01-product-cpu-polished');
 validateProject(a);validateProject(b);assert.deepEqual(a.shots,b.shots.map(s=>({...s,backend:'cpu'})));
 const {camera,cameraRig,cameraInterpolation,...rest}=a.shots[0],{camera:oc,...orest}=o.shots[0];assert.deepEqual(rest,orest);
 for(const p of [0,.3,.6,1])assert.deepEqual(evaluateGraph(a.shots[0],p).assets,evaluateGraph(o.shots[0],p).assets);
});

test('art02-product fills about half the safe area, centred, never cropped, with no preflight issues',()=>{
 const s=read('art02-product-cpu-polished').shots[0],c=compositionReport(s),old=compositionReport(read('art01-product-cpu-polished').shots[0]),pre=inspectShot(s);
 assert.ok(c.subjectHeightOfSafe.mean>=.45&&c.subjectHeightOfSafe.max<=.7,JSON.stringify(c.subjectHeightOfSafe));
 assert.ok(c.subjectHeightOfSafe.mean>=2*old.subjectHeightOfSafe.mean,'at least 2x the ART-01 framing');
 for(const k of ['x','y'])assert.ok(c.subjectCenterInSafe[k].min>.35&&c.subjectCenterInSafe[k].max<.65,k);
 assert.deepEqual(pre.issues,[]);assert.equal(pre.metrics.croppedFraction,0);assert.equal(pre.metrics.safeOutsideFraction,0);
});

test('composition report: camera angle convention, back-to-camera count and overlap on the handoff fixture',()=>{
 const cam={position:[0,3,8]};
 assert.ok(Math.abs(cameraAngle({origin:[0,0,0],yaw:0},cam))<1e-9);assert.ok(Math.abs(cameraAngle({origin:[0,0,0],yaw:Math.PI},cam)-180)<1e-9);
 assert.ok(Math.abs(cameraAngle({origin:[0,0,0],yaw:Math.PI/2},cam)-90)<1e-9);
 const c=compositionReport(read('art01-handoff-cpu-polished').shots[0],{subject:'tool'});
 assert.deepEqual(Object.keys(c.characters).sort(),['giver','receiver','watcher']);
 for(const v of Object.values(c.characters))assert.equal(v.backToCameraSamples,0);
 assert.ok(c.overlap['giver|receiver'].max<=.3);assert.equal(c.samples,9);
 const turned=structuredClone(read('art01-handoff-cpu-polished').shots[0]);delete turned.assets[0].face;turned.assets[0].tracks.yaw=[[0,Math.PI]];
 assert.ok(compositionReport(turned,{subject:'tool'}).characters.giver.backToCameraSamples>0,'negative: turned character is detected');
});

test('composition report does not alter preflight output (historical reports unchanged)',()=>{
 const s=read('art01-product-cpu-polished').shots[0],before=JSON.stringify(inspectShot(s));compositionReport(s);assert.equal(JSON.stringify(inspectShot(s)),before);
 assert.deepEqual(SAFE,{x:[24,696],y:[310,1040]});
});

test('rig zoom ceiling widened to 2400 only; plain camera limits and auto-framing clamp unchanged',()=>{
 assert.deepEqual(RIG_CAMERA_LIMITS,{x:[-5,5],y:[1.8,6],z:[6,12],zoom:[700,2400]});
 const s=structuredClone(read('art02-product-cpu-polished').shots[0]);s.camera.zoom=[[0,2401]];assert.throws(()=>validateProject(project(s)),/camera\.zoom: out of range/);
 const plain=structuredClone(read('art01-product-cpu-polished').shots[0]);plain.camera.zoom=[[0,1400]];assert.throws(()=>validateProject(project(plain)),/camera\.zoom: out of range/);
 const auto=structuredClone(read('art02-product-cpu-polished').shots[0]);delete auto.camera.zoom;assert.throws(()=>validateProject(project(auto)),/cameraInterpolation\.zoom: interpolation requires a track/);delete auto.cameraInterpolation.zoom;validateProject(project(auto));
 for(const p of [0,.5,1])assert.ok(evaluateGraph(auto,p).camera.zoom<=1550,'auto-framing still clamps to 1550');
});
