import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
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
 const geometry=new RoundedBoxGeometry(1,1,1,2,.065),materialCache=new Map(),pool=[];
 function material(color,emissive){const k=color+':'+emissive;if(!materialCache.has(k)){materialCache.set(k,new THREE.MeshStandardMaterial({color,roughness:emissive?.3:.48,metalness:emissive?.05:.28,emissive:emissive?color:'#000000',emissiveIntensity:emissive?.95:0}));}return materialCache.get(k)}
 let width=0,height=0;
 function render(state,W,H){
  if(width!==W||height!==H){renderer.setSize(W,H,false);width=W;height=H;}
  const {camera:c,environment:env}=state;camera.aspect=W/H;camera.fov=2*Math.atan(640/c.zoom)*180/Math.PI;camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateProjectionMatrix();
  scene.background=new THREE.Color(env.background);scene.fog=new THREE.Fog(env.background,14,32);floorMat.color.set(env.floor);key.color.set(env.key);rim.color.set(env.rim);
  let i=0;emitGraph(state,(center,size,color,tf=p=>p,emissive=false)=>{
   let mesh=pool[i++];if(!mesh){mesh=new THREE.Mesh(geometry,material(color,emissive));mesh.matrixAutoUpdate=false;scene.add(mesh);pool.push(mesh);}
   mesh.material=material(color,emissive);mesh.castShadow=!emissive;mesh.receiveShadow=true;mesh.visible=true;
   const {origin,axes}=boxBasis(center,tf),v=axes.map((a,j)=>new THREE.Vector3(...a).multiplyScalar(size[j]));
   mesh.matrix.makeBasis(...v);mesh.matrix.setPosition(...origin);mesh.matrixWorldNeedsUpdate=true;
  });
  for(;i<pool.length;i++)pool[i].visible=false;
  renderer.render(scene,camera);return renderer.domElement;
 }
 function dispose(){geometry.dispose();floorGeo.dispose();floorMat.dispose();grid.geometry.dispose();grid.material.dispose();for(const m of materialCache.values())m.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();}
 return {render,dispose};
}
