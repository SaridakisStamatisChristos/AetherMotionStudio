import {emitHeroBoxes,heroBounds} from '../foundry/hero.js';
import {smooth,clamp,keyframes,mix} from './motion.js';
import {MOTION_PRESETS} from './presets.js';
import {add,sub,dot,cross,norm,ry} from '../visual/vectors.js';
import {catalogHandAnchor,recipeRig} from '../visual/catalog-rig.js';
import {emitAsset,robotHandAnchor} from '../visual/assets.js';
import {createProjection} from '../visual/mesh.js';

const fail=(p,m)=>{throw Error(p+': '+m)};
export function fields(x,allowed,p,required=[]){if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');for(const k of Object.keys(x))if(!allowed.includes(k))fail(p+'.'+k,'unknown field');for(const k of required)if(!Object.hasOwn(x,k))fail(p+'.'+k,'required');}
export function finite(x,a,b,p){if(typeof x!=='number'||!Number.isFinite(x)||x<a||x>b)fail(p,'out of range');}
export function choice(x,values,p){if(!values.includes(x))fail(p,'unsupported value');}
export function literal(x,max,p){if(typeof x!=='string'||!x.trim()||x.length>max||/[\u0000-\u001f\u007f]/.test(x))fail(p,'invalid text');}
const vector=(v,min,max,p)=>{if(!Array.isArray(v)||v.length!==3)fail(p,'3-vector required');v.forEach(x=>finite(x,min,max,p));};
const window=(x,p)=>{finite(x.start,0,1,p+'.start');finite(x.end,0,1,p+'.end');if(x.start>=x.end)fail(p,'invalid window');};
const lerp3=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
// Camera presets are absolute paths relative to the legacy stage. Explicit tracks override.
const rig=(a,b,za,zb,ta=[0,1.2,0],tb=ta)=>({a,b,za,zb,ta,tb});
export const CAMERA_RIGS=Object.freeze({
 'dolly-in':rig([1.5,3.2,10],[.5,2.8,7.1],1050,1130),
 'dolly-out':rig([.5,2.8,7.1],[1.5,3.2,10],1130,1050),
 'lateral-tracking':rig([-3.5,3,9],[3.5,3,9],1120,1120),
 orbit:rig([-4.5,3.5,8],[4.5,3.5,8],1100,1100),
 crane:rig([1.4,5.5,10],[1.4,2.5,8],1080,1160),
 pedestal:rig([1.8,2.1,9],[1.8,4.5,9],1100,1100),
 pan:rig([1.8,3.4,9],[1.8,3.4,9],1100,1100,[-1,1.2,0],[1,1.2,0]),
 tilt:rig([1.8,3.4,9],[1.8,3.4,9],1100,1100,[0,.5,0],[0,1.8,0]),
 'push-in':rig([0,3,9],[0,2.6,7.5],950,1350),
 'pull-back':rig([0,2.6,7.5],[0,3,9],1350,950),
 reveal:rig([-4,4,10],[.8,3,8],1050,1200),
 'rack-focus':rig([1.6,3.2,8.5],[1.6,3.2,8.5],1100,1100,[-.7,1.1,0],[.7,1.3,0]),
 establishing:rig([2.5,4.3,11],[1.8,4,10],850,900),
 medium:rig([1.4,3.1,8.8],[.8,3,8.2],1100,1150),
 'close-up':rig([.9,2.8,7],[.5,2.6,6.5],1350,1450)
});
export const RIG_CAMERA_LIMITS={x:[-5,5],y:[1.8,6],z:[6,12],zoom:[700,1550]};
export function validateCameraRig(x,ids,p){
 fields(x,['preset','subject','framing','padding','targetOffset','strength'],p,['preset']);
 choice(x.preset,Object.keys(CAMERA_RIGS),p+'.preset');
 if(x.subject!==undefined&&!ids.has(x.subject))fail(p+'.subject','unknown subject');
 if(x.framing!==undefined)choice(x.framing,['establishing','medium','close-up'],p+'.framing');
 if(x.padding!==undefined)finite(x.padding,0,0.3,p+'.padding');
 if(x.strength!==undefined)finite(x.strength,0,1,p+'.strength');
 if(x.targetOffset!==undefined)vector(x.targetOffset,-.6,.6,p+'.targetOffset');
}
export function sampleCameraRig(x,p,tracks){
 const r=CAMERA_RIGS[x.preset],t=smooth(p),position=lerp3(r.a,r.b,t),target=lerp3(r.ta,r.tb,t);
 if(x.preset==='orbit')position[2]+=1.2*Math.sin(Math.PI*t);
 for(const [i,k] of ['x','y','z'].entries())if(tracks[k])position[i]=keyframes(p,tracks[k]);
 return {position,target,zoom:tracks.zoom?keyframes(p,tracks.zoom):mix(r.za,r.zb,t)};
}
export function geometryBounds(assets){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const a of assets){if(a.heroRevision){const b=heroBounds(a);for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],b.lo[i]);hi[i]=Math.max(hi[i],b.hi[i]);}continue;}emitCinematicAsset(a,(c,s,color,tf=q=>q)=>{
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
   const q=tf(c.map((v,i)=>v+s[i]*[x,y,z][i]/2));q.forEach((v,i)=>{lo[i]=Math.min(lo[i],v);hi[i]=Math.max(hi[i],v)});
  }
 });}
 if(!lo.every(Number.isFinite)||!hi.every(Number.isFinite))return null;
 return {lo,hi,center:lerp3(lo,hi,.5)};
}
export function frameCamera(camera,rig,assets,tracks={}){
 if(!rig.subject&&!rig.framing)return camera;
 const b=geometryBounds(rig.subject?assets.filter(a=>a.id===rig.subject):assets);if(!b)return camera;
 const strength=rig.strength??.85,offset=rig.targetOffset??[0,0,0];
 const desired=add(b.center,offset),delta=sub(desired,camera.target);
 // Bounded correction; explicit authored position tracks remain authoritative.
 const target=add(camera.target,delta.map(v=>clamp(v,-2.4,2.4)*strength));
 const c={...camera,target};
 const proj=createProjection(c.position,c.target,1,[0,0]);
 let maxX=0,maxY=0,minZ=Infinity;
 for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]]){
  const q=proj([x,y,z]);maxX=Math.max(maxX,Math.abs(q[0]));maxY=Math.max(maxY,Math.abs(q[1]));minZ=Math.min(minZ,q[2]);
 }
 const size={establishing:.78,medium:.95,'close-up':1.1}[rig.framing??'medium']*(1-(rig.padding??.08));
 if(!tracks.zoom)c.zoom=Math.min(c.zoom,Math.max(700,Math.min(1550,size*290/Math.max(maxX,1e-6),size*280/Math.max(maxY,1e-6))));
 // Never move the near plane through the subject. This is a bounded heuristic, not collision simulation.
 if(minZ<1.0&&!tracks.z)c.position=[c.position[0],c.position[1],Math.min(12,c.position[2]+(1-minZ))];
 return c;
}

const k=(...pairs)=>pairs;
const actions={
 idle:{scale:k([0,1],[.5,1.025],[1,1])},
 walk:{walking:k([0,0],[.25,1],[.5,0],[.75,-1],[1,0])},
 run:{walking:k([0,0],[.25,1],[.5,0],[.75,-1],[1,0]),y:k([0,0],[.5,.13],[1,0])},
 point:{armPitch:k([0,0],[.25,-1.3],[.8,-1.3],[1,0]),armSpread:k([0,0],[.25,.18],[.8,.18],[1,0])},
 wave:{armPitch:k([0,0],[.2,-2.45],[.8,-2.45],[1,0]),armSpread:k([0,0],[.2,.65],[.35,.15],[.5,.65],[.65,.15],[.8,.65],[1,0])},
 'look-at':{headYaw:k([0,0],[.35,.65],[.8,.65],[1,0])},
 reach:{armPitch:k([0,0],[.5,-1.15],[1,-1.15])},
 grasp:{grip:k([0,0],[1,1])},
 release:{grip:k([0,1],[1,0])},
 inspect:{headYaw:k([0,0],[.3,-.55],[.7,.55],[1,0]),headRoll:k([0,0],[.5,.22],[1,0])},
 carry:{armPitch:k([0,-.9],[1,-.9]),grip:k([0,1],[1,1])}
};
export const ACTIONS=Object.freeze({...MOTION_PRESETS,...actions});
export function supportedChannels(asset){return recipeRig(asset).channels;}
export function handAnchor(asset,pose,side=1){return asset==='retro-robot'?robotHandAnchor(pose,side):catalogHandAnchor(asset,pose,side);}
export function validateActions(a,p){
 if(!Array.isArray(a.actions)||a.actions.length<1||a.actions.length>16)fail(p+'.actions','1–16 actions required');
 const channels=supportedChannels(a.asset);
 for(const [i,x] of a.actions.entries()){
  const q=p+'.actions['+i+']';fields(x,['name','start','end','speed','phase','weight','blend','mode'],q,['name','start','end']);
  choice(x.name,Object.keys(ACTIONS),q+'.name');window(x,q);
  if(x.speed!==undefined)finite(x.speed,.25,8,q+'.speed');
  if(x.phase!==undefined)finite(x.phase,0,1,q+'.phase');
  if(x.weight!==undefined)finite(x.weight,0,1,q+'.weight');
  if(x.blend!==undefined)finite(x.blend,0,.5,q+'.blend');
  if(x.mode!==undefined)choice(x.mode,['once','loop','relative'],q+'.mode');
  for(const ch of Object.keys(ACTIONS[x.name]))if(!channels.includes(ch))fail(q,'unsupported channel '+ch+' for '+a.asset);
 }
}
export function composePose(a,base,p,limits){
 const out={...base};
 for(const x of a.actions??[]){
  if(p<x.start||p>x.end)continue;
  const t=(p-x.start)/(x.end-x.start),raw=t*(x.speed??1)+(x.phase??0);
  const u=x.mode==='loop'?(raw%1):clamp(raw);
  const b=x.blend??0,weight=(x.weight??1)*(b?Math.min(smooth(t/b),smooth((1-t)/b)):1);
  for(const [ch,frames] of Object.entries(ACTIONS[x.name])){
   if(Object.hasOwn(a.tracks,ch))continue;
   const v=keyframes(u,frames),prior=out[ch]??0;
   out[ch]=clamp(x.mode==='relative'?prior+weight*(v-keyframes(0,frames)):mix(prior,v,weight),...limits[ch]);
  }
 }
 return out;
}
export function validateAttachments(assets,p){
 const byId=new Map(assets.map(a=>[a.id,a]));
 for(const a of assets){
  const x=a.attachment;if(x===undefined)continue;
  const q=p+'.'+a.id+'.attachment';fields(x,['parent','anchor','start','end','offset','blendIn'],q,['parent','anchor','start','end']);
  const parent=byId.get(x.parent);
  if(!parent||!recipeRig(parent.asset).anchors.includes('right-hand'))fail(q,'parent must have a supported hand rig');
  choice(x.anchor,['right-hand','left-hand'],q+'.anchor');window(x,q);
  if(x.offset!==undefined)vector(x.offset,-1,1,q+'.offset');
  if(x.blendIn!==undefined)finite(x.blendIn,0,Math.min(.2,x.end-x.start),q+'.blendIn');
  const seen=new Set([a.id]);let at=parent;
  while(at){if(seen.has(at.id))fail(q,'attachment cycle');seen.add(at.id);at=at.attachment?byId.get(at.attachment.parent):null;}
 }
}
export function resolveAttachments(authored,p,sample){
 const byId=new Map(authored.map(a=>[a.id,a]));
 function at(a,t){
  const item=sample(a,t),x=a.attachment;
  if(!x||t<x.start)return item;
  const time=Math.min(t,x.end),parent=at(byId.get(x.parent),time);
  const anchor=handAnchor(parent.asset,parent.pose,x.anchor==='right-hand'?1:-1);
  const offset=ry((x.offset??[0,0,0]).map(v=>v*parent.pose.scale),parent.pose.yaw);
  // World pose freezes at detach; no previous-frame dependency.
  const local=sample(a,time).pose;
  const blend=x.blendIn?smooth(clamp((time-x.start)/x.blendIn)):1;
  item.pose={...item.pose,origin:blend===1?add(anchor,offset):lerp3(local.origin,add(anchor,offset),blend),yaw:local.yaw+parent.pose.yaw*blend};
  return item;
 }
 return authored.map(a=>at(a,p));
}
export function validateAssembly(a,p){
 const x=a.assembly;fields(x,['type','start','end','distance','color'],p,['type','start','end']);window(x,p);
 choice(x.type,['reveal','assemble','disassemble','explode','implode','highlight'],p+'.type');
 // Stable emitted component order is guaranteed for this static panel recipe.
 if(a.asset!=='solar-panel')fail(p,'component animation currently supports solar-panel only');
 if(x.distance!==undefined)finite(x.distance,0,1.5,p+'.distance');
 if(x.color!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(x.color))fail(p+'.color','hex color required');
}
export function emitCinematicAsset(a,box){
 if(a.heroRevision)return emitHeroBoxes(a,box);
 const x=a.assembly;
 if(!x)return emitAsset(a.asset,box,a.pose);
 const t=smooth(clamp((a.progress-x.start)/(x.end-x.start))),parts=[];
 emitAsset(a.asset,(...args)=>parts.push(args),a.pose);
 parts.forEach(([center,size,color,tf=q=>q,lit=false,bias=0],i)=>{
  if(x.type==='reveal'&&i>0&&i/parts.length>t)return;
  let amount=0;
  if(['assemble','implode'].includes(x.type))amount=1-t;
  if(['disassemble','explode'].includes(x.type))amount=t;
  const o=tf(center),axis=sub(o,add(a.pose.origin,[0,.6*a.pose.scale,0])),shift=norm(axis).map(v=>v*amount*(x.distance??.7)*a.pose.scale);
  const highlight=x.type==='highlight'&&Math.min(parts.length-1,Math.floor(t*parts.length))===i;
  box(center,size,highlight?(x.color??'#fff0ad'):color,q=>add(tf(q),shift),lit||highlight,bias);
 });
}
export const LAYERED_ENVIRONMENTS=Object.freeze(['solar-field','city-dusk','energy-hub']);
export function emitEnvironment(state,box){
 const env=state.layers;if(!env)return;
 const palette={'solar-field':['#43555a','#314c58','#6b7562'],'city-dusk':['#303f58','#405473','#526878'],'energy-hub':['#364b55','#3b5668','#52717b']}[env];
 // True world-depth parallax; separate from subject framing and never changes authored assets.
 for(let i=0;i<5;i++)box([(i-2)*2.6,1.2+(i%3)*.38,-5.5],[1.8,2.4+(i%3)*.76,.8],palette[i%3]);
 for(let i=0;i<4;i++)box([(i-1.5)*3.1,.16,-2.7],[2.4,.32,.45],palette[2]);
 for(const side of [-1,1])box([side*4.5,.45,1.7],[.35,.9,.35],palette[1]);
}
