import {fields,finite,choice,literal} from './cinematography.js';
const types=['title','lower-third','label','callout','arrow','counter','bar','line','pie','timeline','equation','network'];
const modes=['stagger','reveal','emphasize','slide','counter'];
const fail=(p,m)=>{throw Error(p+': '+m)};
function list(x,min,max,p){if(!Array.isArray(x)||x.length<min||x.length>max)fail(p,'invalid item count');}
export function validateOverlays(xs,p='overlays'){
 list(xs,0,3,p);const occupied=new Set();
 for(const [i,x] of xs.entries()){
  const q=p+'['+i+']';
  fields(x,['type','slot','text','start','end','animation','data','unit','axis','from','to','edges'],q,['type','slot','text']);
  choice(x.type,types,q+'.type');choice(x.slot,['upper','lower','center'],q+'.slot');if(occupied.has(x.slot))fail(q,'duplicate slot');occupied.add(x.slot);
  literal(x.text,56,q+'.text');finite(x.start??0,0,1,q+'.start');finite(x.end??1,0,1,q+'.end');if((x.start??0)>=(x.end??1))fail(q,'invalid window');
  if(x.animation!==undefined)choice(x.animation,modes,q+'.animation');
  if(['bar','line','pie'].includes(x.type)){
   if(x.slot!=='lower')fail(q,'charts require lower slot');list(x.data,2,5,q+'.data');literal(x.unit,12,q+'.unit');literal(x.axis,24,q+'.axis');
   let sum=0;for(const d of x.data){fields(d,['label','value'],q+'.data',['label','value']);literal(d.label,12,q+'.label');finite(d.value,0,1e9,q+'.value');sum+=d.value;}
   if(sum<=0)fail(q,'positive chart domain required');
  }else if(x.type==='counter'){finite(x.from??0,-1e9,1e9,q+'.from');finite(x.to,-1e9,1e9,q+'.to');literal(x.unit,12,q+'.unit');}
  else if(['timeline','equation','network'].includes(x.type)){
   list(x.data,2,5,q+'.data');for(const d of x.data)literal(d,14,q+'.data');
   if(x.type==='network'){list(x.edges,1,10,q+'.edges');const seen=new Set();for(const e of x.edges){list(e,2,2,q+'.edge');for(const v of e)if(!Number.isSafeInteger(v)||v<0||v>=x.data.length)fail(q,'edge index');const key=[...e].sort().join(':');if(e[0]===e[1]||seen.has(key))fail(q,'invalid edge');seen.add(key);}}
  }else if(x.data!==undefined)fail(q,'data not allowed for this type');
 }
}
export function overlayLayout(slot){return {upper:{x:48,y:310,w:624,h:96},center:{x:48,y:565,w:624,h:104},lower:{x:48,y:850,w:624,h:180}}[slot];}
