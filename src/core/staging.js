// ART-04 opt-in staging pass 'art-v1': applies ART-01..ART-03 authoring features to a validated v2 project
// deterministically — lighting parity, human detail 2, and character facing with a three-quarter cheat toward
// the camera. Pure: returns a new project; never touches identity-pinned appearance or explicit authored choices.
import {validateProject} from './timeline.js';
import {recipeSpec,hasHands} from '../visual/catalog-rig.js';
import {ACTIONS} from './cinematography.js';
import {resolveTracks} from './presets.js';

export const STAGING_MODES=Object.freeze(['art-v1']);
export const CHEAT=.55; // radians turned back toward the camera while facing a partner (stage convention)
const human=a=>recipeSpec(a.asset)?.family==='human';
const character=a=>hasHands(a.asset);
// Any authored yaw (static or animated, track or action) and any existing face is an explicit choice: left alone.
const drivesYaw=a=>Object.hasOwn(resolveTracks(a),'yaw')||(a.actions??[]).some(x=>Object.hasOwn(ACTIONS[x.name]??{},'yaw'))||a.face!==undefined;
const x0=a=>a.tracks?.x?.[0]?.[1]??0;
const cheatFor=(self,target)=>x0(self)<=x0(target)?-CHEAT:CHEAT;

export function stageShot(s){
 if(s.template!=='cinematic-graph')return s;
 const out=structuredClone(s);
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
 const out={...structuredClone(project),shots:project.shots.map(stageShot)};
 validateProject(out);return out;
}
