import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,renameSync} from 'node:fs';
import {resolve,dirname,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {direct,buildPrompt} from '../src/director/index.js';
import {request,safeJson} from '../src/director/schema.js';
import {baseline} from '../src/director/offline.js';
import {digest} from '../src/director/catalog.js';
import {provider} from '../src/director/providers.js';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),opts={};
const flags=new Set(['render','prepare','prompt-only','allow-remote']);
const values=new Set(['request','topic','script','script-file','seconds','id','audience','tone','style','language','voice','backend','profile','seed','provider','model','endpoint','timeout','repairs','import','out']);
while(args.length){const flag=args.shift();if(!flag.startsWith('--'))throw Error('expected --option');const k=flag.slice(2);if(Object.hasOwn(opts,k))throw Error('duplicate option '+k);if(flags.has(k))opts[k]=true;else if(values.has(k)&&args.length&&!args[0].startsWith('--'))opts[k]=args.shift();else throw Error('unknown or missing option '+k);}
const read=p=>safeJson(readFileSync(resolve(p),'utf8'));
const explicit={};for(const k of ['topic','script','id','audience','tone','style','language','voice','backend','profile'])if(opts[k]!==undefined)explicit[k]=opts[k];
for(const k of ['seconds','seed'])if(opts[k]!==undefined)explicit[k]=Number(opts[k]);
if(opts['script-file']){if(opts.script!==undefined)throw Error('choose --script or --script-file');explicit.script=readFileSync(resolve(opts['script-file']),'utf8');}
const q=request({version:1,id:'director-film',seconds:60,...(opts.request?read(opts.request):{}),...explicit});
if([opts.render,opts.prepare,opts['prompt-only']].filter(Boolean).length>1)throw Error('choose render, prepare or prompt-only');
const dest=resolve(opts.out??join(root,'out','director-plans',q.id,'project.json')),dir=dirname(dest);
mkdirSync(dir,{recursive:true});
function write(p,data){const tmp=p+'.tmp';writeFileSync(tmp,JSON.stringify(data,null,2)+'\n');renameSync(tmp,p);}
if(opts['prompt-only']){writeFileSync(join(dir,'prompt.txt'),buildPrompt(q,baseline(q)));console.log('Prompt:',join(dir,'prompt.txt'));process.exit(0);}
const kind=opts.provider??'offline';
const adapter=kind==='offline'?null:provider(kind,{model:opts.model??process.env.AETHER_DIRECTOR_MODEL,endpoint:opts.endpoint??process.env.AETHER_DIRECTOR_ENDPOINT,apiKey:kind==='gemini'?process.env.GEMINI_API_KEY:process.env.AETHER_DIRECTOR_API_KEY,allowRemote:opts['allow-remote']===true,timeoutMs:opts.timeout===undefined?undefined:Number(opts.timeout)});
const imported=opts.import?readFileSync(resolve(opts.import),'utf8'):null;
let result;
try{result=await direct(q,{adapter,imported,maxRepairs:opts.repairs===undefined?1:Number(opts.repairs)});}
catch(e){write(join(dir,'director-failure.json'),e.report??{status:'failed',message:e.message});throw e;}
const docs={'request.json':result.request,'director-ir.json':result.ir,'stages.json':result.stages,'catalog-selection.json':result.catalogSelection,'director-manifest.json':result.manifest};
write(dest,result.project);for(const [name,data] of Object.entries(docs))write(join(dir,name),data);writeFileSync(join(dir,'prompt.txt'),result.prompt);
if(opts.render||opts.prepare){
 const cmd=opts.render?'render':'prepare',out=join(root,'out',q.id);
 const proc=spawnSync(process.execPath,[join(root,'scripts','cli.mjs'),cmd,dest,'--director-budget'],{cwd:root,stdio:'inherit',env:process.env});
 const m=result.manifest;
 if(proc.error||proc.status!==0){m.status='failed';m.failure='measured audio compilation or native rendering failed; inspect CLI diagnostics';write(join(dir,'director-manifest.json'),m);throw Error(m.failure);}
 const actual=validateProject(read(join(out,'scene.json'))),timeline=validateTimeline(actual,read(join(out,'timeline.json')));
 m.status=opts.render?'rendered':'prepared';m.durationErrorFrames=timeline.durationFrames-m.targetFrames;m.measuredFrames=timeline.durationFrames;m.timelineDigest=digest(timeline);m.compiledProjectDigest=digest(actual);m.shotDurationAdjustments=actual.shots.map((s,i)=>({id:s.id,planned:result.project.shots[i].durationFrames,measured:s.durationFrames}));m.maxSpeechSpeed=Math.max(...timeline.shots.flatMap(s=>s.segments.map(x=>x.speed)));
 if(m.durationErrorFrames!==0)throw Error('director duration mismatch');
 write(join(dir,'director-manifest.json'),m);write(join(dir,'compiled-project.json'),actual);
 const archive=join(out,'director');mkdirSync(archive,{recursive:true});for(const name of [...Object.keys(docs),'prompt.txt','compiled-project.json'])copyFileSync(join(dir,name),join(archive,name));copyFileSync(dest,join(archive,'planned-project.json'));
}
console.log(JSON.stringify({project:dest,manifest:result.manifest},null,2));
