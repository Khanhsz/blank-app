import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FORTUNE_OFFICES,fortuneLocation,fortuneOfficePanelId} from "../src/game/fortuneLocations";
import {CLIENT_BY_ID} from "../src/game/clientDatabase";
import {rankedFortuneClients,ensureFortuneAccounts,isGameFortuneTop10} from "../src/game/fortuneAccounts";
import {defaults,newCEO} from "../src/game/state";

test("all 14 official Fortune HQ pins reuse unique existing decorative assets and exact map coordinates",()=>{
 const spec=JSON.parse(readFileSync("assets/specs/city-all.modernism.json","utf8"));
 const placements=new Map(spec.decorativePlacements.map((p:{id:string})=>[p.id,p]));
 assert.equal(FORTUNE_OFFICES.length,14);
 assert.equal(new Set(FORTUNE_OFFICES.map(p=>p.clientId)).size,14);
 assert.equal(new Set(FORTUNE_OFFICES.map(p=>p.assetId)).size,14);
 for(const marker of FORTUNE_OFFICES){
  const source=placements.get(marker.assetId) as {x:number;z:number}|undefined;
  assert.ok(source,marker.assetId);
  assert.equal(marker.x,source!.x);assert.equal(marker.z,source!.z);
  assert.ok(CLIENT_BY_ID[marker.clientId].fortuneRank!==null);
  assert.ok(fortuneOfficePanelId(marker.clientId).startsWith("fortune-hq-"));
  assert.equal(fortuneLocation(marker.clientId)?.assetId,marker.assetId);
 }
});
test("dynamic game Fortune ranking has 50 clients and each seeded rival respects Top 10 same-sector exclusivity",()=>{
 const s=defaults();s.agencyUnlocked=true;s.ceo=newCEO(80);
 const ranked=rankedFortuneClients(s);
 assert.equal(ranked.length,50);
 assert.ok(ranked.some(x=>x.firm.fortuneRank===null));
 const accounts=ensureFortuneAccounts(s);
 const rivals=new Map<string,string>();
 for(const {firm} of ranked.filter(x=>isGameFortuneTop10(s,x.firm.id))){
  const owner=accounts[firm.id]?.ownerAgencyId;
  if(!owner||owner==="player")continue;
  const key=owner+":"+firm.sector;
  assert.equal(rivals.has(key),false,owner+" cannot have two Top 10 accounts in "+firm.sector);
  rivals.set(key,firm.id);
 }
});
