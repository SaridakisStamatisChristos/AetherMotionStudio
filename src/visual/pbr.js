// GPU-01 capability 'pbr-v1' (GPU Cinematic only; ADR-001). Physically based material presets for the Three.js
// backend, chosen automatically for every part of every film from data the catalog already has, so the look
// generalizes with no per-film tuning:
//   emissive parts stay emissive; crafted part roles (glass, metal: src/visual/crafted.js partRole) keep their role;
//   every other part gets its recipe family's surface (FAMILY_SURFACE), people's skin slot gets 'skin';
//   parts with no family (set walls, backdrops, Foundry/assembly parts that do not carry it) get 'matte'.
// Colour contract (same as GPU Standard): authored colours are sRGB hex; three converts them to linear for shading;
// output is sRGB with ACES filmic tone mapping and the Standard exposure formula. Presets never change a colour's hue:
// they change only how light interacts with it (roughness, metalness, clearcoat, sheen).
// Transparency: pbr-v1 never uses transmission. The catalog's glass parts are dark screens, visors and windows drawn as
// thin slabs, so v1 glass is an opaque, low-roughness, clearcoated dielectric that reflects the environment. This keeps
// sorting and clipping exactly as in Standard (no transparent sorting, no extra transmission pass).
import {mixColor} from './crafted.js';
export const PBR_VERSION='pbr-v1';
// Bounded, physically plausible ranges; every preset value must lie inside (validatePreset, tested).
export const PRESET_RANGES=Object.freeze({roughness:[.04,1],metalness:[0,1],clearcoat:[0,1],clearcoatRoughness:[0,1],sheen:[0,1],sheenRoughness:[0,1],ior:[1,2.333],specularIntensity:[0,1],envMapIntensity:[0,8]});
// envMapIntensity multiplies PBR_LIGHT.environmentIntensity (scene-wide, low so painted surfaces are not washed out).
// Metals have no diffuse colour, so their reflection share can be large without lightening anything else; at 1 they read
// almost black (gpu01-swatches-r1, gearbox and wrench). Glass is a dark dielectric: its share only adds reflections.
const P=o=>Object.freeze(o);
export const PBR_PRESETS=Object.freeze({
 metal:P({roughness:.3,metalness:1,clearcoat:0,clearcoatRoughness:0,sheen:0,sheenRoughness:0,ior:1.5,specularIntensity:1,envMapIntensity:6}),
 glass:P({roughness:.06,metalness:0,clearcoat:1,clearcoatRoughness:.04,sheen:0,sheenRoughness:0,ior:1.5,specularIntensity:1,envMapIntensity:3}),
 wood:P({roughness:.62,metalness:0,clearcoat:.25,clearcoatRoughness:.45,sheen:0,sheenRoughness:0,ior:1.5,specularIntensity:.5,envMapIntensity:.8}),
 fabric:P({roughness:.92,metalness:0,clearcoat:0,clearcoatRoughness:0,sheen:.35,sheenRoughness:.65,ior:1.45,specularIntensity:.25,envMapIntensity:.6}),
 plastic:P({roughness:.38,metalness:0,clearcoat:.35,clearcoatRoughness:.22,sheen:0,sheenRoughness:0,ior:1.46,specularIntensity:.6,envMapIntensity:.9}),
 ceramic:P({roughness:.2,metalness:0,clearcoat:.85,clearcoatRoughness:.08,sheen:0,sheenRoughness:0,ior:1.5,specularIntensity:.8,envMapIntensity:1}),
 stone:P({roughness:.86,metalness:0,clearcoat:0,clearcoatRoughness:0,sheen:0,sheenRoughness:0,ior:1.55,specularIntensity:.35,envMapIntensity:.6}),
 skin:P({roughness:.62,metalness:0,clearcoat:0,clearcoatRoughness:0,sheen:.25,sheenRoughness:.5,ior:1.4,specularIntensity:.35,envMapIntensity:.6}),
 matte:P({roughness:.78,metalness:0,clearcoat:0,clearcoatRoughness:0,sheen:0,sheenRoughness:0,ior:1.5,specularIntensity:.4,envMapIntensity:.7})});
export const SURFACES=Object.freeze(Object.keys(PBR_PRESETS));
// Recipe family → surface. Families not listed are machines, devices and diagrams: painted 'plastic'.
export const FAMILY_SURFACE=Object.freeze({wall:'matte',furniture:'wood',shelf:'wood',human:'fabric',case:'fabric',vessel:'ceramic',
 building:'stone',tower:'stone',arena:'stone',bridge:'stone',terrain:'stone',tree:'matte',plant:'matte',book:'matte',tool:'metal',motor:'metal'});
// People's skin is catalog colour slot 3 (src/visual/catalog.js primitive palette '#e9ddd0' unless a recipe overrides it).
const SKIN_SLOT=3;
// The image light (a procedural studio room, three/examples RoomEnvironment through PMREM: no file, no network) is
// attached to pbr-v1 materials only, at environmentIntensity × each preset's envMapIntensity. The floor plane and
// glowing parts are not pbr-v1 parts and get none, so the room does not wash the ground out (gpu01 tuning stills).
// ambientScale: the hemisphere light reduction that keeps overall brightness near GPU Standard.
// exposure: one factor on the Standard exposure formula. Fully dielectric presets (metalness 0) reflect more diffuse
// light than Standard's slightly metallic default material, so without it Cinematic frames read 17–21 % brighter
// (mean luma of the picture band, tuning stills). The tone mapping (ACES filmic) and output (sRGB) are unchanged.
export const PBR_LIGHT=Object.freeze({environmentIntensity:.12,roomBlur:.04,ambientScale:.75,exposure:.84});
const keys=new Map();
// Compact per-part key passed by the catalog (family and colour slot), interned so drawing allocates nothing new.
export function surfaceKey(family,slot){if(!family)return null;const k=family+':'+slot;let v=keys.get(k);if(!v){v=Object.freeze({family,slot});keys.set(k,v);}return v;}
export function surfaceFor(key,role,emissive){
 if(emissive)return 'emissive';
 if(role==='glass'||role==='metal')return role;
 if(!key)return 'matte';
 // GPU-05: hero detail 4 eye-white and lip slots (7, 8) shade like skin, not fabric.
 if(key.family==='human'&&(key.slot===SKIN_SLOT||key.slot===7||key.slot===8))return 'skin';
 return FAMILY_SURFACE[key.family]??'plastic';
}
export function validatePreset(p,name='preset'){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error(name+': object required');
 for(const k of Object.keys(p))if(!Object.hasOwn(PRESET_RANGES,k))throw Error(name+'.'+k+': unknown field');
 for(const [k,[lo,hi]] of Object.entries(PRESET_RANGES)){const v=p[k];if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error(name+'.'+k+': must be a finite number in '+lo+'…'+hi);}
 if(p.metalness>0&&p.metalness<1)throw Error(name+'.metalness: 0 (dielectric) or 1 (metal) only');
 return p;
}
for(const [k,v] of Object.entries(PBR_PRESETS))validatePreset(v,'PBR_PRESETS.'+k);
// The MeshPhysicalMaterial parameters for one part (pure data, tested without WebGL). `color` is the sRGB hex the
// Standard path would use for the same part, so identity colours are kept. Exception, metals: a metal's colour is its
// reflectance, and the catalog paints metal parts dark (#253344 wrench, gearbox), which as real metal reflects almost
// nothing and reads black (gpu01-swatches-r1). A metal part is therefore brushed steel tinted by its colour
// (METAL_TINT: share of steel), so the hue survives as a tint, as crafted-v2's metal role already does.
export const METAL_TINT=Object.freeze({steel:'#c3c9d1',share:.6});
export function pbrParameters(surface,color){
 const p=PBR_PRESETS[surface];if(!p)throw Error('unknown pbr-v1 surface '+String(surface));
 if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))throw Error('pbr-v1 colour must be #rrggbb');
 const base=surface==='metal'?mixColor(color.toLowerCase(),METAL_TINT.steel,METAL_TINT.share):color;
 const {envMapIntensity,...rest}=p;return {...rest,envMapIntensity,color:base,sheenColor:base};
}
