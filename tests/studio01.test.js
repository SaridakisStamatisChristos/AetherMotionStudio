// STUDIO-01 "script to film": Director form → request mapping, script help, launcher and Studio API round trip.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {STUDIO_CASTS,STUDIO_DEFAULTS,directorRequest,scriptHelp,wordRange} from '../src/studio/director-form.js';
import {request} from '../src/director/schema.js';
import {direct} from '../src/director/index.js';
import {createStudio} from '../scripts/studio-server.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const forest=read('examples/gen12-forest-script.request.json'),interview=read('examples/gen01-interview.request.json');
// The owner pastes one sentence per line (docs/SCRIPT_FORMAT.md).
const pasted=forest.script.split(/(?<=[.!?])\s+/).join('\n');
const form=x=>({id:'film-test',topic:forest.topic,script:pasted,seconds:60,cast:'interview',backend:'cpu',profile:'polished',voice:'af_heart',staging:true,reels:false,...x});

test('interview cast: the form gives the same request as the forest script example (and the gen01 cast)',()=>{
 const q=directorRequest(form());
 assert.deepEqual(request(q),request({...forest,id:'film-test'}));
 assert.deepEqual(q.dialogue,interview.dialogue);
 assert.equal(q.staging,undefined);assert.equal(q.delivery,undefined);
 // Defaults the form starts with: interview cast, Three, polished, 60 s, Reels off.
 assert.deepEqual(STUDIO_DEFAULTS,{cast:'interview',backend:'three',profile:'polished',seconds:60,reels:false});
 assert.equal(directorRequest(form({backend:'three'})).backend,'three');
});
test('Reels checkbox, trio cast and narrator keep their contracts',()=>{
 assert.equal(request(directorRequest(form({reels:true}))).delivery,'reels-v1');
 // The TALK-04 cast the form offered before STUDIO-01 is unchanged (no style: round-robin turns).
 const trio=directorRequest(form({cast:'trio'}));
 assert.deepEqual(trio.dialogue,{speakers:[{id:'eng',name:'Engineer',voice:'af_heart',language:'en-us',character:'engineer'},{id:'robo',name:'Robot',voice:'am_michael',language:'en-us',character:'service-robot'},{id:'sci',name:'Scientist',voice:'bf_emma',language:'en-gb',character:'scientist'}]});
 request(trio);
 const n=directorRequest(form({cast:'narrator',script:''}));
 assert.deepEqual(n,{version:1,id:'film-test',topic:forest.topic,seconds:60,backend:'cpu',profile:'polished',voice:'af_heart',staging:'art-v1'});request(n);
 assert.equal(directorRequest(form({cast:'narrator',staging:false})).staging,undefined);
 // Presets are not shared by reference: editing one request never changes the next.
 directorRequest(form()).dialogue.speakers[0].name='Changed';assert.equal(STUDIO_CASTS.interview.dialogue.speakers[0].name,'Student');
});
test('negatives: empty script and topic, missing topic, unknown cast, backend, profile, seconds, reels',()=>{
 const cases=[
  [{topic:'',script:''},/Add a topic, or a topic and a script/],
  [{topic:'   ',script:'   '},/Add a topic, or a topic and a script/],
  [{topic:''},/Add a topic: one short question/],
  [{cast:'pirates'},/Unknown cast: pirates/],[{cast:'constructor'},/Unknown cast/],[{cast:undefined},/Unknown cast/],
  [{backend:'both'},/Unknown backend/],[{profile:'shiny'},/Unknown profile/],
  [{seconds:5},/6 to 300/],[{seconds:301},/6 to 300/],[{seconds:12.5},/6 to 300/],[{seconds:NaN},/6 to 300/],
  [{reels:'yes'},/Reels must be on or off/],[{id:''},/Request ID required/],[{cast:'narrator',voice:''},/narrator voice/],
 ];
 for(const [x,re] of cases)assert.throws(()=>directorRequest(form(x)),re,JSON.stringify(x));
 assert.throws(()=>directorRequest(null),/Form data required/);
 // The server-side schema still rejects what the form passes through unchanged (links in a script).
 assert.throws(()=>request(directorRequest(form({script:'See https://example.org now.'}))),/URLs/);
});
test('script help: word range, verdicts and rule checks',()=>{
 assert.deepEqual(wordRange(60),{min:120,max:140});assert.deepEqual(wordRange(30),{min:60,max:70});
 const h=scriptHelp(pasted,60);
 assert.equal(h.words,forest.script.split(' ').length);assert.equal(h.sentences,14);assert.equal(h.lines,14);
 assert.equal(h.verdict,'ok');assert.deepEqual(h.notes,[]);assert.match(h.summary,/aim for 120–140 for 60 s/);assert.match(h.turns,/Student, Explorer/);
 assert.equal(scriptHelp(pasted,30).verdict,'long');assert.equal(scriptHelp('Hello there.',60).verdict,'short');
 assert.equal(scriptHelp('',60).verdict,'empty');assert.match(scriptHelp('',60).summary,/draft lines/);
 assert.match(scriptHelp('x '.repeat(80)+'end',60).notes.join(),/140 characters/);
 assert.match(scriptHelp('A '+'w'.repeat(33)+'.',60).notes.join(),/32 letters/);
 assert.match(scriptHelp('Read this\nAnd this.',60).notes.join(),/end with/);
 assert.match(scriptHelp('Look at https://x.org now.',60).notes.join(),/links/);
 assert.match(scriptHelp(pasted,60,'trio').turns,/Engineer → Robot → Scientist/);
 assert.equal(scriptHelp(pasted,'abc').range,null);
});
test('Director plans the form request offline: Student/Explorer turns alternate over the pasted lines',async()=>{
 const {project}=await direct(directorRequest(form({reels:true})));
 assert.equal(project.delivery,'reels-v1');
 const lines=project.shots.flatMap(s=>s.narration.map((t,i)=>[t,project.speech.shotSpeakers[s.id][i]]));
 assert.equal(lines.length,14);assert.equal(lines.map(x=>x[0]).join(' '),forest.script);
 lines.forEach(([,who],k)=>assert.equal(who,k%2===0?'host':'guest'));
 assert.deepEqual(Object.values(project.speech.speakers).map(s=>s.name),['Student','Explorer']);
 assert.ok(project.shots.every(s=>s.backend==='cpu'));
});
test('Studio API accepts the form request and the page uses the shared module; launcher sets the render env',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'studio01-'));const s=await createStudio({root:process.cwd(),dataDir:join(dir,'data'),runner:async()=>{throw Error('no render in tests');}});
 const origin=await s.listen(0);
 try{
  const post=q=>fetch(origin+'/api/direct',{method:'POST',headers:{'Content-Type':'application/json','X-Aether-Studio':'1'},body:JSON.stringify(q)});
  const ok=await post(directorRequest(form({backend:'three'})));assert.equal(ok.status,200);
  const {project}=await ok.json();assert.ok(project.shots.every(x=>x.backend==='three'));
  // The page module is served to the browser from /src/studio/.
  assert.equal((await fetch(origin+'/src/studio/director-form.js')).status,200);
  const bad=await post({...directorRequest(form()),dialogue:{speakers:[]}});assert.equal(bad.status,400);
 }finally{await s.close();await rm(dir,{recursive:true,force:true});}
 const html=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8');
 for(const id of ['directCast','directReels','scriptCount','scriptRules','scriptTurns'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<select id="directBackend"><option value="three">/);
 const cmd=readFileSync(new URL('../Start AetherMotion Studio.cmd',import.meta.url),'utf8');
 for(const re of [/AETHER_GL=vulkan/,/AETHER_CONCURRENCY=8/,/AETHER_FFMPEG=/,/AETHER_FFPROBE=/,/PYTHON=/,/npm run studio:local/,/127\.0\.0\.1:4173/])assert.match(cmd,re);
 assert.doesNotMatch(cmd,/setx|reg add|npm (i|install)/i);
});
