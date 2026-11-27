// GPU-02 capability 'env-light-v1' (GPU Cinematic only; ADR-001): lighting presets for the Three.js backend.
// A preset is data: a sky/ground hemisphere fill, a shadow-casting key, a soft fill from the camera side (new in
// Cinematic: GPU Standard has none, so the far side of faces went dark), a rim/back light, the share of the studio-room
// reflections (pbr-v1 materials) and an exposure factor. Colour 'env' means "this environment's own key or rim colour",
// so laboratory, midnight and amber keep their identity. 'auto-v1' picks a preset per shot from the environment.
// Contact shadows and ambient occlusion need a post-processing pass and belong to GPU-08 (not here).
import {LIGHT_PRESET_IDS} from '../core/render-profiles.js';
export const LIGHTS_VERSION='env-light-v1';
const P=o=>Object.freeze(Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v&&typeof v==='object'&&!Array.isArray(v)?Object.freeze(v):v])));
// Values: the owner chose the 'stronger' variant (2026-11-28, UI choice over Standard / subtle / stronger stills): key x1.35,
// hemisphere x0.6, fill x0.75, rim x1.5 relative to the first draft. Clearer modelling and figure separation, still calm.
export const LIGHT_PRESETS=Object.freeze({
 'neutral-studio-v1':P({hemi:{sky:'#dfe8f2',ground:'#3a3632',intensity:0.78},key:{color:'env',intensity:4.59,dir:[-3,6,5]},fill:{color:'#cfd8e6',intensity:0.68,dir:[4,2.5,6]},rim:{color:'env',intensity:3.60,dir:[3,4,-5]},environment:1,exposure:1}),
 'warm-interior-v1':P({hemi:{sky:'#ffe2c4',ground:'#3b2a22',intensity:0.72},key:{color:'#ffd2a0',intensity:4.59,dir:[-3,5,4]},fill:{color:'#ffe9d2',intensity:0.52,dir:[4,2,5]},rim:{color:'#9fc8ff',intensity:2.70,dir:[3,4,-5]},environment:.9,exposure:1}),
 'forest-daylight-v1':P({hemi:{sky:'#cfe6ff',ground:'#4a5a2e',intensity:0.96},key:{color:'#fff4dc',intensity:5.13,dir:[-2,7,3]},fill:{color:'#d8f0d0',intensity:0.45,dir:[4,2,5]},rim:{color:'#fff0c8',intensity:2.40,dir:[2,4,-6]},environment:1.1,exposure:1}),
 'night-v1':P({hemi:{sky:'#7f8fc8',ground:'#1c1a2c',intensity:0.60},key:{color:'env',intensity:3.51,dir:[-3,6,5]},fill:{color:'#8a9cff',intensity:0.45,dir:[4,2,6]},rim:{color:'env',intensity:4.50,dir:[3,4,-5]},environment:.8,exposure:1}),
 'scientific-dark-v1':P({hemi:{sky:'#9fb6cc',ground:'#101820',intensity:0.48},key:{color:'#e8f4ff',intensity:4.05,dir:[-2,6,4]},fill:{color:'#7fd4ff',intensity:0.38,dir:[4,2,5]},rim:{color:'#6bdaef',intensity:4.80,dir:[3,4,-5]},environment:1,exposure:1})});
// 'auto-v1': the shot environment (src/core/graph.js ENVIRONMENTS) → preset. Unknown environments use the studio.
export const AUTO_LIGHTS=Object.freeze({laboratory:'neutral-studio-v1',midnight:'night-v1',amber:'warm-interior-v1'});
// Shadow map of the key light in Cinematic (GPU Standard keeps 1024): finer, less blocky edges on character limbs.
export const CINEMATIC_SHADOW=Object.freeze({mapSize:2048,normalBias:.02});
export const LIGHT_RANGES=Object.freeze({intensity:[0,8],hemi:[0,4],environment:[0,3],exposure:[.5,1.5]});
const HEX=/^#[0-9a-f]{6}$/i;
function finite(v,[lo,hi],p){if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error(p+': finite number in '+lo+'…'+hi+' required');}
function light(x,p,envColor){
 if(!x||typeof x!=='object')throw Error(p+': object required');
 for(const k of Object.keys(x))if(!['color','intensity','dir'].includes(k))throw Error(p+'.'+k+': unknown field');
 if(!(HEX.test(x.color)||(envColor&&x.color==='env')))throw Error(p+'.color: #rrggbb'+(envColor?" or 'env'":'')+' required');
 finite(x.intensity,LIGHT_RANGES.intensity,p+'.intensity');
 if(!Array.isArray(x.dir)||x.dir.length!==3)throw Error(p+'.dir: [x,y,z] required');
 x.dir.forEach((v,i)=>finite(v,[-20,20],p+'.dir['+i+']'));if(Math.hypot(...x.dir)<.5)throw Error(p+'.dir: too short');
 if(x.dir[1]<=0)throw Error(p+'.dir: lights come from above the floor');
}
export function validateLightPreset(x,p='preset'){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error(p+': object required');
 for(const k of Object.keys(x))if(!['hemi','key','fill','rim','environment','exposure'].includes(k))throw Error(p+'.'+k+': unknown field');
 const h=x.hemi;if(!h||!HEX.test(h.sky)||!HEX.test(h.ground))throw Error(p+'.hemi: sky and ground #rrggbb required');finite(h.intensity,LIGHT_RANGES.hemi,p+'.hemi.intensity');
 light(x.key,p+'.key',true);light(x.fill,p+'.fill',false);light(x.rim,p+'.rim',true);
 finite(x.environment,LIGHT_RANGES.environment,p+'.environment');finite(x.exposure,LIGHT_RANGES.exposure,p+'.exposure');
 return x;
}
for(const [k,v] of Object.entries(LIGHT_PRESETS))validateLightPreset(v,'LIGHT_PRESETS.'+k);
// The preset a shot uses: an explicit preset everywhere, or auto-v1 by environment name.
export function lightPresetFor(lights,environmentName){
 if(!LIGHT_PRESET_IDS.includes(lights))throw Error('unknown light preset '+String(lights));
 const id=lights==='auto-v1'?(AUTO_LIGHTS[environmentName]??'neutral-studio-v1'):lights;
 return {id,preset:LIGHT_PRESETS[id]};
}
// Concrete colours for one environment (resolves 'env').
export function resolveLights(preset,env){
 const c=(x,which)=>x.color==='env'?env[which]:x.color;
 return {hemi:preset.hemi,key:{...preset.key,color:c(preset.key,'key')},fill:preset.fill,rim:{...preset.rim,color:c(preset.rim,'rim')},environment:preset.environment,exposure:preset.exposure};
}
