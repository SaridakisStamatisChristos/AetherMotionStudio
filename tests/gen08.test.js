// GEN-08 visibility-v2: hidden share from projected parts with a coarse depth test (fewer false alarms for thin shapes
// and line-ups than visibility-v1's whole-asset boxes), rendered poses from the timeline. v1 is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {visibility2Check,visibility2Shot,coverage,VISIBILITY2_POLICY} from '../src/quality/visibility.js';
import {visibilityCheck,estimatedTimeline,VISIBILITY_POLICY} from '../src/quality/motion-check.js';
import {plannedTimeline} from '../src/studio/model.js';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {evaluateGraph} from '../src/core/graph.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const est=p=>estimatedTimeline(p,plannedTimeline(p));
const examples=readdirSync(new URL('../examples/',import.meta.url)).filter(f=>f.endsWith('.json')&&!f.includes('request')).map(f=>f.slice(0,-5))
 .filter(n=>{const p=read(n);return p.version===2&&p.shots?.some(s=>s.template==='cinematic-graph');});
const base=n=>n.replace(/-(cpu|three)(-polished)?$/,'');
// Known findings in older accepted films (unchanged; GEN-07 deferred): the TALK-02/03 meeting table (as in v1), and
// the cinematography "homes" guide robot standing half inside the cottage (its box reaches 0.4 m into it), which
// v1 missed because it compared asset origins only.
const KNOWN=new Set(['talk02-dialogue/meeting/table','talk03-body/meeting/table','cinematography/homes/guide']);

test('visibility-v2 on every example: only the recorded findings; v1 unchanged',()=>{
 assert.equal(VISIBILITY2_POLICY.version,'visibility-v2');assert.equal(VISIBILITY_POLICY.version,'visibility-v1');
 const found=new Set();
 for(const n of examples){const p=read(n);for(const w of visibility2Check(p,est(p)).warnings)found.add(base(n)+'/'+w.shot+'/'+w.asset);}
 assert.deepEqual([...found].sort(),[...KNOWN].sort());
});
test('fewer false alarms on line-ups; the TALK-04 r1 hidden set piece is still flagged in every shot',async()=>{
 // ART-03 cast line-up: shoulders overlap; v1 measured ~0.69 for the back-row character, v2 must be clearly lower
 const p=read('art03-cast-cpu-polished'),i=p.shots.findIndex(s=>s.id==='after'),t=est(p);
 const v1=visibilityCheck(p).shots.find(s=>s.shot==='after').assets['construction-worker'].coveredMean,v2=visibility2Shot(p,t,i)['construction-worker'].coveredMean;
 assert.ok(v1>.6&&v2<v1-.15,v1+' -> '+v2);
 const q=read('talk04-dialogue.request'),h=(await direct({...q,speech:defaultSpeech(q.seconds),dialogue:{...q.dialogue,singles:false}})).project;
 for(const s of h.shots){const o=s.assets.find(a=>a.id==='object-1');o.tracks.x=[[0,0]];o.tracks.z=[[0,-1.1]];o.tracks.scale=[[0,.6]];}
 const w=visibility2Check(h,est(h)).warnings.filter(x=>x.asset==='object-1');assert.equal(w.length,h.shots.length);
 const ok=(await direct({...q,speech:defaultSpeech(q.seconds)})).project;assert.deepEqual(visibility2Check(ok,est(ok)).warnings,[],'Director films clean');
});
test('depth test and edge cases: nearer parts cover, farther ones do not; attachment links excluded; empty shots',()=>{
 const p=read('talk01-faces-cpu-polished'),s=p.shots[0],ch=s.assets.find(a=>a.asset==='engineer'||a.asset==='scientist');
 const x=ch.tracks.x?.[0]?.[1]??0,z=ch.tracks.z?.[0]?.[1]??0,make=dz=>({...s,durationFrames:150,assets:[...s.assets,{id:'wall',asset:'cottage',tracks:{x:[[0,x]],z:[[0,z+dz]],scale:[[0,1.4]]}}]});
 const front=coverage(evaluateGraph(make(2.5),.5)),behind=coverage(evaluateGraph(make(-3),.5));
 assert.ok(front[ch.id]>.7,'a cottage in front hides the character: '+front[ch.id]);
 assert.ok(behind[ch.id]<.2,'a cottage behind does not: '+behind[ch.id]);
 const linked=new Set([ch.id+'|wall','wall|'+ch.id]);assert.equal(coverage(evaluateGraph(make(2.5),.5),linked)[ch.id],0);
 assert.deepEqual(visibility2Check({...p,shots:p.shots.map(x=>({...x,template:'robot-lab'}))},est(p)).shots,[]);
});
