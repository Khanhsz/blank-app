#!/usr/bin/env python3
"""Streaming regional OSM PBF -> PostGIS import for TripMate.

Requires: pip install -r scripts/global_places_requirements.txt
Initialize DB with db/global_places.sql. Database URL comes only from environment.
Run on a worker/machine with enough disk and RAM for the regional PBF.
Example: python scripts/import_global_pbf.py --file vietnam-latest.osm.pbf --country VN --region vietnam

Uses PBF feature IDs and actual node/way geometry; never creates fake POIs.
"""
import argparse
import os
import re
import sys
import uuid
from pathlib import Path

import osmium
import psycopg

FIELDS = ("country_code","osm_type","osm_id","source_region","import_version","name",
          "category","subcategory","cuisine","address","opening_hours","website",
          "local_food","street_food","tags","lat","lon")

FOOD = {"restaurant","fast_food","food_court","cafe","ice_cream"}
TOURISM = {"attraction","museum","gallery","viewpoint","hotel","hostel","guest_house",
           "motel","information","theme_park","zoo","aquarium","artwork"}
LEISURE = {"park","garden","nature_reserve","playground","sports_centre","stadium"}
CULTURE = {"library","theatre","cinema","arts_centre","place_of_worship"}
SERVICES = {"pharmacy","hospital","clinic","post_office","bank","atm","toilets"}
TRANSIT = {"bus_station","ferry_terminal","parking","bicycle_parking","charging_station"}
SHOPS = {"bakery","pastry","deli","supermarket","convenience","department_store",
         "mall","books","clothes","souvenir","gift"}
NATURAL = {"beach","peak","waterfall","spring","cave_entrance"}
HISTORIC = {"monument","memorial","castle","fort","archaeological_site","ruins"}
EXCLUDED = re.compile(r"\b(?:pub|bar|wine|beer|brewery|cocktail|nightclub|liquor|spirits)\b",re.I)
LOCAL = re.compile(r"\b(?:pho|bun|banh|com|hu tieu|mi quang|bo kho|xoi|oc|chao)\b",re.I)

def get_category(t):
    a=t.get("amenity","")
    tourism=t.get("tourism","")
    shop=t.get("shop","")
    if a in FOOD:return ("food" if a in {"restaurant","fast_food","food_court"} else "drinks",a)
    if shop in {"bakery","pastry","deli"}:return ("food",shop)
    if tourism in TOURISM:return ("tourism",tourism)
    if a in CULTURE:return ("culture",a)
    if t.get("historic") in HISTORIC:return ("historic",t["historic"])
    if t.get("leisure") in LEISURE:return ("leisure",t["leisure"])
    if t.get("natural") in NATURAL:return ("nature",t["natural"])
    if a in TRANSIT:return ("transport",a)
    if t.get("railway") in {"station","halt","tram_stop"}:return ("transport",t["railway"])
    if a in SERVICES:return ("service",a)
    if shop in SHOPS:return ("shopping",shop)
    return None

def clean(s,n=240):
    return " ".join(str(s or "").split())[:n]

def parse(osm_type, osm_id, pos, tags, country, region, batch):
    name=clean(tags.get("name") or tags.get("name:en") or tags.get("name:vi"),250)
    if not name or EXCLUDED.search(name):return None
    category=get_category(tags)
    if not category:return None
    lat,lon=pos
    if not(-90<=lat<=90 and -180<=lon<=180):return None
    cuisine=clean(tags.get("cuisine"),110)
    local=bool(re.search(r"vietnamese|thai|khmer|korean|peranakan|local",cuisine,re.I) or
                (country=="VN" and LOCAL.search(name)))
    street=bool(tags.get("street_vendor")=="yes" or
                "street_food" in cuisine.lower() or (tags.get("amenity")=="fast_food" and local))
    website=clean(tags.get("website") or tags.get("contact:website"),250)
    if website and not website.startswith("https://"):website=None
    address=clean(", ".join(filter(None,[
        clean(tags.get("addr:housenumber"),20)+" "+clean(tags.get("addr:street"),100),
        clean(tags.get("addr:suburb"),100),clean(tags.get("addr:city"),90)
    ])).strip(" ,"),250)
    safe_tags={k:clean(tags[k],120) for k in
               ("cuisine","opening_hours","website","addr:street","brand","operator")
               if k in tags}
    import json
    return (country,osm_type,osm_id,region,batch,name,category[0],category[1],
            cuisine or None,address or None,clean(tags.get("opening_hours"),140) or None,
            website or None,local,street,json.dumps(safe_tags,ensure_ascii=False),lat,lon)

class Handler(osmium.SimpleHandler):
    def __init__(self,connection,country,region,batch,batch_size):
        super().__init__()
        self.conn=connection;self.country=country;self.region=region;self.batch=batch
        self.batch_size=batch_size;self.rows=[];self.total=0;self.skipped_ways=0

    def node(self,obj):
        try:
            if not obj.location.valid():return
            tags=dict(obj.tags)
            row=parse("n",obj.id,(obj.location.lat,obj.location.lon),tags,self.country,self.region,self.batch)
            if row:self.add(row)
        except (ValueError,TypeError):return

    def way(self,obj):
        try:
            tags=dict(obj.tags)
            if not tags.get("name") or not get_category(tags):return
            points=[(n.location.lat,n.location.lon) for n in obj.nodes if n.location.valid()]
            if len(points)<2:self.skipped_ways+=1;return
            # Mean of actual vertices approximates a pin, but is not a guaranteed
            # interior point. Geometry-preserving imports may be added later.
            lat=sum(p[0] for p in points)/len(points)
            lon=sum(p[1] for p in points)/len(points)
            row=parse("w",obj.id,(lat,lon),tags,self.country,self.region,self.batch)
            if row:self.add(row)
        except (ValueError,TypeError):self.skipped_ways+=1

    def add(self,row):
        self.rows.append(row)
        if len(self.rows)>=self.batch_size:self.flush()

    def flush(self):
        if not self.rows:return
        with self.conn.transaction():
            with self.conn.cursor() as c:
                c.execute("""CREATE TEMP TABLE IF NOT EXISTS stage_places (
                    country_code VARCHAR(2),osm_type CHAR(1),osm_id BIGINT,source_region TEXT,
                    import_version UUID,name TEXT,category TEXT,subcategory TEXT,
                    cuisine TEXT,address TEXT,opening_hours TEXT,website TEXT,
                    local_food BOOLEAN,street_food BOOLEAN,tags JSONB,
                    lat DOUBLE PRECISION,lon DOUBLE PRECISION
                ) ON COMMIT DELETE ROWS""")
                with c.copy("COPY stage_places ("+",".join(FIELDS)+") FROM STDIN") as copy:
                    for row in self.rows:copy.write_row(row)
                c.execute("""INSERT INTO global_places ("""+",".join(FIELDS)+""")
                    SELECT """+",".join(FIELDS)+""" FROM stage_places
                    ON CONFLICT (country_code,osm_type,osm_id) DO UPDATE
                    SET source_region=EXCLUDED.source_region,import_version=EXCLUDED.import_version,
                    name=EXCLUDED.name,category=EXCLUDED.category,subcategory=EXCLUDED.subcategory,
                    cuisine=EXCLUDED.cuisine,address=EXCLUDED.address,
                    opening_hours=EXCLUDED.opening_hours,website=EXCLUDED.website,
                    local_food=EXCLUDED.local_food,street_food=EXCLUDED.street_food,
                    tags=EXCLUDED.tags,lat=EXCLUDED.lat,lon=EXCLUDED.lon,updated_at=NOW()""")
        self.total+=len(self.rows)
        print(f"Imported {self.total:,} features so far",flush=True)
        self.rows.clear()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--file",required=True,type=Path,help="Local regional .osm.pbf downloaded from Geofabrik")
    ap.add_argument("--country",required=True,help="ISO-3166 alpha-2 country code, e.g. VN")
    ap.add_argument("--region",required=True,help="Unique source region name e.g. vietnam")
    ap.add_argument("--batch-size",type=int,default=2000)
    ap.add_argument("--remove-deleted",action="store_true",
                    help="After a complete FULL regional import, remove previous features absent in this extract.")
    args=ap.parse_args()
    if not args.file.is_file() or not args.file.name.endswith(".osm.pbf"):ap.error("A local .osm.pbf file is required")
    if not re.fullmatch(r"[A-Z]{2}",args.country):ap.error("Country must be a 2-letter uppercase ISO code")
    if not re.fullmatch(r"[a-z0-9_-]{2,80}",args.region):ap.error("Invalid region identifier")
    if not 100<=args.batch_size<=20000:ap.error("Batch size must be 100..20000")
    url=os.environ.get("PLACES_DATABASE_URL")
    if not url:ap.error("PLACES_DATABASE_URL is missing (do not commit secrets)")
    batch=uuid.uuid4()
    with psycopg.connect(url,autocommit=True) as conn:
        with conn.cursor() as c:
            c.execute("""INSERT INTO global_place_import_runs
               (id,source_region,country_code,source_file,status)
               VALUES (%s,%s,%s,%s,'running')""",
              (batch,args.region,args.country,str(args.file.name)))
        handler=Handler(conn,args.country,args.region,batch,args.batch_size)
        try:
            handler.apply_file(str(args.file),locations=True,idx="flex_mem")
            handler.flush()
            # A regional reimport is not safe to purge unless the operator explicitly opts in.
            if args.remove_deleted:
                with conn.cursor() as c:
                    c.execute("""DELETE FROM global_places
                      WHERE country_code=%s AND source_region=%s AND import_version<>%s""",
                      (args.country,args.region,batch))
            with conn.cursor() as c:
                c.execute("""UPDATE global_place_import_runs
                   SET status='completed',completed_at=NOW(),rows_processed=%s WHERE id=%s""",
                   (handler.total,batch))
            print(f"Completed import {args.region}: {handler.total:,} genuine OSM features",flush=True)
        except Exception as exc:
            with conn.cursor() as c:
                c.execute("""UPDATE global_place_import_runs
                   SET status='failed',completed_at=NOW(),rows_processed=%s,notes=%s WHERE id=%s""",
                   (handler.total,str(exc)[:500],batch))
            raise
if __name__=="__main__":main()
