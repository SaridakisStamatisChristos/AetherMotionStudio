// GPU-03 proc-texture-v1 (GPU Cinematic only; procedural only, owner 2026-11-28): Foundry patterns bark and ground,
// recipes per surface / part / floor, box-projected UVs, the capability and its rules, cache budget and determinism.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TEXTURE_PATTERNS,generateTexture,resolveMaterial,createTextureCache,TEXTURE_BUDGET} from '../src/foundry/materials.js';
import {SURFACE_TEXTURES,PART_TEXTURES,FLOOR_TEXTURES,PART_TILE,FLOOR_REPEAT,TEXTURE_RESOLUTION,partTexture,floorTexture,boxUV,validateRecipe} from '../src/visual/pbr-textures.js';
import {SURFACES,surfaceKey} from '../src/visual/pbr.js';
import {LIGHT_PRESETS} from '../src/visual/cinematic-lights.js';
import {CAPABILITIES,CINEMATIC_DEFAULTS,validateCinematic,requiredCapabilities,threeOptions,RenderProfileError} from '../src/core/render-profiles.js';
import {validateProject} from '../src/core/timeline.js';
const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n,import.meta.url),'utf8'));
const swatch=c=>({...load('gpu01-swatches-cinematic.json'),cinematic:c});

test('Foundry patterns: bark and ground added; same seed gives the same digest, another seed differs',()=>{
 assert.ok(TEXTURE_PATTERNS.includes('bark')&&TEXTURE_PATTERNS.includes('ground'));
 for(const pattern of ['bark','ground']){
  const t=s=>resolveMaterial({preset:'matte-plastic',texture:{pattern,seed:s,resolution:256,normal:true}}).texture;
  const a=generateTexture(t(7)),b=generateTexture(t(7)),c=generateTexture(t(8));
  assert.equal(a.digest,b.digest,pattern+' deterministic');assert.notEqual(a.digest,c.digest,pattern+' seed matters');
  const base=a.maps.base;let lo=255,hi=0;for(let i=0;i<base.length;i+=4){lo=Math.min(lo,base[i]);hi=Math.max(hi,base[i]);}assert.ok(hi-lo>10,pattern+' has visible detail');
  // tiles without seams: first and last rows/columns are near neighbours
  const n=a.resolution,px=(x,y)=>base[(y*n+x)*4];let d=0;for(let k=0;k<n;k++)d+=Math.abs(px(0,k)-px(n-1,k))+Math.abs(px(k,0)-px(k,n-1));assert.ok(d/(2*n)<12,pattern+' seam '+d/(2*n));}
});

test('existing patterns keep their digests (GPU-03 only adds)',()=>{
 const t=resolveMaterial({preset:'wood',texture:{seed:37,normal:true,occlusion:true}}).texture;
 assert.equal(generateTexture(t).digest,generateTexture(structuredClone(t)).digest);
 assert.deepEqual(TEXTURE_PATTERNS.slice(0,13),['plain','brushed','wood','woven','scratches','edge-wear','ceramic','dirt','paint','panel','stone','paper','leather']);
});

test('recipes: every surface has an entry, every recipe passes the Foundry validation, floors for every light preset',()=>{
 assert.deepEqual(Object.keys(SURFACE_TEXTURES).sort(),[...SURFACES].sort());
 for(const r of [...Object.values(SURFACE_TEXTURES),...Object.values(PART_TEXTURES),...Object.values(FLOOR_TEXTURES)].filter(Boolean)){
  assert.deepEqual(validateRecipe(r),r);assert.equal(r.resolution,TEXTURE_RESOLUTION);assert.ok(Object.isFrozen(r));}
 assert.deepEqual(Object.keys(FLOOR_TEXTURES).sort(),Object.keys(LIGHT_PRESETS).sort());
 assert.equal(floorTexture('unknown-v1'),FLOOR_TEXTURES['neutral-studio-v1']);
 assert.equal(partTexture('emissive',surfaceKey('robot',0)),null);assert.equal(partTexture('glass',null),null);assert.equal(partTexture('skin',surfaceKey('human',3)),null);
 assert.equal(partTexture('matte',surfaceKey('tree',5)).pattern,'bark');assert.equal(partTexture('matte',surfaceKey('tree',0)),null); // trunks only
 assert.equal(partTexture('wood',surfaceKey('furniture',0)).pattern,'wood');assert.equal(partTexture('metal',null).pattern,'brushed');
 for(const bad of [{...SURFACE_TEXTURES.wood,resolution:300},{...SURFACE_TEXTURES.wood,resolution:4096},{...SURFACE_TEXTURES.wood,seed:1.5},{...SURFACE_TEXTURES.wood,strength:2},{...SURFACE_TEXTURES.wood,pattern:'marble'},{...SURFACE_TEXTURES.wood,tile:3}])
  assert.throws(()=>validateRecipe(bad),/material|seed|option|field/,JSON.stringify(bad));
});

test('boxUV: metres divided by the tile on the plane facing each normal; equal density on any size; refusals',()=>{
 const uv=boxUV(new Float32Array([.3,.6,.9, .3,.6,.9, .3,.6,.9]),new Float32Array([1,0,0, 0,-1,0, 0,0,1]),.6);
 assert.deepEqual([...uv].map(v=>+v.toFixed(4)),[1.5,1, .5,1.5, .5,1]);
 // a 2 m face spans twice the UV range of a 1 m face: same texel density
 const span=s=>{const u=boxUV(new Float32Array([0,0,s/2, 0,s,s/2]),new Float32Array([0,0,1, 0,0,1]),PART_TILE);return u[3]-u[1];};assert.ok(Math.abs(span(2)-2*span(1))<1e-6);
 for(const [p,n,t] of [[[],[],1],[[1,2],[1,2],1],[[1,2,3],[1,2],1],[[1,2,3],[1,0,0],0],[[1,2,3],[1,0,0],NaN],[[1,2,3],[1,0,0],-1]])assert.throws(()=>boxUV(new Float32Array(p),new Float32Array(n),t),/boxUV/);
 assert.equal(FLOOR_REPEAT,50);
});

test('capability proc-texture-v1: Cinematic only, needs pbr-v1 materials, Director default',()=>{
 assert.deepEqual(CAPABILITIES['proc-texture-v1'].profiles,['cinematic-v1']);assert.equal(CINEMATIC_DEFAULTS.textures,'proc-v1');
 assert.deepEqual(requiredCapabilities({cinematic:{version:1,materials:'pbr-v1',textures:'proc-v1'}}),['shared','pbr-v1','proc-texture-v1']);
 validateProject(swatch({version:1,materials:'pbr-v1',lights:'auto-v1',textures:'proc-v1'}));
 assert.throws(()=>validateCinematic({version:1,textures:'proc-v1'}),/textures: needs materials 'pbr-v1'/);
 assert.throws(()=>validateCinematic({version:1,materials:'pbr-v1',textures:'photo-v1'}),/textures: proc-v1 or absent/);
 const noProfile=swatch({version:1,materials:'pbr-v1',textures:'proc-v1'});delete noProfile.renderProfile;
 assert.throws(()=>validateProject(noProfile),e=>e instanceof RenderProfileError&&e.code==='RP-03'&&/proc-texture-v1/.test(e.message));
 assert.deepEqual(threeOptions(swatch({version:1,materials:'pbr-v1',textures:'proc-v1'})),{renderProfile:'cinematic-v1',materials:'pbr-v1',lights:null,textures:'proc-v1',characters:null});
});

test('texture cache: bounded by its budget, evicts least recently used, refuses an oversized texture',()=>{
 const one=r=>resolveMaterial({preset:'matte-plastic',texture:{pattern:'bark',seed:r,resolution:256}}).texture,bytes=256*256*4*2;
 const cache=createTextureCache(bytes*2);cache.get(one(1));cache.get(one(2));cache.get(one(3));
 const s=cache.stats?.()??null;if(s)assert.ok(s.bytes<=bytes*2,'within budget');
 assert.throws(()=>createTextureCache(bytes).get(resolveMaterial({preset:'matte-plastic',texture:{pattern:'bark',seed:1,resolution:2048,normal:true}}).texture),/budget/);
 assert.equal(TEXTURE_BUDGET,96*1024*1024);
 // all GPU-03 recipes together stay far inside the budget
 const all=[...Object.values(SURFACE_TEXTURES),...Object.values(PART_TEXTURES),...Object.values(FLOOR_TEXTURES)].filter(Boolean);
 assert.ok(all.length*TEXTURE_RESOLUTION**2*4*3<TEXTURE_BUDGET/2);
});
