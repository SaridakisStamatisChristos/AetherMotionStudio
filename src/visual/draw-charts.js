// DUAL-04 drawing of chart, timeline, flow and compare items (layout in src/core/charts.js). Shared 2D path on both
// backends; deterministic from layout, shot progress and step start times. Values interpolate only number→number;
// a value that appears or disappears fades (never invented in-between values). Axes are fixed for every state.
import {clamp,smooth} from '../core/motion.js';
import {roundedBox} from './primitives.js';
import {cssFont,formatNumber} from '../core/composition.js';
import {chartNumber} from '../core/charts.js';
const fmt=chartNumber;
function label(ctx,s,x,y,size,color,font,align='center',weight=700){ctx.font=cssFont(font,weight,size);ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(s,x,y);}
function arrow(ctx,a,b,color){const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);for(const s of [-1,1]){ctx.moveTo(...b);ctx.lineTo(b[0]-14*Math.cos(ang+s*.45),b[1]-14*Math.sin(ang+s*.45));}ctx.stroke();}
// Start of step j. With phrase anchors: that phrase's start. Otherwise: charts show their first state, then steps spread
// over 70 % of the window; timeline/flow/compare reveal element j at j/n of 70 % of the window.
function stepAt(x,j,n,phrases,start,initialFirst){if(x.phrases&&phrases?.[x.phrases[j]])return phrases[x.phrases[j]][0];return start+(x.end-start)*.7*(initialFirst?(j+1)/(n+1):j/Math.max(1,n));}
export function drawChartItem(ctx,x,t,p,start,rv,phrases,font){
 const b=x.box;roundedBox(ctx,b.x,b.y,b.w,b.h,14,t.fill+'f2',t.edge);
 if(x.type==='timeline'){const T=x.timeline;ctx.strokeStyle=t.sub;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(T.x0,T.y);ctx.lineTo(T.x1,T.y);ctx.stroke();
  T.events.forEach((e,j)=>{const k=smooth(clamp((p-stepAt(x,j,T.events.length,phrases,start,false))/rv));if(k<=0)return;ctx.save();ctx.globalAlpha*=k;ctx.fillStyle=t.mark;ctx.beginPath();ctx.arc(e.x,T.y,9,0,Math.PI*2);ctx.fill();
   const d=e.above?-1:1,s=T.size;label(ctx,e.when,e.x,T.y+d*(18+s*.6),s,t.mark,font);label(ctx,e.label,e.x,T.y+d*(18+s*1.9),s,t.text,font,'center',400);ctx.restore();});return;}
 if(x.type==='flow'){const F=x.flow;F.boxes.forEach((bx,j)=>{const k=smooth(clamp((p-stepAt(x,j,F.boxes.length,phrases,start,false))/rv));if(k<=0)return;ctx.save();ctx.globalAlpha*=k;
   if(j){const a=F.boxes[j-1];arrow(ctx,F.row?[a.x+a.w+4,a.y+a.h/2]:[a.x+a.w/2,a.y+a.h+4],F.row?[bx.x-4,bx.y+bx.h/2]:[bx.x+bx.w/2,bx.y-4],t.mark);}
   roundedBox(ctx,bx.x,bx.y,bx.w,bx.h,12,t.fill,t.mark);const s=F.size,top=bx.y+bx.h/2-bx.lines.length*s*1.22/2;bx.lines.forEach((l,i)=>label(ctx,l,bx.x+bx.w/2,top+s*1.22*(i+.5),s,t.text,font));ctx.restore();});return;}
 if(x.type==='compare'){const C=x.compare;C.cards.forEach((c,j)=>{const k=smooth(clamp((p-stepAt(x,j,2,phrases,start,false))/rv));if(k<=0)return;ctx.save();ctx.globalAlpha*=k;roundedBox(ctx,c.x+6,c.y+6,c.w-12,c.h-12,12,t.fill,j?t.edge:t.mark);
   const s=C.size;label(ctx,c.title,c.x+c.w/2,c.y+24+s*.7,s+4,t.mark,font);let y=c.y+24+(s+4)*1.4+6;
   for(const rows of c.rows){ctx.fillStyle=t.mark;ctx.beginPath();ctx.arc(c.x+30,y+s*.62,s*.16,0,Math.PI*2);ctx.fill();rows.forEach(r=>{label(ctx,r,c.x+44,y+s*.62,s,t.text,font,'left',400);y+=s*1.25;});y+=8;}ctx.restore();});return;}
 // chart. Repair pass (audit 2026-11-26): only exact data states are drawn. A step crossfades the old and the new
 // state element by element (bar, point, line, pie) where values differ; unchanged elements stay solid. Labels belong
 // to their element and fade with it, so a label never disagrees with its geometry. The opening reveal is a wipe of
 // the plotting area (or a fade for pies); data coordinates are never scaled.
 const L=x.chart,n=L.steps.length,cur=L.steps.reduce((c,_,j)=>p>=stepAt(x,j,n,phrases,start,true)?j:c,-1),k=cur>=0?smooth(clamp((p-stepAt(x,cur,n,phrases,start,true))/rv)):1;
 const grow=smooth(clamp((p-start)/rv)),hlOf=s=>s>0?(L.steps[s-1].highlight??L.highlight):L.highlight;
 // layers: [state index, alpha]; one layer when settled
 const sNew=cur+1,sOld=Math.max(0,cur),layers=cur<0||k>=1?[[sNew,1]]:[[sOld,1-k],[sNew,k]];
 const same=(a,b)=>a===b;
 const dimOf=(s,si,i)=>{const hl=hlOf(s);return hl&&((hl.series!==undefined&&hl.series!==si)||(hl.category!==undefined&&i!==undefined&&hl.category!==i))?.35:1;};
 // alpha of element (si,i) in layer (s,a): elements equal in both states are drawn once (in the new layer) at full alpha
 const elemAlpha=(s,a,eq)=>layers.length===1?1:eq?(s===sNew?1:0):a;
 const dimMix=(si,i)=>layers.length===1?dimOf(sNew,si,i):dimOf(sOld,si,i)*(1-k)+dimOf(sNew,si,i)*k;
 if(L.legend)L.legend.forEach((g,s)=>{ctx.fillStyle=L.colours[s];ctx.fillRect(g.x,g.y-8,16,16);label(ctx,g.name,g.x+24,g.y,22,t.text,font,'left',400);});
 if(L.kind==='pie'){const P=L.pie,eq=layers.length===1||L.states[sOld][0].every((v,i)=>v===L.states[sNew][0][i]);
  for(const [s,a] of layers){const la=elemAlpha(s,a,eq);if(la<=0)continue;const st=L.states[s][0],tot=st.reduce((u,v)=>u+v,0),pct=L.percents[s];let a0=-Math.PI/2;
   ctx.save();ctx.globalAlpha*=la*grow;
   st.forEach((v,i)=>{const a1=a0+Math.PI*2*v/tot;ctx.save();ctx.globalAlpha*=eq?dimMix(0,i):dimOf(s,0,i);ctx.fillStyle=L.colours[i];ctx.beginPath();ctx.moveTo(P.cx,P.cy);ctx.arc(P.cx,P.cy,P.r,a0,a1);ctx.closePath();ctx.fill();ctx.strokeStyle=t.fill;ctx.lineWidth=3;ctx.stroke();ctx.restore();a0=a1;});
   L.cats.forEach((c,i)=>{const y=P.legendY-(L.cats.length*P.rowH)/2+P.rowH*(i+.5);ctx.save();ctx.globalAlpha*=eq?dimMix(0,i):dimOf(s,0,i);ctx.fillStyle=L.colours[i];ctx.fillRect(P.legendX,y-9,18,18);label(ctx,c+'  '+fmt(st[i])+(L.unit?' '+L.unit:'')+'  '+pct[i]+'%',P.legendX+28,y,P.size,t.text,font,'left',400);ctx.restore();});
   ctx.restore();}}
 else{const A=L.area,yOf=v=>A.y+(L.Y[1]-v)*L.sy,zeroY=yOf(Math.min(Math.max(0,L.Y[0]),L.Y[1]));
  if(L.yLabel||L.unit)label(ctx,(L.yLabel??'')+(L.unit?(L.yLabel?' ('+L.unit+')':L.unit):''),A.x,A.y-18,20,t.sub,font,'left');
  ctx.lineWidth=1;for(const v of L.yTicks){const y=yOf(v);ctx.strokeStyle=t.sub+'40';ctx.beginPath();ctx.moveTo(A.x,y);ctx.lineTo(A.x+A.w,y);ctx.stroke();label(ctx,L.yLabels[L.yTicks.indexOf(v)],A.x-8,y,18,t.sub,font,'right',400);}
  ctx.strokeStyle=t.sub;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(A.x,zeroY);ctx.lineTo(A.x+A.w,zeroY);ctx.stroke();
  if(L.kind!=='scatter')L.cats.forEach((c,i)=>{ctx.save();ctx.globalAlpha*=hlOf(sNew)?.category!==undefined&&hlOf(sNew).category!==i?.6:1;label(ctx,c,A.x+L.slot*(i+.5),A.y+A.h+20,L.catSize,t.text,font,'center',400);ctx.restore();});
  else{const xOf=v=>A.x+(v-L.X[0])*L.sx;for(const v of L.xTicks)label(ctx,L.xLabels[L.xTicks.indexOf(v)],xOf(v),A.y+A.h+16,18,t.sub,font,'center',400);if(L.xLabel||L.xUnit)label(ctx,(L.xLabel??'')+(L.xUnit?' ('+L.xUnit+')':''),A.x+A.w,A.y+A.h+42,20,t.sub,font,'right');}
  // opening reveal: wipe the plotting area from left to right (geometry stays at its true coordinates)
  ctx.save();ctx.beginPath();ctx.rect(A.x-12,A.y-60,(A.w+24)*grow,A.h+80);ctx.clip();
  if(L.kind==='scatter'){const xOf=v=>A.x+(v-L.X[0])*L.sx;L.series.forEach((s,si)=>s.points.forEach(([px,py])=>{ctx.save();ctx.globalAlpha*=dimOf(sNew,si);ctx.fillStyle=L.colours[si];ctx.beginPath();ctx.arc(xOf(px),yOf(py),7,0,Math.PI*2);ctx.fill();ctx.restore();}));}
  else{const ns=L.series.length,bw=L.slot*.8/ns,sx=i=>A.x+L.slot*(i+.5);
   L.series.forEach((s,si)=>{const col=L.colours[si];
    if(L.kind==='bar')L.cats.forEach((_,i)=>{const x0=A.x+L.slot*i+L.slot*.1+bw*si,eq=layers.length===1||same(L.states[sOld][si][i],L.states[sNew][si][i]);
     for(const [st,a] of layers){const la=elemAlpha(st,a,eq);if(la<=0)continue;const v=L.states[st][si][i];ctx.save();ctx.globalAlpha*=la*(eq?dimMix(si,i):dimOf(st,si,i));
      if(v===null)label(ctx,'no data',x0+bw/2,zeroY-14,18,t.sub,font,'center',400);
      else{const top=yOf(v);ctx.fillStyle=col;ctx.fillRect(x0+2,Math.min(top,zeroY),bw-4,Math.abs(zeroY-top));if(L.valueLabels)label(ctx,fmt(v),x0+bw/2,v>=0?top-12:top+14,L.valueSize,t.text,font);}
      ctx.restore();}});
    else{const eqS=layers.length===1||L.cats.every((_,i)=>same(L.states[sOld][si][i],L.states[sNew][si][i]));
     for(const [st,a] of layers){const la=elemAlpha(st,a,eqS);if(la<=0)continue;const vals=L.states[st][si];ctx.save();ctx.globalAlpha*=la*(eqS?dimMix(si):dimOf(st,si));ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=4;ctx.lineJoin='round';let run=[];
      const flush=()=>{if(run.length>1){if(L.kind==='area'){ctx.save();ctx.globalAlpha*=.25;ctx.beginPath();ctx.moveTo(run[0][0],zeroY);run.forEach(q=>ctx.lineTo(...q));ctx.lineTo(run.at(-1)[0],zeroY);ctx.closePath();ctx.fill();ctx.restore();}ctx.beginPath();run.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.stroke();}run=[];};
      vals.forEach((v,i)=>{if(v===null){flush();return;}const q=[sx(i),yOf(v)];run.push(q);ctx.beginPath();ctx.arc(...q,6,0,Math.PI*2);ctx.fill();if(L.valueLabels)label(ctx,fmt(v),q[0],q[1]-16,L.valueSize,t.text,font);});flush();ctx.restore();}}});
   for(const a of L.annotations){const v=L.states[sNew][a.series][a.category];if(v===null)continue;const q=[A.x+L.slot*(a.category+.5),yOf(v)];ctx.save();ctx.globalAlpha*=layers.length===1?1:k;ctx.strokeStyle=t.mark;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q[0],q[1]-8);ctx.lineTo(q[0],q[1]-34);ctx.stroke();label(ctx,a.text,Math.min(Math.max(q[0],A.x+60),A.x+A.w-60),q[1]-48,20,t.mark,font);ctx.restore();}}
  ctx.restore();}
 const note=cur>=0?L.steps[cur].note:null;if(note)label(ctx,note,b.x+b.w/2,L.noteY,22,t.text,font);
}
