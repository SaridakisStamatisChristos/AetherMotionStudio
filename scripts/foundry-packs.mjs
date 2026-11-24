import {readFileSync,writeFileSync,mkdirSync,statSync,readdirSync,existsSync,renameSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {builtinPack,BUILTIN_PACKS,PackRegistry,verifyPack,searchRegistry,assetEntry,PACK_LIMITS} from '../src/foundry/packs.js';
import {previewAsset,bmp} from '../src/foundry/pack-preview.js';
import {compilePackedStory,packedDirectorSelection} from '../src/director/packed-story.js';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';
import {meshCommands} from '../src/foundry/instances.js';
const read=p=>{if(statSync(p).size>PACK_LIMITS.bytes)throw Error('file budget');return JSON.parse(readFileSync(p,'utf8'))};
const write=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const registry=new PackRegistry(),storage=resolve(process.env.AETHER_PACK_DIR??'studio-data/packs');
function load(){if(!existsSync(storage))return;const names=readdirSync(storage).filter(x=>/^[a-f0-9]{64}\.json$/.test(x));if(names.length>PACK_LIMITS.packs)throw Error('registry capacity');for(const n of names){const p=read(join(storage,n));if(p.digest!==n.slice(0,-5))throw Error('filename digest mismatch');registry.import(p)}}
const [cmd='acceptance',...a]=process.argv.slice(2);
if(cmd==='acceptance'){
 const out='out/foundry-af08-packs';mkdirSync(out,{recursive:true});
 const story=read('examples/foundry-af08-story.json'),packs=story.packs.map(builtinPack);
 for(const p of packs)write(join(out,p.id+'.pack.json'),p);
 const reopened=packs.map(p=>read(join(out,p.id+'.pack.json')));for(const p of reopened)registry.import(p);
 assert.equal(registry.import(reopened[0]).reused,true);
 const portable={version:1,story,packs:reopened};write(join(out,'portable-project.json'),portable);
 const saved=read(join(out,'portable-project.json'));const fresh=new PackRegistry();for(const p of saved.packs)fresh.import(p);
 const cpu=compilePackedStory(saved.story,saved.packs,'cpu'),three=compilePackedStory(saved.story,saved.packs,'three');
 assert.deepEqual(cpu.shots.map(s=>({...s,backend:'three'})),three.shots);
 for(const project of [cpu,three]){const path='examples/'+project.id+'.json';write(path,project);assert.deepEqual(validateProject(read(path)),project);}
 for(const s of cpu.shots){const commands=meshCommands(evaluateGraph(s,.5));assert.ok(commands.some(c=>c.id.startsWith('explorer/'))&&commands.some(c=>c.id.startsWith('relay/')))}
 const negative=[];for(const [name,mutate] of [['missing-pack',x=>x.packs.pop()],['tampered-dependency',x=>x.packs[0].entries[0].digest='0'.repeat(64)],['missing-asset',x=>x.story.shots[0].prop='unknown'],['wrong-pack-digest',x=>x.packs[1].digest='1'.repeat(64)]]){const x=structuredClone(saved);assert.throws(()=>compilePackedStory(x.story,x.packs));negative.push(name);}
 const shortlist=packedDirectorSelection({kind:'generated',q:'beacon'},fresh);assert.ok(shortlist.some(x=>x.id==='survey-beacon'));assert.ok(shortlist.every(x=>!Object.hasOwn(x,'ref')));
 const entry=assetEntry('generated','survey-beacon',undefined,fresh),v=previewAsset(entry);assert.ok(!v.metrics.empty);writeFileSync(join(out,'beacon-preview.bmp'),bmp(v.raster));
 const report={version:1,packs:reopened.map(p=>({id:p.id,digest:p.digest,entries:p.entries.length})),projectRoundtrip:true,matchedScenes:true,shots:6,frames:900,negative,shortlist,preview:v.metrics,humanReview:'unreviewed',nativeThree:'deferred'};write(join(out,'acceptance.json'),report);console.log(JSON.stringify(report));
}else{
 load();
 if(cmd==='list')console.log(JSON.stringify({builtins:BUILTIN_PACKS,installed:registry.list()},null,2));
 else if(cmd==='search')console.log(JSON.stringify(searchRegistry(a[0]?JSON.parse(a[0]):{},registry),null,2));
 else if(cmd==='export-pack'&&a.length===2)write(a[1],registry.get(a[0]));
 else if(cmd==='verify-pack'&&a.length===1)console.log(JSON.stringify({digest:verifyPack(read(a[0])).digest,valid:true}));
 else if(cmd==='import'&&a.length===1){const p=verifyPack(read(a[0])),result=registry.import(p);if(!result.reused){mkdirSync(storage,{recursive:true});const dest=join(storage,p.digest+'.json'),tmp=dest+'.'+process.pid+'.tmp';writeFileSync(tmp,JSON.stringify(p),{flag:'wx'});renameSync(tmp,dest);}console.log(JSON.stringify(result));}
 else if(cmd==='compile'&&a.length===2){const p=read(a[0]);write(a[1],compilePackedStory(p.story,p.packs));}
 else if(['inspect','render-preview'].includes(cmd)&&a.length>=2){const e=assetEntry(a[0],a[1],undefined,registry),{raster,...v}=previewAsset(e);if(cmd==='render-preview'){if(!a[2])throw Error('output BMP required');writeFileSync(a[2],bmp(raster));}console.log(JSON.stringify(v,null,2));}
 else throw Error('list | search [JSON] | export-pack ID FILE | verify-pack FILE | import FILE | compile PORTABLE PROJECT | inspect KIND ID | render-preview KIND ID FILE | acceptance');
}
