// Recovery orchestration only. Run against the exact frozen renderer checkout.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,renameSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {renderNative,runChecked} from './native-render.mjs';
const [phase,cpuDir,oldThreeDir]=process.argv.slice(2);
assert.ok(['05','09'].includes(phase));
const root=process.cwd(),cpu=resolve(cpuDir),oldThree=resolve(oldThreeDir),id='foundry-af'+phase+'-three-polished',out=join(root,'out',id);
const frozen='202ee715012c0e857461ec56c4df733a438c1608',actual=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();assert.equal(actual,frozen);
const read=(d,n)=>JSON.parse(readFileSync(join(d,n),'utf8')),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const qCpu=read(cpu,'qualification.json'),qOld=read(oldThree,'qualification.json');
assert.equal(qCpu.sourceCommit,frozen);assert.equal(qOld.sourceCommit,frozen);assert.equal(qOld.id,id);assert.equal(qCpu.id,id.replace('-three-','-cpu-'));
assert.equal(qCpu.protocolDigest,qOld.protocolDigest);assert.equal(qCpu.protocolDigest,sha(join(root,'benchmarks/foundry-final-v1.json')));
for(const [d,q] of [[cpu,qCpu],[oldThree,qOld]])for(const [n,m] of Object.entries(q.inventory))assert.equal(sha(join(d,n)),m.sha256,'original artifact hash mismatch '+n);
const a=validateProject(read(cpu,'scene.json')),b=validateProject(read(oldThree,'scene.json'));const expected=structuredClone(a);expected.id=b.id;for(const s of expected.shots)s.backend='three';assert.deepEqual(expected,b,'authored scene drift cannot be repaired by sharing audio');
const timeline=validateTimeline(b,read(cpu,'timeline.json'));assert.equal(timeline.durationFrames,900);
mkdirSync(out,{recursive:true});for(const n of ['scene.json','lod-report.json'])copyFileSync(join(oldThree,n),join(out,n));
for(const n of ['timeline.json','voice-report.json','kokoro-narration.wav'])copyFileSync(join(cpu,n),join(out,n));
const audio=join(root,'public','audio',id+'.wav');mkdirSync(join(root,'public','audio'),{recursive:true});
const ff=process.env.AETHER_FFMPEG;assert.ok(ff,'CI media tools required');
const cpuFilm=join(cpu,'film.mp4');
const audioHash=p=>execFileSync(ff,['-v','error','-i',p,'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-'],{encoding:'utf8'}).trim();
const cpuAudioHash=audioHash(cpuFilm);
// The original simple v2 pipeline did not archive lossless mixed PCM. Decode the
// original CPU AAC for the render input, then copy its original AAC packets
// verbatim into the final MP4. The measured phrase timeline and narration PCM
// are the exact archived CPU originals, not re-synthesized.
runChecked(root,ff,['-v','error','-y','-i',cpuFilm,'-map','0:a:0','-af','apad','-t','30','-ar','48000','-ac','1','-c:a','pcm_s16le',audio]);
const timing=renderNative({root,out,scene:b,timeline,python:'python3'});
const rendered=join(out,'film.mp4'),muxed=join(out,'shared-audio.mp4');
runChecked(root,ff,['-v','error','-y','-i',rendered,'-i',cpuFilm,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',muxed]);
assert.equal(audioHash(muxed),cpuAudioHash,'final AAC packets must match CPU film');renameSync(muxed,rendered);
runChecked(root,'python3',['scripts/verify.py',out]);
writeFileSync(join(out,'repair-provenance.json'),JSON.stringify({version:1,sourceCommit:frozen,orchestrationCommit:process.env.REPAIR_ORCHESTRATION_SHA,originalRun:45423588804,repairRun:process.env.GITHUB_RUN_ID,phase,originalCpuFilm:qCpu.inventory['film.mp4'].sha256,originalThreeFilm:qOld.inventory['film.mp4'].sha256,cpuTimeline:qCpu.inventory['timeline.json'].sha256,cpuNarration:qCpu.inventory['kokoro-narration.wav'].sha256,sharedAacPacketHash:cpuAudioHash,audioInput:'decoded original CPU AAC; final AAC packets copied verbatim',renderSeconds:timing.renderSeconds},null,2));
