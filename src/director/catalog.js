import {createHash} from 'node:crypto';
import {OBJECT_CATALOG} from '../visual/catalog.js';
import {ACTIONS,CAMERA_RIGS,geometryBounds,supportedChannels} from '../core/cinematography.js';
import {EFFECT_PRESETS} from '../core/presets.js';
export const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const words=s=>String(s).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>1);
const aliases={
 technology:'computer digital electronics information data network internet communication software hardware',
 science:'physics chemistry biology mathematics space experiment energy scientific molecule',
 architecture:'building city history monument ancient construction engineering design',
 business:'company finance money economics trade logistics market supply demand',
 nature:'environment plants trees forest water earth climate landscape',
 vehicles:'transport travel mobility road rail',
 characters:'people human guide robot worker',
 everyday:'object tool home household work'
};
let cache;
export function directorCatalog(){
 if(cache)return cache;
 const objects=OBJECT_CATALOG.map(o=>{
  const b=geometryBounds([{asset:o.id,id:o.id,pose:{origin:[0,0,0],scale:1,yaw:0}}]);
  const channels=supportedChannels(o.id);
  return {id:o.id,category:o.category,family:o.family,description:o.id.replaceAll('-',' '),bounds:[b.lo,b.hi].map(v=>v.map(n=>Math.round(n*1000)/1000)),actions:Object.keys(ACTIONS).filter(a=>Object.keys(ACTIONS[a]).every(k=>channels.includes(k)))};
 });
 cache={version:1,objects,cameras:Object.keys(CAMERA_RIGS),effects:Object.keys(EFFECT_PRESETS)};
 return cache;
}
export function retrieveAssets(query,limit=8,preferred=[]){
 if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('catalog limit');
 const tokens=new Set(words(query));
 const score=o=>{
  const own=words(o.id),tags=words(o.category+' '+o.family+' '+(aliases[o.category]??''));
  return (preferred.includes(o.id)?1000:0)+own.reduce((n,w)=>n+(tokens.has(w)?12:0),0)+tags.reduce((n,w)=>n+(tokens.has(w)?2:0),0);
 };
 return [...directorCatalog().objects].sort((a,b)=>score(b)-score(a)||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,limit);
}
