import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
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
 const geometry=new RoundedBoxGeometry(1,1,1,2,.065),materialCache=new Map(),pool=[];
 function material(color,emissive,detail=0){const k=color+':'+emissive+':'+detail;if(!materialCache.has(k)){materialCache.set(k,new THREE.MeshStandardMaterial({color,roughness:emissive?.3:(.48+detail*.16),roughnessMap:!emissive&&detail>0?roughnessMap:null,metalness:emissive?.05:(.28+detail*.14),emissive:emissive?color:'#000000',emissiveIntensity:emissive?.95:0}));}return materialCache.get(k)}
 let width=0,height=0;
 function render(state,W,H){
  if(width!==W||height!==H){renderer.setSize(W,H,false);width=W;height=H;}
  const {camera:c,environment:env}=state;camera.aspect=W/H;camera.fov=2*Math.atan(640/c.zoom)*180/Math.PI;camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateProjectionMatrix();
  scene.background=new THREE.Color(env.background);scene.fog=new THREE.Fog(env.background,14,32);floorMat.color.set(env.floor);key.color.set(env.key);rim.color.set(env.rim);
  const f=state.fidelity,detail=f?.surfaceDetail??0;ambient.intensity=f?2-.55*f.contactShadow:2;key.intensity=f?3.2+.65*f.atmosphere:3.2;rim.intensity=f?2.2+.8*f.atmosphere:2.2;floorMat.roughness=f?.surfaceDetail>0?.61:.72;renderer.toneMappingExposure=f?1.25+.06*f.grade:1.25;
  let i=0;emitGraph(state,(center,size,color,tf=p=>p,emissive=false)=>{
   let mesh=pool[i++];if(!mesh){mesh=new THREE.Mesh(geometry,material(color,emissive,detail));mesh.matrixAutoUpdate=false;scene.add(mesh);pool.push(mesh);}
   mesh.material=material(color,emissive,detail);mesh.castShadow=!emissive;mesh.receiveShadow=true;mesh.visible=true;
   const {origin,axes}=boxBasis(center,tf),v=axes.map((a,j)=>new THREE.Vector3(...a).multiplyScalar(size[j]));
   mesh.matrix.makeBasis(...v);mesh.matrix.setPosition(...origin);mesh.matrixWorldNeedsUpdate=true;
  });
  for(;i<pool.length;i++)pool[i].visible=false;
  renderer.render(scene,camera);return renderer.domElement;
 }
 function dispose(){roughnessMap.dispose();geometry.dispose();floorGeo.dispose();floorMat.dispose();grid.geometry.dispose();grid.material.dispose();for(const m of materialCache.values())m.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();}
 return {render,dispose};
}
