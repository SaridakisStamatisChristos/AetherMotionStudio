import {validateProject} from '/src/core/timeline.js';
import {drawFilm} from '/src/core/draw-film.js';
import {defaultSpeech} from '/src/studio/production.js';
import {calmTurns} from '/src/core/calm.js';
import {editProject,applyShotEdit,reorderShot,setBackend,setProfile,setStaging,addAsset,removeAsset,previewState,addFoundryAsset,setSpeakers,setLineSpeaker,bindSpeaker} from '/src/studio/model.js';
// STUDIO-01: the Director form maps to a request in src/studio/director-form.js (casts, Reels, script help; tested).
import {STUDIO_CASTS,STUDIO_DEFAULTS,directorRequest,scriptHelp,scriptPrompt,cleanScript} from '/src/studio/director-form.js';
const languageOf=voice=>voice.startsWith('b')?'en-gb':'en-us';
const $=id=>document.getElementById(id),state={project:null,revision:null,savedId:null,dirty:true,shot:0,frame:0,playing:false,preview:null,prepared:null,three:null,job:null,catalog:null,lastFrame:0,timer:null,drawEpoch:0};
function status(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
async function api(path,method='GET',data){const response=await fetch(path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json','X-Aether-Studio':'1'},...(data===undefined?{}:{body:JSON.stringify(data)})});const x=await response.json();if(!response.ok)throw Error(x.error??response.statusText);return x;}
function action(fn){return async e=>{e?.preventDefault();try{await fn(e);}catch(e){status(e.message,true);}};}
function opt(value,label=value){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
function fill(select,items){select.replaceChildren(...items.map(x=>Array.isArray(x)?opt(...x):opt(x)));}
function button(label,fn,cls=''){const b=document.createElement('button');b.textContent=label;b.className=cls;b.onclick=action(fn);return b;}
function requireProject(){if(!state.project)throw Error('Create or load a project first');return state.project;}
function stop(){state.playing=false;$('play').textContent='Play';$('audio').pause();}
function invalidate(){stop();state.prepared=null;$('previewMode').value='draft';$('audio').removeAttribute('src');$('audio').load();state.preview=null;state.frame=0;state.three?.dispose();state.three=null;}
function install(p,revision=null,savedId=null){validateProject(p);invalidate();state.project=p;state.revision=revision;state.savedId=savedId;state.dirty=revision===null;state.shot=0;refresh();}
function commit(p){validateProject(p);invalidate();state.project=p;state.dirty=true;state.shot=Math.min(state.shot,Math.max(0,(p.shots?.length??1)-1));refresh();}
function duration(){return state.preview?.timeline?.durationFrames??360;}
function time(f){const s=Math.floor(f/30);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function selected(){return state.project?.shots?.[state.shot];}
function refresh(){
 const p=state.project;if(!p)return;
 state.preview=previewState(p,$('previewMode').value==='prepared'?state.prepared:null);
 $('empty').hidden=true;$('title').textContent=p.title;$('projectId').value=p.id;$('projectTitle').value=p.title;$('voice').value=p.voice;
 const graph=p.shots?.find(s=>s.template==='cinematic-graph');$('backend').value=graph?.backend??'cpu';$('profile').value=graph?.fidelity?'polished':'original';
 $('backend').disabled=$('profile').disabled=$('stageProject').disabled=$('stageTalk').disabled=$('calmTurns').disabled=!graph;$('revision').textContent=state.revision?(state.dirty?'Unsaved edits · base '+state.revision.slice(0,10):'Saved '+state.revision.slice(0,10)):'Unsaved project';
 $('json').value=JSON.stringify(p,null,2);$('previewLabel').textContent=state.preview.mode+' · reduced-resolution shared renderer; final export is native Remotion';
 $('duration').textContent=time(duration())+' · '+(p.shots?.length??1)+' shots';
 $('scrub').max=duration()-1;state.frame=Math.min(state.frame,duration()-1);
 renderTimeline();renderInspector();void paint();
}
function renderTimeline(){
 const el=$('shots');el.replaceChildren();const p=state.project;if(!p)return;
 if(p.version===1){const b=button(p.title,()=>seek(0),'shot selected');el.append(b);return;}
 const timeline=state.preview.timeline;
 p.shots.forEach((s,i)=>{const b=button('',()=>{state.shot=i;renderTimeline();renderInspector();seek(timeline.shots[i].startFrame);},'shot'+(state.shot===i?' selected':''));b.style.flexGrow=String((timeline.shots[i].endFrame-timeline.shots[i].startFrame)/30);const title=document.createElement('strong');title.textContent=s.heading??s.id;const small=document.createElement('small');small.textContent=((timeline.shots[i].endFrame-timeline.shots[i].startFrame)/30).toFixed(1)+'s · '+(s.durationFrames===null?'auto':'fixed');b.append(title,small);el.append(b);});
 $('up').disabled=state.shot===0||$('previewMode').value==='prepared';$('down').disabled=state.shot>=p.shots.length-1||$('previewMode').value==='prepared';
}
function renderInspector(){
 const s=selected(),graph=s?.template==='cinematic-graph';$('heading').value=s?.heading??'';$('subheading').value=s?.subheading??'';$('narration').value=s?.narration?.join('\n')??'';$('frames').value=s?.durationFrames??'';$('environment').value=s?.environment??'laboratory';$('camera').value=s?.cameraRig?.preset??'establishing';
 $('applyShot').disabled=!graph;$('shotAssets').replaceChildren();
 if(graph)for(const a of s.assets){const row=document.createElement('div');row.className='asset-row';const name=document.createElement('span');name.textContent=a.asset+(a.identity?' · '+a.identity:'');const input=document.createElement('input');input.type='number';input.min='-2.4';input.max='2.4';input.step='.1';input.value=a.tracks.x?.[0]?.[1]??0;input.title='X position (replaces X track)';input.onchange=action(()=>{const assets=structuredClone(selected().assets);assets.find(x=>x.id===a.id).tracks.x=[[0,Number(input.value)]];commit(applyShotEdit(requireProject(),state.shot,{assets}));});row.append(name,input,button('×',()=>commit(removeAsset(requireProject(),state.shot,a.id))));$('shotAssets').append(row);}
 renderSpeakers();
}
// TALK-04 speaker editor: speaker rows (name, voice) are applied together; line speakers and character bindings of the
// selected shot apply immediately. Every edit goes through the validated model functions (rejections leave it as is).
function select(items,value,onchange){const el=document.createElement('select');fill(el,items);el.value=value;el.onchange=action(()=>onchange(el.value));return el;}
function speakerRow(id,s){const row=document.createElement('div');row.className='asset-row';row.dataset.speaker=id;const label=document.createElement('span');label.textContent=id;const name=document.createElement('input');name.value=s.name;name.maxLength=24;name.dataset.field='name';const voice=select(state.catalog?.voices??[s.voice],s.voice,()=>{});voice.dataset.field='voice';row.append(label,name,voice,button('×',()=>row.remove()));return row;}
function renderSpeakers(){
 const p=state.project,s=selected(),speech=p?.version===2?p.speech:null;$('addSpeaker').disabled=$('applySpeakers').disabled=!speech;
 $('speakers').replaceChildren(...(speech?Object.entries(speech.speakers).map(([id,x])=>speakerRow(id,x)):[Object.assign(document.createElement('small'),{textContent:'Speakers need a speech project (Generate & render, or a speech example).'})]));
 $('lineSpeakers').replaceChildren();if(!speech||!s)return;
 const ids=Object.keys(speech.speakers);if(!ids.length)return;
 s.narration.forEach((t,i)=>{const row=document.createElement('label');row.textContent='Line '+(i+1)+': '+t.slice(0,40);row.append(select([['','Narrator (default)'],...ids.map(id=>[id,speech.speakers[id].name])],speech.shotSpeakers[s.id]?.[i]??'',v=>{if(!v)throw Error('Choose a speaker');commit(setLineSpeaker(requireProject(),state.shot,i,v));status('Line speaker set.');}));$('lineSpeakers').append(row);});
 if(s.template==='cinematic-graph')for(const id of ids){const row=document.createElement('label');row.textContent=speech.speakers[id].name+' appears as';row.append(select([['','(not shown)'],...s.assets.map(a=>[a.id,a.id+' · '+a.asset])],s.speakerAssets?.[id]??'',v=>{commit(bindSpeaker(requireProject(),state.shot,id,v||null));status('Speaker binding updated.');}));$('lineSpeakers').append(row);}
}
async function paint(){
 const p=state.preview;if(!p)return;const epoch=++state.drawEpoch,frame=state.frame;
 const active=p.scene.version===2?p.scene.shots[p.timeline.shots.findIndex(s=>frame<s.endFrame)]:null;
 try{
  if(active?.backend==='three'&&!state.three){
   const {createThreeBackend}=await import('/src/visual/three-backend.js');if(epoch!==state.drawEpoch)return;state.three=createThreeBackend();
  }
  if(epoch!==state.drawEpoch)return;
  const ctx=$('canvas').getContext('2d');ctx.clearRect(0,0,360,640);drawFilm(ctx,p.scene,p.timeline,frame,360,640,state.three);
  $('scrub').value=frame;$('clock').textContent=time(frame)+' / '+time(duration());
 }catch(e){stop();$('previewLabel').textContent='Preview failed (no automatic backend substitution): '+e.message;status('Preview: '+e.message,true);}
}
function seek(f){state.frame=Math.max(0,Math.min(duration()-1,Math.round(f)));if($('audio').src&&$('previewMode').value==='prepared')$('audio').currentTime=state.frame/30;void paint();}
function tick(now){if(!state.playing)return;const audio=$('audio'),f=$('previewMode').value==='prepared'&&audio.src&&!audio.paused?Math.floor(audio.currentTime*30):Math.floor((now-state.playStart)/1000*30)+state.playFrame;state.frame=Math.min(duration()-1,f);void paint();if(f>=duration()-1){stop();return;}requestAnimationFrame(tick);}
async function play(){requireProject();if(state.playing){stop();return;}if(state.frame>=duration()-1)seek(0);state.playStart=performance.now();state.playFrame=state.frame;state.playing=true;$('play').textContent='Pause';if($('previewMode').value==='prepared'&&$('audio').src){try{$('audio').currentTime=state.frame/30;await $('audio').play();}catch(e){stop();throw Error('Prepared audio playback failed: '+e.message);}}requestAnimationFrame(tick);}
function renderAssets(){const query=$('search').value.toLowerCase(),category=$('category').value,objects=state.catalog?.catalog.objects??[];$('assets').replaceChildren();for(const a of objects.filter(a=>(!category||a.category===category)&&a.id.includes(query)).slice(0,250)){const b=button(a.id.replaceAll('-',' '),()=>commit(addAsset(requireProject(),state.shot,a.id)));const s=document.createElement('span');s.textContent='+';b.append(s);$('assets').append(b);}}
async function projects(){const x=await api('/api/projects');fill($('projects'),[['','Select a saved project'],...x.projects.map(p=>[p.id,p.title??p.id+' (invalid)'])]);if(state.savedId)$('projects').value=state.savedId;}
async function save(){const p=requireProject();const rev=p.id===state.savedId?state.revision:null;const x=await api('/api/projects/'+p.id,'PUT',{project:p,revision:rev});if(state.project!==p)throw Error('Project changed while saving; reload the saved revision before continuing.');state.revision=x.revision;state.savedId=p.id;state.dirty=false;$('revision').textContent='Saved '+x.revision.slice(0,10);await projects();status('Saved locally: '+p.id);}
function downloadJSON(){const p=requireProject(),url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=p.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function start(mode){await save();const j=await api('/api/jobs','POST',{id:state.project.id,revision:state.revision,mode,quality:$('quality').checked,repair:$('repair').checked});state.job=j.id;await poll();status('Started local '+mode+' job '+j.id);}
async function showJob(id){state.job=id;const j=await api('/api/jobs/'+id);$('jobState').textContent=j.status+' / '+j.phase;$('logs').textContent=j.log+(j.error?'\nERROR: '+j.error:'');$('logs').scrollTop=$('logs').scrollHeight;$('downloads').replaceChildren();const base='/api/jobs/'+id+'/files/';
 for(const file of j.files){const a=document.createElement('a');a.href=base+file+'?download=1';a.textContent=file;$('downloads').append(a);}
 const v=$('film');if(j.status==='succeeded'&&j.files.includes('film.mp4')){if(v.getAttribute('src')!==base+'film.mp4')v.src=base+'film.mp4';v.hidden=false;}else{v.hidden=true;v.removeAttribute('src');}
 if(j.status==='succeeded'&&!state.dirty&&j.projectId===state.project?.id&&j.revision===state.revision&&j.files.includes('props.json')&&!state.prepared){
  const props=await api(base+'props.json');validateProject(props.scene);if(state.dirty||state.job!==id||j.projectId!==state.project?.id||j.revision!==state.revision)return;state.prepared=props;
  if(j.files.includes('preview-audio.wav'))$('audio').src=base+'preview-audio.wav';
 }
 if(j.status!=='running'&&j.files.includes('quality-report.json')){const q=await api(base+'quality-report.json');$('report').textContent=JSON.stringify({status:q.status,errors:q.errors,warnings:q.warnings,issues:q.issues,repair:q.repair,cost:q.cost,humanReview:q.humanReview},null,2);}
}
let polling=false;
async function poll(){if(polling)return;polling=true;try{const x=await api('/api/jobs');fill($('jobs'),[['','Session jobs'],...x.jobs.map(j=>[j.id,j.projectId+' · '+j.mode+' · '+j.status])]);if(state.job){$('jobs').value=state.job;await showJob(state.job);}for(const id of ['prepare','render'])$(id).disabled=!!x.active;}finally{polling=false;}}
$('save').onclick=action(save);$('export').onclick=action(downloadJSON);$('play').onclick=action(play);$('scrub').oninput=()=>seek(Number($('scrub').value));$('search').oninput=renderAssets;$('category').onchange=renderAssets;
$('projects').onchange=action(async()=>{if(!$('projects').value)return;const x=await api('/api/projects/'+$('projects').value);install(x.project,x.revision,x.project.id);status('Loaded '+x.project.id);});
$('examples').onchange=action(async()=>{if(!$('examples').value)return;const x=await api('/api/examples/'+$('examples').value);install(x.project);status('Example imported; choose a project ID and save.');});
$('import').onchange=action(async()=>{const f=$('import').files[0];if(!f)return;if(f.size>1024*1024)throw Error('Project JSON too large');install(JSON.parse(await f.text()));status('Imported project; save to persist.');});
function directorForm(){return {id:'film-'+Date.now().toString(36),topic:$('topic').value,script:$('script').value,seconds:Number($('seconds').value),cast:$('directCast').value,backend:$('directBackend').value,profile:$('directProfile').value,voice:$('directVoice').value,staging:$('directStaging').checked,reels:$('directReels').checked,speakerNames:$('directNames').checked};}
function scriptInfo(){const cast=$('directCast').value,h=scriptHelp($('script').value,$('seconds').value,cast);$('scriptCount').textContent=h.summary;$('scriptCount').className=h.verdict==='ok'||h.verdict==='empty'?'muted':'warn';$('scriptTurns').textContent=h.turns;const narrator=cast==='narrator';$('directVoice').disabled=$('directStaging').disabled=!narrator;for(const el of document.querySelectorAll('.narrator-only'))el.hidden=!narrator;
 try{$('scriptPrompt').value=scriptPrompt({topic:$('topic').value,seconds:Number($('seconds').value),cast});}catch(e){$('scriptPrompt').value='Set the seconds (6–300) to get the prompt. '+e.message;}}
fill($('directCast'),Object.entries(STUDIO_CASTS).map(([id,c])=>[id,c.label]));$('directCast').value=STUDIO_DEFAULTS.cast;
// Studio UI refinement (owner: "Simple 'Make a film' view"): the page opens in the simple view (film form, preview,
// production result); Advanced shows the full editor (workspace, library, Foundry, timeline, inspector, speakers, JSON).
function setMode(advanced){document.body.classList.toggle('simple',!advanced);$('mode').setAttribute('aria-pressed',String(advanced));$('mode').textContent=advanced?'Simple view':'Advanced';}
$('mode').onclick=()=>setMode(document.body.classList.contains('simple'));setMode(false);
for(const id of ['script','seconds','topic'])$(id).oninput=scriptInfo;$('directCast').onchange=scriptInfo;scriptInfo();
$('copyPrompt').onclick=action(async()=>{const t=$('scriptPrompt');try{await navigator.clipboard.writeText(t.value);}catch{t.select();if(!document.execCommand('copy'))throw Error('Copy failed: select the prompt and press Ctrl+C');}status('Prompt copied. Paste it into Claude chat.');});
$('cleanScript').onclick=action(()=>{const r=cleanScript($('script').value);if(!r.lines)throw Error('Paste the script from Claude chat first');$('script').value=r.script;if(r.topic&&!$('topic').value.trim())$('topic').value=r.topic.slice(0,180);scriptInfo();status('Script cleaned: '+r.lines+' lines'+(r.topic?'; topic: '+r.topic:'')+'.');});
// Owner's first Studio film: a pasted "Topic: …" line was spoken and shifted every turn. The script is always cleaned
// before planning (cleanScript: speaker names, numbering, headings, Topic line), so nothing extra is ever spoken.
function autoClean(){const raw=$('script').value;if(!raw.trim())return;const c=cleanScript(raw);$('script').value=c.script;if(c.topic&&!$('topic').value.trim())$('topic').value=c.topic.slice(0,180);scriptInfo();}
$('director').onsubmit=action(async e=>{autoClean();const produce=e.submitter?.dataset.produce==='true';const q=directorRequest(directorForm());if(produce)q.speech??=defaultSpeech(q.seconds);status('Planning offline…');const x=await api('/api/direct','POST',q);install(x.project);if(produce)await start('render');else status('Director generated '+x.project.shots.length+' shots. Review and save.');});
// GEN-01: general dialogue staging and the opt-in calm-turns pass (both pure and validated; results are reported).
$('stageTalk').onclick=action(()=>{const p=requireProject();if(p.version!==2||!p.speech)throw Error('Dialogue staging needs a v2 speech project');const s=setStaging(p,'talk-v1');commit(s);status('Dialogue staged: '+s.shots.filter(x=>x.speakerAssets).length+' shots with bound speakers (review, then save).');});
$('calmTurns').onclick=action(()=>{const r=calmTurns(requireProject());commit(r.project);$('report').textContent=JSON.stringify({changes:r.changes.map(({shot,asset,degPerSecBefore,degPerSecAfter})=>({shot,asset,degPerSecBefore,degPerSecAfter})),unresolved:r.unresolved},null,2);status('Calm turns: '+r.changes.length+' changed, '+r.unresolved.length+' left as is (see report).');});
$('stageProject').onclick=action(()=>{const p=requireProject();if(p.version!==2)throw Error('Staging requires a v2 project');commit(setStaging(p,'art-v1'));status('Staged for camera: lighting parity, faces and facing applied (review, then save).');});
$('applyProject').onclick=action(()=>{let p=editProject(requireProject(),p=>{p.id=$('projectId').value;p.title=$('projectTitle').value;p.voice=$('voice').value;});const graphs=p.shots?.filter(s=>s.template==='cinematic-graph')??[];if(graphs.length){if(graphs[0].backend!==$('backend').value)p=setBackend(p,$('backend').value);if(!!graphs[0].fidelity!==($('profile').value==='polished'))p=setProfile(p,$('profile').value);}commit(p);status('Project settings applied.');});
$('applyShot').onclick=action(()=>{const s=selected();if(!s)throw Error('Select a shot');const changes={heading:$('heading').value,subheading:$('subheading').value,narration:$('narration').value.split('\n').map(x=>x.trim()).filter(Boolean),durationFrames:$('frames').value===''?null:Number($('frames').value),environment:$('environment').value};if(s.cameraRig?.preset!==$('camera').value)changes.cameraRig={...(s.cameraRig??{}),preset:$('camera').value};commit(applyShotEdit(requireProject(),state.shot,changes));status('Shot edits applied.');});
$('addSpeaker').onclick=action(()=>{const taken=new Set([...$('speakers').querySelectorAll('[data-speaker]')].map(r=>r.dataset.speaker));let n=1;while(taken.has('speaker-'+n))n++;$('speakers').append(speakerRow('speaker-'+n,{name:'Speaker '+n,voice:'af_heart'}));});
$('applySpeakers').onclick=action(()=>{const speakers={};for(const r of $('speakers').querySelectorAll('[data-speaker]')){const voice=r.querySelector('[data-field=voice]').value;speakers[r.dataset.speaker]={name:r.querySelector('[data-field=name]').value,voice,language:languageOf(voice)};}commit(setSpeakers(requireProject(),speakers));status('Speakers applied.');});
$('applyJson').onclick=action(()=>{const p=JSON.parse($('json').value);commit(p);status('JSON validated and applied.');});
$('up').onclick=action(()=>{const i=state.shot;commit(reorderShot(requireProject(),i,i-1));state.shot=i-1;refresh();});$('down').onclick=action(()=>{const i=state.shot;commit(reorderShot(requireProject(),i,i+1));state.shot=i+1;refresh();});
$('previewMode').onchange=action(()=>{stop();if($('previewMode').value==='prepared'&&!state.prepared){$('previewMode').value='draft';throw Error('Prepare or render the current saved project first');}state.preview=previewState(requireProject(),$('previewMode').value==='prepared'?state.prepared:null);state.frame=0;refresh();});
$('inspect').onclick=action(async()=>{const q=await api('/api/inspect','POST',{project:requireProject()});$('report').textContent=JSON.stringify({scope:q.scope,issues:q.issues,checks:q.checks?{motion:q.checks.motion.warnings,visibility:q.checks.visibility.warnings,crowding:q.checks.crowding?.warnings,reels:q.checks.reels?.warnings,timeline:q.checks.motion.timeline}:undefined,shots:q.shots.map(s=>({shot:s.shot,metrics:s.metrics})),contentVerification:q.contentVerification},null,2);status('Draft geometry inspection complete.');});
$('prepare').onclick=action(()=>start('prepare'));$('render').onclick=action(()=>start('render'));$('jobs').onchange=action(async()=>{if($('jobs').value)await showJob($('jobs').value);});
async function init(){state.catalog=await api('/api/catalog');fill($('voice'),state.catalog.voices);fill($('directVoice'),state.catalog.voices);fill($('camera'),state.catalog.cameras);const cats=[...new Set(state.catalog.catalog.objects.map(o=>o.category))];fill($('category'),[['','All categories'],...cats]);$('assetCount').textContent='· '+state.catalog.catalog.objects.length;renderAssets();const ex=await api('/api/examples');fill($('examples'),[['','Import an example'],...ex.examples]);await projects();await poll();setInterval(()=>poll().catch(e=>status(e.message,true)),1800);status('Local engine ready.');}

let foundryRows=[],foundrySelected=null;
async function foundryPacks(){const p=await api('/api/foundry/packs');fill($('foundryPack'),[['','All packs'],...[...new Set([...p.builtins,...p.installed.map(x=>x.id)])].map(x=>[x,x])]);}
$('findFoundry').onclick=action(async()=>{const q=new URLSearchParams({q:$('foundrySearch').value,limit:'300',...( $('foundryPack').value?{pack:$('foundryPack').value}:{})});const x=await api('/api/foundry/search?'+q);foundryRows=x.assets.filter(a=>a.kind!=='legacy');fill($('foundryResults'),foundryRows.map((a,i)=>[String(i),a.name+' · '+a.kind+' · '+(a.revision??'inspect revision').slice(0,16)]));foundrySelected=null;});
$('foundryResults').onchange=()=>{foundrySelected=null;};
$('foundryPreview').onclick=action(async()=>{const a=foundryRows[Number($('foundryResults').value)];if(!a)throw Error('Select a Foundry asset');const q=new URLSearchParams({kind:a.kind,id:a.id,lod:$('foundryLod').value,view:$('foundryView').value,lighting:$('foundryLight').value,...(a.revision?{revision:a.revision}:{})});const x=await api('/api/foundry/asset?'+q);foundrySelected=x.entry;$('foundryImage').src=x.preview;$('foundryImage').hidden=false;$('foundryInfo').textContent=JSON.stringify({revision:x.entry.revision,digest:x.entry.digest,license:x.entry.license,dimensions:x.info.dimensions,materials:x.info.materials,anchors:x.info.anchors,metrics:x.info.metrics,warnings:x.info.warnings,nativeThree:'unverified'},null,2);});
$('foundryAdd').onclick=action(()=>{if(!foundrySelected)throw Error('Inspect the exact revision first');commit(addFoundryAsset(requireProject(),state.shot,foundrySelected,Number($('foundryLod').value)));status('Pinned Foundry asset inserted.');});
$('foundryExport').onclick=action(async()=>{const id=$('foundryPack').value;if(!id)throw Error('Select a pack');const x=await api('/api/foundry/pack?'+new URLSearchParams({id}));const url=URL.createObjectURL(new Blob([JSON.stringify(x.pack,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=id+'.pack.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('foundryImport').onchange=action(async()=>{const f=$('foundryImport').files[0];if(!f)return;if(f.size>512*1024)throw Error('Pack too large');await api('/api/foundry/pack','POST',{pack:JSON.parse(await f.text())});await foundryPacks();status('Pack verified and installed locally.');});
init().then(foundryPacks).catch(e=>status(e.message,true));
