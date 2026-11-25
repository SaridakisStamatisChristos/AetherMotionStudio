// POLISH-01: foot-planted locomotion, identity handoff chains in the IR, interaction solver, staging art-v2, literal casting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {emitAsset} from '../src/visual/assets.js';
import {handAnchor} from '../src/core/cinematography.js';
import {tri,lift,strideLength,locomotionRig,SWING} from '../src/core/locomotion.js';
import {solveHandoff} from '../src/core/interaction.js';
import {stageProject,stageShot} from '../src/core/staging.js';
import {direct} from '../src/director/index.js';
import {literalCast} from '../src/director/offline.js';
import {request,validateIR} from '../src/director/schema.js';
import {inspectProject} from '../src/quality/preflight.js';
import {compositionReport} from '../src/quality/composition.js';

const project=shots=>({version:2,id:'polish-test',title:'t',voice:'af_heart',shots});
const walker=(asset,extra={})=>({id:'walk',template:'cinematic-graph',backend:'cpu',durationFrames:180,transitionFrames:0,heading:'W',subheading:'w',environment:'amber',camera:{},effects:[],narration:['x'],
 assets:[{id:'w',asset,tracks:{x:[[0,-1.6],[1,1.6]],yaw:[[0,1.5708]]},...extra}]});
function feet(a){const out=[];emitAsset(a.asset,(c,sz,col,tf=q=>q)=>out.push({w:tf(c),size:sz}),a.pose);
 const o=a.pose.origin,right=[Math.cos(a.pose.yaw),0,-Math.sin(a.pose.yaw)],sc=a.pose.scale??1,low=out.filter(b=>b.w[1]-o[1]<.3*sc&&b.size[1]<.3&&b.size[1]>.1);
 const side=s=>low.filter(b=>Math.sign((b.w[0]-o[0])*right[0]+(b.w[2]-o[2])*right[2])===s).sort((p,q)=>p.w[1]-q.w[1])[0];return {R:side(1),L:side(-1)};}
function slip(shot){let prev=null,max=0;for(let f=0;f<shot.durationFrames;f++){const a=evaluateGraph(shot,f/(shot.durationFrames-1)).assets[0],ft=feet(a),l=a.pose.footLift??0;
 const stance=l>1e-9?'L':l<-1e-9?'R':(ft.R.w[1]<=ft.L.w[1]?'R':'L');if(prev&&prev.stance===stance)max=Math.max(max,Math.hypot(ft[stance].w[0]-prev.ft[stance].w[0],ft[stance].w[2]-prev.ft[stance].w[2]));prev={ft,stance};}return max;}

test('locomotion math: triangle stride, alternating lift, stride sized to the leg swing',()=>{
 assert.deepEqual([0,.25,.5,.75,1].map(tri),[0,1,0,-1,0]);
 assert.ok(lift(.1)>0&&lift(.5)<0,'right then left foot swings');assert.ok(Math.abs(lift(.25))<1e-12&&Math.abs(lift(.75))<1e-12);
 assert.equal(strideLength('engineer'),4*SWING.human);assert.equal(strideLength('service-robot',.5),4*SWING.robot*.5);
 assert.equal(locomotionRig('retro-robot'),null);assert.equal(locomotionRig('wrench'),null);assert.equal(locomotionRig('scientist'),'human');
 assert.throws(()=>strideLength('wrench'),/locomotion unsupported/);
});

test('foot-planted walking: zero stance-foot slip for human and robot; legacy walk action slides',()=>{
 for(const asset of ['engineer','service-robot']){
  const planted=walker(asset,{locomotion:{mode:'stride',start:0,end:1,faceTravel:true,blend:.1}});validateProject(project([planted]));
  const legacy=walker(asset,{actions:[{name:'walk',start:0,end:1,mode:'loop',speed:3}]});validateProject(project([legacy]));
  assert.ok(slip(planted)<1e-3,asset+' planted slip '+slip(planted));assert.ok(slip(legacy)>.02,asset+' legacy slip '+slip(legacy));
  const mid=evaluateGraph(planted,.5).assets[0].pose;assert.ok(Math.abs(mid.yaw-Math.PI/2)<1e-6,'faces travel');
 }
 const eased=walker('engineer',{locomotion:{mode:'stride',start:0,end:1}});eased.assets[0].tracks.x=[[0,-1.6],[.5,0],[1,1.6]];assert.ok(slip(eased)<1e-3,'eased path still planted');
});

test('locomotion defaults: absent keeps pose keys and geometry; window edges settle to standing',()=>{
 const plain=walker('engineer');assert.ok(!('footLift' in evaluateGraph(plain,.5).assets[0].pose));
 const s=walker('engineer',{locomotion:{mode:'stride',start:.2,end:.8}});
 for(const p of [0,.1,.9,1]){const a=evaluateGraph(s,p).assets[0].pose;assert.equal(a.walking,0);assert.equal(a.footLift,0);}
});

test('negative: locomotion validation',()=>{
 const bad=(asset,loc,extra={},re)=>assert.throws(()=>validateProject(project([walker(asset,{locomotion:loc,...extra})])),re);
 bad('retro-robot',{mode:'stride',start:0,end:1},{},/legged catalog human or robot/);
 bad('wrench',{mode:'stride',start:0,end:1},{},/legged catalog human or robot/);
 bad('engineer',{mode:'glide',start:0,end:1},{},/stride required/);
 bad('engineer',{mode:'stride',start:.5,end:.5},{},/invalid window/);
 bad('engineer',{mode:'stride',start:0,end:1,blend:.9},{},/out of range/);
 bad('engineer',{mode:'stride',start:0,end:1,faceTravel:'yes'},{},/boolean required/);
 bad('engineer',{mode:'stride',start:0,end:1,speed:2},{},/unknown field/);
 bad('engineer',{mode:'stride',start:0,end:1},{actions:[{name:'walk',start:0,end:1}]},/locomotion drives walking/);
});

test('handoff solver meets hands within 6 cm for varied rig pairs while keeping faces toward the camera',()=>{
 for(const [g,r] of [['engineer','service-robot'],['scientist','engineer'],['office-worker','student']]){
  const s=solveHandoff(g,r,{giverAt:[-.7,0]});assert.ok(s.gap<.06,g+'->'+r+' '+s.gap);
  const gy=Math.atan2(s.receiver.x-s.giver.x,s.receiver.z-s.giver.z)+s.giver.faceOffset;assert.ok(Math.abs(Math.atan2(Math.sin(gy),Math.cos(gy)))*180/Math.PI<=100);
 }
 assert.deepEqual(solveHandoff('engineer','scientist'),solveHandoff('engineer','scientist'),'deterministic');
});

test('staging art-v2: solved handoff + planted walk; art-v1 output unchanged by the new mode',async()=>{
 const q={version:1,id:'team',topic:'An engineer walks with a scientist and passes a wrench',seconds:30,backend:'cpu'};
 const v2=(await direct({...q,staging:'art-v2'})).project;assert.deepEqual(inspectProject(v2).issues,[]);
 const walks=v2.shots.flatMap(s=>s.assets.filter(a=>a.locomotion)),chains=v2.shots.flatMap(s=>s.assets.filter(a=>Array.isArray(a.attachment)));
 assert.ok(walks.length>=1&&chains.length>=1);
 for(const s of v2.shots){for(const v of Object.values(compositionReport(s).characters))assert.equal(v.backToCameraSamples,0);
  const tool=s.assets.find(a=>Array.isArray(a.attachment));if(!tool)continue;
  const st=evaluateGraph(s,tool.attachment[1].start),m=Object.fromEntries(st.assets.map(a=>[a.id,a])),g=m[tool.attachment[0].parent],r=m[tool.attachment[1].parent];
  assert.ok(Math.hypot(...handAnchor(g.asset,g.pose,1).map((v,i)=>v-handAnchor(r.asset,r.pose,1)[i]))<.08,'hands meet in '+s.id);}
 const v1=(await direct({...q,staging:'art-v1'})).project;assert.ok(v1.shots.every(s=>s.assets.every(a=>!a.locomotion&&!Array.isArray(a.attachment))),'art-v1 adds no interaction');
 const plain=(await direct(q)).project;assert.ok(plain.shots.every(s=>s.assets.some(a=>a.asset==='retro-robot')),'unstaged casting unchanged (guide robot)');
});

test('literal casting finds catalog assets named in the topic, in order, with simple plurals',()=>{
 assert.deepEqual(literalCast('How an engineer and a scientist share a wrench'),['engineer','scientist','wrench']);
 assert.deepEqual(literalCast('Two engineers and a service robot'),['engineer','service-robot']);
 assert.deepEqual(literalCast('How the ocean tides work'),[]);
});

test('IR hold chains compile to attachment chains; malformed chains rejected',async()=>{
 const q=JSON.parse(readFileSync(new URL('../examples/continuity-cpu-polished.request.json',import.meta.url))),r=await direct(q);
 const ir=structuredClone(r.ir),shot=ir.shots.find(s=>s.assets.some(a=>a.hold&&a.hold.end<1)),a=shot.assets.find(x=>x.hold&&x.hold.end<1),h=a.hold,mid=+((h.start+h.end)/2).toFixed(3);
 a.hold=[{...h,end:mid},{...h,start:mid,anchor:'left-hand'}];
 const req=request(q);validateIR(ir,req,r.catalogSelection);
 a.hold=[{...h}];assert.throws(()=>validateIR(ir,req,r.catalogSelection),/hold chain requires 2–4 windows/);
 a.hold=[{...h,end:mid},{...h,start:mid-.05}];assert.throws(()=>validateIR(ir,req,r.catalogSelection),/hold windows must be sequential/);
});
