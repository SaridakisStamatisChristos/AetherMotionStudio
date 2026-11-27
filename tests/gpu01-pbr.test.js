// GPU-01 pbr-v1 (GPU Cinematic only): presets, automatic surface choice for every catalog part, colour contract,
// the film-level cinematic block, capability negotiation and the matched GPU Standard vs Cinematic mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {PBR_PRESETS,PRESET_RANGES,SURFACES,FAMILY_SURFACE,PBR_LIGHT,surfaceKey,surfaceFor,validatePreset,pbrParameters} from '../src/visual/pbr.js';
import {emitRecipe,OBJECT_CATALOG} from '../src/visual/catalog.js';
import {validateProject} from '../src/core/timeline.js';
import {validateCinematic,requiredCapabilities,threeOptions,negotiate,CAPABILITIES,CINEMATIC_DEFAULTS,RenderProfileError} from '../src/core/render-profiles.js';
import {request} from '../src/director/schema.js';
import {productionId,standardVariant,normalizedScene,normalizedProject,matchedProject} from '../src/studio/production.js';
import {parseProduction} from '../scripts/production-options.mjs';
const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n,import.meta.url),'utf8'));
const swatches=()=>load('gpu01-swatches-cinematic.json');
const release=load('release.request.json');
const parts=id=>{const out=[];emitRecipe(id,(center,size,color,tf,lit=false,bias=0,role=null,detail=false,surface=null)=>out.push({color,lit,role,surface,kind:surfaceFor(surface,role,lit)}),{origin:[0,0,0],yaw:0,scale:1});return out;};

test('presets: every value finite and inside the documented physical ranges; metals are 0 or 1',()=>{
 assert.deepEqual(SURFACES,['metal','glass','wood','fabric','plastic','ceramic','stone','skin','matte']);
 for(const [k,p] of Object.entries(PBR_PRESETS)){assert.ok(Object.isFrozen(p));validatePreset(p,k);assert.deepEqual(Object.keys(p).sort(),Object.keys(PRESET_RANGES).sort());}
 assert.equal(PBR_PRESETS.metal.metalness,1);for(const k of SURFACES.filter(x=>x!=='metal'))assert.equal(PBR_PRESETS[k].metalness,0,k);
 assert.ok(PBR_PRESETS.glass.roughness<PBR_PRESETS.plastic.roughness&&PBR_PRESETS.plastic.roughness<PBR_PRESETS.wood.roughness&&PBR_PRESETS.wood.roughness<PBR_PRESETS.stone.roughness);
 for(const v of Object.values(PBR_LIGHT))assert.ok(Number.isFinite(v)&&v>=0&&v<=1);
});

test('validatePreset refuses non-finite, out-of-range, half-metal, unknown and non-object input',()=>{
 const ok={...PBR_PRESETS.plastic};
 for(const [k,v] of [['roughness',NaN],['roughness',Infinity],['roughness',-0.1],['roughness',0],['metalness',.5],['ior',.9],['ior',3],['clearcoat',2],['sheen','1'],['envMapIntensity',null]])
  assert.throws(()=>validatePreset({...ok,[k]:v}),new RegExp(k),k+'='+v);
 assert.throws(()=>validatePreset({...ok,transmission:1}),/unknown field/); // pbr-v1 never uses transmission
 for(const x of [null,[],'plastic',1])assert.throws(()=>validatePreset(x),/object required/);
});

test('surface choice: emissive, roles, families, people skin, unknown families and parts without a family',()=>{
 assert.equal(surfaceFor(surfaceKey('robot',0),'glass',true),'emissive');
 assert.equal(surfaceFor(surfaceKey('robot',4),'glass',false),'glass');assert.equal(surfaceFor(surfaceKey('screen',1),'metal',false),'metal');
 assert.equal(surfaceFor(surfaceKey('human',3),null,false),'skin');assert.equal(surfaceFor(surfaceKey('human',0),null,false),'fabric');
 assert.equal(surfaceFor(surfaceKey('furniture',0),null,false),'wood');assert.equal(surfaceFor(surfaceKey('vessel',0),null,false),'ceramic');
 assert.equal(surfaceFor(surfaceKey('terrain',0),null,false),'stone');assert.equal(surfaceFor(surfaceKey('screen',0),null,false),'plastic');
 assert.equal(surfaceFor(surfaceKey('no-such-family',0),null,false),'plastic');assert.equal(surfaceFor(null,null,false),'matte');
 assert.equal(surfaceKey(null,0),null);assert.equal(surfaceKey('human',3),surfaceKey('human',3)); // interned, no per-frame allocation
 for(const s of Object.values(FAMILY_SURFACE))assert.ok(SURFACES.includes(s));
});

test('every catalog object: every part carries its family, and resolves to a known surface',()=>{
 let total=0;
 for(const a of OBJECT_CATALOG.filter(x=>x.family!=='legacy')){const ps=parts(a.id);assert.ok(ps.length,a.id);
  for(const p of ps){total++;assert.ok(p.kind==='emissive'||SURFACES.includes(p.kind),a.id+' '+p.kind);
   if(p.surface)assert.equal(p.surface.family,a.family,a.id);}}
 assert.ok(total>2000,'parts checked '+total);
 const kinds=id=>new Set(parts(id).map(p=>p.kind));
 assert.ok(kinds('chair').has('wood'));assert.ok(kinds('mug').has('ceramic'));assert.ok(kinds('backpack').has('fabric'));assert.ok(kinds('rock-cluster').has('stone'));
 assert.ok(kinds('laptop').has('glass'));assert.ok(kinds('gearbox').has('metal'));assert.ok(kinds('scientist').has('skin')&&kinds('scientist').has('fabric'));
});

test('colour contract: sRGB hex in, linear for shading, the same sRGB hex back (no hue change)',()=>{
 assert.equal(THREE.ColorManagement.enabled,true);
 const grey=new THREE.Color('#808080');assert.ok(Math.abs(grey.r-0.2158605)<1e-6,'sRGB 0.502 → linear 0.2159');
 const swatch=['#000000','#ffffff','#808080','#e9ddd0','#162333','#8a6650','#7ebdd0','#c0392b','#2e86de','#f1c40f'];
 for(const surface of SURFACES)for(const c of swatch){
  const p=pbrParameters(surface,c),m=new THREE.MeshPhysicalMaterial((({envMapIntensity,...x})=>x)(p));
  assert.equal('#'+m.color.getHexString(THREE.SRGBColorSpace),c,surface+' '+c);assert.equal(p.color,c);m.dispose();}
 for(const bad of ['red','#fff','#gggggg','<script>',null,0x808080])assert.throws(()=>pbrParameters('plastic',bad),/#rrggbb/);
 assert.throws(()=>pbrParameters('gold','#808080'),/unknown pbr-v1 surface/);
});

test('cinematic block: versioned, closed, validated; capabilities derived from it',()=>{
 assert.deepEqual(validateCinematic({version:1,materials:'pbr-v1'}),{version:1,materials:'pbr-v1'});
 assert.deepEqual(validateCinematic({version:1}),{version:1});
 for(const [x,re] of [[null,/object required/],[[],/object required/],[{materials:'pbr-v1'},/version: 1 required/],[{version:2},/version/],[{version:1,materials:'pbr-v2'},/pbr-v1 or absent/],[{version:1,materials:1},/pbr-v1 or absent/],[{version:1,lights:'studio'},/unknown field/]])
  if(re)assert.throws(()=>validateCinematic(x),re,JSON.stringify(x));
 assert.deepEqual(requiredCapabilities({cinematic:{version:1,materials:'pbr-v1'}}),['shared','pbr-v1']);
 assert.deepEqual(requiredCapabilities({cinematic:{version:1}}),['shared']);
 assert.deepEqual(CAPABILITIES['pbr-v1'].profiles,['cinematic-v1']);assert.deepEqual(CINEMATIC_DEFAULTS,{version:1,materials:'pbr-v1'});
});

test('negotiation: pbr-v1 without the Cinematic profile is RP-03, never ignored or stripped',()=>{
 const p=swatches();assert.equal(validateProject(p),p);
 const noProfile=swatches();delete noProfile.renderProfile;
 assert.throws(()=>validateProject(noProfile),e=>e instanceof RenderProfileError&&e.code==='RP-03'&&/pbr-v1, which gpu-standard does not support/.test(e.message)&&/add renderProfile "cinematic-v1"/.test(e.message));
 assert.equal(noProfile.cinematic.materials,'pbr-v1');
 const cpu=swatches();delete cpu.renderProfile;for(const s of cpu.shots)s.backend='cpu';
 assert.throws(()=>validateProject(cpu),/RP-03.*pbr-v1, which cpu-classic does not support/s);
 const bad=swatches();bad.cinematic={version:1,materials:'pbr-v9'};assert.throws(()=>validateProject(bad),/film.cinematic.materials/);
 assert.equal(negotiate({renderProfile:'cinematic-v1',project:p}).capabilities.join(),'shared,pbr-v1');
});

test('renderer options: GPU Standard gets {} (v1.2 renderer), Cinematic gets exactly its features',()=>{
 assert.deepEqual(threeOptions(load('art05-workshop-three-polished.json')),{});
 assert.deepEqual(threeOptions({renderProfile:'cinematic-v1'}),{}); // no block: Standard pixels
 assert.deepEqual(threeOptions(swatches()),{renderProfile:'cinematic-v1',materials:'pbr-v1'});
 assert.deepEqual(threeOptions({renderProfile:'cinematic-v1',cinematic:{version:1}}),{renderProfile:'cinematic-v1',materials:null});
 assert.deepEqual(threeOptions(null),{});
});

test('Director request: Cinematic defaults only with renderProfile; an explicit block is kept; misuse refused',()=>{
 assert.deepEqual(request({...release,backend:'three',renderProfile:'cinematic-v1'}).cinematic,{version:1,materials:'pbr-v1'});
 assert.deepEqual(request({...release,backend:'three',renderProfile:'cinematic-v1',cinematic:{version:1}}).cinematic,{version:1});
 assert.equal(Object.hasOwn(request({...release,backend:'three'}),'cinematic'),false);
 assert.throws(()=>request({...release,backend:'three',cinematic:{version:1,materials:'pbr-v1'}}),/RP-03/);
 assert.throws(()=>request({...release,backend:'three',renderProfile:'cinematic-v1',cinematic:{version:1,materials:'chrome'}}),/request.cinematic.materials/);
});

test('production ids: Cinematic outputs never share a folder with GPU Standard ones',()=>{
 assert.equal(productionId('film','three','polished'),'film-three-polished');
 assert.equal(productionId('film','three','polished','cinematic-v1'),'film-cinematicv1-polished');
 assert.throws(()=>productionId('film','cpu','polished','cinematic-v1'),/render profile/);
 assert.throws(()=>productionId('film','three','polished','cinematic-v9'),/render profile/);
});

test('Standard vs Cinematic: one film, two sides; parity ignores only the profile fields',()=>{
 const p=swatches(),s=standardVariant(p);
 assert.equal(Object.hasOwn(s,'renderProfile')||Object.hasOwn(s,'cinematic'),false);assert.equal(p.renderProfile,'cinematic-v1'); // input untouched
 validateProject(s);assert.deepEqual(normalizedScene(p),normalizedScene(s));assert.notDeepEqual(normalizedProject(p),normalizedProject(s));
 const moved=standardVariant(p);moved.shots[0].assets[0].tracks.x=[[0,-2]];assert.notDeepEqual(normalizedScene(p),normalizedScene(moved));
 assert.throws(()=>matchedProject(s,{},'x-three-original','three',{standard:true}),/needs a Cinematic film/);
 assert.throws(()=>matchedProject(p,{},'x-cpu-original','cpu',{standard:true}),/needs a Cinematic film on three/);
});

test('--compare standard: two Three.js outputs from one preparation; every misuse refused before speech',()=>{
 const read=()=>JSON.stringify({...release,renderProfile:'cinematic-v1'});
 const o=parseProduction(['--request','r','--backend','three','--compare','standard','--id','gpu01-x'],{read});
 assert.deepEqual(o.backends,['three','three']);assert.deepEqual(o.variants,[{standard:true},{standard:false}]);
 assert.deepEqual(o.ids,['gpu01-x-three-polished','gpu01-x-cinematicv1-polished']);assert.equal(o.compare,'standard');
 assert.throws(()=>parseProduction(['--request','r','--backend','three','--compare','cpu'],{read}),/--compare accepts only standard/);
 assert.throws(()=>parseProduction(['--request','r','--backend','both','--compare','standard'],{read}),/RP-04/);
 assert.throws(()=>parseProduction(['--request','r','--compare','standard','--backend','three'],{read:()=>JSON.stringify(release)}),/needs a Cinematic film/);
 const single=parseProduction(['--request','r','--backend','three','--id','gpu01-y'],{read});assert.deepEqual(single.ids,['gpu01-y-cinematicv1-polished']);assert.equal(single.compare,null);
 const proj=()=>readFileSync(new URL('../examples/gpu01-swatches-cinematic.json',import.meta.url),'utf8');
 const a=parseProduction(['--project','p','--backend','three','--compare','standard','--id','gpu01-s'],{read:proj});
 assert.deepEqual(a.ids,['gpu01-s-three-polished','gpu01-s-cinematicv1-polished']);
});
