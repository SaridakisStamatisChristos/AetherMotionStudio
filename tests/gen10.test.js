// GEN-10 estimated mouth shapes (opt-in speech.mouths 'visemes-v1', on for every production through defaultSpeech):
// timeline.visemes holds one shape code per frame (estimated timing, scripts/visemes.py); loudness still opens the
// mouth, the shape scales it (closures shut it) and sets its width. Without the opt-in nothing changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {validateProject} from '../src/core/timeline.js';
import {validateSpeechConfig} from '../src/core/speech.js';
import {VISEMES,validateVisemes,usesVisemes,talkAt,visemeAt,applyTalk} from '../src/core/talk.js';
import {defaultSpeech} from '../src/studio/production.js';
import {estimatedTimeline} from '../src/quality/motion-check.js';
import {plannedTimeline} from '../src/studio/model.js';
import {emitAsset} from '../src/visual/assets.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
// GPU-06 made measured mouths (rhubarb-v1) the default; these tests select the GEN-10 estimate explicitly.
const dialogue=async()=>{const q=read('talk04-dialogue.request'),s={...defaultSpeech(q.seconds),mouths:'visemes-v1'};return (await direct({...q,speech:s})).project;};
// estimated timeline with a flat envelope and a given viseme string pattern
const timed=(p,pattern)=>{const t=estimatedTimeline(p,plannedTimeline(p)),n=t.durationFrames;
 return {...t,speechEnvelope:{version:1,unit:'permille-rms',values:Array(n).fill(800)},visemes:{version:VISEMES.version,phonemizer:'test',timing:'estimated',values:pattern.repeat(Math.ceil(n/pattern.length)).slice(0,n)}};};
const speakingFrame=(p,t)=>{for(const [i,s] of t.shots.entries()){const g=s.segments[0];if(g&&p.shots[i].speakerAssets)return {index:i,frame:Math.floor((g.startSample+g.endSample)/2/1600),speaker:g.speaker};}};

test('speech.mouths contract: on in defaultSpeech, visemes-v1 or absent; negatives',async()=>{
 assert.equal(defaultSpeech(60).mouths,'rhubarb-v1'); // GPU-06 default (owner 2026-11-28); the estimate stays selectable
 const p=await dialogue();validateProject(p);assert.equal(usesVisemes(p),true);
 for(const bad of ['visemes',true,1,null,'lip-sync']){const x=structuredClone(p);x.speech.mouths=bad;assert.throws(()=>validateProject(x),/mouths/,String(bad));}
 const x=structuredClone(p);delete x.speech.mouths;validateSpeechConfig(x.speech);assert.equal(usesVisemes(x),false);
});
test('timeline.visemes: required with the opt-in and bound speakers, forbidden without; negatives',async()=>{
 const p=await dialogue(),t=timed(p,'XAAEEOOM');validateVisemes(p,t);
 const {visemes,...none}=t;assert.throws(()=>validateVisemes(p,none),/required/);
 const plain=structuredClone(p);delete plain.speech.mouths;assert.throws(()=>validateVisemes(plain,t),/visemes-v1/);validateVisemes(plain,none);
 const bad=(f,re)=>{const y=structuredClone(t);f(y.visemes);assert.throws(()=>validateVisemes(p,y),re);};
 bad(v=>v.values=v.values.slice(1),/per frame/);bad(v=>v.values='Z'+v.values.slice(1),/per frame/);
 bad(v=>v.timing='aligned',/timing/);bad(v=>v.version='viseme-v2',/version/);bad(v=>v.extra=1,/unknown/);bad(v=>v.phonemizer='',/phonemizer/);
});
test('talkAt: shape scales the loudness and sets the width; closures shut; listeners rest; default numbers unchanged',async()=>{
 const p=await dialogue(),open=timed(p,'A'),round=timed(p,'O'),closed=timed(p,'M'),{index,frame}=speakingFrame(p,open);
 const ids=Object.values(p.shots[index].speakerAssets),a=talkAt(p,open,frame,index),o=talkAt(p,round,frame,index),m=talkAt(p,closed,frame,index);
 const speaking=ids.find(id=>a[id].mouth>0);assert.ok(speaking,'one bound speaker speaks');
 assert.equal(a[speaking].width,1);assert.equal(o[speaking].width,.62);assert.ok(o[speaking].mouth<a[speaking].mouth&&o[speaking].mouth>0);
 assert.equal(m[speaking].mouth,0,'m/b/p close the lips although the sound is loud');
 for(const id of ids)if(id!==speaking)assert.deepEqual(a[id],{mouth:0,width:1});
 // smoothing: an open frame next to round frames is blended, a closure is held
 const mix=timed(p,'O'),v=mix.visemes.values.split('');v[frame]='A';mix.visemes.values=v.join('');assert.equal(visemeAt(mix,frame).width,(.62*2+2)/4);
 // without the opt-in the TALK-01 numbers come back unchanged
 const plain=structuredClone(p);delete plain.speech.mouths;const n=talkAt(plain,open,frame,index);assert.equal(typeof n[speaking],'number');assert.equal(n[speaking],a[speaking].mouth);
 const st={assets:[{id:speaking,pose:{}}]};applyTalk(st,o);assert.deepEqual(st.assets[0].pose,{mouth:o[speaking].mouth,mouthWidth:.62});
 const st2={assets:[{id:speaking,pose:{}}]};applyTalk(st2,n);assert.deepEqual(st2.assets[0].pose,{mouth:n[speaking]});
});
test('geometry: mouthWidth narrows or widens only the mouth; absent = unchanged boxes',()=>{
 for(const id of ['scientist','explorer-robot']){
  const boxes=pose=>{const out=[];emitAsset(id,(c,sz,col)=>out.push(JSON.stringify([c,sz,col])),{origin:[0,0,0],yaw:0,params:{detail:2},...pose});return out;};
  const base=boxes({mouth:.5}),same=boxes({mouth:.5,mouthWidth:undefined}),round=boxes({mouth:.5,mouthWidth:.62}),wide=boxes({mouth:.5,mouthWidth:1.25});
  assert.deepEqual(same,base,id);assert.equal(round.length,base.length);
  const diff=round.filter((b,i)=>b!==base[i]).length;assert.ok(diff>=1&&diff<=2,id+' only the mouth boxes change ('+diff+')');
  assert.notDeepEqual(wide,round);
 }
});
