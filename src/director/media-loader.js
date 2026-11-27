// DUAL-05 local media library and production boundary (Node only).
// The library is public/media/: one file per image, <id>.<png|jpg|webp>, and public/media/media.lock.json, the only
// way an image gets in (written by scripts/media-import.mjs after structure and decode checks). It is local user data
// and stays out of Git. At the production boundary (Director compile and authored --project load) every `image` item
// is resolved from the lock and the verified file: the file must exist inside public/media (no symlink, no escape),
// its SHA-256 must match the lock, and its structure is checked again (src/core/media.js; PNG image data is also
// inflated to its exact expected size). The resolved `source` overwrites whatever the author supplied.
import {lstatSync,readFileSync,realpathSync,existsSync} from 'node:fs';
import {join,resolve,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {inspectImage,pngRawSize,sceneImages,MEDIA_ID,MEDIA_FORMATS,MEDIA_LIMITS,EXTENSIONS} from '../core/media.js';
export const REPO_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..','..');
export const LOCK_NAME='media.lock.json',LOCK_VERSION='media-lock-v1';
const fail=m=>{throw Error('media: '+m)};
export const mediaDir=root=>join(root,'public','media');
const printable=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(s);
export const LOCK_FIELDS=Object.freeze(['file','format','sha256','bytes','width','height','orientation','displayWidth','displayHeight','alpha','licence','attribution','source','checks']);
// Licence metadata: a licence name, where the file came from and, for attribution licences, the credit line.
export function validateProvenance(e,p){
 if(!printable(e.licence,80))fail(p+'.licence: a licence (1–80 printable characters, e.g. own-work, CC0-1.0, CC-BY-4.0) required');
 if(!printable(e.source,300))fail(p+'.source: where the file came from (1–300 printable characters) required');
 if(e.attribution!==null&&!printable(e.attribution,200))fail(p+'.attribution: null or 1–200 printable characters required');
 if(/^CC-BY/i.test(e.licence)&&e.attribution===null)fail(p+'.attribution: required for '+e.licence);
}
export function validateLock(lock){
 if(!lock||typeof lock!=='object'||Array.isArray(lock)||lock.version!==LOCK_VERSION||!lock.media||typeof lock.media!=='object'||Array.isArray(lock.media))fail(LOCK_NAME+': {version:"'+LOCK_VERSION+'", media:{…}} required');
 for(const k of Object.keys(lock))if(!['version','note','media'].includes(k))fail(LOCK_NAME+'.'+k+': unknown field');
 for(const [id,e] of Object.entries(lock.media)){const p=LOCK_NAME+' '+id;
  if(!MEDIA_ID.test(id))fail(p+': unsafe media ID');
  if(!e||typeof e!=='object'||Array.isArray(e))fail(p+': entry required');
  for(const k of Object.keys(e))if(!LOCK_FIELDS.includes(k))fail(p+'.'+k+': unknown field');
  if(!Object.hasOwn(MEDIA_FORMATS,e.format)||e.file!==id+'.'+MEDIA_FORMATS[e.format].ext)fail(p+': file must be '+id+'.<png|jpg|webp> matching its format');
  if(typeof e.sha256!=='string'||!/^[0-9a-f]{64}$/.test(e.sha256))fail(p+'.sha256: 64 lowercase hex digits required');
  if(!Number.isSafeInteger(e.bytes)||e.bytes<1||e.bytes>MEDIA_LIMITS.fileBytes)fail(p+'.bytes: out of range');
  validateProvenance(e,p);
 }
 return lock;
}
export function readLock(root=REPO_ROOT){
 const dir=mediaDir(root),path=join(dir,LOCK_NAME);
 if(!existsSync(path))return {version:LOCK_VERSION,media:{}};
 safeDir(root);
 let lock;try{lock=JSON.parse(readFileSync(path,'utf8'));}catch(e){fail(LOCK_NAME+' is not valid JSON ('+e.message+')');}
 return validateLock(lock);
}
// public/media must be a real directory inside the project (not a link to somewhere else).
export function safeDir(root){
 const dir=mediaDir(root);let st;
 try{st=lstatSync(dir);}catch{fail('the media library folder public/media does not exist; import images with node scripts/media-import.mjs add <file> …');}
 if(st.isSymbolicLink()||!st.isDirectory())fail('public/media must be a real folder, not a link');
 const real=realpathSync(dir),base=realpathSync(join(root,'public'));
 if(real!==join(base,'media'))fail('public/media resolves outside the project');
 return real;
}
// A library file by name: <id>.<ext> only, a regular file (not a link), resolving inside public/media.
export function safeMediaPath(root,file){
 if(typeof file!=='string'||!/^[a-z0-9][a-z0-9-]{0,47}\.(png|jpg|webp)$/.test(file))fail('unsafe media file name '+JSON.stringify(String(file).slice(0,60))+' (expected <id>.png, .jpg or .webp)');
 const dir=safeDir(root),path=join(dir,file);let st;
 try{st=lstatSync(path);}catch{fail('missing file public/media/'+file+' (listed in '+LOCK_NAME+'); import it again');}
 if(st.isSymbolicLink())fail('public/media/'+file+' is a link; links are refused');
 if(!st.isFile())fail('public/media/'+file+' is not a regular file');
 if(st.size>MEDIA_LIMITS.fileBytes)fail('public/media/'+file+' is larger than '+MEDIA_LIMITS.fileBytes/1048576+' MB');
 const real=realpathSync(path);if(!real.startsWith(dir+sep))fail('public/media/'+file+' resolves outside the media folder');
 return real;
}
export const sha256=b=>createHash('sha256').update(b).digest('hex');
// PNG image data must inflate (zlib, checksummed) to exactly the size the header implies.
export function checkPngData(bytes,info){
 const z=Buffer.concat(info.png.data.map(([a,b])=>bytes.subarray(a,b))),want=pngRawSize(info.png);let raw;
 try{raw=inflateSync(z,{maxOutputLength:want+1});}catch(e){fail(e?.code==='ERR_BUFFER_TOO_LARGE'||e instanceof RangeError?'PNG image data is larger than its header says':'corrupt PNG image data ('+(e?.message??e)+')');}
 if(raw.length!==want)fail('PNG image data is incomplete ('+raw.length+' of '+want+' bytes)');
}
// Structure checks of bytes (no decode): signature, headers, bounds, animation, orientation; PNG data inflated.
export function checkBytes(bytes,declared){
 const info=inspectImage(new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.length),declared);
 if(info.format==='png')checkPngData(bytes,info);
 return info;
}
// Verify one locked entry against its file. Returns the resolved source written into image items.
export function verifyEntry(root,id,e){
 const path=safeMediaPath(root,e.file),bytes=readFileSync(path);
 if(bytes.length!==e.bytes||sha256(bytes)!==e.sha256)fail('public/media/'+e.file+' changed since it was imported (SHA-256 differs from '+LOCK_NAME+'); import it again under a new ID');
 const info=checkBytes(bytes,EXTENSIONS[e.file.split('.').pop()]);
 for(const k of ['format','width','height','orientation','displayWidth','displayHeight'])if(info[k]!==e[k])fail(LOCK_NAME+' '+id+'.'+k+' ('+e[k]+') differs from the file ('+info[k]+')');
 return {file:e.file,sha256:e.sha256,format:info.format,width:info.width,height:info.height,orientation:info.orientation,displayWidth:info.displayWidth,displayHeight:info.displayHeight};
}
const imageItems=project=>(project?.version===2&&Array.isArray(project.shots)?project.shots:[]).flatMap((s,i)=>s?.composition?.version==='compose-v2'&&Array.isArray(s.composition.items)?s.composition.items.map((x,j)=>[i,j,x]).filter(([,,x])=>x?.type==='image'):[]);
// Production boundary: resolve every image item from the lock and the verified file. Projects without images are
// returned unchanged (the same object).
export function resolveProjectMedia(project,{root=REPO_ROOT}={}){
 const items=imageItems(project);if(!items.length)return project;
 const lock=readLock(root),done=new Map(),out=structuredClone(project);
 for(const [i,j,x] of items){const p='shots['+i+'].composition.items['+j+'] (image '+(x.id??'?')+')';
  if(typeof x.media!=='string'||!MEDIA_ID.test(x.media))fail(p+': a media library ID required');
  const e=lock.media[x.media];if(!e)fail(p+': "'+x.media+'" is not in the media library ('+LOCK_NAME+'); import it with node scripts/media-import.mjs add <file> --id '+x.media+' --licence … --source …');
  if(!done.has(x.media))done.set(x.media,verifyEntry(root,x.media,e));
  out.shots[i].composition.items[j]={...x,source:{...done.get(x.media)}};}
 sceneImages(out);
 return out;
}
// Provenance of the images a project uses (for production manifests).
export function projectMedia(project,{root=REPO_ROOT}={}){
 const list=sceneImages(project);if(!list.length)return [];
 const lock=readLock(root);
 return list.map(s=>{const e=lock.media[s.media];if(!e||e.sha256!==s.sha256)fail('image '+s.media+' does not match '+LOCK_NAME);return {id:s.media,file:e.file,sha256:e.sha256,format:e.format,width:e.width,height:e.height,orientation:e.orientation,licence:e.licence,attribution:e.attribution,source:e.source};});
}
