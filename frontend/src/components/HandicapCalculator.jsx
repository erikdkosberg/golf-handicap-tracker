import React, { useState } from "react";
import axios from "axios";
import API_URL from "../api";

export default function HandicapCalculator({ token }) {
  const [score, setScore] = useState("");
  const [course_rating, setCourseRating] = useState("");
  const [course_slope, setCourseSlope] = useState("");
  const [projected, setProjected] = useState(null);

  const calculate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_URL}/handicap/calculate`,
        {
          score: +score,
          course_rating: +course_rating,
          course_slope: +course_slope,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjected(res.data.projected_handicap);
    } catch {
      setProjected("Error");
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
        </span>
      )}
    </>
  );
}
