import {PackRegistry,BUILTIN_PACKS,searchRegistry,assetEntry,verifyPack,PACK_LIMITS} from '../src/foundry/packs.js';
import {previewAsset,bmp} from '../src/foundry/pack-preview.js';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,readdir,rename,stat,realpath,unlink} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve,join,dirname,sep,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {direct} from '../src/director/index.js';
import {directorCatalog} from '../src/director/catalog.js';
import {VOICES} from '../src/core/contract.js';
import {CAMERA_RIGS,ACTIONS} from '../src/core/cinematography.js';
import {MOTION_PRESETS,EFFECT_PRESETS} from '../src/core/presets.js';
import {inspectProject} from '../src/quality/preflight.js';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MAX_BODY=1024*1024,MAX_LOG=40000,MAX_JOBS=40;
const FILES=new Set(['film.mp4','scene.json','timeline.json','props.json','voice-report.json','speech-report.json','captions.srt','captions.vtt','quality-report.json','quality-preflight.json','quality-original-project.json','quality-contact-sheet.jpg','probe.json','render-timing.json','kokoro-narration.wav','mix.wav','preview-audio.wav']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.mp4':'video/mp4','.wav':'audio/wav','.jpg':'image/jpeg','.srt':'text/plain; charset=utf-8','.vtt':'text/vtt; charset=utf-8'};
const hash=x=>createHash('sha256').update(x).digest('hex');
const status=(n,m)=>Object.assign(Error(m),{status:n});
function safeId(id){if(typeof id!=='string'||!/^[a-z0-9][a-z0-9-]{0,47}$/.test(id)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9]|constructor|prototype)$/.test(id))throw status(400,'Invalid project ID');return id;}
function keys(x,allowed,required=allowed){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(x,k)))throw status(400,'Invalid request fields');}
function parse(raw){try{return JSON.parse(raw,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe JSON key');return v;});}catch(e){throw status(400,'Invalid JSON: '+e.message);}}
const json=async p=>parse(await readFile(p,'utf8'));
async function body(req){
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw status(415,'JSON body required');
 if(Number(req.headers['content-length'])>MAX_BODY)throw status(413,'Request too large');
 let n=0;const chunks=[];
 for await(const c of req){n+=c.length;if(n>MAX_BODY)throw status(413,'Request too large');chunks.push(c);}
 return parse(Buffer.concat(chunks).toString('utf8'));
}
function send(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function atomic(path,value){const tmp=path+'.'+randomBytes(6).toString('hex')+'.tmp';try{await writeFile(tmp,value,{flag:'wx',mode:0o600});await rename(tmp,path);}finally{await unlink(tmp).catch(()=>{});}}
async function inside(base,p){const a=await realpath(base),b=await realpath(p);if(b!==a&&!b.startsWith(a+sep))throw status(404,'File not found');return b;}
async function serveFile(req,res,base,p,{download=false}={}){
 let file,info;try{file=await inside(base,p);info=await stat(file);if(!info.isFile())throw Error('not file');}catch{throw status(404,'File not found');}
 const headers={'Content-Type':mime[extname(file)]??'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
 if(download)headers['Content-Disposition']='attachment; filename="'+file.split(sep).at(-1)+'"';
 let start=0,end=info.size-1,code=200;
 if(req.headers.range){
  const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if(!m||(!m[1]&&!m[2])||!info.size){res.writeHead(416,{'Content-Range':'bytes */'+info.size});res.end();return;}
  if(m[1]){start=Number(m[1]);end=m[2]?Math.min(end,Number(m[2])):end;}else start=Math.max(0,info.size-Number(m[2]));
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':'bytes */'+info.size});res.end();return;}
  code=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+info.size;
 }
 headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(code,headers);
 if(req.method==='HEAD'||!info.size){res.end();return;}
 const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}
export function nativeRunner({root,job,snapshot,flags,log}){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[join(root,'scripts','cli.mjs'),job.mode,snapshot,...flags],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe'],shell:false});
  child.stdout.on('data',b=>log(b.toString()));child.stderr.on('data',b=>log(b.toString()));child.on('error',reject);
  child.on('close',(code,signal)=>code===0?resolve():reject(Error('Native CLI exited '+(code??signal))));
 });
}
export async function createStudio({root=ROOT,dataDir=join(root,'studio-data'),runner=nativeRunner}={}){
 const projectsDir=join(dataDir,'projects'),snapshots=join(dataDir,'jobs'),outputDir=join(root,'out');
 await Promise.all([mkdir(projectsDir,{recursive:true}),mkdir(snapshots,{recursive:true}),mkdir(outputDir,{recursive:true})]);
 const packsDir=join(dataDir,'packs');await mkdir(packsDir,{recursive:true});const registry=new PackRegistry();let packWriting=false;
 const packFiles=(await readdir(packsDir)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));if(packFiles.length>PACK_LIMITS.packs)throw Error('pack storage capacity');
 for(const name of packFiles){const p=await inside(packsDir,join(packsDir,name));if((await stat(p)).size>PACK_LIMITS.bytes)throw Error('pack file too large');const manifest=await json(p);if(manifest.digest!==name.slice(0,-5))throw Error('pack filename digest mismatch');registry.import(manifest);}
 const jobs=new Map();let active=null,writing=false,planning=false,origin=null;
 const projectPath=id=>join(projectsDir,safeId(id)+'.json');
 async function getProject(id){
  try{const p=await inside(projectsDir,projectPath(id)),raw=await readFile(p,'utf8'),project=validateProject(parse(raw));if(project.id!==id)throw Error('ID mismatch');return {project,revision:hash(raw)};}catch(e){if(e.code==='ENOENT')throw status(404,'Unknown project');throw e;}
 }
 async function saveProject(project,revision){
  validateProject(project);safeId(project.id);
  if(writing)throw status(409,'Another project write is active');writing=true;
  try{
   let old=null;try{old=await getProject(project.id);}catch(e){if(e.status!==404)throw e;}
   if(old&&revision!==old.revision||!old&&revision!==null)throw status(409,'Project revision conflict; reload or choose a new ID');
   const raw=JSON.stringify(project,null,2)+'\n';await atomic(projectPath(project.id),raw);return {project,revision:hash(raw)};
  }finally{writing=false;}
 }
 function publicJob(j){return {...j};}
 function update(j,chunk){j.log=(j.log+chunk).slice(-MAX_LOG);if(/QUALITY:|PASS: native|verify/i.test(chunk))j.phase='verification';else if(/Rendered|Rendering|Bundling|Encoded|Compositing/i.test(chunk))j.phase='rendering';else if(/Compiled|Speech-first|Kokoro/i.test(chunk))j.phase='audio preparation';}
 async function startJob(input){
  keys(input,['id','revision','mode','quality','repair']);
  if(active)throw status(409,'One local render/preparation job is already active');
  if(!['render','prepare'].includes(input.mode)||typeof input.quality!=='boolean'||typeof input.repair!=='boolean')throw status(400,'Invalid job settings');
  // Reserve before asynchronous reads; concurrent submissions cannot both start.
  active='reserving';
  try{
   const saved=await getProject(input.id);if(saved.revision!==input.revision)throw status(409,'Project revision conflict');
   const id='studio-'+randomBytes(10).toString('hex'),project={...saved.project,id};
   validateProject(project);const snapshot=join(snapshots,id+'.json');await atomic(snapshot,JSON.stringify(project,null,2)+'\n');
   const job={id,projectId:saved.project.id,revision:saved.revision,mode:input.mode,quality:input.quality||input.repair,repair:input.repair,status:'running',phase:'starting',log:'',createdAt:new Date().toISOString(),finishedAt:null,error:null,files:[]};
   jobs.set(id,job);active=id;
   while(jobs.size>MAX_JOBS){const first=jobs.keys().next().value;if(first===active)break;jobs.delete(first);}
   const flags=[...(job.quality?['--quality']:[]),...(job.repair?['--repair']:[])];
   // Saved projects with speech already have an explicit global target; legacy v2
   // fixed/automatic authored budgets use the normal CLI without Director rewriting.
   const work=async()=>{
    let outcome='failed';
    try{
     await runner({root,job:publicJob(job),snapshot,flags,log:s=>update(job,s)});
     const dir=join(outputDir,id),scene=validateProject(await json(join(dir,'scene.json')));
     if(scene.id!==id)throw Error('Produced project ID mismatch');
     if(scene.version===2)validateTimeline(scene,await json(join(dir,'timeline.json')));
     if(job.mode==='render'){const film=await stat(join(dir,'film.mp4'));if(!film.isFile()||film.size<1000)throw Error('Missing verified film');await json(join(dir,'probe.json'));if(job.quality)await json(join(dir,'quality-report.json'));}
     const audio=join(root,'public','audio',id+'.wav');
     // Copy audio for prepared playback without exposing arbitrary public files.
     const {copyFile}=await import('node:fs/promises');await copyFile(audio,join(dir,'preview-audio.wav'));
     outcome='succeeded';
    }catch(e){job.error=String(e.message??e).slice(0,1000);}
    finally{
     try{job.files=(await readdir(join(outputDir,id))).filter(x=>FILES.has(x)&& (outcome==='succeeded'||x!=='film.mp4'));}catch{}
     job.finishedAt=new Date().toISOString();job.status=outcome;job.phase=outcome==='succeeded'?'complete':'failed';active=null;
    }
   };
   void work();return publicJob(job);
  }catch(e){active=null;throw e;}
 }
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  try{
   if(!origin||req.headers.host!==new URL(origin).host)throw status(403,'Local host required');
   if(req.headers.origin&&req.headers.origin!==origin)throw status(403,'Cross-origin requests forbidden');
   if(req.headers['sec-fetch-site']==='cross-site')throw status(403,'Cross-site requests forbidden');
   const u=new URL(req.url,origin);if(u.origin!==origin)throw status(403,'Invalid URL');
   const path=u.pathname,method=req.method;
   if(!['GET','HEAD','POST','PUT'].includes(method))throw status(405,'Method not allowed');
   if(['POST','PUT'].includes(method)&&req.headers['x-aether-studio']!=='1')throw status(403,'Studio request header required');
   if(method==='GET'&&path==='/api/foundry/search'){
    const q=Object.fromEntries(u.searchParams);for(const k of ['lod','maxHeight','limit'])if(q[k]!==undefined)q[k]=Number(q[k]);return send(res,200,{assets:searchRegistry(q,registry)});
   }
   if(method==='GET'&&path==='/api/foundry/packs')return send(res,200,{builtins:BUILTIN_PACKS,installed:registry.list()});
   if(method==='GET'&&path==='/api/foundry/pack')return send(res,200,{pack:registry.get(u.searchParams.get('id'),u.searchParams.get('revision')??'1.0.0')});
   if(method==='POST'&&path==='/api/foundry/pack'){
    if(packWriting)throw status(409,'Another pack write is active');packWriting=true;
    try{const x=await body(req);keys(x,['pack']);const p=verifyPack(x.pack);const trial=new PackRegistry();for(const row of registry.list())trial.import(registry.get(row.id,row.revision));const result=trial.import(p);
    if(!result.reused)await atomic(join(packsDir,p.digest+'.json'),JSON.stringify(p));registry.import(p);return send(res,200,result);}finally{packWriting=false;}
   }
   if(method==='GET'&&path==='/api/foundry/asset'){
    const kind=u.searchParams.get('kind'),id=u.searchParams.get('id'),revision=u.searchParams.get('revision')||undefined,entry=assetEntry(kind,id,revision,registry);
    const lod=Number(u.searchParams.get('lod')??0),view=u.searchParams.get('view')??'three-quarter',lighting=u.searchParams.get('lighting')??'studio';
    const {raster,...info}=previewAsset(entry,{lod,view,lighting});return send(res,200,{entry,info,preview:'data:image/bmp;base64,'+Buffer.from(bmp(raster)).toString('base64')});
   }
   if(method==='GET'&&path==='/api/catalog')return send(res,200,{catalog:directorCatalog(),voices:VOICES,cameras:Object.keys(CAMERA_RIGS),actions:Object.keys(ACTIONS),motions:Object.keys(MOTION_PRESETS),effects:Object.keys(EFFECT_PRESETS)});
   if(method==='GET'&&path==='/api/projects'){
    const files=(await readdir(projectsDir)).filter(x=>/^[a-z0-9][a-z0-9-]{0,47}\.json$/.test(x)).sort().slice(0,500),items=[];
    for(const name of files){try{const x=await getProject(name.slice(0,-5));items.push({id:x.project.id,title:x.project.title,version:x.project.version,revision:x.revision});}catch(e){items.push({id:name.slice(0,-5),error:String(e.message).slice(0,160)});}}
    return send(res,200,{projects:items});
   }
   if(method==='GET'&&path==='/api/examples'){const names=(await readdir(join(root,'examples'))).filter(x=>/^[a-z0-9-]+\.json$/.test(x)).sort();const examples=[];for(const n of names){try{validateProject(await json(join(root,'examples',n)));examples.push(n);}catch{}}return send(res,200,{examples});}
   let match=/^\/api\/examples\/([a-z0-9-]+\.json)$/.exec(path);
   if(method==='GET'&&match){const p=await inside(join(root,'examples'),join(root,'examples',match[1]));return send(res,200,{project:validateProject(await json(p))});}
   match=/^\/api\/projects\/([a-z0-9-]+)$/.exec(path);
   if(method==='GET'&&match)return send(res,200,await getProject(match[1]));
   if(method==='PUT'&&match){const x=await body(req);keys(x,['project','revision']);if(x.project?.id!==match[1]||x.revision!==null&&(typeof x.revision!=='string'||!/^[a-f0-9]{64}$/.test(x.revision)))throw status(400,'Project ID or revision mismatch');return send(res,200,await saveProject(x.project,x.revision));}
   if(method==='POST'&&path==='/api/direct'){
    if(planning)throw status(409,'Director planning already active');planning=true;
    try{const x=await body(req);const plan=await direct(x);return send(res,200,{project:plan.project,manifest:plan.manifest,stages:plan.stages});}finally{planning=false;}
   }
   if(method==='POST'&&path==='/api/inspect'){const x=await body(req);keys(x,['project']);return send(res,200,inspectProject(x.project));}
   if(method==='POST'&&path==='/api/jobs')return send(res,202,await startJob(await body(req)));
   if(method==='GET'&&path==='/api/jobs')return send(res,200,{jobs:[...jobs.values()].reverse().map(publicJob),active});
   match=/^\/api\/jobs\/(studio-[a-f0-9]{20})$/.exec(path);
   if(method==='GET'&&match){const j=jobs.get(match[1]);if(!j)throw status(404,'Unknown session job');return send(res,200,publicJob(j));}
   match=/^\/api\/jobs\/(studio-[a-f0-9]{20})\/files\/([a-z0-9.-]+)$/.exec(path);
   if(['GET','HEAD'].includes(method)&&match){const j=jobs.get(match[1]);if(!j||!j.files.includes(match[2])||!FILES.has(match[2]))throw status(404,'Artifact not available');return await serveFile(req,res,outputDir,join(outputDir,j.id,match[2]),{download:u.searchParams.get('download')==='1'});}
   if(!['GET','HEAD'].includes(method))throw status(404,'Unknown API route');
   if(path==='/'||['/app.js','/style.css'].includes(path))return await serveFile(req,res,join(root,'studio'),join(root,'studio',path==='/'?'index.html':path.slice(1)));
   if(/^\/src\/(?:core|visual|templates|studio|foundry)\/[a-z0-9-]+\.js$/.test(path))return await serveFile(req,res,join(root,'src'),join(root,path.slice(1)));
   if(/^\/vendor\/three\/(?:build|examples\/jsm)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.js$/.test(path))return await serveFile(req,res,join(root,'node_modules','three'),join(root,'node_modules','three',path.slice('/vendor/three/'.length)));
   throw status(404,'Not found');
  }catch(e){if(res.headersSent){res.destroy();return;}send(res,e.status??(e.code==='ENOENT'?404:400),{error:String(e.message??e).slice(0,1000)});}
 });
 return {server,jobs,async listen(port=4173){await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});origin='http://127.0.0.1:'+server.address().port;return origin;},async close(){if(active)throw Error('Cannot close Studio while a native job is active');await new Promise((ok,no)=>server.close(e=>e?no(e):ok()));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const arg=process.argv[2]??'4173',port=Number(arg);if(!Number.isInteger(port)||port<0||port>65535||process.argv.length>3)throw Error('Usage: npm run studio:local -- [port]');
 const s=await createStudio();console.log('AetherMotion Studio:',await s.listen(port));console.log('Local projects: studio-data/projects; job outputs: out/studio-*. Keep this terminal open.');
}
