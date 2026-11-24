// Original 2D motion-design template. Pure, frame-addressed canvas; no assets/network.
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(t,a,b)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
export function draw(ctx,t,W,H,s){
 ctx.save();ctx.scale(W/720,H/1280);
 const g=ctx.createLinearGradient(0,0,720,1280);g.addColorStop(0,'#0b1023');g.addColorStop(.55,'#172d45');g.addColorStop(1,'#060e1b');ctx.fillStyle=g;ctx.fillRect(0,0,720,1280);
 function text(v,x,y,size,color='#e9f4fb',weight=800,max=620){ctx.font=weight+' '+size+'px Arial';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(v,x,y,max);}
 function box(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
 for(let i=0;i<44;i++){let x=(i*137.5+t*(4+i%7))%720,y=(i*97.7)%1280;ctx.fillStyle='rgba(165,222,255,.17)';ctx.fillRect(x,y,2,2)}
 text(s.copy.kicker,360,76,15,'#74d6eb',700);
 const stage=t<3.2?0:t<5.45?1:t<9?2:3;
 const lines=stage===0?s.copy.intro:stage===1?[s.copy.question]:stage===2?s.copy.reveal:s.copy.outro;
 const start=[0,3.2,5.45,9][stage];const enter=ease(t,start,start+.35);
 ctx.save();ctx.globalAlpha=enter;lines.forEach((x,i)=>text(x,360,194+i*71, i===0?56:46,i===1?'#78f0e1':'#f1f5fa'));ctx.restore();
 const broke=ease(t,9.3,10.2),linked=ease(t,2.8,5.4);
 for(let i=0;i<3;i++){
  const e=ease(t,.35+i*.62,1.0+i*.62),x=360,y=465+i*184,shift=i===1?broke*35:0;
  if(i>0){ctx.save();ctx.globalAlpha=e*linked;ctx.strokeStyle=(i===2&&broke>.3)?'#ff887c':'#66e7d8';ctx.lineWidth=4;ctx.setLineDash(i===2&&broke>.3?[9,9]:[]);ctx.beginPath();ctx.moveTo(360,y-120);ctx.lineTo(360+shift,y-55);ctx.stroke();ctx.restore()}
  ctx.save();ctx.globalAlpha=e;ctx.translate(x+shift,y+(1-e)*45);ctx.shadowBlur=24;ctx.shadowColor=i===1&&broke>.3?'#f57e65':'#1e9fcf';box(-214,-64,428,128,18,'#142d40',i===1&&broke>.3?'#ff887c':'#60c6df');ctx.shadowBlur=0;
  text('BLOCK 0'+(i+1),-114,-22,23,'#dcf5fa');text(i===1&&broke>.3?'HASH B*':'HASH '+['A','B','C'][i],111,-22,21,'#f4cc7d');
  text(i===0?'PREVIOUS: —':'PREVIOUS: '+['','A','B'][i],0,28,20,'#8bb6c5',600);
  ctx.restore();
 }
 const caption=s.captions.find(c=>t>=c[0]&&t<c[1]);if(caption){box(42,1050,636,75,12,'#f5ce85');text(caption[2],360,1087,30,'#142131');}
 ctx.fillStyle='#274052';ctx.fillRect(54,1212,612,3);ctx.fillStyle='#75e5e0';ctx.fillRect(54,1212,612*clamp(t/12),3);ctx.restore();
}
