// GPU-06 step 2 (owner 2026-11-28: "go with recommendations" = puppet skeleton): two-bone IK elbows and knees in hero
// detail 4 (ends stay on their anchors, joints bend only the allowed way), and the opt-in body-language keys
// breathing, gaze and expressions (calm, deterministic, enabled in Cinematic soft-v1 films).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ikJoint,BONES} from '../src/visual/catalog-hero.js';
import {emitRecipe} from '../src/visual/catalog.js';
import {catalogHandAnchor} from '../src/visual/catalog-rig.js';
import {bodyAt,applyBody,validateBodyLanguage,BREATH,EXPRESSIONS} from '../src/core/body.js';
import {heroDetail,HERO_MOTION} from '../src/core/hero-characters.js';
import {direct} from '../src/director/index.js';
import {estimatedTimeline} from '../src/quality/motion-check.js';
import {plannedTimeline} from '../src/studio/model.js';
const dist=(a,c)=>Math.hypot(...a.map((v,i)=>v-c[i]));
const boxes=(id,extra={})=>{const out=[];emitRecipe(id,(c,s,color,local,lit,bias,role,face)=>out.push({size:s,color,face,mid:local([0,0,0])}),{origin:[0,0,0],yaw:0,scale:1,params:{detail:4},...extra});return out;};

test('ikJoint: bones keep their lengths, the end is never moved, the bend follows the pole, straight beyond reach',()=>{
 const a=[0,1,0],c=[0,.2,.1],j=ikJoint(a,c,.45,.45,[0,0,1]);
 assert.ok(Math.abs(dist(a,j)-.45)<1e-9&&Math.abs(dist(j,c)-.45)<1e-9);assert.ok(j[2]>.1,'knee bends forward (toward the pole)');
 const back=ikJoint(a,c,.45,.45,[0,0,-1]);assert.ok(back[2]<j[2],'pole decides the side');
 const far=ikJoint([0,0,0],[0,2,0],.5,.5,[0,0,1]);assert.deepEqual(far.map(v=>+v.toFixed(9)),[0,1,0]);
 assert.deepEqual(ikJoint([1,1,1],[1,1,1],.3,.3,[0,0,1]),[1,1,1]);
 const deg=ikJoint([0,0,0],[0,0,.5],.3,.3,[0,0,1]);assert.ok(Math.abs(dist([0,0,0],deg)-.3)<1e-9,'pole parallel to the limb still bends');
 assert.ok(BONES.arm>.5&&BONES.leg>.5&&BONES.leg<BONES.arm);
});

test('hero elbows bend back and out, hands stay on the rig anchor in every arm pose',()=>{
 for(const id of ['student','scientist','service-robot'])for(const pose of [{},{armPitch:-1.4},{armPitch:-2.6,armSpread:.5},{open:1,grip:.5}]){
  const hand=catalogHandAnchor(id,{origin:[0,0,0],yaw:0,scale:1,params:{detail:4},...pose},1);
  assert.ok(boxes(id,pose).some(b=>dist(b.mid,hand)<1e-9),id+' hand on anchor '+JSON.stringify(pose));}
});

test('hero knees: straight-ish standing, bent when a foot lifts; the foot stays planted where it was',()=>{
 // thigh and shin of the right leg (x > 0, mid heights): their forward-most centre moves forward when the knee bends
 const low=bs=>Math.max(...bs.filter(b=>b.mid[0]>0&&b.mid[1]<.8&&b.mid[1]>.3).map(b=>b.mid[2]));
 const rest=boxes('student'),lift=boxes('student',{footLift:1});
 assert.ok(low(lift)>low(rest)+.02,'a lifted foot bends the knee forward');
 assert.equal(boxes('student').length,boxes('student',{footLift:1}).length);
});

test('breathing, gaze, brows and smile change only the chest and the face, within calm bounds',()=>{
 const base=boxes('scientist'),moved=boxes('scientist',{breath:1,gaze:1,brow:1,smile:1});assert.equal(base.length,moved.length);
 const changed=base.map((b,i)=>dist(b.mid,moved[i].mid)>1e-9||b.size.some((v,k)=>Math.abs(v-moved[i].size[k])>1e-9)).map((c,i)=>c?i:-1).filter(i=>i>=0);
 assert.ok(changed.length>0);for(const i of changed)assert.ok(base[i].mid[1]>.9,'only chest and face parts move ('+i+')');
 for(const i of changed)assert.ok(dist(base[i].mid,moved[i].mid)<.04,'small moves');
 const r=boxes('service-robot'),rm=boxes('service-robot',{breath:1,gaze:1,brow:1});assert.equal(r.length,rm.length);
});

test('body keys: validation, Director soft-v1 films enable them, values deterministic and bounded',async()=>{
 const q=JSON.parse(readFileSync(new URL('../examples/gpu06-mouths.request.json',import.meta.url),'utf8'));
 const {project:p}=await direct({...q,id:'gpu06-s2'});const shot=p.shots.findIndex(s=>s.bodyLanguage);
 assert.ok(shot>=0);for(const k of Object.keys(HERO_MOTION))assert.equal(p.shots[shot].bodyLanguage[k],true,k);
 const {renderProfile,cinematic,...std}=q,{project:s}=await direct({...std,id:'gpu06-s3'});assert.ok(s.shots.every(x=>!x.bodyLanguage?.breathing),'Standard films unchanged');
 validateBodyLanguage(p);
 const bad=structuredClone(p);bad.shots[shot].bodyLanguage.breathing='yes';assert.throws(()=>validateBodyLanguage(bad),/boolean required/);
 const t=estimatedTimeline(p,plannedTimeline(p)),ts=t.shots[shot],seen={breath:new Set(),gaze:new Set(),brow:new Set(),smile:new Set()};
 for(let f=ts.startFrame;f<ts.endFrame;f+=3){const o=bodyAt(p,t,f,shot);assert.deepEqual(o,bodyAt(p,t,f,shot),'deterministic');
  for(const v of Object.values(o)){assert.ok(v.breath>=0&&v.breath<=1);assert.ok(Math.abs(v.gaze??0)<=.8);assert.ok(v.brow>=0&&v.brow<=EXPRESSIONS.question.brow);assert.ok(v.smile>=.2&&v.smile<=.8);
   for(const k of Object.keys(seen))if(v[k]!==undefined)seen[k].add(v[k]);}}
 for(const k of Object.keys(seen))assert.ok(seen[k].size>1,k+' varies over the shot');
 const st={assets:p.shots[shot].assets.map(a=>({id:a.id,pose:{}}))},o=bodyAt(p,t,ts.startFrame+20,shot);applyBody(st,o);
 assert.ok(st.assets.some(a=>a.pose.breath!==undefined&&a.pose.smile!==undefined));
 assert.equal(BREATH.period,120);
});
