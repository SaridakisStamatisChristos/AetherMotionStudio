// Shared 2D overlay path for compositions (src/core/composition.js): compose-v1 (DUAL-01) and compose-v2 (DUAL-02).
// Called from drawGraph after the world pass on both backends, in the 720×1280 logical space, so CPU and Three.js
// films show the same aids. No randomness, no wall clock: every value comes from the layout, the shot progress and
// the shot's phrase windows.
import {layoutComposition,TEXT,LINE,GAP,FONT,WEIGHT,REVEAL_SECONDS,COUNT_SECONDS,cssFont,formatNumber,itemStart,appearAt} from '../core/composition.js';
import {clamp,smooth} from '../core/motion.js';
import {roundedBox} from './primitives.js';
import {drawDiagram} from './draw-diagrams.js';
const DIAGRAM_TYPES=new Set(['equation','plot','graph','array']);
import {drawChartItem} from './draw-charts.js';
const CHART_TYPES=new Set(['chart','timeline','flow','compare']);
import {imageRects} from '../core/media.js';
import {loadedImage,mediaPreview} from './media-registry.js';
// DUAL-05: the view (pan/zoom) of an image at shot progress p: from → to over the item's time on screen, eased;
// zoom is interpolated geometrically (even perceived speed). Pure: the same p gives the same view on both backends.
export function imageView(x,p,start){
 const mv=x.image.move;if(!mv)return {x:.5,y:.5,zoom:1};
 const u=smooth(clamp((p-start)/Math.max(1e-6,x.end-start)));
 return {x:mv.from.x+(mv.to.x-mv.from.x)*u,y:mv.from.y+(mv.to.y-mv.from.y)*u,zoom:mv.from.zoom*(mv.to.zoom/mv.from.zoom)**u};
}
function drawImageItem(ctx,x,t,p,start,font){
 const I=x.image,P=x.picture,b=x.box,r=I.plate?14:0;
 if(I.plate)roundedBox(ctx,b.x,b.y,b.w,b.h,r,t.fill+'f2',null);
 const bm=loadedImage(I.source.sha256);
 ctx.save();ctx.beginPath();ctx.roundRect(P.x,P.y,P.w,P.h,x.caption?[r,r,0,0]:r);ctx.clip();
 if(bm){const {src,dst}=imageRects({width:I.source.displayWidth,height:I.source.displayHeight},P,{fit:I.fit,crop:I.crop,focus:I.focus,view:imageView(x,p,start)});
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bm,src[0],src[1],src[2],src[3],dst[0],dst[1],dst[2],dst[3]);}
 else if(mediaPreview()){ctx.fillStyle=t.fill;ctx.fillRect(P.x,P.y,P.w,P.h);ctx.font=cssFont('inter',700,22);ctx.fillStyle=t.sub;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('image '+I.media+' (not loaded in the preview)',P.x+P.w/2,P.y+P.h/2,P.w-24);}
 else throw Error('media: image '+I.media+' ('+I.source.file+') was not loaded before drawing; the render is stopped');
 ctx.restore();
 if(I.plate){ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,r);ctx.strokeStyle=t.edge;ctx.lineWidth=2;ctx.stroke();}
 if(x.caption){const C=TEXT.caption,cy=b.y+b.h-x.caption.strip;if(!I.plate){ctx.fillStyle=t.fill+'f2';ctx.fillRect(b.x,cy,b.w,x.caption.strip);}
  lines(ctx,x.caption.text,b.x+b.w/2,cy+C.pad,t.text,'center',b.w-2*C.pad,{font});}
}
const cache=new WeakMap();
// layouts per composition and output format (DUAL-06)
const layoutOf=(c,format)=>{let m=cache.get(c);if(!m){m=new Map();cache.set(c,m);}const k=format??'vertical-v1';let l=m.get(k);if(!l){l=layoutComposition(c,'composition',format?{format}:{});m.set(k,l);}return l;};
const v1Font=size=>WEIGHT+' '+size+'px '+FONT;
// Draw wrapped lines. Emphasis ranges (character offsets in the joined text) are drawn in the mark colour; `upto`
// (kinetic text) limits how many words are visible, the last one fading in by `fade`.
function lines(ctx,t,x,y,color,align,max,{font=null,ranges=[],mark=null,offset=0,upto=Infinity,fade=1}={}){
 ctx.font=font?font(t.size):v1Font(t.size);ctx.textBaseline='middle';ctx.fillStyle=color;
 if(!ranges.length&&upto===Infinity){ctx.textAlign=align;t.lines.forEach((s,k)=>ctx.fillText(s,x,y+t.size*LINE*(k+.5),max));return;}
 // run-by-run drawing (emphasis or word reveal): positions from the canvas's own measurement of the same font
 ctx.textAlign='left';let pos=offset,word=0;
 t.lines.forEach((s,k)=>{const w=ctx.measureText(s).width,yy=y+t.size*LINE*(k+.5);let xx=align==='left'?x:align==='right'?x-w:x-w/2;
  for(const token of s.split(/( )/)){const a=pos,b=pos+token.length;pos=b;if(token===' '){xx+=ctx.measureText(' ').width;continue;}
   const vis=word<Math.floor(upto)?1:word===Math.floor(upto)?fade:0;word++;
   if(vis>0){ctx.save();ctx.globalAlpha*=vis;let cx=xx;
    // split the token where emphasis starts or ends
    const cuts=[a,b,...ranges.flatMap(r=>[r.a,r.b]).filter(v=>v>a&&v<b)].sort((m,n)=>m-n);
    for(let i=0;i+1<cuts.length;i++){const from=cuts[i]-a,to=cuts[i+1]-a,piece=token.slice(from,to),em=ranges.some(r=>cuts[i]>=r.a&&cuts[i]<r.b);ctx.fillStyle=em&&mark?mark:color;ctx.fillText(piece,cx,yy);cx+=ctx.measureText(piece).width;}
    ctx.restore();}
   xx+=ctx.measureText(token).width;}
  pos+=1;// the space that joined this line to the next one
 });
}
function head(ctx,a,b,color,width){const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
 ctx.beginPath();for(const s of [-1,1]){ctx.moveTo(...b);ctx.lineTo(b[0]-16*Math.cos(ang+s*.45),b[1]-16*Math.sin(ang+s*.45));}ctx.stroke();}
const anchorX=(b,pad,align)=>align==='left'?b.x+pad:align==='right'?b.x+b.w-pad:b.x+b.w/2;
// p = shot progress 0–1; frames = shot length (reveals last REVEAL_SECONDS of real time at 30 fps); phrases = the
// shot's phrase windows (src/core/composition.js phraseWindows) for phrase-anchored items, or null.
export function drawComposition(ctx,composition,p,frames=360,phrases=null,format=null){
 if(!composition)return;
 const L=layoutOf(composition,format),F=Math.max(1,frames),rv=Math.max(1e-6,REVEAL_SECONDS*30/F),out=Math.max(1e-6,.3*30/F),v2=L.version==='compose-v2';
 for(const x of L.items){
  const start=appearAt(x,phrases);
  if(p<start||p>x.end)continue;
  const a=x.reveal==='none'?1:smooth(clamp((p-start)/rv))*(x.end<1?smooth(clamp((x.end-p)/out)):1);if(a<=0)continue;
  const t=x.tone,b=x.box,font=v2?size=>cssFont(x.font,x.weight,size):null,ranges=f=>(x.emphasis??[]).filter(r=>r.field===f);
  ctx.save();ctx.globalAlpha=x.reveal==='wipe'?Math.min(1,a*3):a;
  if(x.reveal==='slide')ctx.translate(0,24*(1-a));
  if(x.reveal==='pop'&&b){const [cx,cy]=[b.x+b.w/2,b.y+b.h/2],k=.9+.1*a;ctx.translate(cx,cy);ctx.scale(k,k);ctx.translate(-cx,-cy);}
  if(x.reveal==='wipe'&&b){ctx.beginPath();ctx.rect(b.x-2,b.y-2,(b.w+4)*a,b.h+4);ctx.clip();}
  if(x.type==='background'){ctx.globalAlpha*=.62;roundedBox(ctx,b.x,b.y,b.w,b.h,22,t.fill,t.fill);}
  else if(x.type==='shape'){ctx.fillStyle=t.mark;ctx.strokeStyle=t.mark;ctx.lineWidth=5;
   if(x.shape==='rect')roundedBox(ctx,b.x,b.y,b.w,b.h,12,t.mark+'cc',t.mark);
   else{ctx.beginPath();ctx.ellipse(b.x+b.w/2,b.y+b.h/2,b.w/2-3,b.h/2-3,0,0,Math.PI*2);if(x.shape==='circle'){ctx.globalAlpha*=.85;ctx.fill();}else ctx.stroke();}}
  else if(x.type==='image')drawImageItem(ctx,x,t,p,start,font);
  else if(CHART_TYPES.has(x.type))drawChartItem(ctx,x,t,p,start,rv,phrases,x.font);
  else if(DIAGRAM_TYPES.has(x.type))drawDiagram(ctx,x,t,p,start,rv,phrases,x.font);
  else if(x.type==='arrow'){const [s,e]=x.line,k=x.reveal==='none'?1:a;head(ctx,s,[s[0]+(e[0]-s[0])*k,s[1]+(e[1]-s[1])*k],t.mark,5);}
  else{
   const pad=TEXT[{card:'heading',quote:'pull',bullets:'bullet',counter:'number',kinetic:'kinetic'}[x.type]??x.type].pad,r=x.type==='label'?Math.min(b.h/2,24):14,al=x.align??(x.type==='card'?'left':'center');
   if(x.type==='callout'){const c=[Math.min(Math.max(x.to[0],b.x),b.x+b.w),Math.min(Math.max(x.to[1],b.y),b.y+b.h)];ctx.strokeStyle=t.mark;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(...c);ctx.lineTo(...x.to);ctx.stroke();ctx.fillStyle=t.mark;ctx.beginPath();ctx.arc(...x.to,7,0,Math.PI*2);ctx.fill();}
   roundedBox(ctx,b.x,b.y,b.w,b.h,r,t.fill+'f2',t.edge);
   const ax=anchorX(b,pad,al),max=b.w-2*pad,opt=f=>({font,ranges:ranges(f),mark:t.mark});
   if(x.type==='card'&&!x.text){ctx.fillStyle=t.mark;ctx.fillRect(b.x+pad,b.y+pad-GAP/2-1,46,3);lines(ctx,x.body,ax,b.y+(b.h-x.body.height)/2,t.text,al,max,opt('body'));}
   else if(x.type==='card'){const top=b.y+pad;lines(ctx,x.text,ax,top,t.text,al,max,opt('text'));if(x.body){ctx.fillStyle=t.mark;ctx.fillRect(al==='left'?b.x+pad:al==='right'?b.x+b.w-pad-46:b.x+b.w/2-23,top+x.text.height+GAP/2-1,46,3);lines(ctx,x.body,ax,top+x.text.height+GAP,t.sub,al,max,opt('body'));}}
   else if(x.type==='quote'){const total=x.text.height+(x.body?GAP*2+x.body.height:0),top=b.y+(b.h-total)/2;ctx.fillStyle=t.mark;ctx.fillRect(b.x+8,b.y+pad,4,b.h-2*pad);
    lines(ctx,x.text,ax,top,t.text,al,max,opt('text'));if(x.body)lines(ctx,x.body,ax,top+x.text.height+GAP*2,t.sub,al,max,{font:v2?size=>cssFont(x.font,700,size):null});}
   else if(x.type==='bullets'){let y=b.y+(b.h-x.bullets.height)/2;const B=x.bullets,s=B.size;
    B.rows.forEach((row,j)=>{const bs=x.phrases?itemStart(x,phrases,j):start+(x.end-start)*.6*j/B.rows.length,ba=x.reveal==='none'?1:smooth(clamp((p-bs)/rv));
     if(ba>0){ctx.save();ctx.globalAlpha*=ba;ctx.translate(0,10*(1-ba));ctx.fillStyle=t.mark;ctx.beginPath();ctx.arc(b.x+pad+s*.22,y+s*LINE/2,s*.16,0,Math.PI*2);ctx.fill();
      lines(ctx,{size:s,lines:row},b.x+pad+B.indent,y,t.text,'left',max-B.indent,opt('line'+j));ctx.restore();}
     y+=row.length*s*LINE+GAP*1.5;});}
   else if(x.type==='counter'){const N=x.number,c=x.counter,span=Math.max(1e-6,Math.min(x.end-start,COUNT_SECONDS*30/F)),v=c.from+(c.to-c.from)*smooth(clamp((p-start)/span)),top=b.y+(b.h-(N.height+(x.text?GAP+x.text.height:0)))/2;
    // the value is rounded to the shown decimals; the end value is exact
    lines(ctx,{size:N.size,lines:[formatNumber(p-start>=span?c.to:v,c)]},b.x+b.w/2,top,t.mark,'center',max,{font});
    if(x.text)lines(ctx,x.text,b.x+b.w/2,top+N.height+GAP,t.text,'center',max,opt('text'));}
   else if(x.type==='kinetic'){const words=x.text.lines.join(' ').split(' ').length,until=x.phrase!==undefined&&phrases?.[x.phrase]?phrases[x.phrase][1]:x.end,spread=Math.max(1e-6,(until-start)*.8),u=clamp((p-start)/spread)*words;
    // word timing inside the window is estimated (even spread), never forced alignment
    lines(ctx,x.text,ax,b.y+(b.h-x.text.height)/2,t.text,al,max,{...opt('text'),upto:u>=words?Infinity:u,fade:u-Math.floor(u)});}
   else lines(ctx,x.text,ax,b.y+(b.h-x.text.height)/2,t.text,al,max,opt('text'));
  }
  ctx.restore();
 }
}
