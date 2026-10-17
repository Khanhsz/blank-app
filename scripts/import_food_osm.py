#!/usr/bin/env python3
"""Make a reproducible, offline food POI snapshot from BBBike OSM city extracts.

Source: https://download.bbbike.org/osm/bbbike/
Derived OpenStreetMap database (ODbL) © OpenStreetMap contributors.
Run only during maintenance/import, never during a user lookup.
"""
import argparse
import datetime as dt
import gzip
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import urllib.request
import xml.etree.ElementTree as ET

CITIES = [
    ("Saigon", "Ho Chi Minh City", "Vietnam", 10.7769, 106.7009),
    ("Bangkok", "Bangkok", "Thailand", 13.7563, 100.5018),
    ("Singapore", "Singapore", "Singapore", 1.2903, 103.8519),
    ("Seoul", "Seoul", "South Korea", 37.5665, 126.9780),
    ("PhnomPenh", "Phnom Penh", "Cambodia", 11.5564, 104.9282),
]
CATEGORIES = {
    "restaurant": "Restaurant",
    "cafe": "Cafe / tea shop",
    "fast_food": "Casual dining",
    "ice_cream": "Ice cream / desserts",
    "bakery": "Bakery",
}
BLOCK = re.compile(r"\b(bar|pub|brewery|beer|wine|cocktail|nightclub|liquor|spirits)\b", re.I)

def clean(value, maxlen=160):
    if not isinstance(value, str): return None
    value = " ".join(value.split())
    return value[:maxlen] if value else None

def find_field(tags, *names):
    for name in names:
        if tags.get(name): return tags[name]
    return None

def parse_node(node, city):
    tags = {tag.get("k"): tag.get("v") for tag in node if tag.tag == "tag" and tag.get("k")}
    kind_tag = tags.get("shop") if tags.get("shop") == "bakery" else tags.get("amenity")
    if kind_tag not in CATEGORIES: return None
    name = clean(find_field(tags, "name:en", "name", "name:vi"), 100)
    if not name or BLOCK.search(name) or BLOCK.search(tags.get("description") or ""): return None
    try:
        osm_id = int(node.attrib["id"]); lat = float(node.attrib["lat"]); lon = float(node.attrib["lon"])
        if osm_id <= 0 or not(-85 <= lat <= 85 and -180 <= lon <= 180): return None
    except (KeyError, ValueError): return None
    website = clean(find_field(tags, "website", "contact:website"), 180)
    if website and website.startswith("www."): website = "https://" + website
    if website and not website.startswith("https://"): website = None
    address = clean(", ".join(filter(None, [
        " ".join(filter(None, [tags.get("addr:housenumber"), tags.get("addr:street")])),
        tags.get("addr:suburb"), tags.get("addr:city")
    ])) or tags.get("addr:full"), 180)
    category = CATEGORIES[kind_tag]
    return {
        "id": f"node/{osm_id}", "name": name,
        "kind": "drinks" if kind_tag in ("cafe", "ice_cream", "bakery") else "food",
        "category": category, "lat": round(lat, 6), "lng": round(lon, 6),
        "city": city,
        "cuisine": clean((tags.get("cuisine") or "").replace(";", ", ").replace("_", " "), 90),
        "address": address,
        "hours": clean(tags.get("opening_hours"), 140),
        "website": website,
        "osmUrl": f"https://www.openstreetmap.org/node/{osm_id}",
    }

def download(city, directory):
    url = f"https://download.bbbike.org/osm/bbbike/{city}/{city}.osm.gz"
    target = directory / (city + ".osm.gz")
    request = urllib.request.Request(url, headers={
        "User-Agent": "TripMateFoodDatabase/1.0 (https://tripmate-ai-khanhsz.onrender.com/privacy)"
    })
    with urllib.request.urlopen(request, timeout=90) as response, target.open("wb") as out:
        shutil.copyfileobj(response, out, length=1024 * 1024)
    if target.stat().st_size < 10000:
        raise RuntimeError(f"Unexpectedly small OSM extract for {city}")
    print(f"Fetched {city}: {target.stat().st_size/1048576:.1f} MB", flush=True)
    return target, url

def extract(path, city):
    venues = []
    seen = set()
    # Streaming parser means even large XML extracts need little memory.
    with gzip.open(path, "rb") as fh:
        context = ET.iterparse(fh, events=("start", "end"))
        event, root = next(context)
        for event, el in context:
            if event != "end" or el.tag not in ("node", "way", "relation"): continue
            if el.tag == "node":
                item = parse_node(el, city)
                if item and item["id"] not in seen:
                    venues.append(item);seen.add(item["id"])
            root.clear()
    return venues

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cities", nargs="*", default=[x[0] for x in CITIES])
    parser.add_argument("--out", default="data/food-venues.json")
    args = parser.parse_args()
    chosen = [item for item in CITIES if item[0] in args.cities]
    if not chosen: raise RuntimeError("No recognized city selected")
    all_places = []
    cities = []
    errors = []
    with tempfile.TemporaryDirectory(prefix="tripmate-osm-") as name:
        directory = Path(name)
        for slug, city, country, lat, lng in chosen:
            try:
                path, url = download(slug, directory)
                venues = extract(path, slug)
                path.unlink(missing_ok=True)
                if len(venues) < 15: raise RuntimeError("Only "+str(len(venues))+" mapped venues; refusing incomplete extract")
                # Keep all verified OSM nodes, not fabricated/curated ratings.
                all_places.extend(venues)
                cities.append({"slug":slug,"name":city,"country":country,"lat":lat,"lng":lng,"count":len(venues),"source":url})
                print(f"Imported {city}: {len(venues)} named food/drink OSM nodes",flush=True)
            except Exception as exc:
                errors.append(f"{slug}: {exc}")
                print(f"ERROR: {slug}: {exc}",flush=True)
    if not any(c["slug"]=="Saigon" for c in cities):
        raise RuntimeError("Saigon priority extract failed; not overwriting existing snapshot")
    dest=Path(args.out)
    dest.parent.mkdir(parents=True,exist_ok=True)
    obj={"schema":1,"source":"OpenStreetMap contributors via BBBike",
         "license":"ODbL-1.0","generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
         "cities":cities,"places":all_places,"errors":errors}
    temp=dest.with_suffix(".json.tmp")
    temp.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    temp.replace(dest)
    print("Snapshot saved",len(all_places),"real places across",len(cities),"cities. Errors:",errors,flush=True)

if __name__ == "__main__": main()
