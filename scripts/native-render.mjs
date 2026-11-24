import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
export function runChecked(root,bin,args,env=process.env){
 const p=spawnSync(bin,args,{cwd:root,stdio:'inherit',env});
 if(p.error)throw p.error;if(p.status!==0)throw Error(bin+' failed: '+(p.status??p.signal));
}
export function renderNative({root,out,scene,timeline,quality=false,python=process.env.PYTHON||(process.platform==='win32'?'python':'python3'),env=process.env}){
 validateProject(scene);if(scene.version===2)validateTimeline(scene,timeline);
 if(!existsSync(join(root,'public','audio',scene.id+'.wav')))throw Error('Prepared soundtrack missing');
 const propsPath=join(out,'props.json');
 writeFileSync(propsPath,JSON.stringify({scene,timeline}));
 const pkg=JSON.parse(readFileSync(join(root,'node_modules/@remotion/cli/package.json'),'utf8'));
 const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin.remotion;
 const usesThree=scene.version===2&&scene.shots.some(s=>s.template==='cinematic-graph'&&s.backend==='three');
 const gl=env.AETHER_GL||'swangle',start=performance.now();
 runChecked(root,process.execPath,[join(root,'node_modules/@remotion/cli',bin),'render','src/index.jsx','AetherFilm',join(out,'film.mp4'),'--props='+propsPath,'--codec=h264','--concurrency=2',...(usesThree?['--gl='+gl]:[])],env);
 const timing={renderSeconds:(performance.now()-start)/1000,backend:usesThree?'three':'cpu',gl:usesThree?gl:null};
 writeFileSync(join(out,'render-timing.json'),JSON.stringify(timing,null,2));
 runChecked(root,python,['scripts/verify.py',out],env);if(quality)runChecked(root,python,['scripts/quality_media.py',out],env);
 return timing;
}
