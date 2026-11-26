// Owner choice 2026-11-26 ("implement 1-2-3 and 5", 2 = the Studio remembers the last settings). The "Make a film"
// choices (cast, seconds, backend, profile, narrator voice, staging, Reels, speaker names, titles on top) and the Simple/Advanced view
// are kept in this browser's localStorage, never on the server. Topic and script are not kept (every film is new).
// Every value is checked when read back; anything unknown, damaged or from another version falls back to
// STUDIO_DEFAULTS field by field, so a stored value can never produce a request the form could not. Pure, browser-safe.
import {STUDIO_CASTS,STUDIO_DEFAULTS} from './director-form.js';
export const SETTINGS_KEY='aethermotion.studio.settings.v1';
export const SETTINGS_DEFAULTS=Object.freeze({...STUDIO_DEFAULTS,voice:null,staging:true,advanced:false});
const isBool=x=>typeof x==='boolean';
// voices: the catalog's voice IDs (a stored voice the catalog no longer has is dropped)
export function checkedSettings(x,voices=[]){
 const s={...SETTINGS_DEFAULTS},o=x&&typeof x==='object'&&!Array.isArray(x)?x:{};
 if(typeof o.cast==='string'&&Object.hasOwn(STUDIO_CASTS,o.cast))s.cast=o.cast;
 if(['cpu','three'].includes(o.backend))s.backend=o.backend;
 if(['polished','original'].includes(o.profile))s.profile=o.profile;
 if(Number.isSafeInteger(o.seconds)&&o.seconds>=6&&o.seconds<=300)s.seconds=o.seconds;
 if(typeof o.voice==='string'&&voices.includes(o.voice))s.voice=o.voice;
 for(const k of ['reels','speakerNames','titles','staging','advanced'])if(isBool(o[k]))s[k]=o[k];
 return s;
}
// Read from storage text (JSON). Damaged text, a wrong shape or a newer/older version gives the defaults.
export function readSettings(text,voices=[]){
 if(typeof text!=='string'||text.length>4096)return checkedSettings(null,voices);
 let x;try{x=JSON.parse(text);}catch{return checkedSettings(null,voices);}
 if(!x||x.version!==1)return checkedSettings(null,voices);
 return checkedSettings(x.settings,voices);
}
// Storage text for the current choices (checked the same way, so only valid values are ever written).
export function writeSettings(form,voices=[]){
 const s=checkedSettings(form,voices);if(s.voice===null)delete s.voice;
 return JSON.stringify({version:1,settings:s});
}
