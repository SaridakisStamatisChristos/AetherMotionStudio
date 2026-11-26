// DUAL-03 equations (browser-safe part). TeX is accepted only from an allowlist of commands and environments; the
// Node compiler (src/director/math-compile.js, MathJax 4.1.3, owner-approved) turns it into vector outlines that are
// stored in the scene as `compiled` and drawn by the shared 2D path on both backends. This module validates TeX,
// validates compiled data structurally (bounded path syntax and size; key bound to the TeX and compiler version), and
// checks simple arithmetic claims with the bounded expression parser (src/core/expr.js).
import {parseExpr} from './expr.js';
export const MATH_VERSION='mathjax-4.1.3/newcm/compose-v2.1';
export const TEX_LIMITS=Object.freeze({chars:200,depth:8,paths:600,pathChars:120000});
const GREEK='alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi pi varpi rho sigma tau upsilon phi varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega';
export const TEX_COMMANDS=Object.freeze(new Set((GREEK+' frac dfrac tfrac sqrt binom cdot times div pm mp le ge leq geq neq ne approx equiv sim simeq propto infty sum prod int oint lim log ln exp sin cos tan sec csc cot arcsin arccos arctan gcd min max mod bmod pmod left right big Big bigg Bigg quad qquad text mathrm mathbf mathit operatorname overline underline vec overrightarrow overleftarrow hat bar dot ddot tilde widehat angle measuredangle triangle perp parallel circ cdots ldots vdots ddots dots to rightarrow leftarrow Rightarrow Leftarrow leftrightarrow Leftrightarrow implies iff mapsto in notin ni subset subseteq supset supseteq cup cap setminus emptyset varnothing forall exists nexists neg land lor partial nabla prime lfloor rfloor lceil rceil langle rangle vert Vert mid begin end displaystyle textstyle').split(' ')));
export const TEX_ENVIRONMENTS=Object.freeze(new Set(['matrix','pmatrix','bmatrix','vmatrix','Bmatrix','cases','aligned']));
const SINGLE=new Set([',',';','!',':',' ','\\','{','}','%','|','#','&','_']);
const fail=(p,m)=>{throw Error(p+': '+m)};
// Allowlist check of a TeX string. Throws with the first offending command.
export function validateTex(tex,p='tex'){
 if(typeof tex!=='string'||!tex.trim()||tex.length>TEX_LIMITS.chars)fail(p,'TeX of 1–'+TEX_LIMITS.chars+' characters required');
 if(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(tex))fail(p,'control characters are not allowed');
 if(/[$]/.test(tex))fail(p,'write the formula without $ delimiters');
 let depth=0;for(const c of tex){if(c==='{'&&++depth>TEX_LIMITS.depth)fail(p,'braces nested deeper than '+TEX_LIMITS.depth);if(c==='}'&&--depth<0)fail(p,'unbalanced }');}if(depth)fail(p,'unbalanced {');
 for(const m of tex.matchAll(/\\([A-Za-z]+|.)/g)){const c=m[1];
  if(/^[A-Za-z]+$/.test(c)){if(!TEX_COMMANDS.has(c))fail(p,'\\'+c+' is not an allowed command');}
  else if(!SINGLE.has(c))fail(p,'\\'+c+' is not allowed');}
 for(const m of tex.matchAll(/\\(?:begin|end)\s*\{([^}]*)\}/g))if(!TEX_ENVIRONMENTS.has(m[1]))fail(p,'environment '+m[1]+' is not allowed');
 if(/\\(?:begin|end)(?!\s*\{)/.test(tex))fail(p,'\\begin and \\end need an environment name');
 return tex;
}
// FNV-1a over the TeX and the compiler version: binds compiled outlines to their source.
export function mathKey(tex){let h=0x811c9dc5;for(const c of MATH_VERSION+'\u0000'+tex){h^=c.codePointAt(0);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0');}
const PATH_RE=/^[MLHVCSQTAZmlhvcsqtaz0-9 .,eE+-]*$/;
// Structural check of compiled data: {key, box:[minX,minY,w,h] (em/1000 units), paths:[{d, m:[a,b,c,d,e,f]}]}.
export function validateCompiled(c,tex,p){
 if(!c||typeof c!=='object'||Array.isArray(c))fail(p,'equation not compiled; produce the film through the Director or produce.mjs');
 for(const k of Object.keys(c))if(!['key','box','paths'].includes(k))fail(p+'.'+k,'unknown field');
 if(c.key!==mathKey(tex))fail(p+'.key','compiled outlines do not match this TeX or compiler version; recompile');
 const fin=(v,q)=>{if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e6)fail(q,'finite number required');};
 if(!Array.isArray(c.box)||c.box.length!==4)fail(p+'.box','[x,y,w,h] required');c.box.forEach((v,i)=>fin(v,p+'.box['+i+']'));if(c.box[2]<=0||c.box[3]<=0)fail(p+'.box','positive size required');
 if(!Array.isArray(c.paths)||c.paths.length<1||c.paths.length>TEX_LIMITS.paths)fail(p+'.paths','1–'+TEX_LIMITS.paths+' paths required');
 let chars=0;for(const [i,x] of c.paths.entries()){const q=p+'.paths['+i+']';if(!x||typeof x!=='object'||Object.keys(x).some(k=>!['d','m'].includes(k)))fail(q,'{d,m} required');
  if(typeof x.d!=='string'||!x.d||!PATH_RE.test(x.d))fail(q+'.d','path data with M/L/H/V/C/S/Q/T/A/Z commands and numbers only');chars+=x.d.length;
  if(!Array.isArray(x.m)||x.m.length!==6)fail(q+'.m','6-number matrix required');x.m.forEach((v,j)=>fin(v,q+'.m['+j+']'));}
 if(chars>TEX_LIMITS.pathChars)fail(p,'compiled outlines larger than '+TEX_LIMITS.pathChars+' characters');
}
// Arithmetic check of a TeX equation: every side of "=" must evaluate to the same number. Only plain arithmetic is
// checkable (numbers, + - \cdot \times \div / ^, parentheses, \frac{a}{b}, \sqrt{a}, \gcd(a,b), \left \right);
// anything else is reported as unverifiable, never as verified.
export function checkArithmetic(tex){
 let s=tex.replace(/\\left|\\right|\\,|\\;|\\!|\\quad|\\qquad/g,' ');
 for(let n=0;n<8&&/\\(?:frac|dfrac|tfrac)\{/.test(s);n++)s=s.replace(/\\(?:frac|dfrac|tfrac)\{([^{}]*)\}\{([^{}]*)\}/g,'(($1)/($2))');
 for(let n=0;n<8&&/\\sqrt\{/.test(s);n++)s=s.replace(/\\sqrt\{([^{}]*)\}/g,'sqrt($1)');
 s=s.replace(/\\cdot|\\times/g,'*').replace(/\\div/g,'/').replace(/\\gcd/g,'gcd').replace(/\^\{([^{}]*)\}/g,'^($1)').replace(/[{}]/g,m=>m==='{'?'(':')');
 if(/\\|[A-Za-fh-z]/.test(s.replace(/gcd|sqrt/g,'')))return {status:'unverifiable',reason:'not plain arithmetic'};
 const sides=s.split('=');if(sides.length<2)return {status:'unverifiable',reason:'no equals sign'};
 let values;try{values=sides.map((x,i)=>parseExpr(x,'side '+(i+1)).eval(0));}catch(e){return {status:'unverifiable',reason:e.message};}
 if(values.some(v=>!Number.isFinite(v)))return {status:'false',values};
 const ok=values.every(v=>Math.abs(v-values[0])<=1e-9*Math.max(1,Math.abs(values[0])));
 return {status:ok?'true':'false',values};
}
