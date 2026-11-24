import {roundedCuboid,sphere,cylinder,extrude,boxMesh,validateMesh} from './geometry.js';
import {meshDigest,COMPILER_VERSION} from './digest.js';
export const LOD_PROFILE='foundry-af03';
export const LOD_SUPPORTED=Object.freeze(['retro-robot','smartphone','temple','atom-model','treasure-chest','energy-core']);
export const LOD_LEVELS=Object.freeze([0,1,2,3]);
const levels=Object.freeze([
 {round:12,detail:8,ball:[32,16],cylinder:32},
 {round:6,detail:4,ball:[16,8],cylinder:16},
 {round:4,detail:2,ball:[8,4],cylinder:8},
 {round:0,detail:0,ball:[4,4],cylinder:4}
]);
const cache=new Map();let hits=0,misses=0;
export function lodMesh(type,level){
 if(!LOD_LEVELS.includes(level)||!['round','detail','ball','cylinder','cornice'].includes(type))throw Error('unknown LOD primitive');
 const key=type+':'+level;if(cache.has(key)){hits++;return cache.get(key)}
 const p=levels[level];let mesh;
 if(type==='round'||type==='detail')mesh=p[type]?roundedCuboid([1,1,1],type==='round'?.16:.08,p[type]):boxMesh();
 else if(type==='ball')mesh=sphere(.5,...p.ball);
 else if(type==='cylinder')mesh=cylinder(.5,1,p.cylinder);
 else mesh=extrude([[-.5,-.5],[.5,-.5],[.5,.05],[.38,.5],[-.38,.5],[-.5,.05]],1);
 const digest=meshDigest(mesh),summary=validateMesh(mesh),bytes=mesh.positions.byteLength+mesh.normals.byteLength+mesh.uvs.byteLength+mesh.indices.byteLength;
 const result={mesh,digest,key:COMPILER_VERSION+':'+digest,summary,bytes};
 cache.set(key,result);misses++;return result
}
export function lodCacheStats(){return {entries:cache.size,hits,misses,geometryBytes:[...new Map([...cache.values()].map(x=>[x.digest,x.bytes])).values()].reduce((a,b)=>a+b,0)}}
