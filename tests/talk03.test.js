// TALK-03: body language while talking (beats at measured emphasis peaks, listener nods, blinks, sway).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {BODY,bodyAt,bodyPlan,applyBody,emphasisPeaks,beatEligible} from '../src/core/body.js';
import {emitAsset} from '../src/visual/assets.js';
import {evaluateGraph} from '../src/core/graph.js';

const load=b=>JSON.parse(readFileSync(new URL('../examples/talk03-body-'+b+'-polished.json',import.meta.url),'utf8'));
// Synthetic measured timeline: six phrases in the meeting, an envelope with a peak every 25 frames while speaking.
function timeline(p){
 const n=600,shots=[{id:'meeting',startFrame:0,endFrame:500,transitionFrames:0,segments:p.speech.shotSpeakers.meeting.map((sp,k)=>({text:'x',speaker:sp,startSample:(20+k*80)*1600,endSample:(85+k*80)*1600,speed:1}))},
  {id:'ready',startFrame:500,endFrame:600,transitionFrames:12,segments:[{text:'x',speaker:'robo',startSample:520*1600,endSample:570*1600,speed:1}]}];
 const values=Array.from({length:n},(_,f)=>{const speaking=shots.some(s=>s.segments.some(g=>f*1600>=g.startSample&&f*1600<g.endSample));return speaking?(f%25===0?900:400):0;});
 return {version:1,fps:30,sampleRate:48000,durationFrames:n,shots,speechEnvelope:{version:1,unit:'permille-rms',values}};
}
const geo=(id,pose)=>{const o=[];emitAsset(id,(c,sz,col,tf=q=>q)=>o.push(JSON.stringify([tf(c).map(v=>+v.toFixed(9)),sz.map(v=>+v.toFixed(9)),col])),pose);return o;};

test('bodyLanguage validation: negatives',()=>{
 const p=load('cpu');validateProject(p);
 for(const mut of [s=>{s.shots[0].bodyLanguage={dance:true};},s=>{s.shots[0].bodyLanguage={beats:1};},s=>{s.shots[0].bodyLanguage={beats:false,nods:false};},s=>{s.shots[0].bodyLanguage='on';},s=>{delete s.shots[1].speakerAssets;}])
  {const q=structuredClone(p);mut(q);assert.throws(()=>validateProject(q),/bodyLanguage/);}
});
test('emphasis peaks: above threshold, local maxima, at least minGap apart',()=>{
 const t=timeline(load('cpu')),pk=emphasisPeaks(t),v=t.speechEnvelope.values;
 assert.ok(pk.length>5);for(const f of pk)assert.ok(v[f]>=BODY.peakMin);for(let i=1;i<pk.length;i++)assert.ok(pk[i]-pk[i-1]>=BODY.minGap);
 assert.equal(emphasisPeaks(t),pk,'cached per timeline');
});
test('bodyAt: speaker beats at peaks, listeners nod as a phrase ends, blinks and sway bounded and deterministic',()=>{
 const p=load('cpu'),t=timeline(p),pk=emphasisPeaks(t);
 // Calmer contract (owner review): one beat per line at its loudest frame, no head nod on beats.
 const plan=bodyPlan(p,t,0),v=t.speechEnvelope.values,segs=t.shots[0].segments;
 assert.ok(plan.beats.length<=segs.length);
 for(const x of plan.beats){const g=segs.find(g=>x.frame*1600>=g.startSample&&x.frame*1600<g.endSample);assert.ok(g,'beat inside a line');for(let f2=Math.ceil(g.startSample/1600);f2<Math.floor(g.endSample/1600);f2++)assert.ok(v[f2]<=v[x.frame]);}
 const eb=plan.beats.find(x=>x.id==='engineer'),f=eb.frame+5,b=bodyAt(p,t,f,0);   // engineer speaking
 assert.ok(b.engineer.beat<0&&b.engineer.beat>=-BODY.beatPitch,'speaker beat');assert.equal(b.engineer.nod,undefined,'no head nod on beats');
 assert.equal(b.scientist.beat,undefined);assert.equal(b.robot.beat,undefined);
 // Only the addressee nods, and not when the addressee replies next (the reply acknowledges the line).
 // Line 0 (engineer → scientist): the scientist replies next, so nobody nods.
 const end0=85-BODY.nodLead+8,n0=bodyAt(p,t,end0,0);assert.equal(n0.scientist.nod,undefined,'replying addressee does not nod');assert.equal(n0.robot.nod,undefined);
 // Line 1 (scientist → engineer, the previous speaker): the robot speaks next, so the engineer nods.
 const end1=165-BODY.nodLead+8,n1=bodyAt(p,t,end1,0);assert.ok(n1.engineer.nod>0&&n1.engineer.nod<=BODY.listenNod,'addressee nods');assert.equal(n1.robot.nod,undefined,'other listener stays still');
 for(const id of ['engineer','scientist','robot']){const fr=plan.nods.filter(x=>x.id===id).map(x=>x.frame);for(let i=1;i<fr.length;i++)assert.ok(fr[i]-fr[i-1]>=BODY.nodMinGap);}
 for(let fr=0;fr<500;fr+=7){const x=bodyAt(p,t,fr,0);for(const o of Object.values(x)){if(o.tilt!==undefined)assert.ok(Math.abs(o.tilt)<=BODY.swayAmp+1e-12);if(o.blink!==undefined)assert.ok(o.blink>=.1&&o.blink<=1);if(o.nod!==undefined)assert.ok(o.nod>=0&&o.nod<=BODY.listenNod);}}
 assert.deepEqual(bodyAt(p,t,123,0),bodyAt(structuredClone(p),t,123,0));
 let blinks=0;for(let fr=0;fr<500;fr++)if(bodyAt(p,t,fr,0).robot.blink<1)blinks++;assert.ok(blinks>=10&&blinks<=40,'robot blinks every 2.5-4.5 s ('+blinks+' frames)');
 const noBl=structuredClone(p);delete noBl.shots[0].bodyLanguage;assert.equal(bodyAt(noBl,t,50,0),null);
});
test('beats skip characters that hold props, aim or have authored arm motion; authored blink tracks win',()=>{
 const s=structuredClone(load('cpu').shots[0]);assert.equal(beatEligible(s,'engineer'),true);
 s.assets.push({id:'cup',asset:'mug',tracks:{x:[[0,-1]]},attachment:{parent:'engineer',anchor:'right-hand',start:0,end:1}});assert.equal(beatEligible(s,'engineer'),false);
 const a=structuredClone(load('cpu').shots[0]);a.assets[0].aim={target:'robot',start:0,end:1};assert.equal(beatEligible(a,'engineer'),false);
 const r=structuredClone(load('cpu').shots[0]);r.assets[2].actions=[{name:'wave',start:0,end:1}];assert.equal(beatEligible(r,'scientist'),false);
 const p=load('cpu');p.shots[0].assets[1].tracks.blink=[[0,1]];assert.equal(bodyAt(p,timeline(p),40,0).robot.blink,undefined);
});
test('applyBody: additive clamped arm pitch, head keys and blink on bound characters only',()=>{
 const s=load('cpu').shots[0],st=applyBody(evaluateGraph(s,.3),{engineer:{beat:-.3,nod:.1},robot:{tilt:.02,blink:.5}});
 const e=st.assets.find(a=>a.id==='engineer').pose,r=st.assets.find(a=>a.id==='robot').pose;
 assert.equal(e.armPitch,-.3);assert.equal(e.nod,.1);assert.equal(e.tilt,0);assert.equal(r.tilt,.02);assert.equal(r.nod,0);assert.equal(r.blink,.5);
 assert.equal(st.assets.find(a=>a.id==='scientist').pose.nod,undefined);
 assert.equal(applyBody(evaluateGraph(s,.3),{engineer:{beat:-5}}).assets.find(a=>a.id==='engineer').pose.armPitch,-2.8);
});
test('geometry: nod/tilt move only the head; blink 1 and no-blink identical; closed eyes shrink',()=>{
 for(const [id,params] of [['engineer',{detail:2}],['scientist',{detail:3}],['service-robot',undefined]]){
  const base={origin:[0,0,0],yaw:.2,armPitch:-.8,params},a=geo(id,base),b=geo(id,{...base,nod:.25,tilt:.05}).map(JSON.parse),A=a.map(JSON.parse);
  const moved=A.map((x,i)=>Math.hypot(...x[0].map((v,j)=>v-b[i][0][j]))>1e-9);assert.ok(moved.some(Boolean));
  const hMin=Math.min(...A.filter((x,i)=>moved[i]).map(x=>x[0][1])),hMax=Math.max(...A.filter((x,i)=>!moved[i]).map(x=>x[0][1]));assert.ok(hMin>hMax,id+' only head boxes move');
  assert.deepEqual(geo(id,{...base,nod:0,tilt:0}).map(JSON.parse).map(x=>x[0].map(v=>+v.toFixed(6))),A.map(x=>x[0].map(v=>+v.toFixed(6))),'zero nod = rest pose');
 }
 const pose={origin:[0,0,0],yaw:0,params:{detail:2}};assert.deepEqual(geo('engineer',{...pose,blink:1}),geo('engineer',pose));
 assert.notDeepEqual(geo('engineer',{...pose,blink:.1}),geo('engineer',pose));
});
test('TALK-03 example: generator reproduces both backends; dialogue identical to TALK-02 apart from body language',async()=>{
 const {build}=await import('../scripts/talk03-body.mjs');for(const b of ['cpu','three'])assert.deepEqual(build(b),load(b));
 const p=load('cpu'),d=JSON.parse(readFileSync(new URL('../examples/talk02-dialogue-cpu-polished.json',import.meta.url),'utf8'));
 assert.deepEqual(p.speech,d.speech);assert.deepEqual(p.shots.map(s=>s.narration),d.shots.map(s=>s.narration));
 assert.ok(p.shots.every(s=>s.bodyLanguage.beats&&s.bodyLanguage.nods&&s.bodyLanguage.blinks&&s.bodyLanguage.sway));
});

test('head motion speed: nods and sway stay gentle and continuous across speaker changes (owner review)',()=>{
 const p=load('cpu'),t=timeline(p),deg=r=>r*30*180/Math.PI;let prev=null;const peak={nod:0,tilt:0};
 for(let f=0;f<500;f++){const b=bodyAt(p,t,f,0);if(prev)for(const id of ['engineer','scientist','robot'])for(const k of ['nod','tilt'])peak[k]=Math.max(peak[k],deg(Math.abs((b[id][k]??0)-(prev[id][k]??0))));prev=b;}
 assert.ok(peak.nod<=35,'nod peak '+peak.nod.toFixed(1)+' deg/s');assert.ok(peak.tilt<=5,'sway peak '+peak.tilt.toFixed(1)+' deg/s');
 assert.equal(load('cpu').shots[0].dialogue.turn,.8,'example turns slowed to 0.8 s');
});

test('movement budget: at most one beat per own line and nods spaced by nodMinGap (owner review: fewer movements)',()=>{
 const p=load('cpu'),t=timeline(p),plan=bodyPlan(p,t,0),lines=id=>t.shots[0].segments.filter(g=>p.shots[0].speakerAssets[g.speaker]===id).length;
 for(const id of ['engineer','scientist','robot']){assert.ok(plan.beats.filter(x=>x.id===id).length<=lines(id));assert.ok(plan.nods.filter(x=>x.id===id).length<=Math.ceil(500/BODY.nodMinGap));}
 assert.ok(plan.nods.length<=t.shots[0].segments.length,'at most one nod (by the addressee) per line');
});
