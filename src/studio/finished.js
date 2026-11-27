// Owner: "add the finished film with download button". The plain-words line under a finished Studio film, from the
// job's quality report and ffprobe output (both optional: a job without the quality audit still gets length and size).
// Browser-safe; pure.
// DUAL-07 audit repair: which renderer actually made the film, from the job's render-timing.json (backend and GL route
// passed to the native renderer) and, when the render log has it, the adapter the renderer reported. Never a guess.
export function rendererLine(timing,adapter=null){
 if(!timing||!['cpu','three'].includes(timing.backend))return 'renderer unknown';
 if(timing.backend==='cpu')return 'rendered with CPU Canvas';
 return 'rendered with Three.js (WebGL, GL route '+(typeof timing.gl==='string'&&timing.gl?timing.gl:'unknown')+', adapter '+(adapter&&typeof adapter.renderer==='string'&&adapter.renderer?adapter.renderer:'unknown')+')';
}
// The adapter line the native renderer prints (src/index.jsx), from a render log; null when absent or malformed.
export function adapterFromLog(log){const m=/AETHER_GL_ADAPTER (\{[^\n]*\})/.exec(typeof log==='string'?log:'');if(!m)return null;try{const a=JSON.parse(m[1]);return typeof a?.renderer==='string'?a:null;}catch{return null;}}
export function finishedSummary(quality,probe){
 const video=probe?.streams?.find(s=>s.codec_type==='video');
 const seconds=Number.isFinite(quality?.video?.frames)?quality.video.frames/30:Number(probe?.format?.duration);
 const parts=[];
 if(Number.isFinite(seconds)&&seconds>0)parts.push(seconds.toFixed(1)+' s');
 if(video?.width&&video?.height)parts.push(video.width+'×'+video.height+(video.width<video.height?' (vertical)':''));
 let checks=null,ok=null;
 if(quality&&typeof quality.status==='string'){
  const e=Number(quality.errors)||0,w=Number(quality.warnings)||0,n=Array.isArray(quality.issues)?quality.issues.length:Number(quality.issues)||0;
  ok=quality.status!=='fail'&&e===0;
  checks=ok?(w?'checks passed with '+w+' warning'+(w===1?'':'s'):'checks passed')+(n?' ('+n+' review note'+(n===1?'':'s')+')':''):'checks failed: '+e+' error'+(e===1?'':'s')+', '+w+' warning'+(w===1?'':'s');
  parts.push(checks);
 }else parts.push('no quality audit');
 return {seconds:Number.isFinite(seconds)?seconds:null,ok,text:parts.join(' · ')};
}
// Owner choice 3 (Reels cover button): the plain-words line under the cover, from scripts/reels-export.mjs
// reelsReport. Unknown warning codes are shown by code (never hidden). Browser-safe; pure.
const REELS_WORDS=Object.freeze({
 REELS_LONG:w=>'longer than '+(w.recommended??90)+' s: allowed, but longer Reels may reach fewer viewers',
 NOT_REELS_LAYOUT:()=>'made without the Reels layout: captions and characters may sit under Instagram\'s buttons (tick "Instagram Reels layout" for the next film)',
});
const COVER_WORDS=Object.freeze({'first single':'the first close-up','first line':'the first spoken line',middle:'the middle of the film',explicit:'the chosen frame'});
export function reelsSummary(report){
 if(!report||typeof report!=='object'||!['pass','fail'].includes(report.status))return {ok:false,text:'No Reels check yet.',notes:[]};
 const ok=report.status==='pass',errors=Array.isArray(report.errors)?report.errors:[],warnings=Array.isArray(report.warnings)?report.warnings:[];
 const c=report.cover,cover=c&&Number.isSafeInteger(c.frame)?'cover from '+(COVER_WORDS[c.source]??'frame')+' (frame '+c.frame+')':null;
 const head=ok?'Ready for Reels':'Not ready for Reels: '+errors.map(e=>e.code+(e.detail?' ('+e.detail+')':'')).join(', ');
 const notes=warnings.map(w=>REELS_WORDS[w.code]?.(w)??String(w.code));
 return {ok,text:[head,Number.isFinite(report.seconds)?report.seconds.toFixed(1)+' s':null,cover].filter(Boolean).join(' · '),notes};
}
