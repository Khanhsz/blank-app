import React,{Component,Suspense,useEffect,useMemo,useState} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {Html,useGLTF} from "@react-three/drei";
import * as THREE from "three";
import {AssetRegistry} from "./AssetRegistry";
import type {District} from "./WorldScene";

type Props={building:District;selected:boolean;onSelect:(id:string)=>void;quality:"high"|"low";fallback:React.ReactNode};
class AssetErrorBoundary extends Component<{fallback:React.ReactNode;children:React.ReactNode},{error:boolean}>{
 state={error:false};
 static getDerivedStateFromError(){return {error:true}}
 componentDidCatch(error:Error){console.warn("GLB fallback activated:",error.message)}
 render(){return this.state.error?this.props.fallback:this.props.children}
}
/** Large printed outdoor media panels make the upgraded assets visibly different at city scale.
 * Canvases become tiny GPU textures; they contain no external images or API calls.
 */
const outOfHomeDesigns:Record<string,{heading:string,tag:string,cta:string,bg:string,accent:string}>={
 creative:{heading:"CREATE / IMPACT",tag:"CREATIVE STUDIO",cta:"THE IDEAS DISTRICT",bg:"#253d45",accent:"#f0a46c"},
 influencer:{heading:"ON AIR",tag:"CREATOR & DIGITAL MEDIA",cta:"TVC  ·  OOH  ·  SOCIAL",bg:"#352c45",accent:"#ed9c97"},
 "rival-muse":{heading:"MUSE & MATTER",tag:"INDEPENDENT AGENCY",cta:"BOLD IDEAS. BIG CLIENTS.",bg:"#3c304f",accent:"#c6add4"},
 "client-bloom":{heading:"BLOOM",tag:"NEW SEASON",cta:"BEAUTY IN EVERY MOMENT",bg:"#433244",accent:"#e4acb7"},
 "office-loft":{heading:"FOUNDRY LOFT",tag:"CREATIVE OFFICE SPACE",cta:"BUILD YOUR NEXT CHAPTER",bg:"#3e4845",accent:"#e1c08d"},
 "office-brick":{heading:"BRICKHOUSE",tag:"STUDIOS / TO LET",cta:"YOUR AGENCY STARTS HERE",bg:"#403b44",accent:"#d6a080"}
};
function OutdoorCampaignDisplay({b}:{b:District}){
 const style=outOfHomeDesigns[b.id];
 const texture=useMemo(()=>{
  if(!style)return null;
  const canvas=document.createElement("canvas");
  canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext("2d");
  if(!ctx)return null;
  ctx.fillStyle=style.bg;ctx.fillRect(0,0,1024,512);
  // Geometric art-directed design instead of a blank illuminated cube.
  ctx.globalAlpha=.19;ctx.fillStyle=style.accent;
  ctx.beginPath();ctx.arc(860,180,225,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.27;ctx.fillRect(0,457,1024,55);
  ctx.globalAlpha=1;ctx.fillStyle=style.accent;ctx.fillRect(56,64,155,9);
  ctx.font="bold 28px Arial";ctx.fillText(style.tag,56,124);
  ctx.fillStyle="#fffaf0";ctx.font="bold 72px Arial";ctx.fillText(style.heading,53,283,910);
  ctx.fillStyle="#dce4de";ctx.font="30px Arial";ctx.fillText(style.cta,56,360,920);
  ctx.fillStyle=style.accent;ctx.font="bold 22px Arial";ctx.fillText("MARKETING CITY  /  LIVE DISTRICT",56,442);
  const t=new THREE.CanvasTexture(canvas);
  t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=4;
  t.needsUpdate=true;
  return t;
 },[b.id]);
 useEffect(()=>()=>{texture?.dispose()},[texture]);
 if(!style||!texture)return null;
 return <group name={"OOH_BILLBOARD_"+b.id}>
  {/* Main front-facade billboard. Asset art, not a gameplay collider. */}
  <mesh position={[0,b.h*.65,b.d/2+.64]} renderOrder={2}>
   <planeGeometry args={[b.w*.82,Math.min(3.5,b.h*.31)]}/>
   <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} depthWrite={false}/>
  </mesh>
  <mesh position={[0,b.h*.65,b.d/2+.57]}>
   <boxGeometry args={[b.w*.88,Math.min(3.7,b.h*.33),.27]}/>
   <meshStandardMaterial color="#273840" metalness={.18} roughness={.6}/>
  </mesh>
  {/* Second billboard above the roof is readable when zoomed out. */}
  <mesh position={[0,b.h+1.73,0.01]}>
   <boxGeometry args={[b.w*.72,2.23,.20]}/>
   <meshStandardMaterial color="#3a454b" metalness={.2} roughness={.6}/>
  </mesh>
  <mesh position={[0,b.h+1.74,.14]} renderOrder={3}>
   <planeGeometry args={[b.w*.70,2.09]}/>
   <meshBasicMaterial map={texture} toneMapped={false} depthWrite={false}/>
  </mesh>
 </group>;
}
/** LOD tracks camera without changing existing CameraControls or world coordinates. */
export function LODManager({x,z,quality,selected,onLOD}:{x:number;z:number;quality:"high"|"low";selected:boolean;onLOD:(lod:0|1)=>void}){
 const camera=useThree(x=>x.camera);
 let elapsed=0;
 useFrame((_,dt)=>{
  elapsed+=dt;if(elapsed<.5)return;elapsed=0;
  const d=Math.hypot(camera.position.x-x,camera.position.z-z,camera.position.y*.66);
  onLOD(quality==="high"&&(selected||d<66)?0:1);
 });
 return null;
}
function ModelGeometry({id,lod,dimensions,height}:{id:string;lod:0|1;dimensions:[number,number,number];height:number}){
 // useGLTF delegates loading to GLTFLoader and caches by exact versioned URL.
 const src=AssetRegistry.get(id);
 if(!src)throw Error("Unregistered asset "+id);
 const gltf=useGLTF(AssetRegistry.url(id,lod));
 const scene=useMemo(()=>gltf.scene.clone(true),[gltf.scene]);
 const scale:[number,number,number]=[dimensions[0]/src.width,height/src.height,dimensions[2]/src.depth];
 return <primitive object={scene} scale={scale} dispose={null}/>;
}
export function BuildingInteraction({b,selected,onSelect,quality}:{b:District;selected:boolean;onSelect:(id:string)=>void;quality:"high"|"low"}){
 const [hot,setHot]=useState(false);
 const [lod,setLod]=useState<0|1>(quality==="high"&&selected?0:1);
 const onHover=(yes:boolean)=>{setHot(yes);document.body.style.cursor=yes?"pointer":"auto"};
 useEffect(()=>()=>{document.body.style.cursor="auto"},[]);
 return <group position={[b.x,0,b.z]}>
  <LODManager x={b.x} z={b.z} quality={quality} selected={selected} onLOD={next=>setLod(prev=>prev===next?prev:next)}/>
  <ModelGeometry id={b.id} lod={lod} height={b.h} dimensions={[b.w,b.h,b.d]}/>
  <OutdoorCampaignDisplay b={b}/>
  {/* Invisible raycast collider. Game interaction is routed through the original b.id. */}
  <mesh name={"GAMEPLAY_HITBOX_"+b.id} position={[0,b.h*.5+.25,0]} onClick={e=>{e.stopPropagation();onSelect(b.id)}}
   onPointerOver={e=>{e.stopPropagation();onHover(true)}} onPointerOut={e=>{e.stopPropagation();onHover(false)}}>
   <boxGeometry args={[b.w+.25,b.h+.65,b.d+.25]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>
  {selected&&<mesh position={[0,.12,0]}><boxGeometry args={[b.w+.8,.08,b.d+.8]}/><meshBasicMaterial color="#93c5ac" transparent opacity={.55} depthWrite={false}/></mesh>}
  <Html center position={[0,b.h+4.0,0]} distanceFactor={36} style={{pointerEvents:"auto"}}>
   <button className={"world-building-label "+(selected?"selected":"")+(b.locked?" locked":"")+(b.kind==="rival"?" rival":"")+(b.kind==="office"?" office":"")+(b.kind==="client"?" client":"")+(b.occupied?" occupied":"")}
    type="button" onClick={()=>onSelect(b.id)}>
    <span className="map-pin"/><span>{b.name}</span>{b.occupied?<small>YOUR HQ</small>:b.kind==="rival"?<small>RIVAL</small>:b.kind==="office"?<small>{b.locked?"LOCKED":"TO LET"}</small>:b.kind==="client"?<small>CLIENT HQ</small>:b.locked?<small>LOCKED</small>:null}<small className="mt-glb-status">● GLB {AssetRegistry.version.toUpperCase()}</small>
   </button>
  </Html>
  {hot&&<pointLight position={[0,b.h*.55,b.d/2+1]} color="#b9d4c8" intensity={.5} distance={b.w*2}/>}
 </group>;
}
/** Failure-safe adapter; binary availability never blocks gameplay. */
export function SafeAssetBuilding(props:Props){
 if(!AssetRegistry.has(props.building.id))return <>{props.fallback}</>;
 return <AssetErrorBoundary fallback={props.fallback}>
  <Suspense fallback={props.fallback}>
   <BuildingInteraction b={props.building} selected={props.selected} onSelect={props.onSelect} quality={props.quality}/>
  </Suspense>
 </AssetErrorBoundary>;
}
function SceneryModel({id,x,z,quality}:{id:string;x:number;z:number;quality:"high"|"low"}){
 const entry=AssetRegistry.get(id);
 const [lod,setLod]=useState<0|1>(1);
 if(!entry||!entry.decorative)return null;
 return <group position={[x,0,z]}>
  <LODManager x={x} z={z} quality={quality} selected={false} onLOD={next=>setLod(prev=>prev===next?prev:next)}/>
  <ModelGeometry id={id} lod={lod} height={entry.height} dimensions={[entry.width,entry.height,entry.depth]}/>
 </group>;
}
/** Chunks are keyed by block. Unload invisible distant decorative assets. */
export function ChunkManager({quality}:{quality:"high"|"low"}){
 const camera=useThree(s=>s.camera);
 const [loaded,setLoaded]=useState<Set<string>>(()=>new Set(AssetRegistry.decorativePlacements.map(p=>p.id)));
 let elapsed=0;
 useFrame((_,dt)=>{
  elapsed+=dt;if(elapsed<1.2)return;elapsed=0;
  const next=new Set(AssetRegistry.decorativePlacements.filter(p=>Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<210).map(p=>p.id));
  setLoaded(prev=>prev.size===next.size&&[...prev].every(x=>next.has(x))?prev:next);
 });
 return <group name="MT_ARTS_QUARTER_CHUNK">{AssetRegistry.decorativePlacements.filter(p=>loaded.has(p.id)).map(p=><AssetErrorBoundary key={p.id} fallback={null}>
  <Suspense fallback={null}><SceneryModel id={p.id} x={p.x} z={p.z} quality={quality}/></Suspense>
 </AssetErrorBoundary>)}</group>;
}
/** Stable bridge between map entities and the GLB presentation layer. */
export function DistrictManager({districts,onSelect,selected,quality,fallback}:{districts:District[];onSelect:(id:string)=>void;selected:string|null;quality:"high"|"low";fallback:(b:District)=>React.ReactNode}){
 return <group name="MT_CITY_DISTRICTS">{districts.map(b=><SafeAssetBuilding key={b.id} building={b} selected={selected===b.id} onSelect={onSelect} quality={quality} fallback={fallback(b)}/>)}</group>;
}
