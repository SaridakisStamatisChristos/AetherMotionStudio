// DUAL-02 typography: bundled fonts, compose-v2, zero-asset typography shots and the typography-v1 Director mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {layoutComposition,validateComposition,measurer,missingGlyphs,fontChain,formatNumber,phraseWindows,itemStart,THEMES,contrast,FONTS,LINE} from '../src/core/composition.js';
import {FONT_METRICS} from '../src/core/font-metrics.js';
import {sceneFontFaces} from '../src/visual/fonts.js';
import {drawComposition} from '../src/visual/draw-composition.js';
import {validateProject} from '../src/core/timeline.js';
import {direct} from '../src/director/index.js';
import {request} from '../src/director/schema.js';
import {findNumber,findList} from '../src/director/aids.js';

const V2=(items,extra={})=>({version:'compose-v2',region:'full',font:'inter',items,...extra});
const lock=JSON.parse(readFileSync(new URL('../public/fonts/fonts.lock.json',import.meta.url),'utf8'));

test('bundled fonts: files match the lock, carry the OFL, and the generated metrics are current',()=>{
 for(const [id,f] of Object.entries(lock.fonts)){
  assert.equal(f.licence,'OFL-1.1');
  assert.match(readFileSync(new URL('../public/fonts/'+id+'/OFL.txt',import.meta.url),'utf8'),/SIL Open Font License/);
  for(const file of Object.values(f.files))assert.equal(createHash('sha256').update(readFileSync(new URL('../public/fonts/'+file.path,import.meta.url))).digest('hex'),file.sha256,file.path);
 }
 const r=spawnSync(process.execPath,['scripts/font-metrics.mjs','--check'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr+r.stdout);
 assert.deepEqual(FONTS,['arial','inter','merriweather','jetbrains-mono','noto-sans']);
});

test('measurers: fallback chain covers Greek and Cyrillic; missing glyphs are named; monospace is uniform',()=>{
 assert.deepEqual(fontChain('merriweather'),['merriweather','noto-sans','inter']);assert.deepEqual(fontChain('arial'),['arial']);
 const m=measurer('merriweather',700);assert.deepEqual(missingGlyphs('Εύρηκα Привет café → √',m),[]);
 assert.deepEqual(missingGlyphs('rocket 🚀',m),['🚀 (U+1F680)']);
 assert.deepEqual(missingGlyphs('café',measurer('arial',700)),['é (U+00E9)']);
 const j=measurer('jetbrains-mono',400);assert.equal(j.width('iiii',10),j.width('MMMM',10));
 assert.ok(measurer('inter',700).width('Hello',30)>measurer('inter',400).width('Hello',30));
});

test('compose-v2 rejects hostile, missing-glyph, overflowing and malformed typography with explicit messages',()=>{
 const card={id:'c',type:'card',box:[0,0,1,.3],text:'Heading',body:'A body line.'};
 const bad=(c,re,o)=>assert.throws(()=>validateComposition(c,'c',o),re);
 bad(V2([card],{theme:'neon'}),/one of aether-v1, paper-v1/);bad(V2([card],{font:'comic'}),/one of arial, inter/);
 bad(V2([{...card,weight:900}]),/400 or 700/);bad(V2([{...card,align:'justify'}]),/left, center or right/);
 bad(V2([{...card,emphasis:['absent words']}]),/does not occur/);bad(V2([{...card,emphasis:Array(7).fill('Heading')}]),/1–6 phrases/);
 bad(V2([{...card,text:'Launch 🚀'}]),/missing glyphs in inter → noto-sans: 🚀 \(U\+1F680\)/);
 bad(V2([{...card,text:'Café'}],{font:'arial'}),/Arial accepts ASCII only/);
 bad(V2([{...card,text:'abc\u202edef'}]),/printable/);bad(V2([{...card,text:'a\u200bb'}]),/printable/);bad(V2([{...card,text:'a\u2028b'}]),/printable/);
 bad(V2([{id:'b',type:'bullets',box:[0,0,1,.5],lines:['only one']}]),/2–6 lines/);bad(V2([{id:'b',type:'bullets',box:[0,0,1,.5],lines:Array(7).fill('x')}]),/2–6 lines/);
 bad(V2([{id:'b',type:'bullets',box:[0,0,1,.5],lines:['a','b'],phrases:[0]}]),/one phrase index per line/);
 bad(V2([{id:'b',type:'bullets',box:[0,0,1,.5],lines:['a','b'],phrases:[1,0]}]),/must not go backwards/);
 bad(V2([{...card,phrase:3}]),/phrase index of this shot \(0–1\)/,{phrases:2});bad(V2([{...card,phrase:0,start:.2}]),/phrase or start, not both/);bad(V2([{...card,phrase:-1}]),/phrase index/);
 for(const v of [NaN,Infinity,1e13,'5'])bad(V2([{id:'n',type:'counter',box:[0,0,1,.4],from:0,to:v}]),/finite number within ±1e12/);
 bad(V2([{id:'n',type:'counter',box:[0,0,1,.4],from:0,to:5,decimals:4}]),/0–3/);bad(V2([{id:'n',type:'counter',box:[0,0,1,.4],from:0,to:5,prefix:'x'.repeat(13)}]),/at most 12/);
 bad(V2([{id:'n',type:'counter',box:[0,0,.2,.1],from:0,to:123456789}]),/text overflow: counter 123,456,789/);
 bad(V2([{id:'k',type:'kinetic',box:[0,0,1,.5],text:'x'.repeat(141)}]),/at most 140/);bad(V2([{id:'q',type:'quote',box:[0,0,1,.5],text:'y '.repeat(111)}]),/at most 220/);
 bad(V2([{id:'k',type:'kinetic',box:[0,0,.3,.1],text:'A sentence much too long for this little box'}]),/text overflow: kinetic text/);
 bad(V2([{id:'s',type:'shape',shape:'ring',box:[0,0,.2,.2],font:'inter'}]),/unknown field for shape/);
 bad({version:'compose-v1',region:'full',items:[{id:'q',type:'quote',box:[0,0,1,.5],text:'Hi'}]},/one of background/);
});

test('compose-v2 layout: lines fit their boxes in the chosen font; emphasis and quotes resolve; deterministic',()=>{
 const c=V2([{id:'q',type:'quote',box:[0,0,1,.5],text:'The best time to plant a tree was twenty years ago.',cite:'Proverb',emphasis:['plant a tree']},
  {id:'b',type:'bullets',box:[0,.55,1,.45],lines:['Trunks store carbon','Roots hold soil','Leaves catch dust'],font:'merriweather',emphasis:['Roots']}]);
 const L=layoutComposition(c),M=layoutComposition(structuredClone(c));assert.deepEqual(L,M);
 const [q,b]=L.items,mq=measurer('inter',400);
 assert.equal(q.quoted,'“The best time to plant a tree was twenty years ago.”');
 for(const s of q.text.lines)assert.ok(mq.width(s,q.text.size)<=q.box.w-48,s);
 assert.equal(q.text.lines.join(' '),q.quoted);
 assert.deepEqual(q.emphasis.map(r=>q.quoted.slice(r.a,r.b)),['plant a tree']);
 const mb=measurer('merriweather',400);for(const row of b.bullets.rows)for(const s of row)assert.ok(mb.width(s,b.bullets.size)<=b.box.w-40-b.bullets.indent);
 assert.ok(b.bullets.height<=b.box.h-40);assert.equal(b.emphasis[0].field,'line1');
});

test('counters: deterministic formatting, and the reserved width holds every value on the way',()=>{
 assert.equal(formatNumber(1234567.891,{decimals:2}),'1,234,567.89');assert.equal(formatNumber(-0.0001,{decimals:2}),'0.00');
 assert.equal(formatNumber(-42,{prefix:'$'}),'-$42');assert.equal(formatNumber(12345,{group:false,suffix:' km'}),'12345 km');
 const L=layoutComposition(V2([{id:'n',type:'counter',box:[0,0,1,.3],from:0,to:1000,suffix:' trees'}])),n=L.items[0],m=measurer('inter',700);
 const room=m.width(n.number.template,n.number.size);for(let k=0;k<=1000;k++)assert.ok(m.width(formatNumber(k,n.counter),n.number.size)<=room+1e-9,String(k));
});

test('phrase windows are measured when the timeline has one segment per phrase, else estimated and labelled',()=>{
 const ts={startFrame:100,endFrame:201,segments:[{startSample:110*1600,endSample:150*1600},{startSample:160*1600,endSample:190*1600}]};
 const w=phraseWindows(ts,2);assert.equal(w.estimated,false);assert.deepEqual([...w].map(x=>x.map(v=>Math.round(v*1e6)/1e6)),[[.1,.5],[.6,.9]]);
 const e=phraseWindows({startFrame:0,endFrame:90,segments:[]},3);assert.equal(e.estimated,true);assert.deepEqual(e.map(x=>x[0]),[0,1/3,2/3]);
 assert.equal(itemStart({phrase:1,start:0},w),.6);assert.equal(itemStart({start:.25},w),.25);assert.equal(itemStart({phrases:[0,1],start:0},w,1),.6);
});

test('themes: paper-v1 and aether-v1 keep text, sub and emphasis colours at least 4.5:1',()=>{
 for(const [name,tones] of Object.entries(THEMES))for(const [tone,t] of Object.entries(tones))for(const k of ['text','sub','mark'])assert.ok(contrast(t[k],t.fill)>=4.5,name+'.'+tone+'.'+k+' '+contrast(t[k],t.fill).toFixed(2));
});

test('scenes load exactly the bundled faces their compose-v2 compositions use (with fallbacks)',()=>{
 const shot=c=>({composition:c});
 assert.deepEqual(sceneFontFaces({version:2,shots:[shot({version:'compose-v1',region:'upper',items:[]})]}),[]);
 assert.deepEqual(sceneFontFaces({version:2,shots:[shot(V2([],{font:'arial'}))]}),[]);
 const faces=sceneFontFaces({version:2,shots:[shot(V2([{id:'a',type:'label',box:[0,0,.5,.2],text:'x',font:'jetbrains-mono'}],{font:'arial'}))]});
 assert.deepEqual(faces.map(f=>f.font+':'+f.weight),['inter:400','inter:700','jetbrains-mono:400','jetbrains-mono:700','noto-sans:400','noto-sans:700']);
 for(const f of faces){assert.ok(existsSync(new URL('../public/'+f.path,import.meta.url)));assert.equal(f.sha256,FONT_METRICS.fonts[f.font].faces[f.weight].sha256);}
});

test('typography shots may have no 3D asset only with a compose-v2 composition and no framed subject',()=>{
 const base={id:'s1',template:'cinematic-graph',backend:'three',durationFrames:90,transitionFrames:0,narration:['Words.'],heading:'H',subheading:'S',environment:'midnight',camera:{},cameraRig:{preset:'establishing'},assets:[],effects:[]};
 const P=s=>({version:2,id:'p',title:'T',voice:'af_heart',shots:[s]});
 validateProject(P({...base,composition:V2([{id:'k',type:'kinetic',box:[0,0,1,.5],text:'Words matter'}])}));
 assert.throws(()=>validateProject(P(base)),/1–8 assets required/);
 assert.throws(()=>validateProject(P({...base,composition:{version:'compose-v1',region:'full',items:[{id:'t',type:'title',box:[0,0,1,.3],text:'Hi'}]}})),/1–8 assets required/);
 assert.throws(()=>validateProject(P({...base,cameraRig:{preset:'establishing',subject:'x'},composition:V2([{id:'k',type:'kinetic',box:[0,0,1,.5],text:'Words'}])})),/no subject to frame/);
});

test('drawComposition v2: words appear one by one, emphasis uses the mark colour, counters end exactly',()=>{
 const calls=[];let fill='';const ctx=new Proxy({},{get:(o,k)=>k==='measureText'?(s=>({width:s.length*10})):k in o?o[k]:(...a)=>{if(k==='fillText')calls.push([a[0],fill]);},set:(o,k,v)=>{if(k==='fillStyle')fill=v;o[k]=v;return true;}});
 const c=V2([{id:'k',type:'kinetic',box:[0,0,1,.4],text:'Trees clean the air',emphasis:['clean'],reveal:'none'},{id:'n',type:'counter',box:[0,.5,1,.3],from:0,to:31,suffix:'%',start:.5,reveal:'none'}]);
 const words=p=>{calls.length=0;drawComposition(ctx,c,p,300);return calls.filter(([s])=>/[a-z]/i.test(s)).map(([s])=>s);};
 assert.deepEqual(words(0),[]);assert.ok(words(.2).length>=1);assert.deepEqual(words(.95),['Trees','clean','the','air']);
 calls.length=0;drawComposition(ctx,c,.95,300);const t=THEMES['aether-v1'].neutral;
 assert.equal(calls.find(([s])=>s==='clean')[1],t.mark);assert.equal(calls.find(([s])=>s==='Trees')[1],t.text);
 assert.ok(calls.some(([s])=>s==='31%'));
});

test('findNumber reads numbers verbatim, keeps scale words, skips bare years',()=>{
 assert.deepEqual(findNumber('There are roughly 3 trillion trees on the planet.'),{value:3,decimals:0,prefix:'',suffix:' trillion',label:'trees',sentence:'There are roughly 3 trillion trees on the planet.'});
 assert.equal(findNumber('Forests cover about 31 percent of the land on Earth.').label,'of the land');
 assert.equal(findNumber('A tree can release 100 kilograms of oxygen in a year.').label,'kilograms of oxygen');
 assert.deepEqual((({value,prefix,decimals})=>({value,prefix,decimals}))(findNumber('It costs $1,250.50 today.')),{value:1250.5,prefix:'$',decimals:2});
 assert.equal(findNumber('In 1990 it rained.'),null);assert.equal(findNumber('No numbers here.'),null);
});

const SCRIPT='Forests cover about 31 percent of the land on Earth. There are roughly 3 trillion trees on the planet. Trees take in carbon dioxide through tiny pores in their leaves. Sunlight turns that carbon into sugar and wood. Much of it stays in trunks, roots and forest soil, sometimes for centuries. A single large tree can release 100 kilograms of oxygen in a year. A whole forest works like a giant living filter. So protecting forests means cleaner air for everyone.';
test('typography-v1: no 3D assets, compose-v2 in the chosen font, every word and number taken from the script',async()=>{
 const r=await direct({version:1,id:'dual-test-typo',topic:'Why forests matter for clean air',seconds:45,voice:'af_bella',content:'typography-v1',font:'merriweather',theme:'paper-v1',script:SCRIPT});
 const source=(SCRIPT+' '+r.ir.title+' '+r.ir.shots.map(s=>s.heading).join(' ')).toLowerCase();
 for(const s of r.project.shots){
  assert.equal(s.assets.length,0);assert.deepEqual(s.effects,[]);assert.equal(s.cameraRig.subject,undefined);
  assert.equal(s.composition.version,'compose-v2');assert.equal(s.composition.font,'merriweather');assert.equal(s.composition.theme,'paper-v1');
  for(const x of s.composition.items){
   for(const t of [x.text,...(x.lines??[])].filter(Boolean))assert.ok(source.includes(t.toLowerCase()),'invented: '+t);
   if(x.type==='counter')assert.ok(source.includes(String(x.to)+(x.suffix??'').toLowerCase()),'number not in script: '+x.to);
  }
 }
 assert.ok(r.manifest.aids.kinds.includes('counter'));
 assert.throws(()=>request({version:1,id:'x',topic:'t',seconds:30,font:'inter'}),/set request.content/);
 assert.throws(()=>request({version:1,id:'x',topic:'t',seconds:30,content:'mixed-v1',font:'papyrus'}),/arial, inter/);
 assert.throws(()=>request({version:1,id:'x',topic:'t',seconds:30,content:'typography-v1',theme:'neon'}),/aether-v1, paper-v1/);
});

test('dates and comparisons: "250 BC" is not counted; labels stop at "than"',()=>{
 assert.equal(findNumber('Around 250 BC, the king asked a question.'),null);
 assert.equal(findNumber('Gold is about 1.8 times denser than silver.').label,'times denser');
});

test('regression: no invisible control characters in source files (a lost regex backslash broke two DUAL-01/02 rules)',async()=>{
 const {readdirSync}=await import('node:fs'),{join}=await import('node:path'),root=new URL('..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
 const bad=[];const walk=d=>{for(const e of readdirSync(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(js|mjs|cjs|jsx)$/.test(e.name)){const s=readFileSync(p,'utf8');if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u2028\u2029]/.test(s))bad.push(p);}}};
 for(const d of ['src','scripts','tests','studio'])walk(join(root,d));
 assert.deepEqual(bad,[]);
});

test('regression: an explainer about books may show the open book without a NO_MATCHING_OBJECT note',async()=>{
 const r=await direct({version:1,id:'dual-test-book',topic:'Qwzx book vrbl',seconds:30,voice:'af_heart',content:'explainer-v1',script:'Qwzx vrbl plimp. Florp zandor quib.'});
 assert.equal(r.stages.aids.diagnostics.filter(d=>d.code==='NO_MATCHING_OBJECT').length,0);
});

test('list items drop leading "only", "just", "also" and "even"',()=>{
 assert.deepEqual(findList('The method needs only water, a vessel and pure gold.'),['Water','Vessel','Pure gold']);
});
