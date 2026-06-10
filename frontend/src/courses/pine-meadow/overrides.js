/**
 * Hand-curated polygons verified against satellite imagery.
 * These take priority over synthetic shapes for accuracy.
 */
import hole1Fairway from "../../data/hole1FairwayTee.json";

function ringFromLatLonPairs(pairs) {
  return pairs.map(([lat, lon]) => ({ lat, lon }));
}

export const PINE_MEADOW_OVERRIDES = {
  1: {
    fairway: [ringFromLatLonPairs(hole1Fairway.ring)],
  },
};
