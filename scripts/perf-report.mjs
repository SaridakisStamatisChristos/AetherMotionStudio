// LOCAL-03: aggregate out/bench/*/results.json into one comparison table (Markdown + JSON). Read-only over bench data.
import {readdirSync,readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dir=join(root,'out','bench');
const only=process.argv.slice(2);
const f=(x,d=1)=>x==null||!Number.isFinite(x)?'–':x.toFixed(d);
const rows=[];
for(const id of existsSync(dir)?readdirSync(dir).sort():[]){
 if(only.length&&!only.some(p=>id.startsWith(p)))continue;
 const p=join(dir,id,'results.json');if(!existsSync(p))continue;
 const r=JSON.parse(readFileSync(p,'utf8')),s=r.summary??{},measured=r.runs.filter(x=>!x.warmup);
 rows.push({id,backend:r.backend,frames:r.frames,gl:r.settings.gl??'–',c:r.settings.concurrency,hw:r.settings.hardwareAcceleration,reuse:r.settings.reuseBrowser,serial:r.settings.serialEncode,
  ok:s.succeeded??measured.filter(x=>x.status==='succeeded').length,failed:s.failed??measured.filter(x=>x.status!=='succeeded').length,
  renderS:s.renderMediaMs?.mean/1000,renderSd:s.renderMediaMs?.sd/1000,framesS:s.framesRenderedMs?.mean/1000,stitchS:s.encodeDoneMs?.mean/1000,fps:s.framesPerSecond?.mean,
  browserS:s.browserOpenMs?.mean/1000,verifyS:s.verifyMs?.mean/1000,qualityS:s.qualityMs?.mean/1000,bundleS:r.bundleMs/1000,
  gpuUtil:s.gpuUtilMean?.mean,vramMiB:s.gpuMemPeakMiB?.max,cpuUtil:s.cpuUtilMean?.mean,ramGB:s.ramPeakDeltaGB?.max,cpuPerfMin:s.cpuPerfMin?.min,
  hashes:s.filmHashes?.length??0,matchRef:s.allMatchReference,glitchRuns:measured.filter(x=>x.glitch&&x.glitch.status!=='clean').map(x=>x.name+':'+(x.glitch.frames??[]).join('/')),
  errors:measured.map(x=>x.error).filter(Boolean).map(e=>e.slice(0,160))});
}
const head='| id | backend | frames | gl | conc | hw | reuse | serial | ok/fail | render s (sd) | frames s | stitch s | fps | browser s | verify s | quality s | GPU util % | VRAM MiB | CPU % | RAM Δ GB | CPU perf min % | film hashes | = ref |\n|'+'---|'.repeat(23);
const md=[head,...rows.map(x=>`| ${x.id} | ${x.backend} | ${x.frames} | ${x.gl} | ${x.c} | ${x.hw} | ${x.reuse?'y':'n'} | ${x.serial?'y':'n'} | ${x.ok}/${x.failed} | ${f(x.renderS)} (${f(x.renderSd,2)}) | ${f(x.framesS)} | ${f(x.stitchS,2)} | ${f(x.fps,2)} | ${f(x.browserS,2)} | ${f(x.verifyS,2)} | ${f(x.qualityS,2)} | ${f(x.gpuUtil)} | ${f(x.vramMiB,0)} | ${f(x.cpuUtil)} | ${f(x.ramGB,2)} | ${f(x.cpuPerfMin,0)} | ${x.hashes} | ${x.matchRef===null?'–':x.matchRef?'yes':'NO'} |`)].join('\n');
const errs=rows.filter(x=>x.errors.length||x.glitchRuns.length).map(x=>`- ${x.id}: ${[...x.errors,...x.glitchRuns.map(g=>'glitch '+g)].join(' / ')}`).join('\n');
writeFileSync(join(dir,'report.md'),md+'\n'+(errs?'\nErrors:\n'+errs+'\n':''));writeFileSync(join(dir,'report.json'),JSON.stringify(rows,null,2)+'\n');
console.log(md);if(errs)console.log('\nErrors:\n'+errs);
