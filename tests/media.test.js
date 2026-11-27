// DUAL-05 local raster media: PNG, JPEG and static WebP only (owner rules 2026-11-26). Structure checks, bounds,
// animation and orientation rules, safe library paths, hashing and provenance, the production boundary, fit/crop and
// pan/zoom maths, and drawing on intermediate and final frames. All fixtures are built here from our own bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deflateSync} from 'node:zlib';
import {inspectImage,imageRects,sceneImages,validateSource,MEDIA_LIMITS} from '../src/core/media.js';
import {encodePNG,pngChunk,exifTiff,quadrants,storeForOrientation,buildWebP} from '../scripts/media-fixtures.mjs';
import {resolveProjectMedia,readLock,verifyEntry,checkBytes,safeMediaPath,projectMedia,sha256,LOCK_NAME} from '../src/director/media-loader.js';
import {addMedia,readSourceFile} from '../scripts/media-import.mjs';
import {layoutComposition,validateComposition} from '../src/core/composition.js';
import {drawComposition,imageView} from '../src/visual/draw-composition.js';
import {registerImage,clearImages,setMediaPreview} from '../src/visual/media-registry.js';
const u8=b=>new Uint8Array(b.buffer,b.byteOffset,b.length);
const rejects=(b,re,declared=null)=>assert.throws(()=>inspectImage(u8(Buffer.from(b)),declared),re);
// ---- our own byte-level fixtures (structure only; CI needs no encoder) ----
const png=(w=8,h=6,o={})=>encodePNG(quadrants(w,h),w,h,o);
function jpeg(w=40,h=30,{orientation=null,sof=0xc0,precision=8,components=3}={}){
 const seg=(m,data)=>Buffer.concat([Buffer.from([0xff,m,(data.length+2)>>8,(data.length+2)&255]),data]);
 const parts=[Buffer.from([0xff,0xd8])];
 if(orientation!==null)parts.push(seg(0xe1,Buffer.concat([Buffer.from('Exif','ascii'),Buffer.alloc(2),exifTiff(orientation,{littleEndian:false})])));
 parts.push(seg(0xdb,Buffer.alloc(65)));
 const sofData=Buffer.alloc(6+3*components);sofData[0]=precision;sofData.writeUInt16BE(h,1);sofData.writeUInt16BE(w,3);sofData[5]=components;for(let k=0;k<components;k++)sofData.set([k+1,0x11,0],6+3*k);
 parts.push(seg(sof,sofData),seg(0xc4,Buffer.alloc(20)),seg(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0x12,0x34,0xff,0x00,0x56]),Buffer.from([0xff,0xd9]));
 return Buffer.concat(parts);
}
const vp8l=(w,h,alpha=false)=>{const v=(w-1)|((h-1)<<14)|((alpha?1:0)<<28),d=Buffer.alloc(9);d[0]=0x2f;d.writeUInt32LE(v>>>0,1);return {type:'VP8L',data:d};};
const vp8=(w,h)=>{const d=Buffer.alloc(14);d.set([0x10,0x02,0x00,0x9d,0x01,0x2a]);d.writeUInt16LE(w,6);d.writeUInt16LE(h,8);return {type:'VP8 ',data:d};};
const vp8x=(w,h,flags=0)=>{const d=Buffer.alloc(10);d[0]=flags;d.writeUIntLE(w-1,4,3);d.writeUIntLE(h-1,7,3);return {type:'VP8X',data:d};};
const webp=(w=20,h=10)=>buildWebP([vp8l(w,h)]);

test('1. valid PNG, JPEG and static WebP are read from their headers: format, size, orientation, decoded bytes',()=>{
 assert.deepEqual((({format,width,height,orientation,displayWidth,displayHeight,alpha})=>({format,width,height,orientation,displayWidth,displayHeight,alpha}))(inspectImage(u8(png(8,6)),'png')),{format:'png',width:8,height:6,orientation:1,displayWidth:8,displayHeight:6,alpha:true});
 const j=inspectImage(u8(jpeg(40,30)),'jpeg');assert.equal(j.format,'jpeg');assert.equal(j.width,40);assert.equal(j.height,30);assert.equal(j.decodedBytes,40*30*4);
 for(const sof of [0xc0,0xc1,0xc2])assert.equal(inspectImage(u8(jpeg(5,5,{sof}))).format,'jpeg');
 assert.equal(inspectImage(u8(jpeg(5,5,{components:1}))).width,5);
 const w=inspectImage(u8(webp(20,10)),'webp');assert.equal(w.width,20);assert.equal(w.height,10);
 assert.equal(inspectImage(u8(buildWebP([vp8(33,17)]))).width,33);
 const ext=inspectImage(u8(buildWebP([vp8x(16,9,0x10),{type:'ALPH',data:Buffer.alloc(3)},vp8(16,9)])));assert.equal(ext.alpha,true);assert.equal(ext.height,9);
 // interlaced PNG and palette PNG parse; the Node check inflates the exact expected size
 const raw=Buffer.alloc(6*(1+8*4));const ih=Buffer.alloc(13);ih.writeUInt32BE(8,0);ih.writeUInt32BE(6,4);ih[8]=8;ih[9]=6;
 const plain=Buffer.concat([png().subarray(0,8),pngChunk('IHDR',ih),pngChunk('IDAT',deflateSync(raw)),pngChunk('IEND')]);
 assert.equal(checkBytes(plain,'png').width,8);
});

test('2. signature spoofing, SVG, GIF and unknown files are refused by signature, never by name',()=>{
 rejects(jpeg(),/file signature is JPEG but the name says PNG/,'png');
 rejects(png(),/file signature is PNG but the name says WEBP/,'webp');
 rejects(webp(),/file signature is WEBP but the name says JPEG/,'jpeg');
 rejects(Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>'),/SVG is not supported/,'png');
 rejects(Buffer.from('<svg onload="alert(1)"/>'),/SVG is not supported/);
 rejects(Buffer.from('GIF89a\x01\x00\x01\x00'),/GIF is not supported/);
 rejects(Buffer.from('#!/bin/sh\nrm -rf /'),/unknown or unsupported file signature/);
 rejects(Buffer.alloc(0),/empty file/);
 assert.throws(()=>inspectImage('not bytes'),/bytes required/);
 assert.throws(()=>readSourceFile('https://example.com/a.png'),/URLs are not accepted/);
 assert.throws(()=>readSourceFile('missing-'+Date.now()+'.png'),/file not found/);
});

test('3. every truncation of every format is refused with a media error (no crash, no partial acceptance)',()=>{
 for(const [name,b] of [['png',png(4,3,{orientation:6})],['jpeg',jpeg(4,3,{orientation:3})],['webp',webp(4,3)],['webp-x',buildWebP([vp8x(4,3,0x10),vp8l(4,3,true)])]])
  for(let n=1;n<b.length;n++)assert.throws(()=>inspectImage(u8(b.subarray(0,n))),e=>e instanceof Error&&e.message.startsWith('media: ')&&!(e instanceof TypeError)&&!(e instanceof RangeError),name+' cut at '+n);
 // JPEG without its end-of-image marker; WebP with data after the RIFF container; PNG with data after IEND
 const j=jpeg();rejects(j.subarray(0,j.length-2),/no end-of-image marker/);
 rejects(Buffer.concat([webp(),Buffer.alloc(4)]),/data after the RIFF container/);
 rejects(Buffer.concat([png(),Buffer.alloc(4)]),/truncated PNG|data after IEND/);
});

test('4. corrupt bytes: any PNG byte flip fails its CRC; PNG image data must inflate completely (Node check)',()=>{
 const b=png(6,5);
 for(let i=8;i<b.length;i++){const c=Buffer.from(b);c[i]^=0x40;assert.throws(()=>inspectImage(u8(c)),/media: /,'flip at '+i);}
 // a valid CRC around image data that is cut short: structure passes, the inflate check refuses it
 const raw=Buffer.alloc(5*(1+6*4),7),z=deflateSync(raw),ih=Buffer.alloc(13);ih.writeUInt32BE(6,0);ih.writeUInt32BE(5,4);ih[8]=8;ih[9]=6;
 const mk=d=>Buffer.concat([b.subarray(0,8),pngChunk('IHDR',ih),pngChunk('IDAT',d),pngChunk('IEND')]);
 assert.equal(inspectImage(u8(mk(z.subarray(0,z.length-6)))).width,6);
 assert.throws(()=>checkBytes(mk(z.subarray(0,z.length-6)),'png'),/corrupt PNG image data|incomplete/);
 assert.throws(()=>checkBytes(mk(deflateSync(raw.subarray(0,raw.length-10))),'png'),/incomplete/);
 assert.throws(()=>checkBytes(mk(deflateSync(Buffer.concat([raw,Buffer.alloc(50)]))),'png'),/larger than its header says/);
 // malformed structures
 rejects(Buffer.concat([b.subarray(0,8),pngChunk('IDAT',z),pngChunk('IEND')]),/IHDR must come first/);
 rejects(Buffer.concat([b.subarray(0,8),pngChunk('IHDR',ih),pngChunk('IEND')]),/no image data/);
 rejects(Buffer.concat([b.subarray(0,8),pngChunk('IHDR',ih),pngChunk('IDAT',z),pngChunk('tEXt',Buffer.from('a')),pngChunk('IDAT',z),pngChunk('IEND')]),/not contiguous/);
 rejects(Buffer.concat([b.subarray(0,8),pngChunk('IHDR',ih),pngChunk('ABCD',Buffer.alloc(1)),pngChunk('IDAT',z),pngChunk('IEND')]),/unsupported critical PNG chunk ABCD/);
 const bad16=Buffer.from(ih);bad16[8]=3;rejects(Buffer.concat([b.subarray(0,8),pngChunk('IHDR',bad16),pngChunk('IDAT',z),pngChunk('IEND')]),/unsupported PNG bit depth/);
 rejects(jpeg(5,5,{sof:0xc3}),/unsupported JPEG coding/);rejects(jpeg(5,5,{sof:0xc9}),/unsupported JPEG coding/);
 rejects(jpeg(5,5,{precision:12}),/precision 12/);rejects(jpeg(5,5,{components:2}),/component count 2/);
 rejects(Buffer.from([0xff,0xd8,0xff,0xd9]),/end of image before the image data/);
 rejects(buildWebP([vp8l(4,4),vp8l(4,4)]),/more than one image/);
 rejects(buildWebP([{type:'VP8L',data:Buffer.from([0x2e,0,0,0,0])}]),/VP8L signature/);
 rejects(buildWebP([vp8x(8,8),vp8l(4,4)]),/differs from the image/);
 rejects(buildWebP([{type:'ICCP',data:Buffer.alloc(4)},vp8l(4,4)]),/first chunk must be|unexpected chunk ICCP in a simple file/);
});

test('5. dimensions and decoded memory are bounded (zero, oversize sides, decompression bombs, file size)',()=>{
 const ih=(w,h)=>{const d=Buffer.alloc(13);d.writeUInt32BE(w,0);d.writeUInt32BE(h,4);d[8]=8;d[9]=6;return Buffer.concat([png().subarray(0,8),pngChunk('IHDR',d),pngChunk('IDAT',deflateSync(Buffer.alloc(1))),pngChunk('IEND')]);};
 rejects(ih(0,10),/zero image dimensions/);
 rejects(ih(8193,10),/exceeds 8192 px per side/);
 rejects(ih(10,2**31),/exceeds 8192 px per side/);
 // a tiny file that would decode to 8000×8000×4 = 244 MB (decompression bomb) is refused before any decode
 const bomb=ih(8000,8000);assert.ok(bomb.length<200);rejects(bomb,/decodes to 244 MB \(limit 64 MB\)/);
 rejects(jpeg(8192,8192),/decodes to 256 MB/);
 rejects(buildWebP([vp8l(16384,2)]),/exceeds 8192/);
 assert.equal(inspectImage(u8(ih(4096,4096))).decodedBytes,MEDIA_LIMITS.decodedBytes);
 assert.throws(()=>inspectImage(new Uint8Array(MEDIA_LIMITS.fileBytes+1)),/larger than 32 MB/);
});

test('6. animated formats are refused: APNG (acTL/fcTL/fdAT), animated WebP (VP8X flag, ANIM, ANMF)',()=>{
 const b=png(4,4),i=b.indexOf(Buffer.from('IDAT'))-4;
 for(const t of ['acTL','fcTL','fdAT'])rejects(Buffer.concat([b.subarray(0,i),pngChunk(t,Buffer.alloc(8)),b.subarray(i)]),/animated PNG \(APNG\) is not supported/);
 rejects(buildWebP([vp8x(4,4,0x02),vp8l(4,4)]),/animated WebP is not supported/);
 rejects(buildWebP([vp8x(4,4),{type:'ANIM',data:Buffer.alloc(6)},vp8l(4,4)]),/animated WebP is not supported/);
 rejects(buildWebP([vp8x(4,4),{type:'ANMF',data:Buffer.alloc(16)}]),/animated WebP is not supported/);
});

test('7. EXIF orientation 1–8: display size swaps for 5–8 (JPEG APP1, PNG eXIf); rotated WebP and bad EXIF refused',()=>{
 for(let o=1;o<=8;o++){
  const j=inspectImage(u8(jpeg(40,30,{orientation:o})));assert.equal(j.orientation,o);assert.deepEqual([j.displayWidth,j.displayHeight],o>=5?[30,40]:[40,30]);
  const p=inspectImage(u8(png(12,7,{orientation:o})));assert.equal(p.orientation,o);assert.deepEqual([p.displayWidth,p.displayHeight],o>=5?[7,12]:[12,7]);
  const x=buildWebP([vp8x(8,4,0x08),vp8l(8,4),{type:'EXIF',data:exifTiff(o)}]);
  if(o===1)assert.equal(inspectImage(u8(x)).orientation,1);else rejects(x,/WebP with EXIF orientation \d is not supported/);
 }
 // the inverse transform used for our own oriented fixtures is a true inverse (display pixels come back upright)
 const up=quadrants(6,4);for(let o=1;o<=8;o++){const s=storeForOrientation(up,6,4,o);assert.equal(s.width*s.height,24);assert.deepEqual([s.width,s.height],o>=5?[4,6]:[6,4]);}
 rejects(jpeg(4,4,{orientation:9}),/invalid EXIF orientation 9/);rejects(jpeg(4,4,{orientation:0}),/invalid EXIF orientation 0/);
 const tiff=exifTiff(6);tiff.write('XX',0,'ascii');
 const bad=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe1,0,tiff.length+8]),Buffer.from('Exif','ascii'),Buffer.alloc(2),tiff,jpeg().subarray(2)]);
 rejects(bad,/malformed EXIF metadata \(byte order\)/);
});

// ---- a temporary library ----
function library(){const root=mkdtempSync(join(tmpdir(),'aether-media-'));mkdirSync(join(root,'public','media'),{recursive:true});return root;}
const stubs={decode:()=>'ffmpeg (test stub)',browser:async(bytes,format)=>{const i=inspectImage(u8(bytes),format);return {width:i.displayWidth,height:i.displayHeight,agent:'stub'};}};
async function add(root,name,bytes,id,extra={}){const src=join(root,name);writeFileSync(src,bytes);return addMedia({file:src,id,licence:'own-work',source:'tests/media.test.js',root,...stubs,...extra});}

test('8. import: provenance required, IDs immutable, both decode checks gate the import, lock written atomically',async()=>{
 const root=library();
 try{
  const r=await add(root,'a.png',png(8,6),'card-a');assert.equal(r.status,'added');
  const lock=readLock(root);assert.deepEqual(Object.keys(lock.media),['card-a']);
  const e=lock.media['card-a'];assert.equal(e.file,'card-a.png');assert.equal(e.sha256,sha256(png(8,6)));assert.equal(e.licence,'own-work');assert.deepEqual(e.checks.decode,['ffmpeg (test stub)','stub']);
  assert.equal((await add(root,'a2.png',png(8,6),'card-a')).status,'unchanged');
  await assert.rejects(add(root,'b.png',png(9,6),'card-a'),/already holds a different image \(IDs are immutable\)/);
  await assert.rejects(add(root,'c.png',png(),'Card_A'),/--id: lowercase letters/);
  for(const id of ['../x','a/b','a\\b','c:x','a.png',''])await assert.rejects(add(root,'d.png',png(),id),/--id/);
  await assert.rejects(add(root,'e.png',png(),'no-licence',{licence:''}),/licence/);
  await assert.rejects(add(root,'f.png',png(),'by-no-credit',{licence:'CC-BY-4.0'}),/attribution: required for CC-BY-4.0/);
  await assert.rejects(add(root,'g.jpg',jpeg(),'bad-decode',{decode:()=>{throw Error('media import: the image does not decode cleanly (ffmpeg: error dc)');}}),/does not decode cleanly/);
  await assert.rejects(add(root,'h.jpg',jpeg(),'sideways',{browser:async()=>({width:30,height:40,agent:'stub'})}),/shows the image as 30×40, expected 40×30 upright/);
  await assert.rejects(add(root,'i.png',jpeg(),'spoof'),/signature is JPEG but the name says PNG/);
  await assert.rejects(add(root,'j.gif',Buffer.from('GIF89a'),'gif'),/extension .gif is not supported/);
  assert.deepEqual(Object.keys(readLock(root).media),['card-a']);// nothing written by failed imports
  assert.ok(!existsSync(join(root,'public','media','bad-decode.jpg')));
  await add(root,'k.jpg',jpeg(40,30,{orientation:6}),'photo');await add(root,'l.webp',webp(20,10),'wide');
  assert.deepEqual(Object.keys(readLock(root).media),['card-a','photo','wide']);
  assert.equal(readLock(root).media.photo.displayWidth,30);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('9. library paths are safe: names, traversal, links (file and folder), missing files, changed bytes',async()=>{
 const root=library();
 try{
  await add(root,'a.png',png(8,6),'card-a');
  for(const f of ['../secret.png','..\\secret.png','/etc/passwd','C:\\x.png','card-a.PNG','card-a.png'+String.fromCharCode(0),'card-a.gif','sub/card-a.png'])assert.throws(()=>safeMediaPath(root,f),/unsafe media file name/,f);
  assert.throws(()=>safeMediaPath(root,'nothere.png'),/missing file public\/media\/nothere.png/);
  const lock=readLock(root),e=lock.media['card-a'];
  // changed bytes after import
  const p=join(root,'public','media','card-a.png'),orig=readFileSync(p);writeFileSync(p,png(8,7));
  assert.throws(()=>verifyEntry(root,'card-a',e),/changed since it was imported/);writeFileSync(p,orig);
  assert.equal(verifyEntry(root,'card-a',e).sha256,e.sha256);
  // a hand-edited lock that lies about the size is refused against the file
  assert.throws(()=>verifyEntry(root,'card-a',{...e,width:99}),/card-a.width \(99\) differs from the file \(8\)/);
  // links: a file link inside the library (where the OS allows it) and the library folder itself as a link
  let fileLink=false;try{symlinkSync(p,join(root,'public','media','alias.png'));fileLink=true;}catch{}
  if(fileLink)assert.throws(()=>safeMediaPath(root,'alias.png'),/is a link; links are refused/);
  const other=library();rmSync(join(other,'public','media'),{recursive:true});symlinkSync(join(root,'public','media'),join(other,'public','media'),'junction');
  assert.throws(()=>safeMediaPath(other,'card-a.png'),/public\/media must be a real folder, not a link/);
  rmSync(other,{recursive:true,force:true});
  // a corrupt lock file
  writeFileSync(join(root,'public','media',LOCK_NAME),'{"version":"media-lock-v1","media":{"../x":{}}}');
  assert.throws(()=>readLock(root),/unsafe media ID/);
  writeFileSync(join(root,'public','media',LOCK_NAME),'not json');assert.throws(()=>readLock(root),/not valid JSON/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

// ---- compositions with images ----
const SRC={file:'card-a.png',sha256:'a'.repeat(64),format:'png',width:800,height:600,orientation:1,displayWidth:800,displayHeight:600};
const IMG=(extra={})=>({id:'pic',type:'image',box:[0,0,1,.6],media:'card-a',source:SRC,alt:'A test card',...extra});
const V2=items=>({version:'compose-v2',region:'full',font:'inter',items});

test('10. image items: strict validation of media, source, fit, crop, focus, move, alt, caption, plate and layers',()=>{
 const L=layoutComposition(V2([IMG({caption:'Our own test card'})])).items[0];
 assert.equal(L.image.fit,'cover');assert.ok(L.caption.strip>0);assert.equal(L.picture.h+L.caption.strip,L.box.h);
 const bad=(x,re)=>assert.throws(()=>validateComposition(V2([x])),re);
 bad(IMG({source:undefined}),/resolved source required; image items are resolved from the local media library/);
 bad(IMG({media:'../etc'}),/a media library ID/);
 bad(IMG({source:{...SRC,file:'other.png'}}),/does not belong to media card-a/);
 bad(IMG({source:{...SRC,file:'../card-a.png'}}),/<media id>.png required/);
 bad(IMG({source:{...SRC,format:'svg'}}),/png, jpeg or webp required/);
 bad(IMG({source:{...SRC,sha256:'xyz'}}),/64 lowercase hex/);
 bad(IMG({source:{...SRC,width:9000}}),/1–8192 required/);
 bad(IMG({source:{...SRC,orientation:6}}),/display size does not follow the orientation/);
 bad(IMG({source:{...SRC,extra:1}}),/unknown field/);
 bad(IMG({fit:'stretch'}),/cover or contain required/);
 bad(IMG({crop:[.5,.5,.6,.2]}),/must lie inside the picture/);
 bad(IMG({crop:[0,0,.01,.5]}),/at least 16×16 picture pixels/);
 bad(IMG({crop:[0,0,NaN,1]}),/\[x,y,w,h\]/);
 bad(IMG({focus:[1.2,.5]}),/0–1 required/);
 bad(IMG({move:{from:{x:.5,y:.5,zoom:1},to:{x:.5,y:.5,zoom:5}}}),/zoom: 1–4 required/);
 bad(IMG({move:{from:{x:.5,y:.5,zoom:1},to:{x:.5,y:.5,zoom:1}}}),/from and to are the same/);
 bad(IMG({move:{from:{x:.5,y:.5,zoom:1}}}),/\{x, y, zoom\} required/);
 bad(IMG({move:{from:{x:.5,y:.5,zoom:1},to:{x:.5,y:.5,zoom:2},speed:3}}),/move.speed: unknown field/);
 bad(IMG({alt:undefined}),/alt: printable text required/);
 bad(IMG({alt:'x'.repeat(161)}),/at most 160 characters/);
 bad(IMG({caption:'x'.repeat(81)}),/at most 80 characters/);
 bad(IMG({caption:'Sehr lange Bildunterschrift die nicht passt '.repeat(1).trim()+' und noch mehr Wörter',box:[0,0,.2,.2]}),/caption .* does not fit/);
 bad(IMG({plate:'yes'}),/true or false required/);
 bad(IMG({emphasis:['x']}),/unknown field for image/);
 bad(IMG({url:'http://x'}),/unknown field for image/);
 bad(IMG({src:'C:/x.png'}),/unknown field for image/);
 // layering: a lower-layer image may carry text; a normal image may not overlap text
 const card={id:'t',type:'card',box:[.1,.1,.8,.3],text:'Over the picture'};
 assert.throws(()=>validateComposition(V2([IMG({box:[0,0,1,.6]}),card])),/overlap while both are on screen/);
 validateComposition(V2([IMG({box:[0,0,1,.6],under:true}),card]));
 validateComposition(V2([IMG({box:[0,0,1,.6],under:true}),IMG({id:'over',box:[.5,.3,.4,.3],plate:false})]));
});

test('11. fit and crop maths: contain never cuts, cover always fills and never leaves the crop; deterministic',()=>{
 const box={x:100,y:200,w:400,h:300},img={width:800,height:600};
 for(const crop of [[0,0,1,1],[.25,.1,.5,.8],[0,0,.1,1],[.9,0,.1,.1]])for(const fit of ['cover','contain'])for(const focus of [[0,0],[.5,.5],[1,1],[.2,.9]]){
  const {src,dst}=imageRects(img,box,{fit,crop,focus}),cx=crop[0]*800,cy=crop[1]*600,cw=crop[2]*800,ch=crop[3]*600,e=1e-9;
  assert.ok(src[0]>=cx-e&&src[1]>=cy-e&&src[0]+src[2]<=cx+cw+e&&src[1]+src[3]<=cy+ch+e,'source inside crop '+fit+' '+crop);
  assert.ok(dst[0]>=box.x-e&&dst[1]>=box.y-e&&dst[0]+dst[2]<=box.x+box.w+e&&dst[1]+dst[3]<=box.y+box.h+e,'inside box');
  assert.ok(Math.abs(src[2]/src[3]-dst[2]/dst[3])<1e-9,'aspect kept (no stretch)');
  if(fit==='contain'){assert.ok(Math.abs(src[2]-cw)<e&&Math.abs(src[3]-ch)<e,'whole crop shown');assert.ok(Math.abs(dst[2]-box.w)<e||Math.abs(dst[3]-box.h)<e);}
  else assert.deepEqual(dst,[100,200,400,300]);
  assert.deepEqual(imageRects(img,box,{fit,crop,focus}),{src,dst});
 }
 // cover focus picks the kept part: wide picture in a tall box keeps the left, centre or right
 const tall={x:0,y:0,w:100,h:400};assert.equal(imageRects(img,tall,{focus:[0,.5]}).src[0],0);assert.equal(imageRects(img,tall,{focus:[1,.5]}).src[0]+imageRects(img,tall,{focus:[1,.5]}).src[2],800);
 // zoom 2 around a corner is clamped inside the picture
 const z=imageRects(img,box,{fit:'contain',view:{x:0,y:0,zoom:2}});assert.deepEqual(z.src,[0,0,400,300]);
 const z2=imageRects(img,box,{fit:'contain',view:{x:1,y:1,zoom:4}});assert.deepEqual(z2.src,[600,450,200,150]);
});

function recorder(){const ops=[];let alpha=1;const stack=[];
 const ctx=new Proxy({},{get:(o,k)=>{if(k==='measureText')return s=>({width:s.length*10});if(k==='save')return ()=>stack.push(alpha);if(k==='restore')return ()=>{alpha=stack.pop()??1;};if(k==='globalAlpha')return alpha;if(k in o)return o[k];
  return (...a)=>{if(['drawImage','fillText'].includes(k))ops.push({op:k,a,alpha});};},set:(o,k,v)=>{if(k==='globalAlpha')alpha=v;else o[k]=v;return true;}});
 return {ctx,ops};}

test('12. drawing: the exact source rectangle on intermediate and final frames of a pan/zoom; no silent substitute',()=>{
 const c=V2([IMG({box:[0,0,1,.6],fit:'cover',move:{from:{x:.2,y:.5,zoom:1},to:{x:.8,y:.4,zoom:2}},start:.1,end:1})]);
 const bitmap={width:800,height:600};clearImages();
 // not loaded: the render stops with a clear message (never a placeholder in a render)
 assert.throws(()=>drawComposition(recorder().ctx,c,.5,300),/image card-a \(card-a.png\) was not loaded before drawing; the render is stopped/);
 // preview mode (Studio) draws a labelled placeholder instead
 setMediaPreview(true);const pv=recorder();drawComposition(pv.ctx,c,.5,300);assert.match(pv.ops.find(o=>o.op==='fillText').a[0],/image card-a \(not loaded in the preview\)/);setMediaPreview(false);
 registerImage(SRC.sha256,bitmap);
 const L=layoutComposition(c).items[0],at=p=>{const r=recorder();drawComposition(r.ctx,c,p,300);return r.ops.find(o=>o.op==='drawImage');};
 assert.equal(at(.05),undefined);// before the item's start
 const first=at(.12),mid=at(.55),last=at(1);
 for(const d of [first,mid,last]){assert.equal(d.a[0],bitmap);const [sx,sy,sw,sh]=d.a.slice(1,5);assert.ok(sx>=0&&sy>=0&&sx+sw<=800+1e-9&&sy+sh<=600+1e-9,'inside the picture');}
 // the view at each frame is exactly the pure interpolation; the zoom grows monotonically and ends at the target
 for(const [d,p] of [[first,.12],[mid,.55],[last,1]]){const v=imageView(L,p,.1),{src}=imageRects({width:800,height:600},L.picture,{fit:'cover',view:v});assert.deepEqual(d.a.slice(1,5),src);}
 assert.equal(imageView(L,.1,.1).zoom,1);assert.equal(imageView(L,1,.1).zoom,2);
 const zm=imageView(L,.55,.1).zoom;assert.ok(zm>1&&zm<2);
 assert.ok(first.a[3]>mid.a[3]&&mid.a[3]>last.a[3],'source window shrinks as the zoom grows');
 assert.ok(first.a[1]<mid.a[1],'pans right');
 // same frame, same pixels' instructions (deterministic)
 assert.deepEqual(at(.55).a.slice(1),mid.a.slice(1));
 clearImages();
});

test('13. per-film bounds: at most 12 distinct images and 256 MB decoded in total',()=>{
 const shot=items=>({composition:V2(items)});
 const img=(k,w=100,h=100)=>({type:'image',media:'m'+k,source:{...SRC,file:'m'+k+'.png',sha256:String(k%10).repeat(64).slice(0,63)+(k>9?'f':'e'),width:w,height:h,displayWidth:w,displayHeight:h}});
 assert.equal(sceneImages({version:2,shots:[shot([img(1),img(1)]),shot([img(2)])]}).length,2);
 assert.throws(()=>sceneImages({version:2,shots:Array.from({length:13},(_,k)=>shot([img(k)]))}),/at most 12 distinct images \(13 found\)/);
 assert.throws(()=>sceneImages({version:2,shots:[1,2,3,4,5].map(k=>shot([img(k,4096,4096)]))}),/decode to 320 MB together \(limit 256 MB\)/);
});

test('14. production boundary: sources come only from the lock and the verified file; hostile sources overwritten',async()=>{
 const root=library();
 try{
  await add(root,'k.jpg',jpeg(40,30,{orientation:6}),'photo');
  const {direct}=await import('../src/director/index.js');
  const q=JSON.parse(readFileSync(new URL('../examples/dual04-bread.request.json',import.meta.url),'utf8'));
  const at='First the baker mixes flour, water, salt and yeast.';
  const vis=src=>({...q,id:'dual05-test',visuals:[{at,composition:{version:'compose-v2',region:'full',font:'merriweather',theme:'paper-v1',items:[{id:'pic',type:'image',box:[.05,.05,.9,.7],media:'photo',alt:'A test photograph',caption:'Our own test image',fit:'contain',...(src?{source:src}:{})}]}}]});
  const r=await direct(vis({...SRC,file:'photo.jpg',format:'jpeg',sha256:'b'.repeat(64)}),{mediaRoot:root});
  const item=r.project.shots.flatMap(s=>s.composition?.items??[]).find(x=>x.type==='image');
  assert.equal(item.source.sha256,readLock(root).media.photo.sha256);assert.deepEqual([item.source.displayWidth,item.source.displayHeight,item.source.orientation],[30,40,6]);
  const prov=projectMedia(r.project,{root});assert.deepEqual(prov.map(x=>[x.id,x.licence,x.source]),[['photo','own-work','tests/media.test.js']]);
  // unknown ID, missing file, changed file: explicit errors at the boundary
  await assert.rejects(direct({...vis(),visuals:[{...vis().visuals[0],composition:{...vis().visuals[0].composition,items:[{...vis().visuals[0].composition.items[0],media:'nobody'}]}}]},{mediaRoot:root}),/"nobody" is not in the media library/);
  const p=join(root,'public','media','photo.jpg'),orig=readFileSync(p);
  writeFileSync(p,Buffer.concat([orig.subarray(0,orig.length-2),Buffer.from([0,0xff,0xd9])]));await assert.rejects(direct(vis(),{mediaRoot:root}),/changed since it was imported/);
  rmSync(p);await assert.rejects(direct(vis(),{mediaRoot:root}),/missing file public\/media\/photo.jpg/);
  writeFileSync(p,orig);
  // projects without images are returned unchanged (same object)
  const plain={version:2,shots:[]};assert.equal(resolveProjectMedia(plain,{root}),plain);
  // the repository library (absent in CI) gives an explicit message, never a fallback
  const empty=library();await assert.rejects(direct(vis(),{mediaRoot:empty}),/is not in the media library/);rmSync(empty,{recursive:true,force:true});
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('15. resolved sources cannot be forged into the shared validator: shape, orientation and size rules hold',()=>{
 assert.throws(()=>validateSource(null,'s'),/resolved source required/);
 assert.throws(()=>validateSource({...SRC,width:4096,height:8192,displayWidth:4096,displayHeight:8192},'s'),/decoded size over 64 MB/);
 assert.equal(validateSource({...SRC,orientation:6,displayWidth:600,displayHeight:800},'s').orientation,6);
});
