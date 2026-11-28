// GEN-06 (owner: "yes i want these cuts"): long dialogue lines cut to a single of the speaker as its own shot, framed so
// nobody is cut by the frame edge; shot lengths still follow the measured speech.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {validateProject} from '../src/core/timeline.js';
import {singleShots,singleFits,SINGLES} from '../src/core/singles.js';
import {motionCheck,visibilityCheck,estimatedTimeline} from '../src/quality/motion-check.js';
import {crowdingCheck} from '../src/quality/crowding.js';
import {inspectProject} from '../src/quality/preflight.js';
import {plannedTimeline} from '../src/studio/model.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const directed=async(n,dialogue={})=>{const r=read(n+'.request');return (await direct({...r,speech:defaultSpeech(r.seconds),dialogue:{...r.dialogue,...dialogue}})).project;};
const est=p=>estimatedTimeline(p,plannedTimeline(p));

test('Director interview: long lines become singles; nobody cut; every check clean; words and order kept',async()=>{
 // GPU-07 follow-up: every-long-line singles are now dialogue.singles 'all' (the default is sparing, tested below)
 const p=await directed('gen01-interview',{singles:'all'}),flat=await directed('gen01-interview',{singles:false});
 const singles=p.shots.filter(s=>s.id.endsWith('-single'));
 assert.ok(singles.length>=2,String(singles.length));
 assert.deepEqual(p.shots.flatMap(s=>s.narration),flat.shots.flatMap(s=>s.narration),'same lines, same order');
 assert.deepEqual(p.shots.flatMap(s=>p.speech.shotSpeakers[s.id]),flat.shots.flatMap(s=>flat.speech.shotSpeakers[s.id]),'same line speakers');
 for(const s of singles){
  assert.equal(s.cameraRig.framing,'single');assert.equal(s.narration.length,1);
  assert.ok(s.narration[0].trim().split(/\s+/).length>=SINGLES.minWords);
  assert.deepEqual(Object.values(s.speakerAssets),[s.cameraRig.subject]);
  assert.ok(singleFits(s,s.cameraRig.subject),'speaker whole in the safe area');
  assert.equal(s.dialogue,undefined,'no listeners in frame');
 }
 for(const [i,s] of p.shots.entries())if(i&&p.shots[i-1].heading===s.heading)assert.equal(s.titleHold,true,s.id+' continues the heading');
 assert.equal(p.shots[0].titleHold,undefined);
 const t=est(p);
 assert.deepEqual(motionCheck(p,t).warnings,[]);assert.deepEqual(visibilityCheck(p).warnings,[]);assert.deepEqual(crowdingCheck(p,t).warnings,[]);
 assert.deepEqual(inspectProject(p).issues.filter(x=>x.severity!=='review'),[]);
 // the speaker is larger than in the group shot it came from
 assert.ok(singles.every(s=>singleFits(s,s.cameraRig.subject).height>.6));
});
test('singles off: the GEN-03 shots exactly; invalid option rejected; three-speaker lines are kept with a reason',async()=>{
 const flat=await directed('gen01-interview',{singles:false});
 assert.deepEqual(flat.shots.map(s=>s.id),['shot-1','shot-2','shot-3','shot-4','shot-5','shot-6']);
 assert.ok(flat.shots.every(s=>s.cameraRig.framing==='group'&&!s.titleHold));
 await assert.rejects(directed('gen01-interview',{singles:'yes'}),/singles/);
 const three=await directed('talk04-dialogue',{singles:false}),r=singleShots(three,{...SINGLES,mode:'all'});
 assert.equal(r.report.singles.length,0);assert.ok(r.report.kept.length>0);
 assert.ok(r.report.kept.every(k=>['no framing keeps everyone whole','characters move'].includes(k.reason)),JSON.stringify(r.report.kept));
 assert.deepEqual(r.project,three,'nothing changed');
});
test('eligibility: fixed durations, moving characters, cues and non-speech projects are left alone',async()=>{
 const p=await directed('gen01-interview',{singles:false}),long=p.shots.findIndex(s=>s.narration.some(t=>t.split(' ').length>=SINGLES.minWords)&&!s.assets.some(a=>a.aim));
 const fixed=structuredClone(p);fixed.speech.fixedShots[fixed.shots[long].id]=300;fixed.shots[long].durationFrames=300;
 assert.ok(singleShots(fixed).report.kept.some(k=>k.shot===p.shots[long].id&&k.reason==='fixed duration'));
 const moving=structuredClone(p);moving.shots[long].assets[0].tracks.x=[[0,-.9],[1,-.5]];
 assert.ok(singleShots(moving).report.kept.some(k=>k.shot===p.shots[long].id&&k.reason==='characters move'));
 const cue=structuredClone(p);cue.speech.cues=[{shot:p.shots[long].id,anchor:'shot-start',type:'tick',gain:.5}];
 assert.ok(singleShots(cue).report.kept.some(k=>k.reason==='audio cues'));
 const plain=read('cinematic-cpu-polished');assert.deepEqual(singleShots(plain).project,plain);
 const split=singleShots(p).project;validateProject(split);assert.ok(split.shots.length<=SINGLES.maxShots);
});
test('contract negatives: framing single needs a known subject; titleHold is true-only and never on the first shot',async()=>{
 const p=await directed('gen01-interview'),s=p.shots.findIndex(x=>x.id.endsWith('-single'));
 const bad=f=>{const x=structuredClone(p);f(x);assert.throws(()=>validateProject(x));};
 bad(x=>delete x.shots[s].cameraRig.subject);bad(x=>x.shots[s].cameraRig.subject='ghost');
 bad(x=>x.shots[s].cameraRig.subjects=['host','guest']);
 bad(x=>x.shots[s].titleHold=false);bad(x=>x.shots[0].titleHold=true);
});

test('sparing singles (default; owner "Fewer solo shots"): longest lines only, never in neighbouring shots, at most a third of the words',async()=>{
 const words=t=>t.trim().split(/\s+/).length;
 for(const n of ['gen01-interview','talk04-dialogue']){
  const p=await directed(n),all=await directed(n,{singles:'all'}),flat=await directed(n,{singles:false});
  const singles=p.shots.filter(s=>s.id.endsWith('-single'));
  assert.ok(singles.length<=all.shots.filter(s=>s.id.endsWith('-single')).length,n);
  const total=flat.shots.reduce((m,s)=>m+s.narration.reduce((k,t)=>k+words(t),0),0),solo=singles.reduce((m,s)=>m+words(s.narration[0]),0);
  assert.ok(solo<=total/3+1e-9,n+' share '+solo+'/'+total);
  const origin=singles.map(s=>flat.shots.findIndex(x=>x.id===s.id.replace(/-single$/,'')));
  for(let i=1;i<origin.length;i++)assert.ok(origin[i]-origin[i-1]>1,n+' neighbouring singles');
  assert.deepEqual(p.shots.flatMap(s=>s.narration),flat.shots.flatMap(s=>s.narration),'same lines, same order');
 }
 const p=await directed('gen01-interview');assert.ok(p.shots.some(s=>s.id.endsWith('-single')),'still some variety');
 await assert.rejects(directed('gen01-interview',{singles:'some'}),/singles/);
});
