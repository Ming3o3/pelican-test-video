/**
 * Scene #03 — 汉画像石拓片 · Han Stone Rubbing (c. 100 CE), t in [17.0, 23.0).
 * Tribute to Eastern Han Wu Liang Shrine & Xiaotangshan stone reliefs:
 * pitch-black Wujin rubbing ground (#171614) with un-inked warm Xuan-ivory reliefs (#efe9dc),
 * upper/lower lozenge, cloud-scroll & linked-arc stone friezes, incised clerical cartouche,
 * auspicious flying birds & cloud vapors, and a grand Han chariot procession along ROAD_Y = 730
 * where the Pelican blends in on a 16-spoke canopy bicycle—sparking a Bar 2 double-take
 * from both the lead carriage horse and the rear official ("此车无马").
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  BUFFER_W,
  ROAD_Y,
  clamp,
  getScenePelicanX,
  smoothstep,
} from "../beat.js";
import { drawRedSeal, getInkPaperLayer } from "../kit/ink.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[2];

const INK_BLACK = "#171614";
const IVORY = "#efe9dc";
const IVORY_WARM = "#e4dccb";
const IVORY_DIM = "#bdb5a4";
const IVORY_FAR = "#9c9586";
const LISHU_FONT = '"Baoli SC", "Libian SC", "Songti SC", STSong, serif';

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function toPgX(sceneX) {
  return sceneX - BLEED_LEFT;
}

/**
 * Draws a Han clerical-script glyph with wide, flat proportions ("蚕头燕尾、扁方宽博").
 */
function drawLishuGlyph(dc, ch, x, y, size, color = IVORY, alpha = 1) {
  dc.save();
  dc.globalAlpha *= alpha;
  dc.translate(x, y);
  dc.scale(1.16, 0.85);
  dc.font = `bold ${size}px ${LISHU_FONT}`;
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillStyle = color;
  dc.fillText(ch, 0, 0);
  dc.restore();
}

/**
 * Draws a Han stone-relief wheel with heavy carved felloe, 16 spokes, nave hub, and subtle chip nicks.
 */
function drawHanWheel(dc, cx, cy, r, rot, tone = IVORY, chipSeed = 11) {
  const rand = prng(chipSeed);
  dc.save();
  dc.translate(cx, cy);

  // Outer stone-carved felloe ("牙")
  dc.beginPath();
  dc.arc(0, 0, r - 3.2, 0, Math.PI * 2);
  dc.strokeStyle = tone;
  dc.lineWidth = 6.4;
  dc.stroke();

  // Inner incised groove separating felloe & spokes
  dc.beginPath();
  dc.arc(0, 0, r - 7.5, 0, Math.PI * 2);
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.6;
  dc.stroke();

  // 16 carved wooden spokes ("十六辐")
  dc.strokeStyle = tone;
  dc.lineWidth = 2.3;
  dc.lineCap = "butt";
  const innerR = Math.max(7, r * 0.17);
  const outerR = r - 6.8;
  for (let i = 0; i < 16; i++) {
    const a = rot + (i * Math.PI) / 8;
    dc.beginPath();
    dc.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    dc.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    dc.stroke();
  }

  // Prominent Han wooden nave/hub ("车毂") with incised axle pin
  dc.beginPath();
  dc.arc(0, 0, innerR + 3.5, 0, Math.PI * 2);
  dc.fillStyle = tone;
  dc.fill();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.6;
  dc.stroke();

  dc.beginPath();
  dc.arc(0, 0, Math.max(3.2, innerR * 0.48), 0, Math.PI * 2);
  dc.fillStyle = INK_BLACK;
  dc.fill();

  // Subtle carved limestone chip nicks along outer tire rim ("微缺角做旧")
  dc.fillStyle = INK_BLACK;
  for (let c = 0; c < 4; c++) {
    const ca = rot + rand() * Math.PI * 2;
    const nr = r - 2.2;
    dc.beginPath();
    dc.arc(Math.cos(ca) * nr, Math.sin(ca) * nr, 1.8 + rand() * 1.4, 0, Math.PI * 2);
    dc.fill();
  }

  dc.restore();
}

/**
 * Draws a Han S-scroll cloud vapor motif ("汉画云气纹") with incised interior ribs.
 */
function drawHanCloudScroll(dc, x, y, scale = 1, flip = 1) {
  dc.save();
  dc.translate(x, y);
  dc.scale(flip * scale, scale);
  dc.lineCap = "round";
  dc.lineJoin = "round";

  dc.beginPath();
  dc.moveTo(-78, 18);
  dc.bezierCurveTo(-48, 22, -26, -12, 8, -10);
  dc.bezierCurveTo(42, -8, 62, 14, 92, 6);
  dc.bezierCurveTo(106, 2, 108, -12, 95, -15);
  dc.bezierCurveTo(84, -17, 81, -7, 89, -4);
  dc.strokeStyle = IVORY_WARM;
  dc.lineWidth = 6.2;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-10, -8);
  dc.bezierCurveTo(-4, -34, 24, -44, 42, -30);
  dc.bezierCurveTo(54, -20, 46, -6, 34, -11);
  dc.bezierCurveTo(26, -15, 31, -24, 38, -21);
  dc.strokeStyle = IVORY_WARM;
  dc.lineWidth = 4.6;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-38, 12);
  dc.bezierCurveTo(-52, 32, -78, 34, -88, 20);
  dc.bezierCurveTo(-94, 10, -82, 2, -75, 9);
  dc.strokeStyle = IVORY_DIM;
  dc.lineWidth = 3.6;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-70, 17);
  dc.bezierCurveTo(-44, 20, -24, -10, 8, -9);
  dc.bezierCurveTo(40, -7, 60, 12, 88, 5);
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.3;
  dc.stroke();

  dc.restore();
}

/**
 * Draws a Han stone-carved auspicious flying bird ("汉画祥瑞飞鸟").
 */
function drawAuspiciousBird(dc, x, y, scale = 1, dir = 1) {
  dc.save();
  dc.translate(x, y);
  dc.scale(dir * scale, scale);

  dc.fillStyle = IVORY;
  dc.beginPath();
  dc.moveTo(-48, 8);
  dc.bezierCurveTo(-28, 12, -10, 10, 12, 6);
  dc.bezierCurveTo(26, 4, 34, -8, 36, -20);
  dc.lineTo(50, -18);
  dc.lineTo(39, -12);
  dc.bezierCurveTo(40, 2, 28, 18, 4, 20);
  dc.bezierCurveTo(-18, 22, -36, 17, -56, 22);
  dc.bezierCurveTo(-48, 15, -48, 11, -48, 8);
  dc.closePath();
  dc.fill();

  dc.strokeStyle = IVORY;
  dc.lineWidth = 2.6;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(31, -20);
  dc.bezierCurveTo(20, -32, 6, -33, -4, -27);
  dc.moveTo(29, -17);
  dc.bezierCurveTo(18, -24, 8, -24, 1, -19);
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-8, 6);
  dc.bezierCurveTo(-22, -20, -46, -34, -68, -26);
  dc.bezierCurveTo(-52, -16, -42, -4, -30, 4);
  dc.closePath();
  dc.fillStyle = IVORY;
  dc.fill();

  dc.strokeStyle = IVORY_WARM;
  dc.lineWidth = 2.8;
  dc.beginPath();
  dc.moveTo(-48, 14);
  dc.bezierCurveTo(-74, 18, -94, 6, -110, 14);
  dc.moveTo(-46, 17);
  dc.bezierCurveTo(-72, 28, -92, 26, -108, 32);
  dc.stroke();

  dc.fillStyle = INK_BLACK;
  dc.beginPath();
  dc.arc(36, -17, 2.0, 0, Math.PI * 2);
  dc.fill();

  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.moveTo(-14, 2);
  dc.bezierCurveTo(-28, -12, -44, -20, -58, -18);
  dc.moveTo(-18, 5);
  dc.bezierCurveTo(-30, -4, -42, -10, -52, -9);
  dc.stroke();

  dc.restore();
}

/**
 * Draws horizontal Han stone decorative friezes:
 * 连弧纹 (linked arcs), 菱格纹 (lozenge lattice), and 卷云纹 (cloud-scroll band).
 */
function drawHanDecorativeBorders(dc, w, rand) {
  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";

  const drawLinkedArcs = (yTop, arcW, arcH, invert = false, lineW = 2.3) => {
    dc.strokeStyle = IVORY_WARM;
    dc.lineWidth = lineW;
    dc.beginPath();
    for (let x = 0; x <= w + arcW; x += arcW) {
      const cx = x + arcW * 0.5;
      if (invert) {
        dc.moveTo(x, yTop);
        dc.quadraticCurveTo(cx, yTop + arcH, x + arcW, yTop);
      } else {
        dc.moveTo(x, yTop + arcH);
        dc.quadraticCurveTo(cx, yTop, x + arcW, yTop + arcH);
      }
    }
    dc.stroke();

    dc.fillStyle = IVORY_DIM;
    for (let x = arcW * 0.5; x < w; x += arcW) {
      dc.beginPath();
      dc.arc(x, yTop + (invert ? arcH * 0.36 : arcH * 0.64), 1.8, 0, Math.PI * 2);
      dc.fill();
    }
  };

  const drawLozengeBand = (yMid, cellW, halfH, lineW = 2.0) => {
    dc.strokeStyle = IVORY;
    dc.lineWidth = lineW;
    dc.beginPath();
    for (let x = 0; x <= w + cellW; x += cellW) {
      const cx = x + cellW * 0.5;
      dc.moveTo(x, yMid);
      dc.lineTo(cx, yMid - halfH);
      dc.lineTo(x + cellW, yMid);
      dc.lineTo(cx, yMid + halfH);
      dc.closePath();
    }
    dc.stroke();

    dc.strokeStyle = IVORY_DIM;
    dc.lineWidth = 1.05;
    dc.beginPath();
    for (let x = 0; x <= w + cellW; x += cellW) {
      const cx = x + cellW * 0.5;
      const dx = cellW * 0.25;
      const dy = halfH * 0.5;
      dc.moveTo(cx - dx, yMid);
      dc.lineTo(cx, yMid - dy);
      dc.lineTo(cx + dx, yMid);
      dc.lineTo(cx, yMid + dy);
      dc.closePath();
    }
    dc.stroke();

    dc.fillStyle = IVORY_WARM;
    for (let x = cellW * 0.5; x < w; x += cellW) {
      dc.beginPath();
      dc.arc(x, yMid, 1.8, 0, Math.PI * 2);
      dc.fill();
    }
  };

  const drawScrollBand = (yMid, period, amp) => {
    dc.strokeStyle = IVORY_WARM;
    dc.lineWidth = 2.2;
    dc.beginPath();
    for (let x = 0; x < w; x += period) {
      const x1 = x + period * 0.35;
      const x2 = x + period * 0.7;
      const x3 = x + period;
      dc.moveTo(x, yMid + amp * 0.4);
      dc.bezierCurveTo(x + period * 0.2, yMid - amp, x1 + 8, yMid - amp, x2, yMid);
      dc.bezierCurveTo(x2 + period * 0.14, yMid + amp * 0.9, x3 - 8, yMid + amp * 0.9, x3, yMid + amp * 0.3);
    }
    dc.stroke();

    dc.strokeStyle = IVORY_DIM;
    dc.lineWidth = 1.5;
    for (let x = 0; x < w; x += period) {
      dc.beginPath();
      dc.arc(x + period * 0.42, yMid - amp * 0.28, 3.2, 0, Math.PI * 1.65);
      dc.stroke();
    }
  };

  // --- TOP HAN FRIEZE (y = 3..31, dual tier: 连弧纹 + 菱格纹, cleanly above Title Card at y = 32) ---
  dc.fillStyle = "rgba(18, 17, 15, 0.75)";
  dc.fillRect(0, 0, w, 31);
  dc.strokeStyle = IVORY;
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.moveTo(0, 3);
  dc.lineTo(w, 3);
  dc.moveTo(0, 14);
  dc.lineTo(w, 14);
  dc.moveTo(0, 31);
  dc.lineTo(w, 31);
  dc.stroke();
  drawLinkedArcs(4, 24, 9, true, 1.7);
  drawLozengeBand(22.5, 32, 6.8, 1.7);

  // --- LOWER GRAND HAN FRIEZE (y = 824..990) ---
  dc.fillStyle = "rgba(18, 17, 15, 0.76)";
  dc.fillRect(0, 824, w, 176);

  dc.strokeStyle = IVORY;
  dc.lineWidth = 2.8;
  dc.beginPath();
  dc.moveTo(0, 826);
  dc.lineTo(w, 826);
  dc.moveTo(0, 833);
  dc.lineTo(w, 833);
  dc.moveTo(0, 872);
  dc.lineTo(w, 872);
  dc.moveTo(0, 926);
  dc.lineTo(w, 926);
  dc.moveTo(0, 978);
  dc.lineTo(w, 978);
  dc.moveTo(0, 986);
  dc.lineTo(w, 986);
  dc.stroke();

  drawLinkedArcs(837, 46, 30, false, 2.3);
  drawLozengeBand(899, 52, 22, 2.0);
  drawScrollBand(952, 92, 18);

  // Subtle carved wear chips along upper/lower decorative border lines
  dc.fillStyle = INK_BLACK;
  for (let i = 0; i < 65; i++) {
    const cx = rand() * w;
    const cy = rand() < 0.3 ? 3 + rand() * 28 : 826 + rand() * 160;
    dc.beginPath();
    dc.arc(cx, cy, 1.5 + rand() * 2.5, 0, Math.PI * 2);
    dc.fill();
  }

  dc.restore();
}

/**
 * Pre-bakes authentic stone rubbing patina: dabbed Wujin ink mottling ("扑墨"),
 * staggered masonry-style stone chisel clusters ("分段短凿痕"), mineral "石花",
 * upper/lower decorative friezes, incised cartouche ("鹈鹕车马图 / 东汉"), and cloud-birds.
 */
function bakeHanReliefLayer(pg) {
  const w = BUFFER_W;
  const h = 1000;
  pg.clear();
  const dc = pg.drawingContext;
  const rand = prng(100203);

  // 1. Authentic Wujin tamping-pad ink mottling ("拓包扑墨浓淡斑驳")
  dc.save();
  for (let i = 0; i < 140; i++) {
    const mx = rand() * w;
    const my = rand() * h;
    const rx = 55 + rand() * 145;
    const ry = 35 + rand() * 95;
    const dark = rand() < 0.52;
    const grad = dc.createRadialGradient(mx, my, 4, mx, my, rx);
    if (dark) {
      grad.addColorStop(0, "rgba(10, 9, 8, 0.28)");
      grad.addColorStop(1, "rgba(10, 9, 8, 0)");
    } else {
      grad.addColorStop(0, "rgba(52, 48, 41, 0.17)");
      grad.addColorStop(1, "rgba(52, 48, 41, 0)");
    }
    dc.fillStyle = grad;
    dc.beginPath();
    dc.ellipse(mx, my, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    dc.fill();
  }

  // 2. Staggered stone-carver's short chisel rows ("汉画像石减地分段凿痕")
  dc.lineCap = "round";
  for (let row = 0; row < 48; row++) {
    const ry = 36 + row * 16.5 + (rand() - 0.5) * 6;
    let cx = rand() * 40;
    while (cx < w) {
      const clusterLen = 3 + Math.floor(rand() * 7);
      const ang = (rand() < 0.5 ? -0.45 : 0.42) + (rand() - 0.5) * 0.16;
      const stepX = 5.5 + rand() * 3.5;
      for (let k = 0; k < clusterLen && cx < w; k++) {
        const len = 7 + rand() * 11;
        const bright = rand() < 0.24;
        dc.strokeStyle = bright
          ? `rgba(218, 210, 194, ${(0.045 + rand() * 0.055).toFixed(3)})`
          : `rgba(8, 8, 7, ${(0.22 + rand() * 0.24).toFixed(3)})`;
        dc.lineWidth = 1.0 + rand() * 1.1;
        dc.beginPath();
        dc.moveTo(cx, ry + (rand() - 0.5) * 3);
        dc.lineTo(cx + Math.cos(ang) * len, ry + Math.sin(ang) * len);
        dc.stroke();
        cx += stepX;
      }
      cx += 26 + rand() * 75;
    }
  }

  // Mineral "stone flowers" ("石花")
  for (let i = 0; i < 1100; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 0.7 + rand() * 2.2;
    dc.fillStyle =
      rand() < 0.62
        ? `rgba(225, 218, 204, ${(0.04 + rand() * 0.085).toFixed(3)})`
        : `rgba(110, 104, 94, ${(0.07 + rand() * 0.09).toFixed(3)})`;
    dc.beginPath();
    dc.arc(x, y, r, 0, Math.PI * 2);
    dc.fill();
  }

  // Subtle carved limestone slab vertical fissure hints (far outside center action)
  for (const fx of [toPgX(-280), toPgX(1185)]) {
    dc.strokeStyle = "rgba(185, 177, 162, 0.14)";
    dc.lineWidth = 1.3;
    dc.beginPath();
    let cx = fx;
    dc.moveTo(cx, 32);
    for (let cy = 60; cy <= 820; cy += 55) {
      cx += (rand() - 0.5) * 14;
      dc.lineTo(cx, cy);
    }
    dc.stroke();
  }
  dc.restore();

  // 3. Carved ground stone ledge along ROAD_Y = 730 (seam-safe continuous across [-420..1420])
  dc.save();
  dc.fillStyle = "rgba(38, 36, 32, 0.72)";
  dc.fillRect(0, ROAD_Y, w, 94);

  dc.strokeStyle = IVORY;
  dc.lineWidth = 4.2;
  dc.beginPath();
  dc.moveTo(0, ROAD_Y + 2);
  dc.lineTo(w, ROAD_Y + 2);
  dc.stroke();

  dc.strokeStyle = IVORY_DIM;
  dc.lineWidth = 1.8;
  dc.beginPath();
  dc.moveTo(0, ROAD_Y + 11);
  dc.lineTo(w, ROAD_Y + 11);
  dc.stroke();

  dc.strokeStyle = "rgba(224, 216, 200, 0.34)";
  dc.lineWidth = 1.5;
  for (let gx = 10; gx < w; gx += 22) {
    dc.beginPath();
    dc.moveTo(gx, ROAD_Y + 14);
    dc.lineTo(gx - 9, ROAD_Y + 34 + (rand() - 0.5) * 6);
    dc.stroke();
  }

  for (let gx = 45; gx < w; gx += 165) {
    const tx = gx + (rand() - 0.5) * 35;
    dc.strokeStyle = IVORY_DIM;
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.moveTo(tx, ROAD_Y + 1);
    dc.quadraticCurveTo(tx - 6, ROAD_Y - 12, tx - 11, ROAD_Y - 16);
    dc.moveTo(tx, ROAD_Y + 1);
    dc.quadraticCurveTo(tx + 1, ROAD_Y - 14, tx + 2, ROAD_Y - 20);
    dc.moveTo(tx, ROAD_Y + 1);
    dc.quadraticCurveTo(tx + 7, ROAD_Y - 11, tx + 12, ROAD_Y - 15);
    dc.stroke();
  }
  dc.restore();

  // 4. Upper & Lower Han ornamental borders
  drawHanDecorativeBorders(dc, w, rand);

  // 5. Upper-register auspicious Han cloud vapors, constellations & flying birds
  drawHanCloudScroll(dc, toPgX(-180), 155, 1.05, 1);
  drawHanCloudScroll(dc, toPgX(540), 108, 1.15, 1);
  drawHanCloudScroll(dc, toPgX(705), 182, 0.92, -1);
  drawHanCloudScroll(dc, toPgX(1135), 132, 1.12, 1);
  drawHanCloudScroll(dc, toPgX(1265), 218, 0.9, -1);

  drawAuspiciousBird(dc, toPgX(-60), 212, 0.88, 1);
  drawAuspiciousBird(dc, toPgX(565), 168, 0.98, 1);
  drawAuspiciousBird(dc, toPgX(720), 106, 0.82, 1);
  drawAuspiciousBird(dc, toPgX(1155), 192, 0.94, 1);

  // Classic Han linked-star constellation motif ("连星纹")
  dc.save();
  const stars = [
    [toPgX(455), 76],
    [toPgX(505), 62],
    [toPgX(558), 78],
    [toPgX(604), 60],
  ];
  dc.strokeStyle = IVORY_DIM;
  dc.lineWidth = 1.5;
  dc.beginPath();
  for (let i = 0; i < stars.length; i++) {
    if (i === 0) dc.moveTo(stars[i][0], stars[i][1]);
    else dc.lineTo(stars[i][0], stars[i][1]);
  }
  dc.stroke();
  dc.fillStyle = IVORY;
  for (const [sx, sy] of stars) {
    dc.beginPath();
    dc.arc(sx, sy, 4.8, 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();

  // 6. Upper-right Han Stele Clerical Cartouche ("汉隶石刻榜题框": 「鹈鹕车马图」「东汉」+ 朱砂印)
  const bx = toPgX(922);
  const by = 188;
  const bw = 118;
  const bh = 228;
  dc.save();
  dc.fillStyle = "rgba(18, 17, 15, 0.92)";
  dc.fillRect(bx - bw / 2, by - bh / 2, bw, bh);

  dc.strokeStyle = IVORY;
  dc.lineWidth = 2.6;
  dc.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);
  dc.strokeStyle = IVORY_DIM;
  dc.lineWidth = 1.3;
  dc.strokeRect(bx - bw / 2 + 6, by - bh / 2 + 6, bw - 12, bh - 12);

  // Carved corner ear accents on cartouche
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      dc.fillStyle = IVORY;
      dc.fillRect(bx + sx * (bw / 2 - 4) - 2, by + sy * (bh / 2 - 4) - 2, 4, 4);
    }
  }

  dc.beginPath();
  dc.moveTo(bx - 6, by - bh / 2 + 16);
  dc.lineTo(bx - 6, by + bh / 2 - 16);
  dc.stroke();

  const titleChars = ["鹈", "鹕", "车", "马", "图"];
  for (let i = 0; i < titleChars.length; i++) {
    drawLishuGlyph(dc, titleChars[i], bx + 22, by - 76 + i * 38, 28, IVORY, 0.96);
  }

  drawLishuGlyph(dc, "东", bx - 30, by - 62, 22, IVORY_WARM, 0.92);
  drawLishuGlyph(dc, "汉", bx - 30, by - 32, 22, IVORY_WARM, 0.92);
  dc.restore();

  drawRedSeal(pg, bx - 30, by + 58, "汉石", 32, META.accent || "#c93b2b", "baiwen");
}

/**
 * Pre-bakes a subtle weathering pit layer ("石花" / micro-erosion) composited over animated reliefs.
 */
function bakeStoneWeatheringLayer(pg) {
  const w = BUFFER_W;
  const h = 1000;
  pg.clear();
  const dc = pg.drawingContext;
  const rand = prng(30309);

  dc.save();
  for (let i = 0; i < 1600; i++) {
    const x = rand() * w;
    const y = rand() * h;
    if (x > toPgX(24) && x < toPgX(416) && y > 22 && y < 138) continue;

    const r = 0.8 + rand() * 2.1;
    dc.fillStyle =
      rand() < 0.72
        ? `rgba(22, 20, 18, ${(0.12 + rand() * 0.2).toFixed(3)})`
        : `rgba(175, 168, 154, ${(0.04 + rand() * 0.06).toFixed(3)})`;
    dc.beginPath();
    dc.arc(x, y, r, 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();
}

/**
 * Draws an authentic Han stone-relief side-profile human figure ("汉画宽袖侧影人物").
 * Features sculpted nose/chin profile, JinXian cap or Ze cap, wide-sleeved Han robe, and optional squinting squint.
 */
function drawHanProfileFigure(dc, opts = {}) {
  const {
    robeCol = IVORY,
    capStyle = "jinxian", // "jinxian" | "ze"
    squint = 0, // 0..1
    headTilt = 0,
    armAngle = 0,
    armRaise = 0,
    holdTablet = false,
    tabletTilt = 0.2,
    scale = 1,
  } = opts;

  dc.save();
  dc.scale(scale, scale);

  // Wide-sleeved Han robe ("宽袖深衣")
  dc.fillStyle = robeCol;
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.8;
  dc.beginPath();
  dc.moveTo(-17, 0);
  dc.bezierCurveTo(-16, -24, -14, -40, -9, -52);
  dc.lineTo(13, -52);
  dc.bezierCurveTo(17, -38, 19, -18, 20, 0);
  dc.closePath();
  dc.fill();
  dc.stroke();

  // Incised V-collar & sleeve drape lines ("交领右衽")
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.5;
  dc.beginPath();
  dc.moveTo(-4, -50);
  dc.lineTo(9, -30);
  dc.lineTo(2, -6);
  dc.moveTo(-10, -34);
  dc.lineTo(4, -12);
  dc.stroke();

  // Sculpted Han side-profile head (distinct brow, nose bridge, chin)
  dc.save();
  dc.translate(3, -64);
  dc.rotate(headTilt);

  dc.fillStyle = robeCol;
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.7;
  dc.beginPath();
  dc.moveTo(-10, 12);
  dc.bezierCurveTo(-14, 4, -14, -10, -4, -14);
  dc.lineTo(9, -13);
  dc.lineTo(12, -5); // Brow
  dc.lineTo(16, 1); // Nose tip
  dc.lineTo(12, 3); // Upper lip
  dc.lineTo(13, 7); // Lower lip
  dc.lineTo(9, 12); // Chin
  dc.closePath();
  dc.fill();
  dc.stroke();

  // Han Official Cap: ribbed JinXianGuan ("进贤冠") or flat Ze ("幘")
  dc.fillStyle = robeCol;
  dc.beginPath();
  if (capStyle === "jinxian") {
    dc.moveTo(-12, -10);
    dc.lineTo(-10, -30);
    dc.lineTo(2, -28);
    dc.lineTo(7, -20);
    dc.lineTo(12, -10);
  } else {
    dc.moveTo(-11, -10);
    dc.lineTo(-9, -22);
    dc.lineTo(9, -20);
    dc.lineTo(12, -10);
  }
  dc.closePath();
  dc.fill();
  dc.stroke();

  // Cap ridge groove & chin tie ribbon ("冠缨")
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.3;
  dc.beginPath();
  dc.moveTo(-10, -14);
  dc.lineTo(10, -13);
  dc.stroke();

  dc.strokeStyle = robeCol;
  dc.lineWidth = 1.8;
  dc.beginPath();
  dc.moveTo(-2, 11);
  dc.quadraticCurveTo(-8, 22, -4, 30);
  dc.stroke();

  // Eye: round carved eye normally, sharp squinted slit + furrowed brow in Bar 2!
  dc.strokeStyle = INK_BLACK;
  dc.fillStyle = INK_BLACK;
  if (squint > 0.35) {
    dc.lineWidth = 2.6;
    dc.beginPath();
    dc.moveTo(2, -4);
    dc.lineTo(11, -2.5);
    dc.stroke();
    dc.lineWidth = 1.7;
    dc.beginPath();
    dc.moveTo(1, -8.5);
    dc.lineTo(11, -6.5);
    dc.stroke();
  } else {
    dc.beginPath();
    dc.arc(6.5, -4, 2.2, 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();

  // Wide sleeve arm + hand (either extending to reins or leaning/holding tablet)
  dc.save();
  dc.translate(8, -38);
  dc.rotate(armAngle);
  dc.fillStyle = robeCol;
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.moveTo(-4, -5);
  dc.lineTo(22, -2 - armRaise);
  dc.lineTo(24, 9 - armRaise);
  dc.lineTo(-2, 12);
  dc.closePath();
  dc.fill();
  dc.stroke();

  if (holdTablet) {
    dc.save();
    dc.translate(23, 2 - armRaise);
    dc.rotate(tabletTilt);
    dc.fillStyle = IVORY_WARM;
    dc.strokeStyle = INK_BLACK;
    dc.lineWidth = 1.4;
    dc.fillRect(-3, -24, 6, 28);
    dc.strokeRect(-3, -24, 6, 28);
    dc.restore();
  }
  dc.restore();

  dc.restore();
}

/**
 * Draws a Han stone-carved pulling horse ("汉代石刻挽马") facing right (+x),
 * with full-width Bar 2 head turn backward ("回首偷瞄") toward the Pelican.
 */
function drawHanHorse(g, x, y, opts = {}) {
  const stridePhase = opts.stridePhase ?? 0;
  const lookBack = clamp(opts.lookBack ?? 0, 0, 1);
  const scale = opts.scale ?? 1;
  const beatPulse = opts.beatPulse ?? 0;
  const dc = g.drawingContext;

  dc.save();
  dc.translate(x, y);
  dc.scale(scale, scale);

  const bob = Math.sin(stridePhase * 2) * 2.4;
  const hipY = -88 + bob;
  const chestY = -92 + bob;

  // --- Back pair of legs (muted stone tone for relief depth) ---
  const backStride = Math.sin(stridePhase + Math.PI) * 14;
  const foreBackStride = Math.sin(stridePhase) * 14;

  dc.strokeStyle = IVORY_FAR;
  dc.lineCap = "round";
  dc.lineJoin = "round";

  dc.lineWidth = 7.2;
  dc.beginPath();
  dc.moveTo(-36, hipY + 8);
  dc.lineTo(-42 + backStride * 0.5, -42);
  dc.lineTo(-48 + backStride, -5);
  dc.lineTo(-41 + backStride, -2);
  dc.stroke();

  dc.beginPath();
  dc.moveTo(28, chestY + 12);
  dc.lineTo(36 + foreBackStride * 0.4, -44);
  dc.lineTo(44 + foreBackStride, -5);
  dc.lineTo(51 + foreBackStride, -2);
  dc.stroke();

  // Carved hoof triangles on far legs
  dc.fillStyle = IVORY_FAR;
  for (const hx of [-44 + backStride, 48 + foreBackStride]) {
    dc.beginPath();
    dc.moveTo(hx - 4, -5);
    dc.lineTo(hx + 6, -5);
    dc.lineTo(hx + 8, 0);
    dc.lineTo(hx - 5, 0);
    dc.closePath();
    dc.fill();
  }

  // --- Tied upright Han tail ("束尾") ---
  dc.beginPath();
  dc.moveTo(-48, hipY - 4);
  dc.bezierCurveTo(-70, hipY - 12, -79, hipY + 12, -70, hipY + 36);
  dc.bezierCurveTo(-63, hipY + 26, -61, hipY + 10, -48, hipY + 8);
  dc.closePath();
  dc.fillStyle = IVORY_WARM;
  dc.fill();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.6;
  dc.stroke();

  // --- Seamless Arched Han Horse Neck + Muscular Torso ---
  const neckLean = lookBack * -10;
  const neckTopX = 40 + neckLean;
  const neckTopY = chestY - 58 - lookBack * 3;

  dc.beginPath();
  dc.moveTo(-48, hipY - 4);
  dc.bezierCurveTo(-46, hipY - 24, -18, hipY - 22, 16, chestY - 14);
  dc.bezierCurveTo(22, chestY - 46, 26 + neckLean * 0.7, neckTopY - 6, neckTopX - 4, neckTopY);
  dc.lineTo(neckTopX + 15, neckTopY + 5);
  dc.bezierCurveTo(51 + neckLean * 0.3, chestY - 24, 52, chestY - 2, 48, chestY + 12);
  dc.bezierCurveTo(44, chestY + 28, 22, chestY + 32, -4, hipY + 26);
  dc.bezierCurveTo(-28, hipY + 28, -50, hipY + 18, -48, hipY - 4);
  dc.closePath();
  dc.fillStyle = IVORY;
  dc.fill();

  // Subtle incised shoulder muscle arc (no awkward cut line across neck!)
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.5;
  dc.beginPath();
  dc.moveTo(22, chestY + 2);
  dc.quadraticCurveTo(32, chestY + 14, 24, chestY + 25);
  dc.stroke();

  // Scalloped Han mane ("锯齿鬣毛")
  dc.fillStyle = IVORY_WARM;
  dc.beginPath();
  dc.moveTo(19, chestY - 14);
  dc.lineTo(11 + neckLean * 0.3, chestY - 30);
  dc.lineTo(19 + neckLean * 0.4, chestY - 34);
  dc.lineTo(13 + neckLean * 0.6, chestY - 48);
  dc.lineTo(neckTopX - 6, neckTopY - 3);
  dc.lineTo(neckTopX + 2, neckTopY + 4);
  dc.closePath();
  dc.fill();

  // Carved saddle blanket ("障泥") & harness straps ("鞅/鞧")
  dc.beginPath();
  dc.moveTo(-18, hipY - 18);
  dc.lineTo(14, hipY - 16);
  dc.lineTo(18, hipY + 10);
  dc.lineTo(-20, hipY + 8);
  dc.closePath();
  dc.fillStyle = IVORY_WARM;
  dc.fill();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 2.2;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-2, hipY - 12);
  dc.lineTo(8, hipY - 3);
  dc.lineTo(-2, hipY + 5);
  dc.lineTo(-11, hipY - 3);
  dc.closePath();
  dc.stroke();

  dc.beginPath();
  dc.moveTo(14, hipY - 12);
  dc.lineTo(44, chestY + 6);
  dc.moveTo(-18, hipY - 12);
  dc.lineTo(-46, hipY + 2);
  dc.stroke();

  // --- Near pair of legs (bright ivory, iconic Han lifted front hoof!) ---
  const nearHind = Math.sin(stridePhase) * 14;
  const pranceLift = 0.5 + 0.5 * Math.sin(stridePhase + 0.8);

  dc.strokeStyle = IVORY;
  dc.lineWidth = 8.4;
  dc.beginPath();
  dc.moveTo(-34, hipY + 10);
  dc.lineTo(-30 + nearHind * 0.45, -42);
  dc.lineTo(-34 + nearHind, -5);
  dc.lineTo(-26 + nearHind, -2);
  dc.stroke();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.moveTo(-32, hipY + 14);
  dc.lineTo(-29 + nearHind * 0.45, -42);
  dc.stroke();

  const kneeX = 48 + pranceLift * 8;
  const kneeY = -44 - pranceLift * 14 - beatPulse * 4;
  const hoofX = 36 + pranceLift * 18;
  const hoofY = -14 - pranceLift * 20 - beatPulse * 4;
  dc.strokeStyle = IVORY;
  dc.lineWidth = 8.4;
  dc.beginPath();
  dc.moveTo(32, chestY + 12);
  dc.lineTo(kneeX, kneeY);
  dc.lineTo(hoofX, hoofY);
  dc.lineTo(hoofX + 7, hoofY + 4);
  dc.stroke();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.moveTo(34, chestY + 14);
  dc.lineTo(kneeX - 2, kneeY);
  dc.stroke();

  // --- Full-width Bar 2 Head Turnaround ---
  const cosTurn = Math.cos(lookBack * Math.PI);
  const facingLeft = cosTurn < 0;
  const headScaleX = (facingLeft ? -1 : 1) * Math.max(0.28, Math.abs(cosTurn));

  const headAnchorX = neckTopX + (facingLeft ? 1 : 8);
  const headAnchorY = neckTopY + 1;

  dc.save();
  dc.translate(headAnchorX, headAnchorY);
  dc.scale(headScaleX, 1);
  dc.rotate(facingLeft ? 0.08 : -0.05);

  dc.beginPath();
  dc.moveTo(-11, -10);
  dc.lineTo(-4, -24);
  dc.lineTo(1, -12);
  dc.lineTo(6, -25);
  dc.lineTo(11, -11);
  dc.lineTo(36, 4);
  dc.lineTo(38, 13);
  dc.lineTo(26, 17);
  dc.lineTo(10, 12);
  dc.lineTo(-8, 12);
  dc.closePath();
  dc.fillStyle = IVORY;
  dc.fill();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.8;
  dc.stroke();

  // Bridle strap & bit
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.moveTo(7, -8);
  dc.lineTo(28, 8);
  dc.moveTo(27, 4);
  dc.lineTo(24, 15);
  dc.stroke();

  // Expressive Han horse eye
  dc.fillStyle = INK_BLACK;
  dc.beginPath();
  dc.arc(9, -3, facingLeft ? 3.5 : 2.9, 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = IVORY;
  dc.beginPath();
  dc.arc(facingLeft ? 10.2 : 9.8, -3.5, 1.1, 0, Math.PI * 2);
  dc.fill();

  dc.restore();

  // Subtle carved surprise rays above horse ears at peak Bar 2 lookback
  if (lookBack > 0.6) {
    const rayAlpha = smoothstep(0.6, 0.9, lookBack);
    dc.save();
    dc.globalAlpha *= rayAlpha * 0.9;
    dc.strokeStyle = IVORY;
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.moveTo(headAnchorX - 6, headAnchorY - 30);
    dc.lineTo(headAnchorX - 10, headAnchorY - 41);
    dc.moveTo(headAnchorX + 3, headAnchorY - 32);
    dc.lineTo(headAnchorX + 4, headAnchorY - 44);
    dc.moveTo(headAnchorX + 12, headAnchorY - 29);
    dc.lineTo(headAnchorX + 18, headAnchorY - 39);
    dc.stroke();
    dc.restore();
  }

  dc.restore();

  return {
    bitX: x + (headAnchorX + (facingLeft ? -25 : 26) * Math.abs(headScaleX)) * scale,
    bitY: y + (headAnchorY + 10) * scale,
    yokeX: x + 10 * scale,
    yokeY: y + (chestY - 12) * scale,
  };
}

/**
 * Draws either the grand Front Canopy Chariot ("前车华盖轺车") or Rear Official Escort Chariot ("后车").
 */
function drawHanChariot(g, x, y, opts = {}) {
  const variant = opts.variant || "front";
  const wheelRot = opts.wheelRot ?? 0;
  const stridePhase = opts.stridePhase ?? 0;
  const lookBack = opts.lookBack ?? 0;
  const officialPeek = opts.officialPeek ?? 0;
  const beatPulse = opts.beatPulse ?? 0;
  const dc = g.drawingContext;

  const isFront = variant === "front";
  const wheelR = isFront ? 72 : 67;
  const horseOffset = isFront ? 168 : 162;

  const horsePts = drawHanHorse(g, x + horseOffset, y, {
    stridePhase,
    lookBack: isFront ? lookBack : 0,
    scale: isFront ? 1.0 : 0.94,
    beatPulse,
  });

  dc.save();

  const bounce = Math.sin(stridePhase * 2) * 1.4;
  const axleY = y - wheelR;
  const boxBottomY = axleY - 4 + bounce;
  const boxTopY = boxBottomY - (isFront ? 68 : 62);
  const boxLeft = x - (isFront ? 54 : 48);
  const boxRight = x + (isFront ? 54 : 46);

  // Far-side staggered 16-spoke Han wheel
  drawHanWheel(dc, x - 14, axleY - 3, wheelR * 0.96, wheelRot + 0.12, IVORY_DIM, isFront ? 21 : 31);

  // Curved upward-sweeping chariot shaft ("高翘车辕")
  dc.strokeStyle = IVORY_WARM;
  dc.lineWidth = 6.2;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(x - 8, axleY + 2);
  dc.bezierCurveTo(
    x + 62,
    axleY - 6,
    horsePts.yokeX - 42,
    horsePts.yokeY + 18,
    horsePts.yokeX + 4,
    horsePts.yokeY - 4
  );
  dc.quadraticCurveTo(horsePts.yokeX + 16, horsePts.yokeY - 14, horsePts.yokeX + 10, horsePts.yokeY - 24);
  dc.stroke();

  // --- Sculpted Han Stone-Relief Riders ---
  if (isFront) {
    // Noble passenger
    dc.save();
    dc.translate(x - 24, boxTopY + 14);
    drawHanProfileFigure(dc, {
      robeCol: IVORY_WARM,
      capStyle: "jinxian",
      armAngle: 0.12,
      holdTablet: true,
      tabletTilt: 0.08,
      scale: 1.08,
    });
    dc.restore();

    // Driver holding reins ("车夫执缰")
    const driverX = x + 22;
    dc.save();
    dc.translate(driverX, boxTopY + 14);
    drawHanProfileFigure(dc, {
      robeCol: IVORY,
      capStyle: "ze",
      armAngle: 0.16,
      armRaise: 4,
      scale: 1.04,
    });
    dc.restore();

    // Curved Han reins from driver's hand to horse bit
    const handX = driverX + 30;
    const handY = boxTopY - 24;
    dc.strokeStyle = IVORY_DIM;
    dc.lineWidth = 1.9;
    dc.beginPath();
    dc.moveTo(handX, handY);
    dc.quadraticCurveTo(
      (handX + horsePts.bitX) * 0.5,
      Math.max(boxTopY - 4, horsePts.bitY + 18),
      horsePts.bitX,
      horsePts.bitY
    );
    dc.stroke();
  } else {
    // Rear escort driver behind the official
    dc.save();
    dc.translate(x - 28, boxTopY + 14);
    drawHanProfileFigure(dc, {
      robeCol: IVORY_FAR,
      capStyle: "ze",
      armAngle: 0.15,
      scale: 0.94,
    });
    dc.restore();

    // Reins from rear carriage driver to rear horse bit
    dc.strokeStyle = IVORY_DIM;
    dc.lineWidth = 1.6;
    dc.beginPath();
    dc.moveTo(x - 8, boxTopY - 18);
    dc.quadraticCurveTo(x + 75, boxTopY + 4, horsePts.bitX, horsePts.bitY);
    dc.stroke();

    // REAR OFFICIAL ("后车官吏"): leans dramatically forward over carriage rail & squints in Bar 2!
    const officialBaseX = x + 13 + officialPeek * 22;
    const bodyBaseY = boxTopY + 14;
    dc.save();
    dc.translate(officialBaseX, bodyBaseY);
    dc.rotate(officialPeek * 0.44);
    drawHanProfileFigure(dc, {
      robeCol: IVORY,
      capStyle: "jinxian",
      squint: officialPeek,
      headTilt: officialPeek * 0.18,
      armAngle: -0.15 + officialPeek * 0.2,
      armRaise: officialPeek * 18,
      holdTablet: true,
      tabletTilt: 0.14 + officialPeek * 0.25,
      scale: 1.15,
    });
    dc.restore();
  }

  // --- Carriage Box ("舆") with carved Han geometric railing ---
  dc.fillStyle = IVORY;
  dc.beginPath();
  dc.moveTo(boxLeft, boxBottomY);
  dc.lineTo(boxLeft - 4, boxTopY + 12);
  dc.lineTo(boxLeft + 14, boxTopY);
  dc.lineTo(boxRight - 10, boxTopY);
  dc.bezierCurveTo(boxRight + 6, boxTopY, boxRight + 10, boxTopY + 18, boxRight + 4, boxBottomY);
  dc.closePath();
  dc.fill();

  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 2.0;
  dc.strokeRect(boxLeft + 10, boxTopY + 12, boxRight - boxLeft - 22, boxBottomY - boxTopY - 20);
  dc.lineWidth = 1.5;
  dc.beginPath();
  dc.moveTo(boxLeft + 10, boxTopY + 12);
  dc.lineTo(boxRight - 12, boxBottomY - 8);
  dc.moveTo(boxRight - 12, boxTopY + 12);
  dc.lineTo(boxLeft + 10, boxBottomY - 8);
  dc.stroke();

  // --- Grand Canopy Pole & Domed Han Canopy ("华盖") ---
  const poleX = isFront ? x - 4 : x - 24;
  const canopyY = isFront ? boxTopY - 122 : boxTopY - 104;
  const canopyHalfW = isFront ? 104 : 74;

  dc.strokeStyle = IVORY;
  dc.lineWidth = 5.0;
  dc.beginPath();
  dc.moveTo(poleX, boxTopY + 18);
  dc.lineTo(poleX + (isFront ? 6 : -4), canopyY);
  dc.stroke();

  const capX = poleX + (isFront ? 6 : -4);
  const sway = Math.sin(stridePhase + (isFront ? 0 : 1.2)) * 3.5;
  dc.strokeStyle = IVORY_DIM;
  dc.lineWidth = 2.2;
  for (const tx of [-canopyHalfW + 10, -canopyHalfW * 0.5, canopyHalfW * 0.5, canopyHalfW - 10]) {
    dc.beginPath();
    dc.moveTo(capX + tx, canopyY + 4);
    dc.quadraticCurveTo(capX + tx + sway * 0.5, canopyY + 16, capX + tx + sway, canopyY + 26);
    dc.stroke();
  }

  dc.beginPath();
  dc.moveTo(capX - canopyHalfW, canopyY + 6);
  dc.bezierCurveTo(
    capX - canopyHalfW * 0.58,
    canopyY - 28,
    capX + canopyHalfW * 0.58,
    canopyY - 28,
    capX + canopyHalfW,
    canopyY + 6
  );
  dc.bezierCurveTo(
    capX + canopyHalfW * 0.45,
    canopyY - 2,
    capX - canopyHalfW * 0.45,
    canopyY - 2,
    capX - canopyHalfW,
    canopyY + 6
  );
  dc.closePath();
  dc.fillStyle = IVORY;
  dc.fill();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.8;
  dc.stroke();

  // Incised canopy rib notches
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.2;
  for (const rx of [-0.6, -0.25, 0.25, 0.6]) {
    dc.beginPath();
    dc.moveTo(capX, canopyY - 17);
    dc.quadraticCurveTo(capX + canopyHalfW * rx * 0.5, canopyY - 8, capX + canopyHalfW * rx, canopyY + 2);
    dc.stroke();
  }

  dc.fillStyle = IVORY;
  dc.beginPath();
  dc.arc(capX, canopyY - 22, 6.5, 0, Math.PI * 2);
  dc.fill();
  dc.beginPath();
  dc.arc(capX - canopyHalfW, canopyY + 3, 3.6, 0, Math.PI * 2);
  dc.arc(capX + canopyHalfW, canopyY + 3, 3.6, 0, Math.PI * 2);
  dc.fill();

  // Near-side foreground 16-spoke Han wheel
  drawHanWheel(dc, x + 2, axleY, wheelR, wheelRot, IVORY, isFront ? 41 : 51);

  dc.restore();
}

/**
 * Draws the Pelican + 16-spoke Han-carved Bicycle + Small Canopy Parasol in Han stone-relief style.
 */
function drawHanStoneRig(g, pose, u) {
  const s = pose.scale;
  const dc = g.drawingContext;

  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";

  // Back leg (muted stone ivory so front/back depth reads crisply)
  dc.strokeStyle = IVORY_DIM;
  dc.lineWidth = 7 * s;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.leftKnee.x, pose.leftKnee.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();

  dc.strokeStyle = IVORY_DIM;
  dc.lineWidth = 3.5 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();

  // 16-spoke Han stone wheels ("十六辐汉代车轮")
  drawHanWheel(dc, pose.rearHub.x, pose.rearHub.y, pose.wheelRadius, pose.wheelRot, IVORY, 71);
  drawHanWheel(dc, pose.frontHub.x, pose.frontHub.y, pose.wheelRadius, pose.wheelRot, IVORY, 72);

  // Small Han canopy parasol mounted behind saddle ("车盖小伞")
  const canopySway = Math.sin(u * Math.PI * 2) * 2.5 * s;
  const postBaseX = pose.saddleRear.x + 12 * s;
  const postBaseY = pose.saddleRear.y + 8 * s;
  const capX = pose.head.x - 16 * s;
  const capY = pose.head.y - 84 * s;
  const capHalfW = 56 * s;

  dc.strokeStyle = IVORY_WARM;
  dc.lineWidth = 4.5 * s;
  dc.beginPath();
  dc.moveTo(postBaseX, postBaseY);
  dc.bezierCurveTo(
    postBaseX - 38 * s,
    postBaseY - 75 * s,
    capX - 32 * s,
    capY + 46 * s,
    capX,
    capY
  );
  dc.stroke();

  dc.strokeStyle = IVORY_DIM;
  dc.lineWidth = 1.9 * s;
  for (const tx of [-capHalfW + 8 * s, 0, capHalfW - 8 * s]) {
    dc.beginPath();
    dc.moveTo(capX + tx, capY + 4 * s);
    dc.quadraticCurveTo(capX + tx + canopySway * 0.5, capY + 13 * s, capX + tx + canopySway, capY + 21 * s);
    dc.stroke();
  }

  dc.beginPath();
  dc.moveTo(capX - capHalfW, capY + 5 * s);
  dc.bezierCurveTo(
    capX - capHalfW * 0.55,
    capY - 19 * s,
    capX + capHalfW * 0.55,
    capY - 19 * s,
    capX + capHalfW,
    capY + 5 * s
  );
  dc.bezierCurveTo(
    capX + capHalfW * 0.45,
    capY - 2 * s,
    capX - capHalfW * 0.45,
    capY - 2 * s,
    capX - capHalfW,
    capY + 5 * s
  );
  dc.closePath();
  dc.fillStyle = IVORY;
  dc.fill();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.6 * s;
  dc.stroke();

  // Incised canopy rib lines
  dc.lineWidth = 1.1 * s;
  for (const rx of [-0.55, 0, 0.55]) {
    dc.beginPath();
    dc.moveTo(capX, capY - 11 * s);
    dc.quadraticCurveTo(capX + capHalfW * rx * 0.5, capY - 5 * s, capX + capHalfW * rx, capY + 2 * s);
    dc.stroke();
  }
  dc.fillStyle = IVORY;
  dc.beginPath();
  dc.arc(capX, capY - 14 * s, 4.8 * s, 0, Math.PI * 2);
  dc.fill();

  // Chiseled Han stone-carved bicycle frame ("粗犷平直石雕车架")
  const frameSegs = [
    [pose.rearHub, pose.bb],
    [pose.rearHub, pose.seatCluster],
    [pose.bb, pose.seatCluster],
    [pose.seatCluster, pose.headTop],
    [pose.bb, pose.headBot],
    [pose.frontHub, pose.headTop],
    [pose.headTop, pose.stemTop],
    [pose.stemTop, pose.barGrip],
  ];
  dc.strokeStyle = IVORY;
  dc.lineWidth = 6.8 * s;
  dc.lineCap = "butt";
  for (const [a, b] of frameSegs) {
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.stroke();
  }
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.4 * s;
  for (const [a, b] of frameSegs) {
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.stroke();
  }

  // Ornamental Han carriage-shaft finial scroll at front stem ("车衡卷首")
  dc.strokeStyle = IVORY;
  dc.lineWidth = 3.6 * s;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(pose.headTop.x + 2 * s, pose.headTop.y - 2 * s);
  dc.quadraticCurveTo(pose.headTop.x + 18 * s, pose.headTop.y - 12 * s, pose.headTop.x + 15 * s, pose.headTop.y - 22 * s);
  dc.stroke();

  // Seatpost, saddle & carved chainring hub
  dc.strokeStyle = IVORY;
  dc.lineWidth = 6 * s;
  dc.beginPath();
  dc.moveTo(pose.seatCluster.x, pose.seatCluster.y);
  dc.lineTo((pose.saddleRear.x + pose.saddleFront.x) * 0.5, pose.saddleRear.y + 3 * s);
  dc.stroke();
  dc.lineWidth = 8.5 * s;
  dc.beginPath();
  dc.moveTo(pose.saddleRear.x, pose.saddleRear.y);
  dc.lineTo(pose.saddleFront.x, pose.saddleFront.y);
  dc.stroke();

  dc.fillStyle = IVORY;
  dc.beginPath();
  dc.arc(pose.bb.x, pose.bb.y, 10 * s, 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = INK_BLACK;
  dc.beginPath();
  dc.arc(pose.bb.x, pose.bb.y, 3.8 * s, 0, Math.PI * 2);
  dc.fill();

  // --- Pelican Body & Tail (pure Xuan ivory silhouette + incised black Han feather grooves) ---
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
  dc.fillStyle = IVORY;
  dc.fill();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 2.2 * s;
  dc.stroke();

  // Incised Han tail-feather grooves & covert feather scallops on back
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.6 * s;
  dc.beginPath();
  dc.moveTo(pose.tailTip.x + 8 * s, pose.tailTip.y - 2 * s);
  dc.quadraticCurveTo(pose.bodyCenter.x - 24 * s, pose.bodyCenter.y - 8 * s, pose.bodyCenter.x - 4 * s, pose.bodyCenter.y - 12 * s);
  dc.moveTo(pose.tailTip.x + 10 * s, pose.tailTip.y + 4 * s);
  dc.quadraticCurveTo(pose.bodyCenter.x - 20 * s, pose.bodyCenter.y + 2 * s, pose.bodyCenter.x - 2 * s, pose.bodyCenter.y - 2 * s);
  dc.stroke();

  // Covert feather arcs along upper back
  dc.lineWidth = 1.3 * s;
  for (let fi = -1; fi <= 1; fi++) {
    dc.beginPath();
    dc.arc(pose.bodyCenter.x + fi * 12 * s, pose.bodyCenter.y - 14 * s, 7 * s, 0.1, Math.PI - 0.1);
    dc.stroke();
  }

  // S-curve neck
  dc.lineCap = "round";
  dc.lineJoin = "round";
  dc.beginPath();
  for (let i = 0; i < pose.neckCurve.length; i++) {
    const pt = pose.neckCurve[i];
    if (i === 0) dc.moveTo(pt.x, pt.y);
    else dc.lineTo(pt.x, pt.y);
  }
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 23 * s;
  dc.stroke();
  dc.strokeStyle = IVORY;
  dc.lineWidth = 18 * s;
  dc.stroke();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.3 * s;
  dc.stroke();

  // Head + swept Han crest plumes
  dc.fillStyle = IVORY;
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 2.0 * s;
  dc.beginPath();
  dc.moveTo(pose.crest1.x - 6 * s, pose.crest1.y + 2 * s);
  dc.lineTo(pose.head.x - 4 * s, pose.head.y - 16 * s);
  dc.lineTo(pose.crest2.x - 4 * s, pose.crest2.y - 2 * s);
  dc.lineTo(pose.head.x + 6 * s, pose.head.y - 16 * s);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.beginPath();
  dc.arc(pose.head.x, pose.head.y, 17 * s, 0, Math.PI * 2);
  dc.fillStyle = IVORY;
  dc.fill();
  dc.stroke();

  // Large Throat Pouch ("大喉囊") with incised geometric feather-scale lattice ("几何羽鳞纹")
  dc.save();
  dc.beginPath();
  dc.moveTo(pose.pouchBase.x, pose.pouchBase.y);
  dc.bezierCurveTo(
    pose.pouchMid.x - 16 * s,
    pose.pouchMid.y + 12 * s,
    pose.pouchMid.x + 34 * s,
    pose.pouchMid.y + 6 * s,
    pose.beakTip.x - 4 * s,
    pose.beakTip.y + 4 * s
  );
  dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 12 * s);
  dc.closePath();
  dc.fillStyle = IVORY_WARM;
  dc.fill();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 2.3 * s;
  dc.stroke();

  dc.clip();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.45 * s;
  const pMinX = pose.pouchBase.x - 6 * s;
  const pMaxX = pose.beakTip.x + 4 * s;
  const pMinY = pose.beakBaseTop.y + 6 * s;
  const pMaxY = pose.pouchMid.y + 18 * s;
  const rowStep = 10 * s;
  const colStep = 14 * s;
  let rowIdx = 0;
  for (let py = pMinY; py <= pMaxY; py += rowStep) {
    const xOffset = (rowIdx % 2) * (colStep * 0.5);
    for (let px = pMinX - colStep + xOffset; px <= pMaxX + colStep; px += colStep) {
      dc.beginPath();
      dc.arc(px, py, 7.2 * s, 0, Math.PI);
      dc.stroke();
    }
    rowIdx++;
  }
  dc.restore();

  // Upper Mandible + Hook
  dc.fillStyle = IVORY;
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 2.2 * s;
  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
  dc.lineTo(pose.beakTip.x, pose.beakTip.y);
  dc.lineTo(pose.beakHook.x, pose.beakHook.y);
  dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.3 * s;
  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x + 8 * s, pose.beakBaseTop.y + 5.5 * s);
  dc.lineTo(pose.beakTip.x - 10 * s, pose.beakTip.y + 2.5 * s);
  dc.stroke();

  // Concentric deadpan Han stone-carved eye
  dc.fillStyle = INK_BLACK;
  dc.beginPath();
  dc.arc(pose.eye.x, pose.eye.y, 4.9 * s, 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = IVORY;
  dc.beginPath();
  dc.arc(pose.eye.x + 0.9 * s, pose.eye.y, 2.2 * s, 0, Math.PI * 2);
  dc.fill();

  // Wing reaching to handlebars with incised Han primary feather lines
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
  dc.fillStyle = IVORY_WARM;
  dc.fill();
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 2.2 * s;
  dc.stroke();

  dc.lineWidth = 1.4 * s;
  dc.beginPath();
  dc.moveTo(pose.shoulder.x, pose.shoulder.y);
  dc.quadraticCurveTo(pose.wingElbow.x, pose.wingElbow.y + 6 * s, pose.barGrip.x - 8 * s, pose.barGrip.y + 3 * s);
  dc.moveTo(pose.shoulder.x - 3 * s, pose.shoulder.y + 6 * s);
  dc.quadraticCurveTo(pose.wingElbow.x - 4 * s, pose.wingElbow.y + 12 * s, pose.barGrip.x - 16 * s, pose.barGrip.y + 8 * s);
  dc.stroke();

  // Front Leg & Pedal (bright ivory with incised joint outline)
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 10.5 * s;
  dc.lineCap = "round";
  dc.lineJoin = "round";
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  dc.strokeStyle = IVORY;
  dc.lineWidth = 6.8 * s;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  // Front crank & pedals
  dc.strokeStyle = IVORY;
  dc.lineWidth = 3.8 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  dc.fillStyle = IVORY;
  dc.strokeStyle = INK_BLACK;
  dc.lineWidth = 1.4 * s;
  dc.fillRect(pose.leftPedal.x - 7 * s, pose.leftPedal.y - 3 * s, 14 * s, 6 * s);
  dc.fillRect(pose.rightPedal.x - 7 * s, pose.rightPedal.y - 3 * s, 14 * s, 6 * s);
  dc.strokeRect(pose.rightPedal.x - 7 * s, pose.rightPedal.y - 3 * s, 14 * s, 6 * s);

  dc.restore();
}

/**
 * Draws the Bar 2 Han clerical-script stone inscription: 「此车无马」.
 */
function drawBar2CarvedNote(g, x, y, alpha) {
  if (alpha <= 0.01) return;
  const dc = g.drawingContext;
  const chars = ["此", "车", "无", "马"];
  const boxW = 48;
  const boxH = 154;

  dc.save();
  dc.globalAlpha *= alpha;

  dc.fillStyle = "rgba(18, 17, 15, 0.9)";
  dc.fillRect(x - boxW / 2, y - boxH / 2, boxW, boxH);
  dc.strokeStyle = IVORY;
  dc.lineWidth = 2.1;
  dc.strokeRect(x - boxW / 2, y - boxH / 2, boxW, boxH);
  dc.strokeStyle = IVORY_DIM;
  dc.lineWidth = 1.0;
  dc.strokeRect(x - boxW / 2 + 4, y - boxH / 2 + 4, boxW - 8, boxH - 8);

  for (let i = 0; i < chars.length; i++) {
    drawLishuGlyph(dc, chars[i], x, y - 49 + i * 33, 25, IVORY, 1);
  }

  dc.restore();
}

export default function render(ctx) {
  const { p, brush, g, kit, t, localTime, beat } = ctx;
  const u = localTime;

  const rubbingPaper = getInkPaperLayer(kit, "rubbing", 1840, 1000);
  const reliefLayer = kit.bakeLayer("s03_han_relief_v2", 1840, 1000, bakeHanReliefLayer);
  const weatheringLayer = kit.bakeLayer("s03_han_weathering_v2", 1840, 1000, bakeStoneWeatheringLayer);

  // 1. Pitch-black Wujin stone-rubbing paper substrate
  p.push();
  p.imageMode(p.CENTER);
  p.image(rubbingPaper, 500, 500, 1840, 1000);
  p.pop();

  // 2. Subtle p5.brush charcoal rubbing edge along ROAD_Y
  brush.set("charcoal", "#e2dacb", 2.0);
  brush.line(BLEED_LEFT, ROAD_Y + 2, BLEED_RIGHT, ROAD_Y + 2);
  brush.set("charcoal", "#3a362f", 1.8);
  brush.line(BLEED_LEFT, ROAD_Y + 12, BLEED_RIGHT, ROAD_Y + 12);

  // 3. 2D Relief Layer + Animated Chariot Procession + Pelican + Bar 2 Gag + Title Card
  g.push();

  g.image(reliefLayer, BLEED_LEFT, 0, 1840, 1000);

  const px = getScenePelicanX(u);
  const stridePhase = t * 7.2;

  // Bar 2 timing (u in [2.0, 4.0)): horse turns head back, official leans & squints, "此车无马" appears
  const horseLook = smoothstep(2.0, 2.24, u) * (1 - smoothstep(3.84, 4.14, u));
  const officialPeek = smoothstep(2.02, 2.3, u) * (1 - smoothstep(3.82, 4.14, u));
  const noteAlpha = smoothstep(2.18, 2.54, u) * (1 - smoothstep(3.75, 4.08, u));

  drawHanChariot(g, px - 430, ROAD_Y, {
    variant: "rear",
    wheelRot: px / 67,
    stridePhase: stridePhase + 1.1,
    officialPeek,
    beatPulse: beat.beatPulse,
  });

  drawHanChariot(g, px + 265, ROAD_Y, {
    variant: "front",
    wheelRot: px / 72,
    stridePhase,
    lookBack: horseLook,
    beatPulse: beat.beatPulse,
  });

  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
  drawHanStoneRig(g, pose, u);

  g.image(weatheringLayer, BLEED_LEFT, 0, 1840, 1000);

  drawBar2CarvedNote(g, px - 135, 312, noteAlpha);

  drawEraTitleCard(g, META, u);

  g.pop();
}
