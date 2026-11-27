import {createMaterialLibrary} from '../foundry/material-three.js';
import {materialLight} from '../foundry/materials.js';
import {meshCommands} from '../foundry/instances.js';
import {toBufferGeometry} from '../foundry/three.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {CRAFTED,MATERIALS,chamferedBox,craftedColor,isCrafted,mixColor} from './crafted.js';
import {hashNoise} from '../core/fidelity.js';
import {emitGraph,boxBasis} from '../core/graph.js';
// Explicit real WebGL renderer. No silent fallback. Remotion CI uses software GL.
export function createThreeBackend(){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
 renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,9/16,.1,60);
 const ambient=new THREE.HemisphereLight('#b6d9fa','#40332a',2.0);scene.add(ambient);
 const key=new THREE.DirectionalLight('#fff1df',3.2);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});key.shadow.normalBias=.025;scene.add(key,key.target);
 const rim=new THREE.DirectionalLight('#75bfff',2.2);rim.position.set(4,3,-4);scene.add(rim);
 const floorGeo=new THREE.PlaneGeometry(120,120),floorMat=new THREE.MeshStandardMaterial({color:'#263d4b',roughness:.72,metalness:.13});
 const floor=new THREE.Mesh(floorGeo,floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.04;floor.receiveShadow=true;scene.add(floor);
 const grid=new THREE.GridHelper(24,24,'#46616d','#344a55');grid.position.y=-.025;grid.material.transparent=true;grid.material.opacity=.22;scene.add(grid);
 // Procedural roughness texture: cached, deterministic, no remote assets.
 const pixels=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,v=Math.round(145+80*hashNoise(x,y,17));pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}
 const roughnessMap=new THREE.DataTexture(pixels,64,64,THREE.RGBAFormat);roughnessMap.wrapS=roughnessMap.wrapT=THREE.RepeatWrapping;roughnessMap.magFilter=THREE.LinearFilter;roughnessMap.minFilter=THREE.LinearMipmapLinearFilter;roughnessMap.generateMipmaps=true;roughnessMap.needsUpdate=true;
 const geometry=new RoundedBoxGeometry(1,1,1,2,.065),materialCache=new Map(),foundryGeometry=new Map(),pool=[];
 // GEN-15 opt-in look 'crafted-v1': the CPU painter's chamfered polygons as real-size geometry (cached by size) and
 // matte, non-metallic materials in the softened palette.
 const craftedGeometry=new Map(),craftedMaterials=new Map();
 function crafted(size){const key=size.map(v=>Math.round(v*1e4)).join(',');let g=craftedGeometry.get(key);if(g)return g;
  const pos=[],nor=[];for(const {verts} of chamferedBox(size)){const [a,b,c]=verts,u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n)||1;
   for(let k=1;k+1<verts.length;k++)for(const p of [verts[0],verts[k],verts[k+1]]){pos.push(...p);nor.push(n[0]/l,n[1]/l,n[2]/l);}}
  g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  if(craftedGeometry.size>4000){for(const x of craftedGeometry.values())x.dispose();craftedGeometry.clear();}craftedGeometry.set(key,g);return g;}
 // GEN-15 step 2 'crafted-v2' roles (crafted.js partRole): glass = tinted, low roughness; metal = cooler tint, metalness.
 function craftedMaterial(color,emissive,detail=0,role=null){const k=color+':'+emissive+':'+detail+':'+role;if(!craftedMaterials.has(k)){const T=CRAFTED.three,M=role&&!emissive?MATERIALS[role]:null,R=M?MATERIALS.three[role]:null,c0=craftedColor(color,T.palette),c=M?mixColor(c0,M.tint,M.mix):c0;craftedMaterials.set(k,new THREE.MeshStandardMaterial({color:c,roughness:emissive?.35:R?R.roughness:(T.roughness+detail*T.roughnessDetail),roughnessMap:!emissive&&!R&&detail>0?roughnessMap:null,metalness:emissive?.02:R?R.metalness:T.metalness,emissive:emissive?c:'#000000',emissiveIntensity:emissive?.9:0}));}return craftedMaterials.get(k)}
 function material(color,emissive,detail=0){const k=color+':'+emissive+':'+detail;if(!materialCache.has(k)){materialCache.set(k,new THREE.MeshStandardMaterial({color,roughness:emissive?.3:(.48+detail*.16),roughnessMap:!emissive&&detail>0?roughnessMap:null,metalness:emissive?.05:(.28+detail*.14),emissive:emissive?color:'#000000',emissiveIntensity:emissive?.95:0}));}return materialCache.get(k)}
 const premium=createMaterialLibrary(renderer);
 let width=0,height=0;
 function render(state,W,H){
  if(width!==W||height!==H){renderer.setSize(W,H,false);width=W;height=H;}
  const {camera:c,environment:env}=state;camera.aspect=W/H;camera.fov=2*Math.atan(640/c.zoom)*180/Math.PI;camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateProjectionMatrix();
  scene.background=new THREE.Color(env.background);scene.fog=new THREE.Fog(env.background,14,32);floorMat.color.set(env.floor);key.color.set(env.key);rim.color.set(env.rim);
  const f=state.fidelity,detail=f?.surfaceDetail??0;ambient.intensity=f?2-.55*f.contactShadow:2;key.intensity=f?3.2+.65*f.atmosphere:3.2;rim.intensity=f?2.2+.8*f.atmosphere:2.2;floorMat.roughness=f?.surfaceDetail>0?.61:.72;renderer.toneMappingExposure=f?1.25+.06*f.grade:1.25;if(isCrafted(state.look)){ambient.intensity*=CRAFTED.three.ambient;renderer.toneMappingExposure*=CRAFTED.three.exposure;}
  scene.environment=premium.begin(state.materialProfile);if(state.materialProfile){key.position.set(...materialLight(state.materialProfile.lighting,state.progress).map(x=>x*8));}else key.position.set(-3,6,5);
  let i=0;if(state.geometryProfile){const commands=meshCommands(state);if(state.geometryProfile==='foundry-af05'){const needed=new Set(commands.map(c=>c.meshKey));for(const [k,g] of foundryGeometry)if(!needed.has(k)){g.dispose();foundryGeometry.delete(k)}}for(const cmd of commands){if(!foundryGeometry.has(cmd.meshKey))foundryGeometry.set(cmd.meshKey,toBufferGeometry(cmd.mesh));let mesh=pool[i++];if(!mesh){mesh=new THREE.Mesh();mesh.matrixAutoUpdate=false;scene.add(mesh);pool.push(mesh);}mesh.geometry=foundryGeometry.get(cmd.meshKey);mesh.material=cmd.surface?premium.get(cmd.surface,cmd.importTexture):material(cmd.color,cmd.emissive,detail);mesh.castShadow=!cmd.emissive&&cmd.surface?.alphaMode!=='blend';mesh.receiveShadow=true;mesh.visible=true;mesh.matrix.makeBasis(...cmd.axes.map(a=>new THREE.Vector3(...a)));mesh.matrix.setPosition(...cmd.origin);mesh.matrixWorldNeedsUpdate=true;}}else emitGraph(state,(center,size,color,tf=p=>p,emissive=false,bias=0,role=null)=>{
   let mesh=pool[i++];if(!mesh){mesh=new THREE.Mesh(geometry,material(color,emissive,detail));mesh.matrixAutoUpdate=false;scene.add(mesh);pool.push(mesh);}
   const look=isCrafted(state.look);mesh.geometry=look?crafted(size):geometry;mesh.material=look?craftedMaterial(color,emissive,detail,state.look==='crafted-v2'?role:null):material(color,emissive,detail);mesh.castShadow=!emissive;mesh.receiveShadow=true;mesh.visible=true;
   const {origin,axes}=boxBasis(center,tf),v=axes.map((a,j)=>new THREE.Vector3(...a).multiplyScalar(look?1:size[j]));
   mesh.matrix.makeBasis(...v);mesh.matrix.setPosition(...origin);mesh.matrixWorldNeedsUpdate=true;
  });
  for(;i<pool.length;i++)pool[i].visible=false;
  renderer.render(scene,camera);return renderer.domElement;
 }
 function dispose(){premium.dispose();roughnessMap.dispose();geometry.dispose();for(const g of foundryGeometry.values())g.dispose();floorGeo.dispose();floorMat.dispose();grid.geometry.dispose();grid.material.dispose();for(const m of materialCache.values())m.dispose();for(const g of craftedGeometry.values())g.dispose();for(const m of craftedMaterials.values())m.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();}
 // DUAL-07 audit repair: the actual WebGL adapter (unmasked when the browser allows it), never a guess.
 function adapter(){try{const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  if(ext)return {renderer:String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)),vendor:String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)),source:'unmasked'};
  return {renderer:String(gl.getParameter(gl.RENDERER)),vendor:String(gl.getParameter(gl.VENDOR)),source:'masked'};}catch{return {renderer:'unknown',vendor:'unknown',source:'unknown'};}}
 return {render,dispose,adapter};
}
