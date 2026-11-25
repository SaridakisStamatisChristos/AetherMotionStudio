// GEN-09 Reels export: `node scripts/reels-export.mjs <production output dir> [--cover-frame N]`.
// Writes <dir>/reels/cover.jpg (a frame of the finished film) and <dir>/reels/reels-report.json next to the film; the
// film itself is already a valid Reel (1080×1920 H.264 + AAC) and is never modified. Long films are allowed: length
// above the recommended 90 s is a warning, not a refusal. Existing exports are refused (never overwritten).
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {REELS} from '../src/core/reels-layout.js';

// Default cover: the middle of the first line said in a single (GEN-06), else the middle of the first spoken line,
// else the middle of the film. An explicit frame must lie inside the film.
export function coverFrame(scene,timeline,explicit=null){
 const n=timeline.durationFrames;
 if(explicit!==null){if(!Number.isSafeInteger(explicit)||explicit<0||explicit>=n)throw Error('cover frame outside the film (0–'+(n-1)+')');return {frame:explicit,source:'explicit'};}
 const single=timeline.shots.find(s=>s.id.endsWith('-single')&&s.segments?.length),first=timeline.shots.find(s=>s.segments?.length);
 const pick=(s,source)=>({frame:Math.min(n-1,Math.round((s.segments[0].startSample+s.segments[0].endSample)/2/1600)),source,shot:s.id});
 return single?pick(single,'first single'):first?pick(first,'first line'):{frame:Math.floor(n/2),source:'middle'};
}
export function reelsReport(scene,timeline,probe,checks=null,cover){
 const v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio'),seconds=timeline.durationFrames/30,warnings=[],errors=[];
 if(!v||v.width!==1080||v.height!==1920)errors.push({code:'NOT_9_16',detail:v?v.width+'x'+v.height:'no video'});
 if(v&&v.codec_name!=='h264')errors.push({code:'VIDEO_CODEC',detail:v.codec_name});
 if(!a||a.codec_name!=='aac')errors.push({code:'AUDIO_CODEC',detail:a?.codec_name??'no audio'});
 if(seconds>REELS.recommendedMaxSeconds)warnings.push({code:'REELS_LONG',seconds,recommended:REELS.recommendedMaxSeconds,note:'allowed; longer Reels may reach fewer viewers'});
 if(scene.delivery!==REELS.version)warnings.push({code:'NOT_REELS_LAYOUT',note:'rendered without delivery reels-v1: captions and characters may sit under the app overlay'});
 for(const w of checks?.reels?.warnings??[])if(w.code!=='REELS_LONG')warnings.push(w);
 return {version:1,profile:REELS.version,seconds,video:v?{width:v.width,height:v.height,codec:v.codec_name}:null,audio:a?{codec:a.codec_name}:null,cover,
  safeAreaAssumption:'1080x1920: top 220, bottom 420, left 60, right 120 px kept clear (third-party guides disagree; check in the app)',
  status:errors.length?'fail':'pass',errors,warnings};
}
function main(argv){
 const dir=resolve(argv[0]??'');const i=argv.indexOf('--cover-frame'),explicit=i>=0?Number(argv[i+1]):null;
 if(!argv[0]||!existsSync(join(dir,'film.mp4')))throw Error('usage: reels-export.mjs <production output dir with film.mp4> [--cover-frame N]');
 const out=join(dir,'reels');if(existsSync(out))throw Error('refusing to overwrite existing export '+out);
 const read=n=>JSON.parse(readFileSync(join(dir,n),'utf8'));
 const scene=read('scene.json'),timeline=read('timeline.json'),probe=read('probe.json'),checks=existsSync(join(dir,'quality-checks.json'))?read('quality-checks.json'):null;
 const cover=coverFrame(scene,timeline,explicit);mkdirSync(out);
 const ff=process.env.AETHER_FFMPEG??'ffmpeg',r=spawnSync(ff,['-v','error','-i',join(dir,'film.mp4'),'-vf','select=eq(n\\,'+cover.frame+')','-frames:v','1','-q:v','2',join(out,'cover.jpg')],{encoding:'utf8'});
 if(r.status!==0||!existsSync(join(out,'cover.jpg')))throw Error('cover extraction failed: '+(r.stderr||r.error?.message||r.status));
 const report=reelsReport(scene,timeline,probe,checks,cover);writeFileSync(join(out,'reels-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('REELS:',report.status,report.seconds+' s','cover frame',cover.frame,'('+cover.source+')','warnings',JSON.stringify(report.warnings.map(w=>w.code)));
 if(report.status!=='pass')process.exitCode=1;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)main(process.argv.slice(2));
