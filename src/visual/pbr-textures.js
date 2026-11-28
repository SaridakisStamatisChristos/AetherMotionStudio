// GPU-03 capability 'proc-texture-v1' (GPU Cinematic only; procedural only, owner 2026-11-28): which Foundry texture
// recipe each pbr-v1 part and the floor get, and box-projected UVs so a texture has the same size on every object.
// Textures come from the Foundry generator (src/foundry/materials.js generateTexture: seeded, versioned, digested) and
// its budgeted cache; no second registry, no files, no network. A recipe is {pattern, scale, strength, normal, seed,
// resolution}; null means "no texture" (glass, skin, leaves, glowing parts keep their pbr-v1 look).
import {resolveMaterial,TEXTURE_PATTERNS} from '../foundry/materials.js';
export const TEXTURES_VERSION='proc-v1';
export const TEXTURE_RESOLUTION=512;
// Repeat length in metres: one texture tile covers this much surface on parts and on the floor.
// Tuning (agent stills, owner taste: calm): wood grain at full strength with bump read as basket weave and the floor
// at 1.2 m tiles repeated visibly, so wood has no normal map, strengths are moderate and the floor tile is 2.4 m.
export const PART_TILE=.6,FLOOR_TILE=2.4;
// The floor plane is 120 m wide with 0–1 UVs, so its textures repeat 120 / FLOOR_TILE times.
export const FLOOR_SIZE=120,FLOOR_REPEAT=FLOOR_SIZE/FLOOR_TILE;
// The Foundry base map averages about 0.88 (generateTexture: 0.88 + detail); the material colour is lifted by 1/0.88
// so a textured part keeps its mean colour. Normal maps at a gentle 0.6; anisotropic filtering up to 4×.
export const TEXTURE_BASE_MEAN=.88,TEXTURE_NORMAL_SCALE=.6,TEXTURE_ANISOTROPY=4;
const R=(pattern,strength,seed,normal=true,scale=1)=>Object.freeze({pattern,scale,strength,normal,occlusion:false,seed,resolution:TEXTURE_RESOLUTION});
export const SURFACE_TEXTURES=Object.freeze({
 wood:R('wood',.4,301,false),metal:R('brushed',.45,302),fabric:R('woven',.5,303,true,2),stone:R('stone',.5,304),
 ceramic:R('ceramic',.3,305,false),plastic:R('paint',.25,306,false),glass:null,skin:null,matte:null});
// Part-specific recipes that do not change the pbr-v1 surface: tree trunks (catalog colour slot 5) get bark.
export const PART_TEXTURES=Object.freeze({'tree:5':R('bark',.6,307)});
// Floor recipe by the shot's light preset (GPU-02); without lights, by the environment's auto preset. The wood pattern
// (a pure wave) read as repeating stripes over the large floor, so warm interiors use the calm concrete-type 'dirt' too.
export const FLOOR_TEXTURES=Object.freeze({'neutral-studio-v1':R('dirt',.35,311),'night-v1':R('dirt',.3,312),'warm-interior-v1':R('dirt',.3,313),'forest-daylight-v1':R('ground',.6,314),'scientific-dark-v1':R('panel',.25,315,false)});
// The Foundry's own validation of a recipe (throws on any out-of-range or unknown value); returns the normalized recipe.
export function validateRecipe(r){if(r===null)return null;return resolveMaterial({preset:'matte-plastic',texture:r},'three').texture;}
for(const r of [...Object.values(SURFACE_TEXTURES),...Object.values(PART_TEXTURES),...Object.values(FLOOR_TEXTURES)])if(r){validateRecipe(r);if(!TEXTURE_PATTERNS.includes(r.pattern))throw Error('unknown pattern '+r.pattern);}
export function partTexture(surface,key){
 if(surface==='emissive')return null;
 if(key){const special=PART_TEXTURES[key.family+':'+key.slot];if(special)return special;}
 return SURFACE_TEXTURES[surface]??null;
}
export function floorTexture(lightPresetId){return FLOOR_TEXTURES[lightPresetId]??FLOOR_TEXTURES['neutral-studio-v1'];}
// Box projection: each vertex takes the plane facing its normal's dominant axis, in metres divided by the tile length.
// positions are real-size local coordinates (no scale in the mesh matrix), so texel density is equal on all parts.
export function boxUV(positions,normals,tile){
 if(!(positions?.length>=3)||positions.length%3||normals?.length!==positions.length)throw Error('boxUV: positions and normals must be xyz triples of equal length');
 if(typeof tile!=='number'||!Number.isFinite(tile)||tile<=0)throw Error('boxUV: tile must be a positive number');
 const n=positions.length/3,uv=new Float32Array(n*2);
 for(let i=0;i<n;i++){const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2],ax=Math.abs(normals[i*3]),ay=Math.abs(normals[i*3+1]),az=Math.abs(normals[i*3+2]);
  let u,v;if(ax>=ay&&ax>=az){u=z;v=y;}else if(ay>=az){u=x;v=z;}else{u=x;v=y;}
  uv[i*2]=u/tile;uv[i*2+1]=v/tile;}
 return uv;
}
