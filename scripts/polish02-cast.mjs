// POLISH-02 item 7: human detail 3 lineup. Reuses the ART-03 cast staging ("after" shot, detail 2) and repeats it
// at detail 3 (per-kind hair, brow tilt, fingers, clothing silhouettes). Deterministic generator.
// Usage: node scripts/polish02-cast.mjs [--check]  (writes examples/polish02-cast-{cpu,three}-polished.json)
import {readFileSync,writeFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';

const src=JSON.parse(readFileSync(new URL('../examples/art03-cast-cpu-polished.json',import.meta.url),'utf8'));
export function build(backend){
 const after=src.shots.find(s=>s.id==='after');
 const two={...structuredClone(after),id:'detail-2',transitionFrames:0,transition:'cut',heading:'DETAIL TWO',subheading:'Faces that read at a glance.',narration:['At detail two, every face reads at a glance.']};
 const three={...structuredClone(after),id:'detail-3',heading:'DETAIL THREE',subheading:'Hair, hands and clothing.',transitionFrames:12,transition:'fade',narration:['Detail three adds hair, hands and clothing for each kind of character.']};
 for(const a of three.assets)if(a.params?.detail===2)a.params={...a.params,detail:3};
 const p={version:2,id:'polish02-cast-'+backend+'-polished',title:'POLISH-02 cast detail 3',voice:src.voice,shots:[two,three].map(s=>({...s,backend}))};
 validateProject(p);return p;
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 for(const b of ['cpu','three']){const file=new URL('../examples/polish02-cast-'+b+'-polished.json',import.meta.url),text=JSON.stringify(build(b),null,1)+'\n';
  if(process.argv.includes('--check')){if(readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==text)throw Error('stale '+file.pathname);}else writeFileSync(file,text);}
 console.log('ok');
}
