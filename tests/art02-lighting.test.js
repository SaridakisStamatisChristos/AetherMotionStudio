// ART-02 slice 2: opt-in CPU lighting profile 'parity-v1' (lit fogged floor, solid sky, key-light cast shadow).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph,ENVIRONMENTS,LIGHTING_PROFILES} from '../src/core/graph.js';
import {PARITY,litFloor,floorDistance,horizonRow,floorStops,castShadow} from '../src/visual/lighting-parity.js';

const read=name=>JSON.parse(readFileSync(new URL('../examples/'+name+'.json',import.meta.url),'utf8'));
const project=shots=>({version:2,id:'art02-light-test',title:'t',voice:'af_heart',shots});
const cam={position:[0,3,8],target:[0,1.2,0],zoom:1100};

test('lit floor colour follows the calibrated formula and is far brighter than the legacy CPU floor',()=>{
 // Film-vs-film parity (post-vignette) is render evidence in docs; here: formula, range and intent.
 const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),luma=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
 for(const env of Object.values(ENVIRONMENTS)){
  const c=litFloor(env),f=hex(env.floor),r=hex(env.rim);
  c.forEach((v,i)=>{assert.ok(Math.abs(v-(f[i]*PARITY.sky[i]/250*PARITY.gain+PARITY.rim*r[i]))<1e-9);assert.ok(v>=0&&v<=255);});
  assert.ok(luma(c)>3*luma(hex('#070c13')),'legacy CPU floor fades to #070c13');
 }
});

test('floor geometry: horizon row, distances grow toward the horizon, none above it',()=>{
 const h=horizonRow(cam);assert.ok(h>0&&h<640,String(h));
 assert.equal(floorDistance(cam,h-5),null);
 const d=[1270,1000,800,h+20].map(y=>floorDistance(cam,y));for(let i=1;i<d.length;i++)assert.ok(d[i]>d[i-1],JSON.stringify(d));
 // Straight down the optical axis the ray meets the floor where the camera target line does.
 const axis=floorDistance(cam,640),expect=Math.hypot(0,3+.04,(3+.04)/(1.8)*8);assert.ok(axis>8&&axis<expect+1e-9);
});

test('floor stops fade from fogged background at the horizon to the lit floor near the camera, deterministically',()=>{
 const env=ENVIRONMENTS.laboratory,{top,stops}=floorStops(cam,env);
 assert.equal(stops.length,25);assert.equal(stops[0].offset,0);assert.equal(stops.at(-1).offset,1);assert.ok(Math.abs(top-horizonRow(cam))<1e-9);
 const rgb=s=>s.color.match(/\d+/g).map(Number),bg=[0x10,0x25,0x3b],lit=litFloor(env).map(Math.round);
 assert.deepEqual(rgb(stops[0]),bg);assert.deepEqual(rgb(stops.at(-1)),lit);
 assert.deepEqual(floorStops(cam,env),floorStops(structuredClone(cam),env));
 const high={...cam,position:[0,6,8],target:[0,5.9,-30]};assert.ok(floorStops(high,env).top>0);
 const sky={...cam,target:[0,30,0]};assert.deepEqual(floorStops(sky,env).stops,[],'camera looking up sees no floor');
});

test('cast shadow lies on the floor, away from the key light, scaled by object height',()=>{
 const s=read('art02-product-cpu-polished').shots[0],a=evaluateGraph(s,.9).assets[0],sh=castShadow(a);
 assert.ok(sh.polygon.length>=4);for(const p of sh.polygon)assert.equal(p[1],PARITY.floorY);
 assert.ok(sh.offset[0]>0&&sh.offset[2]<0,'key at -x,+z casts toward +x,-z');
 const L=PARITY.key,ratio=[-L[0]/L[1],-L[2]/L[1]];assert.ok(Math.abs(sh.offset[0]-ratio[0]*sh.height)<1e-9&&Math.abs(sh.offset[2]-ratio[1]*sh.height)<1e-9);
 const tall={...a,pose:{...a.pose,scale:a.pose.scale*1.2}};assert.ok(castShadow(tall).height>sh.height);
});

test('contract: lighting is opt-in, validated, and only appears in state when authored',()=>{
 assert.deepEqual(LIGHTING_PROFILES,['parity-v1']);
 const p=read('art02-studio-cpu-polished'),q=read('art02-studio-three-polished');validateProject(p);validateProject(q);
 assert.deepEqual(p.shots,q.shots.map(s=>({...s,backend:'cpu'})));assert.ok(p.shots.every(s=>s.lighting==='parity-v1'));
 assert.equal(evaluateGraph(p.shots[0],.5).lighting,'parity-v1');
 const plain=read('art02-product-cpu-polished').shots[0];assert.ok(!('lighting' in evaluateGraph(plain,.5)));
 const bad=read('art02-studio-cpu-polished');bad.shots[0].lighting='bright';assert.throws(()=>validateProject(bad),/lighting: unknown lighting profile/);
 const chapter=read('blockchain-60s');chapter.shots[0].lighting='parity-v1';assert.throws(()=>validateProject(chapter),/lighting: unknown field/);
});

test('studio fixture reuses the hero product and handoff shots unchanged apart from lighting and the fade',()=>{
 const p=read('art02-studio-cpu-polished'),prod=read('art02-product-cpu-polished').shots[0],hand=read('art01-handoff-cpu-polished').shots[0];
 const {lighting:l0,...a}=p.shots[0],{lighting:l1,transitionFrames,transition,...b}=p.shots[1];
 assert.deepEqual(a,prod);assert.deepEqual({...b,transitionFrames:hand.transitionFrames},hand);assert.equal(transition,'fade');assert.equal(transitionFrames,12);
});
