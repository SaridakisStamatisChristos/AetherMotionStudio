// DUAL-03 authored visuals (opt-in request field `visuals`, content modes only). Each entry attaches an authored
// compose-v2 composition to the shot whose narration contains an exact sentence of the script:
//   {at: "Sentence from the script.", composition: {version:'compose-v2', region, items:[…]}}
// Items may name their timing by sentence instead of index: `cue: "…"` (start when that sentence is spoken) and, for
// plots, graphs, arrays and bullets, `cues: ["…", …]` (one per step). They are resolved to phrase indices of that
// shot. The composition replaces the planner's aid for that shot. Authored content is authoritative; the planner
// never changes it, and validation (layout, glyphs, maths checks) applies unchanged.
const fail=(p,m)=>{throw Error(p+': '+m)};
const norm=s=>String(s).trim().replace(/\s+/g,' ');
export const MAX_VISUALS=24;
export function validateVisualsRequest(v){
 if(!Array.isArray(v)||v.length<1||v.length>MAX_VISUALS)fail('request.visuals','1–'+MAX_VISUALS+' entries required');
 v.forEach((x,i)=>{const p='request.visuals['+i+']';if(!x||typeof x!=='object'||Array.isArray(x))fail(p,'object required');for(const k of Object.keys(x))if(!['at','composition'].includes(k))fail(p+'.'+k,'unknown field');
  if(typeof x.at!=='string'||!x.at.trim()||x.at.length>300)fail(p+'.at','a sentence of the script (1–300 characters) required');
  if(!x.composition||typeof x.composition!=='object'||x.composition.version!=='compose-v2')fail(p+'.composition','a compose-v2 composition required');});
}
// A visual defines its shot: the narration phrases holding any sentence the visual names (`at` and every cue) become
// one shot of their own, so authors never need to know where the planner would cut. Planner shots are split at
// phrase boundaries or merged as needed; phrases no visual claims keep their planner grouping. Two visuals that need
// the same phrase are refused. Returns a new IR (the input is not modified).
const sentencesOf=v=>[v.at,...(Array.isArray(v.composition?.items)?v.composition.items.flatMap(x=>[x?.cue,...(Array.isArray(x?.cues)?x.cues:[])]):[])].filter(s=>typeof s==='string'&&s.trim());
export function mergeShotsForVisuals(q,ir){
 if(!q.visuals)return ir;
 // every narration phrase in order, with the planner shot it came from
 const flat=ir.shots.flatMap((s,k)=>s.narration.map((t,j)=>({k,t,speaker:s.speakers?.[j]})));
 const spans=q.visuals.map((v,i)=>{const p='request.visuals['+i+']',ks=sentencesOf(v).map(s=>{const hits=flat.map((f,n)=>norm(f.t).includes(norm(s))?n:-1).filter(n=>n>=0);
   if(!hits.length){const any=flat.some(f=>norm(f.t).includes(norm(s).split(' ').slice(0,4).join(' ')));fail(p,'"'+norm(s).slice(0,60)+'" is not '+(any?'one continuous part of a sentence':'a sentence')+' of the script (exact words required)');}
   if(hits.length>1)fail(p,'"'+norm(s).slice(0,40)+'" occurs in more than one place; quote a longer, unique part');return hits[0];});
  return {i,from:Math.min(...ks),to:Math.max(...ks)};}).sort((a,b)=>a.from-b.from);
 for(let j=1;j<spans.length;j++)if(spans[j].from<=spans[j-1].to)fail('request.visuals['+spans[j].i+']','its sentences overlap those of request.visuals['+spans[j-1].i+'] (the same spoken phrase); one visual per shot');
 for(const sp of spans)if(sp.to-sp.from+1>8)fail('request.visuals['+sp.i+']','its sentences span '+(sp.to-sp.from+1)+' narration phrases; at most 8 fit one shot');
 const shot=(from,to)=>{const base=ir.shots[flat[from].k],part=flat.slice(from,to+1);return {...base,narration:part.map(f=>f.t),...(base.speakers?{speakers:part.map(f=>f.speaker)}:{})};};
 const shots=[];let n=0;
 const rest=end=>{while(n<end){let m=n;while(m+1<end&&flat[m+1].k===flat[n].k)m++;shots.push(shot(n,m));n=m+1;}};
 for(const sp of spans){rest(sp.from);shots.push(shot(sp.from,sp.to));n=sp.to+1;}
 rest(flat.length);
 return {...ir,shots};
}
// Returns compositions keyed by IR shot index (0-based), cues resolved to phrase indices.
export function placeVisuals(q,ir){
 const out=new Map();if(!q.visuals)return out;
 if(q.script===undefined)fail('request.visuals','visuals attach to sentences of request.script; add the script');
 q.visuals.forEach((v,i)=>{const p='request.visuals['+i+']',at=norm(v.at);
  const hits=ir.shots.map((s,k)=>norm(s.narration.join(' ')).includes(at)?k:-1).filter(k=>k>=0);
  if(!hits.length)fail(p+'.at','"'+at.slice(0,60)+'" is not a sentence of the script (exact words required)');
  if(hits.length>1)fail(p+'.at','"'+at.slice(0,60)+'" occurs in more than one shot; quote a longer, unique part');
  const k=hits[0];if(out.has(k))fail(p+'.at','shot '+(k+1)+' already has a visual (from request.visuals['+out.get(k).index+']); one visual per shot');
  const shot=ir.shots[k],phraseOf=(cue,q2)=>{if(typeof cue!=='string'||!cue.trim())fail(q2,'a sentence of this shot required');const j=shot.narration.findIndex(t=>norm(t).includes(norm(cue)));if(j<0)fail(q2,'"'+norm(cue).slice(0,60)+'" is not spoken in shot '+(k+1)+' (its sentences: '+shot.narration.map(t=>'"'+norm(t).slice(0,40)+'"').join(', ')+')');return j;};
  const items=(Array.isArray(v.composition.items)?v.composition.items:[]).map((x,j)=>{if(!x||typeof x!=='object')return x;const {cue,cues,...rest}=x,q2=p+'.composition.items['+j+']';
   if(cue!==undefined){if(rest.phrase!==undefined||rest.start!==undefined)fail(q2+'.cue','use cue, phrase or start, not several');rest.phrase=phraseOf(cue,q2+'.cue');}
   if(cues!==undefined){if(!Array.isArray(cues))fail(q2+'.cues','a list of sentences required');if(rest.phrases!==undefined)fail(q2+'.cues','use cues or phrases, not both');rest.phrases=cues.map((c,n)=>phraseOf(c,q2+'.cues['+n+']'));}
   return rest;});
  out.set(k,{index:i,composition:{...v.composition,items}});});
 return out;
}
