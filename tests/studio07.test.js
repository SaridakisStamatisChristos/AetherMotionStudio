// DUAL-07 Studio integration: the form's content mode, format, look and sound choices; one speech rule for the CLI and
// the Studio; the music shortcut; read-only fonts, library pictures and the picture-library listing on the server.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {directorRequest,STUDIO_CONTENT,STUDIO_FORMATS} from '../src/studio/director-form.js';
import {requestSpeech,defaultSpeech} from '../src/studio/production.js';
import {request} from '../src/director/schema.js';
import {direct,withSoundOptions} from '../src/director/index.js';
import {createStudio} from '../scripts/studio-server.mjs';
import {encodePNG,quadrants} from '../scripts/media-fixtures.mjs';
import {addMedia} from '../scripts/media-import.mjs';
import {inspectImage} from '../src/core/media.js';
const SCRIPT='A forest breathes in the daytime. Leaves take in carbon dioxide. They give out oxygen. Roots hold the soil together. Rain soaks into the ground.';
const form=o=>({id:'film-test',topic:'How do forests clean the air?',script:SCRIPT,seconds:30,cast:'narrator',backend:'cpu',profile:'polished',voice:'am_michael',staging:false,reels:false,speakerNames:false,titles:false,...o});

test('1. form choices map to validated Director requests; defaults add nothing',()=>{
 const plain=directorRequest(form());for(const k of ['content','format','theme','font','captionStyle','soundtrack','music','visuals'])assert.equal(plain[k],undefined,k);
 const q=directorRequest(form({content:'typography-v1',format:'landscape-v1',theme:'paper-v1',font:'merriweather',captionStyle:'paper-v1',soundtrack:'silent',music:'off'}));
 assert.deepEqual([q.content,q.format,q.theme,q.font,q.captionStyle,q.soundtrack,q.music],['typography-v1','landscape-v1','paper-v1','merriweather','paper-v1','silent','off']);
 assert.equal(q.titles,undefined,'content modes keep the clean top without a titles field');
 assert.equal(q.speech.fit,'speech-v1');assert.equal(q.speech.mix.master,'mix-v2');
 request(q);// the server-side schema accepts it
 for(const c of Object.keys(STUDIO_CONTENT))for(const f of Object.keys(STUDIO_FORMATS)){if(c==='none'&&f!=='vertical-v1')continue;request(directorRequest(form({content:c,format:f})));}
});

test('2. impossible combinations are refused with the fix to make',()=>{
 const bad=(o,re)=>assert.throws(()=>directorRequest(form(o)),re);
 bad({cast:'interview',content:'explainer-v1'},/"Explainer \(no characters\)" cannot use a character cast: choose the cast "Narrator only \(no characters\)", or the content "Characters \+ visual aids"/);
 bad({cast:'trio',content:'typography-v1'},/"Typography \(no characters\)" cannot use a character cast/);
 bad({format:'landscape-v1'},/Landscape and square need a content mode/);
 bad({content:'explainer-v1',format:'square-v1',reels:true},/Instagram Reels is 9:16 only/);
 bad({theme:'contrast-v1'},/Theme and font style the visual aids: choose a content mode first/);
 bad({font:'inter'},/choose a content mode first/);
 bad({content:'mixed-v1',titles:true},/Titles on top cannot be combined with visual aids/);
 bad({visuals:'[]'},/Visuals need a content mode/);
 bad({content:'explainer-v1',script:'',visuals:'[]'},/Visuals attach to sentences of the script/);
 bad({content:'explainer-v1',visuals:'[{'},/Visuals: not valid JSON/);
 bad({content:'explainer-v1',visuals:'{"at":"x"}'},/a JSON list/);
 for(const [k,v] of [['content','cinema'],['format','4:3'],['theme','neon'],['captionStyle','x'],['soundtrack','mute'],['music','max'],['font','comic']])bad({content:'explainer-v1',[k]:v},/Unknown/);
 assert.deepEqual(directorRequest(form({content:'explainer-v1',visuals:'  '})).visuals,undefined,'an empty visuals box is ignored');
});

test('3. one speech rule for produce.mjs and the Studio (identical to the earlier CLI rule)',()=>{
 const quiet=s=>({...s,captions:{...s.captions,speakerNames:false}}),old=raw=>{const s=raw.dialogue?quiet(defaultSpeech(raw.seconds)):defaultSpeech(raw.seconds);return raw.content?{...s,fit:'speech-v1',mix:{...s.mix,master:'mix-v2'}}:s;};
 for(const raw of [{seconds:30},{seconds:45,dialogue:{}},{seconds:60,content:'explainer-v1'},{seconds:60,content:'mixed-v1',dialogue:{}}])assert.deepEqual(requestSpeech(raw),old(raw),JSON.stringify(raw));
 assert.equal(requestSpeech({seconds:30,dialogue:{}},{speakerNames:true}).captions.speakerNames,undefined);
 // the interview form keeps its earlier request exactly (names unticked → quiet speech; content none → no fit)
 const q=directorRequest(form({cast:'interview',speakerNames:false}));assert.equal(q.speech.captions.speakerNames,false);assert.equal(q.speech.fit,undefined);
});

test('4. music level shortcut: off, soft (unchanged), louder (1.5×, at most 1); refused without speech',async()=>{
 const sp=defaultSpeech(30);
 assert.equal(withSoundOptions({music:'off'},sp).mix.music,0);assert.equal(withSoundOptions({music:'louder'},sp).mix.music,Math.min(1,Math.round(sp.mix.music*1.5*1000)/1000));
 assert.equal(withSoundOptions({music:'soft'},sp).mix.music,sp.mix.music);assert.equal(withSoundOptions({music:'louder'},{...sp,mix:{...sp.mix,music:.9}}).mix.music,1);
 assert.throws(()=>withSoundOptions({music:'off'},undefined),/request.music: needs speech settings/);
 assert.throws(()=>request({...directorRequest(form({content:'explainer-v1'})),music:'max'}),/request.music: off, soft, louder or absent/);
 const r=await direct(directorRequest(form({content:'explainer-v1',music:'off',captionStyle:'contrast-v1'})));
 assert.equal(r.project.speech.mix.music,0);assert.equal(r.project.speech.captions.style,'contrast-v1');assert.equal(r.project.speech.fit,'speech-v1');
});

test('5. server: fonts and library pictures read-only by safe names; picture library listing; hostile paths refused',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio07-')),dataDir=join(root,'studio-data');await mkdir(join(root,'public','media'),{recursive:true});await mkdir(join(root,'public','fonts','inter'),{recursive:true});
 await writeFile(join(root,'public','fonts','inter','Inter-Regular.ttf'),'font bytes');await writeFile(join(root,'secret.txt'),'no');
 const src=join(root,'card.png');await writeFile(src,encodePNG(quadrants(8,6),8,6));
 await addMedia({file:src,id:'card-a',licence:'own-work',source:'tests/studio07.test.js',root,decode:()=>'stub',browser:async(b,f)=>{const i=inspectImage(new Uint8Array(b),f);return {width:i.displayWidth,height:i.displayHeight,agent:'stub'};}});
 const studio=await createStudio({root,dataDir,runner:async()=>{throw Error('no renders in this test');}}),origin=await studio.listen(0);
 try{
  const get=p=>fetch(origin+p);
  let r=await get('/fonts/inter/Inter-Regular.ttf');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'font/ttf');assert.equal(await r.text(),'font bytes');
  r=await get('/media/card-a.png');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.equal((await r.arrayBuffer()).byteLength,encodePNG(quadrants(8,6),8,6).length);
  r=await get('/api/media');const lib=await r.json();assert.deepEqual(lib.media.map(m=>[m.id,m.format,m.width,m.height,m.licence]),[['card-a','png',8,6,'own-work']]);
  for(const p of ['/media/../secret.txt','/media/%2e%2e/secret.txt','/media/card-a.gif','/media/nothere.png','/media/','/media/media.lock.json','/fonts/../secret.txt','/fonts/inter/../../secret.txt','/fonts/evil/x.ttf','/fonts/inter/x.otf','/public/media/card-a.png'])
   assert.equal((await get(p)).status,404,p);
 }finally{await studio.close();await rm(root,{recursive:true,force:true});}
});

test('6. the Claude-chat prompt names the chosen shape and asks for on-screen-friendly lines in content modes',async()=>{
 const {scriptPrompt}=await import('../src/studio/director-form.js');
 assert.equal(scriptPrompt({topic:'x',seconds:60,cast:'narrator'}),scriptPrompt({topic:'x',seconds:60,cast:'narrator',format:'vertical-v1',content:'none'}),'defaults = the earlier prompt');
 assert.match(scriptPrompt({topic:'x',seconds:60,cast:'narrator',format:'square-v1',content:'explainer-v1'}),/60-second square educational video[\s\S]*shown on screen/);
 assert.match(scriptPrompt({topic:'x',seconds:30,cast:'narrator',format:'landscape-v1'}),/landscape \(16:9\)/);
 assert.doesNotMatch(scriptPrompt({topic:'x',seconds:30,cast:'narrator'}),/shown on screen/);
 assert.throws(()=>scriptPrompt({format:'4:3'}),/Unknown format/);assert.throws(()=>scriptPrompt({content:'x'}),/Unknown content mode/);
});

test('7. length advice: content-mode films are fitted to their speech, so a short script gives a shorter film, not silences',async()=>{
 const {scriptHelp}=await import('../src/studio/director-form.js');
 const short=['A lighthouse stands where the sea is dangerous.','Its lamp turns once every ten seconds.','Sailors count the flashes.','The beam reaches twenty miles.'].join(String.fromCharCode(10));
 assert.match(scriptHelp(short,20,'narrator').summary,/long silences/,'classic narrator keeps the exact length');
 const fitted=scriptHelp(short,20,'narrator','typography-v1');assert.doesNotMatch(fitted.summary,/expect long silences/);assert.match(fitted.summary,/without long silences/);
 assert.equal(scriptHelp(short,20,'narrator','none').summary,scriptHelp(short,20,'narrator').summary,'default = earlier advice');
});
