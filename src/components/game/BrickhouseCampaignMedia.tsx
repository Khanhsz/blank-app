/**
 * Architectural advertising overlay: content stays out of GLB. Geometry anchors
 * come from the same LOD model; if absent, render nothing rather than float a sign.
 */
import {useEffect,useMemo} from "react";
import {useGLTF} from "@react-three/drei";
import * as THREE from "three";
import {useGame} from "@/game/store";
import {AssetRegistry} from "./AssetRegistry";
import type {District} from "./WorldScene";

export const BRICKHOUSE_AD_SLOT_IDS=["brickhouse-dooh-main","brickhouse-ooh-parapet","brickhouse-activation"] as const;
export const BRICKHOUSE_MEDIA_ANCHORS=["ANCHOR_DOOH_Facade","ANCHOR_OOH_Parapet","ANCHOR_Activation"] as const;

/** Flat art-directed campaign media. No baked photography, editable each in-game week. */
function createArtwork(headline:string,week:number,brand:string,kind:"digital"|"sign"){
 const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=384;
 const ctx=canvas.getContext("2d");if(!ctx)return null;
 ctx.fillStyle=kind==="sign"?"#243c45":"#354955";ctx.fillRect(0,0,1024,384);
 ctx.fillStyle=kind==="sign"?"#e5ded2":"#a8c7bf";
 ctx.fillRect(23,23,978,9);
 ctx.fillStyle="#ffffff";
 ctx.font="900 72px 'Be Vietnam Pro', system-ui, Arial";
 const safe=headline.replace(/\s+/g," ").toUpperCase().slice(0,32);
 ctx.fillText(safe,44,202,940);
 ctx.fillStyle=kind==="sign"?"#c9d1c8":"#efc3a7";
 ctx.font="bold 27px 'Be Vietnam Pro', sans-serif";
 ctx.fillText(kind==="sign"?"STUDIO / CREATIVE PRODUCTION":"CAMPAIGN FOR "+brand.slice(0,35).toUpperCase(),46,278,918);
 ctx.font="600 20px 'Be Vietnam Pro', sans-serif";ctx.fillText(kind==="sign"?"BRICKHOUSE  ·  ART & DESIGN":"MARKETING CITY  ·  WEEK "+week,46,342,915);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=2;return tex;
}
export function BrickhouseCampaignMedia({b,lod,onSelect}:{b:District;lod:0|1;onSelect:(id:string)=>void}){
 const week=useGame(s=>s.ceo?.weekly?.week??1);
 const brand=useGame(s=>s.campaign.aiScenario?.brand||s.ceo?.leads.find(l=>l.status==="signed")?.brand||"BRICKHOUSE");
 const active=brand==="BRICKHOUSE"?"MAKE IDEAS VISIBLE":brand;
 const gltf=useGLTF(AssetRegistry.url(b.id,lod));
 const anchors=useMemo(()=>{
  const pos=(name:string)=>{
   const node=gltf.scene.getObjectByName(name);
   if(!node)return null;
   return node.position.clone();
  };
  return {dooh:pos("ANCHOR_DOOH_Facade"),ooh:pos("ANCHOR_OOH_Parapet"),sign:pos("ANCHOR_Sign"),activation:pos("ANCHOR_Activation")};
 },[gltf.scene]);
 const creative=useMemo(()=>createArtwork(active,week,brand,"digital"),[active,brand,week]);
 const lettering=useMemo(()=>createArtwork("BRICKHOUSE STUDIOS",week,brand,"sign"),[]);
 useEffect(()=>()=>{creative?.dispose()},[creative]);
 useEffect(()=>()=>{lettering?.dispose()},[lettering]);
 // Slot dimensions correspond to architectural housings exported in GLB.
 return <group name="BRICKHOUSE_STUDIO_MEDIA">
  {anchors.dooh&&creative&&<mesh name="brickhouse-dooh-main" position={[anchors.dooh.x,anchors.dooh.y,anchors.dooh.z+.23]}>
   <planeGeometry args={[b.w*.416,b.h*.125]}/>
   <meshBasicMaterial map={creative} toneMapped={false} side={THREE.FrontSide}/>
  </mesh>}
  {anchors.ooh&&creative&&<mesh name="brickhouse-ooh-parapet" position={[anchors.ooh.x,anchors.ooh.y,anchors.ooh.z+.16]}>
   <planeGeometry args={[b.w*.398,.75]}/>
   <meshBasicMaterial map={creative} toneMapped={false}/>
  </mesh>}
  {anchors.sign&&lettering&&<mesh name="BRICKHOUSE_STUDIOS_SIGN" position={[anchors.sign.x,anchors.sign.y,anchors.sign.z+.060]}>
   <planeGeometry args={[b.w*.439,.48]}/>
   <meshBasicMaterial map={lettering} toneMapped={false}/>
  </mesh>}
  {anchors.activation&&<group name="brickhouse-activation" position={[anchors.activation.x,0,anchors.activation.z]}>
   {/* Low-poly iOOH kiosk; clicking opens the same persistent office entity. */}
   <mesh position={[0,.8,0]} onClick={e=>{e.stopPropagation();onSelect(b.id)}}>
    <boxGeometry args={[.65,1.55,.27]}/>
    <meshStandardMaterial color="#334e58" roughness={.72}/>
   </mesh>
   <mesh position={[0,.99,.17]} onClick={e=>{e.stopPropagation();onSelect(b.id)}}>
    <planeGeometry args={[.53,.86]}/>
    <meshBasicMaterial color="#a6c9c7" toneMapped={false}/>
   </mesh>
   <mesh position={[0,.08,.0]}><boxGeometry args={[.88,.16,.54]}/><meshStandardMaterial color="#d7cabc" roughness={1}/></mesh>
  </group>}
 </group>;
}
