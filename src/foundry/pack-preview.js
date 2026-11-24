import {assetDetails} from './packs.js';
import {inspectCommands,renderInspection,viewCamera,VIEWS,assessPreview} from './inspection.js';
export function previewAsset(entry,{lod=0,view='three-quarter',lighting='studio',size=144}={}){
 const v=VIEWS.find(x=>x[0]===view);if(!v)throw Error('unknown preview view');
 const {commands,anchors,dimensions,materials}=assetDetails(entry,lod),structure=inspectCommands(commands);
 const result=renderInspection(commands,viewCamera(structure.bounds,v[1]),lighting,size);
 return {structure,anchors,dimensions,materials,metrics:result.metrics,warnings:assessPreview(result.metrics),raster:result.raster};
}
// Small deterministic 24-bit BMP, no external codecs; browser and CLI share the same CPU preview.
export function bmp(r){const row=Math.ceil(r.w*3/4)*4,b=new Uint8Array(54+row*r.h),d=new DataView(b.buffer);b[0]=66;b[1]=77;d.setUint32(2,b.length,true);d.setUint32(10,54,true);d.setUint32(14,40,true);d.setInt32(18,r.w,true);d.setInt32(22,r.h,true);d.setUint16(26,1,true);d.setUint16(28,24,true);d.setUint32(34,row*r.h,true);for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){const i=((r.h-1-y)*r.w+x)*4,j=54+y*row+x*3;for(let k=0;k<3;k++)b[j+k]=r.rgba[i+3]?r.rgba[i+2-k]:24;}return b}
