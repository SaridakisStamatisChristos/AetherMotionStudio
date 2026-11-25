// ART-04 opt-in staging pass 'art-v1': applies ART-01..ART-03 authoring features to a validated v2 project
// deterministically — lighting parity, human detail 2, and character facing with a three-quarter cheat toward
// the camera. Pure: returns a new project; never touches identity-pinned appearance or explicit authored choices.
import {validateProject} from './timeline.js';
import {recipeSpec,hasHands} from '../visual/catalog-rig.js';
import {ACTIONS,geometryBounds} from './cinematography.js';
import {solveHandoff} from './interaction.js';
import {locomotionRig} from './locomotion.js';
import {resolveTracks} from './presets.js';

export const STAGING_MODES=Object.freeze(['art-v1','art-v2']);
export const CHEAT=.55; // radians turned back toward the camera while facing a partner (stage convention)
const human=a=>recipeSpec(a.asset)?.family==='human';
const character=a=>hasHands(a.asset);
// Any authored yaw (static or animated, track or action) and any existing face is an explicit choice: left alone.
const drivesYaw=a=>Object.hasOwn(resolveTracks(a),'yaw')||(a.actions??[]).some(x=>Object.hasOwn(ACTIONS[x.name]??{},'yaw'))||a.face!==undefined;
const x0=a=>a.tracks?.x?.[0]?.[1]??0;
const cheatFor=(self,target)=>x0(self)<=x0(target)?-CHEAT:CHEAT;

const r2=v=>Math.round(v*1000)/1000,clampX=v=>Math.max(-2.4,Math.min(2.4,v)),clampZ=v=>Math.max(-1.2,Math.min(1.2,v));
const free=a=>!a.identity&&a.attachment===undefined&&a.face===undefined&&a.locomotion===undefined;
const scaleOf=a=>a.tracks?.scale?.[0]?.[1]??1;
function smallProp(a){if(character(a)||!free(a))return false;const b=geometryBounds([{asset:a.asset,pose:{origin:[0,0,0],yaw:0,scale:scaleOf(a),...(a.params?{params:a.params}:{})}}]);return !!b&&b.hi[1]-b.lo[1]<=1.3&&Math.max(b.hi[0]-b.lo[0],b.hi[2]-b.lo[2])<=.9;}
const WALKS=['walk','run'];
// art-v2: in-place walk/run on a legged catalog rig becomes a foot-planted walk across its spot.
function stageLocomotion(a){
 if(!free(a)||!locomotionRig(a.asset)||Object.hasOwn(a.tracks,'walking')||(a.tracks.x?.length??1)>1)return;
 const w=(a.actions??[]).find(x=>WALKS.includes(x.name));if(!w)return;
 const x0=a.tracks.x?.[0]?.[1]??0,dir=x0>0?-1:1;
 a.actions=a.actions.filter(x=>x!==w);if(!a.actions.length)delete a.actions;
 a.tracks.x=[[w.start,r2(clampX(x0-dir*.5))],[w.end,r2(clampX(x0+dir*.5))]];
 a.interpolation={...(a.interpolation??{}),x:'flow'};
 a.locomotion={mode:'stride',start:w.start,end:w.end,faceTravel:true,blend:.15};
}
// art-v2: two free hand-rig characters + a small free prop -> solved hand-to-hand handoff at mid-shot.
function stageHandoff(out){
 const chars=out.assets.filter(a=>character(a)&&free(a)&&!drivesYaw(a)),prop=out.assets.find(smallProp);
 if(chars.length<2||!prop)return false;
 const [g,r]=chars,gx=g.tracks.x?.[0]?.[1]??0,side=(r.tracks.x?.[0]?.[1]??0)>=gx?1:-1;
 const sol=solveHandoff(g.asset,r.asset,{giverAt:[clampX(gx),0],scale:[scaleOf(g),scaleOf(r)],side});
 const shift=Math.max(0,Math.abs(sol.receiver.x)-2.4)*Math.sign(sol.receiver.x);
 const H=.55,place=(a,p)=>{a.tracks.x=[[0,r2(p.x-shift)]];a.tracks.z=[[0,r2(clampZ(p.z))]];};
 place(g,sol.giver);place(r,sol.receiver);
 const strip=a=>{if(a.actions){a.actions=a.actions.filter(x=>!Object.keys(ACTIONS[x.name]??{}).some(k=>['armPitch','armSpread','grip','yaw','walking'].includes(k)));if(!a.actions.length)delete a.actions;}};
 strip(g);strip(r);
 g.tracks.armPitch=[[0,-.9],[.4,-.9],[.5,sol.giver.armPitch],[.6,sol.giver.armPitch],[.78,0]];g.tracks.grip=[[0,1],[.58,1],[.66,0]];
 r.tracks.armPitch=[[0,0],[.38,0],[.5,sol.receiver.armPitch],[.6,sol.receiver.armPitch],[.78,-.9],[1,-.9]];r.tracks.grip=[[0,0],[.5,0],[.56,1],[1,1]];
 g.face={target:r.id,start:0,end:1,offset:sol.giver.faceOffset};r.face={target:g.id,start:0,end:1,offset:sol.receiver.faceOffset};
 delete prop.actions;delete prop.motion;prop.tracks.scale=[[0,Math.min(.7,scaleOf(prop))]];
 prop.attachment=[{parent:g.id,anchor:'right-hand',start:0,end:H,offset:[0,-.08,.12]},{parent:r.id,anchor:'right-hand',start:H,end:1,offset:[0,-.08,.12],blendIn:.05}];
 return true;
}
export function stageShot(s,mode='art-v1'){
 if(s.template!=='cinematic-graph')return s;
 const out=structuredClone(s);
 if(mode==='art-v2'){for(const a of out.assets)stageLocomotion(a);stageHandoff(out);}
 if(out.lighting===undefined)out.lighting='parity-v1';
 for(const a of out.assets)if(human(a)&&!a.identity&&a.params?.detail===undefined)a.params={...(a.params??{}),detail:2};
 const chars=out.assets.filter(character),props=out.assets.filter(a=>!character(a)&&!a.attachment);
 if(chars.length>=2){
  const [a,b]=chars;
  for(const [self,target] of [[a,b],[b,a],...chars.slice(2).map(c=>[c,a])])
   if(!drivesYaw(self))self.face={target:target.id,start:.05,end:.95,blend:.15,offset:cheatFor(self,target)};
 }else if(chars.length===1&&props.length&&!drivesYaw(chars[0])){
  chars[0].face={target:props[0].id,start:.2,end:.7,blend:.3,offset:cheatFor(chars[0],props[0])};
 }
 return out;
}
export function stageProject(project,mode='art-v1'){
 if(!STAGING_MODES.includes(mode))throw Error('staging: unknown mode '+mode);
 if(project.version!==2)throw Error('staging: v2 project required');
 const out={...structuredClone(project),shots:project.shots.map(s=>stageShot(s,mode))};
 validateProject(out);return out;
}
