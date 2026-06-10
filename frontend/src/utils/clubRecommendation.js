/** Default bag — replace with user bag later. */
const DEFAULT_BAG = [
  { club: "Driver", abbr: "D", yards: 250 },
  { club: "3 Wood", abbr: "3W", yards: 230 },
  { club: "5 Wood", abbr: "5W", yards: 215 },
  { club: "4 Hybrid", abbr: "4H", yards: 200 },
  { club: "5 Iron", abbr: "5i", yards: 185 },
  { club: "6 Iron", abbr: "6i", yards: 175 },
  { club: "7 Iron", abbr: "7i", yards: 165 },
  { club: "8 Iron", abbr: "8i", yards: 155 },
  { club: "9 Iron", abbr: "9i", yards: 145 },
  { club: "Pitching Wedge", abbr: "PW", yards: 135 },
  { club: "Gap Wedge", abbr: "GW", yards: 120 },
  { club: "Sand Wedge", abbr: "SW", yards: 105 },
  { club: "Lob Wedge", abbr: "LW", yards: 85 },
];

/** Golfshot-style club suggestion for a target distance. */
export function recommendClub(distanceYds, bag = DEFAULT_BAG) {
  if (!distanceYds || distanceYds < 1) return null;

  let best = bag[0];
  let bestDiff = Infinity;

  for (const club of bag) {
    const diff = Math.abs(club.yards - distanceYds);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = club;
    }
  }

  const clubUp = bag.find((c) => c.yards >= distanceYds * 1.02);
  const suggested = clubUp || best;

  return {
    ...suggested,
    playsLike: distanceYds,
  };
}
