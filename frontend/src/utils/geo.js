/** Geographic helpers for hole maps (no paid APIs). */

const R = 6371000;
const YARDS_PER_M = 1.09361;

export function toRad(d) {
  return (d * Math.PI) / 180;
}

export function toDeg(r) {
  return (r * 180) / Math.PI;
}

export function haversineMeters(a, b) {
  const lat1 = toRad(a.lat);
  const lon1 = toRad(a.lon);
  const lat2 = toRad(b.lat);
  const lon2 = toRad(b.lon);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function yardsBetween(a, b) {
  return Math.round(haversineMeters(a, b) * YARDS_PER_M);
}

/** Initial bearing from a → b in degrees (0 = north). */
export function bearing(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const x = Math.sin(dLon) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(x, y)) + 360) % 360;
}

export function holeMapBearing(tee, green) {
  return bearing(tee, green);
}

/** Move from a point along a bearing for distM meters. */
export function destinationPoint(from, brgDeg, distM) {
  const brg = toRad(brgDeg);
  const lat1 = toRad(from.lat);
  const lon1 = toRad(from.lon);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distM / R) +
      Math.cos(lat1) * Math.sin(distM / R) * Math.cos(brg)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brg) * Math.sin(distM / R) * Math.cos(lat1),
      Math.cos(distM / R) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: toDeg(lat2), lon: toDeg(lon2) };
}

/** Total path length of centerline in yards. */
export function centerlineLengthYards(centerline) {
  let m = 0;
  for (let i = 0; i < centerline.length - 1; i++) {
    m += haversineMeters(centerline[i], centerline[i + 1]);
  }
  return m * YARDS_PER_M;
}

/**
 * Walk a polyline from start, return point at targetYards (or extrapolate at end).
 * If `fromEnd` is true, start at last point and walk backward.
 */
export function pointAtYardsOnLine(line, targetYards, fromEnd = false) {
  if (!line?.length) return null;
  const pts = fromEnd ? [...line].reverse() : line;
  const targetM = targetYards / YARDS_PER_M;
  let walked = 0;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const segM = haversineMeters(a, b);
    if (walked + segM >= targetM) {
      const t = (targetM - walked) / segM;
      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lon: a.lon + (b.lon - a.lon) * t,
      };
    }
    walked += segM;
  }

  // Extrapolate past end
  const n = pts.length;
  const a = pts[n - 2];
  const b = pts[n - 1];
  const segM = haversineMeters(a, b);
  const extraM = targetM - walked;
  const t = segM > 0 ? 1 + extraM / segM : 1;
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  };
}

/** Tee position for scorecard yardage (walk back from green along centerline). */
export function teePositionForYardage(centerline, green, yardageYds) {
  const greenIdx = centerline.length - 1;
  const lineFromGreen = [...centerline].slice(0, greenIdx + 1).reverse();
  return pointAtYardsOnLine(lineFromGreen, yardageYds, false);
}

/** Ideal GIR layup markers — label = yards remaining to green (Golfshot-style). */
export function girLayupMarkers(centerline, green, totalYards, par) {
  if (par <= 3 || totalYards <= 0 || !centerline?.length) return [];

  const fromGreen = [...centerline].reverse();
  const mk = (remaining) => {
    const pt = pointAtYardsOnLine(fromGreen, remaining, false);
    return pt ? { lat: pt.lat, lon: pt.lon, yards: remaining } : null;
  };

  if (par === 4) {
    const remaining = Math.round(Math.min(165, Math.max(95, totalYards * 0.36)));
    const m = mk(remaining);
    return m ? [m] : [];
  }

  if (par === 5) {
    const remainingApproach = Math.round(
      Math.min(140, Math.max(85, totalYards * 0.22))
    );
    const layupShot = Math.round(Math.min(200, Math.max(140, totalYards * 0.38)));
    const remainingAfterDrive = remainingApproach + layupShot;
    return [mk(remainingAfterDrive), mk(remainingApproach)].filter(Boolean);
  }

  return [];
}

/** Convert lat/lon point to along/cross meters relative to origin and bearing. */
function toLocalMeters(point, origin, brgDeg) {
  const distM = haversineMeters(origin, point);
  if (distM < 0.5) return { along: 0, cross: 0 };
  const brgToPoint = bearing(origin, point);
  const rel = toRad(brgToPoint - brgDeg);
  return {
    along: distM * Math.cos(rel),
    cross: distM * Math.sin(rel),
  };
}

/** Lat/lon from along/cross offset (meters) from origin along bearing. */
function fromLocalMeters(origin, brgDeg, alongM, crossM) {
  const onAxis = destinationPoint(origin, brgDeg, alongM);
  return destinationPoint(onAxis, brgDeg + 90, crossM);
}

/**
 * Bounding box aligned to hole axis — fits correctly when map is rotated
 * (tee at bottom, green at top). Includes full centerline + dogleg width.
 */
export function holeBoundsForView(tee, green, centerline, extraPoints, brgDeg) {
  const allPoints = [
    tee,
    green,
    ...(centerline || []),
    ...(extraPoints || []),
  ];

  let minAlong = -90;
  let maxAlong = 0;
  let minCross = 0;
  let maxCross = 0;

  for (const p of allPoints) {
    const { along, cross } = toLocalMeters(p, tee, brgDeg);
    minAlong = Math.min(minAlong, along);
    maxAlong = Math.max(maxAlong, along);
    minCross = Math.min(minCross, cross);
    maxCross = Math.max(maxCross, cross);
  }

  // Padding: extra behind tee (tee boxes), past green, and fairway width
  minAlong -= 75;
  maxAlong += 45;
  const crossPad = 55;
  minCross -= crossPad;
  maxCross += crossPad;

  const corners = [
    fromLocalMeters(tee, brgDeg, minAlong, minCross),
    fromLocalMeters(tee, brgDeg, maxAlong, minCross),
    fromLocalMeters(tee, brgDeg, maxAlong, maxCross),
    fromLocalMeters(tee, brgDeg, minAlong, maxCross),
  ];

  return holeBounds(corners, 15);
}

export function holeBounds(points, padM = 55) {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const padLat = padM / 111320;
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const padLon = padM / (111320 * Math.cos(toRad(midLat)));
  return [
    [Math.min(...lons) - padLon, Math.min(...lats) - padLat],
    [Math.max(...lons) + padLon, Math.max(...lats) + padLat],
  ];
}

export function centerlineToGeoJson(centerline) {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: centerline.map((p) => [p.lon, p.lat]),
    },
  };
}

/** Front / middle / back green distances from selected tee (Golfshot-style). */
export function greenDistancesFromTee(yardageYds, greenDepthYds = 14) {
  return {
    front: Math.max(0, yardageYds - greenDepthYds),
    middle: yardageYds,
    back: yardageYds + greenDepthYds,
  };
}

/** Front / middle / back pin positions along approach line. */
export function greenPinPositions(centerline, green, yardageYds, depthYds = 14) {
  const fromGreen = [...centerline].reverse();
  const front = pointAtYardsOnLine(fromGreen, depthYds, false) || green;
  const back = pointAtYardsOnLine(fromGreen, -depthYds, false) || green;
  return { front, middle: green, back };
}

/** 100-yard tick markers from tee along the hole. */
export function teeIntervalMarkers(centerline, tee, totalYards, interval = 100) {
  const line = centerlineFromTee(centerline, tee, centerline[centerline.length - 1]);
  const markers = [];
  for (let y = interval; y < totalYards - 20; y += interval) {
    const pt = pointAtYardsOnLine(line, y, false);
    if (pt) markers.push({ lat: pt.lat, lon: pt.lon, yards: y, kind: "tick" });
  }
  return markers;
}

/** Distances from tee to a tapped point and from point to green. */
export function touchPointDistances(tee, tap, green) {
  return {
    fromTee: yardsBetween(tee, tap),
    toGreen: yardsBetween(tap, green),
  };
}

export function markersToGeoJson(markers, labelKey = "yards") {
  return {
    type: "FeatureCollection",
    features: markers.map((m) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [m.lon, m.lat] },
      properties: { yards: m[labelKey] ?? m.yards, kind: m.kind || "layup" },
    })),
  };
}

export function lngLatFromEvent(map, e) {
  return { lat: e.lngLat.lat, lon: e.lngLat.lng };
}

/** Radial layup arc lines from green toward tee (Golfshot zoom mode). */
export function layupArcsFromGreen(green, tee, intervals = [50, 100, 150, 200, 250]) {
  const brgToTee = bearing(green, tee);
  const features = intervals.map((yards) => {
    const coords = [];
    for (let deg = -70; deg <= 70; deg += 8) {
      const pt = destinationPoint(green, brgToTee + deg, (yards * 0.9144));
      coords.push([pt.lon, pt.lat]);
    }
    return {
      type: "Feature",
      properties: { yards },
      geometry: { type: "LineString", coordinates: coords },
    };
  });
  return { type: "FeatureCollection", features };
}

/** Build centerline segment from tee to green for display. */
export function centerlineFromTee(centerline, tee, green) {
  if (!centerline?.length) return [tee, green];
  return [tee, ...centerline.slice(1)];
}
