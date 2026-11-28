import {createMaterialLibrary} from '../foundry/material-three.js';
import {materialLight} from '../foundry/materials.js';
import {meshCommands} from '../foundry/instances.js';
import {toBufferGeometry} from '../foundry/three.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {CRAFTED,MATERIALS,chamferedBox,craftedColor,isCrafted,mixColor} from './crafted.js';
import {hashNoise} from '../core/fidelity.js';
import {emitGraph,boxBasis,ENVIRONMENTS} from '../core/graph.js';
import {CINEMATIC_SHADOW,lightPresetFor,resolveLights} from './cinematic-lights.js';
import {createTextureCache} from '../foundry/materials.js';
import {PART_TILE,FLOOR_REPEAT,TEXTURE_BASE_MEAN,TEXTURE_NORMAL_SCALE,TEXTURE_ANISOTROPY,boxUV,floorTexture,partTexture,validateRecipe} from './pbr-textures.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {PBR_LIGHT,pbrParameters,surfaceFor} from './pbr.js';
import {SOFT,softRadius,heroPart} from '../core/hero-characters.js';
// Explicit real WebGL renderer. No silent fallback. Remotion CI uses software GL.
// GPU-01: options come from threeOptions(project) (src/core/render-profiles.js); {} = GPU Standard, exactly as at v1.2.
export function createThreeBackend(options={}){
 const pbr=options.renderProfile==='cinematic-v1'&&options.materials==='pbr-v1';
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
 renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,9/16,.1,60);
 const ambient=new THREE.HemisphereLight('#b6d9fa','#40332a',2.0);scene.add(ambient);
 const key=new THREE.DirectionalLight('#fff1df',3.2);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});key.shadow.normalBias=.025;scene.add(key,key.target);
 const rim=new THREE.DirectionalLight('#75bfff',2.2);rim.position.set(4,3,-4);scene.add(rim);
 // GPU-02 env-light-v1 (Cinematic only): a fill light from the camera side and a finer key shadow; GPU Standard has
 // neither (the fill light is not even created, so Standard scenes are unchanged).
 const lights=options.renderProfile==='cinematic-v1'&&options.lights?options.lights:null;let fill=null,envShare=1;
 if(lights){fill=new THREE.DirectionalLight('#ffffff',0);scene.add(fill);key.shadow.mapSize.set(CINEMATIC_SHADOW.mapSize,CINEMATIC_SHADOW.mapSize);key.shadow.normalBias=CINEMATIC_SHADOW.normalBias;}
 const environmentName=env=>Object.keys(ENVIRONMENTS).find(k=>ENVIRONMENTS[k]===env)??null;
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
 // GPU-01 pbr-v1 (Cinematic only): MeshPhysicalMaterial presets per part surface, and a procedural studio-room image
 // light (RoomEnvironment through PMREM; generated once per film, no file and no network) so metal and glass reflect.
 const pbrMaterials=new Map();let pmrem=null,roomTexture=null;
 if(pbr){pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();roomTexture=pmrem.fromScene(room,PBR_LIGHT.roomBlur).texture;room.traverse(o=>{o.geometry?.dispose?.();if(o.material)for(const m of [o.material].flat())m.dispose();});}
 function pbrMaterial(color,surface,recipe=null){const k=color+':'+surface+':'+(recipe?JSON.stringify(recipe):'');let m=pbrMaterials.get(k);if(m)return m;
  const {envMapIntensity,...p}=pbrParameters(surface,color);m=new THREE.MeshPhysicalMaterial(p);
  // GPU-03: the texture modulates the preset (base map averages TEXTURE_BASE_MEAN, so the colour is lifted to keep the
  // part's mean colour); roughness and normal maps add grain. No texture = the GPU-01/02 material exactly.
  if(recipe){const s=textureSet(recipe);m.map=s.map;m.roughnessMap=s.roughnessMap;if(s.normalMap){m.normalMap=s.normalMap;m.normalScale.set(TEXTURE_NORMAL_SCALE,TEXTURE_NORMAL_SCALE);}m.color.multiplyScalar(1/TEXTURE_BASE_MEAN);}
  // The room light is attached per material, never as scene.environment: with scene.environment three ignores each
  // material's envMapIntensity and uses scene.environmentIntensity for all (WebGLRenderer.js, three 0.180), which left
  // metals as faint as paint. Per material, each preset keeps its own share; the floor and glowing parts get none.
  m.envMap=roomTexture;m.userData.envBase=envMapIntensity*PBR_LIGHT.environmentIntensity;m.envMapIntensity=m.userData.envBase*envShare;pbrMaterials.set(k,m);return m;}
 // GPU-03 proc-texture-v1 (Cinematic with pbr-v1 only): Foundry procedural textures (seeded, versioned, budgeted cache)
 // on parts and the floor. Textured parts use real-size geometry with box-projected UVs (equal texel density on every
 // object); untextured parts keep the GPU-02 geometry path. GPU Standard never reaches this code.
 const tex=pbr&&options.textures==='proc-v1',texCache=tex?createTextureCache():null,texSets=new Map(),uvGeometries=new Map();
 function textureSet(recipe,repeat=1){const g=texCache.get(validateRecipe(recipe)),k=g.key+':'+repeat;let s=texSets.get(k);if(s)return s;
  const mk=(data,srgb)=>{const t=new THREE.DataTexture(data,g.resolution,g.resolution,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(TEXTURE_ANISOTROPY,renderer.capabilities.getMaxAnisotropy());if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;};
  s={map:mk(g.maps.base,true),roughnessMap:mk(g.maps.roughness,false),normalMap:g.maps.normal?mk(g.maps.normal,false):null};texSets.set(k,s);return s;}
 function uvGeometry(size,look){const k=(look?'c':'r')+size.map(v=>Math.round(v*1e4)).join(',');let g=uvGeometries.get(k);if(g)return g;
  if(look)g=crafted(size).clone();else{g=geometry.clone();const p=g.attributes.position,q=g.attributes.normal,s=size.map(v=>Math.abs(v)<1e-6?1e-6:v);
   for(let j=0;j<p.count;j++){p.setXYZ(j,p.getX(j)*s[0],p.getY(j)*s[1],p.getZ(j)*s[2]);const nx=q.getX(j)/s[0],ny=q.getY(j)/s[1],nz=q.getZ(j)/s[2],l=Math.hypot(nx,ny,nz)||1;q.setXYZ(j,nx/l,ny/l,nz/l);}}
  g.setAttribute('uv',new THREE.Float32BufferAttribute(boxUV(g.attributes.position.array,g.attributes.normal.array,PART_TILE),2));
  if(uvGeometries.size>4000){for(const x of uvGeometries.values())x.dispose();uvGeometries.clear();}uvGeometries.set(k,g);return g;}
 // GPU-05 hero-char-v1 (Cinematic 'soft-v1' only): character parts (human/robot) as real-size rounded boxes inside
 // their part box (src/core/hero-characters.js). Every other part and every Standard scene keeps its geometry.
 const heroStyle=options.renderProfile==='cinematic-v1'&&options.characters==='soft-v1'?'soft-v1':null,heroGeometries=new Map();
 function heroGeometry(size,uv){const s=size.map(v=>Math.max(Math.abs(v),1e-4)),k=(uv?'u':'g')+s.map(v=>Math.round(v*1e4)).join(',');let g=heroGeometries.get(k);if(g)return g;
  g=new RoundedBoxGeometry(s[0],s[1],s[2],SOFT.segments,softRadius(s));
  if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(boxUV(g.attributes.position.array,g.attributes.normal.array,PART_TILE),2));
  if(heroGeometries.size>4000){for(const x of heroGeometries.values())x.dispose();heroGeometries.clear();}heroGeometries.set(k,g);return g;}
 let width=0,height=0;
 function render(state,W,H){
  if(width!==W||height!==H){renderer.setSize(W,H,false);width=W;height=H;}
  const {camera:c,environment:env}=state;camera.aspect=W/H;camera.fov=2*Math.atan(640/c.zoom)*180/Math.PI;camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateProjectionMatrix();
  scene.background=new THREE.Color(env.background);scene.fog=new THREE.Fog(env.background,14,32);floorMat.color.set(env.floor);key.color.set(env.key);rim.color.set(env.rim);
  const f=state.fidelity,detail=f?.surfaceDetail??0;ambient.intensity=f?2-.55*f.contactShadow:2;key.intensity=f?3.2+.65*f.atmosphere:3.2;rim.intensity=f?2.2+.8*f.atmosphere:2.2;floorMat.roughness=f?.surfaceDetail>0?.61:.72;renderer.toneMappingExposure=f?1.25+.06*f.grade:1.25;if(isCrafted(state.look)){ambient.intensity*=CRAFTED.three.ambient;renderer.toneMappingExposure*=CRAFTED.three.exposure;}
  if(pbr){ambient.intensity*=PBR_LIGHT.ambientScale;renderer.toneMappingExposure*=PBR_LIGHT.exposure;}
  scene.environment=premium.begin(state.materialProfile);if(state.materialProfile){key.position.set(...materialLight(state.materialProfile.lighting,state.progress).map(x=>x*8));}else key.position.set(-3,6,5);
  // GPU-02: the shot's light preset replaces the Standard rig values (Foundry material-profile shots keep their own).
  if(lights&&!state.materialProfile){const L=resolveLights(lightPresetFor(lights,environmentName(env)).preset,env),cs=f?1-.275*f.contactShadow:1;
   ambient.color.set(L.hemi.sky);ambient.groundColor.set(L.hemi.ground);ambient.intensity=L.hemi.intensity*cs;
   key.color.set(L.key.color);key.intensity=L.key.intensity;key.position.set(...L.key.dir);fill.color.set(L.fill.color);fill.intensity=L.fill.intensity;fill.position.set(...L.fill.dir);
   rim.color.set(L.rim.color);rim.intensity=L.rim.intensity;rim.position.set(...L.rim.dir);renderer.toneMappingExposure*=L.exposure;
   if(L.environment!==envShare){envShare=L.environment;for(const m of pbrMaterials.values())m.envMapIntensity=m.userData.envBase*envShare;}}
  else if(fill)fill.intensity=0;
  // GPU-03: the floor's texture follows the shot's light preset (auto-v1 by environment when the film has no lights).
  if(tex){const want=state.materialProfile||state.geometryProfile?null:textureSet(floorTexture(lightPresetFor(lights??'auto-v1',environmentName(env)).id),FLOOR_REPEAT);
   if((want?.map??null)!==floorMat.map){floorMat.map=want?.map??null;floorMat.roughnessMap=want?.roughnessMap??null;floorMat.normalMap=want?.normalMap??null;floorMat.needsUpdate=true;}
   if(want)floorMat.color.multiplyScalar(1/TEXTURE_BASE_MEAN);}
  let i=0;if(state.geometryProfile){const commands=meshCommands(state);if(state.geometryProfile==='foundry-af05'){const needed=new Set(commands.map(c=>c.meshKey));for(const [k,g] of foundryGeometry)if(!needed.has(k)){g.dispose();foundryGeometry.delete(k)}}for(const cmd of commands){if(!foundryGeometry.has(cmd.meshKey))foundryGeometry.set(cmd.meshKey,toBufferGeometry(cmd.mesh));let mesh=pool[i++];if(!mesh){mesh=new THREE.Mesh();mesh.matrixAutoUpdate=false;scene.add(mesh);pool.push(mesh);}mesh.geometry=foundryGeometry.get(cmd.meshKey);mesh.material=cmd.surface?premium.get(cmd.surface,cmd.importTexture):material(cmd.color,cmd.emissive,detail);mesh.castShadow=!cmd.emissive&&cmd.surface?.alphaMode!=='blend';mesh.receiveShadow=true;mesh.visible=true;mesh.matrix.makeBasis(...cmd.axes.map(a=>new THREE.Vector3(...a)));mesh.matrix.setPosition(...cmd.origin);mesh.matrixWorldNeedsUpdate=true;}}else emitGraph(state,(center,size,color,tf=p=>p,emissive=false,bias=0,role=null,faceDetail=false,surface=null)=>{
   let mesh=pool[i++];if(!mesh){mesh=new THREE.Mesh(geometry,material(color,emissive,detail));mesh.matrixAutoUpdate=false;scene.add(mesh);pool.push(mesh);}
   const look=isCrafted(state.look);
   // pbr-v1: the same base colour the Standard path uses for this part (crafted palette and role tint), new shading.
   const kind=pbr?surfaceFor(surface,role,emissive):null,recipe=tex&&kind&&kind!=='emissive'?partTexture(kind,surface):null;
   const hero=heroStyle!==null&&heroPart(surface);
   mesh.geometry=hero?heroGeometry(size,!!recipe):recipe?uvGeometry(size,look):look?crafted(size):geometry;
   if(kind&&kind!=='emissive'){const T=CRAFTED.three,M=look&&state.look==='crafted-v2'&&role?MATERIALS[role]:null,c0=look?craftedColor(color,T.palette):color;mesh.material=pbrMaterial(M?mixColor(c0,M.tint,M.mix):c0,kind,recipe);}
   else mesh.material=look?craftedMaterial(color,emissive,detail,state.look==='crafted-v2'?role:null):material(color,emissive,detail);mesh.castShadow=!emissive;mesh.receiveShadow=true;mesh.visible=true;
   const {origin,axes}=boxBasis(center,tf),v=axes.map((a,j)=>new THREE.Vector3(...a).multiplyScalar(look||recipe||hero?1:size[j]));
   mesh.matrix.makeBasis(...v);mesh.matrix.setPosition(...origin);mesh.matrixWorldNeedsUpdate=true;
  });
  for(;i<pool.length;i++)pool[i].visible=false;
  renderer.render(scene,camera);return renderer.domElement;
 }
 function dispose(){for(const s of texSets.values())for(const t of Object.values(s))t?.dispose();texSets.clear();for(const g of uvGeometries.values())g.dispose();uvGeometries.clear();for(const g of heroGeometries.values())g.dispose();heroGeometries.clear();texCache?.clear?.();
  for(const m of pbrMaterials.values())m.dispose();pbrMaterials.clear();roomTexture?.dispose();pmrem?.dispose();premium.dispose();roughnessMap.dispose();geometry.dispose();for(const g of foundryGeometry.values())g.dispose();floorGeo.dispose();floorMat.dispose();grid.geometry.dispose();grid.material.dispose();for(const m of materialCache.values())m.dispose();for(const g of craftedGeometry.values())g.dispose();for(const m of craftedMaterials.values())m.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();}
 // DUAL-07 audit repair: the actual WebGL adapter (unmasked when the browser allows it), never a guess.
 function adapter(){try{const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  if(ext)return {renderer:String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)),vendor:String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)),source:'unmasked'};
  return {renderer:String(gl.getParameter(gl.RENDERER)),vendor:String(gl.getParameter(gl.VENDOR)),source:'masked'};}catch{return {renderer:'unknown',vendor:'unknown',source:'unknown'};}}
 return {render,dispose,adapter};
}
