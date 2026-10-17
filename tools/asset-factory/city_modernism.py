"""
Curated, deterministic Blender counterparts for 10 Marketing City modernist families.
Coordinates use Marketing Tycoon's Y-up, forward +Z; blender_factory.py converts
to Blender Z-up. A shared modular grammar produces distinct massing, not recolors.
"""
def city_anchors(a):
 w,d,h=a["width"],a["depth"],a["height"]
 anchors={"ANCHOR_Entrance":(0,1.1,d*.43),"ANCHOR_Sign":(0,3.08,d*.462),
          "ANCHOR_Roof":(0,h+.45,0),"COLLIDER_Footprint":(0,.2,0)}
 slots=a.get("advertisingSlots",[])
 if any(":dooh:" in s for s in slots):anchors["ANCHOR_DOOH_Facade"]=(0,h*.63,d*.447)
 if any(":ooh:" in s for s in slots):anchors["ANCHOR_OOH_Parapet"]=(0,h+.42,d*.30)
 if any(":iooh:" in s for s in slots):anchors["ANCHOR_Activation"]=(-w*.33,.8,d*.46)
 return anchors
def build_city(add,a,lod):
 w,d,h=a["width"],a["depth"],a["height"]
 v=a.get("variant",0);style=a.get("massingStyle",0)
 thin=max(.08,w*.012)
 count=0
 def b(x,y,z,sx,sy,sz,material,name):
  nonlocal count
  count+=1
  add("%03d_%s"%(count,name),(x,y,z),(max(.06,sx),max(.06,sy),max(.06,sz)),material)
 def m(x,base,z,sx,sy,sz,mat,name):
  b(x,base+sy*.5,z,sx,sy,sz,mat,name)
 b(0,.14,0,w*.96,.28,d*.96,5,"plinth")
 archetype=a["archetype"]
 glass_z=d*.38
 if archetype=="stacked":
  m(-w*.12,0,-d*.03,w*.71,h*.51,d*.76,0,"production_studio")
  m(w*(.07+style*.018),h*.51,-d*.105,w*.59,h*.49,d*.60,1,"offset_upper_story")
  m(-w*.34,0,d*.16,w*.20,h*.29,d*.42,4,"entrance_volume")
  b(w*.08,h*.52,-d*.09,w*.62,.30,d*.67,2,"concrete_cantilever")
  b(w*.09,h+.20,-d*.10,w*.61,.39,d*.62,2,"roof")
  glass_z=d*.206
 elif archetype=="tower":
  m(0,0,d*.045,w*.86,min(h*.29,4.2),d*.80,5,"podium")
  m(w*.07,min(h*.26,3.7),-d*.095,w*(.47+style*.02),h-min(h*.26,3.7),d*.62,0,"tower")
  for side in [-1,1]:b(side*w*.26,h*.58,d*.22,thin*1.6,h*.67,d*.18,2,"vertical_fin")
  b(w*.07,h+.24,-d*.095,w*.55,.46,d*.67,6,"roof_cap")
  glass_z=d*.21
 elif archetype=="pavilion":
  m(0,0,0,w*.90,h*.58,d*.79,0,"retail_pavilion")
  m(w*.27,h*.56,-d*.16,w*.27,h*.26,d*.42,1,"upper_service")
  b(0,h*.62,d*.09,w*.97,.37,d*.87,2,"horizontal_overhang")
  b(0,h*.42,d*.41,w*.80,h*.21,.20,3,"storefront")
  for side in [-1,1]:b(side*w*.31,h*.32,d*.43,w*.13,h*.60,.16,6,"columns")
  glass_z=d*.418
 elif archetype=="courtyard":
  m(-w*.31,0,-d*.13,w*.33,h*.82,d*.66,0,"west_wing")
  m(w*.31,0,-d*.13,w*.33,h*.96,d*.66,1,"east_wing")
  m(0,0,-d*.32,w*.55,h*.64,d*.28,0,"rear_wing")
  b(0,h*.42,-d*.08,w*.73,.20,d*.45,2,"bridge")
  b(0,1.90,d*.10,w*.64,.31,d*.22,5,"entry_lintel")
  b(-w*.31,h*.84,-d*.13,w*.36,.42,d*.72,2,"west_roof")
  b(w*.31,h*.98,-d*.13,w*.36,.42,d*.72,4,"east_roof")
  glass_z=d*.205
 elif archetype=="terraced":
  base=.49+v*.012
  m(-w*.08,0,d*.012,w*.81,h*base,d*.77,0,"base")
  m(w*.08,h*base,-d*.12,w*.63,h*.29,d*.60,1,"middle_terrace")
  m(-w*.01,h*(base+.29),-d*.22,w*.44,h*(1-base-.29),d*.39,0,"roof_office")
  for k in range(3):b(-w*.07,h*(.5+k*.14),d*(.29-k*.10),w*(.68-k*.1),.17,d*.12,4,"balcony")
  b(-w*.01,h+.16,-d*.22,w*.49,.32,d*.44,2,"roof")
  glass_z=d*.40
 elif archetype=="sculptural":
  m(-w*.235,0,-d*.10,w*.42,h*.76,d*.70,0,"left_figure")
  m(w*.235,0,d*.08,w*.43,h*.58,d*.53,1,"right_figure")
  m(w*.045,h*.58,-d*.08,w*.49,h*.42,d*.59,2,"sculptural_bridge")
  b(0,h*.61,d*.02,w*.83,.29,d*.24,4,"structural_lintel")
  b(w*.04,h+.18,-d*.08,w*.51,.32,d*.62,6,"roof")
  glass_z=d*.315
 elif archetype=="grid":
  m(0,0,-d*.07,w*.77,h*.95,d*.76,0,"office_grid")
  for col in range(4):b((col-1.5)*w*.24,h*.51,d*.335,thin*1.5,h*.89,.15,6,"mullion")
  b(0,h*.55,d*.34,w*.80,.17,.17,2,"floor_band")
  b(0,h*.76,d*.34,w*.80,.15,.17,2,"top_band")
  b(0,h+.1,-d*.07,w*.84,.33,d*.80,2,"roof")
  glass_z=d*.335
 elif archetype=="industrial":
  m(0,0,d*.018,w*.88,h*.63,d*.81,0,"warehouse_hall")
  m(-w*.27,0,-d*.15,w*.30,h*.85,d*.48,6,"service_tower")
  for k in range(3):b((k-1)*w*.255,h*.63+.32,-d*.06,w*.245,.64,d*.64,2 if k%2 else 4,"roof_tooth")
  b(0,h*.45,d*.432,w*.74,h*.26,.12,3,"industrial_glazing")
  b(0,h*.19,d*.44,w*.42,h*.24,.15,6,"loading_door")
  glass_z=d*.43
 elif archetype=="podium":
  m(0,0,d*.045,w*.86,min(h*.29,4.2),d*.80,5,"commercial_podium")
  m(-w*.13,h*.27,-d*.14,w*.53,h*.73,d*.57,1,"podium_tower")
  m(w*.30,h*.27,-d*.09,w*.20,h*.39,d*.38,0,"side_core")
  b(w*.16,h*.28,d*.10,w*.61,.32,d*.55,4,"podium_cap")
  b(-w*.13,h+.22,-d*.14,w*.57,.38,d*.64,2,"roof")
  glass_z=d*.20
 elif archetype=="campus":
  m(-w*.295,0,-d*.13,w*.33,h*.77,d*.66,0,"west_pavilion")
  m(w*.296,0,-d*.15,w*.32,h*.98,d*.62,1,"east_pavilion")
  m(0,0,d*.18,w*.33,h*.43,d*.42,5,"campus_entry")
  b(0,h*.45,-d*.07,w*.72,.25,d*.47,2,"covered_bridge")
  b(0,h*.58,-d*.20,w*.23,h*.13,d*.28,3,"glass_bridge")
  b(-w*.295,h*.77,-d*.13,w*.36,.33,d*.71,4,"west_roof")
  b(w*.296,h+.14,-d*.15,w*.35,.36,d*.68,2,"east_roof")
  glass_z=d*.25
 else:raise RuntimeError("Unapproved architectural archetype "+archetype)
 zentry=d*.418 if archetype in ("pavilion","industrial") else d*.34
 m(0,0,zentry,w*.22,2.45,d*.16,3,"main_entrance")
 b(0,2.57,zentry+.09,w*.32,.22,.28,2,"entrance_canopy")
 if lod==0:
  rows=min(5,max(2,int(h//3.8)));cols=2 if a["facade"] in ("vertical","ribbon") else 3
  for row in range(rows):
   y=3.2+(h-4.4)*(row+.45)/rows
   for col in range(cols):
    x=(col-(cols-1)/2)*w*(.25 if a["facade"]=="vertical" else .205)
    if archetype=="courtyard" and abs(x)<w*.16:continue
    wd=w*(.27 if a["facade"]=="ribbon" else .115 if a["facade"]=="vertical" else .15)
    wh=1.3 if a["facade"]=="vertical" else .58 if a["facade"]=="balcony" else .86
    b(x,y,glass_z,wd+.19,wh+.20,.16,2,"window_reveal")
    b(x,y,glass_z+.08,wd,wh,.095,3,"glass_window")
    if a["facade"] in ("balcony","graphic","zigzag"):
     sign=-1 if a["facade"]=="zigzag" and (row+col)%2 else 1
     b(x+sign*wd*.30,y-wh*.54,glass_z+.17,wd*.67,.11,.26,4,"screening_balcony")
   if a["facade"] in ("grid","modular","strips"):b(0,y+.65,glass_z+.06,w*.64,.09,.12,1,"floor_belt")
  if a["roof"] in ("pergola","green"):
   b(0,h+.58,-d*.15,w*.55,.12,d*.40,4,"pergola")
   for k in range(3):b((k-1)*w*.22,h+.38,-d*.15,thin*1.8,.68,d*.38,6,"roof_fin")
  elif a["roof"] in ("spire","crown"):
   m(0,h+.12,-d*.15,w*.35,.6,d*.38,6,"crown")
   b(0,h+.50,-d*.15,w*.19,.18,d*.24,4,"spire")
  elif a["roof"]=="sawtooth":
   for k in range(3):b((k-1)*w*.255,h*.65+.78,-d*.08,w*.18,.30,d*.58,3,"roof_rhythm")
  elif a["roof"] in ("terrace","offset"):b(w*.12,h+.36,-d*.17,w*.38,.28,d*.42,4,"terrace_feature")
  if a["entrance"] in ("atrium","gallery"):b(0,1.68,zentry+.18,w*.27,2.20,.12,3,"atrium")
  if a["entrance"]=="bridge":b(0,3.0,zentry-.20,w*.58,.18,d*.26,2,"entry_bridge")
  if a["function"]!="decorative":
   for side in [-1,1]:b(side*w*.37,.5,d*.39,w*.10,.75,d*.12,5,"planter")
 slots=a.get("advertisingSlots",[])
 if any(":dooh:" in sid for sid in slots):
  b(0,h*.63,d*.407,w*.47,1.58,d*.126,6,"dooh_housing")
  b(0,h*.63,d*.467,w*.441,1.43,.05,3,"dooh_surface")
 if any(":ooh:" in sid for sid in slots):
  b(0,h+.42,d*.265,w*.415,.99,d*.148,6,"roof_billboard_frame")
  b(0,h+.42,d*.343,w*.391,.83,.07,4,"roof_billboard_screen")
 return count
