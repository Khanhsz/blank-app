/** Presentation-layer registry only. Gameplay IDs always come from cityLots. */
import slice from "../../../assets/specs/city-all.modernism.json";
export interface MasterEntry {
 id:string;class:string;name:string;width:number;depth:number;height:number;
 district:string;x:number;z:number;archetype:string;facade:string;roof:string;entrance:string;variant:number;advertisingSlots:string[];
 floors:number;roof:string;palette:string;seed:number;gameplayId?:string;decorative?:boolean;
}
export interface AssetLocation {id:string;x:number;z:number}
const entries=slice.masters as MasterEntry[];
const entryMap=new Map(entries.map(e=>[e.id,e]));
export const ASSET_VERSION=slice.version;
export const AssetRegistry={
 version:ASSET_VERSION,
 district:slice.district,
 count:entries.length,
 has:(id:string)=>entryMap.has(id),
 get:(id:string)=>entryMap.get(id),
 isInteractive:(id:string)=>!!entryMap.get(id)?.gameplayId,
 url:(id:string,lod:0|1)=>"/assets/mt-city/"+ASSET_VERSION+"/"+encodeURIComponent(id)+".lod"+lod+".glb",
 decorativePlacements:slice.decorativePlacements as AssetLocation[],
 all:()=>entries.slice()
};
export function checkRegistry(cityIds:readonly string[]){
 const ids=new Set(),issues:string[]=[];
 if(entries.length!==41)issues.push("expected complete 41 building manifest");
 if(entries.filter(e=>!!e.gameplayId).length!==cityIds.length)issues.push("missing real gameplay buildings");
 for(const e of entries){
  if(ids.has(e.id))issues.push("duplicate asset id: "+e.id);
  ids.add(e.id);
  if(!e.decorative&&!cityIds.includes(e.gameplayId||e.id))issues.push("unmapped gameplay entity: "+e.id);
  if(e.decorative&&cityIds.includes(e.id))issues.push("decorative id clashes with gameplay building: "+e.id);
  if(e.decorative&&e.gameplayId)issues.push("decorative asset has gameplay id: "+e.id);
  if(!Number.isInteger(e.seed)||e.width<=0||e.height<=0||e.depth<=0)issues.push("invalid dimensions: "+e.id);
 }
 for(const d of AssetRegistry.decorativePlacements)if(!ids.has(d.id)||!entryMap.get(d.id)?.decorative)issues.push("invalid decorative placement: "+d.id);
 return issues;
}
