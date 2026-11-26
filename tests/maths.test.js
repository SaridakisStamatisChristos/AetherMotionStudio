// DUAL-03 maths, geometry and algorithm visualization: bounded parser, TeX allowlist and MathJax compilation,
// arithmetic checks, plots, graphs (BFS), arrays (Euclid), authored visuals and the maths report.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {parseExpr} from '../src/core/expr.js';
import {validateTex,validateCompiled,checkArithmetic,mathKey} from '../src/core/math.js';
// MathJax is a package (npm install). Tests that compile TeX skip with this reason where it is not installed, e.g.
// a CI job that installs no packages; everything else (parser, checks, plots, graphs, arrays, isolation) always runs.
const MJ=await import('../src/director/math-compile.js').catch(e=>{if(e?.code==='ERR_MODULE_NOT_FOUND')return null;throw e;});
const NEEDS_MJ={skip:MJ?false:'MathJax (@mathjax/src) is not installed here; run npm install to run this test'};
const compileTex=(...a)=>MJ.compileTex(...a),compileProjectMath=(...a)=>MJ.compileProjectMath(...a);
import {mathJaxAvailable,compileProjectMath as loaderCompile} from '../src/director/math-loader.js';
import {layoutComposition,validateComposition} from '../src/core/composition.js';
import {bfsOrder,tickStep} from '../src/core/diagrams.js';
import {drawComposition} from '../src/visual/draw-composition.js';
import {direct} from '../src/director/index.js';
import {request} from '../src/director/schema.js';
const B=String.fromCharCode(92);
const V2=(items,extra={})=>({version:'compose-v2',region:'full',font:'inter',items,...extra});
const eq=(tex,extra={})=>({id:'e',type:'equation',box:[0,0,1,.3],tex,compiled:compileTex(tex),...extra});
const fixture=n=>JSON.parse(readFileSync(new URL('../examples/dual03-'+n+'.request.json',import.meta.url),'utf8'));

test('expression parser: allowlisted grammar, bounded, never code',()=>{
 assert.equal(parseExpr('2*18+12').eval(0),48);assert.equal(parseExpr('x^2-2*x+1').eval(3),4);assert.equal(parseExpr('gcd(48,18)').eval(0),6);
 assert.equal(parseExpr('-2^2').eval(0),-4);assert.equal(parseExpr('2^3^2').eval(0),512);assert.ok(Number.isNaN(parseExpr('sqrt(-1)').eval(0)));
 for(const [s,re] of [['alert(1)',/unknown name "alert"/],['constructor',/unknown name/],['__proto__',/unexpected character "_"/],['x;y',/unexpected character ";"/],['2**3',/unexpected "\*"/],['1e309',/after the expression/],['',/1–160 characters/],['x'.repeat(161),/1–160/],['('.repeat(30)+'1'+')'.repeat(30),/nesting deeper/],['1+',/unexpected end/],['gcd(1)',/expected ","/],['sin x',/expected "\("/]])assert.throws(()=>parseExpr(s),re,s);
 assert.throws(()=>parseExpr(Array(70).fill('1').join('+')),/more than 120 tokens/);
});

test('TeX allowlist, key binding and compiled-outline validation',NEEDS_MJ,()=>{
 for(const t of [B+'frac{a}{b}',B+'begin{pmatrix}1&2'+B+B+'3&4'+B+'end{pmatrix}',B+'gcd(48,18)=6',B+'angle ABC=90^'+B+'circ'])assert.equal(validateTex(t),t);
 for(const [t,re] of [[B+'href{http://x}{y}',/href is not an allowed/],[B+'def'+B+'x{1}',/def is not/],[B+'require{html}',/require is not/],[B+'begin{array}{c}1'+B+'end{array}',/environment array/],['$x$',/without \$/],['{'.repeat(9)+'x'+'}'.repeat(9),/deeper than 8/],['x}',/unbalanced/],[B+'@',/is not allowed/],['x'.repeat(201),/1–200/],['a\u0007b',/control characters/]])assert.throws(()=>validateTex(t),re,t);
 assert.notEqual(mathKey('x'),mathKey('y'));
 const c=compileTex(B+'frac{1}{2}');validateCompiled(c,B+'frac{1}{2}','c');
 assert.throws(()=>validateCompiled(c,B+'frac{1}{3}','c'),/do not match this TeX/);
 assert.throws(()=>validateCompiled(undefined,'x','c'),/not compiled/);
 for(const bad of [{...c,paths:[{d:'M0 0 url(javascript:alert(1))',m:[1,0,0,1,0,0]}]},{...c,paths:[{d:'M0 0',m:[1,0,0,1,0,NaN]}]},{...c,paths:Array(601).fill({d:'M0 0',m:[1,0,0,1,0,0]})},{...c,extra:1},{...c,box:[0,0,-1,1]}])assert.throws(()=>validateCompiled(bad,B+'frac{1}{2}','c'));
});

test('MathJax compilation: fractions, roots, matrices; errors and unsupported characters are explicit',NEEDS_MJ,()=>{
 for(const t of [B+'frac{a}{b}='+B+'sqrt{x^2+y^2}',B+'begin{pmatrix}1&2'+B+B+'3&4'+B+'end{pmatrix}','a^2+b^2=c^2'])assert.ok(compileTex(t).paths.length>=3,t);
 assert.throws(()=>compileTex(B+'frac{1}{2'),/unbalanced/);
 assert.throws(()=>compileTex(B+'text{café}'),/outside the base maths font/);
 const p={version:2,shots:[{composition:V2([{id:'e',type:'equation',box:[0,0,1,.3],tex:'x^2'}])}]},q=compileProjectMath(p);
 assert.equal(q.shots[0].composition.items[0].compiled.key,mathKey('x^2'));assert.equal(p.shots[0].composition.items[0].compiled,undefined,'input untouched');
 assert.equal(compileProjectMath(q),q,'already compiled: unchanged');
});

test('arithmetic checks: true claims pass, false claims and unverifiable checked claims are rejected',NEEDS_MJ,()=>{
 for(const t of ['48 = 2 '+B+'cdot 18 + 12',B+'gcd(48,18) = 6','3^2+4^2=9+16=25',B+'frac{1}{2}+'+B+'frac{1}{3}='+B+'frac{5}{6}',B+'sqrt{25}=5'])assert.equal(checkArithmetic(t).status,'true',t);
 assert.equal(checkArithmetic('2+2=5').status,'false');assert.equal(checkArithmetic('a^2+b^2=c^2').status,'unverifiable');assert.equal(checkArithmetic('42').status,'unverifiable');
 validateComposition(V2([eq('48 = 2 '+B+'cdot 18 + 12',{check:'arithmetic'})]));
 assert.throws(()=>validateComposition(V2([eq('2+2=5',{check:'arithmetic'})])),/the equation is false: its sides evaluate to 4 vs 5/);
 assert.throws(()=>validateComposition(V2([eq('a^2+b^2=c^2',{check:'arithmetic'})])),/cannot be checked arithmetically/);
 assert.throws(()=>validateComposition(V2([eq('x',{check:'symbolic'})])),/arithmetic or absent/);
 assert.throws(()=>validateComposition(V2([{...eq(B+'sum_{k=1}^{n} k='+B+'frac{n(n+1)}{2}'),box:[0,0,.2,.05]}])),/equation overflow/);
});

test('plots: ranges, equal scaling, functions with gaps; outside-range data is refused, never clipped silently',()=>{
 const plot=(shapes,extra={})=>V2([{id:'p',type:'plot',box:[0,0,1,.8],x:[-1,5],y:[-1,4],equal:true,shapes,...extra}]);
 const L=layoutComposition(plot([{kind:'polygon',points:[[0,0],[4,0],[0,3]]},{kind:'circle',center:[2,1.5],r:1},{kind:'point',at:[0,0],label:'O',step:1}]));
 assert.equal(L.items[0].plot.steps,2);assert.equal(L.items[0].plot.sx,L.items[0].plot.sy);
 const bad=(c,re)=>assert.throws(()=>validateComposition(c),re);
 bad(plot([{kind:'point',at:[9,0]}]),/outside the plot range; widen x\/y rather than clip/);
 bad(plot([{kind:'circle',center:[0,0],r:3}]),/outside the plot range/);
 bad(plot([{kind:'circle',center:[2,1],r:1}],{equal:false}),/equal:true so they stay round/);
 bad(plot([{kind:'segment',from:[1,1],to:[1,1]}]),/zero length/);bad(plot([{kind:'star',at:[0,0]}]),/one of point, segment/);
 bad(plot([{kind:'point',at:[0,0]}],{x:[3,1]}),/ranges must increase/);bad(plot([{kind:'point',at:[NaN,0]}]),/finite number/);
 bad(plot([{kind:'function',expr:'x^3'}]),/fall outside y; widen y or set clip:true/);
 validateComposition(plot([{kind:'function',expr:'x^3'}],{clip:true}));
 bad(plot([{kind:'function',expr:'1/(x-x)'}]),/fewer than half of the samples are finite/);
 bad(plot([{kind:'function',expr:'2'}]),/a function of x required/);bad(plot([{kind:'function',expr:'alert(x)'}]),/unknown name "alert"/);
 const g=layoutComposition(plot([{kind:'function',expr:'sqrt(x)',domain:[-1,4]}],{equal:false})).items[0].plot.shapes[0];assert.ok(g.runs.length>=1);
 bad(plot(Array.from({length:3},(_,i)=>({kind:'point',at:[0,0],step:i})),{phrases:[0,1]}),/one phrase index per step \(3\)/);
 assert.equal(tickStep(10),2);assert.equal(tickStep(1),.2);assert.equal(tickStep(3000),500);
});

test('graphs: BFS order is verified against the edges; layout collisions and bad edges are refused',()=>{
 const nodes=[{id:'A',at:[.5,0]},{id:'B',at:[.2,.4]},{id:'C',at:[.8,.4]},{id:'D',at:[.5,1]}],edges=[['A','B'],['A','C'],['B','D']];
 const G=(steps,extra={})=>V2([{id:'g',type:'graph',box:[0,0,1,.9],nodes,edges,algorithm:{name:'bfs',start:'A'},steps,...extra}]);
 assert.deepEqual(bfsOrder(['A','B','C','D'],edges,false,'A'),['A','B','C','D']);
 const L=layoutComposition(G([{visit:['A']},{visit:['B','C']},{visit:['D']}]));assert.equal(L.items[0].graph.algorithm.complete,true);
 assert.throws(()=>validateComposition(G([{visit:['A']},{visit:['C','B']}])),/not breadth-first from A \(expected A B C/);
 assert.throws(()=>validateComposition(G([{visit:['A']},{visit:['A']}])),/visited twice/);
 assert.throws(()=>validateComposition(G([{visit:['A']}],{nodes:[{id:'A',at:[.5,.5]},{id:'B',at:[.51,.5]}],edges:[['A','B']]})),/overlap; move them apart/);
 for(const [e,re] of [[[['A','A']],/no self-loops/],[[['A','Z']],/node IDs required/],[[['A','B'],['B','A']],/duplicate edge/]])assert.throws(()=>validateComposition(G([{visit:['A']}],{edges:e,algorithm:undefined})),re);
 assert.throws(()=>validateComposition(G([{visit:['A'],edges:[['C','D']]}])),/an existing edge required/);
 assert.throws(()=>validateComposition(G([{visit:['A']}],{algorithm:{name:'dfs',start:'A'}})),/bfs required/);
 assert.throws(()=>validateComposition(G([{visit:['A']}],{nodes:[{id:'A',at:[.2,.2],label:'Supercalifragilistic'},{id:'B',at:[.8,.8]}],edges:[['A','B']],algorithm:undefined})),/at most 10/);
});

test('arrays: Euclid states are verified step by step',()=>{
 const A=(values,steps,extra={})=>V2([{id:'a',type:'array',box:[.1,.6,.8,.36],values,algorithm:{name:'euclid'},steps,...extra}]);
 const L=layoutComposition(A([48,18],[{values:[18,12]},{values:[12,6]},{values:[6,0]}]));assert.deepEqual(L.items[0].array.algorithm,{name:'euclid',gcd:6,complete:true});
 assert.throws(()=>validateComposition(A([48,18],[{values:[18,10]}])),/\(48, 18\) must become \(18, 12\), not \(18, 10\)/);
 assert.throws(()=>validateComposition(A([6,0],[{values:[0,0]}])),/already ended/);
 assert.throws(()=>validateComposition(A([4.5,2],[{values:[2,0.5]}])),/non-negative integers/);
 assert.throws(()=>validateComposition(A([1,2,3],[{values:[1,2,3]}])),/exactly two values/);
 assert.throws(()=>validateComposition(A([1,2],[{values:[1]}],{algorithm:undefined})),/2 values required/);
 assert.throws(()=>validateComposition(A(Array(10).fill(123456),[{highlight:[0]}],{algorithm:undefined,box:[0,0,.3,.2]})),/do not fit|too small/);
});

test('drawing: array states and graph highlights follow the steps; equations draw their outlines',NEEDS_MJ,()=>{
 const texts=[];let fills=0;const ctx=new Proxy({},{get:(o,k)=>k==='measureText'?(s=>({width:s.length*10})):k in o?o[k]:(...a)=>{if(k==='fillText')texts.push(a[0]);if(k==='fill')fills++;},set:(o,k,v)=>{o[k]=v;return true;}});
 const c=V2([{id:'a',type:'array',box:[.1,.6,.8,.36],values:[48,18],algorithm:{name:'euclid'},steps:[{values:[18,12]},{values:[12,6]},{values:[6,0]}],start:0,end:1,reveal:'none'}]);
 const at=p=>{texts.length=0;drawComposition(ctx,c,p,900);return [...texts];};
 assert.deepEqual(at(.01),['48','18']);assert.deepEqual(at(.99),['6','0']);
 fills=0;drawComposition(ctx,V2([eq(B+'frac{1}{2}',{reveal:'none'})]),.5,300);assert.ok(fills>=3);
});

test('authored visuals: sentences define shots, cues become phrase indices, conflicts and unknown sentences are refused',NEEDS_MJ,async()=>{
 for(const n of ['pythagoras','euclid','bfs']){const r=await direct(fixture(n));
  assert.ok(r.project.shots.every(s=>s.assets.length===0&&s.composition.version==='compose-v2'));
  for(const s of r.project.shots)for(const x of s.composition.items)if(x.type==='equation')assert.equal(x.compiled.key,mathKey(x.tex));}
 const e=await direct(fixture('euclid'));assert.deepEqual(e.manifest.maths,{items:5,verified:5,notChecked:0});
 const b=await direct(fixture('bfs'));const g=b.project.shots.find(s=>s.composition.items.some(x=>x.type==='graph'));assert.equal(g.narration.length,4);assert.deepEqual(g.composition.items[0].phrases,[0,1,2,3]);
 const base=fixture('bfs'),vis=base.visuals[0];
 await assert.rejects(direct({...base,visuals:[{...vis,at:'We start at node Z.'}]}),/is not (one continuous part of )?a sentence of the script/);
 await assert.rejects(direct({...base,visuals:[vis,{at:'Finally we reach F, the farthest node.',composition:V2([{id:'k',type:'kinetic',box:[0,0,1,.4],text:'F'}])}]}),/overlap those of request.visuals\[0\]/);
 await assert.rejects(direct({...base,visuals:[{...vis,composition:{...vis.composition,items:[{...vis.composition.items[0],cues:['We start at node A.','not spoken here','x','y']}]}}]}),/is not a sentence of the script/);
 await assert.rejects(direct({...base,visuals:[{...vis,composition:V2([{id:'k',type:'kinetic',box:[0,0,1,.4],text:'A',cue:'We start at node A.',start:.2}])}]}),/use cue, phrase or start/);
 assert.throws(()=>request({version:1,id:'x',topic:'t',seconds:30,visuals:[vis]}),/visuals need request.content/);
 assert.throws(()=>request({...base,visuals:[{...vis,composition:{version:'compose-v1',region:'full',items:[]}}]}),/compose-v2 composition required/);
 await assert.rejects(direct({...base,script:undefined}),/add the script|is not a sentence/);
});

test('MathJax never reaches the browser bundles (Remotion entry and Studio page)',()=>{
 const root=new URL('..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),seen=new Set(),hits=[];
 const walk=f=>{if(seen.has(f))return;seen.add(f);let s;try{s=readFileSync(f,'utf8');}catch{return;}for(const m of s.matchAll(/(?:import|from)\s*['"]([^'"]+)['"]/g)){let t=m[1];if(t.startsWith('/'))t=join(root,t);else if(t.startsWith('.'))t=join(f,'..',t);else{if(/mathjax/i.test(t))hits.push(f+' imports '+t);continue;}if(/math-compile/.test(t))hits.push(f+' imports '+t);walk(t);}};
 walk(join(root,'src','index.jsx'));walk(join(root,'studio','app.js'));assert.deepEqual(hits,[]);assert.ok(seen.size>40);
});

test('MathJax loader: projects without equations never need it; uncompiled equations without it fail explicitly',()=>{
 const plain={version:2,shots:[{composition:V2([{id:'k',type:'kinetic',box:[0,0,1,.4],text:'Hi'}])}]};
 assert.equal(loaderCompile(plain),plain);
 const withEq={version:2,shots:[{composition:V2([{id:'e',type:'equation',box:[0,0,1,.3],tex:'x^2'}])}]};
 if(mathJaxAvailable())assert.equal(loaderCompile(withEq).shots[0].composition.items[0].compiled.key,mathKey('x^2'));
 else assert.throws(()=>loaderCompile(withEq),/not installed here; run npm install/);
});
