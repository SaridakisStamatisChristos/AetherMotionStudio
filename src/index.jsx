import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {AbsoluteFill,Composition,cancelRender,continueRender,delayRender,registerRoot,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {sceneFontFaces} from './visual/fonts.js';
import {sceneImages,inspectImage,MEDIA_FORMATS} from './core/media.js';
import {registerImage} from './visual/media-registry.js';
// DUAL-05: one verified image from public/media: same bytes as the production boundary verified (SHA-256), same
// structure rules, decoded by Chromium and checked to be upright at the verified size. Any failure stops the render.
async function loadImage(s){
 const r=await fetch(staticFile('media/'+s.file));if(!r.ok)throw Error('missing public/media/'+s.file+' (HTTP '+r.status+')');
 const bytes=new Uint8Array(await r.arrayBuffer()),hex=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hex!==s.sha256)throw Error('public/media/'+s.file+' differs from its verified SHA-256');
 const info=inspectImage(bytes,s.format);if(info.displayWidth!==s.displayWidth||info.displayHeight!==s.displayHeight)throw Error('public/media/'+s.file+' structure differs from its verified source');
 const bm=await createImageBitmap(new Blob([bytes],{type:MEDIA_FORMATS[s.format].mime}));
 if(bm.width!==s.displayWidth||bm.height!==s.displayHeight)throw Error('public/media/'+s.file+' decoded to '+bm.width+'×'+bm.height+', expected '+s.displayWidth+'×'+s.displayHeight+' upright');
 registerImage(s.sha256,bm);
}
import {Audio} from '@remotion/media';
import {FORMAT} from './core/contract.js';
import {formatOf} from './core/formats.js';
import {validateProject,filmFrames} from './core/timeline.js';
import {createThreeBackend} from './visual/three-backend.js';
import {drawFilm} from './core/draw-film.js';
import baseline from '../examples/robot-treasure.json';
function Film({scene,timeline=null}){useMemo(()=>{validateProject(scene);filmFrames(scene,timeline)},[scene,timeline]);const frame=useCurrentFrame();const {width,height}=useVideoConfig();const ref=useRef(null),three=useRef(null);
 useLayoutEffect(()=>()=>{three.current?.dispose();three.current=null},[]);
 // DUAL-02: bundled fonts used by compose-v2 compositions load before the first frame; a failed face fails the render.
 const faces=useMemo(()=>sceneFontFaces(scene),[scene]),[fontHandle]=useState(()=>faces.length?delayRender('bundled fonts'):null),[fontsReady,setFontsReady]=useState(!faces.length);
 const images=useMemo(()=>sceneImages(scene),[scene]),[mediaHandle]=useState(()=>images.length?delayRender('local media'):null),[mediaReady,setMediaReady]=useState(!images.length);
 useEffect(()=>{if(!images.length)return;Promise.all(images.map(loadImage)).then(()=>{setMediaReady(true);continueRender(mediaHandle);}).catch(e=>cancelRender(new Error('media load failed: '+(e?.message??e))));},[images,mediaHandle]);
 useEffect(()=>{if(!faces.length)return;Promise.all(faces.map(f=>new FontFace(f.css,'url('+staticFile(f.path)+')',{weight:String(f.weight)}).load().then(x=>{document.fonts.add(x);}))).then(()=>{setFontsReady(true);continueRender(fontHandle);}).catch(e=>cancelRender(new Error('font load failed: '+(e?.message??e))));},[faces,fontHandle]);
 useLayoutEffect(()=>{const ctx=ref.current.getContext('2d');ctx.clearRect(0,0,width,height);if(scene.version===2&&scene.shots.some(s=>s.template==='cinematic-graph'&&s.backend==='three')&&!three.current)three.current=createThreeBackend();if(fontsReady&&mediaReady)drawFilm(ctx,scene,timeline,frame,width,height,three.current)},[frame,width,height,scene,timeline,fontsReady,mediaReady]);
 return <AbsoluteFill><canvas ref={ref} width={width} height={height}/><Audio src={staticFile('audio/'+scene.id+'.wav')}/></AbsoluteFill>;
}
// DUAL-06: output size from the project's format (absent = 1080×1920, as before).
function metadata({props}){validateProject(props.scene);const f=props.scene?.version===2?formatOf(props.scene):null;return {durationInFrames:filmFrames(props.scene,props.timeline),...(f?{width:f.width,height:f.height}:{})};}
function Root(){return <Composition id="AetherFilm" component={Film} defaultProps={{scene:baseline,timeline:null}} calculateMetadata={metadata} fps={FORMAT.fps} durationInFrames={FORMAT.frames} width={FORMAT.width} height={FORMAT.height}/>};registerRoot(Root);
