// DUAL-08 bounded local batch production (batch-v1). A batch is a queue of validated Director requests or authored
// projects, each with an explicit backend, output format and unique job ID, run one at a time through the unchanged
// production path (scripts/produce.mjs) under the machine render lock (scripts/render-lock.mjs).
// Durability rules (CAMPAIGN_A.md "DUAL-08 boundary assessment"):
// - inputs are copied byte-for-byte into the batch at creation (immutable, 'wx'); jobs run from those snapshots only;
// - one manifest per batch (batch.json) and per job (jobs/<id>.json), rewritten atomically (temp file + rename); every
//   state transition is written before the side effect it announces; job history is append-only;
//   terminal job states (succeeded, failed, cancelled) never change;
// - every attempt gets a fresh production ID and folders (never reused); outputs are verified (film SHA-256 against the
//   production manifest, probe, quality report, backend comparison) in the attempt folders, then moved into
//   films/<job>/ and verified again; failed, cancelled and interrupted attempts are moved to attempts/<attempt>/;
// - restart recovery marks attempts a dead runner left behind as interrupted, salvages an attempt whose production had
//   already succeeded (never re-rendered) and completes an interrupted placement; retries and interruptions are bounded.
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,readdirSync,unlinkSync,lstatSync,realpathSync,statSync,statfsSync,openSync,writeSync,closeSync,readSync} from 'node:fs';
import {join,resolve,sep,dirname} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {safeJson} from '../src/director/schema.js';
import {FORMAT_IDS,DEFAULT_FORMAT} from '../src/core/formats.js';
import {parseProduction} from './production-options.mjs';
import {acquireRenderLock,pidAlive,processStartMs} from './render-lock.mjs';
import {killTree as defaultKillTree} from './process-tree.mjs';
export const BATCH_VERSION=1;
export const LIMITS=Object.freeze({jobs:50,retries:3,interruptions:3,attempts:50,logBytes:8*1024*1024,inputBytes:1024*1024,concurrency:16,history:400,requests:200});
export const TERMINAL=Object.freeze(['succeeded','failed','cancelled']);
// Allowed job state transitions; anything else is a programming error and throws.
export const NEXT=Object.freeze({queued:['preparing','cancelled','failed'],preparing:['rendering','verifying','queued','failed','cancelled'],rendering:['verifying','queued','failed','cancelled'],verifying:['placing','queued','failed'],placing:['succeeded','failed'],succeeded:[],failed:[],cancelled:[]});
const RESERVED=/^(con|prn|aux|nul|com[1-9]|lpt[1-9]|constructor|prototype)$/;
const slug=(x,max,what)=>{if(typeof x!=='string'||x.length>max||!/^[a-z0-9][a-z0-9-]*$/.test(x)||RESERVED.test(x))throw Error(what+' must be a lowercase slug (letters, digits, hyphens; max '+max+' characters)');return x;};
const keys=(x,allowed,required,what)=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error(what+' must be an object');for(const k of Object.keys(x))if(!allowed.includes(k))throw Error(what+': unknown field "'+k+'"');for(const k of required)if(!Object.hasOwn(x,k))throw Error(what+': missing field "'+k+'"');};
const int=(x,lo,hi,what)=>{if(!Number.isSafeInteger(x)||x<lo||x>hi)throw Error(what+' must be an integer from '+lo+' to '+hi);return x;};
export const sha256=buf=>createHash('sha256').update(buf).digest('hex');
// Repair R13: films are hashed in 1 MB chunks (bounded memory for long films), not read whole.
export function hashFile(p){const h=createHash('sha256'),fd=openSync(p,'r'),buf=Buffer.alloc(1<<20);try{for(;;){const n=readSync(fd,buf,0,buf.length,null);if(!n)break;h.update(buf.subarray(0,n));}}finally{closeSync(fd);}return h.digest('hex');}
const sleepSync=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
// Windows: a rename can fail briefly while another process (an indexer, a reader, a process just killed) holds a handle.
function retrying(fn){for(let i=0;;i++){try{return fn();}catch(e){if(i>=40||!['EPERM','EBUSY','EACCES'].includes(e.code))throw e;sleepSync(250);}}}
export function writeJsonAtomic(p,value){const tmp=p+'.'+randomBytes(4).toString('hex')+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});try{retrying(()=>renameSync(tmp,p));}catch(e){try{unlinkSync(tmp);}catch{}throw e;}}
const readJson=p=>safeJson(readFileSync(p,'utf8'));
// A repository-relative input path: plain segments, no traversal, no links, inside the repository, a small JSON file.
export function safeInputPath(root,rel,what='input'){
 if(typeof rel!=='string'||rel.length>240||!/^[A-Za-z0-9_][A-Za-z0-9_./-]*\.json$/.test(rel))throw Error(what+': path must be repository-relative, using letters, digits, _ . - / and ending in .json');
 const parts=rel.split('/');
 // Windows file names are case-insensitive: CON.json and NODE_MODULES are the same as con.json and node_modules.
 if(parts.map(s=>s.toLowerCase()).some(s=>s===''||s==='.'||s==='..'||s==='.git'||s==='node_modules'||RESERVED.test(s.replace(/\..*$/,''))))throw Error(what+': path segment not allowed');
 const base=realpathSync(root);let cur=base;
 for(const s of parts){cur=join(cur,s);let st;try{st=lstatSync(cur);}catch{throw Error(what+': file not found: '+rel);}if(st.isSymbolicLink())throw Error(what+': links are not allowed: '+rel);}
 const real=realpathSync(cur);if(!real.startsWith(base+sep))throw Error(what+': outside the repository');
 const st=statSync(real);if(!st.isFile())throw Error(what+': not a file');if(st.size>LIMITS.inputBytes)throw Error(what+': larger than 1 MB');
 return real;
}
// The batch folder <root>/<outputRoot>/<id>: outputRoot lies inside out/ and no segment may be a link.
export function batchDirFor(root,outputRoot,id){
 if(typeof outputRoot!=='string'||!/^out(\/[a-z0-9][a-z0-9-]{0,47}){1,3}$/.test(outputRoot)||outputRoot.split('/').some(s=>RESERVED.test(s)))throw Error('outputRoot must be a folder inside out/, e.g. "out/batches" (lowercase slugs, at most 3 levels)');
 let cur=realpathSync(root);
 for(const s of [...outputRoot.split('/'),slug(id,32,'Batch id')]){cur=join(cur,s);try{if(lstatSync(cur).isSymbolicLink())throw Error('outputRoot: links are not allowed');}catch(e){if(e.code!=='ENOENT')throw e;}}
 return cur;
}
// Validate the batch definition and every job's input (as produce.mjs would parse it), without side effects.
export function validateBatch(def,{root}){
 keys(def,['version','id','outputRoot','retries','minFreeGB','jobs'],['version','id','outputRoot','jobs'],'Batch');
 if(def.version!==BATCH_VERSION)throw Error('Batch version must be 1');
 slug(def.id,32,'Batch id');batchDirFor(root,def.outputRoot,def.id);
 const retries=def.retries===undefined?0:int(def.retries,0,LIMITS.retries,'Batch retries');
 const minFreeGB=def.minFreeGB===undefined?5:def.minFreeGB;
 if(typeof minFreeGB!=='number'||!Number.isFinite(minFreeGB)||minFreeGB<1||minFreeGB>1000)throw Error('minFreeGB must be a number from 1 to 1000');
 if(!Array.isArray(def.jobs)||def.jobs.length<1||def.jobs.length>LIMITS.jobs)throw Error('Batch jobs must be a list of 1 to '+LIMITS.jobs+' jobs');
 const seen=new Set(),jobs=def.jobs.map((j,i)=>{
  const what='Job '+(i+1);keys(j,['id','request','project','backend','format','concurrency','retries'],['id','backend','format'],what);
  slug(j.id,20,what+' id');if(seen.has(j.id))throw Error(what+': duplicate job id "'+j.id+'"');seen.add(j.id);
  if((j.request===undefined)===(j.project===undefined))throw Error(what+' ("'+j.id+'"): give exactly one of "request" or "project"');
  if(!['cpu','three','both'].includes(j.backend))throw Error(what+' ("'+j.id+'"): backend must be cpu, three or both');
  if(!FORMAT_IDS.includes(j.format))throw Error(what+' ("'+j.id+'"): format must be one of '+FORMAT_IDS.join(', '));
  if(j.concurrency!==undefined)int(j.concurrency,1,LIMITS.concurrency,what+' concurrency');
  if(j.retries!==undefined)int(j.retries,0,LIMITS.retries,what+' retries');
  const kind=j.request!==undefined?'request':'project',source=j[kind],file=safeInputPath(root,source,what+' '+kind),bytes=readFileSync(file);
  const check=checkInput(kind,bytes.toString('utf8'),j,what);
  return {id:j.id,kind,source,bytes,backend:j.backend,format:j.format,concurrency:j.concurrency??null,retries:j.retries??retries,outputSuffixes:check.outputSuffixes};
 });
 return {id:def.id,outputRoot:def.outputRoot,retries,minFreeGB,jobs};
}
// The job's input must parse exactly as produce.mjs will parse it; the job's format must not contradict the input.
export function checkInput(kind,text,j,what='Job'){
 const probe='batchprobe',snap='snapshot.json',read=p=>{if(p!==snap)throw Error('unexpected read');return text;};
 const args=productionArgs(kind,snap,j.backend,probe,j.format);
 let o;try{o=parseProduction(args,{read});}catch(e){throw Error(what+' ("'+j.id+'"): '+String(e.message??e));}
 const own=kind==='request'?o.request.format:o.project.format;
 if(kind==='request'){const raw=safeJson(text);if(raw.format!==undefined&&raw.format!==j.format)throw Error(what+' ("'+j.id+'"): the request asks for format '+raw.format+' but the job says '+j.format+'; make them agree');}
 else if((own??DEFAULT_FORMAT)!==j.format)throw Error(what+' ("'+j.id+'"): the project is '+(own??DEFAULT_FORMAT)+' but the job says '+j.format+'; edit the project or the job');
 return {outputSuffixes:o.ids.map(x=>x.slice(probe.length+1))};
}
export function productionArgs(kind,input,backend,id,format){
 return kind==='request'?['--request',input,'--backend',backend,'--id',id,'--format',format]:['--project',input,'--backend',backend,'--id',id];
}
const DIRS=['inputs','jobs','logs','films','attempts','requests'];
// Create a batch: validate, snapshot inputs, write job manifests, then batch.json last (its presence marks a complete batch).
export function createBatch(def,{root,source=null,now=()=>new Date().toISOString()}){
 const v=validateBatch(def,{root}),dir=batchDirFor(root,v.outputRoot,v.id);
 mkdirSync(dirname(dir),{recursive:true});
 // Repair R9: a folder without batch.json is a creation that was interrupted; say so.
 try{mkdirSync(dir);}catch(e){if(e.code==='EEXIST')throw Error(existsSync(join(dir,'batch.json'))?'Batch already exists: '+dir+'; choose a new batch id':'An incomplete batch folder (no batch.json, its creation was interrupted) is in the way: '+dir+'; remove it or choose a new batch id');throw e;}
 for(const d of DIRS)mkdirSync(join(dir,d));
 const jobs=v.jobs.map(j=>{
  const input='inputs/'+j.id+'.json';writeFileSync(join(dir,input),j.bytes,{flag:'wx'});
  const manifest={version:BATCH_VERSION,id:j.id,state:'queued',failures:0,interruptions:0,attempts:[],outputs:null,error:null,history:[{at:now(),to:'queued'}]};
  writeJsonAtomic(join(dir,'jobs',j.id+'.json'),manifest);
  return {id:j.id,kind:j.kind,source:j.source,input,inputSha256:sha256(j.bytes),backend:j.backend,format:j.format,concurrency:j.concurrency,retries:j.retries,outputSuffixes:j.outputSuffixes};
 });
 const batch={version:BATCH_VERSION,kind:'aether-batch',id:v.id,createdAt:now(),source,outputRoot:v.outputRoot,retries:v.retries,minFreeGB:v.minFreeGB,jobs,status:'created',runs:[],requests:[]};
 writeJsonAtomic(join(dir,'batch.json'),batch);
 return {dir,batch};
}
export function loadBatch(dir){
 const p=join(dir,'batch.json');if(!existsSync(p))throw Error('Not a complete batch (no batch.json): '+dir);
 const batch=readJson(p);if(batch.version!==BATCH_VERSION||batch.kind!=='aether-batch'||!Array.isArray(batch.jobs))throw Error('Unsupported batch manifest: '+p);
 // Repair R1/R2: manifests are files on disk, so they are checked like any input before a path is built from them.
 // Every path and folder name must be exactly what this code writes; anything else is refused, never acted on.
 const bad=m=>{throw Error('Corrupt batch manifest ('+p+'): '+m);};
 try{slug(batch.id,32,'id');}catch{bad('id');}
 if(typeof batch.minFreeGB!=='number'||!(batch.minFreeGB>=1&&batch.minFreeGB<=1000))bad('minFreeGB');
 if(!Array.isArray(batch.runs)||!Array.isArray(batch.requests))bad('runs/requests');
 if(batch.jobs.length<1||batch.jobs.length>LIMITS.jobs)bad('job count');
 const ids=new Set();
 for(const j of batch.jobs){
  try{slug(j?.id,20,'job id');}catch{bad('job id '+JSON.stringify(j?.id));}
  if(ids.has(j.id))bad('duplicate job '+j.id);ids.add(j.id);
  if(!['request','project'].includes(j.kind))bad(j.id+' kind');
  if(j.input!=='inputs/'+j.id+'.json')bad(j.id+' input');
  if(typeof j.inputSha256!=='string'||!/^[a-f0-9]{64}$/.test(j.inputSha256))bad(j.id+' inputSha256');
  if(!['cpu','three','both'].includes(j.backend))bad(j.id+' backend');
  if(!FORMAT_IDS.includes(j.format))bad(j.id+' format');
  const backends=j.backend==='both'?['cpu','three']:[j.backend];
  if(!Array.isArray(j.outputSuffixes)||j.outputSuffixes.length!==backends.length||j.outputSuffixes.some((s,i)=>!new RegExp('^'+backends[i]+'-(original|polished)$').test(s))||new Set(j.outputSuffixes.map(s=>s.split('-')[1])).size!==1)bad(j.id+' outputSuffixes');
  if(j.concurrency!==null&&!(Number.isSafeInteger(j.concurrency)&&j.concurrency>=1&&j.concurrency<=LIMITS.concurrency))bad(j.id+' concurrency');
  if(!(Number.isSafeInteger(j.retries)&&j.retries>=0&&j.retries<=LIMITS.retries))bad(j.id+' retries');
 }
 const jobs=new Map(batch.jobs.map(j=>[j.id,checkJob(readJson(join(dir,'jobs',j.id+'.json')),j)]));
 return {batch,jobs};
}
function checkJob(m,spec){
 const bad=x=>{throw Error('Corrupt job manifest: '+spec.id+': '+x);};
 if(!m||m.id!==spec.id||!Object.hasOwn(NEXT,m.state))bad('id or state');
 if(!Array.isArray(m.attempts)||!Array.isArray(m.history)||m.attempts.length>LIMITS.attempts)bad('attempts or history');
 for(const k of ['failures','interruptions'])if(!Number.isSafeInteger(m[k])||m[k]<0)bad(k);
 m.attempts.forEach((a,i)=>{
  if(a?.n!==i+1||typeof a.id!=='string'||!new RegExp('^'+spec.id+'-a'+a.n+'-[a-f0-9]{4}$').test(a.id))bad('attempt '+(i+1)+' id');
  if(JSON.stringify(a.folders)!==JSON.stringify(folderNames(a.id,spec.outputSuffixes)))bad('attempt '+a.id+' folders');
  if(a.log!=='logs/'+a.id+'.log')bad('attempt '+a.id+' log');
  if(a.pid!==undefined&&!(Number.isSafeInteger(a.pid)&&a.pid>0))bad('attempt '+a.id+' pid');
  if(a.pidStart!==undefined&&a.pidStart!==null&&!Number.isFinite(a.pidStart))bad('attempt '+a.id+' pidStart');
 });
 if(m.outputs!==null&&(m.outputs?.folder!=='films/'+spec.id||!m.attempts.some(a=>a.id===m.outputs.attempt)))bad('outputs');
 if(m.state==='succeeded'&&!m.outputs)bad('succeeded without outputs');
 return m;
}
// Record a transition (append-only history) and persist the job manifest before the caller acts on it.
export function transition(dir,job,to,note){
 if(!NEXT[job.state]?.includes(to))throw Error('Illegal job transition '+job.state+' -> '+to+' ('+job.id+')');
 // Repair R8: the limit is checked before anything changes.
 if(job.history.length>=LIMITS.history)throw Error('Job history limit reached: '+job.id);
 job.history.push({at:new Date().toISOString(),from:job.state,to,...(note?{note:String(note).slice(0,300)}:{})});
 job.state=to;saveJob(dir,job);
}
export const saveJob=(dir,job)=>writeJsonAtomic(join(dir,'jobs',job.id+'.json'),job);
export function summary(jobs){const s={queued:0,preparing:0,rendering:0,verifying:0,placing:0,succeeded:0,failed:0,cancelled:0};for(const j of jobs.values())s[j.state]++;return s;}
function saveBatch(dir,batch,jobs){batch.summary=summary(jobs);writeJsonAtomic(join(dir,'batch.json'),batch);}
const folderNames=(attemptId,suffixes)=>({production:attemptId+'-production',prepared:attemptId+'-prepared',outputs:suffixes.map(s=>attemptId+'-'+s)});
const allFolders=f=>[f.production,f.prepared,...f.outputs];
// Verify a finished production in base/: manifest, film SHA-256, probe, quality report and (pairs) the comparison.
export function verifyOutputs(base,attemptId,folders){
 const prod=join(base,folders.production),pm=readJson(join(prod,'production.json'));
 if(pm.id!==attemptId)throw Error('production manifest names '+pm.id+', expected '+attemptId);
 if(pm.status!=='succeeded')throw Error('production status is '+pm.status+(pm.error?': '+String(pm.error).slice(0,300):''));
 if(JSON.stringify(pm.outputIds)!==JSON.stringify(folders.outputs))throw Error('production outputs '+JSON.stringify(pm.outputIds)+' differ from the expected '+JSON.stringify(folders.outputs));
 if(!existsSync(join(base,folders.prepared)))throw Error('prepared folder missing');
 if(folders.outputs.length===2&&!existsSync(join(prod,'comparison.json')))throw Error('matched comparison report missing');
 const films=folders.outputs.map((f,i)=>{
  const r=pm.results?.[i];if(!r||r.id!==f||r.status!=='succeeded'||typeof r.filmSha256!=='string')throw Error('no succeeded result for '+f);
  const film=join(base,f,'film.mp4');if(!existsSync(film))throw Error('film missing: '+f);
  const got=hashFile(film);if(got!==r.filmSha256)throw Error('film SHA-256 of '+f+' is '+got.slice(0,16)+'…, the production recorded '+r.filmSha256.slice(0,16)+'…');
  readJson(join(base,f,'probe.json'));const q=readJson(join(base,f,'quality-report.json'));if(q.errors!==0)throw Error('quality report of '+f+' has errors');
  return {folder:f,backend:r.backend,sha256:got,bytes:statSync(film).size,frames:r.frames,renderSeconds:r.renderSeconds,gl:r.gl??null,qualityStatus:r.qualityStatus,warnings:r.warnings};
 });
 return {films,sourceCommit:pm.sourceCommit??null,sourceDirty:pm.sourceDirty??null,targetFrames:pm.targetFrames};
}
// Move whatever exists of an attempt's folders from out/ to dest/ (idempotent: already-moved folders are skipped).
function moveFolders(root,folders,dest){
 mkdirSync(dest,{recursive:true});const moved=[],missing=[];
 for(const f of allFolders(folders)){const src=join(root,'out',f),dst=join(dest,f);if(existsSync(dst)){moved.push(f);continue;}if(!existsSync(src)){missing.push(f);continue;}retrying(()=>renameSync(src,dst));moved.push(f);}
 return {moved,missing};
}
function setAside(root,dir,attempt){
 try{const r=moveFolders(root,attempt.folders,join(dir,'attempts',attempt.id));attempt.location=r.moved.length?'attempts':'none';}
 catch(e){attempt.location='out';attempt.moveError=String(e.message??e).slice(0,300);}
}
// Place a verified attempt into films/<job>/ and verify it there; returns the outputs record.
function place(root,dir,job,attempt){
 const dest=join(dir,'films',job.id),r=moveFolders(root,attempt.folders,dest);
 if(r.missing.length)throw Error('cannot place: missing '+r.missing.join(', '));
 attempt.location='films';
 const v=verifyOutputs(dest,attempt.id,attempt.folders);
 return {folder:'films/'+job.id,attempt:attempt.id,...v};
}
// Bounded attempt log: the file stops at LIMITS.logBytes (one marker line); a short tail is kept for error summaries.
function boundedLog(path,limit=LIMITS.logBytes){
 // Repair R3: a child that outlives a failed cancel may still print after the log is closed; that is ignored, not a crash.
 const fd=openSync(path,'wx');let n=0,cut=false,tail='',closed=false;
 return {write(s){tail=(tail+s).slice(-4000);if(cut||closed)return;const b=Buffer.from(s);if(n+b.length>limit){writeSync(fd,b.subarray(0,Math.max(0,limit-n)));writeSync(fd,'\n[log truncated at '+limit+' bytes]\n');n=limit;cut=true;return;}writeSync(fd,b);n+=b.length;},close(){if(closed)return;closed=true;try{closeSync(fd);}catch{}},get tail(){return tail;},get truncated(){return cut;}};
}
// Default executor: the unchanged production CLI. POSIX children get their own process group (tree cancellation).
export function spawnProduce({root,args,env}){
 return spawn(process.execPath,[join(root,'scripts','produce.mjs'),...args],{cwd:root,env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32',windowsHide:true,shell:false});
}
export function freeBytes(p){const s=statfsSync(p);return Number(s.bavail)*Number(s.bsize);}
// Cancel/stop requests are small files in requests/ (written by `batch.mjs cancel|stop` while a runner holds the lock).
export function writeRequest(dir,req){
 const r={version:1,action:req.action,...(req.job?{job:slug(req.job,20,'Job id')}:{}),at:new Date().toISOString()};
 if(!['cancel','stop'].includes(r.action))throw Error('Request action must be cancel or stop');
 writeJsonAtomic(join(dir,'requests',Date.now()+'-'+randomBytes(4).toString('hex')+'.json'),r);return r;
}
function takeRequests(dir,batch){
 const out=[];let names=[];try{names=readdirSync(join(dir,'requests')).filter(n=>/^\d+-[a-f0-9]{8}\.json$/.test(n)).sort();}catch{}
 for(const n of names.slice(0,LIMITS.requests)){const p=join(dir,'requests',n);let r;try{r=readJson(p);}catch{r=null;}try{unlinkSync(p);}catch{}
  const ok=r&&r.version===1&&['cancel','stop'].includes(r.action)&&(r.job===undefined||batch.jobs.some(j=>j.id===r.job));
  batch.requests.push({...(ok?r:{invalid:n}),takenAt:new Date().toISOString()});if(batch.requests.length>LIMITS.requests)batch.requests.shift();if(ok)out.push(r);}
 return out;
}
const effectiveConcurrency=(spec,env)=>spec.concurrency??(env.AETHER_CONCURRENCY?Number(env.AETHER_CONCURRENCY):2);
// Is the attempt's recorded PID still that production? Repair R4: identity is the start time measured at spawn
// (±2 s), not closeness to the attempt's own timestamp (a slow spawn or a clock step would hide a live orphan).
// Without a measured start (older manifests, or no measurement on this platform): a 10-minute window.
export function sameProcess(a,startMs=processStartMs){
 if(!pidAlive(a.pid))return false;
 const now=startMs(a.pid);if(now===null)return true;
 if(Number.isFinite(a.pidStart))return Math.abs(now-a.pidStart)<=2000;
 return Math.abs(now-Date.parse(a.startedAt))<=600000;
}
// Bring jobs a dead runner left in flight to a consistent state, never re-rendering finished work. A production the
// dead runner started may still be running (only the runner died): its whole tree is ended first, verified gone.
export async function recover(root,dir,batch,jobs,{log=()=>{},killTree=defaultKillTree}={}){
 for(const job of jobs.values()){
  if(TERMINAL.includes(job.state)||job.state==='queued')continue;
  const a=job.attempts.at(-1);if(!a)throw Error('Job '+job.id+' is '+job.state+' without an attempt');
  if(a.pid&&sameProcess(a)){
   log(job.id+': attempt '+a.n+' is still running without its runner (PID '+a.pid+'); ending its process tree');
   const k=await killTree(a.pid);if(!k.gone)throw Error(job.id+': an orphaned production (PIDs '+k.remaining.join(', ')+') did not stop; end it in Task Manager, then run the batch again');
   a.orphanKilled=k.pids.length;
  }
  if(job.state==='placing'){
   try{job.outputs=place(root,dir,job,a);a.outcome='succeeded';a.endedAt=new Date().toISOString();transition(dir,job,'succeeded','placement completed after a restart');log(job.id+': placement completed after a restart (no re-render)');}
   catch(e){a.outcome='failed';a.error=String(e.message??e).slice(0,600);job.error=a.error;transition(dir,job,'failed','placement could not be completed: '+a.error);}
   continue;
  }
  // The production may have finished before the runner died: verify it in place and keep it.
  let verified=null;try{verified=verifyOutputs(join(root,'out'),a.id,a.folders);}catch{}
  if(verified){
   if(job.state!=='verifying')transition(dir,job,'verifying','production had finished before the restart');
   transition(dir,job,'placing');
   try{job.outputs=place(root,dir,job,a);a.outcome='succeeded';a.endedAt=new Date().toISOString();transition(dir,job,'succeeded','verified after a restart (no re-render)');log(job.id+': finished production verified after a restart (no re-render)');}
   catch(e){a.outcome='failed';a.error=String(e.message??e).slice(0,600);job.error=a.error;transition(dir,job,'failed',a.error);}
   continue;
  }
  a.outcome='interrupted';a.endedAt=new Date().toISOString();a.error='the runner stopped while this attempt was '+job.state;setAside(root,dir,a);job.interruptions++;
  if(job.interruptions>LIMITS.interruptions){job.error='interrupted '+job.interruptions+' times';transition(dir,job,'failed',job.error);}
  else transition(dir,job,'queued','attempt '+a.n+' interrupted (runner restart); folders kept in attempts/'+a.id);
  log(job.id+': attempt '+a.n+' was interrupted; '+(job.state==='queued'?'queued again under a new attempt':'failed'));
 }
 saveBatch(dir,batch,jobs);
}
// Run (or resume) a batch. Resolves {status:'finished'|'stopped', exitCode, summary}.
export async function runBatch(dir,{root,env=process.env,execute=spawnProduce,killTree=defaultKillTree,diskFree=freeBytes,pollMs=1000,log=s=>console.log(s),signals=false,holder,logBytes=LIMITS.logBytes,attemptTag=()=>randomBytes(2).toString('hex')}={}){
 const lock=acquireRenderLock(root,{holder:holder??('batch '+dir.split(sep).at(-1)),env});
 let stopSignal=false;const onSignal=()=>{stopSignal=true;};
 if(signals)for(const s of ['SIGINT','SIGTERM','SIGBREAK'])process.on(s,onSignal);
 try{
  const {batch,jobs}=loadBatch(dir);
  const runStart=new Date().toISOString(),run={pid:process.pid,startedAt:runStart,endedAt:null,outcome:null};
  // Requests left from before this run: cancels apply; a stop meant for an earlier runner does not stop this one.
  let stop=false;const pending=new Set();
  const apply=reqs=>{for(const r of reqs){if(r.action==='stop'){if(r.at>=runStart)stop=true;continue;}
   for(const j of jobs.values())if((r.job===undefined||r.job===j.id)&&!TERMINAL.includes(j.state)){if(j.state==='queued')transition(dir,j,'cancelled','cancel requested');else pending.add(j.id);}}};
  await recover(root,dir,batch,jobs,{log,killTree});
  for(const spec of batch.jobs){const j=jobs.get(spec.id);if(j.state==='queued'&&sha256(readFileSync(join(dir,spec.input)))!==spec.inputSha256){j.error='input snapshot changed after the batch was created';transition(dir,j,'failed',j.error);}}
  batch.status='running';batch.runs.push(run);apply(takeRequests(dir,batch));saveBatch(dir,batch,jobs);
  let reason=null;
  for(const spec of batch.jobs){
   const job=jobs.get(spec.id);
   for(;;){
    // Repair R5: requests are read before every attempt, so a stop or cancel sent between jobs acts before the next one starts.
    apply(takeRequests(dir,batch));
    if(job.state!=='queued'||stop||stopSignal)break;
    if(job.attempts.length>=LIMITS.attempts){job.error='attempt limit reached';transition(dir,job,'failed',job.error);break;}
    // Repair R7: free space that cannot be measured stops the batch (fail closed) instead of crashing the runner.
    let free;try{free=diskFree(dir);}catch(e){reason='cannot measure free disk space: '+String(e.message??e).slice(0,200);stop=true;break;}
    const need=batch.minFreeGB*1024**3;
    if(!(free>=need)){reason='low disk space: '+(free/1024**3).toFixed(1)+' GB free, the batch needs '+batch.minFreeGB+' GB before each job';stop=true;break;}
    // Repair R10: an attempt ID is drawn until none of its folders exists (produce.mjs would refuse it as a failure).
    const n=job.attempts.length+1;let id,folders;
    for(let k=0;;k++){if(k>=20)throw Error(spec.id+': no free attempt ID after 20 draws');id=spec.id+'-a'+n+'-'+attemptTag();folders=folderNames(id,spec.outputSuffixes);
     if(!/^[a-f0-9]{4}$/.test(id.slice(-4)))throw Error('attempt tag must be 4 hex digits');
     if(!allFolders(folders).some(f=>existsSync(join(root,'out',f))||existsSync(join(dir,'attempts',id))||existsSync(join(dir,'films',spec.id,f))))break;}
    const attempt={n,id,folders,startedAt:new Date().toISOString(),endedAt:null,outcome:'running',log:'logs/'+id+'.log',concurrency:effectiveConcurrency(spec,env),gl:env.AETHER_GL??null,location:'out'};
    job.attempts.push(attempt);transition(dir,job,'preparing','attempt '+n+' ('+id+')');
    log(spec.id+': attempt '+n+' started ('+spec.backend+', '+spec.format+', concurrency '+attempt.concurrency+')');
    const out=boundedLog(join(dir,attempt.log),logBytes);
    const childEnv={...env,AETHER_RENDER_LOCK_TOKEN:lock.token,...(spec.concurrency?{AETHER_CONCURRENCY:String(spec.concurrency)}:{})};
    let child;const done=new Promise(ok=>{
     try{child=execute({root,args:productionArgs(spec.kind,join(dir,spec.input),spec.backend,id,spec.format),env:childEnv});}catch(e){out.write('spawn failed: '+e.message+'\n');ok({code:-1,signal:null});return;}
     // Recorded so a restart can recognise and end an orphaned production (repair R4: by its measured start time).
     // The PID is written first (measuring the start time takes about a second on Windows); then the start time.
     if(child.pid){attempt.pid=child.pid;saveJob(dir,job);attempt.pidStart=processStartMs(child.pid);saveJob(dir,job);}
     const relay=b=>{const s=b.toString();out.write(s);for(const line of s.split(/\r?\n/))if(/^(PASS|CHECKS|QUALITY)\b|production failed/.test(line))log('  '+spec.id+': '+line.slice(0,300));};
     child.stdout?.on('data',relay);child.stderr?.on('data',relay);child.on('error',e=>{out.write('process error: '+e.message+'\n');});child.on('close',(code,signal)=>ok({code,signal}));
    });
    let ended=null,action=null;done.then(r=>{ended=r;});
    while(!ended){
     await Promise.race([done,new Promise(r=>setTimeout(r,pollMs))]);if(ended)break;
     apply(takeRequests(dir,batch));if(stop||stopSignal)action='stop';if(pending.has(spec.id))action='cancel';
     if(action){
      log(spec.id+': '+(action==='cancel'?'cancelling':'stopping')+'; ending the whole process tree');
      const k=await killTree(child.pid);
      if(!k.gone){out.close();attempt.error='process tree did not stop: PIDs '+k.remaining.join(', ');saveJob(dir,job);throw Error(spec.id+': '+attempt.error+'; stop them in Task Manager, then run the batch again');}
      attempt.killed=k.pids.length;await done;break;
     }
     if(job.state==='preparing'){try{if(readJson(join(root,'out',folders.production,'production.json')).status==='rendering')transition(dir,job,'rendering');}catch{}}
    }
    out.close();attempt.exit=ended;attempt.endedAt=new Date().toISOString();if(out.truncated)attempt.logTruncated=true;
    if(action){
     pending.delete(spec.id);attempt.outcome=action==='cancel'?'cancelled':'stopped';setAside(root,dir,attempt);
     if(action==='cancel')transition(dir,job,'cancelled','cancelled during attempt '+n+'; process tree ended ('+attempt.killed+' processes)');
     else{transition(dir,job,'queued','stopped during attempt '+n+'; resumable');stop=true;}
     saveBatch(dir,batch,jobs);break;
    }
    let failure=null;
    if(ended.code===0){
     transition(dir,job,'verifying');
     try{verifyOutputs(join(root,'out'),id,folders);}catch(e){failure='verification failed: '+String(e.message??e);}
     if(!failure){
      transition(dir,job,'placing');
      try{job.outputs=place(root,dir,job,attempt);attempt.outcome='succeeded';job.error=null;transition(dir,job,'succeeded');log(spec.id+': succeeded ('+job.outputs.films.map(f=>f.backend+' '+f.sha256.slice(0,16)+'…').join(', ')+')');}
      catch(e){attempt.outcome='failed';attempt.error=job.error='placement failed: '+String(e.message??e).slice(0,600);transition(dir,job,'failed',job.error);log(spec.id+': '+job.error);}
      saveBatch(dir,batch,jobs);break;
     }
    }else{
     let pm=null;try{pm=readJson(join(root,'out',folders.production,'production.json'));}catch{}
     failure=(pm?.error?String(pm.error):'production exited '+(ended.code??ended.signal))+(out.tail?' | log tail: '+out.tail.trim().split(/\r?\n/).slice(-3).join(' / '):'');
    }
    attempt.outcome='failed';attempt.error=failure.slice(0,1200);setAside(root,dir,attempt);job.failures++;
    if(job.failures<=spec.retries){transition(dir,job,'queued','attempt '+n+' failed; retry '+job.failures+' of '+spec.retries);log(spec.id+': attempt '+n+' failed; retrying ('+job.failures+'/'+spec.retries+')');}
    else{job.error=attempt.error;transition(dir,job,'failed',attempt.error.slice(0,300));log(spec.id+': failed: '+attempt.error.slice(0,300));}
    saveBatch(dir,batch,jobs);
   }
   if(stop||stopSignal)break;
  }
  if(stopSignal&&!reason)reason='stopped by a signal';else if(stop&&!reason)reason='stop requested';
  const s=summary(jobs),unfinished=[...jobs.values()].some(j=>!TERMINAL.includes(j.state));
  batch.status=unfinished?'stopped':'finished';run.endedAt=new Date().toISOString();run.outcome=batch.status+(reason?': '+reason:'');saveBatch(dir,batch,jobs);
  log('batch '+batch.id+' '+run.outcome+' — '+Object.entries(s).filter(([,v])=>v).map(([k,v])=>v+' '+k).join(', '));
  return {status:batch.status,reason,summary:s,exitCode:unfinished?2:s.succeeded===jobs.size?0:1};
 }finally{
  if(signals)for(const s of ['SIGINT','SIGTERM','SIGBREAK'])process.off(s,onSignal);
  lock.release();
 }
}
// Cancel or stop. With no runner (the lock is free) cancels apply at once; otherwise a request file is left for the runner.
export function requestCancel(dir,{root,action,job,env=process.env}){
 const {batch,jobs}=loadBatch(dir);if(job!==undefined&&!jobs.has(job))throw Error('Unknown job: '+job);
 let lock;try{lock=acquireRenderLock(root,{holder:'batch '+action,env});}catch(e){if(e.code!=='ELOCKED')throw e;writeRequest(dir,{action,job});return {applied:false,message:'Request left for the running process: '+e.message.replace(/^Another render is running on this machine: /,'').replace(/\. Wait.*$/,'')};}
 try{
  if(action==='stop')return {applied:true,message:'No runner is active for this batch; nothing to stop.'};
  const changed=[],later=[];
  for(const j of jobs.values()){if(job!==undefined&&job!==j.id)continue;if(j.state==='queued'){transition(dir,j,'cancelled','cancel requested');changed.push(j.id);}else if(!TERMINAL.includes(j.state))later.push(j.id);}
  // A job a stopped runner left in flight is recovered first by the next run; the request waits for it there.
  if(later.length)for(const id of later)writeRequest(dir,{action,job:id});
  if(changed.length)saveBatch(dir,batch,jobs);
  return {applied:true,message:(changed.length?'Cancelled: '+changed.join(', '):'No queued job to cancel.')+(later.length?' Left in flight by an earlier runner, cancelled when the batch next runs: '+later.join(', '):'')};
 }finally{lock.release();}
}
// Re-hash every succeeded output; never renders.
export function verifyBatch(dir){
 const {batch,jobs}=loadBatch(dir),rows=[];
 for(const spec of batch.jobs){const j=jobs.get(spec.id);if(j.state!=='succeeded'){rows.push({job:j.id,state:j.state,ok:null});continue;}
  try{const a=j.attempts.find(x=>x.id===j.outputs.attempt),v=verifyOutputs(join(dir,'films',j.id),a.id,a.folders);
   const same=v.films.every((f,i)=>f.sha256===j.outputs.films[i].sha256);rows.push({job:j.id,state:j.state,ok:same,...(same?{}:{error:'film hash differs from the batch record'})});}
  catch(e){rows.push({job:j.id,state:j.state,ok:false,error:String(e.message??e).slice(0,300)});}}
 return rows;
}
