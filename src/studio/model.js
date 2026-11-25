import {pinAsset} from '../foundry/packs.js';
import {validateProject,validateTimeline} from '../core/timeline.js';
import {FIDELITY_DEFAULTS} from '../core/fidelity.js';
import {stageProject} from '../core/staging.js';
const fail=m=>{throw Error(m)};
export function editProject(project,fn){
 const candidate=structuredClone(project);fn(candidate);validateProject(candidate);return candidate;
}
export function setBackend(project,backend){return editProject(project,p=>{if(p.version!==2)fail('Graph backend selection requires v2');for(const s of p.shots)if(s.template==='cinematic-graph')s.backend=backend;});}
export function setProfile(project,profile){if(!['original','polished'].includes(profile))fail('Invalid profile');return editProject(project,p=>{if(p.version!==2)fail('Graph profile selection requires v2');for(const s of p.shots)if(s.template==='cinematic-graph'){if(profile==='original')delete s.fidelity;else s.fidelity={...FIDELITY_DEFAULTS};}});}
// ART-04: one-click staging pass for hand-authored or generated projects (pure, validated).
export function setStaging(project,mode='art-v1'){return stageProject(project,mode);}
// TALK-04 speaker editor. Transactional (edits a clone; the full project validator is the gate), so a rejected edit
// never changes the project. Speakers live in speech.speakers, line speakers in speech.shotSpeakers, and the
// speaker→character binding in shot.speakerAssets (TALK-01 contract).
const speechShot=(p,index)=>{if(p.version!==2||!p.speech)fail('Speakers require a v2 speech project');const s=p.shots[index];if(!s)fail('Unknown shot');return s;};
export function setSpeakers(project,speakers){
 return editProject(project,p=>{speechShot(p,0);if(!speakers||typeof speakers!=='object'||Array.isArray(speakers))fail('Speakers must be an object');p.speech.speakers=structuredClone(speakers);});
}
// Sets the speaker of one narration line. A shot without line speakers is voiced entirely by the default narrator, which
// cannot be mixed with named speakers, so the first assignment gives every line of that shot this speaker.
export function setLineSpeaker(project,shotIndex,phraseIndex,speakerId){
 return editProject(project,p=>{const s=speechShot(p,shotIndex);
  if(!Number.isSafeInteger(phraseIndex)||phraseIndex<0||phraseIndex>=s.narration.length)fail('Unknown narration line');
  if(typeof speakerId!=='string'||!Object.hasOwn(p.speech.speakers,speakerId))fail('Unknown speaker');
  const list=Object.hasOwn(p.speech.shotSpeakers,s.id)?[...p.speech.shotSpeakers[s.id]]:s.narration.map(()=>speakerId);
  list[phraseIndex]=speakerId;p.speech.shotSpeakers[s.id]=list;});
}
// Binds a speaker to a character in one shot (assetId null removes the binding; an empty map removes speakerAssets).
export function bindSpeaker(project,shotIndex,speakerId,assetId){
 return editProject(project,p=>{const s=speechShot(p,shotIndex);if(s.template!=='cinematic-graph')fail('Select a graph shot');
  if(typeof speakerId!=='string'||speakerId!=='default'&&!Object.hasOwn(p.speech.speakers,speakerId))fail('Unknown speaker');
  const map={...(s.speakerAssets??{})};
  if(assetId===null)delete map[speakerId];else{if(typeof assetId!=='string'||!s.assets.some(a=>a.id===assetId))fail('Unknown character in this shot');map[speakerId]=assetId;}
  if(Object.keys(map).length)s.speakerAssets=map;else delete s.speakerAssets;});
}
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
