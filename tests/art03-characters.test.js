// ART-03 slice 1: opt-in character detail 2 (front cues) and left-arm rig channels.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph,LEFT_ARM} from '../src/core/graph.js';
import {emitAsset} from '../src/visual/assets.js';
import {validateAssetParams,OBJECT_CATALOG} from '../src/visual/catalog.js';
import {handAnchor,supportedChannels} from '../src/core/cinematography.js';
import {recipeRig} from '../src/visual/catalog-rig.js';
import {compositionReport} from '../src/quality/composition.js';

const read=name=>JSON.parse(readFileSync(new URL('../examples/'+name+'.json',import.meta.url),'utf8'));
const humans=OBJECT_CATALOG.filter(o=>o.family==='human').map(o=>o.id);
const pose=(extra={})=>({origin:[0,0,0],yaw:0,scale:1,walking:0,open:0,...extra});
const boxes=(id,p)=>{const out=[];emitAsset(id,(c,s,col,tf=q=>q,lit=false)=>out.push({c:tf(c),s,col,lit}),p);return out;};

test('detail 1 (explicit) and absent params emit identical geometry for every catalog asset family sample',()=>{
 for(const id of humans){assert.deepEqual(boxes(id,pose({params:{detail:1}})),boxes(id,pose()));}
});

test('detail 2 adds front-facing features in front of the head for every human; astronaut keeps its visor',()=>{
 for(const id of humans){
  const a=boxes(id,pose()),b=boxes(id,pose({params:{detail:2}}));assert.ok(b.length>a.length,id);
  assert.deepEqual(b.slice(0,a.length),a,'v1 boxes preserved in order: '+id);
  const extra=b.slice(a.length),front=extra.filter(x=>x.c[2]>0);assert.ok(front.length>=(id==='astronaut'?2:3),id);
  if(id==='astronaut')assert.ok(extra.some(x=>x.lit),'visor glint');else{const dark=extra.filter(x=>x.col==='#162333'&&x.c[2]>0);assert.ok(dark.length>=2,'two eyes on '+id);}
 }
 const yawed=boxes('engineer',pose({yaw:Math.PI,params:{detail:2}})),n=boxes('engineer',pose()).length;
 assert.ok(yawed.slice(n).filter(x=>x.col==='#162333').every(x=>x.c[2]<0),'features turn with the body');
});

test('negative: detail validation',()=>{
 assert.throws(()=>validateAssetParams('engineer',{detail:3}),/invalid asset detail/);
 assert.throws(()=>validateAssetParams('engineer',{detail:'2'}),/invalid asset detail/);
 assert.throws(()=>validateAssetParams('service-robot',{detail:2}),/asset detail 2 unsupported for service-robot/);
 assert.deepEqual(validateAssetParams('service-robot',{detail:1}),{detail:1});
 assert.deepEqual(validateAssetParams('scientist',{detail:2,primary:'#123456'}),{detail:2,primary:'#123456'});
});

test('left-arm channels move the left hand (and its anchor) only when authored; right arm unaffected',()=>{
 const s=read('art03-cast-cpu-polished').shots[1],st=evaluateGraph(s,.3),eng=st.assets.find(a=>a.id==='engineer');
 assert.ok(eng.pose.leftArmPitch<-2);const rest={...eng.pose,leftArmPitch:0,leftArmSpread:0};
 assert.ok(handAnchor('engineer',eng.pose,-1)[1]>handAnchor('engineer',rest,-1)[1]+.3,'left hand raised');
 assert.deepEqual(handAnchor('engineer',eng.pose,1),handAnchor('engineer',rest,1));
 const plain=evaluateGraph(read('art01-handoff-cpu-polished').shots[0],.5);for(const a of plain.assets)for(const k of LEFT_ARM)assert.ok(!(k in a.pose));
 assert.deepEqual(recipeRig('engineer').channels,supportedChannels('engineer'));assert.ok(!recipeRig('engineer').channels.includes('leftArmPitch'),'published rig channels unchanged');
});

test('negative: left-arm channels rejected on assets without a catalog human/robot rig, and out of range',()=>{
 const bad=(mut,re)=>{const p=read('art03-cast-cpu-polished');mut(p.shots[1].assets);assert.throws(()=>validateProject(p),re);};
 bad(a=>{a[1].asset='retro-robot';delete a[1].params;},/left-arm channels require a catalog human or robot rig/);
 bad(a=>a[1].tracks.leftArmPitch[1][1]=-3,/out of range/);
 bad(a=>a[1].tracks.leftArmSpread=[[0,1]],/out of range/);
 const p=read('art01-product-cpu-polished');p.shots[0].assets[0].tracks.leftArmPitch=[[0,-1]];assert.throws(()=>validateProject(p),/left-arm channels require/);
});

test('art03-cast: matched pair, before/after shots identical except detail and arms, faces toward camera, bounded overlap',()=>{
 const a=read('art03-cast-cpu-polished'),b=read('art03-cast-three-polished');validateProject(a);validateProject(b);
 assert.deepEqual(a.shots,b.shots.map(s=>({...s,backend:'cpu'})));
 const [before,after]=a.shots;assert.deepEqual(before.assets.map(x=>x.asset),humans);
 assert.ok(before.assets.every(x=>!x.params));assert.ok(after.assets.every(x=>x.params?.detail===2));
 for(const s of a.shots){const c=compositionReport(s);for(const v of Object.values(c.characters))assert.equal(v.backToCameraSamples,0);
  assert.ok(Math.max(...Object.values(c.overlap).map(o=>o.max))<=.5);}
});
