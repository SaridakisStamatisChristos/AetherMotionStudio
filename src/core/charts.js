// DUAL-04 charts and data diagrams for compose-v2 (validation and deterministic layout; drawing in
// src/visual/draw-charts.js). Authored data only: nothing is fetched, estimated or "fixed".
// chart: bar | line | area | scatter | pie, from inline JSON (categories + series) or a bounded inline CSV.
//  - numbers must be finite (|v| <= 1e12); a missing value is `null` (JSON) or an empty CSV cell. Missing values are
//    drawn as gaps (line, area, scatter) or as "no data" marks (bar); they are never treated as zero. Pie charts
//    accept no missing, negative or zero values.
//  - the y range is explicit (`y:[min,max]`) or derived from all data (every step) as a "nice" range; bar and area
//    charts always include zero (no truncated baselines); data outside an explicit range is refused (no clipping).
//  - axes never rescale between steps: one range covers every state. Steps change values only (same categories and
//    series); number→number interpolates, a value that appears or disappears fades (no invented in-between values).
//  - categories keep their given order; signs and units are kept as given.
// timeline: 2–8 events on a line; flow: 2–6 boxes joined by arrows (flowchart); compare: 2 cards side by side.
import {tickStep} from './diagrams.js';
export const CHART_KINDS=Object.freeze(['bar','line','area','scatter','pie']);
export const SERIES_COLOURS=Object.freeze({'aether-v1':Object.freeze(['#6de6e3','#ffd17a','#a9b5ff','#f4989e']),'paper-v1':Object.freeze(['#a3401b','#2f4a96','#7a5600','#2e6b45'])});
export const CSV_LIMITS=Object.freeze({chars:8000,rows:60,cols:5});
const fail=(p,m)=>{throw Error(p+': '+m)};
const only=(x,keys,p)=>{for(const k of Object.keys(x))if(!keys.includes(k))fail(p+'.'+k,'unknown field');};
const text=(v,p,max)=>{if(typeof v!=='string'||v.length>max||!v.trim()||/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(v))fail(p,'printable text of at most '+max+' characters required');return v.trim();};
const value=(v,p,nullable=true)=>{if(v===null&&nullable)return null;if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e12)fail(p,'finite number within ±1e12'+(nullable?' or null (missing)':'')+' required');return v;};
const fitSize=(sizes,ok)=>sizes.find(ok)??null;
const decimals=v=>{for(let d=0;d<3;d++)if(Math.abs(v*10**d-Math.round(v*10**d))<1e-9)return d;return 3;};
// Strict CSV: header row (first cell = category or x name), then rows; quoted fields allowed ("" escapes a quote);
// numbers are plain decimals (-12, 3.5), an empty cell is missing; anything else in a numeric column is refused.
export function parseCsv(src,p='csv'){
 if(typeof src!=='string'||!src.trim()||src.length>CSV_LIMITS.chars)fail(p,'CSV of 1–'+CSV_LIMITS.chars+' characters required');
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(src))fail(p,'control characters are not allowed');
 const rows=[];for(const [n,line] of src.replace(/\r\n?/g,'\n').trim().split('\n').entries()){const cells=[];let i=0;
  while(i<=line.length){if(line[i]==='"'){let s='';i++;for(;;){if(i>=line.length)fail(p+' line '+(n+1),'unclosed quote');if(line[i]==='"'){if(line[i+1]==='"'){s+='"';i+=2;continue;}i++;break;}s+=line[i++];}cells.push(s);if(i<line.length&&line[i]!==',')fail(p+' line '+(n+1),'text after a closing quote');i++;}
   else{const j=line.indexOf(',',i),end=j<0?line.length:j;cells.push(line.slice(i,end).trim());i=end+1;}}
  rows.push(cells);}
 if(rows.length<3||rows.length>CSV_LIMITS.rows+1)fail(p,'a header and 2–'+CSV_LIMITS.rows+' rows required');
 const width=rows[0].length;if(width<2||width>CSV_LIMITS.cols+1)fail(p,'2–'+(CSV_LIMITS.cols+1)+' columns required');
 rows.forEach((r,n)=>{if(r.length!==width)fail(p+' line '+(n+1),'has '+r.length+' cells, the header has '+width);});
 const num=(c,q)=>{if(c==='')return null;if(!/^-?\d+(\.\d+)?$/.test(c))fail(q,'"'+c.slice(0,20)+'" is not a plain number (use digits, an optional minus and decimal point; leave empty for missing)');return value(Number(c),q);};
 const header=rows[0].map((h,j)=>text(h,p+' header column '+(j+1),16));
 return {header,rows:rows.slice(1).map((r,n)=>[r[0],...r.slice(1).map((c,j)=>num(c,p+' line '+(n+2)+' column '+(j+2)))])};
}
// "Nice" range covering vmin..vmax (and zero when asked), extended to whole tick steps.
// Categories (JSON or CSV): 2–12 for bar, line, area and pie; at most 14 characters; unique; kept in the given order.
function categoriesOf(list,p,where=i=>p+'['+i+']'){if(!Array.isArray(list)||list.length<2||list.length>12)fail(p,'2–12 categories required');const c=list.map((v,i)=>text(v,where(i),14));const d=c.find((v,i)=>c.indexOf(v)!==i);if(d!==undefined)fail(p,'duplicate category "'+d+'"');return c;}
// "Nice" range covering vmin..vmax (and zero when asked), extended to whole tick steps. Repair pass (audit 2026-11-26):
// refuses ranges that cannot be drawn reliably (non-finite, subnormal-size steps, or a span below one part in 1e9 of
// the values' size, e.g. 1e12 and 1e12 + 0.001) instead of returning NaN or collapsed ticks.
export function niceRange(vmin,vmax,withZero,p='range'){let a=withZero?Math.min(0,vmin):vmin,b=withZero?Math.max(0,vmax):vmax;if(!Number.isFinite(a)||!Number.isFinite(b))fail(p,'finite data required');
 if(a===b){const pad=Math.max(Math.abs(a)*.1,1);a-=pad;b+=pad;}checkSpan(a,b,p);const s=tickStep(b-a);const r=[Math.floor(a/s+1e-9)*s,Math.ceil(b/s-1e-9)*s];checkSpan(r[0],r[1],p);return r;}
// A drawable range: finite, increasing, a span of at least 1e-9 and at least 1e-9 of the largest magnitude.
export function checkSpan(a,b,p){const span=b-a,mag=Math.max(Math.abs(a),Math.abs(b));if(!Number.isFinite(span)||span<=0)fail(p,'an increasing finite range required');
 if(span<1e-9)fail(p,'the values span less than 1e-9; rescale the unit (e.g. thousandths) before charting');
 if(span<mag*1e-9)fail(p,'the values differ by less than one part in a billion of their size; chart the differences instead');}
// Values that are not zero must be at least 1e-9 in size (smaller ones cannot be scaled reliably).
function tinyCheck(vs,p){const v=vs.find(n=>n!==null&&n!==0&&Math.abs(n)<1e-9);if(v!==undefined)fail(p,'value '+v+' is too small to chart reliably (below 1e-9); rescale the unit');}
function series(x,p,kind,cats){
 if(!Array.isArray(x)||x.length<1||x.length>4)fail(p,'1–4 series required');if(kind==='pie'&&x.length!==1)fail(p,'a pie chart has exactly one series');
 const names=new Set();return x.map((s,i)=>{const q=p+'['+i+']';if(!s||typeof s!=='object')fail(q,'object required');only(s,kind==='scatter'?['name','points']:['name','values'],q);
  const name=text(s.name,q+'.name',16);if(names.has(name))fail(q+'.name','duplicate series name');names.add(name);
  if(kind==='scatter'){if(!Array.isArray(s.points)||s.points.length<2||s.points.length>60)fail(q+'.points','2–60 [x,y] points required');return {name,points:s.points.map((v,j)=>{if(!Array.isArray(v)||v.length!==2)fail(q+'.points['+j+']','[x,y] required');return [value(v[0],q+'.points['+j+'][0]',false),value(v[1],q+'.points['+j+'][1]',false)];})};}
  if(!Array.isArray(s.values)||s.values.length!==cats.length)fail(q+'.values',cats.length+' values required (one per category)');
  const values=s.values.map((v,j)=>value(v,q+'.values['+j+']',kind!=='pie'));
  if(kind==='pie'){if(values.some(v=>v<=0))fail(q+'.values','pie slices must be positive');}
  else if(values.every(v=>v===null))fail(q+'.values','all values are missing');
  return {name,values};});
}
export function layoutChart(x,b,p,{measure,format,phraseOk,theme}){
 only(x,['id','type','box','start','end','reveal','phrase','phrases','kind','categories','series','csv','x','y','unit','xUnit','yLabel','xLabel','valueLabels','highlight','annotations','steps','tone','font','weight','align','emphasis'],p);
 if(!CHART_KINDS.includes(x.kind))fail(p+'.kind','one of '+CHART_KINDS.join(', ')+' required');const kind=x.kind;
 let cats=null,data;
 if(x.csv!==undefined){if(x.series!==undefined||x.categories!==undefined)fail(p+'.csv','use csv or categories/series, not both');const t=parseCsv(x.csv,p+'.csv');
  if(kind==='scatter'){data=t.header.slice(1).map((n,j)=>({name:n,points:t.rows.map((r,i)=>{const a=Number(r[0]);if(!/^-?\d+(\.\d+)?$/.test(r[0]))fail(p+'.csv line '+(i+2),'x "'+r[0]+'" is not a plain number');if(r[j+1]===null)fail(p+'.csv line '+(i+2),'scatter points need both values');return [a,r[j+1]];})}));}
  else{cats=categoriesOf(t.rows.map(r=>r[0]),p+'.csv',i=>p+'.csv line '+(i+2)+' category');data=t.header.slice(1).map((n,j)=>({name:n,values:t.rows.map(r=>r[j+1])}));}
  data=series(data,p+'.csv',kind,cats??[]);}
 else{if(kind!=='scatter'){cats=categoriesOf(x.categories,p+'.categories');}
  data=series(x.series,p+'.series',kind,cats??[]);}
 if(kind==='pie'&&cats.length>6)fail(p+'.categories','a pie chart shows at most 6 slices');
 const unit=x.unit!==undefined?text(x.unit,p+'.unit',12):null,xUnit=x.xUnit!==undefined?text(x.xUnit,p+'.xUnit',12):null;
 // steps: value states (same series, same categories); highlight and note per step
 const states=[data.map(s=>s.values??null)];
 if(x.steps!==undefined&&(!Array.isArray(x.steps)||x.steps.length>12))fail(p+'.steps','at most 12 steps');
 const steps=(x.steps??[]).map((s,i)=>{const q=p+'.steps['+i+']';if(!s||typeof s!=='object')fail(q,'object required');only(s,['series','highlight','note'],q);if(kind==='scatter'&&s.series)fail(q+'.series','scatter charts do not change values between steps');
  let vals=states.at(-1);if(s.series!==undefined){if(!Array.isArray(s.series)||s.series.length!==data.length)fail(q+'.series',data.length+' series required (the same series as the chart)');vals=s.series.map((v,j)=>{if(!v||!Array.isArray(v.values)||v.values.length!==cats.length)fail(q+'.series['+j+'].values',cats.length+' values required');if(v.name!==undefined&&v.name!==data[j].name)fail(q+'.series['+j+'].name','series order must stay "'+data[j].name+'"');return v.values.map((n,k)=>value(n,q+'.series['+j+'].values['+k+']',kind!=='pie'));});
   if(kind==='pie'&&vals.flat().some(v=>v<=0))fail(q,'pie slices must stay positive');}
  states.push(vals);return {highlight:s.highlight!==undefined?highlight(s.highlight,q+'.highlight'):null,note:s.note!==undefined?text(s.note,q+'.note',48):null};});
 if(steps.length>12)fail(p+'.steps','at most 12 steps');
 function highlight(h,q){if(!h||typeof h!=='object')fail(q,'object required');only(h,['series','category'],q);const out={};if(h.series!==undefined){const i=data.findIndex(s=>s.name===h.series);if(i<0)fail(q+'.series','unknown series');out.series=i;}if(h.category!==undefined){if(!cats)fail(q+'.category','scatter charts have no categories');const i=cats.indexOf(h.category);if(i<0)fail(q+'.category','unknown category');out.category=i;}return out;}
 const hl=x.highlight!==undefined?highlight(x.highlight,p+'.highlight'):null;
 // ranges over every state
 let Y=null,X=null;
 if(kind!=='pie'){
  const ys=kind==='scatter'?data.flatMap(s=>s.points.map(q=>q[1])):states.flat(2).filter(v=>v!==null),zero=kind==='bar'||kind==='area';
  if(x.y!==undefined){if(!Array.isArray(x.y)||x.y.length!==2)fail(p+'.y','[min,max] required');Y=[value(x.y[0],p+'.y[0]',false),value(x.y[1],p+'.y[1]',false)];if(Y[0]>=Y[1])fail(p+'.y','min must be below max');
   if(zero&&(Y[0]>0||Y[1]<0))fail(p+'.y',kind+' charts must include zero (a truncated baseline misleads)');
   checkSpan(Y[0],Y[1],p+'.y');const tol=(Y[1]-Y[0])*1e-9,out=ys.find(v=>v<Y[0]-tol||v>Y[1]+tol);if(out!==undefined)fail(p+'.y','value '+out+' lies outside '+Y[0]+'…'+Y[1]+'; widen y (data is never clipped)');}
  else{tinyCheck(ys,p);Y=niceRange(Math.min(...ys),Math.max(...ys),zero,p+'.y');}
  if(kind==='scatter'){const xs=data.flatMap(s=>s.points.map(q=>q[0]));if(x.x!==undefined){if(!Array.isArray(x.x)||x.x.length!==2)fail(p+'.x','[min,max] required');X=[value(x.x[0],p+'.x[0]',false),value(x.x[1],p+'.x[1]',false)];if(X[0]>=X[1])fail(p+'.x','min must be below max');checkSpan(X[0],X[1],p+'.x');const tx=(X[1]-X[0])*1e-9,out=xs.find(v=>v<X[0]-tx||v>X[1]+tx);if(out!==undefined)fail(p+'.x','value '+out+' lies outside the x range; widen x');}else{tinyCheck(xs,p);X=niceRange(Math.min(...xs),Math.max(...xs),false,p+'.x');}}
  else if(x.x!==undefined)fail(p+'.x','only scatter charts take an x range');
 }else if(x.y!==undefined||x.x!==undefined)fail(p,'pie charts take no axis ranges');
 const yLabel=x.yLabel!==undefined?text(x.yLabel,p+'.yLabel',16):null,xLabel=x.xLabel!==undefined?text(x.xLabel,p+'.xLabel',16):null;
 if(x.annotations!==undefined&&(!Array.isArray(x.annotations)||x.annotations.length>4))fail(p+'.annotations','at most 4');
 const annotations=(x.annotations??[]).map((a,i)=>{const q=p+'.annotations['+i+']';if(!a||typeof a!=='object')fail(q,'object required');only(a,['category','series','at','text'],q);const t=text(a.text,q+'.text',32);
  if(kind==='scatter'||kind==='pie')fail(q,kind+' charts take no annotations (annotations point at a category of a bar, line or area chart)');if(a.at!==undefined)fail(q+'.at','annotations point at a category, not at coordinates');
  const c=cats.indexOf(a.category);if(c<0)fail(q+'.category','unknown category');const s=a.series!==undefined?data.findIndex(d=>d.name===a.series):0;if(s<0)fail(q+'.series','unknown series');
  if(states[0][s][c]===null)fail(q,'points at a missing value');return {category:c,series:s,text:t};});
 if(annotations.length>4)fail(p+'.annotations','at most 4');
 // layout
 const pad=22,legend=data.length>1||kind==='pie',legendH=legend&&kind!=='pie'?40:0,title=x.yLabel||unit?28:0,notes=steps.some(s=>s.note),noteH=notes?40:0;
 const L={kind,cats,series:data,states,steps,highlight:hl,annotations,unit,xUnit,yLabel,xLabel,valueLabels:x.valueLabels===true,colours:SERIES_COLOURS[theme]??SERIES_COLOURS['aether-v1'],legend:null,noteY:b.y+b.h-pad-noteH/2};
 if(legend&&kind!=='pie'){let lx=b.x+pad;L.legend=data.map(s=>{const w=24+measure(s.name,22)+20,item={x:lx,y:b.y+pad+14,name:s.name};lx+=w;return item;});if(lx-b.x-pad>b.w-2*pad)fail(p+'.series','legend wider than the chart; shorten series names');}
 if(kind==='pie'){const ar={x:b.x+pad,y:b.y+pad,w:b.w-2*pad,h:b.h-2*pad-noteH};
  const rows=states.flatMap(st=>cats.map((c,i)=>c+'  '+format(st[0][i])+(unit?' '+unit:'')+'  '+percents(st[0])[i]+'%'));
  // layouts tried in order: legend beside a large pie, beside a smaller pie, below the pie
  const tries=[...[.28,.2].map(f=>{const r=Math.min(ar.h/2,ar.w*f),rowH=Math.min(46,ar.h/cats.length);return {cx:ar.x+r+4,cy:ar.y+ar.h/2,r,legendX:ar.x+2*r+28,legendY:ar.y+ar.h/2,rowH,width:ar.w-2*r-32};}),
   (()=>{const rowH=36,lh=rowH*cats.length,r=Math.min(ar.w/2,(ar.h-lh-16)/2);return {cx:ar.x+ar.w/2,cy:ar.y+r,r,legendX:ar.x+8,legendY:ar.y+2*r+16+lh/2,rowH,width:ar.w-44};})()];
  for(const t of tries){if(t.r<50)continue;const size=fitSize([26,24,22,20,18],s=>rows.every(r=>measure(r,s)<=t.width)&&s*1.3<=t.rowH);if(size){L.pie={...t,size};break;}}
  if(!L.pie)fail(p,'slice labels do not fit beside or below the pie; shorten category names or enlarge the box');
  L.percents=states.map(st=>percents(st[0]));return {chart:L,phrases:stepPhrases(x,steps.length,p,phraseOk)};}
 const tickLabels=v=>format(v),ys=ticks(Y),yw=Math.max(...ys.map(v=>measure(tickLabels(v),18)))+10;
 const area={x:b.x+pad+yw+(yLabel?20:0),y:b.y+pad+legendH+title,w:0,h:0};area.w=b.x+b.w-pad-area.x;
 const bottom=kind==='scatter'?34+(xLabel?26:0):40;area.h=b.y+b.h-pad-noteH-bottom-area.y;
 if(area.w<120||area.h<100)fail(p+'.box','too small for a chart (the plotting area would be '+Math.round(area.w)+'×'+Math.round(area.h)+' px)');
 L.area=area;L.Y=Y;L.yTicks=ys;L.sy=area.h/(Y[1]-Y[0]);L.yOf=null;finiteScale(L.sy,ys,p+'.y');
 if(kind==='scatter'){L.X=X;L.xTicks=ticks(X);L.sx=area.w/(X[1]-X[0]);finiteScale(L.sx,L.xTicks,p+'.x');}
 else{const slot=area.w/cats.length;L.slot=slot;L.catSize=fitSize([22,20,18,16,14],s=>cats.every(c=>measure(c,s)<=slot-6));if(!L.catSize)fail(p+'.categories','category names do not fit under the chart; shorten them or use fewer categories');
  if(L.valueLabels){const all=states.flat(2).filter(v=>v!==null).map(v=>format(v));const bw=kind==='bar'?slot*.8/data.length:slot;L.valueSize=fitSize([20,18,16,14],s=>all.every(t=>measure(t,s)<=bw+8));if(!L.valueSize)fail(p+'.valueLabels','value labels do not fit their bars; turn them off or use fewer series');}}
 for(const a of annotations)if(measure(a.text,20)>area.w)fail(p+'.annotations','annotation wider than the chart');
 return {chart:L,phrases:stepPhrases(x,steps.length,p,phraseOk)};
}
function finiteScale(scale,tk,p){if(!Number.isFinite(scale)||scale<=0)fail(p,'the range gives no finite scale');if(tk.length<2||tk.some((v,i)=>!Number.isFinite(v)||(i&&v<=tk[i-1])))fail(p,'the range gives no usable ticks; widen it');}
function ticks(R){const s=tickStep(R[1]-R[0]),out=[];for(let v=Math.ceil(R[0]/s-1e-9)*s;v<=R[1]+1e-9&&out.length<12;v+=s)out.push(Math.round(v/s)*s);return out;}
// Whole-number percentages that add up to exactly 100 (largest-remainder rounding).
export function percents(values){const t=values.reduce((a,v)=>a+v,0),raw=values.map(v=>v*100/t),base=raw.map(Math.floor);let left=100-base.reduce((a,v)=>a+v,0);
 const order=raw.map((v,i)=>[i,v-Math.floor(v)]).sort((a,b)=>b[1]-a[1]||a[0]-b[0]);for(const [i] of order){if(left<=0)break;base[i]++;left--;}return base;}
function stepPhrases(x,count,p,phraseOk){if(x.phrases===undefined)return null;if(!Array.isArray(x.phrases)||x.phrases.length!==count)fail(p+'.phrases','one phrase index per step ('+count+') required');x.phrases.forEach((k,j)=>{phraseOk(k,p+'.phrases['+j+']');if(j&&k<x.phrases[j-1])fail(p+'.phrases','must not go backwards');});return [...x.phrases];}
// timeline: events on a horizontal line, labels alternating above and below.
export function layoutTimeline(x,b,p,{measure,phraseOk}){
 only(x,['id','type','box','start','end','reveal','phrase','phrases','events','tone','font','weight','align','emphasis'],p);
 if(!Array.isArray(x.events)||x.events.length<2||x.events.length>8)fail(p+'.events','2–8 events required');
 const events=x.events.map((e,i)=>{const q=p+'.events['+i+']';if(!e||typeof e!=='object')fail(q,'object required');only(e,['when','label'],q);return {when:text(e.when,q+'.when',12),label:text(e.label,q+'.label',24)};});
 const pad=24,y=b.y+b.h/2,slot=(b.w-2*pad)/events.length,size=fitSize([32,30,28,26,24,22,20,18,16],s=>events.every(e=>Math.max(measure(e.when,s),measure(e.label,s))<=slot*1.9-8)&&2*s*1.25+20<=b.h/2-pad);
 if(!size)fail(p,'event labels do not fit; shorten them or use fewer events');
 return {timeline:{y,x0:b.x+pad,x1:b.x+b.w-pad,size,events:events.map((e,i)=>({...e,x:b.x+pad+slot*(i+.5),above:i%2===0}))},phrases:stepPhrases(x,events.length,p,phraseOk)};
}
// flow: 2–6 boxes joined by arrows, top to bottom (or left to right with direction:'row').
export function layoutFlow(x,b,p,{measure,phraseOk}){
 only(x,['id','type','box','start','end','reveal','phrase','phrases','nodes','direction','tone','font','weight','align','emphasis'],p);
 if(!Array.isArray(x.nodes)||x.nodes.length<2||x.nodes.length>6)fail(p+'.nodes','2–6 boxes required');if(x.direction!==undefined&&!['column','row'].includes(x.direction))fail(p+'.direction','column or row required');
 const nodes=x.nodes.map((n,i)=>text(n,p+'.nodes['+i+']',40)),row=x.direction==='row',n=nodes.length,gap=row?36:26,pad=16;
 const bw=row?(b.w-2*pad-gap*(n-1))/n:b.w-2*pad,bh=row?Math.min(140,b.h-2*pad):(b.h-2*pad-gap*(n-1))/n;
 if(bw<70||bh<40)fail(p+'.box','too small for '+n+' boxes');
 const wrap=(s,size)=>{const out=[];let line='';for(const w of s.split(/\s+/)){const t=line?line+' '+w:w;if(line&&measure(t,size)>bw-20){out.push(line);line=w;}else line=t;}if(line)out.push(line);return out;};
 const size=fitSize([28,26,24,22,20,18,16],s=>nodes.every(t=>{const l=wrap(t,s);return l.every(w=>measure(w,s)<=bw-20)&&l.length*s*1.22<=bh-12;}));
 if(!size)fail(p,'box texts do not fit; shorten them or use fewer boxes');
 const boxes=nodes.map((t,i)=>({lines:wrap(t,size),x:row?b.x+pad+i*(bw+gap):b.x+pad,y:row?b.y+(b.h-bh)/2:b.y+pad+i*(bh+gap),w:bw,h:bh}));
 return {flow:{row,size,boxes},phrases:stepPhrases(x,n,p,phraseOk)};
}
// compare: two cards, each a title and 1–5 points.
export function layoutCompare(x,b,p,{measure,phraseOk}){
 only(x,['id','type','box','start','end','reveal','phrase','phrases','cards','tone','font','weight','align','emphasis'],p);
 if(!Array.isArray(x.cards)||x.cards.length!==2)fail(p+'.cards','exactly 2 cards required');
 const gap=20,cw=(b.w-gap)/2,cards=x.cards.map((c,i)=>{const q=p+'.cards['+i+']';if(!c||typeof c!=='object')fail(q,'object required');only(c,['title','points'],q);const title=text(c.title,q+'.title',24);if(!Array.isArray(c.points)||c.points.length<1||c.points.length>5)fail(q+'.points','1–5 points required');return {title,points:c.points.map((t,j)=>text(t,q+'.points['+j+']',48)),x:b.x+i*(cw+gap),y:b.y,w:cw,h:b.h};});
 const wrap=(s,size,w)=>{const out=[];let line='';for(const t of s.split(/\s+/)){const n=line?line+' '+t:t;if(line&&measure(n,size)>w){out.push(line);line=t;}else line=n;}if(line)out.push(line);return out;};
 const size=fitSize([34,32,30,28,26,24,22,20,18,16],s=>cards.every(c=>{const lines=c.points.flatMap(t=>wrap(t,s,cw-56));return measure(c.title,s+4)<=cw-32&&lines.every(l=>measure(l,s)<=cw-56)&&(s+4)*1.4+lines.length*s*1.25+c.points.length*8<=b.h-40;}));
 if(!size)fail(p,'card texts do not fit; shorten them');
 return {compare:{size,cards:cards.map(c=>({...c,rows:c.points.map(t=>wrap(t,size,cw-56))}))},phrases:stepPhrases(x,2,p,phraseOk)};
}
export {decimals};
