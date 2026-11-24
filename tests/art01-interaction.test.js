// ART-01 slice 3: handoff chains, release (drop/place), facing, handoff contact check. All opt-in.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {handAnchor,geometryBounds} from '../src/core/cinematography.js';
import {inspectShot,HANDOFF_GAP_LIMIT} from '../src/quality/preflight.js';
import {continuityLedger} from '../src/core/identity.js';
import {direct} from '../src/director/index.js';

const read=name=>JSON.parse(readFileSync(new URL('../examples/'+name+'.json',import.meta.url),'utf8'));
const shot=()=>structuredClone(read('art01-handoff-cpu-polished').shots[0]);
const project=s=>({version:2,id:'art01-interaction-test',title:'interaction test',voice:'af_heart',shots:[s]});
const at=(s,p)=>Object.fromEntries(evaluateGraph(s,p).assets.map(a=>[a.id,a]));
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const hand=(m,id)=>handAnchor(m[id].asset,m[id].pose,1);
const frames=s=>Array.from({length:s.durationFrames},(_,f)=>f/(s.durationFrames-1));

test('handoff fixture: matched pair, three characters, chain with place release',()=>{
 const a=read('art01-handoff-cpu-polished'),b=read('art01-handoff-three-polished');validateProject(a);validateProject(b);
 assert.deepEqual(a.shots,b.shots.map(s=>({...s,backend:'cpu'})));
 const s=a.shots[0],tool=s.assets.find(x=>x.id==='tool');
 assert.deepEqual(s.assets.filter(x=>x.face).map(x=>x.id),['giver','receiver','watcher']);
 assert.deepEqual(tool.attachment.map(w=>w.parent),['giver','receiver']);assert.equal(tool.attachment[1].release.mode,'place');
});

test('the prop stays in the holding hand every frame, and both hands meet at the handoff',()=>{
 const s=shot(),[w0,w1]=s.assets.find(x=>x.id==='tool').attachment;
 for(const p of frames(s)){
  if(p>w1.end)break;const m=at(s,p),holder=p<w1.start?'giver':'receiver',settled=p<w1.start||p>=w1.start+w1.blendIn;
  if(settled)assert.ok(dist(m.tool.pose.origin,hand(m,holder))<=.2,'tool off hand at '+p);
 }
 const m=at(s,w0.end);assert.ok(dist(hand(m,'giver'),hand(m,'receiver'))<.1,'hands meet');
 assert.deepEqual(inspectShot(s).issues,[]);
});

test('handoff keeps the prop world orientation (no spin) and all motion is continuous',()=>{
 const s=shot(),h=s.assets.find(x=>x.id==='tool').attachment[1].start;
 assert.ok(Math.abs(at(s,h+.02).tool.pose.yaw-at(s,h).tool.pose.yaw)<.08);
 let prev=null;for(const p of frames(s)){const m=at(s,p),v=['giver','receiver','watcher','tool'].flatMap(id=>[...m[id].pose.origin,m[id].pose.yaw]);
  if(prev)v.forEach((x,i)=>assert.ok(Math.abs(x-prev[i])<.13,'step '+p+':'+i+' '+(x-prev[i])));prev=v;}
});

test('place release sets the prop onto the table top and it stays there',()=>{
 const s=shot(),table=at(s,1).table,top=geometryBounds([table]).hi[1],box=geometryBounds([table]);
 const end=at(s,1).tool.pose.origin;assert.ok(Math.abs(end[1]-top)<1e-3,end[1]+' vs '+top);
 assert.ok(end[0]>box.lo[0]&&end[0]<box.hi[0]&&end[2]>box.lo[2]&&end[2]<box.hi[2],'on the table footprint');
 for(const p of [.96,.98,1])assert.deepEqual(at(s,p).tool.pose.origin,end);
});

test('drop release falls with gravity-like ease-in to the floor',()=>{
 const s=shot(),w=s.assets.find(x=>x.id==='tool').attachment[1];w.release={mode:'drop',duration:.08};validateProject(project(s));
 const y0=at(s,w.end).tool.pose.origin[1],y=u=>at(s,w.end+u*.08).tool.pose.origin[1];
 assert.ok(Math.abs(y(.5)-y0*.75)<1e-9);assert.ok(Math.abs(y(1))<1e-12);assert.equal(at(s,1).tool.pose.origin[1],0);
 assert.ok(y0-y(.25)<y(.5)-y(.75),'accelerates');
});

test('face turns toward the target (with offset), mutual facing resolves, and windows end cleanly',()=>{
 const s=shot(),m=at(s,.3),g=m.giver.pose,r=m.receiver.pose,face=s.assets[0].face;
 const want=Math.atan2(r.origin[0]-g.origin[0],r.origin[2]-g.origin[2])+face.offset;
 assert.ok(Math.abs(Math.atan2(Math.sin(g.yaw-want),Math.cos(g.yaw-want)))<1e-9);
 const w=at(s,.3).watcher.pose;assert.ok(Math.abs(w.yaw-Math.atan2(r.origin[0]-w.origin[0],r.origin[2]-w.origin[2]))<1e-9);
 const q=shot();q.assets[0].face={target:'receiver',start:.2,end:.6,blend:.25};validateProject(project(q));
 assert.equal(at(q,.1).giver.pose.yaw,0);assert.ok(Math.abs(at(q,.2).giver.pose.yaw)<1e-12);assert.ok(Math.abs(at(q,.6).giver.pose.yaw)<1e-12);
 q.assets[0].face.hold=true;assert.ok(Math.abs(at(q,.9).giver.pose.yaw-at(q,.6).giver.pose.yaw)<1e-12&&Math.abs(at(q,.9).giver.pose.yaw)>.5);
});

test('preflight raises HANDOFF_GAP when hands are apart at the handoff; single attachments are not checked',()=>{
 const s=shot();s.assets.find(x=>x.id==='receiver').tracks.x=[[0,1.6]];s.assets.find(x=>x.id==='table').tracks.x=[[0,2.2]];validateProject(project(s));
 const gap=inspectShot(s).issues.filter(i=>i.code==='HANDOFF_GAP');assert.equal(gap.length,1);assert.equal(gap[0].severity,'warning');
 assert.ok(gap[0].detail.gap>HANDOFF_GAP_LIMIT);assert.deepEqual([gap[0].detail.from,gap[0].detail.to,gap[0].detail.prop],['giver','receiver','tool']);
 const single=read('cinematography-cpu-polished').shots.find(x=>x.assets.some(a=>a.attachment));assert.ok(!inspectShot(single).issues.some(i=>i.code==='HANDOFF_GAP'));
});

test('negative: malformed chains, releases and facing are rejected with field paths',()=>{
 const bad=(mut,re)=>{const s=shot();mut(s,s.assets.find(x=>x.id==='tool'),s.assets[0]);assert.throws(()=>validateProject(project(s)),re);};
 bad((s,t)=>t.attachment=[t.attachment[0]],/handoff chain requires 2–4 windows/);
 bad((s,t)=>t.attachment=[...t.attachment,...t.attachment,...t.attachment].map((w,i)=>({...w,start:i*.15,end:i*.15+.1,release:undefined})).map(({release,...w})=>w),/handoff chain requires 2–4 windows/);
 bad((s,t)=>t.attachment[1].start=.5,/handoff windows must be sequential/);
 bad((s,t)=>{t.attachment[0].release={mode:'drop',duration:.05}},/only the last window may release/);
 bad((s,t)=>t.attachment[1].release.duration=.2,/release must complete within the shot/);
 bad((s,t)=>t.attachment[1].release={mode:'drop',duration:.05,to:[0,0,0]},/drop lands on the floor/);
 bad((s,t)=>delete t.attachment[1].release.to,/3-vector required/);
 bad((s,t)=>t.attachment[1].release.to=[0,2,0],/out of range/);
 bad((s,t)=>t.attachment[1].release.mode='throw',/unsupported value/);
 bad((s,t)=>t.attachment[1].parent='table',/supported hand rig/);
 bad((s,t)=>t.attachment[1].grip=1,/unknown field/);
 bad((s,t,g)=>g.face.target='giver',/another asset ID required/);
 bad((s,t,g)=>g.face.target='nobody',/another asset ID required/);
 bad((s,t,g)=>g.face.offset=4,/out of range/);
 bad((s,t,g)=>g.face.hold=false,/hold must be true/);
 bad((s,t,g)=>g.face.end=g.face.start,/invalid window/);
 bad((s,t,g)=>g.face.look=true,/unknown field/);
 bad((s,t)=>{const w=s.assets.find(x=>x.id==='watcher');w.attachment=[{parent:'receiver',anchor:'right-hand',start:0,end:.2},{parent:'receiver',anchor:'left-hand',start:.3,end:.4}];s.assets.find(x=>x.id==='receiver').attachment={parent:'watcher',anchor:'right-hand',start:0,end:.1};},/attachment cycle/);
});

test('negative: identity continuity ledger rejects handoff chains explicitly',async()=>{
 const q=JSON.parse(readFileSync(new URL('../examples/continuity-cpu-polished.request.json',import.meta.url)));
 const {project:p}=await direct(q),s=p.shots.find(x=>x.assets.some(a=>a.attachment&&a.identity)),a=s.assets.find(x=>x.attachment&&x.identity);
 const w=a.attachment;a.attachment=[{...w,end:Math.min(w.end,w.start+.1)},{...w,start:Math.min(w.end,w.start+.1)+.05,end:Math.min(1,Math.min(w.end,w.start+.1)+.15)}].map(({blendIn,...x})=>x);
 assert.throws(()=>continuityLedger(p),/handoff chains are not yet supported by the identity continuity ledger/);
});
