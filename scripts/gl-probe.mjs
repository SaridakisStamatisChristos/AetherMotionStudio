// DUAL-07 audit repair: the WebGL adapter behind a GL route, measured in Remotion's own Chromium with the same `gl`
// option the native render uses (the same method LOCAL-01 used to identify vulkan → RTX). Prints one JSON line:
// {gl, renderer, vendor, source:'unmasked'|'masked'|'unknown', error?}. Never fails the render it serves.
//   node scripts/gl-probe.mjs <swangle|angle|angle-egl|vulkan|egl|swiftshader>
import {createRequire} from 'node:module';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const GL_ROUTES=Object.freeze(['swangle','angle','angle-egl','vulkan','egl','swiftshader']);
export async function probeGl(gl){
 if(!GL_ROUTES.includes(gl))return {gl,renderer:'unknown',vendor:'unknown',source:'unknown',error:'unknown GL route'};
 const require=createRequire(join(ROOT,'package.json')),{openBrowser}=require('@remotion/renderer');let browser=null;
 try{
  browser=await openBrowser('chrome',{chromiumOptions:{gl},logLevel:'error'});
  const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
  const r=await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2')??document.createElement('canvas').getContext('webgl');if(!gl)return {renderer:'unknown',vendor:'unknown',source:'unknown',error:'no WebGL context'};
   const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?{renderer:String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)),vendor:String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)),source:'unmasked'}:{renderer:String(gl.getParameter(gl.RENDERER)),vendor:String(gl.getParameter(gl.VENDOR)),source:'masked'};});
  return {gl,...r};
 }catch(e){return {gl,renderer:'unknown',vendor:'unknown',source:'unknown',error:String(e?.message??e).slice(0,200)};}
 finally{if(browser)await browser.close({silent:true}).catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){console.log(JSON.stringify(await probeGl(process.argv[2])));process.exit(0);}
