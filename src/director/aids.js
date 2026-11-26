// DUAL-01 Director visual aids (opt-in request.content). Deterministic planner that turns each shot's own text
// (title, heading, subheading, narration) into a compose-v1 composition. It only quotes or extracts words that are
// already in the plan; it never invents facts, numbers or labels. Content it cannot show yet (charts, maths, images)
// is reported as a diagnostic instead of being faked.
import {layoutComposition,COMPOSE_VERSION,TEXT} from '../core/composition.js';
export const CONTENT_MODES=Object.freeze(['explainer-v1','mixed-v1']);
// The explainer's object when neither a shot nor the whole film names a catalog object (reported, never silent).
export const EXPLAINER_FALLBACK='open-book';
const fits=c=>{try{layoutComposition(c);return true;}catch{return false;}};
const sentences=s=>s.match(/[^.!?]+[.!?]*/g)?.map(x=>x.trim()).filter(Boolean)??[];
const STOP=/^(?:in|on|at|the|a|an|of|to|that|this|these|those|its|their|our|your|his|her|and|or|with|from|by|for|into|through)\s+/i;
const clean=s=>{let x=s.trim().replace(/[.,;:!?]+$/,'');for(let i=0;i<3;i++)x=x.replace(STOP,'');return x.trim();};
const short=(s,n=3)=>{const w=s.split(/\s+/).filter(Boolean);return w.length>=1&&w.length<=n&&s.length<=TEXT.label.max&&/^[\p{L}\p{N}][\p{L}\p{N}' -]*$/u.test(s);};
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
// "X turns A into B" → [A, B] (one flow), A and B taken verbatim (determiners dropped).
export function findFlow(text){
 for(const s of sentences(text)){const m=s.match(/^(.*?)\binto\b(.*)$/i);if(!m)continue;
  const before=m[1].trim().split(/\s+/),a=clean(before.slice(-2).join(' ')),a1=clean(before.slice(-1).join(' ')),b=clean(m[2].split(/[,;:.!?]/)[0]);
  const from=short(a,2)?a:short(a1,1)?a1:null;if(from&&short(b,3))return [cap(from),cap(b)];}
 return null;
}
// "…, A, B and C…" → [A, B, C] (3–4 short items, verbatim).
export function findList(text){
 for(const s of sentences(text)){const m=s.match(/^(.*?),?\s+(?:and|or)\s+([^,;:.!?]+)/i);if(!m)continue;
  // Walk back from "and" while the parts are short items. The list must be shown whole: when the walk reaches the
  // sentence start with a short part, its first item must be unambiguous (one word, or the words after an introducing
  // verb or preposition); otherwise, or with more than four items, no list is drawn.
  const parts=m[1].split(/,\s*/),items=[];let complete=false;
  for(let i=parts.length-1;i>=0;i--){const x=clean(parts[i]);
   if(i>0){if(!short(x)){complete=true;break;}items.unshift(x);continue;}
   const intro=parts[0].match(/\b(?:like|such as|including|include|includes|need|needs|has|have|are|is|of|in|on|at|from)\s+((?:\S+\s?){1,2})$/i);
   if(intro&&short(clean(intro[1]))){items.unshift(clean(intro[1]));complete=true;}
   else if(!short(x))complete=true;// the list starts after the first comma
   else if(x.split(/\s+/).length===1){items.unshift(x);complete=true;}
  }
  const last=clean(m[2].split(/\s+(?:sometimes|which|that|because|so|but)\b/i)[0]);
  if(complete&&items.length>=2&&items.length<=3&&short(last))return [...items,last].map(cap);}
 return null;
}
// The offline planner's generic outline roles (src/director/offline.js `roles`).
const GENERIC=new Set(['introduction','context','key idea','how it works','connections','implications','summary']);
const keySentence=(narration,max)=>narration.flatMap(sentences).find(x=>!x.endsWith('?')&&x.length<=max&&x.split(/\s+/).length>=4)??null;
const HINTS=[[/\b(?:chart|graph|percent|percentage|statistics|data)\b|%/i,'chart or data (DUAL-04)'],[/\b(?:equation|formula|theorem|proof|algebra)\b/i,'mathematics (DUAL-03)'],[/\b(?:photo|photograph|picture|painting|portrait|map)\b/i,'image (DUAL-05)']];
// Returns {compositions:[one per IR shot], diagnostics:[…], kinds:[…]}.
export function planAids(q,ir){
 const compositions=[],diagnostics=[],kinds=[];
 ir.shots.forEach((s,i)=>{
  const text=s.narration.join(' '),base={version:COMPOSE_VERSION,region:'upper'};
  if(q.content==='explainer-v1'&&s.assets.some(a=>a.asset===EXPLAINER_FALLBACK)&&!/books?/i.test(q.topic+' '+text))diagnostics.push({code:'NO_MATCHING_OBJECT',shot:'shot-'+(i+1),used:EXPLAINER_FALLBACK});
  for(const [re,what] of HINTS)if(re.test(text))diagnostics.push({code:'VISUAL_AID_NOT_YET_SUPPORTED',shot:'shot-'+(i+1),wanted:what,used:'card from the narration'});
  const generic=GENERIC.has(s.heading.toLowerCase()),heading=!generic&&s.heading.length<=TEXT.label.max?s.heading:null,top=heading?[{id:'heading',type:'label',box:[.1,0,.8,.3],text:heading,tone:'accent'}]:[];
  const tries=[];
  if(i===0){const t=ir.title.length<=TEXT.title.max?ir.title:s.heading;tries.push(['title',{...base,items:[{id:'title',type:'title',box:[0,.08,1,.62],text:t}]}]);}
  const flow=findFlow(text);
  if(flow)tries.push(['flow',{...base,items:[...top,{id:'from',type:'label',box:[0,.48,.36,.36],text:flow[0],start:.06},{id:'to',type:'label',box:[.64,.48,.36,.36],text:flow[1],start:.2},{id:'step',type:'arrow',from:'from',to:'to',reveal:'wipe',start:.12}]}]);
  const list=findList(text);
  if(list){const n=list.length,g=.04,w=(1-g*(n-1))/n;tries.push(['list',{...base,items:[...top,...list.map((x,k)=>({id:'item-'+(k+1),type:'label',box:[k*(w+g),.5,w,.34],text:x,start:Math.min(.5,.06+.08*k)}))]}]);}
  const key=keySentence(s.narration,TEXT.body.max);
  // A generic outline role ("Context", "Key idea") is not shown: the card quotes the narration on its own.
  if(key)tries.push(['card',{...base,items:[{id:'card',type:'card',box:[.03,.03,.94,.94],...(generic?{}:{text:s.heading}),body:key}]}]);
  if(!generic)tries.push(['card',{...base,items:[{id:'card',type:'card',box:[.03,.03,.94,.94],text:s.heading,body:s.subheading}]}]);
  const first=s.narration.flatMap(sentences)[0];if(first&&first.length<=TEXT.body.max)tries.push(['card',{...base,items:[{id:'card',type:'card',box:[.03,.03,.94,.94],body:first}]}]);
  tries.push(['label',{...base,items:[{id:'card',type:'label',box:[.05,.2,.9,.5],text:s.heading.slice(0,TEXT.label.max).trim()}]}]);
  const found=tries.find(([,c])=>fits(c));if(!found)throw Error('aids: shot-'+(i+1)+' has no text that fits a visual aid');const [kind,c]=found;compositions.push(c);kinds.push(kind);
 });
 return {version:1,mode:q.content,compositions,diagnostics,kinds};
}
// Continuation pieces of a split shot (titleHold) keep their aids steady: everything shown from the cut, no reveal.
export const holdComposition=c=>({...c,items:c.items.map(({start,reveal,...x})=>({...x,reveal:'none'}))});
