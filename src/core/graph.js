import {ASSETS,emitAsset} from '../visual/assets.js';
import {keyframes} from './motion.js';
import {validateFidelity,fidelity} from './fidelity.js';
const limits=Object.freeze({x:[-2.4,2.4],y:[0,.7],z:[-1.2,1.2],yaw:[-8,8],scale:[.5,1.25],walking:[-1,1],open:[0,1],headRoll:[-.5,.5],headYaw:[-.8,.8],blink:[.1,1],pulse:[-1,1]});
const defaults=Object.freeze({x:0,y:0,z:0,yaw:0,scale:1,walking:0,open:0,headRoll:0,headYaw:0,blink:1,pulse:0});
const cameraLimits={x:[-3.5,3.5],y:[2.5,4.5],z:[7,11],zoom:[850,1350]};
const cameraDefaults={x:1.8,y:3.5,z:8.4,zoom:1100};
const fail=(p,m)=>{throw Error(p+': '+m)};
function object(x,keys,p,required=keys){if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');for(const k of Object.keys(x))if(!keys.includes(k))fail(p+'.'+k,'unknown field');for(const k of required)if(!Object.hasOwn(x,k))fail(p+'.'+k,'required');}
function text(x,p,max){if(typeof x!=='string'||!x.trim()||x.length>max||/[\u0000-\u001f\u007f]/.test(x))fail(p,'invalid text');}
function number(x,min,max,p){if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)fail(p,'out of range');}
function tracks(x,bounds,p){object(x,Object.keys(bounds),p,[]);for(const [k,v] of Object.entries(x)){if(!Array.isArray(v)||v.length<1||v.length>24)fail(p+'.'+k,'1–24 keyframes required');let prev=-1;for(const a of v){if(!Array.isArray(a)||a.length!==2)fail(p+'.'+k,'expected [progress,value]');number(a[0],0,1,p+'.'+k);number(a[1],...bounds[k],p+'.'+k);if(a[0]<=prev)fail(p+'.'+k,'strictly ordered keyframes required');prev=a[0];}}}
export function validateGraph(s,p='shot'){
 if(Object.hasOwn(s,'fidelity'))validateFidelity(s.fidelity,p+'.fidelity');
 if(!['cpu','three'].includes(s.backend))fail(p+'.backend','cpu or three required');
 text(s.heading,p+'.heading',42);text(s.subheading,p+'.subheading',64);
 if(!['laboratory','midnight','amber'].includes(s.environment))fail(p+'.environment','unknown environment');
 tracks(s.camera,cameraLimits,p+'.camera');
 if(!Array.isArray(s.assets)||s.assets.length<1||s.assets.length>8)fail(p+'.assets','1–8 assets required');
 const ids=new Set();
 for(const [i,a] of s.assets.entries()){const q=p+'.assets['+i+']';object(a,['id','asset','tracks'],q);if(typeof a.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,31}$/.test(a.id)||ids.has(a.id))fail(q+'.id','unique safe ID required');ids.add(a.id);if(!Object.hasOwn(ASSETS,a.asset))fail(q+'.asset','unknown asset');tracks(a.tracks,limits,q+'.tracks');}
 if(!Array.isArray(s.effects)||s.effects.length>4)fail(p+'.effects','0–4 effects required');
 const fx=new Set();for(const [i,e] of s.effects.entries()){const q=p+'.effects['+i+']';object(e,['type','target','color','start','end'],q);if(!['orbit','sparkles','glow'].includes(e.type))fail(q+'.type','unknown effect');if(!ids.has(e.target))fail(q+'.target','unknown target');if(typeof e.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(e.color))fail(q+'.color','hex color required');number(e.start,0,1,q+'.start');number(e.end,0,1,q+'.end');if(e.start>=e.end)fail(q,'invalid effect window');const key=e.type+':'+e.target;if(fx.has(key))fail(q,'duplicate effect');fx.add(key);}
 return s;
}
function sample(t,d,p){return Object.fromEntries(Object.entries(d).map(([k,v])=>[k,t[k]?keyframes(p,t[k]):v]));}
export const ENVIRONMENTS=Object.freeze({
 laboratory:Object.freeze({background:'#10253b',floor:'#1c3445',accent:'#6bdaef',key:'#fff0d8',rim:'#79baff'}),
 midnight:Object.freeze({background:'#151329',floor:'#242238',accent:'#b9a6ff',key:'#ffe6c5',rim:'#a58cff'}),
 amber:Object.freeze({background:'#30201d',floor:'#463029',accent:'#f9cb81',key:'#ffd2a0',rim:'#81d4dc'})
});
export function evaluateGraph(s,p){
 if(!Number.isFinite(p)||p<0||p>1)fail('progress','out of range');
 const c=sample(s.camera,cameraDefaults,p),assets=s.assets.map(a=>{const {x,y,z,...pose}=sample(a.tracks,defaults,p);return {id:a.id,asset:a.asset,pose:{origin:[x,y,z],...pose}}});
 return {camera:{position:[c.x,c.y,c.z],target:[0,1.2,0],zoom:c.zoom},assets,environment:ENVIRONMENTS[s.environment],effects:s.effects.map(e=>({...e,strength:p>=e.start&&p<=e.end?Math.min(1,(p-e.start)*12,(e.end-p)*12):0})),progress:p,fidelity:fidelity(s.fidelity)};
}
// Both backends consume exactly the same emitted box commands, in the same order.
export function emitGraph(state,box){for(const a of state.assets)emitAsset(a.asset,box,a.pose);}
export function boxBasis(center,transform){const origin=transform(center),axes=[0,1,2].map(i=>{const p=center.slice();p[i]+=1;return transform(p).map((x,j)=>x-origin[j]);});return {origin,axes};}
