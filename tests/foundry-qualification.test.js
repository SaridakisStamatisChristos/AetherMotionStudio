import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPair,normalize} from '../scripts/foundry-qualify.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const protocol=read('benchmarks/foundry-final-v1.json');
test('AF09 frozen protocol has nine required comparisons and unique lane IDs',()=>{
 assert.equal(protocol.pairs.length,9);assert.equal(new Set(protocol.pairs.flatMap(x=>[x.cpu,x.three])).size,18);
 assert.equal(protocol.pairs.find(x=>x.key==='laboratory').frames,1350);
 for(const row of protocol.pairs.filter(x=>!['imported','generated','portable'].includes(x.key)))checkPair(read('examples/'+row.cpu+'.json'),read('examples/'+row.three+'.json'),row);
});
test('AF09 reject camera, narration and matched LOD drift',()=>{
 const row=protocol.pairs.find(x=>x.key==='premium-discovery'),a=read('examples/'+row.cpu+'.json'),b=read('examples/'+row.three+'.json');
 for(const mutate of [s=>s.shots[0].camera.x[0][1]+=.1,s=>s.shots[0].narration[0]+=' Changed.',s=>s.shots[0].lodPolicy.overrides[0].level=2]){const x=structuredClone(b);mutate(x);assert.throws(()=>checkPair(a,x,row));}
 assert.deepEqual(normalize(read('examples/cinematic-cpu-polished.json'),{assetQuality:true}),normalize(a,{assetQuality:true}));
});
