// DUAL-06 slice 2: the high-contrast theme, caption styles and the explicit silent soundtrack.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {THEMES,contrast,layoutComposition} from '../src/core/composition.js';
import {SERIES_COLOURS} from '../src/core/charts.js';
import {CAPTION_STYLES,SOUNDTRACKS,validateSpeechConfig} from '../src/core/speech.js';
import {drawSpeechCue} from '../src/core/draw-film.js';
import {request} from '../src/director/schema.js';
import {direct,withSoundOptions} from '../src/director/index.js';
const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n,import.meta.url),'utf8'));

test('1. contrast-v1 theme: every text, sub and mark colour at least 7:1 on its plate; six distinct chart colours',()=>{
 for(const [tone,t] of Object.entries(THEMES['contrast-v1']))for(const k of ['text','sub','mark'])assert.ok(contrast(t[k],t.fill)>=7,tone+'.'+k+' '+contrast(t[k],t.fill).toFixed(2));
 const c=SERIES_COLOURS['contrast-v1'];assert.equal(new Set(c).size,6);for(const x of c)assert.ok(contrast(x,THEMES['contrast-v1'].neutral.fill)>=3,x);
 assert.deepEqual(Object.keys(THEMES),['aether-v1','paper-v1','contrast-v1']);
 // a composition in the new theme lays out like any other
 const L=layoutComposition({version:'compose-v2',region:'full',theme:'contrast-v1',font:'inter',items:[{id:'c',type:'card',box:[0,0,1,.3],text:'High contrast'}]});assert.equal(L.items[0].tone.fill,'#000000');
});

test('2. caption styles: text, highlight and speaker readable on the box (4.5:1; 7:1 for contrast-v1)',()=>{
 assert.deepEqual(Object.keys(CAPTION_STYLES),['box-v1','paper-v1','contrast-v1']);
 for(const [id,s] of Object.entries(CAPTION_STYLES)){const min=id==='contrast-v1'?7:4.5;for(const k of ['text','highlight','speaker'])assert.ok(contrast(s[k],s.solid)>=min,id+'.'+k+' '+contrast(s[k],s.solid).toFixed(2));}
 // box-v1 is exactly the historical look
 const b=CAPTION_STYLES['box-v1'];assert.deepEqual([b.fill,b.edge,b.text,b.highlight,b.speaker,b.edgeWidth],['rgba(5,15,28,.94)','#567485','#f5f9ff','#ffd47a','#9bdef3',2]);
});

function record(){const ops=[];const ctx=new Proxy({},{get(_,k){if(k==='measureText')return x=>({width:x.length*14});return (...a)=>ops.push([k,...a]);},set(_,k,v){ops.push(['set',k,v]);return true;}});return {ctx,ops};}
const cue={cue:{lines:['A caption line','second line'],speaker:'narrator'},active:1};
const speech=style=>({speakers:{narrator:{name:'Narrator'}},captions:{highlight:true,...(style?{style}:{})}});

test('3. drawing: absent style and explicit box-v1 draw identically; other styles change only colours and edge',()=>{
 const a=record(),b=record();drawSpeechCue(a.ctx,1080,1920,cue,speech(null));drawSpeechCue(b.ctx,1080,1920,cue,speech('box-v1'));assert.deepEqual(b.ops,a.ops);
 for(const id of ['paper-v1','contrast-v1']){const r=record(),S=CAPTION_STYLES[id];drawSpeechCue(r.ctx,1080,1920,cue,speech(id));
  const fills=r.ops.filter(o=>o[0]==='set'&&o[1]==='fillStyle').map(o=>o[2]);assert.ok(fills.includes(S.fill)&&fills.includes(S.text)&&fills.includes(S.highlight),id);
  assert.ok(!fills.includes('#f5f9ff'),'no historical text colour in '+id);
  assert.deepEqual(r.ops.filter(o=>o[0]!=='set'&&o[0]!=='stroke'&&o[0]!=='fill').map(o=>o[0]),a.ops.filter(o=>o[0]!=='set'&&o[0]!=='stroke'&&o[0]!=='fill').map(o=>o[0]),'same layout calls');}
});

test('4. validation: unknown styles and soundtracks are refused in speech settings and requests',()=>{
 const q=load('dual02-forest-typography.request.json');
 assert.throws(()=>request({...q,captionStyle:'neon'}),/request.captionStyle: box-v1, paper-v1, contrast-v1 or absent/);
 assert.throws(()=>request({...q,soundtrack:'mute'}),/request.soundtrack: mix or silent or absent/);
 assert.deepEqual(SOUNDTRACKS,['mix','silent']);
 assert.equal(withSoundOptions({},undefined),undefined,'nothing asked, nothing changed');
 assert.throws(()=>withSoundOptions({soundtrack:'silent'},undefined),/request.soundtrack: needs speech settings/);
 const sp={version:1,captions:{mode:'burn-in',highlight:true},mix:{narration:1}};
 assert.deepEqual(withSoundOptions({captionStyle:'paper-v1',soundtrack:'silent'},sp),{version:1,soundtrack:'silent',captions:{mode:'burn-in',highlight:true,style:'paper-v1'},mix:{narration:1}});
});

test('5. Director: shortcuts land in the project speech settings; omitted means the historical defaults',async()=>{
 const {defaultSpeech}=await import('../src/studio/production.js');
 const q={...load('dual02-forest-typography.request.json'),speech:{...defaultSpeech(load('dual02-forest-typography.request.json').seconds),fit:'speech-v1'}};
 const r=await direct({...q,captionStyle:'contrast-v1',soundtrack:'silent',theme:'contrast-v1'});
 assert.equal(r.project.speech.captions.style,'contrast-v1');assert.equal(r.project.speech.soundtrack,'silent');
 assert.ok(r.project.shots.every(s=>s.composition.theme==='contrast-v1'));
 validateSpeechConfig(r.project.speech,r.project.shots);
 const plain=await direct(q);assert.equal(plain.project.speech.captions.style,undefined);assert.equal(plain.project.speech.soundtrack,undefined);
 assert.throws(()=>validateSpeechConfig({...plain.project.speech,soundtrack:'quiet'},plain.project.shots),/speech.soundtrack/);
 assert.throws(()=>validateSpeechConfig({...plain.project.speech,captions:{...plain.project.speech.captions,style:'x'}},plain.project.shots),/captions.style/);
});

test('6. the Python checks treat a requested silent soundtrack as silence, never as a speech failure (source contract)',()=>{
 const v=readFileSync(new URL('../scripts/verify.py',import.meta.url),'utf8'),q=readFileSync(new URL('../scripts/quality_media.py',import.meta.url),'utf8'),p=readFileSync(new URL('../scripts/speech_pipeline.py',import.meta.url),'utf8');
 assert.match(v,/requested silent soundtrack is not silent/);assert.match(v,/requested silent soundtrack \(digital silence\)/);
 assert.match(q,/NOT_SILENT/);assert.match(q,/elif rms\(pcm\)<\.003:issue\('SILENT_AUDIO'/);
 assert.match(p,/if silent:mix=np\.zeros_like\(mix\)/);assert.match(p,/'soundtrack':'silent'/);
});
