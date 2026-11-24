import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {validateScene,FORMAT} from '../src/core/contract.js';
import {draw as robot} from '../src/templates/robot-treasure.js';
import {draw as orbit} from '../src/templates/orbit-explainer.js';
const fixture=(id='robot-treasure')=>JSON.parse(readFileSync(new URL('../examples/'+id+'.json',import.meta.url),'utf8'));
test('both examples validate; fixed vertical format',()=>{for(const id of ['robot-treasure','blockchain-explainer'])assert.equal(validateScene(fixture(id)).id,id);assert.equal(FORMAT.frames,FORMAT.fps*FORMAT.seconds)});
for(const [label,mut] of [['path traversal',s=>s.id='../bad'],['prototype name',s=>s.template='__proto__'],['unknown fields',s=>s.extra=1],['wrong version',s=>s.version=2],['overlap',s=>s.narration[1].start=0],['nonfinite',s=>s.narration[0].end=Infinity],['caption overlap',s=>s.captions[1][0]=0],['unsafe voice',s=>s.voice='unknown'],['missing text',s=>delete s.copy.question],['zero interval',s=>s.narration[0].end=s.narration[0].start],['reserved filename',s=>s.id='con']])test('reject '+label,()=>{const s=fixture();mut(s);assert.throws(()=>validateScene(s))});
function trace(draw,s,t){const ops=[];const grad=()=>({addColorStop(...a){ops.push(['stop',...a])}});const ctx=new Proxy({},{
 get(_,k){if(k==='createLinearGradient'||k==='createRadialGradient')return (...a)=>{ops.push([k,...a]);return grad()};
 if(k==='measureText')return x=>({width:String(x).length*20});
 return (...a)=>{for(const x of a)if(typeof x==='number')assert.ok(Number.isFinite(x),String(k));ops.push([k,...a]);}},
 set(o,k,v){if(typeof v==='number')assert.ok(Number.isFinite(v),String(k));ops.push(['set',k,typeof v==='object'?'gradient':v]);o[k]=v;return true}
 });draw(ctx,t,1080,1920,s);return JSON.stringify(ops);}
for(const [id,draw] of [['robot-treasure',robot],['blockchain-explainer',orbit]])test('frame-addressed deterministic draw '+id,()=>{const s=fixture(id);for(const t of [0,1.5,3.4,5.5,9.5,11.966]){const a=trace(draw,s,t);assert.equal(a,trace(draw,s,t));assert.ok(a.length>1000)}assert.notEqual(trace(draw,s,1),trace(draw,s,7))});
