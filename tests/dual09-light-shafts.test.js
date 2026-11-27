// Owner (2026-11-27): "those lights should be removed. they dont offer anything" — the diagonal light beams of the
// atmosphere effect, present in every Director film on both backends (shared 2D path). New Director films carry
// fidelity.lightShafts 0; existing projects (absent) draw exactly as before. Dust specks and lighting are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateFidelity,fidelity,FIDELITY_DEFAULTS} from '../src/core/fidelity.js';
import {atmosphere} from '../src/visual/fidelity-effects.js';
import {direct} from '../src/director/index.js';

// a canvas that records every call and property write
function recorder(){const log=[];const target={createLinearGradient:(...a)=>{log.push(['gradient',...a]);return {addColorStop:(...b)=>log.push(['stop',...b])};}};
 return {log,ctx:new Proxy(target,{get:(t,k)=>k in t?t[k]:(...a)=>log.push([k,...a]),set:(t,k,v)=>{log.push(['set',k,typeof v==='object'?'<gradient>':v]);return true;}})};}
const STATE={environment:{key:'#fff4d6',accent:'#7ec8ff'},progress:.37};
const project=([x,y,z])=>[360+x*90,640-y*90,3+z];
const draw=f=>{const r=recorder();atmosphere(r.ctx,STATE,project,f);return r.log;};
const shafts=log=>log.filter(x=>x[0]==='gradient').length,dust=log=>log.filter(x=>x[0]==='arc').length;

test('absent lightShafts draws exactly as before (5 beams + 36 dust specks); 1 is identical; 0 removes only the beams',()=>{
 const legacy=fidelity({atmosphere:.5});
 assert.equal('lightShafts' in legacy,false,'not merged into existing projects');
 const before=draw(legacy);assert.equal(shafts(before),5);assert.equal(dust(before),36);
 assert.deepEqual(draw({...legacy,lightShafts:1}),before,'explicit 1 = historical drawing, call for call');
 const off=draw({...legacy,lightShafts:0});assert.equal(shafts(off),0,'no beams');assert.equal(dust(off),36,'dust kept');
 // the dust is drawn exactly as before (same positions, sizes and alphas)
 const dustCalls=log=>log.filter(x=>x[0]==='arc'||(x[0]==='set'&&x[1]==='globalAlpha')).slice(-72);
 assert.deepEqual(dustCalls(off),dustCalls(before));
 const half=draw({...legacy,lightShafts:.5});assert.equal(shafts(half),5);assert.ok(half.some(x=>x[0]==='set'&&x[1]==='globalAlpha'&&Math.abs(x[2]-.25)<1e-12),'beams at half strength');
 assert.deepEqual(draw({...legacy,atmosphere:0,lightShafts:1}),[],'atmosphere 0 still draws nothing');
});
test('validation: lightShafts is an optional number in [0,1]; the defaults are unchanged',()=>{
 for(const v of [0,.3,1])assert.doesNotThrow(()=>validateFidelity({lightShafts:v}));
 for(const v of [-.1,1.5,'0',null,NaN])assert.throws(()=>validateFidelity({lightShafts:v}),/lightShafts: expected finite number in \[0,1\]/);
 assert.throws(()=>validateFidelity({lightShaft:0}),/unknown field/);
 assert.deepEqual(Object.keys(FIDELITY_DEFAULTS),['bloom','atmosphere','contactShadow','surfaceDetail','depthOfField','motionBlur','grain','grade','particles','typography']);
});
test('every Director film (classic, dialogue and content modes) carries lightShafts 0 on every shot',async()=>{
 for(const name of ['dual09-narrator','dual09-dialogue','dual09-maths','dual09-long','dual07-narrator']){
  const q=JSON.parse(readFileSync(new URL('../examples/'+name+'.request.json',import.meta.url),'utf8'));
  const p=(await direct(q)).project;
  const shots=p.shots.filter(s=>s.fidelity);assert.ok(shots.length>0,name);
  for(const s of shots){assert.equal(s.fidelity.lightShafts,0,name+' '+s.id);validateFidelity(s.fidelity);}
 }
});
