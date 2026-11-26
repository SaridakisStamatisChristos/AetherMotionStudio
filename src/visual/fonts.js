// DUAL-02: the bundled font faces a scene needs (compose-v2 compositions only). Pure; the Remotion entry loads them
// with FontFace from public/fonts before the first frame is drawn and fails the render if any face fails to load
// (no silent substitution). Every face in a used font's fallback chain is loaded, in both weights.
import {FONT_METRICS} from '../core/font-metrics.js';
import {fontChain,COMPOSE_V2} from '../core/composition.js';
export function sceneFontFaces(scene){
 const used=new Set();
 for(const s of scene?.version===2?scene.shots:[]){const c=s.composition;if(c?.version!==COMPOSE_V2)continue;
  for(const x of c.items){const f=x.font??c.font??'arial';if(f!=='arial')for(const g of fontChain(f))used.add(g);}}
 return [...used].sort().flatMap(f=>Object.entries(FONT_METRICS.fonts[f].faces).map(([weight,face])=>({font:f,css:FONT_METRICS.fonts[f].css,weight:Number(weight),path:face.path,sha256:face.sha256})));
}
