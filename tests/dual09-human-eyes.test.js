// Owner (2026-11-27, DUAL-09 films on CPU): "the turning person in some frames with one eye visible and one invisible",
// like the robot films before (gen15b "the robot has one eye"). The CPU painter sorts polygons by average depth; on a
// turned head or under a side camera the far eye (a dark box 2.7 cm proud of the face) sorted behind the head block's
// front face and was painted over. Three has a depth buffer and is unaffected. Repair: a person's face details (eyes,
// brows, nose, mouth) carry a `detail` flag that only the crafted CPU painter turns into a sort bias.
// Rule (as for the robot eyes): a detail is visible when its biggest (front) face is not painted over by a later face,
// other than another face detail or a glowing highlight mounted on it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMesh,createProjection} from '../src/visual/mesh.js';
import {emitAsset} from '../src/visual/assets.js';
import {CRAFTED} from '../src/visual/crafted.js';

const area=p=>Math.abs(p.reduce((s,q,i)=>{const r=p[(i+1)%p.length];return s+q[0]*r[1]-r[0]*q[1];},0))/2;
const inside=(pt,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>pt[1])!==(yj>pt[1])&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c;}return c;};
const isEye=s=>Math.abs(s[2]-.03)<1e-9&&s[0]<.1&&s[1]<.1;
// Oriented box from the box stream (centre c, size s, transform tf): world centre and half-axis vectors.
const obb=(c,s,tf)=>{const o=tf(c),ax=[0,1,2].map(i=>{const q=[...c];q[i]+=s[i]/2;return tf(q).map((v,k)=>v-o[k]);});return {o,ax};};
// Does the segment a→b pass through the box (shrunk 1 mm, so touching surfaces do not count)? Slab test.
function blocks({o,ax},a,b){let t0=0,t1=1;
 for(const u of ax){const L=Math.hypot(...u);if(L<1e-9)return false;const n=u.map(v=>v/L),half=L-.001;if(half<=0)return false;
  const pa=n.reduce((s,v,k)=>s+v*(a[k]-o[k]),0),pd=n.reduce((s,v,k)=>s+v*(b[k]-a[k]),0);
  if(Math.abs(pd)<1e-12){if(Math.abs(pa)>half)return false;continue;}
  let ta=(-half-pa)/pd,tb=(half-pa)/pd;if(ta>tb)[ta,tb]=[tb,ta];t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)return false;}
 return t1>0&&t0<1;}
// face details whose front face is painted over although nothing really stands between the camera and them (a real
// occlusion, e.g. the shoulder in front of the mouth from a low side camera, hides them on a depth buffer too)
export function hiddenDetails(look,asset,pose,cam,useFlag=true){
 const pr=createProjection(cam,[0,1.3,0],1400,[540,960]),{box,faces}=createMesh(cam,pr,.3,look),parts=[],mounted=new Set(),solids=[];
 emitAsset(asset,(c,s,col,tf,lit,bias,role,detail)=>{const n0=faces.length;box(c,s,col,tf,lit,bias,role,useFlag?detail:false);
  if(detail)parts.push({from:n0,to:faces.length,eye:isEye(s),at:tf(c)});else if(!lit)solids.push(obb(c,s,tf));
  if(detail||lit)for(let k=n0;k<faces.length;k++)mounted.add(faces[k]);},{origin:[0,0,0],params:{detail:2},...pose});
 const order=faces.map((f,i)=>[f,i]).sort((a,b)=>b[0].z-a[0].z),rank=new Map(order.map(([,i],k)=>[i,k]));
 const hidden=parts.filter(({from,to,at})=>{if(to===from)return false;// wholly back-facing: culled, legitimately not visible
  if(solids.some(x=>blocks(x,cam,at)))return false;// really occluded: correct to hide
  let i=from;for(let k=from;k<to;k++)if(area(faces[k].p)>area(faces[i].p))i=k;
  const f=faces[i],c=[0,1].map(d=>f.p.reduce((s,q)=>s+q[d],0)/f.p.length);
  return order.slice(rank.get(i)+1).some(([g])=>!mounted.has(g)&&inside(c,g.p));});
 return {details:parts.length,eyes:parts.filter(x=>x.eye).length,hidden:hidden.length,hiddenEyes:hidden.filter(x=>x.eye).length};
}
const PEOPLE=['student','scientist','engineer'];
const sweep=fn=>{for(let yaw=-.9;yaw<=.91;yaw+=.1)for(const camY of [1.2,1.6,2.4])for(const camX of [-1.5,0,1.5])for(const extra of [{},{blink:1},{blink:.4},{mouth:.6},{nod:.12},{nod:-.1,tilt:.08}])fn({yaw,...extra},[camX,camY,3.5]);};
test('CPU painter (crafted looks): a person\'s eyes, brows, nose and mouth stay visible when the head turns',()=>{
 assert.equal(CRAFTED.detailBias,.1);
 let checked=0;
 for(const look of ['crafted-v1','crafted-v2'])for(const asset of PEOPLE){
  assert.equal(hiddenDetails(look,asset,{yaw:0},[0,1.6,3.5]).eyes,2,asset+' has two detail eyes');
  sweep((pose,cam)=>{const r=hiddenDetails(look,asset,pose,cam);assert.equal(r.hidden,0,look+' '+asset+' '+JSON.stringify(pose)+' cam '+cam);checked++;});
 }
 assert.ok(checked>=6000,'combinations checked: '+checked);
});
test('reproduction: without the detail bias the far eye is painted over (the owner\'s frames)',()=>{
 // the same sweep through a painter that ignores the flag (what crafted-v2 did before DUAL-09)
 let lost=0;for(const asset of PEOPLE)sweep((pose,cam)=>{lost+=hiddenDetails('crafted-v2',asset,pose,cam,false).hiddenEyes;});
 assert.ok(lost>100,'eyes lost without the repair: '+lost);
});
test('nothing else changes: legacy painter, geometry and Three ignore the flag; only face details carry it',()=>{
 // legacy (non-crafted) painter: identical faces with and without the flag (accepted legacy films keep their frames)
 const cam=[1.5,1.6,3.5],pr=createProjection(cam,[0,1.3,0],1400,[540,960]);
 const run=keep=>{const {box,faces}=createMesh(cam,pr,.3,null);emitAsset('student',(c,s,col,tf,lit,bias,role,detail)=>box(c,s,col,tf,lit,bias,role,keep?detail:false),{origin:[0,0,0],yaw:.6,params:{detail:2}});return JSON.stringify(faces);};
 assert.equal(run(true),run(false));
 // the flagged boxes: two eyes, two brows, a nose and the lip line (plus the inner mouth while speaking); no robot part
 const flagged=pose=>{const out=[];emitAsset('student',(c,s,col,tf,lit,bias,role,detail)=>{if(detail)out.push(s);},{origin:[0,0,0],yaw:0,params:{detail:2},...pose});return out.length;};
 assert.equal(flagged({}),6);assert.equal(flagged({mouth:.6}),7);
 let robot=0;emitAsset('explorer-robot',(c,s,col,tf,lit,bias,role,detail)=>{if(detail)robot++;},{origin:[0,0,0],yaw:0,params:{detail:2}});assert.equal(robot,0);
 // detail 1 (no face) emits no flagged box
 let plain=0;emitAsset('student',(c,s,col,tf,lit,bias,role,detail)=>{if(detail)plain++;},{origin:[0,0,0],yaw:0});assert.equal(plain,0);
});
