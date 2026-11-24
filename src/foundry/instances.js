import {roundedCuboid,sphere,cylinder,extrude,validateMesh,LIMITS} from './geometry.js';
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
export const inventory=()=>Object.fromEntries(Object.entries(meshes).map(([id,m])=>[id,validateMesh(m)]));
export function meshCommands(state){const out=[];let triangles=0;function emit(id,asset,source){let i=0;source((center,size,color,tf=p=>p,emissive=false)=>{const component=i++;if(out.length>=512)throw Error('instance budget');let type='detail';
 if(asset==='retro-robot'&&size[0]===1.08&&size[1]===.86)type='round';
 if(asset==='smartphone'&&component===0)type='round';
 if(asset==='temple'){if(size[1]>size[0]*3&&size[1]>size[2]*3)type='cylinder';else if(size[0]>1&&size[1]>.12&&component>0)type='cornice'}
 if(asset==='atom-model')type=size[1]>size[0]*1.4?'cylinder':'ball';
 const origin=tf(center),axes=[0,1,2].map(j=>{const p=center.slice();p[j]+=size[j];return tf(p).map((x,k)=>x-origin[k])});const mesh=meshes[type];triangles+=mesh.indices.length/3;if(triangles>LIMITS.triangles)throw Error('scene triangle budget');out.push({id:id+'/'+component,meshKey:type,mesh,origin,axes,color,emissive,pivot:origin,materialSlot:0})})}
 emit('environment','environment',box=>emitEnvironment(state,box));for(const a of state.assets)emit(a.id,a.asset,box=>emitCinematicAsset(a,box));return out}
