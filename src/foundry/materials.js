import {sha256} from './digest.js';
import {unit} from './geometry.js';
export const MATERIAL_VERSION=1;
export const TEXTURE_SIZES=Object.freeze([256,512,1024,2048]);
export const TEXTURE_BUDGET=96*1024*1024;
const patterns=['plain','brushed','wood','woven','scratches','edge-wear','ceramic','dirt','paint','panel','stone','paper','leather'];
const preset=(baseColor,roughness,metallic,pattern,extra={})=>Object.freeze({baseColor,roughness,metallic,pattern,...extra});
export const MATERIALS=Object.freeze({
 'painted-metal':preset('#ad5140',.36,.48,'paint',{clearcoat:.34}),
 'brushed-steel':preset('#b9c8d4',.32,.92,'brushed'),
 'anodized-aluminum':preset('#447ea8',.38,.83,'brushed'),
 copper:preset('#bb7650',.34,.9,'scratches'),
 gold:preset('#e5b34d',.24,.94,'edge-wear'),
 'polished-plastic':preset('#247f9c',.2,0,'plain',{clearcoat:.35}),
 'matte-plastic':preset('#50778a',.83,0,'paint'),
 glass:preset('#9ad6e7',.13,0,'plain',{opacity:.32,alphaMode:'blend',clearcoat:.7}),
 acrylic:preset('#7ac4cf',.24,0,'plain',{opacity:.55,alphaMode:'blend',clearcoat:.35}),
 rubber:preset('#35393b',.94,0,'dirt'),
 leather:preset('#90563c',.63,0,'leather'),
 fabric:preset('#5d8190',.88,0,'woven'),
 wood:preset('#b47d47',.64,0,'wood'),
 ceramic:preset('#e8ded0',.27,0,'ceramic',{clearcoat:.28}),
 concrete:preset('#999a91',.92,0,'dirt'),
 stone:preset('#9c9a91',.76,0,'stone'),
 paper:preset('#e7dcc5',.94,0,'paper'),
 'emissive-display':preset('#48e2dd',.37,0,'panel',{emissiveColor:'#48e2dd',emissiveIntensity:.75})
});
export const MATERIAL_CAPABILITIES=Object.freeze({cpu:{diffuse:'linear-light approximation',specular:'interpolated Blinn-Phong approximation',baseMap:true,roughnessMap:'modulates specular amplitude',occlusionMap:true,normalMap:false,clearcoat:'approximate highlight',opacity:'nearest translucent surface only',transmission:false,environmentReflection:false},three:{diffuse:'MeshPhysicalMaterial',specular:'PBR',baseMap:true,roughnessMap:true,occlusionMap:true,normalMap:true,clearcoat:true,opacity:'native alpha blend',transmission:true,environmentReflection:'procedural studio environment'}});
const own=(o,k)=>Object.hasOwn(o,k);
function object(o,keys){if(!o||typeof o!=='object'||Array.isArray(o)||![Object.prototype,null].includes(Object.getPrototypeOf(o)))throw Error('material object required');for(const k of Object.keys(o))if(!keys.includes(k))throw Error('unknown material field '+k)}
function number(x,a,b){if(typeof x!=='number'||!Number.isFinite(x)||x<a||x>b)throw Error('material number out of range');return x}
function color(x){if(typeof x!=='string'||!/^#[0-9a-fA-F]{6}$/.test(x))throw Error('material color required');return x.toLowerCase()}
function bool(x){if(typeof x!=='boolean')throw Error('material boolean required');return x}
function enumValue(x,values){if(!values.includes(x))throw Error('unknown material option');return x}
const vec2=(x,a,b)=>{if(!Array.isArray(x)||x.length!==2)throw Error('UV vector required');return x.map(v=>number(v,a,b))};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const configKeys=['preset','baseColor','roughness','metallic','emissiveColor','emissiveIntensity','opacity','alphaMode','alphaCutoff','clearcoat','transmission','uvScale','uvOffset','texture'];
export function resolveMaterial(input,backend='cpu'){
 object(input,configKeys);if(!own(MATERIALS,input.preset))throw Error('unknown material preset');
 const p=MATERIALS[input.preset],t=input.texture??{};object(t,['pattern','seed','scale','resolution','strength','normal','occlusion']);
 const texture={pattern:enumValue(t.pattern??p.pattern,patterns),seed:number(t.seed??17,0,2147483647),scale:number(t.scale??1,.25,8),resolution:enumValue(t.resolution??256,TEXTURE_SIZES),strength:number(t.strength??.65,0,1),normal:bool(t.normal??false),occlusion:bool(t.occlusion??false)};
 if(!Number.isInteger(texture.seed))throw Error('integer texture seed required');
 const m={version:1,preset:input.preset,baseColor:color(input.baseColor??p.baseColor),roughness:number(input.roughness??p.roughness,.04,1),metallic:number(input.metallic??p.metallic,0,1),emissiveColor:color(input.emissiveColor??p.emissiveColor??'#000000'),emissiveIntensity:number(input.emissiveIntensity??p.emissiveIntensity??0,0,2),opacity:number(input.opacity??p.opacity??1,0,1),alphaMode:enumValue(input.alphaMode??p.alphaMode??'opaque',['opaque','mask','blend']),alphaCutoff:number(input.alphaCutoff??.5,0,1),clearcoat:number(input.clearcoat??p.clearcoat??0,0,1),transmission:number(input.transmission??0,0,1),uvScale:vec2(input.uvScale??[1,1],.125,8),uvOffset:vec2(input.uvOffset??[0,0],-8,8),texture};
 if(m.alphaMode==='opaque'&&m.opacity!==1)throw Error('opaque material requires opacity 1');
 if(m.transmission>0&&(backend==='cpu'||m.alphaMode!=='opaque'))throw Error('transmission requires explicit Three.js opaque material');
 return m;
}
const ascii=s=>Uint8Array.from(s,c=>c.charCodeAt(0));
const hashObject=x=>sha256(ascii(JSON.stringify(x)));
export const materialKey=m=>hashObject(m);
export const textureKey=t=>hashObject([MATERIAL_VERSION,t]);
export const textureBytes=t=>t.resolution*t.resolution*4*(2+Number(t.normal)+Number(t.occlusion));
export function validateMaterialProfile(profile,assets,backend){
 object(profile,['version','assignments','lighting']);if(profile.version!==1||!Array.isArray(profile.assignments)||profile.assignments.length<1||profile.assignments.length>8)throw Error('material profile v1 requires 1–8 assignments');
 const ids=new Set(assets.map(a=>a.id)),seen=new Set(),textures=new Map();for(const x of profile.assignments){object(x,['asset','material','includeEmissive']);if(!ids.has(x.asset)||seen.has(x.asset))throw Error('unknown or duplicate material asset');seen.add(x.asset);if(own(x,'includeEmissive'))bool(x.includeEmissive);const m=resolveMaterial(x.material,backend);textures.set(textureKey(m.texture),textureBytes(m.texture))}
 if([...textures.values()].reduce((a,b)=>a+b,0)>TEXTURE_BUDGET)throw Error('shot texture budget');
 if(profile.lighting!==undefined)enumValue(profile.lighting,['studio','side','rim','sweep']);
 return profile;
}
const lightDirections=[unit([-3,6,5]),unit([5,2,2]),unit([-2,3,-5])];
export function materialLight(name='studio',progress=0){if(name==='sweep'){const p=clamp(progress)*2,i=Math.min(1,Math.floor(p)),t=p-i;return unit(lightDirections[i].map((x,j)=>x*(1-t)+lightDirections[i+1][j]*t))}return lightDirections[['studio','side','rim'].indexOf(name)]??lightDirections[0]}
export function materialAssignments(profile,backend){return new Map(profile.assignments.map(a=>[a.asset,{material:resolveMaterial(a.material,backend),includeEmissive:a.includeEmissive??false}]))}
// Periodic coordinate hash. Integer lattice noise and periodic motifs never require a random source.
function noise(x,y,seed){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(seed|0,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295}
const fract=x=>x-Math.floor(x),tau=2*Math.PI;
function heightAt(u,v,t){
 const n=Math.max(1,Math.round(t.scale*4)),x=fract(u),y=fract(v),g=noise(Math.floor(x*128)%128,Math.floor(y*128)%128,t.seed),s=(a,b)=>Math.sin(tau*(a*x+b*y)),fine=s(n*9,0)*.5+.5;
 switch(t.pattern){
 case 'plain':return .5;
 case 'brushed':return .5+.18*s(0,n*17)+.09*s(0,n*31)+.10*(noise(0,Math.floor(y*256)%256,t.seed)-.5);
 case 'wood':return .5+.27*Math.sin(tau*(n*3*y+.19*s(n,1)+.09*s(n*2,0)))+.10*s(n*5,1);
 case 'woven':return .5+.26*s(n*8,0)*s(0,n*8)+.09*(fine-.5);
 case 'scratches':return .52-.32*Math.pow(Math.max(0,s(n*3,n*11)),32)+.05*(g-.5);
 case 'edge-wear':return .5+.26*Math.pow(Math.abs(s(n,0)*s(0,n)),12)+.08*(g-.5);
 case 'ceramic':return .5+.06*s(n*3,n*2)+.12*(g-.5);
 case 'dirt':return .53-.20*Math.max(0,s(n,2)*s(2,n))+.10*(g-.5);
 case 'paint':return .5+.09*s(n*2,n*3)+.06*(g-.5);
 case 'panel':return .53+.19*s(0,n*12)+.10*s(n*6,0);
 case 'stone':return .5+.24*Math.sin(tau*(n*x+n*y+.34*s(n,1)))+.12*(g-.5);
 case 'paper':return .5+.08*s(n*4,0)+.08*(g-.5);
 case 'leather':return .5+.15*s(n*7,n*3)*s(n*2,n*8)+.10*(g-.5);
 default:throw Error('unsupported pattern');
 }}
const write=(a,i,r,g=r,b=r)=>{a[i]=r;a[i+1]=g;a[i+2]=b;a[i+3]=255};
export function generateTexture(t){
 // Revalidate all public inputs before allocation; normalize defaults via material contract.
 const normalized=resolveMaterial({preset:'matte-plastic',texture:t},'three').texture,n=normalized.resolution,size=n*n*4,base=new Uint8Array(size),roughness=new Uint8Array(size),normal=normalized.normal?new Uint8Array(size):null,occlusion=normalized.occlusion?new Uint8Array(size):null;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=x/(n-1),v=y/(n-1),i=(y*n+x)*4,h=heightAt(u,v,normalized),d=(h-.5)*normalized.strength;
  write(base,i,Math.round(255*clamp(.88+d*.50)));write(roughness,i,Math.round(255*clamp(.90+d*.48,.55,1)));
  if(occlusion)write(occlusion,i,Math.round(255*clamp(1-Math.max(0,-d)*.65)));
  if(normal){const du=(heightAt(u+1/n,v,normalized)-heightAt(u-1/n,v,normalized))*normalized.strength*1.5,dv=(heightAt(u,v+1/n,normalized)-heightAt(u,v-1/n,normalized))*normalized.strength*1.5,l=Math.hypot(du,dv,1);write(normal,i,Math.round(127.5*(1-du/l)),Math.round(127.5*(1-dv/l)),Math.round(127.5*(1+1/l)))}
 }
 const maps={base,roughness,...(normal?{normal}:{}),...(occlusion?{occlusion}:{})},digests=Object.fromEntries(Object.entries(maps).map(([k,v])=>[k,sha256(v)]));
 return {key:textureKey(normalized),digest:hashObject(digests),digests,resolution:n,colorSpaces:{base:'srgb',roughness:'linear',normal:'linear',occlusion:'linear'},bytes:textureBytes(normalized),maps};
}
export function createTextureCache(budget=TEXTURE_BUDGET){number(budget,1,TEXTURE_BUDGET);const cache=new Map();let bytes=0;return {get(t){const key=textureKey(t);if(cache.has(key)){const x=cache.get(key);cache.delete(key);cache.set(key,x);return x}const need=textureBytes(t);if(need>budget)throw Error('texture cache budget');while(bytes+need>budget){const k=cache.keys().next().value;bytes-=cache.get(k).bytes;cache.delete(k)}const x=generateTexture(t);cache.set(key,x);bytes+=x.bytes;return x},stats:()=>({entries:cache.size,bytes}),clear(){cache.clear();bytes=0}}}
export const srgbToLinear=x=>{x=clamp(x);return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)};
export const linearToSrgb=x=>{x=clamp(x);return x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055};
export const linearColor=hex=>[1,3,5].map(i=>srgbToLinear(parseInt(hex.slice(i,i+2),16)/255));
export function sampleMap(map,n,u,v){if(!map)return 1;const x=fract(u)*(n-1),y=fract(v)*(n-1),ix=Math.floor(x),iy=Math.floor(y),dx=x-ix,dy=y-iy,i=(iy*n+ix)*4,j=(Math.min(iy+1,n-1)*n+ix)*4,k=Math.min(1,n-1-ix)*4;return ((map[i]*(1-dx)+map[i+k]*dx)*(1-dy)+(map[j]*(1-dx)+map[j+k]*dx)*dy)/255}
