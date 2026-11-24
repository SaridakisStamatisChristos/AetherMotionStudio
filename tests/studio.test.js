import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStudio} from '../scripts/studio-server.mjs';
import {editProject,applyShotEdit,reorderShot,setBackend,setProfile,addAsset,removeAsset,plannedTimeline} from '../src/studio/model.js';
const fixture=JSON.parse(await readFile(new URL('../examples/studio-cpu-polished.json',import.meta.url),'utf8'));
test('transactional editor and estimated timeline preserve global budget and original',()=>{
 const p=applyShotEdit(fixture,1,{heading:'A revised heading',durationFrames:270});
 assert.equal(p.shots[1].durationFrames,270);assert.equal(p.speech.fixedShots['shot-2'],270);assert.equal(plannedTimeline(p).durationFrames,1500);assert.equal(fixture.shots[1].durationFrames,null);
 assert.equal(setBackend(p,'three').shots[0].backend,'three');assert.ok(!setProfile(p,'original').shots[0].fidelity);
 assert.equal(addAsset(p,0,'fern').shots[0].assets.length,p.shots[0].assets.length+1);
 assert.throws(()=>removeAsset(p,0,p.shots[0].assets[0].id)); // effect reference
 assert.throws(()=>applyShotEdit(p,0,{durationFrames:3600}));
 assert.equal(reorderShot(p,2,0).shots[0].transitionFrames,0);assert.throws(()=>editProject(p,x=>x.id='../bad'));
});
test('loopback API, persistence, optimistic revisions, explicit job errors and output isolation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'studio-test-'));let release;let calls=0;
 const runner=async({job,snapshot,log})=>{calls++;const p=JSON.parse(await readFile(snapshot,'utf8'));assert.equal(p.id,job.id);log('Compiled mock fixture\n');await new Promise(ok=>release=ok);throw Error('intentional runner failure');};
 const s=await createStudio({root:dir,dataDir:join(dir,'data'),runner}),origin=await s.listen(0);
 async function req(path,method='GET',data,headers={}){return fetch(origin+path,{method,headers:{...(method==='GET'?{}:{'Content-Type':'application/json','X-Aether-Studio':'1'}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});}
 try{
  const first=await req('/api/projects/'+fixture.id,'PUT',{project:fixture,revision:null});assert.equal(first.status,200);const a=await first.json();
  assert.equal((await req('/api/projects/'+fixture.id,'PUT',{project:fixture,revision:null})).status,409);
  const p=structuredClone(fixture);p.title='Saved edit';const b=await (await req('/api/projects/'+p.id,'PUT',{project:p,revision:a.revision})).json();assert.notEqual(b.revision,a.revision);
  assert.equal((await (await req('/api/projects/'+p.id)).json()).project.title,'Saved edit');
  assert.equal((await req('/api/projects/'+p.id,'PUT',{project:p,revision:a.revision})).status,409);
  assert.equal((await req('/api/projects/'+p.id,'PUT',{project:p,revision:b.revision},{Origin:'https://example.org'})).status,403);
  assert.equal((await req('/api/projects/'+p.id,'PUT',{project:p,revision:b.revision},{'X-Aether-Studio':'0'})).status,403);
  assert.equal((await req('/.env')).status,404);
  assert.equal((await req('/api/jobs','POST',{id:p.id,revision:a.revision,mode:'render',quality:false,repair:false})).status,409);
  const data={id:p.id,revision:b.revision,mode:'render',quality:true,repair:false};
  const [x,y]=await Promise.all([req('/api/jobs','POST',data),req('/api/jobs','POST',data)]);
  assert.deepEqual([x.status,y.status].sort(),[202,409]);const j=await (x.status===202?x:y).json();
  while(!release)await new Promise(ok=>setTimeout(ok,5));
  assert.equal(calls,1);assert.equal((await req('/api/jobs/'+j.id+'/files/film.mp4')).status,404);
  release();let last;for(let i=0;i<100;i++){last=await (await req('/api/jobs/'+j.id)).json();if(last.finishedAt)break;await new Promise(ok=>setTimeout(ok,10));}
  assert.equal(last.status,'failed');assert.match(last.error,/intentional/);assert.equal((await req('/api/jobs/'+j.id+'/files/film.mp4')).status,404);
  assert.equal((await req('/api/projects')).status,200);
 }finally{if(release)release();await s.close();await rm(dir,{recursive:true,force:true});}
});
