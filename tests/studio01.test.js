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
 // Owner 2026-11-26 "No titles at all": the form always says titles (unticked "Titles on top" = none).
 assert.deepEqual(request(q),request({...forest,id:'film-test',titles:'none'}));
 assert.deepEqual(q.dialogue,interview.dialogue);
 assert.equal(q.staging,undefined);assert.equal(q.delivery,undefined);
 // Defaults the form starts with: interview cast, Three, polished, 60 s, Reels off.
 // speakerNames: the owner's checkbox "Speaker names in captions"; titles: "Titles on top". Both off by default since the
 // owner's 2026-11-26 choice (roles "Off by default", titles "No titles at all").
 assert.deepEqual(STUDIO_DEFAULTS,{cast:'interview',backend:'three',profile:'polished',seconds:60,reels:false,speakerNames:false,titles:false});
 assert.equal(directorRequest(form({titles:true})).titles,'shots');assert.throws(()=>directorRequest(form({titles:'yes'})),/Titles must be on or off/);
 assert.equal(directorRequest(form({backend:'three'})).backend,'three');
});
test('Reels checkbox, trio cast and narrator keep their contracts',()=>{
 assert.equal(request(directorRequest(form({reels:true}))).delivery,'reels-v1');
 // The TALK-04 cast the form offered before STUDIO-01 is unchanged (no style: round-robin turns).
 const trio=directorRequest(form({cast:'trio'}));
 assert.deepEqual(trio.dialogue,{speakers:[{id:'eng',name:'Engineer',voice:'af_heart',language:'en-us',character:'engineer'},{id:'robo',name:'Robot',voice:'am_michael',language:'en-us',character:'service-robot'},{id:'sci',name:'Scientist',voice:'bf_emma',language:'en-gb',character:'scientist'}]});
 request(trio);
 const n=directorRequest(form({cast:'narrator',script:''}));
 assert.deepEqual(n,{version:1,id:'film-test',topic:forest.topic,seconds:60,backend:'cpu',profile:'polished',voice:'af_heart',staging:'art-v1',titles:'none'});request(n);
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
 // 136 words in 60 s fits, but forest-script-r1/fixa-script-r1 did not keep the calm pace there: 'tight', with choices
 assert.equal(h.verdict,'tight');assert.deepEqual(h.notes,[]);assert.match(h.summary,/aim for 120–140 for 60 s/);
 assert.equal(scriptHelp(pasted,65).verdict,'ok');assert.match(h.turns,/Student, Explorer/);
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
 for(const id of ['directCast','directReels','scriptCount','scriptRules','scriptTurns','promptHelp','scriptPrompt','copyPrompt','cleanScript'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<select id="directBackend"><option value="three">/);
 const cmd=readFileSync(new URL('../Start-AetherMotion-Studio.cmd',import.meta.url),'utf8');
 for(const re of [/AETHER_GL=vulkan/,/AETHER_CONCURRENCY=8/,/AETHER_FFMPEG=/,/AETHER_FFPROBE=/,/PYTHON=/,/npm run studio:local/,/127\.0\.0\.1:4173/])assert.match(cmd,re);
 assert.doesNotMatch(cmd,/setx|reg add|npm (i|install)/i);
});
test('prompt guidance: the Claude-chat prompt follows the topic, seconds and cast',async()=>{
 const {scriptPrompt,lineRange}=await import('../src/studio/director-form.js');
 const p=scriptPrompt({topic:'How do forests clean the air?',seconds:60,cast:'interview'});
 for(const re of [/60-second vertical/,/curious Student and an expert Explorer robot/,/Topic: How do forests clean the air\?/,/line 1 Student, line 2 Explorer/,/14–16 lines, 120–140 words/,/no speaker names/,/starting with "Topic:"/])assert.match(p,re);
 assert.deepEqual(lineRange(60),{min:14,max:16});assert.deepEqual(lineRange(30),{min:7,max:8});
 assert.match(scriptPrompt({seconds:30}),/Topic: <YOUR TOPIC>[\s\S]*60–70 words/);
 assert.match(scriptPrompt({topic:'x',seconds:60,cast:'trio'}),/Engineer, line 2 Robot, line 3 Scientist/);
 assert.match(scriptPrompt({topic:'x',seconds:60,cast:'narrator'}),/single narrator/);
 assert.throws(()=>scriptPrompt({cast:'pirates'}),/Unknown cast/);assert.throws(()=>scriptPrompt({seconds:2}),/6 to 300/);
});
test('clean up a pasted chat answer: names, numbering, markdown and topic line',async()=>{
 const {cleanScript}=await import('../src/studio/director-form.js');
 const pastedChat=['**Topic:** "How do forests clean the air?"','','## Script','1. **Student:** How do forests clean the air?','2. Explorer (robot): Trees take in carbon dioxide through tiny pores.','- Student: And then?','“Sunlight turns that carbon into sugar and wood.”','---','```'].join('\n');
 const r=cleanScript(pastedChat);
 assert.equal(r.topic,'How do forests clean the air?');assert.equal(r.lines,4);
 assert.equal(r.script,['How do forests clean the air?','Trees take in carbon dioxide through tiny pores.','And then?','Sunlight turns that carbon into sugar and wood.'].join('\n'));
 // An already clean script is unchanged; ordinary sentences with colons or numbers keep their text.
 assert.equal(cleanScript(pasted).script,pasted);
 assert.equal(cleanScript('Ratio: two to one is common.\n2 trees are better than one.').script,'Ratio: two to one is common.\n2 trees are better than one.');
 assert.deepEqual(cleanScript(''),{script:'',topic:null,lines:0});assert.throws(()=>cleanScript(null),/Script text required/);
 // The cleaned answer passes the Director schema as a script.
 request(directorRequest(form({script:r.script})));
});
test('Studio UI refinement (owner: "Simple \'Make a film\' view"): simple by default, full editor behind Advanced',()=>{
 const html=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8'),js=readFileSync(new URL('../studio/app.js',import.meta.url),'utf8'),css=readFileSync(new URL('../studio/style.css',import.meta.url),'utf8');
 assert.match(html,/<body class="simple">/);assert.match(html,/<button id="mode" type="button" aria-pressed="false"[^>]*>Advanced<\/button>/);
 assert.match(css,/body\.simple \.adv\{display:none!important\}/);
 // The film path stays visible: the form, the prompt box, the script, Reels, the preview and the production result.
 const simpleIds=['topic','directCast','seconds','directBackend','promptHelp','copyPrompt','script','cleanScript','scriptCount','directReels','canvas','jobState','logs','downloads','film'];
 const advanced=new Set();for(const m of html.matchAll(/<(\w+)[^>]*class="[^"]*\badv\b[^"]*"[^>]*>/g))advanced.add(m.index);
 for(const id of simpleIds){const at=html.indexOf('id="'+id+'"');assert.ok(at>0,id);
  // no advanced-only element encloses it: count unclosed adv wrappers before it (all adv wrappers here are divs, sections, asides or leaf elements)
  const before=html.slice(0,at);const openAdv=[...before.matchAll(/<(div|section|aside)[^>]*class="[^"]*\badv\b[^"]*"[^>]*>/g)].filter(m=>{const rest=html.slice(m.index);let depth=0;const re=new RegExp('<(/?)'+m[1]+'\\b[^>]*>','g');let x;while((x=re.exec(rest))){depth+=x[1]?-1:1;if(depth===0)return m.index+x.index>at;}return true;});
  assert.equal(openAdv.length,0,id+' must stay visible in the simple view');}
 // The full editor is advanced-only.
 for(const marker of ['<aside class="panel inspector adv">','<section class="timeline adv">','<div class="adv"><h2>Workspace</h2>','<div class="adv"><hr><h2>Asset library','<select id="jobs" class="adv"'])assert.ok(html.includes(marker),marker);
 // The first submit button (Enter key) renders the film; "Generate project only" is advanced.
 const submits=[...html.matchAll(/<button[^>]*type="submit"[^>]*>/g)].map(m=>m[0]);assert.match(submits[0],/data-produce="true"/);assert.match(submits[1],/class="adv"/);
 assert.equal((html.match(/class="[^"]*narrator-only/g)??[]).length,2);
 // label {display:grid} beats the hidden attribute, so the CSS must hide hidden narrator-only fields explicitly
 // (the click-through screenshot showed "Narrator voice" with the interview cast).
 assert.ok(css.includes('.narrator-only[hidden]{display:none!important}'));
 assert.match(js,/function setMode\(advanced\)/);assert.match(js,/setMode\(false\)/);assert.match(js,/\.narrator-only'\)\)el\.hidden=!narrator/);
});
test('owner\'s first Studio film: pasted extras are flagged, never spoken; length advice follows Fix A',async()=>{
 const {scriptHelp,cleanScript,directorRequest}=await import('../src/studio/director-form.js');
 // The bees answer started with Claude's Topic line; spoken, it made the Student explain and the Explorer ask.
 const pastedChat='Topic: How do bees make honey?\nExplorer, how do bees make honey?\nIt all starts with nectar, a sweet, watery juice made by flowers.';
 const h=scriptHelp(pastedChat,60);assert.match(h.notes.join(),/Topic line/);assert.equal(h.words,cleanScript(pastedChat).script.split(/\s+/).length,'counts what will be spoken');
 assert.deepEqual(scriptHelp(pasted,60).notes,[],'a clean script has no notes');
 // the page cleans before planning, so the request never contains the Topic line
 const js=readFileSync(new URL('../studio/app.js',import.meta.url),'utf8');assert.match(js,/onsubmit=action\(async e=>\{autoClean\(\);/);
 const c=cleanScript(pastedChat);const q=directorRequest(form({topic:'',script:c.script,...(c.topic?{topic:c.topic}:{})}));assert.doesNotMatch(q.script,/Topic:/);assert.equal(q.topic,'How do bees make honey?');
 // Length advice: dialogue films follow the speech (Fix A); narrator films keep the exact length.
 const long=Array.from({length:16},(_,i)=>'Line number '+i+' has a few more words here.').join('\n');
 // Owner: "give a list of advice … so whoever uses it could be able to choose". 144 words: over 140 → long.
 const d=scriptHelp(long,60,'interview');assert.equal(d.verdict,'long');assert.equal(d.suggestedSeconds,67);assert.match(d.summary,/Too long for 60 s at the calm pace\. Choose below/);
 assert.deepEqual(d.choices.map(c=>[c.id,c.label]),[['seconds','Use 67 s'],['keep','Keep 60 s'],['shorten','Shorten']]);
 assert.equal(d.choices[0].seconds,67);assert.match(d.choices[0].detail,/runs only as long as the speech needs/);assert.match(d.choices[2].detail,/question and its answer together/);assert.equal(d.choices[2].hint,true);
 assert.match(scriptHelp(long,60,'trio').choices[0].label,/Use 67 s/);
 const n=scriptHelp(long,60,'narrator');assert.deepEqual(n.choices.map(c=>c.id),['seconds','keep','shorten']);assert.doesNotMatch(n.choices[2].detail,/question/);
 // tight: fits the range, a little fast → two choices; calm: no choices
 const tight=scriptHelp(long,65);assert.equal(tight.verdict,'tight');assert.deepEqual(tight.choices.map(c=>c.label),['Use 67 s','Keep 65 s']);assert.match(tight.choices[1].detail,/a little faster/);
 const calm=scriptHelp(long,67);assert.equal(calm.verdict,'ok');assert.deepEqual(calm.choices,[]);assert.match(calm.summary,/Good length, calm pace/);
 // short: dialogue films follow the speech (no choice needed); narrator films get choices
 const sd=scriptHelp('Hello there. How are you today?',60);assert.match(sd.summary,/the film will be about 6 s/);assert.deepEqual(sd.choices,[]);
 const sn=scriptHelp('Hello there. How are you today?',60,'narrator');assert.match(sn.summary,/long silences/);assert.deepEqual(sn.choices.map(c=>c.label),['Use 6 s','Keep 60 s']);
 assert.equal(scriptHelp(Array(800).fill('word').join(' ')+'.',60).suggestedSeconds,300,'never above 300 s');
 assert.equal(scriptHelp(pasted,65).suggestedSeconds,null);assert.deepEqual(scriptHelp('',60).choices,[]);
 // the page renders the choices and applies "Use N s" to Seconds
 const page=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8');assert.match(page,/<div id="lengthChoices"/);
 assert.match(js,/function lengthChoices\(h\)/);assert.match(js,/if\(c\.id==='seconds'\)\{\$\('seconds'\)\.value=String\(c\.seconds\)/);
});
test('owner\'s checkbox "Speaker names in captions": off by default (owner 2026-11-26); off removes names from video captions and subtitle files',async()=>{
 const {directorRequest,STUDIO_DEFAULTS}=await import('../src/studio/director-form.js');
 const {validateSpeechConfig}=await import('../src/core/speech.js');
 assert.equal(STUDIO_DEFAULTS.speakerNames,false);
 const on=directorRequest(form({speakerNames:true}));assert.equal(on.speech,undefined,'default: unchanged request');
 const off=directorRequest(form({speakerNames:false}));assert.equal(off.speech.captions.speakerNames,false);request(off);
 assert.equal(directorRequest(form({cast:'narrator',speakerNames:false})).speech,undefined,'narrator: one speaker, nothing to hide');
 assert.throws(()=>directorRequest(form({speakerNames:'no'})),/Speaker names must be on or off/);
 const sp=(await import('../src/studio/production.js')).defaultSpeech(60);
 for(const bad of [true,'false',0])assert.throws(()=>validateSpeechConfig({...sp,captions:{...sp.captions,speakerNames:bad}}),/speakerNames/,String(bad));
 // the Director keeps the setting in the dialogue speech it builds
 const {project}=await direct(off);assert.equal(project.speech.captions.speakerNames,false);assert.equal(Object.keys(project.speech.speakers).length,2);
 // the page: checkbox ticked by default, wired into the form, and the render keeps the request's speech
 const html=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8'),js=readFileSync(new URL('../studio/app.js',import.meta.url),'utf8');
 assert.match(html,/<input id="directNames" type="checkbox"> Speaker names in captions/);assert.match(html,/<input id="directTitles" type="checkbox"> Titles on top/);
 assert.match(js,/speakerNames:\$\('directNames'\)\.checked/);assert.match(js,/if\(produce\)q\.speech\?\?=defaultSpeech\(q\.seconds\)/);
 // the burned-in caption: no name when off
 const draw=readFileSync(new URL('../src/core/draw-film.js',import.meta.url),'utf8');assert.match(draw,/speech\.captions\?\.speakerNames!==false&&/);
});
test('finished film panel (owner: "add the finished film with download button"): plain summary and page wiring',async()=>{
 const {finishedSummary}=await import('../src/studio/finished.js');
 const probe={streams:[{codec_type:'video',width:1080,height:1920}],format:{duration:'60.0'}};
 const q=(status,errors,warnings,issues)=>({status,errors,warnings,issues,video:{frames:1800}});
 assert.deepEqual(finishedSummary(q('pass-with-findings',0,0,12),probe),{seconds:60,ok:true,text:'60.0 s · 1080×1920 (vertical) · checks passed (12 review notes)'});
 assert.equal(finishedSummary(q('pass',0,0,[]),probe).text,'60.0 s · 1080×1920 (vertical) · checks passed');
 assert.equal(finishedSummary(q('pass-with-findings',0,1,1),probe).text,'60.0 s · 1080×1920 (vertical) · checks passed with 1 warning (1 review note)');
 const bad=finishedSummary(q('fail',2,3,0),probe);assert.equal(bad.ok,false);assert.match(bad.text,/checks failed: 2 errors, 3 warnings/);
 assert.equal(finishedSummary(null,probe).text,'60.0 s · 1080×1920 (vertical) · no quality audit','no audit: length from probe');
 assert.deepEqual(finishedSummary(null,null),{seconds:null,ok:null,text:'no quality audit'});
 const html=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8'),js=readFileSync(new URL('../studio/app.js',import.meta.url),'utf8');
 assert.match(html,/<div id="finished" class="finished" hidden><h2>Your film is ready<\/h2><video id="film" controls playsinline><\/video>/);
 assert.match(html,/<a id="downloadFilm" class="button primary" download>Download film \(MP4\)<\/a>/);
 assert.match(html,/<details id="logBox" class="fold"><summary>Render log<\/summary><pre id="logs"/);assert.match(html,/<details id="filesBox" class="fold"><summary>All files<\/summary><div id="downloads"/);
 assert.match(js,/\$\('downloadFilm'\)\.href=base\+'film\.mp4\?download=1'/);assert.match(js,/finishedSummary\(q,p\)\.text/);assert.match(js,/\$\('finished'\)\.hidden=true/);
});
test('finished film downloads are named after the film; the draft preview hides once the film is ready',async()=>{
 const {downloadName}=await import('../scripts/studio-server.mjs');
 assert.equal(downloadName('film-mwxguti4','film.mp4'),'film-mwxguti4.mp4');
 assert.equal(downloadName('film-mwxguti4','captions.srt'),'film-mwxguti4.srt');
 assert.equal(downloadName('film-mwxguti4','captions.vtt'),'film-mwxguti4.vtt');
 assert.equal(downloadName('film-mwxguti4','quality-report.json'),'film-mwxguti4-quality-report.json');
 const server=readFileSync(new URL('../scripts/studio-server.mjs',import.meta.url),'utf8');
 assert.match(server,/download:u\.searchParams\.get\('download'\)==='1'&&downloadName\(j\.projectId,match\[2\]\)/);
 const css=readFileSync(new URL('../studio/style.css',import.meta.url),'utf8'),js=readFileSync(new URL('../studio/app.js',import.meta.url),'utf8');
 assert.ok(css.includes('body.simple.has-film .screen,body.simple.has-film .transport,body.simple.has-film #previewLabel{display:none}'));
 assert.match(js,/document\.body\.classList\.add\('has-film'\)/);assert.match(js,/document\.body\.classList\.remove\('has-film'\)/);
});
