// DUAL-06 output formats: vertical-v1 (default, unchanged), landscape-v1 (1920×1080), square-v1 (1080×1080).
// Only tested combinations are accepted; 2D layers reflow per format; the world keeps the vertical field of view.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FORMATS,FORMAT_IDS,DEFAULT_FORMAT,worldMap,validateFormat} from '../src/core/formats.js';
import {validateProject,validateTimeline} from '../src/core/timeline.js';
import {layoutComposition,validateComposition,REGIONS} from '../src/core/composition.js';
import {drawFilm} from '../src/core/draw-film.js';
import {direct} from '../src/director/index.js';
import {request} from '../src/director/schema.js';
const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n,import.meta.url),'utf8'));

test('1. the format table: sizes, 1.5× logical canvases, 30 fps, and the Python mirror agrees',()=>{
 assert.deepEqual(FORMAT_IDS,['vertical-v1','landscape-v1','square-v1']);assert.equal(DEFAULT_FORMAT,'vertical-v1');
 for(const f of Object.values(FORMATS)){assert.equal(f.width,f.logical.w*1.5);assert.equal(f.height,f.logical.h*1.5);assert.equal(f.fps,30);}
 assert.deepEqual(FORMATS['vertical-v1'].regions,REGIONS,'vertical regions are the historical ones');
 const py=readFileSync(new URL('../scripts/formats.py',import.meta.url),'utf8');
 for(const f of Object.values(FORMATS))assert.ok(py.includes("'"+f.id+"':("+f.width+','+f.height+')'),'formats.py mirrors '+f.id);
});

test('2. layout safety in every format: regions inside the frame, above the tallest caption, progress bar below',()=>{
 for(const f of Object.values(FORMATS)){const L=f.logical,C=f.caption,tallest=2*40+30+24;
  for(const r of Object.values(f.regions)){assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=L.w&&r.y+r.h<=L.h,f.id);assert.ok(r.y+r.h<=C.bottom-tallest,f.id+' region clears a two-line caption with speaker names');}
  assert.ok(C.left>=0&&C.left+C.width<=L.w&&C.maxText<=C.width-40&&C.bottom<=L.h);
  assert.ok(f.progress.y>C.bottom&&f.progress.y+3<=L.h&&f.progress.x+f.progress.w<=L.w);}
});

test('3. the world transform keeps the vertical view: identity for 9:16; wider formats only add at the sides',()=>{
 const v=worldMap(FORMATS['vertical-v1']);assert.deepEqual([v.k,v.x0,v.x1],[1,0,720]);assert.deepEqual(v.toLogical([123,456]),[123,456]);
 for(const id of ['landscape-v1','square-v1']){const f=FORMATS[id],m=worldMap(f);assert.equal(m.k,f.logical.h/1280);
  // the whole vertical frame lands inside this format's frame (nothing visible in 9:16 is cut) …
  for(const c of [[0,0],[720,0],[0,1280],[720,1280],[360,640]]){const [x,y]=m.toLogical(c);assert.ok(x>=-1e-9&&x<=f.logical.w+1e-9&&y>=-1e-9&&y<=f.logical.h+1e-9,id+' '+c);}
  // … and the format's frame maps back to the widened vertical-equivalent strip x0…x1 × 0…1280
  assert.deepEqual(m.toWorld([0,0]).map(n=>Math.round(n*1e6)/1e6),[Math.round(m.x0*1e6)/1e6,0]);assert.ok(m.x0<=0&&m.x1>=720);
  assert.deepEqual(m.toWorld(m.toLogical([100,900])).map(n=>Math.round(n*1e9)/1e9),[100,900]);}
});

// a small v2 project without speech (legacy captions path), built from a Director plan
async function project(format,extra={}){
 const q=load('dual02-forest-typography.request.json');const r=await direct({...q,profile:'original',...extra});
 const p=structuredClone(r.project);delete p.speech;p.shots.forEach(s=>{s.durationFrames=120;});if(format)p.format=format;
 let o=0;const t={version:1,fps:30,sampleRate:48000,shots:p.shots.map(s=>{const a={id:s.id,startFrame:o,endFrame:o+120,transitionFrames:s.transitionFrames,segments:s.narration.map((text,i)=>({text,startSample:o*1600+8000+i*20000,endSample:o*1600+18000+i*20000,speed:1}))};o+=120;return a;})};t.durationFrames=o;
 validateProject(p);validateTimeline(p,t);return {p,t};
}
function record(){const ops=[],g={addColorStop(){}};
 const ctx=new Proxy({},{get(_,k){if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>g;if(k==='measureText')return x=>({width:x.length*12});if(k==='getImageData')return ()=>({data:new Uint8ClampedArray(4)});
  return (...a)=>{for(const n of a)if(typeof n==='number')assert.ok(Number.isFinite(n),k);ops.push([k,...a.map(n=>typeof n==='number'?Math.round(n*1e6)/1e6:typeof n==='object'?'obj':n)]);};},
  set(_,k,v){ops.push(['set',k,typeof v==='object'?'obj':v]);return true;}});
 return {ctx,ops};}

test('4. vertical films draw exactly as before: absent format and explicit vertical-v1 give identical drawing',async()=>{
 const {p,t}=await project(null),{p:q}=await project('vertical-v1');
 for(const frame of [5,60,130,250,400]){const a=record(),b=record();drawFilm(a.ctx,p,t,frame,1080,1920);drawFilm(b.ctx,q,t,frame,1080,1920);assert.deepEqual(b.ops,a.ops,'frame '+frame);}
});

test('5. landscape and square: world transform, reflowed caption, progress bar and compositions inside the frame',async()=>{
 for(const id of ['landscape-v1','square-v1']){const f=FORMATS[id],{p,t}=await project(id),m=worldMap(f),{ctx,ops}=record();
  drawFilm(ctx,p,t,8,f.width,f.height);
  const s=ops.map(o=>JSON.stringify(o));
  assert.ok(s.includes(JSON.stringify(['scale',1.5,1.5])),'logical → output scale');
  assert.ok(s.includes(JSON.stringify(['translate',m.cx,0]))&&s.includes(JSON.stringify(['scale',Math.round(m.k*1e6)/1e6,Math.round(m.k*1e6)/1e6])),'vertical-view world transform');
  assert.ok(s.includes(JSON.stringify(['fillRect',f.progress.x,f.progress.y,f.progress.w,3])),'progress bar at the format position');
  const cap=ops.find(o=>o[0]==='roundRect'&&o[1]===f.caption.left);assert.ok(cap,'caption box at the format position');assert.equal(cap[3],f.caption.width);
 }
});

test('6. only tested combinations: format rules on projects and Director requests',async()=>{
 const {p}=await project(null);
 const bad=(mut,re)=>{const x=structuredClone(p);mut(x);assert.throws(()=>validateProject(x),re);};
 bad(x=>{x.format='cinema-v1';},/film.format: vertical-v1, landscape-v1, square-v1 or absent/);
 bad(x=>{x.format='landscape-v1';x.delivery='reels-v1';},/Reels delivery, which is 9:16 only/);
 bad(x=>{x.format='square-v1';delete x.shots[1].titles;},/titles "none" on every shot/);
 bad(x=>{x.format='landscape-v1';x.shots[0].overlays=[];},/does not support legacy overlays/);
 validateFormat({format:'vertical-v1',delivery:'reels-v1',shots:[{template:'robot-lab'}]});// vertical keeps every historical combination
 const q=load('dual02-forest-typography.request.json');
 assert.throws(()=>request({...q,format:'landscape'}),/request.format: vertical-v1, landscape-v1, square-v1 or absent/);
 const {content,font,theme,visuals,...plain}=q;assert.throws(()=>request({...plain,format:'square-v1'}),/needs request.content/);
 assert.throws(()=>request({...q,format:'landscape-v1',delivery:'reels-v1'}),/Reels delivery is 9:16 only/);
 assert.equal(request({...plain,format:'vertical-v1'}).format,'vertical-v1');
});

test('7. compositions reflow per format; per-format boxes apply only to their format; bad overrides refused',()=>{
 const c={version:'compose-v2',region:'full',font:'inter',items:[{id:'t',type:'card',box:[0,0,1,.3],text:'A heading that wraps differently in every format',formats:{'landscape-v1':{box:[.5,0,.5,.6]}}}]};
 const v=layoutComposition(c).items[0],l=layoutComposition(c,'c',{format:'landscape-v1'}).items[0],s=layoutComposition(c,'c',{format:'square-v1'}).items[0];
 assert.deepEqual(v.box,{x:48,y:150,w:584,h:210});assert.deepEqual(l.box,{x:640,y:36,w:512,h:300});assert.deepEqual(s.box,{x:48,y:36,w:624,h:150});
 assert.equal(layoutComposition(c).format,undefined,'vertical layouts are unchanged (no format key)');
 const bad=(x,re,format)=>assert.throws(()=>validateComposition({...c,items:[{...c.items[0],formats:x}]},'c',format?{format}:{}),re);
 bad({'cinema-v1':{box:[0,0,1,1]}},/unknown format/);bad({'square-v1':{box:[0,0,1,1],extra:1}},/\{box:\[x,y,w,h\]\} required/);
 bad({'square-v1':{box:[0,0,2,1]}},/must lie inside/,'square-v1');bad([],/required/);
 assert.throws(()=>validateComposition({version:'compose-v1',region:'full',items:[{id:'t',type:'title',box:[0,0,1,.2],text:'Hi',formats:{}}]}),/unknown field for title/);
});

test('8. Director: authored content too tall for a short panel is refused clearly; a per-format box fixes it',async()=>{
 const q=load('dual04-bread.request.json');
 await assert.rejects(direct({...q,format:'landscape-v1'}),/"Bakery" does not fit its node circle/);
 const v=structuredClone(q.visuals),k=v.findIndex(x=>x.composition.items.some(i=>i.type==='graph'));
 v[k].composition.items[0].formats={'landscape-v1':{box:[.2,0,.6,1]},'square-v1':{box:[0,0,1,1]}};
 for(const format of ['landscape-v1','square-v1']){const r=await direct({...q,format,visuals:v});assert.equal(r.project.format,format);}
 const r=await direct({...q,visuals:v});assert.equal(r.project.format,undefined,'vertical by default; the override is ignored there');
});

test('9. production option --format: overrides a request, refused for authored projects, validated',async()=>{
 const {parseProduction}=await import('../scripts/production-options.mjs');const read=p=>readFileSync(p,'utf8');
 const o=parseProduction(['--request','examples/dual06-harbour.request.json','--format','square-v1','--id','x'],{read});assert.equal(o.request.format,'square-v1');
 assert.throws(()=>parseProduction(['--request','examples/dual06-harbour.request.json','--format','wide','--id','x'],{read}),/request.format/);
 assert.throws(()=>parseProduction(['--project','examples/robot-treasure.json','--format','square-v1'],{read}),/--format cannot modify an authored --project/);
 for(const format of FORMAT_IDS){const r=await direct({...load('dual06-harbour.request.json'),format});assert.equal(r.project.format??DEFAULT_FORMAT,format);}
});
