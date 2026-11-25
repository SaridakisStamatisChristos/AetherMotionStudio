import {generatedBounds} from '../foundry/generator.js';
import {surfacePoint,validateSurfaceRef} from './surface.js';
import {importedBounds} from '../foundry/import-bundle.js';
import {emitHeroBoxes,heroBounds} from '../foundry/hero.js';
import {smooth,clamp,keyframes,interpolate,mix} from './motion.js';
import {MOTION_PRESETS} from './presets.js';
import {add,sub,dot,cross,norm,ry} from '../visual/vectors.js';
import {catalogHandAnchor,recipeRig,recipeSpec} from '../visual/catalog-rig.js';
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
// ART-02: zoom ceiling raised 1550→2400 for authored telephoto product framing (validation widening only; auto-framing still clamps to 1550).
export const RIG_CAMERA_LIMITS={x:[-5,5],y:[1.8,6],z:[6,12],zoom:[700,2400]};
export function validateCameraRig(x,ids,p){
 fields(x,['preset','subject','subjects','framing','padding','targetOffset','strength','focus'],p,['preset']);
 choice(x.preset,Object.keys(CAMERA_RIGS),p+'.preset');
 if(x.subject!==undefined&&!ids.has(x.subject))fail(p+'.subject','unknown subject');
 if(x.framing!==undefined)choice(x.framing,['establishing','medium','close-up','group'],p+'.framing');
 // GEN-02 opt-in: framing 'group' fits the listed subjects (2–4 asset IDs, rest-pose bounds) into the vertical safe area.
 if((x.framing==='group')!==(x.subjects!==undefined))fail(p+'.subjects','framing group requires subjects (and only it)');
 if(x.subjects!==undefined){if(!Array.isArray(x.subjects)||x.subjects.length<2||x.subjects.length>4||new Set(x.subjects).size!==x.subjects.length)fail(p+'.subjects','2–4 distinct asset IDs required');for(const id of x.subjects)if(!ids.has(id))fail(p+'.subjects','unknown subject');if(x.subject!==undefined)fail(p+'.subjects','use subject or subjects, not both');}
 if(x.focus!==undefined){if(x.framing!=='group'||!Array.isArray(x.focus)||x.focus.length<1||x.focus.length>32)fail(p+'.focus','1–32 entries with framing group required');
  x.focus.forEach((f,k)=>{const q=p+'.focus['+k+']';fields(f,['at','subject','blend'],q,['at','subject','blend']);finite(f.at,0,1,q+'.at');finite(f.blend,.001,.5,q+'.blend');if(f.subject!==null&&!x.subjects.includes(f.subject))fail(q+'.subject','one of subjects or null required');if(k&&f.at<x.focus[k-1].at)fail(q+'.at','entries must be in time order');});}
 if(x.padding!==undefined)finite(x.padding,0,0.3,p+'.padding');
 if(x.strength!==undefined)finite(x.strength,0,1,p+'.strength');
 if(x.targetOffset!==undefined)vector(x.targetOffset,-.6,.6,p+'.targetOffset');
}
export function sampleCameraRig(x,p,tracks,modes={}){
 const r=CAMERA_RIGS[x.preset],t=smooth(p),position=lerp3(r.a,r.b,t),target=lerp3(r.ta,r.tb,t);
 if(x.preset==='orbit')position[2]+=1.2*Math.sin(Math.PI*t);
 for(const [i,k] of ['x','y','z'].entries())if(tracks[k])position[i]=interpolate(p,tracks[k],modes[k]??'ease');
 return {position,target,zoom:tracks.zoom?interpolate(p,tracks.zoom,modes.zoom??'ease'):mix(r.za,r.zb,t)};
}
export function geometryBounds(assets){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const a of assets){if(a.heroRevision||a.importBundle||a.generatedRef){const b=a.generatedRef?generatedBounds(a):a.importBundle?importedBounds(a):heroBounds(a);for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],b.lo[i]);hi[i]=Math.max(hi[i],b.hi[i]);}continue;}emitCinematicAsset(a,(c,s,color,tf=q=>q)=>{
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
   const q=tf(c.map((v,i)=>v+s[i]*[x,y,z][i]/2));q.forEach((v,i)=>{lo[i]=Math.min(lo[i],v);hi[i]=Math.max(hi[i],v)});
  }
 });}
 if(!lo.every(Number.isFinite)||!hi.every(Number.isFinite))return null;
 return {lo,hi,center:lerp3(lo,hi,.5)};
}
// GEN-02 'group': for 9:16 social video. Bounds of the subjects in rest pose (origin/scale/params only, so turning heads
// and arms never make the zoom breathe), target at their centre, zoom fitted in and out to the safe area between the
// heading and the captions (720×1280 reference: half-width 336, half-height 340 around the projection centre).
export const GROUP_FRAMING=Object.freeze({halfWidth:336,halfHeight:340,zoom:[700,2000],padding:.08});
// GEN-03 speaker follow: optional rig.focus [{at, subject|null, blend}] (generated at render by dialogueShot from the
// measured lines; see src/core/dialogue.js). Each entry eases (smoothstep over blend) from the current framing to one
// that shifts FOLLOW.shift of the way toward the subject and pushes in up to FOLLOW.push, never tighter than the
// subject's own fit. null returns to the group framing. Calm by construction: one move per qualifying line.
export const FOLLOW=Object.freeze({push:1.25,shift:.65,steps:13});
const restOf=(assets,ids)=>{const set=new Set(ids);return assets.filter(a=>set.has(a.id)).map(a=>({...a,pose:{origin:a.pose.origin,yaw:0,scale:a.pose.scale??1,...(a.pose.params?{params:a.pose.params}:{})}}));};
function fitZoom(b,desired,rig,tracks,strength){
 const G=GROUP_FRAMING;let fit=Infinity;
 for(const p of [0,.5,1]){const cam=sampleCameraRig(rig,p,tracks),tgt=add(cam.target,sub(desired,cam.target).map(v=>clamp(v,-2.4,2.4)*strength)),proj=createProjection(cam.position,tgt,1,[0,0]);let maxX=0,maxY=0;
  for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]]){const q=proj([x,y,z]);maxX=Math.max(maxX,Math.abs(q[0]));maxY=Math.max(maxY,Math.abs(q[1]));}
  fit=Math.min(fit,G.halfWidth/Math.max(maxX,1e-6),G.halfHeight/Math.max(maxY,1e-6));}
 return fit;
}
const isPerson=asset=>['human','robot'].includes(recipeSpec(asset)?.family);
// Box b mirrored about center (so a target at center keeps all of b on screen).
const around=(b,center)=>({lo:b.lo.map((v,i)=>Math.min(v,2*center[i]-b.hi[i])),hi:b.hi.map((v,i)=>Math.max(v,2*center[i]-b.lo[i]))});
// Best follow framing: over shifts 0..FOLLOW.shift toward the speaker, the largest zoom that keeps the speaker and every
// character fully in the safe area (and at most FOLLOW.push × the group zoom); ties keep the smaller shift (less motion).
function followGoal(base,sb,chars,rig,tracks,strength,pad){
 let best=base;
 for(let k=1;k<=FOLLOW.steps;k++){const center=lerp3(base.center,sb.center,FOLLOW.shift*k/FOLLOW.steps);
  let zoom=Math.min(base.zoom*FOLLOW.push,fitZoom(around(sb,center),center,rig,tracks,strength)*pad);
  if(chars)zoom=Math.min(zoom,fitZoom(around(chars,center),center,rig,tracks,strength)*pad);
  if(zoom>best.zoom+1e-6)best={center,zoom};}
 return best;
}
function frameGroup(camera,rig,assets,tracks,progress=null){
 const b=geometryBounds(restOf(assets,rig.subjects));if(!b)return camera;
 const strength=rig.strength??.85,G=GROUP_FRAMING,pad=1-(rig.padding??G.padding);
 // One zoom per shot: the tightest fit over the rig's start, middle and end camera, so the preset's dolly still reads
 // (fitting every frame cancelled it, a dolly-zoom warp) and nothing is cropped at its closest point.
 const base={center:add(b.center,rig.targetOffset??[0,0,0]),zoom:fitZoom(b,add(b.center,rig.targetOffset??[0,0,0]),rig,tracks,strength)*pad};
 let state=base;
 // Owner review of GEN-03 r2: "the camera move makes characters out of screen". Every character among the subjects
 // must stay fully inside the safe area during follow; set pieces may leave the frame.
 const chars=rig.focus&&progress!==null?geometryBounds(restOf(assets,rig.subjects.filter(id=>{const a=assets.find(x=>x.id===id);return a&&isPerson(a.asset);}))):null;
 if(rig.focus&&progress!==null)for(const f of rig.focus){if(progress<f.at)break;
  let goal=base;
  if(f.subject){const sb=geometryBounds(restOf(assets,[f.subject]));if(sb)goal=followGoal(base,sb,chars,rig,tracks,strength,pad);}
  // at 0: the shot opens on the subject (no move)
  const w=f.at<=0?1:smooth(clamp((progress-f.at)/f.blend,0,1));state={center:lerp3(state.center,goal.center,w),zoom:mix(state.zoom,goal.zoom,w)};
 }
 const c={...camera,target:add(camera.target,sub(state.center,camera.target).map(v=>clamp(v,-2.4,2.4)*strength))};
 let minZ=Infinity;{const proj=createProjection(c.position,c.target,1,[0,0]);for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]])minZ=Math.min(minZ,proj([x,y,z])[2]);}
 if(!tracks.zoom)c.zoom=clamp(state.zoom,G.zoom[0],G.zoom[1]);
 if(minZ<1.0&&!tracks.z)c.position=[c.position[0],c.position[1],Math.min(12,c.position[2]+(1-minZ))];
 return c;
}
export function frameCamera(camera,rig,assets,tracks={},progress=null){
 if(rig.framing==='group')return frameGroup(camera,rig,assets,tracks,progress);
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
  const q=p+'.actions['+i+']';fields(x,['name','start','end','speed','phase','weight','blend','mode','hold'],q,['name','start','end']);
  choice(x.name,Object.keys(ACTIONS),q+'.name');window(x,q);
  if(x.speed!==undefined)finite(x.speed,.25,8,q+'.speed');
  if(x.phase!==undefined)finite(x.phase,0,1,q+'.phase');
  if(x.weight!==undefined)finite(x.weight,0,1,q+'.weight');
  if(x.blend!==undefined)finite(x.blend,0,.5,q+'.blend');
  if(x.mode!==undefined)choice(x.mode,['once','loop','relative'],q+'.mode');
  if(x.hold!==undefined&&(x.hold!==true||x.mode==='loop'))fail(q+'.hold','hold must be true and is not allowed with loop');
  for(const ch of Object.keys(ACTIONS[x.name]))if(!channels.includes(ch))fail(q,'unsupported channel '+ch+' for '+a.asset);
 }
}
export function composePose(a,base,p,limits){
 const out={...base};
 for(const x of a.actions??[]){
  // hold (ART-01 opt-in): after the window the end pose persists instead of snapping back; blend fades in only.
  if(p<x.start||(p>x.end&&x.hold!==true))continue;
  const t=Math.min(1,(p-x.start)/(x.end-x.start)),raw=t*(x.speed??1)+(x.phase??0);
  const u=x.mode==='loop'?(raw%1):clamp(raw);
  const b=x.blend??0,weight=(x.weight??1)*(b?(x.hold===true?smooth(t/b):Math.min(smooth(t/b),smooth((1-t)/b))):1);
  for(const [ch,frames] of Object.entries(ACTIONS[x.name])){
   if(Object.hasOwn(a.tracks,ch))continue;
   const v=keyframes(u,frames),prior=out[ch]??0;
   out[ch]=clamp(x.mode==='relative'?prior+weight*(v-keyframes(0,frames)):mix(prior,v,weight),...limits[ch]);
  }
 }
 return out;
}
// ART-01: `attachment` is one window (historical) or an opt-in handoff chain of 2–4 sequential windows.
const attachmentWindows=x=>Array.isArray(x)?x:[x];
export function validateAttachments(assets,p){
 const byId=new Map(assets.map(a=>[a.id,a]));
 for(const a of assets){
  const raw=a.attachment;if(raw===undefined)continue;
  const q=p+'.'+a.id+'.attachment',chain=Array.isArray(raw),list=attachmentWindows(raw);
  if(chain&&(list.length<2||list.length>4))fail(q,'handoff chain requires 2–4 windows');
  list.forEach((x,i)=>{
   const r=chain?q+'['+i+']':q;fields(x,['parent','anchor','start','end','offset','blendIn','release'],r,['parent','anchor','start','end']);
   const parent=byId.get(x.parent);
   if(!parent||!recipeRig(parent.asset).anchors.includes('right-hand'))fail(r,'parent must have a supported hand rig');
   choice(x.anchor,['right-hand','left-hand'],r+'.anchor');window(x,r);
   // POLISH-02: offset 'auto' (first window only) keeps the prop exactly where it was relative to the hand at pickup.
   if(x.offset==='auto'){if(i>0)fail(r+'.offset','auto offset only on the first window');}else if(x.offset!==undefined)vector(x.offset,-1,1,r+'.offset');
   if(x.blendIn!==undefined)finite(x.blendIn,0,Math.min(.2,x.end-x.start),r+'.blendIn');
   if(i>0&&x.start<list[i-1].end)fail(r,'handoff windows must be sequential');
   if(x.release!==undefined){if(i!==list.length-1)fail(r+'.release','only the last window may release');validateRelease(x.release,x.end,r+'.release',byId,a.id);}
  });
  const seen=new Set(),stack=list.map(x=>x.parent);
  while(stack.length){const id=stack.pop();if(id===a.id)fail(q,'attachment cycle');if(seen.has(id))continue;seen.add(id);const b=byId.get(id);if(b?.attachment)stack.push(...attachmentWindows(b.attachment).map(x=>x.parent));}
 }
}
function validateRelease(x,end,q,byId,self){
 fields(x,['mode','duration','to'],q,['mode','duration']);choice(x.mode,['drop','place'],q+'.mode');finite(x.duration,.02,.5,q+'.duration');
 if(end+x.duration>1+1e-9)fail(q,'release must complete within the shot');
 if(x.mode==='place'){if(x.to&&typeof x.to==='object'&&!Array.isArray(x.to)){validateSurfaceRef(x.to,new Set(byId.keys()),self,q+'.to',fail);if(byId.get(x.to.surface).attachment)fail(q+'.to.surface','surface must not be attached');}else{vector(x.to,-2.4,2.4,q+'.to');finite(x.to[1],0,1.5,q+'.to');}}else if(x.to!==undefined)fail(q+'.to','drop lands on the floor; use place for a target');
}
export function resolveAttachments(authored,p,sample){
 const byId=new Map(authored.map(a=>[a.id,a]));
 // World pose of `a` held in window k at `time` (inside the window). Window 0 is the historical formula.
 function held(a,k,time){
  const ws=attachmentWindows(a.attachment),x=ws[k],parent=at(byId.get(x.parent),time);
  const anchor=handAnchor(parent.asset,parent.pose,x.anchor==='right-hand'?1:-1);
  if(x.offset==='auto'){
   // Grip as found: the prop's offset from the hand (in the holder's frame) and its yaw relative to the holder at pickup.
   const p0=at(byId.get(x.parent),x.start),h0=handAnchor(p0.asset,p0.pose,x.anchor==='right-hand'?1:-1),l0=sample(a,x.start).pose;
   const off=ry(l0.origin.map((v,i)=>v-h0[i]),-p0.pose.yaw);
   return {origin:add(anchor,ry(off.map(v=>v*parent.pose.scale/(p0.pose.scale??1)),parent.pose.yaw)),yaw:l0.yaw+parent.pose.yaw-p0.pose.yaw};
  }
  const offset=ry((x.offset??[0,0,0]).map(v=>v*parent.pose.scale),parent.pose.yaw),target=add(anchor,offset);
  const local=sample(a,time).pose,blend=x.blendIn?smooth(clamp((time-x.start)/x.blendIn)):1;
  if(k===0)return {origin:blend===1?target:lerp3(local.origin,target,blend),yaw:local.yaw+parent.pose.yaw*blend};
  // Handoff: the receiver grips the prop as handed over (world yaw kept), then it turns with the new holder.
  const from=held(a,k-1,ws[k-1].end),keep=from.yaw-at(byId.get(x.parent),x.start).pose.yaw;
  return {origin:blend===1?target:lerp3(from.origin,target,blend),yaw:mix(from.yaw,parent.pose.yaw+keep,blend)};
 }
 function at(a,t){
  const item=sample(a,t);if(a.attachment===undefined)return item;
  const ws=attachmentWindows(a.attachment);if(t<ws[0].start)return item;
  let k=0;for(let i=1;i<ws.length;i++)if(t>=ws[i].start)k=i;
  // World pose freezes at detach; no previous-frame dependency. Opt-in release drops or places it.
  const x=ws[k];let pose=held(a,k,Math.min(t,x.end));
  if(x.release&&t>x.end){const u=clamp((t-x.end)/x.release.duration);pose=x.release.mode==='drop'?{...pose,origin:[pose.origin[0],pose.origin[1]*(1-u*u),pose.origin[2]]}:{...pose,origin:lerp3(pose.origin,Array.isArray(x.release.to)?x.release.to:surfacePoint(sample(byId.get(x.release.to.surface),t),x.release.to.at),smooth(u))};}
  item.pose={...item.pose,...pose};
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
 if(a.importBundle||a.generatedRef){const b=a.generatedRef?generatedBounds(a):importedBounds(a);return box(b.center,b.hi.map((v,i)=>v-b.lo[i]),'#ffffff');}if(a.heroRevision)return emitHeroBoxes(a,box);
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
