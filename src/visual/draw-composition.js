// DUAL-01 shared 2D overlay path for 'compose-v1' compositions (src/core/composition.js). Called from drawGraph after
// the world pass on both backends, in the 720×1280 logical space, so CPU and Three.js films show the same aids.
// No randomness, no wall clock: every value comes from the layout and the shot progress.
import {layoutComposition,TEXT,LINE,GAP,FONT,WEIGHT,REVEAL_SECONDS} from '../core/composition.js';
import {clamp,smooth} from '../core/motion.js';
import {roundedBox} from './primitives.js';
const cache=new WeakMap();
const layoutOf=c=>{let l=cache.get(c);if(!l){l=layoutComposition(c);cache.set(c,l);}return l;};
function lines(ctx,t,x,y,color,align,max){ctx.font=WEIGHT+' '+t.size+'px '+FONT;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;t.lines.forEach((s,k)=>ctx.fillText(s,x,y+t.size*LINE*(k+.5),max));}
function head(ctx,a,b,color,width){const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
 ctx.beginPath();for(const s of [-1,1]){ctx.moveTo(...b);ctx.lineTo(b[0]-16*Math.cos(ang+s*.45),b[1]-16*Math.sin(ang+s*.45));}ctx.stroke();}
// p = shot progress 0–1; frames = shot length (reveals last REVEAL_SECONDS of real time at 30 fps).
export function drawComposition(ctx,composition,p,frames=360){
 if(!composition)return;
 const L=layoutOf(composition),rv=Math.max(1e-6,REVEAL_SECONDS*30/Math.max(1,frames)),out=Math.max(1e-6,.3*30/Math.max(1,frames));
 for(const x of L.items){
  if(p<x.start||p>x.end)continue;
  const a=x.reveal==='none'?1:smooth(clamp((p-x.start)/rv))*(x.end<1?smooth(clamp((x.end-p)/out)):1);if(a<=0)continue;
  const t=x.tone,b=x.box;
  ctx.save();ctx.globalAlpha=x.reveal==='wipe'?Math.min(1,a*3):a;
  if(x.reveal==='slide')ctx.translate(0,24*(1-a));
  if(x.reveal==='pop'&&b){const [cx,cy]=[b.x+b.w/2,b.y+b.h/2],k=.9+.1*a;ctx.translate(cx,cy);ctx.scale(k,k);ctx.translate(-cx,-cy);}
  if(x.reveal==='wipe'&&b){ctx.beginPath();ctx.rect(b.x-2,b.y-2,(b.w+4)*a,b.h+4);ctx.clip();}
  if(x.type==='background'){ctx.globalAlpha*=.62;roundedBox(ctx,b.x,b.y,b.w,b.h,22,t.fill,t.fill);}
  else if(x.type==='shape'){ctx.fillStyle=t.mark;ctx.strokeStyle=t.mark;ctx.lineWidth=5;
   if(x.shape==='rect')roundedBox(ctx,b.x,b.y,b.w,b.h,12,t.mark+'cc',t.mark);
   else{ctx.beginPath();ctx.ellipse(b.x+b.w/2,b.y+b.h/2,b.w/2-3,b.h/2-3,0,0,Math.PI*2);if(x.shape==='circle'){ctx.globalAlpha*=.85;ctx.fill();}else ctx.stroke();}}
  else if(x.type==='arrow'){const [s,e]=x.line,k=x.reveal==='none'?1:a;head(ctx,s,[s[0]+(e[0]-s[0])*k,s[1]+(e[1]-s[1])*k],t.mark,5);}
  else{
   const pad=TEXT[x.type==='card'?'heading':x.type].pad,r=x.type==='label'?Math.min(b.h/2,24):14;
   if(x.type==='callout'){const c=[Math.min(Math.max(x.to[0],b.x),b.x+b.w),Math.min(Math.max(x.to[1],b.y),b.y+b.h)];ctx.strokeStyle=t.mark;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(...c);ctx.lineTo(...x.to);ctx.stroke();ctx.fillStyle=t.mark;ctx.beginPath();ctx.arc(...x.to,7,0,Math.PI*2);ctx.fill();}
   roundedBox(ctx,b.x,b.y,b.w,b.h,r,t.fill+'f2',t.edge);
   if(x.type==='card'&&!x.text){ctx.fillStyle=t.mark;ctx.fillRect(b.x+pad,b.y+pad-GAP/2-1,46,3);lines(ctx,x.body,b.x+pad,b.y+(b.h-x.body.height)/2,t.text,'left',b.w-2*pad);}
   else if(x.type==='card'){const top=b.y+pad;lines(ctx,x.text,b.x+pad,top,t.text,'left',b.w-2*pad);if(x.body){ctx.fillStyle=t.mark;ctx.fillRect(b.x+pad,top+x.text.height+GAP/2-1,46,3);lines(ctx,x.body,b.x+pad,top+x.text.height+GAP,t.sub,'left',b.w-2*pad);}}
   else lines(ctx,x.text,b.x+b.w/2,b.y+(b.h-x.text.height)/2,t.text,'center',b.w-2*pad);
  }
  ctx.restore();
 }
}
