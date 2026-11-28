// FIX-NR (owner 2026-11-28): Director films carry no lower-third caption box ("we dont need extra caption box at all"),
// and narrator shots frame every subject large (group over 2–4 subjects, single for one), as dialogue films do.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct,shotOverlays,narratorRig} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {validateProject} from '../src/core/timeline.js';
const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n,import.meta.url),'utf8'));
const plan=async(n,patch={})=>{const q=load(n);return (await direct({...q,...patch,speech:q.speech??defaultSpeech(q.seconds)})).project;};

test('shotOverlays drops lower-thirds only; narratorRig frames all subjects',()=>{
 assert.deepEqual(shotOverlays({overlay:{type:'lower-third',text:'x'}}),{});
 assert.deepEqual(shotOverlays({overlay:{type:'label',text:'x'}}),{overlays:[{type:'label',text:'x'}]});
 assert.deepEqual(shotOverlays({}),{});
 const a=k=>Array.from({length:k},(_,i)=>({id:'object-'+(i+1)}));
 assert.deepEqual(narratorRig('orbit',a(1)),{preset:'orbit',subject:'object-1',framing:'single',padding:.1});
 assert.deepEqual(narratorRig('crane',a(3)),{preset:'crane',framing:'group',subjects:['object-1','object-2','object-3'],padding:.1});
 assert.equal(narratorRig('pan',a(6)).subjects.length,4);
});

test('narrator film (laptop product): no lower-third on any shot; every shot frames all its subjects',async()=>{
 const p=await plan('gpu03-product.request.json');validateProject(p);
 assert.ok(p.shots.length>=3);
 for(const s of p.shots){
  assert.ok(!(s.overlays??[]).some(o=>o.type==='lower-third'),s.id+' has no caption box');
  const ids=s.assets.map(a=>a.id);
  if(ids.length>=2)assert.deepEqual(s.cameraRig.subjects,ids.slice(0,4),s.id);else assert.equal(s.cameraRig.framing,'single',s.id);
  assert.ok(['group','single'].includes(s.cameraRig.framing),s.id+' never the old medium/first-subject framing');}
});

test('every Director example plan is free of lower-third caption boxes',async()=>{
 for(const n of ['release.request.json','gpu03-portrait.request.json','gpu03-environment.request.json','dual09-narrator.request.json','dual09-dialogue.request.json']){
  const p=await plan(n);for(const s of p.shots)assert.ok(!(s.overlays??[]).some(o=>o.type==='lower-third'),n+' '+s.id);}
});
