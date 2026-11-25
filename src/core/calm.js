// GEN-01 opt-in "calm turns": widens authored yaw key segments whose measured peak turn speed exceeds a limit, by
// moving their keys into the adjacent holds (equal-valued neighbouring segments). The general form of the TALK-05 r3
// hand fix (shelf turn 224°/s). Never silent: returns every change and every turn it could not calm, with the reason.
// Only shots with a known frame count (fixed durationFrames, or a measured timeline) are adjusted; turns from face,
// dialogue or actions are reported, not changed. Pure: returns a new, validated project.
import {evaluateGraph} from './graph.js';
import {validateProject} from './timeline.js';
import {dialogueShot} from './dialogue.js';

export const CALM_DEFAULTS=Object.freeze({limit:120,margin:.92,iterations:6,keyGap:.01});
const DEG=180/Math.PI,r3=v=>Math.round(v*1000)/1000;
function peakTurn(shot,id,frames,ts){
 const s={...(ts?dialogueShot(shot,ts):shot),durationFrames:frames};let prev=null,best=[0,0];
 for(let f=0;f<frames;f++){const y=evaluateGraph(s,frames>1?f/(frames-1):0).assets.find(a=>a.id===id)?.pose.yaw;if(prev!==null&&y!==undefined){const v=Math.abs(y-prev)*30*DEG;if(v>best[0])best=[v,f/(frames-1)];}prev=y??null;}
 return {degPerSec:best[0],at:best[1]};
}
// Widen segment i (keys[i]→keys[i+1]) by `extra` progress, taken from the holds before and after (half each when possible).
function widen(keys,i,extra,gap){
 const k0=keys[i],k1=keys[i+1],before=i>0&&keys[i-1][1]===k0[1]?k0[0]-keys[i-1][0]-gap:i===0&&k0[0]>gap?k0[0]-gap:0,after=i+2<keys.length&&keys[i+2][1]===k1[1]?keys[i+2][0]-k1[0]-gap:i+2===keys.length&&1-k1[0]>gap?1-k1[0]-gap:0;
 let a=Math.min(before,extra/2),b=Math.min(after,extra/2);if(a<extra/2)b=Math.min(after,extra-a);if(b<extra/2)a=Math.min(before,extra-b);
 if(a<=0&&b<=0)return false;
 if(i===0&&a>0)keys.splice(0,0,[0,k0[1]]),i++;
 if(i+2===keys.length&&b>0)keys.push([1,k1[1]]);
 keys[i]=[r3(keys[i][0]-a),keys[i][1]];keys[i+1]=[r3(keys[i+1][0]+b),keys[i+1][1]];return true;
}
export function calmTurns(project,{limit=CALM_DEFAULTS.limit,timeline=null}={}){
 const out=structuredClone(project),changes=[],unresolved=[];
 out.shots.forEach((s,index)=>{
  if(s.template!=='cinematic-graph')return;
  const ts=timeline?.shots?.[index],frames=ts?ts.endFrame-ts.startFrame:s.durationFrames;
  for(const a of s.assets){
   if(a.attachment!==undefined)continue; // held props follow their holder
   const base=peakTurn(s,a.id,frames??360,ts);if(base.degPerSec<=limit)continue;
   // A face target, dialogue look or yaw action overrides the yaw track: report, never adjust (r1 of this pass made such a turn worse).
   if(a.face!==undefined||s.dialogue&&s.speakerAssets&&Object.values(s.speakerAssets).includes(a.id)||(a.actions??[]).some(x=>/turn|spin|orbit/.test(x.name))){unresolved.push({shot:s.id,asset:a.id,degPerSec:r3(base.degPerSec),reason:'turn driven by face, dialogue or an action'});continue;}
   if(!frames){unresolved.push({shot:s.id,asset:a.id,degPerSec:r3(base.degPerSec),reason:'duration unknown before preparation'});continue;}
   const keys=a.tracks?.yaw;let peak=base,ok=true,before=keys?keys.map(k=>[...k]):null;
   for(let n=0;n<CALM_DEFAULTS.iterations&&peak.degPerSec>limit;n++){
    const i=keys?keys.findIndex((k,j)=>j+1<keys.length&&k[0]<=peak.at+1e-9&&peak.at<=keys[j+1][0]+1e-9&&k[1]!==keys[j+1][1]):-1;
    if(i<0){ok=false;break;}
    const len=keys[i+1][0]-keys[i][0],saved=keys.map(k=>[...k]);if(!widen(keys,i,len*(peak.degPerSec/(limit*CALM_DEFAULTS.margin)-1),CALM_DEFAULTS.keyGap)){ok=false;break;}
    const next=peakTurn(s,a.id,frames,ts);
    if(next.degPerSec>=peak.degPerSec){keys.splice(0,keys.length,...saved);ok=false;break;} // never accept a worse turn
    peak=next;
   }
   if(before&&JSON.stringify(before)!==JSON.stringify(keys))changes.push({shot:s.id,asset:a.id,degPerSecBefore:r3(base.degPerSec),degPerSecAfter:r3(peak.degPerSec),yawBefore:before,yawAfter:keys.map(k=>[...k])});
   if(peak.degPerSec>limit)unresolved.push({shot:s.id,asset:a.id,degPerSec:r3(peak.degPerSec),reason:ok?'iteration limit':keys?'no adjacent hold to widen into, or widening did not help':'turn not from an authored yaw track'});
  }
 });
 validateProject(out);return {project:out,changes,unresolved};
}
