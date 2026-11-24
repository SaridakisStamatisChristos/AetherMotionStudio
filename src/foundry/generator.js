// AF07: browser-safe, bounded declarative recipes. No file, network or executable input.
import {roundedCuboid, sphere, cylinder, torus, lathe, extrude, sweep, transformMesh, validateMesh} from './geometry.js';
import {meshDigest,sha256,COMPILER_VERSION} from './digest.js';
import {resolveMaterial,textureKey,textureBytes} from './materials.js';
import {strict,finite,int,hex} from './import-bundle.js';
import {add,ry} from '../visual/vectors.js';
export const GENERATED_PROFILE='foundry-af07', GENERATED_ID='generated-mesh', GENERATOR_VERSION='af07-recipe-1';
export const GENERATOR_LIMITS=Object.freeze({nodes:48,depth:8,parts:48,triangles:24000,vertices:24000,textureBytes:16*1024*1024,serialized:32768});
const fail=m=>{throw Error('generator: '+m)};
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,31}$/.test(x);
const vec=(v,n=3,a=-4,b=4)=>{if(!Array.isArray(v)||v.length!==n)fail('vector');return v.map(x=>finite(x,a,b))};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const generatedDigest=x=>sha256(new TextEncoder().encode(JSON.stringify(canonical(x))));
const unit=[[1,0,0],[0,1,0],[0,0,1]];
const palette=['painted-metal','brushed-steel','ceramic','rubber','emissive-display','matte-plastic','copper'];
const prims=['box','sphere','cylinder','torus','lathe','extrude','sweep'];
const cache=new WeakMap();
function params(n){
 const p=n.params;if(!Array.isArray(p)||p.length>3)fail('primitive params');
 switch(n.shape){
 case 'box': if(p.length!==2)fail('box params');{const s=vec(p[0],3,.04,3);finite(p[1],0,Math.min(...s)*.49);break}
 case 'sphere': if(p.length!==1)fail('sphere params');finite(p[0],.03,1.5);break;
 case 'cylinder': if(p.length!==2)fail('cylinder params');finite(p[0],.03,1.5);finite(p[1],.04,3);break;
 case 'torus': if(p.length!==2)fail('torus params');finite(p[0],.05,1.4);finite(p[1],.015,p[0]*.8);break;
 case 'lathe': case 'extrude': case 'sweep':{
 if(p.length!==(n.shape==='lathe'?1:2)||!Array.isArray(p[0])||p[0].length<(n.shape==='extrude'?3:2)||p[0].length>12)fail('profile budget');
 for(const v of p[0])vec(v,n.shape==='sweep'?3:2,n.shape==='lathe'?0:-2,2);
 if(n.shape!=='lathe')finite(p[1],.025,1);break}
 default:fail('unknown primitive');
 }
}
function mesh(n){const p=n.params;switch(n.shape){case 'box':return roundedCuboid(p[0],p[1],4);case 'sphere':return sphere(p[0],16,8);case 'cylinder':return cylinder(p[0],p[1],16);case 'torus':return torus(p[0],p[1],16,8);case 'lathe':return lathe(p[0],16);case 'extrude':return extrude(...p);case 'sweep':return sweep(p[0],p[1],8);}}
function validateRecipe(recipe){
 strict(recipe,['version','family','nodes','root','anchors','rig']);
 if(recipe.version!==1||!id(recipe.family)||!id(recipe.root)||recipe.rig!=='root-static'||!Array.isArray(recipe.nodes)||!recipe.nodes.length||recipe.nodes.length>GENERATOR_LIMITS.nodes)fail('recipe header');
 strict(recipe.anchors,['origin','ground','top']);for(const k of ['origin','ground','top'])vec(recipe.anchors[k]);if(recipe.anchors.ground.some(x=>x!==0)||recipe.anchors.origin.some(x=>x!==0))fail('ground anchor');
 const by=new Map();
 for(const n of recipe.nodes){
 strict(n,['id','op','shape','params','material','children','ref','offset','yaw','scale']);
 if(!id(n.id)||by.has(n.id))fail('duplicate or unsafe node ID');by.set(n.id,n);
 if(n.op==='primitive'){strict(n,['id','op','shape','params','material']);if(!prims.includes(n.shape)||!palette.includes(n.material))fail('primitive or material');params(n)}
 else if(n.op==='group'){strict(n,['id','op','children']);if(!Array.isArray(n.children)||!n.children.length||n.children.length>16||new Set(n.children).size!==n.children.length||!n.children.every(id))fail('group children')}
 else if(n.op==='instance'||n.op==='transform'){strict(n,['id','op','ref','offset','yaw','scale']);if(!id(n.ref))fail('reference');vec(n.offset);finite(n.yaw,-Math.PI*2,Math.PI*2);finite(n.scale,.25,2)}
 else fail('unknown operation');
 }
 const used=new Set();let leaves=0,visits=0;
 function walk(k,path){if(path.length>=GENERATOR_LIMITS.depth||path.includes(k)||!by.has(k)||++visits>256)fail('cycle, missing reference or expansion budget');used.add(k);const n=by.get(k);if(n.op==='primitive'){if(++leaves>GENERATOR_LIMITS.parts)fail('part expansion budget');return}for(const c of n.op==='group'?n.children:[n.ref])walk(c,[...path,k])}
 walk(recipe.root,[]);if(used.size!==by.size)fail('unreachable node');
 return by;
}
export function compileRecipe(recipe){
 const by=validateRecipe(recipe);
 const serialized=JSON.stringify(canonical(recipe));if(serialized.length>GENERATOR_LIMITS.serialized)fail('recipe size');
 const prior=cache.get(recipe);if(prior?.serialized===serialized)return prior.result;
 const parts=[],textures=new Map(),primitives=new Map();let triangles=0,vertices=0;
 function emit(k,offset,yaw,scale,path){
 const n=by.get(k);
 if(n.op==='group'){for(const c of n.children)emit(c,offset,yaw,scale,path+'-'+c);return}
 if(n.op!=='primitive'){emit(n.ref,add(offset,ry(n.offset.map(x=>x*scale),yaw)),yaw+n.yaw,scale*n.scale,path+'-'+n.ref);return}
 // Fixed primitive tessellation and bounded profile lengths cap allocation per node before kernel calls.
 let m=primitives.get(k);if(!m){m=mesh(n);primitives.set(k,m)}
 m=transformMesh(m,offset,unit.map(v=>ry(v.map(x=>x*scale),yaw)));
 const summary=validateMesh(m);triangles+=summary.triangles;vertices+=summary.vertices;
 if(triangles>GENERATOR_LIMITS.triangles||vertices>GENERATOR_LIMITS.vertices)fail('aggregate geometry budget');
 const surface=resolveMaterial({preset:n.material,texture:{resolution:256,strength:.18}},'cpu');
 textures.set(textureKey(surface.texture),textureBytes(surface.texture));
 if([...textures.values()].reduce((a,b)=>a+b,0)>GENERATOR_LIMITS.textureBytes)fail('texture budget');
 parts.push({id:path,mesh:m,hash:meshDigest(m),surface,summary});
 }
 emit(recipe.root,[0,0,0],0,1,recipe.root);
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const p of parts)for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],p.summary.bounds.min[i]);hi[i]=Math.max(hi[i],p.summary.bounds.max[i])}
 if(Math.abs(lo[1])>.001||hi.some((v,i)=>v-lo[i]>4)||Math.abs(hi[1]-recipe.anchors.top[1])>.02)fail('ground, top or extent mismatch');
 const fingerprint=generatedDigest(parts.map(p=>[p.hash,p.surface]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en')));
 const result={parts,lo,hi,fingerprint,triangles,vertices};cache.set(recipe,{serialized,result});return result;
}
export function makeGeneratedRef(recipe){
 const compiled=compileRecipe(recipe);
 const body={version:1,compiler:GENERATOR_VERSION,identity:'generated/'+recipe.family,revision:generatedDigest(recipe),fingerprint:compiled.fingerprint,status:'staged',provenance:{sourceKind:'original-procedural',license:'project-policy',humanReview:'unreviewed'},recipe};
 return {...body,digest:generatedDigest(body)};
}
const refCache=new WeakMap();
export function resolveGenerated(ref){
 strict(ref,['version','compiler','identity','revision','fingerprint','status','provenance','recipe','digest']);
 // Validate bounded flat recipe before serializing untrusted data.
 const result=compileRecipe(ref.recipe);
 strict(ref.provenance,['sourceKind','license','humanReview']);
 if(ref.version!==1||ref.compiler!==GENERATOR_VERSION||ref.status!=='staged'||ref.identity!=='generated/'+ref.recipe.family||!hex(ref.revision)||!hex(ref.fingerprint)||!hex(ref.digest)||ref.provenance.sourceKind!=='original-procedural'||ref.provenance.license!=='project-policy'||ref.provenance.humanReview!=='unreviewed')fail('reference header');
 const signature=JSON.stringify(canonical(ref));const old=refCache.get(ref);if(old?.signature===signature)return old.result;
 const {digest,...body}=ref;if(generatedDigest(body)!==digest||generatedDigest(ref.recipe)!==ref.revision||result.fingerprint!==ref.fingerprint)fail('reference digest mismatch');
 refCache.set(ref,{signature,result});return result;
}
function tf(pose){const scale=pose.scale??1,yaw=pose.yaw??0,origin=pose.origin??[0,0,0];return {point:p=>add(ry(p.map(x=>x*scale),yaw),origin),vector:p=>ry(p.map(x=>x*scale),yaw)}}
export function generatedCommands(a){const b=resolveGenerated(a.generatedRef),t=tf(a.pose);return b.parts.map(p=>({id:a.id+'/'+p.id,mesh:p.mesh,meshRef:p.hash,meshKey:COMPILER_VERSION+':'+p.hash,geometryBytes:p.mesh.positions.byteLength+p.mesh.normals.byteLength+p.mesh.uvs.byteLength+p.mesh.indices.byteLength,origin:t.point([0,0,0]),axes:unit.map(t.vector),pivot:a.pose.origin,materialSlot:p.id,color:p.surface.baseColor,emissive:p.surface.emissiveIntensity>0,surface:p.surface,lod:0}))}
export function generatedBounds(a){const b=resolveGenerated(a.generatedRef),t=tf(a.pose),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const x of [b.lo[0],b.hi[0]])for(const y of [b.lo[1],b.hi[1]])for(const z of [b.lo[2],b.hi[2]])t.point([x,y,z]).forEach((v,i)=>{lo[i]=Math.min(lo[i],v);hi[i]=Math.max(hi[i],v)});return {lo,hi,center:lo.map((v,i)=>(v+hi[i])/2)}}
export function recipeFor(family){
 const nodes=[],children=[];function part(name,shape,params,material,offset,yaw=0){nodes.push({id:name,op:'primitive',shape,params,material},{id:name+'-at',op:'instance',ref:name,offset,yaw,scale:1});children.push(name+'-at')}
 let top;
 if(family==='survey-beacon'){
 part('foot','cylinder',[.42,.18],'rubber',[0,.09,0]);
 part('stem','lathe',[[[.25,0],[.23,.15],[.12,.82],[.22,.96]]],'painted-metal',[0,.18,0]);
 part('signal','sphere',[.23],'emissive-display',[0,1.30,0]);
 part('collar','torus',[.25,.045],'brushed-steel',[0,1.16,0]);
 top=1.53;
 }else if(family==='ceramic-insulator'){
 part('foot','cylinder',[.33,.18],'brushed-steel',[0,.09,0]);
 part('body','cylinder',[.17,1.12],'ceramic',[0,.74,0]);
 for(let i=0;i<5;i++)part('rib'+i,'torus',[.26,.085],'ceramic',[0,.3+i*.21,0]);
 part('terminal','cylinder',[.12,.24],'copper',[0,1.42,0]);top=1.54;
 }else if(family==='specimen-canister'){
 part('base','cylinder',[.38,.16],'rubber',[0,.08,0]);
 part('vessel','lathe',[[[.31,0],[.36,.12],[.36,.78],[.24,.92]]],'brushed-steel',[0,.16,0]);
 part('cap','cylinder',[.26,.18],'painted-metal',[0,1.17,0]);
 part('band','torus',[.36,.035],'emissive-display',[0,.69,0]);
 part('label','box',[[.32,.24,.045],.015],'matte-plastic',[0,.74,.35]);top=1.26;
 }else fail('unsupported recipe family');
 nodes.push({id:'root',op:'group',children});return {version:1,family,nodes,root:'root',anchors:{origin:[0,0,0],ground:[0,0,0],top:[0,top,0]},rig:'root-static'};
}
