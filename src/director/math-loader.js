// DUAL-03: MathJax (src/director/math-compile.js) is loaded only when it is installed and a project needs it.
// Projects without equations, or whose equations already carry valid compiled outlines, never need MathJax; a project
// with uncompiled equations on a machine without it fails with an explicit message (never a silent fallback).
import {mathKey} from '../core/math.js';
let compiler;
try{compiler=await import('./math-compile.js');}
catch(e){if(e?.code!=='ERR_MODULE_NOT_FOUND')throw e;compiler=null;}
export const mathJaxAvailable=()=>compiler!==null;
const needsCompile=p=>p?.version===2&&p.shots.some(s=>s.composition?.version==='compose-v2'&&s.composition.items.some(x=>x.type==='equation'&&x.compiled?.key!==mathKey(x.tex)));
export function compileProjectMath(project){
 if(!needsCompile(project))return project;
 if(!compiler)throw Error('equations need MathJax (@mathjax/src 4.1.3), which is not installed here; run npm install');
 return compiler.compileProjectMath(project);
}
