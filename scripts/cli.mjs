import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateScene} from '../src/core/contract.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const [cmd='render',path='examples/robot-treasure.json']=process.argv.slice(2);
if(!['validate','prepare','render'].includes(cmd))throw Error('Usage: node scripts/cli.mjs validate|prepare|render [scene.json]');
const scene=validateScene(JSON.parse(readFileSync(resolve(path),'utf8')));
if(cmd==='validate'){console.log('Valid scene:',scene.id);process.exit(0)}
const out=join(root,'out',scene.id);mkdirSync(out,{recursive:true});
const scenePath=join(out,'scene.json'),propsPath=join(out,'props.json');
writeFileSync(scenePath,JSON.stringify(scene,null,2));writeFileSync(propsPath,JSON.stringify({scene}));
const python=process.env.PYTHON|| (process.platform==='win32'?'python':'python3');
function run(bin,args){const p=spawnSync(bin,args,{cwd:root,stdio:'inherit',env:process.env});if(p.error)throw p.error;if(p.status!==0)throw Error(bin+' failed: '+p.status);}
run(python,['scripts/make_audio.py',scenePath,out]);
if(cmd==='render'){
 // Use the installed CLI, no npx auto-install or shell injection.
 const pkg=JSON.parse(readFileSync(join(root,'node_modules/@remotion/cli/package.json'),'utf8'));
 const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin.remotion;
 run(process.execPath,[join(root,'node_modules/@remotion/cli',bin),'render','src/index.jsx','AetherFilm',join(out,'film.mp4'),'--props='+propsPath,'--codec=h264','--concurrency=2']);
 run(python,['scripts/verify.py',out]);
}
