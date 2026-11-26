// DUAL-03: MathJax (src/director/math-compile.js) is loaded only when it is installed and a project needs it.
// This is the trusted production boundary (Director compile and authored --project load): every equation is
// regenerated from its TeX here, whatever outlines were supplied (repair pass, audit 2026-11-26: a matching key alone
// is not trusted). Projects without equations never need MathJax; projects with equations on a machine without it
// fail with an explicit message (never a silent fallback to supplied outlines).
let compiler;
try{compiler=await import('./math-compile.js');}
catch(e){if(e?.code!=='ERR_MODULE_NOT_FOUND')throw e;compiler=null;}
export const mathJaxAvailable=()=>compiler!==null;
const hasEquations=p=>p?.version===2&&p.shots.some(s=>s.composition?.version==='compose-v2'&&s.composition.items.some(x=>x.type==='equation'));
export function compileProjectMath(project){
 if(!hasEquations(project))return project;
 if(!compiler)throw Error('equations need MathJax (@mathjax/src 4.1.3), which is not installed here; run npm install');
 return compiler.compileProjectMath(project,{force:true});
}
