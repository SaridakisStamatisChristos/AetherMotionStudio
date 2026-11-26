// GEN-15 step 2 (owner: "start gen-15 step 2"): look 'crafted-v2' (glass and metal parts) and sets 'topic-v2' (dressed
// sets from catalog objects, set pieces matched to the words). Both are the dialogue defaults; v1 stays selectable.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LOOKS,MATERIALS,partRole,isCrafted,mixColor} from '../src/visual/crafted.js';
import {createMesh,createProjection} from '../src/visual/mesh.js';
import {emitAsset} from '../src/visual/assets.js';
import {DRESSED_SETS,LAYERED_ENVIRONMENTS,emitEnvironment} from '../src/core/cinematography.js';
import {evaluateGraph} from '../src/core/graph.js';
import {validateProject} from '../src/core/timeline.js';
import {OBJECT_CATALOG} from '../src/visual/catalog.js';
import {SETS_V2,PIECE_WORDS,topicSetFor,fitPiecesFor} from '../src/director/sets.js';
import {direct} from '../src/director/index.js';
import {defaultSpeech} from '../src/studio/production.js';
import {estimatedTimeline,motionCheck} from '../src/quality/motion-check.js';
import {crowdingCheck} from '../src/quality/crowding.js';
import {visibility2Check} from '../src/quality/visibility.js';
import {plannedTimeline} from '../src/studio/model.js';

const read=n=>JSON.parse(readFileSync(new URL('../examples/'+n+'.json',import.meta.url),'utf8'));
const interview=read('gen01-interview.request');
const film=async(topic,extra={})=>(await direct({...interview,topic,speech:defaultSpeech(interview.seconds),...extra})).project;
// one piece per original shot: '-single' close-ups show no piece and '-after' parts continue their shot's piece
const pieces=p=>p.shots.filter(s=>!s.id.endsWith('-single')&&!s.id.endsWith('-after')).map(s=>s.assets.find(a=>!Object.values(s.speakerAssets??{}).includes(a.id))?.asset).filter(Boolean);
const ids=new Set(OBJECT_CATALOG.map(o=>o.id)),cat=id=>OBJECT_CATALOG.find(o=>o.id===id)?.category;

test('partRole: glass for thin dark slabs, metal for thin secondary parts, only on machines; never lit parts',()=>{
 assert.deepEqual(LOOKS,['crafted-v1','crafted-v2']);assert.ok(isCrafted('crafted-v2')&&isCrafted('crafted-v1')&&!isCrafted(null)&&!isCrafted('none'));
 assert.equal(partRole('screen',4,[.8,.6,.025],false),'glass');
 assert.equal(partRole('robot',1,[.6,.2,.04],false),'metal');
 assert.equal(partRole('rack',1,[.05,1.2,.05],false),'metal');
 for(const [args,why] of [[['screen',4,[.8,.6,.025],true],'lit'],[['human',4,[.08,.03,.03],false],'people'],[['tree',1,[.05,.5,.05],false],'plants'],[['animal',1,[.05,.5,.05],false],'animals'],
  [['screen',4,[.8,.6,.3],false],'thick'],[['screen',4,[.04,.05,.6],false],'narrow'],[['screen',0,[.8,.6,.02],false],'slot 0'],[['robot',1,[.6,.2,.2],false],'thick metal'],[[null,4,[.8,.6,.02],false],'no family'],[['screen',4,[.8,.6],false],'bad size']])
  assert.equal(partRole(...args),null,why);
 assert.equal(mixColor('#000000','#ffffff',.5),'#808080');assert.equal(mixColor('#102030','#102030',.7),'#102030');
});
test('CPU mesh: crafted-v1 ignores roles; crafted-v2 changes only glass and metal parts',()=>{
 const cam=[0,1.4,4],pr=createProjection(cam,[0,.6,0],1200,[360,640]);
 const draw=(look,strip=false)=>{const {box,faces}=createMesh(cam,pr,.3,look);const b=strip?(c,s,col,tf,lit,bias)=>box(c,s,col,tf,lit,bias):box;emitAsset('laptop',b,{origin:[0,0,0],yaw:.2});emitAsset('explorer-robot',b,{origin:[1.2,0,0],yaw:-.2});return faces;};
 assert.deepEqual(draw('crafted-v1'),draw('crafted-v1',true),'v1: roles ignored');
 assert.deepEqual(draw(null),draw(null,true),'legacy: roles ignored');
 const v1=draw('crafted-v1'),v2=draw('crafted-v2'),plain=draw('crafted-v2',true);
 assert.deepEqual(plain,v1,'v2 without roles = v1');
 assert.equal(v2.length,v1.length);const changed=v2.filter((f,i)=>f.color!==v1[i].color).length;
 assert.ok(changed>0&&changed<v1.length/2,'some, not all, faces change: '+changed+'/'+v1.length);
});
test('dressed sets: catalog pieces only, all behind the line of speakers, both renderers share the box stream',()=>{
 for(const [name,set] of Object.entries(DRESSED_SETS)){
  assert.ok(LAYERED_ENVIRONMENTS.includes(name),name);assert.equal(set.palette.length,3);
  for(const [id,x,z,yaw,scale] of set.pieces){assert.ok(ids.has(id),id);assert.ok(z<=-2.6&&z>=-4.5&&Math.abs(x)<=3.3&&scale>0&&scale<=1,name+' '+id);}
  const boxes=[];emitEnvironment({layers:name},(c,s,col,tf=p=>p)=>boxes.push(tf(c)));
  assert.ok(boxes.length>20,name);assert.ok(boxes.every(p=>p[2]<-1.8),name+': every box behind the speakers');
 }
 for(const old of ['solar-field','city-dusk','energy-hub'])assert.ok(LAYERED_ENVIRONMENTS.includes(old),'old backdrops kept');
 assert.deepEqual(Object.values(SETS_V2.layers).filter(x=>!DRESSED_SETS[x]),[]);
});
test('topic-v2 pieces follow the words: sky gets prism and telescope; no wrong-sense matches; no repeats',async()=>{
 for(const id of Object.keys(PIECE_WORDS))assert.ok(ids.has(id),id);
 const sky=(await direct(read('fixa-sky-script.request'))).project;
 const ps=pieces(sky);assert.ok(ps.includes('prism')&&ps.includes('telescope'),ps.join());assert.ok(!ps.includes('dna-helix')&&!ps.includes('scatter-plot'),ps.join());
 assert.equal(new Set(ps).size,ps.length,'no repeats');assert.ok(sky.shots.every(s=>s.layers==='lab-set'&&s.look==='crafted-v2'));
 const vac=pieces(await film('How do vaccines train the body?'));assert.ok(!vac.includes('passenger-train'),'"train the body" is not a train: '+vac.join());assert.ok(vac.includes('virus-model'));
 const forest=await film('How do forests clean the air?');assert.ok(forest.shots.every(s=>s.layers==='forest-set'));assert.ok(!pieces(forest).includes('binary-tree'));
 const volcano=pieces(await film('Why do volcanoes erupt?'));assert.ok(volcano.includes('mountain'));assert.ok(volcano.every(id=>cat(id)==='nature'),volcano.join());
 const coffee=pieces(await film('How do I brew coffee at home?'));assert.deepEqual([...new Set(coffee)],['coffee-machine'],'everyday never swaps in random objects');
 // a named piece from another category is allowed when named in full
 const set={version:'topic-v2',category:'science'},ir={shots:[{heading:'X',narration:['The passenger train carries the samples.'],assets:[{asset:'beaker'}]}]};
 assert.equal(fitPiecesFor('topic-v2',{topic:'Lab logistics'},ir,set).ir.shots[0].assets[0].asset,'passenger-train');
 assert.deepEqual(fitPiecesFor('topic-v2',{topic:'x'},ir,{category:null}).changes,[]);
});
test('Director defaults, v1 by name, none, legacy unchanged; negatives',async()=>{
 const q=read('gen12-forest.request');
 const dflt=(await direct({...q,speech:defaultSpeech(60)})).project;assert.ok(dflt.shots.every(s=>s.look==='crafted-v2'&&s.layers==='forest-set'));
 validateProject(dflt);assert.equal(evaluateGraph(dflt.shots[0],.5).look,'crafted-v2');
 const v1=(await direct({...q,speech:defaultSpeech(60),sets:'topic-v1',look:'crafted-v1'})).project;assert.ok(v1.shots.every(s=>s.look==='crafted-v1'&&s.layers==='solar-field'));
 const off=(await direct({...q,speech:defaultSpeech(60),sets:'none',look:'none'})).project;assert.ok(off.shots.every(s=>s.look===undefined&&s.layers===undefined));
 const legacy=(await direct(read('speech-cpu-polished.request'))).project;assert.ok(legacy.shots.every(s=>s.look===undefined&&s.layers===undefined),'narrator films unchanged');
 assert.equal(topicSetFor('topic-v1',{topic:'How do forests clean the air?'},{shots:[]}).layers,'solar-field');
 assert.equal(topicSetFor('topic-v2',{topic:'Why is the sky blue?'},{shots:[]}).layers,'lab-set');
 await assert.rejects(direct({...q,sets:'topic-v3'}),/request.sets/);await assert.rejects(direct({...q,look:'crafted-v3'}),/request.look/);
 const bad=structuredClone(dflt);bad.shots[0].look='crafted-v9';assert.throws(()=>validateProject(bad),/look/);
 const badLayer=structuredClone(dflt);badLayer.shots[0].layers='moon-set';assert.throws(()=>validateProject(badLayer));
});
test('fresh topics: every quality check stays clean with dressed sets and the new pieces',async()=>{
 for(const topic of ['Why is the sky blue?','How does the internet move a message?','How do banks lend money?','How do bees make honey?']){
  const p=await film(topic),t=estimatedTimeline(p,plannedTimeline(p));
  assert.deepEqual(motionCheck(p,t).warnings,[],topic);assert.deepEqual(crowdingCheck(p,t).warnings,[],topic);assert.deepEqual(visibility2Check(p,t).warnings,[],topic);
 }
});
test('alternateArms (owner: "the characters move their left hand only"): beats alternate right/left across the film',async()=>{
 const {bodyPlan,bodyAt,applyBody,validateBodyLanguage}=await import('../src/core/body.js');
 const p=(await direct(read('fixa-sky-script.request'))).project;
 assert.ok(p.shots.filter(s=>s.bodyLanguage).every(s=>s.bodyLanguage.alternateArms===true),'Director dialogue default');
 // Measured-style timeline: every line ~3 s with a clear loudness peak, so every line gets a beat.
 const t={version:1,fps:30,sampleRate:48000,durationFrames:0,shots:[],speechEnvelope:{values:[]}};let f=0;
 for(const s of p.shots){const segs=s.narration.map((_,j)=>{const a=(f+10+j*100)*1600;return {startSample:a,endSample:a+90*1600,speaker:p.speech.shotSpeakers[s.id]?.[j]??Object.keys(s.speakerAssets??{})[0]};});
  const n=10+s.narration.length*100;t.shots.push({id:s.id,startFrame:f,endFrame:f+n,segments:segs});f+=n;}
 t.durationFrames=f;t.speechEnvelope.values=Array.from({length:f},(_,k)=>k%100===50?900:100);
 const beats=p.shots.flatMap((s,i)=>s.bodyLanguage?bodyPlan(p,t,i).beats:[]);
 assert.ok(beats.length>=6,beats.length);
 for(const id of new Set(beats.map(b=>b.id))){const arms=beats.filter(b=>b.id===id).map(b=>b.arm);assert.ok(arms.every((a,k)=>a===(k%2?'left':'right')),id+' '+arms);}
 // A left beat drives leftArmPitch only; a right beat armPitch only.
 const i=p.shots.findIndex((s,k)=>s.bodyLanguage&&bodyPlan(p,t,k).beats.some(b=>b.arm==='left')),b=bodyPlan(p,t,i).beats.find(x=>x.arm==='left');
 const o=bodyAt(p,t,b.frame+7,i)[b.id];assert.ok(o.beatLeft<0&&o.beat===undefined,JSON.stringify(o));
 const st=applyBody({assets:[{id:b.id,pose:{}}]},{[b.id]:o});assert.ok(st.assets[0].pose.leftArmPitch<0&&st.assets[0].pose.armPitch===undefined);
 // Without the option: the historical right arm only (accepted films unchanged).
 const old=structuredClone(p);for(const s of old.shots)if(s.bodyLanguage)delete s.bodyLanguage.alternateArms;
 const t2=structuredClone(t);const ob=old.shots.flatMap((s,k)=>s.bodyLanguage?bodyPlan(old,t2,k).beats:[]);assert.ok(ob.length===beats.length&&ob.every(x=>x.arm===undefined));
 // Contract: boolean only; it does not count as an 'enable' key.
 const bad=structuredClone(p);bad.shots[0].bodyLanguage.alternateArms='yes';assert.throws(()=>validateBodyLanguage(bad),/boolean/);
 const only=structuredClone(p);only.shots[0].bodyLanguage={alternateArms:true};assert.throws(()=>validateBodyLanguage(only),/enable at least one/);
 validateProject(p);
});
test('CPU painter: both robot eyes stay visible when the head turns (owner: "the robot has one eye")',async()=>{
 const {CRAFTED}=await import('../src/visual/crafted.js');assert.equal(CRAFTED.litBias,.18);
 const area=p=>Math.abs(p.reduce((s,q,i)=>{const r=p[(i+1)%p.length];return s+q[0]*r[1]-r[0]*q[1];},0))/2;
 const inside=(pt,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>pt[1])!==(yj>pt[1])&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c;}return c;};
 // Eyes = small glowing boxes at head height; visible when their biggest (front) face is not painted over by a later
 // face (a stricter rule than "any face": r3 frame 1620 showed only the bevel strips of one eye).
 const hiddenEyes=(look,asset,yaw,camY,camX=0)=>{
  const cam=[camX,camY,3.5],pr=createProjection(cam,[0,1.3,0],1400,[540,960]),{box,faces}=createMesh(cam,pr,.3,look),eyes=[];
  emitAsset(asset,(c,s,col,tf,lit,bias,role)=>{const n0=faces.length;box(c,s,col,tf,lit,bias,role);if(lit&&s[0]<.2&&s[1]<.2&&tf(c)[1]>1.3)eyes.push([n0,faces.length]);},{origin:[0,0,0],yaw,params:{detail:2}});
  assert.ok(faces.every(f=>Number.isFinite(f.z)),'finite painter depths');
  const order=faces.map((f,i)=>[f,i]).sort((a,b)=>b[0].z-a[0].z),rank=new Map(order.map(([,i],k)=>[i,k]));
  return eyes.filter(([a,b])=>{let i=a;for(let k=a;k<b;k++)if(area(faces[k].p)>area(faces[i].p))i=k;const f=faces[i],c=[0,1].map(d=>f.p.reduce((s,q)=>s+q[d],0)/f.p.length);return order.slice(rank.get(i)+1).some(([g])=>inside(c,g.p));}).length;
 };
 for(const look of ['crafted-v1','crafted-v2'])for(const asset of ['explorer-robot','service-robot'])for(let yaw=-.9;yaw<=.91;yaw+=.1)for(const camY of [1.2,2.4])for(const camX of [-1.5,0,1.5])
  assert.equal(hiddenEyes(look,asset,yaw,camY,camX),0,look+' '+asset+' yaw '+yaw.toFixed(1)+' cam '+camX+','+camY);
 // The historical (non-crafted) painter is unchanged: accepted films keep their frames, including this old flaw.
 assert.ok(hiddenEyes(null,'explorer-robot',.5,1.2)>0,'legacy unchanged');
});
