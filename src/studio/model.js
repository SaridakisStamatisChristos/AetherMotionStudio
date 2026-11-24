import {pinAsset} from '../foundry/packs.js';
import {validateProject,validateTimeline} from '../core/timeline.js';
import {FIDELITY_DEFAULTS} from '../core/fidelity.js';
import {stageProject} from '../director/staging.js';
const fail=m=>{throw Error(m)};
export function editProject(project,fn){
 const candidate=structuredClone(project);fn(candidate);validateProject(candidate);return candidate;
}
export function setBackend(project,backend){return editProject(project,p=>{if(p.version!==2)fail('Graph backend selection requires v2');for(const s of p.shots)if(s.template==='cinematic-graph')s.backend=backend;});}
export function setProfile(project,profile){if(!['original','polished'].includes(profile))fail('Invalid profile');return editProject(project,p=>{if(p.version!==2)fail('Graph profile selection requires v2');for(const s of p.shots)if(s.template==='cinematic-graph'){if(profile==='original')delete s.fidelity;else s.fidelity={...FIDELITY_DEFAULTS};}});}
// ART-04: one-click staging pass for hand-authored or generated projects (pure, validated).
export function setStaging(project,mode='art-v1'){return stageProject(project,mode);}
export function applyShotEdit(project,index,changes){
 return editProject(project,p=>{
  if(p.version!==2||!p.shots[index])fail('Unknown shot');
  const s=p.shots[index];
  for(const [k,v] of Object.entries(changes)){
   if(!['heading','subheading','narration','durationFrames','backend','environment','cameraRig','camera','assets','effects','overlays','fidelity','transition','transitionFrames','layers'].includes(k))fail('Unsupported shot edit');
   if(v===undefined)delete s[k];else s[k]=v;
  }
  if(p.speech&&Object.hasOwn(changes,'durationFrames')){
   if(s.durationFrames===null)delete p.speech.fixedShots[s.id];else p.speech.fixedShots[s.id]=s.durationFrames;
  }
 });
}
export function reorderShot(project,index,to){
 return editProject(project,p=>{
  if(p.version!==2||!Number.isSafeInteger(index)||!Number.isSafeInteger(to)||index<0||to<0||index>=p.shots.length||to>=p.shots.length)fail('Invalid shot index');
  const [s]=p.shots.splice(index,1);p.shots.splice(to,0,s);
  p.shots[0].transitionFrames=0;if(p.shots[0].template==='cinematic-graph')p.shots[0].transition='cut';
 });
}
export function addAsset(project,index,asset){
 const s=project.shots?.[index];if(!s||s.template!=='cinematic-graph')fail('Select a graph shot');
 const ids=new Set(s.assets.map(a=>a.id));let n=1;while(ids.has('object-'+n))n++;
 return applyShotEdit(project,index,{assets:[...s.assets,{id:'object-'+n,asset,tracks:{x:[[0,0]],scale:[[0,.75]]}}]});
}
export function removeAsset(project,index,id){
 const s=project.shots?.[index];if(!s||s.template!=='cinematic-graph')fail('Select a graph shot');
 // Reject rather than silently remove references/identity constraints.
 return editProject(project,p=>{const shot=p.shots[index];shot.assets=shot.assets.filter(a=>a.id!==id);if(shot.lodPolicy?.overrides)shot.lodPolicy.overrides=shot.lodPolicy.overrides.filter(x=>x.asset!==id);});
}
export function plannedTimeline(p){
 validateProject(p);if(p.version===1)return null;
 const fixed=p.shots.map(s=>s.durationFrames??null);
 let durations=fixed.map((n,i)=>n??Math.max(60,Math.min(3600,Math.round(p.shots[i].narration.join(' ').trim().split(/\s+/).length*15+45))));
 if(p.speech){
  const ids=p.shots.map((s,i)=>fixed[i]===null?i:-1).filter(i=>i>=0),budget=p.speech.targetFrames;
  durations=fixed.map(n=>n??60);
  let left=budget-durations.reduce((a,b)=>a+b,0);
  if(left<0)fail('Infeasible estimated timeline');
  while(left){const open=ids.filter(i=>durations[i]<3600);if(!open.length)fail('Infeasible estimated timeline');
   const n=Math.max(1,Math.floor(left/open.length));
   for(const i of open){const add=Math.min(n,left,3600-durations[i]);durations[i]+=add;left-=add;if(!left)break;}
  }
 }else if(durations.reduce((a,b)=>a+b,0)>9000){
  // Preserve all authored fixed durations; allocate remaining budget evenly to automatic shots.
  const ids=fixed.map((n,i)=>n===null?i:-1).filter(i=>i>=0);durations=fixed.map(n=>n??60);
  let left=9000-durations.reduce((a,b)=>a+b,0);
  for(const i of ids){const n=Math.min(3540,Math.floor(left/(ids.length-ids.indexOf(i))));durations[i]+=n;left-=n;}
 }
 let offset=0;const shots=p.shots.map((s,i)=>{const startFrame=offset;offset+=durations[i];return {id:s.id,startFrame,endFrame:offset,transitionFrames:s.transitionFrames,segments:[]};});
 return {version:1,fps:30,sampleRate:48000,durationFrames:offset,shots};
}
export function previewState(project,prepared=null){
 validateProject(project);
 if(prepared){validateProject(prepared.scene);if(prepared.scene.version===2)validateTimeline(prepared.scene,prepared.timeline);return {scene:prepared.scene,timeline:prepared.timeline,mode:'measured snapshot'};}
 // No invented speech cues in draft preview.
 return {scene:project,timeline:plannedTimeline(project),mode:'estimated draft (silent)'};
}

export function addFoundryAsset(project,index,entry,lod=0){
 return editProject(project,p=>{
  const s=p.shots?.[index];if(!s||s.template!=='cinematic-graph'||!['foundry-af04','foundry-af07'].includes(s.geometryProfile))fail('Select an AF04 or AF07 premium graph; legacy migration is explicit');
  if(entry.kind==='generated'&&s.geometryProfile!=='foundry-af07')fail('Generated assets require AF07 profile');
  if(s.lodPolicy?.selection!=='explicit')fail('Select explicit LOD before adding pinned assets');
  const ids=new Set(s.assets.map(a=>a.id));let n=1;while(ids.has('object-'+n))n++;const id='object-'+n;
  s.assets.push(pinAsset(entry,id,{x:[[0,0]],scale:[[0,.75]]}));s.lodPolicy.overrides.push({asset:id,level:lod});
 });
}
