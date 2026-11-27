// DUAL-05: decoded images available to the shared 2D path, keyed by SHA-256. The Remotion entry (src/index.jsx)
// fills it before the first frame (and fails the render if any image cannot be loaded or verified). Drawing an
// image that is not here throws, so a render never shows a silent substitute. Only the Studio preview switches to a
// labelled placeholder with setMediaPreview(true).
// DUAL-07 audit repair: the registry owns what is registered. Removing an entry closes its ImageBitmap; the Studio
// preview (src/visual/preview-media.js) keeps only the current film's verified pictures here.
const IMAGES=new Map();let preview=false;
const closeBitmap=b=>{try{if(typeof b?.close==='function')b.close();}catch{}};
export const registerImage=(sha256,bitmap)=>{const old=IMAGES.get(sha256);if(old&&old!==bitmap)closeBitmap(old);IMAGES.set(sha256,bitmap);};
export const loadedImage=sha256=>IMAGES.get(sha256)??null;
export const unregisterImage=sha256=>{const b=IMAGES.get(sha256);if(b===undefined)return false;IMAGES.delete(sha256);closeBitmap(b);return true;};
export const registeredImages=()=>[...IMAGES.keys()];
// decoded RGBA bytes currently held (width × height × 4 of every registered picture)
export const registeredBytes=()=>[...IMAGES.values()].reduce((n,b)=>n+(b?.width??0)*(b?.height??0)*4,0);
export const clearImages=()=>{for(const b of IMAGES.values())closeBitmap(b);IMAGES.clear();};
export const setMediaPreview=v=>{preview=v===true;};
export const mediaPreview=()=>preview;
