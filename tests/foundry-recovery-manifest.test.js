import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const m=JSON.parse(readFileSync(new URL('../benchmarks/af09-legacy-recovery-inputs.json',import.meta.url),'utf8'));
test('AF09 recovery manifest has complete SHA-256 digests and exact archived input fields',()=>{
 assert.match(m.sourceCommit,/^[0-9a-f]{40}$/);
 assert.deepEqual(Object.keys(m.phases).sort(),['asset-showcase','director','foundry-af01','speech']);
 for(const [phase,row] of Object.entries(m.phases)){
  assert.ok(Number.isSafeInteger(row.frames)&&row.frames>0);
  for(const side of ['cpu','three']){
   for(const n of ['scene.json','timeline.json','voice-report.json','kokoro-narration.wav','film.mp4'])assert.ok(Object.hasOwn(row[side],n),phase+' '+side+' '+n);
   for(const [n,d] of Object.entries(row[side]))assert.match(d,/^[0-9a-f]{64}$/,phase+' '+side+' '+n);
  }
  assert.notEqual(row.cpu['timeline.json'],row.three['timeline.json']);
 }
 for(const n of ['mix.wav','speech-report.json','captions.srt','captions.vtt'])assert.ok(Object.hasOwn(m.phases.speech.cpu,n));
});
