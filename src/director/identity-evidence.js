import {digest} from './catalog.js';
import {continuityLedger,canonical,resolveIdentity,validateLibrary} from '../core/identity.js';
import {evaluateGraph} from '../core/graph.js';
import {emitAsset} from '../visual/assets.js';
export function geometryRecord(asset,params,pose={}){
 const rows=[];emitAsset(asset,(c,s,color,tf=q=>q,lit=false)=>{
  const corners=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])corners.push(tf(c.map((v,i)=>v+s[i]*[x,y,z][i]/2)).map(v=>Math.round(v*1e8)/1e8));
  if(!corners.flat().every(Number.isFinite))throw Error('nonfinite geometry '+asset);rows.push({color,lit,corners});
 },{origin:[0,0,0],scale:1,yaw:0,blink:1,...pose,...(params?{params}:{})});
 if(!rows.length)throw Error('empty geometry '+asset);return rows;
}
export function identityEvidence(project){
 const ledger=continuityLedger(project);if(!ledger)return null;
 const map=validateLibrary(project.identityLibrary),fingerprints=new Map(),shots=[];
 for(const s of project.shots){
  const samples=[];
  for(const t of [0,.25,.5,.75,1]){
   const state=evaluateGraph(s,t),items=[];
   for(const a of state.assets.filter(x=>x.identity)){
    const binding=resolveIdentity(map,a.identity,a.variant),key=a.identity+'/'+a.variant;
    if(canonical(a.pose.params)!==canonical(binding.params))throw Error('sampled identity appearance drift');
    const fp=digest(geometryRecord(a.asset,a.pose.params)),prev=fingerprints.get(key);
    if(prev&&prev!==fp)throw Error('identity neutral geometry drift '+key);fingerprints.set(key,fp);
    items.push({identity:a.identity,variant:a.variant,neutralGeometryDigest:fp,origin:a.pose.origin,appearance:a.pose.params??{}});
   }
   samples.push({progress:t,items});
  }
  shots.push({shot:s.id,samples});
 }
 return {version:1,ledger,neutralGeometryFingerprints:Object.fromEntries(fingerprints),shots};
}
