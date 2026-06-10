// Pine Meadow Golf Club — Mundelein, IL (Libertyville area)
// Scorecard data sourced from pinemeadowgc.com and GolfPass (public)
// Hole descriptions from Chicago Golf Review (twoguyswhogolf.com)

export const PINE_MEADOW = {
  id: "pine-meadow",
  name: "Pine Meadow Golf Club",
  location: "Mundelein, IL",
  address: "1 Pine Meadow Ln, Mundelein, IL 60060",
  holeCount: 18,
  par: 72,
  architect: "Joe Lee (1985), William S. Flynn (1929)",
  source: "pinemeadowgc.com / GolfPass",
  gpsSource: "OpenStreetMap (ODbL)",
  tees: [
    { id: "black", name: "Black", color: "#1a1a1a", rating: 74.8, slope: 139, totalYards: 7221 },
    { id: "gold", name: "Gold", color: "#d4a017", rating: 73.6, slope: 136, totalYards: 6957 },
    { id: "blue", name: "Blue", color: "#2563eb", rating: 71.5, slope: 131, totalYards: 6505 },
    { id: "white", name: "White", color: "#f8fafc", colorBorder: "#94a3b8", rating: 69.9, slope: 126, totalYards: 6151 },
    { id: "red", name: "Red", color: "#dc2626", rating: 65.5, slope: 115, totalYards: 5184, ratingWomen: 70.1, slopeWomen: 121 },
  ],
  holes: [
    {
      number: 1,
      par: 4,
      handicap: 13,
      handicapWomen: 11,
      yardages: { black: 402, gold: 386, blue: 378, white: 343, red: 311 },
      layout: { dogleg: "right", water: null, bunkers: ["green-left", "green-right"] },
      description:
        "A relaxing mid-range dogleg right. The 150–100 yard zone left of center is the best approach angle. Deep bunkers guard both sides of the green.",
    },
    {
      number: 2,
      par: 5,
      handicap: 11,
      handicapWomen: 9,
      yardages: { black: 556, gold: 540, blue: 523, white: 511, red: 400 },
      layout: { dogleg: "snake", water: null, bunkers: ["right-fairway"] },
      description:
        "A snaking par five that turns right then left. Rows of bunkers line the right but rarely come into play. Uphill approach to the green — the #1 handicap hole.",
    },
    {
      number: 3,
      par: 4,
      handicap: 5,
      handicapWomen: 3,
      yardages: { black: 492, gold: 458, blue: 422, white: 410, red: 352 },
      layout: { dogleg: "left", water: "left", bunkers: ["green-left", "green-right"] },
      description:
        "Dogleg left with water along the left side about 225 yards out. Deep bunkers on either side of the putting surface. Bail right for safety but face a longer approach.",
    },
    {
      number: 4,
      par: 5,
      handicap: 7,
      handicapWomen: 1,
      yardages: { black: 540, gold: 524, blue: 495, white: 476, red: 416 },
      layout: { dogleg: "none", water: null, bunkers: ["green-left", "green-right", "green-front"] },
      description:
        "Generous fairway with plenty of room until the 40-yard area, which is saturated with sand traps on both sides. Up-and-downs are difficult from any bunker.",
    },
    {
      number: 5,
      par: 3,
      handicap: 15,
      handicapWomen: 17,
      yardages: { black: 245, gold: 220, blue: 180, white: 164, red: 136 },
      layout: { dogleg: "none", water: "front", bunkers: ["green-left", "green-right"] },
      description:
        "Par three over a marsh with plenty of room greenside. A scenic short hole that demands a confident tee shot.",
    },
    {
      number: 6,
      par: 4,
      handicap: 1,
      handicapWomen: 13,
      yardages: { black: 445, gold: 420, blue: 401, white: 382, red: 343 },
      layout: { dogleg: "none", water: null, bunkers: ["green-front"] },
      description:
        "Long par four with an opening in front of the putting surface that encourages a low running approach. One of the toughest holes on the course.",
    },
    {
      number: 7,
      par: 4,
      handicap: 3,
      handicapWomen: 7,
      yardages: { black: 457, gold: 448, blue: 421, white: 416, red: 349 },
      layout: { dogleg: "right", water: null, bunkers: ["green-left", "green-right", "green-front"] },
      description:
        "Dogleg right to a ridged green. Anywhere left of the cart path is ideal off the tee. Three bunkers closely guard the putting surface.",
    },
    {
      number: 8,
      par: 3,
      handicap: 17,
      handicapWomen: 15,
      yardages: { black: 196, gold: 175, blue: 148, white: 131, red: 106 },
      layout: { dogleg: "none", water: null, bunkers: ["green-short-left", "green-short-right"] },
      description:
        "A pretty par three with understated ridges on either side and deep bunkers short right and left.",
    },
    {
      number: 9,
      par: 4,
      handicap: 9,
      handicapWomen: 5,
      yardages: { black: 380, gold: 370, blue: 367, white: 342, red: 330 },
      layout: { dogleg: "left", water: null, bunkers: ["green-right"] },
      description:
        "Wide fairway turns left near the 130-yard area. The green is tucked between bunkers on the right and trees on the left.",
    },
    {
      number: 10,
      par: 4,
      handicap: 6,
      handicapWomen: 8,
      yardages: { black: 394, gold: 384, blue: 376, white: 355, red: 326 },
      layout: { dogleg: "left", water: null, bunkers: ["green-left", "green-right"] },
      description:
        "Mid-range dogleg left par four. Ample fairway best played to the middle for a straightforward approach.",
    },
    {
      number: 11,
      par: 4,
      handicap: 12,
      handicapWomen: 10,
      yardages: { black: 374, gold: 365, blue: 359, white: 354, red: 271 },
      layout: { dogleg: "right", water: null, bunkers: ["right-fairway", "green-left"] },
      description:
        "Slight dogleg right with a bunker up the right side of the fairway. Aim up the left when teeing off.",
    },
    {
      number: 12,
      par: 3,
      handicap: 16,
      handicapWomen: 16,
      yardages: { black: 195, gold: 185, blue: 160, white: 128, red: 110 },
      layout: { dogleg: "none", water: null, bunkers: ["green-left", "green-right", "green-front"] },
      description:
        "Sculpted bunkers define the putting complex. A ridge runs across the center of the green — a memorable short hole.",
    },
    {
      number: 13,
      par: 5,
      handicap: 4,
      handicapWomen: 2,
      yardages: { black: 541, gold: 536, blue: 502, white: 492, red: 407 },
      layout: { dogleg: "left", water: "left", bunkers: ["green-left", "green-right"] },
      description:
        "Water on the left comes into play around 270 yards and cuts across the fairway near 210. Left center is ideal for the approach.",
    },
    {
      number: 14,
      par: 4,
      handicap: 8,
      handicapWomen: 14,
      yardages: { black: 408, gold: 393, blue: 368, white: 328, red: 240 },
      layout: { dogleg: "right", water: "right", bunkers: ["green-short-left", "green-long-left"] },
      description:
        "Dogleg right with water along the right side. From 150–100 yards in, a clear shot at a green tucked between water right and bunkers left.",
    },
    {
      number: 15,
      par: 5,
      handicap: 2,
      handicapWomen: 4,
      yardages: { black: 551, gold: 548, blue: 485, white: 465, red: 368 },
      layout: { dogleg: "right-left", water: "carry", bunkers: ["green-left", "green-right"] },
      description:
        "Must carry a hazard off the tee to a wide fairway bending right to left. Right center sets up the best approach to intricately designed greenside bunkers.",
    },
    {
      number: 16,
      par: 4,
      handicap: 14,
      handicapWomen: 6,
      yardages: { black: 416, gold: 400, blue: 365, white: 336, red: 294 },
      layout: { dogleg: "left", water: null, bunkers: ["green-front"] },
      description:
        "Turns 45 degrees left near the 100-yard zone. Raised green closely guarded by a large bunker in front.",
    },
    {
      number: 17,
      par: 3,
      handicap: 18,
      handicapWomen: 18,
      yardages: { black: 184, gold: 175, blue: 160, white: 141, red: 129 },
      layout: { dogleg: "none", water: null, bunkers: ["green-front"] },
      description:
        "Tough when the pin is right; much more playable from center or left pin positions. Deserving of its #18 handicap ranking.",
    },
    {
      number: 18,
      par: 4,
      handicap: 10,
      handicapWomen: 12,
      yardages: { black: 445, gold: 430, blue: 395, white: 377, red: 296 },
      layout: { dogleg: "right", water: "front", bunkers: ["green-back-left", "green-back-right"] },
      description:
        "Long dogleg right — tough to cut as tree line extends to the 150 area. Approach over water with deep bunkers behind the green and the clubhouse in view.",
    },
  ],
};

export function getHoleYardage(hole, teeId) {
  return hole.yardages[teeId] ?? null;
}

export function getNineTotals(course, teeId, nine) {
  const start = nine === "front" ? 0 : 9;
  const slice = course.holes.slice(start, start + 9);
  const yards = slice.reduce((sum, h) => sum + (h.yardages[teeId] || 0), 0);
  const par = slice.reduce((sum, h) => sum + h.par, 0);
  return { yards, par };
}
