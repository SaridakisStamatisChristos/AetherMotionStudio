// GPU-07 'topic-v4' rooms (owner 2026-11-28: every set improved plus classroom, workshop and grand interior; "calm and
// tidy"). Default for Cinematic dialogue films (request.renderProfile); 'topic-v3' and older stay unchanged.
// - Ten topic categories: the seven of topic-v2 plus education (classroom), making (workshop) and heritage (hall),
//   scored from the topic (×4) and the narration (×1) with the topic-v2 words and the words below.
// - The film gets ONE room (layers) and ONE prop layout (shot.dressing, the same in every graph shot: the place keeps
//   its identity across shots), chosen at plan time from the room's candidate props.
// - Sightlines: a tall prop (taller than TALL metres) is never placed behind any speaker. Each character's x range
//   (its x track over the whole film) is projected onto the prop's depth from a nominal camera distance; a tall prop
//   whose footprint meets that strip tries its next spot and is left out when none is clear. Low props may stand anywhere.
// - Props never overlap each other; calm and tidy: at most the listed candidates (4–6 per room).
// Deterministic; catalog props only; drawn by both renderers through the shared box stream.
import {recipeSpec} from '../visual/catalog-rig.js';
import {emitAsset} from '../visual/assets.js';
export const ROOMS_V4=Object.freeze({version:'topic-v4',
 layers:Object.freeze({technology:'tech-room',science:'lab-room',architecture:'street-room',business:'office-room',nature:'forest-room',vehicles:'street-room',everyday:'home-room',education:'classroom',making:'workshop',heritage:'hall'}),
 environments:Object.freeze({education:'amber',making:'amber',heritage:'amber'}),
 // the object between the speakers for the new categories (they have no catalog category of their own), in order
 centerPieces:Object.freeze({education:Object.freeze(['book-stack','open-book','desk-lamp']),making:Object.freeze(['toolbox','3d-printer','robot-arm']),heritage:Object.freeze(['stone-gate','temple','picture-frame'])}),
 words:Object.freeze({
  education:'school schools learn learning lesson lessons student students teacher teachers teach teaching class classes classroom homework exam exams study studying math maths reading writing grammar alphabet spelling',
  making:'make making maker makers craft crafts repair repairs fix fixing workshop engineer engineers engineering invent inventor invention inventions machine machines robot robots printer printing woodwork tool tools',
  heritage:'history historical museum museums art artist artists painting paintings sculpture sculptures culture cultures ancient empire empires king kings queen queens palace castle castles medieval roman romans greek greeks egypt egyptian pharaoh pharaohs pyramid pyramids'
 }),
 // [asset, [x spots in order of preference], z, yaw, scale]
 pieces:Object.freeze({
  'lab-room':[['bookshelf',[-2.7,0,-3.6],-3.9,.35,.9],['laboratory-centrifuge',[-1.7,-2.4],-3.1,.2,.8],['microscope',[2.1,1.4],-3.0,-.3,.8],['filing-cabinet',[2.9,3.6],-3.9,-.35,.85]],
  'tech-room':[['server-rack',[-2.8,-3.6],-3.9,.3,.9],['control-panel',[2.3,1.6],-3.2,-.35,.85],['data-storage',[3.0,3.6],-3.9,-.35,.85],['desktop-computer',[0,-1.2],-3.4,0,.8]],
  'office-room':[['bookshelf',[-2.7,0,-3.6],-3.9,.35,.9],['desk',[2.3,1.5],-3.3,-.3,.85],['filing-cabinet',[-1.9,-2.6],-4.0,.3,.85],['flower-pot',[3.2,2.9],-2.9,0,.8]],
  'street-room':[['bench',[-1.6,0],-3.6,.25,.85],['trash-bin',[2.0,1.4],-2.9,0,.8],['flower-pot',[3.2,-3.2],-2.8,0,.8],['floor-lamp',[-3.3,3.4,0],-3.4,0,1]],
  'forest-room':[['bush',[-1.8,1.6],-3.0,.4,.8],['rock-cluster',[1.9,-1.2],-2.9,.3,.8],['fern',[-2.5,2.6],-2.7,0,.7],['pine-tree',[-3.4,3.5,0],-4.3,0,1],['oak-tree',[3.4,-3.6],-4.4,0,1]],
  'home-room':[['sofa',[2.5,-2.2],-3.7,-.3,.85],['flower-pot',[3.1,-3.1],-2.9,0,.8],['bookshelf',[-2.9,0,-3.6],-3.9,.35,.9],['armchair',[-1.9,1.9],-3.4,.3,.8],['floor-lamp',[-3.5,3.6],-4.2,0,.9]],
  classroom:[['desk',[-2.1],-3.0,0,.8],['desk',[2.1],-3.0,0,.8],['desk',[0,1.2],-4.1,0,.85],['bookshelf',[-3.5,3.5,0],-4.3,.3,.9],['flower-pot',[3.3,-3.3],-3.6,0,.8]],
  workshop:[['table',[-2.2,2.2],-3.2,.2,.9],['stool',[-1.4,1.4],-2.7,0,.8],['toolbox',[2.6,-2.6],-2.8,-.2,.8],['3d-printer',[2.2,-1.2],-3.6,-.3,.75],['cabinet',[3.5,-3.5,0],-4.2,-.3,.9]],
  hall:[['bench',[0,-1.4],-3.6,0,.9],['flower-pot',[-2.6,2.6],-3.0,0,.9],['flower-pot',[2.6,-2.6],-3.0,0,.9],['cabinet',[-3.4,0],-4.2,.3,.9],['cabinet',[3.4,0],-4.2,-.3,.9]]
 })
});
export const SIGHTLINE=Object.freeze({camera:7.5,tall:1.15,body:.45,margin:.3});
const sizeCache=new Map();
// Height and half-width (metres, at the given scale and yaw) of a catalog prop, from its emitted geometry.
export function pieceSize(id,yaw,scale){
 const k=id+':'+yaw+':'+scale;let v=sizeCache.get(k);if(v)return v;
 let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 emitAsset(id,(c,s,col,tf=p=>p)=>{for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){const p=tf([c[0]+x*s[0],c[1]+y*s[1],c[2]+z*s[2]]);for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i]);}}},{origin:[0,0,0],yaw,scale});
 v={height:hi[1],halfX:Math.max(-lo[0],hi[0]),halfZ:Math.max(-lo[2],hi[2])};sizeCache.set(k,v);return v;
}
const character=a=>['human','robot'].includes(recipeSpec(a.asset)?.family);
// Every character's x range and depth over the film's graph shots (from its tracks).
export function characterSpans(project){
 const out=[];
 for(const s of project.shots)if(s.template==='cinematic-graph')for(const a of s.assets??[])if(character(a)){
  const xs=Array.isArray(a.tracks?.x)?a.tracks.x.map(q=>q[1]):[0],z=Array.isArray(a.tracks?.z)?Math.max(...a.tracks.z.map(q=>q[1])):0;
  out.push({lo:Math.min(...xs),hi:Math.max(...xs),z});}
 return out;
}
// Whether a footprint [x-half, x+half] at depth zp lies in front of the camera's view of any character.
export function blocksSightline(x,half,zp,spans){
 const C=SIGHTLINE.camera;
 return spans.some(c=>{const k=(C-zp)/(C-Math.min(c.z,C-1)),a=c.lo*k-SIGHTLINE.body*k-SIGHTLINE.margin,b=c.hi*k+SIGHTLINE.body*k+SIGHTLINE.margin;return x+half>a&&x-half<b;});
}
// The film's prop layout for a room: [[asset, x, z, yaw, scale]].
export function dressRoom(room,spans){
 const placed=[],out=[];
 for(const [id,xs,z,yaw,scale] of ROOMS_V4.pieces[room]??[]){
  const sz=pieceSize(id,yaw,scale),tall=sz.height>SIGHTLINE.tall;
  for(const x of xs){
   if(tall&&blocksSightline(x,sz.halfX,z,spans))continue;
   if(placed.some(p=>Math.abs(p.x-x)<p.halfX+sz.halfX+.05&&Math.abs(p.z-z)<p.halfZ+sz.halfZ+.05))continue;
   placed.push({x,z,halfX:sz.halfX,halfZ:sz.halfZ});out.push([id,x,z,yaw,scale]);break;
  }
 }
 return out;
}
