import {clamp} from '../core/motion.js';
import {add,sub,dot,cross,norm} from './vectors.js';
function shade(hex,k){const v=parseInt(hex.slice(1),16);return 'rgb('+[v>>16,(v>>8)&255,v&255].map(x=>Math.round(clamp(x*k,0,255))).join(',')+')'}

export function createProjection(cam,target,zoom,origin=[360,650]){
 const fwd=norm(sub(target,cam)),right=norm(cross(fwd,[0,1,0])),up=cross(right,fwd);
 return p=>{const d=sub(p,cam),z=dot(d,fwd);return [origin[0]+zoom*dot(d,right)/Math.max(z,.1),origin[1]-zoom*dot(d,up)/Math.max(z,.1),z]};
}
// Painter-sorted box meshes for the established CPU projection backend.
// Not a depth-buffered renderer; preserve the legacy face-bias and lighting rules.
export function createMesh(cam,project,reveal=0){
 const faces=[];
 function box(center,size,color,transform=p=>p,emissive=false,bias=0){const [a,b,c]=size.map(x=>x/2);const verts=[[-a,-b,-c],[a,-b,-c],[a,b,-c],[-a,b,-c],[-a,-b,c],[a,-b,c],[a,b,c],[-a,b,c]].map(p=>transform(add(p,center)));const fs=[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]];for(const ids of fs){const v=ids.map(i=>verts[i]),n=norm(cross(sub(v[1],v[0]),sub(v[2],v[0]))),mid=v[0].map((_,i)=>v.reduce((s,p)=>s+p[i],0)/4);if(dot(n,sub(cam,mid))<=0)continue;const p=v.map(project);if(p.some(q=>q[2]<=.1||!q.every(Number.isFinite)))continue;const light=.58+.43*Math.max(0,dot(n,norm([-3,6,5])))+.12*Math.max(0,dot(n,norm([4,1,-3]))),k=emissive?1:light+.16*reveal*Math.max(0,dot(n,norm(sub([.9,2.5,.1],mid))));faces.push({p,z:p.reduce((s,x)=>s+x[2],0)/4-bias,color:shade(color,k),edge:shade(color,k*.92)})}}
 return {box,faces};
}
