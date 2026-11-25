// GEN-09 Reels layout constants (leaf module, no imports; used by the camera fit, the renderers and the reels check).
// Safe-area numbers are a working assumption (third-party guides disagree; Meta publishes no single figure for organic
// Reels): on 1080×1920, top 220 px, bottom 420 px, left 60 px, right 120 px kept clear of the app overlay. Values are
// on the 720×1280 reference used by every renderer.
export const REELS=Object.freeze({
 version:'reels-v1',
 ui:Object.freeze({x:Object.freeze([40,640]),y:Object.freeze([147,1000])}),
 heading:Object.freeze({x:340,y:178,size:38,maxWidth:560}),
 // Owner 2026-11-25 (before merge): captions low, like most Reels ("if on top it will cover the face... bottom is
 // prefered"), and characters at the normal height. The caption box ends just above the app's own text (bottom 990)
 // and may cover legs and feet; it must never cover a head (check REELS_CAPTION_ON_HEAD).
 caption:Object.freeze({bottom:990,left:46,width:588,maxText:548}),
 // head = top share of a character's projected box that a caption must not cover
 headShare:.4,
 // characters: under the heading, above the bottom overlay, clear of the right-edge buttons
 characters:Object.freeze({x:Object.freeze([46,634]),y:Object.freeze([300,1000])}),
 // group/single fit, symmetric about the projection centre (360,640): min(360-46, 634-360), min(640-300, 1000-640);
 // the height (340) is the default one, only the width is narrower
 frame:Object.freeze({halfWidth:274,halfHeight:340}),
 recommendedMaxSeconds:90,maxOutside:.05,every:3
});
