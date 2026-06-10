import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./HoleMap.css";
import { ChevronLeft, ChevronRight, X, Layers, Maximize2, Minimize2, Eye, EyeOff } from "lucide-react";
import {
  holeMapBearing,
  holeBoundsForView,
  centerlineFromTee,
  centerlineToGeoJson,
  markersToGeoJson,
  teePositionForYardage,
  girLayupMarkers,
  greenDistancesFromTee,
  greenPinPositions,
  teeIntervalMarkers,
  touchPointDistances,
  layupArcsFromGreen,
  lngLatFromEvent,
} from "../utils/geo";
import { buildHoleFeatureLayers } from "../courses/featureResolver";
import { hazardsFromFeatures } from "../utils/hazards";
import { recommendClub } from "../utils/clubRecommendation";
import { registerGrassTextures } from "../utils/grassTextures";
import {
  SATELLITE_STYLE,
  MAP_LAYERS,
  VIEW_MODES,
  GOLFSHOT_BLUE,
  PGA_LAYER_STACK,
} from "../utils/mapStyle";

const VIEW_MODE_KEY = "golf-view-mode";
const MODE_CYCLE = ["pga", "hybrid", "simulated", "satellite"];

function layerPaint(spec, usePatterns) {
  if (spec.shadow) {
    return {
      "fill-color": spec.color,
      "fill-opacity": spec.opacity,
      "fill-translate": [5, 8],
      "fill-translate-anchor": "viewport",
      "fill-outline-color": "transparent",
    };
  }
  if (usePatterns && spec.texture) {
    return {
      "fill-pattern": spec.texture,
      "fill-opacity": spec.opacity,
      "fill-outline-color": "rgba(0,0,0,0.12)",
    };
  }
  return {
    "fill-color": spec.color,
    "fill-opacity": spec.opacity,
    "fill-outline-color": "rgba(0,0,0,0.1)",
  };
}

function addMapSources(map, usePatterns = true) {
  const sources = new Set();
  for (const spec of PGA_LAYER_STACK) {
    if (!sources.has(spec.source) && !map.getSource(spec.source)) {
      map.addSource(spec.source, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      sources.add(spec.source);
    }
    if (!map.getLayer(spec.id)) {
      map.addLayer({
        id: spec.id,
        type: "fill",
        source: spec.source,
        paint: layerPaint(spec, usePatterns),
      });
    }
  }

  const lineLayers = [
    {
      id: MAP_LAYERS.layupArcs,
      source: MAP_LAYERS.layupArcsSource,
      paint: { "line-color": "rgba(255,255,255,0.35)", "line-width": 1.5, "line-dasharray": [2, 3] },
    },
    {
      id: MAP_LAYERS.centerline,
      source: MAP_LAYERS.centerlineSource,
      paint: { "line-color": "rgba(255,255,255,0.22)", "line-width": 1.2, "line-dasharray": [2, 3] },
    },
    {
      id: MAP_LAYERS.targetLine,
      source: MAP_LAYERS.targetLineSource,
      paint: { "line-color": "#fff", "line-width": 2.5, "line-dasharray": [3, 2] },
    },
  ];

  for (const ll of lineLayers) {
    if (!map.getSource(ll.source)) {
      map.addSource(ll.source, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: ll.id, type: "line", source: ll.source, paint: ll.paint });
    }
  }

  if (!map.getSource(MAP_LAYERS.yardageSource)) {
    map.addSource(MAP_LAYERS.yardageSource, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: MAP_LAYERS.yardage,
      type: "circle",
      source: MAP_LAYERS.yardageSource,
      paint: {
        "circle-radius": 16,
        "circle-color": "rgba(0,0,0,0.78)",
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#fff",
      },
    });
    map.addLayer({
      id: `${MAP_LAYERS.yardage}-label`,
      type: "symbol",
      source: MAP_LAYERS.yardageSource,
      layout: { "text-field": ["to-string", ["get", "yards"]], "text-size": 12, "text-allow-overlap": true },
      paint: { "text-color": "#fff" },
    });
  }

  if (!map.getSource(MAP_LAYERS.teeYardageSource)) {
    map.addSource(MAP_LAYERS.teeYardageSource, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: MAP_LAYERS.teeYardage,
      type: "symbol",
      source: MAP_LAYERS.teeYardageSource,
      layout: {
        "text-field": ["to-string", ["get", "yards"]],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-offset": [0, -1.2],
      },
      paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,0.65)", "text-halo-width": 1.5 },
    });
  }
}

function pinMarkerHtml(label, color, active) {
  const border = active ? "2px solid #1e6fd9" : "1px solid rgba(255,255,255,0.5)";
  return `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6))">
    <div style="background:${color};color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:4px;border:${border}">${label}</div>
    <div style="width:7px;height:7px;border-radius:50%;background:${color};border:1px solid #fff;margin-top:2px"></div>
  </div>`;
}

export default function HoleMap({
  hole,
  holeGps,
  selectedTee,
  teeColor,
  yardage,
  tees,
  holeCount = 18,
  courseId = "pine-meadow",
  slideDir = "next",
  onSelectTee,
  onSelectHole,
  onPrevHole,
  onNextHole,
  hasPrev,
  hasNext,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const teeMarkerRef = useRef(null);
  const greenMarkerRef = useRef(null);
  const pinMarkersRef = useRef([]);
  const targetMarkerRef = useRef(null);
  const touchStartRef = useRef(null);
  const lastTapRef = useRef(0);
  const [targetPoint, setTargetPoint] = useState(null);
  const [targetSource, setTargetSource] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || "pga"
  );
  const [zoomMode, setZoomMode] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  const holeView = useMemo(() => {
    if (!holeGps) return null;
    const { green, centerline } = holeGps;
    const tee = teePositionForYardage(centerline, green, yardage) || holeGps.tee;
    const line = centerlineFromTee(centerline, tee, green);
    const layups = girLayupMarkers(centerline, green, yardage, hole.par);
    const ticks = teeIntervalMarkers(centerline, tee, yardage);
    const brg = holeMapBearing(tee, green);
    const greenDist = greenDistancesFromTee(yardage);
    const pins = greenPinPositions(centerline, green, yardage);
    const features = buildHoleFeatureLayers(
      holeGps,
      tee,
      green,
      hole.par,
      hole.number,
      courseId,
      viewMode
    );
    const hazards = hazardsFromFeatures(holeGps, tee);
    return { tee, green, line, layups, ticks, brg, greenDist, pins, features, hazards };
  }, [holeGps, yardage, hole.par, hole.number, courseId, viewMode]);

  const activeTarget = targetPoint || holeView?.green;

  const touchDist = useMemo(() => {
    if (!activeTarget || !holeView) return null;
    return touchPointDistances(holeView.tee, activeTarget, holeView.green);
  }, [activeTarget, holeView]);

  const clubRec = useMemo(() => {
    if (!touchDist) return recommendClub(holeView?.greenDist?.middle);
    return recommendClub(touchDist.toGreen);
  }, [touchDist, holeView]);

  const setTarget = useCallback((pt, source) => {
    setTargetPoint(pt);
    setTargetSource(source);
  }, []);

  const cycleViewMode = useCallback(() => {
    setViewMode((m) => {
      const idx = MODE_CYCLE.indexOf(m);
      const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
      localStorage.setItem(VIEW_MODE_KEY, next);
      return next;
    });
  }, []);

  const toggleZoom = useCallback(() => setZoomMode((z) => !z), []);

  useEffect(() => {
    setTargetPoint(null);
    setTargetSource(null);
    setZoomMode(false);
  }, [hole.number, selectedTee]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: [-87.98488, 42.29144],
      zoom: 16,
      bearing: 0,
      pitch: 0,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      doubleClickZoom: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", async () => {
      try {
        await registerGrassTextures(map);
      } catch (e) {
        console.warn("Grass textures unavailable", e);
      }
      const mode = localStorage.getItem(VIEW_MODE_KEY) || "pga";
      addMapSources(map, VIEW_MODES[mode]?.usePatterns !== false);
      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      teeMarkerRef.current?.remove();
      greenMarkerRef.current?.remove();
      pinMarkersRef.current.forEach((m) => m.remove());
      pinMarkersRef.current = [];
      targetMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const mode = VIEW_MODES[viewMode] || VIEW_MODES.pga;
    if (map.getLayer("esri-satellite")) {
      map.setPaintProperty("esri-satellite", "raster-opacity", mode.satelliteOpacity);
    }
    const showSim = viewMode !== "satellite";
    for (const spec of PGA_LAYER_STACK) {
      if (!map.getLayer(spec.id)) continue;
      map.setLayoutProperty(spec.id, "visibility", showSim ? "visible" : "none");
      if (mode.usePatterns && spec.texture && !spec.shadow) {
        map.setPaintProperty(spec.id, "fill-pattern", spec.texture);
        map.setPaintProperty(spec.id, "fill-opacity", spec.opacity);
        map.setPaintProperty(spec.id, "fill-outline-color", "rgba(0,0,0,0.12)");
      } else {
        map.setPaintProperty(spec.id, "fill-pattern", undefined);
        const paint = layerPaint(spec, false);
        for (const [key, val] of Object.entries(paint)) {
          map.setPaintProperty(spec.id, key, val);
        }
      }
    }
  }, [viewMode, mapReady]);

  const fitHole = useCallback(() => {
    const map = mapRef.current;
    if (!map || !holeView) return;
    const { tee, green, line, layups, brg } = holeView;
    const bounds = holeBoundsForView(tee, green, holeGps.centerline || line, layups, brg);
    map.fitBounds(bounds, {
      padding: zoomMode
        ? { top: 100, bottom: 100, left: 72, right: 40 }
        : { top: 100, bottom: 150, left: 72, right: 40 },
      bearing: brg,
      maxZoom: zoomMode ? 17 : 15,
      duration: 500,
      essential: true,
    });
  }, [holeView, holeGps, zoomMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !holeView) return;

    const { tee, green, line, layups, ticks, features, pins } = holeView;

    map.getSource(MAP_LAYERS.treesSource)?.setData(features.trees);
    map.getSource(MAP_LAYERS.roughSource)?.setData(features.rough);
    map.getSource(MAP_LAYERS.fairwaySource)?.setData(features.fairway);
    map.getSource(MAP_LAYERS.teeSource)?.setData(features.tee);
    map.getSource(MAP_LAYERS.waterSource)?.setData(features.water);
    map.getSource(MAP_LAYERS.bunkerSource)?.setData(features.bunker);
    map.getSource(MAP_LAYERS.fringeSource)?.setData(features.fringe);
    map.getSource(MAP_LAYERS.greenSource)?.setData(features.green);

    map.getSource(MAP_LAYERS.centerlineSource)?.setData({
      type: "FeatureCollection",
      features: [centerlineToGeoJson(line)],
    });
    map.getSource(MAP_LAYERS.yardageSource)?.setData(markersToGeoJson(layups));
    map.getSource(MAP_LAYERS.teeYardageSource)?.setData(markersToGeoJson(ticks));

    map.getSource(MAP_LAYERS.layupArcsSource)?.setData(
      zoomMode ? layupArcsFromGreen(green, tee) : { type: "FeatureCollection", features: [] }
    );
    if (map.getLayer(MAP_LAYERS.layupArcs)) {
      map.setLayoutProperty(MAP_LAYERS.layupArcs, "visibility", zoomMode ? "visible" : "none");
    }

    fitHole();

    teeMarkerRef.current?.remove();
    const teeEl = document.createElement("div");
    teeEl.innerHTML = `<div style="width:14px;height:14px;border-radius:50%;background:${teeColor};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.6)"></div>`;
    teeMarkerRef.current = new maplibregl.Marker({ element: teeEl, anchor: "center" })
      .setLngLat([tee.lon, tee.lat])
      .addTo(map);

    greenMarkerRef.current?.remove();
    const pinEl = document.createElement("div");
    pinEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.65))"><div style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:16px solid #dc2626"></div><div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#fde047,#f59e0b);border:2.5px solid #fff;margin-top:-4px;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div></div>`;
    greenMarkerRef.current = new maplibregl.Marker({ element: pinEl, anchor: "bottom" })
      .setLngLat([green.lon, green.lat])
      .addTo(map);

    pinMarkersRef.current.forEach((m) => m.remove());
    pinMarkersRef.current = [
      { pt: pins.front, label: "F", color: "#64748b", key: "front" },
      { pt: green, label: "M", color: "#94a3b8", key: "middle" },
      { pt: pins.back, label: "B", color: "#64748b", key: "back" },
    ].map(({ pt, label, color, key }) => {
      const el = document.createElement("div");
      el.innerHTML = pinMarkerHtml(label, color, targetSource === key);
      return new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([pt.lon, pt.lat])
        .addTo(map);
    });
  }, [holeView, holeGps, mapReady, teeColor, zoomMode, fitHole, targetSource]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    targetMarkerRef.current?.remove();
    targetMarkerRef.current = null;

    const src = map.getSource(MAP_LAYERS.targetLineSource);
    if (!src || !holeView) return;

    const showTarget = targetPoint && targetSource !== "middle";
    if (showTarget) {
      const crossEl = document.createElement("div");
      crossEl.innerHTML = `<div style="width:24px;height:24px;border:2.5px solid #1e6fd9;border-radius:50%;background:rgba(30,111,217,0.2);box-shadow:0 0 0 1px rgba(0,0,0,0.4);position:relative"><div style="position:absolute;top:50%;left:3px;right:3px;height:1.5px;background:#fff;transform:translateY(-50%)"></div><div style="position:absolute;left:50%;top:3px;bottom:3px;width:1.5px;background:#fff;transform:translateX(-50%)"></div></div>`;
      targetMarkerRef.current = new maplibregl.Marker({ element: crossEl, anchor: "center" })
        .setLngLat([targetPoint.lon, targetPoint.lat])
        .addTo(map);

      src.setData({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [targetPoint.lon, targetPoint.lat],
            [holeView.green.lon, holeView.green.lat],
          ],
        },
      });
    } else {
      src.setData({ type: "FeatureCollection", features: [] });
    }
  }, [targetPoint, targetSource, holeView, mapReady]);

  const handleMapClick = useCallback(
    (e) => {
      if (!holeGps) return;
      const now = Date.now();
      if (now - lastTapRef.current < 320) {
        lastTapRef.current = 0;
        toggleZoom();
        return;
      }
      lastTapRef.current = now;
      const pt = lngLatFromEvent(mapRef.current, e);
      setTarget(pt, "map");
    },
    [holeGps, setTarget, toggleZoom]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.on("click", handleMapClick);
    return () => map.off("click", handleMapClick);
  }, [handleMapClick, mapReady]);

  const clearTarget = useCallback((e) => {
    e?.stopPropagation?.();
    setTargetPoint(null);
    setTargetSource(null);
  }, []);

  const selectGreenPin = useCallback(
    (key) => {
      if (!holeView) return;
      const pt =
        key === "front" ? holeView.pins.front : key === "back" ? holeView.pins.back : holeView.green;
      setTarget(pt, key);
    },
    [holeView, setTarget]
  );

  const selectHazard = useCallback(
    (hazard) => setTarget({ lat: hazard.lat, lon: hazard.lon }, hazard.id),
    [setTarget]
  );

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = null;
      if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 50) return;
      if (dx < 0 && hasNext) onNextHole?.();
      if (dx > 0 && hasPrev) onPrevHole?.();
    },
    [hasPrev, hasNext, onPrevHole, onNextHole]
  );

  if (!holeGps) {
    return (
      <div className="flex items-center justify-center h-full min-h-[420px] bg-gray-900 text-gray-400">
        No GPS data for hole {hole.number}
      </div>
    );
  }

  const { greenDist, hazards } = holeView;
  const slideClass = slideDir === "prev" ? "hole-slide-enter-prev" : "hole-slide-enter";

  const isPga = viewMode === "pga" || viewMode === "simulated";

  return (
    <div
      className={`hole-map-root relative w-full h-full min-h-[420px] bg-[#0a1a10] ${chromeVisible ? "" : "chrome-hidden"} ${isPga ? "pga-mode" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={containerRef} className={`hole-map-canvas absolute inset-0 w-full h-full ${slideClass}`} />
      <div className="hole-map-vignette absolute inset-0 pointer-events-none z-10" />
      <div className="hole-map-sunlight absolute inset-0 pointer-events-none z-10" />

      {/* Top bar: F/M/B + club recommendation */}
      <div className={`hole-chrome absolute top-0 inset-x-0 z-20 ${slideClass}`}>
        <div className="bg-gradient-to-b from-black/90 via-black/65 to-transparent pt-2 pb-10 px-3">
          <div className="flex items-start justify-between gap-2 max-w-lg mx-auto">
            <div className="flex flex-1 justify-around pt-1">
              {[
                { label: "FRONT", value: greenDist.front, key: "front" },
                { label: "MIDDLE", value: greenDist.middle, key: "middle", highlight: true },
                { label: "BACK", value: greenDist.back, key: "back" },
              ].map(({ label, value, key, highlight }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectGreenPin(key)}
                  className={`green-dist-btn text-center px-2 py-1 ${targetSource === key ? "active" : ""}`}
                >
                  <div className="text-[9px] font-bold tracking-widest text-white/60">{label}</div>
                  <div
                    className={`text-3xl font-bold tabular-nums leading-none mt-0.5 ${
                      highlight ? "text-white" : "text-white/85"
                    }`}
                  >
                    {value}
                  </div>
                </button>
              ))}
            </div>
            {clubRec && (
              <div className="club-pill rounded-xl px-3 py-2 text-center flex-shrink-0 mt-1">
                <div className="text-[9px] text-blue-100/80 uppercase tracking-wide font-semibold">Club</div>
                <div className="text-xl font-bold text-white leading-tight">{clubRec.abbr}</div>
                <div className="text-[9px] text-blue-100/70">{clubRec.yards}y avg</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Left hazard column */}
      {hazards.length > 0 && (
        <div className={`hole-chrome absolute left-2 top-[108px] z-20 flex flex-col gap-1 max-w-[72px] ${slideClass}`}>
          {hazards.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => selectHazard(h)}
              className={`hazard-btn rounded-lg px-2 py-1.5 text-left bg-black/65 backdrop-blur-sm ${
                targetSource === h.id ? "active" : ""
              }`}
            >
              <div className="text-[9px] text-white/50 uppercase truncate">{h.label}</div>
              <div className="text-lg font-bold text-white tabular-nums leading-none">{h.yards}</div>
            </button>
          ))}
        </div>
      )}

      {/* Hole badge — compact when hazards column visible */}
      <div className={`hole-chrome absolute top-[100px] z-20 ${slideClass}`} style={{ left: hazards.length ? 80 : 12 }}>
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1">
          <span className="text-white text-base font-bold">{hole.number}</span>
          <span className="text-white/55 text-[10px] ml-1">P{hole.par}</span>
          {hole.handicap && (
            <span className="text-white/35 text-[10px] ml-1">#{hole.handicap}</span>
          )}
        </div>
      </div>

      {/* Top-right controls */}
      <div className={`hole-chrome absolute top-[100px] right-3 z-20 flex gap-1 ${slideClass}`}>
        <button
          type="button"
          onClick={() => setChromeVisible((v) => !v)}
          className="bg-black/70 backdrop-blur-sm rounded-full p-2 hover:bg-black/85 transition"
          aria-label={chromeVisible ? "Hide UI" : "Show UI"}
        >
          {chromeVisible ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-white" />}
        </button>
        <button
          type="button"
          onClick={toggleZoom}
          className={`backdrop-blur-sm rounded-full p-2 hover:bg-black/85 transition ${
            zoomMode ? "zoom-badge" : "bg-black/70"
          }`}
          aria-label="Zoom mode"
          title="Double-tap map or tap here for zoom"
        >
          {zoomMode ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
        </button>
        <button
          type="button"
          onClick={cycleViewMode}
          className="bg-black/70 backdrop-blur-sm rounded-full px-2.5 py-2 hover:bg-black/85 transition"
          aria-label="Change map view"
        >
          <Layers className="w-4 h-4 text-white" />
        </button>
        <button
          type="button"
          onClick={onPrevHole}
          disabled={!hasPrev}
          className="bg-black/70 backdrop-blur-sm rounded-full p-2 disabled:opacity-30 hover:bg-black/85 transition"
          aria-label="Previous hole"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          type="button"
          onClick={onNextHole}
          disabled={!hasNext}
          className="bg-black/70 backdrop-blur-sm rounded-full p-2 disabled:opacity-30 hover:bg-black/85 transition"
          aria-label="Next hole"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* TouchPoint readout */}
      {touchDist && targetSource && targetSource !== "middle" && (
        <div className={`hole-chrome absolute top-[128px] left-1/2 -translate-x-1/2 z-20 ${slideClass}`}>
          <div className="bg-black/85 backdrop-blur-md rounded-2xl px-6 py-3 flex items-center gap-5 relative border border-white/10">
            <button
              type="button"
              onClick={clearTarget}
              className="absolute -top-2 -right-2 bg-black/90 rounded-full p-1 hover:bg-black transition"
              aria-label="Clear target"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            <div className="text-center">
              <div className="text-4xl font-bold text-white tabular-nums leading-none">{touchDist.fromTee}</div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">to target</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-4xl font-bold leading-none tabular-nums" style={{ color: GOLFSHOT_BLUE }}>
                {touchDist.toGreen}
              </div>
              <div className="text-[10px] text-white/50 uppercase tracking-wider mt-1">to green</div>
            </div>
          </div>
        </div>
      )}

      {!targetSource && (
        <div className={`hole-chrome absolute top-[128px] left-1/2 -translate-x-1/2 z-20 pointer-events-none ${slideClass}`}>
          <div className="bg-black/45 backdrop-blur-sm rounded-full px-4 py-1.5">
            <span className="text-white/60 text-[10px] uppercase tracking-wide">
              Tap map · F/M/B · hazards
            </span>
          </div>
        </div>
      )}

      {/* Bottom: hole strip + tees */}
      <div className={`hole-chrome absolute bottom-0 inset-x-0 z-20 ${slideClass}`}>
        <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-8 pb-4 px-3">
          <div className="flex justify-center gap-1 mb-3 flex-wrap max-w-md mx-auto">
            {Array.from({ length: holeCount }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectHole?.(i)}
                className={`hole-dot h-1.5 rounded-full ${
                  i === hole.number - 1 ? "active bg-white" : "w-1.5 bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Hole ${i + 1}`}
              />
            ))}
          </div>
          {tees && (
            <div className="flex flex-wrap gap-1.5 justify-center mb-2">
              {tees.map((tee) => {
                const active = selectedTee === tee.id;
                return (
                  <button
                    key={tee.id}
                    type="button"
                    onClick={() => onSelectTee?.(tee.id)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition ${
                      active ? "bg-white text-gray-900 shadow-md" : "bg-white/12 text-white hover:bg-white/22"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/40"
                      style={{ backgroundColor: tee.color }}
                    />
                    {tee.name}
                  </button>
                );
              })}
            </div>
          )}
          <div className="text-center flex items-center justify-center gap-3">
            <span className="text-white/50 text-xs">Hole {hole.number}</span>
            <span className="text-white font-bold text-sm">{yardage} yards</span>
            <span className="text-white/50 text-xs">Par {hole.par}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
