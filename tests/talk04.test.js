// TALK-04 director dialogue authoring: request.dialogue, IR speakers, offline turns, compile/staging, prompt v1.3,
// Studio speaker editor. Every behaviour is opt-in; absent dialogue keeps director output and prompts identical.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {direct,buildPrompt,estimateTokens,PROMPT_VERSIONS,compile} from '../src/director/index.js';
import {request} from '../src/director/schema.js';
import {baseline,offlineIR} from '../src/director/offline.js';
import {sentences,turnSpeaker,DIALOGUE_CAMERAS,DIALOGUE_STAGE} from '../src/director/dialogue.js';
import {mockProvider} from '../src/director/providers.js';
import {validateProject} from '../src/core/timeline.js';
import {dialogueShot} from '../src/core/dialogue.js';
import {inspectProject} from '../src/quality/preflight.js';
import {compositionReport,compositionGate} from '../src/quality/composition.js';
import {defaultSpeech} from '../src/studio/production.js';
import {plannedTimeline,setSpeakers,setLineSpeaker,bindSpeaker,applyShotEdit} from '../src/studio/model.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const REQ=read('talk04-dialogue.request');
const REQS=['director-cpu-polished','director-three-polished','release','continuity-cpu-polished','continuity-three-polished','speech-cpu-polished','speech-three-polished'];
const CAST=REQ.dialogue.speakers;
const norm=s=>s.trim().replace(/\s+/g,' ');

test('defaults: v1.1 and v1.2 prompts byte-identical to the pre-TALK-04 digest; no dialogue → no v1.3',()=>{
 const h=createHash('sha256');
 for(const n of REQS)for(const extra of [{},{staging:'art-v1'},{staging:'art-v2'}])for(const v of ['director-ir-v1.1','director-ir-v1.2']){
  const q=request({...read(n+'.request'),...extra,promptVersion:v}),plan=baseline(q);h.update(buildPrompt(q,plan));h.update(buildPrompt(q,plan,'some error'));}
 assert.equal(h.digest('hex').slice(0,16),'5570443b9a8ebe03','digest taken at 85d7a37 content before TALK-04');
 assert.deepEqual(PROMPT_VERSIONS,['director-ir-v1.1','director-ir-v1.2','director-ir-v1.3']);
 for(const n of REQS){const q=request(read(n+'.request'));assert.equal(q.promptVersion,undefined);assert.equal(q.dialogue,undefined);}
});

test('request.dialogue: valid cast selects director-ir-v1.3; negatives for every field',()=>{
 const q=request(REQ);assert.equal(q.promptVersion,'director-ir-v1.3');
 assert.equal(request({...REQ,promptVersion:'director-ir-v1.3'}).promptVersion,'director-ir-v1.3');
 const d=(patch,speakers=CAST)=>({...REQ,dialogue:{speakers,...patch}});
 const sp=(i,patch)=>CAST.map((s,j)=>j===i?{...s,...patch}:s);
 const bad=[
  [d({},CAST.slice(0,1)),/2–3 speakers/],[d({},[...CAST,{...CAST[0],id:'four'}]),/2–3 speakers/],[d({},'eng'),/2–3 speakers/],
  [d({style:'debate'}),/style/],[{...REQ,dialogue:{speakers:CAST,extra:1}},/unknown|field/i],
  [d({},sp(1,{id:'eng'})),/duplicate speaker/],[d({},sp(0,{id:'object-1'})),/reserved/],[d({},sp(0,{id:'default'})),/reserved/],[d({},sp(0,{id:'Bad Id'})),/unsafe/],
  [d({},sp(0,{name:'<b>'})),/markup/],[d({},sp(0,{voice:'xx_none'})),/voice/],[d({},sp(2,{language:'en-us'})),/voice\/language mismatch/],
  [d({},sp(0,{character:'table'})),/mouth/],[d({},sp(0,{character:'retro-robot'})),/mouth/],[d({},sp(0,{character:'no-such-asset'})),/mouth/],
  [d({},sp(0,{role:'host'})),/unknown|field/i],[d({},CAST.map(({character,...s})=>s)),/character|required/i],
  [{...REQ,staging:'art-v1'},/omit request.staging/],
  [{...REQ,promptVersion:'director-ir-v1.2'},/dialogue requires director-ir-v1.3/],
  [{...read('director-cpu-polished.request'),promptVersion:'director-ir-v1.3'},/requires request.dialogue/],
  [{...read('continuity-cpu-polished.request'),dialogue:{speakers:CAST}},/identity|stories/],
  [{...REQ,speech:{...defaultSpeech(60),speakers:{eng:{name:'E',voice:'af_heart',language:'en-us'}}}},/derived from the dialogue/],
 ];
 for(const [r,re] of bad)assert.throws(()=>request(r),re,JSON.stringify(r.dialogue??r.promptVersion).slice(0,120));
});

test('offline dialogue: the offline narration split into sentences and handed out in turns (no new lines)',()=>{
 const q=request(REQ),plan=baseline(q),ir=offlineIR(q,plan),plain=offlineIR(request({...REQ,dialogue:undefined,promptVersion:undefined}),plan);
 assert.equal(norm(ir.shots.flatMap(s=>s.narration).join(' ')),norm(plain.shots.flatMap(s=>s.narration).join(' ')),'same words, same order');
 for(const [i,s] of ir.shots.entries()){assert.deepEqual(s.narration,sentences(plain.shots[i].narration));assert.equal(s.speakers.length,s.narration.length);assert.equal(s.assets.length,1);assert.ok(DIALOGUE_CAMERAS.includes(s.camera));assert.equal(s.effect,undefined);assert.equal(s.overlay,undefined);}
 assert.deepEqual(ir.shots.flatMap(s=>s.speakers).slice(0,6),['eng','robo','sci','eng','robo','sci'],'round-robin across the film');
 assert.match(ir.treatment,/split into turns between Engineer, Robot, Scientist/);
 const iv={speakers:CAST,style:'interview'};assert.deepEqual([0,1,2,3,4,5].map(k=>turnSpeaker(iv,k)),['eng','robo','eng','sci','eng','robo'],'host alternates with each guest');
 assert.deepEqual([0,1,2,3].map(k=>turnSpeaker({speakers:CAST.slice(0,2),style:'interview'},k)),['eng','robo','eng','robo']);
 assert.deepEqual(sentences(['Version 1.5 works. Does it? Yes!']),['Version 1.5 works.','Does it?','Yes!'],'splits only at whitespace after punctuation');
 assert.equal(sentences([Array.from({length:12},(_,i)=>'S'+i+'.').join(' ')]).length,8,'at most 8 lines per shot');
 // A supplied script stays verbatim (validateIR checks the normalized join).
 const script='Hello there. How are you? I am fine. Good to hear. Shall we start? Yes, let us begin.';
 const sq=request({...REQ,seconds:20,script}),sir=offlineIR(sq,baseline(sq));assert.equal(norm(sir.shots.flatMap(s=>s.narration).join(' ')),script);
});

test('IR speakers: validated only with dialogue; negatives',()=>{
 const q=request(REQ),plan=baseline(q),ir=offlineIR(q,plan);compile(q,ir,plan.selection);
 const mut=f=>{const x=structuredClone(ir);f(x.shots[0]);return x;};
 for(const [x,re] of [[mut(s=>{delete s.speakers;}),/one speaker per narration line/],[mut(s=>{s.speakers=s.speakers.slice(1);}),/one speaker per narration line/],
  [mut(s=>{s.speakers[0]='ghost';}),/unknown speaker/],[mut(s=>{s.assets.push({asset:plan.selection[0].find(o=>o.id!==s.assets[0].asset).id});}),/exactly one set-piece/],
  [mut(s=>{s.camera='orbit';}),/camera/],[mut(s=>{s.speakers='eng';}),/one speaker per narration line/]])
  assert.throws(()=>compile(q,x,plan.selection),re);
 const p=request(read('director-cpu-polished.request')),pp=baseline(p),pir=offlineIR(p,pp);pir.shots[0].speakers=pir.shots[0].narration.map(()=>'eng');
 assert.throws(()=>compile(p,pir,pp.selection),/request.dialogue required/);
});

// Synthetic measured timeline (planned durations, lines spread evenly, speaker per line) for staging checks.
function syntheticTimeline(project){
 const t=plannedTimeline(project);
 for(const [i,s] of project.shots.entries()){const sh=t.shots[i],n=s.narration.length,a=sh.startFrame*1600,len=(sh.endFrame-sh.startFrame)*1600;
  sh.segments=s.narration.map((text,j)=>({text,startSample:Math.round(a+len*(.1+.8*j/n)),endSample:Math.round(a+len*(.1+.8*(j+.9)/n)),speaker:project.speech.shotSpeakers[s.id][j]}));}
 return t;
}
test('compile: speech from the dialogue, staged speakers with TALK-01..03 opt-ins, readable composition',async()=>{
 for(const speech of [undefined,defaultSpeech(60)]){
  const x=await direct({...REQ,...(speech?{speech}:{})}),p=x.project;validateProject(p);
  assert.equal(x.manifest.promptVersion,'director-ir-v1.3');assert.deepEqual(x.stages.script.speakers,x.ir.shots.map(s=>s.speakers));
  assert.deepEqual(p.speech.speakers,Object.fromEntries(CAST.map(s=>[s.id,{name:s.name,voice:s.voice,language:s.language}])));
  assert.equal(p.speech.placement,'lead');assert.equal(p.speech.mix.master,'mix-v2');assert.equal(p.speech.targetFrames,1800);
  for(const [i,s] of p.shots.entries()){
   assert.deepEqual(p.speech.shotSpeakers[s.id],x.ir.shots[i].speakers);assert.equal(s.durationFrames,null);
   assert.deepEqual(s.speakerAssets,{eng:'eng',robo:'robo',sci:'sci'});assert.deepEqual(s.dialogue,{listen:true,turn:.8,cheat:1,camera:'follow'}); // GEN-03: camera follows the speaker
   // GEN-11: Director dialogue adds the idle weight shift
   assert.deepEqual(s.bodyLanguage,{beats:true,nods:true,blinks:true,sway:true,weight:true});assert.equal(s.lighting,'parity-v1');
   assert.deepEqual(s.assets.map(a=>a.id),['eng','robo','sci','object-1']);
   // GEN-02: shared talk-v1 line (tighter for 9:16), framed as a group with the set piece beside it.
   assert.deepEqual(s.assets.slice(0,3).map(a=>[a.tracks.x[0][1],a.tracks.z[0][1]]),DIALOGUE_STAGE.line[3]);
   assert.equal(s.assets[0].params.detail,2);assert.equal(s.assets[1].params,undefined);assert.equal(s.assets[2].params.detail,2);
   assert.ok(s.assets.slice(0,3).every(a=>a.turnSteps===true&&a.face===undefined&&a.actions===undefined));
   assert.equal(s.cameraRig.subject,undefined);assert.equal(s.cameraRig.framing,'group');assert.deepEqual(s.cameraRig.subjects,['eng','robo','sci','object-1']);
  }
  assert.equal(inspectProject(p).issues.filter(i=>i.severity==='error').length,0);
  const t=syntheticTimeline(p);
  for(const [i,s] of p.shots.entries()){const d=dialogueShot(s,t.shots[i]);assert.ok(d.assets.slice(0,3).every(a=>a.face!==undefined),'listeners look at the speaker');
   assert.deepEqual(compositionGate(d).warnings,[],s.id);for(const v of Object.values(compositionReport(d).characters))assert.equal(v.backToCameraSamples,0);}
 }
 // Two speakers: ±1; fixed shots honoured.
 const two=await direct({...REQ,dialogue:{speakers:CAST.slice(0,2)},speech:{...defaultSpeech(60),fixedShots:{'shot-1':240}}});
 assert.deepEqual(two.project.shots[0].assets.slice(0,2).map(a=>a.tracks.x[0][1]),DIALOGUE_STAGE.line[2].map(v=>v[0]));assert.equal(two.project.shots[0].durationFrames,240);
 // GEN-06: singles bind only their visible speaker; every group shot binds both.
 assert.ok(two.project.shots.every(s=>Object.keys(s.speakerAssets).length===(s.id.endsWith('-single')?1:2)));
 // Deterministic.
 assert.deepEqual((await direct(REQ)).project,(await direct(structuredClone(REQ))).project);
});

// A mock provider that reads only the v1.3 prompt and answers with lines that alternate the listed speakers.
function promptReader(prompt){
 const line=k=>prompt.split('\n').find(l=>l.startsWith(k)),ids=new Map(line('Objects').replace(/^[^:]*: /,'').split('; ').map(s=>s.split('|')).map(([n,id])=>[n,id]));
 const slots=line('Slots').replace(/^[^:]*\): /,'').split('; ').map(s=>s.slice(s.lastIndexOf(': ')+2).split(','));
 const speakers=[...line('Dialogue').matchAll(/(?:speakers |; )([a-z][a-z0-9-]*)=/g)].map(m=>m[1]),cam=line('Cameras: ').slice(9).split('.')[0].split(',')[0];
 return {version:1,title:'Mock talk',treatment:'A mock dialogue.',shots:slots.map((ns,i)=>({heading:'SHOT '+(i+1),subheading:'Mock',narration:['Line one of shot '+(i+1)+'.','Line two.'],speakers:[speakers[i%speakers.length],speakers[(i+1)%speakers.length]],camera:cam,environment:'amber',assets:[{asset:ids.get(ns[0])}]}))};
}
test('prompt v1.3: Dialogue block, ≤2000 estimated tokens for 60 s, mock-provider round trip and repair',async()=>{
 const q=request(REQ),p=buildPrompt(q,baseline(q));
 assert.ok(estimateTokens(p)<=2000,String(estimateTokens(p)));
 assert.match(p,/^Dialogue \(conversation\): speakers eng=Engineer \(speaker, engineer\); robo=Robot \(speaker, service-robot\); sci=Scientist \(speaker, scientist\)\./m);
 assert.match(p,/speakers:\[speakerId\]/);assert.match(p,/exactly 1 set-piece object/);assert.match(p,/^Cameras: medium,dolly-in,push-in,pull-back,establishing\./m);
 assert.doesNotMatch(p.split('\n').find(l=>l.startsWith('Request: ')),/dialogue|character/,'cast shown once, in the Dialogue block');
 const iv=request({...REQ,dialogue:{...REQ.dialogue,style:'interview'}});assert.match(buildPrompt(iv,baseline(iv)),/eng=Engineer \(host, engineer\); robo=Robot \(guest/);
 assert.throws(()=>buildPrompt({...request(read('director-cpu-polished.request')),promptVersion:'director-ir-v1.3'},baseline(q)),/requires request.dialogue/);
 let calls=0;
 const x=await direct(REQ,{maxRepairs:1,adapter:mockProvider(async prompt=>{calls++;const ir=promptReader(prompt);if(calls===1)delete ir.shots[0].speakers;return {text:JSON.stringify(ir),usage:{input:estimateTokens(prompt),output:200}};})});
 assert.equal(calls,2);assert.equal(x.manifest.repairs,1);assert.match(x.manifest.attempts[0].error.message,/one speaker per narration line/);
 validateProject(x.project);assert.equal(x.manifest.mode,'model-assisted');assert.deepEqual(x.project.speech.shotSpeakers['shot-1'],['eng','robo']);
});

// ---- Studio speaker editor ----
const talk02=()=>read('talk02-dialogue-cpu-polished');
test('studio: setSpeakers / setLineSpeaker / bindSpeaker edit validated clones',()=>{
 const p=talk02(),before=structuredClone(p);
 const a=setSpeakers(p,{...p.speech.speakers,guest:{name:'Guest',voice:'am_adam',language:'en-us'},eng:{name:'Chief',voice:'af_bella',language:'en-us'}});
 assert.equal(a.speech.speakers.eng.name,'Chief');assert.ok(a.speech.speakers.guest);assert.deepEqual(p,before,'original untouched');
 const b=setLineSpeaker(a,0,1,'guest');assert.equal(b.speech.shotSpeakers.meeting[1],'guest');assert.equal(a.speech.shotSpeakers.meeting[1],'sci');
 const c=bindSpeaker(bindSpeaker(b,0,'sci',null),0,'guest','scientist');assert.equal(c.shots[0].speakerAssets.guest,'scientist');assert.equal(c.shots[0].speakerAssets.sci,undefined);
 const d=bindSpeaker(p,1,'robo',null);assert.equal(d.shots[1].speakerAssets,undefined,'empty map removed');
 // First assignment in a shot without line speakers voices every line of that shot.
 const e=structuredClone(p);delete e.speech.shotSpeakers.ready;const f=setLineSpeaker(e,1,0,'eng');assert.deepEqual(f.speech.shotSpeakers.ready,['eng']);
 // Changing a dialogue shot's line count is explicit: line speakers must match, so the edit is rejected, not guessed.
 assert.throws(()=>applyShotEdit(p,1,{narration:['One.','Two.']}),/phrase count mismatch/);
 assert.deepEqual(applyShotEdit(p,1,{narration:['One line.']}).shots[1].narration,['One line.']);
});
test('studio speaker editor: negatives are rejected and leave the project unchanged',()=>{
 const p=talk02(),before=structuredClone(p);
 const bad=[
  [()=>setSpeakers(p,{eng:p.speech.speakers.eng,robo:p.speech.speakers.robo}),/shotSpeakers|speaker/i,'removing a speaker still in use'],
  [()=>setSpeakers(p,{...p.speech.speakers,x:{name:'X',voice:'bf_emma',language:'en-us'}}),/mismatch/,'voice/language'],
  [()=>setSpeakers(p,[]),/object/,'array'],
  [()=>setLineSpeaker(p,0,9,'eng'),/narration line/,'line index'],[()=>setLineSpeaker(p,0,-1,'eng'),/narration line/,'negative line'],
  [()=>setLineSpeaker(p,0,0,'ghost'),/Unknown speaker/,'unknown speaker'],[()=>setLineSpeaker(p,0,0,'__proto__'),/Unknown speaker/,'proto'],
  [()=>setLineSpeaker(p,7,0,'eng'),/Unknown shot/,'shot index'],
  [()=>bindSpeaker(p,0,'ghost','engineer'),/Unknown speaker/,'bind unknown speaker'],[()=>bindSpeaker(p,0,'eng','nobody'),/Unknown character/,'bind unknown asset'],
  [()=>bindSpeaker(p,0,'eng','table'),/mouth/,'no mouth'],[()=>bindSpeaker(p,0,'eng','robot'),/one speaker per character/,'double binding'],
  [()=>bindSpeaker(bindSpeaker(p,0,'robo',null),0,'sci',null),/two bound speakers/,'dialogue needs two speakers'],
  [()=>setSpeakers(read('art05-workshop-cpu-polished'),{}),/speech project/,'non-speech project'],
 ];
 for(const [f,re,label] of bad)assert.throws(f,re,label);
 assert.deepEqual(p,before);
});
test('studio UI: speaker panel and dialogue option are wired to the model functions',()=>{
 const html=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8'),js=readFileSync(new URL('../studio/app.js',import.meta.url),'utf8');
 for(const id of ['directDialogue','speakers','addSpeaker','applySpeakers','lineSpeakers'])assert.match(html,new RegExp('id="'+id+'"'));
 for(const f of ['setSpeakers','setLineSpeaker','bindSpeaker'])assert.match(js,new RegExp(f+'\\('));
 assert.match(js,/dialogue:\{speakers:DIALOGUE_CAST\}/);
});
