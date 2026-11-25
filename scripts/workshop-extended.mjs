// POLISH-01 part 4: "The Workshop — Extended" (64 s, 9 shots). Builds on the owner-accepted ART-05 film (unchanged)
// and adds shots that use planted walking and the interaction solver. Deterministic generator.
// Usage: node scripts/workshop-extended.mjs [--check]  (writes examples/workshop-extended-{cpu,three}-polished.json)
import {readFileSync,writeFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {stageProject} from '../src/core/staging.js';
import {solveHandoff} from '../src/core/interaction.js';
import {inspectProject} from '../src/quality/preflight.js';
import {compositionReport} from '../src/quality/composition.js';

const base=Object.fromEntries(JSON.parse(readFileSync(new URL('../examples/art05-workshop-cpu-polished.json',import.meta.url),'utf8')).shots.map(s=>[s.id,s]));
const FIDELITY=base.workshop.fidelity,D2={detail:2},r3=v=>Math.round(v*1000)/1000;
const fresh=(id,frames,environment,heading,subheading,narration,body)=>({id,template:'cinematic-graph',backend:'cpu',durationFrames:frames,transitionFrames:12,transition:'fade',heading,subheading,environment,lighting:'parity-v1',...body,effects:body.effects??[],narration:[narration],fidelity:FIDELITY});

function toolbox(){
 const H=.68,gx=-.55,sol=solveHandoff('scientist','engineer',{giverAt:[gx,0],side:1});
 return fresh('toolbox',270,'amber','THE TOOLBOX','One tool, carried with care.','From the toolbox, she brings the one tool they need.',{
  cameraRig:{preset:'medium',subject:'engineer',framing:'medium',strength:.4},camera:{x:[[0,-.7],[1,.2]],y:[[0,3.1]],z:[[0,9],[1,8.6]]},cameraInterpolation:{x:'flow'},
  assets:[
   {id:'scientist',asset:'scientist',params:D2,tracks:{x:[[0,-2.25],[.55,r3(sol.giver.x)]],z:[[0,-.4],[.55,r3(sol.giver.z)]],armPitch:[[0,-.9],[.58,-.9],[.66,sol.giver.armPitch],[.74,sol.giver.armPitch],[.9,0]],grip:[[0,1],[.7,1],[.78,0]]},interpolation:{x:'flow',z:'flow'},
    locomotion:{mode:'stride',start:0,end:.55,faceTravel:true,blend:.12},face:{target:'engineer',start:.5,end:1,blend:.15,offset:sol.giver.faceOffset}},
   {id:'engineer',asset:'engineer',params:D2,tracks:{x:[[0,r3(sol.receiver.x)]],z:[[0,r3(sol.receiver.z)]],armPitch:[[0,0],[.56,0],[.66,sol.receiver.armPitch],[.74,sol.receiver.armPitch],[.9,-.9],[1,-.9]],grip:[[0,0],[.66,0],[.7,1],[1,1]]},
    face:{target:'scientist',start:0,end:1,offset:sol.receiver.faceOffset}},
   {id:'toolbox',asset:'toolbox',tracks:{x:[[0,-2.3]],z:[[0,-.95]],scale:[[0,.8]]}},
   {id:'wrench',asset:'wrench',tracks:{x:[[0,-2]],scale:[[0,.7]]},attachment:[{parent:'scientist',anchor:'right-hand',start:0,end:H,offset:[0,-.08,.12]},{parent:'engineer',anchor:'right-hand',start:H,end:1,offset:[0,-.08,.12],blendIn:.05}]}]});
}
function steps(){
 const s=structuredClone(base.steps),robot=s.assets.find(a=>a.id==='robot');
 // Upgrade: foot-planted walking replaces the sliding walk-cycle action (path and timing unchanged).
 delete robot.actions;robot.tracks.x=[[.06,-1.4],[.85,1]];robot.locomotion={mode:'stride',start:.06,end:.85,faceTravel:true,blend:.12};
 robot.tracks.yaw=[[0,0],[.86,0],[.95,0]];
 return {...s,durationFrames:240,narration:['Its first steps are slow and careful, and everyone is watching.']};
}
function teach(){
 return fresh('teach',240,'laboratory','LEARNING BY WATCHING','Point, look, follow.','It learns by watching. Point, look, and follow.',{
  cameraRig:{preset:'medium',framing:'medium',strength:.5,subject:'robot'},camera:{x:[[0,.5],[1,-.3]],y:[[0,3]],z:[[0,8.6],[1,8.2]],zoom:[[0,1250],[1,1350]]},cameraInterpolation:{x:'flow',zoom:'flow'},
  assets:[
   {id:'engineer',asset:'engineer',params:D2,tracks:{x:[[0,-1.2]],z:[[0,.2]]},face:{target:'table',start:0,end:1,offset:-.45},actions:[{name:'point',start:.08,end:.5,blend:.12}]},
   {id:'robot',asset:'service-robot',tracks:{x:[[0,.35]],z:[[0,.45]],yaw:[[0,.55]],blink:[[0,1],[.4,1],[.43,.1],[.46,1]]},face:{target:'engineer',start:0,end:.48,blend:.15,offset:.35},actions:[{name:'point',start:.55,end:.92,blend:.12}]},
   {id:'table',asset:'table',tracks:{x:[[0,1.85]],z:[[0,-.55]],scale:[[0,.85]]}}]});
}
function lights(){
 return fresh('lights',180,'midnight','LIGHTS OUT','Tomorrow, more to build.','When the lights go out, it remembers every step.',{
  cameraRig:{preset:'close-up',subject:'robot',framing:'close-up',strength:.5},camera:{x:[[0,-.6],[1,.5]],y:[[0,2.4],[1,2.3]],z:[[0,6.4],[1,6.1]],zoom:[[0,1650],[1,1850]]},cameraInterpolation:{x:'flow',zoom:'flow'},
  assets:[{id:'robot',asset:'service-robot',tracks:{x:[[0,0]],yaw:[[0,.25],[1,-.1]],blink:[[0,1],[.55,1],[.58,.1],[.62,1],[.82,1],[.95,.1]],armPitch:[[0,-.3],[1,0]],leftArmPitch:[[0,-.3],[1,0]]},interpolation:{yaw:'flow'}}],
  effects:[{preset:'cyan-aura',target:'robot'}]});
}
function shots(){
 const keep=id=>structuredClone(base[id]);
 return [keep('workshop'),keep('plan'),toolbox(),keep('power'),steps(),teach(),keep('handoff'),keep('together'),lights()];
}
export function build(backend){
 const p={version:2,id:'workshop-extended-'+backend+'-polished',title:'The Workshop — Extended',voice:'af_heart',shots:shots().map(s=>({...s,backend}))};
 validateProject(p);return stageProject(p);
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll('\\','/').split('/').pop())){
 for(const b of ['cpu','three']){const p=build(b);if(!process.argv.includes('--check'))writeFileSync(new URL('../examples/workshop-extended-'+b+'-polished.json',import.meta.url),JSON.stringify(p,null,1)+'\n');
  if(b==='cpu'){console.log('frames',p.shots.reduce((n,s)=>n+s.durationFrames,0),'preflight',JSON.stringify(inspectProject(p).issues.map(i=>i.shot+':'+i.code)));
   for(const s of p.shots){const c=compositionReport(s);console.log(s.id.padEnd(9),'back',Object.values(c.characters).reduce((n,v)=>n+v.backToCameraSamples,0),'maxOverlap',Math.max(0,...Object.values(c.overlap).map(o=>o.max)).toFixed(2),'subjectH',c.subjectHeightOfSafe?.mean,'angles',Object.entries(c.characters).map(([k,v])=>k+':'+Math.round(v.cameraAngleDeg.mean)).join(' '));}}}
}
