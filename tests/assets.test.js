import {test} from 'node:test';import assert from 'node:assert/strict';
import {keyframes,ease} from '../src/core/motion.js';
import {ASSETS,emitAsset,transformAt} from '../src/visual/assets.js';
import {createMesh,createProjection} from '../src/visual/mesh.js';
import {RENDERERS} from '../src/templates/registry.js';
import {TEMPLATES} from '../src/core/contract.js';
test('registry and contract agree',()=>{assert.deepEqual(Object.keys(RENDERERS),TEMPLATES);assert.ok(Object.isFrozen(ASSETS));assert.throws(()=>emitAsset('__proto__',()=>{},{}))});
test('bounded keyframes and smooth interpolation',()=>{const f=[[1,10],[3,30],[5,20]];assert.equal(keyframes(-1,f),10);assert.equal(keyframes(2,f),20);assert.equal(keyframes(3,f),30);assert.equal(keyframes(100,f),20);assert.equal(ease(1,1,2),0);assert.equal(ease(2,1,2),1);assert.throws(()=>keyframes(2,[[1,2],[1,3]]));assert.throws(()=>keyframes(NaN,f))});
test('asset transform: translation, rotation and uniform scaling',()=>{const p=transformAt([1,2,3],Math.PI/2,2)([1,0,0]);assert.ok(Math.abs(p[0]-1)<1e-12);assert.equal(p[1],2);assert.equal(p[2],1)});
function trace(id,pose){const out=[];emitAsset(id,(center,size,color,tf,emissive,bias)=>{assert.ok(size.every(x=>x>0));const p=tf(center);assert.ok(p.every(Number.isFinite));out.push({p,size,color,emissive,bias})},pose);return out}
test('robot identity is preserved across independent poses',()=>{const pose={origin:[0,0,0]};const a=trace('retro-robot',pose),b=trace('retro-robot',{...pose,walking:.5,open:1});assert.ok(a.length>15);assert.equal(a.length,b.length);assert.deepEqual(a.map(x=>x.color),b.map(x=>x.color));assert.notDeepEqual(a,b);assert.deepEqual(a,trace('retro-robot',pose))});
test('chest lid opens while base remains stationary',()=>{const p={origin:[0,0,0]};const a=trace('treasure-chest',p),b=trace('treasure-chest',{...p,open:1});assert.deepEqual(a[0],b[0]);assert.notDeepEqual(a.at(-1),b.at(-1))});
test('energy core moves deterministically',()=>{const p={origin:[0,0,0],pulse:1};assert.deepEqual(trace('energy-core',p),trace('energy-core',p));assert.notDeepEqual(trace('energy-core',p),trace('energy-core',{...p,pulse:0}))});
test('projection center and visible cube faces',()=>{const cam=[0,0,8],p=createProjection(cam,[0,0,0],100,[50,60]);assert.deepEqual(p([0,0,0]),[50,60,8]);const {box,faces}=createMesh(cam,p);box([0,0,0],[2,2,2],'#ffffff');assert.equal(faces.length,1);assert.ok(faces[0].p.flat().every(Number.isFinite))});
