/**
 * Shared Chinese Ink Rendering Kit (`src/kit/ink.js`).
 * Shared across scenes #03 (Han Rubbing), #04 (Tang Baimiao), #05 (Song Shan-shui),
 * #06 (Qingming Jiehua), and #09 (Bada Shanren Xieyi).
 * Provides Xuan-paper / aged Song-silk substrates, five-tone ink mixing,
 * wet-edge ink washes, split-bristle dry-brush (飞白), Cun-fa mountain texturing (皴法),
 * foliage dots (点叶), and collector seals (朱文/白文).
 */

export const INK_MODES = {
  rubbing: {
    id: "rubbing",
    paper: "#171614",
    fiber: "#282622",
    inkDark: "#f2ede2",
    inkMid: "#cfc8b8",
    inkLight: "#7c776c",
    inkPale: "#4a463f",
    seal: "#c93b2b",
    brushName: "charcoal",
  },
  baimiao: {
    id: "baimiao",
    paper: "#efe6d2",
    fiber: "#dfcfb2",
    inkDark: "#191714",
    inkMid: "#4b453b",
    inkLight: "#9b8e78",
    inkPale: "#cbbba0",
    seal: "#a83325",
    brushName: "pen",
  },
  shanShui: {
    id: "shanShui",
    paper: "#e4d8be",
    fiber: "#cfc0a0",
    inkDark: "#1a1c18",
    inkMid: "#48493f",
    inkLight: "#8b8777",
    inkPale: "#b8b099",
    seal: "#992e24",
    brushName: "charcoal",
  },
  jiehua: {
    id: "jiehua",
    paper: "#e0d0b2",
    fiber: "#ceb995",
    inkDark: "#241e18",
    inkMid: "#625343",
    inkLight: "#9f8a6e",
    inkPale: "#c5b08f",
    seal: "#a4382a",
    brushName: "HB",
  },
  xieyi: {
    id: "xieyi",
    paper: "#f3ede1",
    fiber: "#e2d8c5",
    inkDark: "#141412",
    inkMid: "#5e5b52",
    inkLight: "#b4ac9b",
    inkPale: "#d8d0c0",
    seal: "#b02b22",
    brushName: "charcoal",
  },
};

function makePrng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hexToRgbArr(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Generates and caches a reusable Xuan paper, aged Song silk, or stone-rubbing texture layer.
 */
export function getInkPaperLayer(kit, modeId, w = 1840, h = 1000) {
  const mode = INK_MODES[modeId] || INK_MODES.shanShui;
  return kit.bakeLayer(`ink_paper_v2_${mode.id}_${w}x${h}`, w, h, (pg) => {
    pg.background(mode.paper);
    const seed = mode.id.split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 17);
    const rand = makePrng(seed);
    const [fr, fg, fb] = hexToRgbArr(mode.fiber);

    // Warm tea/aged mottling clouds
    pg.noStroke();
    for (let i = 0; i < 460; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 36 + rand() * 160;
      pg.fill(fr, fg, fb, mode.id === "rubbing" ? 16 : 26);
      pg.circle(x, y, r);
    }

    // Silk weave threads for Song Shan-shui & Jiehua scrolls
    if (mode.id === "shanShui" || mode.id === "jiehua") {
      pg.stroke(145, 128, 96, 18);
      pg.strokeWeight(0.6);
      for (let y = 0; y < h; y += 6) {
        pg.line(0, y, w, y);
      }
      pg.stroke(145, 128, 96, 11);
      for (let x = 0; x < w; x += 9) {
        pg.line(x, 0, x, h);
      }
    }

    // Fine directional paper fibers / stone pits
    const [lr, lg, lb] = hexToRgbArr(mode.id === "rubbing" ? "#35322c" : "#b39f7d");
    for (let i = 0; i < 1900; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const len = 4 + rand() * 22;
      const ang = rand() * Math.PI * 2;
      pg.stroke(lr, lg, lb, mode.id === "rubbing" ? 26 : 30);
      pg.strokeWeight(0.7 + rand() * 1.1);
      pg.line(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    }
  });
}

/**
 * Multi-layered wet-edge ink wash polygon (水墨晕染).
 */
export function drawInkWash(g, pts, colorHex = "#242621", alpha = 0.28, opts = {}) {
  if (!pts || pts.length < 3) return;
  const layers = opts.layers ?? 3;
  const edgeBoost = opts.edgeAlpha ?? alpha * 0.42;
  const [r, gr, b] = hexToRgbArr(colorHex);
  const dc = g.drawingContext;

  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p[0];
    cy += p[1];
  }
  cx /= pts.length;
  cy /= pts.length;

  dc.save();
  for (let l = 0; l < layers; l++) {
    const shrink = 1 - l * 0.08;
    dc.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = cx + (pts[i][0] - cx) * shrink;
      const py = cy + (pts[i][1] - cy) * shrink;
      if (i === 0) dc.moveTo(px, py);
      else dc.lineTo(px, py);
    }
    dc.closePath();
    dc.fillStyle = `rgba(${r},${gr},${b},${(alpha / layers) * (l === 0 ? 0.9 : 1.1)})`;
    dc.fill();
  }

  // Subtle wet pigment rim along outer contour
  if (edgeBoost > 0.01) {
    dc.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) dc.moveTo(pts[i][0], pts[i][1]);
      else dc.lineTo(pts[i][0], pts[i][1]);
    }
    dc.closePath();
    dc.strokeStyle = `rgba(${r},${gr},${b},${edgeBoost})`;
    dc.lineWidth = opts.edgeWidth ?? 2.2;
    dc.lineJoin = "round";
    dc.stroke();
  }
  dc.restore();
}

/**
 * Split-bristle dry-brush stroke leaving natural streaks of paper visible (飞白).
 */
export function drawFeibaiStroke(g, pts, baseWidth = 6, colorHex = "#1b1d19", dryness = 0.45, seed = 101) {
  if (!pts || pts.length < 2) return;
  const rand = makePrng(seed);
  const [r, gr, b] = hexToRgbArr(colorHex);
  const dc = g.drawingContext;
  const bristles = Math.max(3, Math.round(baseWidth * 1.15));

  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";

  for (let bi = 0; bi < bristles; bi++) {
    const tBias = bristles === 1 ? 0 : bi / (bristles - 1) - 0.5;
    const offset = tBias * baseWidth * 0.72;
    const skipProb = dryness * (0.32 + Math.abs(tBias) * 0.95);
    const alpha = 0.34 + (1 - Math.abs(tBias) * 1.2) * 0.42;

    dc.strokeStyle = `rgba(${r},${gr},${b},${Math.max(0.12, alpha).toFixed(3)})`;
    dc.lineWidth = Math.max(0.8, (baseWidth / bristles) * (1.1 + rand() * 0.55));

    let drawing = false;
    dc.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      const dx = next[0] - prev[0];
      const dy = next[1] - prev[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const jitter = (rand() - 0.5) * baseWidth * 0.16;
      const px = p[0] + nx * (offset + jitter);
      const py = p[1] + ny * (offset + jitter);

      if (i > 0 && rand() < skipProb) {
        drawing = false;
      } else if (!drawing) {
        dc.moveTo(px, py);
        drawing = true;
      } else {
        dc.lineTo(px, py);
      }
    }
    dc.stroke();
  }
  dc.restore();
}

/**
 * Northern Song raindrop / small axe-cut rock texturing strokes (雨点皴 / 斧劈皴).
 */
export function drawCunFa(g, x, y, w, h, opts = {}) {
  const count = opts.count ?? 140;
  const colorHex = opts.color ?? "#1d1f1a";
  const angle = opts.angle ?? Math.PI * 0.54;
  const minLen = opts.minLen ?? 6;
  const maxLen = opts.maxLen ?? 20;
  const weight = opts.weight ?? 1.8;
  const alpha = opts.alpha ?? 0.48;
  const rand = makePrng(opts.seed ?? 733);
  const [r, gr, b] = hexToRgbArr(colorHex);
  const dc = g.drawingContext;

  dc.save();
  dc.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const px = x + rand() * w;
    const py = y + rand() * h;
    const len = minLen + rand() * (maxLen - minLen);
    const a = angle + (rand() - 0.5) * 0.28;
    const tx = px + Math.cos(a) * len;
    const ty = py + Math.sin(a) * len;
    const wDot = weight * (0.65 + rand() * 0.9);
    const al = alpha * (0.45 + rand() * 0.55);

    dc.strokeStyle = `rgba(${r},${gr},${b},${al.toFixed(3)})`;
    dc.lineWidth = wDot;
    dc.beginPath();
    dc.moveTo(px, py);
    dc.lineTo(tx, ty);
    dc.stroke();
  }
  dc.restore();
}

/**
 * Clustered summit & cliff scrub foliage dots (胡椒点 / 攒三聚五).
 */
export function drawFoliageDots(g, cx, cy, rx, ry, count = 48, colorHex = "#181a16", seed = 509) {
  const rand = makePrng(seed);
  const [r, gr, b] = hexToRgbArr(colorHex);
  const dc = g.drawingContext;

  dc.save();
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand());
    const dx = cx + Math.cos(a) * rx * rad;
    const dy = cy + Math.sin(a) * ry * rad;
    const dr = 2.2 + rand() * 4.4;
    const al = 0.5 + rand() * 0.45;
    dc.fillStyle = `rgba(${r},${gr},${b},${al.toFixed(3)})`;
    dc.beginPath();
    dc.ellipse(dx, dy, dr * (0.8 + rand() * 0.6), dr * (0.6 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();
}

/**
 * Draws a traditional Chinese red seal stamp ("zhuwen" / "baiwen") on a 2D graphics surface.
 */
export function drawRedSeal(g, x, y, text = "鹈", size = 34, colorHex = "#a82d22", style = "baiwen") {
  g.push();
  g.translate(x, y);
  g.rectMode("center");
  if (style === "zhuwen") {
    g.fill("#f5efe2");
    g.stroke(colorHex);
    g.strokeWeight(2.2);
    g.rect(0, 0, size, size, 3);
    g.fill(colorHex);
  } else {
    g.fill(colorHex);
    g.noStroke();
    g.rect(0, 0, size, size, 3);
    g.fill("#f5efe2");
  }
  g.noStroke();
  g.textAlign("center", "center");
  g.textFont("Songti SC, STSong, serif");
  g.textStyle("bold");
  g.textSize(size * (text.length > 1 ? 0.4 : 0.62));
  if (text.length === 4) {
    const s = size * 0.22;
    g.text(text[0], s, -s);
    g.text(text[1], s, s);
    g.text(text[2], -s, -s);
    g.text(text[3], -s, s);
  } else if (text.length === 2) {
    g.text(text[0], 0, -size * 0.22);
    g.text(text[1], 0, size * 0.22);
  } else {
    g.text(text, 0, 1);
  }
  g.pop();
}
