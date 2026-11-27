import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,renameSync,statSync} from 'node:fs';
import {resolve,join,dirname,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {direct} from '../src/director/index.js';
import {digest} from '../src/director/catalog.js';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {repairProject} from '../src/quality/preflight.js';
import {matchedProject,normalizedProject,sharedArtifacts,verifyShared} from '../src/studio/production.js';
import {parseProduction} from './production-options.mjs';
import {motionCheck} from '../src/quality/motion-check.js';
import {crowdingCheck} from '../src/quality/crowding.js';
import {visibility2Check} from '../src/quality/visibility.js';
import {reelsCheck} from '../src/core/reels.js';
import {silenceCheck} from '../src/quality/silence.js';
import {aidsCheck} from '../src/quality/aids.js';
const timelineFit=prepared=>prepared.some(p=>p.scene.speech?.fit==='speech-v1');
import {renderNative,runChecked} from './native-render.mjs';
import {holdRenderLock} from './render-lock.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),outRoot=join(root,'out');
const o=parseProduction(process.argv.slice(2)),env={...process.env};
// DUAL-08: one render at a time on this machine (inherited when a batch runner started this production).
holdRenderLock(root,'produce '+o.id,env);
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
const manifest={version:1,release:'1.0.0',status:'planning',mode:o.mode,id:o.id,request:o.request,sources:o.sources,backends:o.backends,outputIds:o.ids,repair:o.repair,provider:o.mode==='project'?'authored':'offline-or-imported',targetFrames:o.targetFrames,sourceCommit:env.GITHUB_SHA??null,results:[],renderInvocations:0,preparationInvocations:0};
const update=()=>write(join(production,'production.json'),manifest);
update();
try{
 const lock=join(root,'package-lock.json');if(existsSync(lock)){copyFileSync(lock,join(production,'package-lock.json'));manifest.npmLockSha256=sha(lock);}else manifest.npmLockSha256=null;
 copyFileSync(join(root,'requirements-release.txt'),join(production,'requirements-release.txt'));copyFileSync(join(root,'models-lock.json'),join(production,'models-lock.json'));
 writeFileSync(join(production,'python-freeze.txt'),capture(python,['-m','pip','freeze'])+'\n');
 manifest.runtime={node:process.version,python:capture(python,['--version']),platform:process.platform,arch:process.arch,ffmpeg:capture(env.AETHER_FFMPEG??'ffmpeg',['-version']).split('\n')[0],ffprobe:capture(env.AETHER_FFPROBE??'ffprobe',['-version']).split('\n')[0]};
 if(!manifest.sourceCommit){try{manifest.sourceCommit=capture('git',['rev-parse','HEAD']);}catch{}}
 // Stale/dirty checkout evidence: tracked or untracked source changes not in sourceCommit.
 try{manifest.sourceDirty=capture('git',['status','--porcelain']).length>0;}catch{manifest.sourceDirty=null;}
 // Input checksums: locks plus exact authored source bytes.
 manifest.inputHashes={'package-lock.json':manifest.npmLockSha256,'requirements-release.txt':sha(join(root,'requirements-release.txt')),'models-lock.json':sha(join(root,'models-lock.json'))};
 if(o.mode==='project'){
  // Authored v2 project: the validated file is the single scene definition; no Director, no retiming.
  copyFileSync(resolve(o.sources.project),join(production,'authored-project.json'));manifest.inputHashes['authored-project.json']=sha(join(production,'authored-project.json'));
  if(o.sources.pair){copyFileSync(resolve(o.sources.pair),join(production,'authored-pair.json'));manifest.inputHashes['authored-pair.json']=sha(join(production,'authored-pair.json'));}
  const planned=validateProject({...structuredClone(o.project),id:prepareId});
  write(join(production,'planned-project.json'),planned);
  manifest.directorMode=null;manifest.status='preparing';manifest.preparationInvocations++;update();
  runChecked(root,process.execPath,['scripts/cli.mjs','prepare',join(production,'planned-project.json')],env);
 }else{
  const plan=await direct({...o.request,id:prepareId},{imported:o.imported,maxRepairs:0});
  for(const [name,v] of Object.entries({'director-request.json':plan.request,'director-ir.json':plan.ir,'director-stages.json':plan.stages,'director-manifest.json':plan.manifest,'catalog-selection.json':plan.catalogSelection,'planned-project.json':plan.project}))write(join(production,name),v);
  writeFileSync(join(production,'prompt.txt'),plan.prompt);
  manifest.directorMode=plan.manifest.mode;manifest.provider=plan.manifest.provider;manifest.status='preparing';manifest.preparationInvocations++;update();
  runChecked(root,process.execPath,['scripts/cli.mjs','prepare',join(production,'planned-project.json'),'--director-budget'],env);
 }
 const authored=validateProject(read(join(prep,'scene.json'))),timeline=validateTimeline(authored,read(join(prep,'timeline.json')));
 // Fix A: speech.fit 'speech-v1' may end the film earlier than requested (never later); the measured length becomes the target.
 if(authored.speech?.fit==='speech-v1'){if(timeline.durationFrames<180||timeline.durationFrames>manifest.targetFrames)throw Error('Fitted duration outside the requested target');manifest.requestedFrames=manifest.targetFrames;manifest.targetFrames=timeline.durationFrames;}
 else if(timeline.durationFrames!==manifest.targetFrames)throw Error('Exact target duration mismatch');
 if(o.mode==='project'&&digest(normalizedProject(authored))!==digest(normalizedProject(o.project)))throw Error('Prepared scene differs from authored project');
 // Non-speech preparation writes its lossless soundtrack only to public/audio; archive it beside the timeline.
 if(!authored.speech)copyFileSync(join(root,'public','audio',prepareId+'.wav'),join(prep,'mix.wav'));
 const shared=sharedArtifacts(authored);
 manifest.sharedArtifacts=[...shared];
 manifest.sharedHashes=Object.fromEntries(shared.map(name=>[name,sha(join(prep,name))]));
 manifest.timelineDigest=digest(timeline);manifest.frameAllocation=timeline.shots.map(s=>({id:s.id,startFrame:s.startFrame,endFrame:s.endFrame}));
 manifest.modelFingerprint=existsSync(join(prep,'speech-report.json'))?read(join(prep,'speech-report.json')).modelFingerprint:null;
 const prepared=o.backends.map((backend,i)=>{
  const out=outputs[i],id=o.ids[i],before=matchedProject(authored,timeline,id,backend),r=repairProject(before,timeline,{enabled:o.repair});
  if(r.report.after.issues.some(x=>x.severity==='error'))throw Error('Blocking preflight issue for '+backend);
  write(join(out,'quality-original-project.json'),before);write(join(out,'quality-preflight.json'),r.report);write(join(out,'scene.json'),r.project);
  for(const name of shared)copyFileSync(join(prep,name),join(out,name));
  copyFileSync(join(prep,'mix.wav'),join(root,'public','audio',id+'.wav'));
  return {out,scene:r.project,backend,id};
 });
 if(prepared.length===2&&digest(normalizedProject(prepared[0].scene))!==digest(normalizedProject(prepared[1].scene)))throw Error('Backend parity failed before native rendering');
 manifest.normalizedProjectDigest=digest(normalizedProject(prepared[0].scene));
 // Per-output shared-input inventory; compare_release.py verifies both copies are identical and match the files.
 const inventory={version:1,production:o.id,mode:o.mode,sourceCommit:manifest.sourceCommit,sourceDirty:manifest.sourceDirty,targetFrames:manifest.targetFrames,timelineDigest:manifest.timelineDigest,frameAllocation:manifest.frameAllocation,normalizedProjectDigest:manifest.normalizedProjectDigest,modelFingerprint:manifest.modelFingerprint,inputHashes:manifest.inputHashes,sharedHashes:manifest.sharedHashes};
 for(const p of prepared)write(join(p.out,'shared-inputs.json'),inventory);
 // GEN-01 diagnostic checks on every production (measured timeline; not a gate): motion-speed-v1, visibility (v2 from
 // GEN-08: projected parts with a depth test; v1 stays exported and tested) and crowding-v1 (GEN-04).
 for(const p of prepared){const checks={version:1,motion:motionCheck(p.scene,timeline),visibility:visibility2Check(p.scene,timeline),crowding:crowdingCheck(p.scene,timeline),...(p.scene.delivery?{reels:reelsCheck(p.scene,timeline)}:{}),silence:silenceCheck(p.scene,timeline),...(p.scene.shots.some(s=>s.composition)?{aids:aidsCheck(p.scene,timeline)}:{})};write(join(p.out,'quality-checks.json'),checks);
  manifest.checks={motionWarnings:checks.motion.warnings.length,visibilityWarnings:checks.visibility.warnings.length,crowdingWarnings:checks.crowding.warnings.length,...(checks.reels?{reelsWarnings:checks.reels.warnings.length}:{}),silenceWarnings:checks.silence.warnings.length,...(checks.aids?{aidsWarnings:checks.aids.warnings.length}:{})};
  console.log('CHECKS:',p.backend,checks.motion.policy,'warnings',checks.motion.warnings.length,checks.visibility.policy,'warnings',checks.visibility.warnings.length,checks.crowding.policy,'warnings',checks.crowding.warnings.length,...(checks.reels?[checks.reels.policy,'warnings',checks.reels.warnings.length]:[]),checks.silence.policy,'warnings',checks.silence.warnings.length,'talk',checks.silence.talkShare,...(checks.aids?[checks.aids.policy,'warnings',checks.aids.warnings.length]:[]),JSON.stringify([...checks.motion.warnings,...checks.visibility.warnings,...checks.crowding.warnings,...(checks.reels?.warnings??[]),...(checks.aids?.warnings??[])].map(w=>w.code+':'+w.shot+'/'+(w.asset??w.pair))));}
 // Fix A gate: a film fitted to its speech must not keep long silences (silence-v1); other films only report them.
 if(timelineFit(prepared))for(const p of prepared){const w=read(join(p.out,'quality-checks.json')).silence.warnings;if(w.length)throw Error('silence-v1 failed for a speech-fitted film: '+JSON.stringify(w));}
 manifest.status='rendering';update();
 const outputHash=out=>name=>existsSync(join(out,name))?sha(join(out,name)):null;
 const soundtrack=id=>join(root,'public','audio',id+'.wav');
 // Deliberately sequential on one runner, same audio and timeline, same concurrency.
 for(const p of prepared){
  const row={id:p.id,backend:p.backend,status:'running'};manifest.results.push(row);manifest.renderInvocations++;update();
  try{
   verifyShared(manifest.sharedHashes,outputHash(p.out),p.id);
   if(sha(soundtrack(p.id))!==manifest.sharedHashes['mix.wav'])throw Error('Render soundtrack differs from shared mix: '+p.id);
   const timing=renderNative({root,out:p.out,scene:p.scene,timeline,quality:true,python,env});
   verifyShared(manifest.sharedHashes,outputHash(p.out),p.id);
   if(sha(soundtrack(p.id))!==manifest.sharedHashes['mix.wav'])throw Error('Render soundtrack changed during render: '+p.id);
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
