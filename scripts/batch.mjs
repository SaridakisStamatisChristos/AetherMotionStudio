// DUAL-08 bounded local batch production (see scripts/batch-lib.mjs and docs/BATCH.md).
//   node scripts/batch.mjs create <batch.json>        validate, snapshot the inputs, print the batch folder
//   node scripts/batch.mjs run <batch folder>         run or resume (one job at a time, under the render lock)
//   node scripts/batch.mjs status <batch folder>
//   node scripts/batch.mjs stop <batch folder>        end the running job's process tree; the job stays queued
//   node scripts/batch.mjs cancel <batch folder> [--job <id>]   cancel one job, or every unfinished job
//   node scripts/batch.mjs verify <batch folder>      re-hash every finished film (never renders)
// Exit codes: 0 all succeeded / ok, 1 finished with failed or cancelled jobs / verification problems,
// 2 stopped (resumable), 3 refused (invalid input, render lock held, unknown batch).
import {readFileSync,realpathSync} from 'node:fs';
import {resolve,dirname,join,sep,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {safeJson} from '../src/director/schema.js';
import {createBatch,runBatch,loadBatch,requestCancel,verifyBatch,safeInputPath,sha256} from './batch-lib.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const usage='Usage: node scripts/batch.mjs create <batch.json> | run|resume|status|stop|verify <batch folder> | cancel <batch folder> [--job <id>]';
// A batch folder argument must be an existing folder inside out/ holding a batch.json.
function batchDir(arg){
 if(typeof arg!=='string')throw Error(usage);
 let p;try{p=realpathSync(resolve(root,arg));}catch{throw Error('Batch folder not found: '+arg);}
 const out=realpathSync(join(root,'out'));if(!p.startsWith(out+sep))throw Error('A batch folder lies inside out/: '+arg);
 return p;
}
function pad(s,n){s=String(s);return s.length>=n?s:s+' '.repeat(n-s.length);}
function status(dir){
 const {batch,jobs}=loadBatch(dir);
 console.log('Batch '+batch.id+' — '+batch.status+' ('+relative(root,dir).split(sep).join('/')+')');
 console.log(pad('job',22)+pad('state',11)+pad('tries',6)+pad('backend',8)+pad('format',13)+'result');
 for(const spec of batch.jobs){const j=jobs.get(spec.id);
  const result=j.state==='succeeded'?j.outputs.films.map(f=>f.backend+' '+f.sha256.slice(0,12)+'…').join(', '):(j.error??(j.attempts.at(-1)?.error??''));
  console.log(pad(j.id,22)+pad(j.state,11)+pad(j.attempts.length,6)+pad(spec.backend,8)+pad(spec.format,13)+String(result).slice(0,140));}
 const last=batch.runs.at(-1);if(last)console.log('Last run: '+last.startedAt+' → '+(last.endedAt??'(did not end cleanly)')+(last.outcome?' — '+last.outcome:''));
}
async function main(argv){
 const [cmd,arg,...rest]=argv;
 if(cmd==='create'){
  if(rest.length)throw Error(usage);
  const rel=String(arg??'').split(sep).join('/'),file=safeInputPath(root,relative(root,resolve(root,rel)).split(sep).join('/'),'batch file'),bytes=readFileSync(file);
  const {dir,batch}=createBatch(safeJson(bytes.toString('utf8')),{root,source:{file:relative(root,file).split(sep).join('/'),sha256:sha256(bytes)}});
  console.log('Created batch '+batch.id+' with '+batch.jobs.length+' job(s): '+relative(root,dir).split(sep).join('/'));
  console.log('Run it with: node scripts/batch.mjs run '+relative(root,dir).split(sep).join('/'));return 0;
 }
 if(cmd==='run'||cmd==='resume'){if(rest.length)throw Error(usage);const r=await runBatch(batchDir(arg),{root,signals:true});return r.exitCode;}
 if(cmd==='status'){if(rest.length)throw Error(usage);status(batchDir(arg));return 0;}
 if(cmd==='stop'||cmd==='cancel'){
  let job;if(rest.length){if(cmd!=='cancel'||rest.length!==2||rest[0]!=='--job')throw Error(usage);job=rest[1];}
  const r=requestCancel(batchDir(arg),{root,action:cmd,job});console.log(r.message);return 0;
 }
 if(cmd==='verify'){if(rest.length)throw Error(usage);const rows=verifyBatch(batchDir(arg));let bad=0;
  for(const r of rows){console.log(pad(r.job,22)+pad(r.state,11)+(r.ok===null?(r.state==='failed'||r.state==='cancelled'?'no film ('+r.state+')':'not finished yet'):r.ok?'ok':'PROBLEM: '+r.error));if(r.ok===false)bad++;}
  return bad?1:0;}
 throw Error(usage);
}
try{process.exitCode=await main(process.argv.slice(2));}
catch(e){console.error('batch: '+String(e.message??e));process.exitCode=3;}
