// GEN-15 look track step 1: the opt-in 'crafted-v1' look (shot field `look`). Owner: "go to the better looking shapes
// and materials". Same semantic boxes as always (geometry digests, checks and attachments unchanged); only how each box
// is drawn changes, identically on both renderers:
// - bevel: every box is drawn as a chamfered box (6 inset faces, 12 edge strips, 8 corner triangles) with an
//   ABSOLUTE radius (BEVEL.max, smaller on thin parts), so thin parts are not squashed the way a scaled unit
//   rounded box is;
// - palette: colours are softened (a little less saturation, lifted darks, a warm bias) for a crafted, toy-like read;
// - shading: the CPU painter uses softer light falloff and a slight catch light on bevel strips; Three uses matte,
//   non-metallic materials with the same chamfered geometry.
export const CRAFTED=Object.freeze({version:'crafted-v1',bevel:Object.freeze({max:.035,share:.22,min:.004}),
 palette:Object.freeze({saturation:.86,lift:.06,warm:.018}),
 light:Object.freeze({ambient:.66,key:.32,fill:.1,bevel:.06})});
export const LOOKS=Object.freeze(['crafted-v1']);

export function bevelRadius(size){const m=Math.min(...size.map(Math.abs));return m<=0?0:Math.min(CRAFTED.bevel.max,m*CRAFTED.bevel.share);}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cache=new Map();
// Polygons of a chamfered box of full size `size`, centred at the origin, in local box coordinates.
// Each polygon: {verts:[[x,y,z],...] (outward, counter-clockwise seen from outside), kind:'face'|'edge'|'corner'}.
export function chamferedBox(size){
 const key=size.map(v=>Math.round(v*1e4)).join(',');if(cache.has(key))return cache.get(key);
 const [a,b,c]=size.map(v=>Math.abs(v)/2),r=Math.min(bevelRadius(size),a*.999,b*.999,c*.999);
 if(!(r>CRAFTED.bevel.min)){const out=plainBox(a,b,c);cache.set(key,out);return out;}
 const X=(sx,sy,sz)=>[sx*a,sy*(b-r),sz*(c-r)],Y=(sx,sy,sz)=>[sx*(a-r),sy*b,sz*(c-r)],Z=(sx,sy,sz)=>[sx*(a-r),sy*(b-r),sz*c];
 const polys=[];const add=(verts,kind)=>polys.push(orient(verts,kind));
 for(const s of [-1,1]){add([X(s,-1,-1),X(s,1,-1),X(s,1,1),X(s,-1,1)],'face');add([Y(-1,s,-1),Y(1,s,-1),Y(1,s,1),Y(-1,s,1)],'face');add([Z(-1,-1,s),Z(1,-1,s),Z(1,1,s),Z(-1,1,s)],'face');}
 for(const p of [-1,1])for(const q of [-1,1]){
  add([Y(-1,p,q),Y(1,p,q),Z(1,p,q),Z(-1,p,q)],'edge');// along x
  add([X(p,-1,q),X(p,1,q),Z(p,1,q),Z(p,-1,q)],'edge');// along y
  add([X(p,q,-1),X(p,q,1),Y(p,q,1),Y(p,q,-1)],'edge');// along z
 }
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])add([X(sx,sy,sz),Y(sx,sy,sz),Z(sx,sy,sz)],'corner');
 cache.set(key,polys);if(cache.size>20000)cache.clear();return polys;
}
function plainBox(a,b,c){const v=(x,y,z)=>[x*a,y*b,z*c],polys=[];
 for(const s of [-1,1]){polys.push(orient([v(s,-1,-1),v(s,1,-1),v(s,1,1),v(s,-1,1)],'face'),orient([v(-1,s,-1),v(1,s,-1),v(1,s,1),v(-1,s,1)],'face'),orient([v(-1,-1,s),v(1,-1,s),v(1,1,s),v(-1,1,s)],'face'));}
 return polys;}
// Order a convex polygon of a centred convex solid counter-clockwise seen from outside (its centroid points outward).
function orient(verts,kind){const m=verts.reduce((s,p)=>s.map((x,i)=>x+p[i]/verts.length),[0,0,0]),n=cross(sub(verts[1],verts[0]),sub(verts[2],verts[0]));
 return {verts:dot(n,m)<0?[...verts].reverse():verts,kind};}
// Softened colour (hex in, hex out), cached.
const colours=new Map();
export function craftedColor(hex){
 if(colours.has(hex))return colours.get(hex);
 const m=/^#?([0-9a-f]{6})$/i.exec(hex);if(!m){colours.set(hex,hex);return hex;}
 const n=parseInt(m[1],16),rgb=[n>>16&255,n>>8&255,n&255].map(v=>v/255),P=CRAFTED.palette,grey=(rgb[0]+rgb[1]+rgb[2])/3;
 const out=rgb.map((v,i)=>{let x=grey+(v-grey)*P.saturation;x=P.lift+x*(1-P.lift);x+=i===0?P.warm:i===2?-P.warm:0;return Math.max(0,Math.min(1,x));});
 const h='#'+out.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');colours.set(hex,h);return h;
}
