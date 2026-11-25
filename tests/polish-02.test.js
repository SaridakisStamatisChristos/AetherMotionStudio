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

// ---- Item 3: telescoping robot reach (params.reach) ----
import {catalogHandAnchor} from '../src/visual/catalog-rig.js';
import {handAnchor} from '../src/core/cinematography.js';
const topOf=(id,pose={origin:[0,0,0],yaw:0})=>{let t=0;emitAsset(id,(c,sz,col,tf=q=>q)=>{for(const dy of [-.5,.5])t=Math.max(t,tf([c[0],c[1]+dy*sz[1],c[2]])[1]);},pose);return t;};
const maxHand=(id,params)=>{let b=0;for(let p=-2.8;p<=1;p+=.05)for(let s=-.4;s<=.9;s+=.05)b=Math.max(b,catalogHandAnchor(id,{armPitch:p,armSpread:s,...(params?{params}:{})},1)[1]);return b;};
test('reach: robots reach above their heads only with the opt-in telescoping arm',()=>{
 for(const id of ['service-robot','medical-robot','explorer-robot','floating-robot']){const head=topOf(id);
  assert.ok(maxHand(id)<head,id+' default cannot reach above head');assert.ok(maxHand(id,{reach:1.8})>head,id+' reach 1.8 above head');}
});
test('reach: rest, forward and lowered poses are unchanged; reach 1 is identical to none',()=>{
 for(const pose of [{},{armPitch:-1.15},{armPitch:-.5,armSpread:.3},{armPitch:.5}])
  assert.deepEqual(catalogHandAnchor('service-robot',{...pose,params:{reach:1.8}},1),catalogHandAnchor('service-robot',pose,1));
 assert.deepEqual(catalogHandAnchor('service-robot',{armPitch:-2.6,params:{reach:1}},1),catalogHandAnchor('service-robot',{armPitch:-2.6},1));
 const g=[],h=[];emitAsset('service-robot',(c,sz,col,tf=q=>q)=>g.push(tf(c)),{origin:[0,0,0],yaw:0,armPitch:-1});emitAsset('service-robot',(c,sz,col,tf=q=>q)=>h.push(tf(c)),{origin:[0,0,0],yaw:0,armPitch:-1,params:{reach:1.6}});assert.deepEqual(h,g);
});
test('reach: negatives',()=>{
 const bad=(asset,params)=>assert.throws(()=>validateProject(project([shot([{id:'r',asset,params,tracks:{x:[[0,0]]}}])])));
 bad('engineer',{reach:1.5});bad('service-robot',{reach:.9});bad('service-robot',{reach:2.1});bad('service-robot',{reach:'long'});bad('table',{reach:1.2});
 validateProject(project([shot([{id:'r',asset:'service-robot',params:{reach:1.5},tracks:{x:[[0,0]]}}])]));
});

// ---- Item 4: surfaces, restOn, auto grip, place onto a surface, solveReach ----
import {surfaceTop,surfacePoint} from '../src/core/surface.js';
import {solveReach} from '../src/core/interaction.js';
const tableAt={id:'tb',asset:'table',tracks:{x:[[0,1]],z:[[0,-.3]],scale:[[0,.85]]}};
test('surface: top height comes from the rendered geometry; off the surface is null',()=>{
 const pose={origin:[1,0,-.3],yaw:0,scale:.85};assert.ok(Math.abs(surfaceTop('table',pose,1,-.3)-topOf('table',pose))<1e-9);
 assert.equal(surfaceTop('table',pose,3,-.3),null);assert.throws(()=>surfacePoint({asset:'table',pose},[1.4,0]));
});
test('restOn: a prop sits on the surface top; negatives',()=>{
 const s=shot([tableAt,{id:'bk',asset:'book',tracks:{scale:[[0,.7]]},restOn:{surface:'tb',at:[-.3,.2]}}]);validateProject(project([s]));
 const st=evaluateGraph(s,.5),b=st.assets.find(a=>a.id==='bk').pose.origin,t=st.assets.find(a=>a.id==='tb').pose;
 assert.ok(Math.abs(b[1]-surfaceTop('table',t,b[0],b[2]))<1e-9&&Math.abs(b[0]-(1-.3*.85))<1e-9&&Math.abs(b[2]-(-.3+.2*.85))<1e-9);
 const bad=(x,tracks={})=>assert.throws(()=>validateProject(project([shot([tableAt,{id:'bk',asset:'book',tracks,restOn:x}])])));
 bad({surface:'nope'});bad({surface:'bk'});bad({surface:'tb',at:[2,0]});bad({surface:'tb',at:[0]});bad({surface:'tb',extra:1});bad('tb');bad({surface:'tb'},{x:[[0,1]]});bad({surface:'tb'},{y:[[0,.5]]});
 assert.throws(()=>validateProject(project([shot([{...tableAt,restOn:{surface:'bk'}},{id:'bk',asset:'book',tracks:{},restOn:{surface:'tb'}}])])));
});
function carryShot(extra={}){
 const pick=solveReach('service-robot',[1-.3*.85,.81,-.3+.3*.85],{params:{reach:1.8},avoid:[{center:[1,-.3],half:[.65,.37]}],clearance:.3,hands:['left']});
 return {pick,s:shot([{id:'r',asset:'service-robot',params:{reach:1.8},tracks:{x:[[0,pick.x]],z:[[0,pick.z]],yaw:[[0,pick.yaw]],leftArmPitch:[[0,0],[.2,pick.armPitch],[.4,pick.armPitch],[.7,-.9]],leftArmSpread:[[0,0],[.2,pick.armSpread],[.4,pick.armSpread],[.7,0]]}},
  tableAt,{id:'bk',asset:'book',tracks:{scale:[[0,.7]]},restOn:{surface:'tb',at:[-.3,.3]},attachment:{parent:'r',anchor:'left-hand',start:.3,end:.8,offset:'auto',...extra}}])};
}
test('solveReach: the hand meets the target; avoid boxes and camera limits respected; deterministic',()=>{
 const {pick}=carryShot();assert.ok(pick.gap<.01,'gap '+pick.gap);
 assert.ok(!(Math.abs(pick.x-1)<.65+.32&&Math.abs(pick.z+.3)<.37+.32),'outside the table keep-out');
 assert.deepEqual(carryShot().pick,pick);
 const high=surfacePoint({asset:'bookshelf',pose:{origin:[-1.3,0,-.5],yaw:0}},[.38,.2]),o={avoid:[{center:[-1.3,-.5],half:[.52,.29]}],clearance:.3,spreadDeg:85,hands:['left']};
 assert.ok(solveReach('service-robot',[high[0],high[1]+.06,high[2]],o).gap>.1,'no reach: misses the shelf top');
 assert.ok(solveReach('service-robot',[high[0],high[1]+.06,high[2]],{...o,params:{reach:1.8}}).gap<.01,'reach 1.8 meets it');
});
test('auto grip: no pop at pickup and the prop then follows the hand rigidly',()=>{
 const {s}=carryShot();validateProject(project([s]));
 const bk=t=>evaluateGraph(s,t).assets.find(a=>a.id==='bk').pose.origin,hand=t=>handAnchor('service-robot',evaluateGraph(s,t).assets.find(a=>a.id==='r').pose,-1);
 const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 assert.ok(d(bk(.2999),bk(.3001))<1e-3,'continuous at pickup');
 const g0=d(bk(.3),hand(.3));for(const t of [.45,.6,.75])assert.ok(Math.abs(d(bk(t),hand(t))-g0)<1e-9,'rigid grip at '+t);
 assert.ok(d(bk(.6),bk(.2))>.05,'the prop moved with the arm');
});
test('place onto a surface lands on its top; negatives for auto offset and surface targets',()=>{
 const {s}=carryShot({release:{mode:'place',duration:.1,to:{surface:'tb',at:[.3,.2]}}});validateProject(project([s]));
 const st=evaluateGraph(s,1),b=st.assets.find(a=>a.id==='bk').pose.origin;assert.ok(Math.abs(b[1]-surfaceTop('table',st.assets.find(a=>a.id==='tb').pose,b[0],b[2]))<1e-9);
 const bad=extra=>{const {s}=carryShot(extra);assert.throws(()=>validateProject(project([s])));};
 bad({release:{mode:'place',duration:.1,to:{surface:'nope'}}});bad({release:{mode:'place',duration:.1,to:{surface:'bk'}}});bad({release:{mode:'drop',duration:.1,to:{surface:'tb'}}});
 const chain=carryShot().s;chain.assets[2].attachment=[{parent:'r',anchor:'left-hand',start:.3,end:.5},{parent:'r',anchor:'right-hand',start:.5,end:.8,offset:'auto'}];
 assert.throws(()=>validateProject(project([chain])),/auto offset only on the first window/);
});
test('Workshop Extended HIGH SHELF: solved pickup and place, book lands on the table top, planted feet',()=>{
 const p=JSON.parse(readFileSync(new URL('../examples/workshop-extended-cpu-polished.json',import.meta.url),'utf8')),s=p.shots.find(x=>x.id==='shelf');
 assert.equal(p.shots.map(x=>x.id).join(),'workshop,plan,toolbox,power,steps,teach,shelf,handoff,together,lights');
 const at=t=>evaluateGraph(s,t),bk=t=>at(t).assets.find(a=>a.id==='book').pose.origin,hand=t=>handAnchor('service-robot',at(t).assets.find(a=>a.id==='robot').pose,-1);
 const gap=Math.hypot(...bk(.27).map((v,i)=>v-hand(.27)[i]));assert.ok(gap<.08,'hand at the book when picking up ('+gap+')');
 assert.ok(bk(.2)[1]>1.8,'book starts on the high shelf');
 const e=bk(1),tb=at(1).assets.find(a=>a.id==='table').pose;assert.ok(Math.abs(e[1]-surfaceTop('table',tb,e[0],e[2]))<1e-9,'book on the table top');
 assert.ok(stanceSlip(s,'robot').cm<.01);
});

// ---- Items 5+10: compact director prompt director-ir-v1.2 (chains, staging) ----
import {direct,buildPrompt,estimateTokens,PROMPT_VERSIONS} from '../src/director/index.js';
import {baseline,offlineIR} from '../src/director/offline.js';
import {request as directorRequest} from '../src/director/schema.js';
import {mockProvider} from '../src/director/providers.js';
const loadReq=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.request.json',import.meta.url),'utf8'));
const REQS=['director-cpu-polished','director-three-polished','release','continuity-cpu-polished','continuity-three-polished','speech-cpu-polished','speech-three-polished'];
test('prompt v1.2: v1.1 stays the default and is byte-identical when selected explicitly',()=>{
 assert.deepEqual(PROMPT_VERSIONS,['director-ir-v1.1','director-ir-v1.2']);
 for(const n of REQS){const a=directorRequest(loadReq(n)),b=directorRequest({...loadReq(n),promptVersion:'director-ir-v1.1'});assert.equal(buildPrompt(b,baseline(b)),buildPrompt(a,baseline(a)),n);}
});
test('prompt v1.2: ≤2000 estimated tokens for every request example and a 60 s / 6-shot film; objects listed once',()=>{
 for(const n of REQS){const q=directorRequest({...loadReq(n),promptVersion:'director-ir-v1.2'}),plan=baseline(q),p=buildPrompt(q,plan),old=buildPrompt(directorRequest(loadReq(n)),plan);
  assert.ok(estimateTokens(p)<=2000,n+' '+estimateTokens(p));assert.ok(estimateTokens(p)<estimateTokens(old)/3,n+' at least 3x smaller');
  for(const id of new Set(plan.selection.flat().map(a=>a.id)))assert.equal(p.split('|'+id+'|').length-1,1,n+' '+id+' listed once');}
 const q=directorRequest({...loadReq('director-cpu-polished'),seconds:60,promptVersion:'director-ir-v1.2'});assert.equal(baseline(q).beats.length,6);
});
test('prompt v1.2: documents hold chains/handoff events with identities and staging when requested',()=>{
 const c=directorRequest({...loadReq('continuity-cpu-polished'),promptVersion:'director-ir-v1.2',staging:'art-v2'}),p=buildPrompt(c,baseline(c));
 assert.match(p,/handoff chain \[2–4 sequential windows\]/);assert.match(p,/\{type:"handoff",prop,from,fromAnchor,to,toAnchor,at\}/);assert.match(p,/Staging art-v2 runs after you/);
 const d=directorRequest({...loadReq('director-cpu-polished'),promptVersion:'director-ir-v1.2'}),pd=buildPrompt(d,baseline(d));assert.doesNotMatch(pd,/Identity extension|Staging/);
});
// A mock provider that only reads the v1.2 prompt (slots → object indices → ids) and answers with a valid IR.
function promptReader(prompt){
 const line=k=>prompt.split('\n').find(l=>l.startsWith(k)),ids=new Map(line('Objects').replace(/^[^:]*: /,'').split('; ').map(s=>s.split('|')).map(([n,id])=>[n,id]));
 const slots=line('Slots').replace(/^[^:]*\): /,'').split('; ').map(s=>s.slice(s.lastIndexOf(': ')+2).split(','));
 const req=JSON.parse(line('Request: ').slice(9));
 return {version:1,title:'Mock film',treatment:'A mock treatment.',shots:slots.map((ns,i)=>({heading:'SHOT '+(i+1),subheading:'Mock',narration:[req.topic+' part '+(i+1)+'.'],camera:'medium',environment:'laboratory',assets:[{asset:ids.get(ns[0]),action:'idle'}]}))};
}
test('prompt v1.2: mock-provider round trip from the prompt alone compiles a valid project; v1.2 offline = v1.1 offline project',async()=>{
 const q={...loadReq('director-cpu-polished'),promptVersion:'director-ir-v1.2'};let seen=null;
 const x=await direct(q,{adapter:mockProvider(async prompt=>{seen=prompt;return {text:JSON.stringify(promptReader(prompt)),usage:{input:estimateTokens(prompt),output:300}};})});
 validateProject(x.project);assert.equal(x.manifest.promptVersion,'director-ir-v1.2');assert.ok(x.manifest.tokens.input<=2000);assert.equal(x.project.shots.length,6);assert.ok(seen.startsWith('Creative director.'));
 for(const n of REQS){const a=await direct(loadReq(n)),b=await direct({...loadReq(n),promptVersion:'director-ir-v1.2'});assert.deepEqual(b.project,a.project,n);assert.equal(a.manifest.promptVersion,'director-ir-v1.1');}
});
test('prompt v1.2: negatives',()=>{
 for(const v of ['director-ir-v9','v1.2',12,null])assert.throws(()=>directorRequest({...loadReq('release'),promptVersion:v}),/promptVersion/);
});

// ---- Item 6: composition gates on every cinematic example (both backends) ----
import {readdirSync} from 'node:fs';
import {compositionReport,compositionGate,COMPOSITION_POLICY} from '../src/quality/composition.js';
test('composition-v1: every cinematic shot in every example passes the gate (both backends)',()=>{
 const files=readdirSync(new URL('../examples/',import.meta.url)).filter(f=>f.endsWith('.json')&&!f.includes('request'));let shots=0;
 for(const f of files){const p=JSON.parse(readFileSync(new URL('../examples/'+f,import.meta.url),'utf8'));
  for(const s of p.shots??[]){if(s.template!=='cinematic-graph')continue;const g=compositionGate(s);shots++;assert.deepEqual(g.warnings,[],f+'/'+s.id+' '+JSON.stringify(g.warnings));}}
 assert.ok(shots>=150,'gate covered '+shots+' shots');assert.equal(COMPOSITION_POLICY.version,'composition-v1');
});
test('composition-v1: negatives — back to camera, heavy overlap and tiny subjects are flagged, bounded',()=>{
 const base={id:'c',template:'cinematic-graph',backend:'cpu',durationFrames:90,transitionFrames:0,heading:'C',subheading:'c',environment:'amber',camera:{},effects:[],narration:['x'],cameraRig:{preset:'medium',subject:'a',framing:'medium'}};
 const back=compositionGate({...base,assets:[{id:'a',asset:'engineer',tracks:{x:[[0,0]],yaw:[[0,3.1]]}}]});assert.ok(back.warnings.some(w=>w.code==='BACK_TO_CAMERA'&&w.asset==='a'));
 const stack=compositionGate({...base,assets:[{id:'a',asset:'engineer',tracks:{x:[[0,0]]}},{id:'b',asset:'scientist',tracks:{x:[[0,.05]],z:[[0,.3]]}}]});assert.ok(stack.warnings.some(w=>w.code==='OVERLAP_MEAN'||w.code==='OVERLAP_PEAK'));
 const rep=compositionReport({...base,assets:[{id:'a',asset:'engineer',tracks:{x:[[0,0]]}}]});
 const tiny=compositionGate(null,{...rep,subjectHeightOfSafe:{min:.01,mean:.02,max:.03}});assert.ok(tiny.warnings.some(w=>w.code==='SUBJECT_SIZE'));
 const many=compositionGate(null,{...rep,characters:Object.fromEntries(Array.from({length:30},(_,i)=>['c'+i,{backToCameraSamples:3}]))});assert.equal(many.warnings.length,COMPOSITION_POLICY.maxWarnings);assert.equal(many.truncated,true);
});
