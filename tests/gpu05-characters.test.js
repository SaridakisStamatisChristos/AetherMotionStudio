// GPU-05 hero-char-v1 (GPU Cinematic only; owner 2026-11-28: "B Soft rounded", heroes student, scientist, robot):
// the capability and its rules, the rounding stays inside each part box, detail-3 humans in soft-v1 films only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {CHARACTER_STYLES,HERO_CHARACTERS,SOFT,softRadius,heroPart,heroDetail} from '../src/core/hero-characters.js';
import {CAPABILITIES,CINEMATIC_DEFAULTS,validateCinematic,requiredCapabilities,threeOptions,RenderProfileError} from '../src/core/render-profiles.js';
import {validateProject} from '../src/core/timeline.js';
import {surfaceKey} from '../src/visual/pbr.js';
import {recipeSpec} from '../src/visual/catalog-rig.js';
import {direct} from '../src/director/index.js';
const load=n=>JSON.parse(readFileSync(new URL('../examples/'+n,import.meta.url),'utf8'));
const swatch=c=>({...load('gpu01-swatches-cinematic.json'),cinematic:c});
const soft={version:1,materials:'pbr-v1',characters:'soft-v1'};

test('capability hero-char-v1: Cinematic only, one style soft-v1, Director default, closed values',()=>{
 assert.deepEqual(CHARACTER_STYLES,['soft-v1']);assert.deepEqual(CAPABILITIES['hero-char-v1'].profiles,['cinematic-v1']);
 assert.equal(CINEMATIC_DEFAULTS.characters,'soft-v1');
 assert.deepEqual(requiredCapabilities({cinematic:soft}),['shared','pbr-v1','hero-char-v1']);
 validateProject(swatch(soft));validateCinematic({version:1,characters:'soft-v1'});
 for(const bad of ['crisp-v1','soft-v2','',1,null])assert.throws(()=>validateCinematic({version:1,characters:bad}),/characters: soft-v1 or absent/,String(bad));
 const noProfile=swatch(soft);delete noProfile.renderProfile;
 assert.throws(()=>validateProject(noProfile),e=>e instanceof RenderProfileError&&e.code==='RP-03'&&/hero-char-v1/.test(e.message));
 assert.equal(threeOptions(swatch(soft)).characters,'soft-v1');
 assert.deepEqual(threeOptions({...swatch(soft),renderProfile:undefined}),{}); // GPU Standard: no options at all
});

test('soft radius: almost half the thinnest side, capped, and the rounded part stays inside its box',()=>{
 assert.equal(softRadius([.1,.8,.1]),.1*SOFT.share);assert.equal(softRadius([1,2,1]),SOFT.maxRadius);
 assert.ok(softRadius([0,.5,.5])>0&&softRadius([-.2,.5,.5])===.2*SOFT.share);
 for(const size of [[.12,.9,.12],[.37,.4,.48],[.65,.75,.7],[.03,.01,.02],[1.2,.2,.9]]){
  const r=softRadius(size);assert.ok(r<=Math.min(...size)/2+1e-12);
  const g=new RoundedBoxGeometry(...size,SOFT.segments,r);g.computeBoundingBox();const b=g.boundingBox;
  size.forEach((s,i)=>{const k='xyz'[i];assert.ok(b.max[k]<=s/2+1e-6&&b.min[k]>=-s/2-1e-6,'inside '+size);assert.ok(b.max[k]>=s/2-1e-6,'fills '+size);});g.dispose();}
});

test('hero parts: human and robot families only; every hero is a catalog character',()=>{
 assert.equal(heroPart(surfaceKey('human',0)),true);assert.equal(heroPart(surfaceKey('robot',3)),true);
 for(const f of ['tree','furniture','vehicle'])assert.equal(heroPart(surfaceKey(f,0)),false);assert.equal(heroPart(null),false);
 for(const id of HERO_CHARACTERS)assert.ok(['human','robot'].includes(recipeSpec(id).family),id);
});

test('heroDetail: soft-v1 films raise detail-2 and unset humans to 3; other films, robots and explicit 1/3 unchanged',()=>{
 const shot=assets=>({id:'s',template:'cinematic-graph',assets});
 const p={cinematic:soft,shots:[shot([{id:'a',asset:'student',params:{detail:2}},{id:'b',asset:'scientist'},{id:'c',asset:'engineer',params:{detail:1}},{id:'d',asset:'runner',params:{detail:3,primary:'#112233'}},{id:'e',asset:'service-robot'},{id:'f',asset:'table'}]),{id:'t',template:'title'}]};
 const out=heroDetail(p),a=out.shots[0].assets;
 assert.deepEqual(a.map(x=>x.params?.detail),[3,3,1,3,undefined,undefined]);assert.equal(a[3].params.primary,'#112233');
 assert.equal(out.shots[1],p.shots[1]);assert.equal(p.shots[0].assets[0].params.detail,2,'input not mutated');
 for(const c of [undefined,{version:1},{version:1,materials:'pbr-v1'}]){const q={...p,cinematic:c};assert.equal(heroDetail(q),q);}
});

test('Director: a Cinematic dialogue film gets detail-3 heroes; the same request without renderProfile keeps detail 2',async()=>{
 const q=load('gpu02-portrait.request.json'),{renderProfile,...standard}=q;
 const [c,s]=await Promise.all([direct({...q,id:'gpu05-c'}),direct({...standard,id:'gpu05-s'})]);
 const humans=p=>p.shots.flatMap(x=>x.assets??[]).filter(a=>recipeSpec(a.asset)?.family==='human');
 assert.ok(humans(c.project).length>0);
 assert.ok(humans(c.project).every(a=>a.params.detail===3));assert.ok(humans(s.project).every(a=>a.params.detail===2));
 assert.equal(c.project.cinematic.characters,'soft-v1');assert.equal(Object.hasOwn(s.project,'cinematic'),false);
 // an explicit block without characters keeps the Director's detail 2
 const e=await direct({...q,id:'gpu05-e',cinematic:{version:1,materials:'pbr-v1'}});assert.ok(humans(e.project).every(a=>a.params.detail===2));
});
