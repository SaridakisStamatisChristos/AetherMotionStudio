// STUDIO-01 "script to film": the Studio Director form as pure data. `directorRequest` maps the form fields to a
// Director request (the server validates it again with src/director/schema.js `request`); `scriptHelp` gives the live
// word count and the owner script rules (docs/SCRIPT_FORMAT.md). Browser-safe: no Node or director imports.
const bad=m=>{throw Error(m)};
// Casts offered by the form. `interview` is the same cast and voices as examples/gen01-interview.request.json (and the
// owner's forest script example); `trio` is the TALK-04 three-person cast the form offered before (round-robin turns);
// `narrator` keeps the earlier non-dialogue form (one narrator voice, optional art-v1 staging).
export const STUDIO_CASTS=Object.freeze({
 interview:Object.freeze({label:'Student + Explorer (interview)',fields:{audience:'curious beginners',tone:'friendly',style:'interview',language:'en-us',voice:'af_bella',seed:1},
  dialogue:{style:'interview',speakers:[{id:'host',name:'Student',voice:'af_bella',language:'en-us',character:'student'},{id:'guest',name:'Explorer',voice:'bm_george',language:'en-gb',character:'explorer-robot'}]}}),
 trio:Object.freeze({label:'Engineer, Robot, Scientist (conversation)',fields:{},
  dialogue:{speakers:[{id:'eng',name:'Engineer',voice:'af_heart',language:'en-us',character:'engineer'},{id:'robo',name:'Robot',voice:'am_michael',language:'en-us',character:'service-robot'},{id:'sci',name:'Scientist',voice:'bf_emma',language:'en-gb',character:'scientist'}]}}),
 narrator:Object.freeze({label:'Narrator only (no characters)',fields:{},dialogue:null})
});
export const STUDIO_DEFAULTS=Object.freeze({cast:'interview',backend:'three',profile:'polished',seconds:60,reels:false});
// About 2.2 spoken words per second (docs/SCRIPT_FORMAT.md): 60 s → 120–140 words, 30 s → 60–70.
export const WORDS_PER_SECOND=Object.freeze({min:2,max:7/3});
export function wordRange(seconds){
 if(!Number.isSafeInteger(seconds)||seconds<6||seconds>300)bad('Seconds must be a whole number from 6 to 300');
 return {min:Math.round(seconds*WORDS_PER_SECOND.min),max:Math.round(seconds*WORDS_PER_SECOND.max)};
}
// form: {topic, script, seconds, cast, backend, profile, voice (narrator only), staging (narrator only), reels, id}.
export function directorRequest(form){
 if(!form||typeof form!=='object')bad('Form data required');
 const topic=typeof form.topic==='string'?form.topic.trim():'',script=typeof form.script==='string'?form.script.trim():'';
 if(!topic)bad(script?'Add a topic: one short question (it picks the set and shows as the subtitle)':'Add a topic, or a topic and a script');
 const seconds=typeof form.seconds==='number'?form.seconds:Number(form.seconds);wordRange(seconds);
 if(!Object.hasOwn(STUDIO_CASTS,form.cast))bad('Unknown cast: '+String(form.cast));
 if(!['cpu','three'].includes(form.backend))bad('Unknown backend: '+String(form.backend));
 if(!['polished','original'].includes(form.profile))bad('Unknown profile: '+String(form.profile));
 if(typeof form.id!=='string'||!form.id)bad('Request ID required');
 const cast=STUDIO_CASTS[form.cast];
 const q={version:1,id:form.id,topic,seconds,...structuredClone(cast.fields),backend:form.backend,profile:form.profile};
 if(cast.dialogue)q.dialogue=structuredClone(cast.dialogue);
 else{if(typeof form.voice!=='string'||!form.voice)bad('Choose a narrator voice');q.voice=form.voice;if(form.staging)q.staging='art-v1';}
 if(script)q.script=script;
 if(form.reels===true)q.delivery='reels-v1';else if(form.reels!==false&&form.reels!==undefined)bad('Reels must be on or off');
 return q;
}
// Live help under the Script box. Counts words and sentences, and flags lines the Director would split or reject.
export function scriptHelp(script,seconds,cast='interview'){
 const text=typeof script==='string'?script.trim():'';
 let range=null;try{range=wordRange(Number(seconds));}catch{}
 const words=text?text.split(/\s+/).length:0;
 const lines=text?text.split(/\n+/).map(x=>x.trim()).filter(Boolean):[];
 const sentences=text?text.split(/(?<=[.!?])\s+/).filter(Boolean).length:0;
 const notes=[];
 if(lines.some(l=>l.length>=140))notes.push('a line is 140 characters or longer (it will be split)');
 if(text.split(/\s+/).some(w=>w.replace(/[^A-Za-z]/g,'').length>32))notes.push('a word is longer than 32 letters');
 if(/https?:\/\/|```|<\/?script/i.test(text))notes.push('links or code are not allowed');
 if(lines.some(l=>!/[.!?]["')\]]?$/.test(l)))notes.push('every line should end with . ? or !');
 let verdict='empty';
 if(words&&range)verdict=words<range.min?'short':words>range.max?'long':'ok';
 const advice={empty:'No script: the Director writes draft lines from the topic.',short:'Too few words: expect long silences.',long:'Too many words: the speech will be sped up.',ok:'Good length.'}[verdict];
 return {words,sentences,lines:lines.length,range,verdict,notes,
  summary:words+' words, '+sentences+' sentences'+(range?' (aim for '+range.min+'–'+range.max+' for '+Number(seconds)+' s)':'')+'. '+advice+(notes.length?' Check: '+notes.join('; ')+'.':''),
  turns:cast==='trio'?'Turns rotate Engineer → Robot → Scientist, one sentence each.':cast==='narrator'?'One narrator reads every sentence.':'Turns alternate Student, Explorer, Student… one sentence each, starting with the Student.'};
}
