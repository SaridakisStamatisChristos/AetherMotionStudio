// GEN-01 automatic checks for every project (diagnostic, versioned, separate from preflight so historical quality
// reports and digests are unchanged). They turn TALK-04/05 still-review findings into general rules:
// - motion-speed-v1: peak body-turn (yaw), nod and head-tilt speed per character, frame by frame, with TALK-02 listener
//   turns and TALK-03 body language applied from the timeline (measured, or an estimate with lines spread evenly).
// - visibility-v1: how much of each asset's projected box is covered by boxes of assets nearer to the camera.
// Box-based (projected bounds from preflight), so coverage is an over-estimate for thin shapes: a screening check.
import {evaluateGraph} from '../core/graph.js';
import {dialogueShot} from '../core/dialogue.js';
import {bodyAt} from '../core/body.js';
import {inspectShot} from './preflight.js';
import {recipeRig} from '../visual/catalog-rig.js';
import {geometryBounds} from '../core/cinematography.js';
import {createProjection} from '../visual/mesh.js';

export const MOTION_POLICY=Object.freeze({version:'motion-speed-v1',maxTurnDegPerSec:120,maxNodDegPerSec:35,maxTiltDegPerSec:10});
// GEN-03 (reported in the same check, own codes): camera view-direction pan speed and relative zoom rate per shot.
export const CAMERA_POLICY=Object.freeze({maxPanDegPerSec:30,maxZoomPerSec:.3});
// GEN-03 owner review ("the camera move makes characters out of screen"): share of each character's projected box
// (evaluated pose, real camera incl. speaker follow) outside the 720×1280 frame, every third frame. OFF_FRAME above 2 %.
export const FRAME_POLICY=Object.freeze({maxOutside:.02,every:3,width:720,height:1280});
export const VISIBILITY_POLICY=Object.freeze({version:'visibility-v1',grid:12,depthMargin:.15,maxCoveredMean:.85});
const r1=v=>Math.round(v*10)/10,r3=v=>Math.round(v*1000)/1000,DEG=180/Math.PI;
const isCharacter=asset=>recipeRig(asset).anchors.includes('right-hand');
const cameraPeaks=new Map(),frameShares=new Map();

// Timeline for checks before preparation: planned shot durations; each shot's lines spread evenly over 10–90 % of
// the shot with their line speakers. Marked estimated; prepared projects pass their measured timeline instead.
export function estimatedTimeline(project,planned){
 const t=structuredClone(planned);t.estimated=true;
 for(const [i,s] of project.shots.entries()){const sh=t.shots[i],n=s.narration?.length??0,a=sh.startFrame*1600,len=(sh.endFrame-sh.startFrame)*1600;
  sh.segments=(s.narration??[]).map((text,j)=>({text,startSample:Math.round(a+len*(.1+.8*j/n)),endSample:Math.round(a+len*(.1+.8*(j+.9)/n)),...(project.speech?.shotSpeakers?.[s.id]?{speaker:project.speech.shotSpeakers[s.id][j]}:{})}));}
 return t;
}
// Peak speeds per character for one shot (index into project.shots / timeline.shots).
export function motionShot(project,t,index){
 const s=project.shots[index],ts=t.shots[index],n=ts.endFrame-ts.startFrame,shot={...dialogueShot(s,ts),durationFrames:n};
 const ids=shot.assets.filter(a=>isCharacter(a.asset)).map(a=>a.id),peak={},cam={pan:[0,0],zoom:[0,0]};let prev=null,prevBody=null,prevCam=null;
 const offFrame={};
 const dir=c=>{const v=c.target.map((x,i)=>x-c.position[i]),m=Math.hypot(...v)||1;return v.map(x=>x/m);};
 for(let f=0;f<n;f++){
  const st=evaluateGraph(shot,n>1?f/(n-1):0),pose=new Map(st.assets.map(a=>[a.id,a.pose])),body=s.bodyLanguage?bodyAt(project,t,ts.startFrame+f,index):null;
  if(prev)for(const id of ids){const p=peak[id]??={turn:[0,0],nod:[0,0],tilt:[0,0]},a=pose.get(id),b=prev.get(id);if(!a||!b)continue;
   const turn=Math.abs(a.yaw-b.yaw)*30*DEG;if(turn>p.turn[0])p.turn=[turn,f];
   for(const k of ['nod','tilt']){const v=Math.abs((body?.[id]?.[k]??a[k]??0)-(prevBody?.[id]?.[k]??b[k]??0))*30*DEG;if(v>p[k][0])p[k]=[v,f];}}
  if(f%FRAME_POLICY.every===0)for(const id of ids){const a=st.assets.find(x=>x.id===id),b=a&&geometryBounds([a]);if(!b)continue;const pr=createProjection(st.camera.position,st.camera.target,st.camera.zoom,[360,650]);let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
   for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]]){const q=pr([x,y,z]);x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
   const area=Math.max(1e-9,(x1-x0)*(y1-y0)),inside=Math.max(0,Math.min(x1,FRAME_POLICY.width)-Math.max(x0,0))*Math.max(0,Math.min(y1,FRAME_POLICY.height)-Math.max(y0,0)),out=1-inside/area;
   const o=offFrame[id]??=[0,0];if(out>o[0])offFrame[id]=[out,f];}
  if(prevCam){const a=dir(st.camera),b=dir(prevCam),pan=Math.acos(Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]))*30*DEG,zoom=Math.abs(st.camera.zoom/prevCam.zoom-1)*30;if(pan>cam.pan[0])cam.pan=[pan,f];if(zoom>cam.zoom[0])cam.zoom=[zoom,f];}
  prev=pose;prevBody=body;prevCam=st.camera;
 }
 frameShares.set(s.id+'#'+index,Object.fromEntries(Object.entries(offFrame).map(([id,[v,f]])=>[id,{outside:r3(v),frame:f}])));
 cameraPeaks.set(s.id+'#'+index,{panDegPerSec:{value:r1(cam.pan[0]),frame:cam.pan[1]},zoomPerSec:{value:r3(cam.zoom[0]),frame:cam.zoom[1]}});
 return Object.fromEntries(Object.entries(peak).map(([id,p])=>[id,Object.fromEntries(Object.entries(p).map(([k,[v,f]])=>[k,{degPerSec:r1(v),frame:f}]))]));
}
export function motionCheck(project,t){
 const P=MOTION_POLICY,shots=[],warnings=[];
 for(const [i,s] of project.shots.entries()){if(s.template!=='cinematic-graph')continue;const peaks=motionShot(project,t,i),camera=cameraPeaks.get(s.id+'#'+i);shots.push({shot:s.id,peaks,camera});
  const frame=frameShares.get(s.id+'#'+i);shots.at(-1).offFrame=frame;
  for(const [id,v] of Object.entries(frame))if(v.outside>FRAME_POLICY.maxOutside)warnings.push({code:'OFF_FRAME',shot:s.id,asset:id,outside:v.outside,frame:v.frame,limit:FRAME_POLICY.maxOutside});
  if(camera.panDegPerSec.value>CAMERA_POLICY.maxPanDegPerSec)warnings.push({code:'FAST_CAMERA_PAN',shot:s.id,asset:'camera',degPerSec:camera.panDegPerSec.value,frame:camera.panDegPerSec.frame,limit:CAMERA_POLICY.maxPanDegPerSec});
  if(camera.zoomPerSec.value>CAMERA_POLICY.maxZoomPerSec)warnings.push({code:'FAST_CAMERA_ZOOM',shot:s.id,asset:'camera',perSec:camera.zoomPerSec.value,frame:camera.zoomPerSec.frame,limit:CAMERA_POLICY.maxZoomPerSec});
  for(const [id,p] of Object.entries(peaks))for(const [k,max,code] of [['turn',P.maxTurnDegPerSec,'FAST_TURN'],['nod',P.maxNodDegPerSec,'FAST_NOD'],['tilt',P.maxTiltDegPerSec,'FAST_TILT']])
   if(p[k].degPerSec>max)warnings.push({code,shot:s.id,asset:id,degPerSec:p[k].degPerSec,frame:p[k].frame,limit:max});}
 return {policy:P.version,timeline:t.estimated?'estimated':'measured',shots,warnings};
}
// Covered share of each asset's projected box by nearer assets' boxes (attachment parents and children excluded).
export function visibilityShot(shot){
 const P=VISIBILITY_POLICY,pre=inspectShot(shot),cover={},link=new Set();
 for(const a of shot.assets)for(const x of [a.attachment??[]].flat())if(x?.parent){link.add(a.id+'|'+x.parent);link.add(x.parent+'|'+a.id);}
 for(const row of pre.observations){
  const st=evaluateGraph(shot,row.progress),cam=st.camera.position,dist=new Map(st.assets.map(a=>[a.id,Math.hypot(...a.pose.origin.map((v,i)=>v-cam[i]))]));
  const boxes=row.objects.filter(o=>o.bounds&&o.bounds[2]>o.bounds[0]&&o.bounds[3]>o.bounds[1]);
  for(const o of boxes){
   const near=boxes.filter(b=>b.id!==o.id&&!link.has(o.id+'|'+b.id)&&dist.get(b.id)<dist.get(o.id)-P.depthMargin);let hit=0;
   for(let i=0;i<P.grid;i++)for(let j=0;j<P.grid;j++){const x=o.bounds[0]+(o.bounds[2]-o.bounds[0])*(i+.5)/P.grid,y=o.bounds[1]+(o.bounds[3]-o.bounds[1])*(j+.5)/P.grid;
    if(near.some(b=>x>=b.bounds[0]&&x<=b.bounds[2]&&y>=b.bounds[1]&&y<=b.bounds[3]))hit++;}
   (cover[o.id]??=[]).push(hit/(P.grid*P.grid));
  }
 }
 return Object.fromEntries(Object.entries(cover).map(([id,v])=>[id,{coveredMean:r3(v.reduce((a,b)=>a+b,0)/v.length),coveredMax:r3(Math.max(...v)),samples:v.length}]));
}
export function visibilityCheck(project){
 const shots=[],warnings=[];
 for(const s of project.shots){if(s.template!=='cinematic-graph')continue;const assets=visibilityShot(s);shots.push({shot:s.id,assets});
  for(const [id,v] of Object.entries(assets))if(v.coveredMean>VISIBILITY_POLICY.maxCoveredMean)warnings.push({code:'HIDDEN_ASSET',shot:s.id,asset:id,coveredMean:v.coveredMean});}
 return {policy:VISIBILITY_POLICY.version,shots,warnings};
}
