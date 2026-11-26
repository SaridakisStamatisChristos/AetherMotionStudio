// Owner choice "render progress bar": jobProgress reads the Studio job log (speech, preflight, Remotion non-TTY
// progress, verify, quality) and gives one bar for the whole job.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {jobProgress,formatSeconds,PROGRESS_STEPS} from '../src/studio/progress.js';
const job=(log,x={})=>({status:'running',mode:'render',log,...x});
const SPEECH='Speech-first compiled: 1950 frames; 65.0 seconds; 38 caption cues; estimated word timing\n';

test('steps follow the job log in order and the bar never goes backwards',()=>{
 const logs=['','Speech pace 0.92 kept\n',SPEECH,SPEECH+'Quality preflight: 0 accepted camera repairs; 0 candidate evaluations\n',
  SPEECH+'Bundling 40%\n',SPEECH+'Bundling 100%\nCopying public dir 2 MB\n',SPEECH+'Rendered 0/1950\n',SPEECH+'Rendered 975/1950, time remaining: 1m 2s\n',
  SPEECH+'Rendered 1950/1950\nEncoded 600/1950\n',SPEECH+'Encoded 1950/1950\n',SPEECH+'Encoded 1950/1950\nPASS: native 1950-frame Remotion MP4\n',SPEECH+'QUALITY: pass errors 0\n'];
 const steps=logs.map(l=>jobProgress(job(l)));
 assert.deepEqual(steps.map(s=>s.step),['starting','speech','speech','preflight','bundling','bundling','rendering','rendering','encoding','verifying','verifying','verifying']);
 for(let i=1;i<steps.length;i++)assert.ok(steps[i].percent>=steps[i-1].percent,'bar went back at '+i+': '+JSON.stringify(steps.slice(i-1,i+1)));
 const half=steps[7];assert.equal(half.percent,54);assert.equal(half.detail,'frame 975 of 1950 · about 1 min 2 s left');assert.ok(half.measured&&half.active);
 assert.equal(steps[1].measured,false,'speech has no frame count: shown as working, never a made-up share');
 assert.ok(steps.every(s=>s.percent<100),'only a finished job reaches 100%');
});
test('a finished job is complete; a failed job says where it stopped and keeps its percentage',()=>{
 const done=jobProgress(job(SPEECH+'Rendered 10/1950\n',{status:'succeeded'}));assert.equal(done.step,'complete');assert.equal(done.percent,100);assert.equal(done.active,false);
 const bad=jobProgress(job(SPEECH+'Rendered 975/1950\n',{status:'failed',error:'Native CLI exited 1'}));
 assert.equal(bad.step,'failed');assert.equal(bad.percent,54);assert.match(bad.label,/^Stopped while rendering frames: Native CLI exited 1$/);assert.equal(bad.active,false);
});
test('a prepare job is speech only; its bar ends with the speech',()=>{
 assert.equal(jobProgress(job(SPEECH,{mode:'prepare'})).percent,99);
 assert.equal(jobProgress(job('Speech pace 0.92\n',{mode:'prepare'})).percent,0);
});
test('negative: odd, partial or hostile logs never break the bar or leave 0..100',()=>{
 for(const log of [null,undefined,42,'Rendered x/y\n','Rendered 5/0\n','Rendered 900/300\n','Encoded -1/10\n','Bundling 999%\n','\r\r\n','Rendered 1/2'+'0'.repeat(400)])
 {const p=jobProgress(job(log));assert.ok(p&&p.percent>=0&&p.percent<=100&&Number.isInteger(p.percent),String(log).slice(0,40)+' → '+JSON.stringify(p));}
 assert.equal(jobProgress(null),null);assert.equal(jobProgress('x'),null);
 // a log line only counts at the start of a line (an echoed script sentence does not move the bar)
 assert.equal(jobProgress(job(SPEECH+'The robot said Rendered 1900/1950 today.\n')).step,'speech');
 // carriage-return progress (a TTY-style log) still reads the newest line
 assert.equal(jobProgress(job(SPEECH+'Rendered 10/100\rRendered 50/100\r')).detail,'frame 50 of 100');
});
test('formatSeconds and the step table',()=>{
 assert.equal(formatSeconds(7),'7 s');assert.equal(formatSeconds(62),'1 min 2 s');assert.equal(formatSeconds(120),'2 min');assert.equal(formatSeconds(-3),'0 s');
 const order=['speech','preflight','bundling','rendering','encoding','verifying','complete'];
 for(let i=1;i<order.length;i++)assert.ok(PROGRESS_STEPS[order[i]].from>=PROGRESS_STEPS[order[i-1]].to);
});
test('the page has the bar and uses jobProgress',()=>{
 const html=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../studio/app.js',import.meta.url),'utf8');
 for(const id of ['progress','progressLabel','progressBar','progressPct','progressDetail'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/import \{jobProgress,formatSeconds\} from '\/src\/studio\/progress\.js'/);assert.match(app,/showProgress\(j\)/);
});
test('hidden panels stay hidden: no class display rule may override [hidden] (the finished panel showed empty while rendering)',()=>{
 const css=readFileSync(new URL('../studio/style.css',import.meta.url),'utf8');
 assert.ok(css.includes('[hidden]{display:none!important}'));
 assert.ok(css.includes('.finished{display:grid'),'the rule matters: .finished sets its own display');
});
