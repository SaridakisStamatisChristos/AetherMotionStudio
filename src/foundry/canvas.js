import {createRaster,renderMeshes} from './raster.js';
import {meshCommands} from './instances.js';
const resources=new WeakMap();
export function drawFoundry(ctx,state){let r=resources.get(ctx);if(!r){const canvas=document.createElement('canvas');canvas.width=540;canvas.height=960;const x=canvas.getContext('2d');r={canvas,x,target:createRaster(540,960),image:x.createImageData(540,960)};resources.set(ctx,r)}renderMeshes(r.target,meshCommands(state),state.camera);r.image.data.set(r.target.rgba);r.x.putImageData(r.image,0,0);ctx.drawImage(r.canvas,0,0,720,1280)}
