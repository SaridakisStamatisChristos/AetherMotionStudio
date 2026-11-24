// ART-02 opt-in CPU lighting profile 'parity-v1': approximates the Three.js stage (lit floor plane with distance
// fog, solid sky, key-light cast shadow) on the CPU canvas. Pure, deterministic math; drawing is in draw-graph.js.
import {add,sub,dot,cross,norm} from './vectors.js';
import {geometryBounds} from '../core/cinematography.js';

export const PARITY=Object.freeze({fog:[14,32],sky:[182,217,250],gain:1.1,rim:.045,key:[-3,6,5],shadowAlpha:.42,floorY:-.04});
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const css=c=>'rgb('+c.map(v=>Math.round(Math.max(0,Math.min(255,v)))).join(',')+')';
// Calibrated against measured Three.js floor colours (art02-studio-r1): hemisphere-tinted floor + small rim term.
export function litFloor(env){const f=hex(env.floor),rim=hex(env.rim);return f.map((v,i)=>v*PARITY.sky[i]/250*PARITY.gain+PARITY.rim*rim[i]);}
function basis(c){const fwd=norm(sub(c.target,c.position)),right=norm(cross(fwd,[0,1,0])),up=cross(right,fwd);return {fwd,right,up};}
// Screen row (720×1280 space, column 360) → distance along the view ray to the floor plane, or null above the horizon.
export function floorDistance(c,sy){
 const {fwd,up}=basis(c),dir=sub(fwd,up.map(v=>v*(sy-640)/c.zoom));
 if(dir[1]>=-1e-6)return null;const t=(PARITY.floorY-c.position[1])/dir[1];return t*Math.hypot(...dir);
}
// Horizon row: where the view ray becomes parallel to the floor (may lie outside the frame).
export function horizonRow(c){const {fwd,up}=basis(c);return Math.abs(up[1])<1e-9?-Infinity:640+c.zoom*fwd[1]/up[1];}
// Vertical gradient stops for the floor from the horizon (clamped to the frame) to the bottom edge.
export function floorStops(c,env,n=24){
 const top=Math.max(0,Math.min(1280,horizonRow(c))),floor=litFloor(env),bg=hex(env.background),stops=[];
 if(top>=1280)return {top,stops};
 for(let i=0;i<=n;i++){
  const y=top+(1280-top)*i/n,d=floorDistance(c,Math.min(1279.5,Math.max(top+.5,y)));
  const fog=d===null?1:Math.max(0,Math.min(1,(d-PARITY.fog[0])/(PARITY.fog[1]-PARITY.fog[0])));
  stops.push({offset:i/n,color:css(floor.map((v,k)=>v+(bg[k]-v)*fog))});
 }
 return {top,stops};
}
// Key-light cast shadow on the floor: footprint plus its projection along the light direction (world-space polygon).
export function castShadow(asset){
 const b=geometryBounds([asset]);if(!b)return null;
 const L=norm(PARITY.key),h=Math.max(0,b.hi[1]-PARITY.floorY),off=[-L[0]/L[1]*h,0,-L[2]/L[1]*h];
 const foot=[[b.lo[0],b.lo[2]],[b.hi[0],b.lo[2]],[b.hi[0],b.hi[2]],[b.lo[0],b.hi[2]]].map(([x,z])=>[x,PARITY.floorY,z]);
 const pts=[...foot,...foot.map(p=>add(p,off))],cx=pts.reduce((s,p)=>s+p[0],0)/8,cz=pts.reduce((s,p)=>s+p[2],0)/8;
 // Convex hull in the floor plane (monotone chain), deterministic order.
 const q=pts.map(p=>[p[0],p[2]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lo=[],hi=[];for(const p of q){while(lo.length>1&&cr(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}for(const p of q.slice().reverse()){while(hi.length>1&&cr(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}
 return {polygon:[...lo.slice(0,-1),...hi.slice(0,-1)].map(([x,z])=>[x,PARITY.floorY,z]),offset:off,center:[cx,PARITY.floorY,cz],height:h};
}
export const parityCss={css,hex};
