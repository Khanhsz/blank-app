import React,{Component,Suspense,useEffect,useMemo,useState} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {Html,useGLTF} from "@react-three/drei";
import {AssetRegistry} from "./AssetRegistry";
import {CityCampaignMedia} from "./CityCampaignMedia";
import {BrickhouseCampaignMedia} from "./BrickhouseCampaignMedia";
import type {District} from "./WorldScene";

type Props={building:District;selected:boolean;onSelect:(id:string)=>void};
class AssetErrorBoundary extends Component<{children:React.ReactNode},{error:boolean}>{
 state={error:false};
 static getDerivedStateFromError(){return {error:true}}
 componentDidCatch(error:Error){console.warn("GLB failed to load; keeping interactive property hitbox without rendering legacy architecture:",error.message)}
 render(){return this.state.error?null:this.props.children}
}
/** Detailed LOD0 is the ONLY city mesh selected at runtime.
 * Legacy LOD1 exports may exist on disk but the game never requests them. */
function ModelGeometry({id,lod,dimensions,height,tier=1}:{id:string;lod:0|1;dimensions:[number,number,number];height:number;tier?:number}){
 // useGLTF delegates loading to GLTFLoader and caches by exact versioned URL.
 const src=AssetRegistry.get(id);
 if(!src)throw Error("Unregistered asset "+id);
 const gltf=useGLTF(AssetRegistry.url(id,lod,tier));
 const scene=useMemo(()=>gltf.scene.clone(true),[gltf.scene]);
 const scale:[number,number,number]=[dimensions[0]/src.width,height/src.height,dimensions[2]/src.depth];
 return <primitive object={scene} scale={scale} dispose={null}/>;
}
/** Visual-only GLB subtree. Suspension/error cannot replace it with old geometry.
    Independent hitbox and label stay mounted for both loading and failed assets. */
function BuildingVisual({b,lod,onSelect}:{b:District;lod:0|1;onSelect:(id:string)=>void}){
 return <>
  <ModelGeometry id={b.id} lod={lod} tier={b.tier} height={b.h} dimensions={[b.w,b.h,b.d]}/>
  {b.id==="office-brick"?<BrickhouseCampaignMedia b={b} lod={lod} onSelect={onSelect}/>:<CityCampaignMedia b={b} lod={lod} onSelect={onSelect}/>}
 </>;
}
export function BuildingInteraction({b,selected,onSelect}:{b:District;selected:boolean;onSelect:(id:string)=>void}){
 const [hot,setHot]=useState(false);
 const [near,setNear]=useState(false);
 const camera=useThree(s=>s.camera);
 const onHover=(yes:boolean)=>{setHot(yes);document.body.style.cursor=yes?"pointer":"auto"};
 useEffect(()=>()=>{document.body.style.cursor="auto"},[]);
 // At high-angle city overview, do not draw 27 overlapping HTML nameplates.
 // Nearby, hovered, selected and current HQ buildings remain discoverable.
 const nearbyRef=React.useRef(0);
 useFrame((_,dt)=>{
  nearbyRef.current+=dt;
  if(nearbyRef.current<.45)return;
  nearbyRef.current=0;
  const dist=Math.hypot(camera.position.x-b.x,camera.position.z-b.z,camera.position.y*.68);
  const visibility=dist<54;
  setNear(prev=>prev===visibility?prev:visibility);
 });
 const showLabel=selected||hot||near||b.occupied||(b.id==="agency"&&!b.locked);
 return <group position={[b.x,0,b.z]}>
  <AssetErrorBoundary key={AssetRegistry.url(b.id,0,b.tier)}>
   <Suspense fallback={null}>
    <BuildingVisual b={b} lod={0} onSelect={onSelect}/>
   </Suspense>
  </AssetErrorBoundary>
  {/* Invisible raycast collider. Game interaction is routed through the original b.id. */}
  <mesh name={"GAMEPLAY_HITBOX_"+b.id} position={[0,b.h*.5+.25,0]} onClick={e=>{e.stopPropagation();onSelect(b.id)}}
   onPointerOver={e=>{e.stopPropagation();onHover(true)}} onPointerOut={e=>{e.stopPropagation();onHover(false)}}>
   <boxGeometry args={[b.w+.25,b.h+.65,b.d+.25]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>
  {selected&&<mesh position={[0,.12,0]}><boxGeometry args={[b.w+.8,.08,b.d+.8]}/><meshBasicMaterial color="#93c5ac" transparent opacity={.55} depthWrite={false}/></mesh>}
  {showLabel&&<Html center position={[0,b.h+1.7,0]} distanceFactor={32} style={{pointerEvents:"auto"}}>
   <button className={"world-building-label "+(selected?"selected":"")+(b.locked?" locked":"")+(b.kind==="rival"?" rival":"")+(b.kind==="office"?" office":"")+(b.kind==="client"?" client":"")+(b.occupied?" occupied":"")}
    type="button" onClick={()=>onSelect(b.id)}>
    <span className="map-pin"/><span>{b.name}</span>{b.occupied?<small>YOUR HQ</small>:b.kind==="rival"?<small>RIVAL</small>:b.kind==="office"?<small>{b.locked?"LOCKED":"TO LET"}</small>:b.kind==="client"?<small>CLIENT HQ</small>:b.locked?<small>LOCKED</small>:null}
   </button>
  </Html>}
  {hot&&<pointLight position={[0,b.h*.55,b.d/2+1]} color="#b9d4c8" intensity={.5} distance={b.w*2}/>}
 </group>;
}
/** All actual city buildings are GLB-owned. Never show legacy mesh geometry. */
export function SafeAssetBuilding(props:Props){
 if(!AssetRegistry.has(props.building.id)){
  console.warn("Missing GLB registration for gameplay building:",props.building.id);
  // Keep navigation working, but never invent a second architectural building.
  return <group name={"MISSING_ASSET_"+props.building.id} position={[props.building.x,0,props.building.z]}>
   <mesh name={"GAMEPLAY_HITBOX_"+props.building.id} position={[0,props.building.h*.5,0]}
    onClick={e=>{e.stopPropagation();props.onSelect(props.building.id)}}>
    <boxGeometry args={[props.building.w,props.building.h,props.building.d]}/>
    <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
   </mesh>
   <Html position={[0,1.8,0]} center><button className="world-building-label" type="button" onClick={()=>props.onSelect(props.building.id)}>{props.building.name}</button></Html>
  </group>;
 }
 return <BuildingInteraction b={props.building} selected={props.selected} onSelect={props.onSelect}/>;
}
function SceneryModel({id,x,z}:{id:string;x:number;z:number}){
 const entry=AssetRegistry.get(id);
 if(!entry||!entry.decorative)return null;
 return <group position={[x,0,z]}>
  <ModelGeometry id={id} lod={0} height={entry.height} dimensions={[entry.width,entry.height,entry.depth]}/>
 </group>;
}
/** Chunks are keyed by block. Unload invisible distant decorative assets. */
export function ChunkManager(){
 const camera=useThree(s=>s.camera);
 const [loaded,setLoaded]=useState<Set<string>>(()=>new Set(AssetRegistry.decorativePlacements.map(p=>p.id)));
 let elapsed=0;
 useFrame((_,dt)=>{
  elapsed+=dt;if(elapsed<1.2)return;elapsed=0;
  const next=new Set(AssetRegistry.decorativePlacements.filter(p=>Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<210).map(p=>p.id));
  setLoaded(prev=>prev.size===next.size&&[...prev].every(x=>next.has(x))?prev:next);
 });
 return <group name="MT_CITY_DECORATIVE_CHUNK">{AssetRegistry.decorativePlacements.filter(p=>loaded.has(p.id)).map(p=><AssetErrorBoundary key={p.id}>
  <Suspense fallback={null}><SceneryModel id={p.id} x={p.x} z={p.z}/></Suspense>
 </AssetErrorBoundary>)}</group>;
}
/** Stable bridge between map entities and the GLB presentation layer. */
export function DistrictManager({districts,onSelect,selected}:{districts:District[];onSelect:(id:string)=>void;selected:string|null}){
 return <group name="MT_CITY_DISTRICTS">{districts.map(b=><SafeAssetBuilding key={b.id} building={b} selected={selected===b.id} onSelect={onSelect}/>)}</group>;
}
