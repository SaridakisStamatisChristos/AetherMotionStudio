// DUAL-03 drawing of equation, plot, graph and array items (layout in src/core/diagrams.js). Shared 2D path on both
// backends; deterministic from layout, shot progress and step start times.
import {clamp,smooth} from '../core/motion.js';
import {roundedBox} from './primitives.js';
import {cssFont,formatNumber} from '../core/composition.js';
const P2D=globalThis.Path2D;
function label(ctx,s,x,y,size,color,font,align='center',weight=700){ctx.font=cssFont(font,weight,size);ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(s,x,y);}
function arrowHead(ctx,a,b,color,w=4,len=16){const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();for(const s of [-1,1]){ctx.moveTo(...b);ctx.lineTo(b[0]-len*Math.cos(ang+s*.45),b[1]-len*Math.sin(ang+s*.45));}ctx.stroke();}
const partial=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];
// Start (shot progress) of step j: its phrase start when anchored, else an even spread over 70 % of the window.
// Arrays show their initial values first, so their first step comes after a share of the window.
export function stepStart(x,steps,j,phrases,start){const ph=x.plot?.phrases??x.graph?.phrases??x.array?.phrases;if(ph&&phrases?.[ph[j]])return phrases[ph[j]][0];return x.array?start+(x.end-start)*.7*(j+1)/(steps+1):start+(x.end-start)*.7*j/Math.max(1,steps);}
export function drawDiagram(ctx,x,t,p,start,rv,phrases,font){
 const b=x.box,col=k=>({mark:t.mark,text:t.text,sub:t.sub})[k];
 roundedBox(ctx,b.x,b.y,b.w,b.h,14,t.fill+'f2',t.edge);
 if(x.type==='equation'){const E=x.equation,c=x.compiled,left=x.align==='left'?b.x+18:x.align==='right'?b.x+b.w-18-E.width:b.x+(b.w-E.width)/2,top=b.y+(b.h-E.height)/2;
  ctx.save();ctx.translate(left,top);ctx.scale(E.scale,E.scale);ctx.translate(-c.box[0],-c.box[1]);ctx.fillStyle=t.text;ctx.strokeStyle=t.text;
  for(const g of c.paths){ctx.save();ctx.transform(...g.m);if(P2D)ctx.fill(new P2D(g.d));else ctx.fill();ctx.restore();}ctx.restore();return;}
 if(x.type==='plot'){const L=x.plot;
  ctx.save();ctx.lineWidth=1;
  if(L.grid){ctx.strokeStyle=t.sub+'40';for(const k of L.ticks.x){ctx.beginPath();ctx.moveTo(k.at,L.oy);ctx.lineTo(k.at,L.oy+(L.Y[1]-L.Y[0])*L.sy);ctx.stroke();}for(const k of L.ticks.y){ctx.beginPath();ctx.moveTo(L.ox,k.at);ctx.lineTo(L.ox+(L.X[1]-L.X[0])*L.sx,k.at);ctx.stroke();}}
  if(L.axes){ctx.strokeStyle=t.sub;ctx.lineWidth=2;const [ox,oy]=L.origin;ctx.beginPath();ctx.moveTo(L.ox,oy);ctx.lineTo(L.ox+(L.X[1]-L.X[0])*L.sx,oy);ctx.moveTo(ox,L.oy);ctx.lineTo(ox,L.oy+(L.Y[1]-L.Y[0])*L.sy);ctx.stroke();
   const fx=v=>formatNumber(v,{decimals:L.ticks.dx<1?Math.min(3,Math.ceil(-Math.log10(L.ticks.dx))):0}),fy=v=>formatNumber(v,{decimals:L.ticks.dy<1?Math.min(3,Math.ceil(-Math.log10(L.ticks.dy))):0});
   for(const k of L.ticks.x)if(Math.abs(k.at-ox)>2)label(ctx,fx(k.v),k.at,oy+16,20,t.sub,font,'center',400);
   for(const k of L.ticks.y)if(Math.abs(k.at-oy)>2)label(ctx,fy(k.v),ox-8,k.at,20,t.sub,font,'right',400);
   if(L.xLabel)label(ctx,L.xLabel,L.ox+(L.X[1]-L.X[0])*L.sx,b.y+b.h-16,18,t.sub,font,'right');
   if(L.yLabel){ctx.save();ctx.translate(b.x+16,L.oy);ctx.rotate(-Math.PI/2);label(ctx,L.yLabel,0,0,18,t.sub,font,'right');ctx.restore();}}
  ctx.restore();
  for(const s of L.shapes){const s0=stepStart(x,L.steps,s.step,phrases,start),k=smooth(clamp((p-s0)/rv));if(k<=0)continue;const c=col(s.tone);
   ctx.save();ctx.globalAlpha*=Math.min(1,k*2);ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';
   if(s.kind==='point'){ctx.beginPath();ctx.arc(...s.at,7,0,Math.PI*2);ctx.fill();if(s.label)label(ctx,s.label,s.at[0]+12,s.at[1]-16,30,t.text,font,'left');}
   if(s.kind==='label')label(ctx,s.label,...s.at,30,c,font,'center');
   if(s.kind==='segment'||s.kind==='vector'){const e=partial(s.from,s.to,k);ctx.beginPath();ctx.moveTo(...s.from);ctx.lineTo(...e);ctx.stroke();if(s.kind==='vector'&&k>.95)arrowHead(ctx,s.from,s.to,c);if(s.label&&k>.95){const m=partial(s.from,s.to,.5);label(ctx,s.label,m[0]+10,m[1]-14,30,t.text,font,'left');}}
   if(s.kind==='circle'){ctx.beginPath();ctx.arc(...s.center,s.r,-Math.PI/2,-Math.PI/2+Math.PI*2*k);ctx.stroke();if(s.label&&k>.95)label(ctx,s.label,s.center[0],s.center[1]-s.r-16,30,t.text,font);}
   if(s.kind==='polygon'){ctx.beginPath();s.points.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.closePath();ctx.save();ctx.globalAlpha*=.18*k;ctx.fill();ctx.restore();ctx.stroke();
    if(s.label&&k>.95){const m=s.points.reduce((a,q)=>[a[0]+q[0]/s.points.length,a[1]+q[1]/s.points.length],[0,0]);label(ctx,s.label,...m,30,t.text,font);}}
   if(s.kind==='function'){const total=s.runs.reduce((n,r)=>n+r.length,0),limit=Math.round(total*k);let used=0;ctx.beginPath();for(const r of s.runs){r.forEach((q,i)=>{if(used++>=limit)return;i?ctx.lineTo(...q):ctx.moveTo(...q);});}ctx.stroke();
    if(s.label&&k>.95){const last=s.runs.at(-1).at(-1);label(ctx,s.label,last[0]-8,last[1]-18,30,t.text,font,'right');}}
   ctx.restore();}
  return;}
 const steps=x.graph?.steps??x.array?.steps,cur=steps.reduce((n,_,j)=>p>=stepStart(x,steps.length,j,phrases,start)?j:n,-1),fade=cur>=0?smooth(clamp((p-stepStart(x,steps.length,cur,phrases,start))/rv)):0;
 const note=cur>=0?steps[cur].note:null;
 if(x.type==='graph'){const G=x.graph,visited=new Set(steps.slice(0,cur+1).flatMap(s=>s.visit)),fresh=new Set(cur>=0?steps[cur].visit:[]),lit=new Set(steps.slice(0,cur+1).flatMap(s=>s.edges));
  for(const e of G.edges){const on=lit.has(e.key),dx=e.c[0]-e.a[0],dy=e.c[1]-e.a[1],len=Math.hypot(dx,dy),u=[dx/len,dy/len],a=[e.a[0]+u[0]*G.r,e.a[1]+u[1]*G.r],c=[e.c[0]-u[0]*G.r,e.c[1]-u[1]*G.r];
   ctx.save();ctx.strokeStyle=on?t.mark:t.sub;ctx.lineWidth=on?5:3;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...c);ctx.stroke();if(G.directed)arrowHead(ctx,a,c,on?t.mark:t.sub,on?5:3,14);ctx.restore();}
  for(const n of G.nodes){const v=visited.has(n.id),f=fresh.has(n.id)?fade:1;ctx.save();ctx.beginPath();ctx.arc(...n.c,G.r,0,Math.PI*2);ctx.fillStyle=t.fill;ctx.fill();
   if(v){ctx.globalAlpha*=f;ctx.fillStyle=t.mark;ctx.fill();ctx.globalAlpha=1;}ctx.strokeStyle=v?t.mark:t.edge;ctx.lineWidth=3;ctx.stroke();ctx.restore();
   label(ctx,n.label,n.c[0],n.c[1]+1,n.size,v&&f>.5?t.fill:t.text,font);}
  if(note)label(ctx,note,b.x+b.w/2,b.y+b.h-30,30,t.text,font);return;}
 if(x.type==='array'){const A=x.array,vals=A.strings[cur+1],prev=A.strings[Math.max(0,cur)],hl=new Set(cur>=0?steps[cur].highlight:[]);
  vals.forEach((s,i)=>{const cx=A.left+A.cell*i,cy=A.top;ctx.save();const on=hl.has(i);roundedBox(ctx,cx+4,cy,A.cell-8,A.ch,10,on?t.mark+'33':t.fill,on?t.mark:t.edge);ctx.restore();
   const changed=s!==prev[i]&&cur>=0;if(changed&&fade<1){ctx.save();ctx.globalAlpha*=1-fade;label(ctx,prev[i],cx+A.cell/2,cy+A.ch/2,A.size,t.sub,font);ctx.restore();ctx.save();ctx.globalAlpha*=fade;label(ctx,s,cx+A.cell/2,cy+A.ch/2,A.size,on?t.mark:t.text,font);ctx.restore();}
   else label(ctx,s,cx+A.cell/2,cy+A.ch/2,A.size,on?t.mark:t.text,font);});
  if(note)label(ctx,note,b.x+b.w/2,b.y+b.h-30,30,t.text,font);}
}
