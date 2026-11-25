// TALK-05 showcase "The Workshop — First Words": generator freshness, speech contract, staging and composition with
// listener turns applied (synthetic phrase bounds), motion opt-ins and the draft script.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,SCRIPT} from '../scripts/talk05-first-words.mjs';
import {validateProject} from '../src/core/timeline.js';
import {plannedTimeline} from '../src/studio/model.js';
import {dialogueShot} from '../src/core/dialogue.js';
import {inspectProject} from '../src/quality/preflight.js';
import {compositionGate,compositionReport} from '../src/quality/composition.js';
import {normalizedProject} from '../src/studio/production.js';
import {digest} from '../src/director/catalog.js';

const load=b=>JSON.parse(readFileSync(new URL('../examples/talk05-first-words-'+b+'-polished.json',import.meta.url),'utf8'));
test('talk05: examples are fresh generator output and an exact backend pair',()=>{
 for(const b of ['cpu','three'])assert.deepEqual(load(b),build(b));
 assert.equal(digest(normalizedProject(load('cpu'))),digest(normalizedProject(load('three'))));
});
test('talk05: speech project with three voices, lead placement, mix-v2 and a pronunciation fix',()=>{
 const p=validateProject(load('cpu')),c=p.speech;
 assert.equal(c.targetFrames,2250);assert.equal(c.placement,'lead');assert.equal(c.mix.master,'mix-v2');assert.deepEqual(c.fixedShots,{shelf:270});
 assert.deepEqual(Object.keys(c.speakers),['eng','sci','robo']);assert.equal(c.speakers.sci.language,'en-gb');
 assert.equal(c.pronunciations.Wrrrench,'rrr rench');
 assert.deepEqual(p.shots.map(s=>s.id),['morning','tools','shelf','table','mistake','thanks','lights']);
 for(const s of p.shots){assert.deepEqual(s.narration,SCRIPT[s.id].map(l=>l[1]));assert.deepEqual(c.shotSpeakers[s.id],SCRIPT[s.id].map(l=>l[0]));assert.ok(s.speakerAssets);}
 // Short lines keep captions readable: about 18 characters per second at ~2.5 words/second.
 for(const lines of Object.values(SCRIPT))for(const [,t] of lines)assert.ok(t.length<=36,t);
 assert.deepEqual(inspectProject(p).issues.filter(i=>i.severity!=='review'),[]);
});
test('talk05: composition gate passes with listener turns applied; calm defaults on every dialogue shot',()=>{
 const p=load('cpu'),t=plannedTimeline(p);
 for(const [i,s] of p.shots.entries()){const sh=t.shots[i],n=s.narration.length,a=sh.startFrame*1600,len=(sh.endFrame-sh.startFrame)*1600;
  sh.segments=s.narration.map((text,j)=>({text,startSample:Math.round(a+len*(.1+.8*j/n)),endSample:Math.round(a+len*(.1+.8*(j+.9)/n)),speaker:p.speech.shotSpeakers[s.id][j]}));
  const d=dialogueShot(s,sh);assert.deepEqual(compositionGate(d).warnings,[],s.id);
  for(const v of Object.values(compositionReport(d).characters))assert.equal(v.backToCameraSamples,0,s.id);
  if(s.dialogue){assert.deepEqual(s.dialogue,{listen:true,turn:.8,cheat:1});assert.deepEqual(s.bodyLanguage,{beats:true,nods:true,blinks:true,sway:true});}}
 assert.equal(p.shots.filter(s=>s.dialogue).length,5);
 const tools=p.shots[1].assets.find(a=>a.id==='robot');assert.equal(tools.aim.target,'toolbox');
 assert.equal(p.shots[2].assets.find(a=>a.id==='robot').params.reach,1.8,'high-shelf reach reused');
});
