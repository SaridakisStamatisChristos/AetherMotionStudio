// DUAL-06 output formats (opt-in project field `format`; absent = 'vertical-v1', the historical 1080×1920 layout,
// drawn exactly as before). Owner decision (2026-11-26): the new sizes are opt-in presets; the default stays
// 1080×1920 at 30 fps. Only these combinations are supported; anything else is rejected.
//
// Every format draws on a logical canvas 1.5× smaller than its output (text sizes keep their physical size).
// The 3D world is drawn in "vertical-equivalent" coordinates (the 720×1280 space every camera, framing and check
// was designed in) through one transform that keeps the vertical field of view: wider formats see more at the
// sides and never less, so nothing visible in the vertical film is cut. 2D layers reflow per format: composition
// regions, the caption box and the progress bar have their own positions (text is re-wrapped, never stretched).
export const DEFAULT_FORMAT='vertical-v1';
const R=o=>Object.freeze(o);
export const FORMATS=R({
 'vertical-v1':R({id:'vertical-v1',width:1080,height:1920,fps:30,logical:R({w:720,h:1280}),
  regions:R({upper:R({x:48,y:150,w:584,h:240}),full:R({x:48,y:150,w:584,h:700})}),
  caption:R({left:42,width:636,bottom:1171,maxText:592}),progress:R({x:54,y:1212,w:612})}),
 'landscape-v1':R({id:'landscape-v1',width:1920,height:1080,fps:30,logical:R({w:1280,h:720}),
  regions:R({upper:R({x:128,y:36,w:1024,h:170}),full:R({x:128,y:36,w:1024,h:500})}),
  caption:R({left:240,width:800,bottom:676,maxText:756}),progress:R({x:96,y:700,w:1088})}),
 'square-v1':R({id:'square-v1',width:1080,height:1080,fps:30,logical:R({w:720,h:720}),
  regions:R({upper:R({x:48,y:36,w:624,h:170}),full:R({x:48,y:36,w:624,h:500})}),
  caption:R({left:42,width:636,bottom:676,maxText:592}),progress:R({x:54,y:700,w:612})})
});
export const FORMAT_IDS=Object.freeze(Object.keys(FORMATS));
const fail=(p,m)=>{throw Error(p+': '+m)};
export const formatOf=scene=>FORMATS[scene?.format??DEFAULT_FORMAT];
export const formatById=id=>FORMATS[id??DEFAULT_FORMAT];
// The world transform: vertical-equivalent (720×1280 space) → this format's logical canvas.
// k keeps the vertical field of view; the vertical centre column 360 lands on the format's centre.
export function worldMap(f){const L=f.logical,k=L.h/1280,halfW=L.w/2/k;return {k,cx:L.w/2,x0:360-halfW,x1:360+halfW,
 toLogical:([x,y])=>[(x-360)*k+L.w/2,y*k],toWorld:([x,y])=>[(x-L.w/2)/k+360,y/k]};}
// Which projects may use a non-vertical format (tested combinations only). Throws with an explicit reason.
export function validateFormat(s){
 if(s.format===undefined)return;
 if(!Object.hasOwn(FORMATS,s.format))fail('film.format',FORMAT_IDS.join(', ')+' or absent');
 if(s.format===DEFAULT_FORMAT)return;
 const why=m=>fail('film.format',s.format+' '+m+' (only tested combinations are supported)');
 if(s.delivery!==undefined)why('cannot be combined with Reels delivery, which is 9:16 only');
 for(const [i,x] of s.shots.entries()){
  if(x?.template!=='cinematic-graph')why('needs cinematic-graph shots; shots['+i+'] is '+x?.template);
  if(x.titles!=='none')why('needs titles "none" on every shot (shot titles are laid out for 9:16); shots['+i+']');
  if(x.overlays!==undefined)why('does not support legacy overlays; use a composition instead (shots['+i+'])');
  if(x.geometryProfile!==undefined)why('does not support Foundry geometry profiles yet (shots['+i+'])');
 }
}
