// GEN-05b readable captions (opt-in speech.captions.readable, on for every production through defaultSpeech). Owner:
// "the captions must be generalized in speed not only from the sample video". The timeline may hold a phrase's last
// caption into the following pause (holdSample, at most 1 s, never into the next caption), and single phrases may be
// spoken down to the 0.85 pace floor. Projects without the flag keep the historical contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {cueAt} from '../src/core/speech.js';
import {defaultSpeech} from '../src/studio/production.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const speechQ=read('speech-cpu-polished.request');
// Minimal measured-style timeline (as tests/gen05.test.js): one caption per word, every segment at the given speed.
function timeline(p,speed){
 const t={version:1,fps:30,sampleRate:48000,durationFrames:1800,alignment:'estimated-word/measured-phrase',shots:[],captions:[]};
 for(const [i,s] of p.shots.entries()){const row={id:s.id,startFrame:i*300,endFrame:(i+1)*300,transitionFrames:s.transitionFrames,segments:[]};
  for(const [j,text] of s.narration.entries()){const a=i*480000+30000+j*160000,b=a+140000,speaker=p.speech.shotSpeakers[s.id][j],sp=p.speech.speakers[speaker];
   row.segments.push({text,startSample:a,endSample:b,speed,speaker,voice:sp.voice,language:sp.language});}
  t.shots.push(row);}
 t.captions=t.shots.flatMap(s=>s.segments).flatMap((g,k)=>{const w=g.text.split(' '),n=w.length,at=i=>g.startSample+Math.floor((g.endSample-g.startSample)*i/n);
  return w.map((x,i)=>({phrase:k,speaker:g.speaker,startSample:at(i),endSample:at(i+1),lines:[x],words:[{text:x,startSample:at(i),endSample:at(i+1)}]}));});
 return t;
}
const project=async readable=>{const p=(await direct(structuredClone(speechQ))).project;if(readable)p.speech.captions.readable=true;else assert.equal(p.speech.captions.readable,undefined);return p;};
const lastOfPhrase=t=>t.captions.findIndex((c,k)=>t.captions[k+1]&&t.captions[k+1].phrase!==c.phrase);

test('captions.readable contract: on in defaultSpeech, true or absent; negatives',async()=>{
 assert.equal(defaultSpeech(60).captions.readable,true);
 const p=await project(true);validateProject(p);
 for(const bad of [false,1,'yes',null]){const x=structuredClone(p);x.speech.captions.readable=bad;assert.throws(()=>validateProject(x),/readable/,String(bad));}
});
test('holdSample: only with readable captions, after the speech, at most 1 s, never into the next caption',async()=>{
 const p=await project(true),plain=await project(false),t=timeline(p,1),k=lastOfPhrase(t),c=t.captions[k],next=t.captions[k+1];
 validateTimeline(p,t);
 const held=structuredClone(t);held.captions[k].holdSample=c.endSample+12000;validateTimeline(p,held);
 // shown during the hold, gone after it
 assert.equal(cueAt(held,Math.floor((c.endSample+6000)/1600)).cue,held.captions[k]);
 assert.equal(cueAt(t,Math.floor((c.endSample+6000)/1600)),null,'without a hold the pause shows nothing');
 const bad=(x,f,re)=>{const y=structuredClone(t);f(y.captions[k]);assert.throws(()=>validateTimeline(x,y),re);};
 bad(plain,x=>x.holdSample=c.endSample+12000,/readable/);
 bad(p,x=>x.holdSample=c.endSample,/hold/);
 bad(p,x=>x.holdSample=c.endSample+48001,/hold/);
 bad(p,x=>x.holdSample=next.startSample+1,/caption/);
});
test('phrase speeds: readable captions allow single phrases down to 0.85, never below; default bound unchanged',async()=>{
 const p=await project(true),plain=await project(false);
 validateTimeline(p,timeline(p,.85));validateTimeline(p,timeline(p,1.25));
 assert.throws(()=>validateTimeline(p,timeline(p,.84)),/speed out of range/);
 assert.throws(()=>validateTimeline(plain,timeline(plain,.92)),/speed out of range/,'historical bound 1 without readable or pace');
});
