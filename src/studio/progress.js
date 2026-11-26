// Owner choice 2026-11-26 ("implement 1"): a render progress bar in the Studio. The job log already carries every
// step: speech (speech_pipeline / make_timeline_audio "Compiled"), the quality preflight, Remotion's non-TTY progress
// lines ("Bundling 40%", "Rendered 120/1800, time remaining: 1m 2s", "Encoded 900/1800"), then verify.py "PASS: native"
// and quality_media.py "QUALITY:". jobProgress reads the newest of those lines and gives one bar for the whole job.
// Speech has no frame count, so that step is shown as "working" (not a measured share). Pure and browser-safe: it only
// reads the job the server already returns (no server or job contract change).
const STEPS=Object.freeze({
 starting:{from:0,to:0,label:'Starting'},
 speech:{from:0,to:12,label:'Preparing speech and timing'},
 preflight:{from:12,to:13,label:'Checking the plan'},
 bundling:{from:13,to:18,label:'Getting the renderer ready'},
 rendering:{from:18,to:90,label:'Rendering frames'},
 encoding:{from:90,to:96,label:'Encoding the film'},
 verifying:{from:96,to:99,label:'Checking the finished film'},
 complete:{from:100,to:100,label:'Done'},
});
export const PROGRESS_STEPS=STEPS;
// "1m 2s" / "1h 3m 4s" / "7s" (Remotion formatEtaString) → seconds
function etaSeconds(text){if(!text)return null;let s=0,ok=false;for(const m of text.matchAll(/(\d+)\s*([hms])/g)){ok=true;s+=Number(m[1])*{h:3600,m:60,s:1}[m[2]];}return ok?s:null;}
function lineStep(line){
 let m;
 if((m=/^\s*Rendered (\d+)\/(\d+)(?:, time remaining: (.+))?\s*$/.exec(line)))return {step:'rendering',done:+m[1],total:+m[2],eta:etaSeconds(m[3])};
 if((m=/^\s*Encoded (\d+)\/(\d+)\s*$/.exec(line)))return {step:'encoding',done:+m[1],total:+m[2]};
 if((m=/^\s*Bundling (\d+)%\s*$/.exec(line)))return {step:'bundling',done:+m[1],total:100};
 if(/^\s*(?:Copying public dir|Getting composition)/.test(line))return {step:'bundling',done:100,total:100};
 if(/^\s*(?:PASS: native|PASS: exact speech|QUALITY:)/.test(line))return {step:'verifying'};
 if(/^\s*Quality preflight:/.test(line))return {step:'preflight',done:1,total:1};
 if(/^\s*(?:Speech-first compiled:|Compiled film:)/.test(line))return {step:'speech',done:1,total:1};
 if(/^\s*(?:Compiled |Speech pace|Readable captions|Kokoro|Speech)/.test(line))return {step:'speech'};
 return null;
}
// job: {status, mode, log, error?}. Returns {step, percent (0–100 integer), label, detail, measured, active}.
export function jobProgress(job){
 if(!job||typeof job!=='object')return null;
 const lines=String(job.log??'').split(/\r\n|\r|\n/);
 let hit=null;for(let i=lines.length-1;i>=0&&!hit;i--)hit=lineStep(lines[i]);
 let step=hit?.step??'starting';
 if(job.status==='succeeded')step='complete';
 // An encode that has reached its last frame is followed by verify.py: show the check step, not a full encode bar.
 if(step==='encoding'&&hit.total&&hit.done>=hit.total&&job.status==='running')step='verifying';
 const s=STEPS[step],measured=!!(hit&&hit.step===step&&Number.isFinite(hit.done)&&hit.total>0);
 const share=measured?Math.min(1,Math.max(0,hit.done/hit.total)):0;
 // A prepare job ends after speech: its speech step is the whole bar.
 let percent=job.mode==='prepare'&&step==='speech'?Math.round(share*99):Math.round(s.from+(s.to-s.from)*share);
 if(step==='complete')percent=100;
 let detail='';
 if(measured&&(step==='rendering'||step==='encoding'))detail='frame '+hit.done+' of '+hit.total+(hit.eta!=null&&step==='rendering'?' · about '+formatSeconds(hit.eta)+' left':'');
 else if(step==='bundling'&&measured)detail=hit.done+'%';
 const failed=job.status==='failed';
 return {step:failed?'failed':step,percent,label:failed?'Stopped while '+s.label.toLowerCase()+(job.error?': '+String(job.error).slice(0,200):''):s.label,detail,measured,active:job.status==='running'};
}
export function formatSeconds(n){n=Math.max(0,Math.round(n));const m=Math.floor(n/60),s=n%60;return m?m+' min'+(s?' '+s+' s':''):s+' s';}
