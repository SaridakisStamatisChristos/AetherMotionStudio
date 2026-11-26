// DUAL-01 shared composition, version 'compose-v1' (opt-in shot field `composition`; absent = unchanged output).
// Declarative 2D visual aids drawn by the shared 2D overlay path (src/visual/draw-composition.js, called from
// drawGraph after the world pass) on both backends, so content and placement are identical on CPU and Three.js.
// Everything here is deterministic and font-metric free: text is wrapped with a fixed Arial-Bold advance table, so the
// validator, the Director and both renderers agree on line breaks and sizes. Text that cannot fit its box at the
// smallest allowed size is rejected with an explicit diagnostic; it is never truncated or squeezed.
// Coordinates: the 720×1280 logical canvas every renderer uses. Regions stay inside the Reels-safe area
// (src/core/reels-layout.js: x 40–640, y 147–1000) and above the caption boxes (normal and Reels, two lines).
export const COMPOSE_VERSION='compose-v1';
export const REGIONS=Object.freeze({
 // the clean top of a 9:16 frame: above characters' heads at the medium framings the Director uses
 upper:Object.freeze({x:48,y:150,w:584,h:240}),
 // the whole safe picture area above the captions (for shots whose world is only a backdrop or small props)
 full:Object.freeze({x:48,y:150,w:584,h:700})
});
export const TYPES=Object.freeze(['background','title','card','label','callout','arrow','shape']);
export const REVEALS=Object.freeze(['fade','slide','wipe','pop','none']);
export const SHAPES=Object.freeze(['circle','ring','rect']);
// Theme 'aether-v1' tones: opaque plate colours with text contrast >= 4.5:1 (tests/composition.test.js checks WCAG).
export const TONES=Object.freeze({
 neutral:Object.freeze({fill:'#0b1724',edge:'#5f7d92',text:'#f5f7f5',sub:'#c4d4de',mark:'#6de6e3'}),
 accent:Object.freeze({fill:'#0f2c38',edge:'#6de6e3',text:'#f5fbfb',sub:'#bfe9ea',mark:'#6de6e3'}),
 warm:Object.freeze({fill:'#2e1c12',edge:'#ffd17a',text:'#fff6e6',sub:'#f3d9b0',mark:'#ffd17a'}),
 cool:Object.freeze({fill:'#151a36',edge:'#a9b5ff',text:'#f3f4ff',sub:'#cfd5ff',mark:'#a9b5ff'})
});
// Font sizes (logical px) tried from largest to smallest; line height = 1.22 × size; inner padding per type.
export const TEXT=Object.freeze({
 title:Object.freeze({sizes:[44,40,36,32,28],pad:18,max:60}),
 heading:Object.freeze({sizes:[30,28,26,24,22],pad:18,max:48}),
 body:Object.freeze({sizes:[24,22,20,18],pad:18,max:160}),
 label:Object.freeze({sizes:[22,20,18],pad:12,max:40}),
 callout:Object.freeze({sizes:[22,20,18],pad:14,max:100})
});
export const LINE=1.22,GAP=8,FONT='Arial',WEIGHT=700;
export const MAX_ITEMS=6,REVEAL_SECONDS=.5;
// Arial Bold advance widths per 1000 em (metric-compatible with Helvetica-Bold); unknown characters use the widest
// common advance so estimates stay conservative.
const ADV={' ':278,'!':333,'"':474,'#':556,'$':556,'%':889,'&':722,"'":238,'(':333,')':333,'*':389,'+':584,',':278,'-':333,'.':278,'/':278,':':333,';':333,'<':584,'=':584,'>':584,'?':611,'@':975,'[':333,']':333,'_':556,'0':556,'1':556,'2':556,'3':556,'4':556,'5':556,'6':556,'7':556,'8':556,'9':556,
 A:722,B:722,C:722,D:722,E:667,F:611,G:778,H:722,I:278,J:556,K:722,L:611,M:833,N:722,O:778,P:667,Q:778,R:722,S:667,T:611,U:722,V:667,W:944,X:667,Y:667,Z:611,
 a:556,b:611,c:556,d:611,e:556,f:333,g:611,h:611,i:278,j:278,k:556,l:278,m:889,n:611,o:611,p:611,q:611,r:389,s:556,t:333,u:611,v:556,w:778,x:556,y:556,z:500};
export const textWidth=(s,size)=>{let n=0;for(const c of s)n+=ADV[c]??833;return n*size/1000;};
const fail=(p,m)=>{throw Error(p+': '+m)};
const bad=(x,p)=>{if(typeof x!=='string'||!x.trim()||/[\u0000-\u001f\u007f-\u009f]/.test(x))fail(p,'printable text required');};
// Greedy word wrap at one size. Returns null when a single word is wider than the line.
export function wrapText(s,size,width){
 const lines=[];let line='';
 for(const word of s.trim().split(/\s+/)){if(textWidth(word,size)>width)return null;const next=line?line+' '+word:word;if(line&&textWidth(next,size)>width){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);return lines;
}
// Largest size whose wrapped text fits width × height; null when none fits.
export function fitText(s,spec,width,height){
 for(const size of spec.sizes){const lines=wrapText(s,size,width);if(lines&&lines.length*size*LINE<=height)return {size,lines,height:lines.length*size*LINE};}
 return null;
}
const px=(region,box)=>({x:region.x+box[0]*region.w,y:region.y+box[1]*region.h,w:box[2]*region.w,h:box[3]*region.h});
const center=b=>[b.x+b.w/2,b.y+b.h/2];
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
const windowsMeet=(a,b)=>(a.start??0)<(b.end??1)&&(b.start??0)<(a.end??1);
function point(v,p){if(!Array.isArray(v)||v.length!==2)fail(p,'[x,y] in 0–1 required');v.forEach((n,i)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)fail(p+'['+i+']','0–1 required');});}
// Text layout of one text item inside its pixel box (null for items without text). Throws on overflow.
function layoutItem(x,b,q){
 const fit=(s,spec,w,h,what)=>{const r=fitText(s,spec,w,h);if(!r)fail(q,'text overflow: '+what+' "'+s.slice(0,40)+(s.length>40?'…':'')+'" does not fit a '+Math.round(w)+'×'+Math.round(h)+' px box at '+spec.sizes.at(-1)+' px; shorten it or enlarge the box');return r;};
 if(x.type==='title'){const s=TEXT.title;return {text:fit(x.text,s,b.w-2*s.pad,b.h-2*s.pad,'title')};}
 if(x.type==='label'){const s=TEXT.label;return {text:fit(x.text,s,b.w-2*s.pad,b.h-2*s.pad,'label')};}
 if(x.type==='callout'){const s=TEXT.callout;return {text:fit(x.text,s,b.w-2*s.pad,b.h-2*s.pad,'callout')};}
 if(x.type==='card'){
  const H=TEXT.heading,B=TEXT.body,w=b.w-2*H.pad,inner=b.h-2*H.pad;
  if(x.body===undefined)return {text:fit(x.text,H,w,inner,'card heading')};
  if(x.text===undefined)return {body:fit(x.body,B,w,inner,'card body')};
  // heading at the largest size that leaves the body room at the smallest body size
  for(const size of H.sizes){const lines=wrapText(x.text,size,w);if(!lines)continue;const hh=lines.length*size*LINE,body=fitText(x.body,B,w,inner-hh-GAP);if(body)return {text:{size,lines,height:hh},body};}
  fail(q,'text overflow: card "'+x.text.slice(0,40)+'" with its body does not fit a '+Math.round(b.w)+'×'+Math.round(b.h)+' px box at the smallest sizes; shorten it or enlarge the box');
 }
 return null;
}
// Validates a composition and returns its resolved layout (pixel boxes, wrapped lines, sizes). Pure and deterministic.
export function layoutComposition(c,p='composition'){
 if(!c||typeof c!=='object'||Array.isArray(c))fail(p,'object required');
 for(const k of Object.keys(c))if(!['version','region','items'].includes(k))fail(p+'.'+k,'unknown field');
 if(c.version!==COMPOSE_VERSION)fail(p+'.version',COMPOSE_VERSION+' required');
 if(!Object.hasOwn(REGIONS,c.region))fail(p+'.region','upper or full required');
 if(!Array.isArray(c.items)||c.items.length<1||c.items.length>MAX_ITEMS)fail(p+'.items','1–'+MAX_ITEMS+' items required');
 const region=REGIONS[c.region],ids=new Map(),out=[];
 for(const [i,x] of c.items.entries()){
  const q=p+'.items['+i+']';
  if(!x||typeof x!=='object'||Array.isArray(x))fail(q,'object required');
  const allowed={background:['tone'],title:['text','tone'],card:['text','body','tone'],label:['text','tone'],callout:['text','to','tone'],arrow:['from','to','tone'],shape:['shape','tone']}[x.type];
  if(!allowed)fail(q+'.type','one of '+TYPES.join(', ')+' required');
  for(const k of Object.keys(x))if(!['id','type','box','start','end','reveal',...allowed].includes(k))fail(q+'.'+k,'unknown field for '+x.type);
  if(typeof x.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,23}$/.test(x.id)||ids.has(x.id))fail(q+'.id','unique safe ID required');
  const start=x.start??0,end=x.end??1;
  for(const [k,v] of [['start',start],['end',end]])if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)fail(q+'.'+k,'0–1 required');
  if(start>=end)fail(q,'invalid window');
  if(x.reveal!==undefined&&!REVEALS.includes(x.reveal))fail(q+'.reveal','one of '+REVEALS.join(', ')+' required');
  if(x.tone!==undefined&&!Object.hasOwn(TONES,x.tone))fail(q+'.tone','one of '+Object.keys(TONES).join(', ')+' required');
  if(x.type==='background'&&i!==0)fail(q,'a background must be the first item');
  let box=null;
  if(x.type!=='arrow'){
   if(x.type==='background'&&x.box===undefined)box=[0,0,1,1];
   else{if(!Array.isArray(x.box)||x.box.length!==4||x.box.some(v=>typeof v!=='number'||!Number.isFinite(v)))fail(q+'.box','[x,y,w,h] required');box=x.box;
    if(box[0]<0||box[1]<0||box[2]<=0||box[3]<=0||box[0]+box[2]>1+1e-9||box[1]+box[3]>1+1e-9)fail(q+'.box','must lie inside the '+c.region+' region (0–1)');}
  }else if(x.box!==undefined)fail(q+'.box','arrows use from and to');
  if(x.type==='card'&&x.text===undefined&&x.body===undefined)fail(q,'a card needs text, body or both');
  for(const k of ['text','body'])if(x[k]!==undefined||(k==='text'&&['title','label','callout'].includes(x.type))){bad(x[k],q+'.'+k);const max=k==='body'?TEXT.body.max:TEXT[x.type==='card'?'heading':x.type].max;if(x[k].length>max)fail(q+'.'+k,'at most '+max+' characters');}
  if(x.type==='shape'&&!SHAPES.includes(x.shape))fail(q+'.shape','one of '+SHAPES.join(', ')+' required');
  const b=box?px(region,box):null;
  if(b&&x.type!=='background'&&(b.w<24||b.h<24))fail(q+'.box','at least 24×24 px');
  const item={id:x.id,type:x.type,start,end,reveal:x.reveal??'fade',tone:TONES[x.tone??(x.type==='title'?'accent':'neutral')],box:b,...(b?layoutItem(x,b,q):{})};
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
 // boxed items visible at the same time must not overlap (backgrounds and shapes may sit under text items)
 const solid=out.filter(x=>x.box&&['title','card','label','callout'].includes(x.type));
 for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)if(windowsMeet(solid[i],solid[j])&&overlap(solid[i].box,solid[j].box))fail(p,'items '+solid[i].id+' and '+solid[j].id+' overlap while both are on screen');
 return {version:COMPOSE_VERSION,region:c.region,rect:region,items:out};
}
export const validateComposition=(c,p)=>{layoutComposition(c,p);};
// Pixel rectangles of the text plates visible at shot progress p (for the composition-cover check).
export function compositionPlates(layout,p){return layout.items.filter(x=>x.box&&x.type!=='background'&&x.type!=='shape'&&p>=x.start&&p<=x.end).map(x=>({id:x.id,...x.box}));}
// WCAG relative-luminance contrast ratio of two #rrggbb colours.
export function contrast(a,b){const L=h=>{const [r,g,bl]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*bl;};const [x,y]=[L(a),L(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05);}
