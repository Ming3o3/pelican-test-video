/**
 * Scene #08 — 莫卧儿细密画 · Mughal Miniature (c. 1600), t in [47.0, 53.0).
 * Imperial Mughal Kitabkhana folio (`Muraqqa`):
 * - Ornate lapis-and-gold floral arabesque `Hashiya` border with sculpted Mughal archway
 *   openings (`y in [385..765]`) keeping `ROAD_Y = 730` completely clear across both portals.
 * - Three incompatible perspectives stacked in one composition:
 *   1. Top (0° flat front elevation): White marble `Jharokha` balcony & `chhatri` domes with 2 ladies leaning down;
 *   2. Middle (45° oblique bird's-eye): `Charbagh` cruciform lapis water channels, octagonal lotus fountain
 *      aligned beneath the pavilion (`x = 672`), cypresses, flowering trees, and twin 45° tilted Persian carpets
 *      with 2 courtiers (left carpet) & 1 sitar musician (right carpet);
 *   3. Bottom (0° horizontal profile, `ROAD_Y = 730`): Continuous red sandstone promenade with palace guards.
 * - Bar 2 deadpan gag (`u in [2.0, 4.0)`): Observers from all 3 incompatible perspectives lock their
 *   gaze and gestures simultaneously onto the same royal ruby-turbaned (`Sarpech`) Pelican pedaling past,
 *   while the Hashiya golden rosettes shimmer to the 120 BPM beat.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  BUFFER_H,
  BUFFER_W,
  ROAD_Y,
  clamp,
  getScenePelicanX,
  lerp,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[7];

// Imperial Mughal mineral pigment palette
const PAL = {
  wasli: "#ebd7b0",
  margin: "#e3ca9a",
  lapisDark: "#142c5c",
  lapisMid: "#1e478a",
  lapisWater: "#255ca8",
  turquoise: "#2b8b87",
  vermilion: "#b63228",
  crimson: "#8d1d24",
  emerald: "#255e3b",
  emeraldLight: "#3b7644",
  cypress: "#173c26",
  goldBright: "#f7d470",
  gold: "#d49b35",
  goldDeep: "#966517",
  marble: "#f6efe0",
  marbleShade: "#dfd0b4",
  sandLight: "#c45c44",
  sandMid: "#9c473b",
  sandDark: "#6d2b21",
  ink: "#261915",
  saffron: "#df8a28",
  rose: "#d4536f",
};

// Precomputed rosette coordinates along the Hashiya border (even spacing, zero corner collision)
const HASHIYA_ROSETTES = (() => {
  const list = [];
  // Four main corner medallions
  for (const [cx, cy] of [
    [21, 19],
    [979, 19],
    [21, 981],
    [979, 981],
  ]) {
    list.push({ x: cx, y: cy, r: 12 });
  }
  // Top & bottom central Hashiya bars between corners (x = 94..906)
  for (let i = 1; i <= 12; i++) {
    const x = lerp(21, 979, i / 13);
    list.push({ x, y: 19, r: 9.5 });
    list.push({ x, y: 981, r: 9.5 });
  }
  // Upper vertical side Hashiya bars (y = 85..340)
  for (let i = 1; i <= 4; i++) {
    const y = lerp(19, 372, i / 5);
    list.push({ x: 21, y, r: 8.8 });
    list.push({ x: 979, y, r: 8.8 });
  }
  // Lower vertical side Hashiya bars (y = 815..930)
  for (let i = 1; i <= 2; i++) {
    const y = lerp(772, 981, i / 3);
    list.push({ x: 21, y, r: 8.8 });
    list.push({ x: 979, y, r: 8.8 });
  }
  // Outer wing margin ribbons ([-380..-45] and [1045..1380])
  for (let x = -380; x <= -45; x += 82) {
    list.push({ x, y: 13, r: 7 });
    list.push({ x, y: 987, r: 7 });
  }
  for (let x = 1045; x <= 1380; x += 82) {
    list.push({ x, y: 13, r: 7 });
    list.push({ x, y: 987, r: 7 });
  }
  return list;
})();

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Converts 45-degree oblique Charbagh grid coordinates (u, v) into scene coordinates.
 * Centered at (672, 488) directly beneath the Marble Jharokha Pavilion so the lotus fountain
 * stands unobstructed ahead of the Pelican during Bar 2 (u = 3.0, px = 500).
 */
function charbaghPt(uGrid, vGrid) {
  return {
    x: 672 + (uGrid - vGrid) * 0.82,
    y: 488 + (uGrid + vGrid) * 0.4,
  };
}

function drawPolygon(dc, pts, fillStyle, strokeStyle = null, lineWidth = 1.4) {
  dc.beginPath();
  dc.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) dc.lineTo(pts[i].x, pts[i].y);
  dc.closePath();
  if (fillStyle) {
    dc.fillStyle = fillStyle;
    dc.fill();
  }
  if (strokeStyle && lineWidth > 0) {
    dc.strokeStyle = strokeStyle;
    dc.lineWidth = lineWidth;
    dc.lineJoin = "round";
    dc.stroke();
  }
}

/**
 * Traces a symmetrical Mughal multi-cusped arch outline opening downward from (cx, apexY).
 */
function traceCuspedArch(dc, cx, apexY, halfW, springY, baseY, cusps = 7) {
  dc.beginPath();
  dc.moveTo(cx - halfW, baseY);
  dc.lineTo(cx - halfW, springY);

  for (let i = 0; i < cusps; i++) {
    const t1 = (i + 1) / cusps;
    const tm = (i + 0.5) / cusps;
    const x1 = cx - halfW + t1 * (halfW * 2);
    const xm = cx - halfW + tm * (halfW * 2);
    const archCurve = (s) => {
      const k = Math.abs(s * 2 - 1);
      return apexY + (springY - apexY) * Math.pow(k, 1.45);
    };
    const y1 = archCurve(t1);
    const ym = archCurve(tm) + 6.5;
    dc.quadraticCurveTo(xm, ym, x1, y1);
  }

  dc.lineTo(cx + halfW, baseY);
}

/**
 * Draws an intricate layered 8-petaled gilded Mughal lotus rosette inside the Hashiya border.
 */
function drawLotusRosette(dc, cx, cy, r, coreCol = PAL.vermilion) {
  dc.save();
  dc.translate(cx, cy);

  // Outer emerald/turquoise sepal star
  for (let i = 0; i < 8; i++) {
    dc.save();
    dc.rotate((i * Math.PI) / 4 + Math.PI / 8);
    dc.beginPath();
    dc.moveTo(0, 0);
    dc.quadraticCurveTo(-r * 0.24, -r * 0.52, 0, -r * 0.88);
    dc.quadraticCurveTo(r * 0.24, -r * 0.52, 0, 0);
    dc.fillStyle = PAL.turquoise;
    dc.fill();
    dc.restore();
  }

  // Primary burnished-gold lotus petals
  for (let i = 0; i < 8; i++) {
    dc.save();
    dc.rotate((i * Math.PI) / 4);
    dc.beginPath();
    dc.moveTo(0, 0);
    dc.quadraticCurveTo(-r * 0.34, -r * 0.62, 0, -r * 1.04);
    dc.quadraticCurveTo(r * 0.34, -r * 0.62, 0, 0);
    dc.fillStyle = i % 2 === 0 ? PAL.goldBright : PAL.gold;
    dc.fill();
    dc.strokeStyle = PAL.goldDeep;
    dc.lineWidth = 0.7;
    dc.stroke();
    dc.restore();
  }

  // Jewel core
  dc.beginPath();
  dc.arc(0, 0, r * 0.34, 0, Math.PI * 2);
  dc.fillStyle = coreCol;
  dc.fill();
  dc.strokeStyle = PAL.goldBright;
  dc.lineWidth = 0.9;
  dc.stroke();

  dc.beginPath();
  dc.arc(0, 0, r * 0.14, 0, Math.PI * 2);
  dc.fillStyle = "#fff4cc";
  dc.fill();
  dc.restore();
}

/**
 * Draws an isometric Mughal cypress tree (`Sarv`) rising vertically from a 45° garden base.
 */
function drawCypressTree(dc, bx, by, h, w) {
  dc.save();
  dc.fillStyle = "#4d2f1e";
  dc.fillRect(bx - 3, by - 14, 6, 16);

  dc.beginPath();
  dc.moveTo(bx, by - h);
  dc.bezierCurveTo(bx - w * 0.35, by - h * 0.72, bx - w * 0.65, by - h * 0.32, bx - w * 0.42, by - 10);
  dc.quadraticCurveTo(bx, by - 4, bx + w * 0.42, by - 10);
  dc.bezierCurveTo(bx + w * 0.65, by - h * 0.32, bx + w * 0.35, by - h * 0.72, bx, by - h);
  dc.closePath();
  dc.fillStyle = PAL.cypress;
  dc.fill();
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.2;
  dc.stroke();

  dc.strokeStyle = "rgba(82, 146, 88, 0.55)";
  dc.lineWidth = 1.1;
  for (let s = 0.18; s <= 0.85; s += 0.13) {
    const yy = by - h * (1 - s);
    const span = w * 0.38 * Math.sin(s * Math.PI);
    dc.beginPath();
    dc.moveTo(bx - span, yy);
    dc.quadraticCurveTo(bx, yy - 6, bx + span, yy);
    dc.stroke();
  }
  dc.restore();
}

/**
 * Draws a Mughal flowering almond/pomegranate tree with individually painted miniature blossoms.
 */
function drawFloweringTree(dc, bx, by, h, crownR, blossomCol, rand) {
  dc.save();
  dc.strokeStyle = "#4e3120";
  dc.lineWidth = 5.5;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(bx, by);
  dc.quadraticCurveTo(bx - 5, by - h * 0.5, bx + 2, by - h * 0.72);
  dc.stroke();

  dc.beginPath();
  dc.ellipse(bx, by - h * 0.78, crownR, crownR * 0.82, 0, 0, Math.PI * 2);
  dc.fillStyle = PAL.emerald;
  dc.fill();
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.2;
  dc.stroke();

  for (let i = 0; i < 16; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = rand() * crownR * 0.65;
    dc.beginPath();
    dc.arc(bx + Math.cos(ang) * dist, by - h * 0.78 + Math.sin(ang) * dist * 0.75, 7 + rand() * 5, 0, Math.PI * 2);
    dc.fillStyle = i % 2 === 0 ? "#2e6d44" : "#1c4b2d";
    dc.fill();
  }

  for (let i = 0; i < 24; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * crownR * 0.82;
    const fx = bx + Math.cos(ang) * dist;
    const fy = by - h * 0.78 + Math.sin(ang) * dist * 0.76;
    dc.beginPath();
    dc.arc(fx, fy, 3.1, 0, Math.PI * 2);
    dc.fillStyle = blossomCol;
    dc.fill();
    dc.beginPath();
    dc.arc(fx, fy, 1.1, 0, Math.PI * 2);
    dc.fillStyle = PAL.goldBright;
    dc.fill();
  }
  dc.restore();
}

/**
 * Draws authentic `talā-kārī` gold-wash Mughal floral botanicals in the outer Muraqqa margins.
 */
function drawGoldMarginSpray(dc, cx, cy, scale, flip = 1) {
  dc.save();
  dc.translate(cx, cy);
  dc.scale(flip * scale, scale);
  dc.strokeStyle = "rgba(166, 114, 28, 0.58)";
  dc.fillStyle = "rgba(216, 166, 62, 0.25)";
  dc.lineWidth = 1.3;

  // Main S-curving botanical stem
  dc.beginPath();
  dc.moveTo(0, 72);
  dc.bezierCurveTo(-20, 32, 18, -14, 2, -62);
  dc.stroke();

  // Secondary side blossom stem
  dc.beginPath();
  dc.moveTo(-4, 18);
  dc.quadraticCurveTo(-28, -4, -26, -32);
  dc.stroke();

  // Layered Mughal tulip / poppy blossom at apex
  for (const [bx, by, bs] of [
    [2, -62, 1.0],
    [-26, -32, 0.65],
  ]) {
    dc.save();
    dc.translate(bx, by);
    dc.scale(bs, bs);
    dc.beginPath();
    dc.moveTo(0, 0);
    dc.bezierCurveTo(-18, -12, -14, -34, -4, -28);
    dc.bezierCurveTo(0, -40, 0, -40, 4, -28);
    dc.bezierCurveTo(14, -34, 18, -12, 0, 0);
    dc.fill();
    dc.stroke();
    dc.restore();
  }

  // Serrated curling acanthus/lily leaves
  for (const [lx, ly, ang] of [
    [-2, 42, -0.75],
    [6, 14, 0.68],
    [-6, -24, -0.58],
  ]) {
    dc.save();
    dc.translate(lx, ly);
    dc.rotate(ang);
    dc.beginPath();
    dc.moveTo(0, 0);
    dc.quadraticCurveTo(-8, -18, 0, -38);
    dc.quadraticCurveTo(8, -18, 0, 0);
    dc.fill();
    dc.stroke();
    dc.restore();
  }
  dc.restore();
}

/**
 * Draws the ornate vertical & horizontal Hashiya border bands with dense golden floral vines.
 * Leaves y in [385..765] completely open across x = 0..42 and x = 958..1000.
 */
function drawBakedHashiya(dc) {
  const drawHorizontalVine = (x0, x1, yMid, bandH, step, seed) => {
    dc.fillStyle = PAL.lapisDark;
    dc.fillRect(x0, yMid - bandH / 2, x1 - x0, bandH);

    // Rich triple Jadwal gold/crimson rulings
    const topY = yMid - bandH / 2;
    const botY = yMid + bandH / 2;
    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.moveTo(x0, topY + 2);
    dc.lineTo(x1, topY + 2);
    dc.moveTo(x0, botY - 2);
    dc.lineTo(x1, botY - 2);
    dc.stroke();

    dc.strokeStyle = PAL.vermilion;
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.moveTo(x0, topY + 5);
    dc.lineTo(x1, topY + 5);
    dc.moveTo(x0, botY - 5);
    dc.lineTo(x1, botY - 5);
    dc.stroke();

    // Twin interlocking golden vine waves (`islimi`)
    dc.strokeStyle = PAL.gold;
    dc.lineWidth = 1.5;
    dc.beginPath();
    for (let x = x0; x <= x1; x += 6) {
      const yy = yMid + Math.sin((x + seed) * 0.048) * (bandH * 0.25);
      if (x === x0) dc.moveTo(x, yy);
      else dc.lineTo(x, yy);
    }
    dc.stroke();

    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 1.0;
    dc.beginPath();
    for (let x = x0; x <= x1; x += 6) {
      const yy = yMid - Math.sin((x + seed) * 0.048) * (bandH * 0.23);
      if (x === x0) dc.moveTo(x, yy);
      else dc.lineTo(x, yy);
    }
    dc.stroke();

    // Delicate gold-tipped leaves & crimson micro-buds along vine
    for (let x = x0 + step * 0.5; x < x1 - 12; x += step) {
      dc.fillStyle = PAL.emeraldLight;
      dc.beginPath();
      dc.ellipse(x - 14, yMid - 7, 5.2, 2.3, -0.45, 0, Math.PI * 2);
      dc.ellipse(x + 14, yMid + 7, 5.2, 2.3, -0.45, 0, Math.PI * 2);
      dc.fill();
      dc.fillStyle = PAL.goldBright;
      dc.beginPath();
      dc.arc(x - 18, yMid + 6, 1.8, 0, Math.PI * 2);
      dc.arc(x + 18, yMid - 6, 1.8, 0, Math.PI * 2);
      dc.fill();
    }
  };

  const drawVerticalVine = (xMid, y0, y1, bandW, seed) => {
    dc.fillStyle = PAL.lapisDark;
    dc.fillRect(xMid - bandW / 2, y0, bandW, y1 - y0);

    const lx = xMid - bandW / 2;
    const rx = xMid + bandW / 2;
    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.moveTo(lx + 2, y0);
    dc.lineTo(lx + 2, y1);
    dc.moveTo(rx - 2, y0);
    dc.lineTo(rx - 2, y1);
    dc.stroke();

    dc.strokeStyle = PAL.vermilion;
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.moveTo(lx + 5, y0);
    dc.lineTo(lx + 5, y1);
    dc.moveTo(rx - 5, y0);
    dc.lineTo(rx - 5, y1);
    dc.stroke();

    dc.strokeStyle = PAL.gold;
    dc.lineWidth = 1.5;
    dc.beginPath();
    for (let y = y0; y <= y1; y += 6) {
      const xx = xMid + Math.sin((y + seed) * 0.05) * (bandW * 0.25);
      if (y === y0) dc.moveTo(xx, y);
      else dc.lineTo(xx, y);
    }
    dc.stroke();

    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 1.0;
    dc.beginPath();
    for (let y = y0; y <= y1; y += 6) {
      const xx = xMid - Math.sin((y + seed) * 0.05) * (bandW * 0.23);
      if (y === y0) dc.moveTo(xx, y);
      else dc.lineTo(xx, y);
    }
    dc.stroke();
  };

  // Outer wing horizontal ribbons across [-420..0] and [1000..1420]
  drawHorizontalVine(BLEED_LEFT, 0, 13, 26, 82, 11);
  drawHorizontalVine(1000, BLEED_RIGHT, 13, 26, 82, 37);
  drawHorizontalVine(BLEED_LEFT, 0, 987, 26, 82, 59);
  drawHorizontalVine(1000, BLEED_RIGHT, 987, 26, 82, 83);

  // Main central top & bottom Hashiya borders [0..1000]
  drawHorizontalVine(0, 1000, 19, 38, 74, 5);
  drawHorizontalVine(0, 1000, 981, 38, 74, 29);

  // Left & Right vertical Hashiya borders WITH OPEN ARCHWAY GAPS y in [385..765]!
  drawVerticalVine(21, 38, 366, 42, 17);
  drawVerticalVine(979, 38, 366, 42, 43);
  drawVerticalVine(21, 766, 962, 42, 71);
  drawVerticalVine(979, 766, 962, 42, 97);

  // Sculpted Mughal lotus arch corbel caps cleanly terminating vertical piers above y = 385
  for (const cx of [21, 979]) {
    dc.fillStyle = PAL.marble;
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.moveTo(cx - 21, 366);
    dc.lineTo(cx + 21, 366);
    dc.lineTo(cx + 24, 378);
    dc.quadraticCurveTo(cx + 12, 388, cx, 382);
    dc.quadraticCurveTo(cx - 12, 388, cx - 24, 378);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.fillStyle = PAL.goldBright;
    dc.beginPath();
    dc.arc(cx, 374, 4.5, 0, Math.PI * 2);
    dc.fill();

    // Lower sandstone threshold plinth cap starting at y = 766
    dc.fillStyle = PAL.sandLight;
    dc.fillRect(cx - 23, 765, 46, 12);
    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 1.4;
    dc.strokeRect(cx - 23, 765, 46, 12);
  }

  // Stamp all gold lotus rosettes cleanly at exact precomputed coordinates
  for (const r of HASHIYA_ROSETTES) {
    drawLotusRosette(dc, r.x, r.y, r.r, PAL.vermilion);
  }
}

/**
 * Draws recessed garden gateway piers inside x = 42..64 and x = 936..958 *above* the open road,
 * anchored cleanly to the sandstone garden wall without jutting awkwardly into the wing margins.
 */
function drawGardenGatewayPiers(dc) {
  dc.save();
  for (const [px, side] of [
    [42, 1],
    [938, -1],
  ]) {
    // Slim red-sandstone pier along inside edge of border (`y = 268..700` behind road)
    dc.fillStyle = PAL.sandMid;
    dc.fillRect(px, 268, 20, 430);
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.2;
    dc.strokeRect(px, 268, 20, 430);

    // Carved marble panel & golden lotus capital at arch springline (`y = 355..388`)
    dc.fillStyle = PAL.marble;
    dc.fillRect(px - (side < 0 ? 6 : 0), 356, 26, 20);
    dc.strokeRect(px - (side < 0 ? 6 : 0), 356, 26, 20);

    // Subtle arched sandstone bracket flaring inward at top (`y = 268..356`)
    dc.fillStyle = PAL.sandLight;
    dc.beginPath();
    dc.moveTo(px + (side > 0 ? 20 : 0), 268);
    dc.lineTo(px + (side > 0 ? 48 : -28), 268);
    dc.quadraticCurveTo(px + (side > 0 ? 28 : -8), 316, px + (side > 0 ? 20 : 0), 356);
    dc.closePath();
    dc.fill();
    dc.stroke();
  }
  dc.restore();
}

/**
 * Draws the upper 0° flat-elevation white marble Jharokha pavilion & flanking chhatri domes.
 * Positioned at x in [448..934], leaving top-left [52..415, 46..145] clear for the Title Card.
 */
function drawUpperMarblePavilion(dc) {
  dc.save();

  // Left garden boundary wall & distant cypress crowns cleanly below Title Card (y >= 175)
  dc.fillStyle = PAL.sandMid;
  dc.fillRect(42, 268, 408, 62);
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.3;
  dc.strokeRect(42, 268, 408, 62);

  // Subtle recessed blind arches along left palace garden wall
  for (const ax of [124, 232, 340]) {
    dc.fillStyle = "#7b3127";
    traceCuspedArch(dc, ax, 280, 32, 294, 326, 5);
    dc.closePath();
    dc.fill();
    dc.strokeStyle = PAL.gold;
    dc.lineWidth = 1.0;
    dc.stroke();
  }

  for (let mx = 56; mx < 440; mx += 22) {
    dc.fillStyle = PAL.marble;
    dc.beginPath();
    dc.moveTo(mx, 268);
    dc.quadraticCurveTo(mx + 8, 254, mx + 16, 268);
    dc.closePath();
    dc.fill();
    dc.stroke();
  }

  for (const [tx, th, tw] of [
    [118, 86, 24],
    [194, 95, 26],
    [318, 88, 25],
    [398, 78, 22],
  ]) {
    drawCypressTree(dc, tx, 272, th, tw);
  }

  // Main Marble Pavilion Base Terrace (y = 278..330)
  dc.fillStyle = PAL.marbleShade;
  dc.fillRect(444, 278, 492, 52);
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.4;
  dc.strokeRect(444, 278, 492, 52);

  for (let ix = 460; ix <= 916; ix += 36) {
    dc.fillStyle = PAL.vermilion;
    dc.beginPath();
    dc.arc(ix, 304, 4, 0, Math.PI * 2);
    dc.fill();
    dc.fillStyle = PAL.emerald;
    dc.fillRect(ix + 14, 301, 6, 6);
  }

  // Flanking Arcade Wings (left x=450..546, right x=794..922)
  for (const [wx, ww] of [
    [450, 96],
    [794, 128],
  ]) {
    dc.fillStyle = PAL.marble;
    dc.fillRect(wx, 146, ww, 134);
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.4;
    dc.strokeRect(wx, 146, ww, 134);

    dc.fillStyle = PAL.lapisDark;
    traceCuspedArch(dc, wx + ww / 2, 166, ww * 0.34, 198, 274, 5);
    dc.closePath();
    dc.fill();
    dc.strokeStyle = PAL.gold;
    dc.lineWidth = 1.4;
    dc.stroke();

    dc.strokeStyle = "rgba(246, 239, 224, 0.32)";
    dc.lineWidth = 1.0;
    for (let gx = wx + ww * 0.24; gx <= wx + ww * 0.76; gx += 9) {
      dc.beginPath();
      dc.moveTo(gx, 188);
      dc.lineTo(gx, 272);
      dc.stroke();
    }
    for (let gy = 194; gy <= 268; gy += 10) {
      dc.beginPath();
      dc.moveTo(wx + ww * 0.22, gy);
      dc.lineTo(wx + ww * 0.78, gy);
      dc.stroke();
    }

    // Small flanking marble Chhatri cupola
    const dcx = wx + ww / 2;
    dc.fillStyle = PAL.marble;
    dc.beginPath();
    dc.moveTo(dcx - 32, 142);
    dc.bezierCurveTo(dcx - 38, 112, dcx - 12, 95, dcx, 88);
    dc.bezierCurveTo(dcx + 12, 95, dcx + 38, 112, dcx + 32, 142);
    dc.closePath();
    dc.fill();
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.3;
    dc.stroke();

    dc.fillStyle = PAL.goldBright;
    dc.beginPath();
    dc.arc(dcx, 84, 4, 0, Math.PI * 2);
    dc.fill();
    dc.fillRect(dcx - 1.2, 68, 2.4, 16);
  }

  // Central Projecting White Marble Jharokha Balcony (x = 545..795, centered at x = 670)
  dc.fillStyle = PAL.marble;
  dc.fillRect(545, 134, 250, 146);
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.6;
  dc.strokeRect(545, 134, 250, 146);

  dc.fillStyle = "#221226";
  dc.fillRect(560, 152, 220, 102);

  dc.fillStyle = PAL.crimson;
  dc.fillRect(558, 148, 224, 20);
  dc.fillStyle = PAL.gold;
  for (let sx = 562; sx < 780; sx += 16) {
    dc.fillRect(sx, 148, 6, 20);
  }
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.2;
  dc.strokeRect(558, 148, 224, 20);

  for (const acx of [618, 722]) {
    dc.strokeStyle = PAL.marble;
    dc.lineWidth = 5;
    traceCuspedArch(dc, acx, 158, 46, 186, 252, 5);
    dc.stroke();
    dc.strokeStyle = PAL.gold;
    dc.lineWidth = 1.4;
    traceCuspedArch(dc, acx, 158, 46, 186, 252, 5);
    dc.stroke();
  }

  for (const px of [556, 666, 774]) {
    dc.fillStyle = PAL.marbleShade;
    dc.fillRect(px, 156, 10, 96);
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.2;
    dc.strokeRect(px, 156, 10, 96);
  }

  dc.fillStyle = PAL.marbleShade;
  dc.beginPath();
  dc.moveTo(532, 146);
  dc.lineTo(548, 128);
  dc.lineTo(792, 128);
  dc.lineTo(808, 146);
  dc.closePath();
  dc.fill();
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.4;
  dc.stroke();

  // Grand Ribbed Bulbous Marble Dome (`y = 74..128`) + Golden `Kalash` Finial
  dc.fillStyle = PAL.marble;
  dc.beginPath();
  dc.moveTo(612, 128);
  dc.bezierCurveTo(600, 94, 644, 76, 670, 68);
  dc.bezierCurveTo(696, 76, 740, 94, 728, 128);
  dc.closePath();
  dc.fill();
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.6;
  dc.stroke();

  dc.strokeStyle = "rgba(180, 162, 134, 0.55)";
  dc.lineWidth = 1.1;
  for (const off of [-26, -12, 0, 12, 26]) {
    dc.beginPath();
    dc.moveTo(670, 69);
    dc.quadraticCurveTo(670 + off * 1.45, 96, 670 + off * 1.9, 127);
    dc.stroke();
  }
  dc.fillStyle = PAL.gold;
  dc.beginPath();
  dc.moveTo(656, 74);
  dc.quadraticCurveTo(670, 62, 684, 74);
  dc.closePath();
  dc.fill();
  dc.fillRect(668.2, 46, 3.6, 20);
  dc.fillStyle = PAL.goldBright;
  dc.beginPath();
  dc.arc(670, 58, 5, 0, Math.PI * 2);
  dc.arc(670, 46, 3.2, 0, Math.PI * 2);
  dc.fill();

  dc.restore();
}

/**
 * Front carved marble balustrade of the Jharokha (drawn after ladies' torsos so they lean over it).
 */
function drawJharokhaBalustrade(dc) {
  dc.save();
  dc.fillStyle = PAL.marble;
  dc.fillRect(542, 248, 256, 34);
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.4;
  dc.strokeRect(542, 248, 256, 34);

  for (let bx = 562; bx <= 776; bx += 42) {
    dc.fillStyle = PAL.marbleShade;
    dc.beginPath();
    dc.moveTo(bx - 10, 282);
    dc.lineTo(bx + 10, 282);
    dc.lineTo(bx + 4, 302);
    dc.lineTo(bx - 4, 302);
    dc.closePath();
    dc.fill();
    dc.stroke();
  }

  for (let jx = 556; jx <= 778; jx += 20) {
    dc.fillStyle = PAL.sandDark;
    dc.beginPath();
    dc.moveTo(jx, 254);
    dc.lineTo(jx + 7, 264);
    dc.lineTo(jx, 274);
    dc.lineTo(jx - 7, 264);
    dc.closePath();
    dc.fill();
  }
  dc.restore();
}

/**
 * Draws the 45° oblique Charbagh garden centered under the pavilion at (672, 488),
 * plus the connected left oblique garden terrace & carpet (`x = 180..410`),
 * keeping the central lotus pool (`672, 488`) completely uncovered at Bar 2 center (`px = 500`)
 * and keeping Guard 1 (`126`) & Guard 2 (`874`) heads clear against calm emerald lawn!
 */
function drawBakedCharbagh(dc, rand) {
  dc.save();

  // Lush emerald garden bed across middle zone [42..958, 330..700]
  dc.fillStyle = PAL.emerald;
  dc.fillRect(42, 330, 916, 370);

  // Subtle inlaid sandstone diagonal garden border around the extended oblique terrace
  const fullParterre = [
    charbaghPt(-174, -174),
    charbaghPt(174, -174),
    charbaghPt(174, 195),
    charbaghPt(10, 404),
    charbaghPt(-178, 404),
  ];
  drawPolygon(dc, fullParterre, "#b9674b", PAL.ink, 1.5);

  // Four main emerald quadrants of the Charbagh + Left Royal Carpet Terrace quadrant
  const quads = [
    [-162, -28, -162, -28],
    [28, 162, -162, -28],
    [-162, -28, 28, 162],
    [28, 162, 28, 162],
    [-168, -6, 178, 392],
  ];
  for (const [u0, u1, v0, v1] of quads) {
    const pts = [
      charbaghPt(u0, v0),
      charbaghPt(u1, v0),
      charbaghPt(u1, v1),
      charbaghPt(u0, v1),
    ];
    drawPolygon(dc, pts, PAL.emerald, PAL.gold, 1.4);

    const innerPts = [
      charbaghPt(u0 + 10, v0 + 10),
      charbaghPt(u1 - 10, v0 + 10),
      charbaghPt(u1 - 10, v1 - 10),
      charbaghPt(u0 + 10, v1 - 10),
    ];
    drawPolygon(dc, innerPts, PAL.emeraldLight, "rgba(246, 239, 224, 0.32)", 1.0);
  }

  // Cruciform Lapis Lazuli Water Channels (`Nahr`) along u-axis and v-axis (v extends into left terrace!)
  const chanU = [
    charbaghPt(-174, -22),
    charbaghPt(174, -22),
    charbaghPt(174, 22),
    charbaghPt(-174, 22),
  ];
  const chanV = [
    charbaghPt(-22, -174),
    charbaghPt(22, -174),
    charbaghPt(22, 340),
    charbaghPt(-22, 340),
  ];
  drawPolygon(dc, chanU, PAL.marble, PAL.ink, 1.3);
  drawPolygon(dc, chanV, PAL.marble, PAL.ink, 1.3);

  const waterU = [
    charbaghPt(-170, -16),
    charbaghPt(170, -16),
    charbaghPt(170, 16),
    charbaghPt(-170, 16),
  ];
  const waterV = [
    charbaghPt(-16, -170),
    charbaghPt(16, -170),
    charbaghPt(16, 336),
    charbaghPt(-16, 336),
  ];
  drawPolygon(dc, waterU, PAL.lapisWater);
  drawPolygon(dc, waterV, PAL.lapisWater);

  // Central Octagonal Marble Lotus Pool (`Hauz`) at (672, 488)
  const octOuter = [];
  const octInner = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    octOuter.push({ x: 672 + Math.cos(a) * 66, y: 488 + Math.sin(a) * 37 });
    octInner.push({ x: 672 + Math.cos(a) * 55, y: 488 + Math.sin(a) * 30 });
  }
  drawPolygon(dc, octOuter, PAL.marble, PAL.ink, 1.6);
  drawPolygon(dc, octInner, PAL.lapisDark, PAL.gold, 1.4);

  // Helper for 45°-tilted Persian Garden Carpets (`Qalin`)
  const drawTiltedCarpet = (u0, u1, v0, v1, fieldCol) => {
    const cPts = [
      charbaghPt(u0, v0),
      charbaghPt(u1, v0),
      charbaghPt(u1, v1),
      charbaghPt(u0, v1),
    ];
    drawPolygon(dc, cPts, PAL.gold, PAL.ink, 1.4);

    const fPts = [
      charbaghPt(u0 + 9, v0 + 9),
      charbaghPt(u1 - 9, v0 + 9),
      charbaghPt(u1 - 9, v1 - 9),
      charbaghPt(u0 + 9, v1 - 9),
    ];
    drawPolygon(dc, fPts, fieldCol, PAL.goldBright, 1.1);

    const um = (u0 + u1) * 0.5;
    const vm = (v0 + v1) * 0.5;
    const med = [
      charbaghPt(um - 24, vm),
      charbaghPt(um, vm - 22),
      charbaghPt(um + 24, vm),
      charbaghPt(um, vm + 22),
    ];
    drawPolygon(dc, med, PAL.lapisDark, PAL.goldBright, 1.2);
    const core = [
      charbaghPt(um - 10, vm),
      charbaghPt(um, vm - 9),
      charbaghPt(um + 10, vm),
      charbaghPt(um, vm + 9),
    ];
    drawPolygon(dc, core, PAL.goldBright);

    dc.strokeStyle = PAL.marble;
    dc.lineWidth = 1.2;
    for (let s = 0.05; s <= 0.95; s += 0.08) {
      const pA = charbaghPt(lerp(u0, u1, s), v1);
      const pB = charbaghPt(lerp(u0, u1, s), v1 + 7);
      dc.beginPath();
      dc.moveTo(pA.x, pA.y);
      dc.lineTo(pB.x, pB.y);
      dc.stroke();
    }
  };

  // Left 45° Persian Carpet (shifted left so both Courtiers stay 100% unobstructed at t=50.00s!) + Right Carpet
  drawTiltedCarpet(-158, -58, 248, 376, PAL.crimson);
  drawTiltedCarpet(74, 156, -12, 84, "#7f1f2b");

  // Miniature flowering shrubs studded across all garden quadrants
  const flowerCols = [PAL.vermilion, PAL.saffron, PAL.marble, PAL.rose];
  for (let i = 0; i < 62; i++) {
    const q = quads[i % quads.length];
    const u = lerp(q[0] + 15, q[1] - 15, rand());
    const v = lerp(q[2] + 15, q[3] - 15, rand());
    if (u > -166 && u < -48 && v > 240 && v < 384) continue;
    if (u > 66 && u < 164 && v > -20 && v < 92) continue;
    const pt = charbaghPt(u, v);
    if (pt.x < 175 || pt.x > 845 || pt.y > 676) continue;
    dc.fillStyle = "#194326";
    dc.beginPath();
    dc.ellipse(pt.x, pt.y, 10, 6.5, 0, 0, Math.PI * 2);
    dc.fill();
    for (let k = 0; k < 4; k++) {
      dc.fillStyle = flowerCols[(i + k) % flowerCols.length];
      dc.beginPath();
      dc.arc(pt.x + (rand() - 0.5) * 12, pt.y - 2.5 + (rand() - 0.5) * 7, 2.4, 0, Math.PI * 2);
      dc.fill();
    }
  }

  // Carefully placed flame cypresses & flowering almond trees (ALL clear of Guard 1 & 2 silhouettes!)
  const treeList = [
    { x: 108, y: 455, kind: "cypress", h: 110, w: 28 },
    { x: 205, y: 468, kind: "flower", col: "#ef9ba8" },
    { x: 355, y: 446, kind: "cypress", h: 106, w: 27 },
    { x: 462, y: 438, kind: "flower", col: "#f08a6c" },
    { x: 540, y: 396, kind: "cypress", h: 98, w: 26 },
    { x: 786, y: 422, kind: "cypress", h: 104, w: 27 },
    { x: 896, y: 466, kind: "cypress", h: 112, w: 28 },
    { x: 242, y: 676, kind: "flower", col: "#f2a4b0" },
    { x: 734, y: 676, kind: "cypress", h: 96, w: 26 },
  ];
  treeList.sort((a, b) => a.y - b.y);
  for (const tr of treeList) {
    if (tr.kind === "cypress") drawCypressTree(dc, tr.x, tr.y, tr.h, tr.w);
    else drawFloweringTree(dc, tr.x, tr.y, 76, 26, tr.col, rand);
  }

  dc.restore();
}

/**
 * Draws the continuous 0° side-elevation red sandstone promenade (`ROAD_Y = 730`),
 * marble balustrade curb, and carved lower Mughal terrace niches (`y = 766..962`) across [-420..1420].
 */
function drawBakedCorridorAndDado(dc) {
  dc.save();
  const x0 = BLEED_LEFT;
  const x1 = BLEED_RIGHT;
  const fullW = x1 - x0;

  // Low inlaid marble & sandstone balustrade behind ROAD_Y (`y = 698..730`)
  dc.fillStyle = PAL.sandLight;
  dc.fillRect(x0, 698, fullW, 8);
  dc.fillStyle = PAL.marble;
  dc.fillRect(x0, 706, fullW, 18);
  dc.fillStyle = PAL.marbleShade;
  dc.fillRect(x0, 724, fullW, 6);
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.2;
  dc.beginPath();
  dc.moveTo(x0, 698);
  dc.lineTo(x1, 698);
  dc.moveTo(x0, 706);
  dc.lineTo(x1, 706);
  dc.moveTo(x0, 724);
  dc.lineTo(x1, 724);
  dc.stroke();

  for (let rx = x0 + 18; rx < x1; rx += 32) {
    dc.fillStyle = PAL.sandDark;
    dc.fillRect(rx - 5, 710, 10, 10);
    dc.strokeStyle = PAL.gold;
    dc.lineWidth = 0.8;
    dc.strokeRect(rx - 5, 710, 10, 10);
  }

  // Main Red Sandstone Promenade Road Deck (`ROAD_Y = 730..766`) — strictly continuous!
  dc.fillStyle = PAL.sandMid;
  dc.fillRect(x0, ROAD_Y, fullW, 36);
  dc.fillStyle = "#d98468";
  dc.fillRect(x0, ROAD_Y, fullW, 4);
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.moveTo(x0, ROAD_Y);
  dc.lineTo(x1, ROAD_Y);
  dc.moveTo(x0, ROAD_Y + 36);
  dc.lineTo(x1, ROAD_Y + 36);
  dc.stroke();

  for (let px = x0; px < x1; px += 90) {
    dc.strokeStyle = "rgba(74, 24, 18, 0.55)";
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.moveTo(px, ROAD_Y + 4);
    dc.lineTo(px - 18, ROAD_Y + 36);
    dc.stroke();

    dc.fillStyle = PAL.marble;
    dc.beginPath();
    dc.moveTo(px + 45, ROAD_Y + 12);
    dc.lineTo(px + 54, ROAD_Y + 20);
    dc.lineTo(px + 45, ROAD_Y + 28);
    dc.lineTo(px + 36, ROAD_Y + 20);
    dc.closePath();
    dc.fill();
    dc.strokeStyle = PAL.goldDeep;
    dc.lineWidth = 0.8;
    dc.stroke();
  }

  // Lower Carved Sandstone Terrace Retaining Wall & Blind Arch Niches (`y = 766..962`)
  dc.fillStyle = PAL.sandDark;
  dc.fillRect(x0, 766, fullW, 200);
  dc.fillStyle = PAL.sandMid;
  dc.fillRect(x0, 772, fullW, 14);
  dc.strokeStyle = PAL.gold;
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.moveTo(x0, 772);
  dc.lineTo(x1, 772);
  dc.moveTo(x0, 786);
  dc.lineTo(x1, 786);
  dc.stroke();

  // Horizontal plinth molding strip at bottom above Hashiya
  dc.fillStyle = PAL.sandMid;
  dc.fillRect(x0, 948, fullW, 14);

  for (let nx = -360; nx <= 1360; nx += 140) {
    if ((nx > -35 && nx < 75) || (nx > 925 && nx < 1035)) continue;

    dc.fillStyle = "#481c17";
    traceCuspedArch(dc, nx, 804, 34, 836, 938, 5);
    dc.closePath();
    dc.fill();
    dc.strokeStyle = PAL.gold;
    dc.lineWidth = 1.5;
    dc.stroke();

    if (Math.abs(Math.round(nx / 140)) % 2 === 0) {
      dc.fillStyle = PAL.gold;
      dc.strokeStyle = PAL.ink;
      dc.lineWidth = 1.1;
      dc.beginPath();
      dc.ellipse(nx, 902, 16, 22, 0, 0, Math.PI * 2);
      dc.fill();
      dc.stroke();
      dc.fillRect(nx - 4, 854, 8, 30);
      dc.strokeRect(nx - 4, 854, 8, 30);
      dc.fillStyle = PAL.goldBright;
      dc.beginPath();
      dc.ellipse(nx - 4, 896, 4, 10, -0.2, 0, Math.PI * 2);
      dc.fill();
      dc.fillStyle = PAL.marble;
      dc.fillRect(nx - 14, 924, 28, 7);
    } else {
      dc.fillStyle = PAL.marble;
      dc.fillRect(nx - 24, 834, 48, 92);
      dc.strokeStyle = PAL.goldDeep;
      dc.lineWidth = 1.1;
      dc.strokeRect(nx - 24, 834, 48, 92);
      dc.strokeStyle = PAL.emerald;
      dc.lineWidth = 1.8;
      dc.beginPath();
      dc.moveTo(nx, 916);
      dc.quadraticCurveTo(nx - 6, 882, nx, 856);
      dc.stroke();
      dc.fillStyle = PAL.vermilion;
      dc.beginPath();
      dc.arc(nx, 854, 8, 0, Math.PI * 2);
      dc.arc(nx - 11, 874, 5.5, 0, Math.PI * 2);
      dc.arc(nx + 11, 878, 5.5, 0, Math.PI * 2);
      dc.fill();
    }
  }

  dc.restore();
}

/**
 * Pre-bakes the entire static Mughal imperial folio, Hashiya gold borders,
 * upper marble pavilion, middle 45° Charbagh, and lower sandstone promenade.
 */
function bakeMughalBackdrop(pg) {
  const dc = pg.drawingContext;
  const rand = prng(16009);

  dc.save();
  dc.translate(-BLEED_LEFT, 0);

  // 1. Warm aged `wasli` paper base across full 1840x1000 bleed
  dc.fillStyle = PAL.margin;
  dc.fillRect(BLEED_LEFT, 0, BUFFER_W, BUFFER_H);

  // Subtle `zar-afshan` gold-leaf dust speckles across wings
  for (let i = 0; i < 1050; i++) {
    const sx = BLEED_LEFT + rand() * BUFFER_W;
    const sy = rand() * BUFFER_H;
    const isGold = rand() > 0.6;
    dc.fillStyle = isGold ? "rgba(218, 168, 56, 0.30)" : "rgba(145, 105, 58, 0.08)";
    dc.beginPath();
    dc.arc(sx, sy, isGold ? 1.1 + rand() * 1.4 : 2 + rand() * 6, 0, Math.PI * 2);
    dc.fill();
  }

  // 2. Outer Muraqqa gold-ink (`talā-kārī`) botanical marginalia in left & right wings
  for (const [mx, my, ms, fl] of [
    [-335, 165, 1.05, 1],
    [-125, 210, 0.95, -1],
    [-260, 420, 1.12, 1],
    [-95, 505, 0.85, -1],
    [-335, 615, 0.92, 1],
    [1105, 190, 0.95, 1],
    [1315, 175, 1.08, -1],
    [1255, 430, 1.12, -1],
    [1085, 500, 0.88, 1],
    [1330, 620, 0.9, -1],
  ]) {
    drawGoldMarginSpray(dc, mx, my, ms, fl);
  }

  // Wing garden cypresses above promenade (clear of left flag-bearer at x=-245)
  for (const wx of [-315, -110, 1095, 1285]) {
    drawCypressTree(dc, wx, 698, 168, 38);
  }

  // 3. Central miniature sky wash: subtle lapis-blue upper glow grading softly into warm gold-parchment
  // (Kept light & calm behind Title Card [52..408, 46..136]!)
  const skyGrad = dc.createLinearGradient(0, 38, 0, 330);
  skyGrad.addColorStop(0, "#b8c7ce");
  skyGrad.addColorStop(0.28, "#d9d0b4");
  skyGrad.addColorStop(0.62, "#ebd9b4");
  skyGrad.addColorStop(1, "#f2e4c5");
  dc.fillStyle = skyGrad;
  dc.fillRect(42, 38, 916, 294);

  // Delicate Chinese-inspired Mughal swirling golden cloud ribbons (`Abr`) in upper-right sky
  dc.strokeStyle = "rgba(186, 134, 42, 0.68)";
  dc.fillStyle = "rgba(250, 244, 228, 0.72)";
  dc.lineWidth = 1.3;
  for (const [cx, cy, s] of [
    [825, 84, 1.0],
    [905, 112, 0.76],
  ]) {
    dc.save();
    dc.translate(cx, cy);
    dc.scale(s, s);
    dc.beginPath();
    dc.moveTo(-42, 6);
    dc.bezierCurveTo(-24, -14, -4, -14, 6, -2);
    dc.bezierCurveTo(18, -18, 42, -10, 38, 6);
    dc.bezierCurveTo(22, 14, -16, 14, -42, 6);
    dc.fill();
    dc.stroke();
    dc.restore();
  }

  // 4. Upper Layer (0° front elevation): Marble Jharokha & Chhatris
  drawUpperMarblePavilion(dc);

  // 5. Middle Layer (45° oblique bird's-eye): Charbagh, Cypresses, Fountain Basin, Carpets
  drawBakedCharbagh(dc, rand);

  // 6. Lower Layer (0° flat corridor): Balustrade, Continuous ROAD_Y=730 Sandstone, Lower Niches
  drawBakedCorridorAndDado(dc);

  // 7. Recessed garden gateway piers cleanly anchoring the archway edges inside [42..958]
  drawGardenGatewayPiers(dc);

  // 8. Ornate Hashiya Borders (Top, Bottom, and Left/Right with Open Gateway Gaps y in [385..765])
  drawBakedHashiya(dc);

  dc.restore();
}

/**
 * Draws a Mughal miniature profile face with aquiline nose, arched brow, and live eye-pupil tracking.
 */
function drawMughalFace(dc, headX, headY, headAngle, faceDir, targetX, targetY, lockStrength, opts = {}) {
  const skinCol = opts.skin || "#dfae82";
  const turbanCol = opts.turban || PAL.vermilion;
  const turbanTrim = opts.turbanTrim || PAL.goldBright;
  const beard = Boolean(opts.beard);
  const woman = Boolean(opts.woman);

  dc.save();
  dc.translate(headX, headY);
  dc.rotate(headAngle);

  dc.save();
  dc.scale(faceDir, 1);

  dc.fillStyle = skinCol;
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.2;
  dc.beginPath();
  dc.moveTo(-7, -10);
  dc.quadraticCurveTo(6, -12, 9, -2);
  dc.lineTo(13, 2);
  dc.lineTo(9, 4);
  dc.lineTo(9, 9);
  dc.quadraticCurveTo(5, 13, -3, 11);
  dc.quadraticCurveTo(-10, 6, -7, -10);
  dc.closePath();
  dc.fill();
  dc.stroke();

  if (beard) {
    dc.fillStyle = "#e8e3d8";
    dc.beginPath();
    dc.moveTo(9, 5);
    dc.quadraticCurveTo(12, 16, 2, 19);
    dc.quadraticCurveTo(-6, 15, -4, 8);
    dc.closePath();
    dc.fill();
    dc.stroke();
  }

  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.3;
  dc.beginPath();
  dc.moveTo(1, -5);
  dc.quadraticCurveTo(5, -7.5, 9, -4.5);
  dc.stroke();

  dc.fillStyle = "#fcfaf4";
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.0;
  dc.beginPath();
  dc.ellipse(5, -2, 3.6, 2.3, 0, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  const dxWorld = targetX - headX;
  const dyWorld = targetY - headY;
  const dist = Math.hypot(dxWorld, dyWorld) || 1;
  const ux = dxWorld / dist;
  const uy = dyWorld / dist;
  const cosA = Math.cos(-headAngle);
  const sinA = Math.sin(-headAngle);
  const lx = (ux * cosA - uy * sinA) * faceDir;
  const ly = ux * sinA + uy * cosA;
  const pupX = 5 + lerp(0.8, clamp(lx * 1.9, -1.6, 1.8), lockStrength);
  const pupY = -2 + lerp(0.0, clamp(ly * 1.4, -1.1, 1.2), lockStrength);

  dc.fillStyle = "#1a1412";
  dc.beginPath();
  dc.arc(pupX, pupY, 1.6, 0, Math.PI * 2);
  dc.fill();

  if (woman) {
    dc.fillStyle = "#1b1414";
    dc.beginPath();
    dc.arc(-5, -2, 6, 0, Math.PI * 2);
    dc.fill();

    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 1.1;
    dc.beginPath();
    dc.arc(10.5, 4.5, 3.2, 0, Math.PI * 2);
    dc.stroke();

    dc.fillStyle = "rgba(255, 246, 224, 0.58)";
    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.moveTo(-2, -11);
    dc.quadraticCurveTo(-15, -6, -14, 16);
    dc.lineTo(-4, 14);
    dc.closePath();
    dc.fill();
    dc.stroke();
  } else {
    dc.fillStyle = turbanCol;
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.ellipse(-1, -10, 12.5, 8.5, -0.18, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();

    dc.strokeStyle = turbanTrim;
    dc.lineWidth = 1.8;
    dc.beginPath();
    dc.moveTo(-10, -8);
    dc.quadraticCurveTo(0, -14, 9, -6);
    dc.stroke();

    if (opts.plume) {
      dc.strokeStyle = PAL.goldBright;
      dc.lineWidth = 1.5;
      dc.beginPath();
      dc.moveTo(4, -16);
      dc.quadraticCurveTo(0, -25, -7, -26);
      dc.stroke();
    }
  }

  dc.restore();
  dc.restore();
}

/**
 * Animated lapis canal ripples, swaying lotus blossoms, and beating central golden fountain jets at (672, 488).
 */
function drawAnimatedWaterAndFountain(g, u, beat) {
  const dc = g.drawingContext;
  dc.save();

  dc.strokeStyle = "rgba(220, 238, 252, 0.55)";
  dc.lineWidth = 1.4;
  dc.lineCap = "round";
  const flowShift = (u * 38) % 44;

  // U-channel ripples [-165..165]
  for (const dir of [-1, 1]) {
    for (let d = 52; d <= 156; d += 44) {
      const dist = d + flowShift * 0.85;
      if (dist > 165) continue;
      const cu = charbaghPt(dir * dist, 0);
      const cuL = charbaghPt(dir * (dist - 8), -8);
      const cuR = charbaghPt(dir * (dist - 8), 8);
      dc.beginPath();
      dc.moveTo(cuL.x, cuL.y);
      dc.lineTo(cu.x, cu.y);
      dc.lineTo(cuR.x, cuR.y);
      dc.stroke();
    }
  }
  // V-channel ripples [-165..325]
  for (const [dStart, dEnd, dir] of [
    [52, 165, -1],
    [52, 325, 1],
  ]) {
    for (let d = dStart; d <= dEnd; d += 44) {
      const dist = d + flowShift * 0.85;
      if (dist > dEnd) continue;
      const cv = charbaghPt(0, dir * dist);
      const cvL = charbaghPt(-8, dir * (dist - 8));
      const cvR = charbaghPt(8, dir * (dist - 8));
      dc.beginPath();
      dc.moveTo(cvL.x, cvL.y);
      dc.lineTo(cv.x, cv.y);
      dc.lineTo(cvR.x, cvR.y);
      dc.stroke();
    }
  }

  // Floating lotus pads & blossoms in central octagonal pool (672, 488)
  const bob = Math.sin(u * 2.6) * 1.4;
  for (const [lx, ly, col] of [
    [640, 486 + bob, "#f4889a"],
    [705, 488 - bob, "#f9ced6"],
    [658, 504 - bob * 0.7, "#f4889a"],
    [688, 472 + bob * 0.7, "#f9ced6"],
  ]) {
    dc.fillStyle = "#286b42";
    dc.beginPath();
    dc.ellipse(lx, ly + 3, 9, 5, 0, 0, Math.PI * 2);
    dc.fill();
    dc.fillStyle = col;
    dc.beginPath();
    dc.moveTo(lx - 5.5, ly + 1);
    dc.quadraticCurveTo(lx - 2.5, ly - 7.5, lx, ly - 8.5);
    dc.quadraticCurveTo(lx + 2.5, ly - 7.5, lx + 5.5, ly + 1);
    dc.closePath();
    dc.fill();
    dc.fillStyle = PAL.goldBright;
    dc.beginPath();
    dc.arc(lx, ly - 2, 1.6, 0, Math.PI * 2);
    dc.fill();
  }

  // Tiered Golden Mughal Fountain (`Fawara`) at center (672, 488)
  dc.fillStyle = PAL.gold;
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.2;
  dc.fillRect(668, 458, 8, 28);
  dc.strokeRect(668, 458, 8, 28);
  dc.beginPath();
  dc.ellipse(672, 471, 15, 6.5, 0, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.beginPath();
  dc.ellipse(672, 456, 9.5, 4.5, 0, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  const sprayH = 26 + beat.beatPulse * 10;
  dc.strokeStyle = "rgba(232, 246, 255, 0.88)";
  dc.lineWidth = 1.6;
  for (const side of [-1, 1]) {
    dc.beginPath();
    dc.moveTo(672, 454);
    dc.quadraticCurveTo(672 + side * 12, 454 - sprayH, 672 + side * 23, 480);
    dc.stroke();
    dc.beginPath();
    dc.moveTo(672, 454);
    dc.quadraticCurveTo(672 + side * 6, 454 - sprayH * 0.72, 672 + side * 14, 470);
    dc.stroke();
  }
  dc.fillStyle = "#ffffff";
  for (let i = 0; i < 6; i++) {
    const phase = (u * 2.2 + i * 0.17) % 1;
    const dx = (i % 2 === 0 ? 1 : -1) * (6 + phase * 20);
    const dy = -sprayH * Math.sin(phase * Math.PI);
    dc.beginPath();
    dc.arc(672 + dx, 458 + dy + phase * 20, 1.8, 0, Math.PI * 2);
    dc.fill();
  }

  dc.restore();
}

/**
 * Layer 1 (Top 0° Elevation): 2 Jharokha balcony ladies leaning down from straight above!
 * Arms extend cleanly *over* the marble balustrade in Bar 2 so the top-down pointing reads unmistakably.
 */
function drawBalconyLadies(g, u, beat, px, lockStrength) {
  const dc = g.drawingContext;
  const targetY = ROAD_Y - 170;

  const ladies = [
    { x: 618, y: 248, robe: PAL.emerald, skin: "#eab98c" },
    { x: 722, y: 248, robe: PAL.vermilion, skin: "#e5b286" },
  ];

  // 1. Torso & head behind balustrade
  dc.save();
  const poseState = [];
  for (let i = 0; i < ladies.length; i++) {
    const ld = ladies[i];
    const leanForward = lockStrength * 11;
    const idleBob = (1 - lockStrength) * Math.sin(u * Math.PI * 2 + i) * 2;
    const sx = ld.x;
    const sy = ld.y + leanForward + idleBob;

    dc.fillStyle = ld.robe;
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.moveTo(sx - 18, sy + 6);
    dc.lineTo(sx - 14, sy - 30);
    dc.quadraticCurveTo(sx, sy - 37, sx + 14, sy - 30);
    dc.lineTo(sx + 18, sy + 6);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 1.7;
    dc.beginPath();
    dc.arc(sx, sy - 25, 9.5, 0.2, Math.PI - 0.2);
    dc.stroke();

    const dx = px - sx;
    const dy = targetY - (sy - 42);
    const lookDownAngle = Math.atan2(dy, dx);
    const faceDir = lockStrength > 0.35 ? (dx >= 0 ? 1 : -1) : i === 0 ? 1 : -1;
    const headPitch =
      lockStrength * clamp((faceDir === 1 ? lookDownAngle : Math.PI - lookDownAngle) * 0.48, 0.18, 0.65) * faceDir;

    drawMughalFace(dc, sx, sy - 44, headPitch, faceDir, px, targetY, lockStrength, {
      skin: ld.skin,
      woman: true,
    });

    poseState.push({ ld, sx, sy, faceDir });
  }

  // 2. Balustrade rail
  drawJharokhaBalustrade(dc);

  // 3. Arms & props drawn OVER the balustrade edge with sleeved contrast so downward pointing pops cleanly!
  for (let i = 0; i < poseState.length; i++) {
    const { ld, sx, sy, faceDir } = poseState[i];
    dc.lineCap = "round";

    if (i === 0) {
      if (lockStrength > 0.25) {
        const shX = sx + faceDir * 6;
        const shY = sy - 16;
        const pAng = Math.atan2(targetY - shY, px - shX);
        const reach = lerp(24, 42, lockStrength);
        const wrX = shX + Math.cos(pAng) * (reach - 8);
        const wrY = shY + Math.sin(pAng) * (reach - 8);
        const hx = shX + Math.cos(pAng) * reach;
        const hy = shY + Math.sin(pAng) * reach;
        // Ink-outlined emerald silk sleeve + hand
        dc.strokeStyle = PAL.ink;
        dc.lineWidth = 7.4;
        dc.beginPath();
        dc.moveTo(shX, shY);
        dc.lineTo(wrX, wrY);
        dc.stroke();
        dc.strokeStyle = ld.robe;
        dc.lineWidth = 5.2;
        dc.stroke();

        dc.strokeStyle = PAL.ink;
        dc.lineWidth = 5.4;
        dc.beginPath();
        dc.moveTo(wrX, wrY);
        dc.lineTo(hx, hy);
        dc.stroke();
        dc.strokeStyle = ld.skin;
        dc.lineWidth = 3.4;
        dc.stroke();

        dc.strokeStyle = PAL.goldBright;
        dc.lineWidth = 2.0;
        dc.beginPath();
        dc.arc(wrX, wrY, 2.8, 0, Math.PI * 2);
        dc.stroke();
      } else {
        const wave = Math.sin(u * Math.PI * 2) * 0.25;
        dc.strokeStyle = ld.skin;
        dc.lineWidth = 4.6;
        dc.beginPath();
        dc.moveTo(sx + 10, sy - 18);
        dc.lineTo(sx + 26, sy - 32 + wave * 12);
        dc.stroke();
        dc.fillStyle = PAL.emerald;
        dc.beginPath();
        dc.ellipse(sx + 29, sy - 42 + wave * 12, 8, 12, wave, 0, Math.PI * 2);
        dc.fill();
        dc.fillStyle = PAL.lapisMid;
        dc.beginPath();
        dc.arc(sx + 29, sy - 44 + wave * 12, 3.2, 0, Math.PI * 2);
        dc.fill();
      }
    } else {
      if (lockStrength > 0.25) {
        const shX = sx - 8;
        const shY = sy - 18;
        dc.strokeStyle = PAL.ink;
        dc.lineWidth = 6.2;
        dc.beginPath();
        dc.moveTo(shX, shY);
        dc.lineTo(sx - 18, sy - 35);
        dc.stroke();
        dc.strokeStyle = ld.skin;
        dc.lineWidth = 4.2;
        dc.stroke();

        // Forward vermilion-sleeved arm resting over balustrade edge
        dc.strokeStyle = PAL.ink;
        dc.lineWidth = 6.8;
        dc.beginPath();
        dc.moveTo(sx + 10, sy - 16);
        dc.lineTo(sx + 14, sy + 7);
        dc.stroke();
        dc.strokeStyle = ld.robe;
        dc.lineWidth = 4.6;
        dc.stroke();
      } else {
        dc.strokeStyle = ld.skin;
        dc.lineWidth = 4.6;
        dc.beginPath();
        dc.moveTo(sx - 10, sy - 18);
        dc.lineTo(sx - 20, sy - 16);
        dc.stroke();
        dc.fillStyle = PAL.goldBright;
        dc.beginPath();
        dc.ellipse(sx + 14, sy - 12, 4, 6, 0, 0, Math.PI * 2);
        dc.fill();
      }
    }
  }

  void beat;
  dc.restore();
}

/**
 * Layer 2 (Middle 45° Oblique Charbagh): 2 courtiers on left tilted carpet + 1 sitar musician on right carpet.
 */
function drawCharbaghFigures(g, u, beat, px, lockStrength) {
  const dc = g.drawingContext;
  const targetY = ROAD_Y - 140;

  // 1 & 2: Courtiers on Left 45° Persian Carpet (`x = 278, 358`, 100% clear of Pelican at u=3.0!)
  const c1 = charbaghPt(-148, 332);
  const c2 = charbaghPt(-94, 290);
  // 3: Seated Sitar Musician on Right 45° Persian Carpet (`x = 762, y = 550`, clear of Pelican & Guard 2!)
  const m1 = charbaghPt(126, 20);

  dc.save();

  const courtiers = [
    {
      x: c1.x,
      y: c1.y,
      jama: PAL.saffron,
      turban: PAL.crimson,
      idleDir: 1,
      beard: false,
      prop: "scroll",
    },
    {
      x: c2.x,
      y: c2.y,
      jama: PAL.lapisMid,
      turban: PAL.gold,
      idleDir: -1,
      beard: true,
      prop: "katar",
    },
  ];

  for (let i = 0; i < courtiers.length; i++) {
    const cr = courtiers[i];
    const x = cr.x;
    const y = cr.y;
    const dx = px - x;
    const faceDir = lockStrength > 0.3 ? (dx >= 0 ? 1 : -1) : cr.idleDir;
    const bob = (1 - lockStrength) * beat.beatPulse * 1.8;

    dc.fillStyle = "rgba(24, 14, 12, 0.25)";
    dc.beginPath();
    dc.ellipse(x, y + 2, 16, 6, 0, 0, Math.PI * 2);
    dc.fill();

    dc.fillStyle = "#f2e5cb";
    dc.fillRect(x - 7, y - 16, 5, 16);
    dc.fillRect(x + 2, y - 16, 5, 16);

    dc.fillStyle = cr.jama;
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.moveTo(x - 10, y - 62 + bob);
    dc.lineTo(x + 10, y - 62 + bob);
    dc.lineTo(x + 19, y - 12 + bob);
    dc.quadraticCurveTo(x, y - 6 + bob, x - 19, y - 12 + bob);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.fillStyle = PAL.goldBright;
    dc.fillRect(x - 10, y - 42 + bob, 20, 5);
    dc.fillStyle = PAL.vermilion;
    dc.fillRect(x - 4, y - 37 + bob, 8, 18);

    const headX = x;
    const headY = y - 74 + bob;
    const aimAngle = Math.atan2(targetY - headY, px - headX);
    const headPitch =
      lockStrength * clamp((faceDir === 1 ? aimAngle : Math.PI - aimAngle) * 0.42, -0.25, 0.48) * faceDir;

    drawMughalFace(dc, headX, headY, headPitch, faceDir, px, targetY, lockStrength, {
      turban: cr.turban,
      turbanTrim: PAL.goldBright,
      beard: cr.beard,
      plume: i === 0,
    });

    dc.strokeStyle = "#dfae82";
    dc.lineWidth = 4.2;
    dc.lineCap = "round";
    if (lockStrength > 0.25) {
      const shX = x + faceDir * 7;
      const shY = y - 54 + bob;
      const pAng = Math.atan2(targetY - shY, px - shX);
      const reach = lerp(16, 30, lockStrength);
      dc.beginPath();
      dc.moveTo(shX, shY);
      dc.lineTo(shX + Math.cos(pAng) * reach, shY + Math.sin(pAng) * reach);
      dc.stroke();
    } else {
      dc.beginPath();
      dc.moveTo(x + faceDir * 7, y - 54 + bob);
      dc.lineTo(x + faceDir * 20, y - 44 + bob);
      dc.stroke();
    }

    if (cr.prop === "scroll") {
      dc.fillStyle = PAL.marble;
      dc.strokeStyle = PAL.goldDeep;
      dc.lineWidth = 1.2;
      dc.save();
      dc.translate(x - faceDir * 11, y - 44 + bob);
      dc.rotate(-0.3 * faceDir);
      dc.fillRect(-3, -10, 6, 20);
      dc.strokeRect(-3, -10, 6, 20);
      dc.restore();
    }
  }

  // --- Seated Sitar Musician on Right 45° Carpet ---
  {
    const x = m1.x;
    const y = m1.y;
    const dx = px - x;
    const faceDir = lockStrength > 0.2 ? (dx >= 0 ? 1 : -1) : -1;
    const freezeFactor = 1 - smoothstep(1.85, 2.02, u) * (1 - smoothstep(4.25, 4.7, u));
    const strum = freezeFactor * Math.sin(u * Math.PI * 4) * 5;
    const headBob = freezeFactor * beat.beatPulse * 2.5;

    dc.fillStyle = "rgba(24, 14, 12, 0.28)";
    dc.beginPath();
    dc.ellipse(x, y + 3, 24, 8, 0, 0, Math.PI * 2);
    dc.fill();

    dc.fillStyle = PAL.rose;
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.moveTo(x - 12, y - 42);
    dc.lineTo(x + 12, y - 42);
    dc.lineTo(x + 22, y - 4);
    dc.quadraticCurveTo(x, y + 4, x - 22, y - 4);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.fillStyle = PAL.goldBright;
    dc.fillRect(x - 11, y - 24, 22, 4.5);

    dc.save();
    dc.translate(x, y - 20);
    dc.rotate(lerp(-0.42, -0.18, lockStrength));
    dc.fillStyle = "#c97b32";
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.arc(-14, 6, 11, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
    dc.fillStyle = "#6c391b";
    dc.fillRect(-10, -2, 44, 5);
    dc.strokeRect(-10, -2, 44, 5);
    if (freezeFactor > 0.35 && beat.beatPulse > 0.35) {
      dc.strokeStyle = `rgba(247, 212, 112, ${freezeFactor * beat.beatPulse * 0.85})`;
      dc.lineWidth = 1.4;
      dc.beginPath();
      dc.arc(-14, 6, 17, -1.2, 0.5);
      dc.stroke();
    }
    dc.restore();

    dc.strokeStyle = "#dfae82";
    dc.lineWidth = 4;
    dc.lineCap = "round";
    dc.beginPath();
    dc.moveTo(x + 8, y - 34);
    dc.lineTo(x - 4, y - 18 + strum);
    dc.stroke();

    const headX = x;
    const headY = y - 54 + headBob;
    const aimAngle = Math.atan2(targetY - headY, px - headX);
    const headPitch =
      lockStrength * clamp((faceDir === 1 ? aimAngle : Math.PI - aimAngle) * 0.38, -0.25, 0.44) * faceDir;

    drawMughalFace(dc, headX, headY, headPitch, faceDir, px, targetY, lockStrength, {
      turban: PAL.emerald,
      turbanTrim: PAL.goldBright,
      plume: false,
    });
  }

  dc.restore();
}

/**
 * Layer 3 (Bottom 0° Side Profile along ROAD_Y = 730):
 * Palace guards flanking the sandstone corridor, aiming horizontally at the Pelican in Bar 2.
 */
function drawCorridorGuards(g, u, beat, px, lockStrength) {
  const dc = g.drawingContext;
  const targetY = ROAD_Y - 130;

  const guards = [
    { x: 126, y: 724, baseDir: 1, tunic: PAL.crimson, weapon: "spear" },
    { x: 874, y: 724, baseDir: -1, tunic: PAL.emerald, weapon: "halberd" },
    { x: -245, y: 724, baseDir: 1, tunic: PAL.lapisMid, weapon: "standard" },
    { x: 1190, y: 724, baseDir: -1, tunic: PAL.saffron, weapon: "trumpet" },
  ];

  dc.save();
  for (const gd of guards) {
    const x = gd.x;
    const y = gd.y;
    const dx = px - x;
    const localLock =
      x > 0 && x < 1000
        ? lockStrength
        : smoothstep(0.15, 0.45, clamp(1 - Math.abs(dx) / 480, 0, 1));
    const faceDir = localLock > 0.25 ? (dx >= 0 ? 1 : -1) : gd.baseDir;

    dc.fillStyle = PAL.ink;
    dc.fillRect(x - 10, y - 8, 8, 8);
    dc.fillRect(x + 2, y - 8, 8, 8);

    dc.fillStyle = PAL.marbleShade;
    dc.fillRect(x - 8, y - 34, 6, 26);
    dc.fillRect(x + 2, y - 34, 6, 26);

    dc.fillStyle = gd.tunic;
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.moveTo(x - 12, y - 72);
    dc.lineTo(x + 12, y - 72);
    dc.lineTo(x + 16, y - 24);
    dc.lineTo(x - 16, y - 24);
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.fillStyle = PAL.gold;
    dc.fillRect(x - 12, y - 50, 24, 5);
    dc.beginPath();
    dc.arc(x, y - 60, 6.5, 0, Math.PI * 2);
    dc.fill();

    dc.fillStyle = "#2b1c18";
    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 1.4;
    dc.beginPath();
    dc.arc(x - faceDir * 10, y - 52, 12, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
    dc.fillStyle = PAL.goldBright;
    for (const [bx, by] of [
      [-4, -4],
      [4, -4],
      [-4, 4],
      [4, 4],
    ]) {
      dc.beginPath();
      dc.arc(x - faceDir * 10 + bx, y - 52 + by, 1.4, 0, Math.PI * 2);
      dc.fill();
    }

    const headX = x;
    const headY = y - 84;
    const aimAngle = Math.atan2(targetY - headY, px - headX);
    const headPitch =
      localLock * clamp((faceDir === 1 ? aimAngle : Math.PI - aimAngle) * 0.25, -0.25, 0.2) * faceDir;

    drawMughalFace(dc, headX, headY, headPitch, faceDir, px, targetY, localLock, {
      turban: PAL.gold,
      turbanTrim: PAL.crimson,
      beard: gd.weapon === "halberd",
    });

    dc.save();
    const weapX = x + faceDir * 13;
    if (gd.weapon === "spear" || gd.weapon === "halberd") {
      const tilt = localLock * faceDir * 0.24;
      dc.translate(weapX, y - 48);
      dc.rotate(tilt);
      dc.strokeStyle = "#5a321a";
      dc.lineWidth = 3.2;
      dc.beginPath();
      dc.moveTo(0, 46);
      dc.lineTo(0, -68);
      dc.stroke();

      dc.fillStyle = PAL.goldBright;
      dc.strokeStyle = PAL.ink;
      dc.lineWidth = 1.1;
      if (gd.weapon === "spear") {
        dc.beginPath();
        dc.moveTo(0, -86);
        dc.lineTo(-5, -66);
        dc.lineTo(5, -66);
        dc.closePath();
        dc.fill();
        dc.stroke();
      } else {
        dc.beginPath();
        dc.moveTo(0, -66);
        dc.quadraticCurveTo(faceDir * 16, -60, 0, -48);
        dc.closePath();
        dc.fill();
        dc.stroke();
      }
    } else if (gd.weapon === "standard") {
      dc.strokeStyle = PAL.gold;
      dc.lineWidth = 3.2;
      dc.beginPath();
      dc.moveTo(weapX, y);
      dc.lineTo(weapX, y - 135);
      dc.stroke();
      const wave = Math.sin(u * 4.5) * 4;
      dc.fillStyle = PAL.vermilion;
      dc.beginPath();
      dc.moveTo(weapX, y - 132);
      dc.quadraticCurveTo(weapX + 26, y - 128 + wave, weapX + 48, y - 118 - wave);
      dc.lineTo(weapX, y - 102);
      dc.closePath();
      dc.fill();
      dc.strokeStyle = PAL.goldBright;
      dc.lineWidth = 1.4;
      dc.stroke();
    } else if (gd.weapon === "trumpet") {
      const hornDrop = localLock * 0.45;
      dc.translate(x + faceDir * 8, y - 74);
      dc.rotate(hornDrop * faceDir);
      dc.fillStyle = PAL.goldBright;
      dc.strokeStyle = PAL.ink;
      dc.lineWidth = 1.1;
      dc.beginPath();
      dc.moveTo(0, 0);
      dc.lineTo(faceDir * 44, -8);
      dc.lineTo(faceDir * 44, 6);
      dc.closePath();
      dc.fill();
      dc.stroke();
    }
    dc.restore();

    if (localLock > 0.25 && (gd.weapon === "spear" || gd.weapon === "halberd")) {
      const shX = x + faceDir * 5;
      const shY = y - 62;
      const pAng = Math.atan2(targetY - shY, px - shX);
      const reach = lerp(14, 30, localLock);
      dc.strokeStyle = gd.tunic;
      dc.lineWidth = 4.6;
      dc.lineCap = "round";
      dc.beginPath();
      dc.moveTo(shX, shY);
      dc.lineTo(shX + Math.cos(pAng) * reach, shY + Math.sin(pAng) * reach);
      dc.stroke();
    }
  }

  void beat;
  dc.restore();
}

/**
 * Renders the Imperial Mughal Pelican & Golden Bicycle:
 * - Ivory feathers with hair-fine gold edging & scalloped wing plumage;
 * - Faceted ruby & pearl plumed turban (`Sarpech` + `kalgi`);
 * - Burnished gold frame, Mughal star chainring, crimson velvet saddle, and 12-spoke carved filigree wheels.
 */
function drawMughalPelicanRig(g, pose, u, beat) {
  const dc = g.drawingContext;
  const s = pose.scale;

  const drawOrnateWheel = (hub) => {
    dc.save();
    dc.translate(hub.x, hub.y);

    // Outer dark lapis-ebony tire + inner burnished gold rim band
    dc.beginPath();
    dc.arc(0, 0, pose.wheelRadius, 0, Math.PI * 2);
    dc.strokeStyle = "#192136";
    dc.lineWidth = 6.2 * s;
    dc.stroke();

    dc.beginPath();
    dc.arc(0, 0, pose.wheelRadius - 4.2 * s, 0, Math.PI * 2);
    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 2.0 * s;
    dc.stroke();

    // Inner decorative brass tracery ring
    dc.beginPath();
    dc.arc(0, 0, pose.wheelRadius * 0.56, 0, Math.PI * 2);
    dc.strokeStyle = "rgba(212, 155, 53, 0.72)";
    dc.lineWidth = 1.4 * s;
    dc.stroke();

    // 12 Carved Mughal gold filigree spokes with lotus-petal tips
    for (let i = 0; i < 12; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 6;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const rIn = 10 * s;
      const rOut = pose.wheelRadius - 6 * s;

      dc.strokeStyle = PAL.gold;
      dc.lineWidth = 1.9 * s;
      dc.beginPath();
      dc.moveTo(cosA * rIn, sinA * rIn);
      dc.lineTo(cosA * rOut, sinA * rOut);
      dc.stroke();

      dc.fillStyle = i % 2 === 0 ? PAL.goldBright : PAL.vermilion;
      dc.beginPath();
      dc.arc(cosA * (rOut - 6 * s), sinA * (rOut - 6 * s), 2.3 * s, 0, Math.PI * 2);
      dc.fill();
    }

    // 8-lobed Mughal floral hub medallion with jewel center
    dc.fillStyle = PAL.gold;
    dc.strokeStyle = PAL.ink;
    dc.lineWidth = 1.2 * s;
    dc.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 8;
      const r = (i % 2 === 0 ? 10.5 : 7.2) * s;
      if (i === 0) dc.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else dc.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    dc.closePath();
    dc.fill();
    dc.stroke();

    dc.fillStyle = PAL.turquoise;
    dc.beginPath();
    dc.arc(0, 0, 3.6 * s, 0, Math.PI * 2);
    dc.fill();

    dc.restore();
  };

  dc.save();

  // Subtle ground shadow beneath tires on red sandstone promenade
  dc.fillStyle = "rgba(38, 16, 14, 0.28)";
  dc.beginPath();
  dc.ellipse(pose.x, pose.y + 4 * s, 118 * s, 7 * s, 0, 0, Math.PI * 2);
  dc.fill();

  // Rear leg
  dc.strokeStyle = "#b8641c";
  dc.lineWidth = 6.8 * s;
  dc.lineCap = "round";
  dc.lineJoin = "round";
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.leftKnee.x, pose.leftKnee.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();

  dc.strokeStyle = PAL.goldDeep;
  dc.lineWidth = 3.6 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();

  drawOrnateWheel(pose.rearHub);
  drawOrnateWheel(pose.frontHub);

  // Ornate Golden Bicycle Frame
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
  for (const [col, lw] of [
    [PAL.ink, 7.2 * s],
    [PAL.gold, 4.8 * s],
    [PAL.goldBright, 1.6 * s],
  ]) {
    dc.strokeStyle = col;
    dc.lineWidth = lw;
    dc.beginPath();
    for (const [pA, pB] of frameSegs) {
      dc.moveTo(pA.x, pA.y);
      dc.lineTo(pB.x, pB.y);
    }
    dc.stroke();
  }

  for (const jPt of [pose.seatCluster, pose.headTop, pose.headBot]) {
    dc.fillStyle = PAL.vermilion;
    dc.strokeStyle = PAL.goldBright;
    dc.lineWidth = 1.2 * s;
    dc.beginPath();
    dc.arc(jPt.x, jPt.y, 4.4 * s, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
  }

  // 8-pointed Mughal Star golden chainring
  dc.save();
  dc.translate(pose.bb.x, pose.bb.y);
  dc.rotate(pose.pedalAngle);
  dc.fillStyle = PAL.gold;
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.1 * s;
  dc.fillRect(-9 * s, -9 * s, 18 * s, 18 * s);
  dc.strokeRect(-9 * s, -9 * s, 18 * s, 18 * s);
  dc.rotate(Math.PI / 4);
  dc.fillRect(-9 * s, -9 * s, 18 * s, 18 * s);
  dc.strokeRect(-9 * s, -9 * s, 18 * s, 18 * s);
  dc.fillStyle = PAL.crimson;
  dc.beginPath();
  dc.arc(0, 0, 4.5 * s, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // Plush crimson velvet Mughal saddle
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 8.5 * s;
  dc.beginPath();
  dc.moveTo(pose.saddleRear.x, pose.saddleRear.y);
  dc.lineTo(pose.saddleFront.x, pose.saddleFront.y);
  dc.stroke();
  dc.strokeStyle = PAL.crimson;
  dc.lineWidth = 6 * s;
  dc.stroke();
  dc.strokeStyle = PAL.goldBright;
  dc.lineWidth = 1.4 * s;
  dc.beginPath();
  dc.moveTo(pose.saddleRear.x, pose.saddleRear.y + 3 * s);
  dc.lineTo(pose.saddleFront.x, pose.saddleFront.y + 3 * s);
  dc.stroke();

  // Brass lotus bell
  dc.fillStyle = PAL.goldBright;
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.1 * s;
  dc.beginPath();
  dc.arc(pose.bellPos.x, pose.bellPos.y, 5 * s, Math.PI, 0);
  dc.closePath();
  dc.fill();
  dc.stroke();

  // --- Imperial Mughal Bird-Painting Pelican (`Ustad Mansur` style) ---

  // Pelican body & tail (ivory cream with sepia contour & hair-fine gold edging)
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
  dc.fillStyle = "#fbf4e3";
  dc.fill();
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.8 * s;
  dc.stroke();

  // Hair-fine inner gold rim along back contour
  dc.strokeStyle = PAL.gold;
  dc.lineWidth = 1.3 * s;
  dc.beginPath();
  dc.moveTo(pose.tailTip.x + 8 * s, pose.tailTip.y - 4 * s);
  dc.bezierCurveTo(
    pose.bodyCenter.x - 32 * s,
    pose.bodyCenter.y - 24 * s,
    pose.bodyCenter.x + 22 * s,
    pose.bodyCenter.y - 30 * s,
    pose.neckBase.x + 8 * s,
    pose.neckBase.y + 6 * s
  );
  dc.stroke();

  // Delicate Mughal pearl-and-crimson royal collar band around lower neck base
  dc.strokeStyle = PAL.crimson;
  dc.lineWidth = 4.2 * s;
  dc.beginPath();
  dc.moveTo(pose.neckBase.x - 6 * s, pose.neckBase.y - 2 * s);
  dc.quadraticCurveTo(pose.neckBase.x + 5 * s, pose.neckBase.y + 5 * s, pose.neckBase.x + 14 * s, pose.neckBase.y - 1 * s);
  dc.stroke();
  dc.strokeStyle = PAL.goldBright;
  dc.lineWidth = 1.3 * s;
  dc.stroke();

  // S-curve ivory neck with delicate sepia & gold contour
  const drawNeckCurve = (col, lw) => {
    dc.strokeStyle = col;
    dc.lineWidth = lw;
    dc.beginPath();
    dc.moveTo(pose.neckCurve[0].x, pose.neckCurve[0].y);
    for (let i = 1; i < pose.neckCurve.length; i++) {
      dc.lineTo(pose.neckCurve[i].x, pose.neckCurve[i].y);
    }
    dc.stroke();
  };
  drawNeckCurve(PAL.ink, 21.5 * s);
  drawNeckCurve("#fbf4e3", 17.5 * s);
  drawNeckCurve("rgba(212, 155, 53, 0.52)", 2.2 * s);

  // Head
  dc.fillStyle = "#fbf4e3";
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.8 * s;
  dc.beginPath();
  dc.arc(pose.head.x, pose.head.y, 17 * s, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  // Golden-saffron throat pouch with hair-fine gold highlight
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
  dc.fillStyle = "#f2b84c";
  dc.fill();
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.8 * s;
  dc.stroke();

  dc.strokeStyle = PAL.goldBright;
  dc.lineWidth = 1.1 * s;
  dc.beginPath();
  dc.moveTo(pose.pouchBase.x + 8 * s, pose.pouchBase.y + 4 * s);
  dc.quadraticCurveTo(pose.pouchMid.x + 4 * s, pose.pouchMid.y + 2 * s, pose.beakTip.x - 14 * s, pose.beakTip.y + 6 * s);
  dc.stroke();

  // Upper beak
  dc.fillStyle = "#e38b2c";
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.8 * s;
  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
  dc.lineTo(pose.beakTip.x, pose.beakTip.y);
  dc.lineTo(pose.beakHook.x, pose.beakHook.y);
  dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  dc.closePath();
  dc.fill();
  dc.stroke();

  // Deadpan Mughal almond eye
  dc.fillStyle = "#fffcf5";
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.4 * s;
  dc.beginPath();
  dc.ellipse(pose.eye.x, pose.eye.y, 5.2 * s, 3.8 * s, 0, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.fillStyle = "#221612";
  dc.beginPath();
  dc.arc(pose.eye.x + 1.4 * s, pose.eye.y, 2.2 * s, 0, Math.PI * 2);
  dc.fill();

  // --- Royal Ruby-Plumed Mughal Turban (`Sarpech` + `Kalgi` feather plume) ---
  dc.save();
  dc.translate(pose.head.x - 2 * s, pose.head.y - 13 * s);
  dc.rotate(-0.14);

  dc.fillStyle = PAL.vermilion;
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.4 * s;
  dc.beginPath();
  dc.ellipse(0, 0, 17 * s, 10.5 * s, -0.1, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.strokeStyle = PAL.goldBright;
  dc.lineWidth = 3.0 * s;
  dc.beginPath();
  dc.moveTo(-14 * s, 2 * s);
  dc.quadraticCurveTo(0, -8 * s, 14 * s, 3 * s);
  dc.stroke();

  const plumeBounce = Math.sin(u * Math.PI * 4) * 2.5 * s;
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 2.8 * s;
  dc.beginPath();
  dc.moveTo(4 * s, -9 * s);
  dc.bezierCurveTo(-2 * s, -29 * s, -19 * s, -36 * s + plumeBounce, -29 * s, -25 * s + plumeBounce);
  dc.stroke();
  dc.strokeStyle = "#faf5ea";
  dc.lineWidth = 1.4 * s;
  dc.stroke();

  dc.fillStyle = PAL.goldBright;
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.0 * s;
  dc.beginPath();
  dc.moveTo(6 * s, -16 * s);
  dc.quadraticCurveTo(13 * s, -6 * s, 6 * s, -1 * s);
  dc.quadraticCurveTo(-1 * s, -6 * s, 6 * s, -16 * s);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.fillStyle = "#d4172f";
  dc.beginPath();
  dc.arc(6 * s, -7.5 * s, 3.6 * s, 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = "#ffdce2";
  dc.beginPath();
  dc.arc(7 * s, -8.5 * s, 1.1 * s, 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = "#fffaf0";
  dc.beginPath();
  dc.arc(6 * s, -17.5 * s, 1.9 * s, 0, Math.PI * 2);
  dc.fill();

  dc.restore();

  // Scalloped ivory wing with hair-fine Mughal gold feather imbrication
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
  dc.fillStyle = "#f2e7d0";
  dc.fill();
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 1.8 * s;
  dc.stroke();

  // Three delicate tiers of Mughal scalloped gold-edged wing feathers
  dc.strokeStyle = PAL.gold;
  dc.lineWidth = 1.2 * s;
  for (let row = 0; row < 4; row++) {
    const tRow = 0.2 + row * 0.2;
    const fx = lerp(pose.shoulder.x, pose.barGrip.x, tRow);
    const fy = lerp(pose.shoulder.y, pose.barGrip.y, tRow) + 4 * s;
    dc.beginPath();
    dc.arc(fx, fy, 7.5 * s, -0.35, Math.PI * 0.85);
    dc.stroke();
    dc.beginPath();
    dc.arc(fx - 6 * s, fy + 6 * s, 6.2 * s, -0.35, Math.PI * 0.85);
    dc.stroke();
  }

  // Front leg pedaling + tiny golden anklet
  dc.strokeStyle = PAL.ink;
  dc.lineWidth = 8.6 * s;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  dc.strokeStyle = "#de8326";
  dc.lineWidth = 6.2 * s;
  dc.stroke();

  dc.strokeStyle = PAL.goldBright;
  dc.lineWidth = 2.2 * s;
  dc.beginPath();
  dc.arc(
    lerp(pose.rightKnee.x, pose.rightPedal.x, 0.86),
    lerp(pose.rightKnee.y, pose.rightPedal.y, 0.86),
    3.6 * s,
    0,
    Math.PI * 2
  );
  dc.stroke();

  dc.strokeStyle = PAL.goldBright;
  dc.lineWidth = 3.8 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  dc.fillStyle = PAL.ink;
  dc.fillRect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 3 * s, 16 * s, 6 * s);
  dc.fillRect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s);
  dc.fillStyle = PAL.goldBright;
  dc.fillRect(pose.rightPedal.x - 6 * s, pose.rightPedal.y - 1.5 * s, 12 * s, 3 * s);

  void beat;
  dc.restore();
}

/**
 * Beat-synced golden sparkle glint on the Hashiya geometric rosettes (peaks in Bar 2!).
 */
function drawHashiyaBeatGlints(g, u, beat) {
  const bar2Amp = 0.25 + 0.75 * smoothstep(1.8, 2.15, u) * (1 - smoothstep(3.95, 4.45, u));
  const glint = beat.beatPulse * bar2Amp;
  if (glint < 0.06) return;

  const dc = g.drawingContext;
  dc.save();
  for (let i = 0; i < HASHIYA_ROSETTES.length; i++) {
    const r = HASHIYA_ROSETTES[i];
    const phaseShift = (i + beat.beatIndex) % 2 === 0 ? 1.0 : 0.62;
    const a = clamp(glint * phaseShift, 0, 1);
    if (a < 0.08) continue;

    dc.fillStyle = `rgba(255, 232, 138, ${a * 0.44})`;
    dc.beginPath();
    dc.arc(r.x, r.y, r.r * 1.48, 0, Math.PI * 2);
    dc.fill();

    dc.strokeStyle = `rgba(255, 248, 208, ${a * 0.92})`;
    dc.lineWidth = 1.3;
    const ray = r.r * (0.95 + a * 0.65);
    dc.beginPath();
    dc.moveTo(r.x - ray, r.y);
    dc.lineTo(r.x + ray, r.y);
    dc.moveTo(r.x, r.y - ray);
    dc.lineTo(r.x, r.y + ray);
    dc.stroke();
  }
  dc.restore();
}

export default function render(ctx) {
  const { p, brush, g, kit, t, localTime, beat } = ctx;
  const u = localTime;

  // 1. Pre-baked Mughal miniature sheet, Hashiya borders, Jharokha, Charbagh & sandstone road
  const backdrop = kit.bakeLayer("s08_mughal_folio_v3", BUFFER_W, BUFFER_H, bakeMughalBackdrop);
  p.push();
  p.imageMode(p.CENTER);
  p.image(backdrop, 500, 500, BUFFER_W, BUFFER_H);
  p.pop();

  // 2. Subtle p5.brush mineral-ink grounding accent along ROAD_Y for textural continuity
  brush.set("HB", "#5e251c", 1.8);
  brush.line(BLEED_LEFT, ROAD_Y + 2, BLEED_RIGHT, ROAD_Y + 2);

  // 3. Animated 2D foreground
  g.push();

  const px = getScenePelicanX(u);
  const lockStrength = smoothstep(1.78, 2.04, u) * (1 - smoothstep(4.25, 4.75, u));

  drawAnimatedWaterAndFountain(g, u, beat);

  drawBalconyLadies(g, u, beat, px, lockStrength);
  drawCharbaghFigures(g, u, beat, px, lockStrength);
  drawCorridorGuards(g, u, beat, px, lockStrength);

  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
  drawMughalPelicanRig(g, pose, u, beat);

  drawHashiyaBeatGlints(g, u, beat);

  drawEraTitleCard(g, META, u);

  g.pop();
}
