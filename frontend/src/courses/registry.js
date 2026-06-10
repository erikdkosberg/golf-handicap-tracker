/**
 * Course registry — add new courses here.
 * Each course is a self-contained package under ./<courseId>/
 */
export const COURSE_REGISTRY = [
  {
    id: "pine-meadow",
    name: "Pine Meadow Golf Club",
    location: "Mundelein, IL",
    loadScorecard: () => import("./pine-meadow/scorecard"),
    loadGps: () => import("./pine-meadow/gps.json"),
  },
];

export function getCourseEntry(courseId) {
  return COURSE_REGISTRY.find((c) => c.id === courseId) ?? COURSE_REGISTRY[0];
}

export async function loadCoursePackage(courseId) {
  const entry = getCourseEntry(courseId);
  const [scorecardMod, gpsMod] = await Promise.all([
    entry.loadScorecard(),
    entry.loadGps(),
  ]);
  const scorecard =
    scorecardMod.PINE_MEADOW ??
    scorecardMod.default ??
    scorecardMod;
  const gps = gpsMod.default ?? gpsMod;
  return { entry, scorecard, gps };
}
