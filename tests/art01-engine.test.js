// ART-01 slice 2: opt-in flow interpolation, camera interpolation and held actions. Defaults unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {keyframes,flowKeyframes,interpolate,INTERPOLATIONS} from '../src/core/motion.js';
import {validateProject} from '../src/core/timeline.js';
import {evaluateGraph} from '../src/core/graph.js';

const read=name=>JSON.parse(readFileSync(new URL('../examples/'+name+'.json',import.meta.url),'utf8'));
const product=()=>structuredClone(read('art01-product-cpu-polished').shots[0]);
const project=shot=>({version:2,id:'art01-engine-test',title:'engine test',voice:'af_heart',shots:[shot]});
const slope=(f,t,e=1e-4)=>(f(t+e)-f(t-e))/(2*e);

test('flow passes through every key, stays within neighbouring keys and keeps velocity through monotone keys',()=>{
 const k=[[0,0],[.3,.5],[.6,.6],[1,2]],f=t=>flowKeyframes(t,k),e=t=>keyframes(t,k);
 for(const [t,v] of k)assert.ok(Math.abs(f(t)-v)<1e-12);
 for(let i=0;i<k.length-1;i++)for(let s=0;s<=50;s++){const t=k[i][0]+(k[i+1][0]-k[i][0])*s/50,v=f(t);assert.ok(v>=Math.min(k[i][1],k[i+1][1])-1e-12&&v<=Math.max(k[i][1],k[i+1][1])+1e-12,'overshoot at '+t);}
 assert.ok(Math.abs(slope(e,.3))<1e-3,'ease stops at interior key');assert.ok(slope(f,.3)>.3,'flow keeps moving through interior key');
 assert.ok(Math.abs(slope(f,.3-1e-3)-slope(f,.3+1e-3))<.05,'C1 at interior key');
});

test('flow is flat at extrema and ends, equals ease for two keys, and is clamped outside the key range',()=>{
 const k=[[0,0],[.5,1],[1,0]];assert.ok(Math.abs(slope(t=>flowKeyframes(t,k),.5))<1e-3);
 for(const t of [0,.2,.5,.77,1])assert.equal(flowKeyframes(t,[[0,1],[1,3]]),keyframes(t,[[0,1],[1,3]]));
 const m=[[.2,1],[.5,2],[.8,4]];assert.equal(flowKeyframes(0,m),1);assert.equal(flowKeyframes(1,m),4);
 assert.equal(flowKeyframes(.5,[[.5,7]]),7);
});

test('interpolate dispatches only known modes; ease is the historical keyframes path',()=>{
 assert.deepEqual(INTERPOLATIONS,['ease','flow']);
 const k=[[0,0],[.4,1],[1,-1]];for(const t of [0,.1,.4,.66,1])assert.equal(interpolate(t,k),keyframes(t,k));
 assert.throws(()=>interpolate(.5,k,'linear'),/Unknown interpolation/);assert.throws(()=>flowKeyframes(.5,[[0,0],[0,1]]),/strictly ordered/);
});

test('explicit ease and absent interpolation evaluate identically (default unchanged)',()=>{
 const a=product(),b=product();b.assets[0].interpolation={yaw:'ease',x:'ease'};b.cameraInterpolation={x:'ease',y:'ease',z:'ease',zoom:'ease'};
 validateProject(project(b));for(const p of [0,.21,.42,.6,.83,1])assert.deepEqual(evaluateGraph(b,p),evaluateGraph(a,p));
});

test('asset and camera flow change motion only between keys, deterministically, same for both backends',()=>{
 const s=product();s.assets[0].interpolation={x:'flow'};s.cameraInterpolation={zoom:'flow'};validateProject(project(s));
 const x=p=>evaluateGraph(s,p).assets[0].pose.origin[0],z=p=>evaluateGraph(s,p).camera.zoom,base=product();
 assert.ok(Math.abs(slope(x,.42))>1e-3,'x flows through .42');assert.ok(Math.abs(slope(p=>evaluateGraph(base,p).assets[0].pose.origin[0],.42))<1e-3);
 assert.ok(slope(z,.55)>10,'zoom flows through .55');
 for(const p of [0,.55,1])assert.equal(evaluateGraph(s,p).camera.zoom,evaluateGraph(base,p).camera.zoom,'zoom key '+p);
 for(const p of [0,.42,1])assert.ok(Math.abs(x(p)-evaluateGraph(base,p).assets[0].pose.origin[0])<1e-12,'x key '+p);
 const t=structuredClone(s);t.backend='three';for(const p of [.1,.5,.9])assert.deepEqual({...evaluateGraph(t,p),backend:null},{...evaluateGraph(s,p),backend:null});
});

test('camera rig path honours cameraInterpolation',()=>{
 const s=product();s.cameraRig={preset:'orbit',subject:'subject'};s.camera={zoom:[[0,1000],[.5,1100],[1,1300]]};
 validateProject(project(s));const flat=slope(p=>evaluateGraph(s,p).camera.zoom,.5);
 s.cameraInterpolation={zoom:'flow'};validateProject(project(s));
 assert.ok(Math.abs(flat)<1);assert.ok(slope(p=>evaluateGraph(s,p).camera.zoom,.5)>50);
});

test('hold keeps the end pose after the window; without hold the channel snaps back',()=>{
 const s=product();delete s.assets[0].tracks.yaw;s.assets[0].actions=[{name:'presentation-turn',start:.1,end:.6,blend:.2,hold:true}];
 validateProject(project(s));const yaw=p=>evaluateGraph(s,p).assets[0].pose.yaw;
 assert.ok(Math.abs(yaw(.6)-.65)<1e-9);for(const p of [.61,.8,1])assert.equal(yaw(p),yaw(.6));
 assert.equal(yaw(.05),0);assert.ok(Math.abs(yaw(.1))<1e-12,'blend fades in from base, no pop at start');
 const n=structuredClone(s);delete n.assets[0].actions[0].hold;n.assets[0].actions[0].blend=0;assert.equal(evaluateGraph(n,.61).assets[0].pose.yaw,0);
 const r=structuredClone(s);r.assets[0].actions[0].mode='relative';validateProject(project(r));assert.ok(Math.abs(evaluateGraph(r,1).assets[0].pose.yaw-1.3)<1e-9);
});

test('negative: malformed interpolation and hold are rejected with explicit paths',()=>{
 const bad=(mut,re)=>{const s=product();mut(s);assert.throws(()=>validateProject(project(s)),re);};
 bad(s=>s.assets[0].interpolation={yaw:'linear'},/interpolation\.yaw: unsupported interpolation/);
 bad(s=>s.assets[0].interpolation={z:'flow'},/interpolation\.z: interpolation requires a track/);
 bad(s=>s.assets[0].interpolation={},/non-empty object/);
 bad(s=>s.assets[0].interpolation=['flow'],/non-empty object/);
 bad(s=>s.assets[0].interpolation={__proto__:null,['constructor']:'flow'},/requires a track/);
 bad(s=>s.cameraInterpolation={yaw:'flow'},/cameraInterpolation\.yaw: interpolation requires a track/);
 bad(s=>s.cameraInterpolation={zoom:'cubic'},/unsupported interpolation/);
 bad(s=>s.assets[0].actions[3].hold=true,/hold must be true and is not allowed with loop/);
 bad(s=>s.assets[0].actions[0].hold=false,/hold must be true/);
 bad(s=>s.assets[0].actions[0].hold='yes',/hold must be true/);
 bad(s=>s.assets[0].actions[0].holdFor=1,/unknown field/);
 const chapter=read('blockchain-60s');assert.equal(chapter.version,2);assert.notEqual(chapter.shots[0].template,'cinematic-graph');
 validateProject(structuredClone(chapter));chapter.shots[0].cameraInterpolation={x:'flow'};
 assert.throws(()=>validateProject(chapter),/cameraInterpolation: unknown field/);
});

test('art01-flow fixture: matched pair, continuous, held final lift, flow through keys; product fixture untouched',()=>{
 const a=read('art01-flow-cpu-polished'),b=read('art01-flow-three-polished');validateProject(a);validateProject(b);
 assert.deepEqual(a.shots,b.shots.map(s=>({...s,backend:'cpu'})));
 const s=a.shots[0],p=product(),pose=(x,t)=>evaluateGraph(x,t).assets[0].pose;
 let prev=null;for(let f=0;f<180;f++){const q=pose(s,f/179),v=[q.origin[0],q.origin[1],q.yaw,q.scale];if(prev)v.forEach((x,i)=>assert.ok(Math.abs(x-prev[i])<=[.02,.05,.06,.04][i],'step '+f+':'+i));prev=v;}
 assert.ok(Math.abs(pose(s,1).origin[1]-.12)<1e-9);assert.equal(pose(s,1).origin[1],pose(s,.97).origin[1]);assert.equal(pose(p,1).origin[1],0);
 assert.ok(Math.abs(slope(t=>pose(s,t).origin[0],.42))>.1);assert.ok(slope(t=>evaluateGraph(s,t).camera.zoom,.55)>100);
 const {interpolation,actions,...restA}=s.assets[0],{actions:actionsP,...restP}=p.assets[0];assert.deepEqual(restA,restP);
 const {cameraInterpolation,assets,...shotA}=s,{assets:assetsP,...shotP}=p;assert.deepEqual(shotA,shotP);
});
