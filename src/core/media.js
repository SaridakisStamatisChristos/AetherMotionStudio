// DUAL-05 local raster media (owner rules 2026-11-26): PNG, JPEG and static WebP only; no SVG, no remote fetching,
// no animated formats, no new dependencies. This module is pure (Uint8Array in, plain data out; no Node or browser
// API), so the import tool, the production boundary (Node) and the renderer (Chromium) apply the same rules.
// It reads headers and chunk/segment structure only; it never decodes pixels. Every rejection is an explicit
// 'media: …' error. Pixel decoding is done by Chromium at render time (createImageBitmap), and a failed decode fails
// the render; the Node side additionally inflates PNG image data to prove it is complete (src/director/media-loader.js).
export const MEDIA_FORMATS=Object.freeze({
 png:Object.freeze({ext:'png',mime:'image/png'}),
 jpeg:Object.freeze({ext:'jpg',mime:'image/jpeg'}),
 webp:Object.freeze({ext:'webp',mime:'image/webp'})
});
export const EXTENSIONS=Object.freeze({png:'png',jpg:'jpeg',jpeg:'jpeg',webp:'webp'});
// Bounds: each side, decoded RGBA bytes per image (64 MB), file size, and per film: distinct images and decoded total.
export const MEDIA_LIMITS=Object.freeze({side:8192,decodedBytes:64*1024*1024,fileBytes:32*1024*1024,filmImages:12,filmDecodedBytes:256*1024*1024});
export const MEDIA_ID=/^[a-z0-9][a-z0-9-]{0,47}$/;
const fail=m=>{throw Error('media: '+m)};
const u16be=(b,i)=>b[i]<<8|b[i+1],u32be=(b,i)=>(b[i]*16777216)+(b[i+1]<<16|b[i+2]<<8|b[i+3]);
const u16le=(b,i)=>b[i]|b[i+1]<<8,u24le=(b,i)=>b[i]|b[i+1]<<8|b[i+2]<<16,u32le=(b,i)=>b[i]+(b[i+1]<<8|b[i+2]<<16)+b[i+3]*16777216;
const ascii=(b,i,n)=>{let s='';for(let k=0;k<n;k++)s+=String.fromCharCode(b[i+k]);return s;};
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
export function crc32(b,from=0,to=b.length){let c=0xffffffff;for(let i=from;i<to;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
// Format from the file signature (never from the name).
export function sniffFormat(b){
 if(b.length>=8&&b[0]===0x89&&ascii(b,1,3)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)return 'png';
 if(b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'jpeg';
 if(b.length>=12&&ascii(b,0,4)==='RIFF'&&ascii(b,8,4)==='WEBP')return 'webp';
 return null;
}
// EXIF orientation (TIFF IFD0 tag 0x0112) from a TIFF block. Malformed EXIF is rejected (never guessed).
export function exifOrientation(b,start,end){
 if(end-start<8)fail('malformed EXIF metadata (too short)');
 const order=ascii(b,start,2);if(order!=='II'&&order!=='MM')fail('malformed EXIF metadata (byte order)');
 const le=order==='II',r16=i=>le?u16le(b,i):u16be(b,i),r32=i=>le?u32le(b,i):u32be(b,i);
 if(r16(start+2)!==42)fail('malformed EXIF metadata (TIFF marker)');
 const ifd=start+r32(start+4);if(ifd+2>end||ifd<start+8)fail('malformed EXIF metadata (IFD offset)');
 const n=r16(ifd);if(n>1000||ifd+2+n*12>end)fail('malformed EXIF metadata (IFD size)');
 let orientation=1,seen=false;
 for(let k=0;k<n;k++){const e=ifd+2+k*12;if(r16(e)!==0x0112)continue;if(seen)fail('malformed EXIF metadata (two orientation tags)');seen=true;
  if(r16(e+2)!==3||r32(e+4)!==1)fail('malformed EXIF metadata (orientation type)');orientation=r16(e+8);
  if(orientation<1||orientation>8)fail('invalid EXIF orientation '+orientation+' (1–8 allowed)');}
 return orientation;
}
const PNG_DEPTHS={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
const PNG_CHANNELS={0:1,2:3,3:1,4:2,6:4};
const PNG_KNOWN=new Set(['IHDR','PLTE','IDAT','IEND','tRNS','cHRM','gAMA','iCCP','sBIT','sRGB','cICP','mDCV','cLLI','tEXt','zTXt','iTXt','bKGD','hIST','pHYs','sPLT','tIME','eXIf']);
function parsePNG(b){
 let p=8,ihdr=null,idat=false,idatClosed=false,plte=false,ended=false,orientation=1,exif=false;const data=[];
 while(p<b.length){
  if(p+12>b.length)fail('truncated PNG (incomplete chunk at byte '+p+')');
  const n=u32be(b,p),type=ascii(b,p+4,4),end=p+12+n;
  if(!/^[A-Za-z]{4}$/.test(type))fail('malformed PNG chunk type at byte '+p);
  if(n>0x7fffffff||end>b.length)fail('truncated PNG (chunk '+type+' runs past the end of the file)');
  if(crc32(b,p+4,p+8+n)!==u32be(b,p+8+n))fail('corrupt PNG (CRC mismatch in chunk '+type+')');
  const d=p+8;
  if(!ihdr&&type!=='IHDR')fail('malformed PNG (IHDR must come first)');
  if(['acTL','fcTL','fdAT'].includes(type))fail('animated PNG (APNG) is not supported; use a static image');
  if(type==='IHDR'){if(ihdr||n!==13)fail('malformed PNG header (IHDR)');
   ihdr={width:u32be(b,d),height:u32be(b,d+4),depth:b[d+8],colour:b[d+9],interlace:b[d+12]};
   if(!PNG_DEPTHS[ihdr.colour]?.includes(ihdr.depth))fail('unsupported PNG bit depth '+ihdr.depth+' for colour type '+ihdr.colour);
   if(b[d+10]!==0||b[d+11]!==0||ihdr.interlace>1)fail('unsupported PNG compression, filter or interlace method');}
  else if(type==='PLTE'){if(idat||plte)fail('malformed PNG (palette order)');plte=true;}
  else if(type==='IDAT'){if(idatClosed)fail('malformed PNG (image data is not contiguous)');idat=true;data.push([d,d+n]);}
  else if(type==='IEND'){if(n!==0)fail('malformed PNG (IEND)');if(end!==b.length)fail('PNG has data after IEND');ended=true;}
  else{if(idat)idatClosed=true;
   if(type==='eXIf'){if(exif)fail('malformed PNG (two eXIf chunks)');exif=true;orientation=exifOrientation(b,d,d+n);}
   else if(!PNG_KNOWN.has(type)&&type.charCodeAt(0)<97)fail('unsupported critical PNG chunk '+type);}
  p=end;if(ended)break;
 }
 if(!ihdr)fail('malformed PNG (no IHDR)');
 if(!idat)fail('PNG has no image data');
 if(!ended)fail('truncated PNG (no IEND)');
 if(ihdr.colour===3&&!plte)fail('malformed PNG (palette image without PLTE)');
 return {format:'png',width:ihdr.width,height:ihdr.height,orientation,alpha:ihdr.colour===4||ihdr.colour===6,png:{...ihdr,channels:PNG_CHANNELS[ihdr.colour],data}};
}
// Bytes the inflated PNG image data must have (filter byte per row; Adam7 passes when interlaced).
export function pngRawSize({width,height,depth,channels,interlace}){
 const row=w=>w?1+Math.ceil(w*depth*channels/8):0;
 if(!interlace)return height*row(width);
 let n=0;for(const [x0,y0,dx,dy] of [[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]]){const w=Math.ceil((width-x0)/dx),h=Math.ceil((height-y0)/dy);if(w>0&&h>0)n+=h*row(w);}
 return n;
}
// SOF0 baseline, SOF1 extended sequential, SOF2 progressive (Huffman). Lossless, hierarchical and arithmetic-coded
// JPEGs are refused (not reliably decoded everywhere).
const JPEG_SOF_OK=new Set([0xc0,0xc1,0xc2]),JPEG_SOF_ALL=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
function parseJPEG(b){
 let p=2,sof=null,orientation=1,exif=false;
 for(;;){
  if(p>=b.length)fail('truncated JPEG (no image data)');
  if(b[p]!==0xff)fail('malformed JPEG (expected a marker at byte '+p+')');
  while(b[p]===0xff&&p<b.length)p++;
  if(p>=b.length)fail('truncated JPEG (no image data)');
  const m=b[p++];
  if(m===0xd9)fail('malformed JPEG (end of image before the image data)');
  if(m===0x01||(m>=0xd0&&m<=0xd7)||m===0xd8||m===0x00)fail('malformed JPEG (unexpected marker 0x'+m.toString(16)+' in the header)');
  if(p+2>b.length)fail('truncated JPEG (segment length)');
  const n=u16be(b,p);if(n<2||p+n>b.length)fail('truncated JPEG (segment 0x'+m.toString(16)+' runs past the end of the file)');
  const d=p+2,end=p+n;
  if(m===0xe1&&n>=8&&ascii(b,d,4)==='Exif'&&b[d+4]===0&&b[d+5]===0){if(exif)fail('malformed JPEG (two EXIF blocks)');exif=true;orientation=exifOrientation(b,d+6,end);}
  if(JPEG_SOF_ALL.has(m)){
   if(sof)fail('malformed JPEG (two frame headers)');
   if(!JPEG_SOF_OK.has(m))fail('unsupported JPEG coding (SOF 0x'+m.toString(16)+'); save as baseline or progressive JPEG');
   if(n<8)fail('malformed JPEG frame header');
   sof={precision:b[d],height:u16be(b,d+1),width:u16be(b,d+3),components:b[d+5]};
   if(sof.precision!==8)fail('unsupported JPEG precision '+sof.precision+' bits (8 required)');
   if(![1,3,4].includes(sof.components)||n!==8+3*sof.components)fail('unsupported JPEG component count '+sof.components);
  }
  if(m===0xda){if(!sof)fail('malformed JPEG (image data before the frame header)');break;}
  p=end;
 }
 // the entropy-coded data runs to the end-of-image marker, which must close the file
 let e=b.length;while(e>p&&b[e-1]===0)e--;// tolerate zero padding written by some encoders
 if(e<p+2||b[e-2]!==0xff||b[e-1]!==0xd9)fail('truncated JPEG (no end-of-image marker)');
 return {format:'jpeg',width:sof.width,height:sof.height,orientation,alpha:false};
}
function parseWEBP(b){
 const riff=u32le(b,4);
 if(riff+8!==b.length)fail(riff+8>b.length?'truncated WebP (RIFF size '+(riff+8)+' > file size '+b.length+')':'WebP has data after the RIFF container');
 let p=12,first=null,image=null,vp8x=null,orientation=1,exif=false,alphaChunk=false;
 while(p<b.length){
  if(p+8>b.length)fail('truncated WebP (incomplete chunk header)');
  const type=ascii(b,p,4),n=u32le(b,p+4),d=p+8,end=d+n+(n&1);
  if(end>b.length)fail('truncated WebP (chunk '+type.trim()+' runs past the end of the file)');
  if(!first)first=type;
  if(type==='ANIM'||type==='ANMF')fail('animated WebP is not supported; use a static image');
  if(type==='VP8X'){if(p!==12||n<10)fail('malformed WebP (VP8X)');vp8x={flags:b[d],width:1+u24le(b,d+4),height:1+u24le(b,d+7)};if(vp8x.flags&0x02)fail('animated WebP is not supported; use a static image');}
  else if(type==='VP8 '||type==='VP8L'){
   if(image)fail('malformed WebP (more than one image)');
   if(type==='VP8 '){if(n<10||b[d+3]!==0x9d||b[d+4]!==0x01||b[d+5]!==0x2a)fail('malformed WebP (VP8 start code)');if(b[d]&1)fail('malformed WebP (VP8 frame is not a key frame)');image={width:u16le(b,d+6)&0x3fff,height:u16le(b,d+8)&0x3fff,alpha:false};}
   else{if(n<5||b[d]!==0x2f)fail('malformed WebP (VP8L signature)');if(b[d+4]>>5)fail('malformed WebP (VP8L version)');image={width:1+(b[d+1]|(b[d+2]&0x3f)<<8),height:1+(b[d+2]>>6|b[d+3]<<2|(b[d+4]&0x0f)<<10),alpha:!!(b[d+4]&0x10)};}
  }
  else if(type==='EXIF'){if(!vp8x||exif)fail('malformed WebP (EXIF chunk)');exif=true;let s=d;if(n>=6&&ascii(b,d,4)==='Exif'&&b[d+4]===0&&b[d+5]===0)s+=6;orientation=exifOrientation(b,s,d+n);}
  else if(type==='ALPH'){if(!vp8x)fail('malformed WebP (ALPH chunk)');alphaChunk=true;}
  else if(!vp8x)fail('malformed WebP (unexpected chunk '+type.trim()+' in a simple file)');
  else if(!['ICCP','XMP '].includes(type)&&!/^[A-Za-z0-9 ]{4}$/.test(type))fail('malformed WebP chunk type');
  p=end;
 }
 if(!['VP8 ','VP8L','VP8X'].includes(first))fail('malformed WebP (first chunk must be VP8, VP8L or VP8X)');
 if(!image)fail('WebP has no image data');
 if(vp8x&&(vp8x.width!==image.width||vp8x.height!==image.height))fail('malformed WebP (canvas '+vp8x.width+'×'+vp8x.height+' differs from the image '+image.width+'×'+image.height+')');
 // Measured 2026-11-27 (Chromium 158, the renderer's browser): EXIF orientation is applied to JPEG and PNG but
 // ignored for WebP, so a rotated WebP would be drawn sideways. Refused rather than guessed.
 if(orientation!==1)fail('WebP with EXIF orientation '+orientation+' is not supported (the renderer does not apply it); save the image upright');
 return {format:'webp',width:image.width,height:image.height,orientation,alpha:image.alpha||alphaChunk};
}
// Parse and bound one file. Returns {format, width, height (stored), orientation 1–8, displayWidth, displayHeight
// (after orientation), alpha, decodedBytes}. `declared` (from the extension) must agree with the signature.
export function inspectImage(bytes,declared=null){
 if(!(bytes instanceof Uint8Array))fail('bytes required');
 if(bytes.length===0)fail('empty file');
 if(bytes.length>MEDIA_LIMITS.fileBytes)fail('file is larger than '+MEDIA_LIMITS.fileBytes/1048576+' MB');
 const format=sniffFormat(bytes);
 if(!format){const head=ascii(bytes,0,Math.min(64,bytes.length)).toLowerCase();fail(/<svg|<\?xml/.test(head)?'SVG is not supported (raster PNG, JPEG or static WebP only)':/^gif8/.test(head)?'GIF is not supported (raster PNG, JPEG or static WebP only)':'unknown or unsupported file signature (PNG, JPEG or static WebP only)');}
 if(declared!==null&&declared!==format)fail('file signature is '+format.toUpperCase()+' but the name says '+String(declared).toUpperCase());
 const r=format==='png'?parsePNG(bytes):format==='jpeg'?parseJPEG(bytes):parseWEBP(bytes);
 if(!r.width||!r.height)fail('zero image dimensions');
 if(r.width>MEDIA_LIMITS.side||r.height>MEDIA_LIMITS.side)fail('image '+r.width+'×'+r.height+' exceeds '+MEDIA_LIMITS.side+' px per side');
 const decodedBytes=r.width*r.height*4;
 if(decodedBytes>MEDIA_LIMITS.decodedBytes)fail('image '+r.width+'×'+r.height+' decodes to '+Math.round(decodedBytes/1048576)+' MB (limit '+MEDIA_LIMITS.decodedBytes/1048576+' MB)');
 const swap=r.orientation>=5;
 return {...r,displayWidth:swap?r.height:r.width,displayHeight:swap?r.width:r.height,decodedBytes};
}
// ---- library lock entries and item sources (shared by the boundary and the validator) ----
const SHA=/^[0-9a-f]{64}$/;
// A resolved image source as the production boundary writes it into an `image` item (never trusted from authors:
// the boundary overwrites it from the lock and the verified file).
export function validateSource(s,p){
 if(!s||typeof s!=='object'||Array.isArray(s))fail(p+': resolved source required; image items are resolved from the local media library (public/media/media.lock.json) at the production boundary');
 for(const k of Object.keys(s))if(!['file','sha256','format','width','height','orientation','displayWidth','displayHeight'].includes(k))fail(p+'.'+k+': unknown field');
 if(!Object.hasOwn(MEDIA_FORMATS,s.format))fail(p+'.format: png, jpeg or webp required');
 if(typeof s.file!=='string'||!/^[a-z0-9][a-z0-9-]{0,47}\.(png|jpg|webp)$/.test(s.file)||EXTENSIONS[s.file.split('.').pop()]!==s.format)fail(p+'.file: <media id>.'+MEDIA_FORMATS[s.format].ext+' required');
 if(typeof s.sha256!=='string'||!SHA.test(s.sha256))fail(p+'.sha256: 64 lowercase hex digits required');
 for(const k of ['width','height','displayWidth','displayHeight'])if(!Number.isSafeInteger(s[k])||s[k]<1||s[k]>MEDIA_LIMITS.side)fail(p+'.'+k+': 1–'+MEDIA_LIMITS.side+' required');
 if(!Number.isSafeInteger(s.orientation)||s.orientation<1||s.orientation>8)fail(p+'.orientation: 1–8 required');
 const swap=s.orientation>=5;if(s.displayWidth!==(swap?s.height:s.width)||s.displayHeight!==(swap?s.width:s.height))fail(p+': display size does not follow the orientation');
 if(s.width*s.height*4>MEDIA_LIMITS.decodedBytes)fail(p+': decoded size over '+MEDIA_LIMITS.decodedBytes/1048576+' MB');
 return s;
}
// ---- deterministic fit, crop and pan/zoom ----
// Source rectangle (display pixels of the upright image) and destination rectangle for one frame.
// crop [x,y,w,h] (0–1 of the upright image) selects the part of the picture used; 'contain' letterboxes it inside
// the box (never cut), 'cover' fills the box and cuts the overflow around `focus`; a move zooms (1–4) into the
// cropped picture around a moving centre, clamped so the view never leaves the picture.
export function imageRects({width,height},box,{fit='cover',crop=[0,0,1,1],focus=[.5,.5],view={x:.5,y:.5,zoom:1}}={}){
 const cx=crop[0]*width,cy=crop[1]*height,cw=crop[2]*width,ch=crop[3]*height;
 const z=view.zoom,vw=cw/z,vh=ch/z;
 // the zoomed window inside the crop, centred on the view point and clamped inside the crop
 const wx=cx+Math.min(Math.max(view.x*cw-vw/2,0),cw-vw),wy=cy+Math.min(Math.max(view.y*ch-vh/2,0),ch-vh);
 if(fit==='contain'){const k=Math.min(box.w/vw,box.h/vh),dw=vw*k,dh=vh*k;return {src:[wx,wy,vw,vh],dst:[box.x+(box.w-dw)/2,box.y+(box.h-dh)/2,dw,dh]};}
 const k=Math.max(box.w/vw,box.h/vh),sw=box.w/k,sh=box.h/k;
 const sx=wx+Math.min(Math.max(focus[0]*vw-sw/2,0),vw-sw),sy=wy+Math.min(Math.max(focus[1]*vh-sh/2,0),vh-sh);
 return {src:[sx,sy,sw,sh],dst:[box.x,box.y,box.w,box.h]};
}
// The distinct images a scene draws (compose-v2 `image` items with resolved sources), with per-film bounds. Used by
// the production boundary and by the renderer's loader, so both refuse the same films.
export function sceneImages(scene){
 const seen=new Map();
 for(const s of scene?.version===2&&Array.isArray(scene.shots)?scene.shots:[]){const c=s?.composition;if(c?.version!=='compose-v2'||!Array.isArray(c.items))continue;
  for(const x of c.items)if(x?.type==='image'&&x.source&&!seen.has(x.source.sha256))seen.set(x.source.sha256,{media:x.media,...x.source});}
 const list=[...seen.values()].sort((a,b)=>a.media<b.media?-1:a.media>b.media?1:0);
 if(list.length>MEDIA_LIMITS.filmImages)fail('a film may use at most '+MEDIA_LIMITS.filmImages+' distinct images ('+list.length+' found)');
 const total=list.reduce((n,s)=>n+s.width*s.height*4,0);
 if(total>MEDIA_LIMITS.filmDecodedBytes)fail('the film\'s images decode to '+Math.round(total/1048576)+' MB together (limit '+MEDIA_LIMITS.filmDecodedBytes/1048576+' MB)');
 return list;
}
