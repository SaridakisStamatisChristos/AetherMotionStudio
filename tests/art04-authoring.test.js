// ART-04: opt-in staging pass (director request.staging / Studio setStaging) and the AF08 duplicate shortlist fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {request} from '../src/director/schema.js';
import {stageProject,stageShot,CHEAT,STAGING_MODES} from '../src/director/staging.js';
import {setStaging} from '../src/studio/model.js';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {inspectProject} from '../src/quality/preflight.js';
import {compositionReport} from '../src/quality/composition.js';
import {PackRegistry,searchRegistry,builtinPack} from '../src/foundry/packs.js';

const read=name=>JSON.parse(readFileSync(new URL('../examples/'+name+'.json',import.meta.url),'utf8'));
const req=name=>read(name+'.request');

test('director: staging absent keeps output identical; art-v1 stages every graph shot without new issues',async()=>{
 const q=req('director-cpu-polished'),plain=await direct(q),again=await direct(structuredClone(q)),staged=await direct({...q,staging:'art-v1'});
 assert.deepEqual(plain.project,again.project);assert.ok(plain.project.shots.every(s=>!s.lighting&&s.assets.every(a=>!a.face)));
 assert.equal(staged.prompt,plain.prompt,'model-facing prompt unchanged by staging');
 assert.ok(staged.project.shots.every(s=>s.lighting==='parity-v1'));
 assert.deepEqual(inspectProject(staged.project).issues,[]);
 for(const s of staged.project.shots)for(const v of Object.values(compositionReport(s).characters))assert.equal(v.backToCameraSamples,0);
 const strip=p=>p.shots.map(({lighting,...s})=>({...s,assets:s.assets.map(({face,params,...a})=>a)}));assert.deepEqual(strip(staged.project),strip(plain.project),'only staging fields differ');
});

test('staging pairs two characters face-to-face with a three-quarter cheat toward the camera',()=>{
 const s=read('art01-handoff-cpu-polished').shots[0],bare=structuredClone(s);for(const a of bare.assets){delete a.face;}
 bare.assets.find(a=>a.id==='receiver').tracks.yaw=[[0,0]];
 const out=stageShot(bare),g=out.assets.find(a=>a.id==='giver'),r=out.assets.find(a=>a.id==='receiver'),w=out.assets.find(a=>a.id==='watcher');
 assert.equal(g.face.target,'receiver');assert.equal(r.face.target,'giver');assert.equal(w.face.target,'giver');
 assert.equal(g.face.offset,-CHEAT,'left character cheats toward camera');assert.equal(r.face.offset,CHEAT,'right character cheats toward camera');
 assert.equal(out.lighting,'parity-v1');assert.equal(g.params.detail,2,'human gets detail 2');assert.equal(r.params,undefined,'robot unchanged');
 assert.equal(out.assets.find(a=>a.id==='tool').face,undefined);
 validateProject({version:2,id:'x',title:'x',voice:'af_heart',shots:[out]});
});

test('staging respects authored choices: existing face, yaw motion, identity, explicit detail and lighting',async()=>{
 const s=read('art01-handoff-cpu-polished').shots[0],out=stageShot(s);
 assert.deepEqual(out.assets.map(a=>a.face),s.assets.map(a=>a.face),'existing face kept');
 const turning=structuredClone(read('art01-product-cpu-polished').shots[0]);turning.assets.push({id:'guide',asset:'scientist',tracks:{x:[[0,-1.6]]}});
 const t=stageShot(turning);assert.equal(t.assets[0].face,undefined,'prop has no face');assert.equal(t.assets[1].face.target,'subject');
 const yawDriven=structuredClone(turning);yawDriven.assets[1].actions=[{name:'turn-left',start:0,end:1}];assert.equal(stageShot(yawDriven).assets[1].face,undefined);
 const pinned=structuredClone(turning);pinned.lighting='parity-v1';pinned.assets[1].params={detail:1};const pt=stageShot(pinned);assert.equal(pt.assets[1].params.detail,1);
 const ch=read('blockchain-60s').shots[0];assert.deepEqual(stageShot(ch),ch,'non-graph shots untouched');
 const idProject=(await direct(req('continuity-cpu-polished'))).project;const staged=stageProject(idProject);
 for(const [i,s] of staged.shots.entries())for(const [j,a] of s.assets.entries())if(a.identity)assert.deepEqual(a.params,idProject.shots[i].assets[j].params,'identity appearance pinned');
});

test('Studio setStaging is the same pure pass and is idempotent; negatives',()=>{
 const p=read('art02-product-cpu-polished'),a=setStaging(p),b=stageProject(p);assert.deepEqual(a,b);assert.deepEqual(setStaging(a),a);
 assert.notEqual(a,p);assert.equal(p.shots[0].lighting,undefined,'input not mutated');
 assert.deepEqual(STAGING_MODES,['art-v1']);
 assert.throws(()=>setStaging(p,'art-v2'),/staging: unknown mode art-v2/);
 assert.throws(()=>stageProject(read('robot-treasure')),/staging: v2 project required/);
 assert.throws(()=>request({...req('director-cpu-polished'),staging:'loud'}),/request\.staging: unsupported value/);
 assert.equal(request(req('director-cpu-polished')).staging,undefined,'no default injected');
});

test('staged facing turns characters toward each other at mid-shot (evaluated, not just authored)',async()=>{
 const staged=(await direct({...req('release'),staging:'art-v1'})).project;
 for(const s of staged.shots)for(const a of s.assets.filter(x=>x.face)){
  const st=evaluateGraph(s,(a.face.start+a.face.end)/2),self=st.assets.find(x=>x.id===a.id).pose;
  const tgt=st.assets.find(x=>x.id===a.face.target).pose,want=Math.atan2(tgt.origin[0]-self.origin[0],tgt.origin[2]-self.origin[2])+a.face.offset;
  assert.ok(Math.abs(Math.atan2(Math.sin(self.yaw-want),Math.cos(self.yaw-want)))<.35,'faces target within blend tolerance');
 }
});

test('AF08 fix: an imported exact built-in generated revision appears once in search; other revisions stay distinct',()=>{
 const r=new PackRegistry(),before=searchRegistry({q:'beacon'},r);assert.equal(before.length,1);assert.equal(before[0].revision,null);
 r.import(builtinPack('generated-lab'));const after=searchRegistry({q:'beacon'},r);
 assert.equal(after.length,1);assert.match(after[0].revision,/^[0-9a-f]{64}$/);
 for(const q of ['canister','insulator'])assert.equal(searchRegistry({q},r).length,1,q);
 assert.ok(searchRegistry({kind:'hero',limit:300},r).length>=32,'hero rows unaffected');
});
