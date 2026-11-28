// GPU-06 measured mouth shapes (opt-in speech.mouths 'rhubarb-v1', owner-approved Rhubarb Lip Sync): the same per-frame
// codes as the GEN-10 estimate, but versioned 'viseme-rhubarb-v1' with timing 'measured'; each mode accepts only its
// own timeline data; Director dialogue films opt in with dialogue.mouths. The estimate stays the default.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {request} from '../src/director/schema.js';
import {validateProject} from '../src/core/timeline.js';
import {validateSpeechConfig} from '../src/core/speech.js';
import {VISEMES,MOUTH_MODES,validateVisemes,usesVisemes,talkAt} from '../src/core/talk.js';
import {defaultSpeech} from '../src/studio/production.js';
import {estimatedTimeline} from '../src/quality/motion-check.js';
import {plannedTimeline} from '../src/studio/model.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const q0=read('talk04-dialogue.request');
const film=async mouths=>(await direct({...q0,speech:{...defaultSpeech(q0.seconds),mouths}})).project;
const timed=(p,mode,pattern)=>{const t=estimatedTimeline(p,plannedTimeline(p)),n=t.durationFrames,m=MOUTH_MODES[mode];
 return {...t,speechEnvelope:{version:1,unit:'permille-rms',values:Array(n).fill(800)},visemes:{version:m.version,phonemizer:'Rhubarb Lip Sync version 1.14.0',timing:m.timing,values:pattern.repeat(Math.ceil(n/pattern.length)).slice(0,n)}};};

test('mouth modes: estimate unchanged, rhubarb-v1 measured; speech.mouths accepts both and nothing else',async()=>{
 assert.deepEqual(MOUTH_MODES['visemes-v1'],{version:VISEMES.version,timing:'estimated'});
 assert.deepEqual(MOUTH_MODES['rhubarb-v1'],{version:'viseme-rhubarb-v1',timing:'measured'});
 assert.equal(defaultSpeech(60).mouths,'visemes-v1','the estimate stays the default');
 const p=await film('rhubarb-v1');validateProject(p);assert.equal(usesVisemes(p),true);
 for(const bad of ['rhubarb','rhubarb-v2','lip-sync',1])assert.throws(()=>validateSpeechConfig({...p.speech,mouths:bad}),/mouths/,String(bad));
});

test('timeline.visemes: each mode takes only its own version and timing',async()=>{
 const r=await film('rhubarb-v1'),e=await film('visemes-v1');
 validateVisemes(r,timed(r,'rhubarb-v1','XMAEOF'));validateVisemes(e,timed(e,'visemes-v1','XMAEOF'));
 assert.throws(()=>validateVisemes(r,timed(r,'visemes-v1','XA')),/unsupported version or timing/);
 assert.throws(()=>validateVisemes(e,timed(e,'rhubarb-v1','XA')),/unsupported version or timing/);
 const {visemes,...none}=timed(r,'rhubarb-v1','XA');assert.throws(()=>validateVisemes(r,none),/required when speech.mouths is rhubarb-v1/);
 const t=timed(r,'rhubarb-v1','XA');t.visemes.values=t.visemes.values.replace(/A/g,'D');assert.throws(()=>validateVisemes(r,t),/one code/);
});

test('measured shapes drive the mouth like the estimate: closures shut it, round shapes narrow it',async()=>{
 const p=await film('rhubarb-v1'),M=timed(p,'rhubarb-v1','M'),O=timed(p,'rhubarb-v1','O');
 const i=p.shots.findIndex(s=>s.speakerAssets),g=M.shots[i].segments[0],f=Math.floor((g.startSample+g.endSample)/2/1600);
 const shut=Object.values(talkAt(p,M,f,i)),round=Object.values(talkAt(p,O,f,i));
 assert.ok(shut.every(x=>x.mouth===0));assert.ok(round.some(x=>x.mouth>0&&x.width<1));
});

test('Director: dialogue.mouths rhubarb-v1 opts in; absent keeps the estimate; other values refused',async()=>{
 const on=await direct({...q0,dialogue:{...q0.dialogue,mouths:'rhubarb-v1'}}),off=await direct(q0);
 assert.equal(on.project.speech.mouths,'rhubarb-v1');assert.notEqual(off.project.speech.mouths,'rhubarb-v1');
 for(const bad of ['visemes-v1','yes',true])assert.throws(()=>request({...q0,dialogue:{...q0.dialogue,mouths:bad}}),/dialogue.mouths: rhubarb-v1 or absent/,String(bad));
});
