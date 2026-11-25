// GEN-09 Instagram Reels mode (opt-in delivery 'reels-v1'): layout and framing inside the Reels-safe area, a Reels check,
// and an export step (cover + report). Long films are allowed: only a warning. Default output unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {validateProject} from '../src/core/timeline.js';
import {reelsProject,reelsCheck,REELS} from '../src/core/reels.js';
import {SAFE_AREAS,GROUP_FRAMING} from '../src/core/cinematography.js';
import {drawSpeechCue} from '../src/core/draw-film.js';
import {motionCheck,estimatedTimeline} from '../src/quality/motion-check.js';
import {crowdingCheck} from '../src/quality/crowding.js';
import {visibility2Check} from '../src/quality/visibility.js';
import {inspectProject} from '../src/quality/preflight.js';
import {plannedTimeline} from '../src/studio/model.js';
import {coverFrame,reelsReport} from '../scripts/reels-export.mjs';
import {evaluateGraph} from '../src/core/graph.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const est=p=>estimatedTimeline(p,plannedTimeline(p));
const directed=async(n,extra={})=>{const r=read(n+'.request');return (await direct({...r,speech:defaultSpeech(r.seconds),...extra})).project;};
// Records fillText calls of a canvas-like context (everything else is a no-op).
const recorder=()=>{const calls=[];const ctx=new Proxy({},{get:(o,k)=>k==='fillText'?(s,x,y)=>calls.push({s,x,y}):k==='measureText'?s=>({width:String(s).length*15}):k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});return {ctx,calls};};

test('layout constants: captions, heading and characters inside the Reels-safe area; fit derived from it',()=>{
 const U=REELS.ui,C=REELS.caption,K=REELS.characters;
 // owner: captions low (a caption on top would cover faces); the tallest box (2 lines + speaker = 134) stays clear of the heading
 assert.ok(C.left>=U.x[0]&&C.left+C.width<=U.x[1]&&C.bottom<=U.y[1]&&C.bottom-134>REELS.heading.y+REELS.heading.size);
 assert.ok(REELS.heading.y-REELS.heading.size/2>=U.y[0]&&REELS.heading.y+REELS.heading.size/2<K.y[0]);
 assert.equal(SAFE_AREAS['reels-v1'].halfHeight,GROUP_FRAMING.halfHeight,'normal character height in Reels');
 assert.ok(K.x[0]>=U.x[0]&&K.x[1]<=U.x[1]&&K.y[1]<=U.y[1]);
 assert.equal(SAFE_AREAS['reels-v1'].halfWidth,Math.min(360-K.x[0],K.x[1]-360));assert.equal(SAFE_AREAS['reels-v1'].halfHeight,Math.min(640-K.y[0],K.y[1]-640));
 const cue={cue:{speaker:'host',lines:['one two three','four five']},active:0},speech={speakers:{host:{name:'Host'},guest:{name:'Guest'}},captions:{highlight:true}};
 // the speaker label is drawn at its absolute position (caption words are drawn after a translate)
 const label=r=>r.calls.find(c=>c.s==='Host');
 const a=recorder();drawSpeechCue(a.ctx,720,1280,cue,speech,'reels-v1');const la=label(a);assert.ok(la&&la.y>=C.bottom-134&&la.y<=C.bottom&&la.x===C.left+C.width/2,'Reels caption low '+JSON.stringify(la));
 const b=recorder();drawSpeechCue(b.ctx,720,1280,cue,speech);const lb=label(b);assert.ok(lb.y>1000&&lb.x===360,'default caption unchanged at the bottom '+JSON.stringify(lb));
});
test('Director Reels interview: every check clean; framing inside the Reels area; default and prompt unchanged',async()=>{
 const p=await directed('gen01-interview',{delivery:'reels-v1'}),t=est(p),plain=await directed('gen01-interview');
 assert.equal(p.delivery,'reels-v1');assert.equal(plain.delivery,undefined);
 assert.ok(p.shots.every(s=>s.cameraRig.safeArea==='reels-v1'));assert.ok(plain.shots.every(s=>s.cameraRig.safeArea===undefined));
 const r=reelsCheck(p,t);assert.equal(r.applies,true);assert.deepEqual(r.warnings,[]);
 assert.deepEqual(motionCheck(p,t).warnings,[]);assert.deepEqual(crowdingCheck(p,t).warnings,[]);assert.deepEqual(visibility2Check(p,t).warnings,[]);
 assert.deepEqual(inspectProject(p).issues.filter(x=>x.severity!=='review'),[]);
 // normal height again: Reels gets the same three singles as the default layout
 assert.deepEqual(p.shots.filter(s=>s.id.endsWith('-single')).map(s=>s.id),plain.shots.filter(s=>s.id.endsWith('-single')).map(s=>s.id));
 assert.equal(reelsCheck(plain,est(plain)).applies,false);
 const q=read('gen01-interview.request'),a=await direct({...q,speech:defaultSpeech(q.seconds)}),b=await direct({...q,speech:defaultSpeech(q.seconds),delivery:'reels-v1'});
 assert.equal(a.manifest.promptDigest,b.manifest.promptDigest,'delivery does not reach the model prompt');
 const flat=await directed('talk04-dialogue',{delivery:'reels-v1'});assert.deepEqual(reelsCheck(flat,est(flat)).warnings,[]);assert.deepEqual(motionCheck(flat,est(flat)).warnings,[]);
});
test('reelsProject on authored projects; contract negatives',async()=>{
 const src=read('talk05-first-words-cpu-polished'),{project:p,report}=reelsProject(src);validateProject(p);
 assert.equal(src.delivery,undefined,'input untouched');assert.ok(report.framed.length&&report.framed.every(id=>p.shots.find(s=>s.id===id).cameraRig.safeArea==='reels-v1'));
 assert.ok(report.unframed.includes('tools'),'authored medium framing reported, not changed');
 const bad=f=>{const x=structuredClone(p);f(x);assert.throws(()=>validateProject(x));};
 bad(x=>x.delivery='tiktok');bad(x=>x.delivery=true);
 const g=p.shots.findIndex(s=>s.cameraRig?.framing==='group'),m=p.shots.findIndex(s=>s.cameraRig?.framing==='medium');
 bad(x=>x.shots[g].cameraRig.safeArea='stories');bad(x=>x.shots[m].cameraRig.safeArea='reels-v1');
 const q=read('gen01-interview.request');await assert.rejects(direct({...q,delivery:'stories'}),/delivery/);
 assert.ok(SAFE_AREAS['reels-v1'].halfWidth<GROUP_FRAMING.halfWidth&&SAFE_AREAS['reels-v1'].halfHeight===GROUP_FRAMING.halfHeight);
 const s=p.shots[g],z=evaluateGraph(s,.5).camera.zoom,z0=evaluateGraph(src.shots[g],.5).camera.zoom;assert.ok(z<z0,'zoom '+z0+' -> '+z);
});
test('Reels check negatives: a character under the buttons is flagged; long films only warn',async()=>{
 const p=await directed('gen01-interview',{delivery:'reels-v1',dialogue:{...read('gen01-interview.request').dialogue,singles:false}});
 const s=p.shots[0];s.assets.push({id:'extra',asset:'engineer',tracks:{x:[[0,2.2]],z:[[0,.6]]}});
 assert.ok(reelsCheck(p,est(p)).warnings.some(w=>w.code==='REELS_UNDER_OVERLAY'&&w.asset==='extra'));
 // a caption tall enough to reach the heads is flagged (normal captions cover at most legs and feet)
 const t0=est(p),cap=n=>({...t0,captions:[{speaker:'host',startSample:0,endSample:t0.durationFrames*1600,lines:Array(n).fill('word word'),words:[]}]});
 assert.deepEqual(reelsCheck(p,cap(2)).warnings.filter(w=>w.code==='REELS_CAPTION_ON_HEAD'),[],'a 2-line caption covers no head');
 assert.ok(reelsCheck(p,cap(12)).warnings.some(w=>w.code==='REELS_CAPTION_ON_HEAD'));
 const t=est(p),long={...t,durationFrames:100*30};assert.ok(reelsCheck(p,long).warnings.some(w=>w.code==='REELS_LONG'&&w.seconds===100));
});
test('export: cover from the first single (or explicit frame); report passes long films with a warning; wrong format fails',async()=>{
 const p=await directed('gen01-interview',{delivery:'reels-v1'}),t=est(p),d=await directed('gen01-interview');
 assert.equal(coverFrame(d,est(d)).source,'first single');
 const c=coverFrame(p,t);assert.equal(c.source,'first single');assert.ok(c.frame>0&&c.frame<t.durationFrames);
 assert.equal(coverFrame(p,t,12).frame,12);assert.throws(()=>coverFrame(p,t,t.durationFrames),/outside/);assert.throws(()=>coverFrame(p,t,-1),/outside/);
 const probe={streams:[{codec_type:'video',codec_name:'h264',width:1080,height:1920},{codec_type:'audio',codec_name:'aac'}]};
 const ok=reelsReport(p,{...t,durationFrames:150*30},probe,null,c);assert.equal(ok.status,'pass');assert.ok(ok.warnings.some(w=>w.code==='REELS_LONG'));
 assert.equal(reelsReport(p,t,{streams:[{...probe.streams[0],width:1920,height:1080},probe.streams[1]]},null,c).status,'fail');
 assert.ok(reelsReport(read('talk05-first-words-cpu-polished'),t,probe,null,c).warnings.some(w=>w.code==='NOT_REELS_LAYOUT'));
});
