import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {AbsoluteFill,Composition,cancelRender,continueRender,delayRender,registerRoot,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {sceneFontFaces} from './visual/fonts.js';
import {Audio} from '@remotion/media';
import {FORMAT} from './core/contract.js';
import {validateProject,filmFrames} from './core/timeline.js';
import {createThreeBackend} from './visual/three-backend.js';
import {drawFilm} from './core/draw-film.js';
import baseline from '../examples/robot-treasure.json';
function Film({scene,timeline=null}){useMemo(()=>{validateProject(scene);filmFrames(scene,timeline)},[scene,timeline]);const frame=useCurrentFrame();const {width,height}=useVideoConfig();const ref=useRef(null),three=useRef(null);
 useLayoutEffect(()=>()=>{three.current?.dispose();three.current=null},[]);
 // DUAL-02: bundled fonts used by compose-v2 compositions load before the first frame; a failed face fails the render.
 const faces=useMemo(()=>sceneFontFaces(scene),[scene]),[fontHandle]=useState(()=>faces.length?delayRender('bundled fonts'):null),[fontsReady,setFontsReady]=useState(!faces.length);
 useEffect(()=>{if(!faces.length)return;Promise.all(faces.map(f=>new FontFace(f.css,'url('+staticFile(f.path)+')',{weight:String(f.weight)}).load().then(x=>{document.fonts.add(x);}))).then(()=>{setFontsReady(true);continueRender(fontHandle);}).catch(e=>cancelRender(new Error('font load failed: '+(e?.message??e))));},[faces,fontHandle]);
 useLayoutEffect(()=>{const ctx=ref.current.getContext('2d');ctx.clearRect(0,0,width,height);if(scene.version===2&&scene.shots.some(s=>s.template==='cinematic-graph'&&s.backend==='three')&&!three.current)three.current=createThreeBackend();if(fontsReady)drawFilm(ctx,scene,timeline,frame,width,height,three.current)},[frame,width,height,scene,timeline,fontsReady]);
 return <AbsoluteFill><canvas ref={ref} width={width} height={height}/><Audio src={staticFile('audio/'+scene.id+'.wav')}/></AbsoluteFill>;
}
function metadata({props}){validateProject(props.scene);return {durationInFrames:filmFrames(props.scene,props.timeline)};}
function Root(){return <Composition id="AetherFilm" component={Film} defaultProps={{scene:baseline,timeline:null}} calculateMetadata={metadata} fps={FORMAT.fps} durationInFrames={FORMAT.frames} width={FORMAT.width} height={FORMAT.height}/>};registerRoot(Root);
