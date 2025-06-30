import React, { useState, useEffect } from "react";
import axios from "axios";
import RoundRow from "./RoundRow";
import AddRoundForm from "./AddRoundForm";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Utility to calculate handicap from rounds
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

// What-If Handicap Calculator
function WhatIfCalculator({ token, onProject }) {
  const [score, setScore] = useState("");
  const [course_rating, setCourseRating] = useState("");
  const [course_slope, setCourseSlope] = useState("");
  const [projected, setProjected] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const res = await axios.post(
      "http://localhost:5050/handicap/calculate",
      {
        score,
        course_rating,
        course_slope,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    setProjected(res.data.projected_handicap);
    if (onProject) onProject();
  };

  return (
    <div className="bg-blue-50 rounded-xl shadow-inner p-6 flex-1 flex flex-col justify-between min-h-[156px]">
      <div>
        <span className="font-semibold text-indigo-700 mb-2 block text-lg">
          What-If Handicap Calculator
        </span>
        <form
          className="flex flex-row flex-wrap sm:flex-nowrap gap-2 w-full items-end mb-2"
          onSubmit={submit}
        >
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-20 flex-shrink"
            type="number"
            placeholder="Score"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
          />
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-20 flex-shrink"
            type="number"
            step="0.1"
            placeholder="Rating"
            value={course_rating}
            onChange={(e) => setCourseRating(e.target.value)}
            required
          />
          <input
            className="border border-gray-300 rounded px-2 py-1 text-base w-20 flex-shrink"
            type="number"
            placeholder="Slope"
            value={course_slope}
            onChange={(e) => setCourseSlope(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-1 rounded-lg border border-indigo-700 shadow-sm hover:bg-indigo-700 transition font-semibold"
            style={{ minWidth: "70px" }}
          >
            Project
          </button>
        </form>
      </div>
      {projected !== null && (
        <div className="text-sm text-indigo-800 font-medium">
          Projected Handicap: <span className="font-bold">{projected}</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ token, onLogout }) {
  const [rounds, setRounds] = useState([]);
  const [handicap, setHandicap] = useState(null);
  const [username, setUsername] = useState("Golfer");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    fetchRounds();
    fetchHandicap();
    fetchUsername();
  }, []);

  const fetchRounds = async () => {
    const res = await axios.get("http://localhost:5050/rounds", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRounds(res.data);
  };

  const fetchHandicap = async () => {
    const res = await axios.get("http://localhost:5050/handicap", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setHandicap(res.data.handicap);
  };
  const fetchUsername = async () => {
    const res = await axios.get("http://localhost:5050/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsername(res.data.username || res.data.email || "Golfer");
  };
  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:5050/rounds/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchRounds();
    fetchHandicap();
  };

  // Derived stats
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

  // Lowest round ever
  const lowestRound = rounds.reduce(
    (min, r) => (r.score < min.score ? r : min),
    rounds[0] || {},
  );
  // Lowest differential ever
  const lowestDiff = roundsWithDifferential.reduce(
    (min, r) =>
      r.differential !== null && r.differential < min.differential ? r : min,
    roundsWithDifferential[0] || {},
  );
  // Average differential (last 20)
  const avgDiff =
    last20
      .filter((r) => r.differential !== null)
      .reduce((a, r) => a + r.differential, 0) /
    (last20.filter((r) => r.differential !== null).length || 1);

  // Get last 10 rounds
  const last10 = last20.slice(0, 10);

  // --- Handicap Trend, historical logic ---
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

  // --- Chart Data ---
  const sortedByDate = [...last20].sort((a, b) => a.date.localeCompare(b.date));
  let priorRounds = [];
  const chartData = sortedByDate.map((r) => {
    let handicapBefore;
    if (priorRounds.length === 0) {
      // For the first round, use its differential as the handicap
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

  // --- Format date helper ---
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
    <div className="max-w-6xl mx-auto px-2 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-indigo-900">
          Hello, {username}!
        </h1>
        <button
          onClick={onLogout}
          className="bg-gray-200 rounded px-4 py-1 font-semibold hover:bg-gray-300"
        >
          Log Out
        </button>
      </div>

      {/* Top section: two columns, full height matching */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 h-[400px]">
        {/* Left: Stacked stats, stretch to match right */}
        <div className="flex flex-col gap-6 min-w-[220px] md:w-[260px] h-full">
          <div className="bg-indigo-50 rounded-xl shadow-inner p-6 flex flex-col items-center justify-center h-1/2 min-h-[120px]">
            <span className="text-base text-gray-600 mb-2">
              Current Handicap
            </span>
            <span className="text-3xl font-bold">
              {handicap !== null ? handicap : "N/A"}
            </span>
          </div>
          <div className="bg-green-50 rounded-xl shadow-inner p-6 flex flex-col items-center justify-center h-1/2 min-h-[120px]">
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
        {/* Right: Add Round + WhatIf stacked, full height */}
        <div className="flex flex-col gap-6 flex-1 h-full">
          <div className="bg-blue-50 rounded-xl shadow-inner p-6 flex-1 flex flex-col justify-between min-h-[156px]">
            <AddRoundForm
              token={token}
              onAdd={() => {
                fetchRounds();
                fetchHandicap();
              }}
            />
          </div>
          <WhatIfCalculator token={token} onProject={fetchHandicap} />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 my-8">
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
      <div className="bg-white rounded-xl shadow-inner p-6 mb-8">
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
