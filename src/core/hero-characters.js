// GPU-05 hero-char-v1 (Cinematic only; owner choice 2026-11-28: "B Soft rounded", first heroes student, scientist and
// robot). Selected by film.cinematic.characters 'soft-v1'.
// - Drawing: every character part (human and robot families) is a real-size rounded box. The rounding stays inside
//   the part's box, so bounds, framing, visibility, contact and attachment checks (all computed from the box
//   geometry) remain valid without change. GPU Standard and CPU Classic never reach this code.
// - Detail: in a soft-v1 film every human drawn at detail 2 (the Director default) or without a detail is raised to
//   detail 3 (fingers, hair, brows, clothing; POLISH-02). Explicit detail 1 and detail 3 are kept.
import {recipeSpec} from '../visual/catalog-rig.js';
export const CHARACTER_STYLES=Object.freeze(['soft-v1']);
export const HERO_FAMILIES=Object.freeze(['human','robot']);
// The first refined heroes; every other character gets the same style through the same rules.
export const HERO_CHARACTERS=Object.freeze(['student','scientist','service-robot']);
export const SOFT={segments:5,share:.48,maxRadius:.16};
// Corner radius of one part (metres): almost half the thinnest side (limbs become capsules), capped so large parts
// keep their shape. Never more than half the thinnest side, so the rounded part stays inside its box.
export function softRadius(size){const m=Math.min(...size.map(v=>Math.max(Math.abs(v),1e-4)));return Math.min(m*SOFT.share,SOFT.maxRadius);}
export const heroPart=surface=>!!surface&&HERO_FAMILIES.includes(surface.family);
const human=a=>recipeSpec(a.asset)?.family==='human';
export function heroDetail(project){
 if(project?.cinematic?.characters!=='soft-v1')return project;
 return {...project,shots:project.shots.map(s=>s.template==='cinematic-graph'&&Array.isArray(s.assets)?{...s,assets:s.assets.map(a=>human(a)&&(a.params?.detail===undefined||a.params.detail===2)?{...a,params:{...(a.params??{}),detail:3}}:a)}:s)};
}
