// DUAL-07 audit repair: the Studio preview's picture manager. It owns every decoded picture it creates:
// - only verified pictures are registered, under their verified SHA-256: the actual bytes are hashed and checked with
//   the same function the native renderer uses (src/core/media.js verifyImageBytes), and the decoded size must be the
//   verified upright size; anything else becomes an explicit diagnostic and a labelled placeholder (preview only);
// - the registry holds only the current film's pictures: switching films unregisters (and closes) the others, so the
//   registered decoded memory stays within the per-film bound (MEDIA_LIMITS.filmDecodedBytes) however long the session
//   runs;
// - concurrent requests for the same picture share one load;
// - a load that finishes after its film was replaced is closed, never registered (stale loads cannot repopulate);
// - each sync's diagnostics are tagged with its generation, so the caller can ignore results of older films.
// DUAL-09 hardening (owner review of the DUAL-07 audit): what is *in flight* is bounded too.
// - At most `maxConcurrent` pictures (default 2) are fetched, verified and decoded at once; the others wait.
// - Switching films aborts the fetches of pictures the new film does not use (AbortSignal passed to fetchBytes).
//   A waiting load that became obsolete never starts, and an obsolete load is never decoded.
// - So the picture memory this manager holds is at most budgetBytes registered plus maxConcurrent ×
//   (MEDIA_LIMITS.fileBytes + MEDIA_LIMITS.decodedBytes) in flight, whatever the switching rate.
// Browser-safe; every platform function is injected (tests run it in Node with fakes).
import {sceneImages,verifyImageBytes,checkDecoded,MEDIA_LIMITS,MEDIA_FORMATS} from '../core/media.js';
import {registerImage,unregisterImage,loadedImage,registeredImages,registeredBytes} from './media-registry.js';
const DEFAULT_REGISTRY={register:registerImage,unregister:unregisterImage,get:loadedImage,keys:registeredImages,bytes:registeredBytes};
const closeBitmap=b=>{try{if(typeof b?.close==='function')b.close();}catch{}};
export const PREVIEW_LOADS=Object.freeze({concurrent:2,maxConcurrent:8});
// The bound on picture memory held by one manager (bytes), for reports and tests.
export const previewMemoryBound=(budgetBytes=MEDIA_LIMITS.filmDecodedBytes,concurrent=PREVIEW_LOADS.concurrent)=>budgetBytes+concurrent*(MEDIA_LIMITS.fileBytes+MEDIA_LIMITS.decodedBytes);
// fetchBytes(file, signal) → Uint8Array (throws on missing or abort); decode(bytes, mime) → bitmap {width,height,close()};
// sha256Hex(bytes)
export function createPreviewMedia({fetchBytes,decode,sha256Hex,registry=DEFAULT_REGISTRY,budgetBytes=MEDIA_LIMITS.filmDecodedBytes,maxConcurrent=PREVIEW_LOADS.concurrent}){
 if(!Number.isInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>PREVIEW_LOADS.maxConcurrent)throw Error('maxConcurrent: 1–'+PREVIEW_LOADS.maxConcurrent+' required');
 let generation=0,wanted=new Set(),lastScene=null,lastSync=null;
 const inflight=new Map();// key → {promise, controller}
 const counts={started:0,aborted:0,skippedFetch:0,skippedDecode:0,peakActive:0};
 // a slot is handed straight to the next waiter, so `active` never exceeds maxConcurrent
 let active=0;const waiting=[];
 const acquire=()=>{if(active<maxConcurrent){active++;counts.peakActive=Math.max(counts.peakActive,active);return Promise.resolve();}return new Promise(r=>waiting.push(r));};
 const release=()=>{const next=waiting.shift();if(next)next();else active--;};
 const keyOf=s=>[s.sha256,s.file,s.format,s.width,s.height,s.orientation].join('|');
 async function loadOne(s,k,signal){
  const obsolete=()=>signal.aborted||!wanted.has(k);
  await acquire();
  try{
   let bitmap=null;
   try{
    if(obsolete()){counts.skippedFetch++;return {stale:true};}
    counts.started++;
    const bytes=await fetchBytes(s.file,signal);
    if(obsolete()){counts.skippedDecode++;return {stale:true};}
    await verifyImageBytes(bytes,s,sha256Hex);
    if(obsolete()){counts.skippedDecode++;return {stale:true};}
    bitmap=await decode(bytes,MEDIA_FORMATS[s.format].mime);
    checkDecoded(bitmap,s);
   }catch(e){closeBitmap(bitmap);if(obsolete())return {stale:true};return {error:String(e?.message??e).replace(/^media: /,'')};}
   // ownership: register only if the current film still needs exactly this source; otherwise close it
   if(obsolete()){closeBitmap(bitmap);return {stale:true};}
   if(registry.get(s.sha256)){closeBitmap(bitmap);return {ok:true};}
   const add=bitmap.width*bitmap.height*4;
   if(registry.bytes()+add>budgetBytes){closeBitmap(bitmap);return {error:'decoded pictures would exceed '+budgetBytes/1048576+' MB'};}
   registry.register(s.sha256,bitmap);return {ok:true};
  }finally{release();}
 }
 async function run(scene,gen){
  const diagnostics=[];let need=[];
  try{need=sceneImages(scene);}catch(e){diagnostics.push(String(e.message).replace(/^media: /,''));}
  wanted=new Set(need.map(keyOf));
  const keepSha=new Set(need.map(s=>s.sha256));
  // release pictures this film does not use (closes their bitmaps)
  for(const sha of registry.keys())if(!keepSha.has(sha))registry.unregister(sha);
  // abort loads this film does not use; they release their slot as soon as their fetch stops
  for(const [k,e] of inflight)if(!wanted.has(k)){e.controller.abort();inflight.delete(k);counts.aborted++;}
  await Promise.all(need.map(async s=>{
   if(registry.get(s.sha256))return;
   const k=keyOf(s);let e=inflight.get(k);
   if(!e){const controller=new AbortController();e={controller};e.promise=loadOne(s,k,controller.signal).finally(()=>{if(inflight.get(k)===e)inflight.delete(k);});inflight.set(k,e);}
   const r=await e.promise;
   if(r.error)diagnostics.push('picture '+s.media+': '+r.error);
   else if(r.stale&&gen===generation&&!registry.get(s.sha256))diagnostics.push('picture '+s.media+': load was replaced');
  }));
  return {generation:gen,current:gen===generation,diagnostics,registered:registry.keys().length,decodedBytes:registry.bytes()};
 }
 // Sync the registry to a film (memoized per scene object: repeated paints of the same film reuse one sync).
 function sync(scene){
  if(scene===lastScene&&lastSync)return lastSync.then(r=>({...r,current:r.generation===generation}));
  lastScene=scene;const gen=++generation;lastSync=run(scene,gen);
  return lastSync.then(r=>({...r,current:r.generation===generation}));
 }
 return {sync,generation:()=>generation,inflight:()=>inflight.size,stats:()=>({...counts,active,queued:waiting.length,maxConcurrent})};
}
