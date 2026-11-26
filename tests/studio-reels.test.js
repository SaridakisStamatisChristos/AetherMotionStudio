// Owner choice 3: "Make Reels cover" in the Studio finished panel (POST /api/jobs/<id>/reels → scripts/reels-export.mjs
// exportReels), and the plain-words line (src/studio/finished.js reelsSummary).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm,readdir} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStudio} from '../scripts/studio-server.mjs';
import {exportReels} from '../scripts/reels-export.mjs';
import {reelsSummary} from '../src/studio/finished.js';
import {plannedTimeline} from '../src/studio/model.js';
const fixture=JSON.parse(await readFile(new URL('../examples/studio-cpu-polished.json',import.meta.url),'utf8'));
// v1 project for the API test (the server checks a v2 film against its measured timeline; v1 has none)
const robot=JSON.parse(await readFile(new URL('../examples/robot-treasure.json',import.meta.url),'utf8'));
const PROBE={streams:[{codec_type:'video',codec_name:'h264',width:1080,height:1920},{codec_type:'audio',codec_name:'aac'}],format:{duration:'50'}};
// stand-in for ffmpeg: records the frame and writes a small "JPEG"
const fakeExtract=calls=>async(ffmpeg,film,frame,file)=>{calls.push({film,frame});await writeFile(file,Buffer.from([0xff,0xd8,0xff,0xd9]));return {status:0,stderr:''};};
async function filmDir(dir,id,base=fixture){
 const scene={...structuredClone(base),id},out=join(dir,'out',id);await mkdir(out,{recursive:true});
 await writeFile(join(out,'scene.json'),JSON.stringify(scene));await writeFile(join(out,'timeline.json'),JSON.stringify(scene.version===2?plannedTimeline(scene):{durationFrames:360,shots:[]}));
 await writeFile(join(out,'probe.json'),JSON.stringify(PROBE));await writeFile(join(out,'film.mp4'),Buffer.alloc(2000,1));return out;
}

test('reelsSummary: plain words for pass, warnings, failure and junk',()=>{
 const pass=reelsSummary({status:'pass',seconds:65,errors:[],warnings:[],cover:{frame:300,source:'first single'}});
 assert.deepEqual(pass,{ok:true,text:'Ready for Reels · 65.0 s · cover from the first close-up (frame 300)',notes:[]});
 const warned=reelsSummary({status:'pass',seconds:120,errors:[],warnings:[{code:'REELS_LONG',recommended:90},{code:'NOT_REELS_LAYOUT'},{code:'SOMETHING_NEW'}],cover:{frame:2,source:'middle'}});
 assert.equal(warned.notes.length,3);assert.match(warned.notes[0],/longer than 90 s/);assert.match(warned.notes[1],/Instagram Reels layout/);assert.equal(warned.notes[2],'SOMETHING_NEW','an unknown warning is shown, never hidden');
 const fail=reelsSummary({status:'fail',seconds:60,errors:[{code:'NOT_9_16',detail:'1920x1080'}],warnings:[]});
 assert.equal(fail.ok,false);assert.match(fail.text,/^Not ready for Reels: NOT_9_16 \(1920x1080\)/);
 for(const junk of [null,undefined,'pass',{},{status:'maybe'}])assert.deepEqual(reelsSummary(junk),{ok:false,text:'No Reels check yet.',notes:[]});
});

test('exportReels: writes cover and report once; reuse returns them; the CLI mode refuses; the film is untouched',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'reels-'));
 try{
  const out=await filmDir(dir,'film-a'),before=readFileSync(join(out,'film.mp4')),calls=[];
  const a=await exportReels(out,{extract:fakeExtract(calls)});
  assert.equal(a.created,true);assert.equal(a.report.status,'pass');assert.equal(calls.length,1);assert.equal(calls[0].frame,a.report.cover.frame);
  assert.ok(existsSync(join(out,'reels','cover.jpg'))&&existsSync(join(out,'reels','reels-report.json')));
  const b=await exportReels(out,{reuse:true,extract:fakeExtract(calls)});assert.equal(b.created,false);assert.deepEqual(b.report,a.report);assert.equal(calls.length,1,'no second extraction');
  await assert.rejects(exportReels(out,{extract:fakeExtract(calls)}),/refusing to overwrite/);
  assert.deepEqual(readFileSync(join(out,'film.mp4')),before);
  // negative: a failed extraction is an error (never a report without a cover)
  const bad=await filmDir(dir,'film-b');
  await assert.rejects(exportReels(bad,{extract:async()=>({status:1,stderr:'boom'})}),/cover extraction failed: boom/);
  await assert.rejects(exportReels(bad,{reuse:true,extract:fakeExtract(calls)}),/incomplete earlier Reels export/,'a half export is never reused or overwritten');
  // negative: a missing ffmpeg is reported, not hidden
  const none=await filmDir(dir,'film-c');
  await assert.rejects(exportReels(none,{ffmpeg:join(dir,'no-such-ffmpeg.exe')}),/cover extraction failed/);
  await assert.rejects(exportReels(join(dir,'nowhere')),/no finished film/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Studio API: only a finished render of this session; no fields; served under flat names; one export at a time',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'studio-reels-'));await mkdir(join(dir,'public','audio'),{recursive:true});
 let fail=false,gate=null;const calls=[];
 const runner=async({job})=>{if(fail)throw Error('intentional failure');await filmDir(dir,job.id,robot);await writeFile(join(dir,'out',job.id,'quality-report.json'),'{"status":"pass","errors":0,"warnings":0}');await writeFile(join(dir,'public','audio',job.id+'.wav'),'RIFF');};
 const reelsExport=async(out,opt)=>{if(gate)await gate;return exportReels(out,{...opt,extract:fakeExtract(calls)});};
 const s=await createStudio({root:dir,dataDir:join(dir,'data'),runner,reelsExport}),origin=await s.listen(0);
 const req=(path,method='GET',data,headers={})=>fetch(origin+path,{method,headers:{...(method==='GET'?{}:{'Content-Type':'application/json','X-Aether-Studio':'1'}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
 const finish=async id=>{for(let i=0;i<200;i++){const j=await (await req('/api/jobs/'+id)).json();if(j.finishedAt)return j;await new Promise(ok=>setTimeout(ok,10));}throw Error('job did not finish');};
 try{
  const saved=await (await req('/api/projects/'+robot.id,'PUT',{project:robot,revision:null})).json();
  const start=async(mode='render')=>(await (await req('/api/jobs','POST',{id:robot.id,revision:saved.revision,mode,quality:true,repair:false})).json()).id;
  const id=await start(),j=await finish(id);assert.equal(j.status,'succeeded');
  assert.equal((await req('/api/jobs/'+id+'/files/reels-cover.jpg')).status,404,'nothing to serve before the export');
  // negatives: request fields, missing header, cross-origin, unknown job
  assert.equal((await req('/api/jobs/'+id+'/reels','POST',{frame:3})).status,400);
  assert.equal((await req('/api/jobs/'+id+'/reels','POST',{},{'X-Aether-Studio':'0'})).status,403);
  assert.equal((await req('/api/jobs/'+id+'/reels','POST',{},{Origin:'https://example.org'})).status,403);
  assert.equal((await req('/api/jobs/studio-00000000000000000000/reels','POST',{})).status,404);
  assert.equal((await req('/api/jobs/'+id+'/reels')).status,404,'GET is not an export');
  // one export at a time per film
  let open;gate=new Promise(ok=>open=ok);
  const first=req('/api/jobs/'+id+'/reels','POST',{});await new Promise(ok=>setTimeout(ok,30));
  assert.equal((await req('/api/jobs/'+id+'/reels','POST',{})).status,409);open();gate=null;
  const r=await (await first).json();assert.equal(r.created,true);assert.equal(r.report.status,'pass');assert.ok(r.files.includes('reels-cover.jpg')&&r.files.includes('reels-report.json'));
  const again=await (await req('/api/jobs/'+id+'/reels','POST',{})).json();assert.equal(again.created,false);assert.equal(calls.length,1);
  const cover=await req('/api/jobs/'+id+'/files/reels-cover.jpg?download=1');assert.equal(cover.status,200);assert.equal(cover.headers.get('content-type'),'image/jpeg');
  assert.equal(cover.headers.get('content-disposition'),'attachment; filename="'+robot.id+'-reels-cover.jpg"');
  assert.equal((await (await req('/api/jobs/'+id+'/files/reels-report.json')).json()).status,'pass');
  assert.equal((await req('/api/jobs/'+id+'/files/reels')).status,404,'the folder itself is not served');
  // negatives: a prepare job and a failed job have no film to export
  const prep=await start('prepare');await finish(prep);assert.equal((await req('/api/jobs/'+prep+'/reels','POST',{})).status,409);
  fail=true;const failed=await start();assert.equal((await finish(failed)).status,'failed');assert.equal((await req('/api/jobs/'+failed+'/reels','POST',{})).status,409);
  assert.deepEqual(await readdir(join(dir,'out',failed)).catch(()=>[]),[],'no export folder for a failed job');
 }finally{await s.close();await rm(dir,{recursive:true,force:true});}
});

test('the finished panel has the Reels button, cover and download',()=>{
 const html=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../studio/app.js',import.meta.url),'utf8');
 for(const id of ['makeReels','reelsResult','reelsCover','reelsFacts','reelsNotes','downloadCover'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/api\('\/api\/jobs\/'\+id\+'\/reels','POST',\{\}\)/);assert.match(app,/showReels\(j,base\)/);
});
