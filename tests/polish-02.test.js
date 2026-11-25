// POLISH-02: opt-in aiming (point at a target asset).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {solveAim,aimSupported,AIM_LIMITS} from '../src/core/aim.js';
import {localArm,recipeSpec} from '../src/visual/catalog-rig.js';
import {add,ry,sub,norm,dot} from '../src/visual/vectors.js';

const project=shots=>({version:2,id:'polish-test',title:'t',voice:'af_heart',shots});
const shot=(assets)=>({id:'aim',template:'cinematic-graph',backend:'cpu',durationFrames:120,transitionFrames:0,heading:'A',subheading:'a',environment:'laboratory',camera:{},effects:[],narration:['x'],assets});
const pointer=(extra={},asset='engineer')=>({id:'p',asset,tracks:{x:[[0,-1]]},actions:[{name:'point',start:.1,end:.9,blend:.1}],...extra});
const table={id:'t',asset:'table',tracks:{x:[[0,1.4]],z:[[0,-.6]]}};
// Angle (deg) between the right arm's shoulder→hand ray and the ray to the target point.
function aimError(state,id,tid,h){
 const a=state.assets.find(x=>x.id===id),t=state.assets.find(x=>x.id===tid),q=recipeSpec(a.asset),pp=a.pose.params??{},d=[pp.width??1,pp.height??1,pp.depth??1];
 const {shoulder,hand}=localArm(q.family,q.args,1,a.pose),w=v=>add(ry(v.map((c,i)=>c*(a.pose.scale??1)*d[i]),a.pose.yaw),a.pose.origin);
 const s=w(shoulder);return Math.acos(Math.min(1,dot(norm(sub(w(hand),s)),norm(sub(add(t.pose.origin,[0,h,0]),s)))))*180/Math.PI;
}

test('aim: solved arm points at reachable targets for human and robot rigs',()=>{
 for(const asset of ['engineer','scientist','service-robot','industrial-robot'])for(const tgt of [[1.5,0,.5],[.6,1.5,1.2],[.6,0,2]]){
  const r=solveAim(asset,{origin:[0,0,0],yaw:0},tgt,{height:0,cheat:.6});
  assert.ok(r.error*180/Math.PI<3,asset+' '+tgt+' error '+r.error);
  assert.ok(r.armPitch>=AIM_LIMITS.pitch[0]&&r.armPitch<=AIM_LIMITS.pitch[1]&&r.armSpread>=AIM_LIMITS.spread[0]&&r.armSpread<=AIM_LIMITS.spread[1]);
  assert.ok(Math.abs(r.yaw)<=.6+1e-9,'cheat bounded');
 }
 // Arm-only (no cheat) for a front-right target: body yaw untouched.
 const r=solveAim('engineer',{origin:[0,0,0],yaw:0},[1.5,0,.5],{height:0});assert.equal(r.yaw,0);assert.ok(r.error*180/Math.PI<1);
});
// The arm has no shoulder yaw and spread is capped at .9 rad (rig limits unchanged), so straight-ahead, cross-body
// and far-side targets need the opt-in body cheat.
test('aim: cheat turns the body for cross-body targets and is bounded',()=>{
 const tgt=[-1,0,1],plain=solveAim('engineer',{origin:[0,0,0],yaw:0},tgt),cheat=solveAim('engineer',{origin:[0,0,0],yaw:0},tgt,{cheat:1.2});
 assert.ok(plain.error*180/Math.PI>20,'cross-body target is out of arm range without cheat');
 assert.ok(cheat.error*180/Math.PI<2&&cheat.yaw<0&&Math.abs(cheat.yaw)<=1.2+1e-9);
 const small=solveAim('engineer',{origin:[0,0,0],yaw:0},tgt,{cheat:.2});assert.ok(Math.abs(small.yaw)<=.2+1e-9);
});
test('aim: deterministic and reproducible frame evaluation',()=>{
 const s=shot([pointer({aim:{target:'t',start:.1,end:.9,blend:.1,height:.7,cheat:.6}}),table]);validateProject(project([s]));
 const a=JSON.stringify(evaluateGraph(s,.5)),b=JSON.stringify(evaluateGraph(structuredClone(s),.5));assert.equal(a,b);
 assert.ok(aimError(evaluateGraph(s,.5),'p','t',.7)<1,'points at the table mid-window');
 const legacy=shot([pointer(),table]);assert.ok(aimError(evaluateGraph(legacy,.5),'p','t',.7)>10,'fixed point misses the table');
});
test('aim: outside the window the pose is unchanged; hold keeps the solved arm',()=>{
 const s=shot([pointer({aim:{target:'t',start:.1,end:.6}}),table]),legacy=shot([pointer(),table]);
 for(const t of [0,.05,.7,1])assert.deepEqual(evaluateGraph(s,t).assets[0].pose,evaluateGraph(legacy,t).assets[0].pose,'t='+t);
 const h=shot([{id:'p',asset:'engineer',tracks:{x:[[0,-1]]},aim:{target:'t',start:.1,end:.4,hold:true,height:.7,cheat:.6}},table]);
 assert.ok(aimError(evaluateGraph(h,.9),'p','t',.7)<1,'hold persists after the window');
});
test('aim: blend ramps the arm in (no pop at window start)',()=>{
 const s=shot([pointer({aim:{target:'t',start:.1,end:.9,blend:.2}}),table]),legacy=shot([pointer(),table]);
 const d=t=>Math.abs(evaluateGraph(s,t).assets[0].pose.armSpread-evaluateGraph(legacy,t).assets[0].pose.armSpread);
 assert.ok(d(.101)<.01&&d(.5)>.05);
});
test('aim: negatives — rejected rigs, targets, windows, values and conflicting tracks',()=>{
 const bad=(extra,asset)=>assert.throws(()=>validateProject(project([shot([pointer(extra,asset),table])])));
 bad({aim:{target:'t',start:.1,end:.9}},'retro-robot');bad({aim:{target:'t',start:.1,end:.9}},'table');
 bad({aim:{target:'p',start:.1,end:.9}});bad({aim:{target:'nobody',start:.1,end:.9}});
 bad({aim:{target:'t',start:.6,end:.5}});bad({aim:{target:'t',start:-.1,end:.5}});bad({aim:{target:'t',start:.1}});
 bad({aim:{target:'t',start:.1,end:.9,blend:.6}});bad({aim:{target:'t',start:.1,end:.9,hold:false}});
 bad({aim:{target:'t',start:.1,end:.9,cheat:2}});bad({aim:{target:'t',start:.1,end:.9,height:-1}});
 bad({aim:{target:'t',start:.1,end:.9,extra:1}});bad({aim:'t'});
 bad({aim:{target:'t',start:.1,end:.9},tracks:{x:[[0,-1]],armPitch:[[0,-1]]}});
 assert.equal(aimSupported('retro-robot'),false);assert.equal(aimSupported('engineer'),true);
 assert.throws(()=>solveAim('table',{origin:[0,0,0]},[1,0,0]));
});
test('aim: Workshop Extended LEARNING BY WATCHING pointers aim at the table',()=>{
 const p=JSON.parse(readFileSync(new URL('../examples/workshop-extended-cpu-polished.json',import.meta.url),'utf8'));validateProject(p);
 const s=p.shots.find(x=>x.id==='teach');
 assert.ok(aimError(evaluateGraph(s,.3),'engineer','table',.7)<3);assert.ok(aimError(evaluateGraph(s,.75),'robot','table',.7)<5);
});

// ---- Item 2: planted feet / turn-in-place steps (turnSteps) ----
import {emitAsset} from '../src/visual/assets.js';
import {STEP_FRAMES,STEP_DIST,PIVOT} from '../src/core/turnsteps.js';
const feetOf=a=>{const out=[];emitAsset(a.asset,(c,sz,col,tf=q=>q)=>out.push({w:tf(c),size:sz}),a.pose);const o=a.pose.origin,sc=a.pose.scale??1;return out.filter(b=>b.w[1]-o[1]<.3*sc&&b.size[1]<.3&&b.size[1]>.1);};
// Max per-frame horizontal movement (cm) of any foot that is not lifted, plus the number of lift-offs.
function stanceSlip(shot,id){let prev=null,max=0,steps=0,last=0;
 for(let f=0;f<shot.durationFrames;f++){const a=evaluateGraph(shot,f/(shot.durationFrames-1)).assets.find(x=>x.id===id),ft=feetOf(a),l=a.pose.footLift??0;
  if(Math.abs(l)>1e-6&&Math.abs(last)<=1e-6)steps++;last=l;
  if(prev)for(let i=0;i<ft.length;i++){const side=i<ft.length/2?-1:1;if(l*side>1e-6||prev.l*side>1e-6)continue;max=Math.max(max,Math.hypot(ft[i].w[0]-prev.ft[i].w[0],ft[i].w[2]-prev.ft[i].w[2]));}
  prev={ft,l};}
 return {cm:max*100,steps};}
const turner=(asset,extra={},yaw=[[0,0],[.2,0],[.8,1.6]])=>({id:'turn',template:'cinematic-graph',backend:'cpu',durationFrames:120,transitionFrames:0,heading:'T',subheading:'t',environment:'amber',camera:{},effects:[],narration:['x'],
 assets:[{id:'w',asset,tracks:{x:[[0,0]],yaw},...extra}]});

test('turnSteps: turning in place keeps planted feet fixed and takes alternating steps',()=>{
 for(const asset of ['engineer','scientist','service-robot']){
  const legacy=stanceSlip(turner(asset),'w'),planted=stanceSlip(turner(asset,{turnSteps:true}),'w');
  assert.ok(legacy.cm>.3,asset+' legacy pivots ('+legacy.cm+')');assert.ok(planted.cm<.01,asset+' planted slip '+planted.cm);
  assert.ok(planted.steps>=3,asset+' steps '+planted.steps);
 }
});
test('turnSteps: twist bounded by the pivot cap; feet return under the hips after the turn',()=>{
 const s=turner('engineer',{turnSteps:true},[[0,0],[.1,0],[.3,2.5]]);let maxT=0;
 for(let f=0;f<120;f++){const p=evaluateGraph(s,f/119).assets[0].pose;maxT=Math.max(maxT,Math.abs(p.footTwistR),Math.abs(p.footTwistL));}
 assert.ok(maxT<=PIVOT+1e-9);
 const end=evaluateGraph(s,1).assets[0].pose;for(const k of ['R','L']){assert.ok(Math.hypot(end['footDx'+k],end['footDz'+k])<STEP_DIST,k);assert.ok(Math.abs(end['footTwist'+k])<=.35,k);}
 assert.equal(end.footLift,0);
});
test('turnSteps: standing still is identical to no turnSteps apart from zero foot keys',()=>{
 const yaw=[[0,.4]],a=evaluateGraph(turner('engineer',{},yaw),.5).assets[0],b=evaluateGraph(turner('engineer',{turnSteps:true},yaw),.5).assets[0];
 const {footDxR,footDzR,footDxL,footDzL,footTwistR,footTwistL,footLift,...rest}=b.pose;
 for(const v of [footDxR,footDzR,footDxL,footDzL,footTwistR,footTwistL,footLift])assert.ok(Math.abs(v)<1e-12);
 assert.deepEqual(rest,a.pose);
 const ga=[],gb=[];emitAsset(a.asset,(c,sz,col,tf=q=>q)=>ga.push(tf(c).map(v=>+v.toFixed(9))),a.pose);emitAsset(b.asset,(c,sz,col,tf=q=>q)=>gb.push(tf(c).map(v=>+v.toFixed(9))),b.pose);
 assert.deepEqual(gb,ga,'geometry equal when feet are home');
});
test('turnSteps: with locomotion the stance foot stays planted through turns and the closing step',()=>{
 const s=turner('engineer',{turnSteps:true,locomotion:{mode:'stride',start:.1,end:.6,faceTravel:true,blend:.15}},[[0,0]]);
 s.assets[0].tracks={x:[[.1,-1.2],[.6,.4]],z:[[.1,0],[.6,.8]]};
 const plain=structuredClone(s);delete plain.assets[0].turnSteps;
 assert.ok(stanceSlip(plain,'w').cm>.5,'legacy walk turn pivots');assert.ok(stanceSlip(s,'w').cm<.01);
});
test('turnSteps: deterministic, cached per asset, independent of evaluation order',()=>{
 const s=turner('service-robot',{turnSteps:true}),fwd=[],rev=[];
 for(let f=0;f<120;f+=7)fwd.push(JSON.stringify(evaluateGraph(s,f/119).assets[0].pose));
 const s2=structuredClone(s);for(let f=119;f>=0;f--)if(f%7===0)rev.unshift(JSON.stringify(evaluateGraph(s2,f/119).assets[0].pose));
 assert.deepEqual(rev,fwd);assert.equal(STEP_FRAMES,8);
});
test('turnSteps: negatives',()=>{
 const bad=(extra,asset='engineer')=>assert.throws(()=>validateProject(project([turner(asset,extra)]))); 
 bad({turnSteps:true},'retro-robot');bad({turnSteps:true},'table');bad({turnSteps:true},'robot-dog');
 bad({turnSteps:false});bad({turnSteps:'yes'});bad({turnSteps:[]});bad({turnSteps:{step:.1}});bad({turnSteps:{step:.9}});bad({turnSteps:{pivot:.3}});
 validateProject(project([turner('engineer',{turnSteps:{step:.5}})]));
});
test('turnSteps: Workshop Extended new/upgraded shots have planted feet; kept shots unchanged',()=>{
 const p=JSON.parse(readFileSync(new URL('../examples/workshop-extended-cpu-polished.json',import.meta.url),'utf8'));
 for(const [shot,id] of [['toolbox','scientist'],['toolbox','engineer'],['steps','robot'],['teach','robot']])assert.ok(stanceSlip(p.shots.find(x=>x.id===shot),id).cm<.01,shot+'/'+id);
 for(const id of ['workshop','plan','power','handoff','together','lights'])assert.ok(p.shots.find(x=>x.id===id).assets.every(a=>!a.turnSteps),id);
});
