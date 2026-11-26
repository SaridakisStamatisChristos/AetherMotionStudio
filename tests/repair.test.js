// Repair pass (independent adversarial audit, 2026-11-26): one regression test per confirmed defect. Drawing tests
// check intermediate animation frames as well as final states.
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkArithmetic,mathKey} from '../src/core/math.js';
import {exactEquality} from '../src/core/exact.js';
import {parseExpr} from '../src/core/expr.js';
import {layoutComposition,validateComposition} from '../src/core/composition.js';
import {niceRange} from '../src/core/charts.js';
import {drawComposition} from '../src/visual/draw-composition.js';
import {compileProjectMath as boundary,mathJaxAvailable} from '../src/director/math-loader.js';
const B=String.fromCharCode(92);
const V2=(items,extra={})=>({version:'compose-v2',region:'full',font:'inter',items,...extra});
const bad=(c,re)=>assert.throws(()=>validateComposition(c),re);
// Recording canvas: tracks globalAlpha through save/restore and records fills, texts, arcs and clips.
function recorder(){let alpha=1,fill='',clip=null;const stack=[],ops=[];
 const ctx=new Proxy({},{get:(o,k)=>{
  if(k==='measureText')return s=>({width:s.length*10});
  if(k==='save')return ()=>stack.push([alpha,clip]);if(k==='restore')return ()=>{[alpha,clip]=stack.pop()??[1,null];};
  if(k==='globalAlpha')return alpha;if(k==='fillStyle')return fill;
  if(k==='rect')return (x,y,w,h)=>{o._rect=[x,y,w,h];};if(k==='clip')return ()=>{clip=o._rect;};
  if(k in o)return o[k];
  return (...a)=>{if(['fillRect','fillText','arc'].includes(k))ops.push({op:k,a,alpha,fill,clip});};},
  set:(o,k,v)=>{if(k==='globalAlpha')alpha=v;else if(k==='fillStyle')fill=v;else o[k]=v;return true;}});
 return {ctx,ops,reset:()=>{ops.length=0;}};}

test('1. arithmetic checks are exact: near-equal large, tiny and 2^53-adjacent numbers are false',()=>{
 for(const t of ['1000000000 = 1000000001','1/10000000000 = 0','9007199254740992 = 9007199254740993'])assert.equal(checkArithmetic(t).status,'false',t);
 assert.deepEqual(exactEquality(['9007199254740992','9007199254740993']).values,['9007199254740992','9007199254740993']);
 for(const t of ['0.1+0.2=0.3',B+'frac{1}{3}+'+B+'frac{1}{6}='+B+'frac{1}{2}','2^{10}=1024',B+'sqrt{144}=12',B+'gcd(48,18)=6','(-3)^2=9','10/4=2.5'])assert.equal(checkArithmetic(t).status,'true',t);
 for(const [t,re] of [[B+'sqrt{2}=1.41421356',/irrational/],['2^{65}=36893488147419103232',/exponent larger than 64/],['1/0=1/0',/division by zero/],['2^{0.5}=1',/non-integer exponent/],['x=1',/not plain arithmetic/],[B+'gcd(1.5,3)=1.5',/gcd of non-integers/],['1'.repeat(41)+'=1',/longer than 40 digits/],['('.repeat(30)+'1'+')'.repeat(30)+'=1',/nested deeper/]])assert.match(checkArithmetic(t).reason??'',re,t);
 assert.throws(()=>validateComposition(V2([{id:'e',type:'equation',box:[0,0,1,.3],tex:'1000000000 = 1000000001',compiled:{key:mathKey('1000000000 = 1000000001'),box:[0,0,10,10],paths:[{d:'M0 0',m:[1,0,0,1,0,0]}]},check:'arithmetic'}])),/sides evaluate to 1000000000 vs 1000000001/);
});

const lineAt=(extra={})=>V2([{id:'c',type:'chart',kind:'line',box:[0,0,1,.7],categories:['a','b','c'],series:[{name:'S',values:[150,180,120]}],y:[100,200],start:0,end:1,...extra}]);
test('2. the opening reveal never moves data: every drawn point sits at its true coordinate, also mid-reveal',()=>{
 const R=recorder(),c=lineAt(),L=layoutComposition(c).items[0].chart,A=L.area,yOf=v=>A.y+(L.Y[1]-v)*L.sy,truth=[150,180,120].map(yOf);
 for(const p of [.002,.004,.006,.5]){R.reset();drawComposition(R.ctx,c,p,3000);const pts=R.ops.filter(o=>o.op==='arc'&&o.a[2]===6);
  assert.equal(pts.length,3,'all points drawn at '+p);pts.forEach((o,i)=>{assert.ok(Math.abs(o.a[1]-truth[i])<1e-9,'point '+i+' at p='+p+' y='+o.a[1]+' truth '+truth[i]);assert.ok(o.a[1]>=A.y-1e-9&&o.a[1]<=A.y+A.h+1e-9,'inside the axis range');});}
 R.reset();drawComposition(R.ctx,c,.002,3000);const clip=R.ops.find(o=>o.op==='arc').clip;assert.ok(clip&&clip[2]<A.w*.6,'a partial wipe reveals the series during the opening');
});

test('3. degenerate axes are refused; every accepted range has finite scales and increasing ticks',()=>{
 for(const [a,b,re] of [[5e-324,1e-323,/less than 1e-9/],[1,1+1e-15,/less than 1e-9/],[1e11,1e11+1e-4,/one part in a billion/],[NaN,1,/finite data/]])assert.throws(()=>niceRange(a,b,false),re);
 bad(V2([{id:'c',type:'chart',kind:'line',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:[5e-324,1e-323]}]}]),/too small to chart reliably/);
 bad(V2([{id:'c',type:'chart',kind:'line',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:[1e11,1e11+1e-4]}]}]),/one part in a billion/);
 bad(V2([{id:'c',type:'chart',kind:'line',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:[1,2]}],y:[1,1+1e-12]}]),/less than 1e-9|outside/);
 bad(V2([{id:'p',type:'plot',box:[0,0,1,.8],x:[1e5,1e5+1e-5],y:[0,1],shapes:[{kind:'point',at:[1e5,0]}]}]),/one part in a billion/);
 for(const [lo,hi] of [[0,1e-6],[-1e12,1e12],[999999,1000001],[-0.003,0.002]]){const L=layoutComposition(V2([{id:'c',type:'chart',kind:'line',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:[lo,hi]}]}])).items[0].chart;
  assert.ok(Number.isFinite(L.sy)&&L.sy>0,lo+'..'+hi);assert.ok(L.yTicks.length>=2&&L.yTicks.every((v,i)=>Number.isFinite(v)&&(!i||v>L.yTicks[i-1])),lo+'..'+hi);}
});

test('4. CSV and JSON categories follow one rule (duplicates, count, length)',()=>{
 const csv=rows=>V2([{id:'c',type:'chart',kind:'bar',box:[0,0,1,.6],csv:'Day,S\n'+rows}]),json=cats=>V2([{id:'c',type:'chart',kind:'bar',box:[0,0,1,.6],categories:cats,series:[{name:'S',values:cats.map(()=>1)}]}]);
 bad(csv('Mon,1\nMon,2'),/duplicate category "Mon"/);bad(json(['Mon','Mon']),/duplicate category "Mon"/);
 bad(csv(Array.from({length:13},(_,i)=>'d'+i+',1').join('\n')),/2–12 categories/);bad(json(Array.from({length:13},(_,i)=>'d'+i)),/2–12 categories/);
 bad(csv('A very long day name,1\nB,2'),/at most 14 characters/);bad(json(['A very long day name','B']),/at most 14 characters/);
});

test('5. scatter and pie annotations give a validation error, not a TypeError',()=>{
 const sc={id:'c',type:'chart',kind:'scatter',box:[0,0,1,.6],series:[{name:'s',points:[[1,1],[2,2]]}],annotations:[{category:'x',text:'hi'}]};
 let err;try{validateComposition(V2([sc]));}catch(e){err=e;}assert.ok(err&&!(err instanceof TypeError),'not a TypeError');assert.match(err.message,/scatter charts take no annotations/);
 bad(V2([{id:'p',type:'chart',kind:'pie',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:[1,2]}],annotations:[{category:'a',text:'x'}]}]),/pie charts take no annotations/);
 bad(V2([{id:'c',type:'chart',kind:'bar',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:[1,2]}],annotations:[{category:'a',at:[0,0],text:'x'}]}]),/not at coordinates/);
});

test('6. the production boundary regenerates equation outlines; supplied geometry with a matching key is not trusted',{skip:mathJaxAvailable()?false:'MathJax not installed; run npm install'},()=>{
 const tex='a^2+b^2=c^2',forged={key:mathKey(tex),box:[0,0,100,100],paths:[{d:'M0 0H100V100H0Z',m:[1,0,0,1,0,0]}]};
 const project={version:2,shots:[{composition:V2([{id:'e',type:'equation',box:[0,0,1,.3],tex,compiled:forged}])}]};
 const out=boundary(project).shots[0].composition.items[0].compiled;
 assert.notDeepEqual(out.paths,forged.paths);assert.equal(out.key,mathKey(tex));assert.ok(out.paths.length>3);
 assert.deepEqual(boundary(project),boundary(project),'deterministic');
});

const step=(series,extra={})=>V2([{id:'c',type:'chart',kind:'bar',box:[0,0,1,.7],categories:['a','b'],series:[{name:'S',values:series[0]}],y:[0,200],valueLabels:true,reveal:'none',start:0,end:1,steps:[{series:[{values:series[1]}]}],...extra}]);
// pairs each bar with the value label drawn right after it (same layer); returns {value,height,alpha,text}
function bars(R,c,p){R.reset();drawComposition(R.ctx,c,p,3000);const out=[];R.ops.forEach((o,i)=>{if(o.op==='fillRect'&&o.a[3]>0&&o.a[2]>20){const lab=R.ops[i+1];out.push({h:o.a[3],alpha:o.alpha,text:lab?.op==='fillText'?lab.a[0]:null,labelAlpha:lab?.alpha});}});return out;}
test('7. value labels and pie labels always agree with the geometry drawn with them (mid-transition and final)',()=>{
 const R=recorder(),c=step([[100,50],[200,50]]),L=layoutComposition(c).items[0].chart,h=v=>v*L.sy,s0=.7*1/2;
 for(const p of [.2,s0+.001,s0+.0025,s0+.004,.95])for(const b of bars(R,c,p)){assert.ok(b.text!==null);assert.ok(Math.abs(b.h-h(Number(b.text)))<1e-6,'label '+b.text+' drawn with a bar of height '+b.h+' at p='+p);assert.equal(b.alpha,b.labelAlpha);}
 const mid=bars(R,c,s0+.0025).map(b=>b.text).sort();assert.deepEqual(mid,['100','200','50'],'mid-transition shows only real states: 100 and 200 crossfade, 50 stays');
 const pie={id:'p',type:'chart',kind:'pie',box:[0,.1,1,.6],categories:['A','B'],series:[{name:'S',values:[1,3]}],reveal:'none',start:0,end:1,steps:[{series:[{values:[3,1]}]}]};
 R.reset();drawComposition(R.ctx,V2([pie]),s0+.0025,3000);const rows=R.ops.filter(o=>o.op==='fillText').map(o=>o.a[0]);
 for(const r of rows){const m=/^(A|B)  (\d+)  (\d+)%$/.exec(r);assert.ok(m,r);const v=Number(m[2]),pct=Number(m[3]);assert.equal(pct,v===1?25:75,'percent matches its own state: '+r);}
 assert.deepEqual(rows.sort(),['A  1  25%','A  3  75%','B  1  25%','B  3  75%']);
});

test('8. missing-value transitions crossfade the "no data" mark and the real bar; no invented values',()=>{
 const R=recorder(),c=step([[null,50],[120,50]]),L=layoutComposition(c).items[0].chart,s0=.7*1/2;
 const at=p=>{R.reset();drawComposition(R.ctx,c,p,3000);return R.ops;};
 let ops=at(.2);assert.ok(ops.some(o=>o.op==='fillText'&&o.a[0]==='no data'&&o.alpha===1));
 ops=at(s0+.0025);const nd=ops.find(o=>o.op==='fillText'&&o.a[0]==='no data'),bar=ops.find(o=>o.op==='fillRect'&&Math.abs(o.a[3]-120*L.sy)<1e-6);
 assert.ok(nd&&nd.alpha>0&&nd.alpha<1,'no-data mark fading out');assert.ok(bar&&bar.alpha>0&&bar.alpha<1,'the real 120 bar fading in at its true height');
 assert.ok(!ops.some(o=>o.op==='fillRect'&&o.a[2]>20&&o.a[3]>0&&![120,50].some(v=>Math.abs(o.a[3]-v*L.sy)<1e-6)),'no bar of any other height');
 ops=at(.95);assert.ok(!ops.some(o=>o.op==='fillText'&&o.a[0]==='no data'));assert.ok(ops.some(o=>o.op==='fillRect'&&Math.abs(o.a[3]-120*L.sy)<1e-6&&o.alpha===1));
 const back=step([[120,50],[null,50]]);R.reset();drawComposition(R.ctx,back,.95,3000);assert.ok(R.ops.some(o=>o.op==='fillText'&&o.a[0]==='no data'&&o.alpha===1));
 const line=V2([{id:'l',type:'chart',kind:'line',box:[0,0,1,.7],categories:['a','b','c'],series:[{name:'S',values:[100,null,120]}],y:[0,200],reveal:'none',start:0,end:1,steps:[{series:[{values:[100,140,120]}]}]}]);
 R.reset();drawComposition(R.ctx,line,s0+.0025,3000);const ys=R.ops.filter(o=>o.op==='arc'&&o.a[2]===6).map(o=>Math.round(o.a[1]));
 const Ll=layoutComposition(line).items[0].chart,yOf=v=>Math.round(Ll.area.y+(Ll.Y[1]-v)*Ll.sy);assert.ok(ys.every(y=>[100,140,120].map(yOf).includes(y)),'line points only at real values');
});

test('9. tolerances are relative to the range, depth is enforced everywhere, sizes are checked before work',()=>{
 bad(V2([{id:'p',type:'plot',box:[0,0,1,.8],x:[0,1e-6],y:[0,1e-6],shapes:[{kind:'point',at:[5e-6,0]}]}]),/outside the plot range/);
 validateComposition(V2([{id:'p',type:'plot',box:[0,0,1,.8],x:[0,1e-6],y:[0,1e-6],shapes:[{kind:'point',at:[1e-6,0]}]}]));
 bad(V2([{id:'c',type:'chart',kind:'line',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:[1e-6,2.0000001e-6]}],y:[1e-6,2e-6]}]),/lies outside/);
 for(const s of ['-'.repeat(30)+'1',Array(30).fill('2').join('^'),'+'.repeat(30)+'1'])assert.throws(()=>parseExpr(s),/nesting deeper than 24/,s.slice(0,12));
 const junk=Array(1000).fill(42);
 bad(V2([{id:'c',type:'chart',kind:'bar',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:[1,2]}],steps:junk}]),/at most 12 steps/);
 bad(V2([{id:'c',type:'chart',kind:'bar',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:[1,2]}],annotations:junk}]),/at most 4/);
 bad(V2([{id:'k',type:'kinetic',box:[0,0,1,.4],text:'\u0007'.repeat(5000)}]),/printable text required/);
});

test('found in validation stills: charts and arrays show their initial state before their first cued step',()=>{
 const R=recorder();
 const c=V2([{id:'c',type:'chart',kind:'bar',box:[0,0,1,.7],categories:['a','b'],series:[{name:'S',values:[100,50]}],y:[0,200],valueLabels:true,phrases:[2],steps:[{series:[{values:[200,50]}]}]}]);
 const phrases=[[0,.3],[.3,.6],[.6,1]];R.reset();drawComposition(R.ctx,c,.4,3000,phrases);
 const texts=R.ops.filter(o=>o.op==='fillText').map(o=>o.a[0]);const n200=texts.filter(t=>t==='200').length,n100=texts.filter(t=>t==='100').length;assert.equal(n200,1,'only the axis tick says 200 before the cue: '+texts.join(','));assert.equal(n100,2,'the 100 value label (plus the tick) is on screen');
 R.reset();drawComposition(R.ctx,c,.95,3000,phrases);assert.ok(R.ops.some(o=>o.op==='fillText'&&o.a[0]==='200'&&o.alpha===1),'final state after the cue');
 const arr=V2([{id:'a',type:'array',box:[.1,.6,.8,.36],values:[48,18],algorithm:{name:'euclid'},phrases:[2],steps:[{values:[18,12]}]}]);
 R.reset();drawComposition(R.ctx,arr,.4,3000,phrases);const t2=R.ops.filter(o=>o.op==='fillText').map(o=>o.a[0]);assert.deepEqual(t2,['48','18']);
});
