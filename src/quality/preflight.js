import {validateProject,validateTimeline} from '../core/timeline.js';
import {evaluateGraph} from '../core/graph.js';
import {emitCinematicAsset,handAnchor} from '../core/cinematography.js';
import {createProjection} from '../visual/mesh.js';
import {speechDrivenShot} from '../core/speech.js';
import {canonical} from '../core/identity.js';
import {createHash} from 'node:crypto';
export const QUALITY_VERSION='quality-v1';
export const digest=x=>createHash('sha256').update(canonical(x)).digest('hex');
const times=[0,.125,.25,.375,.5,.625,.75,.875,1];
const rounded=v=>Math.round(v*1e6)/1e6;
export const HANDOFF_GAP_LIMIT=.3;
const issue=(code,severity,shot,detail)=>({code,severity,shot,detail});
export function inspectShot(source,timing=null,speech=null){
 const s=timing?speechDrivenShot(source,timing,speech):source;
 if(s.template!=='cinematic-graph')return {shot:s.id,scope:'not-graph',issues:[]};
 const observations=[];let vertices=0,cropped=0,safeOutside=0,near=0,nonfinite=0,small=0;
 const centers=new Map(),motion=[];
 for(const progress of times){
  const state=evaluateGraph(s,progress),c=state.camera,project=createProjection(c.position,c.target,c.zoom,[360,640]);
  const row={progress,objects:[]};
  for(const a of state.assets){
   let count=0,off=0,safe=0,behind=0,bad=0,lo=[Infinity,Infinity],hi=[-Infinity,-Infinity],minDepth=Infinity;
   emitCinematicAsset(a,(center,size,_color,tf=x=>x)=>{
    for(const dx of [-1,1])for(const dy of [-1,1])for(const dz of [-1,1]){
     const v=project(tf(center.map((n,i)=>n+size[i]*[dx,dy,dz][i]/2)));count++;
     if(!v.every(Number.isFinite)){bad++;continue;}
     minDepth=Math.min(minDepth,v[2]);if(v[2]<=.1){behind++;continue;}
     for(let i=0;i<2;i++){lo[i]=Math.min(lo[i],v[i]);hi[i]=Math.max(hi[i],v[i]);}
     if(v[0]<0||v[0]>720||v[1]<0||v[1]>1280)off++;
     if(v[0]<24||v[0]>696||v[1]<310||v[1]>1040)safe++;
    }
   });
   if(!count){row.objects.push({id:a.id,visibleGeometry:false});continue;}
   const bounds=lo.every(Number.isFinite)&&hi.every(Number.isFinite)?[...lo,...hi].map(rounded):null;
   if(bounds){
    const p=[(lo[0]+hi[0])/2,(lo[1]+hi[1])/2],prior=centers.get(a.id);
    if(prior)motion.push(Math.hypot(p[0]-prior[0],p[1]-prior[1]));
    centers.set(a.id,p);
    if(a.id===s.cameraRig?.subject&&hi[0]-lo[0]<60&&hi[1]-lo[1]<60)small++;
   }
   vertices+=count;cropped+=off;safeOutside+=safe;near+=behind;nonfinite+=bad;
   row.objects.push({id:a.id,asset:a.asset,vertices:count,cropped:off,safeOutside:safe,nearPlane:behind,nonfinite:bad,bounds,minDepth:Number.isFinite(minDepth)?rounded(minDepth):null});
  }
  observations.push(row);
 }
 const metrics={vertices,nearPlaneVertices:near,nonfiniteVertices:nonfinite,croppedFraction:rounded(cropped/Math.max(1,vertices)),safeOutsideFraction:rounded(safeOutside/Math.max(1,vertices)),smallSubjectSamples:small,meanProjectedCenterMotion:rounded(motion.reduce((a,b)=>a+b,0)/Math.max(1,motion.length))};
 const issues=[];
 if(nonfinite)issues.push(issue('NONFINITE_GEOMETRY','error',s.id,nonfinite));
 if(!vertices)issues.push(issue('EMPTY_GEOMETRY','error',s.id,0));
 if(near)issues.push(issue('NEAR_PLANE_RISK','error',s.id,near));
 if(metrics.croppedFraction>.015)issues.push(issue('VIEWPORT_CROP','warning',s.id,metrics.croppedFraction));
 if(metrics.safeOutsideFraction>.12)issues.push(issue('SAFE_ZONE_RISK','warning',s.id,metrics.safeOutsideFraction));
 if(small)issues.push(issue('SMALL_SUBJECT','warning',s.id,small));
 if(metrics.meanProjectedCenterMotion<1)issues.push(issue('LOW_PROJECTED_MOTION','review',s.id,metrics.meanProjectedCenterMotion));
 // ART-01: only opt-in handoff chains are checked, so historical reports are unchanged.
 for(const a of s.assets)if(Array.isArray(a.attachment))for(let k=1;k<a.attachment.length;k++){
  const x=a.attachment[k-1],y=a.attachment[k],state=evaluateGraph(s,y.start),pose=id=>state.assets.find(b=>b.id===id);
  const from=pose(x.parent),to=pose(y.parent),gap=Math.hypot(...[0,1,2].map(i=>handAnchor(from.asset,from.pose,x.anchor==='right-hand'?1:-1)[i]-handAnchor(to.asset,to.pose,y.anchor==='right-hand'?1:-1)[i]));
  if(gap>HANDOFF_GAP_LIMIT)issues.push(issue('HANDOFF_GAP','warning',s.id,{prop:a.id,at:y.start,from:x.parent,to:y.parent,gap:rounded(gap)}));
 }
 return {shot:s.id,scope:'sampled-projected-asset-geometry',metrics,observations,issues};
}
function contentChecks(project){
 const issues=[],headings=new Map(),phrases=new Map();
 for(const s of project.shots??[]){
  if(s.heading){const k=s.heading.trim().toLowerCase();if(headings.has(k))issues.push(issue('REPEATED_HEADING','review',s.id,headings.get(k)));else headings.set(k,s.id);}
  for(const p of s.narration){
   const k=p.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
   if(k.length>25&&phrases.has(k))issues.push(issue('REPEATED_NARRATION','review',s.id,phrases.get(k)));else phrases.set(k,s.id);
  }
 }
 return issues;
}
export function inspectProject(project,timeline=null){
 validateProject(project);if(timeline)validateTimeline(project,timeline);
 if(project.version!==2)return {version:1,scope:'legacy-contract-only',shots:[],issues:[],contentVerification:'human review required'};
 const rows=project.shots.map((s,i)=>inspectShot(s,timeline?.shots[i],project.speech));
 return {version:1,scope:timeline?'measured-timeline-preflight':'planned-timeline-preflight',shots:rows,issues:[...rows.flatMap(s=>s.issues),...contentChecks(project)],contentVerification:'structural duplicate checks only; factual accuracy, relevance and artistic merit require human review'};
}
function candidates(s){
 if(!s.cameraRig)return [];
 const {camera,cameraRig:r}=s,reduce=k=>({...camera,zoom:(camera.zoom??[[0,1150]]).map(([p,v])=>[p,Math.max(700,Math.round(v*k))])});
 return [
  {name:'reduce-zoom-20-percent',camera:reduce(.8),cameraRig:{...r,padding:Math.max(r.padding??0,.18)}},
  {name:'reduce-zoom-to-minimum',camera:reduce(.55),cameraRig:{...r,padding:.25}},
  {name:'frame-ensemble',camera:Object.fromEntries(Object.entries(camera).filter(([k])=>k!=='zoom')),cameraRig:{preset:r.preset,framing:'establishing',padding:.22,strength:.9}},
  {name:'wider-establishing-camera',camera:{},cameraRig:{preset:'establishing',framing:'establishing',padding:.22,strength:.9}},
  {name:'wide-static-zoom',camera:{zoom:[[0,700]]},cameraRig:{preset:'establishing',framing:'establishing',padding:.25,strength:.9}}
 ];
}
function rank(m){return [m.nonfiniteVertices+(m.vertices?0:1000000),m.nearPlaneVertices,m.croppedFraction,m.safeOutsideFraction];}
function better(a,b){for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]<b[i];}return false;}
function protectedDigest(project){
 return digest({...project,shots:project.shots.map(s=>{const {camera,cameraRig,...rest}=s;return rest;})});
}
export function repairProject(project,timeline=null,{enabled=false,maxCandidates=20,maxPasses=1}={}){
 if(typeof enabled!=='boolean'||!Number.isSafeInteger(maxCandidates)||maxCandidates<0||maxCandidates>40||!Number.isSafeInteger(maxPasses)||maxPasses<0||maxPasses>2)throw Error('invalid repair budget');
 const before=inspectProject(project,timeline),inputDigest=digest(project),invariant=protectedDigest(project.version===2?project:{...project,shots:[]});
 let current=structuredClone(project),attempts=[],accepted=[],used=0;
 if(enabled&&current.version===2)for(let pass=0;pass<maxPasses;pass++){
  let changed=false;
  for(let i=0;i<current.shots.length&&used<maxCandidates;i++){
   const s=current.shots[i],timing=timeline?.shots[i],original=inspectShot(s,timing,current.speech);
   if(!original.metrics||!original.issues.some(x=>['NONFINITE_GEOMETRY','NEAR_PLANE_RISK','VIEWPORT_CROP','SAFE_ZONE_RISK'].includes(x.code)))continue;
   let best=original,selected=null;
   for(const candidate of candidates(s)){
    if(used>=maxCandidates)break;used++;
    const {name,...patch}=candidate,shot={...s,...patch};
    let result;try{
     const proposed={...current,shots:current.shots.map((x,j)=>j===i?shot:x)};
     validateProject(proposed);if(timeline)validateTimeline(proposed,timeline);
     if(protectedDigest(proposed)!==invariant)throw Error('protected content changed');
     result=inspectShot(shot,timing,current.speech);
    }catch(e){attempts.push({pass,shot:s.id,name,status:'invalid',reason:String(e.message).slice(0,240)});continue;}
    const m=result.metrics,o=original.metrics;
    const admissible=m.smallSubjectSamples<=o.smallSubjectSamples&&m.nonfiniteVertices<=o.nonfiniteVertices&&m.nearPlaneVertices<=o.nearPlaneVertices&&m.croppedFraction<=o.croppedFraction;
    const improved=admissible&&better(rank(m),rank(best.metrics));
    attempts.push({pass,shot:s.id,name,status:improved?'candidate-improvement':'rejected',metrics:m});
    if(improved){best=result;selected={name,patch,shot};}
   }
   if(selected){
    accepted.push({pass,shot:s.id,name:selected.name,before:{camera:s.camera,cameraRig:s.cameraRig,metrics:original.metrics},after:{...selected.patch,metrics:best.metrics}});
    current.shots[i]=selected.shot;changed=true;
   }
  }
  if(!changed)break;
 }
 const after=inspectProject(current,timeline);
 if(project.version===2&&protectedDigest(current)!==invariant)throw Error('repair violated protected-content invariant');
 return {project:current,report:{version:1,policy:QUALITY_VERSION,enabled,inputDigest,outputDigest:digest(current),protectedContentDigest:invariant,limits:{maxCandidates,maxPasses},candidateEvaluations:used,accepted,attempts,before,after,renderCost:{extraNativeRenders:0,changedShots:[...new Set(accepted.map(x=>x.shot))],partialRerenderSupported:false,reason:'pre-render camera repair; compiled speech reused; native integrated film rendered once'}}};
}
