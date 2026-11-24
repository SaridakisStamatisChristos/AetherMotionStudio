import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBench,renderSettings,stats,intIn} from '../scripts/perf-options.mjs';
test('bench options: defaults, explicit settings and strict rejection',()=>{
 const d=parseBench(['--source','out/x','--id','b1']);
 assert.deepEqual({...d},{source:'out/x',id:'b1',runs:3,warmup:0,concurrency:2,gl:'swangle',hardwareAcceleration:'disable',reuseBrowser:false,skipQuality:false,serialEncode:false});
 const e=parseBench(['--source','s','--id','b2','--runs','5','--concurrency','8','--gl','vulkan','--hw-encode','if-possible','--reuse-browser','--serial-encode','--warmup','1']);
 assert.deepEqual([e.runs,e.concurrency,e.gl,e.hardwareAcceleration,e.reuseBrowser,e.serialEncode,e.warmup],[5,8,'vulkan','if-possible',true,true,1]);
 for(const bad of [[],['--source','s'],['--id','b'],['--source','s','--id','../x'],['--source','s','--id','B'],['--source','s','--id','b','--concurrency','0'],['--source','s','--id','b','--concurrency','17'],['--source','s','--id','b','--concurrency','2.5'],['--source','s','--id','b','--concurrency','2x'],['--source','s','--id','b','--runs','0'],['--source','s','--id','b','--gl','opengl'],['--source','s','--id','b','--hw-encode','nvenc'],['--source','s','--id','b','--id','c'],['--source','s','--id','b','--bogus','1'],['source','s']])
  assert.throws(()=>parseBench(bad),undefined,JSON.stringify(bad));
});
test('opt-in render settings default to the historical native path',()=>{
 assert.deepEqual(renderSettings({}),{concurrency:2,gl:'swangle',hardwareAcceleration:'disable'});
 assert.deepEqual(renderSettings({AETHER_CONCURRENCY:'4',AETHER_GL:'vulkan',AETHER_HW_ENCODE:'if-possible'}),{concurrency:4,gl:'vulkan',hardwareAcceleration:'if-possible'});
 assert.equal(renderSettings({AETHER_CONCURRENCY:''}).concurrency,2);
 for(const env of [{AETHER_CONCURRENCY:'0'},{AETHER_CONCURRENCY:'99'},{AETHER_CONCURRENCY:'four'},{AETHER_CONCURRENCY:' 4'},{AETHER_GL:'directx'},{AETHER_HW_ENCODE:'yes'}])assert.throws(()=>renderSettings(env),undefined,JSON.stringify(env));
 assert.throws(()=>intIn('x',null,1,2));
});
test('stats summarise finite values only',()=>{
 assert.deepEqual(stats([3,1,2]),{n:3,mean:2,min:1,max:3,median:2,sd:1});
 assert.equal(stats([4,2]).median,3);assert.equal(stats([NaN,null,undefined]),null);assert.equal(stats([5]).sd,0);
});
