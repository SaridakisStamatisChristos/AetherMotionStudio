// Exercise the real local HTTP service, persistence, edited scene, native job and export.
import {createStudio} from './studio-server.mjs';
import {readFile,mkdir,cp,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),fixture=process.argv[2]??'studio-cpu-polished';
if(!['studio-cpu-polished','studio-three-polished'].includes(fixture))throw Error('Unknown Studio acceptance fixture');
const dir=await mkdtemp(join(tmpdir(),'aether-studio-')),s=await createStudio({root,dataDir:dir}),origin=await s.listen(0);
async function api(path,method='GET',data){const r=await fetch(origin+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json','X-Aether-Studio':'1'},...(data===undefined?{}:{body:JSON.stringify(data)})});const x=await r.json();if(!r.ok)throw Error(x.error??r.statusText);return x;}
try{
 const html=await (await fetch(origin+'/')).text();if(!html.includes('AetherMotion'))throw Error('Studio UI not served');
 const cat=await api('/api/catalog');if(cat.catalog.objects.length!==250)throw Error('Catalog missing');
 const {project}=await api('/api/examples/'+fixture+'.json');
 // Apply same controlled edit to each backend pair, through saved revision.
 let saved=await api('/api/projects/'+project.id,'PUT',{project,revision:null});
 project.shots[0].subheading='Light, water and the beginning of growth';
 saved=await api('/api/projects/'+project.id,'PUT',{project,revision:saved.revision});
 const inspection=await api('/api/inspect','POST',{project});if(inspection.shots.length!==5)throw Error('Preflight missing');
 const job=await api('/api/jobs','POST',{id:project.id,revision:saved.revision,mode:'render',quality:true,repair:true});
 let current,printed=0;
 do{
  await new Promise(ok=>setTimeout(ok,1000));current=await api('/api/jobs/'+job.id);
  if(current.log.length!==printed){console.log(current.log.slice(-1200));printed=current.log.length;}
 }while(current.status==='running');
 if(current.status!=='succeeded')throw Error(current.error+'\n'+current.log);
 const q=await api('/api/jobs/'+job.id+'/files/quality-report.json');if(q.errors!==0)throw Error('Quality gate failed');
 const media=await fetch(origin+'/api/jobs/'+job.id+'/files/film.mp4',{headers:{Range:'bytes=0-255'}});
 if(media.status!==206||(await media.arrayBuffer()).byteLength!==256)throw Error('MP4 byte-range playback failed');
 const props=await api('/api/jobs/'+job.id+'/files/props.json');if(props.timeline.durationFrames!==1500)throw Error('Unexpected timeline');
 const out=join(root,'out',fixture);await mkdir(out,{recursive:true});await cp(join(root,'out',job.id),out,{recursive:true});
 await writeFile(join(out,'studio-acceptance.json'),JSON.stringify({version:1,status:'pass',fixture,jobId:job.id,revision:saved.revision,httpProjectRoundTrip:true,editedShot:true,catalogObjects:250,qualityStatus:q.status,mediaRangeStatus:206,measuredFrames:props.timeline.durationFrames,browserInteraction:'not exercised by HTTP acceptance',renderCount:1},null,2));
 console.log('PASS: Studio HTTP save/edit/inspect/native render/export; one verified 1500-frame film');
}finally{await s.close();await rm(dir,{recursive:true,force:true});}
