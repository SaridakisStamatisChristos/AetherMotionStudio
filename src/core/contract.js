export const FORMAT=Object.freeze({width:1080,height:1920,fps:30,seconds:12,frames:360});
export const TEMPLATES=Object.freeze(['robot-treasure','orbit-explainer']);
export const VOICES=Object.freeze(['af_heart','af_bella','af_nova','af_sarah','am_adam','am_michael','am_fenrir','bf_emma','bm_george']);
const fail=(p,m)=>{throw new Error(p+': '+m)};
const obj=(v,p,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(p,'expected object');for(const k of Object.keys(v))if(!keys.includes(k))fail(p+'.'+k,'unknown field');for(const k of keys)if(!Object.hasOwn(v,k))fail(p+'.'+k,'required');};
const str=(v,p,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f\u007f]/.test(v))fail(p,'expected nonempty printable string (max '+max+')');};
const time=(v,p)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>FORMAT.seconds)fail(p,'expected seconds in [0,12]');};
const arr=(v,p,n,max)=>{if(!Array.isArray(v)||v.length<n||v.length>max)fail(p,'expected array length '+n+'–'+max);};
function interval(start,end,prev,p){time(start,p+'.start');time(end,p+'.end');if(start<prev||end<=start)fail(p,'intervals must be sorted, nonoverlapping and positive');}
export function validateScene(s){
 obj(s,'scene',['version','id','template','title','voice','copy','narration','captions']);
 if(s.version!==1)fail('version','only v1 supported');
 if(typeof s.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,47}$/.test(s.id)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(s.id))fail('id','safe lowercase slug required');
 if(!TEMPLATES.includes(s.template))fail('template','unsupported');
 if(!VOICES.includes(s.voice))fail('voice','unsupported');
 str(s.title,'title',100);
 const c=s.copy;obj(c,'copy',['kicker','intro','question','reveal','outro']);str(c.kicker,'copy.kicker',48);str(c.question,'copy.question',32);
 for(const [k,n] of [['intro',3],['reveal',2],['outro',2]]){arr(c[k],'copy.'+k,n,n);c[k].forEach((x,i)=>str(x,'copy.'+k+'['+i+']',40));}
 arr(s.narration,'narration',1,12);let prev=0;
 s.narration.forEach((x,i)=>{const p='narration['+i+']';obj(x,p,['start','end','text']);interval(x.start,x.end,prev,p);if(x.end-x.start<.4)fail(p,'minimum .4 seconds');str(x.text,p+'.text',160);prev=x.end;});
 arr(s.captions,'captions',0,36);prev=0;
 s.captions.forEach((x,i)=>{const p='captions['+i+']';arr(x,p,3,3);interval(x[0],x[1],prev,p);str(x[2],p+'.text',52);prev=x[1];});
 return s;
}
