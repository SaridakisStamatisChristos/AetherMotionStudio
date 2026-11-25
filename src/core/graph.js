import {validateHeroPin} from '../foundry/packs.js';
import {GENERATED_PROFILE,GENERATED_ID,resolveGenerated} from '../foundry/generator.js';
import {IMPORT_PROFILE,IMPORT_ID,compileBundle} from '../foundry/import-bundle.js';
import {HERO_PROFILE,HERO_IDS,HERO_REGISTRY,HERO_NEW_IDS} from '../foundry/hero.js';
import {LOD_PROFILE,LOD_SUPPORTED} from '../foundry/lod-meshes.js';
import {planLOD,validateLODPolicy,enforceBudget,resourceUsage} from '../foundry/lod-policy.js';
import {validateMaterialProfile} from '../foundry/materials.js';
import {PROFILE,SUPPORTED,meshCommands} from '../foundry/instances.js';
import {supportedChannels,RIG_CAMERA_LIMITS,validateCameraRig,sampleCameraRig,frameCamera,validateActions,composePose,validateAttachments,resolveAttachments,validateAssembly,emitCinematicAsset,LAYERED_ENVIRONMENTS,emitEnvironment} from './cinematography.js';
import {validateOverlays} from './overlays.js';
import {validateAssetParams} from '../visual/catalog.js';
import {recipeSpec} from '../visual/catalog-rig.js';
import {locomote,validateLocomotion} from './locomotion.js';
import {validateAim,applyAim} from './aim.js';
import {validateTurnSteps,turnSteps} from './turnsteps.js';
import {surfacePoint,validateSurfaceRef} from './surface.js';
import {MOTION_PRESETS,resolveTracks,resolveEffect} from './presets.js';
import {ASSETS,emitAsset} from '../visual/assets.js';
import {interpolate,INTERPOLATIONS,smooth,clamp,mix} from './motion.js';
import {validateFidelity,fidelity} from './fidelity.js';
const limits=Object.freeze({x:[-2.4,2.4],y:[0,.7],z:[-1.2,1.2],yaw:[-8,8],scale:[.5,1.25],walking:[-1,1],open:[0,1],headRoll:[-.5,.5],headYaw:[-.8,.8],blink:[.1,1],pulse:[-1,1],armPitch:[-2.8,1],armSpread:[-.4,.9],grip:[0,1],leftArmPitch:[-2.8,1],leftArmSpread:[-.4,.9]});
const defaults=Object.freeze({x:0,y:0,z:0,yaw:0,scale:1,walking:0,open:0,headRoll:0,headYaw:0,blink:1,pulse:0});
// ART-03 opt-in left-arm channels (catalog human/robot rigs only; recipeRig channel lists unchanged).
export const LEFT_ARM=Object.freeze(['leftArmPitch','leftArmSpread']);
const leftArmRig=id=>id!=='retro-robot'&&['human','robot'].includes(recipeSpec(id)?.family);
export const LIGHTING_PROFILES=Object.freeze(['parity-v1']);
const cameraLimits={x:[-3.5,3.5],y:[2.5,4.5],z:[7,11],zoom:[850,1350]};
const cameraDefaults={x:1.8,y:3.5,z:8.4,zoom:1100};
const fail=(p,m)=>{throw Error(p+': '+m)};
function object(x,keys,p,required=keys){if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');for(const k of Object.keys(x))if(!keys.includes(k))fail(p+'.'+k,'unknown field');for(const k of required)if(!Object.hasOwn(x,k))fail(p+'.'+k,'required');}
function text(x,p,max){if(typeof x!=='string'||!x.trim()||x.length>max||/[\u0000-\u001f\u007f]/.test(x))fail(p,'invalid text');}
function number(x,min,max,p){if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)fail(p,'out of range');}
function tracks(x,bounds,p){object(x,Object.keys(bounds),p,[]);for(const [k,v] of Object.entries(x)){if(!Array.isArray(v)||v.length<1||v.length>24)fail(p+'.'+k,'1–24 keyframes required');let prev=-1;for(const a of v){if(!Array.isArray(a)||a.length!==2)fail(p+'.'+k,'expected [progress,value]');number(a[0],0,1,p+'.'+k);number(a[1],...bounds[k],p+'.'+k);if(a[0]<=prev)fail(p+'.'+k,'strictly ordered keyframes required');prev=a[0];}}}
export function validateGraph(s,p='shot'){
 if(Object.hasOwn(s,'fidelity'))validateFidelity(s.fidelity,p+'.fidelity');
 if(!['cpu','three'].includes(s.backend))fail(p+'.backend','cpu or three required');
 text(s.heading,p+'.heading',42);text(s.subheading,p+'.subheading',64);
 if(!['laboratory','midnight','amber'].includes(s.environment))fail(p+'.environment','unknown environment');
 tracks(s.camera,s.cameraRig?RIG_CAMERA_LIMITS:cameraLimits,p+'.camera');
 // ART-02 opt-in lighting profile; absent = historical look on both backends.
 if(Object.hasOwn(s,'lighting')&&!LIGHTING_PROFILES.includes(s.lighting))fail(p+'.lighting','unknown lighting profile');
 if(Object.hasOwn(s,'cameraInterpolation'))interpolationMap(s.cameraInterpolation,s.camera,p+'.cameraInterpolation');
 if(!Array.isArray(s.assets)||s.assets.length<1||s.assets.length>8)fail(p+'.assets','1–8 assets required');
 const ids=new Set();
 for(const [i,a] of s.assets.entries()){const q=p+'.assets['+i+']';object(a,['id','asset','tracks','params','motion','actions','attachment','assembly','identity','variant','identityPose','importBundle','generatedRef','heroPin','interpolation','face','locomotion','aim','turnSteps','restOn'],q,['id','asset','tracks']);if(typeof a.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,31}$/.test(a.id)||ids.has(a.id))fail(q+'.id','unique safe ID required');ids.add(a.id);if(Object.hasOwn(a,'heroPin')){if(![HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile)||!HERO_IDS.includes(a.asset))fail(q,'hero pin requires premium profile');validateHeroPin(a.asset,a.heroPin);}if(a.asset===GENERATED_ID){if(s.geometryProfile!==GENERATED_PROFILE||!a.generatedRef)fail(q,'generated reference required');resolveGenerated(a.generatedRef);if(a.params||a.assembly||a.identity||a.attachment||a.actions||a.motion||a.variant||a.identityPose||Object.keys(a.tracks).some(k=>!['x','y','z','yaw','scale'].includes(k)))fail(q,'generated mesh supports root animation only');}else if(Object.hasOwn(a,'generatedRef'))fail(q,'generated reference only on generated mesh');if(a.asset===IMPORT_ID){if(s.geometryProfile!==IMPORT_PROFILE||!a.importBundle)fail(q,'imported mesh requires AF05 bundle');compileBundle(a.importBundle);if(a.params||a.assembly||a.identity||a.attachment||a.actions||a.motion||a.variant||a.identityPose||Object.keys(a.tracks).some(k=>!['x','y','z','yaw','scale'].includes(k)))fail(q,'imported mesh supports root animation only');}else if(Object.hasOwn(a,'importBundle'))fail(q,'bundle allowed only on imported mesh');if(!Object.hasOwn(ASSETS,a.asset)&&!([HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile)&&HERO_NEW_IDS.includes(a.asset))&&!(s.geometryProfile===IMPORT_PROFILE&&a.asset===IMPORT_ID)&&!(s.geometryProfile===GENERATED_PROFILE&&a.asset===GENERATED_ID))fail(q+'.asset','unknown asset');if([HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile)&&a.asset!==IMPORT_ID&&a.asset!==GENERATED_ID){if(!HERO_IDS.includes(a.asset))fail(q+'.asset','unknown premium asset');if(a.params||a.assembly||a.identity||a.attachment)fail(q,'premium custom params, assembly, identity pins and attachments require a later contract');const allowed=HERO_REGISTRY[a.asset].category==='characters'?['x','y','z','yaw','scale','walking','open','armPitch','armSpread',...(a.asset==='retro-robot'?['headRoll','headYaw','blink','grip']:[])]:['x','y','z','yaw','scale',...(['laptop','robot-arm'].includes(a.asset)?['open']:[])];if(Object.keys(a.tracks).some(k=>!allowed.includes(k))||a.actions||a.motion)fail(q,'unsupported premium motion channel or preset');}if(Object.hasOwn(a,'params'))validateAssetParams(a.asset,a.params);if(Object.hasOwn(a,'motion')&&!Object.hasOwn(MOTION_PRESETS,a.motion))fail(q+'.motion','unknown motion');tracks(resolveTracks(a),limits,q+'.tracks');if(Object.hasOwn(a,'interpolation'))interpolationMap(a.interpolation,resolveTracks(a),q+'.interpolation');if(['armPitch','armSpread','grip'].some(k=>Object.hasOwn(a.tracks,k)&&!supportedChannels(a.asset).includes(k)))fail(q,'unsupported articulated channel');if(LEFT_ARM.some(k=>Object.hasOwn(a.tracks,k))&&!leftArmRig(a.asset))fail(q,'left-arm channels require a catalog human or robot rig');if(Object.hasOwn(a,'actions'))validateActions(a,q);if(Object.hasOwn(a,'locomotion'))validateLocomotion(a,q+'.locomotion',fail);if(Object.hasOwn(a,'assembly'))validateAssembly(a,q+'.assembly');}
 if(Object.hasOwn(s,'geometryProfile')&&(![PROFILE,LOD_PROFILE,HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile)||s.assets.some(a=>!(s.geometryProfile===GENERATED_PROFILE?[...HERO_IDS,GENERATED_ID]:s.geometryProfile===IMPORT_PROFILE?[...HERO_IDS,IMPORT_ID]:s.geometryProfile===HERO_PROFILE?HERO_IDS:s.geometryProfile===LOD_PROFILE?LOD_SUPPORTED:SUPPORTED).includes(a.asset))))fail(p+'.geometryProfile','unsupported Foundry profile or asset');
 if([LOD_PROFILE,HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile))validateLODPolicy(s.lodPolicy,s.assets);else if(Object.hasOwn(s,'lodPolicy'))fail(p+'.lodPolicy','AF-03 geometry profile required');
 if(Object.hasOwn(s,'materialProfile')){if([HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile))fail(p+'.materialProfile','premium revision has pinned component materials');if(!s.geometryProfile)fail(p+'.materialProfile','Foundry geometry profile required');if(s.assets.some(a=>a.identity&&s.materialProfile?.assignments?.some?.(x=>x.asset===a.id)))fail(p+'.materialProfile','pinned identity material override requires a versioned variant');validateMaterialProfile(s.materialProfile,s.assets,s.backend);}
 for(const [i,a] of s.assets.entries())if(Object.hasOwn(a,'face'))validateFace(a,ids,p+'.assets['+i+'].face');
 for(const [i,a] of s.assets.entries())if(Object.hasOwn(a,'aim'))validateAim(a,ids,p+'.assets['+i+'].aim');
 for(const [i,a] of s.assets.entries())if(Object.hasOwn(a,'restOn')){const q=p+'.assets['+i+'].restOn';validateSurfaceRef(a.restOn,ids,a.id,q,fail);const sf=s.assets.find(b=>b.id===a.restOn.surface);
  if(sf.restOn||sf.attachment)fail(q+'.surface','surface must not rest on or attach to another asset');for(const ch of ['x','y','z'])if(Object.hasOwn(a.tracks,ch))fail(q,'restOn sets the position; remove the '+ch+' track');}
 for(const [i,a] of s.assets.entries())if(Object.hasOwn(a,'turnSteps'))validateTurnSteps(a,p+'.assets['+i+'].turnSteps',fail);
 if(Object.hasOwn(s,'cameraRig'))validateCameraRig(s.cameraRig,ids,p+'.cameraRig');validateAttachments(s.assets,p+'.assets');if(Object.hasOwn(s,'overlays'))validateOverlays(s.overlays,p+'.overlays');if(Object.hasOwn(s,'layers')&&!LAYERED_ENVIRONMENTS.includes(s.layers))fail(p+'.layers','unknown environment layer preset');
 if(!Array.isArray(s.effects)||s.effects.length>4)fail(p+'.effects','0–4 effects required');
 const fx=new Set();for(const [i,raw] of s.effects.entries()){const q=p+'.effects['+i+']';if(raw&&Object.hasOwn(raw,'preset'))object(raw,['preset','target'],q);else object(raw,['type','target','color','start','end'],q);const e=resolveEffect(raw);if(!['orbit','sparkles','glow'].includes(e.type))fail(q+'.type','unknown effect');if(!ids.has(e.target))fail(q+'.target','unknown target');if(typeof e.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(e.color))fail(q+'.color','hex color required');number(e.start,0,1,q+'.start');number(e.end,0,1,q+'.end');if(e.start>=e.end)fail(q,'invalid effect window');const key=e.type+':'+e.target;if(fx.has(key))fail(q,'duplicate effect');fx.add(key);}
 if([LOD_PROFILE,HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile))planLOD(s,t=>evaluateGraphRaw(s,t));
 return s;
}
function sample(t,d,p,modes={}){return Object.fromEntries(Object.entries(d).map(([k,v])=>[k,t[k]?interpolate(p,t[k],modes[k]??'ease'):v]));}
// ART-01 opt-in facing: yaw turns toward another asset's own (track/action) position inside a window.
function validateFace(a,ids,p){const x=a.face;object(x,['target','start','end','blend','hold','offset'],p,['target','start','end']);if(typeof x.target!=='string'||!ids.has(x.target)||x.target===a.id)fail(p+'.target','another asset ID required');number(x.start,0,1,p+'.start');number(x.end,0,1,p+'.end');if(x.start>=x.end)fail(p,'invalid window');if(x.blend!==undefined)number(x.blend,0,.5,p+'.blend');if(x.hold!==undefined&&x.hold!==true)fail(p+'.hold','hold must be true');if(x.offset!==undefined)number(x.offset,-Math.PI,Math.PI,p+'.offset');}
function faceYaw(x,from,to,yaw,t){
 if(t<x.start||(t>x.end&&x.hold!==true))return yaw;
 const u=Math.min(1,(t-x.start)/(x.end-x.start)),b=x.blend??0,w=b?(x.hold===true?smooth(u/b):Math.min(smooth(u/b),smooth((1-u)/b))):1;
 const d=Math.atan2(to[0]-from[0],to[2]-from[2])+(x.offset??0)-yaw,target=yaw+d-2*Math.PI*Math.round(d/(2*Math.PI));
 return clamp(mix(yaw,target,w),...limits.yaw);
}
// ART-01 opt-in per-channel interpolation; absent field = historical smoothstep easing.
function interpolationMap(x,tr,p){if(!x||typeof x!=='object'||Array.isArray(x)||!Object.keys(x).length)fail(p,'non-empty object required');for(const [k,v] of Object.entries(x)){if(!Object.hasOwn(tr,k))fail(p+'.'+k,'interpolation requires a track on this channel');if(!INTERPOLATIONS.includes(v))fail(p+'.'+k,'unsupported interpolation');}}
export const ENVIRONMENTS=Object.freeze({
 laboratory:Object.freeze({background:'#10253b',floor:'#1c3445',accent:'#6bdaef',key:'#fff0d8',rim:'#79baff'}),
 midnight:Object.freeze({background:'#151329',floor:'#242238',accent:'#b9a6ff',key:'#ffe6c5',rim:'#a58cff'}),
 amber:Object.freeze({background:'#30201d',floor:'#463029',accent:'#f9cb81',key:'#ffd2a0',rim:'#81d4dc'})
});
function evaluateGraphRaw(s,p){
 if(!Number.isFinite(p)||p<0||p>1)fail('progress','out of range');
 const c=sample(s.camera,cameraDefaults,p,s.cameraInterpolation);
 const byId=new Map(s.assets.map(a=>[a.id,a]));let key=null;const shotKey=()=>key??=JSON.stringify(s);
 function poseOf(a,t){
  const d={...defaults,...a.identityPose};for(const ch of ['armPitch','armSpread','grip'])if(Object.hasOwn(a.tracks,ch)||(a.actions??[]).some(x=>['point','wave','reach','grasp','release','carry'].includes(x.name)))d[ch]=d[ch]??0;
  for(const ch of LEFT_ARM)if(Object.hasOwn(a.tracks,ch))d[ch]=0;
  return composePose(a,sample(resolveTracks(a),d,t,a.interpolation),t,limits);
 }
 function bodyPose(a,t){
  const {x,y,z,...pose}=poseOf(a,t);
  if(a.face){const o=poseOf(byId.get(a.face.target),t);pose.yaw=faceYaw(a.face,[x,y,z],[o.x,o.y,o.z],pose.yaw,t);}
  if(a.locomotion){const m=locomote(a,t,u=>poseOf(a,u),pose.yaw);pose.walking=m.walking;pose.footLift=m.footLift;if(m.yaw!==undefined)pose.yaw=m.yaw;}
  if(a.aim){const o=poseOf(byId.get(a.aim.target),t);Object.assign(pose,applyAim(a,pose,[x,y,z],[o.x,o.y,o.z],t));}
  return {x,y,z,pose};
 }
 // POLISH-02 opt-in: a prop resting on a surface asset sits on that asset's rendered top under the chosen point.
 function surfacePose(id,t){const b=byId.get(id),q=bodyPose(b,t);return {asset:b.asset,pose:{origin:[q.x,q.y,q.z],...q.pose,...(b.params?{params:b.params}:{})}};}
 function sampleAsset(a,t){
  let {x,y,z,pose}=bodyPose(a,t);
  if(a.restOn)[x,y,z]=surfacePoint(surfacePose(a.restOn.surface,t),a.restOn.at);
  // POLISH-02 opt-in turn steps (frame grid = shot frames; shots without durationFrames use 360).
  if(a.turnSteps){const {footLift,...m}=turnSteps(a,t,s.durationFrames??360,u=>{const b=bodyPose(a,u);return {...b.pose,x:b.x,z:b.z};},shotKey()+'#'+a.id);Object.assign(pose,m);pose.footLift=(pose.footLift??0)+footLift;}
  return {id:a.id,asset:a.asset,...(a.asset===GENERATED_ID?{generatedRef:a.generatedRef}:a.asset===IMPORT_ID?{importBundle:a.importBundle}:[HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile)?{heroRevision:'hero-1.0.0'}:{}),...(a.identity?{identity:a.identity,variant:a.variant}:{}),pose:{origin:[x,y,z],...pose,...(a.params?{params:a.params}:{})},...(a.assembly?{assembly:a.assembly,progress:t}:{})};
 }
 const assets=s.assets.some(a=>a.attachment)?resolveAttachments(s.assets,p,sampleAsset):s.assets.map(a=>sampleAsset(a,p));
 const camera=s.cameraRig?frameCamera(sampleCameraRig(s.cameraRig,p,s.camera,s.cameraInterpolation),s.cameraRig,assets,s.camera):{position:[c.x,c.y,c.z],target:[0,1.2,0],zoom:c.zoom};
 return {camera,assets,...([HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile)?{materialProfile:{version:1,lighting:'studio',assignments:[],heroKey:s.assets.map(a=>a.generatedRef?.digest??a.importBundle?.digest??a.asset).join(':')},backend:s.backend}:s.materialProfile?{materialProfile:s.materialProfile,backend:s.backend}:{}),...(s.geometryProfile?{geometryProfile:s.geometryProfile}:{}),...(s.layers?{layers:s.layers}:{}),...(s.lighting?{lighting:s.lighting}:{}),environment:ENVIRONMENTS[s.environment],effects:s.effects.map(resolveEffect).map(e=>({...e,strength:p>=e.start&&p<=e.end?Math.min(1,(p-e.start)*12,(e.end-p)*12):0})),progress:p,fidelity:fidelity(s.fidelity)};
}
export function evaluateGraph(s,p){const state=evaluateGraphRaw(s,p);if(![LOD_PROFILE,HERO_PROFILE,IMPORT_PROFILE,GENERATED_PROFILE].includes(s.geometryProfile))return state;const plan=planLOD(s,t=>evaluateGraphRaw(s,t));state.lodSelection=plan.selected;state.lodReport=plan;enforceBudget(resourceUsage(meshCommands(state)),plan.budget);return state}
// Both backends consume exactly the same emitted box commands, in the same order.
export function emitGraph(state,box){emitEnvironment(state,box);for(const a of state.assets)emitCinematicAsset(a,box);}
export function boxBasis(center,transform){const origin=transform(center),axes=[0,1,2].map(i=>{const p=center.slice();p[i]+=1;return transform(p).map((x,j)=>x-origin[j]);});return {origin,axes};}
