// TALK-01 example: speaking faces. Two voices (engineer af_heart, robot am_michael) bound per phrase to characters
// via shot.speakerAssets; mouths are driven by the measured narration envelope. Deterministic generator.
// Usage: node scripts/talk01-faces.mjs [--check]  (writes examples/talk01-faces-{cpu,three}-polished.json)
import {readFileSync,writeFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {stageProject} from '../src/core/staging.js';

const art05=JSON.parse(readFileSync(new URL('../examples/art05-workshop-cpu-polished.json',import.meta.url),'utf8'));
const FIDELITY=art05.shots[0].fidelity,D2={detail:2};
const shot=(id,frames,heading,subheading,narration,body)=>({id,template:'cinematic-graph',backend:'cpu',durationFrames:frames,transitionFrames:id==='hello'?0:12,...(id==='hello'?{}:{transition:'fade'}),heading,subheading,environment:'laboratory',lighting:'parity-v1',effects:[],narration,fidelity:FIDELITY,...body});
function shots(){
 return [
  shot('hello',240,'HELLO','Two voices, two faces.',['Hello! I build robots in this workshop.','And I am the robot she built.'],{
   cameraRig:{preset:'medium',framing:'medium',strength:.5,subject:'robot'},camera:{x:[[0,-.2],[1,.2]],y:[[0,2.6]],z:[[0,7.2],[1,6.9]],zoom:[[0,1450],[1,1550]]},cameraInterpolation:{x:'flow',zoom:'flow'},
   speakerAssets:{eng:'engineer',robo:'robot'},
   assets:[{id:'engineer',asset:'engineer',params:D2,tracks:{x:[[0,-.75]],z:[[0,.3]]},face:{target:'robot',start:0,end:1,offset:-.95}},
    {id:'robot',asset:'service-robot',tracks:{x:[[0,.8]],z:[[0,.2]],blink:[[0,1],[.6,1],[.63,.1],[.66,1]]},face:{target:'engineer',start:0,end:1,offset:.85}}]}),
  shot('learn',null,'FIRST WORDS','Every word moves the face.',['Today I learned to talk.','Every word lights up my face.'],{
   cameraRig:{preset:'close-up',framing:'close-up',strength:.5,subject:'robot'},camera:{x:[[0,-.3],[1,.3]],y:[[0,2.5]],z:[[0,6.4],[1,6.1]],zoom:[[0,1650],[1,1800]]},cameraInterpolation:{x:'flow',zoom:'flow'},
   speakerAssets:{robo:'robot'},
   assets:[{id:'robot',asset:'service-robot',tracks:{x:[[0,0]],yaw:[[0,.15],[1,-.1]],blink:[[0,1],[.4,1],[.43,.1],[.46,1]]},interpolation:{yaw:'flow'}}]}),
  shot('reply',null,'WELL SAID','Listening back.',['And every word sounds just right.'],{
   cameraRig:{preset:'medium',framing:'medium',strength:.5,subject:'engineer'},camera:{x:[[0,.3],[1,-.1]],y:[[0,2.8]],z:[[0,7.6],[1,7.3]]},cameraInterpolation:{x:'flow'},
   speakerAssets:{eng:'engineer',robo:'robot'},
   assets:[{id:'engineer',asset:'engineer',params:D2,tracks:{x:[[0,-.4]],z:[[0,.4]]},face:{target:'robot',start:0,end:1,offset:-1},actions:[{name:'point',start:.15,end:.8,blend:.15}],aim:{target:'robot',start:.15,end:.8,blend:.15,height:1.2,cheat:.4}},
    {id:'robot',asset:'service-robot',tracks:{x:[[0,1.1]],z:[[0,-.1]]},face:{target:'engineer',start:0,end:1,offset:.9}}]})];
}
export function build(backend){
 const p={version:2,id:'talk01-faces-'+backend+'-polished',title:'TALK-01 speaking faces',voice:'af_heart',
  speech:{version:1,targetFrames:600,fixedShots:{hello:240},placement:'lead',
   speakers:{eng:{name:'Engineer',voice:'af_heart',language:'en-us'},robo:{name:'Robot',voice:'am_michael',language:'en-us'}},
   shotSpeakers:{hello:['eng','robo'],learn:['robo','robo'],reply:['eng']},pronunciations:{},
   captions:{mode:'both',highlight:true,maxChars:32,maxLines:2,maxCps:18},
   mix:{narration:1,music:.55,ambience:.35,sfx:.45,duck:.35,fadeSeconds:.25,peak:.92,master:'mix-v2'},cues:[],syncActions:false},
  shots:shots().map(s=>({...s,backend}))};
 validateProject(p);return stageProject(p);
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 for(const b of ['cpu','three']){const file=new URL('../examples/talk01-faces-'+b+'-polished.json',import.meta.url),text=JSON.stringify(build(b),null,1)+'\n';
  if(process.argv.includes('--check')){if(readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==text)throw Error('stale '+file.pathname);}else writeFileSync(file,text);}
 console.log('ok');
}
