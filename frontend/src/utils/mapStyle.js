/** Free Esri World Imagery raster style for MapLibre (no API key). */
export const SATELLITE_STYLE = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "© Esri · © OpenStreetMap",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "base-bg", type: "background", paint: { "background-color": "#0a1a10" } },
    { id: "esri-satellite", type: "raster", source: "esri" },
  ],
};

export const MAP_LAYERS = {
  trees: "sim-trees",
  treesSource: "sim-trees-src",
  rough: "sim-rough",
  roughSource: "sim-rough-src",
  fairwayShadow: "sim-fairway-shadow",
  fairway: "sim-fairway",
  fairwaySource: "sim-fairway-src",
  tee: "sim-tee",
  teeSource: "sim-tee-src",
  water: "sim-water",
  waterSource: "sim-water-src",
  bunker: "sim-bunker",
  bunkerSource: "sim-bunker-src",
  fringe: "sim-fringe",
  fringeSource: "sim-fringe-src",
  greenShadow: "sim-green-shadow",
  green: "sim-green",
  greenSource: "sim-green-src",
  centerline: "hole-centerline",
  centerlineSource: "hole-centerline-src",
  yardage: "yardage-markers",
  yardageSource: "yardage-markers-src",
  teeYardage: "tee-yardage-markers",
  teeYardageSource: "tee-yardage-src",
  targetLine: "target-line",
  targetLineSource: "target-line-src",
  layupArcs: "layup-arcs",
  layupArcsSource: "layup-arcs-src",
};

export const GOLFSHOT_BLUE = "#1e6fd9";

export const SIM_COLORS = {
  trees: "#0a2216",
  rough: "#1a4a2c",
  fairway: "#4cb85e",
  tee: "#58c868",
  fringe: "#3ea852",
  green: "#68dc7e",
  bunker: "#e8d4a0",
  water: "#38a8e0",
};

export const VIEW_MODES = {
  pga: { label: "PGA", satelliteOpacity: 0.12, usePatterns: true },
  hybrid: { label: "Hybrid", satelliteOpacity: 0.42, usePatterns: true },
  simulated: { label: "Simulated", satelliteOpacity: 0, usePatterns: true },
  satellite: { label: "Satellite", satelliteOpacity: 1, usePatterns: false },
};

export const PGA_LAYER_STACK = [
  { id: MAP_LAYERS.trees, source: MAP_LAYERS.treesSource, texture: "tex-trees", color: SIM_COLORS.trees, opacity: 0.92 },
  { id: MAP_LAYERS.rough, source: MAP_LAYERS.roughSource, texture: "tex-rough", color: SIM_COLORS.rough, opacity: 0.9 },
  { id: MAP_LAYERS.fairwayShadow, source: MAP_LAYERS.fairwaySource, shadow: true, color: "#061408", opacity: 0.45 },
  { id: MAP_LAYERS.fairway, source: MAP_LAYERS.fairwaySource, texture: "tex-fairway", color: SIM_COLORS.fairway, opacity: 0.94 },
  { id: MAP_LAYERS.tee, source: MAP_LAYERS.teeSource, texture: "tex-tee", color: SIM_COLORS.tee, opacity: 0.9 },
  { id: MAP_LAYERS.water, source: MAP_LAYERS.waterSource, texture: "tex-water", color: SIM_COLORS.water, opacity: 0.9 },
  { id: MAP_LAYERS.bunker, source: MAP_LAYERS.bunkerSource, texture: "tex-bunker", color: SIM_COLORS.bunker, opacity: 0.92 },
  { id: MAP_LAYERS.fringe, source: MAP_LAYERS.fringeSource, texture: "tex-fringe", color: SIM_COLORS.fringe, opacity: 0.88 },
  { id: MAP_LAYERS.greenShadow, source: MAP_LAYERS.greenSource, shadow: true, color: "#0a2810", opacity: 0.4 },
  { id: MAP_LAYERS.green, source: MAP_LAYERS.greenSource, texture: "tex-green", color: SIM_COLORS.green, opacity: 0.95 },
];
