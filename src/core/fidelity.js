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
// FIX-RS: the bloom blur in plain JavaScript (deterministic, browser-independent). Chrome's canvas filter 'blur(3px)'
// returned a striped picture whenever selectComposition had run in the same browser first (every production render
// path), gpu01-swatches. Same operation as the canvas filter: a separable Gaussian (standard deviation sigma, kernel
// radius ceil(3 sigma)) over premultiplied colour, with transparent pixels outside the image. In and out: straight
// (non-premultiplied) RGBA bytes, as getImageData/putImageData use. Returns a new array.
const kernels=new Map();
function gaussian(sigma){let k=kernels.get(sigma);if(k)return k;const r=Math.ceil(3*sigma),w=new Float64Array(2*r+1);let s=0;for(let i=-r;i<=r;i++){w[i+r]=Math.exp(-i*i/(2*sigma*sigma));s+=w[i+r];}for(let i=0;i<w.length;i++)w[i]/=s;k={r,w};kernels.set(sigma,k);return k;}
export function blurRGBA(rgba,width,height,sigma){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||rgba.length!==width*height*4)throw Error('blurRGBA: size mismatch');
 if(!Number.isFinite(sigma)||sigma<=0||sigma>16)throw Error('blurRGBA: sigma must be in (0, 16]');
 const {r,w}=gaussian(sigma),n=width*height,a=new Float64Array(n*4),b=new Float64Array(n*4);
 for(let i=0;i<n;i++){const al=rgba[i*4+3]/255;a[i*4]=rgba[i*4]*al;a[i*4+1]=rgba[i*4+1]*al;a[i*4+2]=rgba[i*4+2]*al;a[i*4+3]=rgba[i*4+3];}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){let c0=0,c1=0,c2=0,c3=0;for(let k=-r;k<=r;k++){const xx=x+k;if(xx<0||xx>=width)continue;const j=(y*width+xx)*4,g=w[k+r];c0+=a[j]*g;c1+=a[j+1]*g;c2+=a[j+2]*g;c3+=a[j+3]*g;}const o=(y*width+x)*4;b[o]=c0;b[o+1]=c1;b[o+2]=c2;b[o+3]=c3;}
 const out=new Uint8ClampedArray(n*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){let c0=0,c1=0,c2=0,c3=0;for(let k=-r;k<=r;k++){const yy=y+k;if(yy<0||yy>=height)continue;const j=(yy*width+x)*4,g=w[k+r];c0+=b[j]*g;c1+=b[j+1]*g;c2+=b[j+2]*g;c3+=b[j+3]*g;}const o=(y*width+x)*4;
  out[o+3]=Math.round(c3);if(c3>0){const u=255/c3;out[o]=Math.round(c0*u);out[o+1]=Math.round(c1*u);out[o+2]=Math.round(c2*u);}}
 return out;
}
export function hashNoise(x,y,seed){let n=(Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^Math.imul(seed+1,1274126177))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
