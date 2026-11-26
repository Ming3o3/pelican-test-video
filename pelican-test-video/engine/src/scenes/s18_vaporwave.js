/**
 * Scene #18 — 蒸汽波 · Vaporwave (2010s), t in [107.0, 113.0).
 * 2010s classic Vaporwave aesthetic:
 * - Baked cyber-twilight panorama across [-420..1420] x [0..1000] with violet-magenta-pink
 *   dusk sky, subtle starry micro-grid dots, 9-stripe scanline-sliced golden-magenta retro sun,
 *   translucent cyan wireframe low-poly mountain range (y in [595, 730]), and 4 low-poly
 *   faceted cyber palm trees.
 * - Live perspective neon grid floor (y in [730, 1000]) with radial hot-pink rays fanning from
 *   vanishing point (500, 560), scrolling cyan horizontal depth lines driven by `uTape`,
 *   and dual neon horizon road rails strictly at ROAD_Y = 730.
 * - Rock-steady deadpan Greco-Roman pure-white marble bust (original sculptural homage) atop
 *   a 3D perspective black-and-white checkerboard marble pedestal at x = 755, y in [485, 728],
 *   flanked by a rotating 3D cyan wireframe octahedron at (235, 252) and a floating neon
 *   marquee plaque at (755, 178).
 * - Bar 2 gag (u in [2.0, 4.0)): 4 crisp half-beat (0.25s) VHS tape loop stutters (`uTape`),
 *   -7px cyan / +7px hot-pink RGB chromatic-aberration ghost silhouettes of the Pelican & bike,
 *   scrolling VHS tracking snow bands, and top-right green CRT VCR OSD (`PLAY ▶ 0.79x`).
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  ROAD_Y,
  clamp,
  getScenePelicanX,
  hermite,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[17];
const SCENE_START_T = 107.0;

const EXT_LEFT = BLEED_LEFT - 24; // -444
const EXT_RIGHT = BLEED_RIGHT + 24; // 1444
const EXT_W = EXT_RIGHT - EXT_LEFT; // 1888

const VP_X = 500;
const VP_Y = 560;

const BUST_X = 755;
const BUST_LAYER_X = BUST_X - 140; // 615
const BUST_LAYER_Y = 475;
const BUST_LAYER_W = 280;
const BUST_LAYER_H = 260;

const PALM_SPECS = [
  { x: -140, h: 348, lean: -22, scale: 1.04 },
  { x: 130, h: 292, lean: -18, scale: 0.88 },
  { x: 935, h: 332, lean: 24, scale: 0.98 },
  { x: 1210, h: 296, lean: -20, scale: 0.88 },
];

// 9 horizontal sky-cut stripes across lower sun (cy=420, r=198 -> y in [222, 618]),
// widening smoothly downward while remaining cleanly above mountain valley (y >= 624).
const SUN_SOLID_BANDS = [
  [220.0, 390.0],
  [393.0, 412.5],
  [417.0, 435.5],
  [441.5, 459.0],
  [466.5, 483.0],
  [492.5, 508.0],
  [519.5, 533.5],
  [547.0, 559.5],
  [575.5, 586.5],
  [605.0, 620.0],
];

const OCT_VERTS = [
  [0, -1.34, 0],
  [1, 0, 0],
  [0, 0, 1],
  [-1, 0, 0],
  [0, 0, -1],
  [0, 1.34, 0],
];

const OCT_FACES = [
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 4],
  [0, 4, 1],
  [5, 2, 1],
  [5, 3, 2],
  [5, 4, 3],
  [5, 1, 4],
];

const OCT_EDGES = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [5, 1], [5, 2], [5, 3], [5, 4],
  [1, 2], [2, 3], [3, 4], [4, 1],
];

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
 * Computes effective tape playback time `uTape` with 4 crisp Bar 2 half-beat loops
 * and C1-continuous Hermite catch-up returning cleanly to `u` before portals.
 */
function getTapeTime(u) {
  if (u < 2.0) return u;
  if (u < 2.88) {
    return 2.0 + posMod(u - 2.0, 0.25) * 0.85;
  }
  if (u < 3.20) {
    const dur = 0.32;
    const uAtStart = 2.0 + posMod(2.88 - 2.0, 0.25) * 0.85; // 2.1105
    return hermite(uAtStart, 0.85 * dur, 3.20, 1.0 * dur, (u - 2.88) / dur);
  }
  return u;
}

function drawPolygon(dc, pts) {
  dc.beginPath();
  dc.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    dc.lineTo(pts[i][0], pts[i][1]);
  }
  dc.closePath();
}

function drawLowPolyPalm(dc, spec) {
  const { x, h, lean, scale } = spec;
  const baseY = ROAD_Y;
  const segs = 8;
  const spine = [];
  for (let i = 0; i <= segs; i++) {
    const k = i / segs;
    const sway = lean * Math.pow(k, 1.45);
    spine.push({
      x: x + sway,
      y: baseY - h * k,
      w: (13.5 * (1 - k * 0.62) + 3.2) * scale,
    });
  }

  // Faceted tapered trunk segments
  dc.save();
  dc.lineJoin = "round";
  dc.lineCap = "round";
  for (let i = 0; i < segs; i++) {
    const p0 = spine[i];
    const p1 = spine[i + 1];
    const bl = [p0.x - p0.w, p0.y];
    const br = [p0.x + p0.w, p0.y];
    const tl = [p1.x - p1.w, p1.y];
    const tr = [p1.x + p1.w, p1.y];

    // Left sunlit facet
    drawPolygon(dc, [bl, tl, tr]);
    dc.fillStyle = i % 2 === 0 ? "#240a4d" : "#1d0740";
    dc.fill();
    dc.strokeStyle = "rgba(76, 242, 234, 0.68)";
    dc.lineWidth = 1.2;
    dc.stroke();

    // Right shadow facet
    drawPolygon(dc, [bl, tr, br]);
    dc.fillStyle = i % 2 === 0 ? "#13052b" : "#170736";
    dc.fill();
    dc.strokeStyle = "rgba(255, 90, 200, 0.62)";
    dc.lineWidth = 1.2;
    dc.stroke();
  }

  // Radiating low-poly wireframe frond blades at crown
  const crown = spine[segs];
  const frondConfigs = [
    { angle: -2.85, len: 132, droop: 62, width: 22 },
    { angle: -2.42, len: 148, droop: 44, width: 24 },
    { angle: -1.96, len: 126, droop: 26, width: 21 },
    { angle: -1.48, len: 108, droop: 18, width: 19 },
    { angle: -1.04, len: 128, droop: 28, width: 21 },
    { angle: -0.62, len: 146, droop: 48, width: 24 },
    { angle: -0.22, len: 130, droop: 66, width: 22 },
    { angle: 0.16, len: 102, droop: 70, width: 18 },
  ];

  for (let fi = 0; fi < frondConfigs.length; fi++) {
    const f = frondConfigs[fi];
    const len = f.len * scale;
    const droop = f.droop * scale;
    const maxW = f.width * scale;
    const dirX = Math.cos(f.angle);
    const dirY = Math.sin(f.angle);
    const nx = -dirY;
    const ny = dirX;

    const steps = 4;
    const ptsSpine = [];
    for (let s = 0; s <= steps; s++) {
      const k = s / steps;
      ptsSpine.push({
        x: crown.x + dirX * len * k,
        y: crown.y + dirY * len * k + droop * k * k,
        w: maxW * Math.sin(Math.pow(k, 0.72) * Math.PI) * (1 - k * 0.25),
      });
    }

    for (let s = 0; s < steps; s++) {
      const a = ptsSpine[s];
      const b = ptsSpine[s + 1];
      const aUp = [a.x + nx * a.w, a.y + ny * a.w];
      const aDn = [a.x - nx * a.w, a.y - ny * a.w];
      const bUp = [b.x + nx * b.w, b.y + ny * b.w];
      const bDn = [b.x - nx * b.w, b.y - ny * b.w];

      // Upper facet
      drawPolygon(dc, [[a.x, a.y], aUp, bUp, [b.x, b.y]]);
      dc.fillStyle = "rgba(25, 7, 56, 0.84)";
      dc.fill();
      dc.strokeStyle = fi % 2 === 0 ? "rgba(76, 242, 234, 0.85)" : "rgba(255, 90, 200, 0.82)";
      dc.lineWidth = 1.25;
      dc.stroke();

      // Lower facet
      drawPolygon(dc, [[a.x, a.y], [b.x, b.y], bDn, aDn]);
      dc.fillStyle = "rgba(16, 4, 38, 0.88)";
      dc.fill();
      dc.strokeStyle = fi % 2 === 0 ? "rgba(255, 90, 200, 0.72)" : "rgba(76, 242, 234, 0.72)";
      dc.lineWidth = 1.1;
      dc.stroke();
    }

    // Glowing central spine rib
    dc.beginPath();
    dc.moveTo(ptsSpine[0].x, ptsSpine[0].y);
    for (let s = 1; s <= steps; s++) {
      dc.lineTo(ptsSpine[s].x, ptsSpine[s].y);
    }
    dc.strokeStyle = fi % 2 === 0 ? "#4cf2ea" : "#ff5ac8";
    dc.lineWidth = 2.0;
    dc.stroke();
  }

  // Crown diamond node
  dc.fillStyle = "#ff5ac8";
  dc.beginPath();
  dc.arc(crown.x, crown.y, Math.max(0.5, 4.5 * scale), 0, Math.PI * 2);
  dc.fill();
  dc.restore();
}

/**
 * Bakes the static cyber-twilight backdrop (1840x1000 covering x in [-420, 1420]).
 */
function bakeSkyBackdrop(pg) {
  const dc = pg.drawingContext;
  dc.save();
  dc.translate(-BLEED_LEFT, 0);

  // 1. Cyber-sunset gradient sky
  const skyGrad = dc.createLinearGradient(0, 0, 0, ROAD_Y);
  skyGrad.addColorStop(0.0, "#1b0838");
  skyGrad.addColorStop(0.36, "#5b167f");
  skyGrad.addColorStop(0.66, "#c92c92");
  skyGrad.addColorStop(0.95, "#ff6bb5");
  skyGrad.addColorStop(1.0, "#ff7cc0");
  dc.fillStyle = skyGrad;
  dc.fillRect(BLEED_LEFT, 0, 1840, ROAD_Y + 4);

  // Deep ground base below horizon
  dc.fillStyle = "#130628";
  dc.fillRect(BLEED_LEFT, ROAD_Y, 1840, 1000 - ROAD_Y);

  // 2. Subtle starry micro-grid dots & twilight stars in upper heavens
  dc.fillStyle = "rgba(76, 242, 234, 0.11)";
  for (let gx = -400; gx <= 1400; gx += 48) {
    for (let gy = 24; gy <= 270; gy += 48) {
      dc.fillRect(gx - 0.8, gy - 0.8, 1.6, 1.6);
    }
  }

  const rand = prng(181984);
  for (let i = 0; i < 110; i++) {
    const sx = BLEED_LEFT + rand() * 1840;
    const sy = 14 + rand() * 320;
    const sr = 0.7 + rand() * 1.5;
    const pick = rand();
    dc.fillStyle =
      pick > 0.72
        ? `rgba(76, 242, 234, ${(0.25 + rand() * 0.45).toFixed(2)})`
        : pick > 0.45
          ? `rgba(255, 180, 238, ${(0.25 + rand() * 0.4).toFixed(2)})`
          : `rgba(255, 255, 255, ${(0.25 + rand() * 0.5).toFixed(2)})`;
    dc.beginPath();
    dc.arc(sx, sy, Math.max(0.5, sr), 0, Math.PI * 2);
    dc.fill();
  }

  // Crisp 4-point cyber stars
  for (let i = 0; i < 12; i++) {
    const sx = -320 + rand() * 1640;
    const sy = 36 + rand() * 220;
    const arm = 5 + rand() * 6;
    dc.strokeStyle = i % 2 === 0 ? "rgba(76, 242, 234, 0.55)" : "rgba(255, 224, 250, 0.55)";
    dc.lineWidth = 1.1;
    dc.beginPath();
    dc.moveTo(sx - arm, sy);
    dc.lineTo(sx + arm, sy);
    dc.moveTo(sx, sy - arm);
    dc.lineTo(sx, sy + arm);
    dc.stroke();
  }

  // 3. Soft sun twilight bloom + giant horizontal scanline-sliced retro sun
  const halo = dc.createRadialGradient(500, 420, 120, 500, 420, 390);
  halo.addColorStop(0.0, "rgba(255, 130, 198, 0.46)");
  halo.addColorStop(0.55, "rgba(201, 44, 146, 0.18)");
  halo.addColorStop(1.0, "rgba(27, 8, 56, 0)");
  dc.fillStyle = halo;
  dc.beginPath();
  dc.arc(500, 420, 390, 0, Math.PI * 2);
  dc.fill();

  dc.save();
  dc.beginPath();
  dc.arc(500, 420, 198, 0, Math.PI * 2);
  dc.clip();

  dc.beginPath();
  for (const [sy0, sy1] of SUN_SOLID_BANDS) {
    dc.rect(500 - 204, sy0, 408, sy1 - sy0);
  }
  dc.clip();

  const sunGrad = dc.createLinearGradient(0, 222, 0, 618);
  sunGrad.addColorStop(0.0, "#fff89b");
  sunGrad.addColorStop(0.26, "#ffd258");
  sunGrad.addColorStop(0.56, "#ff689c");
  sunGrad.addColorStop(0.84, "#e6249a");
  sunGrad.addColorStop(1.0, "#b01588");
  dc.fillStyle = sunGrad;
  dc.fillRect(500 - 204, 220, 408, 404);
  dc.restore();

  // Subtle horizon atmospheric glow right behind the mountains
  const horizGlow = dc.createLinearGradient(0, 600, 0, ROAD_Y);
  horizGlow.addColorStop(0.0, "rgba(76, 242, 234, 0)");
  horizGlow.addColorStop(1.0, "rgba(76, 242, 234, 0.16)");
  dc.fillStyle = horizGlow;
  dc.fillRect(BLEED_LEFT, 600, 1840, ROAD_Y - 600);

  // 4. Translucent cyan wireframe low-poly mountain range (y in [595, 730])
  const ridgeNodes = [
    [-440, 632], [-320, 597], [-200, 638], [-85, 604], [30, 648],
    [155, 601], [275, 636], [368, 599], [462, 646], [538, 644],
    [628, 602], [728, 638], [848, 598], [975, 642], [1105, 596],
    [1225, 635], [1345, 602], [1440, 636],
  ];
  const midNodes = [
    [-440, 686], [-265, 666], [-135, 684], [-10, 668], [100, 688],
    [220, 665], [320, 686], [420, 672], [500, 688], [585, 672],
    [680, 686], [790, 664], [910, 688], [1040, 666], [1165, 686],
    [1285, 665], [1440, 684],
  ];

  const mTris = [];
  for (let i = 0; i < ridgeNodes.length - 1; i++) {
    const r0 = ridgeNodes[i];
    const r1 = ridgeNodes[i + 1];
    const m0 = midNodes[Math.min(i, midNodes.length - 1)];
    const m1 = midNodes[Math.min(i + 1, midNodes.length - 1)];
    const b0 = [r0[0], ROAD_Y];
    const b1 = [r1[0], ROAD_Y];
    const bm = [(r0[0] + r1[0]) * 0.5, ROAD_Y];

    mTris.push({ pts: [r0, m0, r1], shade: 0 });
    mTris.push({ pts: [r1, m0, m1], shade: 1 });
    mTris.push({ pts: [m0, b0, bm], shade: 1 });
    mTris.push({ pts: [m0, bm, m1], shade: 0 });
    mTris.push({ pts: [m1, bm, b1], shade: 1 });
  }

  // Translucent shaded facets
  for (const tri of mTris) {
    drawPolygon(dc, tri.pts);
    dc.fillStyle = tri.shade === 0 ? "rgba(32, 9, 68, 0.52)" : "rgba(62, 18, 108, 0.36)";
    dc.fill();
  }

  // Luminous cyan wireframe mountain edges
  dc.save();
  dc.lineJoin = "round";
  dc.lineCap = "round";
  for (const tri of mTris) {
    drawPolygon(dc, tri.pts);
    dc.strokeStyle = "rgba(76, 242, 234, 0.18)";
    dc.lineWidth = 4.2;
    dc.stroke();
    dc.strokeStyle = "rgba(76, 242, 234, 0.72)";
    dc.lineWidth = 1.35;
    dc.stroke();
  }
  dc.restore();

  // 5. Low-poly faceted cyber palm trees behind the road line
  for (const palm of PALM_SPECS) {
    drawLowPolyPalm(dc, palm);
  }

  dc.restore();
}

/**
 * Draws an original pure-white Greco-Roman marble bust on a 3D perspective
 * black-and-white checkerboard marble pedestal (rock-steady deadpan observer).
 */
function bakeMarbleBust(pg) {
  const dc = pg.drawingContext;
  dc.save();
  dc.translate(-BUST_LAYER_X, -BUST_LAYER_Y);
  dc.lineJoin = "round";
  dc.lineCap = "round";

  // Clip strictly above ROAD_Y = 730 so Pelican always passes cleanly in front
  dc.beginPath();
  dc.rect(BUST_LAYER_X, BUST_LAYER_Y, BUST_LAYER_W, 729 - BUST_LAYER_Y);
  dc.clip();

  // --- A. 3D Perspective Black-and-White Checkerboard Pedestal (y in [626, 728]) ---
  const fL = 702;
  const fR = 808;
  const fT = 644;
  const fB = 721;

  // Side face recedes toward vanishing point (500, 560)
  const kDepth = 0.14;
  const bX = fL + (VP_X - fL) * kDepth; // ~674
  const bT = fT + (VP_Y - fT) * kDepth; // ~632.2
  const bB = fB + (VP_Y - fB) * kDepth; // ~698.5

  // Soft floor glow / shadow strictly below pedestal (y <= 729)
  const pedGlow = dc.createLinearGradient(0, 720, 0, 729);
  pedGlow.addColorStop(0, "rgba(76, 242, 234, 0.35)");
  pedGlow.addColorStop(1, "rgba(255, 90, 200, 0.45)");
  dc.fillStyle = pedGlow;
  dc.fillRect(670, 723, 152, 6);

  // Perspective checkerboard on LEFT receding side face (3 cols x 5 rows)
  const sideCols = 3;
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const rv0 = r / rows;
    const rv1 = (r + 1) / rows;
    for (let c = 0; c < sideCols; c++) {
      const cv0 = c / sideCols;
      const cv1 = (c + 1) / sideCols;
      const interp = (cv, rv) => {
        const x = fL + (bX - fL) * cv;
        const topY = fT + (bT - fT) * cv;
        const botY = fB + (bB - fB) * cv;
        return [x, topY + (botY - topY) * rv];
      };
      drawPolygon(dc, [
        interp(cv0, rv0),
        interp(cv1, rv0),
        interp(cv1, rv1),
        interp(cv0, rv1),
      ]);
      const isWhite = (r + c) % 2 === 1;
      dc.fillStyle = isWhite ? "#cfcfe6" : "#110726";
      dc.fill();
      dc.strokeStyle = "rgba(76, 242, 234, 0.25)";
      dc.lineWidth = 0.7;
      dc.stroke();
    }
  }

  // Checkerboard on FRONT face (6 cols x 5 rows)
  const frontCols = 6;
  const colW = (fR - fL) / frontCols;
  const rowH = (fB - fT) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < frontCols; c++) {
      const tx = fL + c * colW;
      const ty = fT + r * rowH;
      const isWhite = (r + c) % 2 === 0;
      dc.fillStyle = isWhite ? "#f4f4fc" : "#180c33";
      dc.fillRect(tx, ty, colW + 0.4, rowH + 0.4);
    }
  }
  // Subtle marble sheen across front checkerboard
  const frontSheen = dc.createLinearGradient(fL, fT, fR, fB);
  frontSheen.addColorStop(0, "rgba(76, 242, 234, 0.14)");
  frontSheen.addColorStop(0.5, "rgba(255, 255, 255, 0.03)");
  frontSheen.addColorStop(1, "rgba(255, 90, 200, 0.14)");
  dc.fillStyle = frontSheen;
  dc.fillRect(fL, fT, fR - fL, fB - fT);

  // Pedestal base plinth (y in [721, 728])
  const plL = fL - 6;
  const plR = fR + 6;
  const plBX = plL + (VP_X - plL) * kDepth;
  const plBY = 721 + (VP_Y - 721) * kDepth;
  const plBB = 728 + (VP_Y - 728) * kDepth;
  drawPolygon(dc, [[plL, 721], [plBX, plBY], [plBX, plBB], [plL, 728]]);
  dc.fillStyle = "#b8bed9";
  dc.fill();
  dc.fillStyle = "#eef0fb";
  dc.fillRect(plL, 721, plR - plL, 7);
  dc.strokeStyle = "#4cf2ea";
  dc.lineWidth = 1.2;
  dc.beginPath();
  dc.moveTo(plBX, plBY);
  dc.lineTo(plL, 721);
  dc.lineTo(plL, 728);
  dc.stroke();

  // Top marble cap & receding top deck (y in [625, 644])
  const cL = fL - 6;
  const cR = fR + 6;
  const cBX = cL + (VP_X - cL) * (kDepth + 0.02);
  const cBR = cR + (VP_X - cR) * (kDepth + 0.02);
  const cBY = 636 + (VP_Y - 636) * (kDepth + 0.02);
  // Top deck checkerboard hint
  drawPolygon(dc, [[cL, 636], [cR, 636], [cBR, cBY], [cBX, cBY]]);
  dc.fillStyle = "#dfe2f5";
  dc.fill();
  for (let c = 0; c < frontCols; c += 2) {
    const x0 = cL + (c / frontCols) * (cR - cL);
    const x1 = cL + ((c + 1) / frontCols) * (cR - cL);
    const bx0 = cBX + (c / frontCols) * (cBR - cBX);
    const bx1 = cBX + ((c + 1) / frontCols) * (cBR - cBX);
    drawPolygon(dc, [[x0, 636], [x1, 636], [bx1, cBY], [bx0, cBY]]);
    dc.fillStyle = "rgba(24, 12, 51, 0.72)";
    dc.fill();
  }
  // Top cornice side face
  const cSL = cL + (VP_X - cL) * kDepth;
  const cSY0 = 636 + (VP_Y - 636) * kDepth;
  const cSY1 = 644 + (VP_Y - 644) * kDepth;
  drawPolygon(dc, [[cL, 636], [cSL, cSY0], [cSL, cSY1], [cL, 644]]);
  dc.fillStyle = "#c4c9e3";
  dc.fill();
  // Top cornice front face
  dc.fillStyle = "#ffffff";
  dc.fillRect(cL, 636, cR - cL, 8);
  dc.strokeStyle = "#4cf2ea";
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.moveTo(cBX, cBY);
  dc.lineTo(cL, 636);
  dc.lineTo(cL, 644);
  dc.moveTo(fL, fT);
  dc.lineTo(fL, fB);
  dc.stroke();
  dc.strokeStyle = "#ff5ac8";
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.moveTo(cR, 636);
  dc.lineTo(cR, 644);
  dc.moveTo(fR, fT);
  dc.lineTo(fR, fB);
  dc.stroke();

  // Contact shadow under bust socle on top of pedestal
  dc.fillStyle = "rgba(20, 8, 44, 0.55)";
  dc.beginPath();
  dc.ellipse(755, 632, 34, 5.5, 0, 0, Math.PI * 2);
  dc.fill();

  // --- B. Classical Greco-Roman Pure-White Marble Bust (y in [485, 633]) ---
  // 1. Turned circular marble socle base (y in [617, 633])
  const socleGrad = dc.createLinearGradient(724, 624, 786, 624);
  socleGrad.addColorStop(0.0, "#d7fefc");
  socleGrad.addColorStop(0.18, "#ffffff");
  socleGrad.addColorStop(0.7, "#d6dbee");
  socleGrad.addColorStop(1.0, "#f2b8e2");
  dc.fillStyle = socleGrad;
  dc.beginPath();
  dc.ellipse(755, 628, 30, 5.5, 0, 0, Math.PI * 2);
  dc.fill();
  dc.fillRect(733, 617, 44, 10);
  dc.beginPath();
  dc.ellipse(755, 621, 26, 4.5, 0, 0, Math.PI * 2);
  dc.fill();
  dc.strokeStyle = "#9aa2c2";
  dc.lineWidth = 1;
  dc.beginPath();
  dc.ellipse(755, 628, 30, 5.5, 0, 0.15, Math.PI - 0.15);
  dc.stroke();

  // 2. Draped classical shoulders & torso (y in [568, 620])
  dc.save();
  dc.beginPath();
  dc.moveTo(732, 618);
  dc.bezierCurveTo(705, 612, 692, 594, 696, 578);
  dc.bezierCurveTo(702, 567, 725, 565, 742, 563);
  dc.lineTo(772, 563);
  dc.bezierCurveTo(792, 565, 811, 570, 815, 581);
  dc.bezierCurveTo(818, 596, 804, 612, 778, 618);
  dc.closePath();

  const torsoGrad = dc.createLinearGradient(695, 570, 816, 618);
  torsoGrad.addColorStop(0.0, "#ffffff");
  torsoGrad.addColorStop(0.45, "#f3f5fc");
  torsoGrad.addColorStop(0.78, "#d4d9ec");
  torsoGrad.addColorStop(1.0, "#b8bed8");
  dc.fillStyle = torsoGrad;
  dc.fill();

  // Left cyan neon rim & right hot-magenta bounce on torso
  dc.strokeStyle = "#4cf2ea";
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.moveTo(732, 618);
  dc.bezierCurveTo(705, 612, 692, 594, 696, 578);
  dc.bezierCurveTo(701, 569, 718, 566, 736, 564);
  dc.stroke();

  dc.strokeStyle = "rgba(255, 90, 200, 0.85)";
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.moveTo(778, 618);
  dc.bezierCurveTo(804, 612, 818, 596, 815, 581);
  dc.stroke();

  // Chiseled classical chlamys drapery folds across chest
  const drawFold = (p0, c1, c2, p1, shadeW, hiColor) => {
    dc.strokeStyle = "rgba(138, 146, 178, 0.62)";
    dc.lineWidth = shadeW;
    dc.beginPath();
    dc.moveTo(p0[0], p0[1]);
    dc.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p1[0], p1[1]);
    dc.stroke();

    dc.strokeStyle = hiColor;
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.moveTo(p0[0] - 1.5, p0[1] - 2);
    dc.bezierCurveTo(c1[0] - 1.5, c1[1] - 2, c2[0] - 1.5, c2[1] - 2, p1[0] - 1.5, p1[1] - 2);
    dc.stroke();
  };
  drawFold([704, 576], [728, 596], [752, 608], [776, 616], 4.5, "#ffffff");
  drawFold([716, 570], [742, 588], [768, 598], [798, 601], 3.8, "#ffffff");
  drawFold([768, 568], [786, 580], [798, 590], [810, 591], 3.4, "#f4f6fd");

  // Sculpted clavicle & chest highlight
  dc.strokeStyle = "rgba(155, 163, 194, 0.5)";
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.moveTo(735, 569);
  dc.quadraticCurveTo(754, 577, 777, 571);
  dc.stroke();
  dc.restore();

  // 3. Classical sculpted neck (y in [546, 572])
  dc.save();
  dc.beginPath();
  dc.moveTo(737, 567);
  dc.lineTo(739, 545);
  dc.lineTo(773, 545);
  dc.bezierCurveTo(774, 556, 775, 563, 779, 569);
  dc.quadraticCurveTo(756, 575, 737, 567);
  dc.closePath();
  const neckGrad = dc.createLinearGradient(736, 546, 778, 566);
  neckGrad.addColorStop(0.0, "#ffffff");
  neckGrad.addColorStop(0.5, "#e6eaf7");
  neckGrad.addColorStop(1.0, "#b8bfd9");
  dc.fillStyle = neckGrad;
  dc.fill();

  // Chin cast-shadow on upper neck
  dc.fillStyle = "rgba(146, 152, 184, 0.55)";
  dc.beginPath();
  dc.ellipse(751, 550, 15, 6, -0.1, 0, Math.PI);
  dc.fill();
  dc.restore();

  // 4. Classical Greco-Roman Head (3/4 turned left toward approaching Pelican, y in [485, 556])
  dc.save();
  dc.beginPath();
  dc.moveTo(742, 495);
  dc.bezierCurveTo(726, 498, 722, 513, 725, 526);
  dc.bezierCurveTo(725, 536, 729, 548, 736, 554); // cheek -> chin
  dc.bezierCurveTo(745, 557, 759, 553, 770, 543); // jaw line
  dc.bezierCurveTo(781, 534, 785, 516, 779, 502);
  dc.bezierCurveTo(772, 492, 756, 492, 742, 495);
  dc.closePath();

  const faceGrad = dc.createLinearGradient(723, 504, 782, 546);
  faceGrad.addColorStop(0.0, "#ffffff");
  faceGrad.addColorStop(0.42, "#f4f6fc");
  faceGrad.addColorStop(0.78, "#d0d6eb");
  faceGrad.addColorStop(1.0, "#aeb6d4");
  dc.fillStyle = faceGrad;
  dc.fill();

  // Left cyan face edge highlight
  dc.strokeStyle = "#4cf2ea";
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.moveTo(725, 514);
  dc.bezierCurveTo(723, 526, 727, 544, 736, 554);
  dc.stroke();

  // Deep classical orbital eye-socket & cheekbone shading
  dc.fillStyle = "rgba(148, 156, 190, 0.32)";
  dc.beginPath();
  dc.ellipse(733, 520, 6.2, 4.4, 0, 0, Math.PI * 2);
  dc.ellipse(753, 520.5, 7.6, 4.8, 0, 0, Math.PI * 2);
  dc.fill();

  dc.fillStyle = "rgba(154, 162, 196, 0.34)";
  dc.beginPath();
  dc.ellipse(762, 532, 11, 13, 0.25, 0, Math.PI * 2);
  dc.fill();

  // Sculpted classical brow ridge
  dc.strokeStyle = "#8f98bc";
  dc.lineWidth = 2.1;
  dc.beginPath();
  dc.moveTo(726, 516.5);
  dc.quadraticCurveTo(732, 514, 739, 517);
  dc.moveTo(744, 517);
  dc.quadraticCurveTo(754, 513.5, 764, 517);
  dc.stroke();

  // Straight Greco-Roman aquiline nose
  dc.fillStyle = "#e8ecf8";
  dc.beginPath();
  dc.moveTo(739.5, 516.5);
  dc.lineTo(731, 533);
  dc.lineTo(738, 535);
  dc.lineTo(744, 532);
  dc.closePath();
  dc.fill();
  dc.strokeStyle = "#ffffff";
  dc.lineWidth = 1.7;
  dc.beginPath();
  dc.moveTo(739.5, 516.5);
  dc.lineTo(731, 533);
  dc.stroke();
  dc.strokeStyle = "#8e97ba";
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.moveTo(731, 533);
  dc.lineTo(738, 535);
  dc.lineTo(743, 532);
  dc.stroke();

  // Deadpan flat sculpted classical lips (zero smile) & chin shadow
  dc.strokeStyle = "#848cb2";
  dc.lineWidth = 1.8;
  dc.beginPath();
  dc.moveTo(731.5, 542.5);
  dc.lineTo(746, 542);
  dc.stroke();
  dc.strokeStyle = "#ffffff";
  dc.lineWidth = 1.3;
  dc.beginPath();
  dc.moveTo(733, 544.8);
  dc.lineTo(744, 544.5);
  dc.stroke();
  dc.strokeStyle = "rgba(138, 146, 178, 0.55)";
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.moveTo(734, 548);
  dc.quadraticCurveTo(738, 549.5, 742, 548);
  dc.stroke();

  // Deadpan sculpted marble eyes glancing sideways LEFT toward the passing Pelican!
  const drawMarbleEye = (ex, ey, rx, ry, lookDx) => {
    dc.fillStyle = "#fafbff";
    dc.strokeStyle = "#8c94b8";
    dc.lineWidth = 1.1;
    dc.beginPath();
    dc.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();

    // Carved Roman iris & recessed pupil tucked firmly toward the LEFT corner
    dc.fillStyle = "#9aa3c4";
    dc.beginPath();
    dc.arc(ex + lookDx, ey + 0.2, Math.max(0.5, ry * 0.88), 0, Math.PI * 2);
    dc.fill();

    dc.fillStyle = "#4c5478";
    dc.beginPath();
    dc.arc(ex + lookDx - 0.5, ey + 0.2, Math.max(0.5, ry * 0.48), 0, Math.PI * 2);
    dc.fill();

    // Sculpted upper eyelid hood
    dc.strokeStyle = "#767fa6";
    dc.lineWidth = 1.4;
    dc.beginPath();
    dc.ellipse(ex, ey - 1.3, rx + 0.5, ry, 0, Math.PI + 0.2, -0.2);
    dc.stroke();
  };
  drawMarbleEye(732.5, 521.5, 4.3, 2.5, -1.8);
  drawMarbleEye(752.5, 522.0, 5.5, 2.8, -2.4);

  // Sculpted classical ear on right side
  dc.fillStyle = "#e6eaf7";
  dc.strokeStyle = "#a5adc9";
  dc.lineWidth = 1.3;
  dc.beginPath();
  dc.ellipse(777, 526, 4.2, 7.2, 0.12, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.restore();

  // 5. Chiseled wavy Greco-Roman marble curls (top y = 485..536)
  const curls = [
    { x: 750, y: 492, r: 9.2, hi: 1 },
    { x: 739, y: 494, r: 8.6, hi: 1 },
    { x: 763, y: 494, r: 9.0, hi: 0 },
    { x: 729, y: 500, r: 7.8, hi: 1 },
    { x: 774, y: 501, r: 8.6, hi: 0 },
    { x: 747, y: 501, r: 8.4, hi: 1 },
    { x: 760, y: 503, r: 8.2, hi: 0 },
    { x: 724, y: 509, r: 6.4, hi: 1 },
    { x: 778, y: 511, r: 8.2, hi: 0 },
    { x: 736, y: 507, r: 7.2, hi: 1 },
    { x: 769, y: 513, r: 7.4, hi: 0 },
    { x: 781, y: 521, r: 6.8, hi: 0 },
    { x: 778, y: 534, r: 6.6, hi: 0 },
    { x: 773, y: 542, r: 5.8, hi: 0 },
  ];
  dc.save();
  for (const c of curls) {
    const cg = dc.createRadialGradient(c.x - c.r * 0.35, c.y - c.r * 0.35, 1, c.x, c.y, c.r);
    cg.addColorStop(0.0, "#ffffff");
    cg.addColorStop(0.65, c.hi ? "#eceff9" : "#d9def0");
    cg.addColorStop(1.0, c.hi ? "#c7cde3" : "#aab2cf");
    dc.fillStyle = cg;
    dc.beginPath();
    dc.arc(c.x, c.y, Math.max(0.5, c.r), 0, Math.PI * 2);
    dc.fill();

    // Carved marble curl swirl line
    dc.strokeStyle = "rgba(130, 138, 170, 0.65)";
    dc.lineWidth = 1.25;
    dc.beginPath();
    dc.arc(c.x, c.y, Math.max(0.5, c.r * 0.56), 0.3, Math.PI * 1.45);
    dc.stroke();
  }

  // Cyan left rim & magenta right rim over curls
  dc.strokeStyle = "#4cf2ea";
  dc.lineWidth = 1.8;
  dc.beginPath();
  dc.moveTo(720, 513);
  dc.bezierCurveTo(720, 495, 736, 485, 756, 485);
  dc.stroke();

  dc.strokeStyle = "rgba(255, 90, 200, 0.85)";
  dc.lineWidth = 1.7;
  dc.beginPath();
  dc.moveTo(768, 487);
  dc.bezierCurveTo(786, 495, 788, 522, 780, 544);
  dc.stroke();
  dc.restore();

  dc.restore();
}

/**
 * Draws the animated perspective neon grid floor strictly in y >= ROAD_Y (730..1000)
 * plus the dual glowing horizon road rails strictly at ROAD_Y = 730.
 */
function drawNeonPerspectiveFloor(g, uTape) {
  const dc = g.drawingContext;
  dc.save();

  // Clip floor grid strictly to y >= ROAD_Y
  dc.beginPath();
  dc.rect(EXT_LEFT, ROAD_Y, EXT_W, 1000 - ROAD_Y);
  dc.clip();

  // Deep cyber-violet ground with subtle horizon reflection haze
  const floorGrad = dc.createLinearGradient(0, ROAD_Y, 0, 1000);
  floorGrad.addColorStop(0.0, "#230848");
  floorGrad.addColorStop(0.32, "#170632");
  floorGrad.addColorStop(1.0, "#0f0422");
  dc.fillStyle = floorGrad;
  dc.fillRect(EXT_LEFT, ROAD_Y, EXT_W, 1000 - ROAD_Y);

  // Perspective radial grid lines fanning from horizon vanishing point (500, 560)
  const dy0 = ROAD_Y - VP_Y; // 170
  const dy1 = 1000 - VP_Y; // 440
  const fanRatio = dy1 / dy0;

  dc.lineCap = "round";
  for (let i = -24; i <= 24; i++) {
    const dx = i * 44;
    const x0 = VP_X + dx;
    const x1 = VP_X + dx * fanRatio;

    dc.strokeStyle = "rgba(255, 90, 200, 0.24)";
    dc.lineWidth = 3.4;
    dc.beginPath();
    dc.moveTo(x0, ROAD_Y);
    dc.lineTo(x1, 1000);
    dc.stroke();

    dc.strokeStyle = "rgba(255, 118, 214, 0.80)";
    dc.lineWidth = 1.35;
    dc.beginPath();
    dc.moveTo(x0, ROAD_Y);
    dc.lineTo(x1, 1000);
    dc.stroke();
  }

  // Animated perspective horizontal grid lines scrolling smoothly with uTape (brighter cyan glow)
  const zNear = 1.0;
  const zFar = dy1 / dy0; // ~2.5882
  const dZ = 0.19;
  const phase = posMod(uTape * 0.62, 1.0);

  for (let k = 0; k <= 10; k++) {
    const z = zFar - (k + phase) * dZ;
    if (z < zNear - 0.04 || z > zFar) continue;
    const y = VP_Y + dy1 / z;
    if (y < ROAD_Y || y > 1000) continue;

    const fade = smoothstep(ROAD_Y, ROAD_Y + 14, y);
    const depthScale = 0.72 + ((y - ROAD_Y) / (1000 - ROAD_Y)) * 0.85;

    dc.strokeStyle = `rgba(76, 242, 234, ${(0.28 * fade).toFixed(3)})`;
    dc.lineWidth = 5.4 * depthScale;
    dc.beginPath();
    dc.moveTo(EXT_LEFT, y);
    dc.lineTo(EXT_RIGHT, y);
    dc.stroke();

    dc.strokeStyle = `rgba(128, 255, 249, ${(0.92 * fade).toFixed(3)})`;
    dc.lineWidth = 1.75 * depthScale;
    dc.beginPath();
    dc.moveTo(EXT_LEFT, y);
    dc.lineTo(EXT_RIGHT, y);
    dc.stroke();
  }
  dc.restore();

  // Dual glowing horizon highway rail strictly at ROAD_Y = 730
  dc.save();
  dc.strokeStyle = "rgba(255, 90, 200, 0.34)";
  dc.lineWidth = 9.0;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, ROAD_Y);
  dc.lineTo(EXT_RIGHT, ROAD_Y);
  dc.stroke();

  dc.strokeStyle = "#ff5ac8";
  dc.lineWidth = 3.2;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, ROAD_Y);
  dc.lineTo(EXT_RIGHT, ROAD_Y);
  dc.stroke();

  dc.strokeStyle = "#4cf2ea";
  dc.lineWidth = 1.5;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, ROAD_Y - 1.6);
  dc.lineTo(EXT_RIGHT, ROAD_Y - 1.6);
  dc.stroke();
  dc.restore();
}

/**
 * Draws the floating rotating 3D cyan wireframe octahedron at (235, 252).
 */
function drawWireframeOctahedron(g, u) {
  const dc = g.drawingContext;
  const cx = 235;
  const cy = 252 + Math.sin(u * Math.PI * 2) * 7;
  const radius = 48;

  const rotY = u * 1.15;
  const rotX = 0.38;
  const cyRot = Math.cos(rotY);
  const syRot = Math.sin(rotY);
  const cxRot = Math.cos(rotX);
  const sxRot = Math.sin(rotX);

  const proj = OCT_VERTS.map(([vx, vy, vz]) => {
    const x1 = vx * cyRot + vz * syRot;
    const z1 = -vx * syRot + vz * cyRot;
    const y2 = vy * cxRot - z1 * sxRot;
    const z2 = vy * sxRot + z1 * cxRot;
    const pScale = 3.6 / (3.6 - z2 * 0.45);
    return {
      x: cx + x1 * radius * pScale,
      y: cy + y2 * radius * pScale,
      z: z2,
    };
  });

  dc.save();
  dc.lineJoin = "round";
  dc.lineCap = "round";

  // Translucent holographic facet tints
  for (const [ia, ib, ic] of OCT_FACES) {
    const a = proj[ia];
    const b = proj[ib];
    const c = proj[ic];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (cross > 0) {
      drawPolygon(dc, [[a.x, a.y], [b.x, b.y], [c.x, c.y]]);
      dc.fillStyle = "rgba(76, 242, 234, 0.11)";
      dc.fill();
    }
  }

  // Glow + wireframe edges
  for (let ei = 0; ei < OCT_EDGES.length; ei++) {
    const [ia, ib] = OCT_EDGES[ei];
    const a = proj[ia];
    const b = proj[ib];
    const front = (a.z + b.z) * 0.5 > -0.15;
    const col = ei >= 8 ? "#ff5ac8" : "#4cf2ea";

    dc.strokeStyle = ei >= 8 ? "rgba(255, 90, 200, 0.25)" : "rgba(76, 242, 234, 0.28)";
    dc.lineWidth = front ? 5.2 : 2.8;
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.stroke();

    dc.strokeStyle = col;
    dc.globalAlpha = front ? 0.95 : 0.42;
    dc.lineWidth = front ? 2.1 : 1.1;
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.stroke();
    dc.globalAlpha = 1;
  }

  // Vertex glow dots
  for (const v of proj) {
    dc.fillStyle = "#d9fffc";
    dc.beginPath();
    dc.arc(v.x, v.y, Math.max(0.5, v.z > 0 ? 2.8 : 1.7), 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();
}

/**
 * Draws the floating neon marquee plaque `ＡＥＳＴＨＥＴＩＣ · 鹈鹕商店 · １９８４` at (755, 178).
 */
function drawNeonMarquee(g, beat) {
  const dc = g.drawingContext;
  const cx = 755;
  const cy = 178;
  const w = 446;
  const h = 58;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const pulse = 0.88 + 0.12 * (beat ? beat.beatPulse : 0);

  dc.save();
  // Outer neon aura
  dc.fillStyle = "rgba(18, 6, 44, 0.82)";
  dc.strokeStyle = `rgba(76, 242, 234, ${(0.32 * pulse).toFixed(2)})`;
  dc.lineWidth = 7;
  dc.beginPath();
  dc.roundRect(x0, y0, w, h, 8);
  dc.fill();
  dc.stroke();

  // Inner subtle scanlines
  dc.save();
  dc.beginPath();
  dc.roundRect(x0 + 2, y0 + 2, w - 4, h - 4, 6);
  dc.clip();
  dc.fillStyle = "rgba(255, 90, 200, 0.08)";
  for (let sy = y0 + 4; sy < y0 + h; sy += 4) {
    dc.fillRect(x0, sy, w, 1.5);
  }
  dc.restore();

  // Dual neon cyan + hot-pink rim border
  dc.strokeStyle = "#4cf2ea";
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.roundRect(x0, y0, w, h, 8);
  dc.stroke();

  dc.strokeStyle = "#ff5ac8";
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.roundRect(x0 + 4, y0 + 4, w - 8, h - 8, 5);
  dc.stroke();

  // Corner registration ticks
  dc.fillStyle = "#4cf2ea";
  dc.fillRect(x0 - 3, y0 - 3, 10, 3);
  dc.fillRect(x0 + w - 7, y0 + h, 10, 3);
  dc.fillStyle = "#ff5ac8";
  dc.fillRect(x0 + w - 7, y0 - 3, 10, 3);
  dc.fillRect(x0 - 3, y0 + h, 10, 3);

  // Marquee text with crisp chromatic glow shadow
  const label = "ＡＥＳＴＨＥＴＩＣ · 鹈鹕商店 · １９８４";
  dc.font = "bold 20px 'PingFang SC', 'Hiragino Sans GB', 'Menlo', sans-serif";
  dc.textAlign = "center";
  dc.textBaseline = "middle";

  dc.fillStyle = "rgba(255, 90, 200, 0.72)";
  dc.fillText(label, cx + 1.8, cy + 1.2);
  dc.fillStyle = "rgba(76, 242, 234, 0.72)";
  dc.fillText(label, cx - 1.5, cy - 0.8);
  dc.fillStyle = "#f9fbff";
  dc.fillText(label, cx, cy);
  dc.restore();
}

/**
 * Draws the stylized Vaporwave Neon Pelican + Bicycle from `pose`.
 * When `ghostColor` is set, draws a flat RGB chromatic-aberration silhouette pass.
 */
function drawVaporPelican(g, pose, opts = {}) {
  const dc = g.drawingContext;
  const s = pose.scale;
  const ghostColor = opts.ghostColor || null;
  const ghostAlpha = opts.ghostAlpha ?? 0.5;
  const dx = opts.dx ?? 0;

  dc.save();
  if (dx !== 0) dc.translate(dx, 0);
  if (ghostColor) {
    dc.globalAlpha = ghostAlpha;
  }

  const colCyan = "#4cf2ea";
  const colPink = "#ff5ac8";
  const colDark = "#180636";

  const drawWheel = (hub) => {
    const r = Math.max(0.5, pose.wheelRadius);
    dc.save();
    dc.translate(hub.x, hub.y);

    if (ghostColor) {
      dc.strokeStyle = ghostColor;
      dc.lineWidth = 6.5 * s;
      dc.beginPath();
      dc.arc(0, 0, r, 0, Math.PI * 2);
      dc.stroke();
      dc.fillStyle = ghostColor;
      dc.globalAlpha = ghostAlpha * 0.25;
      dc.beginPath();
      dc.arc(0, 0, Math.max(0.5, r - 4 * s), 0, Math.PI * 2);
      dc.fill();
      dc.restore();
      return;
    }

    // Aero chrome-cyan / neon-pink disc wheel gradient rotating subtly with wheelRot
    const rotA = pose.wheelRot * 0.35;
    const gx = Math.cos(rotA) * r;
    const gy = Math.sin(rotA) * r;
    const discGrad = dc.createLinearGradient(-gx, -gy, gx, gy);
    discGrad.addColorStop(0.0, "rgba(76, 242, 234, 0.34)");
    discGrad.addColorStop(0.45, "rgba(42, 14, 88, 0.55)");
    discGrad.addColorStop(1.0, "rgba(255, 90, 200, 0.38)");
    dc.fillStyle = discGrad;
    dc.beginPath();
    dc.arc(0, 0, Math.max(0.5, r - 3 * s), 0, Math.PI * 2);
    dc.fill();

    // Etched neon spokes
    dc.lineWidth = 1.6 * s;
    for (let i = 0; i < 8; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 4;
      dc.strokeStyle = i % 2 === 0 ? "rgba(76, 242, 234, 0.85)" : "rgba(255, 90, 200, 0.78)";
      dc.beginPath();
      dc.moveTo(0, 0);
      dc.lineTo(Math.cos(a) * (r - 4 * s), Math.sin(a) * (r - 4 * s));
      dc.stroke();
    }

    // Glowing outer tire rim aura + sleek tire + dual neon rim rings
    dc.shadowBlur = 12 * s;
    dc.shadowColor = colPink;
    dc.strokeStyle = "rgba(255, 90, 200, 0.6)";
    dc.lineWidth = 7.5 * s;
    dc.beginPath();
    dc.arc(0, 0, r, 0, Math.PI * 2);
    dc.stroke();

    dc.shadowBlur = 0;
    dc.strokeStyle = "#14062b";
    dc.lineWidth = 5.4 * s;
    dc.beginPath();
    dc.arc(0, 0, r, 0, Math.PI * 2);
    dc.stroke();

    dc.strokeStyle = colCyan;
    dc.lineWidth = 2.0 * s;
    dc.beginPath();
    dc.arc(0, 0, r + 1.5 * s, 0, Math.PI * 2);
    dc.stroke();

    dc.strokeStyle = colPink;
    dc.lineWidth = 1.5 * s;
    dc.beginPath();
    dc.arc(0, 0, Math.max(0.5, r - 4.0 * s), 0, Math.PI * 2);
    dc.stroke();

    // Hub cap
    dc.fillStyle = colCyan;
    dc.beginPath();
    dc.arc(0, 0, Math.max(0.5, 5.5 * s), 0, Math.PI * 2);
    dc.fill();
    dc.restore();
  };

  dc.lineCap = "round";
  dc.lineJoin = "round";

  // 1. Back leg & rear crank (behind bike frame)
  dc.strokeStyle = ghostColor || "#b5368c";
  dc.lineWidth = 7.2 * s;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.leftKnee.x, pose.leftKnee.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();

  dc.strokeStyle = ghostColor || "#8e3ab8";
  dc.lineWidth = 3.5 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();

  // 2. Disc wheels
  drawWheel(pose.rearHub);
  drawWheel(pose.frontHub);

  // 3. Neon-trimmed bicycle frame
  const drawFramePass = (strokeCol, width, offsetY = 0) => {
    dc.strokeStyle = strokeCol;
    dc.lineWidth = width;
    dc.beginPath();
    dc.moveTo(pose.rearHub.x, pose.rearHub.y + offsetY);
    dc.lineTo(pose.bb.x, pose.bb.y + offsetY);
    dc.lineTo(pose.seatCluster.x, pose.seatCluster.y + offsetY);
    dc.lineTo(pose.rearHub.x, pose.rearHub.y + offsetY);

    dc.moveTo(pose.seatCluster.x, pose.seatCluster.y + offsetY);
    dc.lineTo(pose.headTop.x, pose.headTop.y + offsetY);
    dc.moveTo(pose.bb.x, pose.bb.y + offsetY);
    dc.lineTo(pose.headBot.x, pose.headBot.y + offsetY);

    dc.moveTo(pose.frontHub.x, pose.frontHub.y + offsetY);
    dc.lineTo(pose.headTop.x, pose.headTop.y + offsetY);
    dc.lineTo(pose.stemTop.x, pose.stemTop.y + offsetY);
    dc.lineTo(pose.barGrip.x, pose.barGrip.y + offsetY);

    dc.moveTo(pose.seatCluster.x, pose.seatCluster.y + offsetY);
    dc.lineTo((pose.saddleRear.x + pose.saddleFront.x) * 0.5, pose.saddleRear.y + 3 * s + offsetY);
    dc.stroke();
  };

  if (ghostColor) {
    drawFramePass(ghostColor, 5.2 * s);
  } else {
    drawFramePass("rgba(76, 242, 234, 0.72)", 7.4 * s, -0.8 * s);
    drawFramePass("#250e4d", 4.6 * s, 0);
    drawFramePass("rgba(255, 90, 200, 0.85)", 1.6 * s, 1.2 * s);
  }

  // Saddle, chainring & bell
  dc.strokeStyle = ghostColor || colDark;
  dc.lineWidth = 7 * s;
  dc.beginPath();
  dc.moveTo(pose.saddleRear.x, pose.saddleRear.y);
  dc.lineTo(pose.saddleFront.x, pose.saddleFront.y);
  dc.stroke();
  if (!ghostColor) {
    dc.strokeStyle = colCyan;
    dc.lineWidth = 1.6 * s;
    dc.beginPath();
    dc.moveTo(pose.saddleRear.x, pose.saddleRear.y - 2 * s);
    dc.lineTo(pose.saddleFront.x, pose.saddleFront.y - 2 * s);
    dc.stroke();
  }

  dc.fillStyle = ghostColor || colPink;
  dc.beginPath();
  dc.arc(pose.bb.x, pose.bb.y, Math.max(0.5, 9 * s), 0, Math.PI * 2);
  dc.fill();
  if (!ghostColor) {
    dc.fillStyle = colCyan;
    dc.beginPath();
    dc.arc(pose.bellPos.x, pose.bellPos.y, Math.max(0.5, 4.5 * s), 0, Math.PI * 2);
    dc.fill();
  }

  // Helper for bezier filled & dual-rimmed Pelican anatomy
  const drawBodyShape = (pathFn, fillStyle, cyanRim = true, pinkRim = true) => {
    dc.beginPath();
    pathFn();
    if (ghostColor) {
      dc.fillStyle = ghostColor;
      dc.fill();
      dc.strokeStyle = ghostColor;
      dc.lineWidth = 3.2 * s;
      dc.stroke();
      return;
    }
    dc.fillStyle = fillStyle;
    dc.fill();
    if (pinkRim) {
      dc.strokeStyle = colPink;
      dc.lineWidth = 2.8 * s;
      dc.stroke();
    }
    if (cyanRim) {
      dc.save();
      dc.translate(-1.2 * s, -1.2 * s);
      dc.beginPath();
      pathFn();
      dc.strokeStyle = colCyan;
      dc.lineWidth = 2.0 * s;
      dc.stroke();
      dc.restore();
    }
  };

  // 4. Alabaster-white Pelican body & tail
  const bodyGrad = ghostColor
    ? ghostColor
    : (() => {
        const bg = dc.createLinearGradient(
          pose.bodyCenter.x - 40 * s,
          pose.bodyCenter.y - 34 * s,
          pose.bodyCenter.x + 25 * s,
          pose.hip.y + 12 * s
        );
        bg.addColorStop(0.0, "#ffffff");
        bg.addColorStop(0.65, "#efeafc");
        bg.addColorStop(1.0, "#d5caf0");
        return bg;
      })();

  drawBodyShape(() => {
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
  }, bodyGrad);

  // 5. S-curve neck
  const traceNeck = () => {
    dc.beginPath();
    dc.moveTo(pose.neckCurve[0].x, pose.neckCurve[0].y);
    for (let i = 1; i < pose.neckCurve.length; i++) {
      dc.lineTo(pose.neckCurve[i].x, pose.neckCurve[i].y);
    }
  };
  if (ghostColor) {
    traceNeck();
    dc.strokeStyle = ghostColor;
    dc.lineWidth = 20 * s;
    dc.stroke();
  } else {
    traceNeck();
    dc.strokeStyle = colPink;
    dc.lineWidth = 23 * s;
    dc.stroke();

    dc.save();
    dc.translate(-1.5 * s, -1.0 * s);
    traceNeck();
    dc.strokeStyle = colCyan;
    dc.lineWidth = 21.5 * s;
    dc.stroke();
    dc.restore();

    traceNeck();
    dc.strokeStyle = "#faf8ff";
    dc.lineWidth = 18 * s;
    dc.stroke();
  }

  // 6. Crest tufts & Head
  const drawHeadPath = () => {
    dc.moveTo(pose.crest1.x, pose.crest1.y);
    dc.lineTo(pose.head.x - 6 * s, pose.head.y - 16 * s);
    dc.lineTo(pose.crest2.x, pose.crest2.y);
    dc.lineTo(pose.head.x + 6 * s, pose.head.y - 17 * s);
    dc.closePath();
  };
  drawBodyShape(drawHeadPath, "#ffffff");

  if (ghostColor) {
    dc.fillStyle = ghostColor;
    dc.beginPath();
    dc.arc(pose.head.x, pose.head.y, Math.max(0.5, 17 * s), 0, Math.PI * 2);
    dc.fill();
  } else {
    dc.fillStyle = "#ffffff";
    dc.strokeStyle = colPink;
    dc.lineWidth = 2.6 * s;
    dc.beginPath();
    dc.arc(pose.head.x, pose.head.y, Math.max(0.5, 17 * s), 0, Math.PI * 2);
    dc.fill();
    dc.stroke();

    dc.strokeStyle = colCyan;
    dc.lineWidth = 2.0 * s;
    dc.beginPath();
    dc.arc(pose.head.x, pose.head.y, Math.max(0.5, 17 * s), Math.PI * 0.72, Math.PI * 1.78);
    dc.stroke();
  }

  // 7. Sunset-coral / hot-magenta gradient throat pouch
  const pouchGrad = ghostColor
    ? ghostColor
    : (() => {
        const pg = dc.createLinearGradient(
          pose.pouchBase.x,
          pose.beakBaseTop.y,
          pose.beakTip.x,
          pose.pouchMid.y + 8 * s
        );
        pg.addColorStop(0.0, "#ffbb66");
        pg.addColorStop(0.45, "#ff688c");
        pg.addColorStop(1.0, "#eb249c");
        return pg;
      })();

  drawBodyShape(() => {
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
  }, pouchGrad);

  // 8. Upper mandible + hooked beak tip
  const beakGrad = ghostColor
    ? ghostColor
    : (() => {
        const bkg = dc.createLinearGradient(
          pose.beakBaseTop.x,
          pose.beakBaseTop.y,
          pose.beakHook.x,
          pose.beakHook.y
        );
        bkg.addColorStop(0.0, "#ffe478");
        bkg.addColorStop(0.6, "#ff8b6e");
        bkg.addColorStop(1.0, "#ff5ac8");
        return bkg;
      })();

  drawBodyShape(() => {
    dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
    dc.lineTo(pose.beakTip.x, pose.beakTip.y);
    dc.lineTo(pose.beakHook.x, pose.beakHook.y);
    dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
    dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
    dc.closePath();
  }, beakGrad);

  // 9. Eye (main pass only)
  if (!ghostColor) {
    dc.fillStyle = "#ffffff";
    dc.strokeStyle = colDark;
    dc.lineWidth = 1.8 * s;
    dc.beginPath();
    dc.arc(pose.eye.x, pose.eye.y, Math.max(0.5, 5 * s), 0, Math.PI * 2);
    dc.fill();
    dc.stroke();

    dc.fillStyle = colDark;
    dc.beginPath();
    dc.arc(pose.eye.x + 1.5 * s, pose.eye.y, Math.max(0.5, 2.3 * s), 0, Math.PI * 2);
    dc.fill();

    dc.fillStyle = colCyan;
    dc.beginPath();
    dc.arc(pose.eye.x + 2.2 * s, pose.eye.y - 1.1 * s, Math.max(0.5, 0.9 * s), 0, Math.PI * 2);
    dc.fill();
  }

  // 10. Wing reaching to handlebars
  drawBodyShape(
    () => {
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
    },
    ghostColor || "#e7dff8"
  );

  // 11. Front leg, crank & pedals
  if (!ghostColor) {
    dc.strokeStyle = colCyan;
    dc.lineWidth = 9.2 * s;
    dc.beginPath();
    dc.moveTo(pose.hip.x, pose.hip.y);
    dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
    dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
    dc.stroke();
  }
  dc.strokeStyle = ghostColor || "#ff6c8c";
  dc.lineWidth = 6.8 * s;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  dc.strokeStyle = ghostColor || colCyan;
  dc.lineWidth = 3.8 * s;
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  dc.fillStyle = ghostColor || colPink;
  dc.fillRect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 3 * s, 16 * s, 6 * s);
  dc.fillRect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s);

  dc.restore();
}

/**
 * Draws Bar 2 scrolling VHS tracking snow / static glitch bands (u in [2.0, 4.0)).
 */
function drawVHSTrackingBands(g, u) {
  if (u < 2.0 || u >= 4.0) return;
  const dc = g.drawingContext;
  const env = smoothstep(2.0, 2.06, u) * (1 - smoothstep(3.92, 4.0, u));
  if (env <= 0.01) return;

  const q = Math.floor(u * 24);
  const rand = prng(q * 7919 + 1884);

  // Keep bands cleanly in upper sky [215..385] & lower grid [740..975] so marble bust remains un-glitched
  const bands = [
    { y: 215 + posMod((u - 2.0) * 145, 160), h: 14, count: 80 },
    { y: 740 + posMod((u - 2.0) * 195 + 70, 210), h: 18, count: 95 },
    { y: 790 + posMod((u - 2.0) * 125 + 150, 185), h: 10, count: 65 },
  ];

  dc.save();
  dc.globalAlpha = env;
  for (const band of bands) {
    dc.fillStyle = "rgba(18, 4, 38, 0.28)";
    dc.fillRect(EXT_LEFT, band.y, EXT_W, band.h);

    for (let i = 0; i < band.count; i++) {
      const sx = EXT_LEFT + rand() * EXT_W;
      const sy = band.y + rand() * (band.h - 2);
      const sw = 6 + rand() * 54;
      const sh = 1.2 + rand() * 2.0;
      const pick = rand();
      dc.fillStyle =
        pick > 0.68
          ? `rgba(255, 255, 255, ${(0.35 + rand() * 0.48).toFixed(2)})`
          : pick > 0.34
            ? `rgba(76, 242, 234, ${(0.32 + rand() * 0.45).toFixed(2)})`
            : `rgba(255, 90, 200, ${(0.32 + rand() * 0.45).toFixed(2)})`;
      dc.fillRect(sx, sy, sw, sh);
    }
  }

  // Brief half-beat loop snap horizontal tracking flash lines on the lower floor
  if (u < 2.88 && posMod(u - 2.0, 0.25) < 0.055) {
    dc.fillStyle = "rgba(76, 242, 234, 0.24)";
    dc.fillRect(EXT_LEFT, 768 + rand() * 140, EXT_W, 3);
    dc.fillStyle = "rgba(255, 90, 200, 0.24)";
    dc.fillRect(EXT_LEFT, 773 + rand() * 140, EXT_W, 2.5);
  }
  dc.restore();
}

/**
 * Draws the top-right green CRT VCR OSD (`PLAY ▶ 0.79x`, blinking `⟲ LOOP 1/2 BEAT`, `VHS · HI-FI`)
 * during Bar 2 (u in [2.0, 4.0)).
 */
function drawVCROSD(g, u) {
  if (u < 2.0 || u >= 4.0) return;
  const env = smoothstep(2.0, 2.06, u) * (1 - smoothstep(3.92, 4.0, u));
  if (env <= 0.01) return;

  const dc = g.drawingContext;
  dc.save();
  dc.globalAlpha = env;
  dc.textAlign = "right";
  dc.textBaseline = "top";
  dc.lineJoin = "round";

  const drawCRTText = (txt, x, y, font, fillCol) => {
    dc.font = font;
    dc.shadowBlur = 10;
    dc.shadowColor = "rgba(82, 255, 136, 0.7)";
    dc.strokeStyle = "rgba(5, 22, 10, 0.92)";
    dc.lineWidth = 4.5;
    dc.strokeText(txt, x, y);
    dc.fillStyle = fillCol;
    dc.fillText(txt, x, y);
    dc.shadowBlur = 0;
  };

  drawCRTText("PLAY ▶ 0.79x", 950, 48, "bold 26px 'Menlo', 'Courier New', monospace", "#6eff9b");

  if (u < 3.15 && posMod(u - 2.0, 0.25) < 0.18) {
    const loopTxt = "LOOP 1/2 BEAT";
    const loopFont = "bold 16px 'Menlo', 'Courier New', monospace";
    drawCRTText(loopTxt, 950, 82, loopFont, "#b8ffcb");

    // Crisp vector counter-clockwise loop arrow icon just left of LOOP 1/2 BEAT
    dc.font = loopFont;
    const tw = dc.measureText(loopTxt).width;
    const lx = 950 - tw - 16;
    const ly = 90;
    dc.save();
    dc.shadowBlur = 8;
    dc.shadowColor = "rgba(82, 255, 136, 0.7)";
    dc.strokeStyle = "rgba(5, 22, 10, 0.9)";
    dc.lineWidth = 4.4;
    dc.beginPath();
    dc.arc(lx, ly, 5.5, 0.4, Math.PI * 1.9);
    dc.stroke();
    dc.strokeStyle = "#b8ffcb";
    dc.lineWidth = 2.0;
    dc.beginPath();
    dc.arc(lx, ly, 5.5, 0.4, Math.PI * 1.9);
    dc.stroke();
    // Arrowhead
    dc.fillStyle = "#b8ffcb";
    dc.beginPath();
    dc.moveTo(lx + 4.8, ly - 5.2);
    dc.lineTo(lx + 7.2, ly - 0.8);
    dc.lineTo(lx + 2.0, ly - 1.4);
    dc.closePath();
    dc.fill();
    dc.restore();
  }

  drawCRTText("VHS · HI-FI", 950, 106, "bold 15px 'Menlo', 'Courier New', monospace", "#4fe67e");
  dc.restore();
}

export default function render(ctx) {
  const { p, g, kit, localTime, beat, meta } = ctx;
  const u = localTime;
  const sceneMeta = meta || META;

  // 1. Baked static cyber-twilight sky, sliced sun, wireframe mountains & low-poly palms
  const skyBg = kit.bakeLayer("s18_vapor_sky_v1", 1840, 1000, bakeSkyBackdrop);
  p.push();
  p.imageMode(p.CENTER);
  p.image(skyBg, 500, 500, 1840, 1000);
  p.pop();

  // 2. Bar 2 tape-loop effective time `uTape`
  const uTape = getTapeTime(u);
  const px = getScenePelicanX(uTape);
  const tAnim = SCENE_START_T + uTape;

  // 3. Perspective neon grid floor (y >= 730) & dual horizon rails strictly at ROAD_Y = 730
  drawNeonPerspectiveFloor(g, uTape);

  // 4. Floating rotating 3D cyan wireframe octahedron & vaporwave marquee plaque
  drawWireframeOctahedron(g, u);
  drawNeonMarquee(g, beat);

  // 5. Rock-steady baked pure-white Greco-Roman marble bust + checkerboard pedestal (x = 755)
  const bustPg = kit.bakeLayer("s18_marble_bust_v1", BUST_LAYER_W, BUST_LAYER_H, bakeMarbleBust);
  g.drawingContext.drawImage(bustPg.drawingContext.canvas, BUST_LAYER_X, BUST_LAYER_Y);

  // 6. Ground neon reflection pool beneath Pelican at ROAD_Y = 730
  const dc = g.drawingContext;
  dc.save();
  const refl = dc.createRadialGradient(px, ROAD_Y + 4, 6, px, ROAD_Y + 4, 128);
  refl.addColorStop(0.0, "rgba(76, 242, 234, 0.34)");
  refl.addColorStop(0.48, "rgba(255, 90, 200, 0.24)");
  refl.addColorStop(1.0, "rgba(19, 6, 40, 0)");
  dc.fillStyle = refl;
  dc.beginPath();
  dc.ellipse(px, ROAD_Y + 4, 128, 12, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // 7. Vaporwave Pelican + Bar 2 RGB chromatic-aberration ghost silhouettes
  const pose = getRigPose(tAnim, {
    x: px,
    y: ROAD_Y,
    scale: 1.0,
  });

  if (u >= 2.0 && u < 3.15) {
    const splitAlpha = u < 2.88 ? 0.52 : 0.52 * (1 - smoothstep(2.88, 3.15, u));
    drawVaporPelican(g, pose, { ghostColor: "#4cf2ea", ghostAlpha: splitAlpha, dx: -7 });
    drawVaporPelican(g, pose, { ghostColor: "#ff5ac8", ghostAlpha: splitAlpha, dx: 7 });
  }
  drawVaporPelican(g, pose);

  // 8. Bar 2 VHS tracking snow bands & top-right green CRT VCR OSD
  drawVHSTrackingBands(g, u);
  drawVCROSD(g, u);

  // 9. Steady Vaporwave Title Card (zero chromatic split)
  drawEraTitleCard(g, sceneMeta, u);
}
