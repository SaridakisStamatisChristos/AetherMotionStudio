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
// LOCAL-02: matched production accepts speech-first projects (Director or authored) and authored
// fixed-budget graph projects. Never retimes: the budget is the speech target or the authored sum.
export function matchedTargetFrames(p){
 if(p?.version!==2||!Array.isArray(p.shots)||p.shots.some(s=>s.template!=='cinematic-graph'))throw Error('Matched production requires a v2 cinematic-graph project');
 if(p.speech)return p.speech.targetFrames;
 const d=p.shots.map(s=>s.durationFrames);
 if(!d.every(Number.isSafeInteger))throw Error('Matched production requires a speech budget or fixed durationFrames on every shot');
 return d.reduce((a,b)=>a+b,0);
}
export function matchedProject(p,timeline,id,backend){
 matchedTargetFrames(p);
 if(!['cpu','three'].includes(backend))throw Error('Invalid matched backend');
 if(!timeline)throw Error('Matched production requires the measured shared timeline');
 const result=structuredClone(p);result.id=id;for(const s of result.shots)s.backend=backend;
 validateProject(result);validateTimeline(result,timeline);return result;
}
// Fidelity profile of an authored project: polished iff every shot carries a fidelity block.
export function projectProfile(p){
 const f=p.shots.map(s=>s.fidelity!==undefined);
 if(f.every(Boolean))return 'polished';if(!f.some(Boolean))return 'original';
 throw Error('Mixed fidelity profiles; matched production requires one profile');
}
// Files prepared exactly once and copied byte-identically into every backend output.
export const SPEECH_SHARED=Object.freeze(['timeline.json','kokoro-narration.wav','mix.wav','voice-report.json','speech-report.json','captions.srt','captions.vtt']);
// Authored non-speech path: captions are the timeline's measured text segments; mix.wav archives the lossless soundtrack.
export const AUTHORED_SHARED=Object.freeze(['timeline.json','kokoro-narration.wav','mix.wav','voice-report.json']);
export const sharedArtifacts=p=>p.speech?SPEECH_SHARED:AUTHORED_SHARED;
// Throws on any missing, extra or changed shared artifact; hashOf(name) returns the actual sha256 or null if absent.
export function verifyShared(expected,hashOf,where='output'){
 const names=Object.keys(expected??{});if(!names.length)throw Error('Empty shared inventory');
 for(const name of names){const actual=hashOf(name);if(actual==null)throw Error('Shared artifact missing in '+where+': '+name);if(actual!==expected[name])throw Error('Shared artifact changed in '+where+': '+name)}
 return true;
}
export function normalizedProject(p){
 const result=structuredClone(p);delete result.id;for(const s of result.shots)delete s.backend;return result;
}
