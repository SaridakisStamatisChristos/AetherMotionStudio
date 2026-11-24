import * as THREE from 'three';
import {validateMesh} from './geometry.js';
export function toBufferGeometry(mesh){validateMesh(mesh);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(mesh.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(mesh.normals,3));g.setAttribute('uv',new THREE.BufferAttribute(mesh.uvs,2));g.setIndex(new THREE.BufferAttribute(mesh.indices,1));for(const x of mesh.groups)g.addGroup(x.start,x.count,x.material);g.computeBoundingBox();g.computeBoundingSphere();return g}
