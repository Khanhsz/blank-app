"""
Marketing Tycoon Blender 4.x Procedural Asset Factory
Run:
  blender -b --python tools/asset-factory/blender_factory.py -- --spec assets/specs/arts-quarter.slice.json --count 10
Blender's native editable .blend files and glTF exports are authoritative when produced.
This file is NOT run by the Node/Render fallback build.
"""
import bpy
import json
import argparse
import os
import random
import sys
from brickhouse_modernism import build_brickhouse,brickhouse_anchors
from pathlib import Path
from math import radians

PALETTES={
 "clay":["#b88b7e","#dbc3af","#615c65","#9db4b7","#bd674f","#d4c5b4","#354d52"],
 "rose":["#bf9caa","#e9d7d4","#665e70","#afc7c9","#bf7d82","#dbbfc0","#455963"],
 "mauve":["#9c90ab","#d2c7d6","#585871","#a7c4d3","#ab8b9e","#e1d5d7","#42505e"],
 "sand":["#c4b29c","#ebe0ca","#6a6a6b","#acc5c4","#b99677","#ddd5c5","#44565b"],
 "sage":["#98aa9a","#d3ddc9","#5b6868","#a7c0b8","#779486","#d2d2bb","#344d4d"],
 "slate":["#869ba6","#c6d3d4","#4b6372","#b0cdd1","#688ca0","#d7ddda","#385563"]
}
ANCHORS=("ANCHOR_Entrance","ANCHOR_Sign","ANCHOR_Roof","COLLIDER_Footprint")
def srgb_to_linear(value):
 value=value/255.
 return value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4
def material(name,color):
 mat=bpy.data.materials.new(name)
 rgba=tuple(srgb_to_linear(int(color[i:i+2],16)) for i in (1,3,5))+(1.,)
 mat.diffuse_color=rgba
 mat.use_nodes=True
 node=mat.node_tree.nodes.get("Principled BSDF")
 node.inputs["Base Color"].default_value=rgba
 node.inputs["Roughness"].default_value=.87
 node.inputs["Metallic"].default_value=.07
 return mat

def box(name,pos,size,mat):
 """Game axes X,Y,Z -> Blender axes X,-Z,Y (blender Z is up)."""
 bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0],-pos[2],pos[1]))
 o=bpy.context.object;o.name=name
 o.dimensions=(size[0],size[2],size[1])
 bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
 o.data.materials.append(mat)
 return o

def empty(name,position,collection,extras=None):
 o=bpy.data.objects.new(name,None)
 o.empty_display_type="PLAIN_AXES"
 o.location=(position[0],-position[2],position[1])
 collection.objects.link(o)
 if extras:
  for k,v in extras.items():o[k]=v
 return o

def build_master(spec,lod,output,save_blend):
 bpy.ops.object.select_all(action="SELECT")
 bpy.ops.object.delete(use_global=False)
 for mat in list(bpy.data.materials):bpy.data.materials.remove(mat)
 palette=[material(spec["palette"]+"_"+str(i),v) for i,v in enumerate(PALETTES[spec["palette"]])]
 rng=random.Random(spec["seed"])
 w,d,h=spec["width"],spec["depth"],spec["height"]
 objects=[]
 def add(name,p,size,m):
  ob=box(spec["id"]+"_"+name,p,size,palette[m])
  ob["mt_asset_id"]=spec["id"];ob["mt_lod"]=lod
  objects.append(ob);return ob
 if spec["id"]=="office-brick":
  build_brickhouse(add,spec,lod)
 else:
  add("groundbase",(0,.14,0),(w+.5,.28,d+.5),5)
  add("main_body",(0,.28+h/2,0),(w,h,d),0)
  add("roof_cap",(0,h+.42,0),(w+.5,.42,d+.5),2)
  if spec["roof"] in ("crown","sawtooth"):add("upper_crown",(0,h+1.04,0),(w*.58,.84,d*.65),1)
  if spec["roof"]=="terrace":add("terrace",(0,h+.77,-d*.18),(w*.65,.3,d*.38),1)
  if spec["roof"]=="gable":
   add("gable_low",(0,h+.85,0),(w*.83,.8,d*.85),2)
   add("gable_high",(0,h+1.36,0),(w*.42,.4,d*.82),2)
  if spec["roof"]=="canopy":add("canopy",(0,h+.66,d*.2),(w+1,.22,d+1),4)
  add("front_glazing",(0,1.26,d/2+.095),(w*.54,1.9,.14),3)
  add("door_frame",(0,1.22,d/2+.21),(w*.13,2.13,.14),6)
  add("transom",(0,2.38,d/2+.22),(w*.63,.21,.28),1)
  add("sign_panel",(0,3.1,d/2+.21),(w*.72,.6,.21),4)
  if lod==0:
   floors=min(spec["floors"]-1,10);cols=2 if w<7 else 3
   for level in range(floors):
    y=min(h-1.05,3.7+level*(h-4.1)/max(1,floors))
    for col in range(cols):
     x=(col-(cols-1)/2)*(w*.23)
     width=min(1.55,w*.17)
     add("window_%s_%s"%(level,col),(x,y,d/2+.083),(width,.86,.1),3)
     add("sill_%s_%s"%(level,col),(x,y+.49,d/2+.14),(width+.14,.11,.16),1)
     if rng.random()>.65:add("ledge_%s_%s"%(level,col),(x,y-.55,d/2+.16),(width+.2,.12,.22),4)
    if level%2==0:
     for col in (0,1):
      z=(col-.5)*d*.36
      add("side_glass_%s_%s"%(level,col),(w/2+.082,y,z),(.1,.78,min(1.4,d*.17)),3)

   # Keep Blender-authored masters visually aligned with the generated web slice.
   category=spec["class"]
   if category=="creative_agency":
    add("creative_art_fin",(-w*.32,h*.49,d/2+.20),(w*.22,h*.68,.42),4)
    add("creative_reveal_fin",(w*.32,h*.36,d/2+.27),(w*.16,h*.46,.53),6)
    add("roof_frame",(0,h+.98,0),(w*.82,.25,d*.72),4)
    for k in range(3):add("studio_pod_"+str(k),((k-1)*w*.22,h+1.57,0),(w*.17,1.05,d*.47),1)
   elif category=="media_facility":
    add("video_wall_frame",(0,h*.63,d/2+.28),(w*.83,h*.35,.46),6)
    add("video_wall_screen",(0,h*.63,d/2+.54),(w*.75,h*.30,.09),3)
    for x in (-1,1):add("screen_pillar_"+str(x),(x*w*.43,h*.58,d/2+.52),(.22,h*.45,.38),4)
    add("rooftop_media_display",(0,h+1.74,0),(w*.74,1.10,d*.54),4)
   elif category=="rival_agency":
    add("agency_second_tower",(-w*.23,h*.78,-d*.18),(w*.46,h*.44,d*.52),2)
    add("agency_vertical_fin",(w*.32,h*.64,d/2+.22),(w*.19,h*.65,.35),4)
    add("agency_roof_crown",(0,h+1.85,0),(w*.78,1.65,d*.44),6)
    add("agency_facade_logo",(0,h*.60,d/2+.27),(w*.80,1.3,.38),4)
   elif category=="corporate_client":
    for x in (-1,1):add("corporate_atrium_"+str(x),(x*w*.28,h*.47,d/2+.43),(w*.26,h*.76,.56),1)
    add("corporate_billboard_frame",(0,h*.76,d/2+.24),(w*.72,h*.16,.40),6)
    add("corporate_billboard_screen",(0,h*.76,d/2+.48),(w*.62,h*.12,.12),4)
    add("corporate_glass_crown",(0,h+1.87,0),(w*.77,1.55,d*.57),3)
   elif category=="office_property":
    add("office_leasing_portico",(0,h*.29,d/2+.27),(w*.83,2.7,.55),1)
    for x in (-1,1):add("office_facade_fin_"+str(x),(x*w*.42,h*.54,d/2+.27),(.25,h*.69,.56),4)
    add("office_terrace",(0,h+1.09,0),(w*.68,.55,d*.54),4)
   elif category=="residential":
    for x,material_id in ((-1,1),(1,5)):add("residential_wing_"+str(x),(x*w*.28,h*.56,d/2+.24),(w*.3,h*.66,.37),material_id)
    add("residential_roof_pod",(0,h+1.31,-d*.22),(w*.35,.65,d*.25),4)
   elif category=="retail_property":
    add("storefront",(0,h*.38,d/2+.66),(w*.85,2.4,1.0),3)
    add("retail_signage",(0,h*.38,d/2+1.23),(w*.75,.3,.2),4)
   elif category=="urban_infrastructure":
    add("kiosk_display",(0,h*.55,d/2+.35),(w*.70,h*.48,.42),3)
    add("kiosk_top",(0,h+1.11,0),(w+1,.36,d+.9),4)
   add("rooftop_service",(-w*.23,h+.76,-d*.24),(w*.15,.45,d*.18),6)
   if spec["class"] in ("rival_agency","corporate_client"):
    for side in (-1,1):add("corporate_fin_"+str(side),(side*w*.4,h*.62,d/2+.18),(.16,h*.48,.25),1)
   if spec["class"] in ("retail_property","urban_infrastructure"):
    add("awning",(0,2.35,d/2+.8),(w*.8,.19,1.6),4)
  else:
   # Low LOD keeps the category silhouette visible in the elevated city view.
   c=spec["class"]
   if c=="creative_agency":
    add("creative_art_fin_lod1",(-w*.32,h*.52,d/2+.19),(w*.24,h*.72,.35),4)
    add("creative_roof_lod1",(0,h+1.20,0),(w*.75,1.0,d*.54),4)
   elif c=="media_facility":
    add("media_video_wall_lod1",(0,h*.64,d/2+.27),(w*.83,h*.34,.37),6)
    add("media_roof_lod1",(0,h+1.40,0),(w*.70,1.1,d*.5),4)
   elif c=="rival_agency":
    add("rival_wing_lod1",(-w*.24,h*.75,-d*.12),(w*.44,h*.43,d*.5),2)
    add("rival_crown_lod1",(0,h+1.53,0),(w*.77,1.5,d*.5),6)
   elif c=="corporate_client":
    add("client_ad_wall_lod1",(0,h*.67,d/2+.34),(w*.76,h*.24,.35),4)
    add("client_glass_crown_lod1",(0,h+1.60,0),(w*.76,1.45,d*.52),3)
   elif c=="office_property":
    add("office_portico_lod1",(0,h*.30,d/2+.25),(w*.85,2.6,.42),1)
    add("office_deck_lod1",(0,h+1.02,0),(w*.68,.56,d*.55),4)
   elif c=="residential":
    add("residence_balcony_lod1",(0,h*.58,d/2+.22),(w*.75,h*.60,.35),1)
   elif c=="retail_property":
    add("retail_window_lod1",(0,h*.36,d/2+.46),(w*.83,2.2,.55),3)
   elif c=="urban_infrastructure":
    add("kiosk_roof_lod1",(0,h+.92,0),(w+1,.38,d+.8),4)
 # Preserve independent empty interaction anchors with stable names.
 col=bpy.context.scene.collection
 if spec["id"]=="office-brick":
  for name,position in brickhouse_anchors(spec).items():
   empty(name,position,col,{"game_id":spec.get("gameplayId","")} if name=="ANCHOR_Entrance" else ({"width":w,"depth":d,"height":h} if name=="COLLIDER_Footprint" else None))
 else:
  empty("ANCHOR_Entrance",(0,1.1,d/2+.4),col,{"game_id":spec.get("gameplayId","")})
  empty("ANCHOR_Sign",(0,3.1,d/2+.34),col)
  empty("ANCHOR_Roof",(0,h+1.55,0),col)
  empty("COLLIDER_Footprint",(0,.2,0),col,{"width":w,"depth":d,"height":h})
 bpy.context.scene["asset_id"]=spec["id"]
 bpy.context.scene["persistent_game_entity"]=spec.get("gameplayId","")
 bpy.context.scene["source_spec_version"]=1
 if spec["id"]=="office-brick":bpy.context.scene["architecture"]="brickhouse-modernist-v1"
 # glTF exporter uses Blender Z-up -> glTF Y-up, orientation correct for +Z entrance.
 bpy.ops.object.select_all(action="DESELECT")
 for ob in objects:ob.select_set(True)
 for name in (tuple(brickhouse_anchors(spec).keys()) if spec["id"]=="office-brick" else ANCHORS):bpy.data.objects[name].select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if save_blend:
  bpy.ops.wm.save_as_mainfile(filepath=str(save_blend),compress=True)
 bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",use_selection=True,export_yup=True,
  export_apply=True,export_materials="EXPORT",export_cameras=False,export_lights=False)
 return len(objects)

def run():
 argv=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
 cli=argparse.ArgumentParser()
 cli.add_argument("--spec",default="assets/specs/arts-quarter.slice.json")
 cli.add_argument("--out",default=None)
 cli.add_argument("--masters",default="assets/source/arts-quarter")
 cli.add_argument("--count",type=int,default=10)
 cli.add_argument("--preview-only",action="store_true")
 args=cli.parse_args(argv)
 repo=Path.cwd()
 p=repo/args.spec
 data=json.loads(p.read_text(encoding="utf8"))
 count=min(args.count,len(data["masters"]))
 out=Path(args.out) if args.out else repo/"public"/"assets"/"mt-city"/data["version"]
 master_dir=repo/args.masters
 out.mkdir(parents=True,exist_ok=True);master_dir.mkdir(parents=True,exist_ok=True)
 written=[]
 for spec in data["masters"][:count]:
  base=master_dir/(spec["id"]+".blend")
  hi=out/(spec["id"]+".lod0.glb")
  lo=out/(spec["id"]+".lod1.glb")
  mesh_count=build_master(spec,0,hi,base)
  if not args.preview_only:build_master(spec,1,lo,None)
  for file in (base,hi,lo):
   if not args.preview_only or file!=lo:
    if not file.exists() or file.stat().st_size<100:raise RuntimeError("Output not created: "+str(file))
  written.append({"id":spec["id"],"meshObjects":mesh_count,"blend":str(base),"lod0":str(hi),"lod1":str(lo)})
  print("MASTER VERIFIED",spec["id"],mesh_count,flush=True)
 (out/"blender-export-report.json").write_text(json.dumps({"generatedBy":"blender-bpy","assets":written},indent=2),encoding="utf8")
 print("FINISHED",len(written),"editables and GLB masters",flush=True)
if __name__=="__main__":run()
