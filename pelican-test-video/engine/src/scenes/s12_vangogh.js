/**
 * Scene #12 — 梵高《星月夜》 · The Starry Night (1889), t in [71.0, 77.0).
 * Post-Impressionist Vincent van Gogh thick impasto oil brushstrokes:
 * - Pre-baked deep cobalt / ultramarine night sky canvas & dense directional oil-paint currents
 * - Pre-baked rolling Alpilles mountains, Saint-Rémy cottages with warm lit windows & church spire
 * - Pre-baked flame-like dark emerald & bronze cypress trees framing left foreground & olive tree right
 * - Pre-baked purple-blue & yellow-ochre impasto cobblestone road aligned strictly at ROAD_Y = 730
 * - Independently rotatable impasto double-spiral nebula tiles, 11 multi-halo stars & crescent moon halo
 * - Bar 2 (u in [2.0, 4.0)) signature gag: the entire starry sky locks 1:1 onto the bicycle's
 *   front-wheel rotation angle `pose.wheelRot`, amplifying with flowing chrome-yellow & cerulean
 *   impasto streamlines so every pedal turn spins the cosmos in tandem with the wheels!
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  CROSS_SPEED,
  ROAD_Y,
  clamp,
  getScenePelicanX,
  lerp,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[11];

const EXT_LEFT = BLEED_LEFT - 24;
const EXT_RIGHT = BLEED_RIGHT + 24;
const EXT_W = EXT_RIGHT - EXT_LEFT;

const SWIRL_A = { x: 486, y: 258 };
const SWIRL_B = { x: 676, y: 298 };
const MOON_POS = { x: 912, y: 148 };

// 11 multi-halo stars positioned cleanly outside the Title Card ([34..396] x [32..124])
const STARS = [
  { x: -292, y: 134, s: 0.78, phase: 0.4, kind: "bright" },
  { x: -58, y: 168, s: 0.72, phase: 1.7, kind: "bright" },
  { x: 214, y: 274, s: 1.08, phase: 0.0, kind: "venus" },
  { x: 316, y: 192, s: 0.68, phase: 2.3, kind: "bright" },
  { x: 448, y: 92, s: 0.74, phase: 3.1, kind: "bright" },
  { x: 602, y: 132, s: 0.82, phase: 1.1, kind: "bright" },
  { x: 752, y: 94, s: 0.76, phase: 4.2, kind: "bright" },
  { x: 794, y: 238, s: 0.66, phase: 2.8, kind: "bright" },
  { x: 1004, y: 274, s: 0.80, phase: 0.9, kind: "bright" },
  { x: 1138, y: 142, s: 0.88, phase: 3.7, kind: "bright" },
  { x: 1286, y: 248, s: 0.74, phase: 5.0, kind: "bright" },
];

const WHEEL_RADIUS = 62;
const WHEEL_OMEGA = CROSS_SPEED / WHEEL_RADIUS;

function posMod(v, m) {
  return ((v % m) + m) % m;
}

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Analytical integral of lerp(r0, r1, smoothstep(a, b, s)) from a to x.
 * Ensures C1-continuous, strictly forward sky rotation before/during/after Bar 2.
 */
function integralRate(a, b, r0, r1, x) {
  const dr = r1 - r0;
  const span = b - a;
  if (x <= a) return r0 * (x - a);
  if (x >= b) return r0 * span + dr * 0.5 * span + r1 * (x - b);
  const t = (x - a) / span;
  const smoothIntegral = t * t * t * (1 - 0.5 * t);
  return r0 * (x - a) + dr * span * smoothIntegral;
}

/**
 * Computes sky rotation angle: gentle drift before Bar 2, exact 1:1 phase lock to `pose.wheelRot`
 * on u in [2.0, 4.0), and smooth forward coasting afterward (safe for negative u < 0 and u >= 6).
 */
function getSkyRotation(u, wheelRot) {
  const wheelAt2 = (BLEED_LEFT + CROSS_SPEED * 2.0) / WHEEL_RADIUS;
  const wheelAt4 = (BLEED_LEFT + CROSS_SPEED * 4.0) / WHEEL_RADIUS;
  if (u < 2.0) {
    const totalIn = integralRate(1.75, 2.0, 0.18, 1.0, 2.0);
    const curIn = integralRate(1.75, 2.0, 0.18, 1.0, u);
    return wheelAt2 - WHEEL_OMEGA * (totalIn - curIn);
  }
  if (u <= 4.0) {
    return wheelRot;
  }
  return wheelAt4 + WHEEL_OMEGA * integralRate(4.0, 4.38, 1.0, 0.22, u);
}

/**
 * Paints one thick directional impasto oil-paint dab onto Canvas2D.
 */
function paintDab(dc, x, y, len, thick, angle, color, shadowColor = null, bend = 0) {
  const half = len * 0.5;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const nx = -sa;
  const ny = ca;
  const x0 = x - ca * half;
  const y0 = y - sa * half;
  const x1 = x + ca * half;
  const y1 = y + sa * half;
  const cx = x + nx * bend;
  const cy = y + ny * bend;

  dc.lineCap = "round";
  if (shadowColor) {
    dc.strokeStyle = shadowColor;
    dc.lineWidth = Math.max(0.8, thick * 1.15);
    dc.beginPath();
    dc.moveTo(x0 + 1.1, y0 + 1.5);
    dc.quadraticCurveTo(cx + 1.1, cy + 1.5, x1 + 1.1, y1 + 1.5);
    dc.stroke();
  }
  dc.strokeStyle = color;
  dc.lineWidth = Math.max(0.6, thick);
  dc.beginPath();
  dc.moveTo(x0, y0);
  dc.quadraticCurveTo(cx, cy, x1, y1);
  dc.stroke();
}

/**
 * Paints a curved impasto brushstroke arc along a circle of radius `r` centered at `(cx, cy)`.
 */
function paintArcDab(dc, cx, cy, r, a0, a1, thick, color, shadowColor = null) {
  const safeR = Math.max(0.5, r);
  dc.lineCap = "round";
  if (shadowColor) {
    dc.strokeStyle = shadowColor;
    dc.lineWidth = Math.max(0.8, thick * 1.18);
    dc.beginPath();
    dc.arc(cx + 1.1, cy + 1.5, safeR, a0, a1);
    dc.stroke();
  }
  dc.strokeStyle = color;
  dc.lineWidth = Math.max(0.6, thick);
  dc.beginPath();
  dc.arc(cx, cy, safeR, a0, a1);
  dc.stroke();
}

/**
 * Computes the Alpilles mountain ridge height at world x.
 */
function getMountainY(x) {
  return (
    510 -
    Math.sin((x + 120) * 0.0052) * 40 -
    Math.sin(x * 0.0115 + 0.8) * 23 -
    Math.cos(x * 0.023 - 0.5) * 11
  );
}

/**
 * Computes sky current flow angle at (x, y) around the double spiral, moon, and cypress.
 */
function getSkyFlowAngle(x, y) {
  const dxA = x - SWIRL_A.x;
  const dyA = y - SWIRL_A.y;
  const dA = Math.hypot(dxA, dyA);

  const dxB = x - SWIRL_B.x;
  const dyB = y - SWIRL_B.y;
  const dB = Math.hypot(dxB, dyB);

  const dxM = x - MOON_POS.x;
  const dyM = y - MOON_POS.y;
  const dM = Math.hypot(dxM, dyM);

  // Sweeping S-wave flow across the sky
  let vx = 1.0;
  let vy = Math.cos(x * 0.0062) * 0.36 + Math.sin(y * 0.014) * 0.14;

  // Upward flame draft near left cypress
  const cDist = Math.abs(x + 175);
  if (cDist < 190) {
    const w = 1 - cDist / 190;
    vx += w * 0.45;
    vy -= w * 0.95;
  }

  // Vortex pull around Swirl A (wider reach for seamless blend into sky)
  if (dA < 310) {
    const w = Math.pow(1 - dA / 310, 1.3) * 3.0;
    const tx = -dyA / (dA + 8);
    const ty = dxA / (dA + 8);
    vx += tx * w;
    vy += ty * w;
  }

  // Counter-vortex pull around Swirl B forming interlocking S-wave
  if (dB < 250) {
    const w = Math.pow(1 - dB / 250, 1.3) * 2.7;
    const tx = dyB / (dB + 8);
    const ty = -dxB / (dB + 8);
    vx += tx * w;
    vy += ty * w;
  }

  // Circular aura around crescent moon
  if (dM < 220) {
    const w = Math.pow(1 - dM / 220, 1.35) * 2.2;
    const tx = -dyM / (dM + 8);
    const ty = dxM / (dM + 8);
    vx += tx * w;
    vy += ty * w;
  }

  return Math.atan2(vy, vx);
}

/**
 * Draws a Saint-Rémy village cottage with impasto masonry, pitched roof, and glowing yellow windows.
 */
function drawVillageCottage(dc, x, y, w, h, roofCol, wallCol, windows, hasChimney = false) {
  const roofH = Math.round(h * 0.48);

  dc.fillStyle = wallCol;
  dc.strokeStyle = "#0b142c";
  dc.lineWidth = 3.0;
  dc.lineJoin = "round";
  dc.fillRect(x - w * 0.5, y - h, w, h);
  dc.strokeRect(x - w * 0.5, y - h, w, h);

  // Masonry & plaster impasto dabs
  paintDab(dc, x - w * 0.2, y - h * 0.45, w * 0.36, 5.2, 0.08, "rgba(86, 122, 184, 0.55)");
  paintDab(dc, x + w * 0.16, y - h * 0.65, w * 0.28, 4.5, -0.05, "rgba(21, 35, 72, 0.55)");
  paintDab(dc, x, y - h * 0.22, w * 0.44, 4.2, 0.02, "rgba(136, 168, 218, 0.28)");

  if (hasChimney) {
    dc.fillStyle = "#17254a";
    dc.fillRect(x + w * 0.16, y - h - roofH * 0.92, 9, 18);
    dc.strokeRect(x + w * 0.16, y - h - roofH * 0.92, 9, 18);
    paintDab(dc, x + w * 0.22, y - h - roofH - 12, 12, 5, -1.1, "rgba(122, 160, 214, 0.45)");
    paintDab(dc, x + w * 0.29, y - h - roofH - 22, 14, 4.5, -0.8, "rgba(154, 188, 230, 0.35)");
  }

  dc.beginPath();
  dc.moveTo(x - w * 0.58, y - h + 2);
  dc.lineTo(x, y - h - roofH);
  dc.lineTo(x + w * 0.58, y - h + 2);
  dc.closePath();
  dc.fillStyle = roofCol;
  dc.fill();
  dc.strokeStyle = "#0b142c";
  dc.lineWidth = 3.0;
  dc.stroke();

  paintDab(dc, x + w * 0.14, y - h - roofH * 0.45, w * 0.36, 4.4, 0.68, "rgba(136, 178, 226, 0.52)");
  paintDab(dc, x - w * 0.16, y - h - roofH * 0.42, w * 0.3, 4.2, -0.68, "rgba(24, 44, 88, 0.65)");

  // Warm illuminated windows with golden halo
  for (const [wx, wy, ww, wh] of windows) {
    const gx = x + wx;
    const gy = y + wy;
    const glowR = Math.max(10, ww * 2.1);
    const glow = dc.createRadialGradient(gx, gy, 1, gx, gy, glowR);
    glow.addColorStop(0, "rgba(255, 224, 92, 0.5)");
    glow.addColorStop(1, "rgba(255, 180, 48, 0)");
    dc.fillStyle = glow;
    dc.beginPath();
    dc.arc(gx, gy, glowR, 0, Math.PI * 2);
    dc.fill();

    dc.fillStyle = "#ffe056";
    dc.strokeStyle = "#0f1938";
    dc.lineWidth = 1.8;
    dc.fillRect(gx - ww * 0.5, gy - wh * 0.5, ww, wh);
    dc.strokeRect(gx - ww * 0.5, gy - wh * 0.5, ww, wh);
  }
}

/**
 * Draws the iconic Saint-Rémy church with soaring pointed spire cutting across the mountain ridge.
 */
function drawChurchSpire(dc, x, baseY) {
  dc.save();

  dc.fillStyle = "#1c2d58";
  dc.strokeStyle = "#0a1228";
  dc.lineWidth = 3.4;
  dc.lineJoin = "round";
  dc.fillRect(x - 42, baseY - 56, 84, 56);
  dc.strokeRect(x - 42, baseY - 56, 84, 56);

  dc.beginPath();
  dc.moveTo(x - 46, baseY - 54);
  dc.lineTo(x - 16, baseY - 82);
  dc.lineTo(x + 44, baseY - 82);
  dc.lineTo(x + 46, baseY - 54);
  dc.closePath();
  dc.fillStyle = "#132042";
  dc.fill();
  dc.stroke();

  dc.fillStyle = "#223668";
  dc.fillRect(x - 17, baseY - 142, 34, 142);
  dc.strokeRect(x - 17, baseY - 142, 34, 142);

  paintDab(dc, x - 6, baseY - 96, 24, 5, Math.PI * 0.5, "#3a5794");
  paintDab(dc, x + 7, baseY - 68, 22, 5, Math.PI * 0.5, "#15254d");
  paintDab(dc, x + 24, baseY - 28, 28, 6, 0.05, "#2f4a82");

  // Tall pointed steeple piercing upward to y ~ 436
  dc.beginPath();
  dc.moveTo(x - 21, baseY - 142);
  dc.lineTo(x, baseY - 252);
  dc.lineTo(x + 21, baseY - 142);
  dc.closePath();
  dc.fillStyle = "#142246";
  dc.fill();
  dc.stroke();

  paintDab(dc, x + 6, baseY - 190, 48, 4.2, 1.44, "#628ecc");
  dc.strokeStyle = "#628ecc";
  dc.lineWidth = 2.4;
  dc.beginPath();
  dc.moveTo(x, baseY - 252);
  dc.lineTo(x, baseY - 266);
  dc.moveTo(x - 5, baseY - 260);
  dc.lineTo(x + 5, baseY - 260);
  dc.stroke();

  for (const [wx, wy, ww, wh] of [
    [0, -112, 8, 20],
    [0, -68, 8, 16],
    [-28, -28, 7, 14],
    [28, -28, 7, 14],
  ]) {
    const gx = x + wx;
    const gy = baseY + wy;
    const glow = dc.createRadialGradient(gx, gy, 1, gx, gy, 18);
    glow.addColorStop(0, "rgba(255, 220, 88, 0.5)");
    glow.addColorStop(1, "rgba(255, 178, 46, 0)");
    dc.fillStyle = glow;
    dc.beginPath();
    dc.arc(gx, gy, 18, 0, Math.PI * 2);
    dc.fill();

    dc.fillStyle = "#ffdf5e";
    dc.strokeStyle = "#0a1228";
    dc.lineWidth = 1.8;
    dc.beginPath();
    dc.roundRect(gx - ww * 0.5, gy - wh * 0.5, ww, wh, [ww * 0.5, ww * 0.5, 1, 1]);
    dc.fill();
    dc.stroke();
  }

  dc.restore();
}

/**
 * Bakes the static 1840x1000 Starry Night canvas, dense swirling sky currents, Alpilles mountains,
 * Saint-Rémy village, and cobblestone country road aligned strictly at ROAD_Y = 730.
 */
function bakeStarryBackdrop(pg) {
  const dc = pg.drawingContext;
  const rand = prng(188906);

  pg.push();
  pg.translate(-BLEED_LEFT, 0);

  // 1. Deep nocturnal Prussian-blue ground + subtle organic canvas weave
  const skyGrad = dc.createLinearGradient(0, 0, 0, 620);
  skyGrad.addColorStop(0, "#081333");
  skyGrad.addColorStop(0.45, "#11275c");
  skyGrad.addColorStop(0.85, "#1d3f80");
  skyGrad.addColorStop(1, "#2a5699");
  dc.fillStyle = skyGrad;
  dc.fillRect(EXT_LEFT, 0, EXT_W, 1000);

  // Subtle organic canvas weave (broken short threads, no graph-paper grid)
  dc.strokeStyle = "rgba(220, 206, 174, 0.025)";
  dc.lineWidth = 1.1;
  for (let i = 0; i < 900; i++) {
    const cx = EXT_LEFT + rand() * EXT_W;
    const cy = rand() * 1000;
    const horiz = rand() > 0.5;
    dc.beginPath();
    dc.moveTo(cx, cy);
    dc.lineTo(cx + (horiz ? 18 + rand() * 32 : 0), cy + (horiz ? 0 : 18 + rand() * 32));
    dc.stroke();
  }

  // 2. Soft pre-glow pools behind central swirls, moon, and Venus
  const addSkyGlow = (gx, gy, r, col0, col1) => {
    const safeR = Math.max(1, r);
    const grad = dc.createRadialGradient(gx, gy, 6, gx, gy, safeR);
    grad.addColorStop(0, col0);
    grad.addColorStop(1, col1);
    dc.fillStyle = grad;
    dc.beginPath();
    dc.arc(gx, gy, safeR, 0, Math.PI * 2);
    dc.fill();
  };
  addSkyGlow(SWIRL_A.x, SWIRL_A.y, 290, "rgba(74, 138, 218, 0.36)", "rgba(18, 42, 98, 0)");
  addSkyGlow(SWIRL_B.x, SWIRL_B.y, 230, "rgba(88, 152, 224, 0.32)", "rgba(18, 42, 98, 0)");
  addSkyGlow(MOON_POS.x, MOON_POS.y, 240, "rgba(246, 198, 72, 0.28)", "rgba(18, 42, 98, 0)");
  addSkyGlow(214, 274, 145, "rgba(246, 214, 108, 0.24)", "rgba(18, 42, 98, 0)");

  // 3. Dense overlapping impasto sky currents (5200 strokes so no bare dark bands remain!)
  const skyColors = [
    "#0f214f",
    "#152f6e",
    "#1d3f8a",
    "#2854a4",
    "#376dc0",
    "#4e87d4",
    "#73aae3",
    "#1b3978",
  ];
  for (let i = 0; i < 5200; i++) {
    const sx = EXT_LEFT + rand() * EXT_W;
    const sy = rand() * 575;
    if (sy > getMountainY(sx) + 12) continue;

    const inTitleZone = sx > 20 && sx < 412 && sy > 18 && sy < 138;
    const angle = getSkyFlowAngle(sx, sy) + (rand() - 0.5) * 0.13;
    const len = 18 + rand() * 22;
    const thick = 4.6 + rand() * 4.6;
    const bend = (rand() - 0.5) * 5.0;

    let col;
    if (inTitleZone) {
      col = rand() < 0.65 ? "#0d1c44" : "#152d68";
    } else {
      const horizonBoost = clamp((sy - 240) / 280, 0, 1);
      const nearSwirl =
        Math.hypot(sx - SWIRL_A.x, sy - SWIRL_A.y) < 270 ||
        Math.hypot(sx - SWIRL_B.x, sy - SWIRL_B.y) < 220;
      const pick = rand();
      if (nearSwirl && pick > 0.68) {
        col = pick > 0.87 ? "#aed5f6" : "#6ca4df";
      } else if (horizonBoost > 0.55 && pick > 0.62) {
        col = pick > 0.84 ? "#80b6ea" : "#447bc9";
      } else {
        col = skyColors[Math.floor(rand() * skyColors.length)];
      }
    }
    paintDab(dc, sx, sy, len, thick, angle, col, "rgba(7, 14, 38, 0.36)", bend);
  }

  // Luminous pale-blue & cream horizon wave band right above the Alpilles ridge
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 14) {
    const my = getMountainY(x);
    const slope = (getMountainY(x + 12) - getMountainY(x - 12)) / 24;
    const ang = Math.atan(slope);
    paintDab(
      dc,
      x + (rand() - 0.5) * 6,
      my - 11 - rand() * 14,
      26 + rand() * 14,
      6.0,
      ang,
      rand() > 0.38 ? "#7eb6ea" : "#c2e0f7",
      null,
      (rand() - 0.5) * 4
    );
  }

  // 4. Rolling Alpilles Mountain Ridge
  dc.save();
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 680);
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 16) {
    dc.lineTo(x, getMountainY(x));
  }
  dc.lineTo(EXT_RIGHT, 680);
  dc.closePath();
  const mtnGrad = dc.createLinearGradient(0, 450, 0, 670);
  mtnGrad.addColorStop(0, "#1d3f7d");
  mtnGrad.addColorStop(0.45, "#142c5c");
  mtnGrad.addColorStop(1, "#0b1a3c");
  dc.fillStyle = mtnGrad;
  dc.fill();

  dc.clip();
  const mtnColors = ["#0d1e47", "#16326b", "#1e4285", "#2b569c", "#3f70b5", "#112552"];
  for (let i = 0; i < 1600; i++) {
    const mx = EXT_LEFT + rand() * EXT_W;
    const topY = getMountainY(mx);
    const my = topY + rand() * (655 - topY);
    const slope = (getMountainY(mx + 14) - getMountainY(mx - 14)) / 28;
    const ang = Math.atan(slope) + (rand() - 0.5) * 0.28;
    const isCrest = my - topY < 26;
    const col = isCrest && rand() > 0.32 ? "#5c8ed1" : mtnColors[Math.floor(rand() * mtnColors.length)];
    paintDab(dc, mx, my, 20 + rand() * 20, 5.4 + rand() * 4.2, ang, col, "rgba(7, 13, 32, 0.45)", (rand() - 0.5) * 4);
  }
  dc.restore();

  dc.strokeStyle = "#091330";
  dc.lineWidth = 3.5;
  dc.beginPath();
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 14) {
    const my = getMountainY(x);
    if (x === EXT_LEFT) dc.moveTo(x, my);
    else dc.lineTo(x, my);
  }
  dc.stroke();

  // 5. Valley Floor & Swirling Impasto Olive Groves (y ~ 570..706, no uniform geometric semicircles!)
  const valleyGrad = dc.createLinearGradient(0, 585, 0, 706);
  valleyGrad.addColorStop(0, "#102446");
  valleyGrad.addColorStop(0.5, "#152b4f");
  valleyGrad.addColorStop(1, "#1b3358");
  dc.fillStyle = valleyGrad;
  dc.fillRect(EXT_LEFT, 585, EXT_W, 122);

  // Rolling painterly valley ridges & olive tree clusters
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 32) {
    const baseY = 612 + Math.sin(x * 0.013) * 14 + Math.cos(x * 0.029) * 8;
    const rx = 24 + rand() * 16;
    const ry = 18 + rand() * 12;
    for (let k = 0; k < 14; k++) {
      const a = Math.PI + rand() * Math.PI;
      const rr = 0.25 + rand() * 0.85;
      const ox = x + Math.cos(a) * rx * rr;
      const oy = baseY + Math.sin(a) * ry * rr;
      const col = rand() > 0.55 ? "#28543d" : rand() > 0.3 ? "#1a3c2f" : "#122a24";
      paintDab(dc, ox, oy, 15 + rand() * 10, 6.2 + rand() * 3, a + Math.PI * 0.5, col, "#071116", 2.5);
    }
  }
  // Textured dark cobalt/teal valley brushwork between foothills and village houses
  for (let i = 0; i < 650; i++) {
    const vx = EXT_LEFT + rand() * EXT_W;
    const vy = 618 + rand() * 82;
    const col = rand() > 0.65 ? "#244374" : rand() > 0.3 ? "#172d58" : "#14302a";
    paintDab(dc, vx, vy, 16 + rand() * 16, 4.8 + rand() * 3.2, (rand() - 0.5) * 0.25, col, "rgba(6, 12, 28, 0.35)");
  }

  // 6. Saint-Rémy Village Cottages & Tall Pointed Church Steeple
  const cottages = [
    [-355, 688, 64, 40, "#162448", "#273e72", [[-14, -18, 9, 10], [12, -18, 9, 10]], true],
    [-250, 690, 56, 34, "#1a2a54", "#2e4880", [[0, -16, 10, 11]], false],
    [118, 690, 68, 42, "#152345", "#294178", [[-16, -20, 9, 11], [14, -20, 9, 11]], true],
    [222, 685, 56, 35, "#1b2e5a", "#324c85", [[-10, -16, 8, 10], [12, -16, 8, 10]], false],
    [318, 692, 76, 44, "#142246", "#284074", [[-18, -20, 10, 12], [4, -20, 10, 12], [22, -18, 8, 10]], true],
    [438, 687, 58, 34, "#192a54", "#2c457d", [[-11, -17, 9, 10], [12, -17, 9, 10]], false],
    [548, 690, 66, 38, "#16254a", "#2a4378", [[-14, -18, 9, 11], [14, -18, 9, 11]], true],
    [646, 688, 56, 34, "#1b2d58", "#314b84", [[0, -17, 10, 11]], false],
    [852, 690, 68, 41, "#152447", "#2c467e", [[-16, -20, 10, 11], [14, -20, 10, 11]], true],
    [955, 687, 58, 35, "#192952", "#2e4880", [[-10, -17, 9, 10], [13, -17, 9, 10]], false],
    [1082, 691, 66, 38, "#162448", "#284074", [[-14, -18, 9, 11], [13, -18, 9, 11]], true],
    [1318, 689, 60, 36, "#1a2a54", "#2e4880", [[0, -17, 10, 11]], false],
  ];
  for (const [cx, cy, cw, ch, rCol, wCol, wins, chim] of cottages) {
    drawVillageCottage(dc, cx, cy, cw, ch, rCol, wCol, wins, chim);
  }
  drawChurchSpire(dc, 764, 689);

  // Foreground village hedgerow shrubs along y = 690..704
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 24) {
    const sy = 696 + (rand() - 0.5) * 6;
    paintDab(dc, x, sy, 22 + rand() * 12, 9, (rand() - 0.5) * 0.4, rand() > 0.5 ? "#122b24" : "#1b3d2f", "#081414");
  }

  // 7. Roadside Stone Wall (y = 698..708) & Purple-Blue / Yellow-Ochre Cobblestone Road (ROAD_Y = 730)
  dc.fillStyle = "#1d2a4d";
  dc.fillRect(EXT_LEFT, 698, EXT_W, 12);
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 22) {
    paintDab(
      dc,
      x + (rand() - 0.5) * 5,
      703,
      18,
      7.5,
      (rand() - 0.5) * 0.14,
      rand() > 0.35 ? "#384c82" : "#8f7c46",
      "#0b132b"
    );
  }

  const roadGrad = dc.createLinearGradient(0, 708, 0, 856);
  roadGrad.addColorStop(0, "#243563");
  roadGrad.addColorStop(0.18, "#314478");
  roadGrad.addColorStop(0.45, "#425387");
  roadGrad.addColorStop(0.75, "#324273");
  roadGrad.addColorStop(1, "#1e2c54");
  dc.fillStyle = roadGrad;
  dc.fillRect(EXT_LEFT, 708, EXT_W, 148);

  dc.fillStyle = "rgba(214, 172, 78, 0.24)";
  dc.fillRect(EXT_LEFT, ROAD_Y - 8, EXT_W, 24);

  const roadCols = [
    "#28396b",
    "#36487d",
    "#4c5c94",
    "#6373ad",
    "#9c7d38",
    "#c49c45",
    "#deb95b",
    "#202f5c",
  ];
  for (let i = 0; i < 1750; i++) {
    const rx = EXT_LEFT + rand() * EXT_W;
    const ry = 712 + rand() * 138;
    const nearTire = Math.abs(ry - ROAD_Y) < 16;
    const len = 14 + rand() * 18;
    const thick = 4.6 + rand() * 4.2;
    const ang = (rand() - 0.5) * 0.16;
    let col;
    if (nearTire && rand() < 0.56) {
      col = rand() > 0.38 ? "#c9a046" : "#e3c062";
    } else {
      col = roadCols[Math.floor(rand() * roadCols.length)];
    }
    paintDab(dc, rx, ry, len, thick, ang, col, "rgba(12, 18, 44, 0.56)", (rand() - 0.5) * 2.5);
  }

  dc.strokeStyle = "#0e1736";
  dc.lineWidth = 2.8;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 708);
  dc.lineTo(EXT_RIGHT, 708);
  dc.stroke();

  // 8. Foreground Swirling Meadow Grass & Wildflowers (y = 852..1000)
  const meadowGrad = dc.createLinearGradient(0, 850, 0, 1000);
  meadowGrad.addColorStop(0, "#112822");
  meadowGrad.addColorStop(0.5, "#0d201c");
  meadowGrad.addColorStop(1, "#081414");
  dc.fillStyle = meadowGrad;
  dc.fillRect(EXT_LEFT, 852, EXT_W, 150);

  for (let i = 0; i < 760; i++) {
    const gx = EXT_LEFT + rand() * EXT_W;
    const gy = 856 + rand() * 142;
    const ang = -0.35 + Math.sin(gx * 0.014) * 0.35 + (rand() - 0.5) * 0.35;
    const pick = rand();
    const col =
      pick > 0.88 ? "#b09942" : pick > 0.55 ? "#264e36" : pick > 0.25 ? "#19392a" : "#152b4f";
    paintDab(dc, gx, gy, 18 + rand() * 16, 4.8 + rand() * 3.5, ang, col, "rgba(6, 12, 16, 0.5)", (rand() - 0.5) * 5);
  }

  dc.restore();
}

/**
 * Bakes a rotatable impasto spiral nebula tile with asymmetric multi-arm cream/gold/cerulean strokes
 * whose outer strokes dissolve naturally into the surrounding sky stream field.
 */
function bakeSpiralTile(pg, opts) {
  const { size, arms, turns, maxR, palette, seed } = opts;
  const dc = pg.drawingContext;
  const rand = prng(seed);
  const cx = size * 0.5;
  const cy = size * 0.5;

  pg.clear();
  dc.save();
  dc.translate(cx, cy);

  const coreGlow = dc.createRadialGradient(0, 0, 4, 0, 0, Math.max(1, maxR * 0.96));
  coreGlow.addColorStop(0, "rgba(176, 218, 250, 0.4)");
  coreGlow.addColorStop(0.45, "rgba(66, 126, 210, 0.2)");
  coreGlow.addColorStop(1, "rgba(22, 54, 126, 0)");
  dc.fillStyle = coreGlow;
  dc.beginPath();
  dc.arc(0, 0, Math.max(1, maxR * 0.96), 0, Math.PI * 2);
  dc.fill();

  const totalSteps = 140;
  for (let arm = 0; arm < arms; arm++) {
    const armOffset = (arm / arms) * Math.PI * 2;
    for (let ring = 0; ring < 3; ring++) {
      const radialBias = (ring - 1) * 12;
      for (let i = 3; i < totalSteps; i++) {
        const frac = i / totalSteps;
        const r = frac * maxR + radialBias + (rand() - 0.5) * 6;
        if (r < 6 || r > maxR) continue;
        const edgeFade = 1 - smoothstep(0.68, 1.0, r / maxR);
        if (rand() > edgeFade * 0.94 + 0.06) continue;

        const theta = armOffset + frac * turns * Math.PI * 2;
        const px = Math.cos(theta) * r;
        const py = Math.sin(theta) * r;
        const tangent = theta + Math.PI * 0.43;

        const len = 15 + frac * 18 + rand() * 8;
        const thick = 4.6 + (1 - frac * 0.35) * 4.6;

        let col;
        if (ring === 1 && frac < 0.72) {
          col = rand() > 0.32 ? palette.highlight : palette.gold;
        } else if (ring === 0) {
          col = palette.mid;
        } else {
          col = rand() > 0.38 ? palette.pale : palette.deep;
        }

        dc.globalAlpha = clamp(0.4 + edgeFade * 0.6, 0.12, 1);
        paintDab(dc, px, py, len, thick, tangent, col, "rgba(9, 20, 52, 0.42)", 3.5);
      }
    }
  }

  dc.globalAlpha = 1;
  paintDab(dc, 0, 0, 20, 9.0, 0.4, palette.highlight);
  paintDab(dc, 3, -2, 15, 6.5, 2.0, palette.gold);

  dc.restore();
}

/**
 * Bakes an authentic Van Gogh multi-halo impasto star sprite:
 * packed concentric short oil-paint dabs with an organic swirling 5-petal corona (no rigid geometric wheel spokes!).
 */
function bakeStarTile(pg, size, isVenus, seed) {
  const dc = pg.drawingContext;
  const rand = prng(seed);
  const cx = size * 0.5;
  const cy = size * 0.5;
  const maxR = size * 0.46;

  pg.clear();
  dc.save();
  dc.translate(cx, cy);

  // Soft radiant aureole
  const halo = dc.createRadialGradient(0, 0, 2, 0, 0, Math.max(1, maxR));
  halo.addColorStop(0, "rgba(255, 248, 188, 0.85)");
  halo.addColorStop(0.32, "rgba(249, 208, 76, 0.46)");
  halo.addColorStop(0.68, "rgba(130, 178, 232, 0.2)");
  halo.addColorStop(1, "rgba(24, 52, 118, 0)");
  dc.fillStyle = halo;
  dc.beginPath();
  dc.arc(0, 0, Math.max(1, maxR), 0, Math.PI * 2);
  dc.fill();

  // Tightly packed concentric swirling impasto halo dabs (asymmetric 5-wave modulation so rotation reads organically!)
  const rings = isVenus
    ? [
        { r: maxR * 0.84, count: 38, len: 13, thick: 4.5, colA: "#6aa2de", colB: "#9ac6f0" },
        { r: maxR * 0.67, count: 32, len: 13, thick: 5.0, colA: "#c9d49a", colB: "#e8d66b" },
        { r: maxR * 0.50, count: 24, len: 12, thick: 5.6, colA: "#f6d854", colB: "#fae47a" },
        { r: maxR * 0.34, count: 18, len: 11, thick: 6.0, colA: "#fff099", colB: "#fce25d" },
      ]
    : [
        { r: maxR * 0.79, count: 24, len: 10, thick: 4.0, colA: "#72a8e0", colB: "#a2ccf2" },
        { r: maxR * 0.56, count: 18, len: 10, thick: 4.6, colA: "#ecd056", colB: "#f7de68" },
        { r: maxR * 0.34, count: 14, len: 9, thick: 5.0, colA: "#fff096", colB: "#fbd84d" },
      ];

  for (let rIdx = 0; rIdx < rings.length; rIdx++) {
    const ring = rings[rIdx];
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + rIdx * 0.25 + (rand() - 0.5) * 0.14;
      // 5-lobe gentle organic spiral ripple in radius & brightness makes rotation unmistakably alive
      const wave = Math.sin(a * 5 + rIdx * 0.5) * (maxR * 0.045);
      const rr = ring.r + wave + (rand() - 0.5) * 2.5;
      const col = Math.sin(a * 3 + rIdx) > 0 ? ring.colA : ring.colB;
      paintDab(
        dc,
        Math.cos(a) * rr,
        Math.sin(a) * rr,
        ring.len + Math.max(0, wave * 0.4),
        ring.thick,
        a + Math.PI * 0.46,
        col,
        "rgba(14, 30, 74, 0.24)",
        2.0
      );
    }
  }

  // Organic 5-petal swirling golden-cream inner burst (replaces straight spoke lines!)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const dist = maxR * 0.22;
    paintDab(
      dc,
      Math.cos(a) * dist,
      Math.sin(a) * dist,
      maxR * 0.24,
      isVenus ? 6.4 : 4.8,
      a + 0.35,
      "#fff7c4",
      "rgba(242, 168, 38, 0.4)",
      2.2
    );
  }

  // Incandescent cadmium-orange & cream-white star heart
  dc.fillStyle = "#f4ad2e";
  dc.beginPath();
  dc.arc(0, 0, Math.max(0.5, maxR * 0.20), 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = "#fff9d4";
  dc.beginPath();
  dc.arc(0, 0, Math.max(0.5, maxR * 0.12), 0, Math.PI * 2);
  dc.fill();

  dc.restore();
}

/**
 * Bakes the rotating multi-ring sunburst halo around the top-right crescent moon
 * using dense organic Van Gogh impasto rings (no geometric spiderweb spokes!).
 */
function bakeMoonHalo(pg) {
  const dc = pg.drawingContext;
  const rand = prng(18899);
  const cx = 145;
  const cy = 145;

  pg.clear();
  dc.save();
  dc.translate(cx, cy);

  const glow = dc.createRadialGradient(0, 0, 12, 0, 0, 140);
  glow.addColorStop(0, "rgba(255, 228, 102, 0.72)");
  glow.addColorStop(0.45, "rgba(245, 166, 40, 0.38)");
  glow.addColorStop(0.8, "rgba(128, 174, 224, 0.14)");
  glow.addColorStop(1, "rgba(18, 42, 98, 0)");
  dc.fillStyle = glow;
  dc.beginPath();
  dc.arc(0, 0, 140, 0, Math.PI * 2);
  dc.fill();

  const rings = [
    { r: 122, count: 40, len: 16, thick: 5.2, colA: "#7db0e3", colB: "#a9cef2" },
    { r: 101, count: 34, len: 16, thick: 5.8, colA: "#e88d22", colB: "#f4b434" },
    { r: 80, count: 28, len: 15, thick: 6.4, colA: "#f7c738", colB: "#ffe05e" },
    { r: 60, count: 22, len: 14, thick: 6.8, colA: "#ffe66b", colB: "#fff3a6" },
  ];
  for (let rIdx = 0; rIdx < rings.length; rIdx++) {
    const ring = rings[rIdx];
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + rIdx * 0.22 + (rand() - 0.5) * 0.12;
      const wave = Math.sin(a * 4 + rIdx) * 4.5;
      const rr = ring.r + wave + (rand() - 0.5) * 2.5;
      paintDab(
        dc,
        Math.cos(a) * rr,
        Math.sin(a) * rr,
        ring.len,
        ring.thick,
        a + Math.PI * 0.47,
        Math.cos(a * 3 + rIdx) > 0 ? ring.colA : ring.colB,
        "rgba(20, 36, 82, 0.22)",
        2.4
      );
    }
  }

  // Asymmetric glowing golden flare tufts orbiting inside the halo (clearly conveys spin!)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const dist = i % 2 === 0 ? 72 : 90;
    paintDab(
      dc,
      Math.cos(a) * dist,
      Math.sin(a) * dist,
      20,
      5.8,
      a + Math.PI * 0.4,
      i % 2 === 0 ? "#fff3a8" : "#ffa82e",
      null,
      3.0
    );
  }

  dc.restore();
}

/**
 * Bakes the crisp thick-impasto crescent moon core.
 */
function bakeMoonCore(pg) {
  const dc = pg.drawingContext;
  const cx = 85;
  const cy = 85;

  pg.clear();
  dc.save();
  dc.translate(cx, cy);

  const traceCrescent = () => {
    dc.beginPath();
    dc.arc(0, 0, 42, Math.PI * 0.35, Math.PI * 1.65, false);
    dc.bezierCurveTo(-18, -28, -22, 26, Math.cos(Math.PI * 0.35) * 42, Math.sin(Math.PI * 0.35) * 42);
    dc.closePath();
  };

  traceCrescent();
  dc.fillStyle = "#f29d24";
  dc.fill();

  dc.save();
  traceCrescent();
  dc.clip();
  for (let i = 0; i < 24; i++) {
    const a = lerp(Math.PI * 0.42, Math.PI * 1.58, i / 23);
    const rr = 22 + (i % 3) * 6;
    paintDab(
      dc,
      Math.cos(a) * rr,
      Math.sin(a) * rr,
      18,
      7.5,
      a + Math.PI * 0.5,
      i % 2 === 0 ? "#ffe359" : "#fff7be"
    );
  }
  dc.restore();

  traceCrescent();
  dc.strokeStyle = "#d97818";
  dc.lineWidth = 2.6;
  dc.stroke();

  dc.restore();
}

/**
 * Bakes an organic S-curving flame cypress tree sprite rooted at (150, 650) inside 300x670
 * without a smooth mechanical border — edges break naturally into licking flame brushstrokes!
 */
function bakeCypressSprite(pg) {
  const dc = pg.drawingContext;
  const rand = prng(18895);

  pg.clear();
  dc.save();
  dc.translate(150, 650);

  const centerOffsetAt = (t) => Math.sin(t * 7.5) * 14 - Math.pow(t, 1.4) * 10;
  const halfWidthAt = (t) => {
    const swell = Math.sin(clamp(t * 1.15, 0, 1) * Math.PI) * 34;
    const base = (1 - smoothstep(0.08, 0.99, t)) * 34;
    return Math.max(4, swell * 0.65 + base);
  };

  // Dark inner core silhouette (slightly inset so outer flame strokes break out freely)
  dc.beginPath();
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = -t * 600;
    const x = centerOffsetAt(t) - halfWidthAt(t) * 0.82;
    if (i === 0) dc.moveTo(x, y);
    else dc.lineTo(x, y);
  }
  for (let i = 24; i >= 0; i--) {
    const t = i / 24;
    const y = -t * 600;
    const x = centerOffsetAt(t) + halfWidthAt(t) * 0.82;
    dc.lineTo(x, y);
  }
  dc.closePath();
  dc.fillStyle = "#081410";
  dc.fill();

  // Dense upward S-swirling flame brushstrokes extending past silhouette edges
  const cols = ["#07130e", "#0f2419", "#173621", "#224a2a", "#38351b", "#544522", "#142b3d"];
  for (let i = 0; i < 680; i++) {
    const t = Math.pow(rand(), 0.85);
    const y = -t * 612;
    const cx = centerOffsetAt(t);
    const hw = halfWidthAt(t);
    const x = cx + (rand() - 0.5) * hw * 2.05;
    const swirlAng = -Math.PI * 0.5 + Math.cos(t * 10 + x * 0.04) * 0.45;
    const col = cols[Math.floor(rand() * cols.length)];
    paintDab(
      dc,
      x,
      y,
      20 + rand() * 22,
      5.5 + rand() * 4.5,
      swirlAng,
      col,
      "rgba(4, 10, 12, 0.55)",
      (rand() - 0.5) * 8
    );
  }

  // Prominent curling side & crown flame tongues
  for (const [tPos, side, ang, fl] of [
    [0.32, -1, -1.92, 46],
    [0.48, 1, -1.20, 44],
    [0.64, -1, -1.86, 40],
    [0.78, 1, -1.28, 38],
    [0.90, -0.4, -1.68, 38],
    [0.98, 0.0, -1.56, 36],
  ]) {
    const cx = centerOffsetAt(tPos) + side * halfWidthAt(tPos) * 0.78;
    const cy = -tPos * 600;
    paintDab(dc, cx, cy, fl, 6.8, ang, "#0d2217", "#040b0b", side * 6);
    paintDab(dc, cx + 2, cy, fl * 0.7, 3.6, ang, "#3b4222", null, side * 4);
  }

  dc.restore();
}

/**
 * Bakes a gnarled Provençal olive tree sprite for the far right frame edge (distinct from left cypress!).
 */
function bakeOliveTreeSprite(pg) {
  const dc = pg.drawingContext;
  const rand = prng(18897);

  pg.clear();
  dc.save();
  dc.translate(150, 400);

  // Gnarled twisting trunk & main boughs
  for (const [x0, y0, x1, y1, w] of [
    [0, 0, -14, -135, 22],
    [-12, -125, -48, -210, 13],
    [-10, -130, 32, -215, 13],
    [22, -195, 58, -245, 9],
  ]) {
    paintDab(dc, (x0 + x1) * 0.5, (y0 + y1) * 0.5, Math.hypot(x1 - x0, y1 - y0) + 10, w, Math.atan2(y1 - y0, x1 - x0), "#2e241b", "#090f18", 8);
    paintDab(dc, (x0 + x1) * 0.5 + 3, (y0 + y1) * 0.5, Math.hypot(x1 - x0, y1 - y0) * 0.75, w * 0.42, Math.atan2(y1 - y0, x1 - x0), "#594832");
  }

  // Billowing swirling silver-green & dark-emerald olive canopy strokes
  const canopyCenters = [
    [-46, -235, 68, 52],
    [16, -255, 76, 56],
    [60, -225, 58, 46],
    [-12, -210, 66, 44],
  ];
  for (const [cx, cy, rx, ry] of canopyCenters) {
    for (let i = 0; i < 85; i++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.pow(rand(), 0.55);
      const px = cx + Math.cos(a) * rx * rr;
      const py = cy + Math.sin(a) * ry * rr;
      const col = rand() > 0.65 ? "#4a6e58" : rand() > 0.35 ? "#294d3b" : "#153026";
      paintDab(dc, px, py, 16 + rand() * 12, 5.5 + rand() * 3, a + Math.PI * 0.48, col, "rgba(7, 16, 18, 0.45)", 3);
    }
  }

  dc.restore();
}

/**
 * Draws painterly golden-yellow & sky-blue impasto streamline arcs during Bar 2 wheel-lock!
 */
function drawWheelSkyFlowArcs(g, skyAngle, wheelRot, pose, lockBlend, u) {
  if (lockBlend <= 0.02) return;
  const dc = g.drawingContext;
  dc.save();

  const drawImpastoRingArcs = (cx, cy, rings, baseAngle, alphaScale) => {
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        const a0 = baseAngle * ring.mult + (i / ring.count) * Math.PI * 2 + ring.offset;
        const a1 = a0 + ring.sweep;
        dc.globalAlpha = clamp(lockBlend * alphaScale * ring.alpha, 0, 1);
        paintArcDab(dc, cx, cy, ring.r, a0, a1, ring.thick, ring.col, "rgba(12, 24, 62, 0.38)");
      }
    }
  };

  // 1. Central Double-Spiral amplified chrome-yellow & cerulean oil-brush flow strokes (short painterly dabs)
  drawImpastoRingArcs(
    SWIRL_A.x,
    SWIRL_A.y,
    [
      { r: 64, count: 6, sweep: 0.32, mult: 1.0, offset: 0.0, thick: 6.4, col: "#ffe45e", alpha: 0.94 },
      { r: 98, count: 8, sweep: 0.26, mult: 1.0, offset: 0.35, thick: 5.8, col: "#7fc3f8", alpha: 0.9 },
      { r: 134, count: 9, sweep: 0.24, mult: 1.0, offset: 0.72, thick: 5.2, col: "#fff6c8", alpha: 0.86 },
      { r: 172, count: 10, sweep: 0.20, mult: 1.0, offset: 0.18, thick: 4.8, col: "#f7c73b", alpha: 0.82 },
    ],
    skyAngle,
    0.96
  );

  drawImpastoRingArcs(
    SWIRL_B.x,
    SWIRL_B.y,
    [
      { r: 50, count: 5, sweep: 0.34, mult: -1.0, offset: 0.25, thick: 5.6, col: "#ffe25a", alpha: 0.92 },
      { r: 84, count: 7, sweep: 0.26, mult: -1.0, offset: 0.85, thick: 5.2, col: "#8ac9fa", alpha: 0.86 },
      { r: 118, count: 8, sweep: 0.22, mult: -1.0, offset: 0.45, thick: 4.6, col: "#fff4c0", alpha: 0.82 },
    ],
    skyAngle,
    0.92
  );

  // 2. Crescent moon & hero Venus spinning oil-brush ribbons
  drawImpastoRingArcs(
    MOON_POS.x,
    MOON_POS.y,
    [
      { r: 78, count: 8, sweep: 0.25, mult: 1.0, offset: 0.15, thick: 5.4, col: "#ffe564", alpha: 0.92 },
      { r: 112, count: 9, sweep: 0.22, mult: 1.0, offset: 0.62, thick: 4.6, col: "#8bc9fa", alpha: 0.84 },
    ],
    skyAngle,
    0.92
  );

  drawImpastoRingArcs(
    214,
    274,
    [
      { r: 64, count: 7, sweep: 0.27, mult: 1.0, offset: 0.1, thick: 4.8, col: "#ffe466", alpha: 0.9 },
      { r: 92, count: 8, sweep: 0.22, mult: 1.0, offset: 0.48, thick: 4.2, col: "#85c4f7", alpha: 0.8 },
    ],
    skyAngle,
    0.9
  );

  // 3. Matching golden-yellow & cerulean impasto vortex strokes spinning directly around the wheels!
  const s = pose.scale;
  for (const [hub, mult] of [
    [pose.frontHub, 1.0],
    [pose.rearHub, 0.82],
  ]) {
    drawImpastoRingArcs(
      hub.x,
      hub.y,
      [
        { r: (pose.wheelRadius + 13) * s, count: 7, sweep: 0.30, mult: 1.0, offset: 0.0, thick: 5.2 * s, col: "#ffe35e", alpha: 0.94 },
        { r: (pose.wheelRadius + 24) * s, count: 8, sweep: 0.24, mult: 1.0, offset: 0.42, thick: 4.2 * s, col: "#7fc3f8", alpha: 0.86 },
      ],
      wheelRot,
      mult
    );
  }

  // 4. Painterly golden/blue comet wisps streaming off the bicycle
  for (let i = 0; i < 6; i++) {
    const phase = posMod(u * 2.2 + i * 0.35, 1.0);
    const wy = pose.y - (26 + i * 24) * s + Math.sin(u * 6 + i) * 5;
    const wx = pose.rearHub.x - (16 + phase * 82) * s;
    dc.globalAlpha = clamp((1 - phase) * 0.78 * lockBlend, 0, 1);
    paintDab(dc, wx, wy, (22 + (1 - phase) * 24) * s, 4.0 * s, -0.08, i % 2 === 0 ? "#ffe05a" : "#78baf2", null, 3 * s);
  }

  dc.restore();
}

/**
 * Draws the Pelican & Bicycle completely constructed out of thick Van Gogh impasto brushstrokes:
 * solid painterly silhouettes layered with continuous overlapping short oil dabs (never dotted or skeletal!),
 * ivory/pale-yellow wings with cool light-blue shadows, golden-orange throat pouch, and chrome-yellow frame.
 */
function drawVanGoghRig(g, pose, u, lockBlend) {
  const dc = g.drawingContext;
  const s = pose.scale;

  // Painterly dark-indigo ground shadow beneath wheels
  dc.save();
  dc.fillStyle = "rgba(10, 16, 42, 0.54)";
  dc.beginPath();
  dc.ellipse(pose.x, pose.y + 3 * s, Math.max(1, 122 * s), Math.max(1, 10 * s), 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  const drawImpastoWheel = (hub) => {
    dc.save();
    dc.translate(hub.x, hub.y);

    // 8 painterly spokes in warm ochre & bright chrome-yellow reference spokes
    for (let i = 0; i < 8; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 4;
      const isRef = i === 0 || i === 4;
      dc.strokeStyle = "#101b38";
      dc.lineWidth = (isRef ? 4.8 : 3.2) * s;
      dc.beginPath();
      dc.moveTo(0, 0);
      dc.lineTo(Math.cos(a) * (pose.wheelRadius - 4 * s), Math.sin(a) * (pose.wheelRadius - 4 * s));
      dc.stroke();

      dc.strokeStyle = isRef ? "#ffe35a" : "#cfa23e";
      dc.lineWidth = (isRef ? 2.8 : 1.7) * s;
      dc.stroke();
    }

    // Continuous dark indigo tire base + overlapping impasto rim texture dabs rotating with wheelRot
    dc.strokeStyle = "#0e1834";
    dc.lineWidth = 7.0 * s;
    dc.beginPath();
    dc.arc(0, 0, Math.max(0.5, pose.wheelRadius), 0, Math.PI * 2);
    dc.stroke();

    const tireDabs = 34;
    for (let i = 0; i < tireDabs; i++) {
      const a = pose.wheelRot + (i / tireDabs) * Math.PI * 2;
      const rx = Math.cos(a) * pose.wheelRadius;
      const ry = Math.sin(a) * pose.wheelRadius;
      paintDab(
        dc,
        rx,
        ry,
        13 * s,
        3.2 * s,
        a + Math.PI * 0.5,
        i % 4 === 0 ? "#f5d052" : i % 2 === 0 ? "#4e7ec2" : "#1c3369"
      );
    }

    dc.fillStyle = "#f4ce52";
    dc.strokeStyle = "#101b38";
    dc.lineWidth = 2.2 * s;
    dc.beginPath();
    dc.arc(0, 0, Math.max(0.5, 6.8 * s), 0, Math.PI * 2);
    dc.fill();
    dc.stroke();

    dc.restore();
  };

  // Helper for solid continuous oil-painted limb with overlapping directional dabs
  const paintLimb = (pts, outlineCol, baseCol, hiCol, w) => {
    dc.save();
    dc.lineCap = "round";
    dc.lineJoin = "round";
    dc.beginPath();
    dc.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) dc.lineTo(pts[i].x, pts[i].y);
    dc.strokeStyle = outlineCol;
    dc.lineWidth = w + 3.2 * s;
    dc.stroke();
    dc.strokeStyle = baseCol;
    dc.lineWidth = w;
    dc.stroke();

    for (let seg = 0; seg < pts.length - 1; seg++) {
      const p0 = pts[seg];
      const p1 = pts[seg + 1];
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const steps = Math.max(3, Math.round(len / (12 * s)));
      for (let k = 0; k < steps; k++) {
        const f = (k + 0.5) / steps;
        const lx = lerp(p0.x, p1.x, f);
        const ly = lerp(p0.y, p1.y, f);
        paintDab(dc, lx - Math.sin(ang) * 1.2 * s, ly - Math.cos(ang) * 1.2 * s, len / steps + 5 * s, w * 0.45, ang, hiCol);
      }
    }
    dc.restore();
  };

  // Back leg & crank
  paintLimb([pose.hip, pose.leftKnee, pose.leftPedal], "#101b38", "#b55a1c", "#e38c34", 7.4 * s);
  paintLimb([pose.bb, pose.leftPedal], "#101b38", "#1d356b", "#f4c842", 3.8 * s);

  // Wheels
  drawImpastoWheel(pose.rearHub);
  drawImpastoWheel(pose.frontHub);

  // Chrome-yellow bright-edged bicycle frame (continuous core + overlapping impasto highlight strokes!)
  const frameSegs = [
    [pose.rearHub, pose.bb],
    [pose.rearHub, pose.seatCluster],
    [pose.bb, pose.seatCluster],
    [pose.seatCluster, pose.headTop],
    [pose.bb, pose.headBot],
    [pose.frontHub, pose.headTop],
    [pose.headTop, pose.stemTop],
    [pose.stemTop, pose.barGrip],
    [pose.seatCluster, { x: (pose.saddleRear.x + pose.saddleFront.x) * 0.5, y: pose.saddleRear.y + 3 * s }],
  ];

  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";
  // Continuous Prussian outline + cobalt base tube (never gappy!)
  for (const [a, b] of frameSegs) {
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.strokeStyle = "#101b3b";
    dc.lineWidth = 8.4 * s;
    dc.stroke();
    dc.strokeStyle = "#24478a";
    dc.lineWidth = 5.2 * s;
    dc.stroke();
  }
  // Overlapping chrome-yellow sunlit top-edge impasto dabs
  for (const [a, b] of frameSegs) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const steps = Math.max(2, Math.round(len / (12 * s)));
    for (let k = 0; k < steps; k++) {
      const f = (k + 0.5) / steps;
      const fx = lerp(a.x, b.x, f);
      const fy = lerp(a.y, b.y, f);
      paintDab(
        dc,
        fx - Math.sin(ang) * 1.4 * s,
        fy - Math.cos(ang) * 1.4 * s,
        len / steps + 6 * s,
        2.8 * s,
        ang,
        k % 2 === 0 ? "#ffe258" : "#f4c234"
      );
    }
  }

  // Saddle & chainring & brass bell
  paintDab(
    dc,
    (pose.saddleRear.x + pose.saddleFront.x) * 0.5,
    (pose.saddleRear.y + pose.saddleFront.y) * 0.5,
    Math.hypot(pose.saddleFront.x - pose.saddleRear.x, pose.saddleFront.y - pose.saddleRear.y),
    9 * s,
    Math.atan2(pose.saddleFront.y - pose.saddleRear.y, pose.saddleFront.x - pose.saddleRear.x),
    "#6b3e1b",
    "#0f1a38"
  );
  paintDab(
    dc,
    (pose.saddleRear.x + pose.saddleFront.x) * 0.5,
    (pose.saddleRear.y + pose.saddleFront.y) * 0.5 - 2 * s,
    24 * s,
    3.5 * s,
    0,
    "#d69e38"
  );

  dc.fillStyle = "#1d356b";
  dc.strokeStyle = "#ffe054";
  dc.lineWidth = 2.4 * s;
  dc.beginPath();
  dc.arc(pose.bb.x, pose.bb.y, Math.max(0.5, 9.5 * s), 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.fillStyle = "#ffe25c";
  dc.strokeStyle = "#101b38";
  dc.lineWidth = 2 * s;
  dc.beginPath();
  dc.arc(pose.bellPos.x, pose.bellPos.y, Math.max(0.5, 5.2 * s), 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.restore();

  // Pelican body underpaint + layered directional impasto feather dabs
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
  dc.fillStyle = "#efe6c8";
  dc.fill();

  dc.save();
  traceBody();
  dc.clip();
  for (let i = -3; i <= 3; i++) {
    paintDab(dc, pose.bodyCenter.x + i * 14 * s, pose.bodyCenter.y + 18 * s, 24 * s, 10 * s, -0.15, "#83a6d4");
    paintDab(dc, pose.bodyCenter.x + i * 13 * s, pose.bodyCenter.y + 26 * s, 20 * s, 8 * s, -0.1, "#5c80ba");
  }
  for (let i = -3; i <= 3; i++) {
    paintDab(
      dc,
      pose.bodyCenter.x + i * 14 * s,
      pose.bodyCenter.y - 10 * s + Math.abs(i) * 2 * s,
      24 * s,
      10 * s,
      -0.2 + i * 0.04,
      i % 2 === 0 ? "#faf4dd" : "#f5e398"
    );
  }
  dc.restore();

  traceBody();
  dc.strokeStyle = "#162a59";
  dc.lineWidth = 3.4 * s;
  dc.lineJoin = "round";
  dc.stroke();
  dc.restore();

  // Continuous S-curve neck (smooth outline & fill first, then longitudinal impasto feather dabs — NO zebra rings!)
  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";
  dc.beginPath();
  dc.moveTo(pose.neckCurve[0].x, pose.neckCurve[0].y);
  for (let i = 1; i < pose.neckCurve.length; i++) dc.lineTo(pose.neckCurve[i].x, pose.neckCurve[i].y);
  dc.strokeStyle = "#162a59";
  dc.lineWidth = 24.5 * s;
  dc.stroke();
  dc.strokeStyle = "#faf2d8";
  dc.lineWidth = 18.5 * s;
  dc.stroke();

  // Longitudinal cool blue shadow & tactile short pale-yellow impasto dabs along neck S-curve
  for (let i = 0; i < pose.neckCurve.length - 1; i++) {
    const a = pose.neckCurve[i];
    const b = pose.neckCurve[i + 1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    for (const f of [0.22, 0.52, 0.82]) {
      const nx = lerp(a.x, b.x, f);
      const ny = lerp(a.y, b.y, f);
      paintDab(dc, nx - 4.4 * s, ny + 2.4 * s, segLen * 0.58, 4.8 * s, ang + 0.12, "#7da3d4");
      paintDab(dc, nx + 2.8 * s, ny - 1.8 * s, segLen * 0.52, 4.8 * s, ang - 0.1, i % 2 === 0 ? "#f5e296" : "#fff7d6");
    }
  }
  dc.restore();

  // Head + crest with circular painterly brushstrokes
  dc.save();
  dc.fillStyle = "#faf2d8";
  dc.strokeStyle = "#162a59";
  dc.lineWidth = 3.2 * s;
  dc.beginPath();
  dc.moveTo(pose.crest1.x, pose.crest1.y);
  dc.lineTo(pose.head.x - 6 * s, pose.head.y - 16 * s);
  dc.lineTo(pose.crest2.x, pose.crest2.y);
  dc.lineTo(pose.head.x + 6 * s, pose.head.y - 17 * s);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.beginPath();
  dc.arc(pose.head.x, pose.head.y, Math.max(0.5, 17.5 * s), 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    paintDab(
      dc,
      pose.head.x + Math.cos(a) * 8 * s,
      pose.head.y + Math.sin(a) * 8 * s,
      11 * s,
      5 * s,
      a + Math.PI * 0.5,
      i < 3 ? "#8aaad6" : "#f6e59c"
    );
  }
  dc.restore();

  // Golden-orange throat pouch (金橘大喉囊) with impasto crescent strokes
  const tracePouch = () => {
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
  };
  dc.save();
  tracePouch();
  dc.fillStyle = "#eb8924";
  dc.fill();
  dc.save();
  tracePouch();
  dc.clip();
  for (let i = 0; i < 9; i++) {
    const f = i / 8;
    const px = lerp(pose.pouchBase.x + 8 * s, pose.beakTip.x - 10 * s, f);
    const py = lerp(pose.pouchBase.y + 10 * s, pose.pouchMid.y, Math.sin(f * Math.PI));
    paintDab(dc, px, py + 7 * s, 18 * s, 7.5 * s, (f - 0.5) * 0.6, "#c75e16");
    paintDab(dc, px, py - 4 * s, 16 * s, 6.5 * s, (f - 0.5) * 0.5, i % 2 === 0 ? "#ffa730" : "#ffd04d");
  }
  dc.restore();
  tracePouch();
  dc.strokeStyle = "#182852";
  dc.lineWidth = 3.2 * s;
  dc.lineJoin = "round";
  dc.stroke();
  dc.restore();

  // Upper beak + fiery hook
  dc.save();
  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
  dc.lineTo(pose.beakTip.x, pose.beakTip.y);
  dc.lineTo(pose.beakHook.x, pose.beakHook.y);
  dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  dc.closePath();
  dc.fillStyle = "#f2aa2c";
  dc.fill();
  dc.strokeStyle = "#182852";
  dc.lineWidth = 2.8 * s;
  dc.stroke();
  paintDab(
    dc,
    lerp(pose.beakBaseTop.x, pose.beakTip.x, 0.5),
    lerp(pose.beakBaseTop.y, pose.beakTip.y, 0.5) + 4 * s,
    46 * s,
    4.5 * s,
    0.22,
    "#ffe05c"
  );
  dc.restore();

  // Sharp expressive Van Gogh eye
  dc.save();
  dc.fillStyle = "#b5d4f5";
  dc.strokeStyle = "#122147";
  dc.lineWidth = 2.2 * s;
  dc.beginPath();
  dc.arc(pose.eye.x, pose.eye.y, Math.max(0.5, 5.5 * s), 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.fillStyle = "#0b142c";
  dc.beginPath();
  dc.arc(pose.eye.x + 1.4 * s, pose.eye.y, Math.max(0.5, 2.4 * s), 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // Wing reaching to handlebars: ivory/pale-yellow with cool light-blue shadow dabs
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
  dc.fillStyle = "#e8e3c5";
  dc.fill();
  dc.save();
  traceWing();
  dc.clip();
  for (let i = 0; i < 8; i++) {
    const f = i / 7;
    const wx = lerp(pose.shoulder.x, pose.barGrip.x, f);
    const wy = lerp(pose.shoulder.y, pose.barGrip.y, f) + Math.sin(f * Math.PI) * 8 * s;
    paintDab(dc, wx, wy + 7 * s, 20 * s, 7.2 * s, 0.28, "#7298cf");
    paintDab(dc, wx, wy - 2 * s, 18 * s, 6.2 * s, 0.22, i % 2 === 0 ? "#faf4dc" : "#f3df8a");
  }
  dc.restore();
  traceWing();
  dc.strokeStyle = "#162a59";
  dc.lineWidth = 3 * s;
  dc.stroke();
  dc.restore();

  // Front leg & crank
  paintLimb([pose.hip, pose.rightKnee, pose.rightPedal], "#101b38", "#d96d1e", "#f7a23b", 7.8 * s);
  paintLimb([pose.bb, pose.rightPedal], "#101b38", "#1d356b", "#ffe054", 4.2 * s);

  dc.fillStyle = "#101b38";
  dc.strokeStyle = "#f4ce52";
  dc.lineWidth = 1.6 * s;
  dc.fillRect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 3 * s, 16 * s, 6 * s);
  dc.strokeRect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 3 * s, 16 * s, 6 * s);
  dc.fillRect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s);
  dc.strokeRect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s);

  // Subtle Bar 2 wheel-spoke reference sparkle
  if (lockBlend > 0.1) {
    const a = pose.wheelRot;
    paintDab(
      dc,
      pose.frontHub.x + Math.cos(a) * pose.wheelRadius * 0.56,
      pose.frontHub.y + Math.sin(a) * pose.wheelRadius * 0.56,
      26 * s,
      4.5 * s,
      a,
      "#fff7bf"
    );
  }
}

export default function render(ctx) {
  const { p, g, kit, t, localTime, beat } = ctx;
  const u = localTime;

  // Bake all heavy impasto textures & rotatable celestial tiles once per scene key
  const backdrop = kit.bakeLayer("s12_vangogh_backdrop_v2", 1840, 1000, bakeStarryBackdrop);
  const swirlA = kit.bakeLayer("s12_swirl_a_v2", 420, 420, (pg) =>
    bakeSpiralTile(pg, {
      size: 420,
      arms: 2,
      turns: 2.15,
      maxR: 198,
      seed: 18891,
      palette: {
        deep: "#1d458e",
        mid: "#3e77c7",
        pale: "#8bc2f0",
        highlight: "#f7f1d4",
        gold: "#f5d458",
      },
    })
  );
  const swirlB = kit.bakeLayer("s12_swirl_b_v2", 320, 320, (pg) =>
    bakeSpiralTile(pg, {
      size: 320,
      arms: 2,
      turns: 1.9,
      maxR: 148,
      seed: 18892,
      palette: {
        deep: "#224f9c",
        mid: "#4f8dd4",
        pale: "#a3d3f7",
        highlight: "#faf5db",
        gold: "#f6db6b",
      },
    })
  );
  const starVenus = kit.bakeLayer("s12_star_venus_v2", 220, 220, (pg) => bakeStarTile(pg, 220, true, 18893));
  const starBright = kit.bakeLayer("s12_star_bright_v2", 150, 150, (pg) => bakeStarTile(pg, 150, false, 18894));
  const moonHalo = kit.bakeLayer("s12_moon_halo_v2", 290, 290, bakeMoonHalo);
  const moonCore = kit.bakeLayer("s12_moon_core_v2", 170, 170, bakeMoonCore);
  const cypressSprite = kit.bakeLayer("s12_cypress_v2", 300, 670, bakeCypressSprite);
  const oliveSprite = kit.bakeLayer("s12_olive_v1", 300, 420, bakeOliveTreeSprite);

  // 1. Static baked Starry Night canvas, mountains, village & cobblestone road
  p.push();
  p.imageMode(p.CENTER);
  p.image(backdrop, 500, 500, 1840, 1000);
  p.pop();

  // 2. Dynamic 2D foreground & wheel-locked swirling sky
  g.push();

  const px = getScenePelicanX(u);
  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });

  // Bar 2 (u in [2.0, 4.0)) wheel-lock blend + continuous rotation angle
  const lockBlend = smoothstep(1.82, 2.04, u) * (1 - smoothstep(3.96, 4.42, u));
  const skyAngle = getSkyRotation(u, pose.wheelRot);
  const beatKick = (beat?.beatPulse ?? 0) * lockBlend;

  // 2a. Rotating Central Double-Spiral Nebula locked to `pose.wheelRot` in Bar 2
  const swirlAScale = 1 + 0.16 * lockBlend + 0.035 * beatKick;
  const swirlBScale = 1 + 0.18 * lockBlend + 0.04 * beatKick;

  g.push();
  g.imageMode("center");

  g.push();
  g.translate(SWIRL_A.x, SWIRL_A.y);
  g.rotate(skyAngle);
  g.scale(swirlAScale);
  g.image(swirlA, 0, 0, 420, 420);
  g.pop();

  g.push();
  g.translate(SWIRL_B.x, SWIRL_B.y);
  g.rotate(-skyAngle + 0.7);
  g.scale(swirlBScale);
  g.image(swirlB, 0, 0, 320, 320);
  g.pop();

  // 2b. 11 Multi-Halo Stars rotating in lockstep
  for (const st of STARS) {
    const twinkle = 1 + Math.sin(u * 4.5 + st.phase) * 0.035;
    const starScale = st.s * twinkle * (1 + 0.24 * lockBlend + 0.05 * beatKick);
    const sprite = st.kind === "venus" ? starVenus : starBright;
    const dim = st.kind === "venus" ? 220 : 150;

    g.push();
    g.translate(st.x, st.y);
    g.rotate(skyAngle + st.phase * (1 - lockBlend * 0.65));
    g.scale(starScale);
    g.image(sprite, 0, 0, dim, dim);
    g.pop();
  }

  // 2c. Top-right Crescent Moon & rotating sunburst halo
  const moonHaloScale = 1 + 0.22 * lockBlend + 0.045 * beatKick;
  g.push();
  g.translate(MOON_POS.x, MOON_POS.y);
  g.rotate(skyAngle);
  g.scale(moonHaloScale);
  g.image(moonHalo, 0, 0, 290, 290);
  g.pop();

  g.push();
  g.translate(MOON_POS.x, MOON_POS.y);
  g.rotate(Math.sin(skyAngle) * 0.07 * lockBlend);
  g.scale(1 + 0.08 * lockBlend);
  g.image(moonCore, 0, 0, 170, 170);
  g.pop();

  g.pop();

  // 2d. Dynamic flowing chrome-yellow & sky-blue impasto streamlines in Bar 2
  drawWheelSkyFlowArcs(g, skyAngle, pose.wheelRot, pose, lockBlend, u);

  // 2e. Subtle dynamic breathing golden window halo over village in Bar 2
  if (lockBlend > 0.05) {
    const dc = g.drawingContext;
    dc.save();
    dc.globalAlpha = clamp(0.16 * lockBlend + 0.12 * beatKick, 0, 0.35);
    for (const [wx, wy] of [
      [318, 670],
      [548, 670],
      [764, 576],
      [852, 668],
    ]) {
      const grad = dc.createRadialGradient(wx, wy, 2, wx, wy, 26);
      grad.addColorStop(0, "#ffe464");
      grad.addColorStop(1, "rgba(255, 198, 48, 0)");
      dc.fillStyle = grad;
      dc.beginPath();
      dc.arc(wx, wy, 26, 0, Math.PI * 2);
      dc.fill();
    }
    dc.restore();
  }

  // 2f. Flame-like Cypress Trees on left foreground + distinct gnarled Olive Tree framing right edge
  const cypressSway = Math.sin(u * 2.2) * 0.012 + Math.sin(skyAngle * 0.5) * 0.014 * lockBlend;
  for (const c of [
    { x: -278, y: 710, s: 0.66, flip: 1, swayMult: 0.8 },
    { x: -176, y: 712, s: 1.02, flip: 1, swayMult: 1.0 },
  ]) {
    g.push();
    g.translate(c.x, c.y);
    g.rotate(cypressSway * c.swayMult);
    g.scale(c.flip * c.s, c.s);
    g.imageMode("corner");
    g.image(cypressSprite, -150, -650, 300, 670);
    g.pop();
  }

  g.push();
  g.translate(1245, 708);
  g.rotate(-cypressSway * 0.45);
  g.scale(0.92, 0.92);
  g.imageMode("corner");
  g.image(oliveSprite, -150, -400, 300, 420);
  g.pop();

  // 2g. Van Gogh impasto Pelican & Chrome-Yellow Bicycle riding at ROAD_Y = 730
  drawVanGoghRig(g, pose, u, lockBlend);

  // 2h. Era Title Card (top-left museum impasto plaque)
  drawEraTitleCard(g, META, u);

  g.pop();
}
