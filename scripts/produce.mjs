import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,renameSync,statSync} from 'node:fs';
import {resolve,join,dirname,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {direct} from '../src/director/index.js';
import {digest} from '../src/director/catalog.js';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {repairProject} from '../src/quality/preflight.js';
import {matchedProject,normalizedProject} from '../src/studio/production.js';
import {parseProduction} from './production-options.mjs';
import {renderNative,runChecked} from './native-render.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),outRoot=join(root,'out');
const o=parseProduction(process.argv.slice(2)),env={...process.env};
const venv=join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const python=env.PYTHON||(existsSync(venv)?venv:process.platform==='win32'?'python':'python3');env.PYTHON=python;
const read=p=>JSON.parse(readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const capture=(bin,args)=>{const x=spawnSync(bin,args,{cwd:root,env,encoding:'utf8',maxBuffer:8*1024*1024});if(x.error||x.status!==0)throw Error('Dependency command failed: '+bin+' '+args.join(' '));return x.stdout.trim();};
const works=(bin,args)=>spawnSync(bin,args,{cwd:root,env,stdio:'ignore'}).status===0;
if(!env.AETHER_FFMPEG&&!works('ffmpeg',['-version']))env.AETHER_FFMPEG=capture(python,['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())']);
if(!env.AETHER_FFPROBE&&!works('ffprobe',['-version'])){
 if(process.platform!=='linux'||process.arch!=='x64')throw Error('Install FFprobe or set AETHER_FFPROBE');
 const compositor=join(root,'node_modules','@remotion','compositor-linux-x64-gnu');env.AETHER_FFPROBE=join(compositor,'ffprobe');env.LD_LIBRARY_PATH=[compositor,env.LD_LIBRARY_PATH].filter(Boolean).join(delimiter);
}
for(const bin of [env.AETHER_FFMPEG??'ffmpeg',env.AETHER_FFPROBE??'ffprobe'])if(!works(bin,['-version']))throw Error('Media tool unavailable: '+bin);
runChecked(root,python,['scripts/release_setup.py','--verify-models'],env);
const production=join(outRoot,o.id+'-production'),prepareId=o.id+'-prepared',prep=join(outRoot,prepareId);
const outputs=o.ids.map(id=>join(outRoot,id));
mkdirSync(outRoot,{recursive:true});mkdirSync(join(root,'public','audio'),{recursive:true});
for(const p of [production,prep,...outputs])if(existsSync(p))throw Error('Output already exists; choose a new --id: '+p);
// Unique reservation and immutable planned artifacts; no reuse of stale outputs.
mkdirSync(production);for(const p of outputs)mkdirSync(p);
const write=(p,value)=>{const tmp=p+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');renameSync(tmp,p);};
const manifest={version:1,release:'1.0.0',status:'planning',id:o.id,request:o.request,backends:o.backends,outputIds:o.ids,repair:o.repair,provider:'offline-or-imported',targetFrames:o.request.seconds*30,sourceCommit:env.GITHUB_SHA??null,results:[],renderInvocations:0,preparationInvocations:0};
const update=()=>write(join(production,'production.json'),manifest);
update();
try{
 const lock=join(root,'package-lock.json');if(existsSync(lock)){copyFileSync(lock,join(production,'package-lock.json'));manifest.npmLockSha256=sha(lock);}else manifest.npmLockSha256=null;
 copyFileSync(join(root,'requirements-release.txt'),join(production,'requirements-release.txt'));copyFileSync(join(root,'models-lock.json'),join(production,'models-lock.json'));
 writeFileSync(join(production,'python-freeze.txt'),capture(python,['-m','pip','freeze'])+'\n');
 manifest.runtime={node:process.version,python:capture(python,['--version']),platform:process.platform,arch:process.arch,ffmpeg:capture(env.AETHER_FFMPEG??'ffmpeg',['-version']).split('\n')[0],ffprobe:capture(env.AETHER_FFPROBE??'ffprobe',['-version']).split('\n')[0]};
 if(!manifest.sourceCommit){try{manifest.sourceCommit=capture('git',['rev-parse','HEAD']);}catch{}}
 const plan=await direct({...o.request,id:prepareId},{imported:o.imported,maxRepairs:0});
 for(const [name,v] of Object.entries({'director-request.json':plan.request,'director-ir.json':plan.ir,'director-stages.json':plan.stages,'director-manifest.json':plan.manifest,'catalog-selection.json':plan.catalogSelection,'planned-project.json':plan.project}))write(join(production,name),v);
 writeFileSync(join(production,'prompt.txt'),plan.prompt);
 manifest.directorMode=plan.manifest.mode;manifest.provider=plan.manifest.provider;manifest.status='preparing';manifest.preparationInvocations++;update();
 runChecked(root,process.execPath,['scripts/cli.mjs','prepare',join(production,'planned-project.json'),'--director-budget'],env);
 const authored=validateProject(read(join(prep,'scene.json'))),timeline=validateTimeline(authored,read(join(prep,'timeline.json')));
 if(timeline.durationFrames!==manifest.targetFrames)throw Error('Exact target duration mismatch');
 const shared=['timeline.json','kokoro-narration.wav','mix.wav','voice-report.json','speech-report.json','captions.srt','captions.vtt'];
 manifest.sharedHashes=Object.fromEntries(shared.map(name=>[name,sha(join(prep,name))]));
 manifest.timelineDigest=digest(timeline);manifest.modelFingerprint=read(join(prep,'speech-report.json')).modelFingerprint;
 const prepared=o.backends.map((backend,i)=>{
  const out=outputs[i],id=o.ids[i],before=matchedProject(authored,timeline,id,backend),r=repairProject(before,timeline,{enabled:o.repair});
  if(r.report.after.issues.some(x=>x.severity==='error'))throw Error('Blocking preflight issue for '+backend);
  write(join(out,'quality-original-project.json'),before);write(join(out,'quality-preflight.json'),r.report);write(join(out,'scene.json'),r.project);
  for(const name of shared)copyFileSync(join(prep,name),join(out,name));
  copyFileSync(join(prep,'mix.wav'),join(root,'public','audio',id+'.wav'));
  return {out,scene:r.project,backend,id};
 });
 if(prepared.length===2&&digest(normalizedProject(prepared[0].scene))!==digest(normalizedProject(prepared[1].scene)))throw Error('Backend parity failed before native rendering');
 manifest.normalizedProjectDigest=digest(normalizedProject(prepared[0].scene));manifest.status='rendering';update();
 // Deliberately sequential on one runner, same audio and timeline, same concurrency.
 for(const p of prepared){
  const row={id:p.id,backend:p.backend,status:'running'};manifest.results.push(row);manifest.renderInvocations++;update();
  try{
   const timing=renderNative({root,out:p.out,scene:p.scene,timeline,quality:true,python,env});
   for(const name of shared)if(sha(join(p.out,name))!==manifest.sharedHashes[name])throw Error('Shared artifact changed: '+name);
   const report=read(join(p.out,'quality-report.json'));if(report.errors!==0||timing.backend!==p.backend)throw Error('Native quality/backend gate failed');
   Object.assign(row,{status:'succeeded',renderSeconds:timing.renderSeconds,frames:timeline.durationFrames,gl:timing.gl,qualityStatus:report.status,warnings:report.warnings,filmSha256:sha(join(p.out,'film.mp4')),filmBytes:statSync(join(p.out,'film.mp4')).size});
  }catch(e){row.status='failed';row.error=String(e.message??e).slice(0,1200);console.error(p.backend+' production failed:',row.error);}
  update();
 }
 if(manifest.results.some(x=>x.status!=='succeeded'))throw Error('One or more native backends failed; successful outputs preserved');
 if(prepared.length===2)runChecked(root,python,['scripts/compare_release.py',prepared[0].out,prepared[1].out,join(production,'comparison.json')],env);
 manifest.status='succeeded';update();
 for(const p of prepared)copyFileSync(join(production,'production.json'),join(p.out,'production.json'));
 console.log('PASS: one-click production',o.id,'frames',manifest.targetFrames,'native renders',manifest.renderInvocations,'shared audio preparations',manifest.preparationInvocations);
}catch(e){manifest.status='failed';manifest.error=String(e.message??e).slice(0,1200);update();throw e;}
