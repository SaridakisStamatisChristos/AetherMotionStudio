// FIX-RS (owner-authorized unit, 2026-11-27): a frame must not be captured before the canvas's GPU work is done.
// gpu01-swatches frame 480 was captured as frame 478 (1 tab) or 464 (8 tabs) although the canvas held the right pixels;
// a 1-pixel read right after drawFilm forces the pending work to finish. Native evidence: CAMPAIGN_B.md "FIX-RS".
// This guard keeps the read in place and in order (the drawing itself is covered by the native renders).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/index.jsx',import.meta.url),'utf8');
test('the film component reads one pixel back after drawing every frame',()=>{
 const effect=src.slice(src.indexOf('useLayoutEffect(()=>{const ctx=ref.current'));
 const draw=effect.indexOf('drawFilm(ctx,scene,timeline,frame'),read=effect.indexOf('ctx.getImageData(0,0,1,1)'),end=effect.indexOf('},[frame,width,height,scene,timeline,fontsReady,mediaReady]');
 assert.ok(draw>0,'drawFilm call found');assert.ok(read>draw,'the read comes after drawing');assert.ok(end>read,'inside the same per-frame effect');
 assert.equal(/if\([^)]*\)\s*ctx\.getImageData\(0,0,1,1\)/.test(effect.slice(0,end)),false,'the read is unconditional');
});
test('no debug or timing hacks left in the film component',()=>{
 assert.equal(src.includes('TMPDBG'),false);assert.equal(src.includes('requestAnimationFrame'),false);
});

// FIX-RS bloom blur in JavaScript (src/core/fidelity.js blurRGBA): same operation as the canvas filter blur(sigma).
import {blurRGBA} from '../src/core/fidelity.js';
const img=(w,h,f)=>{const a=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)a.set(f(x,y),(y*w+x)*4);return a;};
test('blurRGBA: transparent stays transparent, an opaque interior keeps its colour, edges fade to transparent',()=>{
 const t=blurRGBA(img(30,30,()=>[200,10,10,0]),30,30,3);assert.ok(t.every(v=>v===0),'fully transparent in, fully transparent out (no colour from alpha 0)');
 const o=blurRGBA(img(40,40,()=>[120,60,30,255]),40,40,3),mid=(20*40+20)*4;
 assert.deepEqual([...o.slice(mid,mid+4)],[120,60,30,255]);
 assert.ok(o[3]<255&&o[3]>0,'corner alpha reduced: outside the image is transparent');
 assert.deepEqual([...o.slice(3,4)],[o[(39*40+39)*4+3]],'symmetric corners');
});
test('blurRGBA: an impulse spreads symmetrically and keeps its total weight',()=>{
 const w=41,c=20,a=blurRGBA(img(w,w,(x,y)=>x===c&&y===c?[255,255,255,255]:[0,0,0,0]),w,w,3);
 const al=(x,y)=>a[(y*w+x)*4+3];
 assert.equal(al(c-4,c),al(c+4,c));assert.equal(al(c,c-4),al(c,c+4));assert.equal(al(c-3,c-2),al(c+3,c+2));
 assert.ok(al(c,c)>al(c+3,c)&&al(c+3,c)>al(c+8,c));
 let s=0;for(let i=3;i<a.length;i+=4)s+=a[i];assert.ok(Math.abs(s-255)<60,'total alpha about one pixel, rounding only: '+s);
 for(let i=0;i<a.length;i+=4)if(a[i+3])assert.equal(a[i],255,'premultiplied blur keeps the hue of a white source');
});
test('blurRGBA refuses wrong sizes and unsafe sigma',()=>{
 for(const [w,h,len] of [[2,2,15],[0,1,0],[1.5,2,12],[2,2,17]])assert.throws(()=>blurRGBA(new Uint8ClampedArray(len),w,h,3),/size mismatch/);
 for(const s of [0,-1,NaN,Infinity,17])assert.throws(()=>blurRGBA(new Uint8ClampedArray(16),2,2,s),/sigma/);
});
test('the bloom pass uses blurRGBA, never the canvas blur filter',()=>{
 const fe=readFileSync(new URL('../src/visual/fidelity-effects.js',import.meta.url),'utf8');
 const bloom=fe.slice(fe.indexOf('if(f.bloom>0){'),fe.indexOf('if(f.grade>0)'));
 assert.ok(bloom.includes('blurRGBA(data.data,s.width,s.height,3)'));assert.equal(/filter\s*=\s*'blur/.test(bloom),false);
});
