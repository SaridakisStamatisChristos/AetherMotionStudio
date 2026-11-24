// LOCAL-03 local performance bench. Re-renders a verified LOCAL-02 matched output from its prepared,
// hash-checked inputs (no speech re-synthesis), changing one explicit setting at a time, and records phase
// timings, GPU/CPU/RAM samples, film hashes and verification results. Every run (including failures) is kept.
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,statSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {createRequire} from 'node:module';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {parseBench,stats} from './perf-options.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(join(root,'package.json'));
const {bundle}=require('@remotion/bundler'),{openBrowser,selectComposition,renderMedia}=require('@remotion/renderer');
const o=parseBench(process.argv.slice(2));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),read=p=>JSON.parse(readFileSync(p,'utf8'));
const src=resolve(o.source),inv=read(join(src,'shared-inputs.json'));
const scene=validateProject(read(join(src,'scene.json'))),timeline=validateTimeline(scene,read(join(src,'timeline.json')));
const backend=scene.shots.every(s=>s.backend==='three')?'three':scene.shots.every(s=>s.backend==='cpu')?'cpu':null;
if(!backend)throw Error('Source must be a single-backend matched output');
// Identical prepared inputs: every shared file and the soundtrack Remotion reads must match the inventory.
const soundtrack=join(root,'public','audio',scene.id+'.wav');
for(const [n,h] of Object.entries(inv.sharedHashes))if(sha(join(src,n))!==h)throw Error('Prepared input changed: '+n);
if(sha(soundtrack)!==inv.sharedHashes['mix.wav'])throw Error('Soundtrack differs from shared mix');
const referenceFilm=existsSync(join(src,'film.mp4'))?sha(join(src,'film.mp4')):null;
const benchDir=join(root,'out','bench',o.id);if(existsSync(benchDir))throw Error('Bench output exists; choose a new --id: '+benchDir);mkdirSync(benchDir,{recursive:true});
const env={...process.env},venv=join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const python=env.PYTHON||(existsSync(venv)?venv:'python');
const gl=backend==='three'?o.gl:null; // CPU path never receives --gl, matching native-render.mjs
const result={version:1,id:o.id,source:o.source,backend,frames:timeline.durationFrames,settings:{concurrency:o.concurrency,gl,hardwareAcceleration:o.hardwareAcceleration,reuseBrowser:o.reuseBrowser,serialEncode:o.serialEncode,runs:o.runs,warmup:o.warmup},
 sharedHashes:inv.sharedHashes,referenceFilm,sourceCommit:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),
 machine:{platform:process.platform,cpu:os.cpus()[0]?.model,threads:os.cpus().length,ramGB:+(os.totalmem()/2**30).toFixed(1),node:process.version},runs:[]};
const save=()=>writeFileSync(join(benchDir,'results.json'),JSON.stringify(result,null,2)+'\n');save();

function sampler(){
 const s={gpu:[],cpu:[],ram:[],perf:[],gpuProcSeen:0,gpuProcChecks:0},procs=[];
 const smi=spawn('nvidia-smi',['--query-gpu=utilization.gpu,memory.used,temperature.gpu,clocks.sm,power.draw,clocks_throttle_reasons.active','--format=csv,noheader,nounits','-lms','500'],{stdio:['ignore','pipe','ignore']});
 smi.on('error',()=>{});procs.push(smi);
 smi.stdout.on('data',d=>{for(const l of String(d).split(/\r?\n/)){const c=l.split(',').map(x=>x.trim());if(c.length===6&&c[0]!=='')s.gpu.push({util:+c[0],memMiB:+c[1],tempC:+c[2],smMHz:+c[3],powerW:+c[4],throttle:c[5]})}});
 if(process.platform==='win32'){const tp=spawn('typeperf',['\\Processor Information(_Total)\\% Processor Performance','-si','1'],{stdio:['ignore','pipe','ignore']});tp.on('error',()=>{});procs.push(tp);
  tp.stdout.on('data',d=>{for(const l of String(d).split(/\r?\n/)){const m=l.match(/^"[^"]+","([\d.]+)"/);if(m)s.perf.push(+m[1])}});}
 let prev=os.cpus().map(c=>c.times);
 const tick=setInterval(()=>{const now=os.cpus().map(c=>c.times);let busy=0,total=0;now.forEach((t,i)=>{const p=prev[i];const tot=Object.values(t).reduce((a,b)=>a+b,0)-Object.values(p).reduce((a,b)=>a+b,0);total+=tot;busy+=tot-(t.idle-p.idle)});prev=now;if(total>0)s.cpu.push(100*busy/total);s.ram.push((os.totalmem()-os.freemem())/2**30)},500);
 const procTick=setInterval(()=>{const r=spawnSync('nvidia-smi',[],{encoding:'utf8'});s.gpuProcChecks++;if(/chrome-headless-shell/.test(r.stdout??''))s.gpuProcSeen++},3000);
 return {stop(){clearInterval(tick);clearInterval(procTick);for(const p of procs)try{p.kill()}catch{};return s}};
}
const summarize=(s,ramBase)=>({gpuUtil:stats(s.gpu.map(x=>x.util)),gpuMemMiB:stats(s.gpu.map(x=>x.memMiB)),gpuTempC:stats(s.gpu.map(x=>x.tempC)),gpuSmMHz:stats(s.gpu.map(x=>x.smMHz)),gpuPowerW:stats(s.gpu.map(x=>x.powerW)),
 gpuThrottleReasons:[...new Set(s.gpu.map(x=>x.throttle))],cpuUtil:stats(s.cpu),ramUsedGB:stats(s.ram),ramPeakDeltaGB:s.ram.length?Math.max(...s.ram)-ramBase:null,cpuPerformancePct:stats(s.perf),
 chromeOnNvidia:{seen:s.gpuProcSeen,checks:s.gpuProcChecks},samples:{gpu:s.gpu.length,cpu:s.cpu.length,perf:s.perf.length}});
const timed=async f=>{const t=performance.now();const v=await f();return [v,performance.now()-t]};
const runPy=(script,dir)=>{const t=performance.now();const p=spawnSync(python,[script,dir],{cwd:root,env,encoding:'utf8'});return {ok:p.status===0,ms:performance.now()-t,tail:(p.stderr||p.stdout||'').trim().split('\n').slice(-3).join(' | ').slice(0,600)}};

const inputProps={scene,timeline};
const [serveUrl,bundleMs]=await timed(()=>bundle({entryPoint:join(root,'src','index.jsx'),onProgress:()=>{}}));
result.bundleMs=bundleMs;save();
const chromiumOptions=gl?{gl}:{};
let shared=null;
if(o.reuseBrowser){const [b,ms]=await timed(()=>openBrowser('chrome',{chromiumOptions,logLevel:'error'}));shared=b;result.sharedBrowserOpenMs=ms;}
let stop=false;
for(let i=0;i<o.warmup+o.runs&&!stop;i++){
 const warm=i<o.warmup,dir=join(benchDir,(warm?'warmup-':'run-')+String(i+1-(warm?0:o.warmup)).padStart(2,'0'));mkdirSync(dir);
 for(const n of ['scene.json','timeline.json','voice-report.json','kokoro-narration.wav','quality-preflight.json',...Object.keys(inv.sharedHashes)])if(existsSync(join(src,n))&&!existsSync(join(dir,n)))copyFileSync(join(src,n),join(dir,n));
 const row={name:dir.split(/[\\/]/).at(-1),warmup:warm,status:'running'};result.runs.push(row);save();
 const ramBase=(os.totalmem()-os.freemem())/2**30,smp=sampler(),t0=performance.now();let browser=shared;
 try{
  if(!browser){const [b,ms]=await timed(()=>openBrowser('chrome',{chromiumOptions,logLevel:'error'}));browser=b;row.browserOpenMs=ms;}
  const [composition,selMs]=await timed(()=>selectComposition({serveUrl,id:'AetherFilm',inputProps,puppeteerInstance:browser,chromiumOptions,logLevel:'error'}));row.selectCompositionMs=selMs;
  let last=null;
  const [,renderMs]=await timed(()=>renderMedia({composition,serveUrl,codec:'h264',outputLocation:join(dir,'film.mp4'),inputProps,concurrency:o.concurrency,chromiumOptions,puppeteerInstance:browser,hardwareAcceleration:o.hardwareAcceleration,disallowParallelEncoding:o.serialEncode,logLevel:'error',onProgress:p=>{last=p}}));
  row.renderMediaMs=renderMs;row.framesRenderedMs=last?.renderedDoneIn??null;row.encodeDoneMs=last?.encodedDoneIn??null;
  if(!shared){const [,ms]=await timed(()=>browser.close({silent:true}));row.browserCloseMs=ms;}
  row.totalMs=performance.now()-t0;row.framesPerSecond=timeline.durationFrames/(renderMs/1000);
  row.resources=summarize(smp.stop(),ramBase);
  writeFileSync(join(dir,'render-timing.json'),JSON.stringify({renderSeconds:renderMs/1000,backend,gl},null,2));
  row.filmSha256=sha(join(dir,'film.mp4'));row.filmBytes=statSync(join(dir,'film.mp4')).size;row.matchesReference=referenceFilm?row.filmSha256===referenceFilm:null;
  row.verify=runPy('scripts/verify.py',dir);if(!o.skipQuality&&row.verify.ok)row.quality=runPy('scripts/quality_media.py',dir);
  if(row.quality?.ok){const q=read(join(dir,'quality-report.json'));row.quality.errors=q.errors;row.quality.warnings=q.warnings;row.quality.status=q.status}
  // Every frame is scanned: isolated temporal spikes, plus PSNR against the production reference film.
  {const t=performance.now(),g=spawnSync(python,['scripts/frame_glitch.py',join(dir,'film.mp4'),...(referenceFilm?[join(src,'film.mp4')]:[])],{cwd:root,env,encoding:'utf8',maxBuffer:64*1024*1024});
   try{const r=JSON.parse(g.stdout);row.glitch={ms:performance.now()-t,status:r.status,frames:r.glitchFrames,minPsnr:r.minPsnr??null,identicalFrames:r.identicalFrames??null};writeFileSync(join(dir,'frame-glitch.json'),JSON.stringify(r,null,2))}
   catch{row.glitch={ms:performance.now()-t,status:'scan-error',error:(g.stderr||'').slice(-400)}}}
  row.status=!row.verify.ok||!(o.skipQuality||row.quality?.ok&&row.quality.errors===0)?'failed-verification':row.glitch.status!=='clean'?'failed-glitch':'succeeded';
 }catch(e){row.resources=row.resources??summarize(smp.stop(),ramBase);row.status='failed';row.error=String(e?.message??e).slice(0,1500);stop=true;try{if(browser&&!shared)await browser.close({silent:true})}catch{}}
 save();console.log(row.name,row.status,row.renderMediaMs?Math.round(row.renderMediaMs)+'ms':'',row.framesPerSecond?row.framesPerSecond.toFixed(2)+' fps':'',row.matchesReference===false?'FILM DIFFERS FROM REFERENCE':'',row.error??'');
}
if(shared)await shared.close({silent:true});
const ok=result.runs.filter(r=>!r.warmup&&r.status==='succeeded');
result.summary={succeeded:ok.length,failed:result.runs.filter(r=>!r.warmup&&r.status!=='succeeded').length,renderMediaMs:stats(ok.map(r=>r.renderMediaMs)),framesRenderedMs:stats(ok.map(r=>r.framesRenderedMs)),encodeDoneMs:stats(ok.map(r=>r.encodeDoneMs)),
 browserOpenMs:stats(ok.map(r=>r.browserOpenMs)),verifyMs:stats(ok.map(r=>r.verify?.ms)),qualityMs:stats(ok.map(r=>r.quality?.ms)),framesPerSecond:stats(ok.map(r=>r.framesPerSecond)),
 filmHashes:[...new Set(ok.map(r=>r.filmSha256))],allMatchReference:referenceFilm?ok.every(r=>r.matchesReference):null,
 gpuUtilMean:stats(ok.map(r=>r.resources?.gpuUtil?.mean)),gpuMemPeakMiB:stats(ok.map(r=>r.resources?.gpuMemMiB?.max)),cpuUtilMean:stats(ok.map(r=>r.resources?.cpuUtil?.mean)),ramPeakDeltaGB:stats(ok.map(r=>r.resources?.ramPeakDeltaGB)),cpuPerfMin:stats(ok.map(r=>r.resources?.cpuPerformancePct?.min))};
save();console.log('BENCH',o.id,JSON.stringify({ok:ok.length,fps:result.summary.framesPerSecond?.mean?.toFixed(2),renderMs:Math.round(result.summary.renderMediaMs?.mean??0),hashes:result.summary.filmHashes.length,matchRef:result.summary.allMatchReference}));
if(result.summary.failed)process.exitCode=1;
