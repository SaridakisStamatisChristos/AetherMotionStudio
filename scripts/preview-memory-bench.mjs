// DUAL-09 hardening evidence: peak process memory of the Studio preview's picture loading under rapid switching.
// Generates distinct 4096×4096 pictures (each at the per-picture limit, 64 MB decoded; PNG and JPEG), groups them into
// projects of four (each at the per-film limit, 256 MB decoded), serves them with the repository's browser modules
// from a local server, and drives src/visual/preview-media.js in a headless Chromium with the real fetch,
// createImageBitmap and Web Crypto. It runs the same switching sequence with the loader before the hardening
// (`--old <file>`, a copy of the DUAL-07 file) and with the current one, each in a fresh browser, and samples the
// summed working set and private bytes of every headless browser process it started (Windows Get-Process, ~100 ms).
//   node scripts/preview-memory-bench.mjs [--switches 96] [--rounds 2] [--old <path to the DUAL-07 preview-media.js>]
// Output: out/dual09-preview-mem/result.json. Local evidence only; no network, nothing written outside out/.
import {mkdirSync,writeFileSync,readFileSync,existsSync,statSync} from 'node:fs';
import {join,resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {openBrowser} from '@remotion/renderer';
import {encodePNG} from './media-fixtures.mjs';
import {ffmpegPath} from './media-import.mjs';
import {inspectImage,MEDIA_LIMITS} from '../src/core/media.js';
import {previewMemoryBound} from '../src/visual/preview-media.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=join(root,'out','dual09-preview-mem'),media=join(out,'media');
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:d;};
const SWITCHES=Number(arg('--switches','96')),ROUNDS=Number(arg('--rounds','2')),OLD=arg('--old',null),PORT=Number(arg('--port','4195'));
if(process.platform!=='win32')throw Error('process sampling is implemented for Windows only');
mkdirSync(media,{recursive:true});
const W=4096,H=4096,N=24;
// ---- pictures (cached on disk) ----
const sources=[];
for(let i=0;i<N;i++){
 const jpeg=i%2===1,file='bench-'+String(i).padStart(2,'0')+(jpeg?'.jpg':'.png'),path=join(media,file);
 if(!existsSync(path)){
  let seed=1000+i;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  const rgba=new Uint8Array(W*H*4),hue=[(i*53)%256,(i*97)%256,(i*151)%256];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=(y*W+x)*4,n=(rnd()*14)|0;rgba[p]=(hue[0]+(x>>4))&255;rgba[p+1]=(hue[1]+(y>>4)+n)&255;rgba[p+2]=(hue[2]+((x^y)>>5))&255;rgba[p+3]=255;}
  if(!jpeg)writeFileSync(path,encodePNG(rgba,W,H));
  else{const tmp=join(out,'tmp.rgba');writeFileSync(tmp,rgba);const r=spawnSync(ffmpegPath(),['-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',W+'x'+H,'-i',tmp,'-q:v','2','-pix_fmt','yuvj444p',path]);if(r.status!==0)throw Error('ffmpeg: '+r.stderr);}
 }
 const bytes=new Uint8Array(readFileSync(path)),info=inspectImage(bytes,jpeg?'jpeg':'png');
 sources.push({media:'bench-'+i,file,sha256:createHash('sha256').update(bytes).digest('hex'),format:info.format,width:info.width,height:info.height,orientation:info.orientation,displayWidth:info.displayWidth,displayHeight:info.displayHeight,fileBytes:bytes.length});
}
// 12 projects of four distinct pictures (neighbours share two), each exactly at the per-film decoded limit
const projects=Array.from({length:12},(_,j)=>({version:2,shots:[0,1,2,3].map(k=>{const s=sources[(2*j+k)%N];const {fileBytes,media:m,...src}=s;return {composition:{version:'compose-v2',items:[{type:'image',media:m,source:src}]}};})}));
for(const p of projects){const total=p.shots.reduce((n,s)=>n+s.composition.items[0].source.width*s.composition.items[0].source.height*4,0);if(total>MEDIA_LIMITS.filmDecodedBytes)throw Error('project over the film limit');}
// ---- local server: repository browser modules, the bench pictures, the old loader copy, the page ----
const PAGE=`<!doctype html><meta charset="utf-8"><title>bench</title><script type="module">
import {webSha256} from '/src/core/media.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
window.bench=async(impl,switches)=>{
 const mod=await import(impl==='old'?'/old/preview-media.js':'/src/visual/preview-media.js');
 const reg=await import('/src/visual/media-registry.js');
 const projects=await (await fetch('/projects.json')).json();
 let fetches=0,aborts=0;
 const pm=mod.createPreviewMedia({fetchBytes:async(file,signal)=>{fetches++;signal?.addEventListener('abort',()=>aborts++,{once:true});const r=await fetch('/media/'+file,{signal});if(!r.ok)throw Error('HTTP '+r.status);return new Uint8Array(await r.arrayBuffer());},decode:(bytes,type)=>createImageBitmap(new Blob([bytes],{type})),sha256Hex:webSha256});
 let peakReg=0;const poll=setInterval(()=>{peakReg=Math.max(peakReg,reg.registeredBytes());},25);
 let seed=5;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
 const t0=performance.now(),pending=[];let cur=-1,last=null;
 for(let i=0;i<switches;i++){
  let j;do j=Math.floor(rnd()*projects.length);while(j===cur);cur=j;last=projects[j];
  const p=pm.sync(last);pending.push(p);
  if(i%4===3)await p;else await sleep(150);// three of every four switches 150 ms apart, the fourth waits for its film
 }
 await Promise.all(pending);const fin=await pm.sync(last);clearInterval(poll);peakReg=Math.max(peakReg,reg.registeredBytes());
 return {impl,switches,ms:Math.round(performance.now()-t0),fetches,aborts,peakRegisteredMB:+(peakReg/1048576).toFixed(1),finalRegistered:fin.registered,finalDecodedMB:+(fin.decodedBytes/1048576).toFixed(1),finalDiagnostics:fin.diagnostics,stats:pm.stats?.()??null};
};
window.ready=true;
</script>`;
const oldSrc=OLD?readFileSync(OLD,'utf8').replace("'../core/media.js'","'/src/core/media.js'").replace("'./media-registry.js'","'/src/visual/media-registry.js'"):null;
const server=createServer((req,res)=>{
 const u=new URL(req.url,'http://x').pathname;
 const send=(code,type,body)=>{res.writeHead(code,{'content-type':type,'cache-control':'no-store'});res.end(body);};
 if(u==='/'||u==='/bench.html')return send(200,'text/html',PAGE);
 if(u==='/projects.json')return send(200,'application/json',JSON.stringify(projects));
 if(u==='/old/preview-media.js'&&oldSrc)return send(200,'text/javascript',oldSrc);
 const m=/^\/media\/(bench-\d\d\.(png|jpg))$/.exec(u);if(m)return send(200,m[2]==='png'?'image/png':'image/jpeg',readFileSync(join(media,m[1])));
 if(/^\/src\/[a-z0-9/_.-]+\.js$/.test(u)&&!u.includes('..')){const f=join(root,u);if(existsSync(f))return send(200,'text/javascript',readFileSync(f));}
 send(404,'text/plain','not found');
});
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
// ---- process memory sampler (~100 ms): every headless Chromium process started after the sampler (so the owner's
// own, older browsers are not counted); summed working set and private bytes ----
const SAMPLER=`$t0=Get-Date;while($true){$ws=0;$pv=0;$n=0;foreach($p in (Get-Process -Name 'chrome-headless-shell','chrome' -ErrorAction SilentlyContinue)){try{if($p.StartTime -lt $t0){continue}}catch{continue};$ws+=$p.WorkingSet64;$pv+=$p.PrivateMemorySize64;$n++};[Console]::Out.WriteLine("$ws $pv $n");[Console]::Out.Flush();Start-Sleep -Milliseconds 100}`;
function sampler(){const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',SAMPLER],{windowsHide:true});const rows=[];let buf='';p.stdout.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\n'))>=0){const [ws,pv,n]=buf.slice(0,i).trim().split(' ').map(Number);buf=buf.slice(i+1);if(Number.isFinite(ws))rows.push({t:Date.now(),ws,pv,n});}});return {rows,stop:()=>p.kill()};}
const MB=b=>+(b/1048576).toFixed(0);
async function runOne(impl){
 const s=sampler();await new Promise(r=>setTimeout(r,1500));
 const browser=await openBrowser('chrome',{logLevel:'error'});
 try{
  const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
  await page.goto({url:'http://127.0.0.1:'+PORT+'/bench.html',timeout:30000});
  for(let i=0;i<100&&!(await page.evaluate(()=>window.ready===true));i++)await new Promise(r=>setTimeout(r,100));
  // idle reference: the loaded page before any picture, at least 10 samples
  const from=s.rows.length;for(let i=0;i<100&&s.rows.length-from<10;i++)await new Promise(r=>setTimeout(r,100));
  const idle=s.rows.slice(from);if(idle.length<5)throw Error('memory sampler produced too few idle samples');s.rows.splice(0,from);
  await page.evaluate((impl,n)=>{window.__r=null;window.__e=null;window.bench(impl,n).then(r=>{window.__r=r;},e=>{window.__e=String(e?.stack??e);});},impl,SWITCHES);
  let r=null;for(;;){await new Promise(x=>setTimeout(x,1000));const v=await page.evaluate(()=>({r:window.__r,e:window.__e}));if(v.e)throw Error(v.e);if(v.r){r=v.r;break;}}
  await new Promise(x=>setTimeout(x,1500));
  const during=s.rows.slice(idle.length),peak=k=>Math.max(...during.map(x=>x[k])),base=k=>Math.max(...idle.map(x=>x[k]));
  const end=during.slice(-5),endPv=Math.max(...end.map(x=>x.pv));
  return {...r,samples:during.length,sampleEveryMs:Math.round((during.at(-1).t-during[0].t)/Math.max(1,during.length-1)),chromeProcesses:Math.max(...during.map(x=>x.n)),idleWorkingSetMB:MB(base('ws')),peakWorkingSetMB:MB(peak('ws')),idlePrivateMB:MB(base('pv')),peakPrivateMB:MB(peak('pv')),peakPrivateAboveIdleMB:MB(peak('pv')-base('pv')),endPrivateAboveIdleMB:MB(endPv-base('pv'))};
 }finally{s.stop();await browser.close({silent:true});}
}
const result={version:1,date:new Date().toISOString(),pictures:{count:N,size:W+'x'+H,decodedMBEach:W*H*4/1048576,fileMB:sources.map(s=>+(s.fileBytes/1048576).toFixed(1))},projects:projects.length,picturesPerProject:4,loaderPictureBoundMB:previewMemoryBound()/1048576,switches:SWITCHES,pattern:'three of every four switches 150 ms apart, the fourth waits for its film',runs:[]};
try{
 // alternating old/new rounds, each in a fresh browser
 for(let k=0;k<ROUNDS;k++){if(OLD)result.runs.push(await runOne('old'));result.runs.push(await runOne('new'));}
}finally{server.close();}
writeFileSync(join(out,'result.json'),JSON.stringify(result,null,1)+'\n');
for(const r of result.runs)console.log(r.impl.padEnd(4),'ms',r.ms,'fetches',r.fetches,'aborts',r.aborts,'peak registered MB',r.peakRegisteredMB,'peak private MB',r.peakPrivateMB,'(idle',r.idlePrivateMB+', +'+r.peakPrivateAboveIdleMB+')','end +'+r.endPrivateAboveIdleMB,'peak working set MB',r.peakWorkingSetMB,'samples',r.samples+'@'+r.sampleEveryMs+'ms','final',r.finalRegistered,r.finalDecodedMB+'MB',JSON.stringify(r.finalDiagnostics),r.stats?JSON.stringify(r.stats):'');
