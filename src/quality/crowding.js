// GEN-04 crowding-v1: do characters overlap each other on screen? A new versioned check, separate from the
// composition-v1 gate (whose results and pinned tests stay unchanged).
// Differences from composition-v1 overlap:
// - every catalog character counts (humans, robots incl. retro-robot, and robot animals), not only hand rigs;
// - poses are the rendered ones: listener turns, speaker follow, phrase aims and body-language beats applied from the
//   timeline (measured, or the estimate from motion-check), every third frame instead of nine samples;
// - overlap is measured on the projected parts (each emitted box rasterised on a 4 px grid), not on whole-asset
//   rectangles, so an arm stretched toward a neighbour counts only where it actually covers the neighbour.
// Diagnostic screening, not an aesthetic verdict.
import {evaluateGraph} from '../core/graph.js';
import {dialogueShot} from '../core/dialogue.js';
import {bodyAt,applyBody} from '../core/body.js';
import {emitCinematicAsset} from '../core/cinematography.js';
import {createProjection} from '../visual/mesh.js';
import {recipeSpec} from '../visual/catalog-rig.js';

export const CROWDING_POLICY=Object.freeze({version:'crowding-v1',every:3,cell:4,width:720,height:1280,maxOverlapMean:.08,maxOverlapPeak:.2});
const r3=v=>Math.round(v*1000)/1000;
// Every catalog character: the human, robot and robot-animal families plus the legacy retro robot.
export const isCatalogCharacter=asset=>asset==='retro-robot'||['human','robot','animal'].includes(recipeSpec(asset)?.family);

// Projected part mask of one evaluated asset: each emitted box's projected rectangle on a cell grid.
export function partMask(a,project,P=CROWDING_POLICY){
 const W=Math.ceil(P.width/P.cell),H=Math.ceil(P.height/P.cell),m=new Uint8Array(W*H);let area=0;
 emitCinematicAsset(a,(center,size,_c,tf=x=>x)=>{
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const dx of [-1,1])for(const dy of [-1,1])for(const dz of [-1,1]){
   const v=project(tf(center.map((c,i)=>c+size[i]*[dx,dy,dz][i]/2)));
   if(!v.every(Number.isFinite)||v[2]<=.1)return;
   x0=Math.min(x0,v[0]);x1=Math.max(x1,v[0]);y0=Math.min(y0,v[1]);y1=Math.max(y1,v[1]);
  }
  for(let y=Math.max(0,Math.floor(y0/P.cell));y<Math.min(H,Math.ceil(y1/P.cell));y++)
   for(let x=Math.max(0,Math.floor(x0/P.cell));x<Math.min(W,Math.ceil(x1/P.cell));x++)if(!m[y*W+x]){m[y*W+x]=1;area++;}
 });
 return {mask:m,area};
}
// Overlap of two masks as a share of the smaller one (0 = apart, 1 = the smaller one fully overlapped).
export function maskOverlap(a,b){
 if(!a.area||!b.area)return 0;let both=0;
 for(let i=0;i<a.mask.length;i++)both+=a.mask[i]&b.mask[i];
 return both/Math.min(a.area,b.area);
}

// Pairwise character overlap for one shot (index into project.shots / timeline.shots).
export function crowdingShot(project,t,index,P=CROWDING_POLICY){
 const s=project.shots[index],ts=t.shots[index],n=ts.endFrame-ts.startFrame,shot={...dialogueShot(s,ts),durationFrames:n};
 const ids=shot.assets.filter(a=>isCatalogCharacter(a.asset)).map(a=>a.id),pairs={};
 if(ids.length<2)return pairs;
 for(let f=0;f<n;f+=P.every){
  const st=applyBody(evaluateGraph(shot,n>1?f/(n-1):0),s.bodyLanguage?bodyAt(project,t,ts.startFrame+f,index):null);
  const c=st.camera,project2d=createProjection(c.position,c.target,c.zoom,[P.width/2,P.height/2]);
  const masks=new Map(st.assets.filter(a=>ids.includes(a.id)).map(a=>[a.id,partMask(a,project2d,P)]));
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
   const A=masks.get(ids[i]),B=masks.get(ids[j]);if(!A||!B)continue;
   const o=maskOverlap(A,B),q=pairs[ids[i]+'|'+ids[j]]??={sum:0,samples:0,peak:0,frame:0};
   q.sum+=o;q.samples++;if(o>q.peak){q.peak=o;q.frame=f;}
  }
 }
 return Object.fromEntries(Object.entries(pairs).map(([k,q])=>[k,{overlapMean:r3(q.sum/q.samples),overlapPeak:r3(q.peak),frame:q.frame,samples:q.samples}]));
}
export function crowdingCheck(project,t){
 const P=CROWDING_POLICY,shots=[],warnings=[];
 for(const [i,s] of project.shots.entries()){
  if(s.template!=='cinematic-graph')continue;const pairs=crowdingShot(project,t,i);shots.push({shot:s.id,pairs});
  for(const [pair,v] of Object.entries(pairs)){
   if(v.overlapMean>P.maxOverlapMean)warnings.push({code:'CROWDED',shot:s.id,pair,overlapMean:v.overlapMean,limit:P.maxOverlapMean});
   else if(v.overlapPeak>P.maxOverlapPeak)warnings.push({code:'CROWDED_PEAK',shot:s.id,pair,overlapPeak:v.overlapPeak,frame:v.frame,limit:P.maxOverlapPeak});
  }
 }
 return {policy:P.version,timeline:t.estimated?'estimated':'measured',shots,warnings};
}
