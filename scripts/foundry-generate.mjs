import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {direct} from '../src/director/index.js';
import {resolveAssetRequest,GenerationRegistry} from '../src/director/foundry.js';
const dir='out/foundry-af07-generation';mkdirSync(dir,{recursive:true});
const held=JSON.parse(readFileSync('examples/foundry-af07-heldout.json','utf8')),registry=new GenerationRegistry(),rows=[];
for(const h of held){const actual=await resolveAssetRequest(h.request,{registry});rows.push({...h,actual:actual.status,match:actual.status===h.expected,reused:actual.reused??false,revision:actual.ref?.revision??null,inspection:actual.evidence?.digest??null,views:actual.evidence?.views??[],attempts:actual.attempts,reason:actual.reason??null});}
const story=JSON.parse(readFileSync('examples/foundry-af07-story.request.json','utf8'));
for(const backend of ['cpu','three']){const {foundryRequests,...q}=story;const result=await direct({...q,backend,id:'foundry-af07-'+backend+'-polished'},{foundryRequests});writeFileSync('examples/'+result.project.id+'.json',JSON.stringify(result.project,null,2));writeFileSync(dir+'/'+backend+'-trace.json',JSON.stringify(result.stages,null,2));}
const report={version:1,heldout:rows,total:rows.length,matched:rows.filter(x=>x.match).length,generated:rows.filter(x=>x.actual==='generate').length,compiledRendered:rows.filter(x=>x.actual==='generate'&&x.views.length===6).length,duplicateReuse:rows.filter(x=>x.reused).length,registryEntries:registry.size,humanApprovals:0,tokens:null,nativeThree:'deferred'};
writeFileSync(dir+'/evaluation.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,heldout:undefined}));assert.equal(report.matched,report.total,JSON.stringify(rows.filter(x=>!x.match)));
