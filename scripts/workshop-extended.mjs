// POLISH-03: narration placement 'lead' and one extra line in TOOLBOX, LEARNING BY WATCHING and HIGH SHELF
// (POWER ON is a reused accepted ART-05 shot and keeps its script).
// POLISH-02 items 1-4: aim (teach), planted turn steps, HIGH SHELF (telescoping reach, solved pickup/place).
// POLISH-02 item 1: LEARNING BY WATCHING pointers aim at the table (opt-in aim).
// POLISH-01 part 4: "The Workshop — Extended" (64 s, 9 shots). Builds on the owner-accepted ART-05 film (unchanged)
// and adds shots that use planted walking and the interaction solver. Deterministic generator.
// Usage: node scripts/workshop-extended.mjs [--check]  (writes examples/workshop-extended-{cpu,three}-polished.json)
import {readFileSync,writeFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {stageProject} from '../src/core/staging.js';
import {solveHandoff,solveReach} from '../src/core/interaction.js';
import {surfacePoint} from '../src/core/surface.js';
import {locomotionRig} from '../src/core/locomotion.js';
import {inspectProject} from '../src/quality/preflight.js';
import {compositionReport} from '../src/quality/composition.js';

const base=Object.fromEntries(JSON.parse(readFileSync(new URL('../examples/art05-workshop-cpu-polished.json',import.meta.url),'utf8')).shots.map(s=>[s.id,s]));
const FIDELITY=base.workshop.fidelity,D2={detail:2},r3=v=>Math.round(v*1000)/1000;
const fresh=(id,frames,environment,heading,subheading,narration,body)=>({id,template:'cinematic-graph',backend:'cpu',durationFrames:frames,transitionFrames:12,transition:'fade',heading,subheading,environment,lighting:'parity-v1',...body,effects:body.effects??[],narration:Array.isArray(narration)?narration:[narration],fidelity:FIDELITY});

function toolbox(){
 const H=.68,gx=-.55,sol=solveHandoff('scientist','engineer',{giverAt:[gx,0],side:1});
 return fresh('toolbox',270,'amber','THE TOOLBOX','One tool, carried with care.',['From the toolbox, she brings the one tool they need.','Careful steps, steady hands, and the wrench changes hands.'],{
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
 return fresh('teach',240,'laboratory','LEARNING BY WATCHING','Point, look, follow.',['It learns by watching. Point, look, and follow.','Every gesture becomes a lesson.'],{
  cameraRig:{preset:'medium',framing:'medium',strength:.5,subject:'robot'},camera:{x:[[0,.5],[1,-.3]],y:[[0,3]],z:[[0,8.6],[1,8.2]],zoom:[[0,1250],[1,1350]]},cameraInterpolation:{x:'flow',zoom:'flow'},
  assets:[
   {id:'engineer',asset:'engineer',params:D2,tracks:{x:[[0,-1.2]],z:[[0,.2]]},face:{target:'table',start:0,end:1,offset:-.45},actions:[{name:'point',start:.08,end:.5,blend:.12}],aim:{target:'table',start:.08,end:.5,blend:.12,height:.7}},
   {id:'robot',asset:'service-robot',tracks:{x:[[0,.35]],z:[[0,.45]],yaw:[[0,.55]],blink:[[0,1],[.4,1],[.43,.1],[.46,1]]},face:{target:'engineer',start:0,end:.48,blend:.15,offset:.35},actions:[{name:'point',start:.55,end:.92,blend:.12}],aim:{target:'table',start:.55,end:.92,blend:.12,height:.7,cheat:.6}},
   {id:'table',asset:'table',tracks:{x:[[0,1.85]],z:[[0,-.55]],scale:[[0,.85]]}}]});
}
// POLISH-02 items 3+4: the robot (telescoping reach) takes a book from the top of the bookshelf and sets it on the
// table. Standing spots and arm poses come from solveReach; prop heights come from the rendered surface tops.
function shelf(){
 // Shelf on the right, table on the left: the robot reaches in profile with its camera-side (left) arm.
 const SH=[1.3,-.5],TB=[-1.1,-.3],TS=.85,PICK=[-.4,.1],PLACE=[.5,.3],R={reach:1.8},lift=.06;
 const S={asset:'bookshelf',pose:{origin:[SH[0],0,SH[1]],yaw:0}},T={asset:'table',pose:{origin:[TB[0],0,TB[1]],yaw:0,scale:TS}};
 const avoid=[{center:SH,half:[.52,.29]},{center:TB,half:[.76*TS,.44*TS]}],opt={params:R,avoid,clearance:.3,spreadDeg:85,hands:['left']};
 const up=(p)=>[p[0],p[1]+lift,p[2]],pick=solveReach('service-robot',up(surfacePoint(S,PICK)),{...opt,around:-Math.PI/2,spreadDeg:35}),put=solveReach('service-robot',up(surfacePoint(T,PLACE)),opt);
 // Turns are authored (about 27 frames each) instead of a short faceTravel blend, so the carried book never whips.
 const head=r3(Math.atan2(put.x-pick.x,put.z-pick.z));
 return fresh('shelf',270,'laboratory','HIGH SHELF','Reach, carry, set it down.',['Now it tries on its own: up to the high shelf, and down onto the table.','No one shows it how this time.'],{
  cameraRig:{preset:'medium',framing:'establishing',strength:.5,subject:'robot'},camera:{x:[[0,.4],[1,-.4]],y:[[0,3.2]],z:[[0,9.4],[1,9]]},cameraInterpolation:{x:'flow'},
  assets:[
   {id:'robot',asset:'service-robot',params:R,tracks:{x:[[0,r3(pick.x)],[.44,r3(pick.x)],[.72,r3(put.x)]],z:[[0,r3(pick.z)],[.44,r3(pick.z)],[.72,r3(put.z)]],yaw:[[0,r3(pick.yaw)],[.34,r3(pick.yaw)],[.44,head],[.72,head],[.84,r3(put.yaw)]],
     leftArmPitch:[[0,0],[.08,0],[.24,r3(pick.armPitch)],[.3,r3(pick.armPitch)],[.44,-.9],[.76,-.9],[.86,r3(put.armPitch)],[.9,r3(put.armPitch)],[.98,0]],
     leftArmSpread:[[0,0],[.08,0],[.24,r3(pick.armSpread)],[.3,r3(pick.armSpread)],[.44,0],[.76,0],[.86,r3(put.armSpread)],[.9,r3(put.armSpread)],[.98,0]],
     blink:[[0,1],[.5,1],[.53,.1],[.56,1]]},interpolation:{x:'flow',z:'flow',yaw:'flow'},
    locomotion:{mode:'stride',start:.44,end:.72},turnSteps:true},
   {id:'shelf',asset:'bookshelf',tracks:{x:[[0,SH[0]]],z:[[0,SH[1]]]}},
   {id:'table',asset:'table',tracks:{x:[[0,TB[0]]],z:[[0,TB[1]]],scale:[[0,TS]]}},
   {id:'book',asset:'book',tracks:{scale:[[0,.7]]},restOn:{surface:'shelf',at:PICK},
    attachment:{parent:'robot',anchor:'left-hand',start:.27,end:.9,offset:'auto',release:{mode:'place',duration:.05,to:{surface:'table',at:PLACE}}}}]});
}
function lights(){
 return fresh('lights',180,'midnight','LIGHTS OUT','Tomorrow, more to build.','When the lights go out, it remembers every step.',{
  cameraRig:{preset:'close-up',subject:'robot',framing:'close-up',strength:.5},camera:{x:[[0,-.6],[1,.5]],y:[[0,2.4],[1,2.3]],z:[[0,6.4],[1,6.1]],zoom:[[0,1650],[1,1850]]},cameraInterpolation:{x:'flow',zoom:'flow'},
  assets:[{id:'robot',asset:'service-robot',tracks:{x:[[0,0]],yaw:[[0,.25],[1,-.1]],blink:[[0,1],[.55,1],[.58,.1],[.62,1],[.82,1],[.95,.1]],armPitch:[[0,-.3],[1,0]],leftArmPitch:[[0,-.3],[1,0]]},interpolation:{yaw:'flow'}}],
  effects:[{preset:'cyan-aura',target:'robot'}]});
}
function shots(){
 const keep=id=>structuredClone(base[id]);
 // POLISH-02 item 2: planted turn steps for every legged character in the new/upgraded shots (kept shots unchanged).
 const turns=s=>{for(const a of s.assets)if(locomotionRig(a.asset))a.turnSteps=true;return s;};
 return [keep('workshop'),keep('plan'),turns(toolbox()),keep('power'),turns(steps()),turns(teach()),shelf(),keep('handoff'),keep('together'),lights()];
}
export function build(backend){
 // POLISH-02 item 8: opt-in mastering (consistent phrase levels, -16 LUFS, -1 dBTP).
 const p={version:2,id:'workshop-extended-'+backend+'-polished',title:'The Workshop — Extended',voice:'af_heart',audio:{master:'mix-v2',placement:'lead'},shots:shots().map(s=>({...s,backend}))};
 validateProject(p);return stageProject(p);
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll('\\','/').split('/').pop())){
 for(const b of ['cpu','three']){const p=build(b);if(!process.argv.includes('--check'))writeFileSync(new URL('../examples/workshop-extended-'+b+'-polished.json',import.meta.url),JSON.stringify(p,null,1)+'\n');
  if(b==='cpu'){console.log('frames',p.shots.reduce((n,s)=>n+s.durationFrames,0),'preflight',JSON.stringify(inspectProject(p).issues.map(i=>i.shot+':'+i.code)));
   for(const s of p.shots){const c=compositionReport(s);console.log(s.id.padEnd(9),'back',Object.values(c.characters).reduce((n,v)=>n+v.backToCameraSamples,0),'maxOverlap',Math.max(0,...Object.values(c.overlap).map(o=>o.max)).toFixed(2),'subjectH',c.subjectHeightOfSafe?.mean,'angles',Object.entries(c.characters).map(([k,v])=>k+':'+Math.round(v.cameraAngleDeg.mean)).join(' '));}}}
}
