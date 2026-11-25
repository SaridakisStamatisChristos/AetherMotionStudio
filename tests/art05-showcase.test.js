// ART-05 showcase "The Workshop": generator determinism, matched pair, story structure and composition gates.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from '../scripts/art05-workshop.mjs';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {handAnchor} from '../src/core/cinematography.js';
import {inspectProject} from '../src/quality/preflight.js';
import {compositionReport} from '../src/quality/composition.js';
import {stageProject} from '../src/core/staging.js';

const read=b=>JSON.parse(readFileSync(new URL('../examples/art05-workshop-'+b+'-polished.json',import.meta.url),'utf8'));

test('generator reproduces the committed pair exactly; matched CPU/Three pair; 40 s, six shots',()=>{
 for(const b of ['cpu','three'])assert.deepEqual(build(b),read(b));
 const a=read('cpu'),t=read('three');validateProject(a);validateProject(t);
 assert.deepEqual(a.shots,t.shots.map(s=>({...s,backend:'cpu'})));
 assert.equal(a.shots.reduce((n,s)=>n+s.durationFrames,0),1200);
 assert.deepEqual(a.shots.map(s=>s.id),['workshop','plan','power','steps','handoff','together']);
 assert.ok(a.shots.every(s=>s.lighting==='parity-v1'&&s.narration.length===1));
 assert.deepEqual(stageProject(a),a,'already staged: staging pass is a no-op on the final film');
});

test('no preflight issues; every character faces the camera side in every shot',()=>{
 const p=read('cpu');assert.deepEqual(inspectProject(p).issues,[]);
 for(const s of p.shots){const c=compositionReport(s);for(const [id,v] of Object.entries(c.characters)){assert.equal(v.backToCameraSamples,0,s.id+':'+id);assert.ok(v.cameraAngleDeg.mean<=90,s.id+':'+id+' '+v.cameraAngleDeg.mean);}}
});

test('story beats: robot wakes, walks while watched, receives and places the tool, team waves',()=>{
 const sh=Object.fromEntries(read('cpu').shots.map(s=>[s.id,s])),pose=(s,id,p)=>evaluateGraph(s,p).assets.find(a=>a.id===id).pose;
 assert.equal(pose(sh.workshop,'robot',.5).blink,.1,'asleep in the workshop');
 assert.equal(pose(sh.power,'robot',.1).blink,.1);assert.equal(pose(sh.power,'robot',.45).blink,1,'eyes open');
 assert.ok(pose(sh.power,'robot',.85).armPitch<-.8&&pose(sh.power,'robot',.85).leftArmPitch<-.8,'both arms rise');
 assert.ok(pose(sh.steps,'robot',.85).origin[0]-pose(sh.steps,'robot',.06).origin[0]>2,'walks across');
 const watchYaw=p=>pose(sh.steps,'engineer',p).yaw;assert.ok(Math.abs(watchYaw(.1)-watchYaw(.8))>.2,'watchers follow the moving robot');
 const st=evaluateGraph(sh.handoff,.58),m=Object.fromEntries(st.assets.map(a=>[a.id,a]));
 assert.ok(Math.hypot(...handAnchor(m.giver.asset,m.giver.pose,1).map((v,i)=>v-handAnchor(m.receiver.asset,m.receiver.pose,1)[i]))<.1,'hands meet');
 assert.equal(m.watcher.asset,'scientist');assert.ok(Math.abs(pose(sh.handoff,'tool',1).origin[1]-.792)<1e-3,'tool rests on the table');
 assert.ok(pose(sh.together,'engineer',.66).leftArmPitch<-2&&pose(sh.together,'scientist',.7).armPitch<-2&&pose(sh.together,'robot',.7).armPitch<-2,'everyone waves');
 const h=evaluateGraph(sh.together,.7).assets.find(a=>a.id==='robot'),R=handAnchor('service-robot',h.pose,1),L=handAnchor('service-robot',h.pose,-1);
 assert.ok(R[0]-L[0]>1.2&&R[2]>h.pose.origin[2]&&L[2]>h.pose.origin[2],'robot hands raised wide and in front (visible)');
 const sc=evaluateGraph(sh.together,.6).assets.find(a=>a.id==='scientist'),sR=handAnchor('scientist',sc.pose,1);assert.ok(sR[0]>sc.pose.origin[0]-.1,'scientist waves outward, not across the face');
 for(const s of read('cpu').shots)for(const a of s.assets)if(['engineer','scientist'].includes(a.asset))assert.equal(a.params?.detail,2,s.id+':'+a.id);
});
