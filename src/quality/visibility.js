// GEN-08 visibility-v2: how much of each asset is hidden by nearer geometry, measured on projected parts with a coarse
// depth test, instead of visibility-v1's whole-asset rectangles (which over-estimate coverage for thin shapes: a chair
// back or a table's legs counted as a solid box). visibility-v1 stays exported and tested unchanged.
// - Each emitted part's projected rectangle is rasterised on a 4 px grid with that part's nearest depth; a cell of an
//   asset is covered when another asset has a part in that cell nearer by more than the depth margin.
// - Poses as rendered (listener turns, follow, aims, body-language beats) from the timeline, every sixth frame.
// - Attachment parent/child pairs are excluded, as in v1.
// Screening check, not an aesthetic verdict.
import {evaluateGraph} from '../core/graph.js';
import {dialogueShot} from '../core/dialogue.js';
import {bodyAt,applyBody} from '../core/body.js';
import {emitCinematicAsset} from '../core/cinematography.js';
import {createProjection} from '../visual/mesh.js';

export const VISIBILITY2_POLICY=Object.freeze({version:'visibility-v2',every:6,cell:4,width:720,height:1280,depthMargin:.15,maxCoveredMean:.7});
const r3=v=>Math.round(v*1000)/1000;

// Nearest depth per cell of one evaluated asset (Infinity where the asset has no part).
export function depthMask(a,project,P=VISIBILITY2_POLICY){
 const W=Math.ceil(P.width/P.cell),H=Math.ceil(P.height/P.cell),d=new Float32Array(W*H).fill(Infinity);let area=0;
 emitCinematicAsset(a,(center,size,_c,tf=x=>x)=>{
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity,z=Infinity;
  for(const dx of [-1,1])for(const dy of [-1,1])for(const dz of [-1,1]){
   const v=project(tf(center.map((c,i)=>c+size[i]*[dx,dy,dz][i]/2)));
   if(!v.every(Number.isFinite)||v[2]<=.1)return;
   x0=Math.min(x0,v[0]);x1=Math.max(x1,v[0]);y0=Math.min(y0,v[1]);y1=Math.max(y1,v[1]);z=Math.min(z,v[2]);
  }
  for(let y=Math.max(0,Math.floor(y0/P.cell));y<Math.min(H,Math.ceil(y1/P.cell));y++)
   for(let x=Math.max(0,Math.floor(x0/P.cell));x<Math.min(W,Math.ceil(x1/P.cell));x++){const i=y*W+x;if(d[i]===Infinity)area++;if(z<d[i])d[i]=z;}
 });
 return {depth:d,area};
}
// Covered share per asset for one evaluated state.
export function coverage(state,links=new Set(),P=VISIBILITY2_POLICY){
 const c=state.camera,project=createProjection(c.position,c.target,c.zoom,[P.width/2,P.height/2]);
 const masks=state.assets.map(a=>({id:a.id,...depthMask(a,project,P)}));const out={};
 for(const m of masks){if(!m.area)continue;let hit=0;
  const others=masks.filter(o=>o!==m&&o.area&&!links.has(m.id+'|'+o.id));
  for(let i=0;i<m.depth.length;i++){const z=m.depth[i];if(z===Infinity)continue;for(const o of others)if(o.depth[i]<z-P.depthMargin){hit++;break;}}
  out[m.id]=hit/m.area;}
 return out;
}
export function visibility2Shot(project,t,index,P=VISIBILITY2_POLICY){
 const s=project.shots[index],ts=t.shots[index],n=ts.endFrame-ts.startFrame,shot={...dialogueShot(s,ts),durationFrames:n},links=new Set(),cover={};
 for(const a of shot.assets)for(const x of [a.attachment??[]].flat())if(x?.parent){links.add(a.id+'|'+x.parent);links.add(x.parent+'|'+a.id);}
 for(let f=0;f<n;f+=P.every){
  const st=applyBody(evaluateGraph(shot,n>1?f/(n-1):0),s.bodyLanguage?bodyAt(project,t,ts.startFrame+f,index):null);
  for(const [id,v] of Object.entries(coverage(st,links,P)))(cover[id]??=[]).push(v);
 }
 return Object.fromEntries(Object.entries(cover).map(([id,v])=>[id,{coveredMean:r3(v.reduce((a,b)=>a+b,0)/v.length),coveredMax:r3(Math.max(...v)),samples:v.length}]));
}
export function visibility2Check(project,t){
 const shots=[],warnings=[];
 for(const [i,s] of project.shots.entries()){if(s.template!=='cinematic-graph')continue;const assets=visibility2Shot(project,t,i);shots.push({shot:s.id,assets});
  for(const [id,v] of Object.entries(assets))if(v.coveredMean>VISIBILITY2_POLICY.maxCoveredMean)warnings.push({code:'HIDDEN_ASSET',shot:s.id,asset:id,coveredMean:v.coveredMean});}
 return {policy:VISIBILITY2_POLICY.version,timeline:t.estimated?'estimated':'measured',shots,warnings};
}
