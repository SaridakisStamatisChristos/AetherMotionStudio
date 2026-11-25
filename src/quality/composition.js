// ART-02 composition report (diagnostic, not an aesthetic verdict). Separate from preflight so
// historical quality reports are unchanged. Uses preflight's sampled projected bounds (720×1280 frame).
import {inspectShot} from './preflight.js';
import {evaluateGraph} from '../core/graph.js';
import {recipeRig} from '../visual/catalog-rig.js';

export const SAFE=Object.freeze({x:[24,696],y:[310,1040]});
const r3=v=>Math.round(v*1000)/1000;
const stats=v=>v.length?{min:r3(Math.min(...v)),mean:r3(v.reduce((a,b)=>a+b,0)/v.length),max:r3(Math.max(...v))}:null;
const isCharacter=asset=>recipeRig(asset).anchors.includes('right-hand');
// Angle between an asset's forward (+z rotated by yaw) and the direction to the camera, in degrees (0 = facing camera).
export function cameraAngle(pose,camera){
 const f=[Math.sin(pose.yaw),Math.cos(pose.yaw)],d=[camera.position[0]-pose.origin[0],camera.position[2]-pose.origin[2]],n=Math.hypot(...d)||1;
 return Math.acos(Math.max(-1,Math.min(1,(f[0]*d[0]+f[1]*d[1])/n)))*180/Math.PI;
}
function overlap(a,b){const ix=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0])),iy=Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));return ix*iy/Math.max(1e-9,Math.min((a[2]-a[0])*(a[3]-a[1]),(b[2]-b[0])*(b[3]-b[1])));}

export function compositionReport(shot,{subject=shot.cameraRig?.subject??shot.assets[0].id,backAngle=110}={}){
 const pre=inspectShot(shot),H=SAFE.y[1]-SAFE.y[0],W=SAFE.x[1]-SAFE.x[0];
 const height=[],width=[],cx=[],cy=[],back={},pairs={};
 for(const row of pre.observations){
  const state=evaluateGraph(shot,row.progress),bounds=Object.fromEntries(row.objects.filter(o=>o.bounds).map(o=>[o.id,o.bounds]));
  const s=bounds[subject];
  if(s){height.push((s[3]-s[1])/H);width.push((s[2]-s[0])/W);cx.push(((s[0]+s[2])/2-SAFE.x[0])/W);cy.push(((s[1]+s[3])/2-SAFE.y[0])/H);}
  const chars=state.assets.filter(a=>isCharacter(a.asset));
  for(const a of chars){const deg=cameraAngle(a.pose,state.camera);back[a.id]??=[];back[a.id].push(deg);}
  for(let i=0;i<chars.length;i++)for(let j=i+1;j<chars.length;j++){const k=chars[i].id+'|'+chars[j].id,A=bounds[chars[i].id],B=bounds[chars[j].id];if(A&&B)(pairs[k]??=[]).push(overlap(A,B));}
 }
 return {version:1,shot:shot.id,subject,samples:pre.observations.length,
  subjectHeightOfSafe:stats(height),subjectWidthOfSafe:stats(width),subjectCenterInSafe:{x:stats(cx),y:stats(cy)},
  characters:Object.fromEntries(Object.entries(back).map(([id,v])=>[id,{cameraAngleDeg:stats(v),backToCameraSamples:v.filter(d=>d>backAngle).length}])),
  overlap:Object.fromEntries(Object.entries(pairs).map(([k,v])=>[k,stats(v)])),
  preflightIssues:pre.issues.map(i=>i.code)};
}

// POLISH-02 item 6: versioned composition gate (separate from preflight, so historical quality reports are unchanged).
// Bounds are regression ceilings set from the accepted showcase fixtures (2026-11-25), not an aesthetic verdict.
export const COMPOSITION_POLICY=Object.freeze({version:'composition-v1',maxBackToCameraSamples:0,maxOverlapMean:.4,maxOverlapPeak:.85,subjectHeightOfSafe:Object.freeze([.08,1.1]),maxWarnings:16});
export function compositionGate(shot,report=compositionReport(shot)){
 const P=COMPOSITION_POLICY,w=[];
 for(const [id,v] of Object.entries(report.characters))if(v.backToCameraSamples>P.maxBackToCameraSamples)w.push({code:'BACK_TO_CAMERA',asset:id,samples:v.backToCameraSamples});
 for(const [pair,o] of Object.entries(report.overlap)){if(o.mean>P.maxOverlapMean)w.push({code:'OVERLAP_MEAN',pair,value:o.mean});if(o.max>P.maxOverlapPeak)w.push({code:'OVERLAP_PEAK',pair,value:o.max});}
 const h=report.subjectHeightOfSafe?.mean;if(h!==undefined&&(h<P.subjectHeightOfSafe[0]||h>P.subjectHeightOfSafe[1]))w.push({code:'SUBJECT_SIZE',value:h});
 return {policy:P.version,shot:report.shot,warnings:w.slice(0,P.maxWarnings),truncated:w.length>P.maxWarnings};
}
