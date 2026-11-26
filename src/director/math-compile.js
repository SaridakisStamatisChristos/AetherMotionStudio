// DUAL-03 Node-only equation compiler (MathJax 4.1.3, owner-approved 2026-11-26). Converts allowlisted TeX into
// flattened vector outlines {key, box, paths:[{d, m}]} stored in the scene, so both renderers draw identical paths
// without loading MathJax or fonts at render time. Only geometry is kept (path data, rects as paths, transforms);
// links, classes, styles and anything else in MathJax's output are dropped. MathJax errors and characters the math
// font cannot draw are rejected with their message.
import {mathjax} from '@mathjax/src/js/mathjax.js';
import {TeX} from '@mathjax/src/js/input/tex.js';
import {SVG} from '@mathjax/src/js/output/svg.js';
import {liteAdaptor} from '@mathjax/src/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from '@mathjax/src/js/handlers/html.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import {MathJaxNewcmFont} from '@mathjax/mathjax-newcm-font/mjs/svg.js';
import {validateTex,validateCompiled,mathKey} from '../core/math.js';
let engine=null;
function jax(){if(!engine){const adaptor=liteAdaptor();RegisterHTMLHandler(adaptor);
 const doc=mathjax.document('',{InputJax:new TeX({packages:['base','ams']}),OutputJax:new SVG({fontCache:'none',fontData:MathJaxNewcmFont})});engine={adaptor,doc};}return engine;}
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const ID=[1,0,0,1,0,0],r2=v=>Math.round(v*100)/100;
function transform(s){let m=ID;if(!s)return m;
 for(const t of s.matchAll(/(translate|scale|matrix)\(([^)]*)\)/g)){const v=t[2].split(/[\s,]+/).filter(Boolean).map(Number);if(v.some(n=>!Number.isFinite(n)))throw Error('bad transform');
  m=mul(m,t[1]==='translate'?[1,0,0,1,v[0],v[1]??0]:t[1]==='scale'?[v[0],0,0,v[1]??v[0],0,0]:v);}
 if(s.replace(/(translate|scale|matrix)\([^)]*\)/g,'').trim())throw Error('unsupported transform '+s);return m;}
export function compileTex(tex,p='tex'){
 validateTex(tex,p);const {adaptor,doc}=jax();let node;
 // Characters outside the maths font's base ranges (e.g. accented letters in \text) would need MathJax's asynchronous
 // font loading; they are rejected with a clear message instead (write such words as a separate text label).
 try{node=doc.convert(tex,{display:true});}catch(e){const m=String(e.message??e);throw Error(p+': '+(/retry|asynchronous/i.test(m)?'contains characters outside the base maths font (for example accented letters inside \\text); put such words in a separate label':m.slice(0,160)));}
 const paths=[];let svg=null;
 const walk=(n,m)=>{if(adaptor.kind(n)==='#text')return;const kind=adaptor.kind(n);
  const err=adaptor.getAttribute(n,'data-mjx-error');if(err)throw Error(p+': TeX error: '+err);
  if(kind==='svg'&&!svg)svg=n;
  else if(kind==='text')throw Error(p+': a character is not in the maths font');
  else if(!['mjx-container','g','path','rect','svg','title','desc'].includes(kind))throw Error(p+': unsupported output element '+kind);
  const mm=mul(m,transform(adaptor.getAttribute(n,'transform')));
  if(kind==='path'){const d=adaptor.getAttribute(n,'d');if(d)paths.push({d:d.replace(/\s+/g,' ').trim(),m:mm.map(r2)});}
  if(kind==='rect'){const [x,y,w,h]=['x','y','width','height'].map(k=>Number(adaptor.getAttribute(n,k)??0));if([x,y,w,h].every(Number.isFinite)&&w>0&&h>0)paths.push({d:'M'+r2(x)+' '+r2(y)+'H'+r2(x+w)+'V'+r2(y+h)+'H'+r2(x)+'Z',m:mm.map(r2)});}
  for(const c of adaptor.childNodes(n))walk(c,mm);};
 walk(node,ID);
 if(!svg)throw Error(p+': no output');
 const box=String(adaptor.getAttribute(svg,'viewBox')??'').split(/\s+/).map(Number);
 if(box.length!==4||box.some(v=>!Number.isFinite(v)))throw Error(p+': no viewBox');
 const out={key:mathKey(tex),box:box.map(r2),paths};validateCompiled(out,tex,p);return out;
}
// Compiles every equation item of every compose-v2 composition in a project (in place on a copy). Items keep their
// TeX; `compiled` is replaced when missing or stale. Returns the new project.
// {force:true} (used at the production boundary, src/director/math-loader.js) regenerates every equation from its TeX
// and ignores supplied outlines, so geometry is never trusted just because its key matches (repair pass, audit
// 2026-11-26). Without force, equations whose key matches are kept (cheap re-validation of our own output).
export function compileProjectMath(project,{force=false}={}){
 if(project?.version!==2)return project;let changed=false;
 const stale=x=>x.type==='equation'&&(force||x.compiled?.key!==mathKey(x.tex));
 const shots=project.shots.map((s,i)=>{const c=s.composition;if(c?.version!=='compose-v2'||!c.items.some(stale))return s;
  changed=true;return {...s,composition:{...c,items:c.items.map((x,j)=>!stale(x)?x:{...x,compiled:compileTex(x.tex,'shots['+i+'].composition.items['+j+'].tex')})}};});
 return changed?{...project,shots}:project;
}
