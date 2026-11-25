// POLISH-02 surface height detection: the top of an asset's emitted geometry under a world point (x, z).
// Uses the same box geometry both backends render, so a prop resting on or placed onto a surface sits on what
// is drawn. Deterministic; results cached per (asset, pose, point).
import {emitAsset} from '../visual/assets.js';
import {ry,add} from '../visual/vectors.js';

const cache=new Map(),LIMIT=4096;
// Boxes whose world footprint (AABB of the 8 corners) contains (x,z); returns the highest top or null.
export function surfaceTop(asset,pose,x,z){
 const key=JSON.stringify([asset,pose.origin,pose.yaw??0,pose.scale??1,pose.params??null,+x.toFixed(6),+z.toFixed(6)]);
 if(cache.has(key))return cache.get(key);
 let top=null;
 emitAsset(asset,(c,sz,col,tf=q=>q)=>{
  let lo=[Infinity,Infinity],hi=[-Infinity,-Infinity],y=-Infinity;
  for(const dx of [-.5,.5])for(const dy of [-.5,.5])for(const dz of [-.5,.5]){const w=tf([c[0]+dx*sz[0],c[1]+dy*sz[1],c[2]+dz*sz[2]]);lo=[Math.min(lo[0],w[0]),Math.min(lo[1],w[2])];hi=[Math.max(hi[0],w[0]),Math.max(hi[1],w[2])];y=Math.max(y,w[1]);}
  if(x>=lo[0]&&x<=hi[0]&&z>=lo[1]&&z<=hi[1]&&(top===null||y>top))top=y;
 },pose);
 if(cache.size>=LIMIT)cache.clear();cache.set(key,top);return top;
}
// World point on a surface asset: its root plus `at` = [dx, dz] in the surface's own frame (scaled), at the top height.
export function surfacePoint(surface,at=[0,0]){
 const p=surface.pose,k=p.scale??1,off=ry([at[0]*k,0,at[1]*k],p.yaw??0),q=add(p.origin,off);
 const y=surfaceTop(surface.asset,p,q[0],q[2]);
 if(y===null)throw Error('surface: no top under the point on '+surface.asset);
 return [q[0],y,q[2]];
}
export function validateSurfaceRef(x,ids,self,p,fail){
 if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');
 for(const k of Object.keys(x))if(!['surface','at'].includes(k))fail(p+'.'+k,'unknown field');
 if(typeof x.surface!=='string'||!ids.has(x.surface)||x.surface===self)fail(p+'.surface','another asset ID required');
 if(x.at!==undefined&&(!Array.isArray(x.at)||x.at.length!==2||x.at.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1.5)))fail(p+'.at','[dx, dz] within ±1.5 required');
}
