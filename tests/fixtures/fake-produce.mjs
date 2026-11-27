// Test double for scripts/produce.mjs (DUAL-08 batch tests): same arguments, same output layout and manifests, no
// rendering. Its behaviour follows the job id at the start of --id (<job>-a<n>-<hex>):
//   ok*     succeed            fail*   fail (production.json status failed, exit 1)
//   flaky*  fail on attempt 1, then succeed
//   hang*   start a grandchild and wait forever (unless FAKE_HANG_DONE=1, then succeed)
//   liar*   exit 0 but record a film hash that does not match the film
//   noisy*  print about 300 KB of log, then succeed
//   chatty* keep printing a line every 20 ms and never finish
//   long*   succeed with quality reports larger than the 256 KB request JSON limit (DUAL-09)
// It takes the render lock exactly like produce.mjs (inherited from the batch runner through the token).
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {holdRenderLock} from '../../scripts/render-lock.mjs';
const args=process.argv.slice(2),opt=k=>{const i=args.indexOf('--'+k);return i<0?undefined:args[i+1];};
const id=opt('id'),backend=opt('backend'),input=opt('request')??opt('project');
const root=process.cwd(),out=join(root,'out'),env={...process.env};
holdRenderLock(root,'fake produce '+id,env);
const job=id.replace(/-a\d+-[a-f0-9]{4}$/,''),n=Number(/-a(\d+)-[a-f0-9]{4}$/.exec(id)[1]);
const profile=JSON.parse(readFileSync(input,'utf8')).profile??'polished';
const backends=backend==='both'?['cpu','three']:[backend],outputIds=backends.map(b=>id+'-'+b+'-'+profile);
const prod=join(out,id+'-production'),prep=join(out,id+'-prepared');
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2));
mkdirSync(prod);mkdirSync(prep);for(const o of outputIds)mkdirSync(join(out,o));
const manifest={version:1,status:'preparing',id,outputIds,results:[],sourceCommit:'fake',sourceDirty:false,targetFrames:900};
write(join(prod,'production.json'),manifest);write(join(prep,'timeline.json'),{fake:true});
const fail=msg=>{manifest.status='failed';manifest.error=msg;write(join(prod,'production.json'),manifest);console.error('fake production failed: '+msg);process.exit(1);};
manifest.status='rendering';write(join(prod,'production.json'),manifest);
if(job.startsWith('fail'))fail('intentional failure');
if(job.startsWith('flaky')&&n===1)fail('flaky first attempt');
if(job.startsWith('chatty')){setInterval(()=>console.log('Rendered 1/900 still working'),20);}
else if(job.startsWith('hang')&&process.env.FAKE_HANG_DONE!=='1'){
 const g=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'});
 writeFileSync(join(prod,'grandchild.pid'),String(g.pid));console.log('Rendered 1/900');setInterval(()=>{},1000);
}else{
 if(job.startsWith('noisy'))for(let i=0;i<3000;i++)console.log('Rendered '+i+'/900 '+'x'.repeat(90));
 for(const [i,o] of outputIds.entries()){
  const film=Buffer.from('fake film '+o);writeFileSync(join(out,o,'film.mp4'),film);write(join(out,o,'probe.json'),{frames:900});
  // long*: a quality report the size of a real ~4-minute film's (DUAL-09 found 504 KB), above the 256 KB request limit
  write(join(out,o,'quality-report.json'),{errors:0,warnings:0,status:'pass',...(job.startsWith('long')?{frames:Array.from({length:5000},(_,k)=>({frame:k,checks:['contrast','safe-area','captions'],note:'x'.repeat(60)}))}:{})});
  manifest.results.push({id:o,backend:backends[i],status:'succeeded',frames:900,renderSeconds:1,gl:null,qualityStatus:'pass',warnings:0,filmSha256:job.startsWith('liar')?'0'.repeat(64):createHash('sha256').update(film).digest('hex')});
 }
 if(outputIds.length===2)write(join(prod,'comparison.json'),{pass:true});
 manifest.status='succeeded';write(join(prod,'production.json'),manifest);for(const o of outputIds)write(join(out,o,'production.json'),manifest);
 console.log('PASS: one-click production '+id);
}
