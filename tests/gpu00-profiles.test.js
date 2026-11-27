// GPU-00 / ADR-001: render profiles and capability negotiation. No pixel changes; wrong pairings fail before any
// speech preparation or rendering, with a stable code and the user's choices.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {negotiate,assertNegotiated,profileReport,renderProfileDiagnostics,RenderProfileError,RENDER_PROFILES,PROFILE_IDS,CAPABILITIES,DIAGNOSTIC_CODES,requiredCapabilities} from '../src/core/render-profiles.js';
import {request} from '../src/director/schema.js';
import {direct} from '../src/director/index.js';
import {defaultSpeech,matchedProject,normalizedProject} from '../src/studio/production.js';
import {parseProduction} from '../scripts/production-options.mjs';
import {checkInput} from '../scripts/batch-lib.mjs';
import {threeVersion} from '../scripts/native-render.mjs';
const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n,import.meta.url),'utf8'));
const three=()=>load('art05-workshop-three-polished.json');
const cinematic=()=>({...three(),renderProfile:'cinematic-v1'});
const release=load('release.request.json');
const code=c=>e=>e instanceof RenderProfileError&&e.code===c&&e.message.startsWith(c+' '+DIAGNOSTIC_CODES[c])&&/Choices: /.test(e.message);

test('profile table: three profiles, one shared capability, stable codes',()=>{
 assert.deepEqual(RENDER_PROFILES,['cinematic-v1']);assert.deepEqual(PROFILE_IDS,['cpu-classic','gpu-standard','cinematic-v1']);
 assert.deepEqual(Object.keys(CAPABILITIES),['shared']);assert.deepEqual(CAPABILITIES.shared.profiles,PROFILE_IDS);
 assert.deepEqual(Object.keys(DIAGNOSTIC_CODES),['RP-01','RP-02','RP-03','RP-04','RP-05','RP-06']);
 assert.ok(Object.isFrozen(CAPABILITIES)&&Object.isFrozen(CAPABILITIES.shared.profiles));
});

test('absent renderProfile is exactly v1.2: same object back, Classic/Standard by shot backend',()=>{
 const p=three(),before=JSON.stringify(p);assert.equal(validateProject(p),p);assert.equal(JSON.stringify(p),before);
 assert.equal(Object.hasOwn(p,'renderProfile'),false);
 assert.deepEqual(profileReport(p,{three:'0.180.0'}),{renderProfile:null,profile:'gpu-standard',profileTable:'render-profiles-v1',capabilities:['shared'],three:'0.180.0'});
 const c=load('art05-workshop-cpu-polished.json');validateProject(c);assert.equal(profileReport(c).profile,'cpu-classic');
});

test('cinematic-v1 on Three.js validates; the report names it',()=>{
 const p=cinematic();assert.equal(validateProject(p),p);
 const r=profileReport(p,{three:'0.180.0'});assert.equal(r.renderProfile,'cinematic-v1');assert.equal(r.profile,'cinematic-v1');assert.deepEqual(r.capabilities,['shared']);
});

test('RP-01: unknown, mistyped and hostile renderProfile values are refused by name',()=>{
 for(const v of ['cinematic-v9','Cinematic-v1','gpu-standard','cpu-classic','','__proto__','constructor',null,1,true,{},['cinematic-v1'],'x'.repeat(5000)]){
  assert.throws(()=>validateProject({...three(),renderProfile:v}),code('RP-01'),String(v).slice(0,20));
  assert.equal(renderProfileDiagnostics(v)[0].code,'RP-01');}
 const long=renderProfileDiagnostics('y'.repeat(5000))[0].message;assert.ok(long.length<200);
 assert.deepEqual(renderProfileDiagnostics(undefined),[]);
});

test('RP-02: a Cinematic film with any CPU shot, or with no Three.js shot, is refused at that path',()=>{
 const p=cinematic();p.shots[3].backend='cpu';
 assert.throws(()=>validateProject(p),e=>code('RP-02')(e)&&/shots\[3\]\.backend/.test(e.message));
 const all=cinematic();for(const s of all.shots)s.backend='cpu';
 const r=negotiate({renderProfile:'cinematic-v1',project:all});assert.equal(r.ok,false);assert.equal(r.diagnostics.filter(d=>d.code==='RP-02').length,6);
 const none=negotiate({renderProfile:'cinematic-v1',project:{version:2,shots:[{template:'blockchain-chapter'}]}});assert.equal(none.diagnostics[0].path,'shots');
});

test('RP-03: a capability the profile lacks, or an unknown capability, is refused (table injected)',()=>{
 const onlyCpu={shared:{since:'v1.2',profiles:['cpu-classic']}};
 const r=negotiate({project:three(),table:onlyCpu});assert.equal(r.ok,false);assert.equal(r.diagnostics[0].code,'RP-03');assert.match(r.diagnostics[0].message,/gpu-standard does not support/);
 const cin={shared:{since:'v1.2',profiles:['cinematic-v1']}};
 const s=negotiate({project:three(),table:cin});assert.ok(s.diagnostics[0].choices.includes('add renderProfile "cinematic-v1"'));
 assert.equal(negotiate({project:three(),table:{}}).diagnostics[0].message,'unknown capability shared');
 assert.equal(negotiate({renderProfile:'cinematic-v1',project:cinematic(),table:cin}).ok,true);
 assert.deepEqual(requiredCapabilities(null),[]);
});

test('Director request: renderProfile is negotiated with the request backend; absent changes nothing',async()=>{
 assert.throws(()=>request({...release,backend:'cpu',renderProfile:'cinematic-v1'}),code('RP-02'));
 assert.throws(()=>request({...release,backend:'three',renderProfile:'cinematic-v2'}),code('RP-01'));
 assert.equal(request({...release,backend:'three',renderProfile:'cinematic-v1'}).renderProfile,'cinematic-v1');
 assert.equal(Object.hasOwn(request({...release,backend:'three'}),'renderProfile'),false);
 const q={...release,speech:defaultSpeech(30),backend:'three'};
 const [a,b]=await Promise.all([direct({...q,id:'gpu00-a'}),direct({...q,id:'gpu00-a',renderProfile:'cinematic-v1'})]);
 assert.equal(Object.hasOwn(a.project,'renderProfile'),false);assert.equal(b.project.renderProfile,'cinematic-v1');
 const {renderProfile,...rest}=b.project;assert.equal(renderProfile,'cinematic-v1');assert.deepEqual(rest,a.project); // only the field differs
 validateProject(b.project);
 // a Cinematic plan and a Standard plan are never treated as the same normalized scene
 assert.notDeepEqual(normalizedProject(a.project),normalizedProject(b.project));
});

test('produce options: refused while parsing (before speech) for CPU and for CPU + Three pairs',()=>{
 const read=x=>JSON.stringify({...release,renderProfile:'cinematic-v1'});
 assert.throws(()=>parseProduction(['--request','r','--backend','both'],{read}),code('RP-04'));
 assert.throws(()=>parseProduction(['--request','r','--backend','cpu'],{read}),code('RP-02'));
 assert.throws(()=>parseProduction(['--request','r'],{read}),code('RP-02')); // default backend is cpu: never switched silently
 const o=parseProduction(['--request','r','--backend','three'],{read});assert.equal(o.request.renderProfile,'cinematic-v1');assert.deepEqual(o.backends,['three']);
 const proj=x=>JSON.stringify(cinematic());
 assert.throws(()=>parseProduction(['--project','p','--backend','cpu'],{read:proj}),code('RP-02'));
 assert.throws(()=>parseProduction(['--project','p','--backend','both'],{read:proj}),code('RP-04'));
 assert.equal(parseProduction(['--project','p','--backend','three','--id','gpu00-p'],{read:proj}).project.renderProfile,'cinematic-v1');
});

test('matched pair rewrite to CPU is refused, never stripped',()=>{
 const p=cinematic(),timeline={};
 assert.throws(()=>matchedProject(p,timeline,'gpu00-x-cpu-polished','cpu'),code('RP-02'));
 assert.equal(p.renderProfile,'cinematic-v1');assert.ok(p.shots.every(s=>s.backend==='three'));
});

test('batch jobs get the same refusal as produce',()=>{
 const text=JSON.stringify({...release,renderProfile:'cinematic-v1'});
 assert.throws(()=>checkInput('request',text,{id:'j',backend:'both',format:'vertical-v1'}),/RP-04/);
 assert.throws(()=>checkInput('request',text,{id:'j',backend:'cpu',format:'vertical-v1'}),/RP-02/);
 assert.doesNotThrow(()=>checkInput('request',text,{id:'j',backend:'three',format:'vertical-v1'}));
});

test('RP-05: software GL is a warning (never an error, never a switch); hardware routes are silent',()=>{
 for(const gl of ['swangle','swiftshader']){const r=negotiate({renderProfile:'cinematic-v1',backends:['three'],gl});assert.equal(r.ok,true);assert.equal(r.diagnostics[0].code,'RP-05');assert.equal(r.diagnostics[0].severity,'warning');}
 for(const gl of ['vulkan','angle',null])assert.deepEqual(negotiate({renderProfile:'cinematic-v1',backends:['three'],gl}).diagnostics,[]);
 assert.deepEqual(negotiate({backends:['three'],gl:'swangle'}).diagnostics,[]); // Standard keeps its v1.2 behaviour
 assert.doesNotThrow(()=>assertNegotiated({renderProfile:'cinematic-v1',backends:['three'],gl:'swangle'}));
});

test('report: installed three.js version is read from disk',()=>{
 assert.equal(threeVersion(new URL('..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')),'0.180.0');
 assert.equal(threeVersion('Z:/definitely/not/here'),null);
});
