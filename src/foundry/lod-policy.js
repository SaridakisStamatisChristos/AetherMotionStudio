import {LOD_PROFILE,LOD_SUPPORTED,LOD_LEVELS,lodCacheStats} from './lod-meshes.js';
import {meshCommands} from './instances.js';
import {geometryBounds,handAnchor} from '../core/cinematography.js';
import {recipeRig,hasHands} from '../visual/catalog-rig.js';
import {cameraBasis} from './raster.js';
import {dot,sub} from './geometry.js';
import {textureBytes,textureKey,TEXTURE_BUDGET} from './materials.js';
export const QUALITY_FLOOR=Object.freeze({hero:0,cinematic:1,efficient:2,preview:3});
export const HARD_BUDGET=Object.freeze({maxTriangles:160000,maxDrawCalls:512,maxGeometryBytes:64*1024*1024,maxTextureBytes:TEXTURE_BUDGET});
const defaults=Object.freeze({maxTriangles:50000,maxDrawCalls:256,maxGeometryBytes:32*1024*1024,maxTextureBytes:64*1024*1024});
function fields(o,keys){if(!o||typeof o!=='object'||Array.isArray(o))throw Error('LOD object required');for(const k of Object.keys(o))if(!keys.includes(k))throw Error('unknown LOD field '+k)}
export function validateLODPolicy(x,assets){fields(x,['version','quality','selection','overrides','budget']);if(x.version!==1||!Object.hasOwn(QUALITY_FLOOR,x.quality)||!['auto','explicit'].includes(x.selection))throw Error('invalid LOD policy');
 const overrides=x.overrides??[];if(!Array.isArray(overrides)||overrides.length>8)throw Error('LOD override budget');const ids=new Set(assets.map(a=>a.id)),seen=new Set();
 for(const o of overrides){fields(o,['asset','level']);if(!ids.has(o.asset)||seen.has(o.asset)||!LOD_LEVELS.includes(o.level))throw Error('invalid LOD override');seen.add(o.asset)}
 if(x.selection==='explicit'&&seen.size!==ids.size)throw Error('explicit LOD requires every asset');
 const budget=x.budget??{};fields(budget,Object.keys(HARD_BUDGET));for(const [k,v] of Object.entries(budget))if(!Number.isInteger(v)||v<1||v>HARD_BUDGET[k])throw Error('LOD resource budget '+k);
 return {quality:x.quality,selection:x.selection,overrides:new Map(overrides.map(o=>[o.asset,o.level])),budget:{...defaults,...budget}}
}
// Conservative bounding-box projection, measured in final 1080x1920 pixels;
// near-plane crossing gets the largest screen dimension rather than an unstable projection.
export function projectedPixels(asset,camera){const b=geometryBounds([asset]);if(!b)return 0;const {f,r,u}=cameraBasis(camera);let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]]){const d=sub([x,y,z],camera.position),depth=dot(d,f);if(depth<=.1)return 1920;const px=dot(d,r)*camera.zoom/depth*1.5,py=dot(d,u)*camera.zoom/depth*1.5;x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py)}return Math.max(x1-x0,y1-y0)}
export function automaticLevel(pixels,quality){if(!Number.isFinite(pixels)||pixels<0||!Object.hasOwn(QUALITY_FLOOR,quality))throw Error('invalid projected LOD size');return Math.max(QUALITY_FLOOR[quality],pixels>=480?0:pixels>=220?1:pixels>=80?2:3)}
export function resourceUsage(commands){const geometry=new Map(),textures=new Map();let triangles=0;for(const c of commands){triangles+=c.mesh.indices.length/3;geometry.set(c.meshRef,c.geometryBytes??(c.mesh.positions.byteLength+c.mesh.normals.byteLength+c.mesh.uvs.byteLength+c.mesh.indices.byteLength));if(c.surface?.texture){const m=c.surface,t=m.texture; // conservative per UV variant, even where CPU shares backing bytes
 textures.set(textureKey(t)+JSON.stringify([m.uvScale,m.uvOffset]),textureBytes(t))}}
 return {triangles,drawCalls:commands.length,geometryBytes:[...geometry.values()].reduce((a,b)=>a+b,0),textureBytes:[...textures.values()].reduce((a,b)=>a+b,0)}
}
export function enforceBudget(usage,budget){for(const [name,key] of [['triangles','maxTriangles'],['drawCalls','maxDrawCalls'],['geometryBytes','maxGeometryBytes'],['textureBytes','maxTextureBytes']])if(usage[name]>budget[key])throw Error('LOD budget exceeded: '+name+' '+usage[name]+' > '+budget[key]+'; explicitly select a cheaper quality/LOD or increase budget');return usage}
const points=s=>{const a=new Set(Array.from({length:9},(_,i)=>i/8));for(const tracks of [s.camera,...s.assets.map(x=>x.tracks)])for(const track of Object.values(tracks))for(const [p] of track)a.add(p);for(const asset of s.assets){for(const x of asset.actions??[]){a.add(x.start);a.add(x.end);a.add((x.start+x.end)/2)}if(asset.assembly){a.add(asset.assembly.start);a.add(asset.assembly.end)}}if(a.size>4096)throw Error('LOD sampling budget');return [...a].sort((a,b)=>a-b)};
const plans=new WeakMap();
export function planLOD(shot,sample){const sig=JSON.stringify(shot),cached=plans.get(shot);if(cached?.sig===sig)return cached.plan;
 const policy=validateLODPolicy(shot.lodPolicy,shot.assets),times=points(shot),states=times.map(sample),sizes=new Map(shot.assets.map(a=>[a.id,0]));
 for(const s of states)for(const a of s.assets)sizes.set(a.id,Math.max(sizes.get(a.id),projectedPixels(a,s.camera)));
 const selected=Object.freeze(Object.fromEntries(shot.assets.map(a=>[a.id,policy.overrides.get(a.id)??automaticLevel(sizes.get(a.id),policy.quality)])));
 const peak={triangles:0,drawCalls:0,geometryBytes:0,textureBytes:0};for(const state of states){const usage=enforceBudget(resourceUsage(meshCommands({...state,lodSelection:selected})),policy.budget);for(const k of Object.keys(peak))peak[k]=Math.max(peak[k],usage[k])}
 const plan=Object.freeze({version:1,quality:policy.quality,selection:policy.selection,selected,budget:Object.freeze(policy.budget),sampleCount:times.length,peakSampled:Object.freeze(peak),assets:Object.freeze(shot.assets.map(a=>Object.freeze({asset:a.id,identity:a.asset,level:selected[a.id],reason:policy.overrides.has(a.id)?'explicit':'maximum-sampled-projected-size',maxProjectedPixels:Math.round(sizes.get(a.id))})))});
 plans.set(shot,{sig,plan});return plan
}
export function bundleAt(asset,pose={origin:[0,0,0],scale:1,yaw:0}){if(!LOD_SUPPORTED.includes(asset))throw Error('unsupported LOD identity');
 const rig=recipeRig(asset),anchors={origin:pose.origin,ground:pose.origin,...(hasHands(asset)?{'left-hand':handAnchor(asset,pose,-1),'right-hand':handAnchor(asset,pose,1)}:{})};
 const state={geometryProfile:LOD_PROFILE,assets:[{id:'subject',asset,pose}]};
 const representations=LOD_LEVELS.map(level=>{const commands=meshCommands({...state,lodSelection:{subject:level}});return {level,usage:resourceUsage(commands),components:commands.map(c=>({id:c.id,primitive:c.primitive,meshRef:c.meshRef,origin:c.origin,axes:c.axes,pivot:c.pivot,color:c.color,emissive:c.emissive,materialSlot:c.materialSlot}))}});
 return {schemaVersion:2,id:'foundry/'+asset,identity:asset,revision:'2.0.0',units:'meters',coordinateSystem:'right-handed-y-up',recipe:{family:LOD_PROFILE,version:1},license:{sourceKind:'original',status:'project-policy'},rig,anchors,representations}
}
export {lodCacheStats};
