import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {evaluateGraph,emitGraph} from '../src/core/graph.js';
import {createProjection,createMesh} from '../src/visual/mesh.js';
import {createRaster,renderMeshes} from '../src/foundry/raster.js';
import {meshCommands,inventory,bundleMetadata} from '../src/foundry/instances.js';
import {validateProject} from '../src/core/timeline.js';
const p=validateProject(JSON.parse(readFileSync('examples/foundry-af01-cpu-polished.json','utf8'))),target=createRaster(540,960),rows=[];
for(const shot of p.shots.filter(s=>s.geometryProfile)){const state=evaluateGraph(shot,.4),samples=[];for(let i=0;i<6;i++){let t=performance.now();const {box,faces}=createMesh(state.camera.position,createProjection(state.camera.position,state.camera.target,state.camera.zoom,[360,640]));emitGraph(state,box);const legacyMs=performance.now()-t;t=performance.now();const cmd=meshCommands(state);const compileMs=performance.now()-t;t=performance.now();const triangles=renderMeshes(target,cmd,state.camera),rasterMs=performance.now()-t;if(i)samples.push({legacyProjectionMs:legacyMs,meshInstanceMs:compileMs,meshRasterMs:rasterMs,legacyFaces:faces.length,triangles,components:cmd.length})}rows.push({asset:bundleMetadata(shot.assets[0].asset),samples})}
mkdirSync('out/foundry-af01-benchmark',{recursive:true});writeFileSync('out/foundry-af01-benchmark/report.json',JSON.stringify({source:process.env.GITHUB_SHA??null,node:process.version,platform:process.platform,arch:process.arch,scope:'legacy projection versus instance compilation and software raster only; not an end-to-end renderer speed comparison',width:540,height:960,inventory:inventory(),rows},null,2));console.log(JSON.stringify(rows.map(r=>({asset:r.asset.identity,samples:r.samples}))));
