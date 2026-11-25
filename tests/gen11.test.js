// GEN-11 idle weight shift (opt-in bodyLanguage.weight; on for every Director dialogue film, staging unchanged):
// standing human/robot speakers lean their hips over one foot for 6–9 s, then shift in 1.5 s. Feet stay planted;
// geometry is unchanged without pose.hip.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {validateProject} from '../src/core/timeline.js';
import {WEIGHT,weightAt,bodyAt,applyBody} from '../src/core/body.js';
import {defaultSpeech} from '../src/studio/production.js';
import {estimatedTimeline,motionCheck} from '../src/quality/motion-check.js';
import {crowdingCheck} from '../src/quality/crowding.js';
import {plannedTimeline} from '../src/studio/model.js';
import {emitAsset} from '../src/visual/assets.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const directed=async n=>{const q=read(n+'.request');return (await direct({...q,speech:defaultSpeech(q.seconds)})).project;};
const est=p=>estimatedTimeline(p,plannedTimeline(p));

test('weightAt: bounded, calm, holds and moves, differs per character, deterministic',()=>{
 let peak=0,holds=0,last=weightAt('host',0);const sides=new Set();
 for(let f=1;f<1800;f++){const v=weightAt('host',f);assert.ok(Math.abs(v)<=WEIGHT.amp+1e-12);peak=Math.max(peak,Math.abs(v-last)*30);if(v===last)holds++;if(Math.abs(v)===WEIGHT.amp)sides.add(Math.sign(v));last=v;}
 assert.ok(peak<.06,'peak '+peak+' rad/s (≈ '+(peak*180/Math.PI).toFixed(1)+'°/s)');
 assert.ok(holds>1800*.6,'mostly still');assert.deepEqual([...sides].sort(),[-1,1],'both sides used');
 assert.notDeepEqual(Array.from({length:300},(_,f)=>weightAt('host',f)),Array.from({length:300},(_,f)=>weightAt('guest',f)));
 assert.equal(weightAt('host',777),weightAt('host',777));
});
test('contract: bodyLanguage.weight boolean; Director dialogue turns it on; negatives',async()=>{
 const p=await directed('talk04-dialogue');validateProject(p);
 assert.ok(p.shots.filter(s=>s.speakerAssets).every(s=>s.bodyLanguage.weight===true));
 for(const bad of [1,'yes',null]){const x=structuredClone(p);x.shots.find(s=>s.bodyLanguage).bodyLanguage.weight=bad;assert.throws(()=>validateProject(x),/boolean/);}
 const x=structuredClone(p);x.shots.find(s=>s.bodyLanguage).bodyLanguage={weight:true};validateProject(x);
});
test('bodyAt/applyBody: standing speakers get pose.hip; walkers and animals do not; checks stay clean',async()=>{
 const p=await directed('talk04-dialogue'),t=est(p),i=p.shots.findIndex(s=>s.speakerAssets),ids=Object.values(p.shots[i].speakerAssets);
 const f=t.shots[i].startFrame+40,b=bodyAt(p,t,f,i);for(const id of ids)assert.equal(b[id].hip,weightAt(id,f));
 const st={assets:ids.map(id=>({id,pose:{}}))};applyBody(st,b);for(const a of st.assets)assert.equal(a.pose.hip,weightAt(a.id,f));
 const walk=structuredClone(p),a=walk.shots[i].assets.find(x=>x.id===ids[0]);a.tracks.x=[[0,a.tracks.x?.[0]?.[1]??0],[1,(a.tracks.x?.[0]?.[1]??0)+1]];
 assert.equal(bodyAt(walk,t,f,i)[ids[0]].hip,undefined,'a walking character keeps its gait');
 const off=structuredClone(p);for(const s of off.shots)if(s.bodyLanguage)delete s.bodyLanguage.weight;assert.equal(bodyAt(off,t,f,i)[ids[0]].hip,undefined);
 assert.deepEqual(motionCheck(p,t).warnings,[]);assert.deepEqual(crowdingCheck(p,t).warnings,[]);
});
test('geometry: hips lean, feet stay planted, nothing changes without pose.hip',()=>{
 for(const id of ['scientist','explorer-robot']){
  const boxes=pose=>{const out=[];emitAsset(id,(c,sz,col,tf=q=>q)=>out.push(tf(c)),{origin:[0,0,0],yaw:0,params:{detail:2},...pose});return out;};
  const base=boxes({}),zero=boxes({hip:undefined}),lean=boxes({hip:WEIGHT.amp}),nod=boxes({nod:.05}),both=boxes({nod:.05,hip:WEIGHT.amp});
  assert.deepEqual(zero,base);assert.equal(lean.length,base.length);
  const ys=bs=>bs.map(c=>Array.isArray(c[0])?Math.min(...c.map(v=>v[1])):c[1]);
  const low=base.map((c,k)=>ys(base)[k]<.25?k:-1).filter(k=>k>=0);assert.ok(low.length>0);
  for(const k of low)assert.deepEqual(lean[k],base[k],id+' feet planted ('+k+')');
  assert.notDeepEqual(lean,base);assert.notDeepEqual(both,nod,'head motion and lean combine');
 }
});
