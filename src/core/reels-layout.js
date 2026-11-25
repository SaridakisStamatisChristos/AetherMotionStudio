// GEN-09 Reels layout constants (leaf module, no imports; used by the camera fit, the renderers and the reels check).
// Safe-area numbers are a working assumption (third-party guides disagree; Meta publishes no single figure for organic
// Reels): on 1080×1920, top 220 px, bottom 420 px, left 60 px, right 120 px kept clear of the app overlay. Values are
// on the 720×1280 reference used by every renderer.
export const REELS=Object.freeze({
 version:'reels-v1',
 ui:Object.freeze({x:Object.freeze([40,640]),y:Object.freeze([147,1000])}),
 heading:Object.freeze({x:340,y:178,size:38,maxWidth:560}),
 caption:Object.freeze({top:206,left:46,width:588,maxText:548}),
 // characters: below the tallest caption box (2 lines + speaker label = 134) and above the bottom overlay
 characters:Object.freeze({x:Object.freeze([46,634]),y:Object.freeze([348,1000])}),
 // group/single fit, symmetric about the projection centre (360,640): min(360-46, 634-360), min(640-348, 1000-640)
 frame:Object.freeze({halfWidth:274,halfHeight:292}),
 recommendedMaxSeconds:90,maxOutside:.05,every:3
});
