// Shared composition (opt-in shot field `composition`; absent = unchanged output).
// DUAL-01 'compose-v1': declarative 2D visual aids (title, card, label, callout, arrow, shape, background) in Arial.
// DUAL-02 'compose-v2': compose-v1 plus typography — bundled open fonts with a fixed fallback chain and missing-glyph
// reports, weights, alignment, emphasis ranges, themes, quotes, bullets, counters, word-by-word (kinetic) text and
// reveal timing anchored to the shot's measured narration phrases. compose-v1 output is unchanged.
// Drawn by the shared 2D overlay path (src/visual/draw-composition.js, called from drawGraph after the world pass) on
// both backends, so content and placement are identical on CPU and Three.js.
// Layout is deterministic: text is wrapped with advance-width tables (Arial-Bold table for 'arial'; the bundled fonts'
// own widths from src/core/font-metrics.js, generated from the font files), so the validator, the Director and both
// renderers agree on line breaks and sizes. Text that cannot fit its box at the smallest allowed size is rejected with
// an explicit diagnostic; it is never truncated or squeezed. Characters no font in the chain covers are rejected.
// Coordinates: the 720×1280 logical canvas every renderer uses. Regions stay inside the Reels-safe area
// (src/core/reels-layout.js: x 40–640, y 147–1000) and above the caption boxes (normal and Reels, two lines).
import {FONT_METRICS} from './font-metrics.js';
export const COMPOSE_VERSION='compose-v1',COMPOSE_V2='compose-v2',COMPOSE_VERSIONS=Object.freeze([COMPOSE_VERSION,COMPOSE_V2]);
export const REGIONS=Object.freeze({
 // the clean top of a 9:16 frame: above characters' heads at the medium framings the Director uses
 upper:Object.freeze({x:48,y:150,w:584,h:240}),
 // the whole safe picture area above the captions (for shots whose world is only a backdrop or small props)
 full:Object.freeze({x:48,y:150,w:584,h:700})
});
export const TYPES=Object.freeze(['background','title','card','label','callout','arrow','shape']);
export const TYPES_V2=Object.freeze([...TYPES,'quote','bullets','counter','kinetic']);
export const REVEALS=Object.freeze(['fade','slide','wipe','pop','none']);
export const SHAPES=Object.freeze(['circle','ring','rect']);
export const ALIGNS=Object.freeze(['left','center','right']);
// Theme 'aether-v1' tones: opaque plate colours with text contrast >= 4.5:1 (tests/composition.test.js checks WCAG).
export const TONES=Object.freeze({
 neutral:Object.freeze({fill:'#0b1724',edge:'#5f7d92',text:'#f5f7f5',sub:'#c4d4de',mark:'#6de6e3'}),
 accent:Object.freeze({fill:'#0f2c38',edge:'#6de6e3',text:'#f5fbfb',sub:'#bfe9ea',mark:'#6de6e3'}),
 warm:Object.freeze({fill:'#2e1c12',edge:'#ffd17a',text:'#fff6e6',sub:'#f3d9b0',mark:'#ffd17a'}),
 cool:Object.freeze({fill:'#151a36',edge:'#a9b5ff',text:'#f3f4ff',sub:'#cfd5ff',mark:'#a9b5ff'})
});
// compose-v2 themes (tone sets). 'paper-v1': light plates, dark ink; text, sub and mark (emphasis) >= 4.5:1.
export const THEMES=Object.freeze({
 'aether-v1':TONES,
 'paper-v1':Object.freeze({
  neutral:Object.freeze({fill:'#f6f1e6',edge:'#c7b994',text:'#1b2129',sub:'#454b54',mark:'#a3401b'}),
  accent:Object.freeze({fill:'#fdf7ea',edge:'#a3401b',text:'#1b2129',sub:'#454b54',mark:'#a3401b'}),
  warm:Object.freeze({fill:'#fbecd3',edge:'#b06a12',text:'#2a1c0e',sub:'#55402a',mark:'#8a4a00'}),
  cool:Object.freeze({fill:'#e8eef8',edge:'#4f67a6',text:'#141c33',sub:'#38435f',mark:'#2f4a96'})
 })
});
// Font sizes (logical px) tried from largest to smallest; line height = 1.22 × size; inner padding per type.
export const TEXT=Object.freeze({
 title:Object.freeze({sizes:[44,40,36,32,28],pad:18,max:60}),
 // sizes read at phone size: captions are 30 px, so aids start at 28–34 px and step down only when needed
 heading:Object.freeze({sizes:[34,32,30,28,26,24,22],pad:18,max:48}),
 body:Object.freeze({sizes:[28,26,24,22,20,18],pad:18,max:160}),
 // a card with a body only (a quoted sentence) reads as the card's main text
 quote:Object.freeze({sizes:[34,32,30,28,26,24,22,20],pad:18,max:160}),
 label:Object.freeze({sizes:[30,28,26,24,22,20,18],pad:12,max:40}),
 callout:Object.freeze({sizes:[28,26,24,22,20,18],pad:14,max:100}),
 // compose-v2
 pull:Object.freeze({sizes:[44,40,36,34,32,30,28,26,24,22],pad:24,max:220}),
 cite:Object.freeze({sizes:[24,22,20,18],pad:24,max:60}),
 bullet:Object.freeze({sizes:[46,42,40,38,36,34,32,30,28,26,24,22,20,18],pad:20,max:90}),
 number:Object.freeze({sizes:[104,96,88,80,72,64,56,48,40],pad:16,max:0}),
 numberLabel:Object.freeze({sizes:[36,34,32,30,28,26,24,22,20,18],pad:16,max:48}),
 kinetic:Object.freeze({sizes:[60,56,52,48,44,40,36,32,28],pad:20,max:140})
});
export const LINE=1.22,GAP=8,FONT='Arial',WEIGHT=700;
export const MAX_ITEMS=6,MAX_ITEMS_V2=8,REVEAL_SECONDS=.5,COUNT_SECONDS=1.5;
// Arial Bold advance widths per 1000 em (metric-compatible with Helvetica-Bold); unknown characters use the widest
// common advance so estimates stay conservative.
const ADV={' ':278,'!':333,'"':474,'#':556,'$':556,'%':889,'&':722,"'":238,'(':333,')':333,'*':389,'+':584,',':278,'-':333,'.':278,'/':278,':':333,';':333,'<':584,'=':584,'>':584,'?':611,'@':975,'[':333,']':333,'_':556,'0':556,'1':556,'2':556,'3':556,'4':556,'5':556,'6':556,'7':556,'8':556,'9':556,
 A:722,B:722,C:722,D:722,E:667,F:611,G:778,H:722,I:278,J:556,K:722,L:611,M:833,N:722,O:778,P:667,Q:778,R:722,S:667,T:611,U:722,V:667,W:944,X:667,Y:667,Z:611,
 a:556,b:611,c:556,d:611,e:556,f:333,g:611,h:611,i:278,j:278,k:556,l:278,m:889,n:611,o:611,p:611,q:611,r:389,s:556,t:333,u:611,v:556,w:778,x:556,y:556,z:500};
export const textWidth=(s,size)=>{let n=0;for(const c of s)n+=ADV[c]??833;return n*size/1000;};
// ---- fonts (compose-v2) ----
export const FONTS=Object.freeze(['arial',...Object.keys(FONT_METRICS.fonts)]);
export const WEIGHTS=Object.freeze([400,700]);
const tables=new Map();
function widths(font,weight){const k=font+':'+weight;let m=tables.get(k);if(!m){m=new Map();for(const r of FONT_METRICS.fonts[font].faces[weight].runs)for(let i=1;i<r.length;i++)m.set(r[0]+i-1,r[i]);tables.set(k,m);}return m;}
// The fixed fallback chain: the chosen font, then Noto Sans (Greek, Cyrillic, accents), then Inter (arrows, maths).
// Browsers fall back per glyph in the same order (CSS font list), so measured widths match what is drawn.
// 'arial' is the system font (not bundled): only the ASCII characters of the Arial table are accepted in compose-v2.
export function fontChain(font){return font==='arial'?['arial']:[font,...['noto-sans','inter'].filter(f=>f!==font)];}
export function cssFont(font,weight,size){return weight+' '+size+'px '+(font==='arial'?'Arial':fontChain(font).map(f=>'"'+FONT_METRICS.fonts[f].css+'"').join(', '));}
export function measurer(font,weight){
 if(font==='arial')return {font,weight,width:textWidth,covers:c=>Object.hasOwn(ADV,c)};
 const chain=fontChain(font).map(f=>widths(f,weight));
 const adv=c=>{const cp=c.codePointAt(0);for(const t of chain){const w=t.get(cp);if(w!==undefined)return w;}return undefined;};
 return {font,weight,width:(s,size)=>{let n=0;for(const c of s)n+=adv(c)??1000;return n*size/1000;},covers:c=>adv(c)!==undefined};
}
const ARIAL=measurer('arial',700);
// Characters of s that no font in the chain covers, as "x (U+0078)".
export function missingGlyphs(s,m){const out=[];for(const c of new Set(s))if(!m.covers(c))out.push(c+' (U+'+c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')+')');return out;}
const fail=(p,m)=>{throw Error(p+': '+m)};
const bad=(x,p)=>{if(typeof x!=='string'||!x.trim()||/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(x))fail(p,'printable text required');};
const norm=s=>s.trim().split(/\s+/).join(' ');
// Greedy word wrap at one size. Returns null when a single word is wider than the line.
export function wrapText(s,size,width,m=ARIAL){
 const lines=[];let line='';
 for(const word of s.trim().split(/\s+/)){if(m.width(word,size)>width)return null;const next=line?line+' '+word:word;if(line&&m.width(next,size)>width){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);return lines;
}
// Largest size whose wrapped text fits width × height; null when none fits.
export function fitText(s,spec,width,height,m=ARIAL){
 for(const size of spec.sizes){const lines=wrapText(s,size,width,m);if(lines&&lines.length*size*LINE<=height)return {size,lines,height:lines.length*size*LINE};}
 return null;
}
const px=(region,box)=>({x:region.x+box[0]*region.w,y:region.y+box[1]*region.h,w:box[2]*region.w,h:box[3]*region.h});
const center=b=>[b.x+b.w/2,b.y+b.h/2];
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
const windowsMeet=(a,b)=>(a.start??0)<(b.end??1)&&(b.start??0)<(a.end??1);
function point(v,p){if(!Array.isArray(v)||v.length!==2)fail(p,'[x,y] in 0–1 required');v.forEach((n,i)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)fail(p+'['+i+']','0–1 required');});}
// Deterministic number formatting (no locale): grouping with thin-free ASCII commas, fixed decimals.
export function formatNumber(v,{decimals=0,group=true,prefix='',suffix=''}={}){
 const neg=v<0,abs=Math.abs(v),fixed=(Math.round(abs*10**decimals)/10**decimals).toFixed(decimals),[int,frac]=fixed.split('.');
 const g=group?int.replace(/\B(?=(\d{3})+(?!\d))/g,','):int;
 return (neg&&Number(fixed)!==0?'-':'')+prefix+g+(frac?'.'+frac:'')+suffix;
}
// Widest string a counter can show between from and to (every digit replaced by the font's widest digit).
function counterTemplate(x,m,size){const digits=[...'0123456789'],wide=digits.reduce((a,d)=>m.width(d,size)>m.width(a,size)?d:a,'0');
 return [x.from,x.to].map(v=>formatNumber(v,x).replace(/[0-9]/g,wide)).reduce((a,b)=>m.width(b,size)>m.width(a,size)?b:a);}
// Text layout of one text item inside its pixel box (null for items without text). Throws on overflow.
function layoutItem(x,b,q,m){
 const fit=(s,spec,w,h,what)=>{const r=fitText(s,spec,w,h,m);if(!r)fail(q,'text overflow: '+what+' "'+s.slice(0,40)+(s.length>40?'…':'')+'" does not fit a '+Math.round(w)+'×'+Math.round(h)+' px box at '+spec.sizes.at(-1)+' px; shorten it or enlarge the box');return r;};
 const over=what=>fail(q,'text overflow: '+what+' does not fit a '+Math.round(b.w)+'×'+Math.round(b.h)+' px box at the smallest sizes; shorten it or enlarge the box');
 if(x.type==='title'){const s=TEXT.title;return {text:fit(x.text,s,b.w-2*s.pad,b.h-2*s.pad,'title')};}
 if(x.type==='label'){const s=TEXT.label;return {text:fit(x.text,s,b.w-2*s.pad,b.h-2*s.pad,'label')};}
 if(x.type==='callout'){const s=TEXT.callout;return {text:fit(x.text,s,b.w-2*s.pad,b.h-2*s.pad,'callout')};}
 if(x.type==='kinetic'){const s=TEXT.kinetic;return {text:fit(x.text,s,b.w-2*s.pad,b.h-2*s.pad,'kinetic text')};}
 if(x.type==='card'){
  const H=TEXT.heading,B=TEXT.body,w=b.w-2*H.pad,inner=b.h-2*H.pad;
  if(x.body===undefined)return {text:fit(x.text,H,w,inner,'card heading')};
  if(x.text===undefined)return {body:fit(x.body,TEXT.quote,w,inner,'card body')};
  // heading at the largest size that leaves the body room at the smallest body size
  for(const size of H.sizes){const lines=wrapText(x.text,size,w,m);if(!lines)continue;const hh=lines.length*size*LINE,body=fitText(x.body,B,w,inner-hh-GAP,m);if(body)return {text:{size,lines,height:hh},body};}
  over('card "'+x.text.slice(0,40)+'" with its body');
 }
 if(x.type==='quote'){const Q=TEXT.pull,C=TEXT.cite,w=b.w-2*Q.pad,inner=b.h-2*Q.pad;
  for(const size of Q.sizes){const lines=wrapText(x.quoted,size,w,m);if(!lines)continue;const hh=lines.length*size*LINE;if(x.cite===undefined){if(hh<=inner)return {text:{size,lines,height:hh}};continue;}
   const cite=fitText(x.cite,C,w,inner-hh-GAP*2,m);if(cite)return {text:{size,lines,height:hh},body:cite};}
  over('quote "'+x.text.slice(0,40)+'"');
 }
 if(x.type==='bullets'){const B=TEXT.bullet,dot=.9,w=b.w-2*B.pad,inner=b.h-2*B.pad;
  for(const size of B.sizes){const ind=size*dot,rows=x.lines.map(s=>wrapText(s,size,w-ind,m));if(rows.some(r=>!r))continue;const hh=rows.reduce((n,r)=>n+r.length*size*LINE,0)+GAP*1.5*(rows.length-1);if(hh<=inner)return {bullets:{size,indent:ind,rows,height:hh}};}
  over('bullets');
 }
 if(x.type==='counter'){const N=TEXT.number,L=TEXT.numberLabel,w=b.w-2*N.pad,inner=b.h-2*N.pad;
  for(const size of N.sizes){const tmpl=counterTemplate(x,m,size);if(m.width(tmpl,size)>w)continue;const hh=size*LINE;if(x.text===undefined){if(hh<=inner)return {number:{size,height:hh,template:tmpl}};continue;}
   const label=fitText(x.text,L,w,inner-hh-GAP,m);if(label)return {number:{size,height:hh,template:tmpl},text:label};}
  over('counter '+formatNumber(x.to,x));
 }
 return null;
}
// Character ranges [a,b) of each emphasis phrase in the normalized text (first occurrence; must exist).
function emphasisRanges(list,texts,q){
 if(list===undefined)return [];
 if(!Array.isArray(list)||list.length<1||list.length>6)fail(q+'.emphasis','1–6 phrases required');
 return list.map((e,k)=>{bad(e,q+'.emphasis['+k+']');const n=norm(e);for(const [field,t] of texts){const a=t.indexOf(n);if(a>=0)return {field,a,b:a+n.length};}fail(q+'.emphasis['+k+']','"'+n.slice(0,30)+'" does not occur in the item text');});
}
// Validates a composition and returns its resolved layout (pixel boxes, wrapped lines, sizes). Pure and deterministic.
// opts.phrases = narration phrase count of the shot (validates phrase anchors when known).
export function layoutComposition(c,p='composition',opts={}){
 if(!c||typeof c!=='object'||Array.isArray(c))fail(p,'object required');
 const v2=c.version===COMPOSE_V2;
 for(const k of Object.keys(c))if(![...['version','region','items'],...(v2?['theme','font']:[])].includes(k))fail(p+'.'+k,'unknown field');
 if(!COMPOSE_VERSIONS.includes(c.version))fail(p+'.version',COMPOSE_VERSIONS.join(' or ')+' required');
 if(!Object.hasOwn(REGIONS,c.region))fail(p+'.region','upper or full required');
 const maxItems=v2?MAX_ITEMS_V2:MAX_ITEMS;
 if(!Array.isArray(c.items)||c.items.length<1||c.items.length>maxItems)fail(p+'.items','1–'+maxItems+' items required');
 if(v2&&c.theme!==undefined&&!Object.hasOwn(THEMES,c.theme))fail(p+'.theme','one of '+Object.keys(THEMES).join(', ')+' required');
 if(v2&&c.font!==undefined&&!FONTS.includes(c.font))fail(p+'.font','one of '+FONTS.join(', ')+' required');
 const region=REGIONS[c.region],ids=new Map(),out=[],tones=THEMES[c.theme??'aether-v1'];
 const phraseOk=(k,qq)=>{if(!Number.isSafeInteger(k)||k<0||k>=(opts.phrases??64))fail(qq,'a narration phrase index of this shot (0–'+((opts.phrases??64)-1)+') required');};
 for(const [i,x] of c.items.entries()){
  const q=p+'.items['+i+']';
  if(!x||typeof x!=='object'||Array.isArray(x))fail(q,'object required');
  const allowed={background:['tone'],title:['text','tone'],card:['text','body','tone'],label:['text','tone'],callout:['text','to','tone'],arrow:['from','to','tone'],shape:['shape','tone'],
   ...(v2?{quote:['text','cite','tone'],bullets:['lines','phrases','tone'],counter:['from','to','decimals','group','prefix','suffix','text','tone'],kinetic:['text','tone']}:{})}[x.type];
  if(!allowed)fail(q+'.type','one of '+(v2?TYPES_V2:TYPES).join(', ')+' required');
  const textual=!['background','arrow','shape'].includes(x.type);
  const extra=v2?['phrase',...(textual?['font','weight','align','emphasis']:[])]:[];
  for(const k of Object.keys(x))if(!['id','type','box','start','end','reveal',...allowed,...extra].includes(k))fail(q+'.'+k,'unknown field for '+x.type);
  if(typeof x.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,23}$/.test(x.id)||ids.has(x.id))fail(q+'.id','unique safe ID required');
  const start=x.start??0,end=x.end??1;
  for(const [k,v] of [['start',start],['end',end]])if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)fail(q+'.'+k,'0–1 required');
  if(start>=end)fail(q,'invalid window');
  if(x.phrase!==undefined){phraseOk(x.phrase,q+'.phrase');if(x.start!==undefined)fail(q+'.phrase','use phrase or start, not both');}
  if(x.reveal!==undefined&&!REVEALS.includes(x.reveal))fail(q+'.reveal','one of '+REVEALS.join(', ')+' required');
  if(x.tone!==undefined&&!Object.hasOwn(tones,x.tone))fail(q+'.tone','one of '+Object.keys(tones).join(', ')+' required');
  if(x.font!==undefined&&!FONTS.includes(x.font))fail(q+'.font','one of '+FONTS.join(', ')+' required');
  if(x.weight!==undefined&&!WEIGHTS.includes(x.weight))fail(q+'.weight','400 or 700 required');
  if(x.align!==undefined&&!ALIGNS.includes(x.align))fail(q+'.align','left, center or right required');
  if(x.type==='background'&&i!==0)fail(q,'a background must be the first item');
  let box=null;
  if(x.type!=='arrow'){
   if(x.type==='background'&&x.box===undefined)box=[0,0,1,1];
   else{if(!Array.isArray(x.box)||x.box.length!==4||x.box.some(v=>typeof v!=='number'||!Number.isFinite(v)))fail(q+'.box','[x,y,w,h] required');box=x.box;
    if(box[0]<0||box[1]<0||box[2]<=0||box[3]<=0||box[0]+box[2]>1+1e-9||box[1]+box[3]>1+1e-9)fail(q+'.box','must lie inside the '+c.region+' region (0–1)');}
  }else if(x.box!==undefined)fail(q+'.box','arrows use from and to');
  if(x.type==='card'&&x.text===undefined&&x.body===undefined)fail(q,'a card needs text, body or both');
  const maxOf={title:TEXT.title.max,card:TEXT.heading.max,label:TEXT.label.max,callout:TEXT.callout.max,quote:TEXT.pull.max,counter:TEXT.numberLabel.max,kinetic:TEXT.kinetic.max};
  for(const k of ['text','body','cite'])if(x[k]!==undefined||(k==='text'&&['title','label','callout','quote','kinetic'].includes(x.type))){bad(x[k],q+'.'+k);const max=k==='body'?TEXT.body.max:k==='cite'?TEXT.cite.max:maxOf[x.type];if(x[k].length>max)fail(q+'.'+k,'at most '+max+' characters');}
  if(x.type==='bullets'){if(!Array.isArray(x.lines)||x.lines.length<2||x.lines.length>6)fail(q+'.lines','2–6 lines required');x.lines.forEach((s,k)=>{bad(s,q+'.lines['+k+']');if(s.length>TEXT.bullet.max)fail(q+'.lines['+k+']','at most '+TEXT.bullet.max+' characters');});
   if(x.phrases!==undefined){if(!Array.isArray(x.phrases)||x.phrases.length!==x.lines.length)fail(q+'.phrases','one phrase index per line required');x.phrases.forEach((k,j)=>{phraseOk(k,q+'.phrases['+j+']');if(j&&k<x.phrases[j-1])fail(q+'.phrases','must not go backwards');});if(x.phrase!==undefined||x.start!==undefined)fail(q+'.phrases','use phrases alone');}}
  if(x.type==='counter'){for(const k of ['from','to']){if(typeof x[k]!=='number'||!Number.isFinite(x[k])||Math.abs(x[k])>1e12)fail(q+'.'+k,'finite number within ±1e12 required');}
   if(x.decimals!==undefined&&(!Number.isSafeInteger(x.decimals)||x.decimals<0||x.decimals>3))fail(q+'.decimals','0–3 required');if(x.group!==undefined&&typeof x.group!=='boolean')fail(q+'.group','true or false required');
   for(const k of ['prefix','suffix'])if(x[k]!==undefined){bad(x[k],q+'.'+k);if(x[k].length>12)fail(q+'.'+k,'at most 12 characters');}}
  if(x.type==='shape'&&!SHAPES.includes(x.shape))fail(q+'.shape','one of '+SHAPES.join(', ')+' required');
  const b=box?px(region,box):null;
  if(b&&x.type!=='background'&&(b.w<24||b.h<24))fail(q+'.box','at least 24×24 px');
  // fonts: compose-v1 is Arial Bold (no coverage check, as accepted in DUAL-01); compose-v2 checks every character
  const font=x.font??c.font??'arial',weight=x.weight??(['quote','bullets'].includes(x.type)||(x.type==='card'&&x.text===undefined)?400:700),m=v2?measurer(font,weight):ARIAL;
  const fields={};for(const k of ['text','body','cite'])if(typeof x[k]==='string')fields[k]=norm(x[k]);if(x.type==='bullets')x.lines.forEach((s,k)=>{fields['line'+k]=norm(s);});
  if(x.type==='counter'){fields.fromValue=formatNumber(x.from,x);fields.toValue=formatNumber(x.to,x);}
  if(v2)for(const [k,s] of Object.entries(fields)){const miss=missingGlyphs(s,m);if(miss.length)fail(q+'.'+k,'missing glyphs in '+fontChain(font).join(' → ')+': '+miss.slice(0,8).join(', ')+(font==='arial'?' (Arial accepts ASCII only in compose-v2; choose a bundled font)':''));}
  const quoted=x.type==='quote'?(m.covers('“')&&m.covers('”')?'“'+fields.text+'”':'"'+fields.text+'"'):null;
  const laid=b?layoutItem(v2?{...x,...fields,lines:x.type==='bullets'?x.lines.map(norm):x.lines,quoted}:x,b,q,m):{};
  const emphasis=v2&&x.emphasis!==undefined?emphasisRanges(x.emphasis,Object.entries(x.type==='quote'?{text:quoted}:fields).filter(([k])=>!['fromValue','toValue'].includes(k)),q):[];
  const align=x.align??(['card','quote','bullets'].includes(x.type)?'left':'center');
  const item={id:x.id,type:x.type,start,end,reveal:x.reveal??'fade',tone:tones[x.tone??(x.type==='title'?'accent':'neutral')],box:b,...laid,
   ...(v2?{font,weight,align,emphasis,...(x.phrase!==undefined?{phrase:x.phrase}:{}),...(x.type==='bullets'&&x.phrases?{phrases:[...x.phrases]}:{}),...(quoted?{quoted}:{}),...(x.type==='counter'?{counter:{from:x.from,to:x.to,decimals:x.decimals??0,group:x.group??true,prefix:x.prefix??'',suffix:x.suffix??''}}:{})}:{})};
  if(x.type==='callout'){point(x.to,q+'.to');item.to=[region.x+x.to[0]*region.w,region.y+x.to[1]*region.h];if(item.to[0]>=b.x&&item.to[0]<=b.x+b.w&&item.to[1]>=b.y&&item.to[1]<=b.y+b.h)fail(q+'.to','must point outside its own box');}
  if(x.type==='arrow'){
   const endOf=(v,k)=>{if(typeof v==='string'){const t=ids.get(v);if(!t||!t.box||t.type==='background')fail(q+'.'+k,'an earlier boxed item ID or [x,y] required');if(!windowsMeet(t,{start,end}))fail(q+'.'+k,'target is not on screen during the arrow');return {ref:v};}point(v,q+'.'+k);return {at:[region.x+v[0]*region.w,region.y+v[1]*region.h]};};
   item.from=endOf(x.from,'from');item.to=endOf(x.to,'to');if(x.from===x.to&&typeof x.from==='string')fail(q,'arrow needs two different ends');
  }
  ids.set(x.id,item);out.push(item);
 }
 // arrows between boxes: edge to edge along the line between the box centres
 for(const a of out)if(a.type==='arrow'){
  const ref=e=>e.ref?ids.get(e.ref).box:null,A=ref(a.from),B=ref(a.to),pa=A?center(A):a.from.at,pb=B?center(B):a.to.at;
  const clip=(box,from,to)=>{if(!box)return from;const [cx,cy]=from,dx=to[0]-cx,dy=to[1]-cy,t=Math.min(Math.abs(dx)>1e-9?box.w/2/Math.abs(dx):Infinity,Math.abs(dy)>1e-9?box.h/2/Math.abs(dy):Infinity);return [cx+dx*Math.min(1,t),cy+dy*Math.min(1,t)];};
  a.line=[clip(A,pa,pb),clip(B,pb,pa)];
  if(Math.hypot(a.line[1][0]-a.line[0][0],a.line[1][1]-a.line[0][1])<24)fail(p+'.items '+a.id,'arrow shorter than 24 px; move its ends apart');
 }
 // boxed items visible at the same time must not overlap (backgrounds and shapes may sit under text items); a
 // phrase-anchored item may start at any time, so it is treated as on screen from the start of the shot
 const solid=out.filter(x=>x.box&&!['background','shape','arrow'].includes(x.type)),win=x=>x.phrase!==undefined||x.phrases?{start:0,end:x.end}:x;
 for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)if(windowsMeet(win(solid[i]),win(solid[j]))&&overlap(solid[i].box,solid[j].box))fail(p,'items '+solid[i].id+' and '+solid[j].id+' overlap while both are on screen');
 return {version:c.version,region:c.region,rect:region,items:out};
}
export const validateComposition=(c,p,opts)=>{layoutComposition(c,p,opts);};
// Phrase windows of a shot as progress [start,end] pairs. Measured when the timeline shot has one segment per
// narration phrase; otherwise an even split (estimated, labelled by `estimated:true`).
export function phraseWindows(timelineShot,count){
 const n=Math.max(1,(timelineShot?.endFrame??1)-(timelineShot?.startFrame??0)),segs=timelineShot?.segments;
 if(Array.isArray(segs)&&segs.length===count&&count>0){const w=segs.map(s=>[Math.min(1,Math.max(0,(s.startSample/1600-timelineShot.startFrame)/Math.max(1,n-1))),Math.min(1,Math.max(0,(s.endSample/1600-timelineShot.startFrame)/Math.max(1,n-1)))]);w.estimated=false;return w;}
 const c=Math.max(1,count),w=Array.from({length:c},(_,k)=>[k/c,(k+1)/c]);w.estimated=true;return w;
}
// Start of an item (or of bullet j) in shot progress, given the phrase windows.
export function itemStart(x,phrases,j=null){if(j!==null&&x.phrases)return phrases?.[x.phrases[j]]?.[0]??x.start;if(x.phrase!==undefined)return phrases?.[x.phrase]?.[0]??x.start;return x.start;}
// Pixel rectangles of the text plates visible at shot progress p (for the composition-cover check).
export function compositionPlates(layout,p,phrases=null){return layout.items.filter(x=>x.box&&x.type!=='background'&&x.type!=='shape'&&p>=(x.phrases?itemStart(x,phrases,0):itemStart(x,phrases))&&p<=x.end).map(x=>({id:x.id,...x.box}));}
// WCAG relative-luminance contrast ratio of two #rrggbb colours.
export function contrast(a,b){const L=h=>{const [r,g,bl]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*bl;};const [x,y]=[L(a),L(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05);}
