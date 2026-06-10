#!/usr/bin/env python3
"""Build geographic GPS hole data (v2) from OpenStreetMap for any course config."""

import json
import math
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def haversine_m(a, b):
    lat1, lon1 = math.radians(a["lat"]), math.radians(a["lon"])
    lat2, lon2 = math.radians(b["lat"]), math.radians(b["lon"])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    x = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371000 * 2 * math.atan2(math.sqrt(x), math.sqrt(1 - x))


def bearing(a, b):
    lat1, lon1 = math.radians(a["lat"]), math.radians(a["lon"])
    lat2, lon2 = math.radians(b["lat"]), math.radians(b["lon"])
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def centroid_latlon(coords):
    return {
        "lat": sum(c["lat"] for c in coords) / len(coords),
        "lon": sum(c["lon"] for c in coords) / len(coords),
    }


def dist_point_to_segment_m(p, a, b):
    """Approximate shortest distance (meters) from p to segment a-b."""
    dx = (b["lon"] - a["lon"]) * math.cos(math.radians(p["lat"])) * 111320
    dy = (b["lat"] - a["lat"]) * 111320
    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq < 1e-6:
        return haversine_m(p, a)
    px = (p["lon"] - a["lon"]) * math.cos(math.radians(p["lat"])) * 111320
    py = (p["lat"] - a["lat"]) * 111320
    t = max(0.0, min(1.0, (px * dx + py * dy) / seg_len_sq))
    proj = {
        "lat": a["lat"] + (b["lat"] - a["lat"]) * t,
        "lon": a["lon"] + (b["lon"] - a["lon"]) * t,
    }
    return haversine_m(p, proj)


def min_dist_to_polyline_m(p, line):
    if len(line) < 2:
        return haversine_m(p, line[0]) if line else 1e9
    return min(dist_point_to_segment_m(p, line[i], line[i + 1]) for i in range(len(line) - 1))


def on_hole_axis(tee, green, point, margin_m=90):
    """Point lies roughly between tee and green along the hole axis."""
    brg = bearing(tee, green)
    for origin in (tee, green):
        lat1, lon1 = math.radians(origin["lat"]), math.radians(origin["lon"])
        lat2, lon2 = math.radians(point["lat"]), math.radians(point["lon"])
        dlon = lon2 - lon1
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        rel = math.degrees(math.atan2(x, y)) - brg
        while rel > 180:
            rel -= 360
        while rel < -180:
            rel += 360
        dist = haversine_m(origin, point)
        along = dist * math.cos(math.radians(rel))
        if -margin_m <= along <= haversine_m(tee, green) + margin_m:
            return True
    return False


GOLF_FEATURE_TYPES = {
    "fairway": "fairway",
    "green": "green",
    "bunker": "bunker",
    "water_hazard": "water",
    "lateral_water_hazard": "water",
    "rough": "rough",
}


def assign_osm_features(holes, polygons, max_dist_m=40):
    """Attach nearby OSM polygons to each hole (spatial filter avoids wrong-hole bleed)."""
    for hole_num, hole in holes.items():
        line = hole["centerline"]
        grouped = {k: [] for k in ("fairway", "green", "bunker", "water", "rough")}
        hole_len = haversine_m(hole["tee"], hole["green"])

        for poly in polygons:
            c = poly["centroid"]
            dist = min_dist_to_polyline_m(c, line)
            ftype = poly["ftype"]
            limit = max_dist_m + (8 if ftype in ("bunker", "water") else 0)
            if dist > limit:
                continue
            if not on_hole_axis(hole["tee"], hole["green"], c, margin_m=80):
                continue
            ref = poly.get("ref")
            if ref and ref != str(hole_num):
                continue
            if ftype not in grouped:
                continue
            if ftype == "fairway":
                along = haversine_m(hole["tee"], c)
                if along > hole_len * 1.12:
                    continue
            grouped[ftype].append(poly["ring"])

        hole["features"] = {k: v for k, v in grouped.items() if v}


def to_point(lat, lon):
    return {"lat": round(lat, 7), "lon": round(lon, 7)}


def densify_centerline(points, max_segment_m=40):
    if len(points) < 2:
        return points
    out = [points[0]]
    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]
        dist = haversine_m(a, b)
        steps = max(1, int(math.ceil(dist / max_segment_m)))
        for s in range(1, steps + 1):
            t = s / steps
            out.append(
                to_point(
                    a["lat"] + (b["lat"] - a["lat"]) * t,
                    a["lon"] + (b["lon"] - a["lon"]) * t,
                )
            )
    return out


def yardage_markers(centerline, interval_yards=50):
    if len(centerline) < 2:
        return []
    markers = []
    total_m = 0.0
    next_yards = interval_yards
    for i in range(len(centerline) - 1):
        a, b = centerline[i], centerline[i + 1]
        seg_m = haversine_m(a, b)
        if seg_m == 0:
            continue
        while total_m + seg_m >= next_yards * 0.9144:
            need_m = next_yards * 0.9144 - total_m
            t = need_m / seg_m
            markers.append(
                {
                    "yards": next_yards,
                    "lat": round(a["lat"] + (b["lat"] - a["lat"]) * t, 7),
                    "lon": round(a["lon"] + (b["lon"] - a["lon"]) * t, 7),
                }
            )
            next_yards += interval_yards
        total_m += seg_m
    return markers


def ensure_osm(bbox, osm_path):
    if osm_path.exists() and osm_path.stat().st_size > 10_000:
        return
    osm_path.parent.mkdir(parents=True, exist_ok=True)
    west, south, east, north = bbox
    url = (
        "https://www.openstreetmap.org/api/0.6/map"
        f"?bbox={west},{south},{east},{north}"
    )
    print(f"Downloading OSM → {osm_path}")
    req = urllib.request.Request(url, headers={"User-Agent": "GolfHandicap/1.0"})
    osm_path.write_bytes(urllib.request.urlopen(req, timeout=90).read())


def process(config_path):
    config = json.loads(Path(config_path).read_text())
    osm_path = ROOT / config["osmFile"]
    out_path = ROOT / config["outputGps"]
    bbox = config["osmBbox"]
    interval = config.get("yardageMarkerInterval", 50)

    ensure_osm(bbox, osm_path)
    root = ET.parse(osm_path).getroot()
    nodes = {
        n.get("id"): to_point(float(n.get("lat")), float(n.get("lon")))
        for n in root.findall("node")
    }

    hole_lines = {}
    tee_by_hole = {}
    golf_polygons = []

    for w in root.findall("way"):
        tags = {t.get("k"): t.get("v") for t in w.findall("tag")}
        if "golf" not in tags:
            continue
        coords = [
            nodes[nd.get("ref")]
            for nd in w.findall("nd")
            if nd.get("ref") in nodes
        ]
        if len(coords) < 2:
            continue
        golf_type = tags["golf"]
        if golf_type == "hole" and tags.get("ref"):
            hole_lines[tags["ref"]] = coords
        elif golf_type == "tee":
            ref = tags.get("ref") or tags.get("hole")
            if ref:
                tee_by_hole.setdefault(str(ref), []).extend(coords)
        elif golf_type in GOLF_FEATURE_TYPES and len(coords) >= 3:
            ring = coords if coords[0] == coords[-1] else coords + [coords[0]]
            golf_polygons.append(
                {
                    "ftype": GOLF_FEATURE_TYPES[golf_type],
                    "ref": tags.get("ref") or tags.get("hole"),
                    "centroid": centroid_latlon(coords),
                    "ring": ring,
                }
            )

    holes = {}
    for hole_num in sorted(hole_lines.keys(), key=int):
        line = hole_lines[hole_num]
        tee = centroid_latlon(tee_by_hole[hole_num]) if hole_num in tee_by_hole else line[0]
        green = line[-1]
        centerline = densify_centerline(line if hole_num not in tee_by_hole else [tee] + line[1:])

        holes[hole_num] = {
            "tee": tee,
            "green": green,
            "centerline": centerline,
            "bearing": round(bearing(tee, green), 2),
            "yardageMarkers": yardage_markers(centerline, interval),
        }

    assign_osm_features(holes, golf_polygons)

    output = {
        "version": 2,
        "courseId": config["courseId"],
        "name": config["name"],
        "location": config.get("location", ""),
        "source": "OpenStreetMap (ODbL)",
        "attribution": "© OpenStreetMap · © Esri",
        "holes": holes,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, separators=(",", ":")))
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes, {len(holes)} holes)")


if __name__ == "__main__":
    cfg = sys.argv[1] if len(sys.argv) > 1 else str(
        Path(__file__).parent / "configs" / "pine-meadow.json"
    )
    process(cfg)
