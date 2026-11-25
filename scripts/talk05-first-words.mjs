// TALK-05 showcase: "The Workshop — First Words", a ~75 s dialogue film. The engineer (af_heart), the scientist
// (bf_emma, en-gb) and the robot (am_michael) teach the robot to speak. Uses TALK-01..03 (speaking faces, listeners
// look at the speaker, calm body language) and POLISH features (aim, high-shelf reach/place, turnSteps, lead
// placement, mix-v2). All lines are a Claude draft awaiting the owner's approval. Deterministic generator.
// Usage: node scripts/talk05-first-words.mjs [--check]  (writes examples/talk05-first-words-{cpu,three}-polished.json)
import {readFileSync,writeFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {inspectProject} from '../src/quality/preflight.js';
import {compositionGate} from '../src/quality/composition.js';
import {build as extended} from './workshop-extended.mjs';

const art05=JSON.parse(readFileSync(new URL('../examples/art05-workshop-cpu-polished.json',import.meta.url),'utf8'));
const FIDELITY=art05.shots[0].fidelity,D2={detail:2};
const BODY={beats:true,nods:true,blinks:true,sway:true},TALK={listen:true,turn:.8,cheat:1};
const shot=(id,environment,heading,subheading,body)=>({id,template:'cinematic-graph',backend:'cpu',durationFrames:null,transitionFrames:id==='morning'?0:12,...(id==='morning'?{}:{transition:'fade'}),heading,subheading,environment,lighting:'parity-v1',effects:[],fidelity:FIDELITY,...body});
const eng=(x,z=.35)=>({id:'engineer',asset:'engineer',params:D2,tracks:{x:[[0,x]],z:[[0,z]]},turnSteps:true});
const sci=(x,z=.35)=>({id:'scientist',asset:'scientist',params:D2,tracks:{x:[[0,x]],z:[[0,z]]},turnSteps:true});
const robo=(x,z=-.2)=>({id:'robot',asset:'service-robot',tracks:{x:[[0,x]],z:[[0,z]]},turnSteps:true});
const cam=(x0,x1,z0,z1,zoom0,zoom1,subject='robot',y=2.8)=>({cameraRig:{preset:'medium',framing:'medium',strength:.5,subject},camera:{x:[[0,x0],[1,x1]],y:[[0,y]],z:[[0,z0],[1,z1]],zoom:[[0,zoom0],[1,zoom1]]},cameraInterpolation:{x:'flow',zoom:'flow'}});
const ext=Object.fromEntries(extended('cpu').shots.map(s=>[s.id,s]));
// Lines per shot: [speaker, text]. DRAFT (Claude) — the owner may edit any line.
export const SCRIPT={
 morning:[['eng','Good morning! Can you say hello?'],['robo','Hello.'],['eng','Your very first word!']],
 tools:[['sci','Can you name that, over there?'],['robo','That is a toolbox.'],['sci','Very good.']],
 shelf:[['robo','I found a book on the top shelf.'],['robo','It says: words are tools too.']],
 table:[['eng','So, what did you learn today?'],['robo','Hello, toolbox, and book.'],['sci','That is three new words.'],['eng','And tomorrow, three more.'],['robo','I would like that.']],
 mistake:[['robo','Please pass me the wench.'],['eng','Wrench. There is an R.'],['robo','Wrrrench. Thank you.']],
 thanks:[['robo','Thank you, both of you.'],['sci','You are very welcome.'],['eng','We are proud of you.']],
 lights:[['robo','Goodnight, workshop.'],['robo','See you in the morning.']]
};
function shots(){
 const table=()=>({id:'table',asset:'table',tracks:{x:[[0,0]],z:[[0,-1.1]],scale:[[0,.8]]}});
 const shelf=structuredClone(ext.shelf),lights=structuredClone(ext.lights);
 return [
  shot('morning','amber','GOOD MORNING','A first word.',{...cam(-.2,.2,7.4,7.1,1400,1500),speakerAssets:{eng:'engineer',robo:'robot'},dialogue:TALK,bodyLanguage:BODY,assets:[eng(-.8,.3),robo(.8,.2)]}),
  // The robot points past the scientist at the toolbox (aim, body cheat) while it names it.
  shot('tools','laboratory','NAME IT','Point, then say it.',{...cam(.3,-.1,8,7.7,1250,1320,'scientist'),speakerAssets:{sci:'scientist',robo:'robot'},dialogue:TALK,bodyLanguage:BODY,
   assets:[sci(-.7,.3),{...robo(1,.1),actions:[{name:'point',start:.4,end:.85,blend:.12}],aim:{target:'toolbox',start:.4,end:.85,blend:.12,height:.35,cheat:.6}},{id:'toolbox',asset:'toolbox',tracks:{x:[[0,-2.1]],z:[[0,-.5]],scale:[[0,.9]]}}]}),
  // Reused POLISH-02 HIGH SHELF choreography (fixed 270 frames); the robot speaks after setting the book down.
  {...shelf,heading:'TOP SHELF',subheading:'A book to read.',speakerAssets:{robo:'robot'}},
  shot('table','amber','AROUND THE TABLE','Three voices.',{...cam(-.3,.3,8.2,7.8,1300,1380),speakerAssets:{eng:'engineer',robo:'robot',sci:'scientist'},dialogue:TALK,bodyLanguage:BODY,assets:[eng(-1.35),robo(0),sci(1.35),table()]}),
  shot('mistake','laboratory','ONE LETTER','Wench, wrench.',{...cam(.2,-.2,7.4,7.1,1400,1500,'engineer'),speakerAssets:{eng:'engineer',robo:'robot'},dialogue:TALK,bodyLanguage:BODY,
   assets:[eng(-.8,.3),robo(.8,.2),{id:'wrench',asset:'wrench',tracks:{x:[[0,0]],z:[[0,-.9]],scale:[[0,.8]]}}]}),
  shot('thanks','amber','THANK YOU','Two small words.',{...cam(-.2,.2,7.6,7.3,1350,1430,'robot',2.7),speakerAssets:{eng:'engineer',robo:'robot',sci:'scientist'},dialogue:TALK,bodyLanguage:BODY,assets:[eng(-1.2,.2),robo(0,.1),sci(1.2,.2)]}),
  {...lights,heading:'LIGHTS OUT',subheading:'Goodnight.',speakerAssets:{robo:'robot'}}
 ].map(s=>({...s,narration:SCRIPT[s.id].map(l=>l[1])}));
}
export function build(backend){
 const list=shots(),p={version:2,id:'talk05-first-words-'+backend+'-polished',title:'The Workshop — First Words',voice:'af_heart',
  speech:{version:1,targetFrames:2250,fixedShots:{shelf:270,lights:180},placement:'lead',
   speakers:{eng:{name:'Engineer',voice:'af_heart',language:'en-us'},sci:{name:'Scientist',voice:'bf_emma',language:'en-gb'},robo:{name:'Robot',voice:'am_michael',language:'en-us'}},
   shotSpeakers:Object.fromEntries(list.map(s=>[s.id,SCRIPT[s.id].map(l=>l[0])])),pronunciations:{Wrrrench:'rrr rench'},
   captions:{mode:'both',highlight:true,maxChars:32,maxLines:2,maxCps:18},
   mix:{narration:1,music:.55,ambience:.35,sfx:.45,duck:.35,fadeSeconds:.25,peak:.92,master:'mix-v2'},cues:[],syncActions:false},
  shots:list.map(s=>({...s,backend}))};
 validateProject(p);return p;
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 for(const b of ['cpu','three']){const file=new URL('../examples/talk05-first-words-'+b+'-polished.json',import.meta.url),p=build(b),text=JSON.stringify(p,null,1)+'\n';
  if(process.argv.includes('--check')){if(readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==text)throw Error('stale '+file.pathname);}else writeFileSync(file,text);
  if(b==='cpu'){console.log('preflight',JSON.stringify(inspectProject(p).issues.map(i=>i.shot+':'+i.code)));for(const s of p.shots)console.log(s.id,JSON.stringify(compositionGate(s).warnings));}}
 console.log('ok');
}
