// POLISH-02 opt-in aiming: during a window, solve the right arm (armPitch/armSpread) so the shoulder→hand
// direction points at a target asset, with an optional bounded body-yaw cheat. Pure and deterministic:
// coarse grid over the rig channel limits, then a fixed local refinement. Catalog hand rigs only.
import {recipeSpec,hasHands,localArm} from '../visual/catalog-rig.js';
import {add,ry,sub,norm,dot} from '../visual/vectors.js';
import {smooth,clamp,mix} from './motion.js';

export const AIM_LIMITS=Object.freeze({pitch:[-2.8,1],spread:[-.4,.9],cheat:1.2,height:[0,3]});
const DEFAULT_HEIGHT=.8;
const fail=(p,m)=>{throw Error(p+': '+m);};
const num=(v,lo,hi,p)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)fail(p,'number in ['+lo+', '+hi+'] required');};
export function aimSupported(asset){return asset!=='retro-robot'&&hasHands(asset)&&!!recipeSpec(asset);}
// GEN-01: optional `phrase` (narration line index): at render the window follows that line's measured bounds
// (dialogueShot / phraseAims); start/end remain the estimate used before preparation.
export function validateAim(a,ids,p,lines=null){
 const x=a.aim;if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');
 for(const k of Object.keys(x))if(!['target','start','end','blend','hold','height','cheat','phrase'].includes(k))fail(p+'.'+k,'unknown field');
 if(x.phrase!==undefined&&(!Number.isSafeInteger(x.phrase)||x.phrase<0||lines===null||x.phrase>=lines))fail(p+'.phrase','narration line index required');
 if(!aimSupported(a.asset))fail(p,'aim requires a catalog hand rig');
 if(typeof x.target!=='string'||!ids.has(x.target)||x.target===a.id)fail(p+'.target','another asset ID required');
 num(x.start,0,1,p+'.start');num(x.end,0,1,p+'.end');if(x.start>=x.end)fail(p,'invalid window');
 if(x.blend!==undefined)num(x.blend,0,.5,p+'.blend');
 if(x.hold!==undefined&&x.hold!==true)fail(p+'.hold','hold must be true');
 if(x.height!==undefined)num(x.height,...AIM_LIMITS.height,p+'.height');
 if(x.cheat!==undefined)num(x.cheat,0,AIM_LIMITS.cheat,p+'.cheat');
 for(const ch of ['armPitch','armSpread'])if(Object.hasOwn(a.tracks??{},ch))fail(p,'aim conflicts with authored '+ch+' track');
}
// World shoulder and hand of the right arm for a pose (mirrors catalogHandAnchor's transform).
function arm(asset,pose,pitch,spread){
 const q=recipeSpec(asset),pp=pose.params??{},dims=[pp.width??1,pp.height??1,pp.depth??1],k=pose.scale??1;
 const {shoulder,hand}=localArm(q.family,q.args,1,{...pose,armPitch:pitch,armSpread:spread});
 const w=v=>add(ry(v.map((c,i)=>c*k*dims[i]),pose.yaw??0),pose.origin??[0,0,0]);
 return [w(shoulder),w(hand)];
}
function score(asset,pose,pitch,spread,target){const [s,h]=arm(asset,pose,pitch,spread);return Math.acos(clamp(dot(norm(sub(h,s)),norm(sub(target,s))),-1,1));}
// POLISH-02 item 9: coarse 20x8 grid + halving refinement (was 39x14); same limits, ~3x fewer evaluations.
function solveArm(asset,pose,target){
 const [p0,p1]=AIM_LIMITS.pitch,[s0,s1]=AIM_LIMITS.spread;let best=null;
 for(let i=0;i<=19;i++)for(let j=0;j<=7;j++){const pitch=p0+(p1-p0)*i/19,spread=s0+(s1-s0)*j/7,e=score(asset,pose,pitch,spread,target);if(!best||e<best.e-1e-12)best={pitch,spread,e};}
 for(let step=.1;step>.002;step/=2)for(const [dp,ds] of [[step,0],[-step,0],[0,step],[0,-step]]){
  const pitch=clamp(best.pitch+dp,p0,p1),spread=clamp(best.spread+ds,s0,s1),e=score(asset,pose,pitch,spread,target);if(e<best.e-1e-12)best={pitch,spread,e};}
 return best;
}
// Returns {armPitch, armSpread, yaw, error} (error in radians between pointing ray and target ray).
// Memo of solved aims by every input the solve reads (bounded); repeated frame evaluations reuse results.
const memo=new Map(),MEMO_LIMIT=20000;
export function solveAim(asset,pose,targetOrigin,{height=DEFAULT_HEIGHT,cheat=0}={}){
 if(!aimSupported(asset))throw Error('aim unsupported for '+asset);
 const key=JSON.stringify([asset,pose.origin??null,pose.yaw??0,pose.scale??1,pose.params??null,pose.open??0,targetOrigin,height,cheat]);
 if(memo.has(key))return {...memo.get(key)};
 const target=[targetOrigin[0],targetOrigin[1]+height,targetOrigin[2]],yaw=pose.yaw??0;let best=null;
 const at=c=>{const r=solveArm(asset,{...pose,yaw:yaw+c},target),cost=r.e+.15*Math.abs(c);if(!best||cost<best.cost-1e-12)best={cost,c,armPitch:r.pitch,armSpread:r.spread,yaw:yaw+c,error:r.e};};
 // Body-yaw cheat: coarse 0.15 rad candidates, then refine around the best (bounded by cheat).
 const n=Math.floor(cheat/.15+1e-9);for(let i=-n;i<=n;i++)at(i*.15);if(cheat>0)at(cheat),at(-cheat);
 if(cheat>0)for(const st of [.075,.0375]){const c0=best.c;for(const d of [-st,st]){const c=c0+d;if(Math.abs(c)<=cheat+1e-12)at(c);}}
 const out={armPitch:+best.armPitch.toFixed(4),armSpread:+best.armSpread.toFixed(4),yaw:best.yaw,error:best.error};
 if(memo.size>=MEMO_LIMIT)memo.clear();memo.set(key,out);return {...out};
}
// Frame evaluation: blends the solved arm (and cheat yaw) over the authored pose inside the window.
export function applyAim(a,pose,origin,targetOrigin,t){
 const x=a.aim;if(t<x.start||(t>x.end&&x.hold!==true))return pose;
 const u=Math.min(1,(t-x.start)/(x.end-x.start)),b=x.blend??0,w=b?(x.hold===true?smooth(u/b):Math.min(smooth(u/b),smooth((1-u)/b))):1;
 const r=solveAim(a.asset,{...pose,origin},targetOrigin,{height:x.height,cheat:x.cheat});
 return {...pose,armPitch:mix(pose.armPitch??0,r.armPitch,w),armSpread:mix(pose.armSpread??0,r.armSpread,w),yaw:mix(pose.yaw??0,r.yaw,w)};
}
