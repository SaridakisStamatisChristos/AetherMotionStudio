import {HERO_PROFILE,heroCommands} from './hero.js';
import {LOD_PROFILE,LOD_SUPPORTED,lodMesh} from './lod-meshes.js';
import {roundedCuboid,sphere,cylinder,extrude,validateMesh,topologyAudit,LIMITS} from './geometry.js';
import {meshDigest,COMPILER_VERSION} from './digest.js';
import {materialAssignments} from './materials.js';
import {emitCinematicAsset,emitEnvironment} from '../core/cinematography.js';
export const PROFILE='foundry-af01';
export const SUPPORTED=Object.freeze(['retro-robot','smartphone','temple','atom-model']);
const meshes=Object.freeze({
 round:roundedCuboid([1,1,1],.16,6),
 detail:roundedCuboid([1,1,1],.08,4),
 ball:sphere(.5,16,8),
 cylinder:cylinder(.5,1,16),
 cornice:extrude([[-.5,-.5],[.5,-.5],[.5,.05],[.38,.5],[-.38,.5],[-.5,.05]],1)
});
const digests=Object.freeze(Object.fromEntries(Object.entries(meshes).map(([id,m])=>[id,meshDigest(m)])));
export const inventory=()=>Object.fromEntries(Object.entries(meshes).map(([id,m])=>[id,{...validateMesh(m),sha256:digests[id],topologyAudit:topologyAudit(m)}]));
export function bundleMetadata(asset){if(!SUPPORTED.includes(asset))throw Error('unsupported Foundry asset');return {schemaVersion:1,id:'foundry/'+asset,identity:asset,revision:'1.0.0',recipe:{family:PROFILE,version:1},units:'meters',coordinateSystem:'right-handed-y-up',anchors:{ground:[0,0,0]},compiler:COMPILER_VERSION,license:{sourceKind:'original',status:'project-policy'}}}
export function meshCommands(state){if(state.geometryProfile===HERO_PROFILE){if(!state.lodSelection)throw Error('missing premium LOD selection');const commands=[...meshCommands({...state,geometryProfile:LOD_PROFILE,assets:[],lodSelection:{}}),...state.assets.flatMap(a=>heroCommands(a,state.lodSelection[a.id]))];if(commands.length>512||commands.reduce((n,c)=>n+c.mesh.indices.length/3,0)>LIMITS.triangles)throw Error('premium scene geometry budget');return commands}const out=[],assignments=state.materialProfile?materialAssignments(state.materialProfile,state.backend??'cpu'):null;let triangles=0;const lod=state.geometryProfile===LOD_PROFILE;if(lod&&!state.lodSelection)throw Error('missing shot-stable LOD selection');function emit(id,asset,source){let i=0;source((center,size,color,tf=p=>p,emissive=false)=>{const component=i++;if(out.length>=512)throw Error('instance budget');let type='detail';
 if(asset==='retro-robot'&&size[0]===1.08&&size[1]===.86)type='round';
 if(asset==='smartphone'&&component===0)type='round';
 if(asset==='temple'){if(size[1]>size[0]*3&&size[1]>size[2]*3)type='cylinder';else if(size[0]>1&&size[1]>.12&&component>0)type='cornice'}
 if(asset==='atom-model')type=size[1]>size[0]*1.4?'cylinder':'ball';
 if(lod&&asset==='treasure-chest'&&component===0)type='round';
 if(lod&&asset==='energy-core'&&component===2)type='round';
 const origin=tf(center),axes=[0,1,2].map(j=>{const p=center.slice();p[j]+=size[j];return tf(p).map((x,k)=>x-origin[k])});const level=lod?(asset==='environment'?3:state.lodSelection[id]):undefined;if(lod&&(!LOD_SUPPORTED.includes(asset)&&asset!=='environment'))throw Error('unsupported LOD asset');const selected=lod?lodMesh(type,level):null,mesh=selected?.mesh??meshes[type],digest=selected?.digest??digests[type];triangles+=mesh.indices.length/3;if(triangles>LIMITS.triangles)throw Error('scene triangle budget');const assignment=assignments?.get(id),surface=assignment&&(!emissive||assignment.includeEmissive)?assignment.material:null;out.push({...(surface?{surface}:{}),...(lod?{lod:level,primitive:type,geometryBytes:selected.bytes}:{}),id:id+'/'+component,meshKey:COMPILER_VERSION+':'+digest,meshRef:digest,mesh,origin,axes,color,emissive,pivot:origin,materialSlot:0})})}
 emit('environment','environment',box=>emitEnvironment(state,box));for(const a of state.assets)emit(a.id,a.asset,box=>emitCinematicAsset(a,box));return out}
