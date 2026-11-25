// POLISH-02 opt-in planted feet ("turnSteps"). Each foot is either planted (fixed world position and yaw) or swinging.
// - Standing: when the body turns or moves away from a planted foot (twist > step angle or distance > STEP_DIST),
//   that foot lifts and re-plants under its hip over STEP_FRAMES frames.
// - Inside a locomotion window (+ closing step) the stride decides which foot swings (its footLift sign); the other
//   foot stays planted, which removes pivot slide while turning and the closing-step slide.
// - A planted foot pivots in place (yaw only) once its twist would exceed PIVOT, like a heel/ball pivot.
// Output per foot: a local offset from the rig's natural ankle position (footDx*/footDz*, rig units before
// scale/params) and a yaw twist (footTwist*). Frame-addressed: simulated once on the shot's frame grid.
import {recipeSpec} from '../visual/catalog-rig.js';
import {ry} from '../visual/vectors.js';
import {locomotionRig,SETTLE} from './locomotion.js';
import {smooth,mix} from './motion.js';

export const STEP_FRAMES=8;
export const STEP_DIST=.05;
// A planted foot may pivot in place (rotate, not translate) so its twist never exceeds PIVOT.
export const PIVOT=.6;
export const TURN_STEP_LIMITS=Object.freeze({step:[.15,.8],defaultStep:.35});
// Natural ankle position of each rig in local units, matching src/visual/catalog.js: x = side*W*w, z = side*walking*A;
// the foot box centre sits F ahead of the ankle (rotated by the foot twist). Planted feet hold the foot centre.
export const FOOT_RIG=Object.freeze({human:Object.freeze({W:.24,A:.2,F:.09}),robot:Object.freeze({W:.28,A:.17,F:.12})});
// Cached per asset object, and by shot content key (graph passes it) so cloned shots also hit.
const cache=new WeakMap(),byContent=new Map(),LIMIT=256;
export function validateTurnSteps(a,p,fail){
 const x=a.turnSteps;
 if(x!==true&&(!x||typeof x!=='object'||Array.isArray(x)))fail(p,'true or object required');
 if(typeof x==='object')for(const k of Object.keys(x))if(k!=='step')fail(p+'.'+k,'unknown field');
 if(typeof x==='object'&&x.step!==undefined&&(typeof x.step!=='number'||!(x.step>=TURN_STEP_LIMITS.step[0]&&x.step<=TURN_STEP_LIMITS.step[1])))fail(p+'.step','out of range');
 if(!locomotionRig(a.asset))fail(p,'turn steps require a legged catalog human or robot');
}
const walking=(a,t)=>!!a.locomotion&&t>=a.locomotion.start&&t<=a.locomotion.end+SETTLE;
const lerp2=(a,b,k)=>[mix(a[0],b[0],k),mix(a[1],b[1],k)];
function table(a,frames,poseOf,key){
 let c=cache.get(a);if(c&&c.frames===frames)return c;if(key!==undefined){c=byContent.get(key+'#'+frames);if(c){cache.set(a,c);return c;}}
 const step=typeof a.turnSteps==='object'&&a.turnSteps.step!==undefined?a.turnSteps.step:TURN_STEP_LIMITS.defaultStep;
 const rig=FOOT_RIG[locomotionRig(a.asset)],W=recipeSpec(a.asset).args[0]*rig.W,dims=[a.params?.width??1,a.params?.depth??1];
 const ts=Array.from({length:frames},(_,f)=>frames>1?f/(frames-1):0),P=ts.map(t=>poseOf(t));
 const nat=(s,p)=>[s*W,s*(p.walking??0)*rig.A];
 const toW=(l,p)=>{const k=p.scale??1,v=ry([l[0]*k*dims[0],0,l[1]*k*dims[1]],p.yaw??0);return [p.x+v[0],p.z+v[2]];};
 const toL=(w,p)=>{const k=p.scale??1,v=ry([w[0]-p.x,0,w[1]-p.z],-(p.yaw??0));return [v[0]/(k*dims[0]),v[2]/(k*dims[1])];};
 const ahead=q=>[rig.F*Math.sin(q),rig.F*Math.cos(q)];
 const centreW=(l,q,p)=>{const o=ahead(q);return toW([l[0]+o[0],l[1]+o[1]],p);},ankleL=(c,q,p)=>{const l=toL(c,p),o=ahead(q);return [l[0]-o[0],l[1]-o[1]];};
 const sideOf=f=>walking(a,ts[f])?Math.sign(P[f].footLift??0):0,end=[];
 for(let f=frames-1;f>=0;f--)end[f]=sideOf(f)&&f<frames-1&&sideOf(f+1)===sideOf(f)?end[f+1]:f;
 const plant={},cur={};for(const s of [1,-1]){plant[s]={w:centreW(nat(s,P[0]),0,P[0]),yaw:P[0].yaw??0};cur[s]={...plant[s]};}
 const out={R:[],L:[],lift:[]};let swing=null;
 const replant=s=>{plant[s]={w:cur[s].w,yaw:cur[s].yaw};};
 for(let f=0;f<frames;f++){
  const p=P[f],Y=p.yaw??0,loc={},tw={};let up=0;
  for(const s of [1,-1]){if(Math.abs(plant[s].yaw-Y)>PIVOT)plant[s].yaw=Y+Math.sign(plant[s].yaw-Y)*PIVOT;tw[s]=plant[s].yaw-Y;loc[s]=ankleL(plant[s].w,tw[s],p);}
  const inWalk=walking(a,ts[f]),ls=sideOf(f);
  if(swing&&(swing.walk!==inWalk||(inWalk&&swing.side!==ls))){replant(swing.side);tw[swing.side]=plant[swing.side].yaw-Y;loc[swing.side]=ankleL(plant[swing.side].w,tw[swing.side],p);swing=null;}
  if(inWalk){if(ls&&!swing)swing={walk:true,side:ls,f0:f,end:end[f],from:loc[ls],fromTw:tw[ls]};}
  else if(!swing){
   let best=null;for(const s of [1,-1]){const n=centreW(nat(s,p),0,p),e=Math.max(Math.abs(tw[s])/step,Math.hypot(n[0]-plant[s].w[0],n[1]-plant[s].w[1])/STEP_DIST);if(!best||e>best.e+1e-12)best={s,e};}
   if(best.e>1)swing={walk:false,side:best.s,f0:f,from:loc[best.s],fromTw:tw[best.s]};
  }
  if(swing){const s=swing.side,u=swing.walk?(f-swing.f0+1)/(swing.end-swing.f0+1):(f-swing.f0)/STEP_FRAMES;
   if(!swing.walk&&u>=1){loc[s]=nat(s,p);tw[s]=0;cur[s]={w:centreW(loc[s],0,p),yaw:Y};replant(s);swing=null;}
   else{const k=smooth(Math.min(1,u));loc[s]=lerp2(swing.from,nat(s,p),k);tw[s]=swing.fromTw*(1-k);if(!swing.walk)up=s*Math.sin(Math.PI*u);}}
  for(const s of [1,-1])cur[s]={w:centreW(loc[s],tw[s],p),yaw:Y+tw[s]};
  // A walking swing that reaches its last frame lands where it is.
  if(swing&&swing.walk&&f===swing.end){replant(swing.side);swing=null;}
  for(const [s,key] of [[1,'R'],[-1,'L']]){const n=nat(s,p);out[key].push([loc[s][0]-n[0],loc[s][1]-n[1],tw[s]]);}
  out.lift.push(up);
 }
 c={frames,...out};cache.set(a,c);if(key!==undefined){if(byContent.size>=LIMIT)byContent.clear();byContent.set(key+'#'+frames,c);}return c;
}
// Returns per-foot offsets/twists and the standing-step lift at shot progress t; poseOf(t) gives the body pose
// ({x,z,yaw,scale,walking,footLift}) without turn steps.
export function turnSteps(a,t,frames,poseOf,key){
 const c=table(a,frames,poseOf,key),x=Math.max(0,Math.min(1,t))*(frames-1),i=Math.max(0,Math.min(frames-2,Math.floor(x))),k=frames>1?x-i:0;
 const at=(v,j)=>frames>1?v[i][j]+(v[i+1][j]-v[i][j])*k:v[0][j],l=frames>1?c.lift[i]+(c.lift[i+1]-c.lift[i])*k:c.lift[0];
 return {footDxR:at(c.R,0),footDzR:at(c.R,1),footTwistR:at(c.R,2),footDxL:at(c.L,0),footDzL:at(c.L,1),footTwistL:at(c.L,2),footLift:l};
}
