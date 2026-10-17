#!/usr/bin/env python3
"""Import verified, named food venues from BBBike OpenStreetMap city extracts.

Source: https://download.bbbike.org/osm/bbbike/
Data © OpenStreetMap contributors, Open Database License (ODbL).
No user-facing API keys or live Overpass queries are required.
"""
import argparse
import datetime as dt
import gzip
import json
from pathlib import Path
import re
import shutil
import tempfile
import unicodedata
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
    ("amenity", "restaurant"): ("food", "Restaurant"),
    ("amenity", "fast_food"): ("food", "Casual dining"),
    ("amenity", "food_court"): ("food", "Food court"),
    ("amenity", "cafe"): ("drinks", "Cafe / tea shop"),
    ("amenity", "ice_cream"): ("drinks", "Ice cream / desserts"),
    ("shop", "bakery"): ("drinks", "Bakery"),
    ("shop", "pastry"): ("drinks", "Bakery"),
    ("shop", "deli"): ("food", "Local deli / prepared food"),
}
ALCOHOL = re.compile(r"\b(?:bar|pub|brewery|beer|wine|cocktail|nightclub|liquor|spirits)\b", re.I)
LOCAL_CUISINES = {
    "Saigon": {"vietnamese", "pho", "banh_mi", "bun_bo", "bun_cha", "com_tam", "hu_tieu", "banh_xeo"},
    "Bangkok": {"thai", "isan", "isaan"},
    "Singapore": {"singaporean", "peranakan", "nyonya", "hawker"},
    "Seoul": {"korean", "korean_bbq", "bibimbap", "kimchi"},
    "PhnomPenh": {"khmer", "cambodian"},
}
SAIGON_DISHES = re.compile(
    r"\b(?:quan|pho|bun|com|banh|hu tieu|bo kho|mi quang|lau|chao|oc|xoi|hu tieu|mien|goi cuon)\b",
    re.I,
)

def clean(s, limit=160):
    if not isinstance(s, str): return None
    s = " ".join(s.split())
    return s[:limit] if s else None

def ascii_text(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s or "") if not unicodedata.combining(c)).lower().replace("đ", "d")

def tags_from(el):
    return {t.get("k"): t.get("v") for t in el.findall("tag") if t.get("k") and t.get("v")}

def value(tags, *names):
    return next((tags[key] for key in names if tags.get(key)), None)

def inspect(tags, city):
    if tags.get("disused") == "yes" or tags.get("abandoned") == "yes" or tags.get("access") == "private":
        return None
    type_key = ("shop", tags.get("shop")) if tags.get("shop") in ("bakery", "pastry", "deli") else ("amenity", tags.get("amenity"))
    classification = CATEGORIES.get(type_key)
    if not classification: return None
    # Keep native local-language names; no inventing names for unnamed street stalls.
    name = clean(value(tags, "name", "name:vi", "name:en"), 120)
    if not name or ALCOHOL.search(name) or ALCOHOL.search(tags.get("description", "")): return None
    cuisine = clean((tags.get("cuisine") or "").replace(";", ", ").replace("_", " "), 110)
    cuisines = {s.strip().lower() for s in re.split(r"[;,]", (tags.get("cuisine") or "").lower()) if s.strip()}
    local_cuisine = bool(cuisines & LOCAL_CUISINES.get(city, set()))
    local_name = city == "Saigon" and bool(SAIGON_DISHES.search(ascii_text(name)))
    local_food = local_cuisine or local_name or tags.get("cuisine", "").lower() == "local"
    street_food = (
        tags.get("street_vendor") in ("yes", "food")
        or tags.get("mobile") == "yes"
        or "street_food" in cuisines
        or tags.get("amenity") == "fast_food" and local_food
    )
    kind, category = classification
    address = clean(", ".join(filter(None, [
        " ".join(filter(None, [tags.get("addr:housenumber"), tags.get("addr:street")])),
        tags.get("addr:suburb"), tags.get("addr:city")
    ])) or tags.get("addr:full"), 190)
    website = clean(value(tags, "website", "contact:website"), 200)
    if website and website.startswith("www."): website = "https://" + website
    if website and not website.startswith("https://"): website = None
    return dict(name=name, kind=kind, category=category, city=city,
                cuisine=cuisine, address=address, hours=clean(tags.get("opening_hours"), 160),
                website=website, localFood=bool(local_food), streetFood=bool(street_food))

def parse_venue(osm_type, osm_id, lat, lon, tags, city):
    if osm_id <= 0 or not (-85 <= lat <= 85 and -180 <= lon <= 180):
        return None
    info = inspect(tags, city)
    if not info: return None
    return {
        "id": f"{osm_type}/{osm_id}", "osmUrl": f"https://www.openstreetmap.org/{osm_type}/{osm_id}",
        "lat": round(lat, 6), "lng": round(lon, 6), **info
    }

def download(city, directory):
    url=f"https://download.bbbike.org/osm/bbbike/{city}/{city}.osm.gz"
    path=directory / (city + ".osm.gz")
    req=urllib.request.Request(url, headers={
        "User-Agent": "TripMateFoodDatabase/2.0 (https://tripmate-ai-khanhsz.onrender.com/privacy)"
    })
    with urllib.request.urlopen(req, timeout=110) as res, path.open("wb") as out:
        shutil.copyfileobj(res, out, length=1024*1024)
    if path.stat().st_size < 10000: raise RuntimeError("Extract seems incomplete")
    print(f"Downloaded {city} ({path.stat().st_size/1024**2:.1f} MB)",flush=True)
    return path,url

def stream_extract(path, city):
    result=[]
    tagged_ways=[]
    refs_needed=set()
    seen=set()
    with gzip.open(path,"rb") as stream:
        context=ET.iterparse(stream, events=("start","end"))
        _,root=next(context)
        for event,el in context:
            if event != "end" or el.tag not in ("node","way","relation"):continue
            if el.tag == "node":
                tags=tags_from(el)
                if tags:
                    try:
                        id_=int(el.attrib["id"]);lat=float(el.attrib["lat"]);lon=float(el.attrib["lon"])
                        p=parse_venue("node",id_,lat,lon,tags,city)
                        if p and p["id"] not in seen:result.append(p);seen.add(p["id"])
                    except (KeyError, ValueError): pass
            elif el.tag == "way":
                tags=tags_from(el)
                if inspect(tags,city):
                    refs=[]
                    for child in el.findall("nd"):
                        try:refs.append(int(child.attrib["ref"]))
                        except (KeyError,ValueError):pass
                    if refs:
                        try:
                            id_=int(el.attrib["id"])
                            if id_ > 0:
                                tagged_ways.append((id_,tags,refs))
                                refs_needed.update(refs)
                        except (KeyError,ValueError): pass
            root.clear()
    print(f"{city}: {len(result)} named food nodes; {len(tagged_ways)} tagged ways; {len(refs_needed)} required geometry nodes",flush=True)
    if not tagged_ways:return result
    # OSM XML nodes precede ways. Look up only the referenced nodes in a second
    # streaming pass to avoid keeping every city street node in memory.
    coords={}
    with gzip.open(path,"rb") as stream:
        context=ET.iterparse(stream, events=("start","end"))
        _,root=next(context)
        for event,el in context:
            if event!="end" or el.tag not in ("node","way","relation"):continue
            if el.tag == "node":
                try:
                    id_=int(el.attrib["id"])
                    if id_ in refs_needed:
                        coords[id_]=(float(el.attrib["lat"]),float(el.attrib["lon"]))
                except (KeyError,ValueError):pass
            if el.tag=="way":break
            root.clear()
    for id_,tags,refs in tagged_ways:
        points=[coords[r] for r in dict.fromkeys(refs) if r in coords]
        if not points:continue
        # Mean of real boundary vertices is an approximate location, not an
        # invented coordinate. No way is included if its OSM geometry is absent.
        lat=sum(pt[0] for pt in points)/len(points)
        lon=sum(pt[1] for pt in points)/len(points)
        p=parse_venue("way",id_,lat,lon,tags,city)
        if p and p["id"] not in seen:result.append(p);seen.add(p["id"])
    return result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--cities",nargs="*",default=[x[0] for x in CITIES])
    parser.add_argument("--out",default="data/food-venues.json")
    args=parser.parse_args()
    selected=[x for x in CITIES if x[0] in args.cities]
    if not selected:raise RuntimeError("No valid cities selected")
    dest=Path(args.out)
    original={}
    if dest.exists():
        try:original=json.loads(dest.read_text(encoding="utf-8"))
        except (OSError,ValueError):pass
    all_places=[p for p in original.get("places",[]) if p.get("city") not in {c[0] for c in selected}]
    cities=[c for c in original.get("cities",[]) if c.get("slug") not in {x[0] for x in selected}]
    errors=[]
    with tempfile.TemporaryDirectory(prefix="tripmate-osm-") as folder:
        for slug,name,country,lat,lon in selected:
            try:
                path,url=download(slug,Path(folder))
                records=stream_extract(path,slug)
                path.unlink(missing_ok=True)
                if len(records)<15:raise RuntimeError("Too few mapped food records: "+str(len(records)))
                all_places.extend(records)
                cities.append({"slug":slug,"name":name,"country":country,"lat":lat,"lng":lon,"count":len(records),"source":url})
                print(f"Imported {slug}: {len(records)} venues; {sum(p['localFood'] for p in records)} with local cuisine evidence",flush=True)
            except Exception as exc:
                errors.append(f"{slug}: {exc}")
                print("WARN",errors[-1],flush=True)
                # Preserve prior city snapshot if a download fails.
                oldcity=next((c for c in original.get("cities",[]) if c.get("slug")==slug),None)
                if oldcity:
                    cities.append(oldcity)
                    all_places.extend(p for p in original.get("places",[]) if p.get("city")==slug)
    if not any(c.get("slug")=="Saigon" and c.get("count",0)>=15 for c in cities):
        raise RuntimeError("No verified Saigon OSM data; refusing to replace snapshot")
    data={"schema":2,"source":"OpenStreetMap contributors via BBBike",
          "license":"ODbL-1.0","generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
          "cities":cities,"places":all_places,"errors":errors}
    dest.parent.mkdir(parents=True,exist_ok=True)
    tmp=dest.with_suffix(".tmp")
    tmp.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    tmp.replace(dest)
    print(f"Saved {len(all_places)} venue records across {len(cities)} cities",flush=True)

if __name__=="__main__":main()
