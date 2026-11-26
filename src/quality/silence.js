// Fix A check silence-v1 (owner: "there is so much pause in the forest video"): finds long stretches without speech in
// a measured speech timeline. Gaps are measured between spoken phrases (and before the first / after the last one).
// Silence inside an authored fixed-length shot (speech.fixedShots) is deliberate and only reported, never warned.
// Non-speech films are not applicable. Pure and deterministic; reads only the project and its measured timeline.
export const SILENCE={version:'silence-v1',maxGap:3,maxLead:2,maxTail:3,minTalkShare:.6};
export function silenceCheck(project,timeline){
 const policy=SILENCE.version;
 if(!project?.speech||!timeline?.sampleRate)return {policy,applicable:false,warnings:[],gaps:[]};
 const rate=timeline.sampleRate,total=timeline.durationFrames/30,fixed=new Set(Object.keys(project.speech.fixedShots??{}));
 const segs=timeline.shots.flatMap(s=>s.segments.map(x=>({shot:s.id,start:x.startSample/rate,end:x.endSample/rate})));
 const shotAt=t=>timeline.shots.find(s=>t*30<s.endFrame)?.id??timeline.shots.at(-1).id;
 const gaps=[];
 if(!segs.length)return {policy,applicable:true,talkSeconds:0,filmSeconds:total,talkShare:0,longestGap:total,gaps,warnings:[{code:'NO_SPEECH',detail:'no spoken phrase in a speech film'}]};
 gaps.push({kind:'lead',start:0,end:segs[0].start});
 for(let i=1;i<segs.length;i++)gaps.push({kind:'between',start:segs[i-1].end,end:segs[i].start});
 gaps.push({kind:'tail',start:segs.at(-1).end,end:total});
 const warnings=[];
 for(const g of gaps){
  g.seconds=Math.round((g.end-g.start)*100)/100;
  // A gap counts as authored when every shot it touches is a fixed-length shot.
  const touched=timeline.shots.filter(s=>s.startFrame<g.end*30&&s.endFrame>g.start*30).map(s=>s.id);
  g.shots=touched.length?touched:[shotAt(g.start)];g.authored=g.shots.every(id=>fixed.has(id));
  const limit=g.kind==='lead'?SILENCE.maxLead:g.kind==='tail'?SILENCE.maxTail:SILENCE.maxGap;
  if(g.seconds>limit&&!g.authored)warnings.push({code:'LONG_SILENCE',kind:g.kind,shot:g.shots[0],seconds:g.seconds,limit});
 }
 const talk=segs.reduce((a,s)=>a+s.end-s.start,0),share=talk/total;
 if(share<SILENCE.minTalkShare&&!timeline.shots.every(s=>fixed.has(s.id)))warnings.push({code:'LOW_TALK_SHARE',talkShare:Math.round(share*100)/100,limit:SILENCE.minTalkShare});
 return {policy,applicable:true,talkSeconds:Math.round(talk*100)/100,filmSeconds:total,talkShare:Math.round(share*100)/100,longestGap:Math.max(...gaps.map(g=>g.seconds)),gaps,warnings};
}
