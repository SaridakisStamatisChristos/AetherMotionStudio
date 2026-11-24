import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {cueAt,speechDrivenShot,validateSpeechConfig,VOICE_METADATA} from '../src/core/speech.js';
const q=JSON.parse(readFileSync(new URL('../examples/speech-cpu-polished.request.json',import.meta.url)));
test('mixed duration Director request preserves script and backend pair',async()=>{
 const a=await direct(q),b=await direct({...q,id:'other',backend:'three'});
 assert.equal(a.project.shots.length,6);assert.equal(a.project.shots[0].durationFrames,300);assert.ok(a.project.shots.slice(1).every(s=>s.durationFrames===null));
 assert.equal(a.project.shots.flatMap(s=>s.narration).join(' '),q.script);assert.equal(a.manifest.plannedFrames,null);
 b.project.id=a.project.id;b.project.shots.forEach(s=>s.backend='cpu');assert.deepEqual(a.project,b.project);
 assert.equal(VOICE_METADATA.length,9);
 for(const mutate of [p=>p.speech.fixedShots['shot-9']=60,p=>p.speech.speakers.guide.language='en-gb',p=>p.speech.cues[0].type='download',p=>p.speech.shotSpeakers['shot-1']=['unknown'],p=>p.speech.mix.narration=0,p=>p.speech.captions.maxLines=4]){
  const p=structuredClone(a.project);mutate(p);assert.throws(()=>validateProject(p));
 }
});
test('sample-clock caption validation and rendering lookup',async()=>{
 const p=(await direct(q)).project;
 const t={version:1,fps:30,sampleRate:48000,durationFrames:1800,alignment:'estimated-word/measured-phrase',shots:[],captions:[]};
 let phrase=0;
 for(const [i,s] of p.shots.entries()){
  const row={id:s.id,startFrame:i*300,endFrame:(i+1)*300,transitionFrames:s.transitionFrames,segments:[]};
  for(const [j,text] of s.narration.entries()){
   const startSample=i*480000+30000+j*160000,endSample=startSample+140000,speaker=p.speech.shotSpeakers[s.id][j],sp=p.speech.speakers[speaker],tokens=text.split(' ');
   row.segments.push({text,startSample,endSample,speed:1,speaker,voice:sp.voice,language:sp.language});
   let a=startSample;
   for(const [k,w] of tokens.entries()){
    const b=startSample+Math.floor((endSample-startSample)*(k+1)/tokens.length);
    t.captions.push({phrase,speaker,startSample:a,endSample:b,lines:[w],words:[{text:w,startSample:a,endSample:b}]});a=b;
   }
   phrase++;
  }
  t.shots.push(row);
 }
 validateTimeline(p,t);assert.ok(cueAt(t,20));assert.equal(cueAt(t,0),null);
 const s=speechDrivenShot(p.shots[0],t.shots[0],p.speech);assert.ok(s.assets[0].actions[0].start>p.shots[0].assets[0].actions[0].start);
 for(const mutate of [t=>t.alignment='forced',t=>t.captions[0].words[0].text='altered',t=>t.captions[0].startSample++,t=>t.captions.pop(),t=>t.shots[0].segments[0].voice='am_adam']){
  const b=structuredClone(t);mutate(b);assert.throws(()=>validateTimeline(p,b));
 }
});
