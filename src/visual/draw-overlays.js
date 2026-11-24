import {overlayLayout} from '../core/overlays.js';
import {clamp,smooth,mix} from '../core/motion.js';
import {roundedBox,text} from './primitives.js';
const colors=['#6de6e3','#ffd17a','#a9b5ff','#f4989e','#a2e6ae'];
function line(ctx,a,b,color='#8acbcc',width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
export function drawOverlays(ctx,overlays,p){
 for(const x of overlays??[]){
  const start=x.start??0,end=x.end??1;if(p<start||p>end)continue;
  const t=clamp((p-start)/(end-start)),a=smooth(clamp(t*5)),{x:left,y,w,h}=overlayLayout(x.slot),cx=left+w/2;
  ctx.save();ctx.globalAlpha=a;ctx.translate(x.animation==='slide'?40*(1-a):0,0);
  roundedBox(ctx,left,y,w,h,16,'rgba(7,18,32,.96)','#607f94');
  const reveal=x.animation==='reveal'?x.text.slice(0,Math.max(1,Math.ceil(x.text.length*a))):x.text;
  text(ctx,reveal,cx,y+25,x.animation==='emphasize'?23+3*a:23,'#f5f7f5',800,'Arial',w-30);
  if(['bar','line','pie'].includes(x.type)){
   const data=x.data,maximum=Math.max(...data.map(d=>d.value)),total=data.reduce((n,d)=>n+d.value,0),top=y+48,base=y+130;
   text(ctx,x.axis+' ('+x.unit+')',cx,top,14,'#a9c8d7',600,'Arial',w-40);
   if(x.type==='pie'){
    let ang=-Math.PI/2;for(const [i,d] of data.entries()){const next=ang+2*Math.PI*d.value/total;ctx.beginPath();ctx.moveTo(left+100,y+110);ctx.arc(left+100,y+110,47,ang,next);ctx.closePath();ctx.fillStyle=colors[i];ctx.fill();ang=next;
     text(ctx,d.label+'  '+d.value,left+375,y+71+i*19,15,colors[i],700,'Arial',360);}
   }else{
    line(ctx,[left+50,base],[left+w-25,base]);line(ctx,[left+50,top+12],[left+50,base]);text(ctx,String(maximum),left+27,top+16,12,'#d2e2eb',600,'Arial',45);text(ctx,'0',left+27,base,12,'#d2e2eb',600);
    const width=(w-95)/data.length,points=[];
    data.forEach((d,i)=>{const xx=left+65+width*(i+.5),hh=58*d.value/maximum*a,yy=base-hh;points.push([xx,yy]);if(x.type==='bar'){ctx.fillStyle=colors[i];ctx.fillRect(xx-width*.25,yy,width*.5,hh);}text(ctx,String(d.value),xx,yy-9,14,'#f9f7e9',700,'Arial',width-4);text(ctx,d.label,xx,base+19,14,'#d2e2eb',600,'Arial',width-4);});
    if(x.type==='line'){for(let i=1;i<points.length;i++)line(ctx,points[i-1],points[i],colors[0],3);for(const q of points){ctx.beginPath();ctx.arc(...q,4,0,Math.PI*2);ctx.fillStyle=colors[0];ctx.fill();}}
   }
  }else if(x.type==='counter'){
   text(ctx,Math.round(mix(x.from??0,x.to,smooth(t)))+' '+x.unit,cx,y+h*.68,30,colors[0],900,'Arial',w-40);
  }else if(['timeline','equation','network'].includes(x.type)){
   const pts=x.data.map((_,i)=>[left+25+(w-50)*(i+.5)/x.data.length,y+h*.68]);
   const edges=x.type==='network'?x.edges:x.data.slice(1).map((_,i)=>[i,i+1]);
   edges.forEach(([i,j])=>line(ctx,pts[i],pts[j],colors[0],3));
   x.data.forEach((d,i)=>{ctx.save();if(x.animation==='stagger')ctx.globalAlpha=a*smooth(clamp(t*6-i*.55));const [xx,yy]=pts[i];roundedBox(ctx,xx-48,yy-15,96,30,8,'#243b51');text(ctx,d,xx,yy,15,'#f1f5f3',700,'Arial',90);ctx.restore();});
  }else if(x.type==='arrow'||x.type==='callout'){
   const yy=y+h*.67;line(ctx,[cx-75,yy],[cx+75,yy],colors[0],4);line(ctx,[cx+75,yy],[cx+55,yy-12],colors[0],4);line(ctx,[cx+75,yy],[cx+55,yy+12],colors[0],4);
  }else{ctx.fillStyle=colors[0];ctx.fillRect(cx-40,y+h*.68,80,3);}
  ctx.restore();
 }
}
