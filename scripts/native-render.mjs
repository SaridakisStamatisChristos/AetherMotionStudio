import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {renderSettings} from './perf-options.mjs';
export function runChecked(root,bin,args,env=process.env){
 const p=spawnSync(bin,args,{cwd:root,stdio:'inherit',env});
 if(p.error)throw p.error;if(p.status!==0)throw Error(bin+' failed: '+(p.status??p.signal));
}
export function remotionRenderArgs({film,propsPath,usesThree,concurrency,gl,hardwareAcceleration}){
 return ['render','src/index.jsx','AetherFilm',film,'--props='+propsPath,'--codec=h264','--concurrency='+concurrency,...(usesThree?['--gl='+gl]:[]),...(hardwareAcceleration!=='disable'?['--hardware-acceleration='+hardwareAcceleration]:[])];
}
export function renderNative({root,out,scene,timeline,quality=false,python=process.env.PYTHON||(process.platform==='win32'?'python':'python3'),env=process.env}){
 validateProject(scene);if(scene.version===2)validateTimeline(scene,timeline);
 if(!existsSync(join(root,'public','audio',scene.id+'.wav')))throw Error('Prepared soundtrack missing');
 const propsPath=join(out,'props.json');
 writeFileSync(propsPath,JSON.stringify({scene,timeline}));
 const pkg=JSON.parse(readFileSync(join(root,'node_modules/@remotion/cli/package.json'),'utf8'));
 const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin.remotion;
 const usesThree=scene.version===2&&scene.shots.some(s=>s.template==='cinematic-graph'&&s.backend==='three');
 // Explicit opt-in settings (LOCAL-03): AETHER_CONCURRENCY (default 2), AETHER_GL (Three only, default swangle),
 // AETHER_HW_ENCODE (default disable). Defaults produce the exact historical CLI arguments.
 const settings=renderSettings(env),{concurrency,gl,hardwareAcceleration}=settings,start=performance.now();
 runChecked(root,process.execPath,[join(root,'node_modules/@remotion/cli',bin),...remotionRenderArgs({film:join(out,'film.mp4'),propsPath,usesThree,...settings})],env);
 const timing={renderSeconds:(performance.now()-start)/1000,backend:usesThree?'three':'cpu',gl:usesThree?gl:null,concurrency,hardwareAcceleration};
 writeFileSync(join(out,'render-timing.json'),JSON.stringify(timing,null,2));
 runChecked(root,python,['scripts/verify.py',out],env);if(quality)runChecked(root,python,['scripts/quality_media.py',out],env);
 return timing;
}
