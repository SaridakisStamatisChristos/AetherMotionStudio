import {clamp,ease,keyframes} from '../core/motion.js';
import {createProjection,createMesh} from '../visual/mesh.js';
import {emitAsset} from '../visual/assets.js';
import {glow,star,text,polygon,paperLabel,r} from '../visual/primitives.js';
// Independent choreography using the original robot rig plus a new energy-core asset.
export function draw(ctx,t,W,H,s){
 ctx.save();ctx.scale(W/720,H/1280);
 const bg=ctx.createLinearGradient(0,0,720,1280);bg.addColorStop(0,'#0b1425');bg.addColorStop(.55,'#142f41');bg.addColorStop(1,'#071019');ctx.fillStyle=bg;ctx.fillRect(0,0,720,1280);
 const charge=ease(t,3.5,6.1),angle=keyframes(t,[[0,.2],[3,.45],[7,-.23],[12,.16]]);
 const cam=[Math.sin(angle)*8.4,3.5,Math.cos(angle)*8.4],project=createProjection(cam,[0,1.25,0],keyframes(t,[[0,1050],[4,1180],[8,1260],[12,1100]]),[360,685]);
 glow(ctx,360,690,460,'rgba(33,159,190,.19)');
 ctx.strokeStyle='rgba(109,205,228,.16)';ctx.lineWidth=1;
 for(let i=-6;i<=6;i++)for(const pair of [[[i,0,-5],[i,0,5]],[[-6,0,i],[6,0,i]]]){
 const a=project(pair[0]),b=project(pair[1]);if(a[2]>.5&&b[2]>.5){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
 }
 const {box,faces}=createMesh(cam,project,charge);
 emitAsset('retro-robot',box,{origin:[keyframes(t,[[0,-2.1],[2.8,-1.03],[12,-1.03]]),.028*Math.sin(t*5),.25],yaw:.23,scale:.88,walking:Math.sin(t*10)*(1-ease(t,1.8,2.8)),open:charge,headRoll:.12*charge,headYaw:.15,blink:1-.9*Math.exp(-Math.pow((t-8)*18,2))});
 emitAsset('energy-core',box,{origin:[.95,0,.02],yaw:t*.65,scale:1,pulse:Math.sin(t*3)*charge});
 for(const f of faces.sort((a,b)=>b.z-a.z))polygon(ctx,f.p,f.color,f.edge);
 const p=project([.95,1.05,.02]);ctx.save();ctx.globalCompositeOperation='screen';glow(ctx,p[0],p[1],180,'rgba(79,227,255,'+(.36*charge)+')');
 for(let i=0;i<3;i++){ctx.strokeStyle=['#60e5f4','#b6f9dc','#e3fcff'][i];ctx.globalAlpha=charge*(.65-i*.14);ctx.lineWidth=2.5;ctx.beginPath();for(let j=0;j<=80;j++){let a=j/80*Math.PI*2+t*.7;let q=project([.95+(1+i*.2)*Math.cos(a),.75+i*.26+.18*Math.sin(a*2+i),(1+i*.2)*Math.sin(a)]);j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}ctx.stroke();}
 for(let i=0;i<34;i++){const a=r(i)*Math.PI*2+t*.5,rr=.4+r(i+13)*1.35,h=(r(i+31)+t*.21)%1;const q=project([.95+rr*Math.cos(a),.4+h*2.6,rr*Math.sin(a)]);ctx.globalAlpha=charge*Math.sin(Math.PI*h)*.8;ctx.fillStyle='#aefbff';star(ctx,q[0],q[1],2+r(i+73)*4,a);}
 ctx.restore();
 text(ctx,s.copy.kicker,360,76,15,'#8de9ee',700);
 const stage=t<3.2?0:t<5.45?1:t<9?2:3,lines=[s.copy.intro,[s.copy.question],s.copy.reveal,s.copy.outro][stage],a=ease(t,[0,3.2,5.45,9][stage],[.4,3.6,5.85,9.4][stage]);
 lines.forEach((line,i)=>paperLabel(ctx,line,360,190+i*76,i===0?52:35,i%2?'#65d9d8':'#e3f0ed','#112b39',a,i%2?.015:-.02));
 const c=s.captions.find(x=>t>=x[0]&&t<x[1]);if(c)paperLabel(ctx,c[2],360,1100,28,'#65d9d8','#0c2431',ease(t,c[0],c[0]+.12));
 ctx.fillStyle='#274052';ctx.fillRect(54,1212,612,3);ctx.fillStyle='#75e5e0';ctx.fillRect(54,1212,612*clamp(t/12),3);ctx.restore();
}
