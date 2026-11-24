import {sampleImported} from './import-bundle.js';
import {add,sub,mul,dot,cross,unit,LIMITS} from './geometry.js';
import {clipNear,cameraBasis} from './raster.js';
import {createTextureCache,materialLight,linearColor,linearToSrgb,srgbToLinear,sampleMap,materialKey} from './materials.js';
const cache=createTextureCache();
const rim=unit([4,2,-4]),clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const edge=(a,b,x,y)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
// Interpolated attributes are divided by reciprocal depth. Opaque and nearest
// translucent buffers are separate, so glass behind an opaque surface never leaks.
function triangle(target,vertices,surface,zoom){
 const {w,h,depth,rgba,transparentDepth,transparentRGBA}=target,clipped=clipNear(vertices,.1),m=surface.m,tex=surface.tex,base=surface.base,em=surface.em,blend=m.alphaMode==='blend';
 if((m.alphaMode==='mask'&&m.opacity<m.alphaCutoff)||(blend&&m.opacity===0))return;
 for(let j=1;j<clipped.length-1;j++){const p=[clipped[0],clipped[j],clipped[j+1]].map(v=>[w/2+zoom*v[0]/v[2],h/2-zoom*v[1]/v[2],1/v[2],...v.slice(3).map(x=>x/v[2])]),area=edge(p[0],p[1],p[2][0],p[2][1]);if(Math.abs(area)<1e-9)continue;
 const x0=Math.max(0,Math.floor(Math.min(...p.map(v=>v[0])))),x1=Math.min(w-1,Math.ceil(Math.max(...p.map(v=>v[0])))),y0=Math.max(0,Math.floor(Math.min(...p.map(v=>v[1])))),y1=Math.min(h-1,Math.ceil(Math.max(...p.map(v=>v[1]))));
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const a=edge(p[1],p[2],x+.5,y+.5)/area,b=edge(p[2],p[0],x+.5,y+.5)/area,c=1-a-b;if(Math.min(a,b,c)<-1e-8)continue;const z=a*p[0][2]+b*p[1][2]+c*p[2][2],i=y*w+x,dep=blend?transparentDepth:depth,dst=blend?transparentRGBA:rgba;if(z<=dep[i])continue;dep[i]=z;
  const interp=k=>(a*p[0][k]+b*p[1][k]+c*p[2][k])/z,u=interp(3)*m.uvScale[0]+m.uvOffset[0],v=interp(4)*m.uvScale[1]+m.uvOffset[1],diff=interp(5),spec=interp(6),coat=interp(7),n=tex?.resolution??1,maps=tex?.maps??{},albedo=tex?srgbToLinear(sampleMap(maps.base,n,u,v)):1,rough=tex?sampleMap(maps.roughness,n,u,v):1,ao=tex?sampleMap(maps.occlusion,n,u,v):1;
  const rgb=surface.image?sampleImported(surface.image,u,v).map(srgbToLinear):null;for(let k=0;k<3;k++){const metalTint=.04*(1-m.metallic)+base[k]*m.metallic,energy=base[k]*(rgb?rgb[k]:albedo)*diff*(1-.72*m.metallic)*ao+metalTint*spec*(1.5-.5*rough)+coat*.04*m.clearcoat+em[k]*m.emissiveIntensity;dst[i*4+k]=Math.round(255*linearToSrgb(energy))}dst[i*4+3]=blend?Math.round(m.opacity*255):255;
 }}
}
function legacySurface(cmd){return {version:1,baseColor:cmd.color,roughness:.65,metallic:0,emissiveColor:cmd.emissive?cmd.color:'#000000',emissiveIntensity:cmd.emissive?.8:0,opacity:1,alphaMode:'opaque',alphaCutoff:.5,clearcoat:0,uvScale:[1,1],uvOffset:[0,0]}}
export function renderMaterialMeshes(target,commands,camera,profile,progress){
 const {w,h}=target;target.depth.fill(0);target.rgba.fill(0);if(!target.transparentDepth){target.transparentDepth=new Float32Array(w*h);target.transparentRGBA=new Uint8ClampedArray(w*h*4)}target.transparentDepth.fill(0);target.transparentRGBA.fill(0);
 const {f,r,u}=cameraBasis(camera),zoom=camera.zoom*h/1280,key=materialLight(profile.lighting,progress),surfaces=new Map();let count=0;
 for(const cmd of commands){const {mesh,origin,axes}=cmd,m=cmd.surface??legacySurface(cmd),id=materialKey(m)+(cmd.importTexture?.digest??'');let surface=surfaces.get(id);if(!surface){surface={m,base:linearColor(m.baseColor),em:linearColor(m.emissiveColor),tex:m.texture?cache.get(m.texture):null,image:cmd.importTexture};surfaces.set(id,surface)}
  count+=mesh.indices.length/3;if(count>LIMITS.triangles)throw Error('scene triangle budget');const co=[cross(axes[1],axes[2]),cross(axes[2],axes[0]),cross(axes[0],axes[1])],sign=Math.sign(dot(axes[0],co[0]));if(!sign)throw Error('singular instance');const verts=[];
  for(let i=0;i<mesh.positions.length;i+=3){const p=axes.reduce((a,b,j)=>add(a,mul(b,mesh.positions[i+j])),origin),d=sub(p,camera.position),n=unit(mul(co.reduce((a,b,j)=>add(a,mul(b,mesh.normals[i+j])),[0,0,0]),sign)),view=unit(mul(d,-1)),half=add(key,view),hl=Math.hypot(...half),nh=hl>1e-10?Math.max(0,dot(n,mul(half,1/hl))):0,nl=Math.max(0,dot(n,key)),diff=.23+.83*nl+.18*Math.max(0,dot(n,rim)),exponent=2+96*(1-m.roughness)**2,spec=nl*Math.pow(nh,exponent)*(1.9-.9*m.roughness),coat=nl*Math.pow(nh,100),uv=i/3*2;verts.push([dot(d,r),dot(d,u),dot(d,f),mesh.uvs[uv],mesh.uvs[uv+1],diff,spec,coat])}
  for(let i=0;i<mesh.indices.length;i+=3)triangle(target,[verts[mesh.indices[i]],verts[mesh.indices[i+1]],verts[mesh.indices[i+2]]],surface,zoom)
 }
 // One nearest transparent layer, composited in linear light, with unpremultiplied output.
 for(let i=0;i<w*h;i++){const z=target.transparentDepth[i],j=i*4,src=target.transparentRGBA;if(z<=target.depth[i]||!src[j+3])continue;const a=src[j+3]/255,b=target.rgba[j+3]/255,out=a+b*(1-a);for(let k=0;k<3;k++)target.rgba[j+k]=Math.round(255*linearToSrgb((srgbToLinear(src[j+k]/255)*a+srgbToLinear(target.rgba[j+k]/255)*b*(1-a))/out));target.rgba[j+3]=Math.round(out*255)}
 return count;
}
