// GEN-04 crowding-v1: every catalog character counts (also robot animals), rendered poses (listener turns, follow,
// aims, body-language beats) every third frame, overlap measured on projected parts. composition-v1 is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {crowdingCheck,crowdingShot,isCatalogCharacter,CROWDING_POLICY} from '../src/quality/crowding.js';
import {estimatedTimeline} from '../src/quality/motion-check.js';
import {compositionReport,COMPOSITION_POLICY} from '../src/quality/composition.js';
import {plannedTimeline} from '../src/studio/model.js';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {RECIPES} from '../src/visual/catalog-data.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const est=p=>estimatedTimeline(p,plannedTimeline(p));
const examples=readdirSync(new URL('../examples/',import.meta.url)).filter(f=>f.endsWith('.json')&&!f.includes('request')).map(f=>f.slice(0,-5))
 .filter(n=>{const p=read(n);return p.version===2&&p.shots?.some(s=>s.template==='cinematic-graph');});
const base=n=>n.replace(/-(cpu|three)(-polished)?$/,'');
const directed=async n=>{const r=read(n+'.request');return (await direct({...r,speech:defaultSpeech(r.seconds)})).project;};
// Known findings in older accepted films (recorded, not hidden; GEN-07 re-staging was deferred by the owner):
// the ART-03 / POLISH-02 cast line-ups stand in two staggered rows, and the robot walks past the engineer in "steps".
const LINEUP=['scientist|astronaut','scientist|construction-worker','engineer|construction-worker','engineer|student','office-worker|student','office-worker|runner'];
const KNOWN=new Set([
 ...['before','after'].flatMap(s=>LINEUP.map(p=>'art03-cast/'+s+'/'+p)),
 ...['detail-2','detail-3'].flatMap(s=>LINEUP.map(p=>'polish02-cast/'+s+'/'+p)),
 ...['art05-workshop','workshop-extended'].flatMap(f=>['robot|engineer','robot|scientist'].map(p=>f+'/steps/'+p))]);

test('crowding-v1 on every example: only the recorded historical findings; Director films clean',async()=>{
 assert.equal(CROWDING_POLICY.version,'crowding-v1');assert.equal(COMPOSITION_POLICY.version,'composition-v1');
 const found=new Set();
 for(const n of examples){const p=read(n);for(const w of crowdingCheck(p,est(p)).warnings)found.add(base(n)+'/'+w.shot+'/'+w.pair);}
 assert.deepEqual([...found].sort(),[...KNOWN].sort());
 for(const n of ['gen01-interview','talk04-dialogue']){const p=await directed(n);assert.deepEqual(crowdingCheck(p,est(p)).warnings,[],n);}
});
test('every catalog character counts, including robot animals; props do not',()=>{
 const all=Object.values(RECIPES).flat();
 for(const [id,family] of all)assert.equal(isCatalogCharacter(id),['human','robot','animal'].includes(family),id);
 assert.ok(isCatalogCharacter('retro-robot'));for(const id of ['robot-dog','robot-cat','robot-horse','robot-bird','explorer-robot'])assert.ok(isCatalogCharacter(id),id);
 for(const id of ['laptop','table','treasure-chest','energy-core','not-an-asset'])assert.equal(isCatalogCharacter(id),false,id);
});
test('negatives: a crowded line is flagged on every shot; an animal overlap is caught where composition-v1 is blind',async()=>{
 // singles off: this negative is about the crowding check on group shots
 const q0=read('gen01-interview.request'),p=(await direct({...q0,speech:defaultSpeech(q0.seconds),dialogue:{...q0.dialogue,singles:false}})).project;
 for(const s of p.shots)for(const a of s.assets)if(['host','guest'].includes(a.id))a.tracks.x=[[0,Math.sign(a.tracks.x[0][1])*.3]];
 const c=crowdingCheck(p,est(p));
 assert.equal(c.timeline,'estimated');
 assert.equal(c.warnings.filter(w=>w.pair==='host|guest'&&['CROWDED','CROWDED_PEAK'].includes(w.code)).length,p.shots.length);
 const q=read('talk01-faces-cpu-polished'),s=q.shots[0],eng=s.assets.find(a=>a.asset==='engineer'||a.asset==='scientist');
 assert.ok(eng,'fixture has a human');
 const x=eng.tracks.x?.[0]?.[1]??0,z=eng.tracks.z?.[0]?.[1]??0;
 s.assets.push({id:'dog',asset:'robot-dog',tracks:{x:[[0,x]],z:[[0,z+.5]],yaw:[[0,0]]}});
 const t=est(q),pairs=crowdingShot(q,t,0),key=Object.keys(pairs).find(k=>k.includes('dog'));
 assert.ok(key&&pairs[key].overlapPeak>CROWDING_POLICY.maxOverlapPeak,JSON.stringify(pairs));
 assert.ok(!Object.keys(compositionReport(s).overlap).some(k=>k.includes('dog')),'composition-v1 does not see animals (unchanged)');
 assert.ok(crowdingCheck(q,t).warnings.some(w=>w.pair===key));
});
test('edge cases: one character gives no pairs; legacy (non-graph) shots are skipped',()=>{
 const q=read('cinematic-cpu-polished');assert.equal(q.shots[0].assets.filter(a=>isCatalogCharacter(a.asset)).length,1);
 assert.deepEqual(crowdingShot(q,est(q),0),{});
 const legacy={...q,shots:q.shots.map(x=>({...x,template:'robot-lab'}))};
 assert.deepEqual(crowdingCheck(legacy,est(q)).shots,[]);
});
