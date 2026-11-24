export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const ease=(t,a,b)=>smooth((t-a)/(b-a));
export const mix=(a,b,t)=>a+(b-a)*t;

export function keyframes(t,frames){
 if(!Number.isFinite(t)||!Array.isArray(frames)||frames.length===0)throw Error('Invalid keyframes');
 for(let i=0;i<frames.length;i++){const f=frames[i];if(!Array.isArray(f)||f.length!==2||!f.every(Number.isFinite)||(i>0&&f[0]<=frames[i-1][0]))throw Error('Keyframes must be finite and strictly ordered');}
 if(t<=frames[0][0])return frames[0][1];
 for(let i=1;i<frames.length;i++){const [b,v]=frames[i],[a,u]=frames[i-1];if(t<=b)return mix(u,v,ease(t,a,b));}
 return frames.at(-1)[1];
}

// ART-01 opt-in: monotone cubic Hermite (Fritsch–Carlson). Passes through every key without stopping at
// interior keys on a monotone run, never overshoots between neighbouring keys, flat at ends and local extrema.
export const INTERPOLATIONS=Object.freeze(['ease','flow']);
export function flowKeyframes(t,frames){
 const base=keyframes(t,frames);if(frames.length<3||t<=frames[0][0]||t>=frames.at(-1)[0])return base;
 const n=frames.length,h=[],d=[];
 for(let i=0;i<n-1;i++){h.push(frames[i+1][0]-frames[i][0]);d.push((frames[i+1][1]-frames[i][1])/h[i]);}
 const m=[0];
 for(let i=1;i<n-1;i++){
  if(d[i-1]*d[i]<=0){m.push(0);continue;}
  const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];m.push((w1+w2)/(w1/d[i-1]+w2/d[i]));
 }
 m.push(0);
 let i=1;while(t>frames[i][0])i++;i--;
 const s=(t-frames[i][0])/h[i],s2=s*s,s3=s2*s,[y0,y1]=[frames[i][1],frames[i+1][1]];
 return (2*s3-3*s2+1)*y0+(s3-2*s2+s)*h[i]*m[i]+(-2*s3+3*s2)*y1+(s3-s2)*h[i]*m[i+1];
}
export function interpolate(t,frames,mode='ease'){
 if(mode==='ease')return keyframes(t,frames);if(mode==='flow')return flowKeyframes(t,frames);
 throw Error('Unknown interpolation: '+mode);
}
