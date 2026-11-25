// GEN-12 topic-fitting sets (request.sets 'topic-v1'; on by default for dialogue films, 'none' turns it off).
// Owner order: "Gen10 and onwards"; roadmap: "Series will look repetitive". The offline Director alternated three
// lighting palettes shot by shot and never used the layered backdrops. topic-v1 gives a film ONE location that fits
// its topic, from what both renderers already draw:
// - the topic category is scored from the topic words (×4) and the narration (×1);
// - each category maps to a palette (ENVIRONMENTS) and a layered backdrop (LAYERED_ENVIRONMENTS) or none;
// - no category wins (no matching words) → the film keeps the Director's own environments (reported, never silent).
// - set pieces (dialogue IR, one per shot) are re-picked from that category when they do not fit it or repeat:
//   ranked by words shared with the shot's heading, narration and the topic; never the same piece twice while the
//   category has unused ones. Done on the IR, before staging, so placement and pointing work as before.
// Deterministic; no new assets.
import {OBJECT_CATALOG} from '../visual/catalog.js';

export const SETS=Object.freeze({version:'topic-v1',
 categories:Object.freeze({
  technology:{environment:'midnight',layers:'energy-hub'},
  science:{environment:'laboratory',layers:'energy-hub'},
  architecture:{environment:'amber',layers:'city-dusk'},
  business:{environment:'midnight',layers:'city-dusk'},
  nature:{environment:'amber',layers:'solar-field'},
  vehicles:{environment:'amber',layers:'city-dusk'},
  everyday:{environment:'amber',layers:null}
 }),
 // words per category beyond the catalog IDs (same spirit as src/director/catalog.js aliases)
 words:Object.freeze({
  technology:'computer computers digital electronic electronics information data network networks internet message messages communication software hardware device devices router routers packet packets signal signals protocol protocols code online wifi wireless server servers',
  science:'vaccine vaccines immune health medicine medical disease diseases body bodies doctor doctors physics chemistry biology mathematics space experiment experiments energy scientific molecule molecules atom atoms cell cells dna gene genes virus bacteria laboratory research star stars planet planets',
  architecture:'building buildings city cities history monument monuments ancient construction architect architecture bridge bridges tower towers house houses street streets',
  business:'company companies finance money economics economy trade logistics market markets supply demand price prices profit sales customer customers bank banks budget',
  nature:'environment plant plants tree trees forest forests water earth climate landscape river rivers ocean oceans animal animals weather rain soil garden gardens flower flowers',
  vehicles:'transport travel mobility road roads rail train trains car cars bus buses truck trucks traffic engine engines drive driving vehicle vehicles',
  everyday:'object objects tool tools home household kitchen furniture room rooms chair table everyday daily routine'
 }),
 topicWeight:4
});
const tokens=s=>String(s).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>1);
let index;
const wordIndex=()=>{if(index)return index;index=new Map();
 for(const [c,w] of Object.entries(SETS.words))for(const t of w.split(' '))index.set(t,c);
 for(const o of OBJECT_CATALOG)if(SETS.categories[o.category])for(const t of o.id.split('-'))if(t.length>2&&!index.has(t))index.set(t,o.category);
 return index;};
const categoryOf=asset=>OBJECT_CATALOG.find(o=>o.id===asset)?.category;
// Catalog objects that can stand as a dialogue set piece (no characters).
const pieceOk=o=>o.category!=='characters'&&!['human','robot','animal'].includes(o.family);

// Category scores for a request and its IR (shots with narration and assets).
export function topicScores(q,ir){
 const idx=wordIndex(),score=Object.fromEntries(Object.keys(SETS.categories).map(c=>[c,0]));
 for(const t of tokens(q.topic)){const c=idx.get(t);if(c)score[c]+=SETS.topicWeight;}
 for(const s of ir.shots){for(const line of s.narration)for(const t of tokens(line)){const c=idx.get(t);if(c)score[c]++;}
  }
 return score;
}
// The set for a film: {version, category|null, environment|null, layers|null, scores}. Ties go to the earlier category.
export function topicSet(q,ir){
 const scores=topicScores(q,ir);let best=null;
 for(const [c,v] of Object.entries(scores))if(v>0&&(best===null||v>scores[best]))best=c;
 const pick=best?SETS.categories[best]:null;
 return {version:SETS.version,category:best,environment:pick?.environment??null,layers:pick?.layers??null,scores};
}
// Apply a set to compiled shots (graph shots only). Returns {project, report}; the input is not modified.
export function applySet(project,set){
 if(!set.category)return {project,report:{...set,applied:false,reason:'no topic words matched'}};
 const shots=project.shots.map(s=>{if(s.template!=='cinematic-graph')return s;const {layers,...rest}=s;return {...rest,environment:set.environment,...(set.layers?{layers:set.layers}:{})};});
 return {project:{...project,shots},report:{...set,applied:true}};
}
// Re-pick the dialogue IR's set pieces from the film's category (see header). Returns {ir, changes}.
export function fitPieces(q,ir,set){
 if(!set.category)return {ir,changes:[]};
 const pool=OBJECT_CATALOG.filter(o=>o.category===set.category&&pieceOk(o)),topic=new Set(tokens(q.topic)),used=new Set(),changes=[];
 const shots=ir.shots.map((s,i)=>{
  const a=s.assets?.[0];if(!a)return s;
  const words=new Set([...tokens(s.heading),...s.narration.flatMap(tokens)]);
  const rank=id=>id.split('-').reduce((n,t)=>n+(words.has(t)?2:0)+(topic.has(t)?3:0),0);
  // keep a piece that fits the category, or that the topic or the line names, unless it already stood in an earlier shot
  if((categoryOf(a.asset)===set.category||rank(a.asset)>0)&&!used.has(a.asset)){used.add(a.asset);return s;}
  const free=pool.filter(o=>!used.has(o.id)),best=(free.length?free:pool).map((o,k)=>[o,rank(o.id),k]).sort((x,y)=>y[1]-x[1]||x[2]-y[2])[0];
  // the broad everyday category only offers pieces that share words with the topic or the line (no random objects)
  const pick=best&&(best[1]>0||set.category!=='everyday')?best[0]:null;
  if(!pick){used.add(a.asset);return s;}used.add(pick.id);changes.push({shot:i,from:a.asset,to:pick.id});
  return {...s,assets:[{asset:pick.id},...s.assets.slice(1)]};
 });
 return {ir:{...ir,shots},changes};
}
