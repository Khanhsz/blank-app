/** Fortune office map markers anchored to 14 EXISTING decorative GLBs.
 * The underlying city meshes and certified asset registry are unchanged.
 * These are fictional game offices, not real geographic corporate addresses.
 */
export const FORTUNE_OFFICES=[
 {clientId:"f50-1",assetId:"ambient-p16-m40",x:16,z:-40,h:13.6},
 {clientId:"f50-2",assetId:"ambient-m16-m24",x:-16,z:-24,h:13.6},
 {clientId:"f50-4",assetId:"arts-residence-a",x:-48,z:-24,h:13},
 {clientId:"f50-5",assetId:"ambient-p48-m24",x:48,z:-24,h:12},
 {clientId:"f50-11",assetId:"ambient-p32-p40",x:32,z:40,h:12},
 {clientId:"f50-13",assetId:"ambient-m16-p8",x:-16,z:8,h:12},
 {clientId:"f50-16",assetId:"ambient-m48-p24",x:-48,z:24,h:12},
 {clientId:"f50-17",assetId:"ambient-p32-m8",x:32,z:-8,h:8.8},
 {clientId:"f50-27",assetId:"arts-retail",x:0,z:-40,h:7},
 {clientId:"f50-28",assetId:"ambient-m32-p24",x:-32,z:24,h:8.8},
 {clientId:"f50-35",assetId:"arts-residence-b",x:-32,z:-8,h:9},
 {clientId:"f50-41",assetId:"ambient-p0-p40",x:0,z:40,h:7.2},
 {clientId:"f50-42",assetId:"ambient-p16-p8",x:16,z:8,h:5.6},
 {clientId:"f50-46",assetId:"arts-kiosk",x:0,z:-8,h:4}
] as const;
export const fortuneLocation=(id:string)=>FORTUNE_OFFICES.find(x=>x.clientId===id)??null;
export const fortuneOfficePanelId=(id:string)=>"fortune-hq-"+id;
