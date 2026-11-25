// POLISH-03: narration placement (audio.placement / speech.placement) and mix-v2 inside speech projects.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProject} from '../src/core/timeline.js';
import {validateSpeechConfig} from '../src/core/speech.js';

const shot={id:'a',template:'cinematic-graph',backend:'cpu',durationFrames:90,transitionFrames:0,heading:'A',subheading:'a',environment:'amber',camera:{},effects:[],narration:['x'],assets:[{id:'r',asset:'engineer',tracks:{x:[[0,0]]}}]};
const project=extra=>({version:2,id:'p3',title:'t',voice:'af_heart',shots:[shot],...extra});
const speechExample=()=>JSON.parse(readFileSync(new URL('../examples/quality-cpu-polished.json',import.meta.url),'utf8'));

test('audio.placement: center or lead, alone or with master; negatives',()=>{
 for(const audio of [{placement:'lead'},{placement:'center'},{master:'mix-v2',placement:'lead'},{master:'mix-v2'}])validateProject(project({audio}));
 for(const audio of [{},{placement:'end'},{placement:1},{master:'loud',placement:'lead'},{placement:'lead',gap:1}])assert.throws(()=>validateProject(project({audio})),/audio/);
});
test('speech projects: speech.placement and speech.mix.master validated; audio field still rejected',()=>{
 const p=speechExample();validateProject(p);
 const q=structuredClone(p);q.speech.placement='lead';q.speech.mix.master='mix-v2';validateProject(q);validateSpeechConfig(q.speech);
 for(const mut of [s=>{s.speech.placement='end';},s=>{s.speech.mix.master='loud';},s=>{s.speech.mix.gain=2;},s=>{s.audio={placement:'lead'};}]){const r=structuredClone(p);mut(r);assert.throws(()=>validateProject(r));}
 assert.equal(p.speech.placement,undefined);assert.equal(p.speech.mix.master,undefined,'existing speech example unchanged');
});
test('extended film: lead placement and the three extra lines; POWER ON script unchanged',()=>{
 const p=JSON.parse(readFileSync(new URL('../examples/workshop-extended-cpu-polished.json',import.meta.url),'utf8')),n=id=>p.shots.find(s=>s.id===id).narration;
 assert.deepEqual(p.audio,{master:'mix-v2',placement:'lead'});
 assert.deepEqual(n('toolbox'),['From the toolbox, she brings the one tool they need.','Careful steps, steady hands, and the wrench changes hands.']);
 assert.deepEqual(n('teach'),['It learns by watching. Point, look, and follow.','Every gesture becomes a lesson.']);
 assert.deepEqual(n('shelf'),['Now it tries on its own: up to the high shelf, and down onto the table.','No one shows it how this time.']);
 const art05=JSON.parse(readFileSync(new URL('../examples/art05-workshop-cpu-polished.json',import.meta.url),'utf8'));
 assert.deepEqual(n('power'),art05.shots.find(s=>s.id==='power').narration);
});
