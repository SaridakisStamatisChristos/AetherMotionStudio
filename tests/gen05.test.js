// GEN-05 (owner: "speech a bit slower"): opt-in speech.pace (Kokoro start speed 0.85–1). Director dialogue and the
// TALK-05 showcase speak at 0.92; projects without pace keep the historical speed ladder and timeline bounds.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {validateSpeechConfig,SPEECH_PACE} from '../src/core/speech.js';
import {defaultSpeech} from '../src/studio/production.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const speechQ=read('speech-cpu-polished.request');
// Minimal measured-style timeline for a Director speech project, every segment at the given speed.
function timeline(p,speed){
 const t={version:1,fps:30,sampleRate:48000,durationFrames:1800,alignment:'estimated-word/measured-phrase',shots:[],captions:[]};let phrase=0;
 for(const [i,s] of p.shots.entries()){const row={id:s.id,startFrame:i*300,endFrame:(i+1)*300,transitionFrames:s.transitionFrames,segments:[]};
  for(const [j,text] of s.narration.entries()){const a=i*480000+30000+j*160000,b=a+140000,speaker=p.speech.shotSpeakers[s.id][j],sp=p.speech.speakers[speaker];
   row.segments.push({text,startSample:a,endSample:b,speed,speaker,voice:sp.voice,language:sp.language});
   t.captions.push({phrase:phrase++,speaker,startSample:a,endSample:b,lines:[text.split(' ').slice(0,3).join(' ')],words:[]});}
  t.shots.push(row);}

 // one caption per word, as in tests/speech.test.js
 t.captions=t.shots.flatMap(s=>s.segments).flatMap((g,k)=>{const w=g.text.split(' '),n=w.length,at=i=>g.startSample+Math.floor((g.endSample-g.startSample)*i/n);
  return w.map((x,i)=>({phrase:k,speaker:g.speaker,startSample:at(i),endSample:at(i+1),lines:[x],words:[{text:x,startSample:at(i),endSample:at(i+1)}]}));});
 return t;
}

test('speech.pace contract: optional, 0.85–1; negatives',async()=>{
 assert.equal(SPEECH_PACE.dialogue,.92);
 const p=(await direct(speechQ)).project;assert.equal(p.speech.pace,undefined,'default project has no pace');
 for(const ok of [.85,.92,1]){const x=structuredClone(p);x.speech.pace=ok;validateProject(x);}
 for(const bad of [.84,1.01,'0.9',null,Number.NaN]){const x=structuredClone(p);x.speech.pace=bad;assert.throws(()=>validateProject(x),String(bad));}
 assert.throws(()=>validateSpeechConfig({...p.speech,pace:2}));
});
test('timeline speeds: below 1 only when the project asks for that pace',async()=>{
 const p=(await direct(speechQ)).project;
 validateTimeline(p,timeline(p,1));
 assert.throws(()=>validateTimeline(p,timeline(p,.92)),/speed out of range/,'no pace: historical bound 1');
 const slow=structuredClone(p);slow.speech.pace=.92;validateTimeline(slow,timeline(slow,.92));validateTimeline(slow,timeline(slow,1.08));
 assert.throws(()=>validateTimeline(slow,timeline(slow,.9)),/speed out of range/,'never slower than the pace');
});
test('Director dialogue speaks at 0.92 by default; dialogue.pace 1 restores TALK-04 speed; invalid pace rejected',async()=>{
 const q=read('talk04-dialogue.request'),r={...q,speech:defaultSpeech(q.seconds)};
 const a=(await direct(r)).project;assert.equal(a.speech.pace,.92);
 const one=(await direct({...r,dialogue:{...r.dialogue,pace:1}})).project;assert.equal(one.speech.pace,undefined);
 const x=structuredClone(a);delete x.speech.pace;assert.deepEqual(x,one,'only the pace differs');
 assert.equal((await direct({...r,dialogue:{...r.dialogue,pace:.88}})).project.speech.pace,.88);
 for(const bad of [.5,1.2,'slow'])await assert.rejects(direct({...r,dialogue:{...r.dialogue,pace:bad}}),/pace/,String(bad));
 assert.equal((await direct(speechQ)).project.speech.pace,undefined,'non-dialogue Director unchanged');
});
test('TALK-05 showcase uses the dialogue pace',()=>{
 for(const b of ['cpu','three'])assert.equal(read('talk05-first-words-'+b+'-polished').speech.pace,SPEECH_PACE.dialogue);
});
