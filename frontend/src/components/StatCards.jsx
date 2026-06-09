// src/components/StatCards.jsx

import React from "react";
import LoadingSpinner from "./LoadingSpinner";

export function StatCard({ label, value, colorClass = "bg-gray-100" }) {
  return (
    <div className={`${colorClass} rounded-xl shadow-inner p-4 flex flex-col items-center`}>
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-xl font-bold mt-2">{value}</span>
    </div>
  );
}

export function TrendCard({ label, value, trend, loading = false }) {
  // trend: positive or negative number or null
  let trendIcon = null;
  let trendColor = trend > 0 ? "text-red-700" : "text-green-700";
  if (loading) {
    return (
      <div className="bg-lime-50 rounded-xl shadow-inner p-4 flex flex-col items-center">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xl font-bold mt-2 flex items-center min-h-[28px]">
          <LoadingSpinner />
        </span>
      </div>
    );
  }
  if (trend !== null) {
    trendIcon = trend > 0 ? (
      <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    ) : (
      <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    );
  }

  return (
    <div className="bg-lime-50 rounded-xl shadow-inner p-4 flex flex-col items-center">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-xl font-bold mt-2 flex items-center ${trendColor}`}>
        {trend !== null ? (
          <>
            {trendIcon}
            {Math.abs(trend).toFixed(2)}
          </>
        ) : (
          "N/A"
        )}
      </span>
    </div>
  );
}
