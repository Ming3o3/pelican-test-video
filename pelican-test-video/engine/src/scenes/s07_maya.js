/**
 * Scene #07 — 玛雅抄本 · Maya Codex (c. 1200 CE), t in [41.0, 47.0).
 * Postclassic Mesoamerican Amate bark-paper accordion codex (inspired by public-domain
 * Madrid & Dresden codices): fibrous warm bark paper with vertical cinnabar accordion fold
 * creases & bevel shadows, vermilion and Maya-blue (#287c8c) almanac framing, four-corner
 * fictional calendar day-glyph cartouches, Feathered Serpent curling scroll reliefs,
 * stepped Maya temple causeway (ROAD_Y = 730), a Maya-codex Pelican on sun-ray stone wheels,
 * and a right-hand red-grid "PEDAL REVS / 踏板圈数" tally panel updated live in Maya
 * vigesimal bar-and-dot numerals by a nodding plumed Maya scribe.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  ROAD_Y,
  getScenePelicanX,
  lerp,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[6];

const INK = "#1a130e";
const INK_SOFT = "#3b2c1e";
const AMATE_BASE = "#dccba7";
const CREAM = "#f5ebd3";
const CINNABAR = "#a83324";
const CINNABAR_BRIGHT = "#d13c24";
const MAYA_BLUE = "#287c8c";
const MAYA_TURQ = "#38a3a8";
const JADE_GREEN = "#3c8d67";
const OCHRE_GOLD = "#d79734";
const STONE_LIGHT = "#ccb68f";
const STONE_MID = "#9b7e59";
const STONE_DARK = "#6c5236";
const SKIN_TONE = "#c98b57";

const FOLD_XS = [-333, 0, 333, 667, 1000, 1333];
const REGISTER_Y = 426;

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawRoundedRectPath(dc, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  dc.beginPath();
  dc.moveTo(x + rr, y);
  dc.lineTo(x + w - rr, y);
  dc.arc(x + w - rr, y + rr, rr, -Math.PI / 2, 0);
  dc.lineTo(x + w, y + h - rr);
  dc.arc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2);
  dc.lineTo(x + rr, y + h);
  dc.arc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI);
  dc.lineTo(x, y + rr);
  dc.arc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5);
  dc.closePath();
}

/**
 * Draws a Maya base-20 bar-and-dot numeral (0 = shell, 1-4 = dots, 5 = bar, 6+ = dots over bar(s)).
 */
function drawMayaNumeral(dc, n, cx, cy, scale = 1, opts = {}) {
  const dotCol = opts.dotCol || CINNABAR_BRIGHT;
  const barCol = opts.barCol || CINNABAR;
  const shellCol = opts.shellCol || CREAM;
  const accentCol = opts.accentCol || MAYA_BLUE;
  const inkW = (opts.inkW ?? 2.6) * scale;

  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";

  if (n === 0) {
    // Maya conch-shell zero glyph ("贝壳形")
    const rx = 29 * scale;
    const ry = 17 * scale;

    const traceShell = () => {
      dc.beginPath();
      dc.moveTo(cx - rx, cy + ry * 0.14);
      dc.bezierCurveTo(cx - rx * 0.72, cy - ry * 1.05, cx - rx * 0.25, cy - ry * 1.05, cx - rx * 0.14, cy - ry * 0.78);
      dc.bezierCurveTo(cx - rx * 0.04, cy - ry * 1.16, cx + rx * 0.16, cy - ry * 1.16, cx + rx * 0.24, cy - ry * 0.78);
      dc.bezierCurveTo(cx + rx * 0.42, cy - ry * 1.05, cx + rx * 0.85, cy - ry * 0.9, cx + rx, cy + ry * 0.14);
      dc.bezierCurveTo(cx + rx * 0.85, cy + ry * 1.04, cx - rx * 0.85, cy + ry * 1.04, cx - rx, cy + ry * 0.14);
      dc.closePath();
    };

    traceShell();
    dc.fillStyle = shellCol;
    dc.fill();

    dc.save();
    dc.clip();
    dc.fillStyle = accentCol;
    dc.fillRect(cx - rx, cy + ry * 0.18, rx * 2, ry * 0.88);
    dc.fillStyle = barCol;
    dc.fillRect(cx - rx, cy - ry * 0.08, rx * 2, ry * 0.28);

    dc.strokeStyle = INK;
    dc.lineWidth = 2 * scale;
    for (const off of [-0.46, 0, 0.46]) {
      dc.beginPath();
      dc.moveTo(cx + rx * off, cy - ry * 0.95);
      dc.quadraticCurveTo(cx + rx * off * 0.6, cy - ry * 0.12, cx + rx * off * 0.35, cy + ry * 0.88);
      dc.stroke();
    }
    dc.restore();

    traceShell();
    dc.strokeStyle = INK;
    dc.lineWidth = inkW;
    dc.stroke();

    dc.beginPath();
    dc.arc(cx, cy + ry * 0.04, 4.4 * scale, 0, Math.PI * 2);
    dc.fillStyle = CREAM;
    dc.fill();
    dc.strokeStyle = INK;
    dc.lineWidth = 1.6 * scale;
    dc.stroke();

    dc.restore();
    return;
  }

  const bars = Math.floor(n / 5);
  const dots = n % 5;

  const barW = 62 * scale;
  const barH = 15 * scale;
  const barGap = 6 * scale;
  const dotR = 8 * scale;
  const dotPitch = 19 * scale;
  const dotToBarGap = 13 * scale;

  const barsTotalH = bars > 0 ? bars * barH + (bars - 1) * barGap : 0;
  const dotsTotalH = dots > 0 ? dotR * 2 : 0;
  const totalH = barsTotalH + (bars > 0 && dots > 0 ? dotToBarGap : 0) + dotsTotalH;

  let curY = cy - totalH * 0.5;

  if (dots > 0) {
    const dotY = curY + dotR;
    const startX = cx - ((dots - 1) * dotPitch) * 0.5;
    for (let i = 0; i < dots; i++) {
      const dx = startX + i * dotPitch;
      dc.beginPath();
      dc.arc(dx, dotY, dotR, 0, Math.PI * 2);
      dc.fillStyle = dotCol;
      dc.fill();
      dc.strokeStyle = INK;
      dc.lineWidth = inkW;
      dc.stroke();

      dc.beginPath();
      dc.arc(dx, dotY, dotR * 0.36, 0, Math.PI * 2);
      dc.fillStyle = CREAM;
      dc.fill();
    }
    curY += dotsTotalH + dotToBarGap;
  }

  for (let b = 0; b < bars; b++) {
    const bx = cx - barW * 0.5;
    const by = curY + b * (barH + barGap);
    drawRoundedRectPath(dc, bx, by, barW, barH, barH * 0.42);
    dc.fillStyle = barCol;
    dc.fill();
    dc.strokeStyle = INK;
    dc.lineWidth = inkW;
    dc.stroke();

    dc.beginPath();
    dc.moveTo(bx + barW * 0.22, by + 2 * scale);
    dc.lineTo(bx + barW * 0.22, by + barH - 2 * scale);
    dc.moveTo(bx + barW * 0.78, by + 2 * scale);
    dc.lineTo(bx + barW * 0.78, by + barH - 2 * scale);
    dc.strokeStyle = INK;
    dc.lineWidth = 1.5 * scale;
    dc.stroke();

    dc.beginPath();
    dc.moveTo(bx + barW * 0.27, by + barH * 0.5);
    dc.lineTo(bx + barW * 0.73, by + barH * 0.5);
    dc.strokeStyle = CREAM;
    dc.lineWidth = 2 * scale;
    dc.stroke();
  }

  dc.restore();
}

/**
 * Draws a fictional Maya calendar day-name glyph cartouche box ("虚构玛雅历法日名方框").
 */
function drawMayaDayGlyphBox(dc, cx, cy, size, variant = 0) {
  const hs = size * 0.5;
  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";

  drawRoundedRectPath(dc, cx - hs + 3, cy - hs + 3, size, size, size * 0.2);
  dc.fillStyle = "rgba(44, 28, 16, 0.22)";
  dc.fill();

  drawRoundedRectPath(dc, cx - hs, cy - hs, size, size, size * 0.2);
  dc.fillStyle = CINNABAR;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 3;
  dc.stroke();

  const inS = size * 0.78;
  drawRoundedRectPath(dc, cx - inS * 0.5, cy - inS * 0.5, inS, inS, inS * 0.18);
  dc.fillStyle = MAYA_BLUE;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2;
  dc.stroke();

  const gS = size * 0.62;
  drawRoundedRectPath(dc, cx - gS * 0.5, cy - gS * 0.5, gS, gS, gS * 0.16);
  dc.fillStyle = CREAM;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2;
  dc.stroke();

  const r = gS * 0.34;
  const v = ((variant % 6) + 6) % 6;
  dc.strokeStyle = INK;
  dc.lineWidth = 2.4;

  if (v === 0) {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      dc.beginPath();
      dc.arc(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58, r * 0.38, 0, Math.PI * 2);
      dc.fillStyle = k % 2 === 0 ? OCHRE_GOLD : CINNABAR;
      dc.fill();
      dc.stroke();
    }
    dc.beginPath();
    dc.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    dc.fillStyle = CREAM;
    dc.fill();
    dc.stroke();
    dc.beginPath();
    dc.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
    dc.fillStyle = INK;
    dc.fill();
  } else if (v === 1) {
    dc.fillStyle = MAYA_BLUE;
    dc.beginPath();
    dc.moveTo(cx - r * 0.9, cy + r * 0.75);
    dc.lineTo(cx - r * 0.9, cy + r * 0.25);
    dc.lineTo(cx - r * 0.45, cy + r * 0.25);
    dc.lineTo(cx - r * 0.45, cy - r * 0.25);
    dc.lineTo(cx + r * 0.45, cy - r * 0.25);
    dc.lineTo(cx + r * 0.45, cy + r * 0.25);
    dc.lineTo(cx + r * 0.9, cy + r * 0.25);
    dc.lineTo(cx + r * 0.9, cy + r * 0.75);
    dc.closePath();
    dc.fill();
    dc.stroke();

    for (const dx of [-r * 0.48, r * 0.48]) {
      dc.beginPath();
      dc.arc(cx + dx, cy - r * 0.62, r * 0.24, 0, Math.PI * 2);
      dc.fillStyle = CINNABAR;
      dc.fill();
      dc.stroke();
    }
  } else if (v === 2) {
    dc.beginPath();
    dc.moveTo(cx - r * 0.8, cy - r * 0.8);
    dc.lineTo(cx + r * 0.8, cy + r * 0.8);
    dc.moveTo(cx + r * 0.8, cy - r * 0.8);
    dc.lineTo(cx - r * 0.8, cy + r * 0.8);
    dc.strokeStyle = CINNABAR;
    dc.lineWidth = 5;
    dc.stroke();
    dc.strokeStyle = INK;
    dc.lineWidth = 2.2;
    dc.stroke();

    dc.beginPath();
    dc.arc(cx, cy, r * 0.46, 0, Math.PI * 2);
    dc.fillStyle = MAYA_BLUE;
    dc.fill();
    dc.stroke();
    dc.beginPath();
    dc.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
    dc.fillStyle = CREAM;
    dc.fill();
  } else if (v === 3) {
    drawRoundedRectPath(dc, cx - r * 0.78, cy - r * 0.75, r * 1.56, r * 0.9, 4);
    dc.fillStyle = OCHRE_GOLD;
    dc.fill();
    dc.stroke();
    for (const dx of [-r * 0.44, 0, r * 0.44]) {
      dc.beginPath();
      dc.arc(cx + dx, cy - r * 0.3, r * 0.17, 0, Math.PI * 2);
      dc.fillStyle = INK;
      dc.fill();
      dc.beginPath();
      dc.moveTo(cx + dx - r * 0.16, cy + r * 0.16);
      dc.lineTo(cx + dx, cy + r * 0.82);
      dc.lineTo(cx + dx + r * 0.16, cy + r * 0.16);
      dc.closePath();
      dc.fillStyle = CINNABAR;
      dc.fill();
      dc.stroke();
    }
  } else if (v === 4) {
    dc.beginPath();
    dc.arc(cx, cy, r * 0.78, 0.2, Math.PI * 1.75);
    dc.strokeStyle = MAYA_BLUE;
    dc.lineWidth = 4.2;
    dc.stroke();
    dc.strokeStyle = INK;
    dc.lineWidth = 2.2;
    dc.stroke();

    dc.beginPath();
    dc.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
    dc.fillStyle = CINNABAR;
    dc.fill();
    dc.stroke();
  } else {
    for (const [dx, dy] of [
      [-r * 0.46, -r * 0.42],
      [r * 0.46, -r * 0.42],
      [0, r * 0.08],
    ]) {
      dc.beginPath();
      dc.arc(cx + dx, cy + dy, r * 0.26, 0, Math.PI * 2);
      dc.fillStyle = MAYA_BLUE;
      dc.fill();
      dc.stroke();
    }
    drawRoundedRectPath(dc, cx - r * 0.72, cy + r * 0.45, r * 1.44, r * 0.36, 3);
    dc.fillStyle = CINNABAR;
    dc.fill();
    dc.stroke();
  }

  for (const fx of [cx - hs * 0.56, cx, cx + hs * 0.56]) {
    dc.beginPath();
    dc.arc(fx, cy + hs + 2, 4.2, 0, Math.PI * 2);
    dc.fillStyle = OCHRE_GOLD;
    dc.fill();
    dc.strokeStyle = INK;
    dc.lineWidth = 2;
    dc.stroke();
  }

  dc.restore();
}

/**
 * Draws a monumental carved Feathered Serpent & curling smoke-cloud scroll relief ("羽蛇神卷草浮雕边饰").
 */
function drawFeatheredSerpentRelief(dc, x, y, w, h, flip = 1) {
  dc.save();
  dc.translate(x + w * 0.5, y);
  dc.scale(flip, 1);
  dc.lineCap = "round";
  dc.lineJoin = "round";

  const hw = w * 0.5;
  drawRoundedRectPath(dc, -hw, 0, w, h, 6);
  dc.fillStyle = "rgba(182, 148, 102, 0.54)";
  dc.fill();
  dc.strokeStyle = CINNABAR;
  dc.lineWidth = 3.2;
  dc.stroke();

  drawRoundedRectPath(dc, -hw + 5, 5, w - 10, h - 10, 4);
  dc.strokeStyle = INK;
  dc.lineWidth = 2;
  dc.stroke();

  // Undulating S-curved serpent body
  const topPad = 72;
  const botPad = h - 22;
  const amp = hw * 0.34;
  dc.beginPath();
  dc.moveTo(0, topPad);
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    const py = lerp(topPad, botPad, f);
    const px = Math.sin(f * Math.PI * 3.5) * amp;
    dc.lineTo(px, py);
  }
  dc.strokeStyle = INK;
  dc.lineWidth = 20;
  dc.stroke();
  dc.strokeStyle = MAYA_BLUE;
  dc.lineWidth = 14;
  dc.stroke();

  // Ventral cream belly stripe & carved scales
  dc.strokeStyle = CREAM;
  dc.lineWidth = 4.5;
  dc.stroke();

  // Curling smoke-cloud volutes ("卷草烟云纹") & green quetzal plumes along spine
  const volCount = 5;
  for (let i = 0; i < volCount; i++) {
    const f = (i + 0.35) / volCount;
    const sy = lerp(topPad + 12, botPad - 12, f);
    const sx = Math.sin(f * Math.PI * 3.5) * amp;
    const side = i % 2 === 0 ? 1 : -1;

    // Fan of green quetzal feathers opposite the curl
    for (const angOff of [-0.35, 0, 0.35]) {
      const fx0 = sx - side * 5;
      const fx1 = sx - side * hw * 0.72;
      const fy1 = sy - 14 + angOff * 28;
      dc.beginPath();
      dc.moveTo(fx0, sy);
      dc.quadraticCurveTo((fx0 + fx1) * 0.5, fy1 - 8, fx1, fy1);
      dc.quadraticCurveTo((fx0 + fx1) * 0.5, fy1 + 6, fx0, sy + 5);
      dc.closePath();
      dc.fillStyle = JADE_GREEN;
      dc.fill();
      dc.strokeStyle = INK;
      dc.lineWidth = 1.8;
      dc.stroke();
    }

    // Double-curled smoke/cloud volute
    dc.beginPath();
    dc.moveTo(sx + side * 4, sy);
    dc.bezierCurveTo(
      sx + side * hw * 0.76,
      sy - 18,
      sx + side * hw * 0.82,
      sy + 18,
      sx + side * hw * 0.36,
      sy + 15
    );
    dc.arc(sx + side * hw * 0.36, sy + 6, 7.5, Math.PI * 0.5, Math.PI * 2.1, side < 0);
    dc.strokeStyle = INK;
    dc.lineWidth = 7.5;
    dc.stroke();
    dc.strokeStyle = i % 2 === 0 ? CINNABAR : OCHRE_GOLD;
    dc.lineWidth = 4;
    dc.stroke();
  }

  // Sculpted Kukulkan Feathered Serpent Head at top
  const headY = 44;
  dc.beginPath();
  dc.moveTo(-hw * 0.58, headY + 22);
  dc.lineTo(-hw * 0.66, headY - 12);
  dc.lineTo(-hw * 0.22, headY - 28);
  dc.lineTo(hw * 0.58, headY - 25);
  dc.lineTo(hw * 0.75, headY - 7);
  dc.lineTo(hw * 0.26, headY - 2);
  dc.lineTo(hw * 0.66, headY + 14);
  dc.lineTo(hw * 0.42, headY + 26);
  dc.closePath();
  dc.fillStyle = MAYA_BLUE;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.8;
  dc.stroke();

  // Upturned snout curl & forked cinnabar tongue
  dc.beginPath();
  dc.moveTo(hw * 0.55, headY + 6);
  dc.lineTo(hw * 0.88, headY + 12);
  dc.lineTo(hw * 0.76, headY + 20);
  dc.strokeStyle = CINNABAR_BRIGHT;
  dc.lineWidth = 3;
  dc.stroke();

  // Recurved fang
  dc.beginPath();
  dc.moveTo(hw * 0.34, headY - 2);
  dc.lineTo(hw * 0.4, headY + 12);
  dc.lineTo(hw * 0.22, headY + 2);
  dc.closePath();
  dc.fillStyle = CREAM;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 1.9;
  dc.stroke();

  // Square-round Maya serpent eye
  drawRoundedRectPath(dc, -hw * 0.3, headY - 18, 14, 13, 3.5);
  dc.fillStyle = CREAM;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.2;
  dc.stroke();
  dc.beginPath();
  dc.arc(-hw * 0.3 + 8, headY - 11.5, 3.4, 0, Math.PI * 2);
  dc.fillStyle = INK;
  dc.fill();

  // Crown feather plumes
  dc.beginPath();
  dc.moveTo(-hw * 0.44, headY - 20);
  dc.quadraticCurveTo(-hw * 0.88, headY - 40, -hw * 0.14, headY - 38);
  dc.lineTo(-hw * 0.22, headY - 24);
  dc.closePath();
  dc.fillStyle = JADE_GREEN;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.2;
  dc.stroke();

  dc.restore();
}

/**
 * Draws a low-contrast codex-style stepped Maya temple pyramid in the midground.
 */
function drawSteppedPyramid(dc, cx, baseY, width, tiers = 4) {
  dc.save();
  dc.lineJoin = "round";

  const tierH = 38;
  for (let i = 0; i < tiers; i++) {
    const f = i / tiers;
    const tw = lerp(width, width * 0.38, f);
    const ty = baseY - (i + 1) * tierH;

    dc.fillStyle = i % 2 === 0 ? "rgba(182, 152, 108, 0.44)" : "rgba(164, 133, 91, 0.44)";
    dc.strokeStyle = "rgba(42, 30, 18, 0.48)";
    dc.lineWidth = 2;
    dc.fillRect(cx - tw * 0.5, ty, tw, tierH);
    dc.strokeRect(cx - tw * 0.5, ty, tw, tierH);

    dc.fillStyle = i % 2 === 0 ? "rgba(40, 124, 140, 0.22)" : "rgba(168, 51, 36, 0.2)";
    dc.fillRect(cx - tw * 0.46, ty + 8, tw * 0.92, 12);
  }

  const topY = baseY - tiers * tierH;
  const sanW = width * 0.28;
  const sanH = 44;
  dc.fillStyle = "rgba(196, 168, 124, 0.52)";
  dc.strokeStyle = "rgba(42, 30, 18, 0.52)";
  dc.lineWidth = 2.2;
  dc.fillRect(cx - sanW * 0.5, topY - sanH, sanW, sanH);
  dc.strokeRect(cx - sanW * 0.5, topY - sanH, sanW, sanH);

  dc.fillStyle = "rgba(46, 32, 20, 0.46)";
  dc.fillRect(cx - sanW * 0.18, topY - sanH * 0.65, sanW * 0.36, sanH * 0.65);

  dc.fillStyle = "rgba(168, 51, 36, 0.46)";
  dc.fillRect(cx - sanW * 0.56, topY - sanH - 8, sanW * 1.12, 9);
  dc.strokeRect(cx - sanW * 0.56, topY - sanH - 8, sanW * 1.12, 9);

  const stairBotW = width * 0.22;
  const stairTopW = sanW * 0.48;
  dc.beginPath();
  dc.moveTo(cx - stairBotW * 0.5, baseY);
  dc.lineTo(cx - stairTopW * 0.5, topY);
  dc.lineTo(cx + stairTopW * 0.5, topY);
  dc.lineTo(cx + stairBotW * 0.5, baseY);
  dc.closePath();
  dc.fillStyle = "rgba(218, 198, 160, 0.62)";
  dc.fill();
  dc.strokeStyle = "rgba(42, 30, 18, 0.48)";
  dc.lineWidth = 2;
  dc.stroke();

  dc.strokeStyle = "rgba(58, 42, 26, 0.35)";
  dc.lineWidth = 1.4;
  for (let sy = topY + 10; sy < baseY; sy += 10) {
    const t = (sy - topY) / (baseY - topY);
    const sw = lerp(stairTopW, stairBotW, t) * 0.46;
    dc.beginPath();
    dc.moveTo(cx - sw, sy);
    dc.lineTo(cx + sw, sy);
    dc.stroke();
  }

  dc.restore();
}

/**
 * Draws a cohesive Maya almanac glyph table on codex leaves with large readable bar-and-dot numerals.
 */
function drawAlmanacColumn(dc, x, y, w, h, seed = 1, includeCornerTopLeft = false) {
  dc.save();
  drawRoundedRectPath(dc, x, y, w, h, 5);
  dc.fillStyle = "rgba(244, 232, 206, 0.52)";
  dc.fill();
  dc.strokeStyle = CINNABAR;
  dc.lineWidth = 2.6;
  dc.stroke();

  const rows = 3;
  const cellH = (h - 14) / rows;
  for (let r = 0; r < rows; r++) {
    const cy = y + 7 + r * cellH;
    if (r > 0) {
      dc.beginPath();
      dc.moveTo(x + 8, cy);
      dc.lineTo(x + w - 8, cy);
      dc.strokeStyle = CINNABAR;
      dc.lineWidth = 2;
      dc.stroke();
    }
    const glyphSize = Math.min(w * 0.34, cellH * 0.72);
    const glyphVariant = includeCornerTopLeft && r === 0 ? 0 : seed + r;
    drawMayaDayGlyphBox(dc, x + w * 0.28, cy + cellH * 0.5, glyphSize, glyphVariant);

    // Bold readable Maya numeral next to glyph
    const numVal = ((seed * 3 + r * 2) % 6) + 1;
    drawMayaNumeral(dc, numVal, x + w * 0.7, cy + cellH * 0.5, 0.64, {
      dotCol: MAYA_BLUE,
      barCol: CINNABAR,
      inkW: 2.4,
    });
  }
  dc.restore();
}

/**
 * Draws a Dresden-Codex-style 2x2 hieroglyphic caption cartouche block above the central road.
 */
function drawCodexCaptionBlock(dc, x, y, w, h) {
  dc.save();
  drawRoundedRectPath(dc, x, y, w, h, 6);
  dc.fillStyle = "rgba(244, 232, 206, 0.44)";
  dc.fill();
  dc.strokeStyle = CINNABAR;
  dc.lineWidth = 2.6;
  dc.stroke();

  // Inner red grid divider cross
  dc.strokeStyle = "rgba(168, 51, 36, 0.6)";
  dc.lineWidth = 1.8;
  dc.beginPath();
  dc.moveTo(x + w * 0.5, y + 6);
  dc.lineTo(x + w * 0.5, y + h - 6);
  dc.moveTo(x + 6, y + h * 0.5);
  dc.lineTo(x + w - 6, y + h * 0.5);
  dc.stroke();

  // Four fictional Maya glyph blocks + small red/blue coefficients
  const cw = w * 0.5;
  const ch = h * 0.5;
  const variants = [3, 5, 2, 1];
  const nums = [2, 5, 3, 4];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const idx = r * 2 + c;
      const gx = x + c * cw + cw * 0.36;
      const gy = y + r * ch + ch * 0.5;
      drawMayaDayGlyphBox(dc, gx, gy, 48, variants[idx]);
      drawMayaNumeral(dc, nums[idx], x + c * cw + cw * 0.78, gy, 0.46, {
        dotCol: CINNABAR,
        barCol: MAYA_BLUE,
        inkW: 2.2,
      });
    }
  }
  dc.restore();
}

/**
 * Bakes the static 1840x1000 Amate bark-paper accordion codex backdrop once per session.
 */
function bakeMayaCodexBackdrop(pg) {
  const dc = pg.drawingContext;
  const rand = prng(12007);

  pg.background(AMATE_BASE);

  dc.save();
  dc.translate(-BLEED_LEFT, 0);

  // 1. Alternating subtle accordion leaf tonal warmth & shadow bevels
  const leafBounds = [-420, ...FOLD_XS, 1420];
  for (let i = 0; i < leafBounds.length - 1; i++) {
    const lx0 = leafBounds[i];
    const lx1 = leafBounds[i + 1];
    dc.fillStyle = i % 2 === 0 ? "rgba(249, 239, 216, 0.28)" : "rgba(122, 88, 48, 0.1)";
    dc.fillRect(lx0, 0, lx1 - lx0, 1000);
  }

  // 2. Rich fibrous Amate fig-bark paper texture (cross-woven bark bast fibers & warm mottling)
  for (let i = 0; i < 1100; i++) {
    const fx = -420 + rand() * 1840;
    const fy = rand() * 1000;
    const flen = 14 + rand() * 88;
    const horiz = rand() > 0.36;
    const tone = rand();
    dc.strokeStyle =
      tone > 0.58
        ? "rgba(250, 240, 218, 0.25)"
        : tone > 0.24
          ? "rgba(154, 118, 74, 0.16)"
          : "rgba(104, 72, 38, 0.1)";
    dc.lineWidth = 0.7 + rand() * 2.2;
    dc.beginPath();
    dc.moveTo(fx, fy);
    if (horiz) dc.lineTo(fx + flen, fy + (rand() - 0.5) * 9);
    else dc.lineTo(fx + (rand() - 0.5) * 7, fy + flen);
    dc.stroke();
  }

  for (let i = 0; i < 1100; i++) {
    const sx = -420 + rand() * 1840;
    const sy = rand() * 1000;
    const sr = 2 + rand() * 22;
    dc.beginPath();
    dc.arc(sx, sy, sr, 0, Math.PI * 2);
    dc.fillStyle = rand() > 0.5 ? "rgba(148, 108, 62, 0.05)" : "rgba(246, 234, 206, 0.06)";
    dc.fill();
  }

  // Aged bark vignette at top & bottom deckled codex edges
  const topVig = dc.createLinearGradient(0, 0, 0, 44);
  topVig.addColorStop(0, "rgba(68, 42, 20, 0.42)");
  topVig.addColorStop(1, "rgba(68, 42, 20, 0)");
  dc.fillStyle = topVig;
  dc.fillRect(-420, 0, 1840, 44);

  const botVig = dc.createLinearGradient(0, 948, 0, 1000);
  botVig.addColorStop(0, "rgba(68, 42, 20, 0)");
  botVig.addColorStop(1, "rgba(68, 42, 20, 0.48)");
  dc.fillStyle = botVig;
  dc.fillRect(-420, 948, 1840, 52);

  // 3. Background Stepped Maya Pyramid Temples (low-contrast wash behind Pelican)
  drawSteppedPyramid(dc, -168, ROAD_Y, 220, 3);
  drawSteppedPyramid(dc, 250, ROAD_Y, 275, 4);
  drawSteppedPyramid(dc, 512, ROAD_Y, 225, 3);
  drawSteppedPyramid(dc, 1110, ROAD_Y, 245, 4);

  // 4. Horizontal Codex Almanac Bands & Geometric Step-Fret Borders
  dc.fillStyle = "rgba(168, 51, 36, 0.16)";
  dc.fillRect(-420, 12, 1840, 16);
  dc.fillRect(-420, 962, 1840, 18);

  for (let gx = -410; gx <= 1390; gx += 48) {
    dc.fillStyle = ((gx / 48) & 1) === 0 ? MAYA_BLUE : CINNABAR;
    dc.fillRect(gx, 15, 22, 10);
    dc.fillRect(gx + 10, 965, 22, 11);
    dc.strokeStyle = INK;
    dc.lineWidth = 1.4;
    dc.strokeRect(gx, 15, 22, 10);
    dc.strokeRect(gx + 10, 965, 22, 11);
  }

  const drawCodexDivider = (y, thick = 4) => {
    dc.fillStyle = CINNABAR;
    dc.fillRect(-420, y - thick * 0.5, 1840, thick);
    dc.fillStyle = MAYA_BLUE;
    dc.fillRect(-420, y + thick * 0.5 + 2, 1840, 2.2);
    dc.strokeStyle = INK;
    dc.lineWidth = 1.4;
    dc.beginPath();
    dc.moveTo(-420, y - thick * 0.5);
    dc.lineTo(1420, y - thick * 0.5);
    dc.stroke();
  };

  drawCodexDivider(28, 4.5);
  drawCodexDivider(128, 4);
  drawCodexDivider(REGISTER_Y + 4, 5.5);
  drawCodexDivider(860, 4.5);
  drawCodexDivider(960, 4);

  // 5. Stepped Maya Temple Stone Causeway Base (ROAD_Y = 730 .. 856)
  dc.fillStyle = STONE_LIGHT;
  dc.fillRect(-420, ROAD_Y, 1840, 18);
  dc.fillStyle = STONE_MID;
  dc.fillRect(-420, ROAD_Y + 18, 1840, 110);

  dc.fillStyle = CINNABAR;
  dc.fillRect(-420, ROAD_Y + 24, 1840, 16);
  dc.fillStyle = MAYA_BLUE;
  dc.fillRect(-420, ROAD_Y + 44, 1840, 14);
  dc.fillStyle = STONE_DARK;
  dc.fillRect(-420, ROAD_Y + 58, 1840, 70);

  dc.strokeStyle = INK;
  dc.lineWidth = 2.6;
  dc.beginPath();
  dc.moveTo(-420, ROAD_Y);
  dc.lineTo(1420, ROAD_Y);
  dc.moveTo(-420, ROAD_Y + 18);
  dc.lineTo(1420, ROAD_Y + 18);
  dc.moveTo(-420, ROAD_Y + 40);
  dc.lineTo(1420, ROAD_Y + 40);
  dc.moveTo(-420, ROAD_Y + 58);
  dc.lineTo(1420, ROAD_Y + 58);
  dc.stroke();

  for (let sx = -400; sx <= 1400; sx += 80) {
    dc.beginPath();
    dc.moveTo(sx, ROAD_Y);
    dc.lineTo(sx, ROAD_Y + 18);
    dc.moveTo(sx + 40, ROAD_Y + 58);
    dc.lineTo(sx + 40, ROAD_Y + 128);
    dc.strokeStyle = INK;
    dc.lineWidth = 2;
    dc.stroke();

    drawRoundedRectPath(dc, sx + 12, ROAD_Y + 68, 56, 46, 4);
    dc.fillStyle = ((sx / 80) & 1) === 0 ? "rgba(40, 124, 140, 0.5)" : "rgba(168, 51, 36, 0.45)";
    dc.fill();
    dc.strokeStyle = INK;
    dc.lineWidth = 1.8;
    dc.stroke();

    dc.fillStyle = STONE_LIGHT;
    dc.fillRect(sx + 24, ROAD_Y + 80, 32, 22);
    dc.strokeRect(sx + 24, ROAD_Y + 80, 32, 22);
  }

  for (const stairX of [-168, 500, 1110]) {
    const sw = 132;
    dc.fillStyle = STONE_LIGHT;
    dc.fillRect(stairX - sw * 0.5, ROAD_Y + 2, sw, 126);
    dc.strokeStyle = INK;
    dc.lineWidth = 2.6;
    dc.strokeRect(stairX - sw * 0.5, ROAD_Y + 2, sw, 126);

    dc.fillStyle = CINNABAR;
    dc.fillRect(stairX - sw * 0.5 - 14, ROAD_Y + 2, 14, 126);
    dc.fillRect(stairX + sw * 0.5, ROAD_Y + 2, 14, 126);
    dc.strokeRect(stairX - sw * 0.5 - 14, ROAD_Y + 2, 14, 126);
    dc.strokeRect(stairX + sw * 0.5, ROAD_Y + 2, 14, 126);

    for (let stepY = ROAD_Y + 18; stepY < ROAD_Y + 125; stepY += 16) {
      dc.fillStyle = STONE_MID;
      dc.fillRect(stairX - sw * 0.46, stepY, sw * 0.92, 6);
      dc.beginPath();
      dc.moveTo(stairX - sw * 0.5, stepY);
      dc.lineTo(stairX + sw * 0.5, stepY);
      dc.strokeStyle = INK;
      dc.lineWidth = 1.8;
      dc.stroke();
    }
  }

  // 6. Feathered Serpent Scroll Relief Borders & Cohesive Almanac Columns
  drawFeatheredSerpentRelief(dc, 16, 444, 92, 278, 1);
  drawFeatheredSerpentRelief(dc, 1230, 444, 92, 278, -1);
  drawFeatheredSerpentRelief(dc, -320, 444, 84, 278, 1);

  // Leaf 0 unified almanac column (includes Top-Left Day-Glyph Cartouche in row 0!)
  drawAlmanacColumn(dc, 18, 140, 298, 276, 1, true);
  // Leaf 1 central codex glyph caption block (fills center-upper space cleanly beside Scribe)
  drawCodexCaptionBlock(dc, 352, 148, 260, 178);
  // Leaf 1 Maya sky-band frieze ("星象天带纹") beneath caption block
  drawRoundedRectPath(dc, 352, 338, 260, 74, 5);
  dc.fillStyle = "rgba(244, 232, 206, 0.44)";
  dc.fill();
  dc.strokeStyle = CINNABAR;
  dc.lineWidth = 2.4;
  dc.stroke();

  const bandSegs = 4;
  const bandW = 244 / bandSegs;
  for (let i = 0; i < bandSegs; i++) {
    const bx = 360 + i * bandW;
    const by = 346;
    const bh = 58;
    dc.fillStyle = i % 2 === 0 ? "rgba(40, 124, 140, 0.24)" : "rgba(168, 51, 36, 0.22)";
    dc.fillRect(bx + 2, by, bandW - 4, bh);
    dc.strokeStyle = "rgba(26, 19, 14, 0.55)";
    dc.lineWidth = 1.6;
    dc.strokeRect(bx + 2, by, bandW - 4, bh);

    const cxB = bx + bandW * 0.5;
    const cyB = by + bh * 0.5;
    if (i % 2 === 0) {
      // Crossed Maya sky-band St. Andrew's X + center dot
      dc.beginPath();
      dc.moveTo(cxB - 14, cyB - 14);
      dc.lineTo(cxB + 14, cyB + 14);
      dc.moveTo(cxB + 14, cyB - 14);
      dc.lineTo(cxB - 14, cyB + 14);
      dc.strokeStyle = CINNABAR;
      dc.lineWidth = 3.2;
      dc.stroke();
      dc.beginPath();
      dc.arc(cxB, cyB, 5.5, 0, Math.PI * 2);
      dc.fillStyle = CREAM;
      dc.fill();
      dc.strokeStyle = INK;
      dc.lineWidth = 1.6;
      dc.stroke();
    } else {
      // Maya solar/Venus stepped eye bar
      dc.beginPath();
      dc.arc(cxB, cyB - 7, 9, 0, Math.PI * 2);
      dc.fillStyle = OCHRE_GOLD;
      dc.fill();
      dc.strokeStyle = INK;
      dc.lineWidth = 1.8;
      dc.stroke();
      dc.fillStyle = MAYA_BLUE;
      dc.fillRect(cxB - 16, cyB + 8, 32, 8);
      dc.strokeRect(cxB - 16, cyB + 8, 32, 8);
    }
  }

  // Side wing almanacs
  drawAlmanacColumn(dc, -315, 140, 294, 276, 4, false);
  drawAlmanacColumn(dc, 1020, 140, 294, 276, 2, false);

  // 7. Lower Register Sky-Band / Calendar Medallions between bottom corner cartouches
  for (let bx = 152; bx <= 852; bx += 140) {
    drawRoundedRectPath(dc, bx - 44, 882, 88, 52, 6);
    dc.fillStyle = "rgba(244, 232, 206, 0.42)";
    dc.fill();
    dc.strokeStyle = "rgba(168, 51, 36, 0.55)";
    dc.lineWidth = 2;
    dc.stroke();
    drawMayaNumeral(dc, ((bx - 152) / 140) % 5 + 1, bx, 908, 0.52, {
      dotCol: "rgba(40, 124, 140, 0.72)",
      barCol: "rgba(168, 51, 36, 0.72)",
      inkW: 2,
    });
  }

  // Four Corner Fictional Maya Calendar Day-Glyph Cartouche Boxes (+ wing corners)
  // (Top-Left is already hero-sized inside Leaf 0 row 0 at (18 + 298*0.28 = 101, 188) — plus crisp top-right & bottom corners!)
  drawMayaDayGlyphBox(dc, 944, 78, 74, 1);   // Top-right of canonical square
  drawMayaDayGlyphBox(dc, 58, 908, 74, 2);   // Bottom-left of canonical square
  drawMayaDayGlyphBox(dc, 944, 908, 74, 3);  // Bottom-right of canonical square

  drawMayaDayGlyphBox(dc, -280, 78, 70, 4);
  drawMayaDayGlyphBox(dc, -280, 908, 70, 5);
  drawMayaDayGlyphBox(dc, 1280, 78, 70, 2);
  drawMayaDayGlyphBox(dc, 1280, 908, 70, 0);

  // Decorative Maya sky glyphs in canonical upper-center strip
  drawMayaDayGlyphBox(dc, 468, 76, 54, 4);
  drawMayaDayGlyphBox(dc, 544, 76, 54, 5);

  // 8. Accordion Vertical Fold Creases & Shadows
  for (const fx of FOLD_XS) {
    const shGrad = dc.createLinearGradient(fx - 30, 0, fx, 0);
    shGrad.addColorStop(0, "rgba(62, 38, 18, 0)");
    shGrad.addColorStop(0.68, "rgba(62, 38, 18, 0.16)");
    shGrad.addColorStop(1, "rgba(46, 26, 12, 0.38)");
    dc.fillStyle = shGrad;
    dc.fillRect(fx - 30, 0, 30, 1000);

    const hiGrad = dc.createLinearGradient(fx, 0, fx + 20, 0);
    hiGrad.addColorStop(0, "rgba(255, 248, 230, 0.48)");
    hiGrad.addColorStop(0.42, "rgba(255, 248, 230, 0.16)");
    hiGrad.addColorStop(1, "rgba(255, 248, 230, 0)");
    dc.fillStyle = hiGrad;
    dc.fillRect(fx, 0, 20, 1000);

    dc.strokeStyle = "rgba(168, 51, 36, 0.78)";
    dc.lineWidth = 2.6;
    dc.setLineDash([18, 5, 7, 5]);
    dc.beginPath();
    dc.moveTo(fx, 14);
    dc.lineTo(fx, 986);
    dc.stroke();
    dc.setLineDash([]);

    // Folded accordion V-notches at top and bottom edges
    dc.fillStyle = "#26180f";
    dc.beginPath();
    dc.moveTo(fx - 12, 0);
    dc.lineTo(fx, 14);
    dc.lineTo(fx + 12, 0);
    dc.closePath();
    dc.fill();

    dc.beginPath();
    dc.moveTo(fx - 12, 1000);
    dc.lineTo(fx, 986);
    dc.lineTo(fx + 12, 1000);
    dc.closePath();
    dc.fill();
  }

  dc.restore();
}

/**
 * Draws the right-hand Red-Grid Codex Pedal Counter ("PEDAL REVS / 踏板圈数")
 * with live Maya vigesimal bar-and-dot numerals ticking up every 1.0s (2 beats).
 */
function drawPedalCounterPanel(g, u) {
  const dc = g.drawingContext;
  const x = 746;
  const y = 136;
  const w = 238;
  const h = 282;

  const revs = Math.max(0, Math.floor(u));
  const revFrac = u >= 1 ? u - Math.floor(u) : 1;
  const tickPulse = u >= 1 ? Math.exp(-revFrac * 6.5) : 0;

  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";

  drawRoundedRectPath(dc, x + 5, y + 5, w, h, 7);
  dc.fillStyle = "rgba(42, 24, 12, 0.25)";
  dc.fill();

  drawRoundedRectPath(dc, x, y, w, h, 7);
  dc.fillStyle = "#efe3c7";
  dc.fill();

  dc.strokeStyle = CINNABAR;
  dc.lineWidth = 4;
  dc.stroke();

  drawRoundedRectPath(dc, x + 5, y + 5, w - 10, h - 10, 5);
  dc.strokeStyle = MAYA_BLUE;
  dc.lineWidth = 2;
  dc.stroke();

  const hdrX = x + 9;
  const hdrY = y + 9;
  const hdrW = w - 18;
  const hdrH = 48;
  drawRoundedRectPath(dc, hdrX, hdrY, hdrW, hdrH, 4);
  dc.fillStyle = CINNABAR;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.2;
  dc.stroke();

  for (const bx of [hdrX + 6, hdrX + hdrW - 14]) {
    dc.fillStyle = OCHRE_GOLD;
    dc.fillRect(bx, hdrY + 8, 8, 8);
    dc.fillRect(bx, hdrY + hdrH - 16, 8, 8);
  }

  dc.textAlign = "center";
  dc.textBaseline = "top";
  dc.fillStyle = CREAM;
  dc.font = "bold 13.5px Menlo, Monaco, monospace";
  dc.fillText("PEDAL REVS", x + w * 0.5, hdrY + 6);

  dc.fillStyle = "#fce09d";
  dc.font = 'bold 18px "Songti SC", "PingFang SC", serif';
  dc.fillText("踏 板 圈 数", x + w * 0.5, hdrY + 23);

  const boxX = x + 14;
  const boxY = y + 66;
  const boxW = w - 28;
  const boxH = 114;

  drawRoundedRectPath(dc, boxX, boxY, boxW, boxH, 5);
  dc.fillStyle = tickPulse > 0.05 ? "#f9efd8" : "#f4e9cf";
  dc.fill();
  dc.strokeStyle = CINNABAR;
  dc.lineWidth = 2.8;
  dc.stroke();

  // Prominent red grid rulings inside tally window
  dc.strokeStyle = "rgba(168, 51, 36, 0.28)";
  dc.lineWidth = 1.2;
  for (let gx = boxX + 35; gx < boxX + boxW - 4; gx += 35) {
    dc.beginPath();
    dc.moveTo(gx, boxY + 4);
    dc.lineTo(gx, boxY + boxH - 4);
    dc.stroke();
  }
  for (let gy = boxY + 28; gy < boxY + boxH - 4; gy += 28) {
    dc.beginPath();
    dc.moveTo(boxX + 4, gy);
    dc.lineTo(boxX + boxW - 4, gy);
    dc.stroke();
  }

  const cx = boxX + boxW * 0.5;
  const cy = boxY + boxH * 0.5;
  if (tickPulse > 0.02) {
    dc.beginPath();
    dc.arc(cx, cy, 42 + (1 - tickPulse) * 26, 0, Math.PI * 2);
    dc.strokeStyle = `rgba(209, 60, 36, ${(tickPulse * 0.78).toFixed(3)})`;
    dc.lineWidth = 5 * tickPulse;
    dc.stroke();

    dc.beginPath();
    dc.arc(cx, cy, 34 + (1 - tickPulse) * 16, 0, Math.PI * 2);
    dc.strokeStyle = `rgba(40, 124, 140, ${(tickPulse * 0.72).toFixed(3)})`;
    dc.lineWidth = 3.2 * tickPulse;
    dc.stroke();
  }

  const brk = 10;
  dc.strokeStyle = MAYA_BLUE;
  dc.lineWidth = 2.5;
  for (const [bx, by, sx, sy] of [
    [boxX + 6, boxY + 6, 1, 1],
    [boxX + boxW - 6, boxY + 6, -1, 1],
    [boxX + 6, boxY + boxH - 6, 1, -1],
    [boxX + boxW - 6, boxY + boxH - 6, -1, -1],
  ]) {
    dc.beginPath();
    dc.moveTo(bx + sx * brk, by);
    dc.lineTo(bx, by);
    dc.lineTo(bx, by + sy * brk);
    dc.stroke();
  }

  const popScale = 1 + 0.16 * tickPulse;
  const numCol = tickPulse > 0.25 ? "#e63e22" : CINNABAR_BRIGHT;
  const barCol = tickPulse > 0.25 ? MAYA_TURQ : MAYA_BLUE;
  drawMayaNumeral(dc, revs, cx, cy, 1.44 * popScale, {
    dotCol: numCol,
    barCol: revs >= 5 ? CINNABAR : barCol,
    shellCol: CREAM,
    accentCol: MAYA_BLUE,
    inkW: 2.5,
  });

  // 6-Cell Red-Ruled Revolution Ledger Row
  const ledX = x + 14;
  const ledY = y + 190;
  const ledW = w - 28;
  const ledH = 54;
  const cols = 6;
  const cellW = ledW / cols;

  dc.fillStyle = "#f5ebd4";
  dc.fillRect(ledX, ledY, ledW, ledH);
  dc.strokeStyle = CINNABAR;
  dc.lineWidth = 2.4;
  dc.strokeRect(ledX, ledY, ledW, ledH);

  for (let c = 0; c < cols; c++) {
    const cxCell = ledX + c * cellW;
    const revNum = c + 1;
    const isFilled = revs >= revNum;
    const isLatest = revs === revNum;

    if (c > 0) {
      dc.beginPath();
      dc.moveTo(cxCell, ledY);
      dc.lineTo(cxCell, ledY + ledH);
      dc.strokeStyle = CINNABAR;
      dc.lineWidth = 1.8;
      dc.stroke();
    }

    if (isLatest) {
      dc.fillStyle = `rgba(40, 124, 140, ${(0.18 + 0.26 * tickPulse).toFixed(3)})`;
      dc.fillRect(cxCell + 1.5, ledY + 1.5, cellW - 3, ledH - 3);
    }

    if (isFilled) {
      const miniScale = revNum === 6 ? 0.35 : 0.4;
      drawMayaNumeral(dc, revNum, cxCell + cellW * 0.5, ledY + ledH * 0.5, miniScale, {
        dotCol: isLatest ? CINNABAR_BRIGHT : INK,
        barCol: isLatest ? MAYA_BLUE : CINNABAR,
        inkW: 2.4,
      });
    } else {
      dc.beginPath();
      dc.arc(cxCell + cellW * 0.5, ledY + ledH * 0.5, 2.2, 0, Math.PI * 2);
      dc.fillStyle = "rgba(168, 51, 36, 0.26)";
      dc.fill();
    }
  }

  // Bottom legend strip
  const keyY = y + 258;
  drawMayaNumeral(dc, 0, x + 40, keyY, 0.34, { inkW: 2.2 });
  drawMayaNumeral(dc, 1, x + 109, keyY, 0.42, { dotCol: CINNABAR_BRIGHT, inkW: 2.2 });
  drawMayaNumeral(dc, 5, x + 173, keyY, 0.32, { barCol: CINNABAR, inkW: 2.2 });

  dc.fillStyle = INK_SOFT;
  dc.font = "bold 12px Menlo, monospace";
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  dc.fillText("=0", x + 53, keyY + 1);
  dc.fillText("=1", x + 118, keyY + 1);
  dc.fillText("=5", x + 186, keyY + 1);

  dc.restore();
}

/**
 * Draws the plumed, jade-earspooled Maya Scribe standing cleanly inside Leaf 2 beside the counter,
 * holding a feathered reed ink-quill and nodding on every beat (0.5s) while stamping ticks on 1.0s.
 */
function drawMayaScribe(g, x, baseY, u) {
  const dc = g.drawingContext;

  const beatFrac = (Math.max(0, u) * 2) % 1;
  const nodPulse = Math.exp(-beatFrac * 7.0);
  const revFrac = u >= 1 ? u - Math.floor(u) : 1;
  const stampPulse = u >= 1 ? Math.exp(-revFrac * 7.5) : 0;
  const headPitch = 0.14 * nodPulse + (Math.floor(Math.max(0, u) * 2) % 2 === 1 ? 0.08 : -0.02);

  dc.save();
  dc.translate(x, baseY);
  dc.lineCap = "round";
  dc.lineJoin = "round";

  // Stone scribe plinth
  drawRoundedRectPath(dc, -40, -12, 80, 12, 3);
  dc.fillStyle = STONE_LIGHT;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.6;
  dc.stroke();

  // Maya codex stepped stance legs + sculpted sandals
  dc.strokeStyle = INK;
  dc.lineWidth = 3;
  for (const [lx, kneeOff] of [[-12, -2], [11, 4]]) {
    dc.beginPath();
    dc.moveTo(lx - 6, -54);
    dc.lineTo(lx - 7 + kneeOff, -34);
    dc.lineTo(lx - 6, -18);
    dc.lineTo(lx + 7, -18);
    dc.lineTo(lx + 8 + kneeOff, -34);
    dc.lineTo(lx + 7, -54);
    dc.closePath();
    dc.fillStyle = SKIN_TONE;
    dc.fill();
    dc.stroke();

    // Knee jade cuff & high-backed Maya sandal
    dc.fillStyle = MAYA_BLUE;
    dc.fillRect(lx - 7 + kneeOff, -38, 15, 5);
    dc.strokeRect(lx - 7 + kneeOff, -38, 15, 5);

    dc.fillStyle = CINNABAR;
    dc.fillRect(lx - 8, -22, 18, 10);
    dc.strokeRect(lx - 8, -22, 18, 10);
  }

  // Ceremonial white & Maya-blue patterned loincloth ("ex") + jaguar belt
  dc.beginPath();
  dc.moveTo(-22, -110);
  dc.lineTo(22, -110);
  dc.lineTo(26, -50);
  dc.lineTo(-26, -50);
  dc.closePath();
  dc.fillStyle = CREAM;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 3;
  dc.stroke();

  dc.fillStyle = MAYA_BLUE;
  dc.fillRect(-9, -96, 20, 56);
  dc.strokeRect(-9, -96, 20, 56);
  dc.fillStyle = CINNABAR;
  dc.fillRect(-5, -86, 12, 13);
  dc.fillRect(-5, -61, 12, 13);

  dc.fillStyle = OCHRE_GOLD;
  dc.fillRect(-24, -112, 48, 12);
  dc.strokeRect(-24, -112, 48, 12);

  // Torso & jade pectoral collar
  dc.beginPath();
  dc.moveTo(-20, -112);
  dc.lineTo(-24, -162);
  dc.lineTo(20, -162);
  dc.lineTo(18, -112);
  dc.closePath();
  dc.fillStyle = SKIN_TONE;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 3.2;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-20, -160);
  dc.quadraticCurveTo(0, -138, 18, -158);
  dc.lineTo(12, -142);
  dc.quadraticCurveTo(0, -126, -14, -142);
  dc.closePath();
  dc.fillStyle = MAYA_TURQ;
  dc.fill();
  dc.stroke();

  // Left arm resting cleanly on belt
  dc.beginPath();
  dc.moveTo(-19, -154);
  dc.lineTo(-32, -124);
  dc.lineTo(-18, -108);
  dc.strokeStyle = INK;
  dc.lineWidth = 11.5;
  dc.stroke();
  dc.strokeStyle = SKIN_TONE;
  dc.lineWidth = 6;
  dc.stroke();

  // Head + Sloped Maya Profile + Jade Earspool + Multi-Plume Headdress
  dc.save();
  dc.translate(0, -164);
  dc.rotate(headPitch);

  const plumes = [
    [-12, -28, -56, -84, -84, -52, MAYA_BLUE],
    [-12, -24, -62, -62, -78, -22, JADE_GREEN],
    [-8, -18, -52, -40, -64, -2, CINNABAR],
    [-8, -32, -38, -94, -64, -76, JADE_GREEN],
  ];
  for (const [sx, sy, cx1, cy1, ex, ey, col] of plumes) {
    dc.beginPath();
    dc.moveTo(sx, sy);
    dc.quadraticCurveTo(cx1, cy1, ex, ey);
    dc.quadraticCurveTo(cx1 + 11, cy1 + 15, sx, sy + 9);
    dc.closePath();
    dc.fillStyle = col;
    dc.fill();
    dc.strokeStyle = INK;
    dc.lineWidth = 2.4;
    dc.stroke();
  }

  dc.beginPath();
  dc.moveTo(-16, 0);
  dc.lineTo(-18, -32);
  dc.lineTo(6, -38);
  dc.lineTo(24, -18);
  dc.lineTo(18, -11);
  dc.lineTo(20, -3);
  dc.lineTo(12, 4);
  dc.closePath();
  dc.fillStyle = SKIN_TONE;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 3;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-19, -30);
  dc.lineTo(10, -40);
  dc.lineTo(14, -29);
  dc.lineTo(-18, -22);
  dc.closePath();
  dc.fillStyle = CINNABAR;
  dc.fill();
  dc.stroke();

  dc.beginPath();
  dc.arc(10, -34, 6.5, 0, Math.PI * 2);
  dc.fillStyle = MAYA_TURQ;
  dc.fill();
  dc.stroke();

  dc.beginPath();
  dc.arc(8, -20, 4.4, 0, Math.PI * 2);
  dc.fillStyle = CREAM;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 1.8;
  dc.stroke();
  dc.beginPath();
  dc.arc(9.5, -20, 2, 0, Math.PI * 2);
  dc.fillStyle = INK;
  dc.fill();

  // Jade Earspool ("耳戴玉珥")
  dc.beginPath();
  dc.arc(-8, -12, 9.5, 0, Math.PI * 2);
  dc.fillStyle = MAYA_TURQ;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.4;
  dc.stroke();

  dc.beginPath();
  dc.arc(-8, -12, 4, 0, Math.PI * 2);
  dc.fillStyle = CREAM;
  dc.fill();
  dc.stroke();

  dc.beginPath();
  dc.arc(-8, 1, 3.2, 0, Math.PI * 2);
  dc.fillStyle = MAYA_BLUE;
  dc.fill();
  dc.stroke();

  dc.restore();

  // Right arm holding unmistakable Feathered Ink-Quill ("执羽毛墨笔") reaching to Counter
  const handX = 32 + stampPulse * 10;
  const handY = -126 - stampPulse * 6;

  dc.beginPath();
  dc.moveTo(13, -152);
  dc.lineTo(20, -124);
  dc.lineTo(handX, handY);
  dc.strokeStyle = INK;
  dc.lineWidth = 11.5;
  dc.stroke();
  dc.strokeStyle = SKIN_TONE;
  dc.lineWidth = 6;
  dc.stroke();

  dc.beginPath();
  dc.arc(handX - 1, handY + 2, 5.8, 0, Math.PI * 2);
  dc.fillStyle = MAYA_TURQ;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.2;
  dc.stroke();

  // Stylus angled forward-up toward the counter edge, feather vane flaring back-down cleanly clear of face
  const tailX = handX - 20;
  const tailY = handY + 20;
  const nibX = handX + 20 + stampPulse * 4;
  const nibY = handY - 22;

  // Green/blue feather vane flaring downward-left from rear end of stylus
  dc.beginPath();
  dc.moveTo(handX - 4, handY + 4);
  dc.quadraticCurveTo(tailX - 12, tailY - 2, tailX - 14, tailY + 10);
  dc.quadraticCurveTo(tailX + 2, tailY + 14, handX + 2, handY + 7);
  dc.closePath();
  dc.fillStyle = JADE_GREEN;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.1;
  dc.stroke();

  // Reed shaft
  dc.beginPath();
  dc.moveTo(tailX - 2, tailY + 2);
  dc.lineTo(nibX, nibY);
  dc.strokeStyle = INK;
  dc.lineWidth = 3.8;
  dc.stroke();

  // Cinnabar ink tip + subtle stamp spark when ticking
  dc.beginPath();
  dc.arc(nibX, nibY, 3.8 + stampPulse * 2.4, 0, Math.PI * 2);
  dc.fillStyle = CINNABAR_BRIGHT;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 1.6;
  dc.stroke();

  if (stampPulse > 0.15) {
    dc.strokeStyle = `rgba(209, 60, 36, ${(stampPulse * 0.85).toFixed(3)})`;
    dc.lineWidth = 2.2;
    for (const ang of [-0.6, 0, 0.6]) {
      dc.beginPath();
      dc.moveTo(nibX + Math.cos(ang) * 7, nibY + Math.sin(ang) * 7);
      dc.lineTo(nibX + Math.cos(ang) * 14, nibY + Math.sin(ang) * 14);
      dc.stroke();
    }
  }

  dc.restore();
}

/**
 * Draws a Maya carved stone wheel with embedded Kinich Ahau sun-ray spokes ("石轮内嵌太阳射线").
 */
function drawMayaStoneWheel(dc, hub, r, rot, s) {
  dc.save();
  dc.translate(hub.x, hub.y);
  dc.lineCap = "round";
  dc.lineJoin = "round";

  dc.beginPath();
  dc.arc(0, 0, r, 0, Math.PI * 2);
  dc.fillStyle = STONE_LIGHT;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 4.2 * s;
  dc.stroke();

  const innerRimR = r - 11 * s;
  dc.beginPath();
  dc.arc(0, 0, innerRimR, 0, Math.PI * 2);
  dc.fillStyle = CREAM;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 3 * s;
  dc.stroke();

  dc.save();
  dc.rotate(rot);

  dc.strokeStyle = INK_SOFT;
  dc.lineWidth = 1.8 * s;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    dc.beginPath();
    dc.moveTo(Math.cos(a) * innerRimR, Math.sin(a) * innerRimR);
    dc.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    dc.stroke();
  }

  const rayCount = 8;
  const hubR = 17 * s;
  for (let i = 0; i < rayCount; i++) {
    const a = (i * Math.PI * 2) / rayCount;
    const da = Math.PI / rayCount;
    const isMajor = i % 2 === 0;
    const tipR = isMajor ? innerRimR - 2 * s : innerRimR - 8 * s;

    dc.beginPath();
    dc.moveTo(Math.cos(a - da * 0.65) * hubR, Math.sin(a - da * 0.65) * hubR);
    dc.lineTo(Math.cos(a) * tipR, Math.sin(a) * tipR);
    dc.lineTo(Math.cos(a + da * 0.65) * hubR, Math.sin(a + da * 0.65) * hubR);
    dc.closePath();
    dc.fillStyle = isMajor ? CINNABAR_BRIGHT : OCHRE_GOLD;
    dc.fill();
    dc.strokeStyle = INK;
    dc.lineWidth = 2.4 * s;
    dc.stroke();
  }

  dc.beginPath();
  dc.arc(0, 0, hubR, 0, Math.PI * 2);
  dc.fillStyle = MAYA_BLUE;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 3 * s;
  dc.stroke();

  // Four-petal K'in sun glyph inside hub
  for (let k = 0; k < 4; k++) {
    const ka = (k * Math.PI) / 2;
    dc.beginPath();
    dc.arc(Math.cos(ka) * hubR * 0.48, Math.sin(ka) * hubR * 0.48, hubR * 0.24, 0, Math.PI * 2);
    dc.fillStyle = CREAM;
    dc.fill();
  }

  dc.beginPath();
  dc.arc(0, 0, hubR * 0.42, 0, Math.PI * 2);
  dc.fillStyle = OCHRE_GOLD;
  dc.fill();
  dc.stroke();

  dc.restore();
  dc.restore();
}

/**
 * Draws the Maya-codex flat sacred bird Pelican & stone-wheeled bicycle using uniform bold black ink.
 */
function drawMayaRig(g, pose, u) {
  const dc = g.drawingContext;
  const s = pose.scale;
  const inkW = 3.8 * s;

  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";

  // Ground contact shadow beneath tires on ROAD_Y
  dc.fillStyle = "rgba(44, 28, 16, 0.22)";
  for (const hx of [pose.rearHub.x, pose.frontHub.x]) {
    dc.save();
    dc.translate(hx, ROAD_Y + 3 * s);
    dc.scale(1, 0.14);
    dc.beginPath();
    dc.arc(0, 0, 44 * s, 0, Math.PI * 2);
    dc.fill();
    dc.restore();
  }

  // Beat-synced limestone dust puffs at rear wheel
  const beatFrac = (Math.abs(u) * 2) % 1;
  if (beatFrac < 0.65) {
    for (let i = 0; i < 3; i++) {
      const age = (beatFrac + i * 0.14) % 0.7;
      dc.beginPath();
      dc.arc(
        pose.rearHub.x - 24 * s - age * 40 * s,
        ROAD_Y - 6 * s - age * 16 * s,
        (5 + age * 10) * s,
        0,
        Math.PI * 2
      );
      dc.fillStyle = `rgba(218, 198, 160, ${((1 - age) * 0.6).toFixed(3)})`;
      dc.fill();
    }
  }

  // Back leg & rear crank
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.leftKnee.x, pose.leftKnee.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.strokeStyle = INK;
  dc.lineWidth = 12.5 * s;
  dc.stroke();
  dc.strokeStyle = "#9b4920";
  dc.lineWidth = 6.5 * s;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.strokeStyle = INK;
  dc.lineWidth = 6.5 * s;
  dc.stroke();
  dc.strokeStyle = STONE_MID;
  dc.lineWidth = 3 * s;
  dc.stroke();

  drawMayaStoneWheel(dc, pose.rearHub, pose.wheelRadius, pose.wheelRot, s);
  drawMayaStoneWheel(dc, pose.frontHub, pose.wheelRadius, pose.wheelRot, s);

  // Carved Jade-Blue & Cinnabar Bicycle Frame
  const frameSegs = [
    [pose.rearHub, pose.bb, MAYA_BLUE],
    [pose.rearHub, pose.seatCluster, MAYA_BLUE],
    [pose.bb, pose.seatCluster, CINNABAR],
    [pose.seatCluster, pose.headTop, MAYA_BLUE],
    [pose.bb, pose.headBot, MAYA_BLUE],
    [pose.frontHub, pose.headTop, CINNABAR],
    [pose.headTop, pose.stemTop, STONE_LIGHT],
    [pose.stemTop, pose.barGrip, STONE_LIGHT],
  ];
  for (const [p0, p1, col] of frameSegs) {
    dc.beginPath();
    dc.moveTo(p0.x, p0.y);
    dc.lineTo(p1.x, p1.y);
    dc.strokeStyle = INK;
    dc.lineWidth = 10.5 * s;
    dc.stroke();
    dc.strokeStyle = col;
    dc.lineWidth = 5 * s;
    dc.stroke();
  }

  dc.beginPath();
  dc.moveTo(pose.seatCluster.x, pose.seatCluster.y);
  dc.lineTo((pose.saddleRear.x + pose.saddleFront.x) * 0.5, pose.saddleRear.y + 3 * s);
  dc.strokeStyle = INK;
  dc.lineWidth = 7 * s;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(pose.saddleRear.x, pose.saddleRear.y);
  dc.lineTo(pose.saddleFront.x, pose.saddleFront.y);
  dc.strokeStyle = INK;
  dc.lineWidth = 11 * s;
  dc.stroke();
  dc.strokeStyle = CINNABAR;
  dc.lineWidth = 5.5 * s;
  dc.stroke();

  dc.beginPath();
  dc.arc(pose.bb.x, pose.bb.y, 13 * s, 0, Math.PI * 2);
  dc.fillStyle = OCHRE_GOLD;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 3 * s;
  dc.stroke();

  dc.beginPath();
  dc.arc(pose.bellPos.x, pose.bellPos.y, 6.2 * s, 0, Math.PI * 2);
  dc.fillStyle = MAYA_TURQ;
  dc.fill();
  dc.stroke();

  // Symmetrical Volute Scroll Tail Feathers ("羽毛尾羽呈对称卷草纹")
  const tx = pose.tailTip.x;
  const ty = pose.tailTip.y;
  for (const dirY of [-1, 1]) {
    dc.beginPath();
    dc.moveTo(tx + 12 * s, ty + dirY * 2 * s);
    dc.bezierCurveTo(
      tx - 26 * s,
      ty + dirY * 4 * s,
      tx - 48 * s,
      ty + dirY * 34 * s,
      tx - 16 * s,
      ty + dirY * 36 * s
    );
    dc.bezierCurveTo(
      tx - 2 * s,
      ty + dirY * 36 * s,
      tx - 6 * s,
      ty + dirY * 18 * s,
      tx - 18 * s,
      ty + dirY * 21 * s
    );
    dc.strokeStyle = INK;
    dc.lineWidth = 11 * s;
    dc.stroke();
    dc.strokeStyle = dirY < 0 ? MAYA_BLUE : CINNABAR;
    dc.lineWidth = 5.5 * s;
    dc.stroke();
  }
  // Tail collar medallion
  dc.beginPath();
  dc.arc(tx - 4 * s, ty, 8.5 * s, 0, Math.PI * 2);
  dc.fillStyle = OCHRE_GOLD;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = inkW;
  dc.stroke();

  // Pelican Body with codex contour plumage arcs
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
  dc.fillStyle = CREAM;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = inkW;
  dc.stroke();

  // Subtle codex scalloped plumage lines safely inside body contour
  dc.strokeStyle = "rgba(40, 124, 140, 0.55)";
  dc.lineWidth = 2.4 * s;
  for (const off of [-20, -6, 8]) {
    dc.beginPath();
    dc.arc(pose.bodyCenter.x + off * s, pose.bodyCenter.y - 2 * s, 14 * s, -0.35, Math.PI * 0.65);
    dc.stroke();
  }

  // S-Curve Neck
  dc.beginPath();
  pose.neckCurve.forEach((pt, idx) => {
    if (idx === 0) dc.moveTo(pt.x, pt.y);
    else dc.lineTo(pt.x, pt.y);
  });
  dc.strokeStyle = INK;
  dc.lineWidth = 25 * s;
  dc.stroke();
  dc.strokeStyle = CREAM;
  dc.lineWidth = 17.5 * s;
  dc.stroke();

  // Head + Maya Plumed Crest
  dc.beginPath();
  dc.moveTo(pose.crest1.x, pose.crest1.y);
  dc.lineTo(pose.head.x - 6 * s, pose.head.y - 16 * s);
  dc.lineTo(pose.crest2.x - 4 * s, pose.crest2.y - 8 * s);
  dc.lineTo(pose.head.x + 8 * s, pose.head.y - 17 * s);
  dc.closePath();
  dc.fillStyle = MAYA_BLUE;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = inkW;
  dc.stroke();

  dc.beginPath();
  dc.arc(pose.head.x, pose.head.y, 18.5 * s, 0, Math.PI * 2);
  dc.fillStyle = CREAM;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = inkW;
  dc.stroke();

  // Large Throat Pouch with Maya Blue & Cinnabar Geometric Motifs ("大喉囊涂玛雅蓝与朱红几何纹饰")
  const buildPouchPath = () => {
    dc.beginPath();
    dc.moveTo(pose.pouchBase.x, pose.pouchBase.y);
    dc.bezierCurveTo(
      pose.pouchMid.x - 16 * s,
      pose.pouchMid.y + 14 * s,
      pose.pouchMid.x + 34 * s,
      pose.pouchMid.y + 8 * s,
      pose.beakTip.x - 4 * s,
      pose.beakTip.y + 4 * s
    );
    dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 12 * s);
    dc.closePath();
  };

  buildPouchPath();
  dc.fillStyle = MAYA_BLUE;
  dc.fill();

  dc.save();
  dc.clip();
  dc.fillStyle = CINNABAR_BRIGHT;
  const pLeft = pose.pouchBase.x - 4 * s;
  const pRight = pose.beakTip.x;
  const pTop = pose.beakBaseTop.y + 8 * s;
  const pBot = pose.pouchMid.y + 20 * s;

  dc.beginPath();
  dc.moveTo(pLeft, pTop + 14 * s);
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const sx = lerp(pLeft, pRight, i / steps);
    const sy = i % 2 === 0 ? pTop + 6 * s : pBot - 16 * s;
    dc.lineTo(sx, sy);
  }
  dc.lineTo(pRight, pBot);
  dc.lineTo(pLeft, pBot);
  dc.closePath();
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.4 * s;
  dc.stroke();

  for (const frac of [0.24, 0.48, 0.72]) {
    const gx = lerp(pose.pouchBase.x + 8 * s, pose.beakTip.x - 16 * s, frac);
    const gy = lerp(pose.pouchBase.y + 12 * s, pose.pouchMid.y - 2 * s, Math.sin(frac * Math.PI));
    dc.beginPath();
    dc.arc(gx, gy, 5.2 * s, 0, Math.PI * 2);
    dc.fillStyle = CREAM;
    dc.fill();
    dc.strokeStyle = INK;
    dc.lineWidth = 2 * s;
    dc.stroke();
  }
  dc.restore();

  buildPouchPath();
  dc.strokeStyle = INK;
  dc.lineWidth = inkW;
  dc.stroke();

  // Upper Mandible + Hook
  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
  dc.lineTo(pose.beakTip.x, pose.beakTip.y);
  dc.lineTo(pose.beakHook.x, pose.beakHook.y);
  dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  dc.closePath();
  dc.fillStyle = OCHRE_GOLD;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = inkW;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x + 4 * s, pose.beakBaseTop.y + 4 * s);
  dc.lineTo(pose.beakTip.x - 12 * s, pose.beakTip.y + 3 * s);
  dc.strokeStyle = CINNABAR;
  dc.lineWidth = 3 * s;
  dc.stroke();

  // Exaggerated Square-Round Maya Bird Eye + Turquoise Ear Ornament ("夸张方圆眼配绿松石耳饰")
  drawRoundedRectPath(
    dc,
    pose.eye.x - 8.5 * s,
    pose.eye.y - 7.5 * s,
    17 * s,
    15 * s,
    4.5 * s
  );
  dc.fillStyle = "#ffffff";
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 3.2 * s;
  dc.stroke();

  dc.fillStyle = CINNABAR_BRIGHT;
  dc.fillRect(pose.eye.x - 6 * s, pose.eye.y - 5.5 * s, 12 * s, 3.2 * s);
  drawRoundedRectPath(dc, pose.eye.x - 2 * s, pose.eye.y - 2.5 * s, 7 * s, 7 * s, 2 * s);
  dc.fillStyle = INK;
  dc.fill();
  dc.beginPath();
  dc.arc(pose.eye.x + 2.5 * s, pose.eye.y - 0.5 * s, 1.5 * s, 0, Math.PI * 2);
  dc.fillStyle = "#ffffff";
  dc.fill();

  const earX = pose.head.x - 11 * s;
  const earY = pose.head.y + 7 * s;
  dc.beginPath();
  dc.arc(earX, earY, 7.5 * s, 0, Math.PI * 2);
  dc.fillStyle = MAYA_TURQ;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2.6 * s;
  dc.stroke();

  dc.beginPath();
  dc.arc(earX, earY, 3 * s, 0, Math.PI * 2);
  dc.fillStyle = CREAM;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 1.6 * s;
  dc.stroke();

  dc.beginPath();
  dc.arc(earX, earY + 9.5 * s, 2.8 * s, 0, Math.PI * 2);
  dc.fillStyle = CINNABAR_BRIGHT;
  dc.fill();
  dc.stroke();

  // Codex Wing
  const buildWingPath = () => {
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

  buildWingPath();
  dc.fillStyle = MAYA_BLUE;
  dc.fill();
  dc.save();
  dc.clip();
  dc.strokeStyle = CREAM;
  dc.lineWidth = 3.2 * s;
  for (let i = 0; i < 3; i++) {
    const f = 0.25 + i * 0.24;
    const fx = lerp(pose.shoulder.x, pose.barGrip.x, f);
    const fy = lerp(pose.shoulder.y, pose.barGrip.y, f);
    dc.beginPath();
    dc.arc(fx, fy, 12 * s, -0.5, Math.PI * 0.9);
    dc.stroke();
  }
  dc.fillStyle = CINNABAR;
  dc.fillRect(pose.shoulder.x - 12 * s, pose.shoulder.y - 10 * s, 22 * s, 16 * s);
  dc.restore();

  buildWingPath();
  dc.strokeStyle = INK;
  dc.lineWidth = inkW;
  dc.stroke();

  // Front Leg, Crank & Pedals
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.strokeStyle = INK;
  dc.lineWidth = 13.5 * s;
  dc.stroke();
  dc.strokeStyle = "#d97a29";
  dc.lineWidth = 7 * s;
  dc.stroke();

  dc.beginPath();
  dc.arc(pose.rightPedal.x, pose.rightPedal.y - 5 * s, 4.5 * s, 0, Math.PI * 2);
  dc.fillStyle = MAYA_TURQ;
  dc.fill();
  dc.strokeStyle = INK;
  dc.lineWidth = 2 * s;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.strokeStyle = INK;
  dc.lineWidth = 7 * s;
  dc.stroke();
  dc.strokeStyle = STONE_LIGHT;
  dc.lineWidth = 3.2 * s;
  dc.stroke();

  for (const pd of [pose.leftPedal, pose.rightPedal]) {
    drawRoundedRectPath(dc, pd.x - 9 * s, pd.y - 3.5 * s, 18 * s, 7 * s, 2.5 * s);
    dc.fillStyle = STONE_DARK;
    dc.fill();
    dc.strokeStyle = INK;
    dc.lineWidth = 2.2 * s;
    dc.stroke();
  }

  dc.restore();
}

export default function render(ctx) {
  const { p, brush, g, kit, t, localTime } = ctx;
  const u = localTime;

  const codexBackdrop = kit.bakeLayer("s07_maya_codex_v3", 1840, 1000, bakeMayaCodexBackdrop);

  p.push();
  p.imageMode(p.CENTER);
  p.image(codexBackdrop, 500, 500, 1840, 1000);
  p.pop();

  brush.set("charcoal", INK, 2.0);
  brush.line(BLEED_LEFT, ROAD_Y, BLEED_RIGHT, ROAD_Y);
  brush.set("crayon", CINNABAR, 1.3);
  brush.line(BLEED_LEFT, ROAD_Y + 19, BLEED_RIGHT, ROAD_Y + 19);

  g.push();

  drawPedalCounterPanel(g, u);
  drawMayaScribe(g, 700, REGISTER_Y, u);

  const px = getScenePelicanX(u);
  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
  drawMayaRig(g, pose, u);

  drawEraTitleCard(g, META, u);

  g.pop();
}
