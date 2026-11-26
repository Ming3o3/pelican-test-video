/**
 * Scene #13 — 蒙克《呐喊》 · The Scream (1893), t in [77.0, 83.0).
 * Edvard Munch expressionist composition:
 * - Undulating blood-red, burnt-vermilion, sulfur-yellow, and twilight-indigo sky ribbons
 *   with curved oil-pastel strokes pulsing subtly to the 120 BPM beat
 * - Deep Prussian-blue & plum-violet swirling Kristianiafjord with sinuous Bezier headlands
 *   and two silhouetted skiff boats
 * - Dramatic diagonal burnt-sienna wooden bridge & railing descending from upper-left to join
 *   a continuous level boardwalk deck at ROAD_Y = 730 across [-420..1420]
 * - Two distant top-hatted silhouette strollers receding calmly up the left bridgehead
 * - Bar 2 Deadpan Gag: A calm 3/4-profile stroller near x ≈ 640–685 is startled when the
 *   stoic Pelican rushes past at u ≈ 1.9..2.1s — snapping backward into Munch's iconic
 *   serpentine Scream silhouette (gaunt fingers clamping sunken cheeks, wide terrified eyes,
 *   gaping O-mouth, undulating coat, and fiery concentric wavy sonic shockwaves rippling
 *   upward into the twilight sky) while the deadpan Pelican pedals indifferently onward.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  ROAD_Y,
  clamp,
  getScenePelicanX,
  lerp,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[12];

const EXT_LEFT = BLEED_LEFT - 24;
const EXT_RIGHT = BLEED_RIGHT + 24;
const EXT_W = EXT_RIGHT - EXT_LEFT;

// Munch 1893 Expressionist Palette
const CHARCOAL = "#12111a";
const SKY_CRIMSON = "#a62118";
const SKY_ORANGE = "#eb7d26";
const FJORD_DEEP = "#111932";
const FJORD_MID = "#1d2e50";
const BRIDGE_DARK = "#4b2016";
const BRIDGE_MID = "#7a3822";
const BRIDGE_WARM = "#9e4d29";
const BRIDGE_HIGHLIGHT = "#d17a3c";
const PLUMAGE_LIGHT = "#ebe3d3";
const PLUMAGE_COOL = "#a2afbd";
const PLUMAGE_SHADE = "#64748a";

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function posMod(v, m) {
  return ((v % m) + m) % m;
}

/**
 * Far bridge curb Y along x in [-444..1444].
 * Sweeps steeply from the upper-left vanishing bridgehead down-right to x ≈ 360,
 * curving smoothly into the level fjord parapet along y = 696 so ROAD_Y = 730
 * remains unobstructed and seamlessly locked across portals.
 */
function getBridgeCurbY(x) {
  if (x <= 360) {
    return 376 + ((x - EXT_LEFT) / (360 - EXT_LEFT)) * (666 - 376);
  }
  if (x >= 560) {
    return 696;
  }
  const s = smoothstep(360, 560, x);
  const rampY = 666 + ((x - 360) / (360 - EXT_LEFT)) * (666 - 376) * 0.42;
  return lerp(rampY, 696, s);
}

/**
 * Railing vertical height at x (perspective scales up as bridge nears foreground).
 */
function getRailHeight(x) {
  const k = clamp((x - EXT_LEFT) / (560 - EXT_LEFT), 0, 1);
  return lerp(64, 102, k);
}

/**
 * Draws a smooth quadratic-interpolated wave ribbon onto Canvas2D.
 */
function strokeWaveRibbon(dc, pts, width, color, cap = "round") {
  if (pts.length < 2) return;
  dc.save();
  dc.strokeStyle = color;
  dc.lineWidth = width;
  dc.lineCap = cap;
  dc.lineJoin = "round";
  dc.beginPath();
  dc.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) * 0.5;
    const my = (pts[i][1] + pts[i + 1][1]) * 0.5;
    dc.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  dc.lineTo(last[0], last[1]);
  dc.stroke();
  dc.restore();
}

/**
 * Bakes the static 1840x1000 Munch tempera/oil backdrop once per scene key.
 */
function bakeMunchBackdrop(pg) {
  const dc = pg.drawingContext;
  const rand = prng(18931);

  pg.push();
  pg.translate(-BLEED_LEFT, 0);

  // Warm raw-cardboard underpainting base
  dc.fillStyle = "#5a271c";
  dc.fillRect(EXT_LEFT, 0, EXT_W, 1000);

  // 1. Undulating Sunset Sky Strata
  const skyGrad = dc.createLinearGradient(0, 0, 0, 415);
  skyGrad.addColorStop(0.0, "#151b34");
  skyGrad.addColorStop(0.22, "#592228");
  skyGrad.addColorStop(0.45, SKY_CRIMSON);
  skyGrad.addColorStop(0.7, SKY_ORANGE);
  skyGrad.addColorStop(0.88, "#eba83c");
  skyGrad.addColorStop(1.0, "#4f4a5a");
  dc.fillStyle = skyGrad;
  dc.fillRect(EXT_LEFT, 0, EXT_W, 430);

  // Broad undulating wave sky strata
  const staticBands = [
    { y0: 18, amp: 24, freq: 0.0042, ph: 0.4, w: 48, col: "rgba(22, 27, 54, 0.88)" },
    { y0: 56, amp: 32, freq: 0.0036, ph: 1.5, w: 36, col: "rgba(48, 43, 80, 0.72)" },
    { y0: 96, amp: 28, freq: 0.0048, ph: 2.3, w: 44, col: "rgba(148, 26, 22, 0.84)" },
    { y0: 136, amp: 36, freq: 0.0038, ph: 0.8, w: 40, col: "rgba(210, 58, 26, 0.86)" },
    { y0: 178, amp: 30, freq: 0.0052, ph: 2.9, w: 34, col: "rgba(238, 118, 32, 0.84)" },
    { y0: 218, amp: 26, freq: 0.0044, ph: 1.1, w: 32, col: "rgba(245, 178, 58, 0.82)" },
    { y0: 256, amp: 22, freq: 0.0056, ph: 3.8, w: 28, col: "rgba(218, 72, 30, 0.78)" },
    { y0: 294, amp: 20, freq: 0.0046, ph: 0.2, w: 26, col: "rgba(244, 198, 82, 0.76)" },
    { y0: 332, amp: 18, freq: 0.004, ph: 2.1, w: 28, col: "rgba(138, 40, 34, 0.74)" },
  ];
  for (const b of staticBands) {
    const pts = [];
    for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 65) {
      const y =
        b.y0 +
        Math.sin(x * b.freq + b.ph) * b.amp +
        Math.cos(x * b.freq * 1.9 - b.ph) * (b.amp * 0.35);
      pts.push([x, y]);
    }
    strokeWaveRibbon(dc, pts, b.w, b.col);
  }

  // Flowing curved Munch pastel/oil strokes following the sky wave contours
  dc.save();
  dc.lineCap = "round";
  for (let i = 0; i < 360; i++) {
    const x = EXT_LEFT + rand() * EXT_W;
    const y = 12 + rand() * 345;
    const waveFreq = 0.0044;
    const len = 55 + rand() * 125;
    const dyMid = Math.cos(x * waveFreq + y * 0.018) * 14;
    const dyEnd = Math.sin((x + len) * waveFreq + y * 0.018) * 11 - Math.sin(x * waveFreq + y * 0.018) * 11;
    const palette = [
      "rgba(24, 28, 52, 0.34)",
      "rgba(164, 30, 22, 0.36)",
      "rgba(236, 98, 34, 0.36)",
      "rgba(249, 208, 96, 0.36)",
      "rgba(66, 46, 74, 0.26)",
    ];
    dc.strokeStyle = palette[Math.floor(rand() * palette.length)];
    dc.lineWidth = 2.6 + rand() * 5.2;
    dc.beginPath();
    dc.moveTo(x, y);
    dc.quadraticCurveTo(x + len * 0.5, y + dyMid * 0.55, x + len, y + dyEnd);
    dc.stroke();
  }
  dc.restore();

  // 2. Distant Moody Fjord Ridge & Kristianiafjord Water Basin
  dc.save();
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 410);
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 48) {
    const ridgeY =
      354 +
      Math.sin(x * 0.0036 + 0.7) * 24 +
      Math.cos(x * 0.0085) * 9;
    dc.lineTo(x, ridgeY);
  }
  dc.lineTo(EXT_RIGHT, 710);
  dc.lineTo(EXT_LEFT, 710);
  dc.closePath();

  const fjordGrad = dc.createLinearGradient(0, 340, 0, 705);
  fjordGrad.addColorStop(0.0, "#242446");
  fjordGrad.addColorStop(0.2, FJORD_MID);
  fjordGrad.addColorStop(0.55, FJORD_DEEP);
  fjordGrad.addColorStop(1.0, "#0e1528");
  dc.fillStyle = fjordGrad;
  dc.fill();
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 3;
  dc.stroke();
  dc.restore();

  // Organic curving fjord rocky headlands (smooth Bezier silhouettes)
  dc.save();
  // Left-mid curving pine headland
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 368);
  dc.bezierCurveTo(-180, 344, 160, 386, 425, 434);
  dc.bezierCurveTo(458, 444, 418, 462, 330, 474);
  dc.bezierCurveTo(165, 492, -160, 502, EXT_LEFT, 498);
  dc.closePath();
  const headLGrad = dc.createLinearGradient(-200, 355, 200, 490);
  headLGrad.addColorStop(0, "#172622");
  headLGrad.addColorStop(0.6, "#223429");
  headLGrad.addColorStop(1, "#121d26");
  dc.fillStyle = headLGrad;
  dc.fill();
  dc.strokeStyle = "#485947";
  dc.lineWidth = 2.6;
  dc.stroke();

  // Far-right curving peninsula
  dc.beginPath();
  dc.moveTo(1444, 360);
  dc.bezierCurveTo(1220, 368, 995, 386, 945, 408);
  dc.bezierCurveTo(925, 418, 1020, 428, 1185, 442);
  dc.bezierCurveTo(1310, 452, 1390, 462, 1444, 472);
  dc.closePath();
  dc.fillStyle = "#192629";
  dc.fill();
  dc.strokeStyle = "#485549";
  dc.lineWidth = 2.6;
  dc.stroke();
  dc.restore();

  // Painted swirling fjord water currents (rich Prussian blue + plum + dusk cream)
  const fjordSwirls = [
    { cx: 520, cy: 508, rx: 220, ry: 42, col: "rgba(38, 72, 102, 0.44)", w: 18 },
    { cx: 790, cy: 488, rx: 255, ry: 46, col: "rgba(58, 40, 82, 0.38)", w: 22 },
    { cx: 1090, cy: 538, rx: 230, ry: 44, col: "rgba(42, 84, 112, 0.4)", w: 18 },
    { cx: 660, cy: 590, rx: 280, ry: 40, col: "rgba(28, 56, 86, 0.46)", w: 24 },
    { cx: 970, cy: 616, rx: 240, ry: 34, col: "rgba(210, 194, 162, 0.16)", w: 10 },
  ];
  for (const sw of fjordSwirls) {
    dc.save();
    dc.strokeStyle = sw.col;
    dc.lineWidth = sw.w;
    dc.lineCap = "round";
    dc.beginPath();
    dc.ellipse(sw.cx, sw.cy, sw.rx, sw.ry, -0.06, 0.15, Math.PI * 1.85);
    dc.stroke();
    dc.restore();
  }

  // Curved oil ripples inside fjord
  dc.save();
  dc.lineCap = "round";
  for (let i = 0; i < 200; i++) {
    const wx = -260 + rand() * 1700;
    const wy = 395 + rand() * 290;
    const wl = 32 + rand() * 92;
    const wCols = [
      "rgba(42, 82, 112, 0.34)",
      "rgba(18, 22, 48, 0.46)",
      "rgba(72, 46, 88, 0.3)",
      "rgba(224, 200, 158, 0.15)",
    ];
    dc.strokeStyle = wCols[Math.floor(rand() * wCols.length)];
    dc.lineWidth = 2.2 + rand() * 4.5;
    dc.beginPath();
    dc.moveTo(wx, wy);
    dc.quadraticCurveTo(wx + wl * 0.5, wy - 10 + rand() * 20, wx + wl, wy + (rand() - 0.5) * 12);
    dc.stroke();
  }
  dc.restore();

  // 3. Munch Diagonal Perspective Wooden Bridge Deck
  dc.save();
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 1005);
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 24) {
    dc.lineTo(x, getBridgeCurbY(x));
  }
  dc.lineTo(EXT_RIGHT, 1005);
  dc.closePath();

  const bridgeGrad = dc.createLinearGradient(0, 420, 380, 1000);
  bridgeGrad.addColorStop(0.0, "#7c3720");
  bridgeGrad.addColorStop(0.45, "#944827");
  bridgeGrad.addColorStop(0.72, "#76341f");
  bridgeGrad.addColorStop(1.0, "#4c1f15");
  dc.fillStyle = bridgeGrad;
  dc.fill();

  dc.clip();

  // Complete angular sweep of perspective plank beams from VP (-640, 310)
  // covering BOTH the right edge AND the entire lower-left triangle cleanly!
  const vpX = -640;
  const vpY = 310;
  const thetaStart = 0.045;
  const thetaEnd = 1.32;
  const dTheta = 0.0175;
  let rayIdx = 0;
  for (let th = thetaStart; th <= thetaEnd; th += dTheta) {
    const rayLen = 2800;
    const tx = vpX + Math.cos(th) * rayLen;
    const ty = vpY + Math.sin(th) * rayLen;

    if (rayIdx % 2 === 0) {
      dc.strokeStyle = "rgba(186, 94, 42, 0.22)";
      dc.lineWidth = 14;
      dc.beginPath();
      dc.moveTo(vpX, vpY);
      dc.lineTo(tx, ty);
      dc.stroke();
    }

    dc.strokeStyle = "rgba(20, 13, 18, 0.72)";
    dc.lineWidth = 2.7;
    dc.beginPath();
    dc.moveTo(vpX, vpY);
    dc.lineTo(tx, ty);
    dc.stroke();

    dc.strokeStyle = "rgba(226, 138, 66, 0.26)";
    dc.lineWidth = 1.5;
    dc.beginPath();
    dc.moveTo(vpX, vpY + 2.5);
    dc.lineTo(tx, ty + 3);
    dc.stroke();
    rayIdx++;
  }

  // Painterly diagonal wood-grain streaks across bridge planks
  for (let i = 0; i < 380; i++) {
    const sx = EXT_LEFT + rand() * EXT_W;
    const sy = 410 + rand() * 590;
    const dx = sx - vpX;
    const dy = sy - vpY;
    const dist = Math.hypot(dx, dy) || 1;
    const len = 36 + rand() * 96;
    const bCols = [
      "rgba(212, 118, 54, 0.24)",
      "rgba(50, 20, 16, 0.3)",
      "rgba(148, 58, 28, 0.28)",
      "rgba(234, 166, 82, 0.16)",
    ];
    dc.strokeStyle = bCols[Math.floor(rand() * bCols.length)];
    dc.lineWidth = 2 + rand() * 4.5;
    dc.lineCap = "round";
    dc.beginPath();
    dc.moveTo(sx, sy);
    dc.lineTo(sx + (dx / dist) * len, sy + (dy / dist) * len);
    dc.stroke();
  }

  // Painterly worn wheel-path shadow strip along ROAD_Y = 730 (no hard tightrope line!)
  const trackGrad = dc.createLinearGradient(0, ROAD_Y - 14, 0, ROAD_Y + 22);
  trackGrad.addColorStop(0, "rgba(32, 14, 14, 0)");
  trackGrad.addColorStop(0.45, "rgba(28, 12, 14, 0.38)");
  trackGrad.addColorStop(0.62, "rgba(214, 132, 62, 0.18)");
  trackGrad.addColorStop(1, "rgba(28, 12, 14, 0)");
  dc.fillStyle = trackGrad;
  dc.fillRect(EXT_LEFT, ROAD_Y - 14, EXT_W, 36);

  // Subtle broken charcoal & burnt-ochre road-contact texture streaks along ROAD_Y = 730
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 28) {
    dc.strokeStyle = (Math.abs(x) % 56 === 0) ? "rgba(22, 12, 16, 0.48)" : "rgba(216, 132, 64, 0.24)";
    dc.lineWidth = 2.4;
    dc.lineCap = "round";
    dc.beginPath();
    dc.moveTo(x, ROAD_Y + 1 + (rand() - 0.5) * 2.5);
    dc.lineTo(x + 20, ROAD_Y + 1 + (rand() - 0.5) * 2.5);
    dc.stroke();
  }

  // Foreground bottom-left diagonal shadow curb (strictly below y = 790)
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 795);
  dc.lineTo(740, 1005);
  dc.lineTo(EXT_LEFT, 1005);
  dc.closePath();
  dc.fillStyle = "rgba(24, 13, 18, 0.62)";
  dc.fill();
  dc.strokeStyle = "#8c3d22";
  dc.lineWidth = 6;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 795);
  dc.lineTo(740, 1005);
  dc.stroke();
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 3.2;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 791);
  dc.lineTo(740, 1001);
  dc.stroke();

  dc.restore();

  // 4. Far Wooden Railing along getBridgeCurbY(x)
  dc.save();
  const postXs = [];
  let pxWalk = EXT_LEFT + 14;
  while (pxWalk <= EXT_RIGHT) {
    postXs.push(pxWalk);
    const k = clamp((pxWalk - EXT_LEFT) / (600 - EXT_LEFT), 0, 1);
    pxWalk += lerp(36, 78, k);
  }
  for (const bx of postXs) {
    const by = getBridgeCurbY(bx);
    const rh = getRailHeight(bx);
    const pw = lerp(5, 11, clamp((bx - EXT_LEFT) / (580 - EXT_LEFT), 0, 1));

    dc.strokeStyle = "rgba(18, 13, 22, 0.34)";
    dc.lineWidth = pw * 0.9;
    dc.beginPath();
    dc.moveTo(bx, by);
    dc.lineTo(bx + rh * 0.65, by + rh * 0.32);
    dc.stroke();

    dc.fillStyle = BRIDGE_MID;
    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = 2.4;
    dc.fillRect(bx - pw * 0.5, by - rh, pw, rh + 4);
    dc.strokeRect(bx - pw * 0.5, by - rh, pw, rh + 4);

    dc.fillStyle = BRIDGE_HIGHLIGHT;
    dc.fillRect(bx - pw * 0.5 + 1.5, by - rh + 2, pw * 0.32, rh - 2);
  }

  const drawRailBar = (yOffsetRatio, thickness, mainCol, hiCol) => {
    dc.beginPath();
    for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 24) {
      const y = getBridgeCurbY(x) - getRailHeight(x) * yOffsetRatio;
      if (x === EXT_LEFT) dc.moveTo(x, y);
      else dc.lineTo(x, y);
    }
    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = thickness + 5;
    dc.lineCap = "round";
    dc.lineJoin = "round";
    dc.stroke();

    dc.strokeStyle = mainCol;
    dc.lineWidth = thickness;
    dc.stroke();

    dc.beginPath();
    for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 24) {
      const y = getBridgeCurbY(x) - getRailHeight(x) * yOffsetRatio - thickness * 0.25;
      if (x === EXT_LEFT) dc.moveTo(x, y);
      else dc.lineTo(x, y);
    }
    dc.strokeStyle = hiCol;
    dc.lineWidth = Math.max(1.5, thickness * 0.26);
    dc.stroke();
  };

  drawRailBar(0.0, 11, BRIDGE_DARK, BRIDGE_MID);
  drawRailBar(0.46, 7, BRIDGE_MID, BRIDGE_WARM);
  drawRailBar(0.96, 13, BRIDGE_WARM, BRIDGE_HIGHLIGHT);
  dc.restore();

  pg.pop();
}

/**
 * Dynamic beat-synced Munch wave ribbons in the sky (0..365) & swirling fjord currents + 2 boats.
 */
function drawAnimatedSkyAndFjord(g, t, beatPulse, screamIntensity) {
  const dc = g.drawingContext;
  const swell = 1 + beatPulse * 0.18 + screamIntensity * 0.24;

  dc.save();
  const liveRibbons = [
    { y0: 42, amp: 14, freq: 0.0046, spd: 1.4, w: 22, col: "rgba(38, 42, 82, 0.36)" },
    { y0: 108, amp: 18, freq: 0.0041, spd: -1.2, w: 26, col: "rgba(182, 34, 24, 0.42)" },
    { y0: 158, amp: 20, freq: 0.005, spd: 1.7, w: 22, col: "rgba(232, 84, 30, 0.44)" },
    { y0: 212, amp: 16, freq: 0.0045, spd: -1.5, w: 20, col: "rgba(246, 166, 52, 0.42)" },
    { y0: 268, amp: 14, freq: 0.0054, spd: 1.3, w: 18, col: "rgba(222, 68, 28, 0.34)" },
    { y0: 314, amp: 12, freq: 0.0042, spd: -1.1, w: 16, col: "rgba(245, 206, 86, 0.32)" },
  ];

  for (let r = 0; r < liveRibbons.length; r++) {
    const rb = liveRibbons[r];
    dc.strokeStyle = rb.col;
    dc.lineWidth = rb.w * (1 + beatPulse * 0.08);
    dc.lineCap = "round";
    dc.beginPath();
    for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 72) {
      const y =
        rb.y0 +
        Math.sin(x * rb.freq + t * rb.spd + r) * rb.amp * swell +
        Math.cos(x * rb.freq * 1.7 - t * 0.9) * (rb.amp * 0.35);
      if (x === EXT_LEFT) dc.moveTo(x, y);
      else dc.lineTo(x, y);
    }
    dc.stroke();
  }

  // Animated swirling currents inside the fjord
  const swirls = [
    { x: 560, y: 505, rx: 165, ry: 24, spd: 0.9, col: "rgba(62, 108, 134, 0.28)" },
    { x: 860, y: 492, rx: 190, ry: 28, spd: -0.7, col: "rgba(196, 178, 148, 0.16)" },
    { x: 1090, y: 552, rx: 175, ry: 24, spd: 1.1, col: "rgba(74, 52, 92, 0.26)" },
  ];
  for (let i = 0; i < swirls.length; i++) {
    const sw = swirls[i];
    const phase = t * sw.spd + i;
    dc.strokeStyle = sw.col;
    dc.lineWidth = 4.5 + beatPulse * 2;
    dc.beginPath();
    dc.ellipse(
      sw.x + Math.sin(phase) * 8,
      sw.y + Math.cos(phase) * 4,
      sw.rx,
      sw.ry,
      -0.06,
      0.3 + Math.sin(phase) * 0.2,
      Math.PI * 1.45 + Math.sin(phase) * 0.2
    );
    dc.stroke();
  }

  // Two small silhouette skiff boats bobbing gently on the dark Kristianiafjord
  const boats = [
    { x: 838, y: 462, s: 1.05, phase: 0.4 },
    { x: 1045, y: 438, s: 0.78, phase: 2.1 },
  ];
  for (const b of boats) {
    const bobY = Math.sin(t * 2.2 + b.phase) * 2.2;
    const tilt = Math.cos(t * 1.8 + b.phase) * 0.04;
    dc.save();
    dc.translate(b.x, b.y + bobY);
    dc.scale(b.s, b.s);
    dc.rotate(tilt);

    dc.strokeStyle = "rgba(12, 16, 30, 0.55)";
    dc.lineWidth = 2.4;
    for (let k = 1; k <= 3; k++) {
      dc.beginPath();
      dc.moveTo(-16 + k * 2, 5 + k * 4);
      dc.lineTo(16 - k * 2 + Math.sin(t * 4 + k) * 3, 5 + k * 4);
      dc.stroke();
    }

    dc.fillStyle = "#0e1220";
    dc.beginPath();
    dc.moveTo(-25, -1);
    dc.lineTo(26, -2);
    dc.lineTo(18, 5);
    dc.lineTo(-19, 5);
    dc.closePath();
    dc.fill();

    dc.strokeStyle = "#0e1220";
    dc.lineWidth = 2.2;
    dc.beginPath();
    dc.moveTo(-2, 0);
    dc.lineTo(-2, -33);
    dc.stroke();

    dc.fillStyle = "rgba(18, 22, 38, 0.92)";
    dc.beginPath();
    dc.moveTo(-1, -31);
    dc.quadraticCurveTo(16, -18, 13, -3);
    dc.lineTo(-1, -3);
    dc.closePath();
    dc.fill();
    dc.restore();
  }

  dc.restore();
}

/**
 * Draws the two distant top-hatted silhouette companions walking calmly away up the left bridgehead.
 */
function drawDistantTopHatWalkers(g, u) {
  const dc = g.drawingContext;
  const walkers = [
    { x0: -228, speed: -8.5, scale: 0.54, phase: 0.2, hatTilt: -0.07 },
    { x0: -188, speed: -8.0, scale: 0.59, phase: 1.9, hatTilt: 0.04 },
  ];

  dc.save();
  for (const w of walkers) {
    const wx = w.x0 + clamp(u, 0, 6) * w.speed;
    const wy = getBridgeCurbY(wx) + 46 * w.scale;
    const stride = Math.sin(u * 4.2 + w.phase) * 7;

    dc.save();
    dc.translate(wx, wy);
    dc.scale(w.scale, w.scale);

    // Long oblique bridge shadow
    dc.fillStyle = "rgba(18, 12, 20, 0.36)";
    dc.beginPath();
    dc.ellipse(24, 6, 32, 7, 0.32, 0, Math.PI * 2);
    dc.fill();

    // Walking legs
    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = 8.5;
    dc.lineCap = "round";
    dc.beginPath();
    dc.moveTo(-5, -36);
    dc.lineTo(-9 - stride, 2);
    dc.moveTo(5, -36);
    dc.lineTo(9 + stride, 2);
    dc.stroke();

    // Long slender Munch overcoat silhouette with twilight-blue depth
    dc.fillStyle = "#191d32";
    dc.strokeStyle = "#0a0b12";
    dc.lineWidth = 2.6;
    dc.beginPath();
    dc.moveTo(-13, -108);
    dc.quadraticCurveTo(-18, -68, -17, -26);
    dc.lineTo(17, -26);
    dc.quadraticCurveTo(18, -68, 13, -108);
    dc.closePath();
    dc.fill();
    dc.stroke();

    // Warm sunset rim stroke so silhouettes separate crisply from dark railing posts behind them
    dc.strokeStyle = "rgba(224, 146, 86, 0.58)";
    dc.lineWidth = 2.2;
    dc.beginPath();
    dc.moveTo(-12, -106);
    dc.lineTo(-15, -54);
    dc.stroke();

    // Head + distinctive Top Hat (高礼帽)
    dc.fillStyle = "#151828";
    dc.beginPath();
    dc.arc(0, -120, 11.5, 0, Math.PI * 2);
    dc.fill();

    dc.fillStyle = "#0f101a";
    dc.beginPath();
    dc.ellipse(0, -130, 21, 4.4, w.hatTilt, 0, Math.PI * 2);
    dc.fill();
    dc.save();
    dc.translate(0, -130);
    dc.rotate(w.hatTilt);
    dc.fillRect(-11.5, -28, 23, 28);
    dc.strokeStyle = "rgba(218, 142, 82, 0.45)";
    dc.lineWidth = 1.6;
    dc.beginPath();
    dc.moveTo(-11.5, -4);
    dc.lineTo(11.5, -4);
    dc.stroke();
    dc.restore();

    dc.restore();
  }
  dc.restore();
}

/**
 * Draws the foreground bridge passerby who strolls calmly in 3/4 profile during Bar 1,
 * then snaps into Edvard Munch's iconic serpentine "The Scream" pose at u ≈ 1.9..2.1s!
 */
function drawScreamPasserby(g, u, beatPulse) {
  const dc = g.drawingContext;

  const walkU = clamp(u, 0, 1.92);
  const shock = smoothstep(1.90, 2.08, u);
  const settleFade = 1 - smoothstep(4.65, 5.75, u) * 0.42;
  const passBySurge = Math.exp(-Math.pow((u - 3.3) / 0.36, 2));
  const screamIntensity = shock * settleFade;

  const baseX = 678 - walkU * 18 + shock * 44;
  const baseY = 716;
  const figScale = 1.12;

  const waveX = screamIntensity * Math.sin(u * 21) * (4.6 + passBySurge * 3.6);
  const waveBody = screamIntensity * Math.sin(u * 17 + 1.1) * (7.2 + passBySurge * 4.5);
  const recoilLean = shock * (0.22 + passBySurge * 0.08) * settleFade;
  const stride = (1 - shock) * Math.sin(walkU * 4.8) * 10;

  // 1. Fiery concentric wavy Munch sonic shockwaves radiating into the twilight sky
  if (screamIntensity > 0.04) {
    const mouthWorldX = baseX + Math.sin(recoilLean) * 168 + waveX * 0.7;
    const mouthWorldY = baseY - 172 * Math.cos(recoilLean);

    dc.save();
    // Soft warm glow core behind head/mouth when screaming
    const auraAlpha = clamp(screamIntensity * (0.34 + beatPulse * 0.14), 0, 0.5);
    const auraGrad = dc.createRadialGradient(
      mouthWorldX,
      mouthWorldY - 14,
      12,
      mouthWorldX,
      mouthWorldY - 24,
      125
    );
    auraGrad.addColorStop(0, `rgba(255, 130, 42, ${auraAlpha})`);
    auraGrad.addColorStop(0.55, `rgba(232, 62, 28, ${auraAlpha * 0.45})`);
    auraGrad.addColorStop(1, "rgba(232, 62, 28, 0)");
    dc.fillStyle = auraGrad;
    dc.beginPath();
    dc.arc(mouthWorldX, mouthWorldY - 24, 125, 0, Math.PI * 2);
    dc.fill();

    // 5 undulating orange-red & sulfur-gold wavy scream rings expanding upward
    const ringCount = 5;
    const ringCols = ["#ff4a24", "#ff7f29", "#ffc244", "#e33a1e", "#ffe275"];
    for (let i = 0; i < ringCount; i++) {
      const cycle = posMod((u - 1.9) * 1.12 + i / ringCount, 1);
      const r = Math.max(0.5, 42 + cycle * 168);
      const alpha = (1 - cycle) * screamIntensity * (0.86 + beatPulse * 0.14);
      if (alpha <= 0.02) continue;

      const ringW = Math.max(1.8, (6.8 - cycle * 3.8) * (1 + beatPulse * 0.25));
      // Subtle dark outer contrast halo so shockwaves read crisply over orange sky too
      dc.globalAlpha = clamp(alpha * 0.45, 0, 1);
      dc.strokeStyle = "#3a1014";
      dc.lineWidth = ringW + 3.2;
      dc.lineCap = "round";
      dc.beginPath();
      const steps = 34;
      for (let s = 0; s <= steps; s++) {
        const a = -Math.PI * 1.1 + (s / steps) * Math.PI * 1.2;
        const wobble = Math.sin(a * 5 + u * 11 + i * 1.9) * (5.2 + cycle * 8);
        const rr = Math.max(0.5, r + wobble);
        const rx = mouthWorldX + Math.cos(a) * rr * 1.06;
        const ry = mouthWorldY - 18 - cycle * 54 + Math.sin(a) * rr * 0.88;
        if (s === 0) dc.moveTo(rx, ry);
        else dc.lineTo(rx, ry);
      }
      dc.stroke();

      dc.globalAlpha = clamp(alpha, 0, 1);
      dc.strokeStyle = ringCols[i % ringCols.length];
      dc.lineWidth = ringW;
      dc.stroke();
    }
    dc.restore();
  }

  // 2. Character Body
  dc.save();
  dc.translate(baseX, baseY);
  dc.scale(figScale, figScale);

  // Ground shadow on wooden deck
  dc.fillStyle = "rgba(18, 12, 20, 0.44)";
  dc.beginPath();
  dc.ellipse(shock * 10, 4, 34 + shock * 10, 9, 0, 0, Math.PI * 2);
  dc.fill();

  // Legs (strolling naturally in Bar 1 -> braced wide & trembling in Bar 2)
  const legSpread = shock * 13;
  dc.lineCap = "round";
  for (const leg of [
    { hx: -6, fx: -9 - stride - legSpread },
    { hx: 6, fx: 9 + stride + legSpread * 0.55 },
  ]) {
    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = 13.5;
    dc.beginPath();
    dc.moveTo(leg.hx, -52);
    dc.lineTo((leg.hx + leg.fx) * 0.5 + shock * 5, -26);
    dc.lineTo(leg.fx, -2);
    dc.stroke();

    dc.strokeStyle = "#252b42";
    dc.lineWidth = 8.2;
    dc.stroke();
  }

  // Upper body pivot (relaxed slight forward stroll -> dramatic backward serpentine S-curve)
  dc.save();
  dc.translate(0, -52);
  dc.rotate(lerp(-0.04, recoilLean, shock));

  const coatMidX = waveBody * 0.72;
  const shoulderW = lerp(16, 23, shock);
  const hemW = 22 + passBySurge * 6;

  dc.beginPath();
  dc.moveTo(-shoulderW + waveX * 0.3, -96);
  dc.bezierCurveTo(
    -24 + coatMidX,
    -64,
    -27 - coatMidX * 0.55,
    -28,
    -hemW,
    6
  );
  dc.lineTo(hemW + passBySurge * 7, 6);
  dc.bezierCurveTo(
    26 - coatMidX * 0.55,
    -28,
    24 + coatMidX,
    -64,
    shoulderW + waveX * 0.3,
    -96
  );
  dc.closePath();

  const coatGrad = dc.createLinearGradient(-22, -96, 22, 6);
  coatGrad.addColorStop(0, "#1c2036");
  coatGrad.addColorStop(0.55, "#252c46");
  coatGrad.addColorStop(1, "#131624");
  dc.fillStyle = coatGrad;
  dc.fill();
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 4.0;
  dc.lineJoin = "round";
  dc.stroke();

  // Painterly blue-slate wavy fold streaks + crisp 1893 coat collar lapel
  dc.strokeStyle = "rgba(92, 112, 152, 0.45)";
  dc.lineWidth = 2.6;
  dc.beginPath();
  dc.moveTo(-6 + waveX * 0.2, -88);
  dc.quadraticCurveTo(-12 + coatMidX, -48, -10, -2);
  dc.moveTo(6 + waveX * 0.2, -86);
  dc.quadraticCurveTo(10 + coatMidX, -44, 12, -2);
  dc.stroke();

  // Subtle pale shirt-collar V notch at neck
  dc.fillStyle = "#c9bfa6";
  dc.beginPath();
  dc.moveTo(-6 + waveX * 0.3, -96);
  dc.lineTo(waveX * 0.3, -84);
  dc.lineTo(5 + waveX * 0.3, -96);
  dc.closePath();
  dc.fill();

  // Expressionist trembling contour echoes around coat shoulders during Bar 2 scream
  if (screamIntensity > 0.1) {
    dc.strokeStyle = `rgba(18, 17, 26, ${(screamIntensity * 0.36).toFixed(3)})`;
    dc.lineWidth = 2.4;
    dc.beginPath();
    dc.moveTo(-shoulderW - 6 + waveX * 0.4, -90);
    dc.quadraticCurveTo(-31 + coatMidX, -58, -hemW - 5, -12);
    dc.moveTo(shoulderW + 6 + waveX * 0.4, -90);
    dc.quadraticCurveTo(31 + coatMidX, -58, hemW + 6, -12);
    dc.stroke();
  }

  const headX = lerp(-4, waveX * 0.55, shock);
  const headY = -124;

  // Arms: In Bar 1, one relaxed arm swings slightly at side, other tucked near coat/railing;
  // in Bar 2, BOTH arms flare elbows wide and press gaunt fingers onto OUTER sunken cheeks!
  const drawArm = (side) => {
    const sx = side * (shoulderW - 2) + waveX * 0.3;
    const sy = -90;
    const calmSwing = Math.sin(walkU * 4.8) * 11 * side;
    const calmElbow = { x: side * 14 + calmSwing * 0.4, y: -56 };
    const calmHand = { x: side * 11 + calmSwing, y: -26 };

    const screamElbow = {
      x: headX + side * 44,
      y: headY + 12 + Math.sin(u * 22 + side) * 2.5,
    };
    // Hands clasp OUTER edges of the sunken cheeks (leaving eyes & O-mouth 100% clear!)
    const screamHand = { x: headX + side * 17, y: headY + 4 };

    const ex = lerp(calmElbow.x, screamElbow.x, shock);
    const ey = lerp(calmElbow.y, screamElbow.y, shock);
    const hx = lerp(calmHand.x, screamHand.x, shock);
    const hy = lerp(calmHand.y, screamHand.y, shock);

    dc.lineCap = "round";
    dc.lineJoin = "round";
    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = 13.5;
    dc.beginPath();
    dc.moveTo(sx, sy);
    dc.lineTo(ex, ey);
    dc.lineTo(hx, hy);
    dc.stroke();

    dc.strokeStyle = "#242a40";
    dc.lineWidth = 8.2;
    dc.stroke();

    if (shock > 0.2) {
      dc.save();
      dc.translate(hx, hy);
      dc.rotate(side * -0.18);
      dc.fillStyle = "#e2d4a4";
      dc.strokeStyle = CHARCOAL;
      dc.lineWidth = 2.2;
      dc.beginPath();
      dc.ellipse(0, -2, 5.2, 11.5, 0, 0, Math.PI * 2);
      dc.fill();
      dc.stroke();
      // Subtle finger lines
      dc.strokeStyle = "rgba(18, 17, 26, 0.45)";
      dc.lineWidth = 1.2;
      dc.beginPath();
      dc.moveTo(-side * 1.5, -9);
      dc.lineTo(-side * 1.5, 4);
      dc.stroke();
      dc.restore();
    } else {
      dc.fillStyle = "#d9c298";
      dc.strokeStyle = CHARCOAL;
      dc.lineWidth = 2;
      dc.beginPath();
      dc.arc(hx, hy, 4.8, 0, Math.PI * 2);
      dc.fill();
      dc.stroke();
    }
  };

  // Draw head BEFORE arms so hands clasp cleanly along the outer cheek contours
  dc.save();
  dc.translate(headX, headY);
  dc.rotate(screamIntensity * Math.sin(u * 23) * 0.06);

  if (shock <= 0.22) {
    // Bar 1: Calm 3/4 side-profile stroller facing left along the bridge!
    dc.beginPath();
    dc.ellipse(0, 0, 15.5, 20.5, 0.05, 0, Math.PI * 2);
    dc.fillStyle = "#d9bb8d";
    dc.fill();
    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = 3.2;
    dc.stroke();

    // Swept back dark hair on right/back of 3/4 head
    dc.fillStyle = "#2a2024";
    dc.beginPath();
    dc.arc(3, -8, 14.5, -Math.PI * 0.85, Math.PI * 0.35);
    dc.fill();

    // Subtle nose profile notch on left & calm eye looking left
    dc.fillStyle = CHARCOAL;
    dc.beginPath();
    dc.arc(-8.5, -2.5, 2.0, 0, Math.PI * 2);
    dc.fill();
    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = 1.8;
    dc.beginPath();
    dc.moveTo(-10, 7.5);
    dc.lineTo(-3, 7.5);
    dc.stroke();
  } else {
    // Bar 2: Iconic Munch sunken-cheek skull-pear head!
    const pinch = shock * 6.5;
    dc.beginPath();
    dc.moveTo(0, -26);
    dc.bezierCurveTo(19, -26, 21, -7, 17 - pinch, 4);
    dc.bezierCurveTo(14 - pinch * 0.7, 17, 8, 26, 0, 27);
    dc.bezierCurveTo(-8, 26, -14 + pinch * 0.7, 17, -17 + pinch, 4);
    dc.bezierCurveTo(-21, -7, -19, -26, 0, -26);
    dc.closePath();

    dc.fillStyle = "#e3d69e";
    dc.fill();
    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = 3.6;
    dc.stroke();

    // Bruised greenish-gray eye & hollow cheek shadows
    dc.fillStyle = "rgba(102, 114, 90, 0.48)";
    dc.beginPath();
    dc.ellipse(-7, -5.5, 6.2, 7.8, 0.12, 0, Math.PI * 2);
    dc.ellipse(7, -5.5, 6.2, 7.8, -0.12, 0, Math.PI * 2);
    dc.fill();

    // Wide terrified white eyeballs with tiny pinprick pupils glancing at the Pelican
    const eyeScale = clamp(shock, 0.3, 1);
    for (const ex of [-6.8, 6.8]) {
      dc.fillStyle = "#faf5e0";
      dc.strokeStyle = CHARCOAL;
      dc.lineWidth = 2.0;
      dc.beginPath();
      dc.ellipse(ex, -6, 4.6 * eyeScale, 5.8 * eyeScale, 0, 0, Math.PI * 2);
      dc.fill();
      dc.stroke();

      dc.fillStyle = CHARCOAL;
      dc.beginPath();
      dc.arc(ex - 1.5, -5.8, 1.8, 0, Math.PI * 2);
      dc.fill();
    }

    // Concave nostrils
    dc.fillStyle = CHARCOAL;
    dc.beginPath();
    dc.arc(-1.8, 3.2, 1.2, 0, Math.PI * 2);
    dc.arc(1.8, 3.2, 1.2, 0, Math.PI * 2);
    dc.fill();

    // Iconic tall O-shaped screaming mouth pulsing on beat
    const mouthW = (5.6 + beatPulse * 1.2) * shock;
    const mouthH = (10.5 + Math.sin(u * 26) * 1.5 + beatPulse * 1.8) * shock;
    dc.fillStyle = "#130f18";
    dc.strokeStyle = "#942b20";
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.ellipse(0, 15.2, Math.max(1, mouthW), Math.max(1, mouthH), 0, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
  }
  dc.restore();

  drawArm(-1);
  drawArm(1);

  dc.restore(); // end upper body pivot
  dc.restore(); // end base translation
}

/**
 * Draws an expressive painterly line onto Canvas2D.
 */
function drawBrushyLine(dc, x0, y0, x1, y1, width, color) {
  dc.strokeStyle = color;
  dc.lineWidth = width;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(x0, y0);
  dc.lineTo(x1, y1);
  dc.stroke();
}

/**
 * Draws the Expressionist Munch Pelican & mahogany-toned bicycle synchronized to getRigPose.
 */
function drawMunchPelicanRig(g, pose, u) {
  const dc = g.drawingContext;
  const s = pose.scale;

  // Ground shadow beneath tires
  dc.save();
  dc.fillStyle = "rgba(18, 12, 22, 0.42)";
  dc.beginPath();
  dc.ellipse(pose.x + 8 * s, pose.y + 3 * s, 124 * s, 10 * s, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // Painterly speed wake & dusty twilight swirls trailing behind the bike
  const wakePhase = posMod(u * 2, 1);
  dc.save();
  for (let i = 0; i < 4; i++) {
    const off = posMod(wakePhase + i * 0.24, 0.96);
    const wx = pose.rearHub.x - (34 + off * 90) * s;
    const wy = pose.y - (8 + i * 28 + Math.sin(u * 8 + i) * 5) * s;
    const len = (54 + (i % 2) * 32) * s;
    dc.globalAlpha = clamp((1 - off) * 0.52, 0, 1);
    drawBrushyLine(dc, wx - len, wy + 4 * s, wx, wy, 4.2 * s, i % 2 === 0 ? "#e05a28" : "#222438");
    drawBrushyLine(dc, wx - len * 0.7, wy + 7 * s, wx - 10 * s, wy + 3 * s, 2.2 * s, "#f2b84c");
  }
  dc.restore();

  const drawWheel = (hub) => {
    dc.save();
    dc.translate(hub.x, hub.y);

    dc.strokeStyle = "#362122";
    dc.lineWidth = 2.4 * s;
    for (let i = 0; i < 8; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 4;
      dc.beginPath();
      dc.moveTo(0, 0);
      dc.lineTo(
        Math.cos(a) * (pose.wheelRadius - 4 * s),
        Math.sin(a) * (pose.wheelRadius - 4 * s)
      );
      dc.stroke();
    }

    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = 7.4 * s;
    dc.beginPath();
    dc.arc(0, 0, Math.max(0.5, pose.wheelRadius), 0, Math.PI * 2);
    dc.stroke();

    dc.strokeStyle = BRIDGE_WARM;
    dc.lineWidth = 2.4 * s;
    dc.beginPath();
    dc.arc(0, 0, Math.max(0.5, pose.wheelRadius - 4.2 * s), 0, Math.PI * 2);
    dc.stroke();

    dc.strokeStyle = "rgba(242, 184, 76, 0.55)";
    dc.lineWidth = 2.0 * s;
    dc.beginPath();
    dc.arc(0, 0, Math.max(0.5, pose.wheelRadius - 1.5 * s), -Math.PI * 0.78, -Math.PI * 0.25);
    dc.stroke();

    dc.fillStyle = BRIDGE_MID;
    dc.strokeStyle = CHARCOAL;
    dc.lineWidth = 2 * s;
    dc.beginPath();
    dc.arc(0, 0, Math.max(0.5, 6.2 * s), 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
    dc.restore();
  };

  // Back leg
  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 11.5 * s;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.leftKnee.x, pose.leftKnee.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();
  dc.strokeStyle = "#9c4723";
  dc.lineWidth = 6.2 * s;
  dc.stroke();

  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 4.8 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();
  dc.restore();

  drawWheel(pose.rearHub);
  drawWheel(pose.frontHub);

  // Mahogany/wood-railing toned Bicycle Frame
  const frameSegs = [
    [pose.rearHub, pose.bb],
    [pose.rearHub, pose.seatCluster],
    [pose.bb, pose.seatCluster],
    [pose.seatCluster, pose.headTop],
    [pose.bb, pose.headBot],
    [pose.frontHub, pose.headTop],
    [pose.headTop, pose.stemTop],
    [pose.stemTop, pose.barGrip],
    [
      pose.seatCluster,
      { x: (pose.saddleRear.x + pose.saddleFront.x) * 0.5, y: pose.saddleRear.y + 3 * s },
    ],
  ];

  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 9.4 * s;
  for (const [a, b] of frameSegs) {
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.stroke();
  }
  dc.strokeStyle = BRIDGE_WARM;
  dc.lineWidth = 4.8 * s;
  for (const [a, b] of frameSegs) {
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.stroke();
  }

  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 9.6 * s;
  dc.beginPath();
  dc.moveTo(pose.saddleRear.x, pose.saddleRear.y);
  dc.lineTo(pose.saddleFront.x, pose.saddleFront.y);
  dc.stroke();
  dc.strokeStyle = "#5c2718";
  dc.lineWidth = 5.2 * s;
  dc.stroke();

  dc.fillStyle = BRIDGE_DARK;
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 2.4 * s;
  dc.beginPath();
  dc.arc(pose.bb.x, pose.bb.y, Math.max(0.5, 9.5 * s), 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.fillStyle = SKY_ORANGE;
  dc.beginPath();
  dc.arc(pose.bellPos.x, pose.bellPos.y, Math.max(0.5, 5.2 * s), 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.restore();

  // Pelican Body
  const traceBody = () => {
    dc.beginPath();
    dc.moveTo(pose.tailTip.x, pose.tailTip.y);
    dc.bezierCurveTo(
      pose.bodyCenter.x - 42 * s,
      pose.bodyCenter.y - 28 * s,
      pose.bodyCenter.x + 26 * s,
      pose.bodyCenter.y - 34 * s,
      pose.neckBase.x + 12 * s,
      pose.neckBase.y + 8 * s
    );
    dc.bezierCurveTo(
      pose.bodyCenter.x + 36 * s,
      pose.bodyCenter.y + 24 * s,
      pose.hip.x + 16 * s,
      pose.hip.y + 12 * s,
      pose.tailTip.x,
      pose.tailTip.y
    );
    dc.closePath();
  };

  dc.save();
  traceBody();
  dc.fillStyle = PLUMAGE_LIGHT;
  dc.fill();

  dc.save();
  traceBody();
  dc.clip();
  dc.fillStyle = PLUMAGE_COOL;
  dc.beginPath();
  dc.ellipse(pose.bodyCenter.x - 6 * s, pose.bodyCenter.y + 14 * s, 72 * s, 30 * s, -0.06, 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = PLUMAGE_SHADE;
  dc.beginPath();
  dc.ellipse(pose.bodyCenter.x - 10 * s, pose.bodyCenter.y + 26 * s, 66 * s, 20 * s, -0.05, 0, Math.PI * 2);
  dc.fill();
  // Painterly blue-gray hatch streaks & sunset warm rim
  dc.strokeStyle = "rgba(58, 70, 92, 0.36)";
  dc.lineWidth = 2.4 * s;
  dc.beginPath();
  dc.moveTo(pose.bodyCenter.x - 36 * s, pose.bodyCenter.y + 6 * s);
  dc.quadraticCurveTo(pose.bodyCenter.x, pose.bodyCenter.y + 14 * s, pose.bodyCenter.x + 28 * s, pose.bodyCenter.y + 4 * s);
  dc.stroke();
  dc.strokeStyle = "rgba(242, 166, 78, 0.62)";
  dc.lineWidth = 4.6 * s;
  dc.beginPath();
  dc.moveTo(pose.tailTip.x + 10 * s, pose.tailTip.y - 8 * s);
  dc.quadraticCurveTo(pose.bodyCenter.x, pose.bodyCenter.y - 26 * s, pose.neckBase.x + 4 * s, pose.neckBase.y - 4 * s);
  dc.stroke();
  dc.restore();

  // Heavy restless charcoal contour + subtle double expressionist stroke
  traceBody();
  dc.strokeStyle = "rgba(18, 17, 26, 0.45)";
  dc.lineWidth = 6.2 * s;
  dc.lineJoin = "round";
  dc.stroke();
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 4.2 * s;
  dc.stroke();
  dc.restore();

  // S-curve Neck
  g.push();
  g.noFill();
  g.strokeCap("round");
  g.strokeJoin("round");
  g.stroke(CHARCOAL);
  g.strokeWeight(26.5 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();

  g.stroke(PLUMAGE_LIGHT);
  g.strokeWeight(18 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();

  g.stroke(PLUMAGE_COOL);
  g.strokeWeight(7.5 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x - 3.5 * s, pt.y + 2 * s);
  g.endShape();
  g.pop();

  // Head + crest tufts
  dc.save();
  dc.fillStyle = PLUMAGE_LIGHT;
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 4 * s;
  dc.lineJoin = "round";
  dc.beginPath();
  dc.moveTo(pose.crest1.x, pose.crest1.y);
  dc.lineTo(pose.head.x - 6 * s, pose.head.y - 16 * s);
  dc.lineTo(pose.crest2.x, pose.crest2.y);
  dc.lineTo(pose.head.x + 6 * s, pose.head.y - 17 * s);
  dc.stroke();

  dc.beginPath();
  dc.arc(pose.head.x, pose.head.y, Math.max(0.5, 17.5 * s), 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.fillStyle = "rgba(100, 116, 138, 0.44)";
  dc.beginPath();
  dc.arc(pose.head.x - 4 * s, pose.head.y + 5 * s, Math.max(0.5, 10 * s), 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // Throat Pouch (burnt orange transitioning to blood-red)
  const tracePouch = () => {
    dc.beginPath();
    dc.moveTo(pose.pouchBase.x, pose.pouchBase.y);
    dc.bezierCurveTo(
      pose.pouchMid.x - 16 * s,
      pose.pouchMid.y + 13 * s,
      pose.pouchMid.x + 34 * s,
      pose.pouchMid.y + 7 * s,
      pose.beakTip.x - 4 * s,
      pose.beakTip.y + 4 * s
    );
    dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 12 * s);
    dc.closePath();
  };

  dc.save();
  tracePouch();
  const pouchGrad = dc.createLinearGradient(pose.pouchBase.x, pose.pouchBase.y, pose.beakTip.x, pose.pouchMid.y);
  pouchGrad.addColorStop(0.0, "#e66a24");
  pouchGrad.addColorStop(0.5, "#cc3a1e");
  pouchGrad.addColorStop(1.0, "#8c1816");
  dc.fillStyle = pouchGrad;
  dc.fill();

  dc.save();
  tracePouch();
  dc.clip();
  dc.strokeStyle = "rgba(58, 12, 16, 0.44)";
  dc.lineWidth = 3.2 * s;
  dc.beginPath();
  dc.moveTo(pose.pouchBase.x + 12 * s, pose.pouchBase.y + 12 * s);
  dc.quadraticCurveTo(pose.pouchMid.x + 6 * s, pose.pouchMid.y + 14 * s, pose.beakTip.x - 12 * s, pose.beakTip.y + 8 * s);
  dc.stroke();
  dc.strokeStyle = "rgba(246, 178, 72, 0.45)";
  dc.lineWidth = 2.4 * s;
  dc.beginPath();
  dc.moveTo(pose.pouchBase.x + 8 * s, pose.pouchBase.y + 4 * s);
  dc.quadraticCurveTo(pose.pouchMid.x, pose.pouchMid.y - 6 * s, pose.beakTip.x - 16 * s, pose.beakTip.y + 1 * s);
  dc.stroke();
  dc.restore();

  tracePouch();
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 4 * s;
  dc.lineJoin = "round";
  dc.stroke();
  dc.restore();

  // Upper Mandible + Hook
  dc.save();
  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
  dc.lineTo(pose.beakTip.x, pose.beakTip.y);
  dc.lineTo(pose.beakHook.x, pose.beakHook.y);
  dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  dc.closePath();
  const beakGrad = dc.createLinearGradient(pose.beakBaseTop.x, pose.beakBaseTop.y, pose.beakTip.x, pose.beakTip.y);
  beakGrad.addColorStop(0.0, "#eb8b34");
  beakGrad.addColorStop(0.7, "#d64e22");
  beakGrad.addColorStop(1.0, "#991f18");
  dc.fillStyle = beakGrad;
  dc.fill();
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 3.6 * s;
  dc.lineJoin = "round";
  dc.stroke();
  dc.restore();

  // Utterly DEADPAN half-lidded eye
  dc.save();
  dc.fillStyle = "#f2ecda";
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 2.3 * s;
  dc.beginPath();
  dc.arc(pose.eye.x, pose.eye.y, Math.max(0.5, 5.4 * s), 0, Math.PI, false);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.fillStyle = CHARCOAL;
  dc.beginPath();
  dc.arc(pose.eye.x + 1.2 * s, pose.eye.y + 1.5 * s, Math.max(0.5, 2.2 * s), 0, Math.PI * 2);
  dc.fill();
  dc.lineWidth = 3.1 * s;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(pose.eye.x - 7.5 * s, pose.eye.y - 0.5 * s);
  dc.lineTo(pose.eye.x + 7.5 * s, pose.eye.y - 0.5 * s);
  dc.stroke();
  dc.restore();

  // Wing reaching steadily to handlebars
  const traceWing = () => {
    dc.beginPath();
    dc.moveTo(pose.shoulder.x - 8 * s, pose.shoulder.y - 6 * s);
    dc.bezierCurveTo(
      pose.wingElbow.x - 10 * s,
      pose.wingElbow.y + 18 * s,
      pose.barGrip.x - 12 * s,
      pose.barGrip.y + 16 * s,
      pose.barGrip.x + 2 * s,
      pose.barGrip.y + 2 * s
    );
    dc.bezierCurveTo(
      pose.wingElbow.x + 8 * s,
      pose.wingElbow.y - 8 * s,
      pose.shoulder.x + 12 * s,
      pose.shoulder.y - 10 * s,
      pose.shoulder.x - 8 * s,
      pose.shoulder.y - 6 * s
    );
    dc.closePath();
  };

  dc.save();
  traceWing();
  dc.fillStyle = PLUMAGE_COOL;
  dc.fill();
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 3.8 * s;
  dc.lineJoin = "round";
  dc.stroke();

  dc.strokeStyle = PLUMAGE_SHADE;
  dc.lineWidth = 2.6 * s;
  dc.beginPath();
  dc.moveTo(pose.shoulder.x - 2 * s, pose.shoulder.y + 2 * s);
  dc.quadraticCurveTo(pose.wingElbow.x, pose.wingElbow.y + 6 * s, pose.barGrip.x - 8 * s, pose.barGrip.y + 7 * s);
  dc.stroke();
  dc.restore();

  // Front Leg & Crank
  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";
  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 12 * s;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();
  dc.strokeStyle = "#d96a26";
  dc.lineWidth = 6.6 * s;
  dc.stroke();

  dc.strokeStyle = CHARCOAL;
  dc.lineWidth = 6 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();
  dc.strokeStyle = BRIDGE_WARM;
  dc.lineWidth = 3 * s;
  dc.stroke();

  dc.fillStyle = CHARCOAL;
  dc.fillRect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 3 * s, 16 * s, 6 * s);
  dc.fillRect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s);
  dc.restore();
}

export default function render(ctx) {
  const { p, g, kit, t, localTime, beat } = ctx;
  const u = localTime;

  const backdrop = kit.bakeLayer("s13_munch_backdrop_v2", 1840, 1000, bakeMunchBackdrop);

  // 1. Baked Munch expressionist sky, fjord, diagonal wooden planks & railing
  p.push();
  p.imageMode(p.CENTER);
  p.image(backdrop, 500, 500, 1840, 1000);
  p.pop();

  // 2. Dynamic 2D Expressionist Layers
  g.push();

  const beatPulse = beat?.beatPulse ?? 0;
  const screamIntensity = smoothstep(1.90, 2.08, u) * (1 - smoothstep(4.65, 5.75, u) * 0.42);

  // Beat-synced undulating twilight sky ribbons, swirling fjord currents & two boats
  drawAnimatedSkyAndFjord(g, t, beatPulse, screamIntensity);

  // Two distant top-hatted silhouette strollers receding up the upper-left bridgehead
  drawDistantTopHatWalkers(g, u);

  // Foreground bridge passerby -> Bar 2 "The Scream" transformation!
  drawScreamPasserby(g, u, beatPulse);

  // Deadpan Expressionist Pelican strictly aligned to ROAD_Y = 730 & scale = 1.0 across portals
  const px = getScenePelicanX(u);
  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
  drawMunchPelicanRig(g, pose, u);

  // Era Title Card ("#13 · 1893 · 蒙克《呐喊》 · The Scream")
  drawEraTitleCard(g, META, u);

  g.pop();
}
