#!/usr/bin/env python3
"""Ensure TripMate does not deploy an empty source-backed food database."""
import json
import os
from pathlib import Path
import subprocess
import sys

target = Path("data/food-venues.json")
try:
    snapshot = json.loads(target.read_text(encoding="utf-8"))
    cities = snapshot.get("cities", [])
    places = snapshot.get("places", [])
    if (snapshot.get("schema",0) >= 2 and len(places) >= 15
        and any(c.get("slug") == "Saigon" and c.get("count",0) >= 15 for c in cities)
        and sum(bool(p.get("localFood")) for p in places if p.get("city")=="Saigon") >= 10):
        print("Verified OSM food database already present:", len(places), "places in", len(cities), "cities", flush=True)
        sys.exit(0)
except (ValueError, OSError, AttributeError, TypeError):
    pass

print("Food database needs local-eats expansion, importing priority Saigon extract...", flush=True)
subprocess.check_call([sys.executable, "scripts/import_food_osm.py", "--cities", "Saigon"])
obj = json.loads(target.read_text(encoding="utf-8"))
if not obj.get("places") or obj.get("schema",0)<2 or sum(bool(p.get("localFood")) for p in obj.get("places",[]) if p.get("city")=="Saigon")<10:
    raise RuntimeError("No verified OSM records, refusing to publish an empty database")
print("Verified Saigon OSM food database ready for deployment",flush=True)
