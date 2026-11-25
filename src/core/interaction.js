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
// POLISH-02 reach solver: stages one hand-rig character so its right hand meets a world point (a prop to pick up
// from a surface, or a place target), standing at least `clearance` from the point on the camera side (+z) within
// ±spreadDeg of `around` (radians, 0 = +z), face ≤100° from camera, body (radius bodyRadius) outside every `avoid`
// box ({center:[x,z], half:[hx,hz]}, world axis-aligned). Optional `visibility` weight (per metre) penalises a hand
// that ends up behind the body as seen from the +z camera. Deterministic coarse grid + fixed refinement.
export function solveReach(character,target,{scale=1,params,around=0,spreadDeg=70,clearance=.35,maxDist=1.3,avoid=[],bodyRadius=.32,hands=['right','left'],visibility=0}={}){
 let best=null;const P=[-2.8,.2],S=[-.4,.9];
 const hand=(pos,yaw,pitch,spread,side=1)=>handAnchor(character,{origin:pos,yaw,scale,...(side===1?{armPitch:pitch,armSpread:spread}:{leftArmPitch:pitch,leftArmSpread:spread}),...(params?{params}:{})},side);
 const gapOf=h=>Math.hypot(h[0]-target[0],h[1]-target[1],h[2]-target[2]);
 const spread=spreadDeg*Math.PI/180;
 for(const th of range(-spread,spread,spread/6))for(const d of range(clearance,maxDist,.05)){
  const a=around+th,pos=[target[0]+d*Math.sin(a),0,target[2]+d*Math.cos(a)],f=facing(pos,target);
  if(avoid.some(b=>Math.abs(pos[0]-b.center[0])<b.half[0]+bodyRadius*scale&&Math.abs(pos[2]-b.center[1])<b.half[1]+bodyRadius*scale))continue;
  for(const o of range(-1,1,.1))for(const hs of hands){const yaw=f+o,side=hs==='right'?1:-1;if(cameraAngle(yaw)>HANDOFF_LIMITS.maxCameraAngle)continue;
   let arm=null;for(let i=0;i<=15;i++)for(let j=0;j<=6;j++){const pitch=P[0]+(P[1]-P[0])*i/15,sp=S[0]+(S[1]-S[0])*j/6,g=gapOf(hand(pos,yaw,pitch,sp,side));if(!arm||g<arm.g-1e-12)arm={pitch,sp,g};}
   for(let st=.1;st>.005;st/=2)for(const [dp,ds] of [[st,0],[-st,0],[0,st],[0,-st]]){const pitch=Math.min(P[1],Math.max(P[0],arm.pitch+dp)),sp=Math.min(S[1],Math.max(S[0],arm.sp+ds)),g=gapOf(hand(pos,yaw,pitch,sp,side));if(g<arm.g-1e-12)arm={pitch,sp,g};}
   const hz=visibility?hand(pos,yaw,arm.pitch,arm.sp,side)[2]:0,score=arm.g+.005*cameraAngle(yaw)/90+.005*Math.abs(o)+visibility*Math.max(0,pos[2]-hz);
   if(!best||score<best.score-1e-12)best={score,gap:arm.g,hand:hs,x:+pos[0].toFixed(4),z:+pos[2].toFixed(4),yaw:+yaw.toFixed(4),faceOffset:+o.toFixed(2),armPitch:+arm.pitch.toFixed(4),armSpread:+arm.sp.toFixed(4)};
  }}
 if(!best)throw Error('reach: no staging keeps the face toward the camera');
 best.point=hand([best.x,0,best.z],best.yaw,best.armPitch,best.armSpread,best.hand==='right'?1:-1);best.gap=gapOf(best.point);
 return best;
}
