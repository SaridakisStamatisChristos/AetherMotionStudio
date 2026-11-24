// ART-01 slice 1: authored product choreography using only existing tracks/actions (no engine change).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {inspectShot} from '../src/quality/preflight.js';

const read=name=>JSON.parse(readFileSync(new URL('../examples/'+name+'.json',import.meta.url),'utf8'));
const art=b=>read('art01-product-'+b+'-polished');
const af01Product=()=>read('foundry-af01-cpu-polished').shots.find(s=>s.id==='product');
// Largest single-frame step per root channel; bounds are generous for intended motion and far below a pop.
const STEP_LIMITS=Object.freeze({x:.02,y:.05,yaw:.06,scale:.04});
function frameSteps(shot){
 const n=shot.durationFrames,rows=[];
 for(let f=0;f<n;f++){const a=evaluateGraph(shot,f/(n-1)).assets[0].pose;rows.push({x:a.origin[0],y:a.origin[1],yaw:a.yaw,scale:a.scale});}
 const max={};for(let f=1;f<n;f++)for(const c of Object.keys(STEP_LIMITS))max[c]=Math.max(max[c]??0,Math.abs(rows[f][c]-rows[f-1][c]));
 return {rows,max,pops:Object.keys(STEP_LIMITS).filter(c=>max[c]>STEP_LIMITS[c])};
}

test('ART-01 fixtures validate and form an exact matched pair',()=>{
 const a=art('cpu'),b=art('three');validateProject(a);validateProject(b);
 assert.equal(a.shots.length,1);assert.equal(a.shots[0].backend,'cpu');assert.equal(b.shots[0].backend,'three');
 assert.deepEqual(a.shots,b.shots.map(s=>({...s,backend:'cpu'})));
 assert.deepEqual({...a,id:null,shots:null},{...b,id:null,shots:null});
});

test('ART-01 preserves the AF01 product identity, copy and look; only motion and camera differ',()=>{
 const s=art('cpu').shots[0],o=af01Product();
 for(const k of ['id','template','durationFrames','heading','subheading','environment','effects','narration','fidelity','geometryProfile'])assert.deepEqual(s[k],o[k],k);
 assert.deepEqual(s.assets.map(a=>[a.id,a.asset]),o.assets.map(a=>[a.id,a.asset]));
 assert.equal(read('foundry-af01-cpu-polished').voice,art('cpu').voice);
});

test('ART-01 clears LOW_PROJECTED_MOTION with no new preflight issues; original AF01 gate unchanged',()=>{
 const r=inspectShot(art('cpu').shots[0]);
 assert.deepEqual(r.issues,[]);assert.ok(r.metrics.meanProjectedCenterMotion>=1,String(r.metrics.meanProjectedCenterMotion));
 const old=inspectShot(af01Product());
 assert.deepEqual(old.issues.map(i=>[i.code,i.severity]),[['LOW_PROJECTED_MOTION','review']]);
});

test('ART-01 motion is continuous at every frame and deterministic out of order',()=>{
 const s=art('cpu').shots[0],{max,pops}=frameSteps(s);
 assert.deepEqual(pops,[],JSON.stringify(max));
 for(const p of [.9,.1,.55,0,1,.42])assert.deepEqual(evaluateGraph(s,p),evaluateGraph(structuredClone(s),p));
});

test('ART-01 choreography beats: drop-in reveal, anticipation, overshoot and settle',()=>{
 const s=art('cpu').shots[0],at=p=>evaluateGraph(s,p).assets[0].pose;
 assert.ok(at(0).origin[1]>.5&&at(0).scale<.6,'starts raised and small');
 assert.equal(at(.2).origin[1],0);assert.ok(Math.abs(at(.32).scale-1)<1e-9,'lands at rest scale');
 assert.ok(at(.42).yaw<at(.3).yaw,'counter-turn anticipation before main turn');
 const peak=at(.78).yaw,end=at(1).yaw;assert.ok(peak>end&&at(.9).yaw<end,'overshoot then settle');
 assert.ok(at(.76).scale>1.03,'emphasis coincides with the overshoot');
 assert.ok(at(.6).origin[1]>0&&at(1).origin[1]===0,'secondary hover fades out to contact');
});

test('negative: continuity check detects the once-action snap-back at window end',()=>{
 // Without the yaw track, reveal-spin drives yaw to 0.2 and snaps to base 0 after its window closes.
 const s=structuredClone(art('cpu').shots[0]);delete s.assets[0].tracks.yaw;
 const {pops,max}=frameSteps(s);
 assert.ok(pops.includes('yaw'),JSON.stringify(max));assert.ok(max.yaw>.15);
});

test('negative: ART-01 fixture rejects unsupported channels and malformed choreography',()=>{
 const bad=mut=>{const p=art('cpu');mut(p.shots[0].assets[0]);return ()=>validateProject(p);};
 assert.throws(bad(a=>a.actions.push({name:'wave',start:0,end:1})),/unsupported channel/);
 assert.throws(bad(a=>a.actions[0].end=a.actions[0].start),/./);
 assert.throws(bad(a=>a.actions.push({name:'hover',start:0,end:1,mode:'pingpong'})),/./);
 assert.throws(bad(a=>a.tracks.yaw.push([0.95,1.1])),/strictly ordered/);
 assert.throws(bad(a=>a.tracks.yaw[1][1]=9),/out of range/);
});
