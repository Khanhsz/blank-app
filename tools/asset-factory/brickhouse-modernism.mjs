/**
 * Brickhouse Studios — 3-volume low-poly modernist building, Y-up and +Z street entrance.
 * The same design dimensions are mirrored in brickhouse_modernism.py for editable Blender masters.
 * Only structural, permanent signage-support geometry is baked into the GLB.
 * Campaign creative maps onto exported DOOH/OOH anchors at runtime.
 */
export const BRICKHOUSE_ARCHETYPE="brickhouse-modernist-v1";
export const brickhouseAnchors=(a)=>({
 "ANCHOR_Entrance":[a.width*.06,1.35,a.depth*.435],
 "ANCHOR_Sign":[a.width*.06,3.72,a.depth*.454],
 "ANCHOR_Roof":[a.width*.05,a.height+.36,-a.depth*.11],
 "ANCHOR_DOOH_Facade":[a.width*.052,a.height*.706,a.depth*.273],
 "ANCHOR_OOH_Parapet":[a.width*.05,a.height+.42,a.depth*.266],
 "ANCHOR_Activation":[-a.width*.33,.8,a.depth*.47],
 "COLLIDER_Footprint":[0,.2,0]
});
export const brickhouseSlots=(a)=>[
 {id:"brickhouse-dooh-main",kind:"dooh",anchor:"ANCHOR_DOOH_Facade",width:a.width*.43,height:a.height*.13,content:"dynamic"},
 {id:"brickhouse-ooh-parapet",kind:"ooh",anchor:"ANCHOR_OOH_Parapet",width:a.width*.40,height:.80,content:"dynamic"},
 {id:"brickhouse-activation",kind:"iooh",anchor:"ANCHOR_Activation",width:a.width*.12,height:1.1,content:"interactive"}
];
export function buildBrickhouseModernist(box,asset,lod){
 const w=asset.width,d=asset.depth,h=asset.height;
 // LOD1 preserves the asymmetrical silhouette and real media attachment locations,
 // but removes near-view glazing/fins to stay within the 360-triangle QA gate.
 // Each cuboid is 12 triangles. 19 components = 228 triangles.
 if(lod!==0){
  box(0,.14,0,w,.28,d,5);
  box(-w*.298,h*.305,-d*.065,w*.39,h*.61,d*.77,0);
  box(w*.050,h*.50,-d*.10,w*.55,h,d*.71,1);
  box(w*.338,h*.382,d*.015,w*.29,h*.765,d*.62,0);
  box(w*.05,h+.24,-d*.10,w*.575,.48,d*.737,2);
  box(-w*.298,h*.61+.20,-d*.065,w*.414,.40,d*.792,4);
  box(w*.338,h*.765+.19,d*.015,w*.312,.38,d*.654,2);
  box(w*.057,.95,d*.402,w*.40,1.7,.15,6);
  box(w*.057,3.14,d*.445,w*.49,.22,.76,2);
  box(-w*.295,1.84,d*.329,w*.32,3.24,.11,3);
  for(let level=0;level<3;level++)box(w*.05,4.64+level*2.29,d*.267,w*.50,.45,.10,3);
  box(w*.052,h*.706,d*.270,w*.47,h*.17,.14,6);
  box(w*.052,h*.706,d*.290,w*.425,h*.132,.025,3);
  box(w*.05,h+.42,d*.256,w*.44,.97,.20,6);
  box(w*.05,h+.42,d*.271,w*.414,.82,.08,4);
  box(w*.05,3.72,d*.454,w*.45,.53,.10,2);
  return;
 }
 // Keep all structural mass inside the original 10×10 gameplay collision plot.
 box(0,.14,0,w,.28,d,5);
 // Three separated, deliberately asymmetric architectural volumes.
 box(-w*.298,h*.305,-d*.065,w*.39,h*.61,d*.77,0);  // left production studio
 box(w*.050,h*.50,-d*.10,w*.55,h,d*.71,1);           // tall central office
 box(w*.338,h*.382,d*.015,w*.29,h*.765,d*.62,0);      // right stepped wing
 // Large horizontal floor bands and framed parapets.
 box(w*.05,h+.24,-d*.10,w*.575,.48,d*.737,2);
 box(-w*.298,h*.61+.20,-d*.065,w*.414,.40,d*.792,4);
 box(w*.338,h*.765+.19,d*.015,w*.312,.38,d*.654,2);
 // Distinctive cantilevered studio entrance and visual portal; not a pasted front door.
 box(w*.057,.95,d*.402,w*.40,1.7,.15,6);
 box(w*.057,2.17,d*.408,w*.43,.34,.28,3);
 box(w*.057,3.14,d*.445,w*.49,.22,.76,2);
 box(-w*.105,1.72,d*.439,.23,2.7,.34,4);
 box(w*.232,1.72,d*.439,.23,2.7,.34,4);
 // Large glazed gallery for production work facing the street.
 box(-w*.295,1.84,d*.329,w*.32,3.24,.11,3);
 box(-w*.295,3.48,d*.348,w*.345,.23,.19,2);
 box(-w*.295,1.84,d*.352,.11,2.95,.13,6);
 // Main office rhythm: window recess treatment uses pale reveals + blue-glass strips.
 // Center face is at Z=0.255*depth; screens sit here as flush built-in media surfaces.
 for(let level=0;level<3;level++){
  const y=4.64+level*2.29;
  for(let col=0;col<3;col++){
   const x=(-.143+col*.175)*w;
   box(x,y,d*.256,w*.123,1.11,.12,6);
   box(x,y,d*.267,w*.104,.92,.085,3);
  }
  box(w*.05,y-1.04,d*.267,w*.50,.13,.18,2);
 }
 // Rhythm on right wing: tall glazed strips & perpendicular concrete fins.
 for(let col=0;col<2;col++){
  const x=(.258+col*.136)*w;
  box(x,h*.48,d*.327,w*.093,h*.37,.105,3);
  box(x+w*.057,h*.48,d*.334,.095,h*.50,.16,1);
 }
 // Storefront soffit, permanent integrated architecture for DOOH.
 box(w*.052,h*.706,d*.270,w*.47,h*.17,.14,6);
 box(w*.052,h*.706,d*.281,w*.44,h*.145,.09,2);
 box(w*.052,h*.706,d*.290,w*.425,h*.132,.025,3); // dynamic screen overlays this
 // Parapet-integrated static rooftop OOH, framed within the central volume.
 box(w*.05,h+.42,d*.256,w*.44,.97,.20,6);
 box(w*.05,h+.42,d*.271,w*.414,.82,.08,4);
 // Integrated small studio lettering bar; rendered text remains a UI layer.
 box(w*.05,3.72,d*.454,w*.45,.53,.10,2);
 // Simplified roof service blocks, planters; all visible at isometric zoom.
 box(-w*.045,h+.55,-d*.295,w*.13,.63,d*.19,6);
 box(w*.212,h+.52,-d*.27,w*.16,.55,d*.17,0);
 box(-w*.452,.55,d*.33,w*.07,1.10,d*.23,4);
 box(-w*.452,1.07,d*.33,w*.16,.16,d*.27,5);
 if(lod===0){
  // Ground-floor aluminum storefront and studio/cafe portal.
  box(w*.057,1.60,d*.459,.12,2.18,.13,2);
  box(-w*.295,1.84,d*.344,w*.29,.12,.14,1);
  // Roof parapet sides, stepped transfer between masses, side glazing.
  box(w*.05,h+.27,-d*.449,w*.54,.30,.20,1);
  box(w*.318,h*.765+.19,d*.015,w*.22,.20,d*.64,4);
  for(let f=0;f<2;f++){
   const y=2.55+f*2.3;
   box(-w*.298,y,d*.331,w*.30,.12,.17,1);
  }
  for(let f=0;f<3;f++){
   const y=4.25+f*2.16;
   box(w*.327,y,-d*.296,w*.15,.58,.08,3);
  }
  // Refined fins at the left-right architectural transition.
  box(-w*.143,h*.635,d*.256,.17,h*.62,.14,4);
  box(w*.238,h*.52,d*.256,.16,h*.60,.14,2);
 }
}
