// Opt-in, bounded visual controls. Absent profile preserves v0.4.
export const FIDELITY_DEFAULTS=Object.freeze({bloom:.55,atmosphere:.45,contactShadow:.65,surfaceDetail:.6,depthOfField:.35,motionBlur:.35,grain:.15,grade:.45,particles:.6,typography:.8});
// lightShafts (DUAL-09, owner: "those lights should be removed. they dont offer anything"): strength of the diagonal
// light beams of the atmosphere effect. Optional and not merged into the defaults, so existing projects and their
// digests are unchanged (absent = 1, the historical beams). The Director writes 0 for every new film.
export const FIDELITY_OPTIONAL=Object.freeze(['lightShafts']);
export function validateFidelity(s,p='fidelity'){
 if(!s||typeof s!=='object'||Array.isArray(s))throw Error(p+': object required');
 for(const [k,v] of Object.entries(s)){if(!Object.hasOwn(FIDELITY_DEFAULTS,k)&&!FIDELITY_OPTIONAL.includes(k))throw Error(p+'.'+k+': unknown field');if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)throw Error(p+'.'+k+': expected finite number in [0,1]');}
 return s;
}
export function fidelity(s){return s===undefined?null:{...FIDELITY_DEFAULTS,...s};}
export function shutterSamples(p,frames,strength){
 if(!Number.isFinite(p)||p<0||p>1||!Number.isSafeInteger(frames)||frames<2||!Number.isFinite(strength)||strength<0||strength>1)throw Error('invalid shutter');
 if(strength===0)return [[p,1]];
 const delta=.5*strength/(frames-1);
 // Two evenly weighted subframe samples; clamp at shot edges.
 return [[Math.max(0,p-delta),.5],[Math.min(1,p+delta),.5]];
}
export function highlightMask(rgba,threshold=135){
 // Soft-knee luminance threshold, preserving highlight hue.
 for(let i=0;i<rgba.length;i+=4){const y=.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2],k=Math.max(0,Math.min(1,(y-threshold)/(255-threshold)));rgba[i+3]=Math.round(255*k*k);}
 return rgba;
}
export function hashNoise(x,y,seed){let n=(Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^Math.imul(seed+1,1274126177))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
