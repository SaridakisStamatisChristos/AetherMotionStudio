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
// Word relevance of a catalog object to a query: 12 per word of its id, 2 per category/family/alias word (DUAL-01
// exports it so the explainer can tell a real match from an alphabetical tie at 0).
const relevanceOf=(tokens,o)=>{const own=words(o.id),tags=words(o.category+' '+o.family+' '+(aliases[o.category]??''));return own.reduce((n,w)=>n+(tokens.has(w)?12:0),0)+tags.reduce((n,w)=>n+(tokens.has(w)?2:0),0);};
// Plural-tolerant (trees → tree, berries → berry, boxes → box); used only by the DUAL-01 explainer, so the retrieval
// order of every earlier request is unchanged.
const singular=w=>w.length>4&&w.endsWith('ies')?w.slice(0,-3)+'y':w.length>4&&/(?:x|ch|sh|ss)es$/.test(w)?w.slice(0,-2):w.length>3&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w;
export const relevance=(query,o)=>{const t=words(query);return relevanceOf(new Set([...t,...t.map(singular)]),o);};
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
 const score=o=>(preferred.includes(o.id)?1000:0)+relevanceOf(tokens,o);
 return [...directorCatalog().objects].sort((a,b)=>score(b)-score(a)||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,limit);
}
