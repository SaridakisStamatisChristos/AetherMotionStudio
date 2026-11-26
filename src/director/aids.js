// DUAL-01 Director visual aids (opt-in request.content). Deterministic planner that turns each shot's own text
// (title, heading, subheading, narration) into a compose-v1 composition. It only quotes or extracts words that are
// already in the plan; it never invents facts, numbers or labels. Content it cannot show yet (charts, maths, images)
// is reported as a diagnostic instead of being faked.
import {layoutComposition,COMPOSE_VERSION,COMPOSE_V2,TEXT,textWidth} from '../core/composition.js';
export const CONTENT_MODES=Object.freeze(['explainer-v1','mixed-v1','typography-v1']);
// The explainer's object when neither a shot nor the whole film names a catalog object (reported, never silent).
export const EXPLAINER_FALLBACK='open-book';
const fits=c=>{try{layoutComposition(c);return true;}catch{return false;}};
// Sentences end at . ! ? followed by a space (so "$1,250.50" and "3.5" stay whole).
const sentences=s=>s.trim().split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
const STOP=/^(?:only|just|also|even|in|on|at|the|a|an|of|to|that|this|these|those|its|their|our|your|his|her|and|or|with|from|by|for|into|through)\s+/i;
const clean=s=>{let x=s.trim().replace(/[.,;:!?]+$/,'');for(let i=0;i<3;i++)x=x.replace(STOP,'');return x.trim();};
const short=(s,n=3)=>{const w=s.split(/\s+/).filter(Boolean);return w.length>=1&&w.length<=n&&s.length<=TEXT.label.max&&/^[\p{L}\p{N}][\p{L}\p{N}' -]*$/u.test(s);};
// Pronouns and auxiliary verbs never start a list item ("Much of it does, in trunks…" is not an item "It does").
const FUNCTION_WORDS=new Set(['it','they','we','you','he','she','i','this','that','there','does','do','did','is','are','was','were','can','will','be','been','has','have','had']);
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
   if(intro&&short(clean(intro[1]))&&!clean(intro[1]).split(/\s+/).some(w=>FUNCTION_WORDS.has(w.toLowerCase()))){items.unshift(clean(intro[1]));complete=true;}
   else if(!short(x))complete=true;// the list starts after the first comma
   else if(x.split(/\s+/).length===1){items.unshift(x);complete=true;}
  }
  const last=clean(m[2].split(/\s+(?:sometimes|which|that|because|so|but)\b/i)[0]);
  if(complete&&items.length>=2&&items.length<=3&&short(last))return [...items,last].map(cap);}
 return null;
}
// Widths (shares of the region) for a row of labels: in proportion to each label's text, so the labels can share one
// size; each at least 18 % of the row. `total` is the share the row may use.
function row(texts,total){const need=texts.map(t=>textWidth(t,30)+2*TEXT.label.pad),min=.18,sum=need.reduce((a,b)=>a+b,0);
 let w=need.map(n=>Math.max(min,total*n/sum));const over=w.reduce((a,b)=>a+b,0)-total;if(over>0){const big=w.map(v=>v-min),s=big.reduce((a,b)=>a+b,0)||1;w=w.map((v,i)=>v-over*big[i]/s);}return w;}
// The offline planner's generic outline roles (src/director/offline.js `roles`).
const GENERIC=new Set(['introduction','context','key idea','how it works','connections','implications','summary']);
const keySentence=(narration,max)=>narration.flatMap(sentences).find(x=>!x.endsWith('?')&&x.length<=max&&x.split(/\s+/).length>=4)??null;
const HINTS=[[/\b(?:chart|graph|percent|percentage|statistics|data)\b|%/i,'chart or data (DUAL-04)'],[/\b(?:equation|formula|theorem|proof|algebra)\b/i,'mathematics (DUAL-03)'],[/\b(?:photo|photograph|picture|painting|portrait|map)\b/i,'image (DUAL-05)']];
// DUAL-02: a number in the text, verbatim: "$3.5 billion tons of carbon" → {value:3.5, decimals:1, prefix:'$',
// suffix:' billion', label:'tons of carbon'}. Scale words are shown, never multiplied out. Bare years (1000–2100
// without a unit) are not counted.
export function findNumber(text){
 const re=/(\$)?\b(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,3}))?(?![\d.,]\d)(?:\s*(%|percent\b|thousand\b|million\b|billion\b|trillion\b))?((?:\s+[A-Za-z][A-Za-z'-]*){0,6})/g;
 for(const s of sentences(text))for(const m of s.matchAll(re)){
  const int=m[2].replaceAll(',',''),value=Number(int+(m[3]?'.'+m[3]:''));if(!Number.isFinite(value)||value>1e12)continue;
  if(!m[1]&&!m[4]&&!m[2].includes(',')&&!m[3]&&value>=1000&&value<=2100)continue;
  if(/^\s+(?:BC|BCE|AD|CE)\b/.test(m[5]??''))continue;// a date, not a quantity
  return {value,decimals:m[3]?.length??0,prefix:m[1]??'',suffix:m[4]?(m[4]==='%'?'%':' '+m[4].toLowerCase()):'',label:numberLabel(m[5]),sentence:s};}
 return null;
}
// The words right after a number, verbatim: optional "of the", then up to 3 content words; "of" may join two content
// words ("kilograms of oxygen"); any other function word ends the label ("trees on the planet" → "trees").
const LEADING=new Set(['of','the','a','an']),ENDS=new Set(['on','in','at','to','for','by','with','from','into','and','or','but','that','which','is','are','was','were','can','will','the','a','an','each','every','per','this','these','those','it','its','than','as','so','because','when','if']);
function numberLabel(tail){
 const w=(tail??'').trim().split(/\s+/).filter(Boolean),out=[];let i=0,content=0;
 while(i<w.length&&LEADING.has(w[i].toLowerCase())&&out.length<2)out.push(w[i++]);
 for(;i<w.length&&content<3;i++){const x=w[i].toLowerCase();if(x==='of'&&content>0&&i+1<w.length&&!ENDS.has(w[i+1].toLowerCase())&&!LEADING.has(w[i+1].toLowerCase())){out.push(w[i]);continue;}if(ENDS.has(x)||LEADING.has(x))break;out.push(w[i]);content++;}
 const s=out.join(' ');return content>0&&s.length<=TEXT.numberLabel.max?s:null;
}
const phraseOf=(s,sentence)=>Math.max(0,s.narration.findIndex(t=>t.includes(sentence)));
// Emphasis: the first word of the sentence (5+ letters) that also appears in the topic; none otherwise.
function topicWord(sentence,topic){const t=new Set(topic.toLowerCase().match(/[\p{L}]{5,}/gu)??[]);return (sentence.match(/[\p{L}]{5,}/gu)??[]).find(w=>t.has(w.toLowerCase()))??null;}
// typography-v1 candidates for one shot (region full, no 3D asset): title, counter, bullets, flow, key sentence.
function typographyTries(q,ir,s,i,base,heading){
 const text=s.narration.join(' '),tries=[],top=heading?[{id:'heading',type:'label',box:[.1,0,.8,.11],text:heading,tone:'accent'}]:[],y0=heading?.16:.04;
 if(i===0)tries.push(['title',{...base,items:[{id:'title',type:'kinetic',box:[0,.12,1,.5],text:ir.title.length<=TEXT.kinetic.max?ir.title:s.heading,tone:'accent'}]}]);
 const num=findNumber(text);
 if(num)tries.push(['counter',{...base,items:[...top,{id:'count',type:'counter',box:[.04,y0+.08,.92,.42],from:0,to:num.value,decimals:num.decimals,...(num.prefix?{prefix:num.prefix}:{}),...(num.suffix?{suffix:num.suffix}:{}),...(num.label?{text:num.label}:{}),phrase:phraseOf(s,num.sentence)}]}]);
 const list=findList(text);
 if(list){const sentence=sentences(text).find(x=>findList(x));tries.push(['bullets',{...base,items:[...top,{id:'list',type:'bullets',box:[0,y0+.04,1,.62],lines:list,phrase:phraseOf(s,sentence)}]}]);}
 const flow=findFlow(text);
 if(flow){const [wa,wb]=row(flow,.78);tries.push(['flow',{...base,items:[...top,{id:'from',type:'label',box:[0,y0+.2,wa,.14],text:flow[0],start:.06},{id:'to',type:'label',box:[1-wb,y0+.2,wb,.14],text:flow[1],start:.2},{id:'step',type:'arrow',from:'from',to:'to',reveal:'wipe',start:.12}]}]);}
 for(const sentence of s.narration.flatMap(sentences).filter(x=>!x.endsWith('?')&&x.split(/\s+/).length>=4&&x.length<=TEXT.kinetic.max)){const w=topicWord(sentence,q.topic);
  tries.push(['kinetic',{...base,items:[...top,{id:'line',type:'kinetic',box:[0,y0+.04,1,.6],text:sentence,phrase:phraseOf(s,sentence),...(w?{emphasis:[w]}:{})}]}]);}
 return tries;
}
// Returns {compositions:[one per IR shot], diagnostics:[…], kinds:[…]}.
// DUAL-02: typography-v1 and any request with `font` or `theme` produce compose-v2 compositions; others compose-v1.
export function planAids(q,ir){
 const compositions=[],diagnostics=[],kinds=[],typo=q.content==='typography-v1',v2=typo||q.font!==undefined||q.theme!==undefined;
 ir.shots.forEach((s,i)=>{
  const text=s.narration.join(' '),base=v2?{version:COMPOSE_V2,region:typo?'full':'upper',font:q.font??(typo?'inter':'arial'),...(q.theme?{theme:q.theme}:{})}:{version:COMPOSE_VERSION,region:'upper'};
  if(q.content==='explainer-v1'&&s.assets.some(a=>a.asset===EXPLAINER_FALLBACK)&&!/\bbooks?\b/i.test(q.topic+' '+text))diagnostics.push({code:'NO_MATCHING_OBJECT',shot:'shot-'+(i+1),used:EXPLAINER_FALLBACK});
  for(const [re,what] of HINTS)if(re.test(text))diagnostics.push({code:'VISUAL_AID_NOT_YET_SUPPORTED',shot:'shot-'+(i+1),wanted:what,used:'card from the narration'});
  const generic=GENERIC.has(s.heading.toLowerCase()),heading=!generic&&s.heading.length<=TEXT.label.max?s.heading:null,top=heading?[{id:'heading',type:'label',box:[.1,0,.8,.3],text:heading,tone:'accent'}]:[];
  const tries=typo?typographyTries(q,ir,s,i,base,heading):[];
  if(i===0){const t=ir.title.length<=TEXT.title.max?ir.title:s.heading;tries.push(['title',{...base,items:[{id:'title',type:'title',box:[0,.08,1,.62],text:t}]}]);}
  const flow=findFlow(text);
  if(flow){const [wa,wb]=row(flow,.78);tries.push(['flow',{...base,items:[...top,{id:'from',type:'label',box:[0,.48,wa,.36],text:flow[0],start:.06},{id:'to',type:'label',box:[1-wb,.48,wb,.36],text:flow[1],start:.2},{id:'step',type:'arrow',from:'from',to:'to',reveal:'wipe',start:.12}]}]);}
  const list=findList(text);
  if(list){const g=.03,ws=row(list,1-g*(list.length-1));let x0=0;tries.push(['list',{...base,items:[...top,...list.map((x,k)=>{const box=[x0,.5,ws[k],.34];x0+=ws[k]+g;return {id:'item-'+(k+1),type:'label',box,text:x,start:Math.min(.5,.06+.08*k)};})]}]);}
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
