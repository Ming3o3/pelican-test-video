/**
 * Scene #09 — 八大山人写意 · Bada Shanren Freehand (c. 1690), t in [53.0, 59.0).
 * Minimalist early-Qing Zhu Da (Bada Shanren) xieyi ink painting:
 * >80% empty Xuan paper breathing space ("计白当黑"), two sweeping dry-brush ground strokes,
 * an eccentric top-heavy cantilevered rock ("顽石") with two withered lotus strokes on the right,
 * wild running-script calligraphy & two red seals in the upper-left,
 * a 4-stroke ink bicycle + 6-stroke splash-ink Pelican driven by `getRigPose`,
 * and Bar 2's iconic enlarged squarish-round eye rolling skyward in deadpan disdain ("白眼向人").
 */

import {
  BLEED_LEFT,
  CROSS_SPEED,
  ROAD_Y,
  SCENE_DUR,
  lerp,
  smoothstep,
} from "../beat.js";
import {
  drawFeibaiStroke,
  drawInkWash,
  drawRedSeal,
  getInkPaperLayer,
} from "../kit/ink.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[8];
const SCENE_START_T = 53.0;

/**
 * C1-continuous progress curve: exact position & velocity match at u = 0 and u = 6
 * across both portals, while smoothly slowing down to ~0.52x speed around Bar 2 (u = 3.0)
 * so the Pelican lingers deadpan in center frame before accelerating out in Bar 3.
 */
function getBadaPelicanProgress(u) {
  if (u <= 0 || u >= SCENE_DUR) return u;
  const norm = u / SCENE_DUR;
  const amp = 0.24;
  return (
    u +
    SCENE_DUR *
      amp *
      (Math.sin(2 * Math.PI * norm) / (2 * Math.PI) -
        Math.sin(4 * Math.PI * norm) / (4 * Math.PI))
  );
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function evalCatmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 *
      (2 * p1[0] +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

function sampleSmoothOpen(pts, subdiv = 6) {
  if (pts.length < 2) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < subdiv; s++) {
      out.push(evalCatmullRom(p0, p1, p2, p3, s / subdiv));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function sampleSmoothClosed(pts, subdiv = 6) {
  const n = pts.length;
  if (n < 3) return pts;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let s = 0; s < subdiv; s++) {
      out.push(evalCatmullRom(p0, p1, p2, p3, s / subdiv));
    }
  }
  return out;
}

/**
 * Fast calligraphic variable-width brush stroke ("顿挫提按") rendered on Canvas2D.
 */
function drawCalligraphicBrush(dc, pts, widths, colorHex = "#151512", alpha = 1) {
  if (!pts || pts.length < 2) return;
  const [r, g, b] = hexToRgb(colorHex);
  const left = [];
  const right = [];

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const hw = (widths[i] ?? widths[widths.length - 1]) * 0.5;
    left.push([p[0] + nx * hw, p[1] + ny * hw]);
    right.push([p[0] - nx * hw, p[1] - ny * hw]);
  }

  dc.save();
  dc.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  dc.beginPath();
  dc.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) {
    dc.lineTo(left[i][0], left[i][1]);
  }
  const last = pts[pts.length - 1];
  const hwEnd = (widths[widths.length - 1] ?? 2) * 0.5;
  dc.arc(last[0], last[1], Math.max(0.6, hwEnd), 0, Math.PI * 2);
  for (let i = right.length - 1; i >= 0; i--) {
    dc.lineTo(right[i][0], right[i][1]);
  }
  dc.closePath();
  dc.fill();
  dc.restore();
}

/**
 * Pre-bakes strictly two heroic sweeping dry-brush ground strokes across ROAD_Y = 730,
 * blending bold variable-pressure calligraphy with crisp split-bristle feibai texture.
 */
function bakeGroundStrokes(pg) {
  pg.clear();
  const dc = pg.drawingContext;
  const baseLy = 40; // maps to world ROAD_Y = 730

  // Stroke 1: Primary sweeping dry-brush ground line anchored at portal ends ROAD_Y + 2
  const ctrl1 = [
    [0, baseLy + 1.5],
    [220, baseLy + 2.5],
    [480, baseLy + 0.5],
    [720, baseLy + 3.0],
    [980, baseLy + 1.2],
    [1250, baseLy + 2.8],
    [1540, baseLy + 1.2],
    [1840, baseLy + 1.5],
  ];
  const smooth1 = sampleSmoothOpen(ctrl1, 7);
  const w1 = smooth1.map((_, idx) => {
    const k = idx / (smooth1.length - 1);
    return 2.6 + 2.2 * Math.sin(k * Math.PI * 3.5) + (k > 0.35 && k < 0.72 ? 1.8 : 0);
  });
  drawCalligraphicBrush(dc, smooth1, w1, "#1e1d19", 0.78);
  drawFeibaiStroke(pg, smooth1, 5.2, "#24221d", 0.66, 901);

  // Stroke 2: Secondary vigorous calligraphic dry-ink accent sweeping across central road
  const ctrl2 = [
    [420, baseLy + 11],
    [590, baseLy + 15],
    [820, baseLy + 11],
    [1080, baseLy + 17],
    [1310, baseLy + 13],
    [1490, baseLy + 7],
  ];
  const smooth2 = sampleSmoothOpen(ctrl2, 7);
  const w2 = smooth2.map((_, idx) => {
    const k = idx / (smooth2.length - 1);
    const env = Math.sin(k * Math.PI);
    return 1.2 + env * 5.8 + Math.cos(k * Math.PI * 4) * 1.1;
  });
  drawCalligraphicBrush(dc, smooth2, w2, "#3a3730", 0.36);
  drawFeibaiStroke(pg, smooth2, 6.2, "#3e3b34", 0.74, 902);
}

/**
 * Pre-bakes Bada Shanren's eccentric top-heavy cantilevered rock ("顽石") and two withered lotus strokes.
 * Narrow twisted ankle sits at local (170, 520) -> world (812, 730).
 */
function bakeRockAndLotus(pg) {
  pg.clear();
  const dc = pg.drawingContext;

  // 1. Withered Lotus ("两笔枯笔残荷") arching cleanly from upper-right rock crevice
  // Lotus Stroke 1: Continuous slender dry-ink stem + crisp snapped elbow into tilted seed pod ("残蓬")
  const stem1Smooth = sampleSmoothOpen(
    [
      [204, 244],
      [226, 174],
      [256, 112],
      [292, 62],
    ],
    6
  );
  drawCalligraphicBrush(
    dc,
    stem1Smooth,
    stem1Smooth.map((_, i) => lerp(2.8, 1.5, i / (stem1Smooth.length - 1))),
    "#1c1b18",
    0.72
  );
  drawFeibaiStroke(pg, stem1Smooth, 3.4, "#1a1916", 0.34, 911);

  const stem1Tip = sampleSmoothOpen(
    [
      [292, 62],
      [310, 78],
      [330, 102],
    ],
    5
  );
  drawCalligraphicBrush(
    dc,
    stem1Tip,
    stem1Tip.map((_, i) => lerp(2.2, 1.6, i / (stem1Tip.length - 1))),
    "#1c1b18",
    0.82
  );
  // Crisp dark joint accent at the snapped lotus stem elbow
  dc.save();
  dc.fillStyle = "#151512";
  dc.beginPath();
  dc.arc(292, 62, 2.2, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // Expressive ink-brushed cupped lotus seed pod ("残蓬")
  dc.save();
  dc.fillStyle = "rgba(62, 58, 51, 0.58)";
  dc.beginPath();
  dc.moveTo(316, 102);
  dc.quadraticCurveTo(334, 93, 354, 91);
  dc.quadraticCurveTo(345, 118, 328, 119);
  dc.quadraticCurveTo(318, 114, 316, 102);
  dc.closePath();
  dc.fill();
  dc.restore();
  drawCalligraphicBrush(
    dc,
    [
      [314, 101],
      [334, 94],
      [355, 91],
    ],
    [3.0, 4.4, 2.0],
    "#151512",
    0.92
  );
  dc.save();
  dc.fillStyle = "#141411";
  for (const [sx, sy] of [
    [322, 98],
    [334, 93],
    [345, 90],
  ]) {
    dc.beginPath();
    dc.arc(sx, sy, 2.0, 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();

  // Lotus Stroke 2: Secondary curving stem + drooping tattered autumn lotus leaf ("枯荷败叶")
  const stem2Smooth = sampleSmoothOpen(
    [
      [196, 268],
      [246, 208],
      [298, 180],
      [346, 182],
    ],
    6
  );
  drawCalligraphicBrush(
    dc,
    stem2Smooth,
    stem2Smooth.map((_, i) => lerp(2.8, 1.5, i / (stem2Smooth.length - 1))),
    "#26241f",
    0.7
  );
  drawFeibaiStroke(pg, stem2Smooth, 3.2, "#282621", 0.34, 913);

  // Organic drooping withered leaf painted via fluid ink lobes + unified spine/veins
  dc.save();
  dc.beginPath();
  dc.moveTo(306, 188);
  dc.bezierCurveTo(324, 166, 384, 164, 418, 198);
  dc.bezierCurveTo(420, 222, 390, 232, 370, 214);
  dc.bezierCurveTo(356, 204, 344, 226, 326, 224);
  dc.bezierCurveTo(308, 222, 300, 204, 306, 188);
  dc.closePath();
  const leafGrad = dc.createLinearGradient(310, 170, 412, 222);
  leafGrad.addColorStop(0, "rgba(74, 70, 62, 0.44)");
  leafGrad.addColorStop(0.55, "rgba(52, 49, 42, 0.56)");
  leafGrad.addColorStop(1, "rgba(88, 84, 74, 0.34)");
  dc.fillStyle = leafGrad;
  dc.fill();
  dc.restore();

  // Bold dry-brush upper ridge & radiating veins integrated cleanly over the leaf
  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [306, 188],
        [342, 174],
        [386, 178],
        [417, 200],
      ],
      4
    ),
    Array.from({ length: 13 }, (_, i) => lerp(2.2, 4.0, Math.sin((i / 12) * Math.PI))),
    "#181714",
    0.84
  );
  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [346, 182],
        [374, 194],
        [398, 218],
      ],
      4
    ),
    Array.from({ length: 9 }, (_, i) => lerp(3.0, 0.7, i / 8)),
    "#141411",
    0.9
  );
  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [346, 182],
        [336, 200],
        [330, 222],
      ],
      4
    ),
    Array.from({ length: 9 }, (_, i) => lerp(2.6, 0.6, i / 8)),
    "#191815",
    0.85
  );
  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [346, 182],
        [320, 194],
        [306, 208],
      ],
      4
    ),
    Array.from({ length: 9 }, (_, i) => lerp(2.4, 0.6, i / 8)),
    "#1d1c19",
    0.8
  );

  // 2. Eccentric Bada Shanren Cantilevered Rock ("方折奇峭、上宽下窄之顽石")
  // Narrow twisted ankle at (154..192, 520), deep inward notch on right-lower waist,
  // dramatic asymmetric boxy overhang jutting left (34..252, 130..310), slanted plateau top!
  const rockCtrl = [
    [156, 520],
    [154, 466],
    [138, 414],
    [102, 362],
    [54, 306],
    [36, 246],
    [52, 186],
    [82, 148],
    [138, 126],
    [206, 128],
    [248, 162],
    [244, 218],
    [214, 278],
    [218, 336],
    [194, 404],
    [194, 466],
    [186, 520],
  ];
  const rockSmooth = sampleSmoothClosed(rockCtrl, 5);

  // Base luminous rock silhouette clipped for seamless wet-on-wet Xuan-ink gradation ("破墨积墨")
  dc.save();
  dc.beginPath();
  dc.moveTo(rockSmooth[0][0], rockSmooth[0][1]);
  for (let i = 1; i < rockSmooth.length; i++) {
    dc.lineTo(rockSmooth[i][0], rockSmooth[i][1]);
  }
  dc.closePath();
  dc.clip();

  // Diagonal wet-ink gradient from airy bare Xuan upper-left brow to heavy lower-right base
  const rockGrad = dc.createLinearGradient(58, 152, 224, 472);
  rockGrad.addColorStop(0, "rgba(244, 238, 226, 0.15)");
  rockGrad.addColorStop(0.32, "rgba(154, 148, 134, 0.24)");
  rockGrad.addColorStop(0.72, "rgba(74, 70, 61, 0.44)");
  rockGrad.addColorStop(1, "rgba(44, 42, 36, 0.56)");
  dc.fillStyle = rockGrad;
  dc.fillRect(20, 110, 250, 420);

  // Soft pooled wet ink glow under the left overhanging brow & deep right cleft (no hard polygon edge)
  const cleftPool = dc.createRadialGradient(136, 316, 12, 148, 326, 108);
  cleftPool.addColorStop(0, "rgba(46, 44, 38, 0.42)");
  cleftPool.addColorStop(0.6, "rgba(62, 59, 51, 0.18)");
  cleftPool.addColorStop(1, "rgba(62, 59, 51, 0)");
  dc.fillStyle = cleftPool;
  dc.fillRect(20, 180, 240, 280);

  const hiGrad = dc.createRadialGradient(104, 192, 12, 104, 192, 90);
  hiGrad.addColorStop(0, "rgba(246, 240, 229, 0.82)");
  hiGrad.addColorStop(0.62, "rgba(246, 240, 229, 0.38)");
  hiGrad.addColorStop(1, "rgba(246, 240, 229, 0)");
  dc.fillStyle = hiGrad;
  dc.fillRect(20, 110, 200, 190);
  dc.restore();

  // BROKEN OPEN CALLIGRAPHIC CONTOURS ("有实有虚 · 断笔飞白"):
  // 1) Left ankle sweeping boldly up into overhanging left shelf (breaking off before top crown!)
  const leftShelfContour = sampleSmoothOpen(
    [
      [156, 520],
      [152, 464],
      [136, 412],
      [98, 360],
      [54, 304],
      [36, 246],
      [48, 194],
    ],
    5
  );
  drawFeibaiStroke(pg, leftShelfContour, 8.8, "#181714", 0.5, 915);

  // 2) Top slanted rocky crest (short disconnected dry-brush ridge leaving gaps of light paper)
  const topCrest = sampleSmoothOpen(
    [
      [82, 148],
      [136, 127],
      [204, 128],
      [246, 160],
    ],
    5
  );
  drawFeibaiStroke(pg, topCrest, 7.6, "#22201c", 0.58, 916);

  // 3) Heavy scorched-ink right shoulder & pinched base ("焦墨重顿")
  const rightContour = sampleSmoothOpen(
    [
      [246, 162],
      [244, 218],
      [214, 278],
      [218, 336],
      [194, 404],
      [194, 466],
      [186, 520],
    ],
    5
  );
  drawFeibaiStroke(pg, rightContour, 10.5, "#121210", 0.46, 917);

  // 4) Expressive internal Bada structural rock-fold strokes ("方折皴笔")
  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [68, 258],
        [124, 242],
        [174, 206],
        [222, 174],
      ],
      4
    ),
    Array.from({ length: 13 }, (_, i) => lerp(3.2, 6.2, Math.sin((i / 12) * Math.PI))),
    "#181714",
    0.72
  );
  drawFeibaiStroke(
    pg,
    sampleSmoothOpen(
      [
        [114, 362],
        [154, 338],
        [192, 304],
      ],
      4
    ),
    6.4,
    "#1a1916",
    0.6,
    918
  );
  drawFeibaiStroke(
    pg,
    sampleSmoothOpen(
      [
        [164, 472],
        [174, 424],
        [182, 386],
      ],
      4
    ),
    5.0,
    "#191815",
    0.58,
    919
  );
}

/**
 * Pre-bakes wild vertical running-script calligraphy inscription + two collector seals:
 * "无车有轮，翻眼看人 · 鹈鹕" + 朱文 "八大山人" & 白文 "白眼".
 */
function bakeCalligraphy(pg) {
  pg.clear();
  const dc = pg.drawingContext;
  const fontStack = "Xingkai SC, STXingkai, Kaiti SC, STKaiti, Kai, Songti SC, serif";

  const drawChar = (ch, x, y, size, rot, inkHex, alpha) => {
    pg.push();
    pg.translate(x, y);
    pg.rotate(rot);
    pg.drawingContext.globalAlpha = alpha;
    pg.noStroke();
    pg.fill(inkHex);
    pg.textAlign("center", "center");
    pg.textFont(fontStack);
    pg.textStyle("bold");
    pg.textSize(size);
    pg.text(ch, 0, 0);
    pg.pop();
  };

  // Column 1 (rightmost): 无 车 有 轮 ，
  const col1 = [
    ["无", 174, 30, 41, -0.1, "#131311", 0.95],
    ["车", 179, 75, 32, 0.08, "#1b1a17", 0.88],
    ["有", 172, 118, 39, -0.06, "#22211d", 0.85],
    ["轮", 178, 162, 35, 0.09, "#2d2b26", 0.78],
  ];
  for (const args of col1) drawChar(...args);

  // Subtle cursive linking wisps ("游丝") & sweeping comma flick under 轮
  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [179, 46],
        [175, 56],
        [180, 64],
      ],
      3
    ),
    Array.from({ length: 7 }, (_, i) => lerp(1.9, 0.7, i / 6)),
    "#23221e",
    0.45
  );
  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [174, 134],
        [180, 144],
        [176, 152],
      ],
      3
    ),
    Array.from({ length: 7 }, (_, i) => lerp(1.7, 0.7, i / 6)),
    "#2b2924",
    0.42
  );
  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [184, 184],
        [182, 192],
        [175, 198],
      ],
      3
    ),
    Array.from({ length: 7 }, (_, i) => lerp(3.4, 0.8, i / 6)),
    "#24221e",
    0.72
  );

  // Column 2 (middle): 翻 眼 看 人
  const col2 = [
    ["翻", 112, 34, 42, 0.06, "#131311", 0.96],
    ["眼", 107, 81, 37, -0.08, "#191815", 0.91],
    ["看", 114, 124, 31, 0.05, "#252420", 0.83],
    ["人", 108, 174, 46, -0.07, "#181714", 0.89],
  ];
  for (const args of col2) drawChar(...args);

  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [112, 51],
        [107, 61],
        [109, 69],
      ],
      3
    ),
    Array.from({ length: 7 }, (_, i) => lerp(1.8, 0.7, i / 6)),
    "#1c1b18",
    0.48
  );
  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [119, 185],
        [131, 202],
        [146, 217],
      ],
      4
    ),
    Array.from({ length: 9 }, (_, i) => lerp(3.8, 0.5, i / 8)),
    "#1f1e1a",
    0.6
  );

  // Column 3 (left signature column): · 鹈 鹕
  dc.save();
  dc.fillStyle = "rgba(32, 30, 26, 0.82)";
  dc.beginPath();
  dc.arc(50, 56, 3.0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  drawChar("鹈", 50, 87, 30, -0.06, "#191815", 0.91);
  drawChar("鹕", 52, 122, 31, 0.07, "#24221e", 0.84);

  // Two traditional collector red seals ("朱文" + "白文") beneath signature
  drawRedSeal(pg, 51, 172, "八大山人", 36, "#a62b22", "zhuwen");
  drawRedSeal(pg, 51, 218, "白眼", 32, "#a62b22", "baiwen");
}

/**
 * Draws the 4-stroke freehand ink bicycle + 6-stroke Bada Shanren splash-ink Pelican.
 * Strictly driven by `getRigPose` coordinates; Bar 2 (u in [2.0, 4.0)) unleashes the
 * exaggerated squarish-round white eye with pupil slammed to the top corner ("翻白眼").
 */
function drawBadaPelicanRig(g, pose, u, beatPulse) {
  const s = pose.scale;
  const dc = g.drawingContext;
  const inkDark = "#141412";
  const inkMid = "#4d4a42";

  // Bar 2 eye-roll envelope: snaps crisp on Beat 0 of Bar 2 (u = 2.0), relaxes smoothly in Bar 3
  const eyeRoll = smoothstep(1.82, 2.08, u) * (1 - smoothstep(3.92, 4.26, u));

  // === BICYCLE: 4 MINIMALIST FREEHAND INK STROKES ===

  const drawInkWheel = (hub, seedShift) => {
    const r = pose.wheelRadius;
    const pts = [];
    const widths = [];
    const segs = 44;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2 + seedShift;
      const wob = Math.sin(a * 3 + seedShift) * 1.1 * s + Math.cos(a * 2) * 0.8 * s;
      pts.push([hub.x + Math.cos(a) * (r + wob), hub.y + Math.sin(a) * (r + wob)]);
      widths.push((3.5 + Math.sin(a + 0.9) * 1.6) * s);
    }
    drawCalligraphicBrush(dc, pts, widths, "#22201c", 0.9);

    for (let k = 0; k < 3; k++) {
      const sa = pose.wheelRot + (k * Math.PI * 2) / 3;
      drawCalligraphicBrush(
        dc,
        [
          [hub.x + Math.cos(sa) * 5 * s, hub.y + Math.sin(sa) * 5 * s],
          [hub.x + Math.cos(sa) * (r * 0.55), hub.y + Math.sin(sa) * (r * 0.55)],
          [hub.x + Math.cos(sa) * (r - 4 * s), hub.y + Math.sin(sa) * (r - 4 * s)],
        ],
        [2.2 * s, 1.5 * s, 0.8 * s],
        "#36342e",
        0.58
      );
    }
  };

  // Bike Stroke 1 & 2: Rear and front freehand ink wheels
  drawInkWheel(pose.rearHub, 0.3);
  drawInkWheel(pose.frontHub, 1.7);

  // Bike Stroke 3: Flowing calligraphic ink frame + fork + saddle + handlebar sweep
  drawCalligraphicBrush(
    dc,
    [
      [pose.rearHub.x, pose.rearHub.y],
      [pose.seatCluster.x, pose.seatCluster.y],
      [pose.headTop.x, pose.headTop.y],
      [pose.stemTop.x, pose.stemTop.y],
      [pose.barGrip.x, pose.barGrip.y],
    ],
    [4.0 * s, 6.2 * s, 5.8 * s, 4.4 * s, 3.2 * s],
    "#1c1b18",
    0.9
  );
  drawCalligraphicBrush(
    dc,
    [
      [pose.headTop.x, pose.headTop.y],
      [pose.frontHub.x, pose.frontHub.y],
    ],
    [5.2 * s, 3.2 * s],
    "#1c1b18",
    0.86
  );
  drawCalligraphicBrush(
    dc,
    [
      [pose.rearHub.x, pose.rearHub.y],
      [pose.bb.x, pose.bb.y],
      [pose.headBot.x, pose.headBot.y],
    ],
    [3.8 * s, 5.4 * s, 4.0 * s],
    "#2d2b26",
    0.82
  );
  drawCalligraphicBrush(
    dc,
    [
      [pose.saddleRear.x, pose.saddleRear.y],
      [pose.saddleFront.x, pose.saddleFront.y],
    ],
    [5.5 * s, 3.4 * s],
    "#181714",
    0.88
  );

  // Bike Stroke 4: Rotating crank & pedals synced to pose.pedalAngle
  drawCalligraphicBrush(
    dc,
    [
      [pose.leftPedal.x, pose.leftPedal.y],
      [pose.bb.x, pose.bb.y],
      [pose.rightPedal.x, pose.rightPedal.y],
    ],
    [3.0 * s, 5.2 * s, 3.4 * s],
    "#171714",
    0.88
  );
  dc.save();
  dc.fillStyle = inkDark;
  dc.beginPath();
  dc.ellipse(pose.leftPedal.x, pose.leftPedal.y, 7.5 * s, 2.8 * s, 0, 0, Math.PI * 2);
  dc.ellipse(pose.rightPedal.x, pose.rightPedal.y, 8 * s, 3 * s, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // === PELICAN: 6 MINIMALIST BADA SHANREN INK STROKES ===

  // Pelican Stroke 1: Plump hunched organic belly ("圆滚鼓腹一笔淡墨")
  const bellyPts = sampleSmoothClosed(
    [
      [pose.tailTip.x + 12 * s, pose.tailTip.y + 4 * s],
      [pose.bodyCenter.x - 30 * s, pose.bodyCenter.y - 24 * s],
      [pose.shoulder.x + 10 * s, pose.shoulder.y - 16 * s],
      [pose.neckBase.x + 22 * s, pose.neckBase.y + 10 * s],
      [pose.bodyCenter.x + 38 * s, pose.bodyCenter.y + 20 * s],
      [pose.hip.x + 14 * s, pose.hip.y + 16 * s],
      [pose.hip.x - 20 * s, pose.hip.y + 8 * s],
    ],
    5
  );
  dc.save();
  dc.fillStyle = "rgba(244, 238, 226, 0.94)";
  dc.beginPath();
  dc.moveTo(bellyPts[0][0], bellyPts[0][1]);
  for (let i = 1; i < bellyPts.length; i++) dc.lineTo(bellyPts[i][0], bellyPts[i][1]);
  dc.closePath();
  dc.fill();
  dc.restore();

  drawInkWash(g, bellyPts, "#767267", 0.34, { layers: 3, edgeAlpha: 0.06, edgeWidth: 1.2 * s });
  dc.save();
  const bellyHi = dc.createRadialGradient(
    pose.bodyCenter.x + 12 * s,
    pose.bodyCenter.y + 4 * s,
    4 * s,
    pose.bodyCenter.x + 12 * s,
    pose.bodyCenter.y + 4 * s,
    36 * s
  );
  bellyHi.addColorStop(0, "rgba(248, 243, 233, 0.68)");
  bellyHi.addColorStop(1, "rgba(248, 243, 233, 0)");
  dc.fillStyle = bellyHi;
  dc.beginPath();
  dc.arc(pose.bodyCenter.x + 12 * s, pose.bodyCenter.y + 4 * s, 36 * s, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // Pelican Stroke 2: Smooth scorched-ink wing & tail sweep ("翅尖一笔焦墨顿挫")
  const wingSmooth = sampleSmoothOpen(
    [
      [pose.tailTip.x - 10 * s, pose.tailTip.y + 5 * s],
      [pose.bodyCenter.x - 18 * s, pose.bodyCenter.y - 3 * s],
      [pose.shoulder.x + 2 * s, pose.shoulder.y - 3 * s],
      [pose.wingElbow.x + 4 * s, pose.wingElbow.y + 5 * s],
      [pose.barGrip.x + 2 * s, pose.barGrip.y + 2 * s],
    ],
    5
  );
  const wingWidths = wingSmooth.map((_, idx) => {
    const k = idx / (wingSmooth.length - 1);
    if (k < 0.35) return lerp(4.5, 17.5, k / 0.35) * s;
    if (k < 0.65) return lerp(17.5, 12.5, (k - 0.35) / 0.3) * s;
    return lerp(12.5, 4.8, (k - 0.65) / 0.35) * s;
  });
  drawCalligraphicBrush(dc, wingSmooth, wingWidths, inkDark, 0.94);

  // Head subtle aloof chin-up tilt during Bar 2 eye-roll
  const headTilt = -0.13 * eyeRoll;
  const rotAroundHead = (pt) => {
    if (Math.abs(headTilt) < 0.001) return pt;
    const dx = pt.x - pose.head.x;
    const dy = pt.y - pose.head.y;
    const c = Math.cos(headTilt);
    const sn = Math.sin(headTilt);
    return {
      x: pose.head.x + dx * c - dy * sn,
      y: pose.head.y + dx * sn + dy * c,
    };
  };

  // Pelican Stroke 3: Clean fluid calligraphic S-neck + hunched cranium ("长颈一笔带过")
  const neckRaw = pose.neckCurve.map((pt) => [pt.x, pt.y]);
  const neckSmooth = sampleSmoothOpen(neckRaw, 5);
  // Soft luminous Xuan backing along neck so silhouette remains crisp against the rock
  drawCalligraphicBrush(
    dc,
    neckSmooth,
    neckSmooth.map(() => 18 * s),
    "#f4ede0",
    0.95
  );
  // Fluid mid-ink wash neck + crisp single dark brush contour along nape ("干湿相生一笔颈")
  drawCalligraphicBrush(
    dc,
    neckSmooth,
    neckSmooth.map((_, idx) => lerp(14.5, 10.5, idx / (neckSmooth.length - 1)) * s),
    "#6b675c",
    0.34
  );
  const napeCurve = neckSmooth.map(([nx, ny], idx) => {
    const k = idx / (neckSmooth.length - 1);
    return [nx - lerp(6.2, 4.4, k) * s, ny];
  });
  drawCalligraphicBrush(
    dc,
    napeCurve,
    napeCurve.map((_, idx) => {
      const k = idx / (napeCurve.length - 1);
      return (2.8 + Math.sin(k * Math.PI) * 2.2) * s;
    }),
    "#1a1916",
    0.88
  );
  const throatCurve = neckSmooth.map(([nx, ny], idx) => {
    const k = idx / (neckSmooth.length - 1);
    return [nx + lerp(5.4, 3.8, k) * s, ny];
  });
  drawCalligraphicBrush(
    dc,
    throatCurve,
    throatCurve.map((_, idx) => {
      const k = idx / (throatCurve.length - 1);
      return (1.6 + Math.sin(k * Math.PI) * 1.1) * s;
    }),
    "#3a3832",
    0.58
  );

  // Smooth Bada head wash + expressive dark crown & cheeky crest tufts
  g.push();
  g.translate(pose.head.x, pose.head.y);
  g.rotate(headTilt);
  dc.save();
  dc.fillStyle = "#f4ede0";
  dc.beginPath();
  dc.ellipse(0, 0, 22 * s, 18 * s, -0.08, 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = "rgba(116, 112, 101, 0.16)";
  dc.beginPath();
  dc.ellipse(-3 * s, 3 * s, 19 * s, 14 * s, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [-25 * s, -16 * s],
        [-11 * s, -17 * s],
        [5 * s, -16 * s],
        [17 * s, -10 * s],
      ],
      4
    ),
    Array.from(
      { length: 13 },
      (_, i) => lerp(3.2, 4.2, Math.sin((i / 12) * Math.PI)) * (1 + (i > 2 && i < 9 ? 0.9 : 0)) * s
    ),
    inkDark,
    0.93
  );
  drawCalligraphicBrush(
    dc,
    [
      [-13 * s, -16 * s],
      [-24 * s, -26 * s],
    ],
    [4.4 * s, 1.3 * s],
    inkDark,
    0.9
  );
  g.pop();

  // Pelican Stroke 4: Hooked beak & fluid watercolor ink throat pouch
  const bTop = rotAroundHead(pose.beakBaseTop);
  const bTip = rotAroundHead(pose.beakTip);
  const bHook = rotAroundHead(pose.beakHook);
  const pMid = rotAroundHead(pose.pouchMid);
  const pBase = rotAroundHead(pose.pouchBase);

  dc.save();
  dc.beginPath();
  dc.moveTo(pBase.x, pBase.y);
  dc.bezierCurveTo(
    pMid.x - 16 * s,
    pMid.y + 12 * s,
    pMid.x + 34 * s,
    pMid.y + 5 * s,
    bTip.x - 3 * s,
    bTip.y + 4 * s
  );
  dc.lineTo(bTop.x, bTop.y + 9 * s);
  dc.closePath();
  const pouchGrad = dc.createLinearGradient(pBase.x, bTop.y, pMid.x + 10 * s, pMid.y + 12 * s);
  pouchGrad.addColorStop(0, "rgba(128, 114, 94, 0.24)");
  pouchGrad.addColorStop(0.65, "rgba(116, 104, 86, 0.36)");
  pouchGrad.addColorStop(1, "rgba(96, 86, 72, 0.44)");
  dc.fillStyle = pouchGrad;
  dc.fill();
  dc.strokeStyle = "rgba(44, 41, 36, 0.42)";
  dc.lineWidth = 1.6 * s;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(pBase.x + 4 * s, pBase.y + 4 * s);
  dc.bezierCurveTo(
    pMid.x - 12 * s,
    pMid.y + 11 * s,
    pMid.x + 30 * s,
    pMid.y + 5 * s,
    bTip.x - 5 * s,
    bTip.y + 5 * s
  );
  dc.stroke();
  dc.restore();

  drawCalligraphicBrush(
    dc,
    sampleSmoothOpen(
      [
        [bTop.x - 2 * s, bTop.y + 2 * s],
        [lerp(bTop.x, bTip.x, 0.5), lerp(bTop.y, bTip.y, 0.5)],
        [bTip.x, bTip.y],
        [bHook.x, bHook.y + 2 * s],
      ],
      4
    ),
    Array.from({ length: 13 }, (_, i) => lerp(7.8, 1.6, i / 12) * s),
    inkDark,
    0.94
  );

  // Pelican Stroke 5: Two calligraphic pedaling legs strictly synced to IK joints
  drawCalligraphicBrush(
    dc,
    [
      [pose.hip.x - 2 * s, pose.hip.y],
      [pose.leftKnee.x, pose.leftKnee.y],
      [pose.leftPedal.x, pose.leftPedal.y],
    ],
    [7.5 * s, 5.8 * s, 4.2 * s],
    inkMid,
    0.78
  );
  drawCalligraphicBrush(
    dc,
    [
      [pose.hip.x, pose.hip.y],
      [pose.rightKnee.x, pose.rightKnee.y],
      [pose.rightPedal.x, pose.rightPedal.y],
    ],
    [8.2 * s, 6.2 * s, 4.4 * s],
    inkDark,
    0.94
  );

  // Pelican Stroke 6: The Signature Bada Shanren Square-Round White Eye ("白眼向人")
  const eyeCenter = rotAroundHead(pose.eye);
  const beatAccent = eyeRoll > 0.35 ? 1 + 0.05 * beatPulse : 1;
  const eyeW = lerp(15.0, 31.0, eyeRoll) * beatAccent * s;
  const eyeH = lerp(11.2, 24.0, eyeRoll) * beatAccent * s;

  g.push();
  g.translate(eyeCenter.x - eyeRoll * 4.5 * s, eyeCenter.y - eyeRoll * 2.5 * s);
  g.rotate(headTilt * 0.45);

  dc.save();
  const hw = eyeW * 0.5;
  const hh = eyeH * 0.5;
  const corner = lerp(4.8, 7.2, eyeRoll) * s;

  // Hand-brushed Bada squarish-round socket ("方圆带弧眼眶")
  dc.beginPath();
  dc.moveTo(-hw + corner, -hh);
  dc.quadraticCurveTo(0, -hh - 1.0 * s, hw - corner, -hh);
  dc.quadraticCurveTo(hw + 0.8 * s, -hh, hw, -hh + corner);
  dc.quadraticCurveTo(hw + 0.8 * s, 0, hw, hh - corner);
  dc.quadraticCurveTo(hw, hh + 0.8 * s, hw - corner, hh);
  dc.quadraticCurveTo(0, hh + 1.6 * s, -hw + corner, hh);
  dc.quadraticCurveTo(-hw - 0.6 * s, hh, -hw, hh - corner);
  dc.quadraticCurveTo(-hw - 0.6 * s, 0, -hw, -hh + corner);
  dc.quadraticCurveTo(-hw, -hh, -hw + corner, -hh);
  dc.closePath();

  dc.fillStyle = "#fcf8ee";
  dc.fill();
  dc.strokeStyle = inkDark;
  dc.lineWidth = lerp(2.0, 2.7, eyeRoll) * s;
  dc.lineJoin = "round";
  dc.stroke();

  // Bold flat-pressed upper eyelid ("冷眼平压上睑")
  drawCalligraphicBrush(
    dc,
    [
      [-hw - 3.5 * s, -hh - 0.5 * s],
      [0, -hh - 1.0 * s],
      [hw + 4.0 * s, -hh + 0.4 * s],
    ],
    [
      lerp(1.4, 2.8, eyeRoll) * s,
      lerp(2.2, 4.4, eyeRoll) * s,
      lerp(1.2, 2.2, eyeRoll) * s,
    ],
    inkDark,
    0.96
  );

  // Black pupil: aloof slightly-high gaze at rest, jammed dead into uppermost top corner in Bar 2!
  const pupilR = lerp(2.5, 3.6, eyeRoll) * s;
  const pupilX = lerp(0.8 * s, -hw * 0.44, eyeRoll);
  const pupilY = lerp(-1.5 * s, -hh + pupilR + 0.4 * s, eyeRoll);
  dc.fillStyle = "#0d0d0b";
  dc.beginPath();
  dc.arc(pupilX, pupilY, pupilR, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  g.pop();
}

export default function render(ctx) {
  const { p, g, kit, localTime, beat } = ctx;
  const u = localTime;

  const paper = getInkPaperLayer(kit, "xieyi", 1840, 1000);
  const ground = kit.bakeLayer("s09_bada_ground_v3", 1840, 120, bakeGroundStrokes);
  const rockLotus = kit.bakeLayer("s09_bada_rock_lotus_v4", 460, 560, bakeRockAndLotus);
  const calligraphy = kit.bakeLayer("s09_bada_calligraphy_v3", 240, 260, bakeCalligraphy);

  // 1. Minimalist raw Xuan paper backdrop (>80% negative space)
  p.push();
  p.imageMode(p.CENTER);
  p.image(paper, 500, 500, 1840, 1000);
  p.pop();

  g.push();

  // 2. Two heroic dry-brush ground strokes along ROAD_Y = 730
  g.image(ground, BLEED_LEFT, ROAD_Y - 40);

  // 3. Wild running-script calligraphy & two red seals in upper-left negative space
  g.image(calligraphy, 74, 162);

  // 4. Eccentric top-heavy rock ("顽石") + withered lotus on right (x ≈ 710..970)
  // Subtly reacts in Bar 2: leans back ~1.6 deg & freezes deadpan speechless with the bird
  const rockFreeze = smoothstep(1.9, 2.25, u) * (1 - smoothstep(3.65, 4.15, u));
  const idleSway = (1 - rockFreeze) * Math.sin(u * Math.PI) * 0.008;
  const rockLean = 0.028 * rockFreeze + idleSway;

  g.push();
  g.translate(812, ROAD_Y + 2);
  g.rotate(rockLean);
  g.image(rockLotus, -170, -520);
  g.pop();

  // 5. Minimalist 6-stroke Pelican + 4-stroke Ink Bicycle synced to getRigPose
  const uWarped = getBadaPelicanProgress(u);
  const px = BLEED_LEFT + CROSS_SPEED * uWarped;
  const pedalPhase = (SCENE_START_T + uWarped) * Math.PI * 2;
  const pose = getRigPose(SCENE_START_T + uWarped, {
    x: px,
    y: ROAD_Y,
    scale: 1.0,
    pedalPhase,
  });
  drawBadaPelicanRig(g, pose, u, beat?.beatPulse ?? 0);

  // 6. Antique mounted scroll Title Card
  drawEraTitleCard(g, META, u);

  g.pop();
}
