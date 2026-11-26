import {localArm} from './catalog-rig.js';
import {partRole} from './crafted.js';
import {RECIPES} from './catalog-data.js';
import {add,sub,norm,cross,rx,ry,rz} from './vectors.js';
const PALETTES={teal:['#309b9b','#29475b','#b6fff2'],amber:['#cf943d','#67452d','#ffe1a0'],white:['#d9e0df','#677f8d','#8ee6f4'],orange:['#c16b3b','#4b3840','#ffe19b'],slate:['#62758b','#253344','#83d7ed'],lime:['#7eaa5a','#3c6342','#d5f49b'],blue:['#486ea9','#253854','#8ce9ff'],violet:['#9373bc','#433450','#d5bcff'],wood:['#b17c4b','#634334','#e8c18e'],red:['#bc544e','#60343f','#ffbd9d'],pine:['#4c8968','#355347','#a9d49b']};
const LEGACY={characters:['retro-robot'],technology:['energy-core'],everyday:['treasure-chest']};
const TAU=Math.PI*2;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x};
const recipes=Object.fromEntries(Object.entries(RECIPES).flatMap(([category,rows])=>rows.map(([id,family,args,palette])=>[id,{id,category,family,args,palette}])));
export const OBJECT_CATALOG=freeze(Object.entries(RECIPES).flatMap(([category,rows])=>[...(LEGACY[category]??[]).map(id=>({id,category,family:'legacy',configurable:false})),...rows.map(([id,family,args,palette])=>({id,category,family,configurable:true}))]));
export const RECIPE_IDS=Object.freeze(Object.keys(recipes));
export function validateAssetParams(id,params){
 if(!Object.hasOwn(recipes,id))throw Error('asset params unsupported for '+id);
 if(!params||typeof params!=='object'||Array.isArray(params))throw Error('params object required');
 for(const [k,v] of Object.entries(params)){if(['primary','secondary','accent'].includes(k)){if(typeof v!=='string'||!/^#[0-9a-fA-F]{6}$/.test(v))throw Error('invalid asset color: '+k);}
 else if(k==='detail'){if(v!==1&&v!==2&&v!==3)throw Error('invalid asset detail: '+v);if(v>=2&&recipes[id].family!=='human')throw Error('asset detail '+v+' unsupported for '+id);}
 else if(k==='reach'){if(typeof v!=='number'||!Number.isFinite(v)||v<1||v>2)throw Error('invalid asset reach: '+v);if(recipes[id].family!=='robot')throw Error('asset reach unsupported for '+id);}
 else if(['width','height','depth'].includes(k)){if(typeof v!=='number'||!Number.isFinite(v)||v<.7||v>1.3)throw Error('invalid asset dimension: '+k);}else throw Error('unknown asset param: '+k);}
 return params;
}
// GEN-15 step 2: every part also passes its material role (crafted.js partRole) as an extra argument; renderers
// without crafted-v2 ignore it, so legacy and crafted-v1 drawing stay identical.
function primitive(box,pose,palette,params={},family=null){
 const {origin=[0,0,0],yaw=0,scale=1}=pose,dimensions=[params.width??1,params.height??1,params.depth??1];
 const tf=p=>add(ry(p.map((v,i)=>v*scale*dimensions[i]),yaw),origin);
 const [primary,secondary,accent]=palette;
 const col=[params.primary??primary,params.secondary??secondary,params.accent??accent,'#e9ddd0','#162333','#8a6650','#7ebdd0'];
 // bias: CPU painter-sort depth bias only (Three ignores it); 0 for every legacy box.
 const b=(x,y,z,w,h,d,c=0,angle=0,axis='z',lit=false,bias=0)=>{
  const local=p=>tf(add((axis==='x'?rx:axis==='y'?ry:rz)(p,angle),[x,y,z]));
  box([0,0,0],[w,h,d],col[c],local,lit,bias,partRole(family,c,[w,h,d],lit));
 };
 const rod=(a,c,width,color=1,depth=width,lit=false)=>{
  const dx=c[0]-a[0],dy=c[1]-a[1],dz=c[2]-a[2],len=Math.hypot(dx,dy,dz);
  if(len<1e-7)return;
  const u=[dx/len,dy/len,dz/len],ref=Math.abs(u[1])>.95?[1,0,0]:[0,1,0],cross=(x,y)=>[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l)},right=norm(cross(ref,u)),forward=cross(right,u),mid=a.map((x,i)=>(x+c[i])/2);
  box([0,0,0],[width,len,depth],col[color],p=>tf(mid.map((v,i)=>v+right[i]*p[0]+u[i]*p[1]+forward[i]*p[2])),lit,0,partRole(family,color,[width,len,depth],lit));
 };
 const ring=(x,y,z,r,w,d,n=12,c=0,axis='z',phase=0)=>{for(let i=0;i<n;i++){const a=phase+(i+.5)*TAU/n,k=2*r*Math.tan(Math.PI/n)*1.03;if(axis==='y')b(x+r*Math.cos(a),y,z+r*Math.sin(a),k,d,w,c,-a-Math.PI/2,'y');else b(x+r*Math.cos(a),y+r*Math.sin(a),z,w,k,d,c,a,'z');}};
 // TALK-03 opt-in: the same builders with a local-space pre-transform (used to rotate the head about the neck).
 const headed=pre=>({
  b:(x,y,z,w,h,d,c=0,angle=0,axis='z',lit=false,bias=0)=>box([0,0,0],[w,h,d],col[c],p=>tf(pre(add((axis==='x'?rx:axis==='y'?ry:rz)(p,angle),[x,y,z]))),lit,bias,partRole(family,c,[w,h,d],lit)),
  rod:(a,c,width,color=1,depth=width,lit=false)=>{const dx=c[0]-a[0],dy=c[1]-a[1],dz=c[2]-a[2],len=Math.hypot(dx,dy,dz);if(len<1e-7)return;const u=[dx/len,dy/len,dz/len],ref=Math.abs(u[1])>.95?[1,0,0]:[0,1,0],right=norm(cross(ref,u)),forward=cross(right,u),mid=a.map((v,i)=>(v+c[i])/2);box([0,0,0],[width,len,depth],col[color],p=>tf(pre(mid.map((v,i)=>v+right[i]*p[0]+u[i]*p[1]+forward[i]*p[2]))),lit,0,partRole(family,color,[width,len,depth],lit));}
 });
 return {b,rod,ring,headed};
}
// POLISH-02 opt-in planted feet (turnSteps): per-foot yaw twist and local ankle offset from src/core/turnsteps.js
// (pose keys footTwist*/footDx*/footDz*, present only with turnSteps).
// TALK-03 opt-in head motion: with pose.nod (pitch, + = down) or pose.tilt (roll) present, boxes/rods in the head region
// (above `cut`, within |x| <= `half`) rotate about the neck `pivot`. Absent = the original builders (unchanged geometry).
// GEN-11 opt-in weight shift (pose.hip, roll in radians, present only with bodyLanguage.weight): everything above the
// hips (boxes whose centre and rod ends lie at or above hipY) leans about the ground point under the body, so the hips
// move over one foot; the feet stay planted and leg rods stretch from the planted foot to the moved hip. The head
// keeps its own nod/tilt on top. Absent = the original builders (unchanged geometry).
export const ROBOT_MOUTH_BIAS=.08;
function headRoute(P,b,rod,p,cut,half,pivot,hipY=Infinity){
 if(p.nod===undefined&&p.tilt===undefined&&p.hip===undefined)return [b,rod];
 const inHead=(x,y)=>y>=cut&&Math.abs(x)<=half;
 if(p.hip===undefined){const H=P.headed(v=>add(rz(rx(sub(v,pivot),p.nod??0),p.tilt??0),pivot));
  return [(x,y,...r)=>(inHead(x,y)?H.b:b)(x,y,...r),(a,c,...r)=>(inHead(a[0],a[1])&&inHead(c[0],c[1])?H.rod:rod)(a,c,...r)];}
 const B=v=>rz(v,p.hip),U=P.headed(B),up=y=>y>=hipY-1e-9;
 const H=p.nod===undefined&&p.tilt===undefined?U:P.headed(v=>B(add(rz(rx(sub(v,pivot),p.nod??0),p.tilt??0),pivot)));
 return [(x,y,...r)=>(inHead(x,y)?H.b:up(y)?U.b:b)(x,y,...r),
  (a,c,...r)=>inHead(a[0],a[1])&&inHead(c[0],c[1])?H.rod(a,c,...r):up(a[1])&&up(c[1])?U.rod(a,c,...r):rod(up(a[1])?B(a):a,up(c[1])?B(c):c,...r)];
}
const planted=(p,s)=>s===1?[p.footTwistR,p.footDxR,p.footDzR]:[p.footTwistL,p.footDxL,p.footDzL];
// POLISH-02 item 7 opt-in human detail 3 (extends detail 2): fingers + thumb along the arm, per-kind hair, brow tilt
// and clothing silhouettes. Absent or detail 1/2 = unchanged geometry.
const BROW={1:.12,2:-.1,3:.06,5:-.14,6:.1,7:-.06};
function fingers(rod,a,c,s,w){
 const dir=norm(sub(c,a)),lat=norm(cross(dir,Math.abs(dir[1])>.9?[0,0,1]:[0,1,0])),th=norm(cross(dir,lat)),at=(o,k)=>add(c,o.map(v=>v*k));
 for(const j of [-1,0,1]){const base=add(at(dir,.07),lat.map(v=>v*j*.04));rod(base,add(base,dir.map(v=>v*.07)),.032,3);}
 const tb=add(c,lat.map(v=>v*s*.06));rod(tb,add(tb,add(dir.map(v=>v*.03),th.map(v=>v*.05))),.032,3);
}
function detail3(b,w,h,d,k){
 if(k===1){b(0,h*.9,-d*.3,w*.6,h*.12,d*.12,1);b(w*.15,h*1.0,d*.1,w*.3,.05,d*.5,1);b(0,h*.43,0,w*1.05,h*.07,d*1.05,0);}
 if(k===2||k===5){b(0,h*1.0,0,w*.12,.04,d*.8,2);b(0,h*.47,0,w*1.03,.06,d*1.03,5);b(w*.3,h*.43,d*.4,w*.18,.1,.08,5);}
 if(k===3){b(-w*.08,h*.985,d*.3,w*.4,.05,d*.14,1);b(0,h*.9,-d*.3,w*.6,h*.1,d*.1,1);for(const s of [-1,1])b(s*w*.16,h*.74,d*.505,w*.12,h*.12,.02,4,s*.35,'z');}
 if(k===4)for(const s of [-1,1])b(s*w*.48,h*.8,0,w*.22,.08,d*.8,1);
 if(k===6){for(const s of [-1,1])b(s*w*.3,h*.89,-d*.05,w*.06,h*.16,d*.55,1);b(0,h*.88,-d*.33,w*.62,h*.16,d*.1,1);b(0,h*.81,-d*.42,w*.55,h*.07,d*.2,2);}
 if(k===7){b(0,h*.95,0,w*.64,.04,d*.76,2);b(0,h*.9,-d*.45,w*.12,h*.14,w*.12,1);b(0,h*.44,0,w*1.02,h*.06,d*1.02,1);}
}
const F={
 robot(P,[w,h,d,legs,kind],p){let {b,rod}=P;[b,rod]=headRoute(P,b,rod,p,h*.66,w*.62,[0,h*.7,0],h*.36);const step=p.walking??0,open=p.open??0;
 b(0,h*.5,0,w,h*.37,d,0);b(0,h*.52,d*.51,w*.62,h*.18,.04,1);b(0,h*.54,d*.54,w*.36,.045,.035,2,0,'z',true);
 if(legs){for(const s of [-1,1]){const ly=p.footLift===undefined?0:Math.max(0,s*p.footLift)*.1;
  if(p.footTwistR===undefined){rod([s*w*.27,h*.36,0],[s*w*.28,.13+ly,s*step*.17],w*.24,1);b(s*w*.28,.11+ly,.12+s*step*.17,w*.38,.22,d*.66,0);}
  else{const [q,dx,dz]=planted(p,s),fx=s*w*.28+dx,fz=s*step*.17+dz;rod([s*w*.27,h*.36,0],[fx,.13+ly,fz],w*.24,1);b(...add([fx,.11+ly,fz],ry([0,0,.12],q)),w*.38,.22,d*.66,0,q,'y');}}}
 else b(0,h*.17,0,w*1.13,h*.22,d*.95,1);
 for(const s of [-1,1]){const {shoulder:a,hand:c}=localArm('robot',[w,h],s,p);rod(a,c,w*.22,0);b(...c,w*.28,.18,.22,3);if(s===1&&p.grip!==undefined)for(const j of [-1,1])b(c[0]+j*(.09-.045*p.grip),c[1]-.12,c[2]+.05,.055,.13,.08,1);}
 b(0,h*.83,0,w*(1.05+kind*.035),h*.27,d*.96,3);b(0,h*.84,d*.49,w*.85,h*.17,.045,1);
 for(const s of [-1,1])b(s*w*.22,h*.85,d*.52,w*.14,h*.09*(p.blink??1),.035,2,0,'z',true);
 // TALK-01 opt-in mouth (pose.mouth 0..1, present only on a bound speaker): lit bar under the eyes that opens with speech.
 // GEN-10 opt-in pose.mouthWidth (estimated mouth shapes; absent = unchanged geometry) scales the bar width.
 // Owner-approved repair (2026-11-25): on CPU the bar sat low on the face panel and its average depth sorted it 1 cm
 // behind the panel, so the painter hid it (Three showed it). A CPU sort bias of 0.08 m keeps it in front; geometry
 // and Three are unchanged.
 if(p.mouth!==undefined)b(0,h*.775,d*.52,p.mouthWidth===undefined?w*.3:w*.3*p.mouthWidth,h*(.012+.03*p.mouth),.035,2,0,'z',true,ROBOT_MOUTH_BIAS);
 if(kind%2===0){rod([0,h*.97,0],[0,h*1.08,0],.045,1);b(0,h*1.08,0,.13,.13,.13,2,0,'z',true);}else for(const s of [-1,1])b(s*w*.58,h*.85,0,.13,.27,d*.5,0);
 if(kind>=3)b(0,h*.45,-d*.58,w*.65,h*.32,.24,1);
 },
 human(P,[w,h,d,k],p){let {b,rod}=P;[b,rod]=headRoute(P,b,rod,p,h*.84,w*.4,[0,h*.8,0],h*.48);const walk=p.walking??0,open=p.open??0;
 for(const s of [-1,1]){const z=s*walk*.2,ly=p.footLift===undefined?0:Math.max(0,s*p.footLift)*.12;
  if(p.footTwistR===undefined){rod([s*w*.22,h*.48,0],[s*w*.24,.13+ly,z],w*.25,1);b(s*w*.24,.09+ly,z+.09,w*.34,.18,d*.65,4);}
  else{const [q,dx,dz]=planted(p,s),fx=s*w*.24+dx,fz=z+dz;rod([s*w*.22,h*.48,0],[fx,.13+ly,fz],w*.25,1);b(...add([fx,.09+ly,fz],ry([0,0,.09],q)),w*.34,.18,d*.65,4,q,'y');}const {shoulder:a,hand:c}=localArm('human',[w,h],s,p);rod(a,c,w*.2,0);b(...c,w*.22,.16,.19,3);if(p.params?.detail===3&&!(s===1&&p.grip!==undefined))fingers(rod,a,c,s,w);if(s===1&&p.grip!==undefined)for(const j of [-1,1])b(c[0]+j*(.07-.035*p.grip),c[1]-.1,c[2]+.04,.045,.1,.07,3);}
 b(0,h*.64,0,w,h*.36,d,0);b(0,h*.89,0,w*.57,h*.19,d*.69,3);b(0,h*.96,0,w*.62,.13,d*.74,k===4?0:1);
 if([2,5].includes(k))b(0,h*.96,.08,w*.85,.14,d*.9,2);
 if(k===4){b(0,h*.89,d*.36,w*.49,.13,.045,6);b(0,h*.64,-d*.61,w*.68,h*.33,.3,1);}
 if(k===6)b(0,h*.65,-d*.61,w*.83,h*.33,.28,2);
 if(k===1||k===3)b(0,h*.66,d*.51,w*.1,h*.23,.03,2);
 if(k===7)b(0,h*.69,d*.51,w*.85,.11,.025,2);
 // ART-03 opt-in detail 2: front cues (face, ears, collar) so facing reads at a glance; absent = recipe v1 geometry.
 if(p.params?.detail===2||p.params?.detail===3){
  const z0=d*.69/2;
  if(k===4)b(-w*.12,h*.92,d*.36+.03,w*.1,h*.03,.02,6,0,'z',true);
  else{
   for(const s of [-1,1]){
    // TALK-03: human blink (pose.blink 0.1..1 scales the eye height; absent = unchanged).
    if(p.blink===undefined){b(s*w*.12,h*.905,z0+.012,w*.085,h*.032,.03,4);b(s*w*.12+w*.02,h*.912,z0+.03,w*.025,h*.011,.012,6,0,'z',true);}
    else{b(s*w*.12,h*.905,z0+.012,w*.085,h*.032*p.blink,.03,4);if(p.blink>.5)b(s*w*.12+w*.02,h*.912,z0+.03,w*.025,h*.011,.012,6,0,'z',true);}
    b(s*w*.12,h*.935,z0+.012,w*.11,h*.012,.028,1,p.params.detail===3?s*(BROW[k]??0):0);
    b(s*(w*.285+.015),h*.89,0,.05,h*.06,d*.14,3);
   }
   b(0,h*.885,z0+.03,w*.06,h*.035,.07,3);
   // TALK-01: the lip line stays; while speaking a dark inner mouth opens below it with pose.mouth (closed or absent =
   // unchanged geometry).
   // GEN-10 opt-in pose.mouthWidth: rounded lips draw a narrower lip line and inner mouth, wide ones a broader one.
   const mw=p.mouthWidth;
   b(0,h*.852,z0+.012,mw===undefined?w*.15:w*.15*mw,h*.012,.028,5);
   if(p.mouth>0)b(0,h*(.846-.0225*p.mouth),z0+.016,mw===undefined?w*.12:w*.12*mw,h*.045*p.mouth,.024,4);
  }
  b(0,h*.805,d*.505,w*.34,h*.03,.025,k===4?1:3);
  if([2,5,6].includes(k))for(let i=0;i<3;i++)b(0,h*(.75-.06*i),d*.51,w*.05,w*.05,.02,4);
 }
 if(p.params?.detail===3)detail3(b,w,h,d,k);
 },
 animal({b,rod},[l,h,d,tail,k],p){b(0,h*.57,0,l*.72,h*.36,d,0);b(l*.38,h*.8,0,l*.33,h*.31,d*.76,1);b(l*.53,h*.82,0,.15,.1,d*.62,2,0,'z',true);for(const x of [-1,1])for(const z of [-1,1])rod([x*l*.25,h*.48,z*d*.35],[x*l*.25+(p.walking??0)*x*.11,.06,z*d*.35],.13,1);rod([-l*.36,h*.64,0],[-l*.36-tail*.6,h*.95,0],.09,0);
 if(k===2){for(const z of [-1,1])b(l*.37,h*.99,z*d*.22,.16,.19,.13,0);}if(k===3)rod([l*.22,h*.6,0],[l*.4,h*.92,0],.26,0);if(k===4){for(const s of [-1,1])b(0,h*.67,s*d*.64,.42,.09,d*.86,2,0,'z');}},
 screen({b},[w,h,d,k]){let y=h*.58+(k===1?.28:0);if(k===2){b(0,.11,.31,w,.18,.92,1);for(let j=0;j<4;j++)for(let i=0;i<7;i++)b((i-3)*w*.12,.21,.05+j*.17,w*.085,.025,.11,3);y=h*.57+.23;}
 b(0,y,0,w,h,d,1);b(0,y,d*.51,w*.89,h*.84,.025,k===5?0:4);
 if(k!==5){for(let i=0;i<(k===6?6:3);i++){const z=d*.53,x=-w*.31+(i%3)*w*.3,yy=y+(i<3?.11:-.18),hh=h*(.13+.05*(i%3));b(x,yy,z,w*.19,hh,.027,2,0,'z',true);}}
 if(k===1){b(0,.16,0,w*.18,.32,d*.7,1);b(0,.055,.02,w*.6,.11,d+.25,0);}
 if(k===3){for(let i=0;i<4;i++)b(-w*.35+i*w*.23,y-h*.4,d*.54,.07,.07,.035,0);}
 if(k===4){b(0,.1,0,w*.56,.2,.14,0);b(0,h+.08,0,w*.56,.2,.14,0);}
 },
 rack({b},[w,h,d,n,k]){b(0,h/2,0,w,h,d,1);for(let i=0;i<n;i++){const y=h*(i+.5)/n;b(0,y,d*.51,w*.9,h/n*.82,.04,0);for(let j=0;j<2+k%3;j++)b(-w*.31+j*w*.17,y,d*.55,w*.08,.035,.025,2,0,'z',true);}for(const s of [-1,1])b(s*w*.47,h/2,d*.53,.045,h,.04,3);},
 antenna({b,rod},[w,h,d,n,a]){b(0,h/2,0,w,h,d,0);for(let i=0;i<n;i++){const x=(i-(n-1)/2)*w/Math.max(n,2);rod([x,h,-d*.33],[x*1.25,h+a,-d*.4],.065,1);b(x*1.25,h+a,-d*.4,.11,.1,.11,2,0,'z',true);}for(let i=0;i<4;i++)b((i-1.5)*w*.17,h*.45,d*.51,.055,.035,.025,2,0,'z',true);},
 dish({b,ring,rod},[w,h,n,d]){b(0,.11,0,w*.6,.22,d,1);rod([0,.2,0],[0,h*.57,0],.16,1);ring(0,h*.7,0,w*.46,.11,.12,n,0);for(let i=0;i<n;i++){const a=i*TAU/n;rod([Math.cos(a)*w*.42,h*.7+Math.sin(a)*w*.42,0],[0,h*.7,-.22],.085,0);}rod([0,h*.7,-.22],[0,h*.7,.37],.08,2);},
 panel({b},[w,h,n,m,k]){const z=k===0?.05:0;b(0,h*.58,0,w,h,.12,1);for(let i=0;i<n;i++)for(let j=0;j<m;j++)b((i-(n-1)/2)*w/n,h*.58+(j-(m-1)/2)*h/m,.075+z,w/n*.87,h/m*.88,.035,k===2?0:(i+j)%3===0?2:0,0,'z',k===3);if(k===0)b(0,.14,-.09,w*.13,.28,.28,1);if(k===2)b(w*.34,h*.58,.11,.07,.07,.09,2);},
 turbine({b,rod},[w,h,n,d],p){b(0,.11,0,w*.7,.22,.64,1);rod([0,.2,0],[0,h*.72,0],.18,0);b(0,h*.72,0,.29,.29,.38,1);for(let i=0;i<n;i++){const a=i*TAU/n+(p.pulse??0)*2;rod([0,h*.72,.24],[w*.5*Math.cos(a),h*.72+w*.5*Math.sin(a),.24],d,0,.12);}b(0,h*.72,.27,.22,.22,.18,2);},
 board({b},[w,h,d,n,k]){b(0,h/2,0,w,h,d,0);for(let i=0;i<n;i++){const x=(i-(n-1)/2)*w/n;b(x,h+.045,0,w/n*.68,.09,d*(.34+.04*(i%3)),1);b(x,h+.1,0,w/n*.45,.015,d*.22,2);for(const s of [-1,1])b(x,h+.016,s*d*.37,w/n*.18,.032,d*.22,3);}if(k===2)for(const s of [-1,1])b(s*w*.25,h+.13,0,.28,.09,.28,4);if(k===3)b(0,h+.09,-d*.38,w*.72,.1,.12,4);},
 device({b,ring},[w,h,d,k]){b(0,h/2,0,w,h,d,0);const z=d*.51;if([7,8,9].includes(k)){b(0,h*.49,z,w*.82,h*.67,.045,4);if(k===8)ring(0,h*.48,z+.04,Math.min(w,h)*.28,.075,.06,12,2);else b(0,h*.69,z+.04,w*.55,.045,.035,3);}else if(k===4||k===3){b(0,h+.04,0,w*.78,.08,d*.8,1);b(0,h*.56,z,w*.66,.12,.06,4);}else if(k===11){b(0,h*.58,z,w*.54,h*.48,.07,4);b(0,h*.36,z+.09,w*.3,.1,.16,3);}else if(k===10){for(const s of [-1,1])b(s*w*.21,h+.02,0,.1,.035,d*.68,4);}else{b(0,h*.56,z,w*.75,h*.24,.04,1);for(let i=0;i<2+k%4;i++)b(-w*.3+i*w*.6/(2+k%4),h*.57,z+.03,.05,.05,.025,2,0,'z',true);}
 if(k===12)b(0,h+.08,-d*.15,w*.64,.16,d*.38,1,-.12,'x');},
 camera({b,ring},[w,h,d,k]){b(0,h*.66,0,w,h*.68,d,1);const z=d*.52,rad=Math.min(w,h)*.3;b(0,h*.66,z+.12,rad*2,rad*2,.23,0);ring(0,h*.66,z+.26,rad*.75,.055,.04,10,2);b(0,h*.66,z+.25,rad*.95,rad*.95,.04,4);if(k===1||k===4)b(0,.13,-.1,w*.65,.26,.4,0);if(k===2||k===3)b(w*.2,h*1.05,0,w*.37,.15,d*.45,0);if(k===6)b(0,.19,0,w*.5,.38,d*.45,0);},
 frame({b,rod},[w,h,d,k],p){if(k===3){for(const s of [-1,1]){b(s*w*.43,h*.37,0,w*.25,h*.37,d,1);rod([s*w*.43,h*.55,0],[s*w*.25,h*.89,0],.1,0);}rod([-w*.25,h*.89,0],[w*.25,h*.89,0],.12,0);return;}
 if(k===6){for(const s of [-1,1])b(s*w*.34,h*.51,0,w*.29,h*.9,d,0);b(0,.13,0,w,.26,d,1);for(const s of [-1,1])b(s*w*.34,h*.93,0,w*.3,.16,d,2);return;}
 b(0,.1,0,w,.2,d,1);
 if(k===10){for(let i=0;i<5;i++)b(0,.25,(i-2)*d/5,w,.13,d*.14,0);return;}
 for(const x of [-1,1])for(const z of [-1,1])b(x*w*.44,h*.52,z*d*.43,.1,h*.88,.1,0);
 b(0,h*.97,0,w,.1,d,0);
 if(k===1||k===2){b(0,h*.52,0,w*.81,.095,d*.76,1);b((p.open??0)*w*.2,h*.72,0,.18,.3,.2,2);}
 else if(k===5||k===8){for(let i=0;i<5;i++)b((i-2)*w*.18,h*.47,d*.44,.11,h*.76,.13,3);b(0,h*1.03,0,w*1.06,.15,d,0);}
 else if(k===7){b(0,h*.55,0,w*.34,h*.38,d*.48,3);for(const s of [-1,1])b(s*w*.34,h*.55,0,w*.36,.12,d*.93,2);}
 else if(k===9){b(0,h*.62,0,w*.85,.08,d*.85,0);for(const s of [-1,1])b(s*w*.38,h*.72,0,.065,.3,d*.8,1);}
 },
 arm({b,rod},[w,h,d,k],p){b(0,.12,0,w*1.7,.24,d,1);const a=[0,.28,0],c=[-.23,h*.65,0],e=[.28+(p.open??0)*.26,h*.84,.1];rod(a,c,w*.45,0);rod(c,e,w*.32,0);b(...c,w*.58,w*.58,w*.58,1);b(...e,w*.48,w*.38,w*.45,2);for(const s of [-1,1])rod([e[0],e[1],s*w*.16],[e[0]+.24,e[1]-.17,s*w*(.26+(p.open??0)*.2)],.07,1);if(k===3)b(0,.27,0,w*1.4,.16,d*.85,2);},
 motor({b,ring},[w,h,d,n]){b(0,.1,0,w*1.2,.2,d*1.1,1);b(0,h*.6,0,w,h,d,0);for(let i=0;i<n;i++)b(0,h*.6,(i-(n-1)/2)*d/n,w*1.1,h*1.08,.045,1);ring(0,h*.6,d*.53,w*.36,.08,.07,n+4,2);b(0,h*.6,d*.65,.15,.15,.3,3);},
 furniture({b},[w,h,d,k]){const seat=k===7?h*.54:k===1||k===5||k===6?h*.49:h*.88;
 for(const x of [-1,1])for(const z of [-1,1])b(x*w*.39,seat*.47,z*d*.38,.12,seat*.94,.12,1);
 b(0,seat,0,w,.14,d,0);
 if([1,5,6,7].includes(k))b(0,h*.73,-d*.43,w,h*.43,.14,0);
 if(k===6){for(const s of [-1,1])b(s*w*.43,seat+.22,0,.18,.3,d*.85,0);b(0,seat+.12,0,w*.8,.18,d*.8,3);}
 if(k===4)b(w*.28,seat*.56,0,w*.34,seat*.62,d*.88,1);
 if(k===7){b(0,seat+.12,0,w*.94,.22,d*.9,3);b(0,seat+.27,-d*.25,w*.83,.13,d*.3,2);}
 },
 shelf({b},[w,h,d,n,k]){b(0,h*.5,-d*.44,w,h,.09,1);for(const s of [-1,1])b(s*w*.45,h/2,0,.1,h,d,0);for(let i=0;i<=n;i++)b(0,.06+i*(h-.12)/n,0,w,.11,d,0);if(k===1){for(let i=0;i<n;i++)for(let j=0;j<4;j++)b((j-1.5)*w*.19,h*(i+.38)/n,-.02,w*.13,h/n*.55,d*.63,(i+j)%3);}else for(let i=0;i<n;i++){b(0,h*(i+.5)/n,d*.49,w*.86,h/n*.86,.07,0);b(k===3?w*.25:0,h*(i+.5)/n,d*.55,.2,.045,.06,2);}},
 vessel({b,ring},[w,h,d,k]){if(k===10){for(let j=0;j<8;j++)ring(0,h*(j+.5)/8,0,w*.42,.14,h/8,10,0,'y');return;}
 b(0,h*.12,0,w*.79,h*.24,d*.79,0);for(let i=0;i<4;i++){const a=i*Math.PI/2;b(Math.cos(a)*w*.38,h*.52,Math.sin(a)*d*.38,.12,h*.82,w*.79,0,a,'y');}
 b(0,h*.42,0,w*.64,h*.4,d*.64,k===9?6:1);
 if([1,2,7].includes(k)){ring(w*.48,h*.56,0,h*.23,.08,.13,8,1);}
 if([1,3,4,8].includes(k)){b(0,h*.92,0,w*.84,h*.16,d*.84,1);b(0,h*1.04,0,w*.34,.12,d*.34,2);}
 if(k===1)rodUnused();
 function rodUnused(){b(-w*.52,h*.7,0,.24,.14,.18,0,.25);}
 },
 case({b,rod,ring},[w,h,d,k],p){b(0,h/2,0,w,h,d,0);b(0,h*.54,d*.51,w*.91,h*.08,.035,1);for(const s of [-1,1])b(s*w*.4,h*.51,d*.53,.08,h*.91,.045,1);if([1,2,3,4,7].includes(k)){rod([-w*.24,h,0],[-w*.24,h+.16,0],.065,1);rod([-w*.24,h+.16,0],[w*.24,h+.16,0],.065,1);rod([w*.24,h+.16,0],[w*.24,h,0],.065,1);}if(k===1)for(const s of [-1,1])b(s*w*.34,.08,0,.16,.16,d*.65,4);if(k===5)b(0,h*.74,d*.53,w*.7,.1,.06,4);if(k===6){ring(0,h*.56,d*.53,w*.24,.07,.07,10,2);b(0,h*.56,d*.6,.09,.29,.1,1);}if(k===8)b(0,h*.53,0,w*.18,h*1.01,d*1.01,3);},
 book({b},[w,h,d,k]){if(k===0){for(const s of [-1,1]){b(s*w*.24,h*.6,0,w*.49,h,d,1,s*.09);b(s*w*.24,h*1.15,0,w*.45,.045,d*.94,3,s*.09);}return;}let n=k===4?4:k===5?5:k===6?3:1;for(let i=0;i<n;i++){let y=h*(i+.5)/n;b(0,y,0,w,h/n*.92,d,0);b(0,y,d*.49,w*.88,h/n*.66,.035,3);b(-w*.47,y,0,.04,h/n*.94,d,1);if(k===3)b(0,y+h*.5,0,w*.23,.02,d*.2,2);}},
 tool({b},[w,h,d,k]){b(0,h*.42,0,w,h*.84,d,1);if(k===1){b(0,h*.88,0,w*.84,.18,d*.84,0);b(0,h*.98,0,w*.42,.09,d*.42,4);}else if(k===2){b(0,h*.91,0,w*2,.2,d*1.3,3);}else if(k===3)b(0,h*.89,0,w*3.4,.22,d*1.25,0);else if(k===4){for(const s of [-1,1])b(s*w*.7,h*.94,0,w*.65,.25,d,0,s*.2);}else if(k===5){b(0,h*.86,0,w*.55,.26,d*.55,3);}else if(k===6)b(0,h*.91,0,w*3.6,.35,d*.8,0);else b(0,h*.91,0,w*.72,.25,d*.72,2);},
 lamp({b,rod,ring},[w,h,d,k]){b(0,.08,0,w,.16,d,1);rod([0,.16,0],[0,h*.78,0],.08,0);if(k===2)rod([0,h*.62,0],[w*.38,h*.86,0],.075,1);b(k===2?w*.38:0,h*.82,0,w*.7,h*.22,d*.7,2,0,'z',true);ring(k===2?w*.38:0,h*.94,0,w*.4,.09,.07,8,0,'y');if(k===3)for(const s of [-1,1])b(s*w*.32,h*.67,0,.06,h*.45,d*.65,1);},
 dial({b,ring,rod},[w,h,d,n,k],p){const y=h*.6,rad=Math.min(w,h)*.43;ring(0,y,0,rad,.10,d,n,1);if(k!==2)b(0,y,-.02,w*.71,h*.7,d*.64,0);for(let i=0;i<n;i++){const a=i*TAU/n;b(rad*.82*Math.cos(a),y+rad*.82*Math.sin(a),d*.55,.055,.09,.04,2,a);}if(k===1||k===2){for(let i=0;i<Math.ceil(n*.62);i++){const a=i*TAU/n;b(rad*Math.cos(a),y+rad*Math.sin(a),.02,.14,rad*.45,d*.94,2,a);}}else{const a=(p.pulse??0)*1.2+.8;rod([0,y,d*.6],[rad*.73*Math.cos(a),y+rad*.73*Math.sin(a),d*.6],.04,2);}if(k===4)ring(0,y,d*.62,rad*.32,.08,.07,8,3);},
 building({b},[w,h,d,rows,cols,k]){b(0,h/2,0,w,h,d,0);b(0,.08,0,w*1.05,.16,d*1.05,1);for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const x=(i-(cols-1)/2)*w/cols,y=h*(j+.65)/rows;if(j===0&&i===Math.floor(cols/2))continue;b(x,y,d*.51,w/cols*.56,h/rows*.39,.04,2,0,'z',k===7);b(x,y,-d*.51,w/cols*.56,h/rows*.39,.04,2);}b(0,h*.16,d*.53,w*.18,h*.31,.05,1);
 if([1,8].includes(k)){for(const s of [-1,1])b(s*w*.24,h+.14,0,w*.59,.12,d*1.1,1,-s*.32);}else b(0,h+.06,0,w*1.05,.12,d*1.05,1);
 if(k===3)b(w*.33,h*1.12,-d*.25,.18,h*.3,.18,1);if(k===4){b(0,h*.91,d*.56,.22,.07,.05,3);b(0,h*.91,d*.57,.07,.22,.05,3);}if(k===6)b(0,h*.71,d*.66,w*1.03,.10,.31,2,-.12,'x');if(k===9)for(let j=0;j<rows;j++)b(0,h*(j+.8)/rows,d*.57,w*.91,.05,.06,1);},
 tower({b,ring,rod},[w,h,n,k]){for(let i=0;i<n;i++){const y=h*(i+.5)/n,ww=w*(1-.32*i/n);b(0,y,0,ww,h/n*.98,ww,k===1?i%2:0);}if(k===2)b(0,h*.88,0,w*1.45,h*.26,w*1.45,2);if(k===3)for(const s of [-1,1])rod([s*w*.45,h*.2,0],[0,h*1.06,0],.07,1);if(k===4)ring(0,h*.8,w*.51,w*.31,.06,.05,10,2);if(k===5)b(0,h*.87,0,w*1.3,h*.23,w*1.3,1);if(k===6){for(const s of [-1,1])b(s*w*.58,h*.2,0,w*.29,h*.34,w*.55,1,s*.18);b(0,h*1.03,0,w*.37,.18,w*.37,2);}},
 bridge({b,rod},[w,h,d,k]){b(0,h*.35,0,w,.12,d,0);for(const s of [-1,1]){b(s*w*.37,h*.16,0,.19,h*.32,d*.8,1);if(k!==3){b(s*w*.33,h*.65,0,.11,h*.7,d*.85,1);for(let i=0;i<4;i++)rod([s*w*.33,h,0],[s*w*.08*i,h*.39,0],.035,2);}}if(k===2)for(let i=0;i<7;i++){let x=(i-3)*w/8;b(x,h*.18+Math.sin((i+1)*Math.PI/8)*h*.17,0,w/8,.11,d,1);}if(k===4)for(const s of [-1,1])b(0,h*.44,s*d*.32,w,.05,.08,2);},
 arena({b},[w,h,d,k]){b(0,.09,0,w,.18,d,1);for(let i=0;i<k+2;i++){const ww=w*(1-i*.085),dd=d*(1-i*.085),y=h*(i+.5)/(k+2);for(const s of [-1,1]){b(s*ww*.45,y,0,ww*.1,h/(k+2),dd,0);b(0,y,s*dd*.45,ww*.8,h/(k+2),dd*.1,0);}}b(0,.19,0,w*.54,.05,d*.5,2);},
 tree({b,rod},[w,h,d,k]){rod([0,.05,0],[0,h*.68,0],w*.14,5);if(k===1){for(let i=0;i<5;i++){const t=(i+.5)/5;b(0,h*(.32+t*.64),0,w*(1-t*.83),h*.18,d*(1-t*.83),i%2===0?0:1);}}else if(k===3){for(let i=0;i<7;i++){let a=i*TAU/7;rod([0,h*.85,0],[Math.cos(a)*w*.53,h*.74,Math.sin(a)*d*.53],.12,0,.2);}}else{for(let i=0;i<6;i++){let a=i*TAU/6;b(Math.cos(a)*w*.25,h*(.6+.05*(i%3)),Math.sin(a)*d*.23,w*.48,h*.29,d*.48,i%3===0?2:0,a,'y');}b(0,h*.84,0,w*.55,h*.31,d*.54,0);}if(k===4)for(let i=0;i<4;i++)b(0,h*.13+i*h*.12,w*.073,w*.12,.04,.025,4);},
 plant({b,rod},[w,h,d,k]){b(0,.09,0,w*.48,.18,d*.48,1);const n=k===5?5:k===6?9:6;for(let i=0;i<n;i++){const a=i*TAU/n,rr=k===1?.24:.48,top=[Math.cos(a)*w*rr,h*(.54+.38*(i%3)/2),Math.sin(a)*d*rr];rod([0,.16,0],top,k===1?.16:.06,0,k===7?.15:.08);if(k===4||k===7)b(...top,w*.19,h*.17,d*.19,2);else b(...top,w*.23,h*.19,d*.22,0,a,'y');}if(k===1)b(0,h*.59,0,w*.28,h*.8,d*.32,0);},
 terrain({b},[w,h,d,k]){if(k===8){for(let i=0;i<4;i++)b(0,h*(i+.5)/4,0,w*(1-i*.18),h/4,d*(1-i*.15),i%2?2:0);return;}for(let i=0;i<5;i++){const t=i/5;b((i%2)*w*.06,h*(i+.5)/5,0,w*(1-t*.85),h/5,d*(1-t*.77),k===3&&i>2?3:k===5&&i===0?6:0);}if(k===6)for(let i=0;i<5;i++)b(0,h*(i+.5)/5,d*(.51-i*.075),w*.25,h/5,.09,2,0,'z',true);if(k===7)for(const s of [-1,1])b(s*w*.32,h*.38,0,w*.21,h*.68,d*.35,2,s*.25);},
 vehicle({b,ring},[w,h,l,k],p){const base=h*.25;b(0,base,0,w,h*.38,l,0);const cabL=k===5||k===12?l*.37:k===3?l*.48:l*.66,cz=k===5||k===12?l*.23:0;b(0,h*.62,cz,w*.82,h*.39,cabL,0);b(0,h*.66,cz+cabL*.51,w*.71,h*.22,.045,6);for(const s of [-1,1]){b(s*w*.42,h*.66,cz,.035,h*.22,cabL*.75,6);for(const z of [-1,1]){const x=s*w*.51,zz=z*l*.33;b(x,h*.18,zz,.16,h*.34,h*.34,4);b(x+s*.09,h*.18,zz,.04,h*.16,h*.16,3);b(s*w*.33,h*.28,z*l*.51,w*.19,.085,.035,2,0,'z',true);}}
 if([6,7,8,9,12,13,14].includes(k))b(0,h*.58,-l*.23,w*.84,h*.45,l*.47,1);
 if(k===8||k===9)b(0,h*1.02,0,w*.44,.095,.18,2,0,'z',true);
 if(k===11){for(const s of [-1,1])b(s*w*.22,h*.68,l*.48,.09,h*1.04,.09,1);b(0,.15,l*.74,w*.65,.08,l*.48,2);}
 if(k===10)b(0,h*.92,-l*.2,.11,.28,.11,1);},
 aircraft({b,rod},[w,h,l,k],p){if(k===4){b(0,h*.53,0,w*.3,h*.5,l*.3,0);for(const x of [-1,1])for(const z of [-1,1]){rod([0,h*.53,0],[x*w*.36,h*.53,z*l*.36],.07,1);b(x*w*.36,h*.57,z*l*.36,.3,.07,.3,1,(p.pulse??0)*2,'y');}return;}
 b(0,h*.48,0,w*.3,h*.63,l,0);b(0,h*.64,l*.25,w*.24,h*.23,l*.22,6);b(0,h*.42,-l*.35,w*.46,.07,l*.2,1);b(0,h*.76,-l*.4,.08,h*.42,l*.22,0);if(k===3){b(0,h*1.03,0,w,.045,.15,1,(p.pulse??0)*4,'y');}else{b(0,h*.42,0,w,.09,l*.3,0);for(const s of [-1,1])b(s*w*.28,h*.29,0,w*.13,h*.26,l*.28,1);}},
 boat({b,rod},[w,h,l,k]){b(0,.17,0,w,.33,l,0);b(0,.36,0,w*.81,.16,l*.82,1);if(k===1){rod([0,.4,0],[0,h,0],.07,1);for(let i=0;i<5;i++)b(0,h*(.36+i*.12),l*.1,l*.06,h*.12,l*(.48-i*.07),3);}else for(let i=0;i<4;i++)b(0,h*.57,(i-1.5)*l*.19,w*.75,h*.43,l*.17,i%3);},
 orbit({b,rod,ring},[w,h,n,m,k],p){const cy=h*.57;b(0,cy,0,w*.24,w*.24,w*.24,2,0,'z',true);for(let i=0;i<n;i++){let a=i*TAU/n;for(let j=0;j<m;j++){let t=j*TAU/m+(p.pulse??0)*.25;let pos=[w*.49*Math.cos(t),cy+w*.49*Math.sin(t)*Math.cos(a),w*.49*Math.sin(t)*Math.sin(a)];let q=[w*.49*Math.cos(t+TAU/m),cy+w*.49*Math.sin(t+TAU/m)*Math.cos(a),w*.49*Math.sin(t+TAU/m)*Math.sin(a)];rod(pos,q,.035,1);if(j===i% m||k===3&&j%3===0)b(...pos,w*.13,w*.13,w*.13,0);}}if(k===4)b(0,.08,0,w*.6,.16,w*.6,1);},
 molecule({b,rod},[w,h,n,k]){const cy=h*.57;b(0,cy,0,w*.29,w*.29,w*.29,0);for(let i=0;i<n-1;i++){const a=k===3?i*Math.PI:i*TAU/(n-1)+.5;const p=[w*.44*Math.cos(a),cy+h*.29*Math.sin(a),k===2?(i%2-.5)*.42:0];rod([0,cy,0],p,.075,1);b(...p,w*.2,w*.2,w*.2,2);}if(k===4)b(0,cy,0,w*.85,h*.31,.38,0);},
 helix({b,rod},[w,h,n,strands],p){for(let i=0;i<n;i++){let y=.12+i*(h-.16)/n,t=i*.6+(p.pulse??0)*.35;for(let s=0;s<strands;s++){let a=t+s*Math.PI;const pt=[w*.4*Math.cos(a),y,w*.4*Math.sin(a)];b(...pt,.15,.15,.15,s?2:0);if(i<n-1)rod(pt,[w*.4*Math.cos(a+.6),y+(h-.16)/n,w*.4*Math.sin(a+.6)],.065,s?2:0);}if(strands===2)rod([-w*.4*Math.cos(t),y,-w*.4*Math.sin(t)],[w*.4*Math.cos(t),y,w*.4*Math.sin(t)],.055,1);}},
 instrument({b,rod,ring},[w,h,d,k],p){b(0,.11,0,w,.22,d,1);if(k===3){for(let i=0;i<5;i++){b((i-2)*w*.17,h*.55,0,.1,h*.72,.1,2);b((i-2)*w*.17,h*.9,0,.12,.08,.12,3);}b(0,h*.45,0,w,.1,d,0);return;}
 if(k===2){b(0,h*.5,0,w*.85,h*.65,d*.82,0);ring(0,h*.84,0,w*.32,.08,.08,10,2,'y');return;}
 rod([0,.22,0],[0,h*.83,0],.14,0);
 if(k===1){rod([0,h*.78,0],[w*.32,h*.94,d*.15],.2,1);b(w*.2,h*.43,.1,w*.57,.09,d*.64,1);}
 if(k===4){b(0,h*.76,0,.17,h*.32,.17,1);b(0,h*.99,0,.12,.2,.12,2,0,'z',true);}
 if(k===5)rod([-w*.4,h*.72,-d*.25],[w*.43,h*.96,d*.3],.21,1,.21);
 if(k===6){rod([-w*.4,h*.9,0],[w*.4,h*.9,0],.09,1);let t=(p.pulse??0)*.45;rod([0,h*.9,0],[Math.sin(t)*h*.55,h*.9-Math.cos(t)*h*.55,0],.05,1);b(Math.sin(t)*h*.55,h*.9-Math.cos(t)*h*.55,0,.2,.2,.2,2);}
 if(k===7){rod([-w*.48,h*.76,0],[w*.48,h*.76,0],.08,1);for(const s of [-1,1]){rod([s*w*.4,h*.76,0],[s*w*.4,h*.39,0],.045,2);b(s*w*.4,h*.39,0,w*.28,.07,d*.5,2);}}},
 chart({b,rod},[w,h,d,k],p){b(0,.08,0,w,.16,d,1);rod([-w*.48,.17,0],[-w*.48,h*.96,0],.05,1);rod([-w*.48,.17,0],[w*.48,.17,0],.05,1);const n=k===9?9:k===12?12:6,pts=[];for(let i=0;i<n;i++){let x=(i-(n-1)/2)*w*.86/n,y=.22+h*(.24+.09*((i*7+k*3)%6));pts.push([x,y,.04]);if([4,5,6,8,9,10,11].includes(k)){let hh=y-.16,offset=k===10?i*h*.055:0;b(x,.16+offset+hh/2,0,w/n*.68,hh,d*.64,i%2);if(k===6)b(x,.16+offset+hh*.83,0,w/n*.68,hh*.32,d*.69,2);if(k===11)rod([x,.15,0],[x,y+.18,0],.035,2);}else if(k===12)b(x,y,0,.09,.09,.09,2);else if(k===2)rod([x,.25,0],[x+.16,y,0],.05,2);}
 if([1,3,7,13].includes(k))for(let i=1;i<pts.length;i++)rod(pts[i-1],pts[i],k===13?.095:.05,2);if(k===13)rod(pts.at(-1),[w*.46,h*.95,.04],.1,2);if(k===1)rod([-w*.48,.17,0],[-w*.48,.17,d],.05,2);},
 network({b,rod},[w,h,layers,n,k]){let cols=[];for(let i=0;i<layers;i++){const m=k===3?2**i:n;let col=[];for(let j=0;j<m;j++){let x=(i-(layers-1)/2)*w/Math.max(1,layers-1)*.83,y=.22+(j+1)*h/(m+1),z=0;col.push([x,y,z]);b(x,y,z,.15,.15,.15,i%2?2:0);}cols.push(col);}for(let i=1;i<cols.length;i++)for(let j=0;j<cols[i].length;j++){const prev=cols[i-1];if(k===1)for(const a of prev)rod(a,cols[i][j],.024,1);else rod(prev[j%prev.length],cols[i][j],.035,1);}},
};
export function emitRecipe(id,box,pose){
 const q=recipes[id];if(!Object.hasOwn(recipes,id))throw Error('Unknown recipe '+id);
 const params=pose.params??{};F[q.family](primitive(box,pose,PALETTES[q.palette],params,q.family),q.args,pose);
}
export const CATALOG_ASSETS=Object.freeze(Object.fromEntries(RECIPE_IDS.map(id=>[id,(box,pose)=>emitRecipe(id,box,pose)])));
