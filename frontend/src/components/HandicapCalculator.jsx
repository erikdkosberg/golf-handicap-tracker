import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../api";

const STANDARD_RATING = 72.0;
const STANDARD_SLOPE = 113;
const STANDARD_PAR = 72;

export default function HandicapCalculator({
  token,
  handicap,
  improvementCutoff,
  maintainCutoff,
  calculatorDefaults,
}) {
  const [score, setScore] = useState("");
  const [course_rating, setCourseRating] = useState("");
  const [course_slope, setCourseSlope] = useState("");
  const [projected, setProjected] = useState(null);
  const [differential, setDifferential] = useState(null);
  const defaultsApplied = useRef(false);

  useEffect(() => {
    if (defaultsApplied.current) return;

    const defaults = calculatorDefaults || {};
    const hasDefaults =
      defaults.score != null ||
      handicap != null ||
      defaults.course_rating != null ||
      defaults.course_slope != null;

    if (!hasDefaults) return;

    if (defaults.score != null) {
      setScore(String(defaults.score));
    } else if (handicap != null) {
      setScore(String(Math.round(STANDARD_PAR + handicap)));
    }

    setCourseRating(
      String(defaults.course_rating ?? STANDARD_RATING)
    );
    setCourseSlope(String(defaults.course_slope ?? STANDARD_SLOPE));
    defaultsApplied.current = true;
  }, [handicap, calculatorDefaults]);

  const calculate = async (e) => {
    e.preventDefault();
    const payload = {
      score: Math.round(Number(score)),
      course_rating: Number(course_rating),
      course_slope: Math.round(Number(course_slope)),
    };
    if (
      [payload.score, payload.course_rating, payload.course_slope].some(
        (value) => Number.isNaN(value)
      )
    ) {
      setProjected("Enter valid numbers");
      setDifferential(null);
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/handicap/calculate`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjected(
        res.data.projected_handicap ?? "N/A (need at least 3 qualifying rounds)"
      );
      setDifferential(res.data.projected_differential);
    } catch (err) {
      const message =
        err.response?.data?.detail?.[0]?.msg ||
        err.response?.data?.message ||
        "Could not calculate — is the backend running?";
      setProjected(message);
      setDifferential(null);
    }
  };

  return (
    <>
      <span className="font-semibold text-indigo-700 mb-1">
        What-If Handicap Calculator
      </span>
      <form
        className="flex flex-wrap gap-2 w-full items-end"
        onSubmit={calculate}
      >
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-full sm:w-24 flex-shrink"
          type="number"
          placeholder="Score"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          required
        />
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-full sm:w-24 flex-shrink"
          type="number"
          step="0.1"
          placeholder="Rating"
          value={course_rating}
          onChange={(e) => setCourseRating(e.target.value)}
          required
        />
        <input
          className="border border-gray-300 rounded px-2 py-1 text-base w-full sm:w-24 flex-shrink"
          type="number"
          placeholder="Slope"
          value={course_slope}
          onChange={(e) => setCourseSlope(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-emerald-600 text-white px-4 py-1 rounded-lg border border-emerald-700 shadow-sm hover:bg-emerald-700 transition font-semibold w-full sm:w-auto"
          style={{ minWidth: "70px" }}
        >
          Project
        </button>
      </form>
      {projected !== null && (
        <span className="block text-emerald-700 mt-2">
          Projected Handicap: {projected}
          {differential !== null && (
            <> &nbsp;&middot;&nbsp; Differential: {Number(differential).toFixed(1)}</>
          )}
        </span>
      )}
      {improvementCutoff !== null && improvementCutoff !== undefined && (
        <span className="block text-yellow-700 mt-2">
          To improve or maintain your handicap, your next round must have a differential lower than{" "}
          <b>{Number(improvementCutoff).toFixed(1)}</b>
        </span>
      )}
      {maintainCutoff !== null && maintainCutoff !== undefined && (
        <span className="block text-amber-700 mt-2">
          Your next round will drop a round from your handicap calculation. To keep your handicap
          where it is, shoot{" "}
          <b>
            {Math.round(
              (maintainCutoff * STANDARD_SLOPE) / 113 + STANDARD_RATING
            )}
          </b>{" "}
          or better (~<b>{Number(maintainCutoff).toFixed(1)}</b> differential) on a standard slope {STANDARD_SLOPE} and rating {STANDARD_RATING} course.
        </span>
      )}
    </>
  );
}
