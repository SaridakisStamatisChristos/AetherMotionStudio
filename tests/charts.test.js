// DUAL-04 charts, timelines, flowcharts and comparison cards: strict data rules, no misleading scales, fixed axes
// across steps, honest transitions, bounded CSV, layout overflow diagnostics.
import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutComposition,validateComposition} from '../src/core/composition.js';
import {parseCsv,niceRange,percents,CSV_LIMITS} from '../src/core/charts.js';
import {drawComposition} from '../src/visual/draw-composition.js';
const V2=(items,extra={})=>({version:'compose-v2',region:'full',font:'inter',items,...extra});
const bar=(extra={})=>({id:'c',type:'chart',kind:'bar',box:[0,0,1,.6],categories:['Mon','Tue','Wed'],series:[{name:'Loaves',values:[120,95,110]}],...extra});
const bad=(c,re)=>assert.throws(()=>validateComposition(c),re);

test('CSV: strict, bounded; quoted text allowed; anything not a plain number is refused by cell',()=>{
 const t=parseCsv('Day,"Week ""A""",Week 2\nMon,120,130\n"Tue, late",95,\nWed,-7.5,105');
 assert.deepEqual(t.header,['Day','Week "A"','Week 2']);assert.deepEqual(t.rows,[['Mon',120,130],['Tue, late',95,null],['Wed',-7.5,105]]);
 for(const [s,re] of [['A,B\n1,1,000\n2,3',/has 3 cells/],['A,B\nx,1e3\ny,2',/"1e3" is not a plain number/],['A,B\nx,=SUM(A1)\ny,2',/is not a plain number/],['A,B\nx,"1"\ny,2x',/"2x" is not a plain number/],
  ['A,B\nx,1\ny,2,3',/has 3 cells, the header has 2/],['A,B\nx,"1',/unclosed quote/],['A,B\nx,"1"z\ny,2',/text after a closing quote/],['A,B\nx,1',/a header and 2–60 rows/],
  ['A\nx\ny',/2–6 columns/],['A,B,C,D,E,F,G\n1,1,1,1,1,1,1\n2,2,2,2,2,2,2',/2–6 columns/],['A,B\n'+'x,1\n'.repeat(61),/2–60 rows/],['x'.repeat(CSV_LIMITS.chars+1),/1–8000 characters/],['A,B\nx,\u00071\ny,2',/control characters/],['A,B\nx,Infinity\ny,2',/not a plain number/],['A,B\nx,NaN\ny,2',/not a plain number/]])assert.throws(()=>parseCsv(s),re,s);
});

test('chart values: finite numbers or explicit missing; malformed series refused',()=>{
 for(const v of [NaN,Infinity,-Infinity,'5',1e13,undefined,{}])bad(V2([bar({series:[{name:'L',values:[1,v,3]}]})]),/finite number within ±1e12/);
 bad(V2([bar({series:[{name:'L',values:[1,2]}]})]),/3 values required/);
 bad(V2([bar({categories:['Mon','Mon','Wed']})]),/duplicate category/);
 bad(V2([bar({series:[{name:'L',values:[1,2,3]},{name:'L',values:[1,2,3]}]})]),/duplicate series name/);
 bad(V2([bar({series:[{name:'L',values:[null,null,null]}]})]),/all values are missing/);
 bad(V2([bar({series:[1,2,3,4,5].map(i=>({name:'S'+i,values:[1,2,3]}))})]),/1–4 series/);
 bad(V2([bar({kind:'donut'})]),/one of bar, line, area, scatter, pie/);
 bad(V2([bar({csv:'A,B\nx,1\ny,2'})]),/use csv or categories\/series/);
 bad(V2([bar({categories:['Mon','Tue','🚀'],series:[{name:'L',values:[1,2,3]}]})]),/missing glyphs/);
});

test('no misleading scales: bars and areas include zero, explicit ranges never clip, signs are kept',()=>{
 bad(V2([bar({y:[80,200]})]),/must include zero \(a truncated baseline misleads\)/);
 bad(V2([bar({kind:'area',y:[50,200]})]),/must include zero/);
 bad(V2([bar({y:[0,100]})]),/value 120 lies outside 0…100; widen y \(data is never clipped\)/);
 bad(V2([bar({kind:'line',y:[100,130]})]),/value 95 lies outside/);
 const L=layoutComposition(V2([bar({series:[{name:'Profit',values:[40,-20,15]}]})])).items[0].chart;assert.ok(L.Y[0]<=-20&&L.Y[1]>=40&&L.Y[0]<0);
 assert.deepEqual(niceRange(95,180,true),[0,200]);assert.deepEqual(niceRange(95,180,false),[80,180]);assert.deepEqual(niceRange(5,5,false),[4,6]);
 const line=layoutComposition(V2([bar({kind:'line'})])).items[0].chart;assert.ok(line.Y[0]>0,'line charts may start above zero');
});

test('steps: same categories and series, fixed axes covering every state, pies stay positive',()=>{
 const s=layoutComposition(V2([bar({steps:[{series:[{values:[130,100,null]}],note:'week 2'},{highlight:{category:'Mon'}}]})])).items[0].chart;
 assert.equal(s.states.length,3);assert.deepEqual(s.Y,[0,140]);assert.equal(s.states[2],s.states[1]);
 bad(V2([bar({steps:[{series:[{values:[1,2]}]}]})]),/3 values required/);
 bad(V2([bar({steps:[{series:[{values:[1,2,3]},{values:[1,2,3]}]}]})]),/1 series required/);
 bad(V2([bar({steps:[{series:[{name:'Other',values:[1,2,3]}]}]})]),/series order must stay "Loaves"/);
 bad(V2([bar({steps:[{series:[{values:[1,NaN,3]}]}]})]),/finite number/);
 bad(V2([bar({steps:[{highlight:{category:'Sun'}}]})]),/unknown category/);
 bad(V2([bar({y:[0,150],steps:[{series:[{values:[1,2,300]}]}]})]),/value 300 lies outside/);
 bad(V2([bar({steps:Array(13).fill({note:'x'})})]),/at most 12 steps/);
 const pie={id:'p',type:'chart',kind:'pie',box:[0,0,1,.5],categories:['A','B','C'],series:[{name:'Share',values:[5,3,2]}]};
 validateComposition(V2([pie]));
 for(const v of [[5,0,2],[5,-3,2],[5,null,2]])bad(V2([{...pie,series:[{name:'Share',values:v}]}]),/positive|finite number/);
 bad(V2([{...pie,steps:[{series:[{values:[5,0,2]}]}]}]),/pie slices must stay positive/);
 bad(V2([{...pie,categories:['a','b','c','d','e','f','g'],series:[{name:'S',values:[1,1,1,1,1,1,1]}]}]),/at most 6 slices/);
 bad(V2([{...pie,y:[0,10]}]),/pie charts take no axis ranges/);
 bad(V2([{...pie,series:[{name:'A',values:[1,2,3]},{name:'B',values:[1,2,3]}]}]),/exactly one series/);
 assert.deepEqual(percents([1,1,1]),[34,33,33]);assert.deepEqual(percents([500,300,200]),[50,30,20]);assert.equal(percents([7,13,29,51,3]).reduce((a,b)=>a+b,0),100);
});

test('scatter, annotations and layout overflow are checked',()=>{
 const sc={id:'s',type:'chart',kind:'scatter',box:[0,0,1,.6],series:[{name:'Days',points:[[10,100],[20,140],[25,170]]}],xUnit:'°C',unit:'loaves'};
 validateComposition(V2([sc]));bad(V2([{...sc,x:[0,15]}]),/value 20 lies outside the x range/);bad(V2([{...sc,series:[{name:'D',points:[[1,NaN],[2,3]]}]}]),/finite number/);
 bad(V2([{...sc,steps:[{series:[{values:[1]}]}]}]),/do not change values/);bad(V2([bar({x:[0,1]})]),/only scatter charts take an x range/);
 bad(V2([bar({annotations:[{category:'Sun',text:'x'}]})]),/unknown category/);
 bad(V2([bar({series:[{name:'L',values:[1,null,3]}],annotations:[{category:'Tue',text:'peak'}]})]),/points at a missing value/);
 bad(V2([bar({series:[1,2,3,4].map(i=>({name:'Long series nam'+i,values:[1,2,3]}))})]),/legend wider than the chart/);
 bad(V2([bar({categories:['Monday mornin','Tuesday morni','Wednesday aft'],box:[0,0,.4,.6]})]),/category names do not fit|too small/);
 bad(V2([bar({box:[0,0,.2,.2]})]),/too small for a chart/);
 bad(V2([{id:'t',type:'timeline',box:[0,0,1,.3],events:[{when:'1',label:'a'}]}]),/2–8 events/);
 bad(V2([{id:'t',type:'timeline',box:[0,0,.3,.2],events:Array.from({length:8},(_,i)=>({when:'Year '+i,label:'A long event label'}))}]),/do not fit/);
 bad(V2([{id:'f',type:'flow',box:[0,0,1,.6],nodes:['only one']}]),/2–6 boxes/);bad(V2([{id:'f',type:'flow',box:[0,0,1,.6],nodes:['a','b'],direction:'diagonal'}]),/column or row/);
 bad(V2([{id:'f',type:'flow',box:[0,0,.3,.2],nodes:['A rather long first step text','Another long second step','Third','Fourth','Fifth','Sixth']}]),/too small|do not fit/);
 bad(V2([{id:'k',type:'compare',box:[0,0,1,.6],cards:[{title:'A',points:['x']}]}]),/exactly 2 cards/);
 bad(V2([{id:'k',type:'compare',box:[0,0,1,.6],cards:[{title:'A',points:[]},{title:'B',points:['y']}]}]),/1–5 points/);
});

test('visuals claim phrases: a planner shot is split between two visuals; only the same phrase conflicts',async()=>{
 const {direct}=await import('../src/director/index.js');const {readFileSync}=await import('node:fs');
 const q=JSON.parse(readFileSync(new URL('../examples/dual04-bread.request.json',import.meta.url),'utf8'));
 const r=await direct(q),types=r.project.shots.map(s=>s.composition.items.map(x=>x.type).join('+'));
 assert.deepEqual(types.slice(1),['flow','timeline','compare','graph']);
 assert.ok(r.project.shots.every(s=>s.narration.length<=8));
 const v=q.visuals;await assert.rejects(direct({...q,visuals:[v[0],{...v[1],at:'Then the dough rises, gets shaped, and bakes in a hot oven.'}]}),/overlap those of request.visuals\[0\]/);
 const pie={id:'p',type:'chart',kind:'pie',box:[0,.1,1,.6],categories:['Bread','Pastries','Coffee'],series:[{name:'Takings',values:[1500,900,600]}],unit:'euros'};
 const L=layoutComposition(V2([pie])).items[0].chart.pie;assert.ok(L.size>=18&&L.r>=50);
 bad(V2([{...pie,box:[0,0,.3,.12]}]),/do not fit beside or below the pie/);
});
