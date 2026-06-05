import React from "react";

export default function MiniScorecard({ holeScores }) {
  if (!holeScores) return null;
  // Array of holes sorted numerically
  const holes = Object.keys(holeScores)
    .sort((a, b) => parseInt(a.replace("hole_", ""), 10) - parseInt(b.replace("hole_", ""), 10));

  // Split into front 9 / back 9 (works up to 18 holes)
  const holeArr = holes.map(h => holeScores[h]);
  const front9 = holeArr.slice(0, 9);
  const back9 = holeArr.slice(9, 18);

  // Helper to sum a stat over a segment
  const total = (arr, key) => arr.reduce((sum, h) => sum + (h?.[key] || 0), 0);

  // Returns the styled score
  function renderScore(score, par) {
    const diff = score - par;
    // Birdie (1 under), circle
    if (diff === -1) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 border-2 border-sky-400 rounded-full font-semibold text-lg">
          {score}
        </span>
      );
    }
    // Eagle or better, double circle
    if (diff <= -2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 border-2 border-sky-400 rounded-full font-semibold text-lg shadow-[0_0_0_2px_#38bdf8]" style={{ boxShadow: "0 0 0 2px #38bdf8" }}>
          {score}
        </span>
      );
    }
    // Bogey (1 over), square
    if (diff === 1) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 border-2 border-red-400 rounded-[0.35rem] font-semibold text-lg">
          {score}
        </span>
      );
    }
    // Double or worse, black
    if (diff >= 2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 bg-black text-white font-bold text-lg rounded">
          {score}
        </span>
      );
    }
    // Par, bold
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 font-bold text-lg">
        {score}
      </span>
    );
  }

  // Table rendering
  return (
    <div className="rounded-xl bg-white shadow-inner p-3 my-1 w-full max-w-full overflow-x-auto">
      <div className="flex flex-col items-center gap-2 text-gray-800">
        {/* Holes Row */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {[...Array(front9.length).keys()].map(i => (
            <span key={i} className="w-8 text-center">{i + 1}</span>
          ))}
          <span className="mx-2 w-8 text-center font-bold text-gray-500">OUT</span>
          {back9.length > 0 && (
            <>
              {[...Array(back9.length).keys()].map(i => (
                <span key={i + 9} className="w-8 text-center">{i + 10}</span>
              ))}
              <span className="mx-2 w-8 text-center font-bold text-gray-500">IN</span>
            </>
          )}
          <span className="ml-2 w-8 text-center font-bold text-gray-700">TOT</span>
        </div>
        {/* Par Row */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {front9.map((h, i) => (
            <span key={i} className="w-8 text-center">{h.par}</span>
          ))}
          <span className="mx-2 w-8 text-center font-bold">{total(front9, "par")}</span>
          {back9.length > 0 && (
            <>
              {back9.map((h, i) => (
                <span key={i + 9} className="w-8 text-center">{h.par}</span>
              ))}
              <span className="mx-2 w-8 text-center font-bold">{total(back9, "par")}</span>
            </>
          )}
          <span className="ml-2 w-8 text-center font-bold">{total(holeArr, "par")}</span>
        </div>
        {/* Score Row */}
        <div className="flex items-center gap-2 text-base">
          {front9.map((h, i) => (
            <span key={i} className="w-8 text-center">{renderScore(h.score, h.par)}</span>
          ))}
          <span className="mx-2 w-8 text-center font-bold">{total(front9, "score")}</span>
          {back9.length > 0 && (
            <>
              {back9.map((h, i) => (
                <span key={i + 9} className="w-8 text-center">{renderScore(h.score, h.par)}</span>
              ))}
              <span className="mx-2 w-8 text-center font-bold">{total(back9, "score")}</span>
            </>
          )}
          <span className="ml-2 w-8 text-center font-bold">{total(holeArr, "score")}</span>
        </div>
      </div>
    </div>
  );
}
