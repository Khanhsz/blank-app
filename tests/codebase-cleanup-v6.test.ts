import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {defaults,migrate} from "../src/game/state";
import {TALENT_FUNCTIONS,legacyTalentAttributes} from "../src/game/personnel";

test("retired eight-department layer, world navigation and standalone simulation are absent",()=>{
 for(const path of ["src/game/functions.ts","src/game/world.ts","public/simulation/index.html"]){
  assert.equal(existsSync(path),false,path+" should be removed from the active repository");
 }
 const panels=readFileSync("src/components/game/Panels.tsx","utf8");
 assert.doesNotMatch(panels,/departmentMetrics|\bconst locked = false\b/);
 assert.deepEqual(TALENT_FUNCTIONS.map(f=>f.id),["acc","str","cre","med"]);
});

test("legacy saves still upgrade and preserve functional talent/agency progress after pruning",()=>{
 const s=defaults();
 s.created=true;s.staff=["creator2"];s.personnel.creator2={skill:73,morale:70,fatigue:4,xp:4};
 s.campaign.phase="research";
 const upgraded=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(upgraded.campaign.phase,"planning");
 assert.deepEqual(upgraded.staff,["creator2"]);
 assert.deepEqual(upgraded.personnel.creator2.attributes,legacyTalentAttributes("creator2",73));
 assert.equal(upgraded.personnel.creator2.morale,70);
 assert.equal(upgraded.personnel.creator2.xp,4);
 assert.deepEqual(migrate(JSON.parse(JSON.stringify(upgraded))).personnel,upgraded.personnel);
});
