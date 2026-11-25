// POLISH-01 opt-in foot-planted locomotion. The leg cycle is driven by distance travelled along the asset's own
// root path (not time), with a triangle-wave stride sized so the stance foot moves backward exactly as fast as the
// body moves forward (no foot slide). Deterministic: integrates on a fixed grid of the authored path.
import {recipeSpec} from '../visual/catalog-rig.js';
import {smooth,clamp,mix} from './motion.js';

const GRID=240;
// Local foot swing amplitude (forward/back) of each leg rig, matching src/visual/catalog.js.
export const SWING={human:.2,robot:.17};
export function locomotionRig(asset){const s=recipeSpec(asset);if(!s)return null;if(s.family==='human')return 'human';if(s.family==='robot'&&s.args[3])return 'robot';return null;}
export function strideLength(asset,scale=1,depth=1){const r=locomotionRig(asset);if(!r)throw Error('locomotion unsupported for '+asset);return 4*SWING[r]*scale*depth;}
// Triangle wave starting at 0: 0→1→-1→0 per cycle.
export function tri(u){const f=u-Math.floor(u);return f<.25?4*f:f<.75?2-4*f:4*f-4;}
// Signed lift: >0 right foot (s=+1) in swing, <0 left foot in swing; magnitude sin over the swing.
export function lift(u){const g=((u-Math.floor(u))+.25)%1;return g<.5?Math.sin(2*Math.PI*g):-Math.sin(2*Math.PI*(g-.5));}
const cache=new WeakMap();
// pathOf(t) -> {x,z,yaw} of the asset root (without locomotion) at shot progress t.
function table(a,pathOf){
 let c=cache.get(a);if(c)return c;
 const x=a.locomotion,ts=[],pos=[],dist=[0],head=[];
 for(let i=0;i<=GRID;i++){const t=x.start+(x.end-x.start)*i/GRID,p=pathOf(t);ts.push(t);pos.push(p);}
 for(let i=1;i<=GRID;i++){const dx=pos[i].x-pos[i-1].x,dz=pos[i].z-pos[i-1].z,len=Math.hypot(dx,dz);head.push(len>1e-9?Math.atan2(dx,dz):null);
  const yaw=x.faceTravel===true&&len>1e-9?Math.atan2(dx,dz):pos[i].yaw;dist.push(dist[i-1]+(dx*Math.sin(yaw)+dz*Math.cos(yaw)));}
 // Fill stationary segments with the nearest moving heading (deterministic, forward then backward pass).
 for(let i=1;i<head.length;i++)if(head[i]===null)head[i]=head[i-1];for(let i=head.length-2;i>=0;i--)if(head[i]===null)head[i]=head[i+1];
 c={ts,dist,head};cache.set(a,c);return c;
}
export function locomote(a,t,pathOf,baseYaw){
 const x=a.locomotion,c=table(a,pathOf),u=clamp((t-x.start)/(x.end-x.start)),f=u*GRID,i=Math.min(GRID-1,Math.floor(f)),k=f-i;
 const d=mix(c.dist[i],c.dist[i+1],k),scale=pathOf(t).scale??1,stride=strideLength(a.asset,scale,a.params?.depth??1),phase=d/stride;
 const out={walking:tri(phase),footLift:lift(phase)};
 if(x.faceTravel===true&&c.head[i]!==null){
  const b=x.blend??0,w=t<x.start||t>x.end?0:b?Math.min(smooth(u/b),smooth((1-u)/b)):1,d0=c.head[i]-baseYaw;
  out.yaw=mix(baseYaw,baseYaw+d0-2*Math.PI*Math.round(d0/(2*Math.PI)),w);
 }
 // Outside the window the cycle settles to standing (walking 0, no lift), ramping over the blend.
 if(t<x.start||t>x.end){out.walking=0;out.footLift=0;}
 return out;
}
export function validateLocomotion(a,p,fail){
 const x=a.locomotion;
 if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');
 for(const k of Object.keys(x))if(!['mode','start','end','faceTravel','blend'].includes(k))fail(p+'.'+k,'unknown field');
 if(x.mode!=='stride')fail(p+'.mode','stride required');
 for(const k of ['start','end'])if(typeof x[k]!=='number'||!Number.isFinite(x[k])||x[k]<0||x[k]>1)fail(p+'.'+k,'out of range');
 if(x.start>=x.end)fail(p,'invalid window');
 if(x.faceTravel!==undefined&&typeof x.faceTravel!=='boolean')fail(p+'.faceTravel','boolean required');
 if(x.blend!==undefined&&(typeof x.blend!=='number'||!(x.blend>=0&&x.blend<=.5)))fail(p+'.blend','out of range');
 if(!locomotionRig(a.asset))fail(p,'locomotion requires a legged catalog human or robot');
 if(Object.hasOwn(a.tracks,'walking')||(a.actions??[]).some(y=>['walk','run','walk-cycle','walk-forward','walk-across','run-cycle'].includes(y.name))||a.motion&&/walk|run/.test(a.motion))fail(p,'locomotion drives walking; remove walking tracks/actions');
}
