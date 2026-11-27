// Test helper: run a batch in its own process with the fake production (so a test can kill the runner mid-job).
// Usage: node batch-runner.mjs <root> <batch dir>
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runBatch} from '../../scripts/batch-lib.mjs';
const [root,dir]=process.argv.slice(2),fake=fileURLToPath(new URL('./fake-produce.mjs',import.meta.url));
// Detached on every platform: on Windows a non-detached child sits in libuv's kill-on-close job object and dies with
// the runner; detached, it outlives the runner, which is the orphan case restart recovery must end.
const execute=({root,args,env})=>spawn(process.execPath,[fake,...args],{cwd:root,env,stdio:['ignore','pipe','pipe'],detached:true,windowsHide:true});
const r=await runBatch(dir,{root,execute,pollMs:100,log:()=>{}});
process.exitCode=r.exitCode;
