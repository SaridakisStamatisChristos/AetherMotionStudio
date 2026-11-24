import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {evaluateGraph} from '../src/core/graph.js';
import {validateProject} from '../src/core/timeline.js';
import {meshCommands} from '../src/foundry/instances.js';
import {createRaster} from '../src/foundry/raster.js';
import {renderMaterialMeshes} from '../src/foundry/material-raster.js';
import {MATERIAL_CAPABILITIES,resolveMaterial,generateTexture} from '../src/foundry/materials.js';
const p=validateProject(JSON.parse(readFileSync('examples/foundry-af02-cpu-polished.json','utf8'))),r=createRaster(540,960),rows=[];
for(const s of p.shots){const m=resolveMaterial(s.materialProfile.assignments[0].material);let t=performance.now();const tex=generateTexture(m.texture),generationMs=performance.now()-t,samples=[];for(const progress of [0,.5,1]){const state=evaluateGraph(s,progress),cmd=meshCommands(state);t=performance.now();const triangles=renderMaterialMeshes(r,cmd,state.camera,state.materialProfile,progress),rasterMs=performance.now()-t,visible=r.rgba.reduce((n,x,i)=>n+(i%4===3&&x>0?1:0),0);samples.push({progress,rasterMs,triangles,visiblePixels:visible})}rows.push({shot:s.id,preset:m.preset,generationMs,texture:{resolution:tex.resolution,bytes:tex.bytes,digest:tex.digest,mapDigests:tex.digests,colorSpaces:tex.colorSpaces},samples})}
mkdirSync('out/foundry-af02-benchmark',{recursive:true});writeFileSync('out/foundry-af02-benchmark/report.json',JSON.stringify({source:process.env.GITHUB_SHA??null,node:process.version,scope:'geometry raster and material texture generation, first raster sample may include cold cache; not end-to-end',width:540,height:960,capabilities:MATERIAL_CAPABILITIES,rows},null,2));console.log(JSON.stringify(rows));
