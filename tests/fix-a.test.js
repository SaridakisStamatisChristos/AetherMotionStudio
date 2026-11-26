// Fix A (owner: "do these: Fix A"): film length follows the measured speech (speech.fit 'speech-v1', at most the
// requested target; Director dialogue default) and silence-v1 finds long silences (a gate for fitted films).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {validateSpeechConfig,fitsTarget,SPEECH_FIT} from '../src/core/speech.js';
import {silenceCheck,SILENCE} from '../src/quality/silence.js';
import {directorRequest} from '../src/studio/director-form.js';
import {defaultSpeech} from '../src/studio/production.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
// Measured-style timeline: every shot 300 frames, each line 140000 samples (~2.9 s), lines 160000 samples apart.
function timeline(p,frames=p.shots.length*300){
 const t={version:1,fps:30,sampleRate:48000,durationFrames:frames,alignment:'estimated-word/measured-phrase',shots:[],captions:[]};
 for(const [i,s] of p.shots.entries()){const row={id:s.id,startFrame:i*300,endFrame:Math.min(frames,(i+1)*300),transitionFrames:s.transitionFrames,segments:[]};
  for(const [j,text] of s.narration.entries()){const a=i*480000+30000+j*160000,b=a+140000,speaker=p.speech.shotSpeakers[s.id]?.[j]??'default',sp=p.speech.speakers[speaker]??{voice:p.voice,language:p.voice.startsWith('b')?'en-gb':'en-us'};
   row.segments.push({text,startSample:a,endSample:b,speed:1,speaker,voice:sp.voice,language:sp.language});}
  t.shots.push(row);}
 t.captions=t.shots.flatMap(s=>s.segments).flatMap((g,k)=>{const w=g.text.split(' '),n=w.length,at=i=>g.startSample+Math.floor((g.endSample-g.startSample)*i/n);
  return w.map((x,i)=>({phrase:k,speaker:g.speaker,startSample:at(i),endSample:at(i+1),lines:[x],words:[{text:x,startSample:at(i),endSample:at(i+1)}]}));});
 return t;
}
const fitted=async()=>{const q=read('speech-cpu-polished.request');const p=(await direct(q)).project;return p;};

test('speech.fit contract: speech-v1, none or absent; fitted timelines may be shorter, never longer',async()=>{
 assert.deepEqual(SPEECH_FIT,['speech-v1','none']);
 const p=await fitted();assert.equal(p.speech.fit,undefined,'narrator Director film: no fit (unchanged)');
 for(const ok of ['speech-v1','none']){const x=structuredClone(p);x.speech.fit=ok;validateProject(x);}
 for(const bad of ['speech-v2','',true,null,1]){const x=structuredClone(p);x.speech.fit=bad;assert.throws(()=>validateProject(x),/speech.fit/,String(bad));}
 const full=p.shots.length*300;
 validateTimeline(p,timeline(p));
 assert.throws(()=>validateTimeline(p,timeline(p,full-60)),/speech target/,'no fit: exact target');
 const f=structuredClone(p);f.speech.fit='speech-v1';
 validateTimeline(f,timeline(f));validateTimeline(f,timeline(f,full-60));
 const none=structuredClone(p);none.speech.fit='none';assert.throws(()=>validateTimeline(none,timeline(none,full-60)),/speech target/);
 assert.ok(fitsTarget(f.speech,180)&&!fitsTarget(f.speech,179)&&!fitsTarget(f.speech,full+1)&&!fitsTarget(f.speech,200.5));
 assert.ok(fitsTarget(p.speech,full)&&!fitsTarget(p.speech,full-1));
});
test('Director dialogue films fit their speech by default; speech.fit none opts out',async()=>{
 for(const name of ['gen01-interview.request','gen12-forest-script.request']){const {project}=await direct(read(name));assert.equal(project.speech.fit,'speech-v1',name);}
 const q=read('gen12-forest-script.request');
 const out=(await direct({...q,speech:{...defaultSpeech(q.seconds),fit:'none'}})).project;assert.equal(out.speech.fit,'none');
 // The Studio form path (speech = defaultSpeech) gets the same default.
 const studio=directorRequest({id:'fit-test',topic:q.topic,script:q.script,seconds:60,cast:'interview',backend:'three',profile:'polished',voice:'af_heart',reels:false});
 studio.speech=defaultSpeech(60);assert.equal((await direct(studio)).project.speech.fit,'speech-v1');
 assert.throws(()=>validateSpeechConfig({...defaultSpeech(60),fit:'always'}),/speech.fit/);
});
test('silence-v1: long gaps, lead, tail and low talk share warn; fixed shots are authored; non-speech is not applicable',async()=>{
 const p=await fitted(),t=timeline(p);
 const ok=silenceCheck(p,t);assert.equal(ok.policy,SILENCE.version);assert.equal(ok.applicable,true);
 // Lines ~2.9 s apart by 0.4 s; shots 10 s long with ~2.9–5.8 s of talk: the gap after each shot's speech is long.
 assert.ok(ok.warnings.some(w=>w.code==='LONG_SILENCE'&&w.kind==='between'),'sparse film warns');
 assert.ok(ok.talkShare<.6&&!ok.warnings.some(w=>w.code==='LOW_TALK_SHARE'),'talk share is reported, not warned');
 // A dense timeline: every line follows the previous one by 0.5 s and the film ends 1 s after the last line.
 const dense=structuredClone(t);let at=24000;
 for(const s of dense.shots){for(const g of s.segments){g.startSample=at;g.endSample=at+140000;at+=164000;}}
 dense.durationFrames=Math.ceil((at+48000)/1600);let f0=0;for(const s of dense.shots){const last=s.segments.at(-1).endSample;s.startFrame=f0;s.endFrame=Math.ceil(last/1600)+5;f0=s.endFrame;}dense.shots.at(-1).endFrame=dense.durationFrames;
 assert.deepEqual(silenceCheck(p,dense).warnings,[]);
 // Lead and tail limits.
 const late=structuredClone(dense);for(const s of late.shots)for(const g of s.segments){g.startSample+=3*48000;g.endSample+=3*48000;}late.durationFrames+=90;late.shots.at(-1).endFrame=late.durationFrames;
 // The speech example fixes shot 1 (a title shot), so a late start there is authored; without fixed shots it warns.
 assert.ok(!silenceCheck(p,late).warnings.some(w=>w.kind==='lead'));
 const free=structuredClone(p);free.speech.fixedShots={};assert.ok(silenceCheck(free,late).warnings.some(w=>w.kind==='lead'&&w.seconds>SILENCE.maxLead));
 const longEnd=structuredClone(dense);longEnd.durationFrames+=150;longEnd.shots.at(-1).endFrame=longEnd.durationFrames;
 assert.ok(silenceCheck(p,longEnd).warnings.some(w=>w.kind==='tail'));
 // Fixed shots: silence there is authored (reported, not warned).
 const fixedP=structuredClone(p);fixedP.speech.fixedShots=Object.fromEntries(p.shots.map(s=>[s.id,300]));
 const r=silenceCheck(fixedP,t);assert.deepEqual(r.warnings.filter(w=>w.code==='LONG_SILENCE'&&w.kind==='between'),[]);assert.ok(r.gaps.some(g=>g.authored&&g.seconds>SILENCE.maxGap));
 // Non-speech projects and timelines without sample rate are not applicable; a speech film without phrases warns.
 assert.equal(silenceCheck({...p,speech:undefined},t).applicable,false);assert.equal(silenceCheck(p,{...t,sampleRate:undefined}).applicable,false);
 const mute=structuredClone(t);for(const s of mute.shots)s.segments=[];assert.equal(silenceCheck(p,mute).warnings[0].code,'NO_SPEECH');
});
test('produce wiring: silence-v1 is reported for every production and gates fitted films before rendering',()=>{
 const src=readFileSync(new URL('../scripts/produce.mjs',import.meta.url),'utf8');
 assert.match(src,/silence:silenceCheck\(p\.scene,timeline\)/);assert.match(src,/silence-v1 failed for a speech-fitted film/);
 assert.ok(src.indexOf('silence-v1 failed')<src.indexOf("manifest.status='rendering'"),'gate runs before any render');
 assert.match(src,/manifest\.requestedFrames=manifest\.targetFrames;manifest\.targetFrames=timeline\.durationFrames/);
 assert.match(src,/Exact target duration mismatch/,'films without fit keep the exact check');
});
