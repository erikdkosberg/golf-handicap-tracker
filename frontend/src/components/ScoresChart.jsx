import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Handicap calculation helper
function calculateHandicap(rounds) {
  if (!rounds.length) return null;
  const differentials = rounds.map(
    (r) => ((r.score - r.course_rating) * 113) / r.course_slope,
  );
  differentials.sort((a, b) => a - b);
  const count = Math.min(8, differentials.length);
  const avg_diff =
    differentials.slice(0, count).reduce((a, b) => a + b, 0) / count;
  return Math.round(avg_diff * 0.96 * 10) / 10;
}

export default function ScoresChart({ rounds }) {
  const sorted = [...rounds].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  const last20 = sorted.slice(-20);
  let data = [];
  for (let i = 0; i < last20.length; i++) {
    const subset = last20.slice(0, i + 1);
    data.push({
      date: last20[i].date,
      score: last20[i].score,
      handicap: calculateHandicap(subset),
    });
  }

  return (
    <div className="bg-white rounded-xl shadow p-3 mb-3">
      <h4 className="font-semibold text-indigo-700 mb-1 text-base">
        Scores & Handicap (Last 20)
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            interval={data.length > 10 ? Math.ceil(data.length / 7) : 0}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10 }}
            domain={["dataMin-2", "dataMax+2"]}
            width={30}
            label={{
              value: "Score",
              angle: -90,
              position: "insideLeft",
              fontSize: 10,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10 }}
            domain={["dataMin-2", "dataMax+2"]}
            width={30}
            label={{
              value: "Handicap",
              angle: 90,
              position: "insideRight",
              fontSize: 10,
            }}
          />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="linear"
            dataKey="score"
            stroke="#6366f1" // indigo-500
            strokeWidth={2.2}
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
            name="Score"
          />
          <Line
            yAxisId="right"
            type="linear"
            dataKey="handicap"
            stroke="#059669" // emerald-600
            strokeWidth={2.2}
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
            name="Handicap"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
