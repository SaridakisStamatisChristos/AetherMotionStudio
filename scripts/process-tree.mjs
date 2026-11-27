// DUAL-08: stop a render's whole process tree (node → Remotion → Chromium tabs → ffmpeg) and prove it is gone.
// Windows has no process groups: the tree is read from Win32_Process (parent PID + creation time, so a reused parent
// PID never adopts unrelated processes), killed with `taskkill /T /F`, and re-read until no member is alive.
// POSIX: the child was spawned detached (its own process group): SIGTERM to the group, then SIGKILL after a grace period.
import {spawnSync} from 'node:child_process';
import {pidAlive} from './render-lock.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// [{pid, ppid, created}] for every process (Windows), or null when the table cannot be read.
export function processTable(){
 if(process.platform!=='win32')return null;
 const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId) $($_.CreationDate.ToFileTimeUtc())" }'],{encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:16*1024*1024});
 if(r.status!==0)return null;
 return String(r.stdout).split(/\r?\n/).map(l=>l.trim().split(' ').map(Number)).filter(x=>x.length===3&&x.every(Number.isFinite)).map(([pid,ppid,created])=>({pid,ppid,created}));
}
// The root and all its descendants (a child must be created after its parent).
export function descendants(table,rootPid){
 const byParent=new Map();for(const p of table){if(!byParent.has(p.ppid))byParent.set(p.ppid,[]);byParent.get(p.ppid).push(p);}
 const root=table.find(p=>p.pid===rootPid),out=new Map(),queue=root?[root]:[];
 if(root)out.set(root.pid,root);
 while(queue.length){const p=queue.shift();for(const c of byParent.get(p.pid)??[])if(c.pid!==p.pid&&c.created>=p.created&&!out.has(c.pid)){out.set(c.pid,c);queue.push(c);}}
 return [...out.values()];
}
// Kill the tree rooted at pid; resolves {gone:true, pids} only when no member is alive, else {gone:false, remaining}.
export async function killTree(pid,{timeoutMs=20000,graceMs=3000}={}){
 if(!Number.isSafeInteger(pid)||pid<=0)throw Error('killTree: invalid PID');
 const deadline=Date.now()+timeoutMs;
 if(process.platform==='win32'){
  const seen=new Map();// pid -> creation time of every member found so far
  const snap=()=>{const t=processTable();if(!t)return false;for(const [p,c] of seen){const now=t.find(x=>x.pid===p);if(now&&now.created!==c)seen.delete(p);}// reused PID: not ours
   const roots=[pid,...seen.keys()];for(const r of roots)for(const d of descendants(t,r))if(!seen.has(d.pid))seen.set(d.pid,d.created);return true;};
  if(!snap())seen.set(pid,0);
  for(;;){
   spawnSync('taskkill',['/PID',String(pid),'/T','/F'],{stdio:'ignore',windowsHide:true});
   for(const p of seen.keys())if(p!==pid&&pidAlive(p))spawnSync('taskkill',['/PID',String(p),'/T','/F'],{stdio:'ignore',windowsHide:true});
   await sleep(300);
   const remaining=[...seen.keys()].filter(pidAlive);
   if(!remaining.length){// re-read once: anything started by a member just before it died?
    const before=seen.size;snap();const late=[...seen.keys()].filter(pidAlive);
    if(!late.length)return {gone:true,pids:[...seen.keys()]};
    if(seen.size===before&&Date.now()>deadline)return {gone:false,remaining:late};
    continue;
   }
   if(Date.now()>deadline)return {gone:false,remaining};
  }
 }
 const group=()=>{try{process.kill(-pid,0);return true;}catch(e){return e.code==='EPERM';}};
 // The group's members, for the report (pgrep -g matches the process group ID); the leader alone if unavailable.
 const members=()=>{const r=spawnSync('pgrep',['-g',String(pid)],{encoding:'utf8',timeout:5000});const m=String(r.stdout??'').split(/\s+/).map(Number).filter(n=>Number.isSafeInteger(n)&&n>0);return m.length?m:[pid];};
 const pids=members();
 try{process.kill(-pid,'SIGTERM');}catch{}
 const kill9=Date.now()+graceMs;
 while(group()&&Date.now()<kill9)await sleep(100);
 if(group())try{process.kill(-pid,'SIGKILL');}catch{}
 while(group()&&Date.now()<deadline)await sleep(100);
 return group()?{gone:false,remaining:members()}:{gone:true,pids};
}
