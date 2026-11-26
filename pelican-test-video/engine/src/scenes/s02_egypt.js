/**
 * Scene #02 — 埃及壁画 · Egyptian Tomb Painting (c. 1300 BCE), t in [11.0, 17.0).
 * New Kingdom Theban limestone tomb fresco:
 * weathered gypsum plaster substrate, faint snapped red-ochre 18-square canon proportion grid,
 * upper & lower lotus-and-papyrus decorative friezes, bundled papyrus columns, micro-flaking plaster,
 * a central royal Cartouche spelling "Pelican Test" in Egyptian hieroglyphs (Sun Disk + Seated Pelican +
 * Tied Papyrus Scroll + Crossed Wheels), two frontal-chest/profile-head Egyptian scribes/priests,
 * and Bar 2's slowed-down rigid "Law of Frontality" pose with outstretched horizontal wings,
 * flat level gaze, lapis kohl eye stripe, gold usekh collar, and golden cartouche glow.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  BUFFER_W,
  ROAD_Y,
  SCENE_DUR,
  clamp,
  getScenePelicanX,
  lerp,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[1];

// Authentic New Kingdom Theban tomb mineral pigment palette
const PLASTER_BASE = "#e4c78d";
const PLASTER_LIGHT = "#f2e2bd";
const LIMESTONE_CHIP = "#b38c52";
const INK_CHARCOAL = "#1f1912";
const LAPIS_BLUE = "#1d557d";
const TURQUOISE = "#2b7f71";
const RED_OCHRE = "#a93b23";
const GOLD_OCHRE = "#dfa434";
const GOLD_BRIGHT = "#f3c754";
const LINEN_WHITE = "#f5ecd6";
const LINEN_SHADE = "#dfd1b2";

const GRID_STEP = 20; // 18 grid squares = 360 units (ROAD_Y=730 -> hairline y=370)

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
 * C2-continuous Bar 2 slowdown progress curve driven by META.warpStrength (0.55):
 * guarantees exact position (u) AND exact velocity (1.0x) match at u = 0 and u = 6
 * so both #01/#02 and #02/#03 portal crossings stay pixel-locked, while smoothly
 * slowing the Pelican to ~0.16x near-freeze speed centered at Bar 2 (u = 3.0).
 */
function getEgyptWarpedU(u, warpStrength) {
  if (u <= 0 || u >= SCENE_DUR || !warpStrength) return u;
  const norm = u / SCENE_DUR;
  const amp = clamp(warpStrength * 0.76, 0, 0.45);
  return (
    u +
    SCENE_DUR *
      amp *
      (Math.sin(2 * Math.PI * norm) / (2 * Math.PI) -
        Math.sin(4 * Math.PI * norm) / (4 * Math.PI))
  );
}

/**
 * Draws an Egyptian lotus flower, closed bud, or papyrus umbel motif at (cx, cy).
 */
function drawLotusMotif(dc, cx, cy, w, h, kind = "lotus") {
  dc.save();
  dc.translate(cx, cy);
  dc.lineJoin = "round";
  dc.lineCap = "round";

  if (kind === "lotus") {
    dc.fillStyle = GOLD_OCHRE;
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.moveTo(-w * 0.22, h * 0.45);
    dc.lineTo(0, h * 0.16);
    dc.lineTo(w * 0.22, h * 0.45);
    dc.closePath();
    dc.fill();
    dc.stroke();

    const petals = [
      { ang: -0.48, len: h * 0.85, col: LAPIS_BLUE },
      { ang: 0.48, len: h * 0.85, col: LAPIS_BLUE },
      { ang: -0.22, len: h * 0.94, col: TURQUOISE },
      { ang: 0.22, len: h * 0.94, col: TURQUOISE },
      { ang: 0, len: h, col: LAPIS_BLUE },
    ];
    for (const pt of petals) {
      dc.save();
      dc.translate(0, h * 0.35);
      dc.rotate(pt.ang);
      dc.fillStyle = pt.col;
      dc.beginPath();
      dc.moveTo(0, 0);
      dc.quadraticCurveTo(-w * 0.14, -pt.len * 0.55, 0, -pt.len);
      dc.quadraticCurveTo(w * 0.14, -pt.len * 0.55, 0, 0);
      dc.fill();
      dc.stroke();
      dc.restore();
    }
  } else if (kind === "papyrus") {
    dc.fillStyle = TURQUOISE;
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.moveTo(-w * 0.14, h * 0.45);
    dc.quadraticCurveTo(-w * 0.42, -h * 0.15, -w * 0.46, -h * 0.48);
    dc.quadraticCurveTo(0, -h * 0.62, w * 0.46, -h * 0.48);
    dc.quadraticCurveTo(w * 0.42, -h * 0.15, w * 0.14, h * 0.45);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.fillStyle = RED_OCHRE;
    dc.beginPath();
    dc.moveTo(-w * 0.15, h * 0.45);
    dc.lineTo(-w * 0.24, h * 0.14);
    dc.lineTo(0, h * 0.24);
    dc.lineTo(w * 0.24, h * 0.14);
    dc.lineTo(w * 0.15, h * 0.45);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 0.9;
    for (let k = -2; k <= 2; k++) {
      dc.beginPath();
      dc.moveTo(k * w * 0.04, h * 0.22);
      dc.lineTo(k * w * 0.17, -h * 0.46);
      dc.stroke();
    }
  } else {
    dc.fillStyle = RED_OCHRE;
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.moveTo(0, -h * 0.55);
    dc.quadraticCurveTo(-w * 0.25, 0, -w * 0.14, h * 0.42);
    dc.lineTo(w * 0.14, h * 0.42);
    dc.quadraticCurveTo(w * 0.25, 0, 0, -h * 0.55);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.fillStyle = TURQUOISE;
    dc.beginPath();
    dc.moveTo(-w * 0.15, h * 0.42);
    dc.lineTo(-w * 0.18, h * 0.12);
    dc.lineTo(0, h * 0.26);
    dc.lineTo(w * 0.18, h * 0.12);
    dc.lineTo(w * 0.15, h * 0.42);
    dc.closePath();
    dc.fill();
    dc.stroke();
  }

  dc.restore();
}

/**
 * Draws upper and lower Egyptian tomb lotus/papyrus frieze bands across the full 1840px wall.
 * Top frieze stays cleanly in y in [0, 28] above the Title Card at y = 32.
 */
function drawEgyptianFriezes(dc, w) {
  dc.save();

  // --- TOP FRIEZE (y = 0..28) ---
  dc.fillStyle = "#efe0bc";
  dc.fillRect(0, 0, w, 28);

  const blockCols = [LAPIS_BLUE, GOLD_OCHRE, RED_OCHRE, TURQUOISE, LINEN_WHITE];
  const blockW = 24;
  for (let x = 0, idx = 0; x < w; x += blockW, idx++) {
    dc.fillStyle = blockCols[idx % blockCols.length];
    dc.fillRect(x, 2, blockW - 2, 7);
    dc.fillStyle = INK_CHARCOAL;
    dc.fillRect(x + blockW - 2, 2, 2, 7);
  }

  const topPeriod = 46;
  for (let x = 23, idx = 0; x < w; x += topPeriod, idx++) {
    const kind = idx % 3 === 0 ? "lotus" : idx % 3 === 1 ? "bud" : "papyrus";
    drawLotusMotif(dc, x, 19, 26, 13, kind);
    dc.strokeStyle = RED_OCHRE;
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.moveTo(x, 25);
    dc.quadraticCurveTo(x + topPeriod * 0.5, 29, x + topPeriod, 25);
    dc.stroke();
  }

  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.8;
  dc.beginPath();
  dc.moveTo(0, 2);
  dc.lineTo(w, 2);
  dc.moveTo(0, 10);
  dc.lineTo(w, 10);
  dc.moveTo(0, 27);
  dc.lineTo(w, 27);
  dc.stroke();

  // --- ROAD BASELINE (ROAD_Y = 730) & LOWER TOMB DADO (y = 730..1000) ---
  dc.fillStyle = "#bc934f";
  dc.fillRect(0, ROAD_Y, w, 26);

  dc.fillStyle = GOLD_OCHRE;
  dc.fillRect(0, ROAD_Y + 26, w, 9);
  dc.fillStyle = RED_OCHRE;
  dc.fillRect(0, ROAD_Y + 35, w, 9);
  dc.fillStyle = "#ead4a0";
  dc.fillRect(0, ROAD_Y + 44, w, 86);

  const botPeriod = 76;
  for (let x = 38, idx = 0; x < w; x += botPeriod, idx++) {
    const kind = idx % 2 === 0 ? "lotus" : "papyrus";
    drawLotusMotif(dc, x, 816, 52, 54, kind);
    drawLotusMotif(dc, x + botPeriod * 0.5, 826, 26, 34, "bud");

    dc.strokeStyle = TURQUOISE;
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.moveTo(x, 845);
    dc.quadraticCurveTo(x + botPeriod * 0.5, 858, x + botPeriod, 845);
    dc.stroke();
  }

  // Lower geometric palace-facade block band + dark earth dado
  dc.fillStyle = "#2b2117";
  dc.fillRect(0, 860, w, 140);

  const dBlockW = 34;
  for (let x = 0, idx = 0; x < w; x += dBlockW, idx++) {
    dc.fillStyle = blockCols[(idx + 1) % blockCols.length];
    dc.fillRect(x, 862, dBlockW - 3, 11);
  }
  dc.fillStyle = RED_OCHRE;
  dc.fillRect(0, 878, w, 14);
  dc.fillStyle = GOLD_OCHRE;
  dc.fillRect(0, 895, w, 8);

  for (let x = 0; x < w; x += 48) {
    dc.fillStyle = "rgba(218, 175, 98, 0.14)";
    dc.fillRect(x + 8, 912, 16, 88);
    dc.fillStyle = "rgba(18, 14, 10, 0.35)";
    dc.fillRect(x + 28, 912, 10, 88);
  }

  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.6;
  dc.beginPath();
  dc.moveTo(0, ROAD_Y + 1);
  dc.lineTo(w, ROAD_Y + 1);
  dc.moveTo(0, ROAD_Y + 26);
  dc.lineTo(w, ROAD_Y + 26);
  dc.moveTo(0, ROAD_Y + 44);
  dc.lineTo(w, ROAD_Y + 44);
  dc.moveTo(0, 860);
  dc.lineTo(w, 860);
  dc.moveTo(0, 875);
  dc.lineTo(w, 875);
  dc.stroke();

  dc.restore();
}

/**
 * Draws a bundled Egyptian papyrus column ("莎草纸束柱") from y = 28 to ROAD_Y = 730.
 */
function drawPapyrusColumn(dc, cx) {
  const topY = 28;
  const botY = ROAD_Y;
  const capH = 88;
  const neckY = topY + capH;

  dc.save();
  dc.translate(cx, 0);

  dc.fillStyle = "rgba(88, 58, 28, 0.16)";
  dc.fillRect(22, topY, 16, botY - topY);

  dc.beginPath();
  dc.moveTo(-21, neckY);
  dc.bezierCurveTo(-25, neckY + 180, -30, botY - 80, -24, botY - 14);
  dc.lineTo(24, botY - 14);
  dc.bezierCurveTo(30, botY - 80, 25, neckY + 180, 21, neckY);
  dc.closePath();
  dc.fillStyle = "#d9b97e";
  dc.fill();
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.2;
  dc.stroke();

  dc.strokeStyle = "rgba(44, 30, 18, 0.52)";
  dc.lineWidth = 1.4;
  for (const rx of [-14, -7, 0, 7, 14]) {
    dc.beginPath();
    dc.moveTo(rx * 0.9, neckY + 4);
    dc.bezierCurveTo(rx * 1.1, neckY + 200, rx * 1.25, botY - 90, rx, botY - 16);
    dc.stroke();
  }

  const bands = [
    [neckY - 4, 8, RED_OCHRE],
    [neckY + 4, 8, LAPIS_BLUE],
    [neckY + 12, 7, GOLD_OCHRE],
    [neckY + 19, 7, TURQUOISE],
    [neckY + 26, 7, RED_OCHRE],
  ];
  for (const [by, bh, col] of bands) {
    dc.fillStyle = col;
    dc.fillRect(-23, by, 46, bh);
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.3;
    dc.strokeRect(-23, by, 46, bh);
  }

  dc.beginPath();
  dc.moveTo(-46, topY + 14);
  dc.bezierCurveTo(-40, topY + 44, -27, neckY - 18, -22, neckY - 4);
  dc.lineTo(22, neckY - 4);
  dc.bezierCurveTo(27, neckY - 18, 40, topY + 44, 46, topY + 14);
  dc.closePath();
  dc.fillStyle = TURQUOISE;
  dc.fill();
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.2;
  dc.stroke();

  for (let i = -3; i <= 3; i++) {
    const topX = i * 11.5;
    const botX = i * 5.2;
    dc.strokeStyle = i % 2 === 0 ? GOLD_OCHRE : LAPIS_BLUE;
    dc.lineWidth = 2.6;
    dc.beginPath();
    dc.moveTo(botX, neckY - 14);
    dc.lineTo(topX, topY + 16);
    dc.stroke();

    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.0;
    dc.beginPath();
    dc.moveTo(botX + 3, neckY - 14);
    dc.lineTo(topX + 5.5, topY + 16);
    dc.stroke();
  }

  dc.fillStyle = RED_OCHRE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.4;
  for (let i = -2; i <= 2; i++) {
    const bx = i * 8;
    dc.beginPath();
    dc.moveTo(bx - 5, neckY - 4);
    dc.lineTo(bx, neckY - 28);
    dc.lineTo(bx + 5, neckY - 4);
    dc.closePath();
    dc.fill();
    dc.stroke();
  }

  dc.fillStyle = "#c9a362";
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.0;
  dc.fillRect(-30, topY + 1, 60, 14);
  dc.strokeRect(-30, topY + 1, 60, 14);

  dc.fillStyle = "#c29d5e";
  dc.beginPath();
  dc.roundRect(-34, botY - 15, 68, 15, 5);
  dc.fill();
  dc.stroke();

  dc.restore();
}

/**
 * Draws the snapped red-ochre 18-square Egyptian canon proportion grid ("红赭石打格底稿").
 */
function drawCanonGrid(dc, w, rand) {
  dc.save();
  const originPgX = toPgX(500);

  for (let gx = originPgX % GRID_STEP; gx < w; gx += GRID_STEP) {
    const sceneX = gx + BLEED_LEFT;
    const inCenterZone = sceneX >= 150 && sceneX <= 850;
    const alpha = inCenterZone ? 0.25 : 0.12;

    dc.strokeStyle = `rgba(166, 56, 32, ${alpha})`;
    dc.lineWidth = inCenterZone ? 1.15 : 0.9;
    dc.beginPath();
    let y = 30;
    while (y < ROAD_Y) {
      const seg = 42 + rand() * 58;
      const yNext = Math.min(ROAD_Y, y + seg);
      dc.moveTo(gx + (rand() - 0.5) * 0.65, y);
      dc.lineTo(gx + (rand() - 0.5) * 0.65, yNext);
      y = yNext + (rand() < 0.22 ? 4 + rand() * 6 : 0);
    }
    dc.stroke();
  }

  for (let row = 0; row <= 34; row++) {
    const gy = ROAD_Y - row * GRID_STEP;
    if (gy < 30) break;

    const isCanonLandmark = row === 6 || row === 11 || row === 16 || row === 18;
    const baseAlpha = isCanonLandmark ? 0.29 : 0.18;
    dc.strokeStyle = `rgba(166, 56, 32, ${baseAlpha})`;
    dc.lineWidth = isCanonLandmark ? 1.35 : 0.95;

    dc.beginPath();
    let x = 0;
    while (x < w) {
      const seg = 55 + rand() * 90;
      const xNext = Math.min(w, x + seg);
      dc.moveTo(x, gy + (rand() - 0.5) * 0.55);
      dc.lineTo(xNext, gy + (rand() - 0.5) * 0.55);
      x = xNext + (rand() < 0.18 ? 5 + rand() * 9 : 0);
    }
    dc.stroke();
  }

  // Canon Roman-numeral margin ticks at knee (VI), waist (XI), shoulder (XVI), hairline (XVIII)
  const tickMarks = [
    [6, "VI"],
    [11, "XI"],
    [16, "XVI"],
    [18, "XVIII"],
  ];
  dc.fillStyle = "rgba(166, 56, 32, 0.48)";
  dc.strokeStyle = "rgba(166, 56, 32, 0.48)";
  dc.lineWidth = 1.4;
  dc.font = "italic 11px Georgia, serif";
  dc.textBaseline = "middle";
  for (const [row, roman] of tickMarks) {
    const gy = ROAD_Y - row * GRID_STEP;
    for (const tx of [toPgX(162), toPgX(838)]) {
      dc.beginPath();
      dc.moveTo(tx - 6, gy);
      dc.lineTo(tx + 6, gy);
      dc.stroke();
    }
    dc.textAlign = "right";
    dc.fillText(roman, toPgX(154), gy);
    dc.textAlign = "left";
    dc.fillText(roman, toPgX(846), gy);
  }

  // Faint red-ochre plumb & wing-level canon alignment ticks around x = 500
  dc.strokeStyle = "rgba(166, 56, 32, 0.27)";
  dc.setLineDash([7, 7]);
  dc.lineWidth = 1.25;
  dc.beginPath();
  dc.moveTo(toPgX(500), 400);
  dc.lineTo(toPgX(500), ROAD_Y);
  dc.moveTo(toPgX(335), 542);
  dc.lineTo(toPgX(665), 542);
  dc.stroke();
  dc.setLineDash([]);

  dc.restore();
}

/**
 * Draws organic chipped gesso plaster-loss clusters ("微剥落石膏质感") along mortar seams & edges.
 */
function drawMicroPlasterFlaking(dc, rand) {
  const clusterSpecs = [
    [toPgX(-392), 165, 22],
    [toPgX(-275), 675, 19],
    [toPgX(-125), 548, 20],
    [toPgX(132), 682, 18],
    [toPgX(878), 662, 19],
    [toPgX(985), 255, 21],
    [toPgX(1135), 145, 23],
    [toPgX(1385), 625, 20],
  ];

  for (const [cx, cy, baseR] of clusterSpecs) {
    // 2 to 4 overlapping small angular plaster chips per cluster (not flat blobs)
    const count = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < count; k++) {
      const ox = cx + (rand() - 0.5) * baseR * 1.9;
      const oy = cy + (rand() - 0.5) * baseR * 1.1;
      const rx = baseR * (0.38 + rand() * 0.45);
      const ry = baseR * (0.24 + rand() * 0.3);

      dc.save();
      dc.beginPath();
      const verts = 11;
      for (let i = 0; i < verts; i++) {
        const a = (i / verts) * Math.PI * 2;
        const jit = 0.65 + rand() * 0.55;
        const px = ox + Math.cos(a) * rx * jit;
        const py = oy + Math.sin(a) * ry * jit;
        if (i === 0) dc.moveTo(px, py);
        else dc.lineTo(px, py);
      }
      dc.closePath();

      dc.fillStyle = "rgba(178, 139, 82, 0.55)";
      dc.fill();

      // Subtle inner shadow at top-left rim & gesso highlight at bottom-right rim
      dc.strokeStyle = "rgba(92, 62, 30, 0.35)";
      dc.lineWidth = 1.1;
      dc.stroke();

      dc.save();
      dc.clip();
      for (let s = 0; s < 14; s++) {
        dc.fillStyle =
          rand() < 0.5 ? "rgba(122, 88, 46, 0.25)" : "rgba(232, 204, 152, 0.24)";
        dc.beginPath();
        dc.arc(
          ox + (rand() - 0.5) * rx * 1.6,
          oy + (rand() - 0.5) * ry * 1.6,
          1.0 + rand() * 1.8,
          0,
          Math.PI * 2
        );
        dc.fill();
      }
      dc.restore();

      dc.strokeStyle = "rgba(245, 232, 200, 0.45)";
      dc.lineWidth = 1.0;
      dc.beginPath();
      dc.arc(ox, oy, rx * 0.72, 0.15, Math.PI * 0.75);
      dc.stroke();

      dc.restore();
    }
  }
}

/**
 * Draws background painted Egyptian tomb hieroglyphic vignettes & sacred lotus altars
 * safely clear of the Title Card zone [20..415, 25..138].
 */
function drawWallHieroglyphVignettes(dc) {
  const drawGlyphPanel = (sceneX, topY, dir = 1) => {
    const x = toPgX(sceneX);
    dc.save();
    dc.translate(x, topY);
    dc.globalAlpha = 0.72;

    dc.strokeStyle = RED_OCHRE;
    dc.lineWidth = 1.4;
    dc.beginPath();
    dc.moveTo(-26, 0);
    dc.lineTo(-26, 200);
    dc.moveTo(26, 0);
    dc.lineTo(26, 200);
    dc.stroke();

    // Eye of Horus (Wedjat)
    dc.save();
    dc.translate(0, 26);
    dc.scale(dir, 1);
    dc.strokeStyle = INK_CHARCOAL;
    dc.fillStyle = LINEN_WHITE;
    dc.lineWidth = 1.6;
    dc.beginPath();
    dc.moveTo(-16, 0);
    dc.quadraticCurveTo(0, -10, 16, 0);
    dc.quadraticCurveTo(0, 9, -16, 0);
    dc.fill();
    dc.stroke();
    dc.fillStyle = LAPIS_BLUE;
    dc.beginPath();
    dc.arc(0, 0, 4.5, 0, Math.PI * 2);
    dc.fill();
    dc.strokeStyle = LAPIS_BLUE;
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.moveTo(-18, -7);
    dc.quadraticCurveTo(0, -16, 18, -7);
    dc.moveTo(15, 0);
    dc.lineTo(21, -2);
    dc.moveTo(-2, 7);
    dc.lineTo(-2, 16);
    dc.moveTo(4, 7);
    dc.quadraticCurveTo(9, 15, 14, 13);
    dc.stroke();
    dc.restore();

    // Ankh
    dc.save();
    dc.translate(0, 82);
    dc.strokeStyle = GOLD_OCHRE;
    dc.lineWidth = 4.2;
    dc.beginPath();
    dc.ellipse(0, -10, 6.5, 9, 0, 0, Math.PI * 2);
    dc.moveTo(-12, 1);
    dc.lineTo(12, 1);
    dc.moveTo(0, -1);
    dc.lineTo(0, 19);
    dc.stroke();
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.2;
    dc.stroke();
    dc.restore();

    // Reed + sun disk + water ripple + offering bowl
    dc.fillStyle = TURQUOISE;
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.moveTo(-10, 142);
    dc.quadraticCurveTo(-8, 114, -2, 112);
    dc.lineTo(-4, 142);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.fillStyle = RED_OCHRE;
    dc.beginPath();
    dc.arc(10, 128, 7, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();

    dc.strokeStyle = LAPIS_BLUE;
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.moveTo(-18, 162);
    for (let k = -12; k <= 18; k += 6) {
      dc.lineTo(k, k % 12 === 0 ? 158 : 165);
    }
    dc.stroke();

    dc.fillStyle = GOLD_OCHRE;
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.arc(0, 178, 16, 0, Math.PI);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.restore();
  };

  drawGlyphPanel(105, 190, 1);
  drawGlyphPanel(895, 190, -1);
  drawGlyphPanel(-195, 190, 1);
  drawGlyphPanel(1195, 190, -1);

  const drawOfferingStand = (sceneX) => {
    const x = toPgX(sceneX);
    dc.save();
    dc.translate(x, ROAD_Y);
    dc.globalAlpha = 0.85;

    dc.fillStyle = "#d9b97e";
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.6;
    dc.beginPath();
    dc.moveTo(-14, 0);
    dc.lineTo(-6, -86);
    dc.lineTo(6, -86);
    dc.lineTo(14, 0);
    dc.closePath();
    dc.fill();
    dc.stroke();
    dc.fillStyle = GOLD_OCHRE;
    dc.fillRect(-20, -94, 40, 8);
    dc.strokeRect(-20, -94, 40, 8);

    dc.fillStyle = RED_OCHRE;
    dc.beginPath();
    dc.moveTo(-13, -94);
    dc.lineTo(-9, -112);
    dc.lineTo(9, -112);
    dc.lineTo(13, -94);
    dc.closePath();
    dc.fill();
    dc.stroke();
    drawLotusMotif(dc, 0, -124, 24, 24, "lotus");

    dc.restore();
  };

  drawOfferingStand(88);
  drawOfferingStand(912);
  drawOfferingStand(-205);
  drawOfferingStand(1205);
}

/**
 * Pre-bakes the complete weathered Egyptian limestone tomb wall, 18-square canon grid,
 * micro-flaking plaster chips, lotus & papyrus friezes, 4 bundled papyrus columns, and vignettes.
 */
function bakeEgyptTombWall(pg) {
  const w = BUFFER_W;
  const h = 1000;
  pg.clear();
  const dc = pg.drawingContext;
  const rand = prng(130002);

  // 1. Warm gypsum-plaster limestone base
  dc.fillStyle = PLASTER_BASE;
  dc.fillRect(0, 0, w, h);

  // Subtle troweled gesso plaster mottling
  for (let i = 0; i < 85; i++) {
    const mx = rand() * w;
    const my = rand() * 780;
    const rx = 60 + rand() * 175;
    const ry = 40 + rand() * 110;
    const tone = rand();
    const grad = dc.createRadialGradient(mx, my, 6, mx, my, rx);
    if (tone < 0.42) {
      grad.addColorStop(0, "rgba(244, 228, 190, 0.26)");
      grad.addColorStop(1, "rgba(244, 228, 190, 0)");
    } else if (tone < 0.78) {
      grad.addColorStop(0, "rgba(202, 160, 96, 0.2)");
      grad.addColorStop(1, "rgba(202, 160, 96, 0)");
    } else {
      grad.addColorStop(0, "rgba(155, 118, 66, 0.14)");
      grad.addColorStop(1, "rgba(155, 118, 66, 0)");
    }
    dc.fillStyle = grad;
    dc.beginPath();
    dc.ellipse(mx, my, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    dc.fill();
  }

  // Masonry limestone block seams beneath thin plaster
  dc.strokeStyle = "rgba(140, 104, 56, 0.14)";
  dc.lineWidth = 1.4;
  for (let row = 0; row < 5; row++) {
    const y = 145 + row * 125;
    dc.beginPath();
    dc.moveTo(0, y);
    dc.lineTo(w, y);
    dc.stroke();
    const offset = (row % 2) * 145;
    for (let x = offset; x < w; x += 290) {
      dc.beginPath();
      dc.moveTo(x, y);
      dc.lineTo(x, Math.min(ROAD_Y, y + 125));
      dc.stroke();
    }
  }

  // Fine mineral limestone specks
  for (let i = 0; i < 1100; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 0.7 + rand() * 2.0;
    dc.fillStyle =
      rand() < 0.55
        ? `rgba(120, 86, 44, ${(0.06 + rand() * 0.1).toFixed(3)})`
        : `rgba(250, 238, 210, ${(0.08 + rand() * 0.12).toFixed(3)})`;
    dc.beginPath();
    dc.arc(x, y, r, 0, Math.PI * 2);
    dc.fill();
  }

  // 2. Micro-flaking plaster loss clusters & hairline age cracks
  drawMicroPlasterFlaking(dc, rand);

  for (let c = 0; c < 11; c++) {
    let cx = 60 + rand() * (w - 120);
    let cy = 40 + rand() * 640;
    if (cx > toPgX(15) && cx < toPgX(425) && cy < 160) continue;
    if (cx > toPgX(410) && cx < toPgX(590) && cy < 395) continue;
    dc.strokeStyle = "rgba(95, 66, 36, 0.22)";
    dc.lineWidth = 1.05;
    dc.beginPath();
    dc.moveTo(cx, cy);
    const segs = 4 + Math.floor(rand() * 5);
    for (let k = 0; k < segs; k++) {
      cx += (rand() - 0.45) * 42;
      cy += 18 + rand() * 38;
      dc.lineTo(cx, cy);
    }
    dc.stroke();
  }

  // 3. Snapped red-ochre 18-square canon proportion grid ("打格底稿")
  drawCanonGrid(dc, w, rand);

  // 4. Flanking tomb hieroglyphic vignettes & lotus offering stands
  drawWallHieroglyphVignettes(dc);

  // 5. Four architectural papyrus-bundle columns
  for (const colX of [-345, -45, 1045, 1345]) {
    drawPapyrusColumn(dc, toPgX(colX));
  }

  // 6. Upper & lower Egyptian decorative friezes
  drawEgyptianFriezes(dc, w);
}

/**
 * Pre-bakes ultra-subtle aged stucco grain composited lightly over murals.
 */
function bakeStuccoPatinaLayer(pg) {
  const w = BUFFER_W;
  const h = 1000;
  pg.clear();
  const dc = pg.drawingContext;
  const rand = prng(20209);

  dc.save();
  for (let i = 0; i < 900; i++) {
    const x = rand() * w;
    const y = rand() * h;
    if (x > toPgX(24) && x < toPgX(415) && y > 24 && y < 138) continue;

    const r = 0.6 + rand() * 1.7;
    dc.fillStyle =
      rand() < 0.6
        ? `rgba(146, 108, 60, ${(0.07 + rand() * 0.1).toFixed(3)})`
        : `rgba(248, 236, 206, ${(0.06 + rand() * 0.08).toFixed(3)})`;
    dc.beginPath();
    dc.arc(x, y, r, 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();
}

/**
 * Draws the Royal Cartouche ("皇室王名圈") centered at (500, 210) containing the 4
 * hieroglyphic signs spelling "Pelican Test" + "PELICAN TEST" plaque + Bar 2 gold glow.
 */
function drawRoyalCartouche(g, u, glowStrength, beatPulse) {
  const dc = g.drawingContext;
  const cx = 500;
  const cy = 210;
  const w = 136;
  const h = 282;
  const r = w / 2;
  const topY = cy - h / 2;
  const botY = cy + h / 2;

  dc.save();

  // Bar 2 Golden Aura Glow ("王名圈边缘泛起微金光芒")
  if (glowStrength > 0.01) {
    const pulse = 1 + 0.16 * beatPulse;
    const radGrad = dc.createRadialGradient(cx, cy, 45, cx, cy, 185 * pulse);
    radGrad.addColorStop(0, `rgba(255, 226, 110, ${(glowStrength * 0.42).toFixed(3)})`);
    radGrad.addColorStop(0.55, `rgba(245, 196, 66, ${(glowStrength * 0.22).toFixed(3)})`);
    radGrad.addColorStop(1, "rgba(245, 196, 66, 0)");
    dc.fillStyle = radGrad;
    dc.beginPath();
    dc.ellipse(cx, cy, 130 * pulse, 210 * pulse, 0, 0, Math.PI * 2);
    dc.fill();

    for (let layer = 3; layer >= 1; layer--) {
      const expand = layer * 8.5 * pulse;
      dc.save();
      dc.beginPath();
      dc.roundRect(cx - r - expand, topY - expand, w + expand * 2, h + expand * 2, r + expand);
      dc.strokeStyle = `rgba(255, 219, 98, ${(glowStrength * (0.62 - layer * 0.15)).toFixed(3)})`;
      dc.lineWidth = 3.2;
      dc.stroke();
      dc.restore();
    }

    // Radiating Egyptian solar gleam ticks around Cartouche
    dc.save();
    dc.strokeStyle = `rgba(248, 206, 72, ${(glowStrength * (0.78 + 0.22 * beatPulse)).toFixed(3)})`;
    dc.lineWidth = 2.4;
    dc.lineCap = "round";
    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6;
      const rx = Math.cos(ang) * (r + 14);
      const ry = Math.sin(ang) * (h / 2 + 12);
      const len = (i % 2 === 0 ? 15 : 9) + 6 * beatPulse;
      dc.beginPath();
      dc.moveTo(cx + rx, cy + ry);
      dc.lineTo(cx + rx + Math.cos(ang) * len, cy + ry + Math.sin(ang) * len);
      dc.stroke();
    }
    dc.restore();
  }

  // Cartouche limestone shadow & warm ivory background tablet
  dc.fillStyle = "rgba(42, 28, 14, 0.22)";
  dc.beginPath();
  dc.roundRect(cx - r + 4, topY + 5, w, h, r);
  dc.fill();

  dc.fillStyle = glowStrength > 0.05 ? "#fbf0d2" : "#f4e6c4";
  dc.beginPath();
  dc.roundRect(cx - r, topY, w, h, r);
  dc.fill();

  // Outer charcoal ring + gold shen-rope border + lapis inner bezel
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 10.5;
  dc.beginPath();
  dc.roundRect(cx - r, topY, w, h, r);
  dc.stroke();

  dc.strokeStyle = glowStrength > 0.05 ? GOLD_BRIGHT : GOLD_OCHRE;
  dc.lineWidth = 6.5;
  dc.stroke();

  dc.strokeStyle = "rgba(31, 25, 18, 0.5)";
  dc.lineWidth = 1.2;
  for (let ry = topY + r; ry <= botY - r; ry += 14) {
    dc.beginPath();
    dc.moveTo(cx - r - 2, ry - 3);
    dc.lineTo(cx - r + 3, ry + 3);
    dc.moveTo(cx + r - 3, ry - 3);
    dc.lineTo(cx + r + 2, ry + 3);
    dc.stroke();
  }

  dc.strokeStyle = LAPIS_BLUE;
  dc.lineWidth = 2.6;
  dc.beginPath();
  dc.roundRect(cx - r + 7, topY + 7, w - 14, h - 14, r - 7);
  dc.stroke();

  // Knotted Shen base tie bar at bottom
  dc.fillStyle = INK_CHARCOAL;
  dc.fillRect(cx - 82, botY + 2, 164, 13);
  dc.fillStyle = glowStrength > 0.05 ? GOLD_BRIGHT : GOLD_OCHRE;
  dc.fillRect(cx - 79, botY + 4, 158, 9);
  dc.fillStyle = RED_OCHRE;
  dc.fillRect(cx - 14, botY + 4, 28, 9);
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.6;
  dc.strokeRect(cx - 14, botY + 4, 28, 9);

  dc.strokeStyle = "rgba(169, 59, 35, 0.22)";
  dc.lineWidth = 1.0;
  for (const divY of [142, 206, 266]) {
    dc.beginPath();
    dc.moveTo(cx - 42, divY);
    dc.lineTo(cx + 42, divY);
    dc.stroke();
  }

  // === HIEROGLYPH 1 (y = 112): 太阳盘 (Sun Disk + Flanking Sacred Wings) ===
  dc.save();
  dc.translate(cx, 112);
  dc.strokeStyle = GOLD_OCHRE;
  dc.lineWidth = 2.8;
  dc.beginPath();
  dc.moveTo(-36, 4);
  dc.quadraticCurveTo(-24, -10, -14, -4);
  dc.moveTo(36, 4);
  dc.quadraticCurveTo(24, -10, 14, -4);
  dc.stroke();

  dc.fillStyle = RED_OCHRE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.1;
  dc.beginPath();
  dc.arc(0, 0, 17, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.strokeStyle = GOLD_BRIGHT;
  dc.lineWidth = 2.2;
  dc.beginPath();
  dc.arc(0, 0, 11.5, 0, Math.PI * 2);
  dc.stroke();

  dc.fillStyle = INK_CHARCOAL;
  dc.beginPath();
  dc.arc(0, 0, 3.8, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // === HIEROGLYPH 2 (y = 178): 坐姿鹈鹕象形 (Seated Sacred Pelican Hieroglyph) ===
  dc.save();
  dc.translate(cx - 2, 178);
  dc.lineJoin = "round";
  dc.lineCap = "round";

  dc.strokeStyle = RED_OCHRE;
  dc.lineWidth = 2.4;
  dc.beginPath();
  dc.moveTo(-6, 12);
  dc.lineTo(-10, 19);
  dc.lineTo(-2, 19);
  dc.moveTo(2, 12);
  dc.lineTo(2, 19);
  dc.lineTo(10, 19);
  dc.stroke();

  dc.fillStyle = LINEN_WHITE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.9;
  dc.beginPath();
  dc.moveTo(-27, 4);
  dc.bezierCurveTo(-18, -10, 2, -10, 12, -2);
  dc.bezierCurveTo(15, 7, 10, 14, -14, 14);
  dc.lineTo(-27, 4);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.fillStyle = LAPIS_BLUE;
  dc.beginPath();
  dc.moveTo(-20, 4);
  dc.quadraticCurveTo(-4, -5, 6, 3);
  dc.quadraticCurveTo(-4, 9, -20, 4);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 7.4;
  dc.beginPath();
  dc.moveTo(7, 2);
  dc.bezierCurveTo(15, -6, 6, -15, 10, -21);
  dc.stroke();
  dc.strokeStyle = LINEN_WHITE;
  dc.lineWidth = 4.6;
  dc.stroke();

  dc.fillStyle = LINEN_WHITE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.7;
  dc.beginPath();
  dc.arc(10, -22, 6.2, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.fillStyle = RED_OCHRE;
  dc.beginPath();
  dc.moveTo(15, -19);
  dc.quadraticCurveTo(28, -9, 39, -18);
  dc.lineTo(15, -21);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.fillStyle = GOLD_OCHRE;
  dc.beginPath();
  dc.moveTo(15, -24);
  dc.lineTo(41, -19);
  dc.lineTo(39, -17);
  dc.lineTo(15, -20);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.fillStyle = INK_CHARCOAL;
  dc.beginPath();
  dc.arc(11, -23, 1.4, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // === HIEROGLYPH 3 (y = 236): 系带纸草卷轴 (Tied Papyrus Scroll Determinative) ===
  dc.save();
  dc.translate(cx, 236);
  dc.lineJoin = "round";

  dc.fillStyle = "#e8cf97";
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.9;
  dc.beginPath();
  dc.roundRect(-34, -9, 68, 18, 4);
  dc.fill();
  dc.stroke();

  for (const sx of [-30, 30]) {
    dc.fillStyle = GOLD_OCHRE;
    dc.beginPath();
    dc.ellipse(sx, 0, 5.5, 9, 0, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
    dc.beginPath();
    dc.arc(sx, 0, 2.2, 0, Math.PI * 2);
    dc.fillStyle = INK_CHARCOAL;
    dc.fill();
  }

  dc.fillStyle = RED_OCHRE;
  dc.fillRect(-5, -10.5, 10, 21);
  dc.strokeRect(-5, -10.5, 10, 21);

  dc.strokeStyle = LAPIS_BLUE;
  dc.lineWidth = 2.6;
  dc.beginPath();
  dc.moveTo(-2, 10);
  dc.quadraticCurveTo(-7, 17, -11, 20);
  dc.moveTo(2, 10);
  dc.quadraticCurveTo(7, 17, 11, 20);
  dc.stroke();
  dc.restore();

  // === HIEROGLYPH 4 (y = 298): 交叉双车轮 (Crossed Twin Spoked Wheels) ===
  dc.save();
  dc.translate(cx, 298);
  const drawMiniWheel = (wx, wy, rotOffset) => {
    dc.save();
    dc.translate(wx, wy);
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 4.2;
    dc.beginPath();
    dc.arc(0, 0, 17, 0, Math.PI * 2);
    dc.stroke();
    dc.strokeStyle = GOLD_OCHRE;
    dc.lineWidth = 2.0;
    dc.stroke();

    for (let i = 0; i < 6; i++) {
      const a = rotOffset + (i * Math.PI) / 3;
      dc.strokeStyle = i % 2 === 0 ? LAPIS_BLUE : RED_OCHRE;
      dc.lineWidth = 1.6;
      dc.beginPath();
      dc.moveTo(0, 0);
      dc.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
      dc.stroke();
    }
    dc.fillStyle = GOLD_OCHRE;
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.arc(0, 0, 3.6, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
    dc.restore();
  };

  drawMiniWheel(-14, 2, 0.25);
  drawMiniWheel(14, -2, -0.25);
  dc.restore();

  // === Engraved Small Label Plaque: "PELICAN TEST" (y = 374..396) ===
  dc.fillStyle = "#efe0bc";
  dc.strokeStyle = glowStrength > 0.05 ? GOLD_OCHRE : INK_CHARCOAL;
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.roundRect(cx - 68, botY + 23, 136, 22, 3);
  dc.fill();
  dc.stroke();

  dc.fillStyle = INK_CHARCOAL;
  dc.font = "bold 12px Georgia, serif";
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText("P E L I C A N   T E S T", cx, botY + 34);

  dc.restore();
}

/**
 * Draws an Egyptian New Kingdom frontal-chest / profile-head scribe/priest ("正侧身画师/祭司")
 * standing on ROAD_Y = 730, aligned to the 18-square canon grid (hairline at y = 370).
 */
function drawEgyptianScribe(g, x, y, opts = {}) {
  const {
    dir = 1, // 1 = facing right toward center, -1 = facing left toward center
    variant = "wig", // "wig" | "priest"
    inspectBlend = 0, // 0 = painting/mixing, 1 = raising reed brush to sight against grid
    nodAngle = 0, // Bar 2 beat-synced approval nod
    paintBob = 0, // Bar 1/3 gentle painting motion
    beatPulse = 0,
  } = opts;

  const dc = g.drawingContext;
  const skin = variant === "wig" ? "#ba5632" : "#c76c3f";

  dc.save();
  dc.translate(x, y);
  dc.scale(dir, 1);
  dc.lineJoin = "round";
  dc.lineCap = "round";

  // --- Profile striding bare legs & flat Egyptian feet ---
  dc.fillStyle = skin;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.moveTo(6, -172);
  dc.lineTo(24, -172);
  dc.lineTo(36, -12);
  dc.lineTo(56, -4);
  dc.lineTo(56, 0);
  dc.lineTo(18, 0);
  dc.lineTo(8, -112);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-22, -172);
  dc.lineTo(-4, -172);
  dc.lineTo(-10, -12);
  dc.lineTo(10, -4);
  dc.lineTo(10, 0);
  dc.lineTo(-26, 0);
  dc.lineTo(-24, -112);
  dc.closePath();
  dc.fill();
  dc.stroke();

  // --- Rear Arm holding Scribal Palette cleanly behind/beside waist (no torso overlap) ---
  dc.save();
  dc.translate(-35, -306);
  const rearUpperRot = lerp(0.28, 0.36, inspectBlend) + paintBob * 0.03;
  dc.rotate(rearUpperRot);
  dc.fillStyle = skin;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.9;
  dc.beginPath();
  dc.roundRect(-7, 0, 14, 56, 6);
  dc.fill();
  dc.stroke();

  dc.translate(0, 52);
  dc.rotate(-0.85);
  dc.beginPath();
  dc.roundRect(-6, 0, 12, 46, 5);
  dc.fill();
  dc.stroke();

  // Wooden Egyptian Scribal Palette held in rear hand cleanly outside hip
  dc.translate(0, 44);
  dc.rotate(0.55);
  dc.fillStyle = "#b37c3d";
  dc.fillRect(-16, -7, 36, 15);
  dc.strokeRect(-16, -7, 36, 15);
  dc.fillStyle = RED_OCHRE;
  dc.beginPath();
  dc.arc(-5, 0.5, 4.1, 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = LAPIS_BLUE;
  dc.beginPath();
  dc.arc(8, 0.5, 4.1, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // --- Pleated White Linen Kilt ("Shendyt") ---
  dc.fillStyle = LINEN_WHITE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.moveTo(-25, -220);
  dc.lineTo(24, -220);
  dc.lineTo(40, -112);
  dc.lineTo(-30, -112);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.fillStyle = LINEN_SHADE;
  dc.beginPath();
  dc.moveTo(4, -218);
  dc.lineTo(24, -218);
  dc.lineTo(38, -114);
  dc.lineTo(10, -114);
  dc.closePath();
  dc.fill();
  dc.strokeStyle = "rgba(31, 25, 18, 0.35)";
  dc.lineWidth = 1.1;
  for (let px = -20; px <= 28; px += 8) {
    dc.beginPath();
    dc.moveTo(px * 0.72, -214);
    dc.lineTo(px, -115);
    dc.stroke();
  }

  dc.fillStyle = GOLD_OCHRE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.8;
  dc.fillRect(-26, -226, 52, 11);
  dc.strokeRect(-26, -226, 52, 11);
  dc.fillStyle = LAPIS_BLUE;
  dc.fillRect(-6, -226, 12, 11);
  dc.strokeRect(-6, -226, 12, 11);
  dc.fillStyle = RED_OCHRE;
  dc.fillRect(-4, -215, 8, 34);
  dc.strokeRect(-4, -215, 8, 34);

  // --- Frontal Broad Shoulders & Tapered Waist ("正胸律") ---
  dc.fillStyle = skin;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.1;
  dc.beginPath();
  dc.moveTo(-42, -314);
  dc.quadraticCurveTo(0, -324, 42, -314);
  dc.lineTo(24, -226);
  dc.lineTo(-24, -226);
  dc.closePath();
  dc.fill();
  dc.stroke();

  if (variant === "priest") {
    dc.fillStyle = LINEN_WHITE;
    dc.beginPath();
    dc.moveTo(-36, -315);
    dc.lineTo(-14, -317);
    dc.lineTo(24, -226);
    dc.lineTo(8, -226);
    dc.closePath();
    dc.fill();
    dc.stroke();
  }

  // Broad multi-ring Usekh Collar
  const collarRings = [
    [34, RED_OCHRE],
    [27, LAPIS_BLUE],
    [20, GOLD_OCHRE],
    [14, TURQUOISE],
  ];
  for (const [rad, col] of collarRings) {
    dc.fillStyle = col;
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.4;
    dc.beginPath();
    dc.arc(0, -316, rad, 0.1 * Math.PI, 0.9 * Math.PI);
    dc.closePath();
    dc.fill();
    dc.stroke();
  }

  // --- Profile Head + Egyptian Kohl Eye + Ceremonial Wig / Shaved Priest Head ---
  dc.save();
  dc.translate(0, -326);
  dc.rotate(nodAngle);

  dc.fillStyle = skin;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.8;
  dc.fillRect(-10, -22, 20, 24);
  dc.strokeRect(-10, -22, 20, 24);

  dc.beginPath();
  dc.moveTo(-14, -44);
  dc.bezierCurveTo(-18, -58, 12, -60, 20, -44);
  dc.lineTo(27, -30);
  dc.lineTo(21, -28);
  dc.lineTo(23, -22);
  dc.lineTo(20, -14);
  dc.lineTo(-12, -14);
  dc.closePath();
  dc.fill();
  dc.stroke();

  if (variant === "wig") {
    dc.fillStyle = INK_CHARCOAL;
    dc.beginPath();
    dc.moveTo(-18, -14);
    dc.bezierCurveTo(-28, -32, -24, -56, 2, -60);
    dc.quadraticCurveTo(18, -58, 16, -46);
    dc.lineTo(2, -44);
    dc.lineTo(-4, -8);
    dc.lineTo(-22, -4);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.fillStyle = GOLD_OCHRE;
    dc.fillRect(-17, -49, 34, 6);
    dc.strokeRect(-17, -49, 34, 6);
  } else {
    dc.fillStyle = GOLD_OCHRE;
    dc.fillRect(-15, -46, 33, 5);
    dc.strokeRect(-15, -46, 33, 5);
  }

  // Iconic Egyptian eye + lapis kohl stripe
  dc.fillStyle = "#fbf6ea";
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.5;
  dc.beginPath();
  dc.moveTo(4, -36);
  dc.quadraticCurveTo(12, -41, 18, -36);
  dc.quadraticCurveTo(12, -31, 4, -36);
  dc.fill();
  dc.stroke();

  dc.fillStyle = INK_CHARCOAL;
  dc.beginPath();
  dc.arc(11.5, -36, 2.5, 0, Math.PI * 2);
  dc.fill();

  dc.strokeStyle = LAPIS_BLUE;
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.moveTo(5, -41);
  dc.quadraticCurveTo(12, -44, 19, -40);
  dc.moveTo(4, -36);
  dc.lineTo(-4, -36);
  dc.stroke();

  dc.restore();

  // --- Front Arm holding Reed Brush ("举笔比对网格") ---
  // In Bar 1/3: tilted down/forward painting; in Bar 2: straight horizontal sighting arm with upright brush!
  dc.save();
  dc.translate(36, -306);
  const upperRot = lerp(-0.35, -1.52, inspectBlend) + (1 - inspectBlend) * paintBob * 0.05;
  dc.rotate(upperRot);

  // Upper arm + gold armlet
  dc.fillStyle = skin;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.9;
  dc.beginPath();
  dc.roundRect(-7, 0, 14, 50, 6);
  dc.fill();
  dc.stroke();
  dc.fillStyle = GOLD_OCHRE;
  dc.fillRect(-8, 17, 16, 7);
  dc.strokeRect(-8, 17, 16, 7);

  // Forearm: bent forward in Bar 1/3, straight horizontal sighting extension in Bar 2
  dc.translate(0, 46);
  const foreRot = lerp(-0.95, -0.02, inspectBlend);
  dc.rotate(foreRot);
  dc.fillStyle = skin;
  dc.beginPath();
  dc.roundRect(-6, -4, 12, 46, 5);
  dc.fill();
  dc.stroke();

  // Hand & Reed Brush: held vertically upright at arm's length in Bar 2 to sight proportions!
  dc.translate(0, 40);
  dc.save();
  dc.rotate(lerp(0.55, 1.54, inspectBlend));
  dc.strokeStyle = "#8f6127";
  dc.lineWidth = 3.8;
  dc.beginPath();
  dc.moveTo(0, 16);
  dc.lineTo(0, -40);
  dc.stroke();
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.0;
  dc.stroke();

  // Red-ochre brush nib at top
  dc.fillStyle = RED_OCHRE;
  dc.beginPath();
  dc.moveTo(-2.8, -40);
  dc.lineTo(0, -50);
  dc.lineTo(2.8, -40);
  dc.closePath();
  dc.fill();
  dc.restore();

  dc.restore();

  // In Bar 2: crisp red-ochre artist sight-lines from eye & upright brush toward Pelican & 18-square grid!
  if (inspectBlend > 0.2) {
    dc.save();
    dc.globalAlpha *= inspectBlend * (0.48 + 0.34 * beatPulse);
    dc.strokeStyle = RED_OCHRE;
    dc.lineWidth = 1.6;
    dc.setLineDash([6, 6]);
    dc.beginPath();
    dc.moveTo(22, -360);
    dc.lineTo(205, -245); // Diagonal sight-line from eye straight to Pelican head/eye level
    dc.moveTo(128, -320);
    dc.lineTo(215, -320); // Horizontal canon level check line from upright brush tip
    dc.stroke();
    dc.setLineDash([]);
    dc.restore();
  }

  dc.restore();
}

/**
 * Draws a decorative Egyptian horizontal temple wing for Bar 2 Law of Frontality ("双翼平行举平").
 */
function drawEgyptianFlatWing(dc, originX, originY, dir, span, foldT, s) {
  if (foldT <= 0.02) return;
  const wLen = span * foldT * s;
  const wThick = 34 * s;

  dc.save();
  dc.translate(originX, originY);
  dc.scale(dir, 1);
  dc.globalAlpha *= clamp(foldT * 1.4, 0, 1);
  dc.lineJoin = "round";

  // Straight level leading edge with rounded Egyptian feather tip
  dc.fillStyle = LINEN_WHITE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.2 * s;
  dc.beginPath();
  dc.moveTo(0, -6 * s);
  dc.lineTo(wLen - 6 * s, -6 * s);
  dc.quadraticCurveTo(wLen + 6 * s, -6 * s, wLen - 2 * s, 9 * s);
  dc.lineTo(wLen - 16 * s, wThick * 0.48);
  dc.lineTo(wLen * 0.5, wThick * 0.62);
  dc.lineTo(0, wThick * 0.54);
  dc.closePath();
  dc.fill();
  dc.stroke();

  // Lapis blue upper covert band
  dc.fillStyle = LAPIS_BLUE;
  dc.beginPath();
  dc.moveTo(2 * s, -6 * s);
  dc.lineTo(wLen * 0.88, -6 * s);
  dc.lineTo(wLen * 0.82, 4.5 * s);
  dc.lineTo(2 * s, 4.5 * s);
  dc.closePath();
  dc.fill();
  dc.stroke();

  // Gold ochre & turquoise feather register bar
  dc.fillStyle = GOLD_OCHRE;
  dc.fillRect(3 * s, 4.5 * s, wLen * 0.72, 6 * s);
  dc.strokeRect(3 * s, 4.5 * s, wLen * 0.72, 6 * s);

  // Parallel Egyptian primary flight feathers
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.4 * s;
  const numFeathers = 7;
  for (let i = 1; i <= numFeathers; i++) {
    const fx = (i / (numFeathers + 0.5)) * wLen * 0.9;
    dc.beginPath();
    dc.moveTo(fx, 10.5 * s);
    dc.lineTo(fx + 5 * s, wThick * 0.52);
    dc.stroke();
  }

  dc.restore();
}

/**
 * Renders the Pelican + Bicycle in authentic New Kingdom Egyptian tomb painting style,
 * smoothly locking into the rigid Law of Frontality pose during Bar 2 (canonBlend -> 1).
 */
function drawEgyptPelicanRig(g, pose, canonBlend) {
  const dc = g.drawingContext;
  const s = pose.scale;

  dc.save();
  dc.lineJoin = "round";
  dc.lineCap = "round";

  // --- 1. Egyptian Wheels with Alternating Lapis Blue & Red Ochre Spokes ---
  const drawEgyptWheel = (hub) => {
    dc.save();
    dc.translate(hub.x, hub.y);

    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 6.5 * s;
    dc.beginPath();
    dc.arc(0, 0, pose.wheelRadius, 0, Math.PI * 2);
    dc.stroke();

    dc.strokeStyle = GOLD_OCHRE;
    dc.lineWidth = 2.6 * s;
    dc.beginPath();
    dc.arc(0, 0, pose.wheelRadius - 1.5 * s, 0, Math.PI * 2);
    dc.stroke();

    const spokeR = pose.wheelRadius - 3 * s;
    for (let i = 0; i < 8; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 4;
      dc.strokeStyle = INK_CHARCOAL;
      dc.lineWidth = 3.4 * s;
      dc.beginPath();
      dc.moveTo(0, 0);
      dc.lineTo(Math.cos(a) * spokeR, Math.sin(a) * spokeR);
      dc.stroke();

      dc.strokeStyle = i % 2 === 0 ? LAPIS_BLUE : RED_OCHRE;
      dc.lineWidth = 2.0 * s;
      dc.stroke();
    }

    dc.fillStyle = GOLD_BRIGHT;
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 1.8 * s;
    dc.beginPath();
    dc.arc(0, 0, 6.5 * s, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
    dc.restore();
  };

  drawEgyptWheel(pose.rearHub);
  drawEgyptWheel(pose.frontHub);

  // --- 2. Back Leg & Flat Egyptian Foot ---
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 9 * s;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.leftKnee.x, pose.leftKnee.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();
  dc.strokeStyle = "#b85f22";
  dc.lineWidth = 5.8 * s;
  dc.stroke();

  dc.strokeStyle = GOLD_OCHRE;
  dc.lineWidth = 3.6 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();

  // --- 3. Gilded Egyptian Bicycle Frame ---
  const drawFrameTube = (a, b, col = GOLD_OCHRE, w = 5.2 * s) => {
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = w + 2.4 * s;
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.stroke();
    dc.strokeStyle = col;
    dc.lineWidth = w;
    dc.stroke();
  };

  drawFrameTube(pose.rearHub, pose.bb);
  drawFrameTube(pose.rearHub, pose.seatCluster);
  drawFrameTube(pose.bb, pose.seatCluster);
  drawFrameTube(pose.seatCluster, pose.headTop, GOLD_OCHRE, 5.8 * s);
  drawFrameTube(pose.bb, pose.headBot);
  drawFrameTube(pose.frontHub, pose.headTop);
  drawFrameTube(pose.headTop, pose.stemTop);
  drawFrameTube(pose.stemTop, pose.barGrip);

  dc.strokeStyle = LAPIS_BLUE;
  dc.lineWidth = 3 * s;
  dc.beginPath();
  dc.moveTo(
    lerp(pose.seatCluster.x, pose.headTop.x, 0.25),
    lerp(pose.seatCluster.y, pose.headTop.y, 0.25)
  );
  dc.lineTo(
    lerp(pose.seatCluster.x, pose.headTop.x, 0.75),
    lerp(pose.seatCluster.y, pose.headTop.y, 0.75)
  );
  dc.stroke();

  const seatMidX = (pose.saddleRear.x + pose.saddleFront.x) / 2;
  drawFrameTube(pose.seatCluster, { x: seatMidX, y: pose.saddleRear.y + 3 * s }, GOLD_OCHRE, 4 * s);
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 8.5 * s;
  dc.beginPath();
  dc.moveTo(pose.saddleRear.x, pose.saddleRear.y);
  dc.lineTo(pose.saddleFront.x, pose.saddleFront.y);
  dc.stroke();
  dc.strokeStyle = RED_OCHRE;
  dc.lineWidth = 4.5 * s;
  dc.stroke();

  dc.fillStyle = GOLD_OCHRE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.8 * s;
  dc.beginPath();
  dc.arc(pose.bb.x, pose.bb.y, 9.5 * s, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.fillStyle = TURQUOISE;
  dc.beginPath();
  dc.arc(pose.bellPos.x, pose.bellPos.y, 4.6 * s, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  // --- 4. Bar 2 Symmetrical Twin Horizontal Wings (at true shoulder height y ≈ shoulder.y - 16) ---
  const wingRootY = pose.shoulder.y - 16 * s;
  drawEgyptianFlatWing(dc, pose.shoulder.x - 16 * s, wingRootY, -1, 96, canonBlend, s);
  drawEgyptianFlatWing(dc, pose.shoulder.x + 14 * s, wingRootY, 1, 96, canonBlend, s);

  // --- 5. Pelican Body (broadens cleanly at chest when canonBlend -> 1) ---
  dc.save();
  dc.beginPath();
  const chestLift = canonBlend * 10 * s;
  dc.moveTo(pose.tailTip.x, pose.tailTip.y);
  dc.bezierCurveTo(
    pose.bodyCenter.x - 42 * s,
    pose.bodyCenter.y - 28 * s - chestLift,
    pose.bodyCenter.x + 28 * s,
    pose.bodyCenter.y - 38 * s - chestLift,
    pose.neckBase.x + 16 * s,
    pose.neckBase.y + 6 * s
  );
  dc.bezierCurveTo(
    pose.bodyCenter.x + 42 * s,
    pose.bodyCenter.y + 24 * s,
    pose.hip.x + 18 * s,
    pose.hip.y + 12 * s,
    pose.tailTip.x,
    pose.tailTip.y
  );
  dc.closePath();
  dc.fillStyle = LINEN_WHITE;
  dc.fill();
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.4 * s;
  dc.stroke();

  // Fine black Egyptian feather linework ("白色羽体配细黑线纹")
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.2 * s;
  dc.beginPath();
  dc.moveTo(pose.tailTip.x + 6 * s, pose.tailTip.y - 2 * s);
  dc.lineTo(pose.bodyCenter.x - 14 * s, pose.bodyCenter.y - 4 * s);
  dc.moveTo(pose.tailTip.x + 8 * s, pose.tailTip.y + 4 * s);
  dc.lineTo(pose.bodyCenter.x - 10 * s, pose.bodyCenter.y + 6 * s);
  dc.stroke();

  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      dc.beginPath();
      dc.arc(
        pose.bodyCenter.x + col * 11 * s,
        pose.bodyCenter.y - 8 * s + row * 9 * s,
        5.5 * s,
        0.1,
        Math.PI - 0.1
      );
      dc.stroke();
    }
  }
  dc.restore();

  // --- 6. Rigid Profile Head & S-Neck (in Bar 2: straighter proud upright neck + dead-level head!) ---
  const neckPts = pose.neckCurve.map((pt, idx) => {
    if (canonBlend <= 0.01) return pt;
    const f = idx / (pose.neckCurve.length - 1);
    const straightX = lerp(pose.neckBase.x, pose.neckBase.x + 14 * s, f);
    const straightY = lerp(pose.neckBase.y, pose.neckBase.y - 70 * s, f);
    return {
      x: lerp(pt.x, straightX, canonBlend * 0.7),
      y: lerp(pt.y, straightY, canonBlend * 0.65),
    };
  });

  dc.beginPath();
  for (let i = 0; i < neckPts.length; i++) {
    if (i === 0) dc.moveTo(neckPts[i].x, neckPts[i].y);
    else dc.lineTo(neckPts[i].x, neckPts[i].y);
  }
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 23 * s;
  dc.stroke();
  dc.strokeStyle = LINEN_WHITE;
  dc.lineWidth = 18 * s;
  dc.stroke();

  dc.strokeStyle = "rgba(31, 25, 18, 0.35)";
  dc.lineWidth = 1.1 * s;
  dc.stroke();

  // --- 7. Gold Egyptian Usekh Neck Collar ("金色颈环") ---
  dc.save();
  dc.translate(pose.neckBase.x + 2 * s, pose.neckBase.y - 3 * s);
  dc.rotate(lerp(0.24, 0.04, canonBlend));
  const collarW = lerp(18, 28, canonBlend) * s;
  const collarH = lerp(11, 15, canonBlend) * s;

  dc.fillStyle = GOLD_BRIGHT;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.8 * s;
  dc.beginPath();
  dc.ellipse(0, 4 * s, collarW, collarH, 0, -0.15, Math.PI + 0.15);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.strokeStyle = LAPIS_BLUE;
  dc.lineWidth = 3.2 * s;
  dc.beginPath();
  dc.ellipse(0, 4 * s, collarW * 0.78, collarH * 0.78, 0, 0.1, Math.PI - 0.1);
  dc.stroke();
  dc.strokeStyle = RED_OCHRE;
  dc.lineWidth = 2.0 * s;
  dc.beginPath();
  dc.ellipse(0, 4 * s, collarW * 0.52, collarH * 0.52, 0, 0.15, Math.PI - 0.15);
  dc.stroke();
  dc.restore();

  // --- 8. Head, Crest, Beak & Throat Pouch (locked strictly horizontal in Bar 2) ---
  const headPos = neckPts[neckPts.length - 1];
  const headDx = headPos.x - pose.head.x;
  const headDy = headPos.y - pose.head.y;

  const beakTipX = pose.beakTip.x + headDx;
  const beakTipY = lerp(pose.beakTip.y + headDy, headPos.y + 4 * s, canonBlend);
  const beakHookX = pose.beakHook.x + headDx;
  const beakHookY = lerp(pose.beakHook.y + headDy, headPos.y + 11 * s, canonBlend);
  const beakBaseTopX = pose.beakBaseTop.x + headDx;
  const beakBaseTopY = lerp(pose.beakBaseTop.y + headDy, headPos.y - 8 * s, canonBlend);
  const pouchMidX = pose.pouchMid.x + headDx;
  const pouchMidY = lerp(pose.pouchMid.y + headDy, headPos.y + 46 * s, canonBlend);
  const pouchBaseX = pose.pouchBase.x + headDx;
  const pouchBaseY = lerp(pose.pouchBase.y + headDy, headPos.y + 14 * s, canonBlend);

  dc.fillStyle = LINEN_WHITE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.3 * s;
  dc.beginPath();
  dc.moveTo(pose.crest1.x + headDx, pose.crest1.y + headDy);
  dc.lineTo(headPos.x - 6 * s, headPos.y - 16 * s);
  dc.lineTo(pose.crest2.x + headDx, pose.crest2.y + headDy);
  dc.lineTo(headPos.x + 6 * s, headPos.y - 17 * s);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.beginPath();
  dc.arc(headPos.x, headPos.y, 17 * s, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.fillStyle = "#e38c2d";
  dc.beginPath();
  dc.moveTo(pouchBaseX, pouchBaseY);
  dc.bezierCurveTo(
    pouchMidX - 16 * s,
    pouchMidY + 11 * s,
    pouchMidX + 34 * s,
    pouchMidY + 6 * s,
    beakTipX - 4 * s,
    beakTipY + 4 * s
  );
  dc.lineTo(beakBaseTopX, beakBaseTopY + 12 * s);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.strokeStyle = "rgba(31, 25, 18, 0.38)";
  dc.lineWidth = 1.1 * s;
  dc.beginPath();
  dc.moveTo(pouchBaseX + 12 * s, pouchBaseY + 8 * s);
  dc.quadraticCurveTo(pouchMidX + 4 * s, pouchMidY - 2 * s, beakTipX - 16 * s, beakTipY + 6 * s);
  dc.stroke();

  dc.fillStyle = GOLD_OCHRE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 2.3 * s;
  dc.beginPath();
  dc.moveTo(beakBaseTopX, beakBaseTopY);
  dc.lineTo(beakTipX, beakTipY);
  dc.lineTo(beakHookX, beakHookY);
  dc.lineTo(beakTipX - 5 * s, beakTipY + 6 * s);
  dc.lineTo(beakBaseTopX, beakBaseTopY + 13 * s);
  dc.closePath();
  dc.fill();
  dc.stroke();

  // Iconic Egyptian Lapis/Turquoise Eye-Paint Line ("青金石蓝眼影线")
  const ex = headPos.x + 6 * s;
  const ey = headPos.y - 6 * s;
  dc.strokeStyle = LAPIS_BLUE;
  dc.lineWidth = lerp(2.2, 3.2, canonBlend) * s;
  dc.beginPath();
  dc.moveTo(ex - 4 * s, ey);
  dc.lineTo(ex - 16 * s, ey + 1 * s);
  dc.moveTo(ex - 7 * s, ey - 5.5 * s);
  dc.quadraticCurveTo(ex + 1 * s, ey - 8 * s, ex + 8 * s, ey - 4.5 * s);
  dc.stroke();

  dc.fillStyle = "#ffffff";
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.7 * s;
  dc.beginPath();
  dc.moveTo(ex - 6.5 * s, ey);
  dc.quadraticCurveTo(ex, ey - 5.2 * s, ex + 6.8 * s, ey);
  dc.quadraticCurveTo(ex, ey + 5.2 * s, ex - 6.5 * s, ey);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.fillStyle = INK_CHARCOAL;
  dc.beginPath();
  dc.arc(ex + 0.8 * s, ey, 2.4 * s, 0, Math.PI * 2);
  dc.fill();

  // --- 9. Normal riding wing (fades out cleanly as horizontal Egyptian wings snap open in Bar 2) ---
  if (canonBlend < 0.96) {
    dc.save();
    dc.globalAlpha *= 1 - canonBlend;
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
    dc.fillStyle = LINEN_SHADE;
    dc.fill();
    dc.strokeStyle = INK_CHARCOAL;
    dc.lineWidth = 2.3 * s;
    dc.stroke();

    dc.strokeStyle = LAPIS_BLUE;
    dc.lineWidth = 1.8 * s;
    dc.beginPath();
    dc.moveTo(pose.shoulder.x + 2 * s, pose.shoulder.y - 4 * s);
    dc.quadraticCurveTo(pose.wingElbow.x + 2 * s, pose.wingElbow.y, pose.barGrip.x - 6 * s, pose.barGrip.y + 1 * s);
    dc.stroke();
    dc.restore();
  }

  // --- 10. Front Leg & Flat Webbed Foot on Horizontal Pedals ---
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 10.5 * s;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  dc.strokeStyle = "#dc7b24";
  dc.lineWidth = 6.8 * s;
  dc.stroke();

  dc.strokeStyle = GOLD_OCHRE;
  dc.lineWidth = 3.8 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  dc.fillStyle = RED_OCHRE;
  dc.strokeStyle = INK_CHARCOAL;
  dc.lineWidth = 1.5 * s;
  dc.fillRect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s);
  dc.strokeRect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s);
  dc.fillRect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 3 * s, 16 * s, 6 * s);
  dc.strokeRect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 3 * s, 16 * s, 6 * s);

  dc.restore();
}

export default function render(ctx) {
  const { p, brush, g, kit, t, localTime, beat } = ctx;
  const u = localTime;

  const wallLayer = kit.bakeLayer("s02_egypt_tomb_wall_v2", 1840, 1000, bakeEgyptTombWall);
  const patinaLayer = kit.bakeLayer("s02_egypt_patina_v2", 1840, 1000, bakeStuccoPatinaLayer);

  // 1. Baked weathered limestone tomb wall, 18-square canon grid, columns & friezes
  p.push();
  p.imageMode(p.CENTER);
  p.image(wallLayer, 500, 500, 1840, 1000);
  p.pop();

  // 2. Subtle p5.brush mineral charcoal / HB baseline strokes along ROAD_Y and cornice
  brush.set("charcoal", "#332417", 2.0);
  brush.line(BLEED_LEFT, ROAD_Y + 1, BLEED_RIGHT, ROAD_Y + 1);
  brush.set("HB", "#9c4727", 1.3);
  brush.line(BLEED_LEFT, ROAD_Y + 12, BLEED_RIGHT, ROAD_Y + 12);

  // 3. 2D Foreground: Royal Cartouche, Egyptian Scribes, Pelican Rig, Patina, Title Card
  g.push();

  const bar2Pose = smoothstep(1.82, 2.22, u) * (1 - smoothstep(3.82, 4.22, u));
  const cartoucheGlow = smoothstep(1.9, 2.25, u) * (1 - smoothstep(3.85, 4.25, u));
  const beatPulse = beat?.beatPulse ?? 0;

  drawRoyalCartouche(g, u, cartoucheGlow, beatPulse);

  const paintBobL = Math.sin(u * Math.PI * 2);
  const paintBobR = Math.sin(u * Math.PI * 2 + 1.4);
  const nodAngle = bar2Pose * (0.04 + 0.08 * beatPulse);

  drawEgyptianScribe(g, 240, ROAD_Y, {
    dir: 1,
    variant: "wig",
    inspectBlend: bar2Pose,
    nodAngle,
    paintBob: paintBobL,
    beatPulse,
  });

  drawEgyptianScribe(g, 760, ROAD_Y, {
    dir: -1,
    variant: "priest",
    inspectBlend: bar2Pose,
    nodAngle: nodAngle * 0.95,
    paintBob: paintBobR,
    beatPulse,
  });

  // Bar 2 slowdown X via getScenePelicanX aligned seamlessly at u<=0 and u>=6
  const uWarped = getEgyptWarpedU(u, META.warpStrength);
  const px = getScenePelicanX(uWarped);

  // Monotonically forward pedalPhase slowing gently in Bar 2 and matching t*2*PI outside [1.5, 4.5]
  const bar2Hold = smoothstep(1.5, 2.1, u) * (1 - smoothstep(3.9, 4.5, u));
  const normalPhase = t * Math.PI * 2;
  const posePhase = 28 * Math.PI + (u - 3.0) * 0.25;
  const pedalPhase = lerp(normalPhase, posePhase, bar2Hold);

  const pose = getRigPose(t, {
    x: px,
    y: ROAD_Y,
    scale: 1.0,
    pedalPhase,
  });
  drawEgyptPelicanRig(g, pose, bar2Pose);

  // Subtle baked stucco grain over murals (cleanly skipping Title Card area)
  g.image(patinaLayer, BLEED_LEFT, 0, 1840, 1000);

  // Bespoke fresco-styled Title Card in top-left safe zone
  drawEraTitleCard(g, META, u);

  g.pop();
}
