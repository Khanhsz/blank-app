import {addArchitecturalFacades} from "./city-facades.mjs";
/**
 * V2 city modernism — facade-coherent, physically bounded low-poly architectural grammar.
 * Source of truth for browser GLB generator. Each window is attached to a specific mass,
 * never distributed on a global facade plane that can lie in empty air.
 *
 * Units: meters. +Y up, +Z is the city-facing frontage.
 */
export const CITY_ARCHITECTURE_FAMILIES=["stacked","tower","pavilion","courtyard","terraced","sculptural","grid","industrial","podium","campus"];
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const near=(a,b,t=.01)=>Math.abs(a-b)<t;

/** Components bounded by the registered 10/11-meter lot. Every mass is supported by ground or by a lower volume. */
export function cityBuildingPlan(a){
 const w=a.width,d=a.depth,h=a.height,v=a.variant||0,t=a.massingStyle||0;
 const volumes=[];
 const mass=(name,x,z,sx,sz,bottom,height,material,role="main")=>{
  if(!Number.isFinite(x+z+sx+sz+bottom+height)||sx<=0||sz<=0||height<=0)throw Error("Bad architectural component "+a.id+" "+name);
  const item={name,x,z,width:sx,depth:sz,bottom,height,top:bottom+height,material,role};
  if(Math.abs(x)+sx/2>w*.496+.001||Math.abs(z)+sz/2>d*.496+.001)throw Error("Massing outside footprint "+a.id+" "+name);
  volumes.push(item);return item;
 };
 let feature=null;
 switch(a.archetype){
 case "stacked":
  mass("studio",-.10*w,-.08*d,.74*w,.76*d,0,.54*h,0);
  mass("cantilever",(.07+.018*t)*w,-.13*d,.62*w,.58*d,.54*h,.46*h,1);
  mass("entrance-annex",-.315*w,.22*d,.19*w,.31*d,0,.28*h,4,"podium");
  break;
 case "tower":{
  const base=clamp(h*.23,2.6,4.2);
  mass("retail-podium",0,.025*d,.87*w,.79*d,0,base,5,"podium");
  mass("central-tower",(.045+v*.004)*w,-.105*d,.56*w,.62*d,base,h-base,0);
  break;
 }
 case "pavilion":
  mass("gallery-pavilion",0,0,.91*w,.80*d,0,.70*h,0);
  mass("upper-store",.23*w,-.14*d,.31*w,.44*d,.70*h,.21*h,1);
  break;
 case "courtyard":
  mass("west-wing",-.29*w,-.115*d,.37*w,.66*d,0,.85*h,0);
  mass("east-wing",.29*w,-.115*d,.37*w,.66*d,0,h,1);
  mass("rear-link",0,-.335*d,.47*w,.27*d,0,.56*h,0);
  break;
 case "terraced":
  mass("garden-podium",-.06*w,.04*d,.85*w,.80*d,0,.51*h,0);
  mass("terrace",.09*w,-.11*d,.62*w,.61*d,.51*h,.30*h,1);
  mass("roof-room",.01*w,-.23*d,.43*w,.39*d,.81*h,.19*h,0);
  break;
 case "sculptural":
  mass("sculpture-left",-.24*w,-.10*d,.43*w,.69*d,0,.76*h,0);
  mass("sculpture-right",.24*w,.09*d,.43*w,.58*d,0,.63*h,1);
  mass("bridge",.06*w,-.105*d,.51*w,.56*d,.62*h,.38*h,2);
  break;
 case "grid":
  mass("structural-grid",0,-.055*d,.79*w,.77*d,0,.96*h,0);
  break;
 case "industrial":
  mass("production-hall",.01*w,.025*d,.91*w,.79*d,0,.67*h,0);
  mass("service-tower",-.285*w,-.16*d,.29*w,.43*d,0,.85*h,6);
  break;
 case "podium":{
  const base=clamp(h*.25,2.5,5.0);
  mass("public-podium",0,.025*d,.87*w,.79*d,0,base,5,"podium");
  mass("setback-tower",-.11*w,-.16*d,.53*w,.59*d,base,h-base,1);
  mass("meeting-annex",.30*w,-.08*d,.19*w,.40*d,base,.39*h,0);
  break;
 }
 case "campus":
  mass("western-campus",-.30*w,-.12*d,.35*w,.66*d,0,.78*h,0);
  mass("eastern-campus",.30*w,-.12*d,.35*w,.66*d,0,h,1);
  mass("central-gallery",0,.19*d,.32*w,.43*d,0,.44*h,5);
  break;
 default: throw Error("Unapproved archetype "+a.archetype+" ("+a.id+")");
 }
 const primary=volumes.filter(x=>x.role==="main").sort((a,b)=>b.top-a.top)[0]||volumes[0];
 // Every media slot maps to an *existing* mass, never the global bounding box.
 const mediaVolume=volumes.filter(x=>x.top>h*.53&&x.width>=w*.31).sort((a,b)=>b.top-a.top)[0]||primary;
 const hasD= (a.advertisingSlots||[]).some(id=>id.includes(":dooh:"));
 const hasR= (a.advertisingSlots||[]).some(id=>id.includes(":ooh:"));
 const dooh={x:mediaVolume.x,y:clamp(mediaVolume.bottom+mediaVolume.height*.56,mediaVolume.bottom+1.55,mediaVolume.top-.75),
  z:mediaVolume.z+mediaVolume.depth/2+.15,width:mediaVolume.width*.74,height:clamp(mediaVolume.height*.19,.62,1.18)};
 // Roof advertising uses the actual roof front elevation rather than a guessed screen coordinate.
 const roof={x:primary.x,y:primary.top+.40,z:primary.z+primary.depth/2-.13,width:primary.width*.74,height:.69};
 const entranceVolume=volumes.filter(x=>x.bottom===0).sort((a,b)=>(b.z+b.depth/2)-(a.z+a.depth/2))[0];
 const entrance={x:entranceVolume.x,y:1.20,z:entranceVolume.z+entranceVolume.depth/2+.16};
 return {volumes,primary,dooh:hasD?dooh:null,roof:hasR?roof:null,entrance,
  activation:{x:-w*.37,y:.8,z:d*.37},footprint:[w,d],height:h};
}
export function cityMediaSlots(a){
 const p=cityBuildingPlan(a),ids=a.advertisingSlots||[];
 return ids.map(id=>{
  const kind=id.includes(":dooh:")?"dooh":id.includes(":ooh:")?"ooh":"iooh";
  const surf=kind==="dooh"?p.dooh:kind==="ooh"?p.roof:null;
  return {id,kind,anchor:kind==="dooh"?"ANCHOR_DOOH_Facade":kind==="ooh"?"ANCHOR_OOH_Parapet":"ANCHOR_Activation",
    width:surf?.width??.58,height:surf?.height??1.2,content:kind==="iooh"?"interactive":"dynamic"};
 });
}
export function cityAnchors(a){
 const p=cityBuildingPlan(a);
 const out={ANCHOR_Entrance:[p.entrance.x,p.entrance.y,p.entrance.z],
  ANCHOR_Sign:[p.entrance.x,2.55,p.entrance.z],
  ANCHOR_Roof:[p.primary.x,p.primary.top+.25,p.primary.z],
  COLLIDER_Footprint:[0,.2,0]};
 if(p.dooh)out.ANCHOR_DOOH_Facade=[p.dooh.x,p.dooh.y,p.dooh.z];
 if(p.roof)out.ANCHOR_OOH_Parapet=[p.roof.x,p.roof.y,p.roof.z+.09];
 if((a.advertisingSlots||[]).some(id=>id.includes(":iooh:")))out.ANCHOR_Activation=[p.activation.x,p.activation.y,p.activation.z];
 return out;
}
/** Populate physically connected volumes and attach windows ONLY to the real outside faces. */
export function buildCityModernist(box,a,lod=0){
 const p=cityBuildingPlan(a),w=a.width,d=a.depth,h=a.height;
 const b=(x,y,z,sx,sy,sz,mat)=>box(x,y,z,sx,sy,sz,mat);
 b(0,.13,0,w*.976,.26,d*.976,5);
 for(const [index,v] of p.volumes.entries()){
  b(v.x,v.bottom+v.height/2,v.z,v.width,v.height,v.depth,v.material);
  // Each roof slab touches and caps its own physical mass.
  b(v.x,v.top+.105,v.z,v.width+.10,.21,v.depth+.10,index%3===1?4:2);
 }
 addArchitecturalFacades(b,p,a,lod);
 // DOOH frame embeds onto a verified existing face; omit overlapping window geometry in the slot zone.
 if(p.dooh){
  const m=p.dooh;
  b(m.x,m.y,m.z-.01,m.width+.21,m.height+.20,.14,6);
  b(m.x,m.y,m.z+.065,m.width,m.height,.08,3);
 }
 if(p.roof){
  const m=p.roof;
  const postBase=p.primary.top;
  for(const x of [m.x-m.width*.37,m.x+m.width*.37])
    b(x,postBase+.23,m.z-.11,.11,.51,.14,6);
  b(m.x,m.y,m.z,m.width+.12,m.height+.10,.15,6);
  b(m.x,m.y,m.z+.082,m.width,m.height,.06,4);
 }
 // Rival AI agency stages use genuine 3D additions that remain within original footprint.
 if(a.class==="rival"&&(a.tier||1)>1){
  const t=Math.min(4,a.tier),v=p.primary;
  b(v.x+v.width*.24,v.bottom+v.height*.65,v.z-v.depth*.12,v.width*.28,v.height*.21,v.depth*.40,3);
  if(t>=3)b(v.x-v.width*.20,v.top+.28,v.z,v.width*.42,.56,v.depth*.45,4);
  if(t>=4)b(v.x,v.top+.83,v.z,v.width*.67,.35,v.depth*.55,2);
 }
}
