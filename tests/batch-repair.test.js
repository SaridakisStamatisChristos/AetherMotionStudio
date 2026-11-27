// DUAL-08 repair pass (owner: "do a repair pass on dual-08 code before merging"). One test per defect found in a
// review of the batch code; each test fails on the code before the repair (R10, R11 and R13 were found by reading:
// see CAMPAIGN_A.md "DUAL-08 repair pass").
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createBatch,runBatch,loadBatch,transition,writeRequest,saveJob,validateBatch,LIMITS} from '../scripts/batch-lib.mjs';
import {acquireRenderLock,lockPath,pidAlive} from '../scripts/render-lock.mjs';
import {killTree} from '../scripts/process-tree.mjs';
const fake=fileURLToPath(new URL('./fixtures/fake-produce.mjs',import.meta.url));
const runnerScript=fileURLToPath(new URL('./fixtures/batch-runner.mjs',import.meta.url));
const posix=process.platform!=='win32';
const execute=({root,args,env})=>spawn(process.execPath,[fake,...args],{cwd:root,env,stdio:['ignore','pipe','pipe'],detached:posix,windowsHide:true});
const env={...process.env};delete env.AETHER_RENDER_LOCK;delete env.AETHER_RENDER_LOCK_TOKEN;delete env.FAKE_HANG_DONE;
const REQ={version:1,id:'x',topic:'How a lighthouse guides ships',seconds:30,profile:'polished'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function sandbox(){const root=mkdtempSync(join(tmpdir(),'batchfix-'));mkdirSync(join(root,'out'));mkdirSync(join(root,'inputs'));writeFileSync(join(root,'inputs','req.json'),JSON.stringify(REQ));return root;}
const job=(id,extra={})=>({id,request:'inputs/req.json',backend:'cpu',format:'vertical-v1',...extra});
const def=(id,jobs,extra={})=>({version:1,id,outputRoot:'out/batches',jobs,...extra});
const quiet={pollMs:50,log:()=>{}};
const readJ=p=>JSON.parse(readFileSync(p,'utf8')),writeJ=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2));
async function waitFor(fn,ms=20000){const end=Date.now()+ms;for(;;){const v=fn();if(v)return v;if(Date.now()>end)throw Error('timed out');await sleep(50);}}
const gpOf=(root,dir,id)=>{try{const a=loadBatch(dir).jobs.get(id).attempts.at(-1);if(!a)return null;const f=join(root,'out',a.folders.production,'grandchild.pid');return existsSync(f)?Number(readFileSync(f,'utf8')):null;}catch{return null;}};

test('R1: a tampered batch.json (input path, output suffix, backend) is refused on load, never acted on',()=>{
 const root=sandbox();const {dir}=createBatch(def('r1',[job('ok-a')]),{root});const p=join(dir,'batch.json'),orig=readJ(p);
 for(const [k,v] of [['input','../../../outside.json'],['outputSuffixes',['../../../victim']],['outputSuffixes',['cpu-polished','three-polished']],['backend','gpu'],['kind','script'],['format','portrait'],['inputSha256','x'],['id','../x']]){
  const b=structuredClone(orig);b.jobs[0][k]=v;writeJ(p,b);assert.throws(()=>loadBatch(dir),/Corrupt batch manifest/,k+'='+JSON.stringify(v));
 }
 const b=structuredClone(orig);b.jobs.push(structuredClone(b.jobs[0]));writeJ(p,b);assert.throws(()=>loadBatch(dir),/Corrupt batch manifest/);
 writeJ(p,orig);assert.equal(loadBatch(dir).jobs.size,1);
});

test('R2: a job manifest whose attempt names folders outside its own production is refused; nothing is moved',async()=>{
 const root=sandbox();const {dir}=createBatch(def('r2',[job('ok-r')]),{root});
 const victim=join(root,'out','victim');mkdirSync(victim);writeFileSync(join(victim,'keep.txt'),'precious');
 const j=loadBatch(dir).jobs.get('ok-r');
 j.attempts.push({n:1,id:'ok-r-a1-abcd',folders:{production:'victim',prepared:'ok-r-a1-abcd-prepared',outputs:['ok-r-a1-abcd-cpu-polished']},startedAt:new Date().toISOString(),endedAt:null,outcome:'running',log:'logs/ok-r-a1-abcd.log',location:'out'});
 transition(dir,j,'preparing');transition(dir,j,'rendering');
 await assert.rejects(runBatch(dir,{root,env,execute,...quiet}),/Corrupt job manifest/);
 assert.equal(readFileSync(join(victim,'keep.txt'),'utf8'),'precious','the victim folder was not moved');
 const j2=readJ(join(dir,'jobs','ok-r.json'));j2.attempts[0].folders.production='ok-r-a1-abcd-production';j2.attempts[0].id='../../x';writeJ(join(dir,'jobs','ok-r.json'),j2);
 assert.throws(()=>loadBatch(dir),/Corrupt job manifest/);
});

test('R3: when a cancelled tree will not stop, the runner stops cleanly (no crash from late log output)',async()=>{
 const root=sandbox();const {dir}=createBatch(def('r3',[job('chatty-a')]),{root});
 const run=runBatch(dir,{root,env,execute,killTree:async()=>({gone:false,remaining:[123456]}),...quiet});
 await waitFor(()=>loadBatch(dir).jobs.get('chatty-a').attempts[0]?.pid);
 await sleep(200);writeRequest(dir,{action:'cancel',job:'chatty-a'});
 await assert.rejects(run,/process tree did not stop: PIDs 123456/);
 await sleep(400);// the child keeps printing after the runner gave up: this must not throw in the runner's handlers
 const pid=loadBatch(dir).jobs.get('chatty-a').attempts[0].pid;assert.equal((await killTree(pid)).gone,true);
 assert.equal(existsSync(lockPath(root,env)),false,'the lock was released');
});

test('R4: restart recovery ends an orphan even when its spawn was slow (identity by measured start time, not a 2 s window)',async t=>{
 const root=sandbox();const {dir}=createBatch(def('r4',[job('hang-c')]),{root});
 const runner=spawn(process.execPath,[runnerScript,root,dir],{stdio:'ignore',env,windowsHide:true});
 t.after(async()=>{for(const p of [runner.pid,loadBatch(dir).jobs.get('hang-c').attempts[0]?.pid])if(p&&pidAlive(p))await killTree(p);});
 const gp=await waitFor(()=>gpOf(root,dir,'hang-c'));
 await waitFor(()=>loadBatch(dir).jobs.get('hang-c').attempts[0].pidStart!==undefined);
 const orphan=loadBatch(dir).jobs.get('hang-c').attempts[0].pid;
 process.kill(runner.pid,'SIGKILL');await waitFor(()=>!pidAlive(runner.pid));assert.ok(pidAlive(orphan));
 // The attempt was recorded long before the process started (a slow spawn, or a clock step).
 const p=join(dir,'jobs','hang-c.json'),j=readJ(p);j.attempts[0].startedAt=new Date(Date.now()-3600e3).toISOString();writeJ(p,j);
 const r=await runBatch(dir,{root,env:{...env,FAKE_HANG_DONE:'1'},execute,...quiet});
 const alive=pidAlive(orphan);if(alive)await killTree(orphan);
 assert.equal(alive,false,'the orphaned production was ended before the job ran again');assert.equal(pidAlive(gp),false);assert.equal(r.exitCode,0);
});

test('R5: a stop that arrives between jobs stops before the next job starts',async()=>{
 const root=sandbox();const {dir}=createBatch(def('r5',[job('ok-1'),job('ok-2')]),{root});let n=0;
 const r=await runBatch(dir,{root,env,execute:x=>{const c=execute(x);if(++n===1)writeRequest(dir,{action:'stop'});return c;},pollMs:5000,log:()=>{}});
 const {jobs}=loadBatch(dir);
 assert.equal(jobs.get('ok-1').state,'succeeded');assert.equal(jobs.get('ok-2').attempts.length,0,'ok-2 never started');
 assert.equal(r.status,'stopped');assert.equal(r.exitCode,2);
});

test('R6: reserved and excluded path segments are refused in any letter case',()=>{
 const root=sandbox();
 for(const p of ['NODE_MODULES/x.json','inputs/CON.json','inputs/Nul.json','.GIT/x.json','inputs/LPT1.json'])assert.throws(()=>validateBatch(def('a',[job('j',{request:p})]),{root}),/path segment not allowed|repository-relative/,p);
});

test('R7: when free disk space cannot be measured the batch stops with that reason (fail closed, not a crash)',async()=>{
 const root=sandbox();const {dir}=createBatch(def('r7',[job('ok-a')]),{root});
 const r=await runBatch(dir,{root,env,execute,diskFree:()=>{throw Object.assign(Error('statfs unsupported'),{code:'ENOSYS'});},...quiet});
 assert.equal(r.status,'stopped');assert.match(r.reason,/cannot measure free disk space: statfs unsupported/);
 const {batch,jobs}=loadBatch(dir);assert.equal(batch.status,'stopped');assert.equal(jobs.get('ok-a').attempts.length,0);
});

test('R8: at the history limit a transition is refused without changing the job',()=>{
 const root=sandbox();const {dir}=createBatch(def('r8',[job('ok-a')]),{root});const j=loadBatch(dir).jobs.get('ok-a');
 while(j.history.length<LIMITS.history)j.history.push({at:'x',to:'queued'});const before=j.history.length;
 assert.throws(()=>transition(dir,j,'preparing'),/history limit/);assert.equal(j.history.length,before);assert.equal(j.state,'queued');
});

test('R9: a half-created batch folder is named as incomplete',()=>{
 const root=sandbox();mkdirSync(join(root,'out','batches','half'),{recursive:true});
 assert.throws(()=>createBatch(def('half',[job('ok-a')]),{root}),/incomplete batch folder/);
 createBatch(def('whole',[job('ok-a')]),{root});assert.throws(()=>createBatch(def('whole',[job('ok-a')]),{root}),/Batch already exists/);
});

test('R10: an attempt ID whose folders already exist is never used (a new tag is drawn; not a failure)',async()=>{
 const root=sandbox();const {dir}=createBatch(def('r10',[job('ok-a')]),{root});
 mkdirSync(join(root,'out','ok-a-a1-dead-production'));const tags=['dead','beef'];
 const r=await runBatch(dir,{root,env,execute,attemptTag:()=>tags.shift()??'f00d',...quiet});
 const j=loadBatch(dir).jobs.get('ok-a');assert.equal(r.exitCode,0);assert.equal(j.attempts.length,1);assert.equal(j.attempts[0].id,'ok-a-a1-beef');assert.equal(j.failures,0);
 assert.ok(existsSync(join(root,'out','ok-a-a1-dead-production')),'the unrelated folder is untouched');
});

test('R11: on Windows a tree that cannot be enumerated is not reported as gone',{skip:posix&&'Windows process-table path'},async()=>{
 const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});
 try{const k=await killTree(c.pid,{table:()=>null,timeoutMs:3000});assert.equal(k.gone,false);assert.match(String(k.remaining),/process table unreadable/);}
 finally{await killTree(c.pid);}
});

test('R12: a takeover guard that is being written is respected; the stale lock is not taken twice',()=>{
 const root=sandbox(),p=lockPath(root,env);
 writeFileSync(p,JSON.stringify({version:1,token:'s'.repeat(32),pid:spawnSync(process.execPath,['-e','0'],{windowsHide:true}).pid,holder:'dead',startedAt:new Date().toISOString()}));
 writeFileSync(p+'.takeover','');// another process has just created its guard and not yet written it
 assert.throws(()=>acquireRenderLock(root,{holder:'second',env}),/taking over a stale render lock/);
 assert.ok(existsSync(p+'.takeover'),'the fresh guard was not deleted');
});
