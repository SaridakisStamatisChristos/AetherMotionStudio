// Owner 2026-11-26, after seeing far-forest-r1: roles in captions "Off by default" and "No titles at all" for new films.
// Shot field titles 'none' (clean top), request.titles ('none' | 'shots'), Director dialogue defaults; absent = as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {validateProject} from '../src/core/timeline.js';
import {defaultSpeech} from '../src/studio/production.js';
import {drawGraph} from '../src/visual/draw-graph.js';
import {inspectProject} from '../src/quality/preflight.js';
const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const forest=read('gen12-forest-script.request'),narrator=read('speech-cpu-polished.request');
const graphShots=p=>p.shots.filter(s=>s.template==='cinematic-graph');
// A canvas stand-in that records the text drawn; every other call is accepted and ignored.
function recorder(){const texts=[];const any=new Proxy(function(){},{get:(t,k)=>k==='fillText'?(s=>texts.push(String(s))):k==='measureText'?(s=>({width:String(s).length*10})):k===Symbol.toPrimitive?(()=>0):any,apply:()=>any,set:()=>true});return {ctx:any,texts};}

test('Director: dialogue films get a clean top and no speaker names by default',async()=>{
 const p=(await direct(forest)).project;validateProject(p);
 assert.ok(graphShots(p).length>0&&graphShots(p).every(s=>s.titles==='none'),'every shot, singles included');
 assert.equal(p.speech.captions.speakerNames,false);assert.equal(Object.keys(p.speech.speakers).length,2,'the speakers stay; only the labels go');
});
test('choices: titles "shots" brings the titles back; a request with its own speech keeps its names; narrator films unchanged',async()=>{
 const shots=(await direct({...forest,titles:'shots'})).project;assert.ok(graphShots(shots).every(s=>!('titles' in s)));
 const own=(await direct({...forest,speech:defaultSpeech(forest.seconds)})).project;assert.equal(own.speech.captions.speakerNames,undefined,'Studio box ticked: names shown');
 const n=(await direct(narrator)).project;assert.ok(n.shots.every(s=>!('titles' in s)),'narrator default unchanged');
 assert.ok(graphShots((await direct({...narrator,titles:'none'})).project).every(s=>s.titles==='none'));
});
test('negatives: unknown titles values are refused for requests and shots',async()=>{
 for(const bad of ['off','None',true,0,'']) await assert.rejects(direct({...forest,titles:bad}),/request.titles/,String(bad));
 const p=(await direct(forest)).project;
 for(const bad of ['shots','hidden',false,null]){const x=structuredClone(p);x.shots[0].titles=bad;assert.throws(()=>validateProject(x),/titles/,String(bad));}
});
test('drawing: titles none draws no top text on either layout; absent draws the title as before',async()=>{
 // without the polished fidelity block (it needs browser canvases); the same title code path decides
 const p=(await direct(forest)).project,s={...p.shots[0]},heading=s.heading;delete s.fidelity;assert.ok(heading);
 const draw=shot=>{const r=recorder();drawGraph(r.ctx,.5,360,640,shot,null,360,null,null);return r.texts;};
 const before={...s};delete before.titles;
 assert.ok(draw(before).some(t=>t.includes(heading.split(' ')[0])),'absent: the title is drawn');
 assert.deepEqual(draw(s).filter(t=>t.includes(heading.split(' ')[0])),[],'none: no title');
 assert.deepEqual(draw({...s,delivery:'reels-v1'}).filter(t=>t.includes(heading.split(' ')[0])),[],'none wins over the Reels heading too');
});
test('preflight: repeated headings are not reported when titles are hidden',async()=>{
 const p=(await direct(forest)).project;const x=structuredClone(p);for(const s of x.shots)s.heading='Same heading';
 assert.ok(!inspectProject(x).issues.some(i=>i.code==='REPEATED_HEADING'));
 for(const s of x.shots)delete s.titles;assert.ok(inspectProject(x).issues.some(i=>i.code==='REPEATED_HEADING'),'shown titles are still checked');
});
test('one-click production (produce.mjs): a dialogue request without speech gets no speaker names; its own speech is kept; narrator unchanged',async()=>{
 const {parseProduction}=await import('../scripts/production-options.mjs');
 const parse=q=>parseProduction(['--request','x.json','--backend','both'],{read:()=>JSON.stringify(q)}).request;
 assert.equal(parse(forest).speech.captions.speakerNames,false);
 assert.equal(parse({...forest,speech:defaultSpeech(forest.seconds)}).speech.captions.speakerNames,undefined);
 assert.equal(parse(narrator).speech.captions.speakerNames,undefined);
});
