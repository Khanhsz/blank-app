"""
Canonical Brickhouse Studios modernist archetype in native Blender coordinates.
The 'add' callback accepts game-world X/Y/Z (Y-up) and converts to Blender axes.
This is matched to brickhouse-modernism.mjs; keep both silhouettes aligned.
"""
def brickhouse_anchors(a):
 w,d,h=a["width"],a["depth"],a["height"]
 return {
  "ANCHOR_Entrance":(w*.06,1.35,d*.435),
  "ANCHOR_Sign":(w*.06,3.72,d*.454),
  "ANCHOR_Roof":(w*.05,h+.36,-d*.11),
  "ANCHOR_DOOH_Facade":(w*.052,h*.706,d*.273),
  "ANCHOR_OOH_Parapet":(w*.05,h+.42,d*.266),
  "ANCHOR_Activation":(-w*.33,.8,d*.47),
  "COLLIDER_Footprint":(0,.2,0),
 }

def build_brickhouse(add,a,lod):
 w,d,h=a["width"],a["depth"],a["height"]
 i=0
 def b(x,y,z,sx,sy,sz,mat,name):
  nonlocal i
  i+=1
  add("%03d_%s"%(i,name),(x,y,z),(sx,sy,sz),mat)
 b(0,.14,0,w,.28,d,5,"plinth")
 b(-w*.298,h*.305,-d*.065,w*.39,h*.61,d*.77,0,"production_wing")
 b(w*.05,h*.5,-d*.10,w*.55,h,d*.71,1,"central_tower")
 b(w*.338,h*.382,d*.015,w*.29,h*.765,d*.62,0,"right_studio")
 b(w*.05,h+.24,-d*.10,w*.575,.48,d*.737,2,"office_parapet")
 b(-w*.298,h*.61+.20,-d*.065,w*.414,.40,d*.792,4,"studio_roof")
 b(w*.338,h*.765+.19,d*.015,w*.312,.38,d*.654,2,"right_roof")
 b(w*.057,.95,d*.402,w*.40,1.7,.15,6,"recessed_door")
 b(w*.057,2.17,d*.408,w*.43,.34,.28,3,"entrance_transom")
 b(w*.057,3.14,d*.445,w*.49,.22,.76,2,"entrance_canopy")
 b(-w*.105,1.72,d*.439,.23,2.7,.34,4,"entrance_left_fin")
 b(w*.232,1.72,d*.439,.23,2.7,.34,4,"entrance_right_fin")
 b(-w*.295,1.84,d*.329,w*.32,3.24,.11,3,"studio_gallery")
 b(-w*.295,3.48,d*.348,w*.345,.23,.19,2,"gallery_lintel")
 b(-w*.295,1.84,d*.352,.11,2.95,.13,6,"gallery_mullion")
 for level in range(3):
  y=4.64+level*2.29
  for col in range(3):
   x=(-.143+col*.175)*w
   b(x,y,d*.256,w*.123,1.11,.12,6,"window_bay")
   b(x,y,d*.267,w*.104,.92,.085,3,"glazing")
  b(w*.05,y-1.04,d*.267,w*.50,.13,.18,2,"floor_slab")
 for col in range(2):
  x=(.258+col*.136)*w
  b(x,h*.48,d*.327,w*.093,h*.37,.105,3,"wing_window")
  b(x+w*.057,h*.48,d*.334,.095,h*.50,.16,1,"wing_fin")
 b(w*.052,h*.706,d*.270,w*.47,h*.17,.14,6,"dooh_integrated_frame")
 b(w*.052,h*.706,d*.281,w*.44,h*.145,.09,2,"dooh_mount")
 b(w*.052,h*.706,d*.290,w*.425,h*.132,.025,3,"dooh_glass")
 b(w*.05,h+.42,d*.256,w*.44,.97,.20,6,"roof_ooh_housing")
 b(w*.05,h+.42,d*.271,w*.414,.82,.08,4,"roof_ooh_surface")
 b(w*.05,3.72,d*.454,w*.45,.53,.10,2,"fixed_studio_sign")
 b(-w*.045,h+.55,-d*.295,w*.13,.63,d*.19,6,"rooftop_utility")
 b(w*.212,h+.52,-d*.27,w*.16,.55,d*.17,0,"rooftop_courtyard")
 b(-w*.452,.55,d*.33,w*.07,1.10,d*.23,4,"planter")
 b(-w*.452,1.07,d*.33,w*.16,.16,d*.27,5,"planter_cap")
 if lod==0:
  b(w*.057,1.60,d*.459,.12,2.18,.13,2,"door_mullion")
  b(-w*.295,1.84,d*.344,w*.29,.12,.14,1,"gallery_divider")
  b(w*.05,h+.27,-d*.449,w*.54,.30,.20,1,"rear_roof_detail")
  b(w*.318,h*.765+.19,d*.015,w*.22,.20,d*.64,4,"right_roof_detail")
  for f in range(2):
   y=2.55+f*2.3
   b(-w*.298,y,d*.331,w*.30,.12,.17,1,"studio_floor_belt")
  for f in range(3):
   y=4.25+f*2.16
   b(w*.327,y,-d*.296,w*.15,.58,.08,3,"right_glazing")
  b(-w*.143,h*.635,d*.256,.17,h*.62,.14,4,"tower_transition_fin")
  b(w*.238,h*.52,d*.256,.16,h*.60,.14,2,"right_transition_fin")
