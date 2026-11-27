// DUAL-05 exit fixtures: our own illustrations for the dual05-gallery film (own work, procedural, deterministic; no
// third-party media). Drawn in the renderer's Chromium canvas, written in all three formats by local tools, some with
// EXIF orientation (stored rotated, shown upright), and imported through scripts/media-import.mjs with every check.
//   node scripts/dual05-gallery-media.mjs            (writes out/dual05-media-src/ and imports into public/media)
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {encodePNG,storeForOrientation,jpegWithOrientation} from './media-fixtures.mjs';
import {addMedia,ffmpegPath} from './media-import.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=join(root,'out','dual05-media-src');mkdirSync(out,{recursive:true});
const require=createRequire(join(root,'package.json')),{openBrowser}=require('@remotion/renderer');
// Each picture: a deterministic drawing function evaluated in the page (seeded random, no clock).
const PICTURES={
 lighthouse:[1200,1500,`
  const g=x.createLinearGradient(0,0,0,H*.62);g.addColorStop(0,'#1d2550');g.addColorStop(.55,'#b5546a');g.addColorStop(1,'#f3a65a');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let i=0;i<90;i++){x.fillStyle='rgba(255,255,240,'+(.3+.6*R())+')';x.beginPath();x.arc(R()*W,R()*H*.3,1+R()*2,0,7);x.fill();}
  x.fillStyle='#fde9b0';x.beginPath();x.arc(W*.2,H*.5,70,0,7);x.fill();
  const s=x.createLinearGradient(0,H*.62,0,H);s.addColorStop(0,'#2c4a6b');s.addColorStop(1,'#0d1a2b');x.fillStyle=s;x.fillRect(0,H*.62,W,H*.38);
  for(let i=0;i<60;i++){x.strokeStyle='rgba(255,220,170,'+(.15+.25*R())+')';x.lineWidth=2;const y=H*.64+R()*H*.34,l=40+R()*120,cx=R()*W;x.beginPath();x.moveTo(cx-l/2,y);x.lineTo(cx+l/2,y);x.stroke();}
  x.fillStyle='#1b1a22';x.beginPath();x.moveTo(W*.38,H);x.lineTo(W*.46,H*.74);x.lineTo(W*.6,H*.7);x.lineTo(W*.78,H*.78);x.lineTo(W*.92,H);x.fill();
  const bx=W*.6,top=H*.22,base=H*.72;x.fillStyle='#f4efe6';x.beginPath();x.moveTo(bx-95,base);x.lineTo(bx-62,top);x.lineTo(bx+62,top);x.lineTo(bx+95,base);x.fill();
  x.fillStyle='#b8322f';for(let k=0;k<3;k++){const y0=top+(base-top)*(.18+k*.3),y1=y0+(base-top)*.12,w0=62+33*(y0-top)/(base-top),w1=62+33*(y1-top)/(base-top);x.beginPath();x.moveTo(bx-w0,y0);x.lineTo(bx+w0,y0);x.lineTo(bx+w1,y1);x.lineTo(bx-w1,y1);x.fill();}
  x.fillStyle='#2a2a33';x.fillRect(bx-80,top-20,160,22);x.fillStyle='#ffe9a3';x.fillRect(bx-48,top-110,96,90);x.fillStyle='#2a2a33';x.beginPath();x.moveTo(bx-62,top-110);x.lineTo(bx,top-175);x.lineTo(bx+62,top-110);x.fill();
  const b=x.createLinearGradient(bx,0,0,0);b.addColorStop(0,'rgba(255,240,180,.75)');b.addColorStop(1,'rgba(255,240,180,0)');x.fillStyle=b;x.beginPath();x.moveTo(bx-30,top-65);x.lineTo(0,top-260);x.lineTo(0,top+140);x.fill();`],
 harbour:[1600,1200,`
  x.fillStyle='#ead9b0';x.fillRect(0,0,W,H);for(let i=0;i<2500;i++){x.fillStyle='rgba(120,90,40,'+(.03+.05*R())+')';x.fillRect(R()*W,R()*H,2+R()*3,2+R()*3);}
  x.fillStyle='#b9cfc4';x.fillRect(0,0,W,H);x.globalAlpha=.85;x.fillStyle='#ead9b0';x.beginPath();x.moveTo(0,0);x.lineTo(W,0);x.lineTo(W,H*.28);
  for(let t=0;t<=1;t+=.02)x.lineTo(W*(1-t),H*(.28+.12*Math.sin(t*9)+.05*Math.sin(t*23)+(t>.4&&t<.62?.32:0)));x.lineTo(0,H*.3);x.fill();x.globalAlpha=1;
  x.strokeStyle='#5b4a2e';x.lineWidth=5;x.stroke();
  x.fillStyle='#6d8f84';x.font='italic 48px serif';x.fillText('North Sea',W*.08,H*.86);x.fillStyle='#5b4a2e';x.font='bold 52px serif';x.fillText('Port Haven, 1850',W*.06,H*.12);
  for(const [rx,ry] of [[.42,.62],[.6,.66],[.51,.78]]){x.fillStyle='#7a3b2e';for(let i=0;i<14;i++){x.beginPath();x.arc(W*rx+(R()-.5)*90,H*ry+(R()-.5)*40,5+R()*7,0,7);x.fill();}}
  x.strokeStyle='#7a3b2e';x.setLineDash([16,12]);x.lineWidth=5;x.beginPath();x.moveTo(W*.5,H*.98);x.bezierCurveTo(W*.5,H*.82,W*.56,H*.72,W*.51,H*.55);x.stroke();x.setLineDash([]);
  x.fillStyle='#f4efe6';x.strokeStyle='#5b4a2e';x.lineWidth=4;x.beginPath();x.arc(W*.72,H*.47,22,0,7);x.fill();x.stroke();x.fillStyle='#b8322f';x.beginPath();x.arc(W*.72,H*.47,10,0,7);x.fill();`],
 compass:[600,600,`
  x.clearRect(0,0,W,H);x.translate(W/2,H/2);x.strokeStyle='rgba(60,40,20,.9)';x.lineWidth=6;x.beginPath();x.arc(0,0,250,0,7);x.stroke();x.lineWidth=3;x.beginPath();x.arc(0,0,215,0,7);x.stroke();
  for(let k=0;k<8;k++){x.save();x.rotate(k*Math.PI/4);x.fillStyle=k%2?'rgba(120,90,50,.9)':'rgba(150,40,30,.95)';const L=k%2?150:235;x.beginPath();x.moveTo(0,-L);x.lineTo(28,0);x.lineTo(0,18);x.lineTo(-28,0);x.fill();x.restore();}
  x.fillStyle='rgba(60,40,20,.95)';x.font='bold 64px serif';x.textAlign='center';x.textBaseline='middle';x.fillText('N',0,-275+24);`],
 lens:[1400,1000,`
  const g=x.createRadialGradient(W/2,H/2,10,W/2,H/2,W*.6);g.addColorStop(0,'#fff6d8');g.addColorStop(.2,'#f0c86a');g.addColorStop(1,'#1a2233');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let r=40;r<460;r+=34){x.strokeStyle='rgba(255,255,255,'+(.55-r/1000)+')';x.lineWidth=10;x.beginPath();x.arc(W/2,H/2,r,0,7);x.stroke();x.strokeStyle='rgba(120,90,40,.35)';x.lineWidth=3;x.beginPath();x.arc(W/2,H/2,r+12,0,7);x.stroke();}
  x.strokeStyle='#3b3226';x.lineWidth=16;for(let k=0;k<8;k++){const a=k*Math.PI/4;x.beginPath();x.moveTo(W/2+Math.cos(a)*120,H/2+Math.sin(a)*120);x.lineTo(W/2+Math.cos(a)*470,H/2+Math.sin(a)*470);x.stroke();}
  x.fillStyle='#fff';x.beginPath();x.ellipse(W/2,H/2,24,40,0,0,7);x.fill();`],
 storm:[1500,1100,`
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0c1018');g.addColorStop(.5,'#26323f');g.addColorStop(1,'#0d1620');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let i=0;i<500;i++){x.strokeStyle='rgba(190,210,230,'+(.15+.2*R())+')';x.lineWidth=1.5;const px=R()*W,py=R()*H;x.beginPath();x.moveTo(px,py);x.lineTo(px-18,py+46);x.stroke();}
  for(let k=0;k<7;k++){x.fillStyle='rgba('+(30+k*8)+','+(55+k*9)+','+(75+k*10)+',.95)';x.beginPath();x.moveTo(0,H);const y=H*(.55+k*.065);for(let t=0;t<=W;t+=20)x.lineTo(t,y+Math.sin(t/(90+k*9)+k)*30*(1+k*.2));x.lineTo(W,H);x.fill();}
  x.save();x.translate(W*.42,H*.6);x.rotate(-.12);x.fillStyle='#14100c';x.beginPath();x.moveTo(-190,0);x.lineTo(190,0);x.lineTo(140,60);x.lineTo(-150,60);x.fill();x.fillRect(-8,-260,14,262);x.fillRect(90,-200,10,202);
  x.fillStyle='rgba(230,225,210,.85)';x.beginPath();x.moveTo(0,-250);x.lineTo(0,-40);x.lineTo(-150,-50);x.fill();x.beginPath();x.moveTo(98,-190);x.lineTo(98,-50);x.lineTo(180,-60);x.fill();x.restore();
  const b=x.createLinearGradient(W,0,W*.3,0);b.addColorStop(0,'rgba(255,236,170,.55)');b.addColorStop(1,'rgba(255,236,170,0)');x.fillStyle=b;x.beginPath();x.moveTo(W,H*.28);x.lineTo(W*.25,H*.18);x.lineTo(W*.25,H*.42);x.fill();`]
};
// Format and stored orientation of each picture (orientation = EXIF tag; the stored pixels are rotated so the
// picture shows upright only when the orientation is applied).
const PLAN={lighthouse:{format:'jpeg',orientation:6},harbour:{format:'png',orientation:8},compass:{format:'png',orientation:1},lens:{format:'webp',orientation:1},storm:{format:'jpeg',orientation:3}};
const browser=await openBrowser('chrome',{logLevel:'error'});
const raw={};
try{const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
 for(const [name,[W,H,code]] of Object.entries(PICTURES)){
  const b64=await page.evaluate(new Function('W','H','let seed=7;const R=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;const c=new OffscreenCanvas(W,H),x=c.getContext("2d",{willReadFrequently:true});'+code+';const d=x.getImageData(0,0,W,H).data;let out="";for(let i=0;i<d.length;i+=32768)out+=String.fromCharCode.apply(null,d.subarray(i,i+32768));return btoa(out);'),W,H);
  raw[name]={width:W,height:H,rgba:new Uint8Array(Buffer.from(b64,'base64'))};}
}finally{await browser.close({silent:true});}
const ff=ffmpegPath(),enc=(rgba,w,h,file,args)=>{const tmp=join(out,'tmp.rgba');writeFileSync(tmp,rgba);const r=spawnSync(ff,['-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',w+'x'+h,'-i',tmp,...args,file]);if(r.status!==0)throw Error('ffmpeg: '+r.stderr);return readFileSync(file);};
for(const [name,{format,orientation}] of Object.entries(PLAN)){
 const p=raw[name],s=storeForOrientation(p.rgba,p.width,p.height,orientation),ext={png:'png',jpeg:'jpg',webp:'webp'}[format],file=join(out,name+'.'+ext);
 let bytes;
 if(format==='png')bytes=encodePNG(s.rgba,s.width,s.height,{orientation:orientation===1?null:orientation});
 else if(format==='jpeg')bytes=jpegWithOrientation(enc(s.rgba,s.width,s.height,join(out,'tmp.jpg'),['-q:v','2','-pix_fmt','yuvj444p']),orientation);
 else bytes=enc(s.rgba,s.width,s.height,join(out,'tmp.webp'),['-c:v','libwebp','-quality','92','-pix_fmt','yuv420p']);
 writeFileSync(file,bytes);
 const r=await addMedia({file,id:'dual05-'+name,licence:'own-work',source:'scripts/dual05-gallery-media.mjs (procedural drawing, AetherMotion Studio)',attribution:null});
 console.log(r.status.toUpperCase(),r.id,r.entry.format,r.entry.width+'x'+r.entry.height,'orientation',r.entry.orientation,'shown',r.entry.displayWidth+'x'+r.entry.displayHeight,r.entry.sha256.slice(0,16));
}
