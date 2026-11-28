// GPU-00 / ADR-001 (docs/adr/ADR-001-render-profiles.md, Accepted by the owner 2026-11-27): render profiles and
// capability negotiation. Three user-facing profiles on two backends:
//   cpu-classic  = shot.backend 'cpu', no renderProfile (v1.2 CPU Canvas, unchanged)
//   gpu-standard = shot.backend 'three', no renderProfile (v1.2 Three.js, unchanged)
//   cinematic-v1 = film-level renderProfile 'cinematic-v1', every cinematic-graph shot on 'three' (opt-in)
// Absent renderProfile is exactly v1.2. Capabilities are derived from the fields a film uses, never declared, and a
// mismatch is refused with a coded diagnostic and the user's choices. Nothing is stripped, substituted or switched.
// Until GPU-01, cinematic-v1 draws exactly the GPU Standard pixels (its capability set is still only 'shared').
export const PROFILE_TABLE_VERSION='render-profiles-v1';
export const RENDER_PROFILES=Object.freeze(['cinematic-v1']);
export const PROFILE_IDS=Object.freeze(['cpu-classic','gpu-standard',...RENDER_PROFILES]);
const ALL=Object.freeze([...PROFILE_IDS]);
// One entry per capability: the milestone that added it and the profiles that support it. Each Campaign B milestone
// adds its own entry (pbr-v1, env-light-v1, …) only when it is accepted.
export const CAPABILITIES=Object.freeze({shared:Object.freeze({since:'v1.2',profiles:ALL}),
 // GPU-01: physically based material presets (src/visual/pbr.js), selected by film.cinematic.materials 'pbr-v1'.
 'pbr-v1':Object.freeze({since:'GPU-01',profiles:Object.freeze(['cinematic-v1'])}),
 // GPU-02: lighting presets and environment light (src/visual/cinematic-lights.js), selected by film.cinematic.lights.
 'env-light-v1':Object.freeze({since:'GPU-02',profiles:Object.freeze(['cinematic-v1'])}),
 // GPU-03: procedural textures on parts and the floor (src/visual/pbr-textures.js), selected by film.cinematic.textures.
 'proc-texture-v1':Object.freeze({since:'GPU-03',profiles:Object.freeze(['cinematic-v1'])}),
 // GPU-05: soft rounded characters and detail-3 humans (src/core/hero-characters.js), selected by film.cinematic.characters.
 'hero-char-v1':Object.freeze({since:'GPU-05',profiles:Object.freeze(['cinematic-v1'])})});
// GPU-02 light preset ids. 'auto-v1' picks a preset per shot from the shot's environment (laboratory, midnight, amber).
export const LIGHT_PRESET_IDS=Object.freeze(['auto-v1','neutral-studio-v1','warm-interior-v1','forest-daylight-v1','night-v1','scientific-dark-v1']);
// GPU-01: the film-level Cinematic feature block (versioned, every key optional). It only selects capabilities; the
// profile itself is renderProfile. Absent = no Cinematic feature (cinematic-v1 then draws GPU Standard pixels).
export const CINEMATIC_VERSION=1;
export const CINEMATIC_FEATURES=Object.freeze({materials:Object.freeze({'pbr-v1':'pbr-v1'}),lights:Object.freeze(Object.fromEntries(LIGHT_PRESET_IDS.map(id=>[id,'env-light-v1']))),textures:Object.freeze({'proc-v1':'proc-texture-v1'}),characters:Object.freeze({'soft-v1':'hero-char-v1'})});
// What a Director request with renderProfile gets when it brings no cinematic block of its own (every accepted feature).
export const CINEMATIC_DEFAULTS=Object.freeze({version:CINEMATIC_VERSION,materials:'pbr-v1',lights:'auto-v1',textures:'proc-v1',characters:'soft-v1'});
export function validateCinematic(x,path='film.cinematic'){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error(path+': object required');
 for(const k of Object.keys(x))if(k!=='version'&&!Object.hasOwn(CINEMATIC_FEATURES,k))throw Error(path+'.'+k+': unknown field');
 if(x.version!==CINEMATIC_VERSION)throw Error(path+'.version: '+CINEMATIC_VERSION+' required');
 for(const [k,values] of Object.entries(CINEMATIC_FEATURES))if(Object.hasOwn(x,k)&&(typeof x[k]!=='string'||!Object.hasOwn(values,x[k])))throw Error(path+'.'+k+': '+Object.keys(values).join(', ')+' or absent');
 // GPU-03: textures are drawn on pbr-v1 materials only; refused rather than silently ignored without them.
 if(Object.hasOwn(x,'textures')&&x.materials!=='pbr-v1')throw Error(path+".textures: needs materials 'pbr-v1'");
 return x;
}
// Stable diagnostic codes (ADR-001 section 5). RP-06 is reserved for the GPU-10 resource estimate.
export const DIAGNOSTIC_CODES=Object.freeze({
 'RP-01':'unknown-profile','RP-02':'backend-mismatch','RP-03':'capability-unsupported','RP-04':'matched-pair-mismatch','RP-05':'software-gl','RP-06':'over-budget'});
const SOFTWARE_GL=Object.freeze(['swangle','swiftshader']);
export class RenderProfileError extends Error{
 constructor(diagnostics){const d=diagnostics.filter(x=>x.severity==='error');
  super(d.map(x=>x.code+' '+DIAGNOSTIC_CODES[x.code]+' at '+x.path+': '+x.message+' Choices: '+x.choices.join('; ')+'.').join('\n'));
  this.name='RenderProfileError';this.code=d[0]?.code??null;this.diagnostics=diagnostics;}
}
const diag=(code,severity,path,message,choices)=>({code,severity,path,message,choices});
// RP-01: the field itself. Absent is valid (v1.2 behaviour).
export function renderProfileDiagnostics(value,path='renderProfile'){
 if(value===undefined)return [];
 if(typeof value!=='string'||!RENDER_PROFILES.includes(value))
  return [diag('RP-01','error',path,'unknown profile '+JSON.stringify(typeof value==='string'?value.slice(0,40):value)+'; known: '+RENDER_PROFILES.join(', '),['correct the value','remove the field for CPU Classic or GPU Standard'])];
 return [];
}
// The profile a shot renders with.
export function shotProfile(renderProfile,backend){return renderProfile??(backend==='three'?'gpu-standard':'cpu-classic');}
// Capabilities a film needs, derived from its fields. Every v1.2 field is 'shared'; later milestones add derivations.
export function requiredCapabilities(project){
 if(!project||typeof project!=='object')return [];
 const c=['shared'],x=project.cinematic;
 if(x&&typeof x==='object')for(const [k,values] of Object.entries(CINEMATIC_FEATURES))if(Object.hasOwn(values,x[k]))c.push(values[x[k]]);
 return c;
}
// Renderer options for one film: the Cinematic features to draw, only when the film is Cinematic (validated first).
export function threeOptions(project){
 if(project?.renderProfile===undefined||!project.cinematic)return {};
 return {renderProfile:project.renderProfile,materials:project.cinematic.materials??null,lights:project.cinematic.lights??null,textures:project.cinematic.textures??null,characters:project.cinematic.characters??null};
}
// Full negotiation for a v2 project, or for a planned production (renderProfile + requested backends) before any
// project exists. Returns {ok, profile, capabilities, diagnostics}; never changes its input.
export function negotiate({renderProfile,project=null,backends=null,gl=null,table=CAPABILITIES,path='renderProfile'}={}){
 const diagnostics=[...renderProfileDiagnostics(renderProfile,path)];
 if(diagnostics.length)return {ok:false,profile:null,capabilities:[],diagnostics};
 const cinematic=renderProfile!==undefined;
 if(cinematic&&Array.isArray(backends)&&backends.includes('cpu'))diagnostics.push(backends.length>1
  ?diag('RP-04','error','backend',renderProfile+' renders only on Three.js; a CPU + Three.js matched pair cannot carry it',['choose --backend three','remove renderProfile for a CPU Classic + GPU Standard pair (an explicit edit)','cancel'])
  :diag('RP-02','error','backend',renderProfile+' renders only on Three.js, not on CPU Classic',['choose --backend three','remove renderProfile to render CPU Classic (an explicit edit; nothing is converted for you)','cancel']));
 const graph=project?.version===2?project.shots.map((s,i)=>[s,i]).filter(([s])=>s?.template==='cinematic-graph'):[];
 if(cinematic&&project){
  if(!graph.length)diagnostics.push(diag('RP-02','error','shots',renderProfile+' needs at least one cinematic-graph shot on Three.js',['add a cinematic-graph shot','remove renderProfile','cancel']));
  for(const [s,i] of graph)if(s.backend!=='three')diagnostics.push(diag('RP-02','error','shots['+i+'].backend',renderProfile+' renders only on Three.js, but this shot asks for '+JSON.stringify(s.backend),['set the shot backend to three','remove renderProfile (an explicit edit)','cancel']));
 }
 const capabilities=project?requiredCapabilities(project):['shared'];
 const profiles=cinematic?[renderProfile]:graph.length?[...new Set(graph.map(([s])=>shotProfile(undefined,s.backend)))]:[...new Set((backends??[]).map(b=>shotProfile(undefined,b)))];
 for(const c of capabilities){const entry=table[c];
  if(!entry){diagnostics.push(diag('RP-03','error','capabilities','unknown capability '+c,['update the profile table','cancel']));continue;}
  for(const p of profiles)if(!entry.profiles.includes(p))diagnostics.push(diag('RP-03','error','capabilities','the film uses '+c+', which '+p+' does not support',[...RENDER_PROFILES.filter(r=>entry.profiles.includes(r)).map(r=>'add renderProfile "'+r+'"'),'remove the features that need '+c+' (an explicit edit)','cancel']));}
 if(cinematic&&gl!==null&&SOFTWARE_GL.includes(gl))diagnostics.push(diag('RP-05','warning','AETHER_GL',renderProfile+' on the software GL route '+gl+': slow but byte-stable',['continue','set AETHER_GL=vulkan yourself for the RTX GPU']));
 return {ok:!diagnostics.some(d=>d.severity==='error'),profile:cinematic?renderProfile:profiles.length===1?profiles[0]:profiles.length?'mixed':null,capabilities,diagnostics};
}
// Throws RenderProfileError on any error diagnostic; returns the negotiation (warnings included) otherwise.
export function assertNegotiated(options){const r=negotiate(options);if(!r.ok)throw new RenderProfileError(r.diagnostics);return r;}
// Report fields (ADR-001 section 6) for a validated project.
export function profileReport(project,{three=null}={}){
 const r=negotiate({renderProfile:project?.renderProfile,project});
 return {renderProfile:project?.renderProfile??null,profile:r.profile,profileTable:PROFILE_TABLE_VERSION,capabilities:r.capabilities,three};
}
