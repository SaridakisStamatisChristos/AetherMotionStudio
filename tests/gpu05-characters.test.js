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

test('heroDetail: soft-v1 films raise detail-2/unset humans and unset robots to hero detail 4; other films and explicit 1/3 unchanged',()=>{
 const shot=assets=>({id:'s',template:'cinematic-graph',assets});
 const p={cinematic:soft,shots:[shot([{id:'a',asset:'student',params:{detail:2}},{id:'b',asset:'scientist'},{id:'c',asset:'engineer',params:{detail:1}},{id:'d',asset:'runner',params:{detail:3,primary:'#112233'}},{id:'e',asset:'service-robot'},{id:'f',asset:'table'}]),{id:'t',template:'title'}]};
 const out=heroDetail(p),a=out.shots[0].assets;
 assert.deepEqual(a.map(x=>x.params?.detail),[4,4,1,3,4,undefined]);assert.equal(a[3].params.primary,'#112233');
 assert.equal(out.shots[1],p.shots[1]);assert.equal(p.shots[0].assets[0].params.detail,2,'input not mutated');
 for(const c of [undefined,{version:1},{version:1,materials:'pbr-v1'}]){const q={...p,cinematic:c};assert.equal(heroDetail(q),q);}
});

test('Director: a Cinematic dialogue film gets detail-4 heroes; the same request without renderProfile keeps detail 2',async()=>{
 const q=load('gpu02-portrait.request.json'),{renderProfile,...standard}=q;
 const [c,s]=await Promise.all([direct({...q,id:'gpu05-c'}),direct({...standard,id:'gpu05-s'})]);
 const humans=p=>p.shots.flatMap(x=>x.assets??[]).filter(a=>recipeSpec(a.asset)?.family==='human');
 assert.ok(humans(c.project).length>0);
 assert.ok(humans(c.project).every(a=>a.params.detail===4));assert.ok(humans(s.project).every(a=>a.params.detail===2));
 assert.equal(c.project.cinematic.characters,'soft-v1');assert.equal(Object.hasOwn(s.project,'cinematic'),false);
 // an explicit block without characters keeps the Director's detail 2
 const e=await direct({...q,id:'gpu05-e',cinematic:{version:1,materials:'pbr-v1'}});assert.ok(humans(e.project).every(a=>a.params.detail===2));
});

// Hero detail 4 geometry (catalog-hero.js): world boxes of one emitted recipe.
import {emitRecipe,validateAssetParams} from '../src/visual/catalog.js';
import {mouthSupported} from '../src/core/talk.js';
import {catalogHandAnchor} from '../src/visual/catalog-rig.js';
const boxes=(id,pose)=>{const out=[];emitRecipe(id,(c,s,color,local,lit,bias,role,face,surface)=>{const pts=[];for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])pts.push(local([x*s[0],y*s[1],z*s[2]]));out.push({size:s,color,lit,face,pts,mid:local([0,0,0])});},pose);return out;};
const bounds=bs=>{const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(const b of bs)for(const p of b.pts)p.forEach((v,i)=>{lo[i]=Math.min(lo[i],v);hi[i]=Math.max(hi[i],v);});return {lo,hi};};
const at=(detail,extra={})=>({origin:[0,0,0],yaw:0,scale:1,params:{detail},...extra});

test('hero detail 4: valid for humans and robots only; mouths supported; legacy details unchanged',()=>{
 for(const id of ['student','scientist','service-robot','floating-robot'])assert.deepEqual(validateAssetParams(id,{detail:4}),{detail:4});
 for(const [id,v] of [['husky',4],['table',4],['service-robot',2],['student',5],['student',0]])assert.throws(()=>validateAssetParams(id,{detail:v}),/asset detail|asset params/,id+' '+v);
 assert.equal(mouthSupported('student',{detail:4}),true);assert.equal(mouthSupported('student',{detail:1}),false);
 const legacy=JSON.stringify(boxes('student',at(3)).map(b=>b.pts));assert.equal(JSON.stringify(boxes('student',at(3)).map(b=>b.pts)),legacy);
});

test('hero detail 4: same footprint and height as detail 2, more parts, eyes and soles in the new slots',()=>{
 for(const id of ['student','scientist','engineer','office-worker','astronaut','construction-worker','runner','service-robot','delivery-robot','security-robot']){
  const old=bounds(boxes(id,at(id.endsWith('robot')?undefined:2))),hero=boxes(id,at(4)),nb=bounds(hero);
  for(const i of [0,1,2]){const o=old.hi[i]-old.lo[i],n=nb.hi[i]-nb.lo[i];assert.ok(Math.abs(n-o)/o<.2,id+' axis '+i+' '+o.toFixed(2)+' → '+n.toFixed(2));}
  assert.ok(nb.lo[1]>=-1e-9,id+' stands on the floor');assert.ok(hero.length>=boxes(id,at(id.endsWith('robot')?undefined:2)).length,id+' parts');}
 const s=boxes('student',at(4));assert.ok(s.some(b=>b.color==='#f6f3ec'&&b.face),'eye whites');assert.ok(s.some(b=>b.color==='#e3a091'),'blush');
});

test('hero detail 4: nod moves the face, not the hands; hands at the rig anchor; blink and mouth shape the face',()=>{
 const rest=boxes('scientist',at(4)),nod=boxes('scientist',at(4,{nod:.3}));assert.equal(rest.length,nod.length);
 const eye=rest.findIndex(b=>b.color==='#f6f3ec'&&b.face);assert.notDeepEqual(nod[eye].mid,rest[eye].mid);
 const hand=catalogHandAnchor('scientist',at(4),1),near=bs=>bs.some(b=>Math.hypot(...b.mid.map((v,i)=>v-hand[i]))<1e-9);
 assert.ok(near(rest)&&near(nod),'hand box centred on the anchor, unmoved by the nod');
 const robot=catalogHandAnchor('service-robot',at(4),-1);assert.ok(boxes('service-robot',at(4)).some(b=>Math.hypot(...b.mid.map((v,i)=>v-robot[i]))<1e-9));
 const eyeH=bs=>bs.filter(b=>b.color==='#f6f3ec'&&b.face&&!b.lit).map(b=>b.size[1]);
 assert.ok(eyeH(boxes('student',at(4,{blink:.2})))[0]<eyeH(boxes('student',at(4,{blink:1})))[0]);
 assert.equal(boxes('student',at(4,{mouth:.8})).length,boxes('student',at(4,{mouth:0})).length+1,'inner mouth opens');
 assert.equal(boxes('service-robot',at(4,{mouth:.5})).length,boxes('service-robot',at(4)).length+1,'robot mouth bar');
 // planted feet and walking keep working
 assert.notDeepEqual(bounds(boxes('student',at(4,{walking:.8}))),bounds(boxes('student',at(4))));
 boxes('student',at(4,{footTwistR:.3,footDxR:.05,footDzR:0,footTwistL:-.2,footDxL:0,footDzL:.04,hip:.05,tilt:.1}));
});
