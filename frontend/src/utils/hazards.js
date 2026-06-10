import { yardsBetween } from "./geo";

function ringCentroid(ring) {
  if (!ring?.length) return null;
  return {
    lat: ring.reduce((s, p) => s + p.lat, 0) / ring.length,
    lon: ring.reduce((s, p) => s + p.lon, 0) / ring.length,
  };
}

/** Hazards near the hole with distances from tee (Golfshot left column). */
export function hazardsFromFeatures(holeGps, tee, max = 5) {
  const features = holeGps?.features || {};
  const hazards = [];

  (features.bunker || []).forEach((ring, i) => {
    const c = ringCentroid(ring);
    if (!c) return;
    hazards.push({
      id: `bunker-${i}`,
      type: "bunker",
      label: "Bunker",
      icon: "⛳",
      ...c,
      yards: yardsBetween(tee, c),
    });
  });

  (features.water || []).forEach((ring, i) => {
    const c = ringCentroid(ring);
    if (!c) return;
    hazards.push({
      id: `water-${i}`,
      type: "water",
      label: "Water",
      icon: "💧",
      ...c,
      yards: yardsBetween(tee, c),
    });
  });

  return hazards.sort((a, b) => a.yards - b.yards).slice(0, max);
}
