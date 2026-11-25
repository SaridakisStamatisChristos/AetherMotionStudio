// TALK-02 example: a three-way conversation. Engineer (af_heart), scientist (bf_emma, en-gb) and robot (am_michael)
// take turns; listeners turn to the active speaker from measured phrase bounds (shot.dialogue). Deterministic generator.
// Usage: node scripts/talk02-dialogue.mjs [--check]  (writes examples/talk02-dialogue-{cpu,three}-polished.json)
import {readFileSync,writeFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';

const art05=JSON.parse(readFileSync(new URL('../examples/art05-workshop-cpu-polished.json',import.meta.url),'utf8'));
const FIDELITY=art05.shots[0].fidelity,D2={detail:2};
function shots(){
 return [
  {id:'meeting',template:'cinematic-graph',backend:'cpu',durationFrames:null,transitionFrames:0,heading:'MORNING MEETING',subheading:'Three voices, one table.',environment:'amber',lighting:'parity-v1',effects:[],fidelity:FIDELITY,
   narration:['Good morning, team. What did we learn yesterday?','The robot can lift twice its own weight now.','And I can say thank you.','Then today, we teach it to say please.','Please is the hardest word of all.','Please. Thank you. I am ready.'],
   cameraRig:{preset:'medium',framing:'medium',strength:.5,subject:'robot'},camera:{x:[[0,-.3],[1,.3]],y:[[0,2.8]],z:[[0,8.2],[1,7.8]],zoom:[[0,1300],[1,1380]]},cameraInterpolation:{x:'flow',zoom:'flow'},
   speakerAssets:{eng:'engineer',sci:'scientist',robo:'robot'},dialogue:{listen:true,turn:.4,cheat:1},
   assets:[{id:'engineer',asset:'engineer',params:D2,tracks:{x:[[0,-1.35]],z:[[0,.35]]},turnSteps:true},
    {id:'robot',asset:'service-robot',tracks:{x:[[0,0]],z:[[0,-.2]],blink:[[0,1],[.3,1],[.32,.1],[.34,1],[.75,1],[.77,.1],[.79,1]]},turnSteps:true},
    {id:'scientist',asset:'scientist',params:D2,tracks:{x:[[0,1.35]],z:[[0,.35]]},turnSteps:true},
    {id:'table',asset:'table',tracks:{x:[[0,0]],z:[[0,-1.1]],scale:[[0,.8]]}}]},
  {id:'ready',template:'cinematic-graph',backend:'cpu',durationFrames:null,transitionFrames:12,transition:'fade',heading:'READY',subheading:'A new word.',environment:'amber',lighting:'parity-v1',effects:[],fidelity:FIDELITY,
   narration:['I will practise all night.'],
   cameraRig:{preset:'close-up',framing:'close-up',strength:.5,subject:'robot'},camera:{x:[[0,.3],[1,-.3]],y:[[0,2.5]],z:[[0,6.4],[1,6.1]],zoom:[[0,1650],[1,1800]]},cameraInterpolation:{x:'flow',zoom:'flow'},
   speakerAssets:{robo:'robot'},
   assets:[{id:'robot',asset:'service-robot',tracks:{x:[[0,0]],yaw:[[0,-.15],[1,.1]],blink:[[0,1],[.5,1],[.53,.1],[.56,1]]},interpolation:{yaw:'flow'}}]}];
}
export function build(backend){
 const p={version:2,id:'talk02-dialogue-'+backend+'-polished',title:'TALK-02 dialogue',voice:'af_heart',
  speech:{version:1,targetFrames:600,fixedShots:{},placement:'lead',
   speakers:{eng:{name:'Engineer',voice:'af_heart',language:'en-us'},sci:{name:'Scientist',voice:'bf_emma',language:'en-gb'},robo:{name:'Robot',voice:'am_michael',language:'en-us'}},
   shotSpeakers:{meeting:['eng','sci','robo','eng','sci','robo'],ready:['robo']},pronunciations:{},
   captions:{mode:'both',highlight:true,maxChars:32,maxLines:2,maxCps:18},
   mix:{narration:1,music:.55,ambience:.35,sfx:.45,duck:.35,fadeSeconds:.25,peak:.92,master:'mix-v2'},cues:[],syncActions:false},
  shots:shots().map(s=>({...s,backend}))};
 validateProject(p);return p;
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 for(const b of ['cpu','three']){const file=new URL('../examples/talk02-dialogue-'+b+'-polished.json',import.meta.url),text=JSON.stringify(build(b),null,1)+'\n';
  if(process.argv.includes('--check')){if(readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==text)throw Error('stale '+file.pathname);}else writeFileSync(file,text);}
 console.log('ok');
}
