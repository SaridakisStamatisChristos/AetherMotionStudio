// GPU-05 hero-char-v1 (Cinematic only; owner choice 2026-11-28: "B Soft rounded", first heroes student, scientist and
// robot; then "refine everything … neat styles"). Selected by film.cinematic.characters 'soft-v1'.
// - Drawing: every character part (human and robot families) is a real-size rounded box. The rounding stays inside
//   the part's box, so bounds, framing, visibility, contact and attachment checks (all computed from the box
//   geometry) remain valid without change. GPU Standard and CPU Classic never reach this code.
// - Hero detail: in a soft-v1 film every human drawn at detail 2 (the Director default) or without a detail, and every
//   catalog robot without a detail, is drawn at hero detail 4 (src/visual/catalog-hero.js: face with eyes, brows,
//   cheeks; neck, tapered limbs, mitten hands, shoes; hair and clothing styles per character). Explicit detail 1 and
//   3 are kept.
import {recipeSpec} from '../visual/catalog-rig.js';
export const CHARACTER_STYLES=Object.freeze(['soft-v1']);
export const HERO_FAMILIES=Object.freeze(['human','robot']);
export const HERO_DETAIL=4;
// The first refined heroes; every other character gets the same style through the same rules.
export const HERO_CHARACTERS=Object.freeze(['student','scientist','service-robot']);
export const SOFT={segments:5,share:.48,maxRadius:.16};
// Corner radius of one part (metres): almost half the thinnest side (limbs become capsules), capped so large parts
// keep their shape. Never more than half the thinnest side, so the rounded part stays inside its box.
export function softRadius(size){const m=Math.min(...size.map(v=>Math.max(Math.abs(v),1e-4)));return Math.min(m*SOFT.share,SOFT.maxRadius);}
export const heroPart=surface=>!!surface&&HERO_FAMILIES.includes(surface.family);
const raise=a=>{const f=recipeSpec(a.asset)?.family,v=a.params?.detail;return (f==='human'&&(v===undefined||v===2))||(f==='robot'&&v===undefined);};
// GPU-06 (owner 2026-11-28: puppet skeleton, calm motion): soft-v1 shots with body language also breathe, look at the
// character they face and show light expressions (src/core/body.js); elbows and knees bend in hero detail 4.
export const HERO_MOTION=Object.freeze({breathing:true,gaze:true,expressions:true});
export function heroDetail(project){
 if(project?.cinematic?.characters!=='soft-v1')return project;
 return {...project,shots:project.shots.map(s=>s.template==='cinematic-graph'&&Array.isArray(s.assets)?{...s,assets:s.assets.map(a=>raise(a)?{...a,params:{...(a.params??{}),detail:HERO_DETAIL}}:a),...(s.bodyLanguage?{bodyLanguage:{...s.bodyLanguage,...HERO_MOTION}}:{})}:s)};
}
