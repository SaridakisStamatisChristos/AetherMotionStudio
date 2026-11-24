import {clamp,ease} from '../core/motion.js';
import {glow,text,roundedBox,star,r} from '../visual/primitives.js';
const palette={transactions:'#69d9f0',blocks:'#a4a8ff',hashes:'#ffd278',network:'#73e6b7',verification:'#faad87'};
function line(ctx,x1,y1,x2,y2,color,width=3){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function node(ctx,x,y,label,color,active=1){ctx.save();ctx.globalAlpha=active;glow(ctx,x,y,90,color+'25');roundedBox(ctx,x-73,y-45,146,90,18,'#152c40',color);text(ctx,label,x,y,22,'#eef7fb',800,'Arial',132);ctx.restore()}
function arrow(ctx,x1,y1,x2,y2,color,p=1){const x=x1+(x2-x1)*p,y=y1+(y2-y1)*p;line(ctx,x1,y1,x,y,color,4);if(p>.01){const a=Math.atan2(y-y1,x-x1);line(ctx,x,y,x-13*Math.cos(a-.45),y-13*Math.sin(a-.45),color,4);line(ctx,x,y,x-13*Math.cos(a+.45),y-13*Math.sin(a+.45),color,4)}}
function card(ctx,x,y,w,h,label,detail,color){roundedBox(ctx,x-w/2,y-h/2,w,h,18,'#152b3e',color);text(ctx,label,x,y-17,27,'#f2f7fb',800,'Arial',w-30);text(ctx,detail,x,y+22,21,color,700,'Arial',w-30)}
export function drawChapter(ctx,p,W,H,s,index,total){
 ctx.save();ctx.scale(W/720,H/1280);const c=palette[s.chapter],t=p*12;
 const bg=ctx.createLinearGradient(0,0,720,1280);bg.addColorStop(0,'#081222');bg.addColorStop(.48,'#152a3d');bg.addColorStop(1,'#07111f');ctx.fillStyle=bg;ctx.fillRect(0,0,720,1280);
 glow(ctx,360,700,410,c+'18');
 for(let i=0;i<32;i++){ctx.fillStyle=c+'22';ctx.fillRect((r(i)*720+t*(3+i%5))%720,r(i+80)*1280,2,2)}
 text(ctx,'AETHER LAB  /  BLOCKCHAIN 101',360,72,16,c,800);
 text(ctx,String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0'),360,113,17,'#9aafc5',600);
 ctx.save();ctx.globalAlpha=ease(p,0,.06);text(ctx,s.heading,360,200,57,'#f2f7fb',900);text(ctx,s.subheading,360,270,26,c,600);ctx.restore();
 if(s.chapter==='transactions'){
  node(ctx,145,510,'ALICE',c);node(ctx,575,510,'BOB',c);arrow(ctx,224,510,492,510,c,ease(p,.07,.33));
  const x=224+268*ease(p,.1,.36);ctx.fillStyle='#ffd278';ctx.beginPath();ctx.arc(x,510,21,0,Math.PI*2);ctx.fill();text(ctx,'1',x,510,22,'#152b3e');
  card(ctx,360,690,530,116,'SIGNED TRANSACTION','Alice → Bob   •   amount: 1',c);
  ctx.save();ctx.globalAlpha=ease(p,.36,.55);card(ctx,360,860,450,110,'SIGNATURE CHECK','Authorized by sender',c);ctx.restore();
 }else if(s.chapter==='blocks'){
  for(let i=0;i<3;i++){const e=ease(p,.04+i*.08,.24+i*.08),y=395+i*105;ctx.save();ctx.globalAlpha=e;card(ctx,360,y,415,83,'TRANSACTION 0'+(i+1),'Signed record',c);ctx.restore();}
  arrow(ctx,360,658,360,720,c,ease(p,.37,.55));
  ctx.save();ctx.globalAlpha=ease(p,.46,.7);card(ctx,360,835,500,190,'BLOCK  #102','Transactions + metadata + hash',c);ctx.restore();
 }else if(s.chapter==='hashes'){
  const altered=p>.63,changed=ease(p,.63,.8);card(ctx,360,430,500,105,'BLOCK DATA',altered?'Amount: 9':'Amount: 1',altered?'#ff8f86':c);
  arrow(ctx,360,489,360,565,c,ease(p,.08,.3));card(ctx,360,630,500,110,'HASH FUNCTION','Same input → same output',c);
  arrow(ctx,360,690,360,759,c,ease(p,.2,.4));card(ctx,360,825,500,105,'FINGERPRINT',altered?'F2  91  7B  …':'A8  3C  E1  …',altered?'#ff8f86':c);
  ctx.save();ctx.globalAlpha=changed;text(ctx,'Different input, different hash',360,942,25,'#ffb2a7',700);ctx.restore();
 }else if(s.chapter==='network'){
  const pts=[[360,440],[540,535],[540,755],[360,850],[180,755],[180,535]];
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){if((j-i)%2===1){ctx.save();ctx.globalAlpha=ease(p,.08,.3)*.6;line(ctx,...pts[i],...pts[j],c,2);ctx.restore()}}
  for(let i=0;i<pts.length;i++){const [x,y]=pts[i];node(ctx,x,y,'NODE '+(i+1),c,ease(p,i*.055,i*.055+.18));}
  ctx.save();ctx.globalAlpha=ease(p,.35,.52);card(ctx,360,645,230,112,'SHARED','LEDGER',c);ctx.restore();
  for(let i=0;i<6;i++){let f=clamp((p-.38-i*.025)*2.1);const [x,y]=pts[i];glow(ctx,360+(x-360)*f,645+(y-645)*f,26,c+'90');}
 }else{
  for(let i=0;i<3;i++){const y=430+i*174,changed=i===1&&p>.54,col=changed?'#ff9a87':c;card(ctx,360,y,480,118,'BLOCK 0'+(i+1),i===0?'Hash A':i===1?(changed?'Hash B*   •   prev A':'Hash B   •   prev A'):'Hash C   •   prev B',col);if(i<2)arrow(ctx,360,y+62,360,y+108,i===1&&p>.54?'#ff9a87':c,ease(p,.1+i*.06,.32+i*.06));}
  ctx.save();ctx.globalAlpha=ease(p,.58,.75);text(ctx,'MISMATCH DETECTED',360,956,30,'#ffad99',900);ctx.restore();
 }
 ctx.fillStyle='#2a4053';ctx.fillRect(54,1209,612,4);ctx.fillStyle=c;ctx.fillRect(54,1209,612*(index+p)/total,4);ctx.restore();
}
