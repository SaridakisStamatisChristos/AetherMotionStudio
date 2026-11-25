// GEN-02: group framing for vertical (9:16) social video — characters fill the safe area between heading and captions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {GROUP_FRAMING} from '../src/core/cinematography.js';
import {dialogueShot} from '../src/core/dialogue.js';
import {compositionReport,compositionGate} from '../src/quality/composition.js';
import {estimatedTimeline,visibilityCheck,motionCheck} from '../src/quality/motion-check.js';
import {plannedTimeline} from '../src/studio/model.js';
import {inspectProject} from '../src/quality/preflight.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const project=async n=>{const r=read(n+'.request');return (await direct({...r,speech:defaultSpeech(r.seconds)})).project;};
const speakerHeight=p=>{const t=estimatedTimeline(p,plannedTimeline(p)),v=[];
 for(const [i,s] of p.shots.entries()){const d=dialogueShot(s,t.shots[i]);for(const id of Object.values(s.speakerAssets??{}))v.push(compositionReport(d,{subject:id}).subjectHeightOfSafe.mean);}
 return v.reduce((a,b)=>a+b,0)/v.length;};

test('group framing: characters 1.4–1.7x larger; no new preflight errors, gate, visibility or motion findings',async()=>{
 // Before GEN-02 (GEN-01 framing of the whole set): interview 0.285, network 0.267 of the safe height.
 for(const [n,min] of [['gen01-interview',.42],['talk04-dialogue',.33]]){const p=await project(n),h=speakerHeight(p),t=estimatedTimeline(p,plannedTimeline(p));
  assert.ok(h>=min,n+' speaker height '+h.toFixed(3));
  assert.deepEqual(inspectProject(p).issues.filter(i=>i.severity!=='review'),[],n);
  for(const [i,s] of p.shots.entries())assert.deepEqual(compositionGate(dialogueShot(s,t.shots[i])).warnings,[],n+' '+s.id);
  assert.deepEqual(visibilityCheck(p).warnings,[],n);assert.deepEqual(motionCheck(p,t).warnings,[],n);}
 const p5=read('talk05-first-words-cpu-polished');assert.ok(speakerHeight(p5)>=.46);
 for(const id of ['morning','table','mistake','thanks'])assert.equal(p5.shots.find(s=>s.id===id).cameraRig.framing,'group',id);
 assert.equal(p5.shots.find(s=>s.id==='tools').cameraRig.framing,'medium','authored camera kept');
});
test('group framing: rest-pose bounds keep the zoom steady while characters turn toward speakers',async()=>{
 const p=await project('gen01-interview'),t=estimatedTimeline(p,plannedTimeline(p)),s=dialogueShot(p.shots[0],t.shots[0]),n=t.shots[0].endFrame-t.shots[0].startFrame;
 const zooms=[],targets=[];// one zoom per shot (tightest fit over the dolly), so it never breathesfor(let f=0;f<n;f+=5){const c=evaluateGraph({...s,durationFrames:n},f/(n-1)).camera;zooms.push(c.zoom);targets.push(c.target[0]);}
 const step=v=>Math.max(...v.slice(1).map((z,i)=>Math.abs(z-v[i])));
 assert.ok(step(zooms)<8,'zoom change per 5 frames '+step(zooms).toFixed(2));assert.ok(Math.min(...zooms)>=GROUP_FRAMING.zoom[0]&&Math.max(...zooms)<=GROUP_FRAMING.zoom[1]);
});
test('group framing contract negatives; other framings unchanged',()=>{
 const p=read('talk02-dialogue-cpu-polished'),rig=r=>{const x=structuredClone(p);x.shots[0].cameraRig={preset:'medium',...r};return x;};
 validateProject(rig({framing:'group',subjects:['engineer','robot']}));
 for(const [r,re] of [[{framing:'group'},/subjects/],[{subjects:['engineer','robot']},/subjects/],[{framing:'group',subjects:['engineer']},/2–4/],
  [{framing:'group',subjects:['engineer','engineer']},/2–4/],[{framing:'group',subjects:['engineer','ghost']},/unknown subject/],[{framing:'group',subjects:['engineer','robot'],subject:'robot'},/not both/],
  [{framing:'group',subjects:'engineer'},/2–4/],[{framing:'wide'},/framing/]])assert.throws(()=>validateProject(rig(r)),re,JSON.stringify(r));
 // An explicit zoom track stays authoritative.
 const z=rig({framing:'group',subjects:['engineer','robot']});z.shots[0].camera.zoom=[[0,900]];delete z.shots[0].cameraInterpolation.zoom;
 assert.equal(evaluateGraph(z.shots[0],.5).camera.zoom,900);
});
