// ART-05 showcase "The Workshop": deterministic generator for the matched CPU/Three project pair.
// Usage: node scripts/art05-workshop.mjs [--check]  (writes examples/art05-workshop-{cpu,three}-polished.json)
import {readFileSync,writeFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {stageProject} from '../src/core/staging.js';
import {inspectProject} from '../src/quality/preflight.js';
import {compositionReport} from '../src/quality/composition.js';

const FIDELITY={bloom:.6,atmosphere:.5,contactShadow:.75,surfaceDetail:.6,depthOfField:.15,motionBlur:0,grain:.15,grade:.45,particles:.4,typography:1};
// Raised-arm convention on catalog rigs: right armSpread -0.4 and left leftArmSpread +0.4 swing hands outward.
const D2={detail:2},CHEAT=.55;
const human=(id,asset,x,z,extra={})=>({id,asset,tracks:{x:[[0,x]],z:[[0,z]]},params:D2,...extra});
const shot=(id,frames,environment,heading,subheading,narration,body)=>({id,template:'cinematic-graph',backend:'cpu',durationFrames:frames,transitionFrames:id==='workshop'?0:12,transition:id==='workshop'?'cut':'fade',heading,subheading,environment,lighting:'parity-v1',...body,effects:body.effects??[],narration:[narration],fidelity:FIDELITY});

function shots(){
 const handoff=JSON.parse(readFileSync(new URL('../examples/art01-handoff-cpu-polished.json',import.meta.url),'utf8')).shots[0];
 const s5=structuredClone(handoff);
 const watcher=s5.assets.find(a=>a.id==='watcher');Object.assign(watcher,{id:'watcher',asset:'scientist',tracks:{...watcher.tracks,scale:[[0,.9]],armPitch:[[0,0],[.84,0],[.9,-2.6],[.94,-2.2],[.98,-2.6],[1,-2.45]],armSpread:[[0,0],[.9,-.4]]},params:D2});delete watcher.actions;
 s5.assets.find(a=>a.id==='giver').params=D2;
 return [
  shot('workshop',210,'amber','THE WORKSHOP','Two makers, one unfinished robot.','In a small workshop, two makers prepare a new robot.',{
   cameraRig:{preset:'establishing',framing:'establishing',padding:.12,strength:.9},camera:{x:[[0,.6],[1,-.4]],y:[[0,3.4],[1,3.6]],z:[[0,9.6],[1,9]]},cameraInterpolation:{x:'flow'},
   assets:[
    {id:'robot',asset:'service-robot',tracks:{x:[[0,0]],z:[[0,.3]],yaw:[[0,0]],blink:[[0,.1]],armPitch:[[0,.6]]}},
    human('engineer','engineer',-1.2,-.3,{face:{target:'robot',start:0,end:1,offset:-CHEAT},actions:[{name:'idle',start:0,end:1,mode:'loop',speed:2}]}),
    human('scientist','scientist',1.2,-.3,{face:{target:'robot',start:0,end:1,offset:CHEAT},actions:[{name:'idle',start:0,end:1,mode:'loop',speed:2,phase:.5}]}),
    {id:'toolbox',asset:'toolbox',tracks:{x:[[0,-1.9]],z:[[0,-.8]],scale:[[0,.8]]}}]}),
  shot('plan',180,'amber','THE PLAN','Every joint has a purpose.','She checks the plan. Every joint has a purpose.',{
   cameraRig:{preset:'medium',subject:'scientist',framing:'medium',strength:.6},camera:{x:[[0,-.4],[1,.4]],y:[[0,3]],z:[[0,8.4],[1,8]],zoom:[[0,1250],[1,1380]]},cameraInterpolation:{x:'flow',zoom:'flow'},
   assets:[
    human('scientist','scientist',.45,-.1,{face:{target:'robot',start:0,end:1,offset:-.5},actions:[{name:'point',start:.15,end:.85,blend:.12}]}),
    human('engineer','engineer',-1.0,.5,{face:{target:'scientist',start:0,end:1,offset:-CHEAT}}),
    {id:'robot',asset:'service-robot',tracks:{x:[[0,1.7]],z:[[0,.45]],yaw:[[0,-.35]],blink:[[0,.1]],armPitch:[[0,.6]]}}]}),
  shot('power',180,'laboratory','POWER ON','A first blink of light.','Power on. The robot opens its eyes.',{
   cameraRig:{preset:'close-up',subject:'robot',framing:'close-up',strength:.5},camera:{x:[[0,.9],[1,-.6]],y:[[0,2.4],[1,2.5]],z:[[0,6.5],[1,6.2]],zoom:[[0,1700],[1,1950]]},cameraInterpolation:{x:'flow',zoom:'flow'},
   assets:[{id:'robot',asset:'service-robot',tracks:{x:[[0,0]],yaw:[[0,0]],blink:[[0,.1],[.3,.1],[.38,1],[.52,1],[.55,.1],[.58,1]],armPitch:[[0,.6],[.55,.6],[.75,-1.1],[.9,-.9]],leftArmPitch:[[0,0],[.55,0],[.75,-1.1],[.9,-.9]],y:[[0,0],[.6,0],[.68,.12],[.76,0]]},interpolation:{armPitch:'flow',leftArmPitch:'flow'}}],
   effects:[{preset:'cyan-aura',target:'robot'}]}),
  shot('steps',210,'laboratory','FIRST STEPS','Slow, careful, watched.','Its first steps are slow and careful, and everyone is watching.',{
   cameraRig:{preset:'medium',subject:'robot',framing:'medium',strength:.45},camera:{x:[[0,-.5],[1,.5]],y:[[0,3.1]],z:[[0,8.8],[1,8.4]]},cameraInterpolation:{x:'flow'},
   assets:[
    {id:'robot',asset:'service-robot',tracks:{x:[[0,-1.4],[.85,1]],yaw:[[0,1.2],[.82,1.2],[.95,0]],armPitch:[[0,-.4]],leftArmPitch:[[0,-.4]]},interpolation:{x:'flow',yaw:'flow'},actions:[{name:'walk',start:.06,end:.86,mode:'loop',speed:3,blend:.1}]},
    human('engineer','engineer',-1.7,-.7,{face:{target:'robot',start:0,end:1,offset:-.3}}),
    human('scientist','scientist',1.75,-.7,{face:{target:'robot',start:0,end:1,offset:.3}})]}),
  {...s5,heading:'HAND TO HAND',subheading:'The first tool finds its place.',narration:['The first tool passes from hand to hand, and finds its place.'],transitionFrames:12,transition:'fade',lighting:'parity-v1',fidelity:FIDELITY},
  shot('together',180,'midnight','BUILT TOGETHER','Ready for what comes next.','Built together, and ready for whatever comes next.',{
   cameraRig:{preset:'medium',subject:'robot',framing:'medium',strength:.5},camera:{x:[[0,.4],[1,-.3]],y:[[0,2.7]],z:[[0,7.8],[1,7.3]],zoom:[[0,1250],[1,1450]]},cameraInterpolation:{x:'flow',zoom:'flow'},
   assets:[
    {id:'robot',asset:'service-robot',tracks:{x:[[0,0]],z:[[0,.35]],yaw:[[0,0]],armPitch:[[0,0],[.3,0],[.45,-2.6],[.85,-2.6],[1,-2.4]],leftArmPitch:[[0,0],[.3,0],[.45,-2.6],[.85,-2.6],[1,-2.4]],armSpread:[[0,0],[.45,-.4]],leftArmSpread:[[0,0],[.45,.4]]},interpolation:{armPitch:'flow',leftArmPitch:'flow'}},
    human('engineer','engineer',-1.15,.15,{tracks:{x:[[0,-1.15]],z:[[0,.15]],yaw:[[0,.35]],leftArmPitch:[[0,0],[.4,0],[.5,-2.5],[.58,-2.2],[.66,-2.5],[.74,-2.2],[.82,-2.5],[.95,-.3]],leftArmSpread:[[0,0],[.5,.45]]}}),
    human('scientist','scientist',1.15,.15,{tracks:{x:[[0,1.15]],z:[[0,.15]],yaw:[[0,-.35]],armPitch:[[0,0],[.42,0],[.52,-2.6],[.6,-2.2],[.68,-2.6],[.76,-2.2],[.84,-2.6],[.96,-.3]],armSpread:[[0,0],[.52,-.4]]}})]})
 ];
}
export function build(backend){
 const p={version:2,id:'art05-workshop-'+backend+'-polished',title:'The Workshop',voice:'af_heart',shots:shots().map(s=>({...s,backend}))};
 validateProject(p);
 // Dogfood ART-04: the staging pass must leave this hand-authored film's explicit choices intact.
 const staged=stageProject(p);return staged;
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll('\\','/').split('/').pop())){
 for(const b of ['cpu','three']){const p=build(b);if(!process.argv.includes('--check'))writeFileSync(new URL('../examples/art05-workshop-'+b+'-polished.json',import.meta.url),JSON.stringify(p,null,1)+'\n');
  if(b==='cpu'){console.log('frames',p.shots.reduce((n,s)=>n+s.durationFrames,0),'preflight',JSON.stringify(inspectProject(p).issues.map(i=>i.shot+':'+i.code)));
   for(const s of p.shots){const c=compositionReport(s);console.log(s.id.padEnd(9),'back',Object.values(c.characters).reduce((n,v)=>n+v.backToCameraSamples,0),'maxOverlap',Math.max(0,...Object.values(c.overlap).map(o=>o.max)).toFixed(2),'subjectH',c.subjectHeightOfSafe?.mean,'angles',Object.entries(c.characters).map(([k,v])=>k+':'+Math.round(v.cameraAngleDeg.mean)).join(' '));}}}
}
