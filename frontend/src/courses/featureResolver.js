/**
 * Layer resolver — OSM/curated shapes for accuracy, PGA decor when requested.
 */

import { haversineMeters } from "../utils/geo";
import { simulateHoleFeatures, ringsToGeoJson } from "../utils/holeSimulator";
import { PINE_MEADOW_OVERRIDES } from "./pine-meadow/overrides";

const OVERRIDE_REGISTRY = {
  "pine-meadow": PINE_MEADOW_OVERRIDES,
};

const EMPTY = { type: "FeatureCollection", features: [] };

function asRingList(ringOrRings) {
  if (!ringOrRings) return [];
  if (Array.isArray(ringOrRings[0]?.lat)) return ringOrRings;
  return [ringOrRings];
}

function ringCentroid(ring) {
  return {
    lat: ring.reduce((s, p) => s + p.lat, 0) / ring.length,
    lon: ring.reduce((s, p) => s + p.lon, 0) / ring.length,
  };
}

function distPointToSegmentM(p, a, b) {
  const dx = (b.lon - a.lon) * Math.cos((p.lat * Math.PI) / 180) * 111320;
  const dy = (b.lat - a.lat) * 111320;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return haversineMeters(p, a);
  const px = (p.lon - a.lon) * Math.cos((p.lat * Math.PI) / 180) * 111320;
  const py = (p.lat - a.lat) * 111320;
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
  const proj = {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  };
  return haversineMeters(p, proj);
}

function minDistToPolylineM(point, line) {
  if (!line?.length) return Infinity;
  if (line.length < 2) return haversineMeters(point, line[0]);
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    min = Math.min(min, distPointToSegmentM(point, line[i], line[i + 1]));
  }
  return min;
}

function scoreOsmRings(rings, centerline, type) {
  if (!rings?.length || !centerline?.length) return 0;
  if (rings.length > 3 && type === "fairway") return 0.2;

  let score = 0.35;
  if (type === "green" && rings.length === 1) score += 0.3;
  if (type === "fairway" && rings.length <= 2) score += 0.2;

  for (const ring of rings) {
    const d = minDistToPolylineM(ringCentroid(ring), centerline);
    if (d < 25) score += 0.15;
    else if (d > 50) score -= 0.3;
  }
  return Math.max(0, Math.min(1, score));
}

function getOverrides(courseId, holeNumber) {
  return OVERRIDE_REGISTRY[courseId]?.[holeNumber] || null;
}

function pickAccurateRings(curated, osmRings, osmScore, threshold = 0.45) {
  if (curated?.length) return { rings: curated, source: "curated" };
  if (osmRings?.length && osmScore >= threshold) return { rings: osmRings, source: "osm" };
  return { rings: [], source: "none" };
}

export function buildHoleFeatureLayers(
  holeGps,
  tee,
  green,
  par,
  holeNumber,
  courseId = "pine-meadow",
  viewMode = "pga"
) {
  const osm = holeGps.features || {};
  const centerline = holeGps.centerline || [];
  const overrides = getOverrides(courseId, holeNumber);

  const bunker = ringsToGeoJson(osm.bunker || [], "bunker");
  const water = ringsToGeoJson(osm.water || [], "water");

  if (viewMode === "satellite") {
    return {
      trees: EMPTY,
      rough: EMPTY,
      fairway: EMPTY,
      fringe: EMPTY,
      green: EMPTY,
      tee: EMPTY,
      bunker: EMPTY,
      water: EMPTY,
      meta: { mode: "satellite" },
    };
  }

  const fairwayScore = scoreOsmRings(osm.fairway, centerline, "fairway");
  const greenScore = scoreOsmRings(osm.green, centerline, "green");
  const fairwayPick = pickAccurateRings(overrides?.fairway, osm.fairway, fairwayScore);
  const greenPick = pickAccurateRings(overrides?.green, osm.green, greenScore);

  const pgaDecor = viewMode === "pga" || viewMode === "simulated";
  const needSyntheticFairway = fairwayPick.rings.length === 0;
  const needSyntheticGreen = greenPick.rings.length === 0;
  const simulated =
    pgaDecor || needSyntheticFairway || needSyntheticGreen
      ? simulateHoleFeatures(centerline, tee, green, par, holeNumber)
      : null;

  const fairwayRings =
    fairwayPick.rings.length > 0
      ? fairwayPick.rings
      : needSyntheticFairway
        ? asRingList(simulated?.fairway)
        : [];

  const greenRings =
    greenPick.rings.length > 0
      ? greenPick.rings
      : needSyntheticGreen
        ? asRingList(simulated?.green)
        : [];

  return {
    trees: pgaDecor ? ringsToGeoJson(simulated?.trees || [], "trees") : EMPTY,
    rough: pgaDecor ? ringsToGeoJson(asRingList(simulated?.rough), "rough") : EMPTY,
    fairway: ringsToGeoJson(fairwayRings, "fairway"),
    fringe: pgaDecor ? ringsToGeoJson(asRingList(simulated?.fringe), "fringe") : EMPTY,
    green: ringsToGeoJson(greenRings, "green"),
    tee: pgaDecor ? ringsToGeoJson(asRingList(simulated?.tee), "tee") : EMPTY,
    bunker,
    water,
    meta: {
      mode: viewMode,
      fairwaySource: fairwayPick.rings.length
        ? fairwayPick.source
        : needSyntheticFairway
          ? "synthetic"
          : "none",
      greenSource: greenPick.rings.length
        ? greenPick.source
        : needSyntheticGreen
          ? "synthetic"
          : "none",
      fairwayScore,
      greenScore,
    },
  };
}
