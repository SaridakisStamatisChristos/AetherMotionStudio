// DUAL-05 local media import: the only way an image enters the library (public/media + media.lock.json).
//   node scripts/media-import.mjs add <file> --id <id> --licence <licence> --source <where from> [--attribution <credit>]
//   node scripts/media-import.mjs verify      re-checks every locked file (hash, structure, PNG data)
//   node scripts/media-import.mjs list
// Checks on add (all must pass; nothing is written otherwise): a regular local file (no link, no device, no URL),
// at most 32 MB; PNG, JPEG or static WebP by signature matching the extension; bounded dimensions and decoded size;
// no animation; EXIF orientation (WebP must be upright); PNG CRCs and image data inflated in full; a strict ffmpeg
// decode (catches damaged JPEG scan data, which Chromium silently shows as grey); a decode in the renderer's own
// Chromium with the upright size checked. IDs are immutable: an ID is never overwritten with different bytes.
import {lstatSync,readFileSync,writeFileSync,renameSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve,extname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {MEDIA_ID,MEDIA_FORMATS,MEDIA_LIMITS,EXTENSIONS} from '../src/core/media.js';
import {REPO_ROOT,LOCK_NAME,LOCK_VERSION,mediaDir,safeDir,readLock,validateLock,validateProvenance,checkBytes,sha256,verifyEntry} from '../src/director/media-loader.js';
const fail=m=>{throw Error('media import: '+m)};
// Source file on the user's machine: a plain local path to a regular file.
export function readSourceFile(path){
 if(typeof path!=='string'||!path.trim())fail('a file path required');
 if(/^[a-z][a-z0-9+.-]*:\/\//i.test(path))fail('URLs are not accepted; download the file yourself and import the local copy');
 if(path.includes('\0'))fail('invalid path');
 let st;try{st=lstatSync(path);}catch{fail('file not found: '+path);}
 if(st.isSymbolicLink())fail(path+' is a link; import the file itself');
 if(!st.isFile())fail(path+' is not a regular file');
 if(st.size>MEDIA_LIMITS.fileBytes)fail(path+' is larger than '+MEDIA_LIMITS.fileBytes/1048576+' MB');
 const ext=extname(path).slice(1).toLowerCase();if(!Object.hasOwn(EXTENSIONS,ext))fail('extension .'+ext+' is not supported (.png, .jpg, .jpeg or .webp)');
 return {bytes:readFileSync(path),declared:EXTENSIONS[ext]};
}
export function ffmpegPath(env=process.env){
 if(env.AETHER_FFMPEG)return env.AETHER_FFMPEG;
 const py=join(REPO_ROOT,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
 if(existsSync(py)){const r=spawnSync(py,['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'});if(r.status===0)return r.stdout.trim();}
 return 'ffmpeg';
}
// Strict decode with ffmpeg (an existing local tool; no new dependency). Returns the tool's version line.
export function ffmpegDecode(file,{bin=ffmpegPath()}={}){
 const v=spawnSync(bin,['-version'],{encoding:'utf8'});if(v.status!==0)fail('ffmpeg is needed for the decode check and was not found (set AETHER_FFMPEG)');
 const r=spawnSync(bin,['-hide_banner','-v','error','-xerror','-err_detect','explode','-i',file,'-f','null','-'],{encoding:'utf8'});
 if(r.status!==0)fail('the image does not decode cleanly (ffmpeg: '+((r.stderr||'').trim().split('\n').slice(0,2).join(' | ').slice(0,300)||'exit '+r.status)+')');
 return v.stdout.split('\n')[0].split(' Copyright')[0];
}
// Decode in the renderer's own Chromium (Remotion's headless browser) and return the upright size it reports.
export async function browserDecode(bytes,format){
 const require=createRequire(join(REPO_ROOT,'package.json')),{openBrowser}=require('@remotion/renderer');
 const browser=await openBrowser('chrome',{logLevel:'error'});
 try{const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
  const r=await page.evaluate(async(b64,mime)=>{try{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const bm=await createImageBitmap(new Blob([bytes],{type:mime}));return {width:bm.width,height:bm.height,agent:navigator.userAgent.match(/(HeadlessChrome|Chrome)\/[0-9.]+/)?.[0]??'chromium'};}catch(e){return {error:String(e?.message??e)};}},Buffer.from(bytes).toString('base64'),MEDIA_FORMATS[format].mime);
  if(r.error)fail('the renderer\'s browser cannot decode the image ('+r.error+')');
  return r;
 }finally{await browser.close({silent:true});}
}
function writeAtomic(path,data){const tmp=path+'.tmp';writeFileSync(tmp,data);renameSync(tmp,path);}
export async function addMedia({file,id,licence,source,attribution=null,root=REPO_ROOT,decode=ffmpegDecode,browser=browserDecode}){
 if(typeof id!=='string'||!MEDIA_ID.test(id))fail('--id: lowercase letters, digits and hyphens (at most 48, starting with a letter or digit) required');
 const {bytes,declared}=readSourceFile(file);
 const info=checkBytes(bytes,declared),hash=sha256(bytes);
 const entry={file:id+'.'+MEDIA_FORMATS[info.format].ext,format:info.format,sha256:hash,bytes:bytes.length,width:info.width,height:info.height,orientation:info.orientation,displayWidth:info.displayWidth,displayHeight:info.displayHeight,alpha:info.alpha,licence,attribution,source,checks:null};
 validateProvenance(entry,'--');
 const dir=mediaDir(root);mkdirSync(dir,{recursive:true});safeDir(root);
 const lock=readLock(root),old=lock.media[id];
 if(old){if(old.sha256===hash)return {status:'unchanged',id,entry:old};fail('ID "'+id+'" already holds a different image (IDs are immutable); choose a new --id');}
 const tool=decode(resolve(file));
 const seen=await browser(bytes,info.format);
 if(seen.width!==info.displayWidth||seen.height!==info.displayHeight)fail('the renderer\'s browser shows the image as '+seen.width+'×'+seen.height+', expected '+info.displayWidth+'×'+info.displayHeight+' upright (orientation metadata not applied as expected)');
 entry.checks={structure:'media-v1',decode:[tool,seen.agent]};
 writeAtomic(join(dir,entry.file),bytes);
 const next=validateLock({version:LOCK_VERSION,note:'Local media library (DUAL-05). Written by scripts/media-import.mjs; do not edit by hand. Local data, not in Git.',media:{...lock.media,[id]:entry}});
 next.media=Object.fromEntries(Object.entries(next.media).sort(([a],[b])=>a<b?-1:1));
 writeAtomic(join(dir,LOCK_NAME),JSON.stringify(next,null,2)+'\n');
 verifyEntry(root,id,entry);
 return {status:'added',id,entry};
}
export function verifyLibrary(root=REPO_ROOT){const lock=readLock(root);return Object.entries(lock.media).map(([id,e])=>{try{verifyEntry(root,id,e);return {id,ok:true};}catch(err){return {id,ok:false,error:err.message};}});}
function parseArgs(argv){const [cmd,...rest]=argv,o={_:[]};while(rest.length){const a=rest.shift();if(a.startsWith('--')){const k=a.slice(2);if(!['id','licence','source','attribution'].includes(k))fail('unknown option --'+k);if(Object.hasOwn(o,k))fail('duplicate option --'+k);if(!rest.length)fail('--'+k+' needs a value');o[k]=rest.shift();}else o._.push(a);}return {cmd,o};}
async function main(){
 const {cmd,o}=parseArgs(process.argv.slice(2));
 if(cmd==='add'){if(o._.length!==1)fail('add <file> --id <id> --licence <licence> --source <where from> [--attribution <credit>]');
  const r=await addMedia({file:o._[0],id:o.id,licence:o.licence,source:o.source,attribution:o.attribution??null});
  console.log((r.status==='added'?'ADDED ':'UNCHANGED ')+r.id+' '+r.entry.file+' '+r.entry.format+' '+r.entry.displayWidth+'x'+r.entry.displayHeight+' orientation '+r.entry.orientation+' sha256 '+r.entry.sha256.slice(0,16)+'…');}
 else if(cmd==='verify'){const rows=verifyLibrary();for(const r of rows)console.log((r.ok?'OK   ':'FAIL ')+r.id+(r.ok?'':' '+r.error));if(rows.some(r=>!r.ok))process.exit(1);console.log('verified',rows.length,'images');}
 else if(cmd==='list'){for(const [id,e] of Object.entries(readLock().media))console.log(id,e.file,e.displayWidth+'x'+e.displayHeight,e.licence,'-',e.source);}
 else fail('commands: add, verify, list');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exit(1);});
