import {createProjection,createMesh} from '../visual/mesh.js';
import {polygon,glow,star,text,r} from '../visual/primitives.js';
import {evaluateGraph,emitGraph} from '../core/graph.js';
const TAU=Math.PI*2;
export function drawGraph(ctx,p,W,H,s,three){
 const state=evaluateGraph(s,p),{camera:c,environment:env}=state;
 const project=createProjection(c.position,c.target,c.zoom,[360,640]);
 ctx.save();ctx.scale(W/720,H/1280);
 if(s.backend==='three'){
  if(!three)throw Error('Three.js backend unavailable; select cpu explicitly to use the fallback');
  ctx.drawImage(three.render(state,W,H),0,0,720,1280);
 }else{
  const bg=ctx.createLinearGradient(0,0,0,1280);bg.addColorStop(0,env.background);bg.addColorStop(1,'#070c13');ctx.fillStyle=bg;ctx.fillRect(0,0,720,1280);
  glow(ctx,360,700,400,env.accent+'22');
  ctx.strokeStyle=env.accent+'20';ctx.lineWidth=1;
  for(let i=-6;i<=6;i++)for(const pair of [[[i,0,-5],[i,0,5]],[[-6,0,i],[6,0,i]]]){
   const a=project(pair[0]),b=project(pair[1]);if(a[2]>.5&&b[2]>.5){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  }
  for(const a of state.assets){const q=project(a.pose.origin);ctx.save();ctx.translate(q[0],q[1]);ctx.scale(1,.24);glow(ctx,0,0,105*a.pose.scale,'rgba(0,0,0,.6)');ctx.restore()}
  const {box,faces}=createMesh(c.position,project,.3);emitGraph(state,box);
  for(const f of faces.sort((a,b)=>b.z-a.z))polygon(ctx,f.p,f.color,f.edge);
 }
 // Shared screen-space cinematic effects; no randomness or wall clock.
 for(const e of state.effects){
  if(e.strength<=0)continue;
  const a=state.assets.find(x=>x.id===e.target),[x,y,z]=a.pose.origin,k=a.pose.scale,center=project([x,y+1.05*k,z]);
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=e.strength;
  if(e.type==='glow')glow(ctx,center[0],center[1],155*k,e.color+'60');
  if(e.type==='orbit'){for(let j=0;j<2;j++){ctx.strokeStyle=e.color;ctx.lineWidth=2.5;ctx.globalAlpha=e.strength*(.65-j*.2);ctx.beginPath();for(let i=0;i<=80;i++){let th=i/80*TAU+p*TAU+j;let q=project([x+(1.05+j*.2)*k*Math.cos(th),y+k*(.8+j*.32+.16*Math.sin(th*2)),z+(1.05+j*.2)*k*Math.sin(th)]);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])}ctx.stroke()}}
  if(e.type==='sparkles'){for(let i=0;i<32;i++){let th=r(i)*TAU+p*TAU,h=(r(i+31)+p*2)%1,rad=(.35+r(i+14))*k;let q=project([x+rad*Math.cos(th),y+k*(.5+h*2.1),z+rad*Math.sin(th)]);ctx.globalAlpha=e.strength*Math.sin(Math.PI*h)*.85;ctx.fillStyle=e.color;star(ctx,q[0],q[1],2+4*r(i+90),th)}}
  ctx.restore();
 }
 const vignette=ctx.createRadialGradient(360,640,270,360,640,800);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'rgba(2,6,15,.57)');ctx.fillStyle=vignette;ctx.fillRect(0,0,720,1280);
 text(ctx,'AETHER LAB / CINEMATIC STUDIES',360,77,15,env.accent,700);
 text(ctx,s.heading,360,194,58,'#f4efe5',900);text(ctx,s.subheading,360,274,27,env.accent,700);
 ctx.fillStyle=env.accent+'35';ctx.fillRect(54,1212,612,3);ctx.fillStyle=env.accent;ctx.fillRect(54,1212,612*p,3);
 ctx.restore();
}
