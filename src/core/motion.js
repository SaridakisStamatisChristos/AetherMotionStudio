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
