/**
 * Marketing City Modernist Architecture Grammar.
 * Ten visually distinct modernist families; curated and seeded per real building ID.
 *
 * Units: meters, X/Z centered inside original lot, Y up, +Z entrance.
 * box(x,y,z,w,h,d,materialIndex) adds an actually visible 3D cuboid.
 * No DOM/CSS-only replacement. Source is reproducible and accessible to Blender bpy.
 */
export const CITY_ARCHITECTURE_FAMILIES=[
 "stacked","tower","pavilion","courtyard","terraced","sculptural",
 "grid","industrial","podium","campus"
];
const rng=n=>{let s=n>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)};
export function cityMediaSlots(asset){
 const ids=asset.advertisingSlots||[];
 const result=[];
 for(const id of ids){
  const kind=id.includes(":dooh:")?"dooh":id.includes(":ooh:")?"ooh":id.includes(":iooh:")?"iooh":
    id==="brickhouse-dooh-main"?"dooh":id==="brickhouse-ooh-parapet"?"ooh":"iooh";
  const anchor=kind==="dooh"?"ANCHOR_DOOH_Facade":kind==="ooh"?"ANCHOR_OOH_Parapet":"ANCHOR_Activation";
  result.push({id,kind,anchor,width:kind==="iooh"?.65:asset.width*(kind==="dooh"?.44:.38),height:kind==="dooh"?1.4:kind==="ooh"?.8:1.3,content:kind==="iooh"?"interactive":"dynamic"});
 }
 return result;
}
export function cityAnchors(asset){
 const w=asset.width,d=asset.depth,h=asset.height;
 const anchors={
  ANCHOR_Entrance:[0,1.1,d*.43],
  ANCHOR_Sign:[0,3.08,d*.462],
  ANCHOR_Roof:[0,h+.45,0],
  COLLIDER_Footprint:[0,.2,0],
 };
 const kinds=new Set(cityMediaSlots(asset).map(x=>x.kind));
 if(kinds.has("dooh"))anchors.ANCHOR_DOOH_Facade=[0,h*.63,d*.447];
 if(kinds.has("ooh"))anchors.ANCHOR_OOH_Parapet=[0,h+.42,d*.30];
 if(kinds.has("iooh"))anchors.ANCHOR_Activation=[-w*.33,.8,d*.46];
 return anchors;
}
/** The bounding 3D volume, never the original placeholder box. */
export function buildCityModernist(box,a,lod=0){
 const w=a.width,d=a.depth,h=a.height;
 const v=a.variant||0,style=a.massingStyle||0;
 const front=d*.38,move=((v%3)-1)*w*.052,thin=Math.max(.08,w*.012);
 const isLow=lod===1;
 const b=(x,y,z,sx,sy,sz,m)=>box(x,y,z,Math.max(.06,sx),Math.max(.06,sy),Math.max(.06,sz),m);
 const mass=(x,base,z,sx,sy,sz,m)=>b(x,base+sy*.5,z,sx,sy,sz,m);
 const primary=()=>{mass(move,0,-d*.07,w*.69,h*.83,d*.72,0);mass(move,h*.83,-d*.07,w*.49,h*.17,d*.64,1)};
 const podium=()=>mass(0,0,d*.045,w*.86,Math.min(h*.29,4.2),d*.80,5);
 b(0,.14,0,w*.96,.28,d*.96,5); // grounded foundation within reserved footprint
 let glassZ=front, glassXs=[-w*.20,0,w*.20], facadeHeight=h*.72, roofFront=d*.24;
 const margin=style%2===0?1:-1;
 switch(a.archetype){
 case "stacked":{ // asymmetrical cantilevered artistic volumes
  mass(-w*.12,0,-d*.03,w*.71,h*.51,d*.76,0);
  mass(w*(.07+style*.018),h*.51,-d*.105,w*.59,h*.49,d*.60,1);
  mass(-w*.34,0,d*.16,w*.20,h*.29,d*.42,4);
  b(w*.08,h*.52,-d*.09,w*.62,.30,d*.67,2);
  b(w*.09,h+.20,-d*.10,w*.61,.39,d*.62,2);
  glassZ=d*.206;glassXs=[-w*.075,w*.09,w*.255];facadeHeight=h*.65;roofFront=d*.20;
  break;
 }
 case "tower":{ // classic slender vertical modernism + lower commercial podium
  podium();
  mass(w*.07,Math.min(h*.26,3.7),-d*.095,w*(.47+style*.02),h-Math.min(h*.26,3.7),d*.62,0);
  for(const side of [-1,1])b(side*w*.26,h*.58,d*.22,thin*1.6,h*.67,d*.18,2);
  b(w*.07,h+.24,-d*.095,w*.55,.46,d*.67,6);
  glassZ=d*.21;glassXs=[-w*.09,w*.08,w*.22];facadeHeight=h*.85;roofFront=d*.215;
  break;
 }
 case "pavilion":{ // horizontal commercial wing + projecting low roof
  mass(0,0,0,w*.90,h*.58,d*.79,0);
  mass(w*.27,h*.56,-d*.16,w*.27,h*.26,d*.42,1);
  b(0,h*.62,d*.09,w*.97,.37,d*.87,2);
  b(0,h*.42,d*.41,w*.80,h*.21,.20,3);
  b(-w*.31,h*.32,d*.43,w*.13,h*.60,.16,6);
  b(w*.31,h*.32,d*.43,w*.13,h*.60,.16,6);
  glassZ=d*.418;glassXs=[-w*.25,0,w*.25];facadeHeight=h*.42;roofFront=d*.32;
  break;
 }
 case "courtyard":{ // left/right wings define distinct open foreground courtyard
  mass(-w*.31,0,-d*.13,w*.33,h*.82,d*.66,0);
  mass(w*.31,0,-d*.13,w*.33,h*.96,d*.66,1);
  mass(0,0,-d*.32,w*.55,h*.64,d*.28,0);
  b(0,h*.42,-d*.08,w*.73,.20,d*.45,2);
  b(0,1.90,d*.10,w*.64,.31,d*.22,5); // connecting lintel
  b(-w*.31,h*.84,-d*.13,w*.36,.42,d*.72,2);
  b(w*.31,h*.98,-d*.13,w*.36,.42,d*.72,4);
  glassZ=d*.205;glassXs=[-w*.31,w*.31];facadeHeight=h*.72;roofFront=d*.225;
  break;
 }
 case "terraced":{ // recessed planted steps, balconies and changing skyline
  const base=.49+v*.012;
  mass(-w*.08,0,d*.012,w*.81,h*base,d*.77,0);
  mass(w*.08,h*base,-d*.12,w*.63,h*.29,d*.60,1);
  mass(-w*.01,h*(base+.29),-d*.22,w*.44,h*(1-base-.29),d*.39,0);
  for(let k=0;k<3;k++)b(-w*.07,h*(.5+k*.14),d*(.29-k*.10),w*(.68-k*.1),.17,d*.12,4);
  b(-w*.01,h+.16,-d*.22,w*.49,.32,d*.44,2);
  glassZ=d*.40;glassXs=[-w*.23,0,w*.23];facadeHeight=h*.45;roofFront=d*.32;
  break;
 }
 case "sculptural":{ // two offset bars tied by a structural bridge
  mass(-w*.235,0,-d*.10,w*.42,h*.76,d*.70,0);
  mass(w*.235,0,d*.08,w*.43,h*.58,d*.53,1);
  mass(w*.045,h*.58,-d*.08,w*.49,h*.42,d*.59,2);
  b(0,h*.61,d*.02,w*.83,.29,d*.24,4);
  b(w*.04,h+.18,-d*.08,w*.51,.32,d*.62,6);
  glassZ=d*.315;glassXs=[-w*.25,w*.24];facadeHeight=h*.62;roofFront=d*.32;
  break;
 }
 case "grid":{ // strong structural exoskeleton, rectangular facade grid
  mass(0,0,-d*.07,w*.77,h*.95,d*.76,0);
  for(let col=0;col<4;col++)b((col-1.5)*w*.24,h*.51,d*.335,thin*1.5,h*.89,.15,6);
  b(0,h*.55,d*.34,w*.80,.17,.17,2);
  b(0,h*.76,d*.34,w*.80,.15,.17,2);
  b(0,h+.1,-d*.07,w*.84,.33,d*.80,2);
  glassZ=d*.335;glassXs=[-w*.24,0,w*.24];facadeHeight=h*.85;roofFront=d*.30;
  break;
 }
 case "industrial":{ // broad production hall and rhythmic sawtooth roof
  mass(0,0,d*.018,w*.88,h*.63,d*.81,0);
  mass(-w*.27,0,-d*.15,w*.30,h*.85,d*.48,6);
  for(let k=0;k<3;k++)b((-1+k)*w*.255,h*.63+.32,-d*.06,w*.245,.64,d*.64,k%2?2:4);
  b(0,h*.45,d*.432,w*.74,h*.26,.12,3);
  b(0,h*.19,d*.44,w*.42,h*.24,.15,6);
  glassZ=d*.43;glassXs=[-w*.29,0,w*.29];facadeHeight=h*.40;roofFront=d*.37;
  break;
 }
 case "podium":{ // tower above commercial plinth with asymmetric terrace
  podium();
  mass(-w*.13,h*.27,-d*.14,w*.53,h*.73,d*.57,1);
  mass(w*.30,h*.27,-d*.09,w*.20,h*.39,d*.38,0);
  b(w*.16,h*.28,d*.10,w*.61,.32,d*.55,4);
  b(-w*.13,h+.22,-d*.14,w*.57,.38,d*.64,2);
  glassZ=d*.20;glassXs=[-w*.27,-w*.13,w*.015];facadeHeight=h*.88;roofFront=d*.21;
  break;
 }
 case "campus":{ // separate interconnected studios, connector canopy and plaza
  mass(-w*.295,0,-d*.13,w*.33,h*.77,d*.66,0);
  mass(w*.296,0,-d*.15,w*.32,h*.98,d*.62,1);
  mass(0,0,d*.18,w*.33,h*.43,d*.42,5);
  b(0,h*.45,-d*.07,w*.72,.25,d*.47,2);
  b(0,h*.58,-d*.20,w*.23,h*.13,d*.28,3);
  b(-w*.295,h*.77,-d*.13,w*.36,.33,d*.71,4);
  b(w*.296,h+.14,-d*.15,w*.35,.36,d*.68,2);
  glassZ=d*.25;glassXs=[-w*.30,0,w*.30];facadeHeight=h*.62;roofFront=d*.24;
  break;
 }
 default:throw Error("Unknown curated architectural archetype: "+a.archetype+" in "+a.id);
 }
 // Entrance: context-sensitive depth, with architectural connection rather than floating sign.
 const zEntry=(a.archetype==="pavilion"||a.archetype==="industrial")?d*.418:d*.34;
 mass(0,0,zEntry,w*.22,2.45,d*.16,3);
 b(0,2.57,zEntry+.09,w*.32,.22,.28,2);
 if(!isLow){
  // High LOD facade logic: facade rhythms physically vary with curated materials.
  const rows=Math.min(5,Math.max(2,Math.floor(h/3.8)));
  const cols=a.facade==="vertical"?2:a.facade==="balcony"?3:a.facade==="ribbon"?2:3;
  for(let row=0;row<rows;row++){
   const y=3.2+(h-4.4)*(row+.45)/rows;
   for(let col=0;col<cols;col++){
    const x=(col-(cols-1)/2)*w*(a.facade==="vertical"?.25:.205)+move*.3;
    if(a.archetype==="courtyard"&&Math.abs(x)<w*.16)continue;
    const width=w*(a.facade==="ribbon"?.27:a.facade==="vertical"?.115:.15);
    const wh=a.facade==="vertical"?1.3:a.facade==="balcony"?.58:.86;
    b(x,y,glassZ,width+.19,wh+.20,.16,2);
    b(x,y,glassZ+.08,width,wh,.095,3);
    if(a.facade==="balcony"||a.facade==="graphic"||a.facade==="zigzag"){
     const sign=a.facade==="zigzag"?(row+col)%2?-1:1:1;
     b(x+sign*width*.30,y-wh*.54,glassZ+.17,width*.67,.11,.26,4);
    }
   }
   if(a.facade==="grid"||a.facade==="modular"||a.facade==="strips")b(0,y+.65,glassZ+.06,w*.64,.09,.12,1);
  }
  // Architectural features make variation structural rather than palette-only.
  if(a.roof==="pergola"||a.roof==="green"){
   b(0,h+.58,-d*.15,w*.55,.12,d*.40,4);
   for(let k=0;k<3;k++)b((k-1)*w*.22,h+.38,-d*.15,thin*1.8,.68,d*.38,6);
  }else if(a.roof==="spire"||a.roof==="crown"){
   mass(0,h+.12,-d*.15,w*.35,.6,d*.38,6);
   b(0,h+.50,-d*.15,w*.19,.18,d*.24,4);
  }else if(a.roof==="sawtooth"){
   for(let k=0;k<3;k++)b((k-1)*w*.255,h*.65+.78,-d*.08,w*.18,.30,d*.58,3);
  }else if(a.roof==="terrace"||a.roof==="offset"){
   b(w*.12,h+.36,-d*.17,w*.38,.28,d*.42,4);
  }
  if(a.entrance==="atrium"||a.entrance==="gallery")b(0,1.68,zEntry+.18,w*.27,2.20,.12,3);
  if(a.entrance==="bridge")b(0,3.0,zEntry-.20,w*.58,.18,d*.26,2);
  // Simple low-poly planters, no heavy texture/detail.
  if(a.function!=="decorative"){
   b(-w*.37,.5,d*.39,w*.10,.75,d*.12,5);
   b(w*.37,.5,d*.39,w*.10,.75,d*.12,5);
  }
 }
 // Wall-integrated ad housings: no unsupported floating black billboard panels.
 const slots=cityMediaSlots(a);
 if(slots.some(s=>s.kind==="dooh")){
  b(0,h*.63,d*.407,w*.47,1.58,d*.126,6);
  b(0,h*.63,d*.467,w*.441,1.43,.05,3);
 }
 if(slots.some(s=>s.kind==="ooh")){
  b(0,h+.42,d*.265,w*.415,.99,d*.148,6);
  b(0,h+.42,d*.343,w*.391,.83,.07,4);
 }
 // Rival agency upgrades have genuine geometric stages, not stretched/recolored facades.
 if(a.class==="rival"&&(a.tier||1)>1){
  const tier=Math.min(4,Math.max(2,a.tier));
  // Tier 2: cantilevered glass meeting annex, visibly distinct from base.
  mass(w*.22,h*.48,-d*.16,w*.28,h*.25,d*.40,3);
  b(w*.22,h*.75,-d*.16,w*.31,.23,d*.45,2);
  if(tier>=3){
   // Tier 3: roof-level creative campus bridge and vertical screening.
   mass(-w*.15,h*.75,-d*.19,w*.30,h*.26,d*.33,1);
   b(-w*.15,h+.1,-d*.19,w*.34,.23,d*.37,4);
   b(-w*.31,h*.63,d*.26,.17,h*.57,.22,6);
  }
  if(tier>=4){
   // Tier 4: prestige parapet / second roof program. Works for tall rivals.
   b(0,h+.72,-d*.12,w*.62,.37,d*.52,2);
   b(-w*.20,h+.43,-d*.12,.18,.76,d*.45,4);
   b(w*.20,h+.43,-d*.12,.18,.76,d*.45,4);
  }
 }
 // source anchors are assigned independently of actual number of geometry children.
}
