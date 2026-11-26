// STUDIO-01 "script to film": the Studio Director form as pure data. `directorRequest` maps the form fields to a
// Director request (the server validates it again with src/director/schema.js `request`); `scriptHelp` gives the live
// word count and the owner script rules (docs/SCRIPT_FORMAT.md). Browser-safe: no Node or director imports.
import {defaultSpeech} from './production.js';
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
export const STUDIO_DEFAULTS=Object.freeze({cast:'interview',backend:'three',profile:'polished',seconds:60,reels:false,speakerNames:true});
// About 2.2 spoken words per second (docs/SCRIPT_FORMAT.md): 60 s → 120–140 words, 30 s → 60–70.
export const WORDS_PER_SECOND=Object.freeze({min:2,max:7/3});
export function wordRange(seconds){
 if(!Number.isSafeInteger(seconds)||seconds<6||seconds>300)bad('Seconds must be a whole number from 6 to 300');
 return {min:Math.round(seconds*WORDS_PER_SECOND.min),max:Math.round(seconds*WORDS_PER_SECOND.max)};
}
// form: {topic, script, seconds, cast, backend, profile, voice (narrator only), staging (narrator only), reels, id,
// speakerNames (owner's checkbox "Speaker names in captions"; false → speech.captions.speakerNames false)}.
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
 if(![true,false,undefined].includes(form.speakerNames))bad('Speaker names must be on or off');
 // names only ever show with two or more speakers, so the narrator request is left unchanged
 if(form.speakerNames===false&&cast.dialogue){q.speech=defaultSpeech(seconds);q.speech.captions.speakerNames=false;}
 return q;
}
// Live help under the Script box. Counts what will be spoken (the cleaned script), flags lines the Director would
// split or reject, and gives length advice. Since Fix A, dialogue films (interview, trio) are as long as their speech
// plus calm pauses, at most the chosen seconds: a long script needs more seconds (never extra silence), and a short
// script makes a shorter film. Narrator films keep the exact length, so they keep the old advice.
// Owner's first Studio film: Claude's "Topic: …" line was spoken and shifted every turn (the Student explained, the
// Explorer asked), so pasted extras are flagged here and removed automatically on Generate (studio/app.js).
export function scriptHelp(script,seconds,cast='interview'){
 const raw=typeof script==='string'?script.trim():'',cleaned=raw?cleanScript(raw):{script:'',topic:null,lines:0},text=cleaned.script;
 let range=null;try{range=wordRange(Number(seconds));}catch{}
 const words=text?text.split(/\s+/).length:0;
 const lines=text?text.split(/\n+/).map(x=>x.trim()).filter(Boolean):[];
 const sentences=text?text.split(/(?<=[.!?])\s+/).filter(Boolean).length:0;
 const notes=[],rawLines=raw?raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean):[];
 if(raw&&(cleaned.topic!==null||rawLines.join('\n')!==text))notes.push('a Topic line, speaker names, numbering or headings were pasted: they are removed on Generate (or press Clean up now)');
 if(lines.some(l=>l.length>=140))notes.push('a line is 140 characters or longer (it will be split)');
 if(text.split(/\s+/).some(w=>w.replace(/[^A-Za-z]/g,'').length>32))notes.push('a word is longer than 32 letters');
 if(/https?:\/\/|```|<\/?script/i.test(raw))notes.push('links or code are not allowed');
 if(lines.some(l=>!/[.!?]["')\]]?$/.test(l)))notes.push('every line should end with . ? or !');
 let verdict='empty';
 if(words&&range)verdict=words<range.min?'short':words>range.max?'long':'ok';
 const fits=cast!=='narrator',sec=Number(seconds);
 // seconds that keep the calm pace for this many words, rounded up to 5 s (at most 300)
 const suggestedSeconds=verdict==='long'?Math.min(300,Math.ceil(words/WORDS_PER_SECOND.max/5)*5):null;
 const estimate=Math.max(6,Math.round(words/2.2));
 const advice={empty:'No script: the Director writes draft lines from the topic.',ok:'Good length.',
  long:fits?'A bit long for '+sec+' s: set Seconds to '+suggestedSeconds+' to keep the calm pace (the film only runs as long as the speech needs).':'Too many words: the speech will be sped up. Set Seconds to '+suggestedSeconds+' or shorten the script.',
  short:fits?'Short script: the film will be about '+estimate+' s (it follows the speech, without long silences).':'Too few words: expect long silences.'}[verdict];
 return {words,sentences,lines:lines.length,range,verdict,notes,suggestedSeconds,
  summary:words+' words, '+sentences+' sentences'+(range?' (aim for '+range.min+'–'+range.max+' for '+sec+' s)':'')+'. '+advice+(notes.length?' Check: '+notes.join('; ')+'.':''),
  turns:cast==='trio'?'Turns rotate Engineer → Robot → Scientist, one sentence each.':cast==='narrator'?'One narrator reads every sentence.':'Turns alternate Student, Explorer, Student… one sentence each, starting with the Student.'};
}
// STUDIO-01 prompt guidance: the Claude-chat prompt from docs/SCRIPT_FORMAT.md, filled in for the chosen topic,
// seconds and cast (the owner copies it into Claude chat and pastes the answer into Script).
const CAST_PROMPT=Object.freeze({
 interview:{who:'a dialogue between a curious Student and an expert Explorer robot',order:'Lines alternate strictly: line 1 Student, line 2 Explorer, line 3 Student, and so on. Start with the Student, end with either.',voices:'Student lines short (questions or reactions); Explorer lines 10–20 words.'},
 trio:{who:'a conversation between an Engineer, a Robot and a Scientist',order:'Lines rotate strictly: line 1 Engineer, line 2 Robot, line 3 Scientist, then again from the Engineer.',voices:'Lines 6–18 words; each speaker adds something new.'},
 narrator:{who:'a single narrator explaining the topic',order:'One narrator speaks every line.',voices:'Lines 8–18 words.'}
});
export function lineRange(seconds){const w=wordRange(seconds);return {min:Math.max(3,Math.round(w.min/8.6)),max:Math.max(3,Math.round(w.max/8.75))};}
export function scriptPrompt({topic='',seconds=60,cast='interview'}={}){
 if(!Object.hasOwn(CAST_PROMPT,cast))bad('Unknown cast: '+String(cast));
 const s=Number(seconds),w=wordRange(s),l=lineRange(s),c=CAST_PROMPT[cast],t=typeof topic==='string'&&topic.trim()?topic.trim():'<YOUR TOPIC>';
 return ['Write a script for a '+s+'-second vertical educational video: '+c.who+'.','Topic: '+t,'','Rules:',
  '- Plain text only, one sentence per line, no speaker names, no headings, no numbering.','- '+c.order,
  '- Every line is exactly one sentence ending in . ? or !','- Each line under 140 characters. '+c.voices,
  '- '+l.min+'–'+l.max+' lines, '+w.min+'–'+w.max+' words in total.',
  '- Spell out numbers and abbreviations (say "carbon dioxide", not "CO2"). No word longer than 32 letters.',
  '- Facts must be accurate and simple for curious beginners; friendly tone.',
  'Also give me a one-line topic question (under 60 characters), on its own first line starting with "Topic:".'].join('\n');
}
// Tidy a script pasted from a chat: drop speaker names of any offered cast ("Student:", "**Explorer:**"), numbering,
// bullets, markdown emphasis, wrapping quotes and blank lines. A "Topic: …" line is returned separately.
const NAMES=['Student','Explorer','Engineer','Robot','Scientist','Narrator','Host','Guest'];
export function cleanScript(text){
 if(typeof text!=='string')bad('Script text required');
 let topic=null;const lines=[];
 for(let raw of text.split(/\r?\n/)){
  let x=raw.replace(/\*\*|__/g,'').trim();if(!x||/^```/.test(x)||/^#+\s/.test(x)||/^[-*_]{3,}$/.test(x))continue;
  const tm=/^topic(?: question)?\s*[:\-–]\s*(.+)$/i.exec(x);if(tm){topic=tm[1].trim().replace(/^["“](.*)["”]$/,'$1');continue;}
  x=x.replace(/^(?:\d+[.)]|[-*•])\s+/,'').replace(new RegExp(String.raw`^(?:${NAMES.join('|')})\s*(?:\([^)]*\))?\s*:\s*`,'i'),'').replace(/^["“](.*)["”]$/,'$1').trim();
  if(x)lines.push(x);
 }
 return {script:lines.join('\n'),topic,lines:lines.length};
}
