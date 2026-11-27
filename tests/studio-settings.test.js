// Owner choice "the Studio remembers the last settings": src/studio/settings.js keeps the Make-a-film choices in the
// browser and checks every value when it is read back.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SETTINGS_KEY,SETTINGS_DEFAULTS,checkedSettings,readSettings,writeSettings} from '../src/studio/settings.js';
import {STUDIO_DEFAULTS,directorRequest} from '../src/studio/director-form.js';
import {VOICES} from '../src/core/contract.js';
const voices=[...VOICES];
const mine={cast:'trio',seconds:45,backend:'cpu',profile:'original',voice:'bm_george',staging:false,reels:true,speakerNames:true,titles:true,advanced:true,
 // DUAL-07 choices (non-default values, so the round trip proves they are kept)
 content:'mixed-v1',format:'square-v1',theme:'paper-v1',captionStyle:'contrast-v1',soundtrack:'silent',music:'off',font:'merriweather'};

test('the choices come back exactly as they were kept',()=>{
 assert.deepEqual(readSettings(writeSettings(mine,voices),voices),mine);
 assert.equal(SETTINGS_KEY,'aethermotion.studio.settings.v1');
});
test('first visit and reset: the Studio defaults',()=>{
 assert.deepEqual(readSettings(null,voices),SETTINGS_DEFAULTS);
 for(const k of Object.keys(STUDIO_DEFAULTS))assert.equal(SETTINGS_DEFAULTS[k],STUDIO_DEFAULTS[k],k);
 assert.equal(SETTINGS_DEFAULTS.advanced,false,'the simple view stays the first view');
});
test('topic and script are never kept',()=>{
 const text=writeSettings({...mine,topic:'How do bees talk?',script:'Line one.\nLine two.',id:'film-x'},voices);
 assert.doesNotMatch(text,/bees|Line one|film-x|topic|script/);
});
test('negative: damaged, foreign or hostile stored text falls back to the defaults, field by field',()=>{
 for(const text of ['','{','null','[]','"x"','42','{"version":2,"settings":{"cast":"trio"}}','{"settings":{"cast":"trio"}}','x'.repeat(5000)])
  assert.deepEqual(readSettings(text,voices),SETTINGS_DEFAULTS,text.slice(0,40));
 const bad={cast:'constructor',seconds:9999,backend:'gpu',profile:'ultra',voice:'evil_voice',staging:'yes',reels:1,speakerNames:null,titles:'on',advanced:'true'};
 assert.deepEqual(readSettings(JSON.stringify({version:1,settings:bad}),voices),SETTINGS_DEFAULTS);
 for(const seconds of [5,301,60.5,'60',NaN,-1])assert.equal(checkedSettings({seconds},voices).seconds,60,String(seconds));
 // one bad field does not throw away the good ones
 assert.deepEqual(checkedSettings({...mine,backend:'gpu'},voices),{...mine,backend:'three'});
 // a voice the catalog no longer has is dropped (the page then shows the first voice)
 assert.equal(readSettings(writeSettings(mine,voices),['af_heart']).voice,null);
 // inherited or prototype keys are not read
 const proto=JSON.parse('{"version":1,"settings":{"__proto__":{"cast":"trio"}}}');assert.equal(checkedSettings(proto.settings,voices).cast,'interview');
 assert.equal(Object.prototype.cast,undefined);
});
test('restored choices always make a valid Director request',()=>{
 for(const s of [SETTINGS_DEFAULTS,mine,readSettings('{',voices),{...mine,cast:'narrator'}]){
  const q=directorRequest({id:'film-test',topic:'How do forests clean the air?',script:'',seconds:s.seconds,cast:s.cast,backend:s.backend,profile:s.profile,voice:s.voice??voices[0],staging:s.staging,reels:s.reels,speakerNames:s.speakerNames});
  assert.equal(q.seconds,s.seconds);assert.equal(q.backend,s.backend);
 }
});
test('the page restores after the voices load, saves on change and offers Reset choices',()=>{
 const html=readFileSync(new URL('../studio/index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../studio/app.js',import.meta.url),'utf8');
 assert.match(html,/id="resetSettings"/);
 assert.match(app,/fill\(\$\('directVoice'\),state\.catalog\.voices\);const kept=restoreSettings\(\);/);
 assert.match(app,/\$\('director'\)\.addEventListener\('change',rememberSettings\)/);
 assert.match(app,/function rememberSettings\(\)\{if\(!settingsReady\)return;/,'nothing is written before the kept choices are restored');
 assert.doesNotMatch(app,/localStorage\.setItem\([^)]*topic/);
});
