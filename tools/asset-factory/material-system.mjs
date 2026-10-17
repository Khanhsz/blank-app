import fs from "node:fs";
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
const specification=JSON.parse(fs.readFileSync(new URL("../../assets/specs/pbr-materials.json",import.meta.url),"utf8"));
const BASE=specification.palettes;
const ROLE_PROPS=specification.roles.map(r=>[r.name,r.roughness,r.metallic]);
if(ROLE_PROPS.length!==MATERIAL_ROLE_NAMES.length||specification.roles.some((r,i)=>r.name!==MATERIAL_ROLE_NAMES[i]||r.index!==i))
 throw Error("PBR canonical role index mismatch");
export const ROLE_GROUPS={
 corporate:["client","corporate"],agency:["rival","agency","creative"],office:["office"],
 residential:["residential","decorative"],media:["media","broadcast","creator"]
};
export const MATERIAL_SYSTEM_VERSION=specification.version;
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
  name:"MT_"+MATERIAL_ROLE_NAMES[i]+"_"+asset.palette+"_"+(asset.class==="client"?"corporate":asset.class==="rival"?"rival":"base"),
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
