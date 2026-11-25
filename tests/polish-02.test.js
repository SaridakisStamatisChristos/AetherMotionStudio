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
