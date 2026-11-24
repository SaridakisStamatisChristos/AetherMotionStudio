import {MAX_JSON_BYTES,safeJson} from './schema.js';
export class ProviderError extends Error{constructor(code,message){super(message);this.code=code;}}
function usage(x){return Number.isSafeInteger(x)&&x>=0?x:null;}
async function boundedBody(response){
 const reader=response.body?.getReader();if(!reader)throw new ProviderError('response','missing provider body');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_JSON_BYTES){await reader.cancel();throw new ProviderError('response-size','provider response too large');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return safeJson(Buffer.concat(chunks).toString('utf8'));
}
function endpoint(raw,local){
 let u;try{u=new URL(raw)}catch{throw new ProviderError('configuration','invalid endpoint URL');}
 if(u.username||u.password||u.hash||u.search)throw new ProviderError('configuration','endpoint credentials/query/fragment forbidden');
 if(local){if(!['http:','https:'].includes(u.protocol)||!['localhost','127.0.0.1','[::1]'].includes(u.hostname))throw new ProviderError('configuration','local provider requires a loopback endpoint');}
 else if(u.protocol!=='https:')throw new ProviderError('configuration','remote endpoint requires HTTPS');
 return u.toString().replace(/\/$/,'');
}
export function provider(kind,config={},fetcher=globalThis.fetch){
 if(!['local','openai-compatible','gemini'].includes(kind))throw new ProviderError('configuration','unknown provider');
 const local=kind==='local',model=config.model;
 if(typeof model!=='string'||!model.trim()||model.length>128||!/^[a-zA-Z0-9._:/-]+$/.test(model))throw new ProviderError('configuration','explicit model required');
 if(!local&&config.allowRemote!==true)throw new ProviderError('configuration','remote inference requires explicit opt-in');
 if(!local&&(!config.apiKey||typeof config.apiKey!=='string'))throw new ProviderError('configuration','remote API key required');
 const timeout=config.timeoutMs??30000;if(!Number.isSafeInteger(timeout)||timeout<100||timeout>120000)throw new ProviderError('configuration','timeout out of range');
 const base=kind==='gemini'?'https://generativelanguage.googleapis.com/v1beta':endpoint(config.endpoint??'',local);
 const url=kind==='gemini'?base+'/models/'+encodeURIComponent(model)+':generateContent':base+'/chat/completions';
 return {name:kind,model,async generate(prompt,{seed}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const headers={'Content-Type':'application/json'};
   if(kind==='gemini')headers['x-goog-api-key']=config.apiKey;else if(config.apiKey)headers.Authorization='Bearer '+config.apiKey;
   const body=kind==='gemini'?{contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:.2,responseMimeType:'application/json',maxOutputTokens:8192}}:{model,messages:[{role:'user',content:prompt}],temperature:.2,max_tokens:8192,...(config.sendSeed?{seed}:{})};
   const response=await fetcher(url,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal,redirect:'error'});
   if(!response.ok)throw new ProviderError('http','provider HTTP '+response.status);
   const data=await boundedBody(response);
   const result=kind==='gemini'?data.candidates?.[0]?.content?.parts?.map(p=>p.text??'').join(''):data.choices?.[0]?.message?.content;
   if(typeof result!=='string'||!result.trim())throw new ProviderError('response','provider returned no JSON text');
   const u=kind==='gemini'?data.usageMetadata:data.usage;
   return {text:result,usage:{input:usage(kind==='gemini'?u?.promptTokenCount:u?.prompt_tokens),output:usage(kind==='gemini'?u?.candidatesTokenCount:u?.completion_tokens)}};
  }catch(e){if(controller.signal.aborted)throw new ProviderError('timeout','provider timeout');if(e instanceof ProviderError)throw e;throw new ProviderError('transport','provider request or response failed');}
  finally{clearTimeout(timer);}
 }};
}
export const mockProvider=fn=>({name:'mock',model:'test-only',generate:fn});
