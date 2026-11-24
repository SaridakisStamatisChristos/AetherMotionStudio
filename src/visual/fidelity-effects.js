import {highlightMask,hashNoise} from '../core/fidelity.js';
import {glow,text,roundedBox,r} from './primitives.js';
const caches=new WeakMap();
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function resources(ctx,W,H){
 let a=caches.get(ctx);
 if(!a||a.w!==W||a.h!==H){const w=Math.ceil(W/6),h=Math.ceil(H/6);a={w:W,h:H,sample:canvas(W,H),accum:canvas(W,H),small:canvas(w,h),lens:canvas(w,h),noise:canvas(128,128)};caches.set(ctx,a);}
 return a;
}
function reset(c){const x=c.getContext('2d');x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';x.filter='none';x.clearRect(0,0,c.width,c.height);return x;}
export function beginFilm(ctx,W,H,samples,draw){
 const a=resources(ctx,W,H),acc=reset(a.accum);
 for(let i=0;i<samples.length;i++){const [p,weight]=samples[i],x=reset(a.sample);draw(x,p);acc.globalAlpha=weight;acc.globalCompositeOperation=i===0?'copy':'lighter';acc.drawImage(a.sample,0,0);}
 acc.globalAlpha=1;acc.globalCompositeOperation='source-over';
 ctx.drawImage(a.accum,0,0,W,H);return a;
}
export function finishFilm(ctx,a,f,focus,frame){
 const W=a.w,H=a.h,s=a.small,l=a.lens,x=reset(s);
 // Small-resolution screen-space DOF: preserve the subject region, soften peripheral image.
 if(f.depthOfField>0){x.drawImage(a.accum,0,0,s.width,s.height);const z=reset(l);z.filter='blur('+(.5+1.8*f.depthOfField)+'px)';z.drawImage(s,0,0);z.filter='none';z.globalCompositeOperation='destination-in';
  const fx=focus[0]*s.width/720,fy=focus[1]*s.height/1280,g=z.createRadialGradient(fx,fy,s.width*.34,fx,fy,s.width*.86);g.addColorStop(0,'transparent');g.addColorStop(1,'#fff');z.fillStyle=g;z.fillRect(0,0,s.width,s.height);z.globalCompositeOperation='source-over';ctx.save();ctx.globalAlpha=f.depthOfField*.78;ctx.drawImage(l,0,0,W,H);ctx.restore();}
 // Actual luminance-derived bloom, not merely an asset-centered glow.
 if(f.bloom>0){reset(s);x.drawImage(a.accum,0,0,s.width,s.height);const data=x.getImageData(0,0,s.width,s.height);highlightMask(data.data);x.putImageData(data,0,0);const z=reset(l);z.filter='blur(3px)';z.drawImage(s,0,0);z.filter='none';ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=f.bloom*.82;ctx.drawImage(l,0,0,W,H);ctx.globalAlpha=f.bloom*.28;ctx.drawImage(s,0,0,W,H);ctx.restore();}
 if(f.grade>0){ctx.save();const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#f6bc78');g.addColorStop(.48,'#b4a7bc');g.addColorStop(1,'#285875');ctx.fillStyle=g;ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=f.grade*.34;ctx.fillRect(0,0,W,H);ctx.restore();}
 if(f.grain>0){const n=reset(a.noise),data=n.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=Math.round(hashNoise(x,y,frame)*255);data.data[i]=data.data[i+1]=data.data[i+2]=v;data.data[i+3]=255;}n.putImageData(data,0,0);ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=f.grain*.22;ctx.fillStyle=ctx.createPattern(a.noise,'repeat');ctx.fillRect(0,0,W,H);ctx.restore();}
}
export function atmosphere(ctx,state,project,f){
 if(f.atmosphere<=0)return;
 const env=state.environment,p=state.progress;ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=f.atmosphere;
 const source=project([-2.5,3.1,-.6]);
 for(let i=0;i<5;i++){const x=source[0]+i*38,y=source[1]-55,g=ctx.createLinearGradient(x,y,x+220,y+780);g.addColorStop(0,env.key+'20');g.addColorStop(.45,env.key+'09');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-15,y);ctx.lineTo(x+17,y);ctx.lineTo(x+260+i*25,y+820);ctx.lineTo(x+100+i*20,y+820);ctx.closePath();ctx.fill();}
 for(let i=0;i<36;i++){const x=(r(i+132)*740+p*(10+i%7))%740,y=390+(r(i+300)*600+p*15)%600;ctx.fillStyle=env.accent+'40';ctx.globalAlpha=f.atmosphere*(.2+.5*r(i+71));ctx.beginPath();ctx.arc(x,y,.7+r(i+47)*1.5,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
export function contactShadows(ctx,state,project,f){
 if(f.contactShadow<=0)return;
 for(const a of state.assets){const q=project([a.pose.origin[0],.015,a.pose.origin[2]]),k=a.pose.scale*state.camera.zoom/q[2];ctx.save();ctx.translate(q[0],q[1]);ctx.scale(1,.26);ctx.globalAlpha=f.contactShadow;glow(ctx,0,0,k*.75,'rgba(0,0,0,.75)');glow(ctx,0,0,k*.32,'rgba(0,0,0,.65)');ctx.restore();}
}
export function detailedFace(ctx,face,amount){
 if(amount<=0)return;
 const pts=face.p,cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cy=pts.reduce((s,p)=>s+p[1],0)/pts.length;
 const ys=pts.map(p=>p[1]),top=Math.min(...ys),bottom=Math.max(...ys);if(bottom-top<3)return;
 ctx.save();ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.clip();
 const g=ctx.createLinearGradient(cx,top,cx,bottom);g.addColorStop(0,'rgba(255,255,255,.20)');g.addColorStop(.4,'transparent');g.addColorStop(1,'rgba(0,0,0,.19)');ctx.globalAlpha=amount;ctx.fillStyle=g;ctx.fillRect(Math.min(...pts.map(p=>p[0])),top,Math.max(...pts.map(p=>p[0]))-Math.min(...pts.map(p=>p[0])),bottom-top);
 ctx.strokeStyle='rgba(240,245,255,.20)';ctx.lineWidth=.8;ctx.stroke();ctx.restore();
}
export function particleTrails(ctx,state,project,f){
 if(f.particles<=0)return;const p=state.progress;
 for(const e of state.effects){if(e.strength<=0||e.type==='glow')continue;const a=state.assets.find(a=>a.id===e.target),[x,y,z]=a.pose.origin,k=a.pose.scale;
 ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.strokeStyle=e.color;ctx.lineWidth=1.5;
 for(let i=0;i<24;i++){const th=r(i+300)*Math.PI*2+p*8,h=(r(i+400)+p*1.5)%1,rad=k*(.45+r(i+500));const q=project([x+Math.cos(th)*rad,y+k*(.4+2*h),z+Math.sin(th)*rad]),prev=project([x+Math.cos(th-.15)*rad,y+k*(.4+2*Math.max(0,h-.035)),z+Math.sin(th-.15)*rad]);ctx.globalAlpha=f.particles*e.strength*Math.sin(Math.PI*h)*.75;ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}
 ctx.restore();}
}
export function polishedType(ctx,s,env,p,amount){
 ctx.save();ctx.globalAlpha=Math.min(1,p*15);const shift=(1-Math.min(1,p*12))*14*amount;
 ctx.translate(0,shift);
 roundedBox(ctx,232,61,256,32,16,'rgba(9,16,30,.8)',env.accent+'70');
 text(ctx,'A E T H E R   /   F I L M',360,77,13,env.accent,700);
 ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=12*amount;text(ctx,s.heading,360,190,58,'#f8f3ea',900);ctx.shadowBlur=0;
 ctx.fillStyle=env.accent;ctx.fillRect(316,237,88,2);
 text(ctx,s.subheading,360,274,26,'#e0e2ef',600);ctx.restore();
}
