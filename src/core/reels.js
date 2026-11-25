// GEN-09 Instagram Reels mode (opt-in project `delivery:'reels-v1'`). Owner: "can the instagram be a mode and in case i
// want i can generate longer videos?" — yes: a mode, and length is only a warning, never a limit.
// What the mode changes (default output is unchanged without it):
// - layout: the app's own overlay covers the top, the bottom and the right edge of a Reel, so the heading is smaller,
//   the AETHER pill, subheading and progress bar are left out, and captions sit just under the heading, all inside
//   the Reels-safe area;
// - framing: group and single framings fit the characters into the Reels-safe area below the captions
//   (cameraRig.safeArea 'reels-v1', set on every group/single rig by reelsProject);
// - check reels-safe-v1: characters under the app overlay, or under an active caption, are reported.
// Layout constants and the safe-area assumption: src/core/reels-layout.js.
import {evaluateGraph} from './graph.js';
import {geometryBounds} from './cinematography.js';
import {REELS} from './reels-layout.js';
import {dialogueShot} from './dialogue.js';
import {createProjection} from '../visual/mesh.js';
import {recipeSpec} from '../visual/catalog-rig.js';
import {cueAt} from './speech.js';

export {REELS};
const isChar=asset=>asset==='retro-robot'||['human','robot','animal'].includes(recipeSpec(asset)?.family);

// Turn any v2 project into a Reels delivery. Returns {project, report}; the input is not modified.
export function reelsProject(project){
 const out=structuredClone(project),report={version:REELS.version,framed:[],unframed:[]};
 out.delivery=REELS.version;
 for(const s of out.shots){if(s.template!=='cinematic-graph')continue;
  if(['group','single'].includes(s.cameraRig?.framing)){s.cameraRig.safeArea=REELS.version;report.framed.push(s.id);}
  else report.unframed.push(s.id);}
 return {project:out,report};
}
// Characters under the app overlay or under an active caption (estimated or measured timeline).
export function reelsCheck(project,t){
 const P=REELS,shots=[],warnings=[];
 if(project.delivery!==P.version)return {policy:P.version,applies:false,shots,warnings};
 for(const [i,s0] of project.shots.entries()){if(s0.template!=='cinematic-graph')continue;
  const ts=t.shots[i],n=ts.endFrame-ts.startFrame,s={...dialogueShot(s0,ts),durationFrames:n},worst={};
  for(let f=0;f<n;f+=P.every){
   const st=evaluateGraph(s,n>1?f/(n-1):0),c=st.camera,pr=createProjection(c.position,c.target,c.zoom,[360,640]);
   const cue=project.speech?cueAt(t,ts.startFrame+f):null;
   for(const a of st.assets){if(!isChar(a.asset))continue;const b=geometryBounds([a]);if(!b)continue;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity,behind=false;
    for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]]){const q=pr([x,y,z]);if(!(q[2]>.1))behind=true;x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
    if(behind)continue;
    const area=Math.max(1e-9,(x1-x0)*(y1-y0)),inFrame=Math.max(0,Math.min(x1,720)-Math.max(x0,0))*Math.max(0,Math.min(y1,1280)-Math.max(y0,0));
    if(inFrame<=0)continue;// wholly outside the frame: not shown, not covered
    const safe=Math.max(0,Math.min(x1,P.ui.x[1])-Math.max(x0,P.ui.x[0]))*Math.max(0,Math.min(y1,P.ui.y[1])-Math.max(y0,P.ui.y[0]));
    const under=(inFrame-safe)/area,caption=cue?Math.max(0,Math.min(y1,P.characters.y[0])-Math.max(y0,P.caption.top))*Math.max(0,Math.min(x1,P.caption.left+P.caption.width)-Math.max(x0,P.caption.left))/area:0;
    const w=worst[a.id]??={ui:[0,0],caption:[0,0]};if(under>w.ui[0])w.ui=[under,f];if(caption>w.caption[0])w.caption=[caption,f];
   }
  }
  const r3=v=>Math.round(v*1000)/1000;
  shots.push({shot:s0.id,characters:Object.fromEntries(Object.entries(worst).map(([id,w])=>[id,{underOverlay:r3(w.ui[0]),overlayFrame:w.ui[1],underCaption:r3(w.caption[0]),captionFrame:w.caption[1]}]))});
  for(const [id,w] of Object.entries(worst)){
   if(w.ui[0]>P.maxOutside)warnings.push({code:'REELS_UNDER_OVERLAY',shot:s0.id,asset:id,share:r3(w.ui[0]),frame:w.ui[1],limit:P.maxOutside});
   if(w.caption[0]>P.maxOutside)warnings.push({code:'REELS_UNDER_CAPTION',shot:s0.id,asset:id,share:r3(w.caption[0]),frame:w.caption[1],limit:P.maxOutside});}
 }
 const seconds=t.durationFrames/30;
 if(seconds>P.recommendedMaxSeconds)warnings.push({code:'REELS_LONG',shot:null,asset:null,seconds,recommended:P.recommendedMaxSeconds});
 return {policy:P.version,applies:true,timeline:t.estimated?'estimated':'measured',seconds,shots,warnings};
}
