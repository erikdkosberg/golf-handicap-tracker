/** Procedural PGA 2K-style textures — seeded for stable, non-flickering patterns. */

const TEX = 192;

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvasCtx(size = TEX) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext("2d") };
}

function fairwayStripes(ctx, size) {
  const colors = ["#5ed86c", "#4ec85c", "#56d064", "#48be58"];
  for (let y = 0; y < size; y += 5) {
    ctx.fillStyle = colors[Math.floor(y / 5) % colors.length];
    ctx.fillRect(0, y, size, 5);
  }
  const rnd = seededRand(42);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`;
    ctx.fillRect(rnd() * size, rnd() * size, 2, 1);
  }
}

function roughNoise(ctx, size) {
  ctx.fillStyle = "#1a4a2c";
  ctx.fillRect(0, 0, size, size);
  const rnd = seededRand(77);
  for (let i = 0; i < 1100; i++) {
    const v = 20 + rnd() * 40;
    ctx.fillStyle = `rgba(${v},${85 + v},${v + 8},${0.06 + rnd() * 0.1})`;
    ctx.fillRect(rnd() * size, rnd() * size, 2 + rnd() * 2, 2);
  }
}

function treeCanopy(ctx, size) {
  ctx.fillStyle = "#081a10";
  ctx.fillRect(0, 0, size, size);
  const rnd = seededRand(13);
  for (let b = 0; b < 8; b++) {
    const cx = 15 + rnd() * (size - 30);
    const cy = 15 + rnd() * (size - 30);
    const r = 14 + rnd() * 20;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(16,50,30,0.95)");
    grad.addColorStop(0.55, "rgba(8,32,18,0.75)");
    grad.addColorStop(1, "rgba(4,14,8,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function greenSurface(ctx, size) {
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#78ea8a");
  grad.addColorStop(0.5, "#62d874");
  grad.addColorStop(1, "#52c866");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const rnd = seededRand(99);
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.06})`;
    ctx.fillRect(rnd() * size, rnd() * size, 3, 2);
  }
}

function fringeCollar(ctx, size) {
  for (let y = 0; y < size; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? "#3a9e4e" : "#44ae58";
    ctx.fillRect(0, y, size, 3);
  }
}

function sandBunker(ctx, size) {
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#f0e0b0");
  grad.addColorStop(1, "#d8c090");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const rnd = seededRand(55);
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = `rgba(${165 + rnd() * 45},${140 + rnd() * 35},${85 + rnd() * 25},0.22)`;
    ctx.fillRect(rnd() * size, rnd() * size, 2, 2);
  }
}

function waterSurface(ctx, size) {
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#50c8f0");
  grad.addColorStop(0.45, "#3098d0");
  grad.addColorStop(1, "#1a78b0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  for (let y = 3; y < size; y += 8) {
    ctx.beginPath();
    for (let x = 0; x <= size; x += 2) {
      ctx.lineTo(x, y + Math.sin(x * 0.1 + y * 0.04) * 2);
    }
    ctx.stroke();
  }
}

function teeDeck(ctx, size) {
  for (let x = 0; x < size; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? "#50be5c" : "#5cd068";
    ctx.fillRect(x, 0, 4, size);
  }
}

const PATTERN_DRAWERS = {
  "tex-rough": roughNoise,
  "tex-fairway": fairwayStripes,
  "tex-green": greenSurface,
  "tex-fringe": fringeCollar,
  "tex-bunker": sandBunker,
  "tex-water": waterSurface,
  "tex-trees": treeCanopy,
  "tex-tee": teeDeck,
};

async function canvasToMapImage(canvas) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(canvas);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = canvas.toDataURL("image/png");
  });
}

export async function registerGrassTextures(map) {
  await Promise.all(
    Object.entries(PATTERN_DRAWERS).map(async ([id, draw]) => {
      if (map.hasImage(id)) return;
      const { canvas, ctx } = canvasCtx();
      draw(ctx, TEX);
      const image = await canvasToMapImage(canvas);
      map.addImage(id, image, { pixelRatio: 1 });
    })
  );
}
