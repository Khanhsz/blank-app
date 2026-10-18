import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {defaults,migrate,newCEO} from "../src/game/state";
import {applyCheat,setSandboxCheats,SANDBOX_MAX_BALANCE} from "../src/game/sandboxCheats";
import type {Fx} from "../src/game/store";
const msgs:string[]=[];
const fx:Fx={toast:x=>msgs.push(x),log:x=>msgs.push(x)};
const game=()=>{const s=defaults();s.created=true;return s;};

test("Sandbox cheats default OFF and must be explicitly activated",()=>{
 const s=game(),original=s.personalCash;
 assert.equal(s.sandboxCheats?.enabled,false);
 assert.equal(applyCheat(s,fx,"MONEY1B"),false);
 assert.equal(s.personalCash,original);
 assert.equal(setSandboxCheats(s,fx,true),true);
 assert.equal(s.sandboxCheats?.enabled,true);
 assert.equal(applyCheat(s,fx,"MONEY10M"),true);
 assert.equal(s.personalCash,original+10_000_000);
 assert.equal(s.sandboxCheats?.uses,1);
 assert.equal(s.sandboxCheats?.cashGranted,10_000_000);
 assert.equal(setSandboxCheats(s,fx,false),true);
 assert.equal(applyCheat(s,fx,"MONEY1B"),false);
 assert.equal(s.personalCash,original+10_000_000);
});
test("Cash cheat pays only into the active wallet and never fabricates agency client revenue",()=>{
 const s=game();setSandboxCheats(s,fx,true);
 const originalPersonal=s.personalCash;
 s.agencyUnlocked=true;s.agencyCash=25_000;s.ceo=newCEO(50);
 assert.equal(applyCheat(s,fx,"MONEY100M"),true);
 assert.equal(s.agencyCash,100_025_000);
 assert.equal(s.personalCash,originalPersonal);
 assert.equal(s.ceo.totalBilled,0);
 assert.equal(s.ceo.totalPaid,0);
 assert.equal(s.ceo.ledger.filter(x=>x.what.includes("Sandbox capital injection")).length,1);
 assert.equal(s.ceo.ledger[0].value,100_000_000);
 assert.equal(s.ceo.ledger[0].status,"paid");
});
test("Custom money accepts only positive integers and caps balances well below unsafe values",()=>{
 const s=game();setSandboxCheats(s,fx,true);
 const before=s.personalCash;
 for(const amount of [-2,0,1.5,NaN,Infinity,-Infinity,SANDBOX_MAX_BALANCE+1]){
  assert.equal(applyCheat(s,fx,"CASH",amount),false);
  assert.equal(s.personalCash,before);
 }
 assert.equal(applyCheat(s,fx,"MONEYBILLION"),false,"nonexistent codes cannot execute arbitrary logic");
 assert.equal(applyCheat(s,fx,"CASH",75_000_000),true);
 assert.equal(s.personalCash,before+75_000_000);
 s.personalCash=SANDBOX_MAX_BALANCE-200;
 assert.equal(applyCheat(s,fx,"MONEY1B"),true);
 assert.equal(s.personalCash,SANDBOX_MAX_BALANCE);
 assert.equal(applyCheat(s,fx,"MONEY1B"),false);
});
test("Player buffs synchronize CEO reputation, MAX staff stats and leave salaries unchanged",()=>{
 const s=game();s.agencyUnlocked=true;s.ceo=newCEO(10);s.staff=["creator","planner"];
 setSandboxCheats(s,fx,true);
 s.reputation=15;s.expertise=20;
 assert.equal(applyCheat(s,fx,"BOOST"),true);
 assert.equal(s.reputation,40);
 assert.equal(s.expertise,45);
 assert.equal(s.ceo.reputation.overall,40);
 assert.ok(s.personnel.creator.skill>0);
 assert.equal(applyCheat(s,fx,"REP100"),true);
 assert.equal(s.reputation,100);
 assert.equal(s.ceo.reputation.overall,100);
 assert.equal(applyCheat(s,fx,"EXP100"),true);
 assert.equal(s.expertise,100);
 assert.equal(applyCheat(s,fx,"STAFFMAX"),true);
 for(const id of s.staff){
  const p=s.personnel[id];
  assert.equal(p.skill,100);assert.equal(p.morale,100);assert.equal(p.fatigue,0);
  assert.deepEqual(p.attributes,{acc:100,str:100,cre:100,med:100});
 }
 const fee=s.agencyCash;
 assert.equal(applyCheat(s,fx,"ALLMAX"),true);
 assert.equal(s.agencyCash,fee+100_000_000);
 assert.equal(s.ceo.totalBilled,0);
 assert.equal(s.ceo.ledger.filter(x=>x.what.includes("Sandbox capital injection")).length,1);
});
test("Sandbox data survives browser save migration; old saves stay cheat-disabled",()=>{
 const s=game();setSandboxCheats(s,fx,true);
 applyCheat(s,fx,"MONEY10M");
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.sandboxCheats?.enabled,true);
 assert.equal(restored.sandboxCheats?.cashGranted,10_000_000);
 assert.equal(restored.sandboxCheats?.lastCommand,"MONEY10M");
 assert.equal(restored.personalCash,s.personalCash);
 const old=JSON.parse(JSON.stringify(s));delete old.sandboxCheats;
 assert.equal(migrate(old).sandboxCheats?.enabled,false);
});
test("Cheat menu available from Settings and Alt+Shift+M with no real-money payment endpoint",()=>{
 const app=readFileSync("src/App.tsx","utf8");
 const settings=readFileSync("src/components/game/GameSettings.tsx","utf8");
 const ui=readFileSync("src/components/game/SandboxCheatConsole.tsx","utf8");
 const core=readFileSync("src/game/sandboxCheats.ts","utf8");
 assert.ok(app.includes('setPanel("settings")'));
 assert.ok(app.includes('e.altKey||!e.shiftKey'));
 assert.ok(settings.includes("<SandboxCheatConsole"));
 assert.ok(ui.includes("Custom amount (VND)"));
 assert.ok(ui.includes("MAX Employees"));
 assert.ok(ui.includes("ALL MAX + 100M"));
 assert.ok(core.includes('value:actual,lead:"sandbox"'));
 assert.ok(!core.includes("fetch("));
 assert.ok(!core.includes("eval("));
});
