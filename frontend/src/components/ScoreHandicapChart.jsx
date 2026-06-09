// src/components/ScoreHandicapChart.jsx

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import LoadingSpinner from "./LoadingSpinner";

export function ScoreHandicapChart({ chartData, loading = false }) {
  return (
    <div className="bg-white rounded-xl shadow-inner p-4 sm:p-6 mb-8">
      <span className="text-base font-semibold text-indigo-800 mb-2 block">
        Score, Differential & Handicap (Last 20 Eighteen-Hole Rounds)
      </span>
      {loading ? (
        <div className="flex items-center justify-center h-[260px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
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
      )}
    </div>
  );
}
