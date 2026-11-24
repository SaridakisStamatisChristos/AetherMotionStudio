import {validateProject,validateTimeline} from '../core/timeline.js';
export function defaultSpeech(seconds){
 if(!Number.isSafeInteger(seconds)||seconds<6||seconds>300)throw Error('Production duration must be an integer from 6 to 300 seconds');
 return {version:1,targetFrames:seconds*30,fixedShots:{},speakers:{},shotSpeakers:{},pronunciations:{},captions:{mode:'both',highlight:true,maxChars:32,maxLines:2,maxCps:18},mix:{narration:1,music:.55,ambience:.35,sfx:.45,duck:.35,fadeSeconds:.25,peak:.92},cues:[],syncActions:true};
}
export function productionId(id,backend,profile){
 if(typeof id!=='string'||!/^[a-z0-9][a-z0-9-]{0,31}$/.test(id)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9]|constructor|prototype)$/.test(id))throw Error('Production ID must be a safe lowercase slug (max 32 characters)');
 if(!['cpu','three'].includes(backend)||!['original','polished'].includes(profile))throw Error('Invalid production backend/profile');
 return id+'-'+backend+'-'+profile;
}
export function matchedProject(p,timeline,id,backend){
 if(p.version!==2||!p.speech||!['cpu','three'].includes(backend)||p.shots.some(s=>s.template!=='cinematic-graph'))throw Error('Matched production requires a speech-first graph project');
 const result=structuredClone(p);result.id=id;for(const s of result.shots)s.backend=backend;
 validateProject(result);validateTimeline(result,timeline);return result;
}
export function normalizedProject(p){
 const result=structuredClone(p);delete result.id;for(const s of result.shots)delete s.backend;return result;
}
