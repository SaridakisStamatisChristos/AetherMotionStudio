// GEN-06 (owner: "yes i want these cuts"): variety for vertical feeds without cropping anybody. A long dialogue line
// becomes its own shot framed on the speaker alone (a "single"); the lines before and after stay in group shots.
// - Shot lengths still come from the measured speech (speech projects allocate frames per shot from the measured
//   phrases), so each single lasts exactly as long as its line needs. Line length is estimated from words only to
//   decide where to cut.
// - The single uses the camera rig (new opt-in framing 'single' = the GEN-02 group fit on one subject, plus targetOffset
//   and padding), shared by both backends like every other camera.
// - Framing is chosen by measuring the real camera at nine points through the shot: the speaker must be fully
//   inside the 9:16 safe area, and every other character fully outside the frame or fully inside it, never cut by an
//   edge. If no candidate passes, the line stays in the group shot and the report says why.
// - Only safe shots are split: speech-driven (automatic duration), dialogue with speaker bindings, characters standing
//   still (single-key x/z tracks, no actions, attachments or locomotion). Everything else is reported and kept.
import {evaluateGraph} from './graph.js';
import {geometryBounds,CAMERA_RIGS} from './cinematography.js';
import {createProjection} from '../visual/mesh.js';
import {recipeSpec} from '../visual/catalog-rig.js';
import {REELS} from './reels-layout.js';

export const SINGLES=Object.freeze({version:'singles-v1',minWords:10,maxPerShot:1,offsets:Object.freeze([0,.2,.4,.6]),paddings:Object.freeze([.05,.1,.2]),presets:Object.freeze(['medium','close-up']),
 frame:Object.freeze({width:720,height:1280}),inside:Object.freeze({x:Object.freeze([0,720]),y:Object.freeze([0,1280])}),samples:Object.freeze([0,.125,.25,.375,.5,.625,.75,.875,1]),safe:Object.freeze({x:[24,696],y:[310,1040]}),margin:12,maxShots:60});
const isChar=asset=>asset==='retro-robot'||['human','robot','animal'].includes(recipeSpec(asset)?.family);
const words=t=>String(t).trim().split(/\s+/).filter(Boolean).length;
const still=a=>Object.entries(a.tracks??{}).every(([k,v])=>!['x','y','z'].includes(k)||v.length===1)&&!a.actions&&!a.attachment&&!a.locomotion&&!a.aim;

// Projected 2D box of one evaluated asset.
function box(a,project){const b=geometryBounds([a]);if(!b)return null;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
 for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]]){const q=project([x,y,z]);if(!(q[2]>.1))return null;x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
 return [x0,y0,x1,y1];}
// Does this candidate single shot keep the speaker whole and every other character either whole or gone?
export function singleFits(shot,speakerId,P=SINGLES){
 let height=Infinity;const cut=new Set();
 for(const progress of P.samples){
  const st=evaluateGraph(shot,progress),c=st.camera,project=createProjection(c.position,c.target,c.zoom,[P.frame.width/2,P.frame.height/2]);
  for(const a of st.assets){const b=box(a,project);
   const I=P.inside;if(!b||!(b[0]>=I.x[0]&&b[2]<=I.x[1]&&b[1]>=I.y[0]&&b[3]<=I.y[1]))cut.add(a.id);
   if(!isChar(a.asset))continue;
   if(a.id===speakerId){if(!b||b[0]<P.safe.x[0]||b[2]>P.safe.x[1]||b[1]<P.safe.y[0]||b[3]>P.safe.y[1])return null;height=Math.min(height,(b[3]-b[1])/(P.safe.y[1]-P.safe.y[0]));continue;}
   if(!b)continue;
   const out=b[2]<-P.margin||b[0]>P.frame.width+P.margin||b[3]<-P.margin||b[1]>P.frame.height+P.margin;
   const inside=b[0]>=P.inside.x[0]&&b[2]<=P.inside.x[1]&&b[1]>=P.inside.y[0]&&b[3]<=P.inside.y[1];
   if(!out&&!inside)return null;
  }
 }
 // gone: assets not wholly inside the frame at every sample. They are left out of the single (characters among them
 // were outside at every sample, by the rule above), so nothing in the single is cut by an edge.
 return {height,gone:shot.assets.map(a=>a.id).filter(id=>id!==speakerId&&cut.has(id))};
}
// Best single framing for a speaker: the largest speaker among candidates that pass; ties keep the smaller offset.
export function solveSingle(shot,speakerId,P=SINGLES){
 // Candidates: the shot's own preset, then calm static presets; lateral target offsets both ways (aiming past the
 // speaker moves neighbours out on the other side). Largest speaker wins; ties keep the earlier (simpler) candidate.
 // Mirrored: the preset's camera path reflected to the other side (explicit camera x track), for speakers whose
 // neighbours stand on the preset's side.
 let best=null;const ownX=Object.hasOwn(shot.camera??{},'x');
 for(const preset of [...new Set([shot.cameraRig?.preset,...P.presets].filter(Boolean))])for(const mirror of ownX?[false]:[false,true])for(const padding of P.paddings)for(const o of P.offsets)for(const sign of o?[1,-1]:[1]){
  const rig={...shot.cameraRig,preset,framing:'single',subject:speakerId,padding,...(o?{targetOffset:[sign*o,0,0]}:{})};delete rig.focus;delete rig.subjects;
  const R=CAMERA_RIGS[preset],camera=mirror?{...shot.camera,x:R.a[0]===R.b[0]?[[0,-R.a[0]]]:[[0,-R.a[0]],[1,-R.b[0]]]}:shot.camera;
  const fit=singleFits({...shot,camera,cameraRig:rig},speakerId,P);
  if(fit&&(!best||fit.height>best.height+1e-6))best={rig,camera,height:fit.height,gone:fit.gone,offset:+(sign*o).toFixed(2),padding,preset,mirror};
 }
 return best;
}
// Split long lines of eligible shots into singles. Returns {project, report}; the input is not modified.
export function singleShots(project,P0=SINGLES){
 // GEN-09: a Reels delivery solves singles for the Reels character area (below captions, above the app overlay).
 const P=project.delivery===REELS.version?{...P0,safe:REELS.characters,inside:REELS.ui}:P0;
 const speech=project.speech,report={version:P.version,singles:[],kept:[]};
 if(!speech?.shotSpeakers)return {project,report};
 const out=structuredClone(project),shots=[];let total=project.shots.length;
 for(const s of out.shots){
  const lines=s.narration??[],ids=speech.shotSpeakers[s.id],long=lines.map((t,i)=>words(t)>=P.minWords?i:-1).filter(i=>i>=0);
  const why=s.template!=='cinematic-graph'?'not a graph shot':!ids||!s.speakerAssets?'no line speakers':!long.length?null:Object.hasOwn(speech.fixedShots,s.id)?'fixed duration':speech.cues?.some(c=>c.shot===s.id)?'audio cues':!s.assets.filter(a=>isChar(a.asset)).every(still)?'characters move':lines.length<2&&s.assets.filter(a=>isChar(a.asset)).length<2?'already a single':null;
  if(why||!long.length){if(why&&long.length)report.kept.push({shot:s.id,reason:why});shots.push(s);continue;}
  // first long line (calm: at most one single per shot), never the only line of a shot with a single character
  const k=long[0],speakerAsset=s.speakerAssets[ids[k]];
  const solo={...s,id:s.id+'-single',narration:[lines[k]],transitionFrames:0,transition:'cut'};
  if(s.dialogue){const {camera,...d}=s.dialogue;solo.dialogue=d;}
  const fit=speakerAsset?solveSingle(solo,speakerAsset,P):null;
  if(!fit||total+(k>0)+(k<lines.length-1)>P.maxShots){report.kept.push({shot:s.id,line:k,reason:fit?'shot limit':'no framing keeps everyone whole'});shots.push(s);continue;}
  solo.cameraRig=fit.rig;solo.camera=fit.camera;
  // Leave out what the single never shows (unless something else in the shot refers to it).
  const refs=id=>JSON.stringify({...solo,assets:solo.assets.filter(a=>a.id!==id),speakerAssets:undefined}).includes('"'+id+'"');
  const drop=new Set(fit.gone.filter(id=>!refs(id)));
  solo.assets=solo.assets.filter(a=>!drop.has(a.id));
  solo.speakerAssets=Object.fromEntries(Object.entries(solo.speakerAssets).filter(([,id])=>!drop.has(id)));
  // nobody left to listen: no listener turns
  if(Object.keys(solo.speakerAssets).length<2)delete solo.dialogue;
  const parts=[];
  if(k>0)parts.push({...s,id:s.id,narration:lines.slice(0,k)});
  // Parts after a cut continue the shot: same heading, held steady (titleHold), no transition.
  parts.push(k>0?{...solo,titleHold:true}:{...solo,id:s.id+'-single',transitionFrames:s.transitionFrames,...(s.transition?{transition:s.transition}:{})});
  if(k<lines.length-1)parts.push({...s,id:s.id+'-after',narration:lines.slice(k+1),transitionFrames:0,transition:'cut',titleHold:true});
  for(const p of parts){out.speech.shotSpeakers[p.id]=p.id===s.id?ids.slice(0,k):p.id.endsWith('-single')?[ids[k]]:ids.slice(k+1);}
  if(parts[0].id!==s.id)delete out.speech.shotSpeakers[s.id];
  total+=parts.length-1;shots.push(...parts);
  report.singles.push({shot:s.id,line:k,speaker:ids[k],asset:speakerAsset,heightOfSafe:Math.round(fit.height*1000)/1000,preset:fit.preset,mirror:fit.mirror,offset:fit.offset,padding:fit.padding,shots:parts.map(p=>p.id)});
 }
 out.shots=shots;
 return {project:out,report};
}
