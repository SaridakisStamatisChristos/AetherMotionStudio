import {ROOMS_V4,characterSpans,dressRoom} from './rooms.js';
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
 let shots=project.shots.map(s=>{if(s.template!=='cinematic-graph')return s;const {layers,...rest}=s;return {...rest,environment:set.environment,...(set.layers?{layers:set.layers}:{})};});
 // GPU-07 topic-v4: one sightline-safe prop layout for the whole film (the room keeps its identity across shots)
 if(set.version===ROOMS_V4.version){const dressing=dressRoom(set.layers,characterSpans(project));shots=shots.map(s=>s.template==='cinematic-graph'?{...s,dressing}:s);return {project:{...project,shots},report:{...set,applied:true,dressing}};}
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

// GEN-15 step 2 'topic-v2' (default for dialogue films; 'topic-v1' stays selectable and unchanged). Owner saw a DNA
// helix in a film about the sky: topic-v1 kept any piece of the right category even when no word matched.
// - each category gets a dressed set (src/core/cinematography.js DRESSED_SETS) instead of the plain block backdrop;
// - pieces also match on topic words (PIECE_WORDS), so "light, colour, sky" finds the prism or the telescope;
// - a piece is kept only when its words match the topic or the line; otherwise the best matching unused piece from
//   the category (or any catalog piece whose words match) is used; with no match at all, topic-v1 rules apply;
// - extra category words (WORDS_V2) for common explainer topics (light, sky, weather, money, food …).
export const SETS_V2=Object.freeze({version:'topic-v2',
 layers:Object.freeze({technology:'tech-set',science:'lab-set',architecture:'street-set',business:'office-set',nature:'forest-set',vehicles:'street-set',everyday:'home-set'}),
 words:Object.freeze({
  science:'light lights sunlight colour colours color colors rainbow spectrum wave waves sky skies sun moon gravity magnet magnets electricity sound heat temperature',
  nature:'weather cloud clouds wind storm storms snow ice volcano volcanoes earthquake bee bees insect insects bird birds fish seed seeds',
  business:'pay payment payments coin coins cash save saving savings invest investing loan loans tax taxes job jobs work',
  everyday:'food cook cooking sleep habit habits clean cleaning'
 })
});
export const PIECE_WORDS=Object.freeze({
 'prism':'light lights sunlight colour colours color colors rainbow spectrum white blue violet red orange wave waves sky',
 'telescope':'sky skies star stars space night moon planet planets galaxy',
 'planet-system':'sun planet planets solar orbit orbits space sky moon earth',
 'rocket':'space launch fly flight moon',
 'space-station':'space astronaut orbit',
 'molecule-dioxide':'carbon dioxide air gas breathe',
 'molecule-water':'water rain cloud clouds vapour steam ice',
 'molecule-methane':'gas methane',
 'atom-model':'atom atoms nitrogen oxygen particle particles matter',
 'microscope':'cell cells tiny small bacteria germ germs microbe microbes',
 'magnet':'magnet magnets magnetic',
 'pendulum':'gravity swing time',
 'cell-model':'cell cells body',
 'virus-model':'virus viruses sick illness vaccine vaccines',
 'mountain':'volcano volcanoes lava rock rocks mountain mountains',
 'pine-tree':'forest forests tree trees wood woods',
 'oak-tree':'forest forests tree trees leaf leaves',
 'flower':'bee bees pollen flower flowers garden',
 'waterfall':'water river rivers',
 'snow-mountain':'snow ice cold winter',
 'island':'ocean oceans sea seas',
 'coral-reef':'ocean oceans sea seas fish reef',
 'router':'internet wifi message messages network',
 'server-rack':'cloud data internet website websites server servers',
 'smartphone':'phone phones call app apps message',
 'laptop':'computer computers code coding program',
 'satellite-dish':'signal signals satellite satellites',
 'solar-panel':'sun solar energy electricity',
 'wind-turbine':'wind energy electricity power',
 'battery-stack':'battery batteries energy charge',
 'coin-stack':'money coin coins save saving savings',
 'banknote-stack':'money cash pay',
 'bank-building':'bank banks loan loans',
 'growth-arrow':'growth grow profit invest investing',
 'balance-scale':'balance fair law weight'
});
const v2Index=()=>{const idx=new Map(wordIndex());for(const [c,w] of Object.entries(SETS_V2.words))for(const t of w.split(' '))if(!idx.has(t))idx.set(t,c);return idx;};
// Unit 5 'topic-v3' (dialogue default; owner "implement 1-2-3 and 5", OPEN-2): topic-v2 with the far backdrops of
// src/core/cinematography.js FAR_SETS ('<set>-2' layers: same pieces, a backdrop that belongs to the place instead of the
// plain skyline blocks). Category choice and piece fitting are exactly topic-v2's. topic-v1 and topic-v2 are unchanged.
export const SETS_V3=Object.freeze({version:'topic-v3',layers:Object.freeze(Object.fromEntries(Object.entries(SETS_V2.layers).map(([c,l])=>[c,l+'-2'])))});
const DRESSED_VERSIONS=['topic-v2','topic-v3','topic-v4'];
// GPU-07 'topic-v4' (src/director/rooms.js): topic-v2 scoring plus the education, making and heritage words; one room
// per film and a sightline-safe prop layout (applySet). Earlier versions are unchanged.
const v4Index=()=>{const idx=new Map(v2Index());for(const [c,w] of Object.entries(ROOMS_V4.words))for(const t of w.split(' '))idx.set(t,c);return idx;};
// topicSet for a sets version ('topic-v1' unchanged; 'topic-v2' adds WORDS_V2 and the dressed layers; 'topic-v3' the far backdrops).
export function topicSetFor(version,q,ir){
 if(!DRESSED_VERSIONS.includes(version))return topicSet(q,ir);
 if(version==='topic-v3'){const s=topicSetFor('topic-v2',q,ir);return {...s,version:SETS_V3.version,layers:s.category?SETS_V3.layers[s.category]:null};}
 if(version==='topic-v4'){
  const idx=v4Index(),score=Object.fromEntries(Object.keys(ROOMS_V4.layers).map(c=>[c,0]));
  for(const t of tokens(q.topic)){const c=idx.get(t);if(c)score[c]+=SETS.topicWeight;}
  for(const sh of ir.shots)for(const line of sh.narration)for(const t of tokens(line)){const c=idx.get(t);if(c)score[c]++;}
  let best=null;for(const [c,v] of Object.entries(score))if(v>0&&(best===null||v>score[best]))best=c;
  return {version:ROOMS_V4.version,category:best,environment:best?SETS.categories[best]?.environment??ROOMS_V4.environments[best]:null,layers:best?ROOMS_V4.layers[best]:null,scores:score};
 }
 const idx=v2Index(),score=Object.fromEntries(Object.keys(SETS.categories).map(c=>[c,0]));
 for(const t of tokens(q.topic)){const c=idx.get(t);if(c)score[c]+=SETS.topicWeight;}
 for(const sh of ir.shots)for(const line of sh.narration)for(const t of tokens(line)){const c=idx.get(t);if(c)score[c]++;}
 let best=null;for(const [c,v] of Object.entries(score))if(v>0&&(best===null||v>score[best]))best=c;
 return {version:SETS_V2.version,category:best,environment:best?SETS.categories[best].environment:null,layers:best?SETS_V2.layers[best]:null,scores:score};
}
const pieceWords=id=>new Set([...id.split('-'),...(PIECE_WORDS[id]?.split(' ')??[])]);
// A piece matches a shot when its curated words (PIECE_WORDS) meet the topic (×3) or the line (×2). Its ID words count
// too, but a piece from another category must be named in full ("passenger train", not just "train the body").
function pieceRank(id,inCategory,words,topic){
 const parts=id.split('-'),named=parts.every(t=>words.has(t)||topic.has(t));
 let n=0;for(const t of PIECE_WORDS[id]?.split(' ')??[])n+=(words.has(t)?2:0)+(topic.has(t)?3:0);
 if(inCategory||named)for(const t of parts)n+=(words.has(t)?2:0)+(topic.has(t)?3:0);
 return n;
}
export function fitPiecesFor(version,q,ir,set){
 if(!DRESSED_VERSIONS.includes(version))return fitPieces(q,ir,set);
 if(!set.category)return {ir,changes:[]};
 const pieces=OBJECT_CATALOG.filter(pieceOk),topic=new Set(tokens(q.topic)),used=new Set(),changes=[];
 const shots=ir.shots.map((s,i)=>{
  const a=s.assets?.[0];if(!a)return s;
  // GPU-07 topic-v4: the new categories (education, making, heritage) use their own centre pieces, one per shot in order
  const own=set.version===ROOMS_V4.version?ROOMS_V4.centerPieces[set.category]:null;
  if(own){const pick=own.find(id=>!used.has(id))??own[i%own.length];used.add(pick);if(pick!==a.asset)changes.push({shot:i,from:a.asset,to:pick});return pick===a.asset?s:{...s,assets:[{asset:pick},...s.assets.slice(1)]};}
  const words=new Set([...tokens(s.heading),...s.narration.flatMap(tokens)]);
  const rank=id=>pieceRank(id,categoryOf(id)===set.category,words,topic);
  let pick=null;
  if(rank(a.asset)>0&&!used.has(a.asset))pick=a.asset;
  else{
   // the category's pieces first, then other matching pieces; ties keep catalog order
   const ranked=pieces.filter(o=>!used.has(o.id)).map((o,k)=>[o.id,rank(o.id),o.category===set.category?0:1,k]).filter(x=>x[1]>0).sort((x,y)=>y[1]-x[1]||x[2]-y[2]||x[3]-y[3]);
   if(ranked.length)pick=ranked[0][0];
   // no matching words anywhere: topic-v1 rules (keep a fitting unused piece; else the first unused category piece;
   // the broad everyday category never swaps in an unrelated object)
   else if(categoryOf(a.asset)===set.category&&!used.has(a.asset))pick=a.asset;
   else if(set.category!=='everyday')pick=pieces.find(o=>o.category===set.category&&!used.has(o.id))?.id??null;
  }
  if(!pick){used.add(a.asset);return s;}
  used.add(pick);if(pick===a.asset)return s;changes.push({shot:i,from:a.asset,to:pick});
  return {...s,assets:[{asset:pick},...s.assets.slice(1)]};
 });
 return {ir:{...ir,shots},changes};
}
