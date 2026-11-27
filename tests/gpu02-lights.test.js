// GPU-02 env-light-v1 (GPU Cinematic only): lighting presets as validated data, auto choice by environment, the
// capability and its negotiation, and the renderer options. Pixels are covered by the native renders.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LIGHT_PRESETS,AUTO_LIGHTS,CINEMATIC_SHADOW,LIGHT_RANGES,validateLightPreset,lightPresetFor,resolveLights} from '../src/visual/cinematic-lights.js';
import {LIGHT_PRESET_IDS,CAPABILITIES,CINEMATIC_DEFAULTS,validateCinematic,requiredCapabilities,threeOptions,RenderProfileError} from '../src/core/render-profiles.js';
import {ENVIRONMENTS} from '../src/core/graph.js';
import {validateProject} from '../src/core/timeline.js';
import {request} from '../src/director/schema.js';
const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n,import.meta.url),'utf8'));
const release=load('release.request.json');
const lit=lights=>({...load('gpu01-swatches-cinematic.json'),cinematic:{version:1,materials:'pbr-v1',lights}});

test('presets: one per id (except auto), frozen, inside the documented ranges',()=>{
 assert.deepEqual(Object.keys(LIGHT_PRESETS).sort(),LIGHT_PRESET_IDS.filter(x=>x!=='auto-v1').sort());
 for(const [k,p] of Object.entries(LIGHT_PRESETS)){assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.key));validateLightPreset(p,k);
  assert.ok(p.key.intensity>p.fill.intensity,k+': key stronger than fill (modelling)');assert.ok(p.key.dir[1]>0&&p.rim.dir[2]<0,k+': key from above, rim from behind');}
 assert.deepEqual(CINEMATIC_SHADOW,{mapSize:2048,normalBias:.02});
});

test('validateLightPreset refuses non-finite, out-of-range, unknown and impossible lights',()=>{
 const ok=structuredClone(LIGHT_PRESETS['neutral-studio-v1']);
 const bad=f=>{const x=structuredClone(ok);f(x);return x;};
 for(const [f,re] of [[x=>x.key.intensity=NaN,/key.intensity/],[x=>x.key.intensity=9,/key.intensity/],[x=>x.hemi.intensity=-1,/hemi.intensity/],
  [x=>x.fill.color='env',/fill.color/],[x=>x.key.color='red',/key.color/],[x=>x.rim.dir=[0,0,0],/rim.dir/],[x=>x.key.dir=[1,-2,1],/above the floor/],
  [x=>x.key.dir=[1,2],/key.dir/],[x=>x.environment=4,/environment/],[x=>x.exposure=0,/exposure/],[x=>x.spot={},/unknown field/],[x=>x.key.angle=1,/unknown field/],[x=>x.hemi.sky='#fff',/hemi/]])
  assert.throws(()=>validateLightPreset(bad(f)),re,String(f));
 for(const x of [null,[],'night'])assert.throws(()=>validateLightPreset(x),/object required/);
});

test('auto-v1: every environment maps to a preset; explicit presets apply everywhere; unknown ids refused',()=>{
 assert.deepEqual(Object.keys(AUTO_LIGHTS).sort(),Object.keys(ENVIRONMENTS).sort());
 assert.equal(lightPresetFor('auto-v1','laboratory').id,'neutral-studio-v1');assert.equal(lightPresetFor('auto-v1','midnight').id,'night-v1');assert.equal(lightPresetFor('auto-v1','amber').id,'warm-interior-v1');
 assert.equal(lightPresetFor('auto-v1',null).id,'neutral-studio-v1');assert.equal(lightPresetFor('forest-daylight-v1','midnight').id,'forest-daylight-v1');
 for(const x of ['auto','studio',null,undefined,'__proto__'])assert.throws(()=>lightPresetFor(x,'laboratory'),/unknown light preset/);
});

test("'env' colours follow the environment (identity kept); explicit colours stay",()=>{
 const n=resolveLights(LIGHT_PRESETS['night-v1'],ENVIRONMENTS.midnight);assert.equal(n.key.color,ENVIRONMENTS.midnight.key);assert.equal(n.rim.color,ENVIRONMENTS.midnight.rim);
 const w=resolveLights(LIGHT_PRESETS['warm-interior-v1'],ENVIRONMENTS.amber);assert.equal(w.key.color,'#ffd2a0');assert.equal(w.fill.color,LIGHT_PRESETS['warm-interior-v1'].fill.color);
 assert.equal(LIGHT_PRESETS['night-v1'].key.color,'env'); // input not modified
});

test('capability env-light-v1: Cinematic only, derived from cinematic.lights, refused without the profile',()=>{
 assert.deepEqual(CAPABILITIES['env-light-v1'].profiles,['cinematic-v1']);
 assert.deepEqual(requiredCapabilities({cinematic:{version:1,lights:'night-v1'}}),['shared','env-light-v1']);
 assert.deepEqual(requiredCapabilities({cinematic:{version:1,materials:'pbr-v1',lights:'auto-v1'}}),['shared','pbr-v1','env-light-v1']);
 for(const id of LIGHT_PRESET_IDS)validateProject(lit(id));
 assert.throws(()=>validateCinematic({version:1,lights:'night'}),/lights: auto-v1/);
 const noProfile=lit('night-v1');delete noProfile.renderProfile;
 assert.throws(()=>validateProject(noProfile),e=>e instanceof RenderProfileError&&e.code==='RP-03'&&/env-light-v1, which gpu-standard does not support/.test(e.message));
});

test('Director defaults and renderer options carry the lights; GPU Standard gets none',()=>{
 assert.equal(CINEMATIC_DEFAULTS.lights,'auto-v1');
 assert.equal(request({...release,backend:'three',renderProfile:'cinematic-v1'}).cinematic.lights,'auto-v1');
 assert.equal(request({...release,backend:'three',renderProfile:'cinematic-v1',cinematic:{version:1,lights:'forest-daylight-v1'}}).cinematic.lights,'forest-daylight-v1');
 assert.deepEqual(threeOptions(lit('night-v1')),{renderProfile:'cinematic-v1',materials:'pbr-v1',lights:'night-v1'});
 assert.deepEqual(threeOptions(load('art05-workshop-three-polished.json')),{});
 for(const [k,[lo,hi]] of Object.entries(LIGHT_RANGES))assert.ok(lo<hi,k);
});
