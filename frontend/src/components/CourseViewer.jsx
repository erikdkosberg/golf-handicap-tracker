import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";
import { loadCoursePackage, COURSE_REGISTRY } from "../courses/registry";
import HoleMap from "./HoleMap";

function getNineTotals(course, selectedTee, nine) {
  const holes = nine === "front" ? course.holes.slice(0, 9) : course.holes.slice(9, 18);
  return {
    par: holes.reduce((s, h) => s + h.par, 0),
    yards: holes.reduce((s, h) => s + h.yardages[selectedTee], 0),
  };
}

function ScorecardStrip({ course, selectedTee, activeHole, onSelectHole }) {
  const front = getNineTotals(course, selectedTee, "front");
  const back = getNineTotals(course, selectedTee, "back");

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-3 overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold uppercase mb-1">
          {course.holes.map((h) => (
            <button
              key={h.number}
              type="button"
              onClick={() => onSelectHole(h.number - 1)}
              className={`w-8 text-center rounded transition ${
                activeHole === h.number - 1
                  ? "text-emerald-400 bg-emerald-400/15 font-bold"
                  : "hover:text-emerald-300"
              }`}
            >
              {h.number}
            </button>
          ))}
          <span className="w-10 text-center text-gray-500">OUT</span>
          <span className="w-10 text-center text-gray-500">IN</span>
          <span className="w-10 text-center text-gray-400">TOT</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          {course.holes.map((h) => (
            <span key={h.number} className="w-8 text-center">{h.par}</span>
          ))}
          <span className="w-10 text-center font-semibold">{front.par}</span>
          <span className="w-10 text-center font-semibold">{back.par}</span>
          <span className="w-10 text-center font-semibold">{course.par}</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-gray-300">
          {course.holes.map((h) => (
            <span key={h.number} className="w-8 text-center">{h.yardages[selectedTee]}</span>
          ))}
          <span className="w-10 text-center font-semibold text-emerald-400">{front.yards}</span>
          <span className="w-10 text-center font-semibold text-emerald-400">{back.yards}</span>
          <span className="w-10 text-center font-bold text-emerald-300">
            {front.yards + back.yards}
          </span>
        </div>
      </div>
    </div>
  );
}

const teeStorageKey = (id) => `golf-tee-${id}`;

export default function CourseViewer({ courseId = "pine-meadow", onBack }) {
  const [course, setCourse] = useState(null);
  const [gps, setGps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTee, setSelectedTee] = useState(
    () => localStorage.getItem(teeStorageKey(courseId)) || "white"
  );
  const [activeHole, setActiveHole] = useState(0);
  const [slideDir, setSlideDir] = useState("next");
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadCoursePackage(courseId)
      .then(({ scorecard, gps: gpsData }) => {
        setCourse(scorecard);
        setGps(gpsData);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  const goToHole = useCallback(
    (index) => {
      if (!course) return;
      setSlideDir(index > activeHole ? "next" : "prev");
      setActiveHole(Math.max(0, Math.min(course.holes.length - 1, index)));
    },
    [course, activeHole]
  );

  const handleTeeChange = useCallback(
    (teeId) => {
      setSelectedTee(teeId);
      localStorage.setItem(teeStorageKey(courseId), teeId);
    },
    [courseId]
  );

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") goToHole(activeHole - 1);
      if (e.key === "ArrowRight") goToHole(activeHole + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeHole, goToHole]);

  if (loading || !course || !gps) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center text-gray-400">
        Loading course map…
      </div>
    );
  }

  const teeInfo = course.tees.find((t) => t.id === selectedTee) || course.tees[3];
  const hole = course.holes[activeHole];
  const holeGps = gps.holes[String(hole.number)];
  const yardage = hole.yardages[selectedTee];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Slim header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-gray-950/95 border-b border-gray-800/80">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-0.5 text-gray-400 hover:text-white text-xs font-medium py-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="text-center pointer-events-none">
          <div className="text-white text-xs font-semibold leading-tight">{course.name}</div>
        </div>
        {COURSE_REGISTRY.length > 1 ? (
          <select
            className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300"
            value={courseId}
            onChange={() => {}}
            disabled
            aria-label="Course selector"
          >
            {COURSE_REGISTRY.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* Full-screen map */}
      <div className="flex-1 min-h-0 relative">
        <HoleMap
          hole={hole}
          holeGps={holeGps}
          courseId={courseId}
          selectedTee={selectedTee}
          teeColor={teeInfo.color}
          yardage={yardage}
          tees={course.tees}
          holeCount={course.holes.length}
          slideDir={slideDir}
          onSelectTee={handleTeeChange}
          onSelectHole={goToHole}
          onPrevHole={() => goToHole(activeHole - 1)}
          onNextHole={() => goToHole(activeHole + 1)}
          hasPrev={activeHole > 0}
          hasNext={activeHole < course.holes.length - 1}
        />
      </div>

      {/* Collapsible hole details + scorecard */}
      <div className="flex-shrink-0 bg-gray-950 border-t border-gray-800">
        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2 text-gray-400 hover:text-gray-200 text-xs uppercase tracking-wide"
        >
          <span>Hole info & scorecard</span>
          {detailsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {detailsOpen && (
          <div className="px-3 pb-3 space-y-3 max-h-[40vh] overflow-y-auto">
            <p className="text-gray-400 text-sm leading-relaxed px-1">{hole.description}</p>
            <div className="flex flex-wrap gap-2 px-1">
              {hole.layout.dogleg && hole.layout.dogleg !== "none" && (
                <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded-full capitalize">
                  Dogleg {hole.layout.dogleg.replace("-", " → ")}
                </span>
              )}
              {hole.layout.water && (
                <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full capitalize">
                  Water {hole.layout.water}
                </span>
              )}
            </div>
            <ScorecardStrip
              course={course}
              selectedTee={selectedTee}
              activeHole={activeHole}
              onSelectHole={goToHole}
            />
          </div>
        )}
      </div>
    </div>
  );
}
