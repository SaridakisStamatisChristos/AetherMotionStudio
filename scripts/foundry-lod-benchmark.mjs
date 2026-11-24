import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {evaluateGraph} from '../src/core/graph.js';
import {validateProject} from '../src/core/timeline.js';
import {LOD_SUPPORTED,lodMesh,lodCacheStats} from '../src/foundry/lod-meshes.js';
import {bundleAt,resourceUsage} from '../src/foundry/lod-policy.js';
import {meshCommands} from '../src/foundry/instances.js';
import {createRaster,renderMeshes} from '../src/foundry/raster.js';
import {renderMaterialMeshes} from '../src/foundry/material-raster.js';
const begin=performance.now();for(const type of ['round','detail','ball','cylinder','cornice'])for(let level=0;level<4;level++)lodMesh(type,level);const coldGeometryGenerationMs=performance.now()-begin,coldCache=lodCacheStats();
const p=validateProject(JSON.parse(readFileSync('examples/foundry-af03-cpu-polished.json','utf8'))),target=createRaster(540,960),small=createRaster(180,320),rows=[];
const mask=(cmd,camera)=>{renderMeshes(small,cmd,camera);return small.rgba.slice()};
const overlap=(a,b)=>{let i=0,u=0;for(let k=3;k<a.length;k+=4){if(a[k]||b[k])u++;if(a[k]&&b[k])i++}return u?i/u:0};
for(const shot of p.shots){const s=evaluateGraph(shot,.5),asset=shot.assets[0].asset,views=[[0,2.2,8],[6,2.2,6],[0,4,12]].map(position=>({position,target:[0,1,0],zoom:1100})),hero=views.map(c=>mask(meshCommands({...s,lodSelection:{subject:0}}),c)),levels=[];
 for(let level=0;level<4;level++){const state={...s,lodSelection:{subject:level}},samples=[];let cmd=meshCommands(state);const silhouetteIoU=views.map((c,i)=>overlap(hero[i],mask(cmd,c)));for(let i=0;i<4;i++){let t=performance.now();cmd=meshCommands(state);const instanceMs=performance.now()-t;t=performance.now();if(s.materialProfile)renderMaterialMeshes(target,cmd,s.camera,s.materialProfile,.5);else renderMeshes(target,cmd,s.camera);const rasterMs=performance.now()-t;if(i)samples.push({instanceMs,rasterMs})}levels.push({level,usage:resourceUsage(cmd),silhouetteIoU,samples})}
 rows.push({asset,shot:shot.id,plan:s.lodReport,bundle:bundleAt(asset),levels})}
mkdirSync('out/foundry-af03-benchmark',{recursive:true});const report={source:process.env.GITHUB_SHA??null,node:process.version,platform:process.platform,arch:process.arch,scope:'matched per-asset CPU raster microbenchmark; native film wall time separately reported by render-timing.json; no GPU measurements',output:{width:1080,height:1920},raster:{width:540,height:960},coldGeometryGenerationMs,coldCache,finalCache:lodCacheStats(),nodeMemory:process.memoryUsage(),processMaxRssKiB:process.resourceUsage().maxRSS,rows};writeFileSync('out/foundry-af03-benchmark/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(rows.map(r=>({asset:r.asset,selected:r.plan.selected,levels:r.levels.map(l=>({level:l.level,triangles:l.usage.triangles,silhouetteIoU:l.silhouetteIoU,samples:l.samples}))}))));
