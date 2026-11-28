// GPU-07 'topic-v4' rooms (owner 2026-11-28: all six rooms improved plus classroom, workshop and grand interior;
// "calm and tidy"): topics pick meaningfully different rooms, one prop layout per film (identity across shots), tall
// props never behind a speaker, shot.dressing validated, Cinematic dialogue default only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct} from '../src/director/index.js';
import {request} from '../src/director/schema.js';
import {validateProject} from '../src/core/timeline.js';
import {ROOMS,FAR_BACKDROPS,emitEnvironment} from '../src/core/cinematography.js';
import {ROOMS_V4,SIGHTLINE,pieceSize,characterSpans,blocksSightline,dressRoom} from '../src/director/rooms.js';
const q=JSON.parse(readFileSync(new URL('../examples/gpu06-dialogue.request.json',import.meta.url),'utf8'));
const film=async(topic,extra={})=>(await direct({...q,id:'gpu07-t',topic,script:'What is this about? It is about '+topic.toLowerCase()+'. Why does it matter? Because it shapes how we live. Can you tell me more? Yes, there is a lot to learn.',...extra})).project;
const graph=p=>p.shots.filter(s=>s.template==='cinematic-graph');

test('rooms: every topic-v4 layer has a back wall and candidate props; the three new places exist',()=>{
 for(const room of new Set(Object.values(ROOMS_V4.layers))){assert.ok(Object.hasOwn(ROOMS,room),room);assert.equal(typeof FAR_BACKDROPS[ROOMS[room]],'function',room);assert.ok(ROOMS_V4.pieces[room].length>=4&&ROOMS_V4.pieces[room].length<=6,room+' calm and tidy');}
 for(const r of ['classroom','workshop','hall'])assert.ok(Object.values(ROOMS_V4.layers).includes(r));
 const boxes=[];emitEnvironment({layers:'classroom',dressing:[['desk',0,-3,0,.8]]},(...b)=>boxes.push(b));assert.ok(boxes.length>20);
});

test('fresh topics pick meaningfully different rooms without hand edits',async()=>{
 const want={'How a school lesson works':'classroom','How to repair a bike in a workshop':'workshop','Ancient Egypt and its pharaohs':'hall','How the internet sends messages':'tech-room','Why forests matter':'forest-room'};
 for(const [topic,room] of Object.entries(want)){const p=await film(topic);assert.ok(graph(p).every(s=>s.layers===room),topic+' → '+room);}
});

test('one prop layout per film; tall props never stand behind any speaker; props never overlap',async()=>{
 for(const topic of ['Why we dream','How a school lesson works','How to repair a bike in a workshop','Ancient Egypt and its pharaohs','Why forests matter']){
  const p=await film(topic),shots=graph(p),d=shots[0].dressing;validateProject(p);
  assert.ok(d.length>=2,topic+' has props');for(const s of shots)assert.deepEqual(s.dressing,d,'same layout in every shot');
  const spans=characterSpans(p);
  for(const [id,x,z,yaw,scale] of d){const sz=pieceSize(id,yaw,scale);if(sz.height>SIGHTLINE.tall)assert.equal(blocksSightline(x,sz.halfX,z,spans),false,topic+': '+id+' behind a speaker');}
  for(let i=0;i<d.length;i++)for(let j=i+1;j<d.length;j++){const a=pieceSize(d[i][0],d[i][3],d[i][4]),b=pieceSize(d[j][0],d[j][3],d[j][4]);
   assert.ok(Math.abs(d[i][1]-d[j][1])>=a.halfX+b.halfX||Math.abs(d[i][2]-d[j][2])>=a.halfZ+b.halfZ,topic+': '+d[i][0]+' overlaps '+d[j][0]);}
 }
 // the regression that started GPU-07: in the "Why we dream" home room no lamp or shelf stands in a speaker's sightline
 const p=await film('Why we dream'),spans=characterSpans(p);
 for(const [id,x,z,yaw,scale] of graph(p)[0].dressing)if(['floor-lamp','bookshelf'].includes(id))assert.equal(blocksSightline(x,pieceSize(id,yaw,scale).halfX,z,spans),false);
 // a tall prop whose every spot is blocked is left out
 assert.deepEqual(dressRoom('hall',[{lo:-9,hi:9,z:0}]).filter(([id,,,yaw,s])=>pieceSize(id,yaw,s).height>SIGHTLINE.tall),[]);
});

test('Cinematic dialogue default only; Standard keeps topic-v3; request.sets accepts topic-v4',async()=>{
 const {renderProfile,cinematic,...std}=q,s=(await direct({...std,id:'gpu07-s'})).project;
 assert.ok(graph(s).every(x=>!x.dressing&&!Object.hasOwn(ROOMS,x.layers??'')),'GPU Standard unchanged');
 const v4=(await direct({...std,id:'gpu07-s4',sets:'topic-v4'})).project;assert.ok(graph(v4).every(x=>Array.isArray(x.dressing)));
 assert.throws(()=>request({...q,sets:'topic-v5'}),/request.sets/);
});

test('shot.dressing validation: room layer required; catalog props only; bounded; at most 12',async()=>{
 const p=await film('How a school lesson works'),i=p.shots.findIndex(s=>s.dressing);
 const bad=(f,re)=>{const x=structuredClone(p);f(x.shots[i]);assert.throws(()=>validateProject(x),re);};
 bad(s=>{s.layers='home-set-2';},/needs a room layer/);
 bad(s=>{s.dressing=[['student',0,-3,0,1]];},/unsuitable catalog piece/);
 bad(s=>{s.dressing=[['no-such-thing',0,-3,0,1]];},/unsuitable catalog piece/);
 bad(s=>{s.dressing=[['desk',0,-1,0,1]];},/out of range/);
 bad(s=>{s.dressing=[['desk',0,-3,0,3]];},/out of range/);
 bad(s=>{s.dressing=[['desk',0,-3,0]];},/required/);
 bad(s=>{s.dressing=Array(13).fill(['desk',0,-3,0,1]);},/at most 12/);
 bad(s=>{s.dressing='desk';},/at most 12/);
});
