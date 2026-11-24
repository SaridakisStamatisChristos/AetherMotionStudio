import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {renderNative} from './native-render.mjs';
import {repairProject} from '../src/quality/preflight.js';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const [cmd='render',path='examples/robot-treasure.json',...flags]=process.argv.slice(2);
if(new Set(flags).size!==flags.length||flags.some(f=>!['--director-budget','--quality','--repair'].includes(f))||flags.length&&cmd==='validate')throw Error('invalid CLI flags');
if(!['validate','prepare','render'].includes(cmd))throw Error('Usage: node scripts/cli.mjs validate|prepare|render [scene.json]');
let scene=validateProject(JSON.parse(readFileSync(resolve(path),'utf8')));
if(cmd==='validate'){console.log('Valid scene:',scene.id);process.exit(0)}
const out=join(root,'out',scene.id);mkdirSync(out,{recursive:true});
const scenePath=join(out,'scene.json'),propsPath=join(out,'props.json');
writeFileSync(scenePath,JSON.stringify(scene,null,2));
const python=process.env.PYTHON|| (process.platform==='win32'?'python':'python3');
function run(bin,args){const p=spawnSync(bin,args,{cwd:root,stdio:'inherit',env:process.env});if(p.error)throw p.error;if(p.status!==0)throw Error(bin+' failed: '+p.status);}
const directorBudget=flags.includes('--director-budget'),quality=flags.includes('--quality')||flags.includes('--repair');
if(directorBudget&&(scene.version!==2||!scene.speech&&scene.shots.some(s=>s.durationFrames===null)))throw Error('director budget requires a fixed-duration v2 project');
run(python,[scene.version===2?'scripts/make_timeline_audio.py':'scripts/make_audio.py',scenePath,out,...(directorBudget?['--director-budget']:[])]);
if(directorBudget)scene=validateProject(JSON.parse(readFileSync(scenePath,'utf8')));
const timeline=scene.version===2?validateTimeline(scene,JSON.parse(readFileSync(join(out,'timeline.json'),'utf8'))):null;
if(quality){
 const result=repairProject(scene,timeline,{enabled:flags.includes('--repair')});
 writeFileSync(join(out,'quality-preflight.json'),JSON.stringify(result.report,null,2));
 writeFileSync(join(out,'quality-original-project.json'),JSON.stringify(scene,null,2));
 scene=result.project;validateProject(scene);if(timeline)validateTimeline(scene,timeline);
 writeFileSync(scenePath,JSON.stringify(scene,null,2));
 console.log('Quality preflight:',result.report.accepted.length,'accepted camera repairs;',result.report.candidateEvaluations,'candidate evaluations');
 if(result.report.after.issues.some(x=>x.severity==='error'))throw Error('Quality preflight blocking defect; inspect report');
}
writeFileSync(propsPath,JSON.stringify({scene,timeline}));
if(cmd==='render')renderNative({root,out,scene,timeline,quality,python});
