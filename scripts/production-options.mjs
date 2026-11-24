import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {request,safeJson} from '../src/director/schema.js';
import {defaultSpeech,productionId} from '../src/studio/production.js';
export function parseProduction(args,{read=p=>readFileSync(resolve(p),'utf8'),newId=()=> 'film-'+randomBytes(6).toString('hex')}={}){
 const o={},flags=new Set(['repair']),values=new Set(['request','topic','script','script-file','seconds','backend','profile','voice','language','id','seed','import']);
 const queue=[...args];while(queue.length){
  const raw=queue.shift();if(!raw.startsWith('--'))throw Error('Expected --option');const k=raw.slice(2);
  if(Object.hasOwn(o,k))throw Error('Duplicate option: '+k);
  if(flags.has(k))o[k]=true;
  else if(values.has(k)&&queue.length&&!queue[0].startsWith('--'))o[k]=queue.shift();
  else throw Error('Unknown or missing option: '+k);
 }
 if(!o.request&&!o.topic)throw Error('Specify --topic or --request');
 if(o.request&&o.topic)throw Error('Choose --topic or --request');
 if(o.script&&o['script-file'])throw Error('Choose --script or --script-file');
 const input=o.request?safeJson(read(o.request)):{version:1,topic:o.topic,seconds:30,id:newId()};
 const patch={};for(const k of ['id','profile','voice','language','script'])if(o[k]!==undefined)patch[k]=o[k];
 for(const k of ['seconds','seed'])if(o[k]!==undefined)patch[k]=Number(o[k]);
 if(o['script-file'])patch.script=read(o['script-file']);
 const mode=o.backend??input.backend??'cpu',backends=mode==='both'?['cpu','three']:[mode];
 if(backends.some(b=>!['cpu','three'].includes(b)))throw Error('Choose cpu, three or both');
 const raw={...input,...patch,backend:backends[0]},id=raw.id??newId();
 raw.id=id;const q=request({...raw,speech:raw.speech??defaultSpeech(raw.seconds)});
 // Strictly reject conflicting supplied speech target, never silently retime authored data.
 const ids=backends.map(b=>productionId(id,b,q.profile));
 return {request:q,id,backends,ids,repair:o.repair===true,imported:o.import?read(o.import):null};
}
