// DUAL-05: builders for our own test images (own work; no third-party media). PNG is encoded here with node:zlib;
// JPEG and WebP bodies come from local encoders (ffmpeg or Chromium canvas) and only their metadata is rewritten
// here: EXIF orientation blocks for JPEG (APP1) and WebP (VP8X + EXIF), byte-level, deterministic.
import {deflateSync} from 'node:zlib';
import {crc32} from '../src/core/media.js';
const be32=n=>Buffer.from([n>>>24&255,n>>>16&255,n>>>8&255,n&255]);
export function pngChunk(type,data=Buffer.alloc(0)){const t=Buffer.from(type,'ascii'),body=Buffer.concat([t,data]);return Buffer.concat([be32(data.length),body,be32(crc32(body))]);}
// TIFF block with one IFD0 entry: Orientation (0x0112, SHORT, count 1).
export function exifTiff(orientation,{littleEndian=true}={}){
 const b=Buffer.alloc(26),w16=(v,i)=>littleEndian?b.writeUInt16LE(v,i):b.writeUInt16BE(v,i),w32=(v,i)=>littleEndian?b.writeUInt32LE(v,i):b.writeUInt32BE(v,i);
 b.write(littleEndian?'II':'MM',0,'ascii');w16(42,2);w32(8,4);w16(1,8);w16(0x0112,10);w16(3,12);w32(1,14);w16(orientation,18);w32(0,22);return b;
}
// RGBA pixels (Uint8Array w*h*4) → PNG (colour type 6, 8 bit, filter 0). extra: chunks inserted before IDAT.
export function encodePNG(rgba,w,h,{orientation=null,extra=[]}={}){
 const raw=Buffer.alloc(h*(1+w*4));for(let y=0;y<h;y++){raw[y*(1+w*4)]=0;Buffer.from(rgba.buffer,rgba.byteOffset+y*w*4,w*4).copy(raw,y*(1+w*4)+1);}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,13,10,26,10]),pngChunk('IHDR',ihdr),...(orientation?[pngChunk('eXIf',exifTiff(orientation))]:[]),...extra,pngChunk('IDAT',deflateSync(raw,{level:9})),pngChunk('IEND')]);
}
// Insert an APP1 EXIF orientation block right after SOI (any existing EXIF APP1 is removed first).
export function jpegWithOrientation(jpeg,orientation){
 const b=Buffer.from(jpeg);if(b[0]!==0xff||b[1]!==0xd8)throw Error('not a JPEG');
 const parts=[b.subarray(0,2)];let p=2;
 while(p<b.length&&b[p]===0xff&&b[p+1]!==0xda){const m=b[p+1],n=b.readUInt16BE(p+2),seg=b.subarray(p,p+2+n);if(!(m===0xe1&&seg.toString('ascii',4,8)==='Exif'))parts.push(seg);p+=2+n;}
 parts.push(b.subarray(p));
 const tiff=exifTiff(orientation,{littleEndian:false}),payload=Buffer.concat([Buffer.from('Exif\0\0','binary'),tiff]),app1=Buffer.concat([Buffer.from([0xff,0xe1]),Buffer.from([(payload.length+2)>>8,(payload.length+2)&255]),payload]);
 return Buffer.concat([parts[0],app1,...parts.slice(1)]);
}
const le32=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
const riffChunk=(type,data)=>Buffer.concat([Buffer.from(type,'ascii'),le32(data.length),data,data.length&1?Buffer.alloc(1):Buffer.alloc(0)]);
// Chunks of a WebP file (type, data).
export function webpChunks(webp){const b=Buffer.from(webp),out=[];let p=12;while(p<b.length){const type=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4);out.push({type,data:b.subarray(p+8,p+8+n)});p+=8+n+(n&1);}return out;}
export function buildWebP(chunks){const body=Buffer.concat([Buffer.from('WEBP','ascii'),...chunks.map(c=>riffChunk(c.type,c.data))]);return Buffer.concat([Buffer.from('RIFF','ascii'),le32(body.length),body]);}
// Re-wrap a simple (VP8 or VP8L) WebP as extended (VP8X) with an EXIF orientation chunk.
export function webpWithOrientation(webp,orientation,{width,height}){
 const img=webpChunks(webp).filter(c=>c.type==='VP8 '||c.type==='VP8L'||c.type==='ALPH');
 const x=Buffer.alloc(10);x[0]=0x08|(img.some(c=>c.type==='ALPH'||c.type==='VP8L')?0x10:0);x.writeUIntLE(width-1,4,3);x.writeUIntLE(height-1,7,3);
 return buildWebP([{type:'VP8X',data:x},...img,{type:'EXIF',data:exifTiff(orientation)}]);
}
// Inverse EXIF transform: stored pixels that display upright as `rgba` (w×h) under orientation o.
export function storeForOrientation(rgba,w,h,o){
 const swap=o>=5,W=swap?h:w,H=swap?w:h,out=new Uint8Array(W*H*4);
 // for each stored pixel (sx,sy), the display pixel it shows (EXIF orientation semantics)
 for(let sy=0;sy<H;sy++)for(let sx=0;sx<W;sx++){let dx,dy;
  switch(o){case 1:dx=sx;dy=sy;break;case 2:dx=W-1-sx;dy=sy;break;case 3:dx=W-1-sx;dy=H-1-sy;break;case 4:dx=sx;dy=H-1-sy;break;
   case 5:dx=sy;dy=sx;break;case 6:dx=H-1-sy;dy=sx;break;case 7:dx=H-1-sy;dy=W-1-sx;break;case 8:dx=sy;dy=W-1-sx;break;}
  const s=(sy*W+sx)*4,d=(dy*w+dx)*4;out.set(rgba.subarray(d,d+4),s);}
 return {rgba:out,width:W,height:H};
}
// A small upright test card: four coloured quadrants (red top-left, green top-right, blue bottom-left, white
// bottom-right) so orientation errors are visible and checkable.
export function quadrants(w,h){const p=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const q=(y<h/2?0:2)+(x<w/2?0:1),c=[[220,30,30],[30,180,60],[40,70,220],[245,245,245]][q],i=(y*w+x)*4;p[i]=c[0];p[i+1]=c[1];p[i+2]=c[2];p[i+3]=255;}return p;}
