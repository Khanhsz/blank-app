/**
 * Per-building marketing placements: art lives in Three.js not baked into geometry.
 * Only slots listed in architectural manifest are rendered. No generic floating
 * billboards or OOH on residential/decorative buildings.
 */
import {useEffect,useMemo} from "react";
import {useGLTF} from "@react-three/drei";
import * as THREE from "three";
import {useGame} from "@/game/store";
import {AssetRegistry} from "./AssetRegistry";
import type {District} from "./WorldScene";

type Slot={id:string;kind:string;anchor:string;width:number;height:number;content:string};
const roles:{[key:string]:string}={
  research:"DATA / INSIGHTS",creative:"IDEAS IN MOTION",media:"ON AIR / TVC",influencer:"CREATOR NETWORK",
  brand:"BRAND INTELLIGENCE",network:"CONNECT & CREATE",agency:"YOUR NEXT BIG IDEA",
  "client-orion":"ORION / IMAGINE MORE","client-vertex":"VERTEX / IN MOTION","client-sora":"SORA / LIVE WELL",
  "client-bloom":"BLOOM / NEW SEASON","client-apex":"APEX / EVERYDAY","client-northstar":"NORTHSTAR / LEARN",
};
function renderPoster(assetName:string,campaign:string,week:number,id:string,kind:string){
 const canvas=document.createElement("canvas");canvas.width=768;canvas.height=320;
 const ctx=canvas.getContext("2d");if(!ctx)return null;
 const headline=(roles[id]||assetName.toUpperCase()).slice(0,34);
 ctx.fillStyle=kind==="ooh"?"#e6d9c3":"#1d3944";ctx.fillRect(0,0,768,320);
 ctx.fillStyle=kind==="ooh"?"#a0644f":"#78b2a7";
 ctx.fillRect(22,25,84,7);
 ctx.globalAlpha=.26;ctx.beginPath();ctx.arc(645,154,170,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 ctx.font="800 51px 'Be Vietnam Pro', Arial, sans-serif";
 ctx.fillStyle=kind==="ooh"?"#203a41":"#ffffff";
 ctx.fillText(headline,33,155,700);
 ctx.font="600 21px 'Be Vietnam Pro', Arial, sans-serif";
 ctx.fillStyle=kind==="ooh"?"#555449":"#c2d8d8";
 ctx.fillText("MARKETING CITY  /  "+(kind==="ooh"?"OOH":"DIGITAL OUT-OF-HOME"),35,220,695);
 ctx.font="500 15px 'Be Vietnam Pro', Arial, sans-serif";
 ctx.fillText(campaign.slice(0,48)+"  ·  WEEK "+week,35,279,690);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;return texture;
}
export function CityCampaignMedia({b,lod,onSelect}:{b:District;lod:0|1;onSelect:(id:string)=>void}){
 const registry=AssetRegistry.get(b.id);
 const slots=(registry?.advertisingSlots||[]).filter(Boolean);
 const week=useGame(s=>s.ceo?.weekly?.week??1);
 const campaign=useGame(s=>s.campaign.aiScenario?.brand||"City Campaign");
 const gltf=useGLTF(AssetRegistry.url(b.id,lod));
 const art=useMemo(()=>{
  const result:{[key:string]:THREE.CanvasTexture}={};
  for(const type of new Set(slots.filter(x=>x.includes(":dooh:")||x.includes(":ooh:")).map(x=>x.includes(":dooh:")?"dooh":"ooh"))){
   const t=renderPoster(registry?.name||b.name,campaign,week,b.id,type);
   if(t)result[type]=t;
  }
  return result;
 },[registry?.name,b.name,b.id,campaign,week,slots.join("|")]);
 useEffect(()=>()=>{Object.values(art).forEach(t=>t.dispose())},[art]);
 if(!slots.length)return null;
 const position=(name:string)=>{
  const node=gltf.scene.getObjectByName(name);
  return node?.position??null;
 };
 return <group name={"CITY_MARKETING_MEDIA_"+b.id}>
  {slots.map((id:string)=>{
   const isDigital=id.includes(":dooh:"),isOoh=id.includes(":ooh:"),kind=isDigital?"dooh":isOoh?"ooh":"iooh";
   const anchor=position(kind==="dooh"?"ANCHOR_DOOH_Facade":kind==="ooh"?"ANCHOR_OOH_Parapet":"ANCHOR_Activation");
   if(!anchor)return null;
   if(kind==="iooh")return <group key={id} name={id} position={[anchor.x,0,anchor.z]}>
    <mesh position={[0,.84,0]} onClick={e=>{e.stopPropagation();onSelect(b.id)}}>
     <boxGeometry args={[.62,1.53,.29]}/><meshStandardMaterial color="#314c57" roughness={.84}/>
    </mesh>
    <mesh position={[0,1.04,.165]} onClick={e=>{e.stopPropagation();onSelect(b.id)}}>
     <planeGeometry args={[.50,.83]}/><meshBasicMaterial color="#b1cdc3" toneMapped={false}/>
    </mesh>
   </group>;
   const texture=art[kind];if(!texture)return null;
   return <mesh key={id} name={id} position={[anchor.x,anchor.y,anchor.z+(kind==="dooh"?.12:.09)]}>
    <planeGeometry args={[kind==="dooh"?b.w*.427:b.w*.376,kind==="dooh"?1.35:.73]}/>
    <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false}/>
   </mesh>;
  })}
 </group>;
}
