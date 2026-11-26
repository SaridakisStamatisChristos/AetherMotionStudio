// Owner: "add the finished film with download button". The plain-words line under a finished Studio film, from the
// job's quality report and ffprobe output (both optional: a job without the quality audit still gets length and size).
// Browser-safe; pure.
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
