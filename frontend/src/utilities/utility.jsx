
// Calculate handicap from rounds
export function calcHandicapFromRounds(rounds) {
  const differentials = rounds
    .filter((r) => r.differential !== null && !isNaN(r.differential))
    .map((r) => r.differential)
    .sort((a, b) => a - b);
  if (!differentials.length) return null;
  const count = Math.min(8, differentials.length);
  const avg = differentials.slice(0, count).reduce((a, b) => a + b, 0) / count;
  return Number((avg * 0.96).toFixed(2));
}

// Format date for display
export function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}
