import {OBJECT_CATALOG} from '../src/visual/catalog.js';
import {recipeRig} from '../src/visual/catalog-rig.js';
import {geometryRecord} from '../src/director/identity-evidence.js';
import {digest} from '../src/director/catalog.js';
import {ACTIONS} from '../src/core/cinematography.js';
const objects=OBJECT_CATALOG.map(o=>{
 const rig=recipeRig(o.id),rows=geometryRecord(o.id),points=rows.flatMap(r=>r.corners),bounds=[0,1,2].map(i=>[Math.min(...points.map(p=>p[i])),Math.max(...points.map(p=>p[i]))]);
 return {...o,rig,recipeVersion:1,boxCount:rows.length,bounds,neutralGeometryDigest:digest(rows),actions:Object.keys(ACTIONS).filter(n=>Object.keys(ACTIONS[n]).every(ch=>rig.channels.includes(ch)))};
});
console.log(JSON.stringify({version:1,kind:'neutral procedural geometry audit; not native render or pose coverage',count:objects.length,objects},null,2));
