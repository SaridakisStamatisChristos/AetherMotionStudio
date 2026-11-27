// DUAL-08 bounded local batch production: validation, snapshots, durable state, lock, cancel, stop/resume, restart
// recovery, idempotence and bounded resources. Productions are a test double (tests/fixtures/fake-produce.mjs) run as
// real child processes with the real argument list, output layout and render-lock inheritance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,readdirSync,statSync,utimesSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createBatch,runBatch,loadBatch,validateBatch,transition,requestCancel,verifyBatch,writeRequest,saveJob,NEXT,TERMINAL} from '../scripts/batch-lib.mjs';
import {acquireRenderLock,lockPath,pidAlive,holderAlive} from '../scripts/render-lock.mjs';
import {killTree} from '../scripts/process-tree.mjs';
import {createStudio} from '../scripts/studio-server.mjs';
const repo=fileURLToPath(new URL('..',import.meta.url));
const fake=fileURLToPath(new URL('./fixtures/fake-produce.mjs',import.meta.url));
const runnerScript=fileURLToPath(new URL('./fixtures/batch-runner.mjs',import.meta.url));
const posix=process.platform!=='win32';
const execute=({root,args,env})=>spawn(process.execPath,[fake,...args],{windowsHide:true,cwd:root,env,stdio:['ignore','pipe','pipe'],detached:posix});
const env={...process.env};delete env.AETHER_RENDER_LOCK;delete env.AETHER_RENDER_LOCK_TOKEN;delete env.FAKE_HANG_DONE;
const REQ={version:1,id:'x',topic:'How a lighthouse guides ships',seconds:30,profile:'polished'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function sandbox(){const root=mkdtempSync(join(tmpdir(),'batch-'));mkdirSync(join(root,'out'));mkdirSync(join(root,'inputs'));writeFileSync(join(root,'inputs','req.json'),JSON.stringify(REQ));return root;}
const job=(id,extra={})=>({id,request:'inputs/req.json',backend:'cpu',format:'vertical-v1',...extra});
const def=(id,jobs,extra={})=>({version:1,id,outputRoot:'out/batches',jobs,...extra});
const quiet={pollMs:50,log:()=>{}};
const states=j=>j.history.map(h=>h.to);
const deadPid=()=>spawnSync(process.execPath,['-e','0'],{windowsHide:true}).pid;
async function waitFor(fn,ms=20000){const end=Date.now()+ms;for(;;){const v=fn();if(v)return v;if(Date.now()>end)throw Error('timed out');await sleep(50);}}
const gpOf=(root,dir,id)=>{try{const a=loadBatch(dir).jobs.get(id).attempts.at(-1);if(!a)return null;const f=join(root,'out',a.folders.production,'grandchild.pid');return existsSync(f)?Number(readFileSync(f,'utf8')):null;}catch{return null;}};

test('batch validation refuses unsafe, ambiguous or contradictory definitions with explicit messages',()=>{
 const root=sandbox();
 writeFileSync(join(root,'inputs','wide.json'),JSON.stringify({...REQ,format:'landscape-v1'}));
 writeFileSync(join(root,'inputs','big.json'),' '.repeat(1024*1024+1));
 const bad=[
  [{...def('a',[job('j')]),extra:1},/unknown field "extra"/],
  [{...def('a',[job('j')]),version:2},/version must be 1/],
  [def('Bad_Id',[job('j')]),/Batch id must be a lowercase slug/],
  [def('con',[job('j')]),/Batch id must be a lowercase slug/],
  [def('a',[job('j')],{outputRoot:'studio-data'}),/outputRoot must be a folder inside out\//],
  [def('a',[job('j')],{outputRoot:'out'}),/outputRoot must be a folder inside out\//],
  [def('a',[job('j')],{outputRoot:'out/../x'}),/outputRoot must be a folder inside out\//],
  [def('a',[job('j')],{retries:4}),/retries must be an integer from 0 to 3/],
  [def('a',[job('j')],{minFreeGB:0}),/minFreeGB/],
  [def('a',[]),/1 to 50 jobs/],
  [def('a',Array.from({length:51},(_,i)=>job('j'+i))),/1 to 50 jobs/],
  [def('a',[job('j'),job('j')]),/duplicate job id "j"/],
  [def('a',[job('a-very-long-job-id-over-20')]),/id must be a lowercase slug/],
  [def('a',[{...job('j'),project:'inputs/req.json'}]),/exactly one of "request" or "project"/],
  [def('a',[{id:'j',backend:'cpu',format:'vertical-v1'}]),/exactly one of "request" or "project"/],
  [def('a',[job('j',{backend:'gpu'})]),/backend must be cpu, three or both/],
  [def('a',[{...job('j'),format:undefined}]),/missing field "format"|format must be one of/],
  [def('a',[job('j',{format:'portrait'})]),/format must be one of vertical-v1, landscape-v1, square-v1/],
  [def('a',[job('j',{concurrency:0})]),/concurrency must be an integer from 1 to 16/],
  [def('a',[job('j',{request:'../outside.json'})]),/path segment not allowed|repository-relative/],
  [def('a',[job('j',{request:'/etc/passwd.json'})]),/repository-relative/],
  [def('a',[job('j',{request:'C:/x.json'})]),/repository-relative/],
  [def('a',[job('j',{request:'inputs\\req.json'})]),/repository-relative/],
  [def('a',[job('j',{request:'inputs/missing.json'})]),/file not found/],
  [def('a',[job('j',{request:'inputs/big.json'})]),/larger than 1 MB/],
  [def('a',[job('j',{request:'node_modules/x.json'})]),/path segment not allowed/],
  [def('a',[job('j',{request:'inputs/wide.json'})]),/asks for format landscape-v1 but the job says vertical-v1/],
 ];
 for(const [d,re] of bad)assert.throws(()=>validateBatch(d,{root}),re,JSON.stringify(d).slice(0,120));
 writeFileSync(join(root,'inputs','broken.json'),JSON.stringify({version:1,id:'x',topic:'t'}));
 assert.throws(()=>validateBatch(def('a',[job('j',{request:'inputs/broken.json'})]),{root}),/Job 1 \("j"\)/);
 writeFileSync(join(root,'inputs','proto.json'),'{"version":1,"id":"x","topic":"t","seconds":30,"__proto__":{}}');
 assert.throws(()=>validateBatch(def('a',[job('j',{request:'inputs/proto.json'})]),{root}));
 // An authored project's own format must agree with the job (projects cannot be re-formatted by a batch).
 const project=JSON.parse(readFileSync(join(repo,'examples','studio-cpu-polished.json'),'utf8'));
 writeFileSync(join(root,'inputs','project.json'),JSON.stringify(project));
 assert.throws(()=>validateBatch(def('a',[{id:'p',project:'inputs/project.json',backend:'cpu',format:'square-v1'}]),{root}),/the project is vertical-v1 but the job says square-v1/);
 assert.equal(validateBatch(def('a',[{id:'p',project:'inputs/project.json',backend:'both',format:'vertical-v1'}]),{root}).jobs[0].outputSuffixes.length,2);
 writeFileSync(join(root,'inputs','wide.json'),JSON.stringify({...REQ,format:'landscape-v1',content:'explainer-v1'}));
 const ok=validateBatch(def('a',[job('j',{backend:'both'}),job('k',{request:'inputs/wide.json',format:'landscape-v1'})],{retries:2}),{root});
 assert.deepEqual(ok.jobs.map(j=>[j.outputSuffixes,j.retries]),[[['cpu-polished','three-polished'],2],[['cpu-polished'],2]]);
});

test('create snapshots inputs immutably, writes job manifests before batch.json and refuses an existing batch',()=>{
 const root=sandbox();const {dir,batch}=createBatch(def('snap',[job('ok-a'),job('ok-b',{backend:'three'})]),{root});
 assert.equal(dir,join(root,'out','batches','snap'));
 for(const d of ['inputs','jobs','logs','films','attempts','requests'])assert.ok(statSync(join(dir,d)).isDirectory());
 assert.equal(readFileSync(join(dir,'inputs','ok-a.json'),'utf8'),JSON.stringify(REQ));
 writeFileSync(join(root,'inputs','req.json'),JSON.stringify({...REQ,topic:'changed later'}));
 assert.equal(readFileSync(join(dir,'inputs','ok-b.json'),'utf8'),JSON.stringify(REQ),'the snapshot does not follow the source file');
 const {jobs}=loadBatch(dir);assert.deepEqual([...jobs.values()].map(j=>j.state),['queued','queued']);assert.equal(batch.status,'created');
 assert.throws(()=>createBatch(def('snap',[job('ok-a')]),{root}),/Batch already exists/);
 // A folder without batch.json (creation interrupted) is not a batch.
 mkdirSync(join(root,'out','batches','half'));assert.throws(()=>loadBatch(join(root,'out','batches','half')),/no batch.json/);
});

test('job state machine: only listed transitions, append-only history, terminal states immutable',()=>{
 const root=sandbox();const {dir}=createBatch(def('states',[job('ok-a')]),{root});const j=loadBatch(dir).jobs.get('ok-a');
 assert.throws(()=>transition(dir,j,'succeeded'),/Illegal job transition queued -> succeeded/);
 for(const s of ['preparing','rendering','verifying','placing','succeeded'])transition(dir,j,s);
 for(const s of Object.keys(NEXT))assert.throws(()=>transition(dir,j,s),/Illegal/);
 assert.deepEqual(states(loadBatch(dir).jobs.get('ok-a')),['queued','preparing','rendering','verifying','placing','succeeded']);
 for(const t of TERMINAL)assert.deepEqual(NEXT[t],[]);
});

test('mixed batch: success, bounded retries, flaky recovery, failed verification; outputs placed, failures kept; idempotent re-run',async()=>{
 const root=sandbox();
 const {dir}=createBatch(def('mixed',[job('ok-pair',{backend:'both'}),job('fail-a',{retries:1}),job('flaky-a',{retries:1}),job('liar-a'),job('ok-cpu',{concurrency:3})]),{root});
 let calls=0;const counted=x=>{calls++;return execute(x);};
 const r=await runBatch(dir,{root,env,execute:counted,...quiet});
 assert.equal(r.status,'finished');assert.equal(r.exitCode,1);assert.equal(calls,7);// 1 + 2 (fail, retried once) + 2 (flaky) + 1 + 1
 assert.deepEqual({s:r.summary.succeeded,f:r.summary.failed},{s:3,f:2});
 const {batch,jobs}=loadBatch(dir);
 const pair=jobs.get('ok-pair');assert.equal(pair.state,'succeeded');assert.equal(pair.outputs.films.length,2);
 const seq=states(pair);assert.deepEqual(seq.filter(s=>s!=='rendering'),['queued','preparing','verifying','placing','succeeded']);
 assert.deepEqual(readdirSync(join(dir,'films','ok-pair')).sort(),[pair.attempts[0].id+'-cpu-polished',pair.attempts[0].id+'-prepared',pair.attempts[0].id+'-production',pair.attempts[0].id+'-three-polished'].sort());
 const fail=jobs.get('fail-a');assert.equal(fail.state,'failed');assert.equal(fail.attempts.length,2);assert.equal(fail.failures,2);assert.match(fail.error,/intentional failure/);
 for(const a of fail.attempts){assert.equal(a.outcome,'failed');assert.equal(a.location,'attempts');assert.ok(existsSync(join(dir,'attempts',a.id,a.folders.production,'production.json')));assert.ok(existsSync(join(dir,a.log)));}
 const flaky=jobs.get('flaky-a');assert.equal(flaky.state,'succeeded');assert.deepEqual(flaky.attempts.map(a=>a.outcome),['failed','succeeded']);
 assert.notEqual(flaky.attempts[0].id,flaky.attempts[1].id,'every attempt has its own production ID');
 const liar=jobs.get('liar-a');assert.equal(liar.state,'failed');assert.equal(liar.attempts.length,1);assert.match(liar.error,/verification failed: film SHA-256/);
 assert.equal(jobs.get('ok-cpu').attempts[0].concurrency,3);
 assert.deepEqual(readdirSync(join(root,'out')),['batches'],'no attempt folder left in out/, lock released');
 assert.equal(batch.status,'finished');assert.equal(batch.summary.succeeded,3);assert.equal(batch.runs.length,1);
 assert.deepEqual(verifyBatch(dir).map(x=>x.ok),[true,null,true,null,true]);
 // Re-running a finished batch renders nothing and touches no output.
 const film=join(dir,'films','ok-cpu',jobs.get('ok-cpu').attempts[0].id+'-cpu-polished','film.mp4'),before=statSync(film).mtimeMs;
 calls=0;const again=await runBatch(dir,{root,env,execute:counted,...quiet});
 assert.equal(calls,0);assert.equal(again.exitCode,1);assert.equal(statSync(film).mtimeMs,before);
 // verify detects a changed film and never renders.
 writeFileSync(film,'tampered');const v=verifyBatch(dir).find(x=>x.job==='ok-cpu');assert.equal(v.ok,false);assert.match(v.error,/film SHA-256/);
});

test('cancel ends the running job\'s whole process tree (verified), records it and the batch continues',async()=>{
 const root=sandbox();const {dir}=createBatch(def('cancel',[job('hang-a'),job('ok-after')]),{root});
 const run=runBatch(dir,{root,env,execute,...quiet});
 const gp=await waitFor(()=>gpOf(root,dir,'hang-a'));assert.ok(pidAlive(gp));
 const c=requestCancel(dir,{root,action:'cancel',job:'hang-a',env});assert.equal(c.applied,false);assert.match(c.message,/Request left for the running process/);
 const r=await run;
 assert.equal(pidAlive(gp),false,'the grandchild is gone too');
 const {jobs,batch}=loadBatch(dir),h=jobs.get('hang-a');
 assert.equal(h.state,'cancelled');assert.equal(h.attempts[0].outcome,'cancelled');assert.ok(h.attempts[0].killed>=2);assert.equal(h.attempts[0].location,'attempts');
 assert.equal(jobs.get('ok-after').state,'succeeded');assert.equal(r.exitCode,1);assert.equal(batch.status,'finished');
 assert.equal(batch.requests.length,1);assert.equal(batch.requests[0].job,'hang-a');
});

test('stop ends the running tree, keeps the job queued (resumable); resume finishes the batch',async()=>{
 const root=sandbox();const {dir}=createBatch(def('stop',[job('hang-b'),job('ok-b')]),{root});
 const run=runBatch(dir,{root,env,execute,...quiet});
 const gp=await waitFor(()=>gpOf(root,dir,'hang-b'));
 requestCancel(dir,{root,action:'stop',env});
 const r=await run;assert.equal(r.status,'stopped');assert.equal(r.exitCode,2);assert.equal(pidAlive(gp),false);
 let {jobs}=loadBatch(dir);assert.equal(jobs.get('hang-b').state,'queued');assert.equal(jobs.get('hang-b').attempts[0].outcome,'stopped');assert.equal(jobs.get('ok-b').attempts.length,0);
 // A stop request left while no runner is active does not stop the next run.
 assert.match(requestCancel(dir,{root,action:'stop',env}).message,/nothing to stop/);
 writeRequest(dir,{action:'stop'});await sleep(20);
 const again=await runBatch(dir,{root,env:{...env,FAKE_HANG_DONE:'1'},execute,...quiet});
 assert.equal(again.exitCode,0);({jobs}=loadBatch(dir));
 assert.deepEqual(jobs.get('hang-b').attempts.map(a=>a.outcome),['stopped','succeeded']);assert.equal(jobs.get('ok-b').state,'succeeded');
});

test('restart recovery: the runner dies mid-job; the next run ends the orphaned production, marks the attempt interrupted and re-runs it',async()=>{
 const root=sandbox();const {dir}=createBatch(def('crash',[job('hang-c'),job('ok-c')]),{root});
 const runner=spawn(process.execPath,[runnerScript,root,dir],{windowsHide:true,stdio:'ignore',env});
 const gp=await waitFor(()=>gpOf(root,dir,'hang-c'));
 const orphan=loadBatch(dir).jobs.get('hang-c').attempts[0].pid;assert.ok(pidAlive(orphan));
 process.kill(runner.pid,'SIGKILL');await waitFor(()=>!pidAlive(runner.pid));
 assert.ok(pidAlive(orphan),'only the runner died: its production is orphaned and still running');
 assert.ok(existsSync(lockPath(root,env)),'the dead runner left its lock behind');
 assert.ok(['preparing','rendering'].includes(loadBatch(dir).jobs.get('hang-c').state));
 const r=await runBatch(dir,{root,env:{...env,FAKE_HANG_DONE:'1'},execute,...quiet});
 assert.equal(pidAlive(orphan),false);assert.equal(pidAlive(gp),false);
 assert.equal(r.exitCode,0);
 const {jobs,batch}=loadBatch(dir),h=jobs.get('hang-c');
 assert.deepEqual(h.attempts.map(a=>a.outcome),['interrupted','succeeded']);assert.equal(h.interruptions,1);assert.ok(h.attempts[0].orphanKilled>=2,JSON.stringify(h.attempts[0]));
 assert.equal(h.attempts[0].location,'attempts');assert.ok(existsSync(join(dir,'attempts',h.attempts[0].id,h.attempts[0].folders.production)));
 assert.ok(h.history.some(x=>/interrupted/.test(x.note??'')));
 assert.equal(batch.runs.length,2);assert.equal(batch.runs[0].endedAt,null);assert.equal(jobs.get('ok-c').state,'succeeded');
});

function inFlight(root,dir,id,{finished}){
 const {jobs}=loadBatch(dir),j=jobs.get(id),aid=id+'-a1-abcd';
 const a={n:1,id:aid,folders:{production:aid+'-production',prepared:aid+'-prepared',outputs:[aid+'-cpu-polished']},startedAt:new Date().toISOString(),endedAt:null,outcome:'running',log:'logs/'+aid+'.log',concurrency:2,gl:null,location:'out'};
 j.attempts.push(a);transition(dir,j,'preparing');transition(dir,j,'rendering');
 if(finished)assert.equal(spawnSync(process.execPath,[fake,'--request',join(root,'inputs','req.json'),'--backend','cpu','--id',aid,'--format','vertical-v1'],{windowsHide:true,cwd:root,env}).status,0);
 return {j,a};
}
test('restart recovery never re-renders: a finished production is verified and kept; an interrupted placement is completed',async()=>{
 const root=sandbox();const {dir}=createBatch(def('salvage',[job('ok-s'),job('ok-p')]),{root});
 inFlight(root,dir,'ok-s',{finished:true});
 const {j:p,a:pa}=inFlight(root,dir,'ok-p',{finished:true});
 transition(dir,p,'verifying');transition(dir,p,'placing');
 mkdirSync(join(dir,'films','ok-p'),{recursive:true});renameSync(join(root,'out',pa.folders.production),join(dir,'films','ok-p',pa.folders.production));
 let calls=0;const r=await runBatch(dir,{root,env,execute:x=>{calls++;return execute(x);},...quiet});
 assert.equal(calls,0,'nothing was rendered again');assert.equal(r.exitCode,0);
 const {jobs}=loadBatch(dir);
 assert.equal(jobs.get('ok-s').state,'succeeded');assert.ok(jobs.get('ok-s').history.some(h=>/no re-render/.test(h.note??'')));
 assert.equal(jobs.get('ok-p').state,'succeeded');assert.ok(jobs.get('ok-p').history.some(h=>/placement completed/.test(h.note??'')));
 assert.deepEqual(verifyBatch(dir).map(x=>x.ok),[true,true]);
 // An unfinished production left behind (no live process) becomes an interrupted attempt; interruptions are bounded.
 const root2=sandbox();const b2=createBatch(def('bounded',[job('ok-i')]),{root:root2});
 const {j}=inFlight(root2,b2.dir,'ok-i',{finished:false});j.interruptions=3;saveJob(b2.dir,j);
 const r2=await runBatch(b2.dir,{root:root2,env,execute,...quiet});
 assert.equal(r2.exitCode,1);const ji=loadBatch(b2.dir).jobs.get('ok-i');assert.equal(ji.state,'failed');assert.match(ji.error,/interrupted 4 times/);
});

test('bounded resources: low disk stops before a job; logs are capped; a changed input snapshot is refused; queued cancels apply at once',async()=>{
 const root=sandbox();const {dir}=createBatch(def('bounds',[job('noisy-a'),job('ok-z'),job('ok-y')],{minFreeGB:5}),{root});
 const low=await runBatch(dir,{root,env,execute,diskFree:()=>4*1024**3,...quiet});
 assert.equal(low.status,'stopped');assert.equal(low.exitCode,2);assert.match(low.reason,/low disk space: 4.0 GB free/);
 assert.equal(loadBatch(dir).jobs.get('noisy-a').attempts.length,0);
 assert.match(requestCancel(dir,{root,action:'cancel',job:'ok-y',env}).message,/Cancelled: ok-y/);
 writeFileSync(join(dir,'inputs','ok-z.json'),JSON.stringify({...REQ,topic:'edited inside the batch'}));
 const r=await runBatch(dir,{root,env,execute,logBytes:20000,...quiet});
 const {jobs}=loadBatch(dir),n=jobs.get('noisy-a');
 assert.equal(n.state,'succeeded');assert.equal(n.attempts[0].logTruncated,true);
 const size=statSync(join(dir,n.attempts[0].log)).size;assert.ok(size<=20000+80,'log bounded: '+size);
 assert.match(readFileSync(join(dir,n.attempts[0].log),'utf8'),/\[log truncated at 20000 bytes\]/);
 assert.equal(jobs.get('ok-z').state,'failed');assert.match(jobs.get('ok-z').error,/input snapshot changed/);assert.equal(jobs.get('ok-z').attempts.length,0);
 assert.equal(jobs.get('ok-y').state,'cancelled');assert.equal(r.exitCode,1);
 assert.throws(()=>requestCancel(dir,{root,action:'cancel',job:'nope',env}),/Unknown job/);
});

test('render lock: exclusive, names its holder, inherited by token, stale and reused-PID locks taken over, races have one winner',async()=>{
 const root=sandbox(),p=lockPath(root,env);
 assert.throws(()=>lockPath(root,{AETHER_RENDER_LOCK:'relative/lock'}),/absolute path/);
 const a=acquireRenderLock(root,{holder:'test holder',env});
 assert.throws(()=>acquireRenderLock(root,{holder:'second',env}),e=>e.code==='ELOCKED'&&/Another render is running on this machine: test holder \(PID \d+/.test(e.message));
 const child=acquireRenderLock(root,{holder:'child',env:{...env,AETHER_RENDER_LOCK_TOKEN:a.token}});assert.equal(child.inherited,true);child.release();assert.ok(existsSync(p),'an inherited release keeps the lock');
 assert.throws(()=>acquireRenderLock(root,{holder:'forged',env:{...env,AETHER_RENDER_LOCK_TOKEN:'0'.repeat(32)}}),/Another render is running/);
 a.release();assert.equal(existsSync(p),false);
 // Stale: the holder's PID is gone.
 writeFileSync(p,JSON.stringify({version:1,token:'t'.repeat(32),pid:deadPid(),holder:'dead batch',startedAt:new Date().toISOString()}));
 const b=acquireRenderLock(root,{holder:'after crash',env});assert.equal(JSON.parse(readFileSync(p,'utf8')).holder,'after crash');b.release();
 // Reused PID: alive, but the process started after the lock was taken.
 const sleeper=spawn(process.execPath,['-e','setTimeout(()=>{},60000)'],{windowsHide:true,stdio:'ignore'});
 try{await sleep(300);
  const rec={version:1,token:'r'.repeat(32),pid:sleeper.pid,holder:'old',startedAt:'2000-01-01T00:00:00.000Z'};
  assert.equal(holderAlive(rec),false);assert.equal(holderAlive({...rec,startedAt:new Date(Date.now()+60000).toISOString()}),true);
  writeFileSync(p,JSON.stringify(rec));const c=acquireRenderLock(root,{holder:'reuse',env});c.release();
 }finally{sleeper.kill();}
 // A corrupt lock is respected while fresh (a holder may be writing it) and taken over once old.
 writeFileSync(p,'');assert.throws(()=>acquireRenderLock(root,{holder:'x',env}),/unreadable lock record/);
 const old=new Date(Date.now()-60000);utimesSync(p,old,old);const d=acquireRenderLock(root,{holder:'after corrupt',env});d.release();
 // Race: several processes at once; exactly one holds the lock.
 const code='import {acquireRenderLock} from '+JSON.stringify(pathToFileURL(join(repo,'scripts','render-lock.mjs')).href)+';try{const l=acquireRenderLock(process.argv[1],{holder:"race"});console.log("won");setTimeout(()=>l.release(),2500);}catch(e){console.log(e.code==="ELOCKED"?"lost":"error "+e.message);}';
 const racers=Array.from({length:6},()=>new Promise(ok=>{const c=spawn(process.execPath,['--input-type=module','-e',code,root],{env,windowsHide:true});let s='';c.stdout.on('data',b=>s+=b);c.on('close',()=>ok(s.trim()));}));
 const results=await Promise.all(racers);
 assert.equal(results.filter(x=>x==='won').length,1,JSON.stringify(results));assert.equal(results.filter(x=>x==='lost').length,5,JSON.stringify(results));
});

test('a held render lock refuses the batch runner, produce.mjs, cli.mjs prepare and a Studio job, naming the holder',async()=>{
 const root=sandbox(),lockFile=join(root,'out','.render.lock'),held=acquireRenderLock(root,{holder:'owner test render',env});
 try{
  const {dir}=createBatch(def('locked',[job('ok-a')]),{root});
  await assert.rejects(runBatch(dir,{root,env,execute,...quiet}),/Another render is running on this machine: owner test render/);
  assert.equal(loadBatch(dir).jobs.get('ok-a').attempts.length,0);
  const lockEnv={...env,AETHER_RENDER_LOCK:lockFile};
  const prod=spawnSync(process.execPath,['scripts/produce.mjs','--request','examples/dual07-narrator.request.json','--backend','cpu','--id','dual08-lockprobe'],{windowsHide:true,cwd:repo,env:lockEnv,encoding:'utf8',timeout:60000});
  assert.notEqual(prod.status,0);assert.match(prod.stderr,/Another render is running on this machine: owner test render/);
  assert.equal(existsSync(join(repo,'out','dual08-lockprobe-production')),false,'nothing reserved');
  const cli=spawnSync(process.execPath,['scripts/cli.mjs','prepare','examples/robot-treasure.json'],{windowsHide:true,cwd:repo,env:lockEnv,encoding:'utf8',timeout:60000});
  assert.notEqual(cli.status,0);assert.match(cli.stderr,/Another render is running/);
  const project=JSON.parse(readFileSync(join(repo,'examples','studio-cpu-polished.json'),'utf8'));let token=null;
  const s=await createStudio({root,dataDir:join(root,'data'),runner:async({lockToken})=>{token=lockToken;throw Error('no render in tests');}}),origin=await s.listen(0);
  const req=(path,method='GET',data)=>fetch(origin+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json','X-Aether-Studio':'1'},...(data===undefined?{}:{body:JSON.stringify(data)})});
  try{
   const saved=await (await req('/api/projects/'+project.id,'PUT',{project,revision:null})).json();
   const refused=await req('/api/jobs','POST',{id:project.id,revision:saved.revision,mode:'render',quality:false,repair:false});
   assert.equal(refused.status,409);assert.match((await refused.json()).error,/Another render is running on this machine: owner test render/);
   held.release();
   const started=await req('/api/jobs','POST',{id:project.id,revision:saved.revision,mode:'render',quality:false,repair:false});assert.equal(started.status,202);
   const j=await started.json();let last;for(let i=0;i<200;i++){last=await (await req('/api/jobs/'+j.id)).json();if(last.finishedAt)break;await sleep(10);}
   assert.equal(last.status,'failed');assert.match(token,/^[a-f0-9]{32}$/,'the runner received the job\'s lock token');
   assert.equal(existsSync(lockFile),false,'the Studio released the lock after the job');
  }finally{await s.close();}
 }finally{held.release();}
});

test('killTree ends a process and its descendants and reports them gone',async()=>{
 const code='const {spawn}=require("node:child_process");const g=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{windowsHide:true,stdio:"ignore"});console.log(g.pid);setInterval(()=>{},1000);';
 const parent=spawn(process.execPath,['-e',code],{windowsHide:true,stdio:['ignore','pipe','ignore'],detached:posix});
 const gp=await new Promise(ok=>parent.stdout.once('data',b=>ok(Number(String(b).trim()))));
 assert.ok(pidAlive(parent.pid));assert.ok(pidAlive(gp));
 const k=await killTree(parent.pid);
 assert.equal(k.gone,true);assert.equal(pidAlive(parent.pid),false);assert.equal(pidAlive(gp),false);
 await assert.rejects(killTree(0),/invalid PID/);
});
