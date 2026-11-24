import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const checkedOutCommit=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
import {cpus,totalmem,platform,arch,release} from 'node:os';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {meshCommands} from '../src/foundry/instances.js';
import {resourceUsage} from '../src/foundry/lod-policy.js';
import {builtinPack,BUILTIN_PACKS,searchRegistry} from '../src/foundry/packs.js';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n'),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
export function normalize(scene,{optimized=false,assetQuality=false}={}){
 const p=structuredClone(scene);delete p.id;
 for(const s of p.shots){delete s.backend;if(optimized)for(const o of s.lodPolicy?.overrides??[])delete o.level;
 if(assetQuality){delete s.geometryProfile;delete s.lodPolicy;delete s.materialProfile;}}
 return p;
}
export function checkPair(a,b,row){
 validateProject(a);validateProject(b);assert.ok(a.shots.every(s=>s.backend==='cpu')&&b.shots.every(s=>s.backend==='three'));
 assert.equal(a.shots.reduce((n,s)=>n+s.durationFrames,0),row.frames);assert.equal(b.shots.reduce((n,s)=>n+s.durationFrames,0),row.frames);
 assert.deepEqual(normalize(a,{optimized:row.kind==='backend-optimized'}),normalize(b,{optimized:row.kind==='backend-optimized'}));
 if(row.kind==='backend-optimized')assert.notDeepEqual(a.shots.map(s=>s.lodPolicy.overrides),b.shots.map(s=>s.lodPolicy.overrides));
}
const protocolPath='benchmarks/foundry-final-v1.json';
function plan(){
 const protocol=read(protocolPath),out='out/foundry-af09-protocol';mkdirSync(out,{recursive:true});const rows=[];
 for(const row of protocol.pairs){
  const a='examples/'+row.cpu+'.json',b='examples/'+row.three+'.json';
  if(!existsSync(a)||!existsSync(b)){assert.ok(['imported','generated','portable'].includes(row.key),'missing static fixture');rows.push({...row,materialization:'existing phase generator at render time'});continue;}
  checkPair(read(a),read(b),row);rows.push({...row,sourceDigests:[sha(a),sha(b)],materialization:'committed'});
 }
 assert.deepEqual(normalize(read('examples/cinematic-cpu-polished.json'),{assetQuality:true}),normalize(read('examples/foundry-af09-discovery-cpu-polished.json'),{assetQuality:true}));
 const manifests=BUILTIN_PACKS.map(builtinPack);write(join(out,'catalog.json'),searchRegistry({limit:300}));write(join(out,'packs.json'),manifests);
 write(join(out,'protocol.json'),{...protocol,sourceCommit:checkedOutCommit(),orchestrationCommit:process.env.GITHUB_SHA??null,protocolDigest:sha(protocolPath),pairs:rows,humanApproval:false,nativeThree:'deferred until authorized full'});
 console.log(JSON.stringify({protocol:protocol.id,pairs:rows.length,staticPairs:rows.filter(r=>r.sourceDigests).length,generatedPairs:rows.filter(r=>!r.sourceDigests).length,packs:manifests.length}));
}
function measure(id){
 const protocol=read(protocolPath),row=protocol.pairs.find(r=>[r.cpu,r.three].includes(id));if(!row)throw Error('not a frozen benchmark ID');
 const out=join('out',id),scene=read(join(out,'scene.json')),timeline=read(join(out,'timeline.json'));validateProject(scene);validateTimeline(scene,timeline);assert.equal(timeline.durationFrames,row.frames);
 const timed=fn=>{const t=performance.now();const value=fn();return {seconds:(performance.now()-t)/1000,value}};
 const traverse=()=>scene.shots.flatMap(s=>s.geometryProfile?protocol.sampling.map(f=>{const state=evaluateGraph(s,f),usage=resourceUsage(meshCommands(state));return {shot:s.id,fraction:f,lod:state.lodSelection??null,...usage}}):[]);
 const first=timed(traverse),warm=timed(traverse);assert.deepEqual(first.value,warm.value);
 const timing=read(join(out,'render-timing.json')),probe=read(join(out,'probe.json')),pkg=read('package.json'),v=probe.streams.find(s=>s.codec_type==='video');
 assert.equal(timing.backend,id===row.cpu?'cpu':'three');assert.equal(Number(v.nb_frames),row.frames);
 const inventory=Object.fromEntries(protocol.requiredArtifacts.filter(n=>n!=='qualification.json').map(n=>{const p=join(out,n);return [n,{bytes:statSync(p).size,sha256:sha(p)}]}));
 const system={cpu:cpus()[0]?.model??null,logicalCpus:cpus().length,memoryBytes:totalmem(),platform:platform(),arch:arch(),kernel:release(),node:process.version,remotion:pkg.dependencies.remotion,three:pkg.dependencies.three,gl:timing.gl??null,concurrency:2,gpuModel:null};
 const report={version:1,protocolDigest:sha(protocolPath),sourceCommit:checkedOutCommit(),orchestrationCommit:process.env.GITHUB_SHA??null,id,kind:row.kind,system,media:{width:v.width,height:v.height,frames:Number(v.nb_frames),fps:v.r_frame_rate,bytes:inventory['film.mp4'].bytes},renderSeconds:timing.renderSeconds,encodingSeconds:null,geometryTraversal:{firstSeconds:first.seconds,warmSeconds:warm.seconds,scope:'post-validation geometry traversal, not cold compile or renderer startup',samples:first.value},peakRssKiB:null,firstPreviewSeconds:null,frameLatency:null,inventory,humanReview:'unreviewed',nativeVerified:true};
 const timeFile=join(out,'qualification-process.txt');if(existsSync(timeFile)){const raw=readFileSync(timeFile,'utf8');const m=/maximum_rss_kib=(\d+)/.exec(raw),w=/elapsed_seconds=([\d.]+)/.exec(raw);if(m)report.peakRssKiB=Number(m[1]);if(w)report.totalCliSeconds=Number(w[1]);}
 write(join(out,'qualification.json'),report);console.log('AF09 evidence',id,report.renderSeconds,report.media.frames);
}
if(process.argv[1]?.endsWith('foundry-qualify.mjs')){const [cmd='plan',id]=process.argv.slice(2);if(cmd==='plan')plan();else if(cmd==='measure'&&id)measure(id);else throw Error('Usage: foundry-qualify.mjs plan | measure ID');}
