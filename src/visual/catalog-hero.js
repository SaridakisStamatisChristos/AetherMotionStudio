// GPU-05 hero detail 4 (owner 2026-11-28: refine "everything", "neat styles"): refined human and robot builders used
// by catalog.js when params.detail is 4. Shared geometry (CPU and Three draw it; every checker sees it); designed for
// the Cinematic soft-v1 rounding (src/core/hero-characters.js), where boxes become soft shapes.
// Contracts kept from the detail 1–3 builders: head parts (box centre above the head cut) nod and tilt with the head,
// parts above the hips lean with the weight shift, planted feet (turnSteps), hands at localArm's hand anchor, grip,
// blink, mouth and mouthWidth, and the overall height and width of each recipe.
// Colour slots: 0 top clothes, 1 trousers/hair (robot joints), 2 accent, 3 skin (robot shell), 4 dark, 5 lip,
// 6 light blue, 7 white (eyes, soles), 8 rose (lips, tongue).
import {localArm} from './catalog-rig.js';
import {add,sub,norm,cross,ry} from './vectors.js';
const lerp=(a,c,t)=>a.map((v,i)=>v+(c[i]-v)*t);
// the point k metres beyond q on the line from p through q
const past=(p,q,k)=>{const d=sub(q,p),l=len(d);return l<1e-9?[...q]:add(q,d.map(v=>v*k/l));};
const dot=(a,c)=>a[0]*c[0]+a[1]*c[1]+a[2]*c[2],len=v=>Math.hypot(...v);
// GPU-06 puppet skeleton: two-bone IK. The joint (elbow, knee) between root a and end c with bone lengths l1, l2 bends
// toward pole; the end stays exactly at c, so hand anchors, grips and planted feet are unchanged. Beyond reach the
// limb is straight (joint at the bone-length ratio). Joint limits come from the pole: elbows bend back and out, knees
// forward, never the other way.
export function ikJoint(a,c,l1,l2,pole){
 const d=sub(c,a),L=len(d);if(L<1e-9)return [...a];
 const u=d.map(v=>v/L);if(L>=l1+l2)return add(a,u.map(v=>v*L*l1/(l1+l2)));
 const x=(L*L+l1*l1-l2*l2)/(2*L),y=Math.sqrt(Math.max(0,l1*l1-x*x));
 let q=sub(pole,u.map(v=>v*dot(pole,u)));if(len(q)<1e-6)q=cross(u,Math.abs(u[0])<.9?[1,0,0]:[0,1,0]);q=norm(q);
 return add(a,add(u.map(v=>v*x),q.map(v=>v*y)));
}
// Bone lengths: a share of the limb's rest span (arms slightly longer than the rest span, so elbows rest softly bent;
// legs just longer than straight, so knees bend as soon as a foot lifts).
export const BONES=Object.freeze({arm:.505,leg:.503});
const span=(fam,w,h,s)=>{const r=localArm(fam,[w,h],s,{});return len(sub(r.hand,r.shoulder));};
const ARM_POLE=s=>[s*.2,-.25,-1],KNEE_POLE=[0,-.05,1];
export const HERO_BROW=Object.freeze({1:.1,2:-.08,3:.05,5:-.12,6:.08,7:-.05});
const F=true; // face detail flag (crafted CPU painter keeps these in front of the head)

function hair(b,k,hw,hd,hy,hh,z0){
 if(k===2||k===5){b(0,hy+hh*.56,0,hw*1.12,hh*.4,hd*1.12,2);b(0,hy+hh*.38,hd*.22,hw*1.16,.03,hd*1.26,2);return;} // hard hat
 b(0,hy+hh*.47,-hd*.03,hw*1.06,hh*.22,hd*1.04,1);                    // crown
 b(0,hy+hh*.05,-hd*.47,hw*1.04,hh*.8,hd*.12,1);                       // back
 for(const s of [-1,1])b(s*hw*.51,hy+hh*.2,-hd*.12,hw*.08,hh*.5,hd*.7,1); // sides
 if(k===6){b(0,hy+hh*.33,z0-.004,hw*.98,hh*.2,.05,1);                  // bob with fringe
  for(const s of [-1,1])b(s*hw*.52,hy-hh*.08,-hd*.06,hw*.1,hh*.8,hd*.78,1);b(0,hy-hh*.1,-hd*.48,hw*1.06,hh*.85,hd*.14,1);}
 else if(k===1||k===3)b(-hw*.12,hy+hh*.58,hd*.12,hw*.72,hh*.16,hd*.6,1,-.08,'z'); // neat side part
 else if(k===7)b(0,hy+hh*.3,0,hw*1.05,hh*.13,hd*1.05,2);                         // headband
}
function clothes(b,rod,w,h,d,k){
 const z=d*.4;
 if(k===1){ // long lab coat over shirt and tie
  b(0,h*.7,z+.01,w*.22,h*.12,.02,6);b(0,h*.685,z+.02,w*.06,h*.13,.015,4);
  b(0,h*.48,z+.01,.018,h*.2,.02,4);b(-w*.26,h*.7,z+.018,.025,h*.04,.02,2);return;}
 if(k===6){ // hoodie and backpack
  b(0,h*.77,-d*.24,w*.54,h*.05,d*.3,0);for(const s of [-1,1])b(s*w*.21,h*.66,z+.01,w*.07,h*.2,.02,2);
  b(0,h*.64,-d*.52,w*.64,h*.21,.22,2);b(0,h*.6,-d*.64,w*.44,h*.08,.04,2);return;}
 if(k!==6&&k!==4)b(0,h*.49,0,w*.8,h*.025,d*.78,4); // belt on work and office outfits
 if(k===3){b(0,h*.7,z,w*.22,h*.1,.02,7);b(0,h*.68,z+.012,w*.07,h*.13,.015,2);return;} // office shirt and tie
 if(k===2||k===5){b(0,h*.62,z+.005,w*.8,h*.02,.02,2);b(0,h*.58,z+.005,w*.8,h*.02,.02,2);return;} // work vest stripes
 if(k===7){b(0,h*.64,z+.005,w*.36,h*.07,.015,7);return;} // runner bib
 if(k===4){b(0,h*.64,z+.01,w*.4,h*.08,.04,1);b(0,h*.64,-d*.52,w*.64,h*.22,.3,1);} // astronaut chest and life-support packs
}
export function heroHuman(b,rod,[w,h,d,k],p,planted){
 const walk=p.walking??0;
 for(const s of [-1,1]){
  const ly=p.footLift===undefined?0:Math.max(0,s*p.footLift)*.12;let q=0,fx=s*w*.21,fz=s*walk*.2;
  if(p.footTwistR!==undefined){const [t,dx,dz]=planted(p,s);q=t;fx+=dx;fz+=dz;}
  const hip=[s*w*.17,h*.48,0],ankle=[fx,.15+ly,fz],at=o=>add([fx,ly,fz],ry(o,q)),L=BONES.leg*(h*.48-.15),knee=ikJoint(hip,ankle,L,L,KNEE_POLE);
  // thigh and shin overlap through the knee (near-equal widths): one smooth limb when straight, a round joint when bent
  rod(hip,past(hip,knee,w*.09),w*.2,1);rod(past(ankle,knee,w*.09),ankle,w*.194,1);
  b(...at([0,.1,.05]),w*.27,.13,d*.5,4,q,'y');b(...at([0,.035,.07]),w*.31,.07,d*.64,7,q,'y');
  const {shoulder:a,hand:c}=localArm('human',[w,h],s,p);
  const A=BONES.arm*span('human',w,h,s),el=ikJoint(a,c,A,A,ARM_POLE(s)),wrist=add(c,norm(sub(el,c)).map(v=>v*.07));
  const sh=[a[0]-s*w*.1,a[1]-h*.01,a[2]];rod(sh,past(sh,el,w*.07),w*.17,0);rod(past(wrist,el,w*.07),wrist,w*.165,0); // sloped shoulder; arm parts overlap through the elbow
  b(...c,w*.17,.15,.12,3);b(c[0]-s*w*.075,c[1]+.02,c[2]+.04,.05,.07,.05,3);
  if(s===1&&p.grip!==undefined)for(const j of [-1,1])b(c[0]+j*(.07-.035*p.grip),c[1]-.1,c[2]+.04,.045,.1,.07,3);
 }
 // one torso piece (no stacked rings); the lab coat runs down over the thighs
 // GPU-06 breathing (pose.breath 0..1): the chest rises by up to 1.5 % of its height; the waist stays put
 const br=1+.015*(p.breath??0);
 if(k===1)b(0,h*(.38+.195*br),0,w*.84,h*.39*br,d*.8,0);else{b(0,h*(.47+.15*br),0,w*.8,h*.3*br,d*.78,0);b(0,h*.49,0,w*.72,h*.06,d*.72,1);}
 rod([0,h*.75,0],[0,h*.81,0],w*.17,3);
 clothes(b,rod,w,h,d,k);
 const hw=w*.64,hd=d*.74,hy=h*.885,hh=h*.19,z0=hd/2;
 if(k===4){b(0,hy,0,hw*1.24,hh*1.2,hd*1.2,0);b(0,hy,hd*.6,hw*.92,hh*.72,.03,6);b(-hw*.22,hy+hh*.18,hd*.6+.02,hw*.16,hh*.08,.01,7,0,'z',true);return;}
 b(0,hy,0,hw,hh,hd,3);
 // GPU-06 face keys: gaze -1..1 (pupils look left/right), brow -1..1 (raise/lower), smile 0..1 (curvier mouth)
 const bl=p.blink??1,mw=p.mouthWidth??1,gz=(p.gaze??0)*w*.022,bw=p.brow??0,sm=p.smile??0;
 for(const s of [-1,1]){
  // eyes, pupils, cheeks and nose are deep enough to round into soft domes set into the face (front = z0 + bulge)
  const ex=s*w*.13,ey=h*.895,ew=w*.13,wide=1+.1*Math.max(0,bw),eh=h*.055*bl*wide,ez=z0+.012-ew/2,pw=w*.075,pz=z0+.02-pw/2;
  b(ex,ey,ez,ew,eh,ew,7,0,'z',false,0,F);
  b(ex+gz,ey-h*.003,pz,pw,h*.046*bl*wide,pw,4,0,'z',false,0,F);
  if(bl>.5)b(ex+gz+w*.02,ey+h*.012,z0+.022,w*.024,w*.024,.012,7,0,'z',true,0,F);
  b(ex,h*(.932+.01*bw),z0+.008,w*.13,h*.015,.024,1,s*(HERO_BROW[k]??0)-s*.12*bw,'z',false,0,F);
  b(s*(hw/2+.012),h*.88,0,.045,h*.06,hd*.22,3);
 }
 b(0,h*.872,z0+.015-.025,w*.06,h*.035,.05,3,0,'z',false,0,F);
 // mouth: a soft closed smile (centre and two raised corners, rose lip colour); speaking opens a rounded dark oval
 // with a tongue, both scaled by pose.mouth and pose.mouthWidth
 const R=w*.085*mw,step=.36*(1+.5*sm);for(let i=-1;i<=1;i++){const a=i*step;b(Math.sin(a)*R,h*.849+(1-Math.cos(a))*R,z0+.004-.01,R*.66*(1+.15*sm),h*.009,.02,8,a,'z',false,0,F);}
 if(p.mouth>0){const mh=h*(.012+.035*p.mouth),my=h*(.846-.016*p.mouth),ow=w*.1*mw;
  b(0,my,z0+.006-ow/2,ow,mh,ow,4,0,'z',false,0,F);b(0,my-mh*.25,z0+.004-w*.03,w*.06*mw,mh*.4,w*.06,8,0,'z',false,0,F);}
 hair(b,k,hw,hd,hy,hh,z0);
}
export function heroRobot(b,rod,[w,h,d,legs,kind],p,planted,mouthBias){
 const step=p.walking??0;
 const br=1+.012*(p.breath??0);b(0,h*(.32+.18*br),0,w,h*.36*br,d,0);b(0,h*.49,d*.5,w*.62,h*.17,.035,1);b(0,h*.53,d*.525,w*.36,h*.03,.02,2,0,'z',true);
 for(let i=0;i<3;i++)b(-w*.12+i*w*.12,h*.45,d*.525,w*.06,w*.06,.02,3);
 rod([0,h*.68,0],[0,h*.71,0],w*.3,1);
 if(legs){for(const s of [-1,1]){const ly=p.footLift===undefined?0:Math.max(0,s*p.footLift)*.1;let q=0,fx=s*w*.28,fz=s*step*.17;
  if(p.footTwistR!==undefined){const [t,dx,dz]=planted(p,s);q=t;fx+=dx;fz+=dz;}
  const hip=[s*w*.27,h*.36,0],ankle=[fx,.15+ly,fz],L=BONES.leg*(h*.36-.15),knee=ikJoint(hip,ankle,L,L,KNEE_POLE),at=o=>add([fx,ly,fz],ry(o,q));
  rod(hip,knee,w*.2,1);b(...knee,w*.24,w*.24,w*.24,1);rod(knee,ankle,w*.26,0);b(...at([0,.11,.12]),w*.4,.2,d*.7,0,q,'y');}}
 else{b(0,h*.17,0,w*1.13,h*.22,d*.95,1);b(0,h*.055,0,w*.9,.03,d*.75,2,0,'z',true);}
 for(const s of [-1,1]){const {shoulder:a,hand:c}=localArm('robot',[w,h],s,p),A=BONES.arm*span('robot',w,h,s),el=ikJoint(a,c,A,A,ARM_POLE(s));
  b(...a,w*.3,w*.3,w*.3,1);rod(a,el,w*.18,1);rod(el,c,w*.24,0);b(...c,w*.28,.17,.22,3);
  if(s===1&&p.grip!==undefined)for(const j of [-1,1])b(c[0]+j*(.09-.045*p.grip),c[1]-.12,c[2]+.05,.055,.13,.08,1);}
 b(0,h*.83,0,w*(1.08+kind*.035),h*.27,d*.96,3);b(0,h*.835,d*.49,w*.88,h*.19,.045,4);
 for(const s of [-1,1])b(s*w*.2+(p.gaze??0)*w*.03,h*.855,d*.52+.0175-w*.08,w*.16,h*.08*(p.blink??1)*(1+.12*Math.max(0,p.brow??0)),w*.16,2,0,'z',true);
 if(p.mouth!==undefined)b(0,h*.78,d*.52,w*.26*(p.mouthWidth??1),h*(.012+.03*p.mouth),.035,2,0,'z',true,mouthBias);
 if(kind%2===0){for(const s of [-1,1])b(s*w*(.56+kind*.0175),h*.83,0,.08,h*.12,h*.12,0);rod([0,h*.965,0],[0,h*1.07,0],.04,1);b(0,h*1.08,0,.12,.12,.12,2,0,'z',true);}
 else for(const s of [-1,1])b(s*w*.58,h*.85,0,.13,.27,d*.5,0);
 if(kind>=3)b(0,h*.45,-d*.58,w*.65,h*.32,.24,1);
}
