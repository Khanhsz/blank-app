"""
Marketing Tycoon Blender 4.x Procedural Asset Factory
Run:
  blender -b --python tools/asset-factory/blender_factory.py -- --spec assets/specs/city-all.modernism.json --count 41
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
from city_modernism import build_city,city_anchors
from pathlib import Path
from math import radians

PBR_SPEC=json.loads((Path(__file__).resolve().parents[2]/"assets/specs/pbr-materials.json").read_text(encoding="utf-8"))
PALETTES=PBR_SPEC["palettes"]
ROLES=PBR_SPEC["roles"]
def srgb_to_linear(value):
 value=value/255.
 return value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4
def material(name,color,role):
 """Canonical role attributes match the Node glTF writer."""
 mat=bpy.data.materials.new(name)
 rgba=tuple(srgb_to_linear(int(color[i:i+2],16)) for i in (1,3,5))+(1.,)
 mat.diffuse_color=rgba
 mat.use_nodes=True
 node=mat.node_tree.nodes.get("Principled BSDF")
 node.inputs["Base Color"].default_value=rgba
 node.inputs["Roughness"].default_value=role["roughness"]
 node.inputs["Metallic"].default_value=role["metallic"]
 mat["mt_pbr_role"]=role["name"]
 mat["mt_material_version"]=PBR_SPEC["version"]
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
 colors=list(PALETTES[spec["palette"]])
 if spec["class"]=="client" or spec.get("function") in ("corporate","client"):
  colors[0]=colors[9]
  colors[7]="#496e81"
 elif spec["class"]=="rival":colors[7]="#3f687c"
 elif spec.get("decorative"):colors[7]=colors[3]
 palette=[material("MT_"+ROLES[i]["name"]+"_"+spec["palette"],v,ROLES[i]) for i,v in enumerate(colors)]
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
  build_city(add,spec,lod)
 # Preserve independent empty interaction anchors with stable names.
 col=bpy.context.scene.collection
 if spec["id"]=="office-brick":
  for name,position in brickhouse_anchors(spec).items():
   empty(name,position,col,{"game_id":spec.get("gameplayId","")} if name=="ANCHOR_Entrance" else ({"width":w,"depth":d,"height":h} if name=="COLLIDER_Footprint" else None))
 else:
  for name,position in city_anchors(spec).items():
   empty(name,position,col,{"game_id":spec.get("gameplayId","")} if name=="ANCHOR_Entrance" else ({"width":w,"depth":d,"height":h} if name=="COLLIDER_Footprint" else None))
 bpy.context.scene["asset_id"]=spec["id"]
 bpy.context.scene["persistent_game_entity"]=spec.get("gameplayId","")
 bpy.context.scene["source_spec_version"]=1
 bpy.context.scene["architecture"]=("brickhouse-modernist-v1" if spec["id"]=="office-brick" else spec["archetype"])
 bpy.context.scene["advertising_slots"]="|".join(spec.get("advertisingSlots",[]))
 # glTF exporter uses Blender Z-up -> glTF Y-up, orientation correct for +Z entrance.
 bpy.ops.object.select_all(action="DESELECT")
 for ob in objects:ob.select_set(True)
 for name in (tuple(brickhouse_anchors(spec).keys()) if spec["id"]=="office-brick" else tuple(city_anchors(spec).keys())):bpy.data.objects[name].select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if save_blend:
  bpy.ops.wm.save_as_mainfile(filepath=str(save_blend),compress=True)
 bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",use_selection=True,export_yup=True,
  export_apply=True,export_materials="EXPORT",export_cameras=False,export_lights=False)
 return len(objects)

def run():
 argv=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
 cli=argparse.ArgumentParser()
 cli.add_argument("--spec",default="assets/specs/city-all.modernism.json")
 cli.add_argument("--out",default=None)
 cli.add_argument("--masters",default="assets/source/marketing-city")
 cli.add_argument("--count",type=int,default=41)
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
  stages=[]
  if spec["class"]=="rival" and not args.preview_only:
   for tier in range(2,5):
    stage={**spec,"tier":tier}
    native=master_dir/(spec["id"]+".tier"+str(tier)+".blend")
    front=out/(spec["id"]+".tier"+str(tier)+".lod0.glb")
    distant=out/(spec["id"]+".tier"+str(tier)+".lod1.glb")
    build_master(stage,0,front,native)
    build_master(stage,1,distant,None)
    for file in (native,front,distant):
     if not file.exists() or file.stat().st_size<100:raise RuntimeError("Missing upgraded agency stage "+str(file))
    stages.append({"tier":tier,"blend":str(native),"lod0":str(front),"lod1":str(distant)})
  written.append({"id":spec["id"],"meshObjects":mesh_count,"blend":str(base),"lod0":str(hi),"lod1":str(lo),"stages":stages})
  print("MASTER VERIFIED",spec["id"],mesh_count,flush=True)
 (out/"blender-export-report.json").write_text(json.dumps({"generatedBy":"blender-bpy","assets":written},indent=2),encoding="utf8")
 print("FINISHED",len(written),"editables and GLB masters",flush=True)
if __name__=="__main__":run()
