// GEN-15 look track step 1: opt-in shot look 'crafted-v1' (request.look; default for dialogue films). Same semantic
// boxes; each box is drawn as a chamfered box (absolute bevel), softened palette, softer CPU light, matte Three.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRAFTED,chamferedBox,bevelRadius,craftedColor} from '../src/visual/crafted.js';
import {createMesh,createProjection} from '../src/visual/mesh.js';
import {emitAsset} from '../src/visual/assets.js';
import {evaluateGraph} from '../src/core/graph.js';
import {validateProject} from '../src/core/timeline.js';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((v,i)=>v-b[i]);
const area=v=>{let s=[0,0,0];for(let k=1;k+1<v.length;k++){const c=cross(sub(v[k],v[0]),sub(v[k+1],v[0]));s=s.map((x,i)=>x+c[i]);}return Math.hypot(...s)/2;};

test('chamferedBox: 26 outward polygons inside the box, absolute bevel, plain box when too thin',()=>{
 for(const size of [[1,1,1],[.4,1.8,.3],[2,.05,1]]){
  const P=chamferedBox(size),h=size.map(v=>v/2);assert.equal(P.length,26);
  assert.deepEqual(P.map(p=>p.kind).reduce((m,k)=>(m[k]=(m[k]??0)+1,m),{}),{face:6,edge:12,corner:8});
  for(const {verts} of P){for(const v of verts)v.forEach((x,i)=>assert.ok(Math.abs(x)<=h[i]+1e-12));
   const m=verts.reduce((s,p)=>s.map((x,i)=>x+p[i]/verts.length),[0,0,0]),n=cross(sub(verts[1],verts[0]),sub(verts[2],verts[0]));assert.ok(n[0]*m[0]+n[1]*m[1]+n[2]*m[2]>0,'outward');}
  const total=P.reduce((s,p)=>s+area(p.verts),0),boxArea=2*(size[0]*size[1]+size[1]*size[2]+size[0]*size[2]);assert.ok(total<boxArea&&total>boxArea*.9,size+': '+total+' vs '+boxArea);
 }
 assert.equal(bevelRadius([1,1,1]),CRAFTED.bevel.max,'absolute radius on big parts');assert.equal(bevelRadius([.4,1.8,.3]),CRAFTED.bevel.max);
 assert.ok(Math.abs(bevelRadius([.1,1,1])-.022)<1e-12,'thin parts get a smaller bevel');
 assert.equal(chamferedBox([.01,1,1]).length,6,'too thin: a plain box');
});
test('craftedColor: softer and deterministic; darks lifted; invalid input passes through',()=>{
 const sat=h=>{const n=parseInt(h.slice(1),16),c=[n>>16&255,n>>8&255,n&255];return Math.max(...c)-Math.min(...c);};
 for(const h of ['#e2582c','#2c7be2','#8a3fd1']){const c=craftedColor(h);assert.match(c,/^#[0-9a-f]{6}$/);assert.ok(sat(c)<sat(h),h+' -> '+c);assert.equal(craftedColor(h),c);}
 assert.ok(parseInt(craftedColor('#000000').slice(1,3),16)>=15,'black lifted');assert.equal(craftedColor('rgb(1,2,3)'),'rgb(1,2,3)');
});
test('CPU mesh: legacy faces unchanged without the look; crafted adds bevel faces with softened colours',()=>{
 const cam=[0,2.4,8],pr=createProjection(cam,[0,1,0],1200,[360,640]);
 const faces=look=>{const {box,faces}=createMesh(cam,pr,.3,look);emitAsset('explorer-robot',box,{origin:[0,0,0],yaw:.3,params:{detail:2}});return faces;};
 const legacy=(()=>{const {box,faces}=createMesh(cam,pr,.3);emitAsset('explorer-robot',box,{origin:[0,0,0],yaw:.3,params:{detail:2}});return faces;})();
 assert.deepEqual(faces(null),legacy,'look null = historical faces');
 const c=faces('crafted-v1');assert.ok(c.length>legacy.length*2,c.length+' vs '+legacy.length);
 assert.ok(c.every(f=>f.p.length===4||f.p.length===3));
});
test('shot look contract; state carries it; Director default for dialogue, none and legacy unchanged; negatives',async()=>{
 // GEN-15 step 2 made crafted-v2 the dialogue default (tests/gen15b.test.js); crafted-v1 is pinned here by name.
 const q=read('gen12-forest.request'),p=(await direct({...q,speech:defaultSpeech(q.seconds),look:'crafted-v1'})).project;
 assert.ok(p.shots.every(s=>s.look==='crafted-v1'));validateProject(p);assert.equal(evaluateGraph(p.shots[0],.5).look,'crafted-v1');
 const off=(await direct({...q,speech:defaultSpeech(q.seconds),look:'none'})).project;assert.ok(off.shots.every(s=>s.look===undefined));
 assert.equal(evaluateGraph(off.shots[0],.5).look,undefined);
 const legacy=read('speech-cpu-polished.request'),a=await direct(structuredClone(legacy)),b=await direct({...structuredClone(legacy),look:'crafted-v1'});
 assert.ok(a.project.shots.every(s=>s.look===undefined));assert.ok(b.project.shots.every(s=>s.look==='crafted-v1'));
 assert.equal(a.manifest.promptDigest,b.manifest.promptDigest,'look does not reach the model prompt');
 await assert.rejects(direct({...q,look:'pixar'}),/request.look/);
 const bad=f=>{const x=structuredClone(p);f(x.shots[0]);assert.throws(()=>validateProject(x),/look/);};
 bad(s=>s.look='glossy');bad(s=>s.look=true);
});
test('Three tune (owner: "tune three js"): lighter palette touch for Three only; CPU palette unchanged',()=>{
 const sat=h=>{const n=parseInt(h.slice(1),16),c=[n>>16&255,n>>8&255,n&255];return Math.max(...c)-Math.min(...c);};
 assert.equal(craftedColor('#e2582c'),craftedColor('#e2582c',CRAFTED.palette),'CPU default palette');
 assert.equal(craftedColor('#e2582c'),'#da663e','CPU palette pinned (GEN-15 step 1 value)');
 for(const h of ['#e2582c','#2c7be2','#8a3fd1']){const t=craftedColor(h,CRAFTED.three.palette),c=craftedColor(h);assert.ok(sat(t)>=sat(c),h);}
 assert.ok(parseInt(craftedColor('#000000',CRAFTED.three.palette).slice(1,3),16)<parseInt(craftedColor('#000000').slice(1,3),16),'less lift on Three');
 assert.ok(CRAFTED.three.ambient<1&&CRAFTED.three.exposure<1&&CRAFTED.three.metalness>.06);
});
