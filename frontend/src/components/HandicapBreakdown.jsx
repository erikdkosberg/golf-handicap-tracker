import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API_URL from "../api";
import { formatDate } from "../utilities/utility";
import LoadingSpinner from "./LoadingSpinner";

function CalculationSteps({ calculation }) {
  if (!calculation) return null;

  return (
    <div className="bg-white rounded-xl shadow-inner p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-indigo-900 mb-4">
        Handicap Index Calculation
      </h2>
      <ol className="space-y-4">
        {calculation.steps.map((step) => (
          <li key={step.step} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 font-bold text-sm flex items-center justify-center">
              {step.step}
            </span>
            <div className="min-w-0">
              <p className="text-gray-800">{step.description}</p>
              {step.formula && (
                <p className="text-sm text-gray-500 font-mono mt-1">{step.formula}</p>
              )}
              <p className="text-indigo-700 font-semibold mt-1">
                {Array.isArray(step.value)
                  ? step.value.map((v) => Number(v).toFixed(1)).join(", ")
                  : typeof step.value === "number"
                    ? Number(step.value).toFixed(
                        step.step === 5 ? 1 : step.step >= 3 ? 4 : 0
                      )
                    : step.value}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
        <span className="text-gray-600">Handicap Index: </span>
        <span className="text-2xl font-bold text-indigo-800">
          {calculation.truncated_handicap_index}
        </span>
      </div>
    </div>
  );
}

function DifferentialDetail({ detail }) {
  if (!detail) return null;

  if (detail.excluded_reason) {
    return (
      <p className="text-xs text-amber-700 mt-1">{detail.excluded_reason}</p>
    );
  }

  const baseFormula = `(${detail.score} − ${detail.course_rating}) × 113 ÷ ${detail.course_slope}`;

  if (!detail.is_nine_hole_combined) {
    return (
      <div className="text-xs text-gray-500 mt-1 font-mono">
        <div>{detail.formula}</div>
        <div>
          {baseFormula} = {detail.raw_differential?.toFixed(4)} →{" "}
          <span className="text-indigo-700 font-semibold">
            {Number(detail.rounded_differential).toFixed(1)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-500 mt-1 font-mono space-y-0.5">
      <div>
        9-hole diff: {baseFormula} ={" "}
        {Number(detail.nine_hole_differential).toFixed(1)}
      </div>
      <div>
        Expected 9-hole (HI {Number(detail.handicap_index_at_time).toFixed(1)}):{" "}
        {Number(detail.expected_nine_hole_differential).toFixed(2)}
      </div>
      <div>
        Combined: {Number(detail.nine_hole_differential).toFixed(1)} +{" "}
        {Number(detail.expected_nine_hole_differential).toFixed(2)} →{" "}
        <span className="text-indigo-700 font-semibold">
          {Number(detail.combined_differential).toFixed(1)}
        </span>
      </div>
    </div>
  );
}

function RulesReference({ rules }) {
  return (
    <div className="bg-white rounded-xl shadow-inner p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-indigo-900 mb-4">
        World Handicap System References
      </h2>
      <ul className="space-y-4">
        {rules.map((rule) => (
          <li key={rule.rule} className="border-l-4 border-indigo-200 pl-4">
            <div className="font-semibold text-indigo-800">
              Rule {rule.rule}: {rule.title}
            </div>
            <p className="text-sm text-gray-600 mt-1">{rule.summary}</p>
            <a
              href={rule.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-800 underline mt-1 inline-block"
            >
              USGA Rules of Handicapping →
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-4">
        Source:{" "}
        <a
          href="https://www.usga.org/content/usga/home-page/rules-hub/rules-of-handicapping.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-indigo-700"
        >
          USGA Rules of Handicapping (World Handicap System)
        </a>
      </p>
    </div>
  );
}

export default function HandicapBreakdown({ token, onBack, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleAuthError = useCallback(
    (err) => {
      if (err.response?.status === 401) {
        onLogout();
      }
    },
    [onLogout]
  );

  useEffect(() => {
    if (!token) {
      onLogout();
      return;
    }

    axios
      .get(`${API_URL}/handicap/breakdown`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err.response?.status === 401) {
          handleAuthError(err);
          return;
        }
        if (err.response?.status === 404) {
          setError(
            "The breakdown endpoint is not available. Restart the backend server to pick up the latest code."
          );
          return;
        }
        if (!err.response) {
          setError("Could not reach the backend. Is the server running?");
          return;
        }
        const detail =
          err.response?.data?.message ||
          err.response?.data?.detail ||
          err.message;
        setError(`Could not load handicap breakdown: ${detail}`);
      })
      .finally(() => setLoading(false));
  }, [token, onLogout, handleAuthError]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "No data available."}</p>
        <button
          onClick={onBack}
          className="bg-gray-200 rounded px-6 py-2 font-semibold hover:bg-gray-300"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-800 font-semibold mb-2 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-indigo-900">
            Handicap Index Breakdown
          </h1>
          <p className="text-gray-600 mt-1">
            How your Handicap Index is calculated under the World Handicap System
          </p>
        </div>
        <div className="bg-indigo-50 rounded-xl shadow-inner px-8 py-4 text-center">
          <span className="text-base text-gray-600 block mb-1">Handicap Index</span>
          <span className="text-4xl font-bold text-indigo-800">
            {data.handicap_index !== null ? data.handicap_index : "N/A"}
          </span>
        </div>
      </div>

      {data.insufficient_rounds ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <p className="text-amber-800 font-medium">
            You need at least {data.minimum_rounds_required} acceptable score
            differentials to establish a Handicap Index (WHS Rule 5.2).
          </p>
          <p className="text-sm text-amber-700 mt-2">
            You currently have {data.total_score_differentials} score
            differential{data.total_score_differentials !== 1 ? "s" : ""} in
            your scoring record.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-600">Score Differentials in Record</div>
              <div className="text-2xl font-bold text-blue-800">
                {data.total_score_differentials}
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-600">Most Recent Window</div>
              <div className="text-2xl font-bold text-green-800">
                {data.rounds_in_window} of {data.window_size}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-600">Lowest Differentials Used</div>
              <div className="text-2xl font-bold text-yellow-800">
                {data.differentials_to_use}
              </div>
            </div>
          </div>

          <CalculationSteps calculation={data.calculation} />
        </>
      )}

      <div className="bg-white rounded-xl shadow-inner p-4 sm:p-6 mt-8">
        <h2 className="text-lg font-semibold text-indigo-900 mb-2">
          Rounds in the {data.window_size}-Score-Differential Window
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          These are your most recent {data.rounds_in_window} score differentials.
          Rows highlighted in green are the lowest {data.differentials_to_use}{" "}
          used in the calculation.
        </p>

        {data.window_rounds.length === 0 ? (
          <p className="text-gray-500">No qualifying rounds yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3 text-center">Holes</th>
                  <th className="py-2 pr-3 text-center">Score</th>
                  <th className="py-2 pr-3 text-center">Rating</th>
                  <th className="py-2 pr-3 text-center">Slope</th>
                  <th className="py-2 pr-3">Course</th>
                  <th className="py-2 pr-3 text-center">Differential</th>
                  <th className="py-2 text-center">Used</th>
                </tr>
              </thead>
              <tbody>
                {data.window_rounds.map((round) => (
                  <tr
                    key={round.id}
                    className={`border-b ${
                      round.used_in_calculation
                        ? "bg-green-50"
                        : ""
                    }`}
                  >
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {formatDate(round.date)}
                    </td>
                    <td className="py-3 pr-3 text-center">{round.hole_count}</td>
                    <td className="py-3 pr-3 text-center font-medium">
                      {round.score}
                    </td>
                    <td className="py-3 pr-3 text-center">
                      {round.course_rating}
                    </td>
                    <td className="py-3 pr-3 text-center">
                      {round.course_slope}
                    </td>
                    <td className="py-3 pr-3">
                      {round.course}
                      {round.tees ? ` (${round.tees})` : ""}
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <div className="font-semibold text-indigo-800">
                        {Number(round.differential).toFixed(1)}
                      </div>
                      <DifferentialDetail detail={round.differential_detail} />
                    </td>
                    <td className="py-3 text-center">
                      {round.used_in_calculation ? (
                        <span className="inline-block bg-green-200 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.excluded_nine_hole_rounds?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 mt-8">
          <h2 className="text-lg font-semibold text-amber-900 mb-2">
            Excluded 9-Hole Rounds
          </h2>
          <p className="text-sm text-amber-800 mb-3">
            These 9-hole rounds are not yet in your scoring record (WHS Rule 5.2b
            requires at least 54 holes posted).
          </p>
          <ul className="text-sm space-y-1">
            {data.excluded_nine_hole_rounds.map((r) => (
              <li key={r.id}>
                {formatDate(r.date)} — {r.course} — score {r.score}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-inner p-4 sm:p-6 mt-8">
        <h2 className="text-lg font-semibold text-indigo-900 mb-4">
          WHS Rule 5.2a — Differentials to Use
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Score Differentials Available</th>
                <th className="py-2 text-center">Number to Use</th>
              </tr>
            </thead>
            <tbody>
              {data.differentials_to_use_table.map((row) => {
                const isActive =
                  data.active_differentials_row ===
                  row.score_differentials_available;
                return (
                  <tr
                    key={row.score_differentials_available}
                    className={`border-b ${
                      isActive ? "bg-indigo-50 font-semibold text-indigo-800" : ""
                    }`}
                  >
                    <td className="py-2 pr-4">
                      {row.score_differentials_available}
                      {isActive && (
                        <span className="ml-2 text-xs text-indigo-600">
                          ← your situation
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-center">{row.count_to_use}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <RulesReference rules={data.rules} />
      </div>
    </div>
  );
}
