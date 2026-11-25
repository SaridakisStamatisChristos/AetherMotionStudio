// Owner-approved repair (2026-11-25, found in GEN-10 stills): on the CPU painter the catalog robot's lit mouth bar
// sorted about 1 cm behind its face panel in close shots and was painted over (Three showed it). A CPU-only sort bias
// (ROBOT_MOUTH_BIAS) keeps it in front; geometry (and so Three) is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {evaluateGraph} from '../src/core/graph.js';
import {createMesh,createProjection} from '../src/visual/mesh.js';
import {emitAsset} from '../src/visual/assets.js';
import {ROBOT_MOUTH_BIAS} from '../src/visual/catalog.js';

const inside=(pt,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if(yi>pt[1]!==yj>pt[1]&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c;}return c;};
const q=JSON.parse(readFileSync(new URL('../examples/gen01-interview.request.json',import.meta.url),'utf8'));

// faces of one robot in a shot camera, painter-sorted (far first), with the mouth faces marked
function painted(shot,asset,pose,bias){
 const st=evaluateGraph(shot,.5),c=st.camera,pr=createProjection(c.position,c.target,c.zoom,[360,640]),a=st.assets.find(x=>x.asset===asset);
 const run=extra=>{const {box,faces}=createMesh(c.position,pr,.3);emitAsset(asset,(center,size,color,tf,lit,b=0)=>box(center,size,color,tf,lit,bias===null?b:0),{...a.pose,...extra});return faces;};
 const base=run(pose.without),all=run(pose.with),key=f=>JSON.stringify(f.p);
 const old=new Set(base.map(key)),mouth=all.filter(f=>!old.has(key(f)));
 return {sorted:[...all].sort((x,y)=>y.z-x.z),mouth};
}
test('CPU painter draws the robot mouth after every face that covers it (close-up and group shots)',async()=>{
 const p=(await direct({...q,speech:defaultSpeech(q.seconds)})).project;
 let checked=0;
 for(const s of p.shots){if(!s.assets.some(a=>a.asset==='explorer-robot'))continue;
  for(const bias of [null,0]){
   const {sorted,mouth}=painted(s,'explorer-robot',{without:{mouth:undefined},with:{mouth:.6,mouthWidth:1}},bias);
   assert.ok(mouth.length>0);
   const front=mouth.reduce((m,f)=>f.z<m.z?f:m),centre=front.p.reduce((a,v)=>[a[0]+v[0]/4,a[1]+v[1]/4],[0,0]);
   const after=sorted.slice(sorted.indexOf(front)+1).filter(f=>!mouth.includes(f)&&inside(centre,f.p));
   if(bias===null){assert.deepEqual(after,[],s.id+': nothing painted over the mouth');checked++;}
   else if(s.id.endsWith('-single'))assert.ok(after.length>0,s.id+': without the bias the panel hides it (the bug)');
  }}
 assert.ok(checked>=4);assert.equal(ROBOT_MOUTH_BIAS,.08);
});
test('geometry and Three unchanged: the bias is only the 6th box argument and only on the mouth',()=>{
 const calls=pose=>{const out=[];emitAsset('explorer-robot',(c,sz,col,tf,lit,bias)=>out.push({c,sz,col,lit,bias,at:tf(c)}),{origin:[0,0,0],yaw:0,params:{detail:2},...pose});return out;};
 const a=calls({mouth:.5}),biased=a.filter(x=>x.bias);assert.equal(biased.length,1);assert.equal(biased[0].bias,ROBOT_MOUTH_BIAS);assert.equal(biased[0].lit,true);
 assert.ok(calls({}).every(x=>!x.bias),'no mouth: every legacy box keeps bias 0');
 assert.ok(calls({mouth:.5,nod:.05,hip:.02}).filter(x=>x.bias).length===1,'also through the head and hip routes');
});
