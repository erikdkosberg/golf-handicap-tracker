/**
 * PGA 2K-style simulated hole shapes from GPS centerline.
 */

import { bearing, destinationPoint, centerlineFromTee } from "./geo";

const YARDS_TO_M = 0.9144;

function curvatureAt(line, i) {
  if (i <= 0 || i >= line.length - 1) return 0;
  const b1 = bearing(line[i - 1], line[i]);
  const b2 = bearing(line[i], line[i + 1]);
  let diff = Math.abs(b2 - b1);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function halfWidthYards(t, par, line, idx) {
  const teePad = par === 3 ? 14 : 22;
  const mid = par === 3 ? 24 : 32;
  const belly = mid + 8 * Math.sin(Math.PI * Math.min(1, t * 1.15));
  const doglegBonus = line && curvatureAt(line, idx) > 12 ? 6 : 0;

  if (t < 0.05) return teePad + (belly - teePad) * (t / 0.05) + doglegBonus;
  if (t > 0.9) return belly * (1 - t) / 0.1 + 12 * ((t - 0.9) / 0.1) + doglegBonus;
  return belly + doglegBonus;
}

function segmentBearing(line, i) {
  if (i <= 0) return bearing(line[0], line[1]);
  if (i >= line.length - 1) return bearing(line[line.length - 2], line[line.length - 1]);
  const b1 = bearing(line[i - 1], line[i]);
  const b2 = bearing(line[i], line[i + 1]);
  return (b1 + b2) / 2;
}

export function corridorPolygon(line, widthFn) {
  if (!line?.length || line.length < 2) return null;

  const left = [];
  const right = [];
  const last = line.length - 1;

  for (let i = 0; i <= last; i++) {
    const t = last === 0 ? 0 : i / last;
    const wM = widthFn(t, i) * YARDS_TO_M;
    const brg = segmentBearing(line, Math.min(i, last - 1) || 0);
    const pt = line[Math.min(i, last)];
    left.push(destinationPoint(pt, brg - 90, wM));
    right.push(destinationPoint(pt, brg + 90, wM));
  }

  return [...left, ...right.reverse()];
}

function ellipseRing(center, brgDeg, widthM, depthM, segments = 14) {
  const ring = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    const along = Math.cos(a) * depthM;
    const cross = Math.sin(a) * widthM;
    const onAxis = destinationPoint(center, brgDeg, along);
    ring.push(destinationPoint(onAxis, brgDeg + 90, cross));
  }
  return ring;
}

export function treeMasses(line, brg, holeNumber = 1, par = 4) {
  if (!line?.length) return [];
  const count = par === 3 ? 6 : par === 5 ? 10 : 8;
  const trees = [];

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const idx = Math.min(Math.floor(t * (line.length - 1)), line.length - 2);
    const pt = line[idx];
    const side = (i + holeNumber) % 2 === 0 ? -1 : 1;
    const offsetYds = 40 + ((i * holeNumber * 11 + 3) % 26);
    const center = destinationPoint(pt, brg + 90 * side, offsetYds * YARDS_TO_M);
    trees.push(
      ellipseRing(center, brg + side * 15, (14 + (i % 4) * 5) * YARDS_TO_M, (10 + (i % 3) * 4) * YARDS_TO_M)
    );
  }
  return trees;
}

export function greenShapePolygon(green, approachBearing, halfWidthYds = 16, halfDepthYds = 11) {
  const w = halfWidthYds * YARDS_TO_M;
  const d = halfDepthYds * YARDS_TO_M;
  const brg = approachBearing;
  const front = destinationPoint(green, brg + 180, d);
  const back = destinationPoint(green, brg, d);
  return [
    destinationPoint(front, brg - 90, w),
    destinationPoint(front, brg + 90, w),
    destinationPoint(back, brg + 90, w * 0.85),
    destinationPoint(back, brg - 90, w * 0.85),
  ];
}

function teeBoxPolygon(tee, brg, halfWidthYds = 8, halfDepthYds = 5) {
  const w = halfWidthYds * YARDS_TO_M;
  const d = halfDepthYds * YARDS_TO_M;
  const back = destinationPoint(tee, brg + 180, d);
  const front = destinationPoint(tee, brg, d * 0.5);
  return [
    destinationPoint(back, brg - 90, w),
    destinationPoint(back, brg + 90, w),
    destinationPoint(front, brg + 90, w * 0.9),
    destinationPoint(front, brg - 90, w * 0.9),
  ];
}

export function simulateHoleFeatures(centerline, tee, green, par = 4, holeNumber = 1) {
  const line = centerlineFromTee(centerline, tee, green);
  const brg = bearing(tee, green);
  const widthFn = (t, i) => halfWidthYards(t, par, line, i);

  return {
    trees: treeMasses(line, brg, holeNumber, par),
    rough: corridorPolygon(line, (t, i) => halfWidthYards(t, par, line, i) + 28),
    fairway: corridorPolygon(line, widthFn),
    fringe: greenShapePolygon(green, brg, 22, 15),
    green: greenShapePolygon(green, brg, 15, 10),
    tee: teeBoxPolygon(tee, brg, par === 3 ? 5 : 9, par === 3 ? 4 : 6),
  };
}

export function ringsToGeoJson(rings, featureType) {
  if (!rings?.length) return { type: "FeatureCollection", features: [] };
  const list = Array.isArray(rings[0]?.lat) ? rings : [rings];
  if (!list.length) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: list
      .filter((r) => r?.length >= 3)
      .map((ring) => ({
        type: "Feature",
        properties: { type: featureType },
        geometry: {
          type: "Polygon",
          coordinates: [[...ring.map((p) => [p.lon, p.lat]), [ring[0].lon, ring[0].lat]]],
        },
      })),
  };
}

export function buildHoleFeatureLayers(holeGps, tee, green, par, holeNumber = 1) {
  const simulated = simulateHoleFeatures(holeGps.centerline, tee, green, par, holeNumber);
  const osm = holeGps.features || {};

  const wrap = (rings) => (Array.isArray(rings?.[0]) ? rings : rings ? [rings] : []);

  return {
    trees: ringsToGeoJson(simulated.trees, "trees"),
    rough: ringsToGeoJson(wrap(simulated.rough), "rough"),
    fairway: ringsToGeoJson(wrap(simulated.fairway), "fairway"),
    fringe: ringsToGeoJson(wrap(simulated.fringe), "fringe"),
    green: ringsToGeoJson(wrap(simulated.green), "green"),
    tee: ringsToGeoJson(wrap(simulated.tee), "tee"),
    bunker: ringsToGeoJson(osm.bunker || [], "bunker"),
    water: ringsToGeoJson(osm.water || [], "water"),
  };
}
