// DUAL-05: decoded images available to the shared 2D path, keyed by SHA-256. The Remotion entry (src/index.jsx)
// fills it before the first frame (and fails the render if any image cannot be loaded or verified). Drawing an
// image that is not here throws, so a render never shows a silent substitute. Only the Studio preview, which does
// not load local media yet (planned for DUAL-07), switches to a labelled placeholder with setMediaPreview(true).
const IMAGES=new Map();let preview=false;
export const registerImage=(sha256,bitmap)=>{IMAGES.set(sha256,bitmap);};
export const loadedImage=sha256=>IMAGES.get(sha256)??null;
export const clearImages=()=>{IMAGES.clear();};
export const setMediaPreview=v=>{preview=v===true;};
export const mediaPreview=()=>preview;
