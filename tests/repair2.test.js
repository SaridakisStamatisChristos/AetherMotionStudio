// Second repair pass (second independent audit, 2026-11-26): TeX superscript semantics, pure-BigInt square roots,
// tick containment, one adaptive number formatter (layout = rendering), distinct pie colours. Drawing tests check
// rendered labels on intermediate and final frames.
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkArithmetic,mathKey} from '../src/core/math.js';
import {layoutComposition,validateComposition,THEMES,contrast} from '../src/core/composition.js';
import {chartNumber,tickLabel,SERIES_COLOURS} from '../src/core/charts.js';
import {drawComposition} from '../src/visual/draw-composition.js';
const B=String.fromCharCode(92);
const V2=(items,extra={})=>({version:'compose-v2',region:'full',font:'inter',items,...extra});
function recorder(){let alpha=1,fill='';const stack=[],ops=[];
 const ctx=new Proxy({},{get:(o,k)=>{if(k==='measureText')return s=>({width:s.length*10});if(k==='save')return ()=>stack.push(alpha);if(k==='restore')return ()=>{alpha=stack.pop()??1;};
  if(k==='globalAlpha')return alpha;if(k==='fillStyle')return fill;if(k in o)return o[k];
  return (...a)=>{if(['fillRect','fillText','fill'].includes(k))ops.push({op:k,a,alpha,fill});};},
  set:(o,k,v)=>{if(k==='globalAlpha')alpha=v;else if(k==='fillStyle')fill=v;else o[k]=v;return true;}});
 return {ctx,ops,texts:()=>ops.filter(o=>o.op==='fillText').map(o=>o.a[0]),reset:()=>{ops.length=0;}};}

test('1. exact checks follow TeX superscript semantics: unbraced superscripts are one token, ambiguity is refused',()=>{
 for(const t of ['2^12=4096','2^1 2=4096','2^-1=0.5','2^(3)=8','2^'+B+'frac{1}{2}=1','10^2.5=1'])assert.match(checkArithmetic(t).reason??'',/ambiguous superscript/,t);
 for(const t of ['2^{12}=4096','2^{-1}=0.5','3^2+4^2=25','10^2=100',B+'frac{2^{3}}{4}=2',B+'sqrt{3^{2}+4^{2}}=5'])assert.equal(checkArithmetic(t).status,'true',t);
 assert.equal(checkArithmetic('2^{12}=4095').status,'false');
 assert.throws(()=>validateComposition(V2([{id:'e',type:'equation',box:[0,0,1,.3],tex:'2^12=4096',check:'arithmetic',compiled:{key:mathKey('2^12=4096'),box:[0,0,10,10],paths:[{d:'M0 0',m:[1,0,0,1,0,0]}]}}])),/ambiguous superscript/);
});

test('2. square roots of large exact numbers use pure BigInt (no RangeError), perfect and imperfect squares',()=>{
 const big='1234567890123456789012345678901234567890';
 assert.equal(checkArithmetic(B+'sqrt{'+big+'^{9}}=1').reason,'an irrational square root');
 assert.equal(checkArithmetic(B+'sqrt{'+big+'^{8}}='+big+'^{4}').status,'true');
 assert.equal(checkArithmetic(B+'sqrt{'+big+'^{2}}='+big).status,'true');
 assert.equal(checkArithmetic(B+'sqrt{'+big+'^{2}+1}='+big).reason,'an irrational square root');
 assert.equal(checkArithmetic(B+'sqrt{'+big+'^{40}}='+big+'^{20}').status,'true');// 1600-digit radicand
 for(const n of ['99999999999999999999999999999999999999','1000000000000000000001','2','10']){
  assert.equal(checkArithmetic(B+'sqrt{'+n+'^{2}}='+n).status,'true',n);assert.equal(checkArithmetic(B+'sqrt{'+n+'^{2}-1}='+n).status==='true',false,n);}
 assert.equal(checkArithmetic(B+'sqrt{'+big+'^{64}}=1').reason,'numbers grow beyond 2000 digits');
});

test('3. every generated tick lies inside its declared range (charts and plots)',()=>{
 for(const y of [[0,1e-9],[0,1e-6],[-4e-10,8e-10],[100,200],[-1e12,1e12],[1,1.000001],[0,250]]){
  const L=layoutComposition(V2([{id:'c',type:'chart',kind:'line',box:[0,0,1,.6],categories:['a','b'],series:[{name:'s',values:y}],y}])).items[0].chart,tol=L.yStep*1e-6;
  assert.ok(L.yTicks.length>=2,String(y));for(const v of L.yTicks)assert.ok(v>=y[0]-tol&&v<=y[1]+tol,'tick '+v+' outside '+y);}
 for(const x of [[0,1e-6],[0,1e-9],[-2,3],[0.1,0.3]]){const P=layoutComposition(V2([{id:'p',type:'plot',box:[0,0,1,.8],x,y:[0,1],shapes:[{kind:'point',at:[x[0],0]}]}])).items[0].plot,tol=P.ticks.dx*1e-6;
  for(const t of P.ticks.x)assert.ok(t.v>=x[0]-tol&&t.v<=x[1]+tol,'plot tick '+t.v+' outside '+x);}
});

test('4. one adaptive formatter: distinct small values never read as zero; rendered labels equal measured labels',()=>{
 assert.deepEqual([1e-6,2e-6,3e-6].map(chartNumber),['1e-6','2e-6','3e-6']);
 assert.deepEqual([0,-0,120,1250.5,0.0015,1.5e11,-42].map(chartNumber),['0','0','120','1,250.5','0.0015','1.5e11','-42']);
 assert.deepEqual([0,2e-10,4e-10,6e-10].map(v=>tickLabel(v,2e-10)),['0','2e-10','4e-10','6e-10']);
 const R=recorder(),c=V2([{id:'c',type:'chart',kind:'bar',box:[0,0,1,.7],categories:['a','b','c'],series:[{name:'S',values:[1e-6,2e-6,3e-6]}],valueLabels:true,reveal:'none',start:0,end:1,steps:[{series:[{values:[2e-6,2e-6,4e-6]}]}]}]);
 const L=layoutComposition(c).items[0].chart;assert.equal(new Set(L.yLabels).size,L.yLabels.length,'tick labels distinct: '+L.yLabels);
 for(const p of [.2,.35+.0025,.95]){R.reset();drawComposition(R.ctx,c,p,3000);const t=R.texts();
  for(const s of L.yLabels)assert.ok(t.includes(s),'rendered tick label '+s+' at p='+p);
  const values=t.filter(s=>/e-6$/.test(s));assert.ok(values.length>=3,'value labels rendered in scientific form at p='+p+': '+t.join(','));assert.ok(!t.includes('0.000'));}
 R.reset();drawComposition(R.ctx,c,.35+.0025,3000);const mid=R.texts().filter(s=>/e-6$/.test(s)).sort();assert.deepEqual(mid,[...L.yLabels.filter(x=>/e-6$/.test(x)),'1e-6','2e-6','2e-6','3e-6','4e-6'].sort(),'mid-crossfade: tick labels plus only real values (1→2, 2 unchanged once, 3→4)');
 const pie=V2([{id:'p',type:'chart',kind:'pie',box:[0,.1,1,.6],categories:['a','b','c'],series:[{name:'S',values:[1e-6,2e-6,3e-6]}],reveal:'none'}]);R.reset();drawComposition(R.ctx,pie,.5,3000);
 assert.deepEqual(R.texts().sort(),['a  1e-6  17%','b  2e-6  33%','c  3e-6  50%']);
 const arr=V2([{id:'a',type:'array',box:[.1,.6,.8,.36],values:[1e-6,2e-6],reveal:'none',steps:[{highlight:[0]}]}]);R.reset();drawComposition(R.ctx,arr,.1,3000);assert.deepEqual(R.texts(),['1e-6','2e-6']);
});

test('5. every pie slice gets its own colour (six distinct, readable against the plates in both themes)',()=>{
 for(const [theme,cols] of Object.entries(SERIES_COLOURS)){assert.equal(new Set(cols).size,6,theme);
  for(const c of cols)assert.ok(contrast(c,THEMES[theme].neutral.fill)>=3,theme+' '+c+' '+contrast(c,THEMES[theme].neutral.fill).toFixed(2));}
 for(const theme of ['aether-v1','paper-v1']){const R=recorder(),c=V2([{id:'p',type:'chart',kind:'pie',box:[0,0,1,.8],categories:['a','b','c','d','e','f'],series:[{name:'S',values:[1,2,3,4,5,6]}],reveal:'none'}],{theme});
  R.reset();drawComposition(R.ctx,c,.5,3000);const slices=R.ops.filter(o=>o.op==='fill').map(o=>o.fill).filter(f=>SERIES_COLOURS[theme].includes(f));
  assert.equal(new Set(slices).size,6,theme+' slices: '+slices.join(','));}
});
