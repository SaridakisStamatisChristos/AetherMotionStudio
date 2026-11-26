// DUAL-03 maths, geometry and algorithm items for compose-v2 (validation and deterministic layout; drawing in
// src/visual/draw-diagrams.js). Items:
// - equation: allowlisted TeX compiled to outlines in Node (src/core/math.js, src/director/math-compile.js); optional
//   check 'arithmetic' (every side of = must evaluate equal, else rejected; unverifiable is rejected when asked);
// - plot: axes, ticks and grid over explicit x/y ranges, with points, segments, vectors, circles, polygons, labels and
//   functions (bounded expression parser, never eval). Nothing may fall outside the ranges unless `clip` is set for
//   a function; shapes appear step by step;
// - graph: nodes, edges (directed or not) and step highlights; optional algorithm 'bfs' whose visit order is checked;
// - array: a row of values with step states and highlights; optional algorithm 'euclid' whose states are checked.
// Authored data is authoritative: checks reject wrong claims, they never correct them.
import {parseExpr} from './expr.js';
import {validateTex,validateCompiled,checkArithmetic} from './math.js';
export const SHAPES_2D=Object.freeze(['point','segment','vector','circle','polygon','function','label']);
const fail=(p,m)=>{throw Error(p+': '+m)};
const num=(v,p,lim=1e6)=>{if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>lim)fail(p,'finite number within ±'+lim+' required');return v;};
const pair=(v,p)=>{if(!Array.isArray(v)||v.length!==2)fail(p,'[x,y] required');return [num(v[0],p+'[0]'),num(v[1],p+'[1]')];};
const text=(v,p,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(v))fail(p,'printable text of at most '+max+' characters required');return v.trim();};
const only=(x,keys,p)=>{for(const k of Object.keys(x))if(!keys.includes(k))fail(p+'.'+k,'unknown field');};
const fitSize=(sizes,ok)=>sizes.find(ok)??null;
// Step timing shared by plot, graph and array: `phrases` (one narration phrase per step, never backwards) or an even
// spread over the first 70 % of the item window. Returns validated phrase list or null.
function stepPhrases(x,count,p,phraseOk){if(x.phrases===undefined)return null;if(!Array.isArray(x.phrases)||x.phrases.length!==count)fail(p+'.phrases','one phrase index per step ('+count+') required');x.phrases.forEach((k,j)=>{phraseOk(k,p+'.phrases['+j+']');if(j&&k<x.phrases[j-1])fail(p+'.phrases','must not go backwards');});return [...x.phrases];}
export function layoutEquation(x,b,p,{measure}){
 validateTex(x.tex,p+'.tex');validateCompiled(x.compiled,x.tex,p+'.compiled');
 if(x.check!==undefined&&x.check!=='arithmetic')fail(p+'.check','arithmetic or absent');
 let check=null;if(x.check==='arithmetic'){check=checkArithmetic(x.tex);if(check.status==='false')fail(p+'.tex','the equation is false: its sides evaluate to '+check.values.map(v=>Number(v.toPrecision(10))).join(' vs '));if(check.status!=='true')fail(p+'.tex','cannot be checked arithmetically ('+check.reason+'); remove check or write plain arithmetic');}
 const pad=18,[,,w,h]=x.compiled.box,size=fitSize([72,64,56,48,44,40,36,32,28,24],s=>w*s/1000<=b.w-2*pad&&h*s/1000<=b.h-2*pad);
 if(!size)fail(p,'equation overflow: at 24 px per em it needs '+Math.round(w*24/1000)+'×'+Math.round(h*24/1000)+' px but the box offers '+Math.round(b.w-2*pad)+'×'+Math.round(b.h-2*pad)+'; enlarge the box or shorten the formula');
 return {equation:{size,scale:size/1000,width:w*size/1000,height:h*size/1000,check:check?.status??'not-requested'}};
}
// Nice tick step (1, 2 or 5 × 10^k) giving about 4–7 ticks.
export function tickStep(span){const raw=span/5,k=10**Math.floor(Math.log10(raw)),f=raw/k;return (f<1.5?1:f<3.5?2:f<7.5?5:10)*k;}
function ticks(a,b){const s=tickStep(b-a),out=[];for(let v=Math.ceil(a/s-1e-9)*s;v<=b+1e-9&&out.length<12;v+=s)out.push(Math.round(v/s)*s);return {step:s,values:out};}
export function layoutPlot(x,b,p,{measure,phraseOk}){
 only(x,['id','type','box','start','end','reveal','phrase','phrases','x','y','equal','grid','axes','xLabel','yLabel','shapes','tone','font','weight','align','emphasis','clip'],p);
 const X=pair(x.x,p+'.x'),Y=pair(x.y,p+'.y');if(X[0]>=X[1]||Y[0]>=Y[1])fail(p,'ranges must increase');
 for(const k of ['equal','grid','axes','clip'])if(x[k]!==undefined&&typeof x[k]!=='boolean')fail(p+'.'+k,'true or false required');
 const lx=x.xLabel!==undefined?text(x.xLabel,p+'.xLabel',12):null,ly=x.yLabel!==undefined?text(x.yLabel,p+'.yLabel',12):null;
 if(!Array.isArray(x.shapes)||x.shapes.length<1||x.shapes.length>24)fail(p+'.shapes','1–24 shapes required');
 const pad=30,bottom=lx?34:24,inner={x:b.x+pad+(ly?18:10),y:b.y+pad,w:b.w-2*pad-(ly?18:10),h:b.h-pad-bottom-8};
 if(inner.w<80||inner.h<80)fail(p+'.box','too small for a plot (needs at least 140×140 px)');
 let sx=inner.w/(X[1]-X[0]),sy=inner.h/(Y[1]-Y[0]),ox=inner.x,oy=inner.y;
 if(x.equal){const s=Math.min(sx,sy);ox+=(inner.w-s*(X[1]-X[0]))/2;oy+=(inner.h-s*(Y[1]-Y[0]))/2;sx=sy=s;}
 const map=([u,v])=>[ox+(u-X[0])*sx,oy+(Y[1]-v)*sy],inside=([u,v],q)=>{if(u<X[0]-1e-9||u>X[1]+1e-9||v<Y[0]-1e-9||v>Y[1]+1e-9)fail(q,'('+u+', '+v+') lies outside the plot range; widen x/y rather than clip');};
 let maxStep=0;
 const shapes=x.shapes.map((s,i)=>{const q=p+'.shapes['+i+']';if(!s||typeof s!=='object'||!SHAPES_2D.includes(s.kind))fail(q+'.kind','one of '+SHAPES_2D.join(', ')+' required');
  const keys={point:['at','label'],segment:['from','to','label'],vector:['from','to','label'],circle:['center','r','label'],polygon:['points','label'],function:['expr','domain','label'],label:['at','text']}[s.kind];
  only(s,['kind','step','tone',...keys],q);
  if(s.step!==undefined&&(!Number.isSafeInteger(s.step)||s.step<0||s.step>15))fail(q+'.step','0–15 required');maxStep=Math.max(maxStep,s.step??0);
  if(s.tone!==undefined&&!['mark','text','sub'].includes(s.tone))fail(q+'.tone','mark, text or sub required');
  const out={kind:s.kind,step:s.step??0,tone:s.tone??(s.kind==='label'?'text':'mark')};
  const lab=s.label!==undefined?text(s.label,q+'.label',24):null;
  if(s.kind==='point'){const a=pair(s.at,q+'.at');inside(a,q+'.at');out.at=map(a);out.label=lab;}
  if(s.kind==='label'){const a=pair(s.at,q+'.at');inside(a,q+'.at');out.at=map(a);out.label=text(s.text,q+'.text',32);}
  if(s.kind==='segment'||s.kind==='vector'){const a=pair(s.from,q+'.from'),c=pair(s.to,q+'.to');inside(a,q+'.from');inside(c,q+'.to');if(a[0]===c[0]&&a[1]===c[1])fail(q,'zero length');out.from=map(a);out.to=map(c);out.label=lab;}
  if(s.kind==='circle'){const c=pair(s.center,q+'.center'),r=num(s.r,q+'.r');if(r<=0)fail(q+'.r','positive radius required');inside([c[0]-r,c[1]-r],q+' (circle)');inside([c[0]+r,c[1]+r],q+' (circle)');if(!x.equal)fail(q,'circles need equal:true so they stay round');out.center=map(c);out.r=r*sx;out.label=lab;}
  if(s.kind==='polygon'){if(!Array.isArray(s.points)||s.points.length<3||s.points.length>12)fail(q+'.points','3–12 points required');out.points=s.points.map((v,j)=>{const a=pair(v,q+'.points['+j+']');inside(a,q+'.points['+j+']');return map(a);});out.label=lab;}
  if(s.kind==='function'){const f=parseExpr(s.expr,q+'.expr');if(!f.usesX)fail(q+'.expr','a function of x required');const D=s.domain!==undefined?pair(s.domain,q+'.domain'):X;if(D[0]>=D[1]||D[0]<X[0]||D[1]>X[1])fail(q+'.domain','an increasing range inside x required');
   const n=200,runs=[];let cur=null,finite=0,outside=0;
   for(let k=0;k<=n;k++){const u=D[0]+(D[1]-D[0])*k/n,v=f.eval(u);if(!Number.isFinite(v)){cur=null;continue;}finite++;if(v<Y[0]-1e-9||v>Y[1]+1e-9){outside++;if(x.clip){cur=null;continue;}}if(!cur){cur=[];runs.push(cur);}cur.push(map([u,Math.min(Y[1],Math.max(Y[0],v))]));}
   if(finite<n*.5)fail(q+'.expr','fewer than half of the samples are finite numbers');
   if(outside&&!x.clip)fail(q+'.expr',outside+' of '+(n+1)+' samples fall outside y; widen y or set clip:true (the clipped parts are then left out, not flattened)');
   out.runs=runs;out.label=lab;}
  if(out.label){const m=measure(out.label,30);if(m>b.w-2*pad)fail(q+'.label','label wider than the plot');}
  return out;});
 const tx=x.axes===false?null:ticks(X[0],X[1]),ty=x.axes===false?null:ticks(Y[0],Y[1]);
 return {plot:{inner,map:null,X,Y,sx,sy,ox,oy,axes:x.axes!==false,grid:x.grid===true,ticks:{x:tx?.values.map(v=>({v,at:map([v,Y[0]])[0]}))??[],y:ty?.values.map(v=>({v,at:map([X[0],v])[1]}))??[],dx:tx?.step,dy:ty?.step},origin:map([Math.min(Math.max(0,X[0]),X[1]),Math.min(Math.max(0,Y[0]),Y[1])]),xLabel:lx,yLabel:ly,shapes,steps:maxStep+1,phrases:stepPhrases(x,maxStep+1,p,phraseOk)}};
}
// Breadth-first visit order from `start`; neighbours in the order the edges are listed (both directions unless directed).
export function bfsOrder(nodes,edges,directed,start){const adj=new Map(nodes.map(n=>[n,[]]));for(const [a,c] of edges){adj.get(a).push(c);if(!directed)adj.get(c).push(a);}
 const seen=new Set([start]),order=[start],queue=[start];while(queue.length){const u=queue.shift();for(const v of adj.get(u))if(!seen.has(v)){seen.add(v);order.push(v);queue.push(v);}}return order;}
export function layoutGraph(x,b,p,{measure,phraseOk}){
 only(x,['id','type','box','start','end','reveal','phrase','phrases','nodes','edges','directed','steps','algorithm','tone','font','weight','align','emphasis'],p);
 if(!Array.isArray(x.nodes)||x.nodes.length<2||x.nodes.length>12)fail(p+'.nodes','2–12 nodes required');
 const notes=Array.isArray(x.steps)&&x.steps.some(s=>s?.note!==undefined),pad=20,area={x:b.x+pad,y:b.y+pad,w:b.w-2*pad,h:b.h-2*pad-(notes?44:0)};
 const r=Math.max(18,Math.min(34,Math.min(area.w,area.h)*.07)),ids=new Map();
 const nodes=x.nodes.map((n,i)=>{const q=p+'.nodes['+i+']';if(!n||typeof n!=='object')fail(q,'object required');only(n,['id','label','at'],q);if(typeof n.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,11}$/i.test(n.id)||ids.has(n.id))fail(q+'.id','unique short ID required');
  const at=pair(n.at,q+'.at');if(at.some(v=>v<0||v>1))fail(q+'.at','0–1 inside the item box required');const label=text(n.label??n.id,q+'.label',10);
  const size=fitSize([26,24,22,20,18,16],s=>measure(label,s)<=2*r-6);if(!size)fail(q+'.label','"'+label+'" does not fit its node circle');
  const c=[area.x+r+at[0]*(area.w-2*r),area.y+r+at[1]*(area.h-2*r)];const node={id:n.id,label,size,c};ids.set(n.id,node);return node;});
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(Math.hypot(nodes[i].c[0]-nodes[j].c[0],nodes[i].c[1]-nodes[j].c[1])<2*r+8)fail(p+'.nodes','nodes '+nodes[i].id+' and '+nodes[j].id+' overlap; move them apart');
 if(x.directed!==undefined&&typeof x.directed!=='boolean')fail(p+'.directed','true or false required');
 if(!Array.isArray(x.edges)||x.edges.length<1||x.edges.length>24)fail(p+'.edges','1–24 edges required');const seen=new Set();
 const edges=x.edges.map((e,i)=>{const q=p+'.edges['+i+']';if(!Array.isArray(e)||e.length!==2||!ids.has(e[0])||!ids.has(e[1]))fail(q,'[from,to] node IDs required');if(e[0]===e[1])fail(q,'no self-loops');const k=x.directed?e.join('>'):[...e].sort().join('-');if(seen.has(k))fail(q,'duplicate edge');seen.add(k);return [e[0],e[1]];});
 const key=(a,c)=>x.directed?a+'>'+c:[a,c].sort().join('-');
 if(!Array.isArray(x.steps)||x.steps.length<1||x.steps.length>16)fail(p+'.steps','1–16 steps required');
 const steps=x.steps.map((s,i)=>{const q=p+'.steps['+i+']';if(!s||typeof s!=='object')fail(q,'object required');only(s,['visit','edges','note'],q);
  const visit=(s.visit??[]).map((v,j)=>{if(!ids.has(v))fail(q+'.visit['+j+']','unknown node');return v;});
  const es=(s.edges??[]).map((e,j)=>{if(!Array.isArray(e)||e.length!==2||!seen.has(key(e[0],e[1])))fail(q+'.edges['+j+']','an existing edge required');return key(e[0],e[1]);});
  const note=s.note!==undefined?text(s.note,q+'.note',48):null;if(note&&measure(note,30)>area.w)fail(q+'.note','note wider than the diagram');return {visit,edges:es,note};});
 let algorithm=null;
 if(x.algorithm!==undefined){only(x.algorithm,['name','start'],p+'.algorithm');if(x.algorithm.name!=='bfs')fail(p+'.algorithm.name','bfs required');if(!ids.has(x.algorithm.start))fail(p+'.algorithm.start','a node ID required');
  const expected=bfsOrder(nodes.map(n=>n.id),edges,!!x.directed,x.algorithm.start),claimed=steps.flatMap(s=>s.visit);
  if(new Set(claimed).size!==claimed.length)fail(p+'.steps','a node is visited twice');
  if(claimed.some((v,i)=>v!==expected[i]))fail(p+'.steps','visit order '+claimed.join(' ')+' is not breadth-first from '+x.algorithm.start+' (expected '+expected.slice(0,claimed.length).join(' ')+' with neighbours in edge order)');
  algorithm={name:'bfs',start:x.algorithm.start,order:expected,complete:claimed.length===expected.length};}
 return {graph:{r,nodes,edges:edges.map(([a,c])=>({a:ids.get(a).c,c:ids.get(c).c,key:key(a,c)})),directed:!!x.directed,steps,area,algorithm,phrases:stepPhrases(x,steps.length,p,phraseOk)}};
}
export function layoutArray(x,b,p,{measure,format,phraseOk}){
 only(x,['id','type','box','start','end','reveal','phrase','phrases','values','steps','algorithm','tone','font','weight','align','emphasis'],p);
 if(!Array.isArray(x.values)||x.values.length<2||x.values.length>10)fail(p+'.values','2–10 values required');
 const first=x.values.map((v,i)=>num(v,p+'.values['+i+']'));
 if(!Array.isArray(x.steps)||x.steps.length<1||x.steps.length>16)fail(p+'.steps','1–16 steps required');
 const states=[first],steps=x.steps.map((s,i)=>{const q=p+'.steps['+i+']';if(!s||typeof s!=='object')fail(q,'object required');only(s,['values','highlight','note'],q);
  const values=s.values!==undefined?(Array.isArray(s.values)&&s.values.length===first.length?s.values.map((v,j)=>num(v,q+'.values['+j+']')):fail(q+'.values',first.length+' values required')):states.at(-1);states.push(values);
  const highlight=(s.highlight??[]).map((k,j)=>{if(!Number.isSafeInteger(k)||k<0||k>=first.length)fail(q+'.highlight['+j+']','a cell index required');return k;});
  const note=s.note!==undefined?text(s.note,q+'.note',48):null;return {values,highlight,note};});
 let algorithm=null;
 if(x.algorithm!==undefined){only(x.algorithm,['name'],p+'.algorithm');if(x.algorithm.name!=='euclid')fail(p+'.algorithm.name','euclid required');if(first.length!==2)fail(p+'.values','euclid needs exactly two values');
  for(const [i,[a,c]] of states.entries())if(!Number.isSafeInteger(a)||!Number.isSafeInteger(c)||a<0||c<0)fail(p+(i?'.steps['+(i-1)+'].values':'.values'),'non-negative integers required');
  for(let i=1;i<states.length;i++){const [a,c]=states[i-1],[a2,c2]=states[i];if(c===0)fail(p+'.steps['+(i-1)+']','the algorithm already ended (second value 0)');if(a2!==c||c2!==a%c)fail(p+'.steps['+(i-1)+'].values','('+a+', '+c+') must become ('+c+', '+(a%c)+'), not ('+a2+', '+c2+')');}
  const last=states.at(-1);algorithm={name:'euclid',gcd:last[1]===0?last[0]:null,complete:last[1]===0};}
 const notes=steps.some(s=>s.note),pad=20,cell=(b.w-2*pad)/first.length,ch=Math.min(b.h-2*pad-(notes?44:0),cell*1.1);
 if(ch<40)fail(p+'.box','too small for '+first.length+' cells');
 const strings=states.flatMap(s=>s.map(v=>format(v))),size=fitSize([48,44,40,36,32,28,24,20,18],s=>strings.every(t=>measure(t,s)<=cell-14)&&s*1.3<=ch);
 if(!size)fail(p,'values do not fit their cells; use fewer values or a wider box');
 return {array:{cell,ch,top:b.y+pad,left:b.x+pad,size,steps,first,algorithm,notes,strings:states.map(s=>s.map(v=>format(v))),phrases:stepPhrases(x,steps.length,p,phraseOk)}};
}
