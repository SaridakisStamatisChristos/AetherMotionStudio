// DUAL-09 hardening of the Studio preview's picture loading (owner review of the DUAL-07 audit): what is in flight is
// bounded (concurrent fetch/verify/decode slots), obsolete fetches are aborted, obsolete loads are never decoded.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MEDIA_LIMITS} from '../src/core/media.js';
import {createPreviewMedia,previewMemoryBound,PREVIEW_LOADS} from '../src/visual/preview-media.js';
import {encodePNG,quadrants} from '../scripts/media-fixtures.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex'),shaAsync=async b=>sha(b);
const img=(w,h)=>{const b=new Uint8Array(encodePNG(quadrants(w,h),w,h));b.__w=w;b.__h=h;return {bytes:b,source:{file:'p'+w+'x'+h+'.png',sha256:sha(b),format:'png',width:w,height:h,orientation:1,displayWidth:w,displayHeight:h}};};
const sceneOf=(...sources)=>({version:2,shots:sources.map((s,i)=>({composition:{version:'compose-v2',items:[{type:'image',media:'m'+i+'-'+s.width,source:s}]}}))});
const tick=(ms=0)=>new Promise(r=>setTimeout(r,ms));

// Fakes that record what runs at once. A "load" is one fetch + decode; `busy` counts loads between fetch start and
// decode end. `honourAbort` makes the fetch reject on abort like the browser's fetch.
function harness({files,delay=()=>5,honourAbort=true}){
 const reg=new Map(),created=[],fetched=[],signals=[];let busy=0,peakBusy=0,decoding=0,peakDecoding=0;
 const registry={register:(k,b)=>reg.set(k,b),unregister:k=>{const b=reg.get(k);reg.delete(k);b?.close();return !!b;},get:k=>reg.get(k)??null,keys:()=>[...reg.keys()],bytes:()=>[...reg.values()].reduce((n,b)=>n+b.width*b.height*4,0)};
 const fetchBytes=async(file,signal)=>{
  fetched.push(file);signals.push({file,signal});busy++;peakBusy=Math.max(peakBusy,busy);
  try{
   await new Promise((resolve,reject)=>{const t=setTimeout(resolve,delay(file));if(honourAbort)signal?.addEventListener('abort',()=>{clearTimeout(t);reject(Object.assign(Error('aborted'),{name:'AbortError'}));},{once:true});});
   if(!(file in files))throw Error('missing public/media/'+file+' (HTTP 404)');
   return files[file];
  }finally{busy--;}
 };
 const decode=async bytes=>{decoding++;peakDecoding=Math.max(peakDecoding,decoding+busy);await tick(1);decoding--;const b={width:bytes.__w,height:bytes.__h,closed:false,close(){this.closed=true;}};created.push(b);return b;};
 return {reg,registry,created,fetched,signals,fetchBytes,decode,peak:()=>({fetch:peakBusy,inFlight:peakDecoding})};
}
const pics=n=>Array.from({length:n},(_,i)=>img(6+i,5));
const filesOf=ps=>Object.fromEntries(ps.map(p=>[p.source.file,p.bytes]));

test('H1. at most two pictures are fetched and decoded at once; a film with ten pictures still loads all of them',async()=>{
 const ps=pics(10),h=harness({files:filesOf(ps)});
 const pm=createPreviewMedia({fetchBytes:h.fetchBytes,decode:h.decode,sha256Hex:shaAsync,registry:h.registry});
 const r=await pm.sync(sceneOf(...ps.map(p=>p.source)));
 assert.deepEqual(r.diagnostics,[]);assert.equal(h.reg.size,10);
 assert.ok(h.peak().fetch<=2,'peak concurrent fetches '+h.peak().fetch);
 assert.ok(h.peak().inFlight<=2,'peak concurrent fetch+decode '+h.peak().inFlight);
 const s=pm.stats();assert.equal(s.peakActive,2);assert.equal(s.active,0);assert.equal(s.queued,0);assert.equal(s.started,10);
});

test('H2. switching films aborts the obsolete fetches, never starts the waiting ones and never decodes them',async()=>{
 const a=pics(8),b=[img(30,5),img(31,5)],h=harness({files:filesOf([...a,...b]),delay:f=>f.startsWith('p3')?2:50});
 const pm=createPreviewMedia({fetchBytes:h.fetchBytes,decode:h.decode,sha256Hex:shaAsync,registry:h.registry});
 const first=pm.sync(sceneOf(...a.map(p=>p.source)));await tick(5);
 assert.equal(h.fetched.length,2,'only two of film A\'s eight pictures started');
 const second=await pm.sync(sceneOf(...b.map(p=>p.source))),old=await first;
 assert.equal(old.current,false);assert.equal(second.current,true);assert.deepEqual(second.diagnostics,[]);
 assert.deepEqual(new Set(h.reg.keys()),new Set(b.map(p=>p.source.sha256)),'only film B is registered');
 for(const x of h.signals.filter(x=>a.some(p=>p.source.file===x.file)))assert.equal(x.signal.aborted,true,x.file+' fetch aborted');
 assert.equal(h.fetched.filter(f=>a.some(p=>p.source.file===f)).length,2,'the six waiting A loads never fetched');
 assert.equal(h.created.filter(x=>x.width<30).length,0,'no A picture was decoded');
 const s=pm.stats();assert.equal(s.aborted,8);assert.equal(s.skippedFetch,6);assert.equal(s.active,0);assert.equal(pm.inflight(),0);
});

test('H3. a fetch that ignores the abort is still never decoded once its film is replaced',async()=>{
 const a=img(8,6),b=img(9,6),h=harness({files:filesOf([a,b]),delay:f=>f===a.source.file?40:1,honourAbort:false});
 const pm=createPreviewMedia({fetchBytes:h.fetchBytes,decode:h.decode,sha256Hex:shaAsync,registry:h.registry});
 const first=pm.sync(sceneOf(a.source));await tick(5);await pm.sync(sceneOf(b.source));await first;
 assert.equal(h.created.filter(x=>x.width===8).length,0,'obsolete bytes were not decoded');
 assert.equal(pm.stats().skippedDecode,1);assert.deepEqual(h.registry.keys(),[b.source.sha256]);
});

test('H4. A → B → A within one fetch: A is loaded again (an aborted load never blocks a new one) and nothing leaks',async()=>{
 const a=img(8,6),b=img(9,6),h=harness({files:filesOf([a,b]),delay:()=>20});
 const pm=createPreviewMedia({fetchBytes:h.fetchBytes,decode:h.decode,sha256Hex:shaAsync,registry:h.registry});
 const p1=pm.sync(sceneOf(a.source)),p2=pm.sync(sceneOf(b.source)),last=await pm.sync(sceneOf(a.source));await Promise.all([p1,p2]);
 assert.equal(last.current,true);assert.deepEqual(last.diagnostics,[]);assert.deepEqual(h.registry.keys(),[a.source.sha256]);
 assert.equal(h.created.filter(x=>!x.closed).length,h.reg.size,'every bitmap is registered or closed');
 assert.equal(pm.stats().active,0);
});

test('H5. stress: 400 rapid switches between 30 projects; slots never exceed the bound; the last film is complete',async()=>{
 const ps=pics(24);let seed=11;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
 const h=harness({files:filesOf(ps),delay:()=>Math.floor(rnd()*8)});
 const projects=Array.from({length:30},()=>{const n=1+Math.floor(rnd()*6),pick=new Set();while(pick.size<n)pick.add(ps[Math.floor(rnd()*ps.length)]);return sceneOf(...[...pick].map(p=>p.source));});
 const pm=createPreviewMedia({fetchBytes:h.fetchBytes,decode:h.decode,sha256Hex:shaAsync,registry:h.registry});
 const pending=[];let last=null;
 for(let i=0;i<400;i++){last=projects[Math.floor(rnd()*projects.length)];pending.push(pm.sync(last));if(rnd()<.4)await tick(Math.floor(rnd()*3));}
 await Promise.all(pending);const r=await pm.sync(last);
 assert.deepEqual(r.diagnostics,[]);
 const want=new Set(last.shots.map(s=>s.composition.items[0].source.sha256));assert.deepEqual(new Set(h.reg.keys()),want,'only the last film\'s pictures remain');
 assert.ok(pm.stats().peakActive<=2&&h.peak().inFlight<=2,'peak in flight '+h.peak().inFlight);
 assert.equal(h.created.filter(x=>!x.closed).length,h.reg.size,'every bitmap is registered or closed');
 const s=pm.stats();assert.equal(s.active,0);assert.equal(s.queued,0);assert.equal(pm.inflight(),0);
 assert.ok(s.aborted>0&&s.skippedFetch>0,'obsolete loads were aborted ('+s.aborted+') and skipped ('+s.skippedFetch+')');
 assert.ok(h.fetched.length<400*3,'far fewer fetches than requests ('+h.fetched.length+')');
});

test('H6. limits: concurrency must be 1–8; the memory bound is the registered budget plus two in-flight pictures',async()=>{
 const base={fetchBytes:async()=>new Uint8Array(),decode:async()=>null,sha256Hex:shaAsync};
 for(const bad of [0,9,1.5,'2',null])assert.throws(()=>createPreviewMedia({...base,maxConcurrent:bad}),/maxConcurrent: 1–8 required/);
 assert.equal(PREVIEW_LOADS.concurrent,2);
 assert.equal(previewMemoryBound(),MEDIA_LIMITS.filmDecodedBytes+2*(MEDIA_LIMITS.fileBytes+MEDIA_LIMITS.decodedBytes));
 assert.equal(previewMemoryBound()/1048576,448);
 // one slot: strictly sequential
 const ps=pics(4),h=harness({files:filesOf(ps)});
 const pm=createPreviewMedia({fetchBytes:h.fetchBytes,decode:h.decode,sha256Hex:shaAsync,registry:h.registry,maxConcurrent:1});
 await pm.sync(sceneOf(...ps.map(p=>p.source)));assert.equal(h.peak().inFlight,1);assert.equal(h.reg.size,4);
});

test('H7. a failing load releases its slot (errors never leak slots) and is reported once',async()=>{
 const ps=pics(3),files=filesOf(ps);delete files[ps[0].source.file];
 const h=harness({files});
 const pm=createPreviewMedia({fetchBytes:h.fetchBytes,decode:h.decode,sha256Hex:shaAsync,registry:h.registry,maxConcurrent:1});
 const r=await pm.sync(sceneOf(...ps.map(p=>p.source)));
 assert.equal(r.diagnostics.length,1);assert.match(r.diagnostics[0],/missing public\/media/);
 assert.equal(h.reg.size,2);assert.equal(pm.stats().active,0);
});
