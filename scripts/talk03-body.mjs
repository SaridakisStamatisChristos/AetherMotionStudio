// TALK-03 example: the TALK-02 meeting with body language (beats at measured emphasis peaks, listener nods, blinks,
// head sway). Derived from scripts/talk02-dialogue.mjs so the dialogue stays identical. Deterministic generator.
// Usage: node scripts/talk03-body.mjs [--check]  (writes examples/talk03-body-{cpu,three}-polished.json)
import {readFileSync,writeFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {build as dialogue} from './talk02-dialogue.mjs';

export function build(backend){
 const p=dialogue(backend);p.id='talk03-body-'+backend+'-polished';p.title='TALK-03 body language';
 // Slower turns toward the speaker than the TALK-02 default (owner review: heads moved too fast).
 if(p.shots[0].dialogue)p.shots[0].dialogue.turn=.8;
 for(const s of p.shots){s.bodyLanguage={beats:true,nods:true,blinks:true,sway:true};
  // Generated blinks replace the hand-authored robot blink track (authored tracks always take precedence).
  for(const a of s.assets)if(a.tracks?.blink)delete a.tracks.blink;}
 validateProject(p);return p;
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 for(const b of ['cpu','three']){const file=new URL('../examples/talk03-body-'+b+'-polished.json',import.meta.url),text=JSON.stringify(build(b),null,1)+'\n';
  if(process.argv.includes('--check')){if(readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==text)throw Error('stale '+file.pathname);}else writeFileSync(file,text);}
 console.log('ok');
}
