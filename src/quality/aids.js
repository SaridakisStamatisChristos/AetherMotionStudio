// DUAL-01 check aids-v1 (diagnostic, every production with compose-v1 compositions; not a gate).
// Samples every third frame of each shot with a composition and reports:
// - AIDS_ON_HEAD: a text plate covers more than 5 % of the top 40 % (head) of a character's projected box;
// - AIDS_ON_OBJECT: plates cover more than 25 % of a non-character object's projected box;
// - AIDS_ON_CAPTION: a plate meets the burned-in caption box of the active cue (normal or Reels layout).
import {evaluateGraph} from '../core/graph.js';
import {geometryBounds} from '../core/cinematography.js';
import {layoutComposition,compositionPlates,phraseWindows} from '../core/composition.js';
import {dialogueShot} from '../core/dialogue.js';
import {createProjection} from '../visual/mesh.js';
import {cueAt} from '../core/speech.js';
import {REELS} from '../core/reels-layout.js';
import {isCatalogCharacter} from './crowding.js';
export const AIDS_POLICY=Object.freeze({version:'aids-v1',every:3,headShare:REELS.headShare,maxOnHead:.05,maxOnObject:.25});
const inter=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
// The caption box drawn by drawSpeechCue for this cue, in logical pixels.
export function captionBox(project,cue){
 const names=project.speech?.captions?.speakerNames!==false&&Object.keys(project.speech?.speakers??{}).length>1;
 const h=cue.cue.lines.length*40+30+(names?24:0);
 return project.delivery===REELS.version?{x:REELS.caption.left,y:REELS.caption.bottom-h,w:REELS.caption.width,h}:{x:42,y:1171-h,w:636,h};
}
export function aidsCheck(project,t){
 const P=AIDS_POLICY,shots=[],warnings=[],r3=v=>Math.round(v*1000)/1000;
 for(const [i,s0] of project.shots.entries()){
  if(s0.template!=='cinematic-graph'||!s0.composition)continue;
  const ts=t.shots[i],n=ts.endFrame-ts.startFrame,s={...dialogueShot(s0,ts),durationFrames:n},count=s0.narration?.length??0,layout=layoutComposition(s0.composition,'composition',{phrases:count}),phrases=phraseWindows(ts,count);
  const worst={},caption=[0,null];
  for(let f=0;f<n;f+=P.every){
   const p=n>1?f/(n-1):0,plates=compositionPlates(layout,p,phrases);if(!plates.length)continue;
   const st=evaluateGraph(s,p),c=st.camera,pr=createProjection(c.position,c.target,c.zoom,[360,640]);
   for(const a of st.assets){const b=geometryBounds([a]);if(!b)continue;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity,behind=false;
    for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]]){const q=pr([x,y,z]);if(!(q[2]>.1))behind=true;x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
    if(behind)continue;
    const frame={x:0,y:0,w:720,h:1280},box={x:x0,y:y0,w:x1-x0,h:y1-y0};if(inter(box,frame)<=0)continue;
    const char=isCatalogCharacter(a.asset),area=char?{x:x0,y:y0,w:x1-x0,h:(y1-y0)*P.headShare}:box,size=Math.max(1e-9,area.w*area.h);
    // union bound: plates of one composition never overlap each other (layoutComposition), so the sum is exact
    const share=Math.min(1,plates.reduce((n,q)=>n+inter(area,q),0)/size);
    const w=worst[a.id]??={kind:char?'head':'object',share:0,frame:null};if(share>w.share){w.share=share;w.frame=f;}
   }
   const cue=project.speech?cueAt(t,ts.startFrame+f):null;
   if(cue&&project.speech.captions?.mode!=='sidecar'){const cb=captionBox(project,cue),o=plates.reduce((n,q)=>n+inter(cb,q),0);if(o>caption[0]){caption[0]=o;caption[1]=f;}}
  }
  shots.push({shot:s0.id,region:layout.region,items:layout.items.length,assets:Object.fromEntries(Object.entries(worst).map(([id,w])=>[id,{kind:w.kind,covered:r3(w.share),frame:w.frame}])),captionOverlapPx:r3(caption[0])});
  for(const [id,w] of Object.entries(worst)){
   if(w.kind==='head'&&w.share>P.maxOnHead)warnings.push({code:'AIDS_ON_HEAD',shot:s0.id,asset:id,share:r3(w.share),frame:w.frame,limit:P.maxOnHead});
   if(w.kind==='object'&&w.share>P.maxOnObject)warnings.push({code:'AIDS_ON_OBJECT',shot:s0.id,asset:id,share:r3(w.share),frame:w.frame,limit:P.maxOnObject});}
  if(caption[0]>0)warnings.push({code:'AIDS_ON_CAPTION',shot:s0.id,asset:null,overlapPx:r3(caption[0]),frame:caption[1]});
 }
 return {policy:P.version,applies:shots.length>0,shots,warnings};
}
