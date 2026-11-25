// FOD default-unchanged proof. Prints digests that must be identical between a base checkout and the working tree
// when a change is opt-in. Usage (run once per root, compare the output lines):
//   node scripts/fod-digests.mjs [root=.] [--exclude prefix1,prefix2]
// Make a base root with:  git worktree add <tmp> <base-commit>  and copy node_modules into it (cp -r node_modules <tmp>/).
// Lines:
//   graph     every cinematic-graph shot of every example (excluding --exclude file prefixes), evaluated at 13
//             progress points, plus inspectProject per example
//   geometry  all catalog assets in two probe poses (rest; walking/foot lift/arm raised)
//   detail2   the seven human kinds at params.detail 2 in two poses
//   director  every *.request.json through the offline director (prompt, project, manifest without wall-clock fields)
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const args=process.argv.slice(2),root=resolve(args.find(a=>!a.startsWith('--')&&args[args.indexOf(a)-1]!=='--exclude')??'.');
const ex=(args[args.indexOf('--exclude')+1]??'').split(',').filter(Boolean),skip=f=>args.includes('--exclude')&&ex.some(p=>f.startsWith(p));
const mod=p=>import(pathToFileURL(resolve(root,p)).href);
const {evaluateGraph}=await mod('src/core/graph.js'),{inspectProject}=await mod('src/quality/preflight.js'),{emitAsset,ASSETS}=await mod('src/visual/assets.js'),{direct}=await mod('src/director/index.js');
const files=readdirSync(resolve(root,'examples')).sort();
{const h=createHash('sha256');let n=0;
 for(const f of files.filter(f=>f.endsWith('.json')&&!f.endsWith('.request.json')&&!skip(f))){const p=JSON.parse(readFileSync(resolve(root,'examples',f),'utf8'));
  for(const s of p.shots??[])if(s.template==='cinematic-graph'){for(let i=0;i<=12;i++){try{h.update(JSON.stringify(evaluateGraph(s,i/12)));}catch(e){h.update('E'+e.message);}}n++;}
  try{h.update(JSON.stringify(inspectProject(p)));}catch(e){h.update('P'+e.message);}}
 console.log('graph    ',n,'shots',h.digest('hex').slice(0,16));}
{const h=createHash('sha256');let n=0;
 for(const id of Object.keys(ASSETS).sort())for(const pose of [{origin:[0,0,0],yaw:.3},{origin:[0,0,0],yaw:-.2,walking:.6,footLift:.4,armPitch:-1}]){try{emitAsset(id,(c,sz,col,tf=q=>q)=>{h.update(JSON.stringify([tf(c),sz,col]));n++;},pose);}catch(e){h.update('E'+e.message);}}
 console.log('geometry ',Object.keys(ASSETS).length,'assets',n,'boxes',h.digest('hex').slice(0,16));}
{const h=createHash('sha256');
 for(const id of ['scientist','engineer','office-worker','astronaut','construction-worker','student','runner'])for(const pose of [{origin:[0,0,0],yaw:.3,params:{detail:2}},{origin:[1,0,0],yaw:-.2,walking:.6,armPitch:-1,grip:.4,params:{detail:2}}])emitAsset(id,(c,sz,col,tf=q=>q)=>h.update(JSON.stringify([tf(c),sz,col])),pose);
 console.log('detail2  ',h.digest('hex').slice(0,16));}
{const h=createHash('sha256');let n=0;
 for(const f of files.filter(f=>f.endsWith('.request.json')&&!skip(f))){const r=JSON.parse(readFileSync(resolve(root,'examples',f),'utf8'));if(r.foundryRequests)continue;
  try{const x=await direct(r);const {planningMs,attempts,...m}=x.manifest;h.update(JSON.stringify([x.prompt,x.project,m,attempts.map(({ms,...a})=>a)]));n++;}catch(e){h.update('E'+e.message);}}
 console.log('director ',n,'requests',h.digest('hex').slice(0,16));}
