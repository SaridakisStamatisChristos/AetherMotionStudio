// GPU-04 (owner 2026-11-28: plain GLB only, models the program makes itself). The Foundry's own GLB reader
// (scripts/import-formats.mjs parseGLTF, AF05) is the only path; three's GLTFLoader and the DRACO/meshopt/KTX2 decoders
// are not used. These hostile variants of the original fixture GLB must all be refused, and nothing may be dropped silently.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {writeCorpus} from '../scripts/foundry-import-corpus.mjs';
import {parseGLTF} from '../scripts/import-formats.mjs';
const root=mkdtempSync(join(tmpdir(),'gpu04-'));writeCorpus(root);
const glb=readFileSync(join(root,'instrument.glb'));rmSync(root,{recursive:true,force:true});
const jl=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+jl).toString('utf8')),bin=glb.subarray(20+jl);
function pack(g,binChunk=bin){let j=Buffer.from(JSON.stringify(g));while(j.length%4)j=Buffer.concat([j,Buffer.from(' ')]);const h=Buffer.alloc(12);h.writeUInt32LE(0x46546c67,0);h.writeUInt32LE(2,4);h.writeUInt32LE(12+8+j.length+binChunk.length,8);const jh=Buffer.alloc(8);jh.writeUInt32LE(j.length,0);jh.writeUInt32LE(0x4e4f534a,4);return Buffer.concat([h,jh,j,binChunk]);}
const src={read:()=>{throw Error('no external reads')}};
const parse=b=>parseGLTF(b,'x.glb',src,'glb');
const g=()=>structuredClone(json);

test('the original fixture GLB parses (2 parts) and re-packing it is lossless',()=>{
 assert.equal(parse(glb).length,2);assert.deepEqual(parse(pack(g())),parse(glb));
});

test('hostile GLB variants are refused with a reason',()=>{
 const n=json.nodes.length,scene=json.scene??0;
 const cases={
  'self child':[x=>{x.nodes[0].children=[0];},/cycle/],
  'reachable cycle':[x=>{x.nodes.push({children:[n+1]},{children:[n]});x.scenes[scene].nodes.push(n);},/cycle/],
  'shared node':[x=>{x.nodes.push({mesh:0},{children:[n]},{children:[n]});x.scenes[scene].nodes.push(n+1,n+2);},/cycle or shared/],
  'unreachable node':[x=>{x.nodes.push({mesh:0});},/not reachable/],
  'unreachable cycle':[x=>{x.nodes.push({children:[n+1]},{children:[n]});},/not reachable/],
  'very deep hierarchy':[x=>{for(let i=0;i<300;i++)x.nodes.push({children:[n+i+1]});x.nodes.push({});x.scenes[scene].nodes.push(n);},/budget|depth/],
  'animations':[x=>{x.animations=[{channels:[],samplers:[]}];},/unknown field animations/],
  'skins':[x=>{x.skins=[{joints:[0]}];},/unknown field skins/],
  'accessor count lie':[x=>{x.accessors[0].count=1e7;},/integer bounds/],
  'buffer view length lie':[x=>{x.bufferViews[0].byteLength=1e9;},/integer bounds/],
  'non-finite transform':[x=>{x.nodes[0].translation=[Infinity,0,0];},/numeric bounds|null/],
  'absurd scale':[x=>{x.nodes[0].scale=[1e6,1e6,1e6];},/numeric bounds/],
  'compression extension':[x=>{x.extensionsUsed=['KHR_draco_mesh_compression'];x.extensionsRequired=['KHR_draco_mesh_compression'];},/extension/],
  'texture compression extension':[x=>{x.extensionsUsed=['KHR_texture_basisu'];},/extension/],
  'embedded data link':[x=>{x.buffers[0].uri='data:application/octet-stream;base64,AAAA';},/unsafe|dependency/],
  'remote link':[x=>{x.buffers[0].uri='https://example.invalid/a.bin';},/unsafe|dependency/],
  'glTF version 1':[x=>{x.asset.version='1.0';},/version/],
 };
 for(const [name,[mutate,re]] of Object.entries(cases)){const x=g();mutate(x);assert.throws(()=>parse(pack(x)),re,name);}
});

test('GLB container lies are refused before any parsing',()=>{
 const ok=pack(g());
 const len=Buffer.from(ok);len.writeUInt32LE(ok.length+100,8);assert.throws(()=>parse(len),/GLB header/);
 assert.throws(()=>parse(ok.subarray(0,200)),/GLB header/);
 const magic=Buffer.from(ok);magic.writeUInt32LE(0x12345678,0);assert.throws(()=>parse(magic),/GLB header/);
 const ver=Buffer.from(ok);ver.writeUInt32LE(1,4);assert.throws(()=>parse(ver),/GLB header/);
 assert.throws(()=>parse(Buffer.alloc(8)),/GLB header/);
});
