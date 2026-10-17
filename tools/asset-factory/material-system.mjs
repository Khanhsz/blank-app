/**
 * Marketing Tycoon V5.3 — a single PBR material design system.
 * All low-poly materials are intentionally OPAQUE; reflective-looking glass is
 * stylized via roughness/color + physically mounted window and curtain geometry.
 * No transmission/alpha sorting, no 2K textures and no baked photos.
 *
 * Material slot order 0–6 is backward compatible with the original GLB emitter.
 * The named slots 7–10 allow new architectural details without repurposing anchors.
 */
export const MATERIAL_ROLE=Object.freeze({
 STRUCTURE_CONCRETE:0,FACADE_PLASTER:1,ROOF_CONCRETE:2,WINDOW_GLASS:3,
 ARCHITECTURAL_ACCENT:4,PODIUM_STONE:5,WINDOW_FRAME_METAL:6,
 CURTAIN_WALL_GLASS:7,ALUMINUM_CLADDING:8,CONCRETE_PANEL:9,DOOH_HOUSING:10
});
export const MATERIAL_ROLE_NAMES=Object.freeze(Object.keys(MATERIAL_ROLE));
const BASE={
 clay:["#b8a99b","#e4d8c9","#6e7577","#577d89","#b45f48","#8b8c85","#2d414d","#4d7988","#aab5b6","#b9afa2","#33414b"],
 rose:["#c1aab0","#e8dbd6","#727c82","#6b8798","#b98088","#b3a9a3","#334552","#527a8b","#b9c4c7","#c9b9b8","#303f49"],
 mauve:["#a6a6b3","#dedde2","#6b707b","#617f94","#9b819a","#858a94","#2f424f","#517488","#a9b9c3","#b7b7c2","#303e4b"],
 sand:["#c3beb3","#e8e3d9","#85837c","#65818b","#bc8864","#aba397","#344650","#4e7786","#adb8b7","#cec8b9","#374750"],
 sage:["#adb9ac","#e4e9df","#677b7d","#557f86","#7b947e","#919c94","#31484b","#4e8884","#a6b6b2","#b4bfb4","#314349"],
 slate:["#9baab4","#e0e6e9","#536574","#537c91","#718ba0","#87939a","#293f4d","#416d84","#a2b6c1","#a9b8c3","#283a47"]
};
const ROLE_PROPS=[
 ["structural concrete",.88,0],["architectural plaster",.89,0],
 ["roof concrete",.91,0],["blue grey architectural glass",.26,.035],
 ["accent cladding",.80,0],["stone podium",.80,0],
 ["graphite metal",.46,.74],["teal curtain glass",.30,.045],
 ["brushed aluminium",.41,.76],["precast concrete panel",.91,0],
 ["OOH graphite housing",.45,.72]
];
export const ROLE_GROUPS={
 corporate:["client","corporate"],agency:["rival","agency","creative"],office:["office"],
 residential:["residential","decorative"],media:["media","broadcast","creator"]
};
export const MATERIAL_SYSTEM_VERSION="mt-pbr-v1";
export function pbrColors(asset){
 const base=BASE[asset.palette];
 if(!base)throw Error("Unknown PBR palette "+asset.palette+" for "+asset.id);
 // Corporate brands have more cool glass and dark aluminium; residential is warmer.
 const colors=base.slice();
 if(asset.class==="client"||["corporate","client"].includes(asset.function)){
  colors[MATERIAL_ROLE.STRUCTURE_CONCRETE]=colors[MATERIAL_ROLE.CONCRETE_PANEL];
  colors[MATERIAL_ROLE.CURTAIN_WALL_GLASS]="#496e81";
 }else if(asset.class==="rival"){
  colors[MATERIAL_ROLE.CURTAIN_WALL_GLASS]="#3f687c";
 }else if(asset.decorative){
  colors[MATERIAL_ROLE.CURTAIN_WALL_GLASS]=colors[MATERIAL_ROLE.WINDOW_GLASS];
 }
 return colors;
}
export function srgbToLinear(hex){
 if(!/^#[a-fA-F0-9]{6}$/.test(hex))throw Error("Not a 6-digit color "+hex);
 return [1,3,5].map(i=>{
  const c=parseInt(hex.slice(i,i+2),16)/255;
  return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
 });
}
export function pbrMaterials(asset){
 const colors=pbrColors(asset);
 const result=ROLE_PROPS.map(([label,roughness,metallic],i)=>({
  name:"MT_"+MATERIAL_ROLE_NAMES[i]+"_"+asset.palette,
  pbrMetallicRoughness:{
   baseColorFactor:[...srgbToLinear(colors[i]),1],
   metallicFactor:metallic,
   roughnessFactor:roughness
  },
  doubleSided:false,
  alphaMode:"OPAQUE",
  extras:{role:MATERIAL_ROLE_NAMES[i],version:MATERIAL_SYSTEM_VERSION,sourceColor:colors[i],label}
 }));
 if(result.length!==11||new Set(result.map(x=>x.name)).size!==11)throw Error("Invalid material library");
 return result;
}
export function materialContrast(asset){
 const m=pbrMaterials(asset),g=m[MATERIAL_ROLE.WINDOW_GLASS],c=m[MATERIAL_ROLE.STRUCTURE_CONCRETE],metal=m[MATERIAL_ROLE.WINDOW_FRAME_METAL];
 return {glassRoughness:g.pbrMetallicRoughness.roughnessFactor,
  concreteRoughness:c.pbrMetallicRoughness.roughnessFactor,
  metalMetallic:metal.pbrMetallicRoughness.metallicFactor,
  materialCount:m.length};
}
