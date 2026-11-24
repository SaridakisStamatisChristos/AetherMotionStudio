import {clamp,ease,mix} from '../core/motion.js';
import {r,glow,text,star,polygon,paperLabel} from '../visual/primitives.js';
import {createProjection,createMesh} from '../visual/mesh.js';
import {emitAsset} from '../visual/assets.js';
export function draw(ctx,t,W=1080,H=1920,scene){
 ctx.save();ctx.scale(W/720,H/1280);const w=720,h=1280;
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#0d142b');bg.addColorStop(.48,'#17112e');bg.addColorStop(1,'#050911');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 glow(ctx,175,650,430,'rgba(30,86,213,.36)');glow(ctx,560,570,330,'rgba(123,39,129,.26)');
 const open=ease(t,3.3,5.15),reveal=ease(t,4.1,5.4),punch=ease(t,5.3,6.2),angle=.35+.17*Math.sin(t*.53)-.3*punch;
 const target=[0,1.45,0],cam=[Math.sin(angle)*7.9,3.65+.3*Math.sin(t*.65),Math.cos(angle)*7.9],zoom=1110+100*ease(t,0,2.6)+110*punch-95*ease(t,9.2,11.8);
 const project=createProjection(cam,target,zoom);
 const path=(p,fill,stroke)=>polygon(ctx,p,fill,stroke);
 ctx.strokeStyle='rgba(113,139,209,.10)';ctx.lineWidth=1;for(let i=-8;i<=8;i++){for(const pts of [[[i,0,-4],[i,0,5]],[[-7,0,i],[7,0,i]]]){let a=project(pts[0]),b=project(pts[1]);if(a[2]>.5&&b[2]>.5){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}}}
 for(const [x,z,rad] of [[.85,.12,165],[-1.04,.45,105]]){const p=project([x,.01,z]);ctx.save();ctx.translate(p[0],p[1]);ctx.scale(1,.27);glow(ctx,0,0,rad,'rgba(0,0,0,.82)');ctx.restore()}
 const {faces,box}=createMesh(cam,project,reveal);
 const step=ease(t,.15,2.55),walking=Math.sin(t*9)*(1-step),robotX=mix(-2.55,-1.03,step),bob=.045*Math.sin(t*4)+Math.abs(walking)*.055;
 emitAsset('retro-robot',box,{origin:[robotX,bob,.42],yaw:.17+.34*ease(t,2.3,3.1)-.2*ease(t,6.2,7),walking,open,headRoll:-.06*Math.sin(t*2)-.12*open,headYaw:-.18+.17*open,blink:1-.9*Math.exp(-Math.pow((t-2.7)*18,2))});
 const chest=emitAsset('treasure-chest',box,{origin:[.85,0,.08],yaw:-.16,open});
 const center=project(chest([0,.9,0]));if(reveal>0){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=reveal*.8;let beam=ctx.createLinearGradient(center[0],center[1],center[0],center[1]-570);beam.addColorStop(0,'rgba(255,215,103,.8)');beam.addColorStop(.55,'rgba(255,180,76,.21)');beam.addColorStop(1,'rgba(255,180,76,0)');path([[center[0]-70,center[1]],[center[0]+70,center[1]],[center[0]+145,center[1]-590],[center[0]-145,center[1]-590]],beam);glow(ctx,center[0],center[1]-75,240,'rgba(255,176,55,.48)');ctx.restore()}
 faces.sort((a,b)=>b.z-a.z).forEach(f=>path(f.p,f.color,f.edge));
 if(reveal>0){ctx.save();ctx.globalCompositeOperation='screen';glow(ctx,center[0],center[1]-35,145,'rgba(255,195,68,'+(.51*reveal)+')');for(let j=0;j<3;j++){let radius=(1.11+j*.19)*(.75+.25*reveal),cy=.86+j*.27+.12*Math.sin(t*2+j);ctx.strokeStyle=['#63f6f4','#ffd663','#a299ff'][j];ctx.globalAlpha=.83*reveal;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=16;ctx.lineWidth=3.6-j*.5;ctx.beginPath();for(let i=0;i<=100;i++){let a=i/100*Math.PI*2+t*.8+j,p=project(chest([Math.cos(a)*radius,cy+.17*Math.sin(a*2+j),Math.sin(a)*radius]));i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.stroke()}ctx.shadowBlur=0;
 for(let i=0;i<70;i++){const age=t-4.15-r(i+31)*1.2;if(age<0)continue;const loop=(age/(2.4+r(i+80)*1.5))%1;let a=r(i)*Math.PI*2,rr=(.2+loop*2.3)*(.5+r(i+21)*.7),p=project(chest([Math.cos(a)*rr,.9+loop*(1.4+r(i+71)*1.9),Math.sin(a)*rr]));ctx.globalAlpha=reveal*Math.sin(Math.PI*loop)*.93;ctx.fillStyle=i%4===0?'#81f6f9':'#ffe08a';if(i%6===0)star(ctx,p[0],p[1],4+8*r(i+120),a+t);else{ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(a);ctx.fillRect(-2,-2,3+12*r(i+140),2.5);ctx.restore()}}ctx.restore()}
 const vig=ctx.createRadialGradient(360,590,250,360,590,790);vig.addColorStop(0,'transparent');vig.addColorStop(1,'rgba(0,0,0,.59)');ctx.fillStyle=vig;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#75e5e0';ctx.fillRect(53,71,32,4);ctx.font='700 13px Arial';ctx.textAlign='left';ctx.fillStyle='#d1e6ee';ctx.fillText(scene.copy.kicker,96,78);ctx.textAlign='right';ctx.fillText('01 — 03',665,78);
 const intro=1-ease(t,2.8,3.35),main=ease(t,5.35,5.95),end=ease(t,9.1,9.65);
 const paper=(...args)=>paperLabel(ctx,...args);
 if(intro>.01){ctx.save();ctx.globalAlpha=intro*ease(t,.05,.6);text(ctx,scene.copy.intro[0],360,184,44,'#e7e5df');text(ctx,scene.copy.intro[1],360,257,88,'#fff3d8',900);text(ctx,scene.copy.intro[2],360,320,27,'#75e5e0',800);ctx.restore()}
 if(t>3.05&&t<5.55){const a=ease(t,3.05,3.45)*(1-ease(t,5.08,5.55));paper(scene.copy.question,360,230+25*(1-a),43,'#f9e7bd','#19172b',a,-.035)}
 if(main>0){const a=main*(1-end);paper(scene.copy.reveal[0],360,221+44*(1-main),91,'#fff0c7','#111523',a,-.025);paper(scene.copy.reveal[1],360,310,38,'#205dc3','#fff',a,.025);ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#ffc94c';star(ctx,105,220,24,-Math.PI/2);ctx.restore()}
 if(end>0){paper(scene.copy.outro[0],360,214,49,'#e8e5d8','#141a2b',end,-.025);paper(scene.copy.outro[1],360,306,65,'#75e5e0','#10172a',end,.025)}
 const captions=scene.captions;const c=captions.find(a=>t>=a[0]&&t<a[1]);if(c){const a=ease(t,c[0],c[0]+.15);paper(c[2],360,1100+12*(1-a),30,'#ef9b49','#141321',a,-.018)}
 ctx.fillStyle='rgba(235,243,255,.19)';ctx.fillRect(54,1212,612,3);ctx.fillStyle='#76e6df';ctx.fillRect(54,1212,612*clamp(t/12),3);ctx.restore();
}