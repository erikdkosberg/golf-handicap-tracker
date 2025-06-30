import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import RoundRow from "./RoundRow";
import AddRoundForm from "./AddRoundForm";
import HandicapCalculator from "./HandicapCalculator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import API_URL from "../api";

function calcHandicapFromRounds(rounds) {
  const differentials = rounds
    .filter((r) => r.differential !== null && !isNaN(r.differential))
    .map((r) => r.differential)
    .sort((a, b) => a - b);
  if (!differentials.length) return null;
  const count = Math.min(8, differentials.length);
  const avg = differentials.slice(0, count).reduce((a, b) => a + b, 0) / count;
  return Number((avg * 0.96).toFixed(2));
}

export default function Dashboard({ token, onLogout }) {
  const [rounds, setRounds] = useState([]);
  const [handicap, setHandicap] = useState(null);
  const [username, setUsername] = useState("Golfer");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  const fetchRounds = useCallback(async () => {
    const res = await axios.get(`${API_URL}/rounds`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRounds(res.data);
  }, [token]);

  const fetchHandicap = useCallback(async () => {
    const res = await axios.get(`${API_URL}/handicap`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setHandicap(res.data.handicap);
  }, [token]);

  const fetchUsername = useCallback(async () => {
    const res = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsername(res.data.username || res.data.email || "Golfer");
  }, [token]);

  useEffect(() => {
    fetchRounds();
    fetchHandicap();
    fetchUsername();
  }, [fetchRounds, fetchHandicap, fetchUsername]);

  const handleDelete = async (id) => {
    await axios.delete(`${API_URL}/rounds/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchRounds();
    fetchHandicap();
  };

  const roundsWithDifferential = rounds.map((r) => ({
    ...r,
    differential:
      r.course_slope && r.course_rating
        ? ((r.score - r.course_rating) * 113) / r.course_slope
        : null,
  }));

  const last20 = [...roundsWithDifferential]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  const lowestRound = rounds.reduce(
    (min, r) => (r.score < min.score ? r : min),
    rounds[0] || {}
  );
  const lowestDiff = roundsWithDifferential.reduce(
    (min, r) =>
      r.differential !== null && r.differential < min.differential ? r : min,
    roundsWithDifferential[0] || {}
  );
  const avgDiff =
    last20
      .filter((r) => r.differential !== null)
      .reduce((a, r) => a + r.differential, 0) /
    (last20.filter((r) => r.differential !== null).length || 1);

  const last10 = last20.slice(0, 10);

  // Handicap Trend
  const sortedLast10 = [...last10].sort((a, b) => a.date.localeCompare(b.date));
  let trendHandicaps = [];
  let priorRoundsTrend = [];
  sortedLast10.forEach((r) => {
    let handicapAtTime;
    if (priorRoundsTrend.length === 0) {
      handicapAtTime =
        r.differential !== null
          ? Number((r.differential * 0.96).toFixed(2))
          : null;
    } else {
      handicapAtTime = calcHandicapFromRounds(priorRoundsTrend);
    }
    trendHandicaps.push(handicapAtTime);
    priorRoundsTrend = [...priorRoundsTrend, r];
  });
  const handicapTrend =
    trendHandicaps.length > 1
      ? trendHandicaps[trendHandicaps.length - 1] - trendHandicaps[0]
      : null;

  // Sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const sortedRounds = [...roundsWithDifferential].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (
      [
        "score",
        "course_rating",
        "course_slope",
        "yardage",
        "par",
        "differential",
      ].includes(sortField)
    ) {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }
    if (aVal === undefined) aVal = "";
    if (bVal === undefined) bVal = "";
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Chart Data
  const sortedByDate = [...last20].sort((a, b) => a.date.localeCompare(b.date));
  let priorRounds = [];
  const chartData = sortedByDate.map((r) => {
    let handicapBefore;
    if (priorRounds.length === 0) {
      handicapBefore =
        r.differential !== null
          ? Number((r.differential * 0.96).toFixed(2))
          : null;
    } else {
      handicapBefore = calcHandicapFromRounds(priorRounds);
    }
    priorRounds = [...priorRounds, r];
    return {
      date: r.date,
      Score: r.score,
      Differential:
        r.differential !== null ? Number(r.differential.toFixed(2)) : null,
      Handicap: handicapBefore,
    };
  });

  // Date format helper
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 sm:gap-0">
        <h1 className="text-2xl font-bold text-indigo-900 text-center sm:text-left">
          Hello, {username}!
        </h1>
        <button
          onClick={onLogout}
          className="bg-gray-200 rounded px-6 py-2 font-semibold hover:bg-gray-300 w-full sm:w-auto"
        >
          Log Out
        </button>
      </div>

      {/* Top section: Responsive columns */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 h-auto md:h-[400px]">
        {/* Left: Stacked stats */}
        <div className="flex flex-col gap-6 min-w-[220px] md:w-[260px] h-full">
          <div className="bg-indigo-50 rounded-xl shadow-inner p-4 sm:p-6 flex flex-col items-center justify-center h-1/2 min-h-[120px]">
            <span className="text-base text-gray-600 mb-2">
              Current Handicap
            </span>
            <span className="text-3xl font-bold">
              {handicap !== null ? handicap : "N/A"}
            </span>
          </div>
          <div className="bg-green-50 rounded-xl shadow-inner p-4 sm:p-6 flex flex-col items-center justify-center h-1/2 min-h-[120px]">
            <span className="text-base text-gray-600 mb-1">
              Lowest Round to Par
            </span>
            <span className="text-3xl font-bold mb-1">
              {lowestRound
                ? (() => {
                    if (
                      typeof lowestRound.par === "number" &&
                      lowestRound.par
                    ) {
                      const diff = lowestRound.score - lowestRound.par;
                      if (diff === 0) return `${lowestRound.score} (E)`;
                      return `${lowestRound.score} (${diff > 0 ? "+" : ""}${diff})`;
                    }
                    return lowestRound.score;
                  })()
                : "N/A"}
            </span>
            {lowestRound && (
              <div className="text-xs text-gray-600 text-center mt-1">
                {lowestRound.date ? (
                  <>{formatDate(lowestRound.date)} &middot; </>
                ) : null}
                {lowestRound.course && (
                  <>
                    {lowestRound.course}
                    {lowestRound.tees ? ` (${lowestRound.tees})` : ""}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Right: Add Round + WhatIf stacked */}
        <div className="flex flex-col gap-6 flex-1 h-full">
          <div className="bg-blue-50 rounded-xl shadow-inner p-4 sm:p-6 flex-1 flex flex-col justify-between min-h-[156px] overflow-x-auto">
            <AddRoundForm
              token={token}
              onAdd={() => {
                fetchRounds();
                fetchHandicap();
              }}
            />
          </div>
          <div className="bg-blue-50 rounded-xl shadow-inner p-4 sm:p-6 flex-1 flex flex-col justify-between min-h-[156px] overflow-x-auto">
            <HandicapCalculator token={token} />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 my-8">
        <div className="bg-orange-50 rounded-xl shadow-inner p-4 flex flex-col items-center">
          <span className="text-xs text-gray-600">Total Rounds</span>
          <span className="text-xl font-bold mt-2">{rounds.length}</span>
        </div>
        <div className="bg-blue-50 rounded-xl shadow-inner p-4 flex flex-col items-center">
          <span className="text-xs text-gray-600">Lowest Differential</span>
          <span className="text-xl font-bold mt-2">
            {lowestDiff && lowestDiff.differential !== undefined
              ? lowestDiff.differential.toFixed(1)
              : "N/A"}
          </span>
        </div>
        <div className="bg-yellow-50 rounded-xl shadow-inner p-4 flex flex-col items-center">
          <span className="text-xs text-gray-600">
            Average Differential (20)
          </span>
          <span className="text-xl font-bold mt-2">
            {avgDiff && !isNaN(avgDiff) ? avgDiff.toFixed(1) : "N/A"}
          </span>
        </div>
        <div className="bg-lime-50 rounded-xl shadow-inner p-4 flex flex-col items-center">
          <span className="text-xs text-gray-600">Handicap Trend (10)</span>
          <span
            className={`text-xl font-bold mt-2 flex items-center ${handicapTrend > 0 ? "text-red-700" : "text-green-700"}`}
          >
            {handicapTrend !== null ? (
              <>
                {handicapTrend > 0 ? (
                  <svg
                    width={18}
                    height={18}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                ) : (
                  <svg
                    width={18}
                    height={18}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                )}
                {Math.abs(handicapTrend).toFixed(2)}
              </>
            ) : (
              "N/A"
            )}
          </span>
        </div>
      </div>

      {/* Chart Card */}
      <div className="bg-white rounded-xl shadow-inner p-4 sm:p-6 mb-8">
        <span className="text-base font-semibold text-indigo-800 mb-2 block">
          Score, Differential & Handicap (Last 20 Rounds)
        </span>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              label={{
                value: "Score",
                angle: -90,
                position: "insideLeft",
                fontSize: 12,
              }}
              tick={{ fontSize: 11 }}
              width={40}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{
                value: "Handicap / Diff",
                angle: 90,
                position: "insideRight",
                fontSize: 12,
              }}
              tick={{ fontSize: 11 }}
              width={40}
            />
            <Tooltip />
            <Legend />
            <Line
              type="linear"
              dataKey="Score"
              yAxisId="left"
              stroke="#6366f1"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="linear"
              dataKey="Handicap"
              yAxisId="right"
              stroke="#a21caf"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="linear"
              dataKey="Differential"
              yAxisId="right"
              stroke="#22c55e"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Past Rounds Table */}
      <div className="mb-12">
        <div className="text-lg font-semibold mb-2">Past Rounds</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("date")}
                >
                  Date{" "}
                  {sortField === "date" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("score")}
                >
                  Score{" "}
                  {sortField === "score" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("course_rating")}
                >
                  Rating{" "}
                  {sortField === "course_rating" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("course_slope")}
                >
                  Slope{" "}
                  {sortField === "course_slope" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("course")}
                >
                  Course{" "}
                  {sortField === "course" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("tees")}
                >
                  Tees{" "}
                  {sortField === "tees" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("yardage")}
                >
                  Yardage{" "}
                  {sortField === "yardage" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("par")}
                >
                  Par{" "}
                  {sortField === "par" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort("differential")}
                >
                  Differential{" "}
                  {sortField === "differential" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedRounds.map((r) => (
                <RoundRow
                  key={r.id}
                  round={{ ...r, date: formatDate(r.date) }}
                  token={token}
                  onUpdate={() => {
                    fetchRounds();
                    fetchHandicap();
                  }}
                  onDelete={handleDelete}
                  differential={r.differential}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
