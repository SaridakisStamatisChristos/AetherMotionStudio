// DUAL-07 independent audit repair (2026-11-27): classic narrator audio options, the preview picture lifecycle and
// memory bound, preview media integrity, and honest backend identification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {directorRequest} from '../src/studio/director-form.js';
import {direct} from '../src/director/index.js';
import {verifyImageBytes,checkDecoded,MEDIA_LIMITS} from '../src/core/media.js';
import {createPreviewMedia} from '../src/visual/preview-media.js';
import {registerImage,unregisterImage,registeredImages,registeredBytes,clearImages,loadedImage} from '../src/visual/media-registry.js';
import {rendererLine} from '../src/studio/finished.js';
import {encodePNG,quadrants} from '../scripts/media-fixtures.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),shaAsync=async b=>sha(b);
const SCRIPT='A lighthouse stands where the sea is dangerous.\nIts lamp turns once every ten seconds.\nSailors count the flashes to know the light.';

// ---- finding 1 ----
const form=o=>({id:'film-a1',topic:'Lighthouses',script:SCRIPT,seconds:20,cast:'narrator',backend:'cpu',profile:'polished',voice:'am_michael',staging:false,reels:false,speakerNames:false,titles:false,...o});
test('F1. audio and caption options work for every cast and content mode, names on and off; classic duration unchanged',async()=>{
 const options=[{},{music:'off'},{music:'louder'},{captionStyle:'paper-v1'},{soundtrack:'silent'},{music:'off',captionStyle:'contrast-v1',soundtrack:'silent'}];
 const modes=[['narrator','none'],['interview','none'],['trio','none'],['interview','mixed-v1'],['narrator','mixed-v1'],['narrator','explainer-v1'],['narrator','typography-v1']];
 let runs=0;
 for(const [cast,content] of modes)for(const names of [false,true])for(const o of options){
  const q=directorRequest(form({cast,content,speakerNames:names,...o})),label=cast+'/'+content+'/names '+names+'/'+JSON.stringify(o);
  const r=await direct(q);runs++;const sp=r.project.speech;
  if(!Object.keys(o).length&&cast==='narrator'&&content==='none'){assert.equal(q.speech,undefined,'historical classic narrator request has no speech: '+label);continue;}
  assert.ok(sp,'speech present: '+label);
  if(o.music)assert.equal(sp.mix.music,o.music==='off'?0:Math.min(1,Math.round(.55*1.5*1000)/1000),label);
  if(o.captionStyle)assert.equal(sp.captions.style,o.captionStyle,label);
  if(o.soundtrack)assert.equal(sp.soundtrack,'silent',label);
  if(cast==='narrator'&&content==='none'){assert.equal(sp.fit,undefined,'classic narrator keeps its exact length: '+label);assert.equal(sp.targetFrames,20*30,label);}
  if(content!=='none')assert.equal(sp.fit,'speech-v1',label);
 }
 assert.ok(runs>=80,'matrix size '+runs);
});

// ---- shared verification (native loader and preview) ----
const img=(w,h)=>{const b=encodePNG(quadrants(w,h),w,h);return {bytes:new Uint8Array(b),source:{file:'p'+w+'x'+h+'.png',sha256:sha(b),format:'png',width:w,height:h,orientation:1,displayWidth:w,displayHeight:h}};};
test('F3a. verifyImageBytes: actual bytes, structure and size must match the verified source',async()=>{
 const a=img(8,6),b=img(9,6);
 assert.equal((await verifyImageBytes(a.bytes,a.source,shaAsync)).width,8);
 await assert.rejects(verifyImageBytes(b.bytes,a.source,shaAsync),/differs from its verified SHA-256/);
 await assert.rejects(verifyImageBytes(a.bytes,{...a.source,width:9,displayWidth:9},shaAsync),/width 8 differs from its verified source \(9\)/);
 await assert.rejects(verifyImageBytes(a.bytes.subarray(0,a.bytes.length-4),{...a.source,sha256:sha(a.bytes.subarray(0,a.bytes.length-4))},shaAsync),/truncated PNG|no IEND/);
 await assert.rejects(verifyImageBytes(new Uint8Array(MEDIA_LIMITS.fileBytes+1),a.source,shaAsync),/larger than 32 MB/);
 assert.throws(()=>checkDecoded({width:6,height:8},a.source),/decoded to 6×8, expected 8×6 upright/);
});

// ---- preview media manager with fakes ----
function fakes({delay=()=>0,files={},decodeSize=null}={}){
 const created=[],fetched=[],reg=new Map();
 const registry={register:(k,b)=>reg.set(k,b),unregister:k=>{const b=reg.get(k);reg.delete(k);b?.close();return !!b;},get:k=>reg.get(k)??null,keys:()=>[...reg.keys()],bytes:()=>[...reg.values()].reduce((n,b)=>n+b.width*b.height*4,0)};
 const fetchBytes=async file=>{fetched.push(file);await new Promise(r=>setTimeout(r,delay(file)));if(!(file in files))throw Error('missing public/media/'+file+' (HTTP 404)');return files[file];};
 const decode=async bytes=>{const w=decodeSize?decodeSize[0]:bytes.__w,h=decodeSize?decodeSize[1]:bytes.__h;const b={width:w,height:h,closed:false,close(){this.closed=true;}};created.push(b);return b;};
 return {created,fetched,reg,registry,fetchBytes,decode};
}
const tag=(x)=>{x.bytes.__w=x.source.width;x.bytes.__h=x.source.height;return x;};
const sceneOf=(...sources)=>({version:2,shots:sources.map((s,i)=>({composition:{version:'compose-v2',items:[{type:'image',media:'m'+i+'-'+s.width,source:s}]}}))});

test('F3b. preview registers only verified pictures; forged, replaced, missing, corrupt, oversized and mis-decoded ones are diagnosed',async()=>{
 const a=tag(img(8,6)),b=tag(img(9,6)),f=fakes({files:{[a.source.file]:a.bytes}});
 const pm=createPreviewMedia({fetchBytes:f.fetchBytes,decode:f.decode,sha256Hex:shaAsync,registry:f.registry});
 let r=await pm.sync(sceneOf(a.source));assert.deepEqual(r.diagnostics,[]);assert.deepEqual(f.registry.keys(),[a.source.sha256]);
 // forged hash: the same file claims another SHA-256 → never registered under the forged hash
 const forged={...a.source,sha256:'f'.repeat(64)};r=await pm.sync(sceneOf(forged));
 assert.match(r.diagnostics[0],/differs from its verified SHA-256/);assert.equal(f.registry.get('f'.repeat(64)),null);
 // replaced file (other bytes behind the name), missing file, corrupt bytes, oversized file
 const g=fakes({files:{[a.source.file]:b.bytes,'gone.png':undefined}});delete g.fetchBytes.files;
 const pm2=createPreviewMedia({fetchBytes:g.fetchBytes,decode:g.decode,sha256Hex:shaAsync,registry:g.registry});
 assert.match((await pm2.sync(sceneOf(a.source))).diagnostics[0],/differs from its verified SHA-256/);
 assert.match((await pm2.sync(sceneOf({...a.source,file:'nothere.png'}))).diagnostics[0],/missing public\/media\/nothere.png/);
 const cut=a.bytes.slice(0,a.bytes.length-5),h=fakes({files:{[a.source.file]:cut}}),pm3=createPreviewMedia({fetchBytes:h.fetchBytes,decode:h.decode,sha256Hex:shaAsync,registry:h.registry});
 assert.match((await pm3.sync(sceneOf({...a.source,sha256:sha(cut)}))).diagnostics[0],/truncated PNG|no IEND/);
 const big=new Uint8Array(MEDIA_LIMITS.fileBytes+1),k=fakes({files:{[a.source.file]:big}}),pm4=createPreviewMedia({fetchBytes:k.fetchBytes,decode:k.decode,sha256Hex:shaAsync,registry:k.registry});
 assert.match((await pm4.sync(sceneOf(a.source))).diagnostics[0],/larger than 32 MB/);
 // decoded at the wrong size (orientation not applied as verified): diagnosed, the bitmap is closed
 const m=fakes({files:{[a.source.file]:a.bytes},decodeSize:[6,8]}),pm5=createPreviewMedia({fetchBytes:m.fetchBytes,decode:m.decode,sha256Hex:shaAsync,registry:m.registry});
 assert.match((await pm5.sync(sceneOf(a.source))).diagnostics[0],/decoded to 6×8, expected 8×6 upright/);assert.equal(m.created[0].closed,true);assert.deepEqual(m.registry.keys(),[]);
 for(const x of [g,h,k,m])assert.deepEqual(x.registry.keys(),[],'nothing unverified registered');
});

test('F2a. switching films releases and closes pictures the new film does not use',async()=>{
 const a=tag(img(8,6)),b=tag(img(9,6)),c=tag(img(10,6)),f=fakes({files:{[a.source.file]:a.bytes,[b.source.file]:b.bytes,[c.source.file]:c.bytes}});
 const pm=createPreviewMedia({fetchBytes:f.fetchBytes,decode:f.decode,sha256Hex:shaAsync,registry:f.registry});
 await pm.sync(sceneOf(a.source,b.source));assert.equal(f.registry.keys().length,2);
 await pm.sync(sceneOf(c.source));assert.deepEqual(f.registry.keys(),[c.source.sha256]);
 assert.deepEqual(f.created.map(x=>x.closed),[true,true,false],'the two released bitmaps were closed');
 // the same scene object again: no reload
 const s=sceneOf(c.source);await pm.sync(s);await pm.sync(s);assert.equal(f.fetched.filter(x=>x===c.source.file).length,1);
});

test('F2b. concurrent requests share one load; a load finishing after its film was replaced is closed, never registered',async()=>{
 const a=tag(img(8,6)),b=tag(img(9,6));
 const f=fakes({files:{[a.source.file]:a.bytes,[b.source.file]:b.bytes},delay:file=>file===a.source.file?40:0});
 const pm=createPreviewMedia({fetchBytes:f.fetchBytes,decode:f.decode,sha256Hex:shaAsync,registry:f.registry});
 // two different scene objects needing the same picture at the same time → one fetch
 const p1=pm.sync(sceneOf(a.source)),p2=pm.sync(sceneOf(a.source));const [r1,r2]=await Promise.all([p1,p2]);
 assert.equal(f.fetched.filter(x=>x===a.source.file).length,1,'deduplicated');assert.equal(r1.current,false);assert.equal(r2.current,true);assert.deepEqual(f.registry.keys(),[a.source.sha256]);
 // stale: start loading a slow picture, switch to another film before it finishes
 const g=fakes({files:{[a.source.file]:a.bytes,[b.source.file]:b.bytes},delay:file=>file===a.source.file?60:0});
 const pm2=createPreviewMedia({fetchBytes:g.fetchBytes,decode:g.decode,sha256Hex:shaAsync,registry:g.registry});
 const slow=pm2.sync(sceneOf(a.source)),fast=await pm2.sync(sceneOf(b.source)),old=await slow;
 assert.equal(old.current,false,'the old result is marked stale (the caller ignores its diagnostics)');assert.equal(fast.current,true);
 assert.deepEqual(g.registry.keys(),[b.source.sha256],'the stale load did not repopulate the registry');
 // DUAL-09 hardening: the stale load is now not even decoded (stricter than "decoded, then closed")
 const stale=g.created.find(x=>x.width===8);assert.ok(!stale||stale.closed,'the stale bitmap was never decoded, or was closed');
});

test('F2c. stress: 300 rapid switches across six pictures with random delays stay within the per-film memory bound',async()=>{
 const pics=[6,7,8,9,10,11].map(w=>tag(img(w,5))),files=Object.fromEntries(pics.map(p=>[p.source.file,p.bytes]));
 let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
 const f=fakes({files,delay:()=>Math.floor(rnd()*6)});let peak=0;
 const reg=f.registry,orig=reg.register;reg.register=(k,b)=>{orig(k,b);peak=Math.max(peak,reg.bytes());};
 const budget=3*11*5*4;// at most three pictures of the largest size at once
 const pm=createPreviewMedia({fetchBytes:f.fetchBytes,decode:f.decode,sha256Hex:shaAsync,registry:reg,budgetBytes:budget});
 const pending=[];let last=null;
 for(let i=0;i<300;i++){const n=1+Math.floor(rnd()*3),pick=[];while(pick.length<n){const p=pics[Math.floor(rnd()*6)];if(!pick.includes(p))pick.push(p);}last=pick;pending.push(pm.sync(sceneOf(...pick.map(p=>p.source))));if(rnd()<.3)await new Promise(r=>setTimeout(r,1));}
 await Promise.all(pending);await pm.sync(sceneOf(...last.map(p=>p.source)));
 assert.deepEqual(new Set(reg.keys()),new Set(last.map(p=>p.source.sha256)),'only the last film\'s pictures remain');
 assert.ok(peak<=budget,'peak decoded bytes '+peak+' within '+budget);
 const open=f.created.filter(b=>!b.closed).length;assert.equal(open,reg.keys().length,'every bitmap is either registered or closed ('+f.created.length+' created)');
 assert.equal(pm.inflight(),0,'no loads left in flight');
});

test('F2d. the shared registry closes what it releases and reports its decoded memory',()=>{
 clearImages();const mk=(w,h)=>({width:w,height:h,closed:false,close(){this.closed=true;}});
 const a=mk(10,10),b=mk(20,10);registerImage('a',a);registerImage('b',b);assert.equal(registeredBytes(),10*10*4+20*10*4);
 assert.equal(unregisterImage('a'),true);assert.equal(a.closed,true);assert.equal(loadedImage('a'),null);assert.deepEqual(registeredImages(),['b']);
 const b2=mk(20,10);registerImage('b',b2);assert.equal(b.closed,true,'replacing an entry closes the old bitmap');
 clearImages();assert.equal(b2.closed,true);assert.equal(registeredBytes(),0);
});

// ---- finding 4 ----
test('F4. backend identity: no hardware assumed; the actual backend, GL route and reported adapter, else unknown',()=>{
 const html=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/RTX/);assert.match(html,/Three\.js \(WebGL\)/);
 assert.equal(rendererLine({backend:'cpu',gl:null}),'rendered with CPU Canvas');
 assert.equal(rendererLine({backend:'three',gl:'vulkan',adapter:{renderer:'ANGLE (NVIDIA, Vulkan 1.3.289 (NVIDIA GeForce RTX 4060 Laptop GPU))'}}),'rendered with Three.js (WebGL, GL route vulkan, adapter ANGLE (NVIDIA, Vulkan 1.3.289 (NVIDIA GeForce RTX 4060 Laptop GPU)))');
 assert.equal(rendererLine({backend:'three',gl:'vulkan',adapter:{renderer:'unknown',error:'probe failed'}}),'rendered with Three.js (WebGL, GL route vulkan, adapter unknown)');
 assert.equal(rendererLine({backend:'three',gl:'swangle'}),'rendered with Three.js (WebGL, GL route swangle, adapter unknown)');
 assert.equal(rendererLine(null),'renderer unknown');assert.equal(rendererLine({backend:'gpu'}),'renderer unknown');
 const tb=readFileSync(new URL('../src/visual/three-backend.js',import.meta.url),'utf8');assert.match(tb,/UNMASKED_RENDERER_WEBGL/);assert.match(tb,/renderer:'unknown'/);
 const nr=readFileSync(new URL('../scripts/native-render.mjs',import.meta.url),'utf8');assert.match(nr,/gl-probe\.mjs/);assert.match(nr,/never changes or fails the render/);
 const gp=readFileSync(new URL('../scripts/gl-probe.mjs',import.meta.url),'utf8');assert.match(gp,/chromiumOptions:\{gl\}/);assert.match(gp,/renderer:'unknown'/);
});

test('F4b. render timing excludes the GL probe (measured before it runs)',()=>{
 const nr=readFileSync(new URL('../scripts/native-render.mjs',import.meta.url),'utf8');
 assert.ok(nr.indexOf('const renderSeconds=(performance.now()-start)/1000')<nr.indexOf("'gl-probe.mjs'"),'timing taken before the probe call');
 assert.match(nr,/const timing=\{renderSeconds,/);
});
