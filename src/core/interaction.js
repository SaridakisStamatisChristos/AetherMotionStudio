// POLISH-01 interaction solver: stages a hand-to-hand handoff between two hand-rig characters so their hands meet,
// while keeping both faces readable from a camera on +z. Pure, deterministic grid search on analytic hand anchors.
import {handAnchor} from './cinematography.js';

const range=(a,b,step)=>{const out=[];for(let v=a;v<=b+1e-9;v+=step)out.push(+v.toFixed(4));return out;};
const facing=(from,to)=>Math.atan2(to[0]-from[0],to[2]-from[2]);
export const HANDOFF_LIMITS=Object.freeze({maxCameraAngle:100,minApart:.85});
// Angle (degrees) between a character's forward (+z rotated by yaw) and the +z camera direction.
const cameraAngle=yaw=>Math.abs(Math.atan2(Math.sin(yaw),Math.cos(yaw)))*180/Math.PI;
export function solveHandoff(giver,receiver,{giverAt=[0,0],scale=[1,1],side=1}={}){
 // giver, receiver: catalog asset IDs with hand rigs; side: +1 receiver to the giver's screen right, -1 left.
 let best=null;
 for(const dx of range(.9,1.7,.1))for(const dz of range(-.8,.8,.1)){
  const gp=[giverAt[0],0,giverAt[1]],rp=[giverAt[0]+side*dx,0,giverAt[1]+dz],apart=Math.hypot(rp[0]-gp[0],rp[2]-gp[2]);
  if(apart<HANDOFF_LIMITS.minApart)continue;
  const fg=facing(gp,rp),fr=facing(rp,gp);
  for(const og of range(-1,1,.1)){const yg=fg+og;if(cameraAngle(yg)>HANDOFF_LIMITS.maxCameraAngle)continue;
   for(const pa of [-1,-1.15,-1.3,-1.5]){const a=handAnchor(giver,{origin:gp,yaw:yg,scale:scale[0],armPitch:pa},1);
    for(const or of range(-1,1,.1)){const yr=fr+or;if(cameraAngle(yr)>HANDOFF_LIMITS.maxCameraAngle)continue;
     for(const pb of [-1,-1.15,-1.3,-1.5,-1.75]){const b=handAnchor(receiver,{origin:rp,yaw:yr,scale:scale[1],armPitch:pb},1);
      const gap=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),score=gap+.02*(cameraAngle(yg)+cameraAngle(yr))/90;
      if(!best||score<best.score-1e-12)best={score,gap,giver:{x:gp[0],z:gp[2],faceOffset:+og.toFixed(2),armPitch:pa},receiver:{x:rp[0],z:rp[2],faceOffset:+or.toFixed(2),armPitch:pb},hands:[a,b]};
     }}}}}
 if(!best)throw Error('handoff: no staging keeps both faces toward the camera');
 return best;
}
