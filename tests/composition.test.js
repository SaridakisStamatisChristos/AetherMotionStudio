// DUAL-01 shared composition (compose-v1), Director content modes and the aids-v1 check.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutComposition,validateComposition,REGIONS,TONES,contrast,wrapText,textWidth,compositionPlates,COMPOSE_VERSION} from '../src/core/composition.js';
import {drawComposition} from '../src/visual/draw-composition.js';
import {validateProject} from '../src/core/timeline.js';
import {REELS} from '../src/core/reels-layout.js';
import {direct} from '../src/director/index.js';
import {request} from '../src/director/schema.js';
import {findFlow,findList,planAids,EXPLAINER_FALLBACK} from '../src/director/aids.js';
import {aidsCheck,captionBox} from '../src/quality/aids.js';
import {isCatalogCharacter} from '../src/quality/crowding.js';
import {digest} from '../src/director/catalog.js';

const C=(items,region='upper')=>({version:COMPOSE_VERSION,region,items});
const card={id:'card',type:'card',box:[0,0,1,1],text:'Leaves take in carbon',body:'Trees take in carbon dioxide through tiny pores in their leaves.'};
const SCRIPT='How do forests clean the air we breathe? Trees take in carbon dioxide through tiny pores in their leaves. Sunlight turns that carbon into sugar and wood, and the leaves release oxygen. Much of it stays in trunks, roots and forest soil, sometimes for centuries. Leaves and needles catch fine dust, and rain washes it down. A whole forest works like a giant living filter. So protecting forests means cleaner air for everyone.';
const base={version:1,id:'dual-test',topic:'How do forests clean the air?',seconds:60,voice:'af_heart',script:SCRIPT};
const forest=JSON.parse(readFileSync(new URL('../examples/gen12-forest-script.request.json',import.meta.url),'utf8'));

test('compose-v1 layout is deterministic and wraps text inside its box',()=>{
 const c=C([{id:'t',type:'title',box:[0,0,1,.5],text:'How do forests clean the air we breathe every day?'},{id:'c',type:'card',box:[0,.55,1,.45],text:'Key idea',body:'Leaves catch dust.'}]);
 const a=layoutComposition(c),b=layoutComposition(structuredClone(c));
 assert.deepEqual(a,b);
 for(const x of a.items)for(const t of [x.text,x.body].filter(Boolean)){
  assert.ok(t.lines.length>=1);
  for(const line of t.lines)assert.ok(textWidth(line,t.size)<=x.box.w-30,line);
  assert.ok(t.height<=x.box.h);
 }
 // every word of the source text survives wrapping, in order (no truncation)
 assert.equal(a.items[0].text.lines.join(' '),'How do forests clean the air we breathe every day?');
 assert.equal(wrapText('Supercalifragilisticexpialidocious',40,200),null);
});

test('compose-v1 rejects malformed, hostile and overflowing compositions with explicit messages',()=>{
 const bad=(c,re)=>assert.throws(()=>validateComposition(c,'c'),re);
 bad(null,/object required/);bad({...C([card]),version:'compose-v9'},/compose-v1 or compose-v2 required/);bad({...C([card]),theme:'paper-v1'},/unknown field/);bad(C([{...card,font:'inter'}]),/unknown field/);bad(C([card],'left'),/upper or full/);
 bad({...C([card]),extra:1},/unknown field/);bad(C([]),/1–6 items/);bad(C(Array.from({length:7},(_,i)=>({id:'l'+i,type:'shape',shape:'ring',box:[0,0,.1,.1]}))),/1–6 items/);
 bad(C([{...card,type:'script'}]),/one of background/);bad(C([{...card,html:'<b>'}]),/unknown field/);
 bad(C([JSON.parse('{"__proto__":{"x":1},"id":"a","type":"label","box":[0,0,0.5,0.5],"text":"x"}')]),/unknown field/);
 bad(C([{...card,id:'Bad ID'}]),/unique safe ID/);bad(C([{id:'x',type:'label',box:[0,0,.4,.4],text:'A'},{id:'x',type:'label',box:[.5,.5,.4,.4],text:'B'}]),/unique safe ID/);
 bad(C([{...card,start:.6,end:.4}]),/invalid window/);bad(C([{...card,start:NaN}]),/0–1 required/);bad(C([{...card,end:2}]),/0–1 required/);
 bad(C([{...card,box:[0,0,1,Infinity]}]),/\[x,y,w,h\]/);bad(C([{...card,box:[.5,0,.6,1]}]),/inside the upper region/);bad(C([{...card,box:[0,0,.02,.02]}]),/24×24/);
 bad(C([{id:'l',type:'label',box:[0,0,.3,.2],text:'Labels wider than the box'}]),/text overflow: label/);
 bad(C([{id:'l',type:'label',box:[0,0,.3,.3],text:'Pneumonoultramicroscopic'}]),/text overflow/);
 bad(C([{...card,text:'tab\there'}]),/printable/);bad(C([{...card,text:'x'.repeat(49)}]),/at most 48/);bad(C([{...card,body:'y'.repeat(161)}]),/at most 160/);
 bad(C([{id:'c',type:'card',box:[0,0,1,1]}]),/needs text, body or both/);
 bad(C([card,{id:'bg',type:'background'}]),/must be the first/);
 bad(C([{id:'a',type:'arrow',from:'nope',to:[.5,.5]}]),/earlier boxed item/);
 bad(C([{id:'a',type:'arrow',from:[0,0],to:'later'},{id:'later',type:'label',box:[0,.5,.4,.4],text:'x'}]),/earlier boxed item/);
 bad(C([{id:'a',type:'arrow',from:[0,0],to:[.02,.02]}]),/shorter than 24 px/);bad(C([{id:'a',type:'arrow',from:[0,0],to:[1,1],box:[0,0,1,1]}]),/from and to/);
 bad(C([{id:'l',type:'label',box:[0,0,.4,.4],text:'x',end:.3},{id:'a',type:'arrow',from:'l',to:[1,1],start:.5}]),/not on screen/);
 bad(C([{id:'c',type:'callout',box:[0,0,.5,.5],text:'Here',to:[.2,.2]}]),/outside its own box/);
 bad(C([{id:'a',type:'label',box:[0,0,.6,.5],text:'One'},{id:'b',type:'label',box:[.4,.2,.6,.5],text:'Two'}]),/overlap while both are on screen/);
 bad(C([{...card,tone:'neon'}]),/one of neutral/);bad(C([{...card,reveal:'spin'}]),/one of fade/);bad(C([{id:'s',type:'shape',shape:'star',box:[0,0,.2,.2]}]),/one of circle/);
 // overlapping boxes are fine when they are never on screen together
 validateComposition(C([{id:'a',type:'label',box:[0,0,.6,.5],text:'One',end:.5},{id:'b',type:'label',box:[.4,.2,.6,.5],text:'Two',start:.5}]));
});

test('aether-v1 tones keep text contrast at least 4.5:1 and regions stay inside the safe area above captions',()=>{
 for(const [name,t] of Object.entries(TONES))for(const k of ['text','sub'])assert.ok(contrast(t[k],t.fill)>=4.5,name+'.'+k+' '+contrast(t[k],t.fill));
 const lowestCaptionTop=Math.min(1171-(2*40+30+24),REELS.caption.bottom-(2*40+30+24));
 for(const [name,r] of Object.entries(REGIONS)){
  assert.ok(r.x>=REELS.ui.x[0]&&r.x+r.w<=REELS.ui.x[1],name+' x');assert.ok(r.y>=REELS.ui.y[0],name+' top');
  assert.ok(r.y+r.h<=lowestCaptionTop,name+' bottom '+(r.y+r.h)+' vs caption '+lowestCaptionTop);
 }
});

test('graph shots accept an opt-in composition; invalid ones fail project validation',()=>{
 const shot={id:'s1',template:'cinematic-graph',backend:'cpu',durationFrames:90,transitionFrames:0,narration:['Trees clean the air.'],heading:'H',subheading:'S',environment:'laboratory',camera:{},assets:[{id:'a',asset:'autumn-tree',tracks:{}}],effects:[],composition:C([card])};
 validateProject({version:2,id:'p',title:'T',voice:'af_heart',shots:[shot]});
 assert.throws(()=>validateProject({version:2,id:'p',title:'T',voice:'af_heart',shots:[{...shot,composition:C([{...card,box:[0,0,2,1]}])}]}),/composition\.items\[0\]\.box/);
});

test('drawComposition draws only the layout text, identically on every call, inside item windows',()=>{
 const calls=[];const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>{if(k==='fillText')calls.push(a[0]);},set:(o,k,v)=>{o[k]=v;return true;}});
 const c=C([{id:'t',type:'title',box:[0,0,1,.45],text:'Forests clean the air',end:.5},{id:'a',type:'label',box:[0,.6,.3,.3],text:'Leaves',start:.6},{id:'b',type:'label',box:[.7,.6,.3,.3],text:'Oxygen',start:.6},{id:'ar',type:'arrow',from:'a',to:'b',start:.6}]);
 drawComposition(ctx,c,.25,300);const early=[...calls];calls.length=0;drawComposition(ctx,c,.25,300);
 assert.deepEqual(calls,early);assert.deepEqual(early,['Forests clean the air']);
 calls.length=0;drawComposition(ctx,c,.8,300);assert.deepEqual(calls,['Leaves','Oxygen']);
 calls.length=0;drawComposition(ctx,undefined,.5,300);assert.deepEqual(calls,[]);
});

test('aids planner extracts flows and lists verbatim and refuses ambiguous ones',()=>{
 assert.deepEqual(findFlow('Sunlight turns that carbon into sugar and wood, and the leaves release oxygen.'),['Carbon','Sugar and wood']);
 assert.deepEqual(findList('Much of it stays in trunks, roots and forest soil, sometimes for centuries.'),['Trunks','Roots','Forest soil']);
 assert.deepEqual(findList('Bread needs flour, water, salt and yeast.'),['Flour','Water','Salt','Yeast']);
 assert.equal(findList('A, B, C, D, E and F.'),null);// too many to show whole
 assert.equal(findList('Exactly, and planting new ones helps too.'),null);
 assert.equal(findFlow('No flow here.'),null);
});

test('explainer-v1: no characters, aids on every shot from the shot text, clean top, no overlays',async()=>{
 const r=await direct({...base,content:'explainer-v1'}),p=r.project;
 assert.equal(p.shots.flatMap(s=>s.assets).filter(a=>isCatalogCharacter(a.asset)).length,0);
 assert.ok(p.shots.every(s=>s.composition&&s.titles==='none'&&!s.overlays));
 const words=(SCRIPT+' '+r.ir.title+' '+r.ir.shots.map(s=>s.heading+' '+s.subheading).join(' ')).toLowerCase();
 for(const s of p.shots)for(const x of s.composition.items)for(const t of [x.text,x.body].filter(Boolean))assert.ok(words.includes(t.toLowerCase()),'invented text: '+t);
 assert.equal(r.manifest.aids.mode,'explainer-v1');assert.equal(r.manifest.aids.kinds.length,r.ir.shots.length);
 assert.ok(p.shots.some(s=>s.composition.items.some(x=>x.type==='arrow')),'the carbon → sugar flow is drawn');
 // deterministic
 assert.equal(digest((await direct({...base,content:'explainer-v1'})).project),digest(p));
});

test('mixed-v1 keeps the cast; dialogue singles hold their aids steady',async()=>{
 const n=(await direct({...base,content:'mixed-v1'})).project;
 assert.ok(n.shots.every(s=>s.assets.some(a=>a.asset==='retro-robot')&&s.composition));
 const d=(await direct({...forest,id:'dual-test-d',content:'mixed-v1'})).project,plain=(await direct({...forest,id:'dual-test-d'})).project;
 assert.equal(d.shots.length,plain.shots.length);
 assert.deepEqual(d.shots.map(s=>s.assets.map(a=>a.asset)),plain.shots.map(s=>s.assets.map(a=>a.asset)));
 const held=d.shots.filter(s=>s.titleHold);assert.ok(held.length>0);
 for(const s of held)assert.ok(s.composition.items.every(x=>x.reveal==='none'&&x.start===undefined));
 // without request.content nothing changes
 assert.ok(plain.shots.every(s=>!s.composition));
});

test('content modes are validated and conflicts refused',async()=>{
 assert.throws(()=>request({...base,content:'silent'}),/explainer-v1, mixed-v1, typography-v1 or absent/);
 assert.throws(()=>request({...forest,content:'explainer-v1'}),/no characters; use mixed-v1/);
 assert.throws(()=>request({...base,content:'mixed-v1',titles:'shots'}),/replace the shot titles/);
 const r=await direct({...base,content:'explainer-v1'}),ir=structuredClone(r.ir);ir.shots[0].assets=[{asset:'retro-robot'}];
 await assert.rejects(direct({...base,content:'explainer-v1'},{imported:JSON.stringify(ir)}),/show no characters|unknown asset/);
});

test('aids diagnostics: content that is not supported yet and the explainer fallback object are reported',async()=>{
 const r=await direct({...base,id:'dual-test-c',content:'explainer-v1',topic:'Why charts of rainfall data matter',script:'Rainfall data shows a pattern over many years. We can read it with care.'});
 assert.ok(r.stages.aids.diagnostics.some(d=>d.code==='AUTHORED_VISUAL_SUGGESTED'&&/DUAL-04/.test(d.wanted)&&/request.visuals/.test(d.advice)));
 const z=await direct({...base,id:'dual-test-z',content:'explainer-v1',topic:'Qwzx vrbl',script:'Qwzx vrbl plimp. Florp zandor quib.'});
 const fallbackShots=z.project.shots.filter(s=>s.assets[0].asset===EXPLAINER_FALLBACK).map(s=>s.id);
 assert.ok(fallbackShots.length>0);
 assert.deepEqual(z.stages.aids.diagnostics.filter(d=>d.code==='NO_MATCHING_OBJECT').map(d=>d.shot),fallbackShots);
});

test('aids-v1 check reports a plate on a head, on an object and on the caption box',async()=>{
 const p=(await direct({...forest,id:'dual-test-k',content:'mixed-v1'})).project;
 let f=0;const t={shots:p.shots.map(s=>{const n=90,r={startFrame:f,endFrame:f+n,segments:[]};f+=n;return r;}),durationFrames:f,estimated:true};
 assert.equal(aidsCheck(p,t).warnings.length,0);
 const big=C([{id:'c',type:'card',box:[0,0,1,1],text:'Covers everything'}],'full'),q={...p,shots:p.shots.map(s=>({...s,composition:big}))};
 const codes=new Set(aidsCheck(q,t).warnings.map(w=>w.code));assert.ok(codes.has('AIDS_ON_HEAD'));
 const cue={cue:{lines:['a','b','c','d','e','f','g','h','i','j']}};assert.ok(captionBox(p,cue).y<REGIONS.full.y+REGIONS.full.h,'a 10-line caption would meet the full region');
 assert.deepEqual(compositionPlates(layoutComposition(big),.5).map(x=>x.id),['c']);
});

test('content-mode productions fit their length to the speech; other requests keep their target',async()=>{
 const {parseProduction}=await import('../scripts/production-options.mjs');
 const parse=q=>parseProduction(['--request','x.json','--backend','both'],{read:()=>JSON.stringify(q)}).request;
 assert.equal(parse({...base,content:'explainer-v1'}).speech.fit,'speech-v1');
 assert.equal(parse({...base,content:'mixed-v1'}).speech.fit,'speech-v1');
 assert.equal(parse({...base,content:'explainer-v1'}).speech.mix.master,'mix-v2');
 assert.equal(parse(base).speech.fit,undefined);assert.equal(parse(base).speech.mix.master,undefined);
 assert.equal(parse({...base,content:'explainer-v1',speech:{...parse(base).speech}}).speech.fit,undefined,'a request with its own speech keeps it');
});

test('explainer objects change between shots when the shot text names another object',async()=>{
 const q=JSON.parse(readFileSync(new URL('../examples/dual01-forest-explainer.request.json',import.meta.url),'utf8'));
 const objects=(await direct(q)).project.shots.map(s=>s.assets[0].asset);
 for(let i=1;i<objects.length;i++)assert.notEqual(objects[i],objects[i-1],objects.join(' | '));
 assert.ok(objects.every(a=>!isCatalogCharacter(a)));
});

test('list starts never turn a pronoun or auxiliary verb into an item; row labels share one size',async()=>{
 assert.deepEqual(findList('Much of it does, in trunks, roots and forest soil, sometimes for centuries.'),['Trunks','Roots','Forest soil']);
 assert.equal(findList('It does, in trunks, roots and soil.'),null);
 // DUAL-09: a long opening part that ends with the first item never yields a list with that item missing
 assert.equal(findList('In spring the volunteers planted tomatoes, beans, lettuce and squash.'),null);
 assert.equal(findList('In spring, the volunteers planted tomatoes, beans, lettuce and squash.'),null);
 assert.deepEqual(findList('In spring the volunteers planted crops such as tomatoes, beans, lettuce and squash.'),['Tomatoes','Beans','Lettuce','Squash'],'four items, first one unambiguous after "such as"');
 assert.deepEqual(findList('In spring the volunteers planted crops such as tomatoes, beans and squash.'),['Tomatoes','Beans','Squash']);
 assert.deepEqual(findList('The water is stored for decades, in rivers, lakes and glaciers.'),['Rivers','Lakes','Glaciers']);
 const {project}=await direct({...forest,id:'dual-test-row',content:'mixed-v1'});
 for(const s of project.shots){const L=layoutComposition(s.composition),labels=L.items.filter(x=>x.type==='label'&&x.id!=='heading');
  if(labels.length>1)assert.equal(new Set(labels.map(x=>x.text.size)).size,1,s.id+' '+labels.map(x=>x.text.size));}
});
