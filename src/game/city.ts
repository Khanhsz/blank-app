import {ceoRivalDefs,clamp} from "./data";
import type {GameState} from "./state";
import type {Fx} from "./store";

export type DistrictKind="core"|"rival"|"office";
export interface CityLot {
 id:string;name:string;kind:DistrictKind;x:number;z:number;w:number;d:number;h:number;color:string;
 rivalId?:string;district?:string;
}
export const cityLots:CityLot[]=[
 {id:"research",name:"DeepFrame Research Lab",kind:"core",x:-48,z:-40,w:9,d:10,h:11,color:"#73929a",district:"Innovation Quarter"},
 {id:"creative",name:"Creative Studio",kind:"core",x:-32,z:-24,w:10,d:9,h:9,color:"#d69d72",district:"Arts Quarter"},
 {id:"media",name:"Media Hub",kind:"core",x:-48,z:8,w:10,d:10,h:14,color:"#647e87",district:"Media Boulevard"},
 {id:"influencer",name:"Creator District",kind:"core",x:-16,z:-40,w:10,d:9,h:9,color:"#c38a83",district:"Arts Quarter"},
 {id:"network",name:"Networking Café",kind:"core",x:16,z:-8,w:10,d:9,h:6,color:"#819b78",district:"Central Plaza"},
 {id:"brand",name:"Brand Headquarters",kind:"core",x:48,z:-40,w:10,d:10,h:20,color:"#a58c76",district:"Corporate Mile"},
 {id:"cowork",name:"Coworking Collective",kind:"core",x:32,z:8,w:10,d:10,h:11,color:"#b1a3c5",district:"Startup Quarter"},
 {id:"agency",name:"Your Agency · Starter HQ",kind:"core",x:48,z:24,w:10,d:10,h:11,color:"#bd694a",district:"Corporate Mile"},
 {id:"rival-atlas",name:"Atlas Global Network",kind:"rival",rivalId:"atlas",x:-32,z:40,w:11,d:10,h:23,color:"#58778b",district:"Agency Row"},
 {id:"rival-pulse",name:"Pulse Performance",kind:"rival",rivalId:"pulse",x:32,z:-40,w:10,d:11,h:17,color:"#448e9b",district:"Corporate Mile"},
 {id:"rival-muse",name:"Muse & Matter",kind:"rival",rivalId:"muse",x:-16,z:24,w:10,d:10,h:13,color:"#a17d9f",district:"Arts Quarter"},
 {id:"rival-lean",name:"LeanLab Digital",kind:"rival",rivalId:"lean",x:48,z:-8,w:9,d:10,h:10,color:"#759e85",district:"Startup Quarter"},
 {id:"rival-north",name:"Northline Advisory",kind:"rival",rivalId:"north",x:-48,z:40,w:10,d:10,h:21,color:"#8a87aa",district:"Agency Row"},
 {id:"office-loft",name:"Foundry Loft",kind:"office",x:-32,z:8,w:9,d:10,h:8,color:"#ad927e",district:"Arts Quarter"},
 {id:"office-brick",name:"Brickhouse Studios",kind:"office",x:16,z:-24,w:10,d:10,h:12,color:"#bd826a",district:"Arts Quarter"},
 {id:"office-harbor",name:"Harbor Workspace",kind:"office",x:-48,z:-8,w:10,d:10,h:13,color:"#68999c",district:"Innovation Quarter"},
 {id:"office-atrium",name:"Atrium Campus",kind:"office",x:16,z:24,w:10,d:9,h:16,color:"#bb9a81",district:"Central Plaza"},
 {id:"office-tower",name:"Cobalt Tower",kind:"office",x:32,z:24,w:10,d:10,h:25,color:"#6e91a8",district:"Corporate Mile"},
 {id:"office-warehouse",name:"Warehouse 27",kind:"office",x:-16,z:40,w:11,d:9,h:10,color:"#b6937e",district:"Agency Row"},
 {id:"office-skyline",name:"Skyline One",kind:"office",x:48,z:40,w:11,d:11,h:30,color:"#8a96b0",district:"Corporate Mile"},
 {id:"office-boulevard",name:"Boulevard Suites",kind:"office",x:-16,z:-8,w:10,d:10,h:17,color:"#b29e8b",district:"Central Plaza"}
];
export interface OfficeOption {id:string;deposit:number;daily:number;minRep:number;capacity:number;prestige:number;description:string}
export const starterOffice:OfficeOption={id:"agency",deposit:0,daily:160000,minRep:0,capacity:8,prestige:0,description:"Your first office. Suitable for a small team."};
export const officeOptions:OfficeOption[]=[
 {id:"office-loft",deposit:2600000,daily:145000,minRep:0,capacity:9,prestige:1,description:"Small creative loft with economical overhead and room for a growing team."},
 {id:"office-brick",deposit:5200000,daily:185000,minRep:12,capacity:10,prestige:2,description:"Adaptable studio with more desks and space for small client meetings."},
 {id:"office-harbor",deposit:6800000,daily:205000,minRep:20,capacity:12,prestige:2,description:"Research-friendly office close to the Innovation Quarter."},
 {id:"office-atrium",deposit:9000000,daily:235000,minRep:28,capacity:13,prestige:3,description:"A central modern campus with meeting suites and dedicated team pods."},
 {id:"office-warehouse",deposit:11500000,daily:195000,minRep:35,capacity:15,prestige:3,description:"Flexible, spacious production warehouse built for a larger creative team."},
 {id:"office-boulevard",deposit:14500000,daily:260000,minRep:42,capacity:16,prestige:4,description:"Central headquarters suited to high-value clients and strategic pitches."},
 {id:"office-tower",deposit:24000000,daily:320000,minRep:60,capacity:20,prestige:5,description:"Prestigious headquarters with executive boardrooms and extensive desk capacity."},
 {id:"office-skyline",deposit:39000000,daily:430000,minRep:75,capacity:24,prestige:7,description:"Flagship skyscraper overlooking Marketing City, for established agencies."}
];
export const findOffice=(id?:string)=>officeOptions.find(o=>o.id===id)||starterOffice;
export const currentOffice=(s:GameState)=>findOffice(s.officeId);
export const findCityLot=(id:string)=>cityLots.find(l=>l.id===id);
export const cityRival=(s:GameState,id:string)=>s.ceo?.rivals.find(r=>r.id===id)||ceoRivalDefs.find(r=>r.id===id);
export function leaseOffice(s:GameState,fx:Fx,id:string){
 const option=officeOptions.find(o=>o.id===id);
 if(!option){fx.toast("This building is not offered for lease");return false}
 if(!s.agencyUnlocked){fx.toast("Found an agency before leasing an office");return false}
 if(s.officeId===id){fx.toast("Your agency is already headquartered here");return false}
 if(s.reputation<option.minRep){fx.toast("Requires "+option.minRep+" reputation");return false}
 if(s.agencyCash<option.deposit){fx.toast("Not enough agency cash for the lease deposit");return false}
 s.agencyCash-=option.deposit;
 if(s.ceo){s.ceo.ledger.unshift({day:s.ceo.day,what:"Office relocation deposit · "+option.id,value:-option.deposit,lead:"agency",status:"paid"});s.ceo.ledger=s.ceo.ledger.slice(0,150)}
 s.officeId=id;
 s.world.leasedOffices ||= [];
 if(!s.world.leasedOffices.includes(id)){
  s.world.leasedOffices.push(id);
  s.reputation=clamp(s.reputation+option.prestige,0,99);
  if(s.ceo)s.ceo.reputation.overall=clamp(s.ceo.reputation.overall+option.prestige,0,99);
 }
 fx.log("Agency relocated to "+cityLots.find(l=>l.id===id)?.name);
 fx.toast("New agency HQ · "+cityLots.find(l=>l.id===id)?.name);
 return true;
}
export const cityCounts={core:cityLots.filter(x=>x.kind==="core").length,rivals:cityLots.filter(x=>x.kind==="rival").length,offices:cityLots.filter(x=>x.kind==="office").length};
