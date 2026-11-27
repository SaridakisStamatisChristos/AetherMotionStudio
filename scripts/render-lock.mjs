// DUAL-08: one render at a time on this machine. Every process that prepares speech or renders (produce.mjs, cli.mjs
// prepare/render, the Studio's jobs, the batch runner) holds this exclusive lock file first, so a second Studio, a CLI
// production or a batch cannot contend for the GPU/CPU and the shared public/audio and out/speech-cache.
// - Created with 'wx' (exclusive); it holds the holder's PID, a random token, a label and the start time.
// - A child inherits its parent's lock through AETHER_RENDER_LOCK_TOKEN (the token must match the live lock).
// - A stale lock (holder PID gone, or the PID now belongs to a process started after the lock) is taken over under a
//   short exclusive takeover guard, so two waiting processes cannot both take it.
// - AETHER_RENDER_LOCK (an absolute path) overrides the location; tests use it to stay out of the real out/ folder.
import {writeFileSync,readFileSync,unlinkSync,mkdirSync,statSync} from 'node:fs';
import {join,dirname,isAbsolute} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
export const LOCK_VERSION=1;
export function lockPath(root,env=process.env){
 const p=env.AETHER_RENDER_LOCK;
 if(p!==undefined&&p!==''){if(!isAbsolute(p)||/[\0]/.test(p))throw Error('AETHER_RENDER_LOCK must be an absolute path');return p;}
 return join(root,'out','.render.lock');
}
const lockedError=(m,holder)=>Object.assign(Error(m),{code:'ELOCKED',status:409,holder});
// Start time of a live process in ms since the epoch, or null when it cannot be measured on this platform.
export function processStartMs(pid){
 try{
  if(process.platform==='win32'){
   const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','$p=Get-Process -Id '+Number(pid)+' -ErrorAction Stop; $p.StartTime.ToUniversalTime().ToString("o")'],{encoding:'utf8',timeout:15000,windowsHide:true});
   const t=Date.parse(String(r.stdout).trim());return r.status===0&&Number.isFinite(t)?t:null;
  }
  const r=spawnSync('ps',['-o','etimes=','-p',String(Number(pid))],{encoding:'utf8',timeout:5000});
  const s=Number(String(r.stdout).trim());return r.status===0&&Number.isFinite(s)&&String(r.stdout).trim()!==''?Date.now()-s*1000:null;
 }catch{return null;}
}
export function pidAlive(pid){
 if(!Number.isSafeInteger(pid)||pid<=0)return false;
 try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}
}
function readLockFile(p){
 // A holder writes its record in the same call that creates the file; an empty or partial read is retried briefly.
 for(let i=0;i<10;i++){
  let raw;try{raw=readFileSync(p,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}
  try{const x=JSON.parse(raw);if(x&&x.version===LOCK_VERSION&&typeof x.token==='string'&&Number.isSafeInteger(x.pid))return x;}catch{}
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30);
 }
 return {corrupt:true};
}
// Is the recorded holder still the process that took the lock?
export function holderAlive(rec,{startMs=processStartMs}={}){
 if(!rec||rec.corrupt)return false;
 if(!pidAlive(rec.pid))return false;
 if(rec.pid===process.pid)return true;
 const started=startMs(rec.pid),taken=Date.parse(rec.startedAt);
 // The PID was reused by a process that started after the lock was taken (2 s clock tolerance).
 if(started!==null&&Number.isFinite(taken)&&started>taken+2000)return false;
 return true;
}
export function describeHolder(rec){return rec&&!rec.corrupt?(rec.holder+' (PID '+rec.pid+', since '+rec.startedAt+')'):'an unreadable lock record';}
function create(p,rec){writeFileSync(p,JSON.stringify(rec)+'\n',{flag:'wx'});}
function corruptAgeMs(p){try{return Date.now()-statSync(p).mtimeMs;}catch{return 0;}}
// Acquire the machine render lock or throw ELOCKED naming the holder. Returns {token, inherited, path, release()}.
export function acquireRenderLock(root,{holder,env=process.env,startMs=processStartMs}={}){
 if(typeof holder!=='string'||!holder||holder.length>120)throw Error('Render lock holder label required');
 const p=lockPath(root,env);mkdirSync(dirname(p),{recursive:true});
 const inheritedToken=env.AETHER_RENDER_LOCK_TOKEN;
 if(inheritedToken){const cur=readLockFile(p);if(cur&&!cur.corrupt&&cur.token===inheritedToken&&pidAlive(cur.pid))return {token:cur.token,inherited:true,path:p,holder:cur,release(){}};}
 const rec={version:LOCK_VERSION,token:randomBytes(16).toString('hex'),pid:process.pid,holder,startedAt:new Date().toISOString()};
 for(let attempt=0;attempt<3;attempt++){
  try{create(p,rec);return handle(p,rec);}catch(e){if(e.code!=='EEXIST')throw e;}
  const cur=readLockFile(p);
  if(cur===null)continue;// released meanwhile: try again
  if(cur.corrupt?corruptAgeMs(p)<10000:holderAlive(cur,{startMs}))throw lockedError('Another render is running on this machine: '+describeHolder(cur)+'. Wait for it to finish, or stop it first.',cur);
  takeover(p,cur,{startMs});
 }
 throw lockedError('Could not take the render lock (it changed hands repeatedly); try again.',null);
}
// Remove a stale lock under an exclusive guard; only the guard holder may delete, and only the record it judged stale.
function takeover(p,stale,{startMs}){
 const g=p+'.takeover',guard={version:LOCK_VERSION,token:randomBytes(16).toString('hex'),pid:process.pid,holder:'takeover',startedAt:new Date().toISOString()};
 try{create(g,guard);}catch(e){
  if(e.code!=='EEXIST')throw e;
  const other=readLockFile(g);
  if(other&&!other.corrupt&&holderAlive(other,{startMs}))throw lockedError('Another process is taking over a stale render lock; try again.',other);
  try{unlinkSync(g);}catch{}
  return;// the caller retries (and may then win the guard)
 }
 try{
  const cur=readLockFile(p);
  const same=cur&&(stale.corrupt?cur.corrupt:(!cur.corrupt&&cur.token===stale.token));
  if(same)try{unlinkSync(p);}catch(e){if(e.code!=='ENOENT')throw e;}
 }finally{const mine=readLockFile(g);if(mine&&mine.token===guard.token)try{unlinkSync(g);}catch{}}
}
function handle(p,rec){
 let released=false;
 return {token:rec.token,inherited:false,path:p,holder:rec,release(){
  if(released)return;released=true;
  const cur=readLockFile(p);if(cur&&!cur.corrupt&&cur.token===rec.token)try{unlinkSync(p);}catch{}
 }};
}
// For short-lived CLI processes: take (or inherit) the lock, release it on exit, and export the token to children.
export function holdRenderLock(root,holder,env=process.env){
 const lock=acquireRenderLock(root,{holder,env});
 if(!lock.inherited){process.on('exit',()=>lock.release());for(const s of ['SIGINT','SIGTERM'])process.once(s,()=>{lock.release();process.exit(130);});}
 env.AETHER_RENDER_LOCK_TOKEN=lock.token;return lock;
}
