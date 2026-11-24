// LOCAL-03: pure option parsing and statistics for the local performance bench and opt-in render settings.
export const GL_MODES=Object.freeze(['swangle','angle','angle-egl','vulkan','egl','swiftshader']);
export const HW_ENCODE=Object.freeze(['disable','if-possible','required']);
const slug=/^[a-z0-9][a-z0-9-]{0,47}$/;
export function intIn(name,raw,lo,hi){
 const n=Number(raw);
 if(typeof raw!=='string'&&typeof raw!=='number'||!Number.isSafeInteger(n)||n<lo||n>hi||String(raw)!==String(n))throw Error(name+' must be an integer from '+lo+' to '+hi);
 return n;
}
// Explicit opt-in render settings from the environment; defaults reproduce the historical native path exactly.
export function renderSettings(env=process.env){
 const concurrency=env.AETHER_CONCURRENCY===undefined||env.AETHER_CONCURRENCY===''?2:intIn('AETHER_CONCURRENCY',env.AETHER_CONCURRENCY,1,16);
 const gl=env.AETHER_GL||'swangle';if(!GL_MODES.includes(gl))throw Error('AETHER_GL must be one of '+GL_MODES.join(', '));
 const hw=env.AETHER_HW_ENCODE||'disable';if(!HW_ENCODE.includes(hw))throw Error('AETHER_HW_ENCODE must be one of '+HW_ENCODE.join(', '));
 return {concurrency,gl,hardwareAcceleration:hw};
}
export function parseBench(args){
 const o={},values=new Set(['source','id','runs','concurrency','gl','hw-encode','warmup']),flags=new Set(['reuse-browser','skip-quality','serial-encode']);
 const q=[...args];while(q.length){
  const raw=q.shift();if(!raw.startsWith('--'))throw Error('Expected --option');const k=raw.slice(2);
  if(Object.hasOwn(o,k))throw Error('Duplicate option: '+k);
  if(flags.has(k))o[k]=true;else if(values.has(k)&&q.length&&!q[0].startsWith('--'))o[k]=q.shift();else throw Error('Unknown or missing option: '+k);
 }
 if(!o.source||!o.id)throw Error('--source <matched output dir> and --id <slug> are required');
 if(!slug.test(o.id))throw Error('--id must be a lowercase slug');
 const gl=o.gl??'swangle';if(!GL_MODES.includes(gl))throw Error('--gl must be one of '+GL_MODES.join(', '));
 const hw=o['hw-encode']??'disable';if(!HW_ENCODE.includes(hw))throw Error('--hw-encode must be one of '+HW_ENCODE.join(', '));
 return {source:o.source,id:o.id,runs:o.runs===undefined?3:intIn('--runs',o.runs,1,20),warmup:o.warmup===undefined?0:intIn('--warmup',o.warmup,0,5),concurrency:o.concurrency===undefined?2:intIn('--concurrency',o.concurrency,1,16),gl,hardwareAcceleration:hw,reuseBrowser:o['reuse-browser']===true,skipQuality:o['skip-quality']===true,serialEncode:o['serial-encode']===true};
}
export function stats(values){
 const v=values.filter(Number.isFinite);if(!v.length)return null;
 const s=[...v].sort((a,b)=>a-b),mean=v.reduce((a,b)=>a+b,0)/v.length;
 const sd=v.length>1?Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/(v.length-1)):0;
 return {n:v.length,mean,min:s[0],max:s.at(-1),median:s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2,sd};
}
