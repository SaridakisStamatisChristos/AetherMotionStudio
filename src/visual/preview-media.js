// DUAL-07 audit repair: the Studio preview's picture manager. It owns every decoded picture it creates:
// - only verified pictures are registered, under their verified SHA-256: the actual bytes are hashed and checked with
//   the same function the native renderer uses (src/core/media.js verifyImageBytes), and the decoded size must be the
//   verified upright size; anything else becomes an explicit diagnostic and a labelled placeholder (preview only);
// - the registry holds only the current film's pictures: switching films unregisters (and closes) the others, so the
//   registered decoded memory stays within the per-film bound (MEDIA_LIMITS.filmDecodedBytes) however long the session
//   runs. Loads already in flight for a replaced film still complete before being closed, so transient memory is not
//   hard-bounded yet (DUAL-09 hardening: bounded concurrent decoding, cancelled obsolete fetches);
// - concurrent requests for the same picture share one load;
// - a load that finishes after its film was replaced is closed, never registered (stale loads cannot repopulate);
// - each sync's diagnostics are tagged with its generation, so the caller can ignore results of older films.
// Browser-safe; every platform function is injected (tests run it in Node with fakes).
import {sceneImages,verifyImageBytes,checkDecoded,MEDIA_LIMITS,MEDIA_FORMATS} from '../core/media.js';
import {registerImage,unregisterImage,loadedImage,registeredImages,registeredBytes} from './media-registry.js';
const DEFAULT_REGISTRY={register:registerImage,unregister:unregisterImage,get:loadedImage,keys:registeredImages,bytes:registeredBytes};
const closeBitmap=b=>{try{if(typeof b?.close==='function')b.close();}catch{}};
// fetchBytes(file) → Uint8Array (throws on missing); decode(bytes, mime) → bitmap {width,height,close()}; sha256Hex(bytes)
export function createPreviewMedia({fetchBytes,decode,sha256Hex,registry=DEFAULT_REGISTRY,budgetBytes=MEDIA_LIMITS.filmDecodedBytes}){
 let generation=0,wanted=new Set(),lastScene=null,lastSync=null;
 const inflight=new Map();
 const keyOf=s=>[s.sha256,s.file,s.format,s.width,s.height,s.orientation].join('|');
 async function loadOne(s){
  let bitmap=null;
  try{
   const bytes=await fetchBytes(s.file);
   await verifyImageBytes(bytes,s,sha256Hex);
   bitmap=await decode(bytes,MEDIA_FORMATS[s.format].mime);
   checkDecoded(bitmap,s);
  }catch(e){closeBitmap(bitmap);return {error:String(e?.message??e).replace(/^media: /,'')};}
  // ownership: register only if the current film still needs exactly this source; otherwise close it
  if(!wanted.has(keyOf(s))){closeBitmap(bitmap);return {stale:true};}
  if(registry.get(s.sha256)){closeBitmap(bitmap);return {ok:true};}
  const add=bitmap.width*bitmap.height*4;
  if(registry.bytes()+add>budgetBytes){closeBitmap(bitmap);return {error:'decoded pictures would exceed '+budgetBytes/1048576+' MB'};}
  registry.register(s.sha256,bitmap);return {ok:true};
 }
 async function run(scene,gen){
  const diagnostics=[];let need=[];
  try{need=sceneImages(scene);}catch(e){diagnostics.push(String(e.message).replace(/^media: /,''));}
  wanted=new Set(need.map(keyOf));
  const keepSha=new Set(need.map(s=>s.sha256));
  // release pictures this film does not use (closes their bitmaps)
  for(const sha of registry.keys())if(!keepSha.has(sha))registry.unregister(sha);
  await Promise.all(need.map(async s=>{
   if(registry.get(s.sha256))return;
   const k=keyOf(s);let p=inflight.get(k);
   if(!p){p=loadOne(s).finally(()=>inflight.delete(k));inflight.set(k,p);}
   const r=await p;
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
 return {sync,generation:()=>generation,inflight:()=>inflight.size};
}
