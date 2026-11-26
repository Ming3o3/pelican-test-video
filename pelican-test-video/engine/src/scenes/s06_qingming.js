/**
 * Scene #06 — 清明上河图 · Qingming Scroll (c. 1100 CE), t in [35.0, 41.0).
 * Northern Song Zhang Zeduan Jiehua & light-color ink scroll:
 * Rainbow Bridge rising cleanly between flat portal-aligned streets (ROAD_Y = 730 at x <= 120, x >= 880),
 * Bian River cargo boat lowering its mast beneath the arch with punting boatmen looking up,
 * swaying willows, fictional Song shops ("汴京车行", "香饮子", "孙记正店", "车马茶坊"),
 * and 16 Song citizens sequentially turning, halting shoulder poles, and leaning out of tavern windows
 * as the gongbi-ink Pelican pedals over the wooden arch.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  CROSS_SPEED,
  ROAD_Y,
  clamp,
  getScenePelicanX,
  smoothstep,
} from "../beat.js";
import {
  drawFeibaiStroke,
  drawFoliageDots,
  drawInkWash,
  drawRedSeal,
  getInkPaperLayer,
} from "../kit/ink.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[5];

const BRIDGE_X0 = 120;
const BRIDGE_X1 = 880;
const BRIDGE_SPAN = BRIDGE_X1 - BRIDGE_X0; // 760
const BRIDGE_PEAK_Y = 615;
const BRIDGE_RISE = ROAD_Y - BRIDGE_PEAK_Y; // 115

const INK_DARK = "#221b14";
const INK_MID = "#584836";
const WOOD_DARK = "#593b22";
const WOOD_MID = "#7e5533";
const WOOD_LIGHT = "#a77c4e";

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Pure terrain function for Scene #06:
 * Strictly flat at ROAD_Y = 730 for x <= 120 and x >= 880 so u = 0 and u = 6 align seamlessly with portals.
 * Smooth C1 Song Rainbow Bridge arch across x in [120, 880] peaking at y = 615 (x = 500).
 */
export function getBridgeYAndSlope(x) {
  if (x <= BRIDGE_X0 || x >= BRIDGE_X1) {
    return { y: ROAD_Y, slope: 0, angle: 0 };
  }
  const s = (x - BRIDGE_X0) / BRIDGE_SPAN;
  const sinPiS = Math.sin(Math.PI * s);
  const y = ROAD_Y - BRIDGE_RISE * sinPiS * sinPiS;
  const slope = -BRIDGE_RISE * (Math.PI / BRIDGE_SPAN) * Math.sin(2 * Math.PI * s);
  const angle = Math.atan(slope);
  return { y, slope, angle };
}

/**
 * Computes exact rig ground anchor (x, y), frame pitch `wheelie`, and rider `lean`
 * so both wheels (radius 62, wheelbase 172) kiss the curved bridge deck without floating or clipping.
 */
function getBikeOnBridge(cx) {
  const R = 62;
  const halfBase = 86;
  if (cx <= BRIDGE_X0 - halfBase - 12 || cx >= BRIDGE_X1 + halfBase + 12) {
    return { x: cx, y: ROAD_Y, wheelie: 0, lean: 0 };
  }

  let theta = getBridgeYAndSlope(cx).angle;
  let rigX = cx;

  for (let iter = 0; iter < 4; iter++) {
    const cosT = Math.cos(theta);
    const sr = rigX - halfBase * cosT;
    const sf = rigX + halfBase * cosT;

    const br = getBridgeYAndSlope(sr);
    const bf = getBridgeYAndSlope(sf);

    const hubRx = sr + R * Math.sin(br.angle);
    const hubRy = br.y - R * Math.cos(br.angle);
    const hubFx = sf + R * Math.sin(bf.angle);
    const hubFy = bf.y - R * Math.cos(bf.angle);

    theta = Math.atan2(hubFy - hubRy, hubFx - hubRx);
    const midHubX = 0.5 * (hubRx + hubFx);
    const dxErr = cx - (midHubX - R * Math.sin(theta));
    rigX = midHubX - R * Math.sin(theta) + dxErr * 0.65;
  }

  const sr = rigX - halfBase * Math.cos(theta);
  const sf = rigX + halfBase * Math.cos(theta);
  const br = getBridgeYAndSlope(sr);
  const bf = getBridgeYAndSlope(sf);
  const hubRx = sr + R * Math.sin(br.angle);
  const hubRy = br.y - R * Math.cos(br.angle);
  const hubFx = sf + R * Math.sin(bf.angle);
  const hubFy = bf.y - R * Math.cos(bf.angle);
  theta = Math.atan2(hubFy - hubRy, hubFx - hubRx);
  const midHubY = 0.5 * (hubRy + hubFy);

  return {
    x: cx,
    y: midHubY + R * Math.cos(theta),
    wheelie: theta,
    lean: -theta * 0.55,
  };
}

/**
 * C1-smooth monotone walk clock that gradually decelerates to a complete stop at stopU.
 */
function smoothStopClock(u, stopU, decel = 0.42) {
  if (u <= stopU - decel) return u;
  if (u >= stopU) return stopU - decel * 0.5;
  const s = (u - (stopU - decel)) / decel;
  return stopU - decel + decel * (s - 0.5 * s * s);
}

function drawSongRoof(pg, cx, eaveY, width, height, ridgeOverhang = 16) {
  const dc = pg.drawingContext;
  const hw = width * 0.5;
  const rw = hw - ridgeOverhang;

  dc.save();
  dc.beginPath();
  dc.moveTo(cx - hw - 10, eaveY + 4);
  dc.quadraticCurveTo(cx - hw * 0.55, eaveY - height * 0.45, cx - rw, eaveY - height);
  dc.lineTo(cx + rw, eaveY - height);
  dc.quadraticCurveTo(cx + hw * 0.55, eaveY - height * 0.45, cx + hw + 10, eaveY + 4);
  dc.quadraticCurveTo(cx, eaveY - 5, cx - hw - 10, eaveY + 4);
  dc.closePath();
  dc.fillStyle = "rgba(86, 91, 82, 0.88)";
  dc.fill();
  dc.strokeStyle = INK_DARK;
  dc.lineWidth = 2;
  dc.stroke();

  dc.strokeStyle = "rgba(34, 27, 20, 0.36)";
  dc.lineWidth = 1.1;
  const cols = Math.max(6, Math.round(width / 16));
  for (let i = 1; i < cols; i++) {
    const f = i / cols;
    const tx = cx - rw + f * rw * 2;
    const bx = cx - hw + f * hw * 2;
    dc.beginPath();
    dc.moveTo(tx, eaveY - height);
    dc.quadraticCurveTo((tx + bx) * 0.5, eaveY - height * 0.45, bx, eaveY + 1);
    dc.stroke();
  }

  dc.strokeStyle = INK_DARK;
  dc.lineWidth = 3.2;
  dc.beginPath();
  dc.moveTo(cx - rw - 5, eaveY - height - 2);
  dc.lineTo(cx + rw + 5, eaveY - height - 2);
  dc.stroke();
  dc.restore();
}

function drawSpokedCartWheel(pg, cx, cy, r, tilt = 0) {
  pg.push();
  pg.translate(cx, cy);
  pg.scale(Math.cos(tilt), 1);
  pg.noFill();
  pg.stroke(WOOD_DARK);
  pg.strokeWeight(5);
  pg.circle(0, 0, r * 2);
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.5);
  pg.circle(0, 0, r * 2 + 4);
  pg.circle(0, 0, r * 2 - 4);
  pg.stroke(WOOD_MID);
  pg.strokeWeight(2);
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    pg.line(0, 0, Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
  }
  pg.fill(WOOD_DARK);
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.4);
  pg.circle(0, 0, 10);
  pg.pop();
}

function drawWillowCrownBase(pg, x, y, scale, flip = 1, seed = 100) {
  pg.push();
  pg.translate(x, y);
  pg.scale(flip * scale, scale);

  drawFeibaiStroke(
    pg,
    [
      [0, 0],
      [-10, -68],
      [14, -148],
      [-8, -225],
      [18, -280],
    ],
    13,
    "#33281d",
    0.42,
    seed
  );
  drawFeibaiStroke(
    pg,
    [
      [6, -155],
      [-65, -205],
      [-115, -238],
    ],
    7,
    "#3b2e21",
    0.4,
    seed + 1
  );
  drawFeibaiStroke(
    pg,
    [
      [8, -195],
      [78, -245],
      [124, -268],
    ],
    6.5,
    "#3b2e21",
    0.4,
    seed + 2
  );

  const patches = [
    [-85, -235, 74, 34],
    [15, -280, 92, 42],
    [98, -245, 72, 32],
    [-25, -205, 65, 30],
  ];
  for (let i = 0; i < patches.length; i++) {
    const [px, py, rx, ry] = patches[i];
    drawInkWash(
      pg,
      [
        [px - rx, py],
        [px, py - ry],
        [px + rx, py],
        [px, py + ry],
      ],
      "#6f835f",
      0.24,
      { layers: 2, edgeAlpha: 0.08 }
    );
    drawFoliageDots(pg, px, py, rx * 0.85, ry * 0.78, 36, "#4b5a3f", seed + 10 + i);
  }
  pg.pop();
}

function drawDistantBianjingBackdrop(pg) {
  const dc = pg.drawingContext;

  // Soft misty horizon hills & ink-wash distant riverbank silhouette
  drawInkWash(
    pg,
    [
      [-420, 425],
      [-140, 385],
      [180, 405],
      [480, 362],
      [780, 388],
      [1100, 368],
      [1420, 400],
      [1420, 560],
      [-420, 560],
    ],
    "#968b74",
    0.15,
    { layers: 3, edgeAlpha: 0.05 }
  );

  // Organic misty tree groves along distant Bian River shore (replacing geometric ellipses!)
  const groveCenters = [-310, -175, -50, 145, 290, 435, 610, 775, 940, 1140, 1300];
  for (let i = 0; i < groveCenters.length; i++) {
    const gx = groveCenters[i];
    const gy = 432 + Math.sin(i * 1.9) * 16;
    drawInkWash(
      pg,
      [
        [gx - 68, gy + 14],
        [gx - 46, gy - 12],
        [gx - 12, gy - 24],
        [gx + 22, gy - 18],
        [gx + 58, gy - 4],
        [gx + 72, gy + 14],
      ],
      "#7d8a72",
      0.16,
      { layers: 2, edgeAlpha: 0.04 }
    );
    drawFoliageDots(pg, gx, gy - 4, 52, 16, 22, "#6a755e", 6400 + i);
  }

  // Distant Bianjing City Gate Tower (宋代城门敌楼) with double eaves & crenelated wall
  dc.save();
  dc.globalAlpha = 0.38;
  pg.fill("#665b4c");
  pg.noStroke();
  pg.rect(470, 392, 260, 22);
  for (let cx = 474; cx < 726; cx += 18) {
    pg.rect(cx, 386, 10, 6);
  }
  // Tower pavilion
  pg.fill("#584d3f");
  pg.rect(552, 344, 96, 42);
  drawSongRoof(pg, 600, 348, 126, 22, 14);
  drawSongRoof(pg, 600, 326, 98, 18, 12);
  dc.restore();

  // Horizontal Song mist veil softening distant shore transitions
  dc.save();
  const mist = dc.createLinearGradient(0, 425, 0, 575);
  mist.addColorStop(0, "rgba(224, 208, 178, 0)");
  mist.addColorStop(0.5, "rgba(224, 208, 178, 0.56)");
  mist.addColorStop(1, "rgba(224, 208, 178, 0)");
  dc.fillStyle = mist;
  dc.fillRect(-420, 425, 1840, 150);
  dc.restore();
}

function drawRainbowBridgeStatic(pg) {
  const dc = pg.drawingContext;

  // Stone masonry abutments anchored seamlessly into the riverbank retaining walls
  const drawAbutment = (x0, x1, dir) => {
    const topY = ROAD_Y - 2;
    const botY = 852;
    const pts = [
      [x0, topY],
      [x1, topY + 24],
      [x1 + dir * 16, botY],
      [x0 - dir * 24, botY + 12],
    ];
    drawInkWash(pg, pts, "#8c806a", 0.68, { layers: 3, edgeAlpha: 0.42 });
    pg.stroke(INK_MID);
    pg.strokeWeight(1.2);
    for (let y = topY + 18; y < botY - 4; y += 16) {
      const f = (y - topY) / (botY - topY);
      const lx = x0 - dir * 22 * f;
      const rx = x1 + dir * 14 * f;
      pg.line(lx, y, rx, y);
      const step = 24;
      const shift = ((Math.round(y / 16) % 2) * step) / 2;
      for (let bx = Math.min(lx, rx) + shift; bx < Math.max(lx, rx); bx += step) {
        pg.line(bx, y, bx, y + 16);
      }
    }
    // Open U-shaped stone masonry outline (no hard bottom edge) + submerged water wash
    pg.noFill();
    pg.stroke(INK_DARK);
    pg.strokeWeight(1.8);
    pg.line(x0, topY, x1, topY + 24);
    pg.line(x1, topY + 24, x1 + dir * 16, botY);
    pg.line(x0, topY, x0 - dir * 24, botY + 12);

    // Soft water transition & lapping ripples overlapping submerged pier base
    const baseLeft = Math.min(x0 - dir * 24, x1 + dir * 16);
    const baseRight = Math.max(x0 - dir * 24, x1 + dir * 16);
    const waterGrad = dc.createLinearGradient(0, botY - 16, 0, botY + 14);
    waterGrad.addColorStop(0, "rgba(120, 140, 123, 0)");
    waterGrad.addColorStop(1, "rgba(120, 140, 123, 0.92)");
    dc.save();
    dc.fillStyle = waterGrad;
    dc.fillRect(baseLeft - 6, botY - 16, baseRight - baseLeft + 12, 32);
    dc.restore();

    pg.stroke("rgba(238, 228, 204, 0.78)");
    pg.strokeWeight(1.8);
    pg.line(baseLeft - 10, botY + 6, baseRight + 12, botY + 3);
    pg.stroke("rgba(58, 68, 58, 0.42)");
    pg.strokeWeight(1.4);
    pg.line(baseLeft - 4, botY + 11, baseRight + 16, botY + 8);
  };
  drawAbutment(112, 188, 1);
  drawAbutment(812, 888, -1);

  const archSpanX0 = 152;
  const archSpanX1 = 848;
  const archSpan = archSpanX1 - archSpanX0;
  const archOuterY = (x) => {
    const s = clamp((x - archSpanX0) / archSpan, 0, 1);
    return 744 - 114 * Math.sin(Math.PI * s);
  };
  const archInnerY = (x) => {
    const s = clamp((x - archSpanX0) / archSpan, 0, 1);
    return 762 - 102 * Math.sin(Math.PI * s);
  };

  // Vault shadow wash
  const vaultPts = [];
  for (let x = archSpanX0; x <= archSpanX1; x += 24) {
    vaultPts.push([x, getBridgeYAndSlope(x).y + 8]);
  }
  for (let x = archSpanX1; x >= archSpanX0; x -= 24) {
    vaultPts.push([x, archInnerY(x)]);
  }
  drawInkWash(pg, vaultPts, "#4a331e", 0.36, { layers: 2, edgeAlpha: 0.22 });

  // Interlocking Northern Song timber scissor-truss beams (贯木拱)
  dc.save();
  dc.lineCap = "round";
  const N = 16;
  for (let i = 0; i < N; i++) {
    const xA = archSpanX0 + (i / N) * archSpan;
    const xB = archSpanX0 + ((i + 1) / N) * archSpan;
    const xMid = (xA + xB) * 0.5;
    const topA = getBridgeYAndSlope(xA).y + 10;
    const topB = getBridgeYAndSlope(xB).y + 10;
    const botA = archInnerY(xA);
    const botB = archInnerY(xB);

    dc.strokeStyle = WOOD_DARK;
    dc.lineWidth = 4.6;
    dc.beginPath();
    dc.moveTo(xA, topA);
    dc.lineTo(xB, botB);
    dc.moveTo(xA, botA);
    dc.lineTo(xB, topB);
    dc.stroke();

    dc.strokeStyle = WOOD_MID;
    dc.lineWidth = 5;
    dc.beginPath();
    dc.moveTo(xMid, getBridgeYAndSlope(xMid).y + 8);
    dc.lineTo(xMid, archInnerY(xMid));
    dc.stroke();

    dc.strokeStyle = INK_DARK;
    dc.lineWidth = 1.2;
    dc.beginPath();
    dc.moveTo(xMid - 2.5, getBridgeYAndSlope(xMid).y + 8);
    dc.lineTo(xMid - 2.5, archInnerY(xMid));
    dc.stroke();
  }

  const strokeArchRib = (yFn, width, fillCol) => {
    dc.beginPath();
    for (let x = archSpanX0; x <= archSpanX1; x += 12) {
      const y = yFn(x);
      if (x === archSpanX0) dc.moveTo(x, y);
      else dc.lineTo(x, y);
    }
    dc.strokeStyle = INK_DARK;
    dc.lineWidth = width + 3;
    dc.stroke();
    dc.strokeStyle = fillCol;
    dc.lineWidth = width;
    dc.stroke();
  };
  strokeArchRib(archInnerY, 9.5, WOOD_MID);
  strokeArchRib(archOuterY, 8.5, WOOD_LIGHT);

  for (let i = 1; i < 16; i++) {
    const bx = archSpanX0 + (i / 16) * archSpan;
    const by = (archOuterY(bx) + archInnerY(bx)) * 0.5;
    pg.fill("#a87b4c");
    pg.stroke(INK_DARK);
    pg.strokeWeight(1.4);
    pg.rect(bx - 5, by - 5, 10, 10, 1);
  }
  dc.restore();

  // Far-side wooden bridge balustrade (望柱与栏杆) set 10 units higher along far deck edge
  const postXs = [];
  for (let x = 136; x <= 864; x += 48) postXs.push(x);

  for (const railOff of [-42, -26]) {
    dc.save();
    dc.beginPath();
    for (let x = 128; x <= 872; x += 12) {
      const y = getBridgeYAndSlope(x).y + railOff;
      if (x === 128) dc.moveTo(x, y);
      else dc.lineTo(x, y);
    }
    dc.strokeStyle = INK_DARK;
    dc.lineWidth = 5.8;
    dc.stroke();
    dc.strokeStyle = "#8f6239";
    dc.lineWidth = 3.4;
    dc.stroke();
    dc.restore();
  }

  for (const px of postXs) {
    const py = getBridgeYAndSlope(px).y - 8;
    pg.fill("#9c6d42");
    pg.stroke(INK_DARK);
    pg.strokeWeight(1.5);
    pg.rect(px - 3.5, py - 41, 7, 42, 1);
    pg.fill("#b88958");
    pg.circle(px, py - 44, 7.5);
  }

  // Far deck walkway band + front plank surface (top tire track aligns STRICTLY with getBridgeYAndSlope(x).y)
  dc.save();
  dc.beginPath();
  for (let x = 114; x <= 886; x += 10) {
    const y = getBridgeYAndSlope(x).y - 9;
    if (x === 114) dc.moveTo(x, y);
    else dc.lineTo(x, y);
  }
  for (let x = 886; x >= 114; x -= 10) {
    const y = getBridgeYAndSlope(x).y + 14;
    dc.lineTo(x, y);
  }
  dc.closePath();
  dc.fillStyle = "#b89668";
  dc.fill();
  dc.strokeStyle = INK_DARK;
  dc.lineWidth = 1.9;
  dc.stroke();

  // Subtle tire-track edge line along getBridgeYAndSlope(x).y + plank joints
  dc.beginPath();
  for (let x = 116; x <= 884; x += 12) {
    const y = getBridgeYAndSlope(x).y;
    if (x === 116) dc.moveTo(x, y);
    else dc.lineTo(x, y);
  }
  dc.strokeStyle = "rgba(74, 52, 30, 0.35)";
  dc.lineWidth = 1.2;
  dc.stroke();

  dc.strokeStyle = "rgba(34, 27, 20, 0.42)";
  dc.lineWidth = 1.1;
  for (let x = 126; x <= 874; x += 16) {
    const { y, angle } = getBridgeYAndSlope(x);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    dc.beginPath();
    dc.moveTo(x - nx * 8, y - ny * 8);
    dc.lineTo(x + nx * 13, y + ny * 13);
    dc.stroke();
  }
  dc.restore();
}

function drawLeftBankBuildings(pg) {
  const baseY = 724;

  // Solid market-street earthen terrace & courtyard wall behind left shops (y = 650..726)
  drawInkWash(
    pg,
    [
      [-420, 668],
      [115, 668],
      [115, 730],
      [-420, 730],
    ],
    "#b8a17a",
    0.45,
    { layers: 2, edgeAlpha: 0.14 }
  );
  pg.stroke("rgba(56, 44, 30, 0.35)");
  pg.strokeWeight(1.5);
  pg.line(-420, 668, 112, 668);

  // 1. 「汴京车行」 Northern Song wheelwright & carriage workshop (centered at x = -120)
  const sx = -120;
  drawInkWash(
    pg,
    [
      [sx - 92, baseY - 190],
      [sx + 92, baseY - 190],
      [sx + 92, baseY],
      [sx - 92, baseY],
    ],
    "#d8c6a6",
    0.78,
    { layers: 2, edgeAlpha: 0.25 }
  );

  // Warm shadowed workshop interior with visible wooden rafters, bench & spare wheel frame
  pg.fill("#4f3d2b");
  pg.noStroke();
  pg.rect(sx - 78, baseY - 118, 156, 118);
  pg.fill("rgba(218, 184, 126, 0.24)");
  pg.rect(sx - 70, baseY - 108, 140, 80);
  pg.fill("#6a4e32");
  pg.rect(sx - 66, baseY - 40, 132, 10);
  pg.stroke("#322316");
  pg.strokeWeight(1.4);
  pg.line(sx - 44, baseY - 118, sx - 44, baseY - 40);
  pg.line(sx + 44, baseY - 118, sx + 44, baseY - 40);

  // Glowing paper lattice transom windows
  pg.fill("#e8d7b6");
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.6);
  pg.rect(sx - 76, baseY - 175, 152, 54);
  for (let wx = sx - 58; wx <= sx + 60; wx += 22) {
    pg.line(wx, baseY - 175, wx, baseY - 121);
  }
  pg.line(sx - 76, baseY - 148, sx + 76, baseY - 148);

  pg.fill(WOOD_DARK);
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.8);
  for (const cx of [sx - 86, sx - 2, sx + 80]) {
    pg.rect(cx, baseY - 188, 9, 188);
  }
  pg.fill(WOOD_MID);
  pg.rect(sx - 92, baseY - 124, 184, 12);

  drawSpokedCartWheel(pg, sx - 56, baseY - 30, 30, 0.24);
  drawSpokedCartWheel(pg, sx + 48, baseY - 32, 32, -0.2);
  drawSpokedCartWheel(pg, sx + 66, baseY - 26, 26, 0.32);

  drawSongRoof(pg, sx, baseY - 186, 212, 62, 22);

  // 2. 「香饮子」 Song iced-drink street stall (centered at x = 44)
  const dx = 44;
  pg.fill(WOOD_MID);
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.6);
  pg.rect(dx - 38, baseY - 114, 6, 114);
  pg.rect(dx + 32, baseY - 114, 6, 114);

  pg.fill("#9c7246");
  pg.rect(dx - 42, baseY - 46, 84, 12, 2);
  pg.fill("#684d32");
  pg.rect(dx - 36, baseY - 34, 72, 34);
  pg.fill("#748777");
  pg.ellipse(dx - 20, baseY - 54, 15, 18);
  pg.ellipse(dx + 2, baseY - 56, 17, 21);
  pg.fill("#a56c43");
  pg.ellipse(dx + 22, baseY - 52, 14, 15);

  pg.fill("#cbb48c");
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.8);
  pg.beginShape();
  pg.vertex(dx - 52, baseY - 108);
  pg.vertex(dx + 48, baseY - 116);
  pg.vertex(dx + 42, baseY - 132);
  pg.vertex(dx - 44, baseY - 126);
  pg.endShape("close");
}

function drawRightBankBuildings(pg) {
  const baseY = 724;

  // Solid market-street courtyard terrace behind right shops (y = 650..726)
  drawInkWash(
    pg,
    [
      [885, 668],
      [1420, 668],
      [1420, 730],
      [885, 730],
    ],
    "#b8a17a",
    0.45,
    { layers: 2, edgeAlpha: 0.14 }
  );
  pg.stroke("rgba(56, 44, 30, 0.35)");
  pg.strokeWeight(1.5);
  pg.line(888, 668, 1420, 668);

  // 1. 「孙记正店」 Grand 2-story Northern Song wine tavern (centered at x = 1022)
  const tx = 1022;
  const tw = 204;

  drawInkWash(
    pg,
    [
      [tx - tw * 0.5, baseY - 260],
      [tx + tw * 0.5, baseY - 260],
      [tx + tw * 0.5, baseY],
      [tx - tw * 0.5, baseY],
    ],
    "#d7c4a1",
    0.8,
    { layers: 2, edgeAlpha: 0.25 }
  );

  // Ground floor tavern interior with glowing lanterns & red-cloth-sealed wine vats (酒坛)
  pg.fill("#483625");
  pg.noStroke();
  pg.rect(tx - 86, baseY - 115, 172, 115);
  pg.fill("rgba(226, 184, 118, 0.24)");
  pg.rect(tx - 78, baseY - 105, 156, 86);
  for (const vx of [tx + 18, tx + 40, tx + 62]) {
    pg.fill("#7a4d2b");
    pg.stroke(INK_DARK);
    pg.strokeWeight(1.2);
    pg.ellipse(vx, baseY - 15, 18, 24);
    pg.fill("#a83828");
    pg.rect(vx - 5, baseY - 30, 10, 5, 1);
  }
  pg.fill("#d49242");
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.2);
  pg.ellipse(tx - 24, baseY - 92, 14, 18);
  pg.ellipse(tx + 34, baseY - 92, 14, 18);

  // 2nd-floor open window gallery recess
  pg.fill("#3b2c1e");
  pg.noStroke();
  pg.rect(tx - 82, baseY - 210, 164, 68);
  pg.fill("rgba(222, 188, 128, 0.34)");
  pg.rect(tx - 74, baseY - 202, 148, 52);

  pg.fill(WOOD_DARK);
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.8);
  pg.rect(tx - tw * 0.5 - 6, baseY - 138, tw + 12, 16);
  for (let bx = tx - 88; bx <= tx + 88; bx += 35) {
    pg.rect(bx - 6, baseY - 252, 12, 12);
    pg.rect(bx - 4, baseY - 252, 8, 252);
  }

  drawSongRoof(pg, tx, baseY - 248, 242, 74, 28);

  // Iconic Song decorative 「彩楼欢门」 celebratory bamboo-lattice gate cleanly clear of tavern banner
  const gx = 910;
  pg.stroke("#9c3d28");
  pg.strokeWeight(3.2);
  pg.line(gx - 20, baseY, gx - 20, baseY - 165);
  pg.line(gx + 20, baseY, gx + 20, baseY - 165);
  pg.stroke("#5b3a20");
  pg.strokeWeight(2.4);
  pg.line(gx - 26, baseY - 165, gx + 26, baseY - 165);
  pg.line(gx - 22, baseY - 186, gx + 22, baseY - 186);
  pg.stroke("#b0472e");
  pg.strokeWeight(1.8);
  for (let ly = baseY - 162; ly < baseY - 98; ly += 22) {
    pg.line(gx - 20, ly, gx + 20, ly + 22);
    pg.line(gx + 20, ly, gx - 20, ly + 22);
  }
  pg.fill("#c24c32");
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.4);
  pg.triangle(gx - 26, baseY - 186, gx + 26, baseY - 186, gx, baseY - 208);

  // 2. 「车马茶坊」 Roadside tea pavilion (centered at x = 1245)
  const cx = 1245;
  drawInkWash(
    pg,
    [
      [cx - 86, baseY - 160],
      [cx + 86, baseY - 160],
      [cx + 86, baseY],
      [cx - 86, baseY],
    ],
    "#dac9a8",
    0.76,
    { layers: 2, edgeAlpha: 0.2 }
  );
  pg.fill("#503d2c");
  pg.noStroke();
  pg.rect(cx - 72, baseY - 115, 144, 115);
  pg.fill("rgba(222, 188, 128, 0.25)");
  pg.rect(cx - 64, baseY - 102, 128, 76);

  // Tea stove, kettle & shelf inside tea house
  pg.fill("#8f5335");
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.2);
  pg.rect(cx + 22, baseY - 38, 28, 38, 2);
  pg.fill("#c48646");
  pg.ellipse(cx + 36, baseY - 46, 18, 14);

  pg.fill("#a88b5b");
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.4);
  pg.rect(cx - 76, baseY - 124, 152, 16, 6);

  pg.fill(WOOD_MID);
  pg.rect(cx - 46, baseY - 32, 42, 7);
  pg.rect(cx - 42, baseY - 25, 5, 25);
  pg.rect(cx - 12, baseY - 25, 5, 25);

  pg.fill(WOOD_DARK);
  for (const px of [cx - 80, cx + 74]) {
    pg.rect(px, baseY - 160, 8, 160);
  }

  drawSongRoof(pg, cx, baseY - 160, 198, 52, 20);
}

function drawMooredSampan(pg, x, y) {
  const dc = pg.drawingContext;
  dc.save();
  dc.translate(x, y);
  dc.beginPath();
  dc.moveTo(-42, 0);
  dc.quadraticCurveTo(-30, 16, 0, 16);
  dc.quadraticCurveTo(32, 16, 44, -2);
  dc.lineTo(28, 2);
  dc.lineTo(-28, 2);
  dc.closePath();
  dc.fillStyle = "#7a5736";
  dc.fill();
  dc.strokeStyle = INK_DARK;
  dc.lineWidth = 1.6;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-16, 2);
  dc.quadraticCurveTo(0, -16, 18, 2);
  dc.closePath();
  dc.fillStyle = "#bfa67a";
  dc.fill();
  dc.stroke();
  dc.restore();
}

function bakeQingmingBackdrop(pg) {
  const dc = pg.drawingContext;
  pg.clear();
  pg.push();
  pg.translate(-BLEED_LEFT, 0);

  // 1. Distant Song misty hills, organic tree groves & Bianjing city gatehouse
  drawDistantBianjingBackdrop(pg);

  // 2. Upper Bian River valley flowing behind the Rainbow Bridge (confined cleanly to central basin!)
  drawInkWash(
    pg,
    [
      [50, 622],
      [950, 622],
      [980, 745],
      [20, 745],
    ],
    "#788d7c",
    0.26,
    { layers: 2, edgeAlpha: 0.08 }
  );

  // Far riverbank earth ledge behind upper water
  drawFeibaiStroke(
    pg,
    [
      [40, 620],
      [220, 628],
      [500, 616],
      [780, 630],
      [960, 620],
    ],
    5.5,
    "#6c5b44",
    0.5,
    6101
  );

  // 3. Central & Foreground Bian River Channel
  drawInkWash(
    pg,
    [
      [115, 725],
      [885, 725],
      [960, 1005],
      [40, 1005],
    ],
    "#788c7b",
    0.44,
    { layers: 3, edgeAlpha: 0.14 }
  );

  // Reflected arch shadow on water
  const shadowGrad = dc.createLinearGradient(0, 680, 0, 815);
  shadowGrad.addColorStop(0, "rgba(42, 46, 40, 0.42)");
  shadowGrad.addColorStop(1, "rgba(120, 140, 123, 0)");
  dc.save();
  dc.fillStyle = shadowGrad;
  dc.beginPath();
  dc.moveTo(165, 728);
  dc.lineTo(835, 728);
  dc.lineTo(855, 815);
  dc.lineTo(145, 815);
  dc.closePath();
  dc.fill();
  dc.restore();

  // Small moored wooden sampan tucked neatly in open water near the west stone bank
  drawMooredSampan(pg, 245, 766);

  // 4. Flat Portal-Aligned Street Ground & Embankments (x <= 120 and x >= 880 strictly at ROAD_Y = 730!)
  drawInkWash(
    pg,
    [
      [-430, ROAD_Y],
      [125, ROAD_Y],
      [125, 745],
      [42, 1005],
      [-430, 1005],
    ],
    "#9c8460",
    0.6,
    { layers: 3, edgeAlpha: 0.25 }
  );
  drawInkWash(
    pg,
    [
      [875, ROAD_Y],
      [1430, ROAD_Y],
      [1430, 1005],
      [958, 1005],
      [875, 745],
    ],
    "#9c8460",
    0.6,
    { layers: 3, edgeAlpha: 0.25 }
  );

  // Textured stepped stone masonry riverbank quays (条石驳岸) with water-edge reeds
  const drawStoneQuay = (topX, botX, sideSign) => {
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const f0 = i / steps;
      const f1 = (i + 1) / steps;
      const y0 = ROAD_Y + f0 * (1000 - ROAD_Y);
      const y1 = ROAD_Y + f1 * (1000 - ROAD_Y);
      const x0 = topX + (botX - topX) * f0;
      const x1 = topX + (botX - topX) * f1;
      pg.fill(i % 2 === 0 ? "#8a7d67" : "#7e725d");
      pg.stroke(INK_MID);
      pg.strokeWeight(1.4);
      pg.quad(x0, y0, x0 + sideSign * 14, y0, x1 + sideSign * 16, y1, x1, y1);
    }
  };
  drawStoneQuay(120, 44, -1);
  drawStoneQuay(880, 956, 1);

  // Delicate shoreline reed tufts along stone quays
  const drawReeds = (rx, ry, dir) => {
    pg.stroke("#4f5d42");
    pg.strokeWeight(1.5);
    for (let k = -2; k <= 2; k++) {
      pg.line(rx + k * 3, ry, rx + k * 5 + dir * 4, ry - 18 - Math.abs(k) * 3);
    }
  };
  drawReeds(86, 875, 1);
  drawReeds(64, 945, 1);
  drawReeds(914, 875, -1);
  drawReeds(936, 945, -1);

  // Flat continuous street edge ink lines (strictly at ROAD_Y = 730!)
  drawFeibaiStroke(
    pg,
    [
      [-420, ROAD_Y + 1],
      [-100, ROAD_Y + 1],
      [120, ROAD_Y + 1],
    ],
    5.5,
    INK_DARK,
    0.4,
    6203
  );
  drawFeibaiStroke(
    pg,
    [
      [880, ROAD_Y + 1],
      [1150, ROAD_Y + 1],
      [1420, ROAD_Y + 1],
    ],
    5.5,
    INK_DARK,
    0.4,
    6204
  );

  // Subtle street cobble strokes below ROAD_Y
  const rand = prng(60606);
  pg.stroke("rgba(56, 44, 30, 0.28)");
  pg.strokeWeight(1.4);
  for (let i = 0; i < 120; i++) {
    const sx = -400 + rand() * 510;
    const sy = ROAD_Y + 10 + rand() * 230;
    if (sx < 105 - (sy - ROAD_Y) * 0.28) {
      const len = 14 + rand() * 34;
      pg.line(sx, sy, sx + len, sy + (rand() - 0.5) * 3);
    }
  }
  for (let i = 0; i < 120; i++) {
    const sx = 890 + rand() * 510;
    const sy = ROAD_Y + 10 + rand() * 230;
    if (sx > 895 + (sy - ROAD_Y) * 0.28) {
      const len = 14 + rand() * 34;
      pg.line(sx, sy, sx + len, sy + (rand() - 0.5) * 3);
    }
  }

  // 5. Left & Right Riverside Architecture + Willow Base Trees
  drawWillowCrownBase(pg, -275, 725, 0.9, 1, 6301);
  drawLeftBankBuildings(pg);
  drawWillowCrownBase(pg, 108, 728, 0.94, -1, 6302);

  drawWillowCrownBase(pg, 882, 726, 0.92, 1, 6303);
  drawRightBankBuildings(pg);
  drawWillowCrownBase(pg, 1345, 725, 0.96, -1, 6304);

  // 6. Rainbow Bridge Timber Arch, Abutments, Far Balustrade & Deck
  drawRainbowBridgeStatic(pg);

  pg.pop();
}

function bakeCargoBoat(pg) {
  const dc = pg.drawingContext;
  pg.clear();
  pg.push();
  pg.translate(220, 145);

  dc.save();
  dc.fillStyle = "rgba(38, 46, 40, 0.34)";
  dc.beginPath();
  dc.ellipse(0, 48, 174, 15, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  dc.save();
  dc.beginPath();
  dc.moveTo(-168, 12);
  dc.quadraticCurveTo(-152, 48, -95, 50);
  dc.lineTo(112, 50);
  dc.quadraticCurveTo(156, 44, 170, 0);
  dc.lineTo(150, 0);
  dc.lineTo(120, 20);
  dc.lineTo(-118, 22);
  dc.lineTo(-155, 6);
  dc.closePath();
  dc.fillStyle = "#8a623c";
  dc.fill();
  dc.strokeStyle = INK_DARK;
  dc.lineWidth = 2.2;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-152, 32);
  dc.lineTo(146, 32);
  dc.strokeStyle = "#4d341f";
  dc.lineWidth = 4;
  dc.stroke();

  dc.strokeStyle = "rgba(34, 27, 20, 0.5)";
  dc.lineWidth = 1.2;
  for (let px = -120; px <= 120; px += 26) {
    dc.beginPath();
    dc.moveTo(px, 20);
    dc.lineTo(px + 4, 48);
    dc.stroke();
  }
  dc.restore();

  dc.save();
  dc.beginPath();
  dc.moveTo(-78, 20);
  dc.lineTo(-74, -18);
  dc.quadraticCurveTo(8, -44, 86, -16);
  dc.lineTo(90, 20);
  dc.closePath();
  dc.fillStyle = "#c8b187";
  dc.fill();
  dc.strokeStyle = INK_DARK;
  dc.lineWidth = 2;
  dc.stroke();

  dc.strokeStyle = "#6d5739";
  dc.lineWidth = 1.6;
  for (let rx = -55; rx <= 65; rx += 24) {
    dc.beginPath();
    dc.moveTo(rx, 18);
    dc.quadraticCurveTo(rx - 2, -16, rx + 4, -28);
    dc.stroke();
  }
  dc.restore();

  pg.fill("#9c7e52");
  pg.stroke(INK_DARK);
  pg.strokeWeight(1.6);
  pg.ellipse(-104, 16, 28, 14);
  pg.ellipse(-98, 8, 22, 11);
  pg.fill("#735334");
  pg.rect(92, -6, 36, 26, 2);

  pg.fill(WOOD_DARK);
  pg.rect(-82, -8, 10, 28, 1);

  pg.stroke(WOOD_DARK);
  pg.strokeWeight(4);
  pg.line(146, 8, 186, 48);

  pg.pop();
}

function drawDynamicCargoBoat(g, boatSprite, t, u, px) {
  const bob = Math.sin(t * 2.4) * 2.2;
  const rock = Math.sin(t * 1.8) * 0.012;
  const boatX = 496 + Math.sin(u * 0.45) * 12;
  const boatY = 838 + bob;
  const lookUp = smoothstep(240, 480, px);

  g.push();
  g.translate(boatX, boatY);
  g.rotate(rock);

  // Subtle trailing wake ripples behind/beside hull
  g.noFill();
  g.stroke("rgba(235, 224, 198, 0.65)");
  g.strokeWeight(1.5);
  g.arc(0, 24, 345, 26, 0.15, Math.PI - 0.15);

  g.push();
  g.imageMode("center");
  g.image(boatSprite, 0, -24, 440, 240);
  g.pop();

  // Lowered hinged wooden mast clearing the Rainbow Bridge arch (放倒桅杆)
  const mastAng = 0.14 + Math.sin(t * 1.6) * 0.015;
  g.push();
  g.translate(-77, -6);
  g.rotate(mastAng);
  g.stroke(INK_DARK);
  g.strokeWeight(7.2);
  g.line(0, 0, 195, -52);
  g.stroke(WOOD_LIGHT);
  g.strokeWeight(4.5);
  g.line(0, 0, 195, -52);
  g.fill("#dfd0b2");
  g.stroke(INK_MID);
  g.strokeWeight(1.4);
  g.beginShape();
  g.vertex(30, -8);
  g.vertex(172, -46);
  g.vertex(170, -34);
  g.vertex(32, 3);
  g.endShape("close");
  g.pop();

  // Boatman A (bow punter gripping pole & craning neck up)
  g.push();
  g.translate(-130, 10);
  g.stroke(INK_DARK);
  g.strokeWeight(2.5);
  g.fill("#586862");
  g.rect(-6.5, -28, 13, 18, 2);
  g.line(-3, -10, -5, 2);
  g.line(3, -10, 6, 2);
  g.push();
  g.translate(0, -34);
  g.rotate(-0.55 * lookUp);
  g.fill("#dfc7a3");
  g.stroke(INK_DARK);
  g.strokeWeight(1.5);
  g.circle(0, 0, 11.5);
  g.fill("#b79763");
  g.triangle(-13, -2, 13, -2, 0, -10);
  g.pop();
  g.stroke("#8c7344");
  g.strokeWeight(2.8);
  g.line(4, -24, -52, 54);
  g.pop();

  // Boatman B (mid-foredeck helper gazing upward)
  g.push();
  g.translate(-92, 6);
  g.stroke(INK_DARK);
  g.strokeWeight(2);
  g.fill("#8c785c");
  g.rect(-5, -24, 10, 16, 2);
  g.push();
  g.translate(0, -30);
  g.rotate(-0.5 * lookUp);
  g.fill("#dfc7a3");
  g.circle(0, 0, 10.5);
  g.fill(INK_DARK);
  g.noStroke();
  g.arc(0, -2, 10, 10, Math.PI, Math.PI * 2);
  g.pop();
  g.pop();

  // Boatman C (stern steersman looking up at bridge)
  g.push();
  g.translate(124, 6);
  g.stroke(INK_DARK);
  g.strokeWeight(2.2);
  g.fill("#6f5e47");
  g.rect(-6, -28, 12, 18, 2);
  g.line(-3, -10, -4, 2);
  g.line(3, -10, 5, 2);
  g.push();
  g.translate(0, -34);
  g.rotate(-0.55 * lookUp);
  g.fill("#dfc7a3");
  g.stroke(INK_DARK);
  g.strokeWeight(1.5);
  g.circle(0, 0, 11.5);
  g.fill(INK_DARK);
  g.circle(-1, -4, 6);
  g.pop();
  g.stroke("#8c7344");
  g.strokeWeight(2.6);
  g.line(-4, -22, 32, 48);
  g.pop();

  g.pop();
}

function drawBianRiverRipples(g, t) {
  const dc = g.drawingContext;
  dc.save();
  dc.lineCap = "round";
  const rows = [
    [210, 748, 95, 0.22],
    [430, 756, 125, 0.2],
    [660, 746, 105, 0.22],
    [165, 795, 130, 0.26],
    [350, 815, 110, 0.24],
    [620, 805, 135, 0.24],
    [765, 785, 95, 0.24],
    [130, 892, 165, 0.3],
    [420, 912, 180, 0.28],
    [720, 898, 160, 0.3],
    [245, 952, 190, 0.32],
    [590, 962, 175, 0.32],
  ];
  for (let i = 0; i < rows.length; i++) {
    const [bx, by, len, al] = rows[i];
    const drift = ((t * 22 + i * 37) % 90) - 45;
    const x0 = bx + drift;
    dc.strokeStyle = i % 2 === 0 ? `rgba(52, 62, 54, ${al})` : `rgba(235, 224, 198, ${al + 0.08})`;
    dc.lineWidth = i % 2 === 0 ? 1.6 : 1.3;
    dc.beginPath();
    dc.moveTo(x0, by);
    dc.quadraticCurveTo(x0 + len * 0.3, by - 3.5, x0 + len * 0.65, by + 2.5);
    dc.quadraticCurveTo(x0 + len * 0.85, by + 4, x0 + len, by);
    dc.stroke();
  }
  dc.restore();
}

function drawSwayingWillowsAndBanners(g, t) {
  const sway = Math.sin(t * 2.0);
  const dc = g.drawingContext;

  const willowAnchors = [
    [-250, 480, 105, 1.0],
    [102, 470, 120, 1.0],
    [885, 475, 125, 1.0],
    [1340, 470, 115, 1.0],
  ];
  dc.save();
  dc.lineCap = "round";
  for (let w = 0; w < willowAnchors.length; w++) {
    const [ax, ay, span, sc] = willowAnchors[w];
    for (let i = -3; i <= 3; i++) {
      const rx = ax + i * (span / 3.4);
      const ry = ay + Math.abs(i) * 8;
      const len = (88 + ((Math.abs(i * 19 + w * 7) % 3) * 18)) * sc;
      const tipSw = sway * (7 + (i % 2) * 3) + Math.sin(t * 3.1 + i + w) * 2.5;
      dc.strokeStyle = "rgba(86, 106, 68, 0.56)";
      dc.lineWidth = 1.6;
      dc.beginPath();
      dc.moveTo(rx, ry);
      dc.quadraticCurveTo(rx + tipSw * 0.4, ry + len * 0.52, rx + tipSw, ry + len);
      dc.stroke();

      dc.fillStyle = "rgba(118, 138, 90, 0.52)";
      for (let f = 0.25; f <= 0.92; f += 0.22) {
        const lx = rx + tipSw * f * f;
        const ly = ry + len * f;
        dc.beginPath();
        dc.ellipse(lx, ly, 2.2, 4.4, 0.25 + tipSw * 0.02, 0, Math.PI * 2);
        dc.fill();
      }
    }
  }
  dc.restore();

  const drawBanner = (x, y, w, h, text, bgCol, txtCol, phase) => {
    const flutter = Math.sin(t * 2.7 + phase) * 3.2;
    g.push();
    g.translate(x, y);
    g.stroke(WOOD_DARK);
    g.strokeWeight(2.4);
    g.line(-w * 0.7, 0, w * 0.7, 0);

    g.fill(bgCol);
    g.stroke(INK_DARK);
    g.strokeWeight(1.5);
    g.beginShape();
    g.vertex(-w * 0.5, 2);
    g.vertex(w * 0.5, 2);
    g.vertex(w * 0.5 + flutter, h);
    g.vertex(flutter, h - 7);
    g.vertex(-w * 0.5 + flutter, h);
    g.endShape("close");

    g.fill(txtCol);
    g.noStroke();
    g.textAlign("center", "center");
    g.textFont("Songti SC, STSong, serif");
    g.textStyle("bold");
    const fontSize = Math.min(w * 0.68, (h - 18) / text.length);
    g.textSize(fontSize);
    for (let i = 0; i < text.length; i++) {
      const f = (i + 0.6) / (text.length + 0.25);
      g.text(text[i], flutter * f * 0.75, 10 + f * (h - 22));
    }
    g.pop();
  };

  drawBanner(-118, 518, 28, 92, "汴京车行", "#efe2c6", "#231b13", 0.2);
  drawBanner(4, 592, 24, 68, "香饮子", "#cad6d2", "#1e2e2a", 1.1);
  // Placed cleanly outside the 2nd-floor railing & cai-lou gate, plus "新酒" below the cornice
  drawBanner(932, 466, 26, 84, "孙记正店", "#d46b46", "#faf1df", 2.0);
  drawBanner(954, 592, 22, 52, "新酒", "#efe2c6", "#9a2e22", 2.6);
  drawBanner(1176, 560, 26, 78, "车马茶坊", "#e9d9b8", "#3a291a", 3.3);
}

/**
 * Draws one Song Dynasty citizen with walking stride, head turn/pitch tracking the Pelican,
 * props (porter pole + baskets, wheel, ladle, parasol, scroll, tea cup), and Song brush surprise mark.
 */
function drawSongCitizen(g, spec, u, px) {
  const { x, y, role, dir, robe, trim, hat, labelMark } = spec;
  const triggerU = clamp((x - 95 - BLEED_LEFT) / CROSS_SPEED, 0.25, 5.45);
  const react = smoothstep(x - 165, x - 20, px);
  const walkClock = role === "seated" || role === "window" ? 0 : smoothStopClock(u, triggerU, 0.4);
  const stride = (1 - react) * Math.sin(walkClock * 6.2 + x * 0.05) * 6.5;
  const bob = (1 - react) * Math.abs(Math.sin(walkClock * 6.2 + x * 0.05)) * 1.8;

  const targetY = getBridgeYAndSlope(px).y - 145;
  const lookAngle = react * clamp(Math.atan2(targetY - (y - 54), px - x) * 0.35, -0.42, 0.42);
  const facingRight = react > 0.35 ? px >= x : dir > 0;
  const faceSign = facingRight ? 1 : -1;

  g.push();
  g.translate(x, y - bob);

  if (role === "window") {
    const leanOut = smoothstep(260, 560, px);
    g.translate(0, leanOut * 12);
    g.rotate(leanOut * clamp((px - x) / 480, -0.26, 0.18));

    g.fill(robe);
    g.stroke(INK_DARK);
    g.strokeWeight(1.6);
    g.beginShape();
    g.vertex(-11, -30);
    g.vertex(11, -30);
    g.vertex(14, 0);
    g.vertex(-14, 0);
    g.endShape("close");

    // Left diner holds cup & points excitedly toward Rainbow Bridge; right diner raises cup
    g.stroke(robe);
    g.strokeWeight(4.8);
    if (x < 1020) {
      g.line(-8, -24, -22 - leanOut * 12, -22 - leanOut * 10);
      g.fill("#e2caa5");
      g.noStroke();
      g.circle(-23 - leanOut * 12, -22 - leanOut * 10, 4.5);
    } else {
      g.line(-8, -24, -18 - leanOut * 7, -15 - leanOut * 5);
      g.stroke(INK_DARK);
      g.strokeWeight(1.4);
      g.fill("#e8d9be");
      g.circle(-18 - leanOut * 7, -15 - leanOut * 5, 6);
    }

    g.push();
    g.translate(0, -37);
    g.rotate(lookAngle * 0.9);
    g.fill("#e2caa5");
    g.stroke(INK_DARK);
    g.strokeWeight(1.5);
    g.circle(0, 0, 13);
    g.fill(INK_DARK);
    g.arc(0, -2, 13, 12, Math.PI, Math.PI * 2);
    g.circle(faceSign * 3, -1, 2);
    g.pop();

    g.pop();
    return;
  }

  if (role === "seated") {
    g.stroke(INK_DARK);
    g.strokeWeight(2);
    g.fill("#40372d");
    g.line(-5, -14, -8, 0);
    g.line(4, -14, 7, 0);
    g.fill(robe);
    g.beginShape();
    g.vertex(-10, -40);
    g.vertex(10, -40);
    g.vertex(12, -14);
    g.vertex(-11, -14);
    g.endShape("close");
    g.stroke(robe);
    g.strokeWeight(4.5);
    g.line(-6, -34, -16, -28 - react * 6);
    g.fill("#d5dfd8");
    g.stroke(INK_DARK);
    g.strokeWeight(1.2);
    g.circle(-17, -29 - react * 6, 5.5);
  } else {
    g.stroke(INK_DARK);
    g.strokeWeight(2.6);
    g.line(-3.5, -14, -3.5 - stride * 0.7, 0);
    g.line(3.5, -14, 3.5 + stride * 0.7, 0);

    g.fill(robe);
    g.stroke(INK_DARK);
    g.strokeWeight(1.6);
    g.beginShape();
    g.vertex(-8.5, -44);
    g.vertex(8.5, -44);
    g.vertex(11.5, -10);
    g.vertex(-11.5, -10);
    g.endShape("close");

    g.stroke(trim || INK_MID);
    g.strokeWeight(1.8);
    g.line(-6, -42, 2, -32);
    g.line(6, -42, -2, -32);
  }

  if (role === "porter") {
    const sway = (1 - react) * Math.sin(walkClock * 6.2 + x) * 0.08;
    g.push();
    g.translate(0, -42);
    g.rotate(sway);
    g.stroke(WOOD_DARK);
    g.strokeWeight(2.8);
    g.line(-28, 1, 28, 1);
    for (const bx of [-25, 25]) {
      g.stroke(INK_MID);
      g.strokeWeight(1.1);
      g.line(bx, 1, bx - 4, 18);
      g.line(bx, 1, bx + 4, 18);
      g.fill("#b48b54");
      g.stroke(INK_DARK);
      g.strokeWeight(1.3);
      g.rect(bx - 7, 17, 14, 10, 2);
    }
    g.pop();
  } else if (role === "wheelwright") {
    g.push();
    g.translate(15, -24);
    g.noFill();
    g.stroke(WOOD_DARK);
    g.strokeWeight(3);
    g.circle(0, 0, 25);
    g.strokeWeight(1.2);
    g.line(-11, 0, 11, 0);
    g.line(0, -11, 0, 11);
    g.pop();
  } else if (role === "parasol") {
    g.push();
    g.translate(-8 * faceSign, -40);
    g.rotate(-0.18 - react * 0.25);
    g.stroke(WOOD_DARK);
    g.strokeWeight(2);
    g.line(0, 10, 0, -28);
    g.fill("#d9b46c");
    g.stroke(INK_DARK);
    g.strokeWeight(1.5);
    g.arc(0, -24, 34, 16, Math.PI, Math.PI * 2, "close");
    g.pop();
  } else if (role === "monk") {
    g.stroke(WOOD_DARK);
    g.strokeWeight(2.2);
    g.line(11 * faceSign, -46, 13 * faceSign, 0);
  } else if (role === "waiter") {
    g.fill("#f2ead8");
    g.stroke(INK_DARK);
    g.strokeWeight(1.2);
    g.rect(-9, -43, 6, 13, 1);
  }

  g.push();
  g.translate(0, -51);
  g.rotate(lookAngle);
  g.fill("#e2caa5");
  g.stroke(INK_DARK);
  g.strokeWeight(1.5);
  g.circle(0, 0, 12.5);

  g.fill(INK_DARK);
  g.noStroke();
  g.circle(faceSign * 3, -1, 2);

  if (hat === "douli") {
    g.fill("#bfa16b");
    g.stroke(INK_DARK);
    g.strokeWeight(1.4);
    g.triangle(-15, -2, 15, -2, 0, -12);
  } else if (hat === "futou") {
    g.fill(INK_DARK);
    g.noStroke();
    g.rect(-5, -9, 10, 6, 1);
    g.stroke(INK_DARK);
    g.strokeWeight(1.6);
    g.line(-13, -7, 13, -7);
  } else if (hat === "bun") {
    g.fill(INK_DARK);
    g.noStroke();
    g.arc(0, -2, 12, 12, Math.PI, Math.PI * 2);
    g.circle(-faceSign * 5, -5, 5);
  } else {
    g.fill(INK_DARK);
    g.noStroke();
    g.arc(0, -2, 12, 12, Math.PI, Math.PI * 2);
  }
  g.pop();

  if (labelMark && u >= triggerU - 0.12 && u <= triggerU + 1.9) {
    const popIn = smoothstep(triggerU - 0.12, triggerU + 0.08, u);
    const popOut = 1 - smoothstep(triggerU + 1.45, triggerU + 1.9, u);
    const popAlpha = popIn * popOut;
    if (popAlpha > 0.03) {
      const springY = -74 - popIn * 8;
      g.push();
      g.drawingContext.globalAlpha = popAlpha * 0.94;
      g.fill("#f7efe0");
      g.stroke("#9e2e22");
      g.strokeWeight(1.4);
      g.rectMode("center");
      g.rect(0, springY, labelMark.length > 1 ? 26 : 18, 20, 3);
      g.fill("#9e2e22");
      g.noStroke();
      g.textAlign("center", "center");
      g.textFont("Songti SC, STSong, serif");
      g.textStyle("bold");
      g.textSize(12.5);
      g.text(labelMark, 0, springY + 1);
      g.pop();
    }
  }

  g.pop();
}

/**
 * Renders the Pelican + Song Wooden Spoked Bicycle in Zhang Zeduan Gongbi Light-Color style:
 * fine crisp Jiehua outlines, ivory feathers tinted with pale ochre, and vermilion-ochre throat pouch.
 */
function drawQingmingRig(g, pose) {
  const s = pose.scale;
  const dc = g.drawingContext;
  const outline = "#211912";
  const woodFrame = "#563820";
  const woodLight = "#8f653b";
  const brass = "#b88a44";
  const featherIvory = "#f5ebd5";
  const featherOchre = "#dfcbb0";
  const beakOchre = "#cb8644";
  const pouchVermilion = "#d5774d";

  for (const hub of [pose.rearHub, pose.frontHub]) {
    g.push();
    g.translate(hub.x, hub.y);
    g.noFill();
    g.stroke(outline);
    g.strokeWeight(6.4 * s);
    g.circle(0, 0, pose.wheelRadius * 2);
    g.stroke("#754f2d");
    g.strokeWeight(3.6 * s);
    g.circle(0, 0, pose.wheelRadius * 2);

    g.stroke(woodLight);
    g.strokeWeight(1.6 * s);
    for (let i = 0; i < 12; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 6;
      g.line(0, 0, Math.cos(a) * (pose.wheelRadius - 3 * s), Math.sin(a) * (pose.wheelRadius - 3 * s));
    }
    g.fill(woodFrame);
    g.stroke(outline);
    g.strokeWeight(1.4 * s);
    g.circle(0, 0, 10 * s);
    g.pop();
  }

  g.strokeCap("round");
  g.strokeJoin("round");
  g.noFill();
  g.stroke("#9c5124");
  g.strokeWeight(6.8 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.leftKnee.x, pose.leftKnee.y);
  g.vertex(pose.leftPedal.x, pose.leftPedal.y);
  g.endShape();

  g.stroke(woodFrame);
  g.strokeWeight(3.2 * s);
  g.line(pose.bb.x, pose.bb.y, pose.leftPedal.x, pose.leftPedal.y);

  const drawWoodTube = (a, b, w = 5.4) => {
    g.stroke(outline);
    g.strokeWeight((w + 2.2) * s);
    g.line(a.x, a.y, b.x, b.y);
    g.stroke(woodFrame);
    g.strokeWeight(w * s);
    g.line(a.x, a.y, b.x, b.y);
  };
  drawWoodTube(pose.rearHub, pose.bb, 4.8);
  drawWoodTube(pose.rearHub, pose.seatCluster, 4.6);
  drawWoodTube(pose.bb, pose.seatCluster, 5.2);
  drawWoodTube(pose.seatCluster, pose.headTop, 5.4);
  drawWoodTube(pose.bb, pose.headBot, 5.4);
  drawWoodTube(pose.frontHub, pose.headTop, 5.0);
  drawWoodTube(pose.headTop, pose.stemTop, 4.6);
  drawWoodTube(pose.stemTop, pose.barGrip, 4.6);

  const sadMidX = (pose.saddleRear.x + pose.saddleFront.x) * 0.5;
  drawWoodTube(pose.seatCluster, { x: sadMidX, y: pose.saddleRear.y + 3 * s }, 4.2);
  g.stroke(outline);
  g.strokeWeight(7 * s);
  g.line(pose.saddleRear.x, pose.saddleRear.y, pose.saddleFront.x, pose.saddleFront.y);

  g.fill(brass);
  g.stroke(outline);
  g.strokeWeight(1.5 * s);
  g.circle(pose.bb.x, pose.bb.y, 17 * s);
  g.circle(pose.bellPos.x, pose.bellPos.y, 9 * s);

  const drawGongbiBezier = (fillCol, strokeCol, strokeW, drawFn) => {
    dc.save();
    dc.beginPath();
    drawFn(dc);
    if (fillCol) {
      dc.fillStyle = fillCol;
      dc.fill();
    }
    if (strokeCol) {
      dc.strokeStyle = strokeCol;
      dc.lineWidth = strokeW;
      dc.lineJoin = "round";
      dc.lineCap = "round";
      dc.stroke();
    }
    dc.restore();
  };

  drawGongbiBezier(featherIvory, outline, 2.3 * s, (c) => {
    c.moveTo(pose.tailTip.x, pose.tailTip.y);
    c.bezierCurveTo(
      pose.bodyCenter.x - 42 * s,
      pose.bodyCenter.y - 28 * s,
      pose.bodyCenter.x + 26 * s,
      pose.bodyCenter.y - 34 * s,
      pose.neckBase.x + 12 * s,
      pose.neckBase.y + 8 * s
    );
    c.bezierCurveTo(
      pose.bodyCenter.x + 36 * s,
      pose.bodyCenter.y + 24 * s,
      pose.hip.x + 16 * s,
      pose.hip.y + 12 * s,
      pose.tailTip.x,
      pose.tailTip.y
    );
    c.closePath();
  });

  drawGongbiBezier("rgba(196, 158, 108, 0.34)", null, 0, (c) => {
    c.moveTo(pose.tailTip.x + 12 * s, pose.tailTip.y + 3 * s);
    c.quadraticCurveTo(pose.bodyCenter.x, pose.hip.y + 11 * s, pose.neckBase.x + 8 * s, pose.neckBase.y + 10 * s);
    c.quadraticCurveTo(pose.bodyCenter.x + 2 * s, pose.bodyCenter.y + 4 * s, pose.tailTip.x + 12 * s, pose.tailTip.y + 3 * s);
    c.closePath();
  });

  g.noFill();
  g.stroke(outline);
  g.strokeWeight(21.5 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();
  g.stroke(featherIvory);
  g.strokeWeight(17 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();

  g.fill(featherIvory);
  g.stroke(outline);
  g.strokeWeight(2.2 * s);
  g.beginShape();
  g.vertex(pose.crest1.x, pose.crest1.y);
  g.vertex(pose.head.x - 6 * s, pose.head.y - 16 * s);
  g.vertex(pose.crest2.x, pose.crest2.y);
  g.vertex(pose.head.x + 6 * s, pose.head.y - 17 * s);
  g.endShape();
  g.circle(pose.head.x, pose.head.y, 33 * s);

  drawGongbiBezier(pouchVermilion, outline, 2.2 * s, (c) => {
    c.moveTo(pose.pouchBase.x, pose.pouchBase.y);
    c.bezierCurveTo(
      pose.pouchMid.x - 16 * s,
      pose.pouchMid.y + 12 * s,
      pose.pouchMid.x + 34 * s,
      pose.pouchMid.y + 6 * s,
      pose.beakTip.x - 4 * s,
      pose.beakTip.y + 4 * s
    );
    c.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 12 * s);
    c.closePath();
  });
  drawGongbiBezier("rgba(155, 62, 34, 0.28)", null, 0, (c) => {
    c.moveTo(pose.pouchBase.x + 8 * s, pose.pouchBase.y + 5 * s);
    c.quadraticCurveTo(pose.pouchMid.x + 4 * s, pose.pouchMid.y + 12 * s, pose.beakTip.x - 12 * s, pose.beakTip.y + 5 * s);
    c.quadraticCurveTo(pose.pouchMid.x, pose.pouchMid.y + 3 * s, pose.pouchBase.x + 8 * s, pose.pouchBase.y + 5 * s);
    c.closePath();
  });

  g.fill(beakOchre);
  g.stroke(outline);
  g.strokeWeight(2.2 * s);
  g.beginShape();
  g.vertex(pose.beakBaseTop.x, pose.beakBaseTop.y);
  g.vertex(pose.beakTip.x, pose.beakTip.y);
  g.vertex(pose.beakHook.x, pose.beakHook.y);
  g.vertex(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  g.vertex(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  g.endShape("close");

  g.fill("#fbf5e8");
  g.stroke(outline);
  g.strokeWeight(1.6 * s);
  g.circle(pose.eye.x, pose.eye.y, 9.5 * s);
  g.fill(outline);
  g.noStroke();
  g.circle(pose.eye.x + 1.5 * s, pose.eye.y, 4.2 * s);

  drawGongbiBezier(featherOchre, outline, 2.2 * s, (c) => {
    c.moveTo(pose.shoulder.x - 8 * s, pose.shoulder.y - 6 * s);
    c.bezierCurveTo(
      pose.wingElbow.x - 10 * s,
      pose.wingElbow.y + 18 * s,
      pose.barGrip.x - 12 * s,
      pose.barGrip.y + 16 * s,
      pose.barGrip.x + 2 * s,
      pose.barGrip.y + 2 * s
    );
    c.bezierCurveTo(
      pose.wingElbow.x + 8 * s,
      pose.wingElbow.y - 8 * s,
      pose.shoulder.x + 12 * s,
      pose.shoulder.y - 10 * s,
      pose.shoulder.x - 8 * s,
      pose.shoulder.y - 6 * s
    );
    c.closePath();
  });
  dc.save();
  dc.strokeStyle = "rgba(33, 25, 18, 0.45)";
  dc.lineWidth = 1.3 * s;
  dc.beginPath();
  dc.arc(pose.shoulder.x + 4 * s, pose.shoulder.y + 2 * s, 14 * s, 0.2, 1.8);
  dc.stroke();
  dc.beginPath();
  dc.arc(pose.wingElbow.x + 2 * s, pose.wingElbow.y - 2 * s, 12 * s, 0.2, 1.7);
  dc.stroke();
  dc.restore();

  g.noFill();
  g.stroke(outline);
  g.strokeWeight(8.6 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.rightKnee.x, pose.rightKnee.y);
  g.vertex(pose.rightPedal.x, pose.rightPedal.y);
  g.endShape();
  g.stroke("#bf682e");
  g.strokeWeight(5.8 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.rightKnee.x, pose.rightKnee.y);
  g.vertex(pose.rightPedal.x, pose.rightPedal.y);
  g.endShape();

  g.stroke(woodFrame);
  g.strokeWeight(3.6 * s);
  g.line(pose.bb.x, pose.bb.y, pose.rightPedal.x, pose.rightPedal.y);
  g.fill(outline);
  g.noStroke();
  g.rect(pose.rightPedal.x - 7 * s, pose.rightPedal.y - 2.5 * s, 14 * s, 5 * s, 2 * s);
  g.rect(pose.leftPedal.x - 7 * s, pose.leftPedal.y - 2.5 * s, 14 * s, 5 * s, 2 * s);
}

// 16 Song citizens along banks, raised far-lane Rainbow Bridge deck, and 2nd-floor tavern windows
const CITIZENS = [
  { x: -124, y: ROAD_Y - 5, role: "wheelwright", dir: 1, robe: "#766956", trim: "#463b2d", hat: "bun" },
  { x: 74, y: ROAD_Y - 5, role: "vendor", dir: -1, robe: "#8c7b62", trim: "#594836", hat: "cloth", labelMark: "！" },
  { x: 112, y: ROAD_Y - 5, role: "porter", dir: 1, robe: "#6b7466", trim: "#3c4338", hat: "douli", labelMark: "！" },
  { x: 180, y: getBridgeYAndSlope(180).y - 9, role: "peddler", dir: 1, robe: "#8f7a58", trim: "#4f3e27", hat: "douli" },
  { x: 256, y: getBridgeYAndSlope(256).y - 9, role: "parasol", dir: -1, robe: "#b5856c", trim: "#6e4633", hat: "bun" },
  { x: 344, y: getBridgeYAndSlope(344).y - 9, role: "porter", dir: 1, robe: "#646d70", trim: "#384145", hat: "douli", labelMark: "！？" },
  { x: 432, y: getBridgeYAndSlope(432).y - 9, role: "monk", dir: -1, robe: "#7a6d5a", trim: "#473e30", hat: "bald" },
  { x: 526, y: getBridgeYAndSlope(526).y - 9, role: "merchant", dir: -1, robe: "#4e646e", trim: "#2a3b42", hat: "futou", labelMark: "！？" },
  { x: 604, y: getBridgeYAndSlope(604).y - 9, role: "porter", dir: -1, robe: "#7e7059", trim: "#4a3e2e", hat: "douli", labelMark: "！" },
  { x: 678, y: getBridgeYAndSlope(678).y - 9, role: "scholar", dir: -1, robe: "#96a194", trim: "#4b574b", hat: "futou" },
  { x: 752, y: getBridgeYAndSlope(752).y - 9, role: "peddler", dir: 1, robe: "#766752", trim: "#3e3326", hat: "douli" },
  { x: 826, y: getBridgeYAndSlope(826).y - 9, role: "scholar", dir: -1, robe: "#8e7d67", trim: "#544736", hat: "bun" },
  { x: 928, y: ROAD_Y - 5, role: "waiter", dir: -1, robe: "#6d7469", trim: "#3c4239", hat: "cloth", labelMark: "！" },
  { x: 992, y: 562, role: "window", dir: -1, robe: "#92624a", trim: "#4d3123", hat: "futou" },
  { x: 1054, y: 562, role: "window", dir: -1, robe: "#68786b", trim: "#374339", hat: "bun" },
  { x: 1225, y: ROAD_Y - 5, role: "seated", dir: -1, robe: "#7c8478", trim: "#464d43", hat: "futou" },
];

export default function render(ctx) {
  const { p, brush, g, kit, t, localTime } = ctx;
  const u = localTime;

  const silkPaper = getInkPaperLayer(kit, "jiehua", 1840, 1000);
  const staticBackdrop = kit.bakeLayer("s06_qingming_backdrop_v3", 1840, 1000, bakeQingmingBackdrop);
  const boatSprite = kit.bakeLayer("s06_cargo_boat_v3", 440, 240, bakeCargoBoat);

  // 1. Aged Song silk scroll substrate
  p.push();
  p.imageMode(p.CENTER);
  p.image(silkPaper, 500, 500, 1840, 1000);
  p.pop();

  // 2. Fine p5.brush Jiehua road anchors on flat left/right approaches
  brush.set("HB", "#3a2e22", 1.3);
  brush.line(BLEED_LEFT, ROAD_Y + 2, 122, ROAD_Y + 2);
  brush.line(878, ROAD_Y + 2, BLEED_RIGHT, ROAD_Y + 2);

  // 3. 2D Jiehua World Overlay
  g.push();

  g.push();
  g.imageMode("corner");
  g.image(staticBackdrop, BLEED_LEFT, 0, 1840, 1000);
  g.pop();

  const px = getScenePelicanX(u);
  drawBianRiverRipples(g, t);
  drawDynamicCargoBoat(g, boatSprite, t, u, px);
  drawSwayingWillowsAndBanners(g, t);

  for (let i = 0; i < CITIZENS.length; i++) {
    drawSongCitizen(g, CITIZENS[i], u, px);
  }

  // 2nd-floor tavern front railing over leaning diners' waists
  const tavX = 1022;
  const railY = 562;
  g.fill("#8f6239");
  g.stroke(INK_DARK);
  g.strokeWeight(1.5);
  g.rect(tavX - 78, railY, 156, 7);
  g.fill("#734e2c");
  g.rect(tavX - 78, railY + 7, 156, 16);
  for (let rx = tavX - 70; rx <= tavX + 70; rx += 14) {
    g.line(rx, railY + 7, rx, railY + 23);
  }

  // Pelican + Song Wooden Bicycle riding smoothly along getBridgeYAndSlope(x)
  const bike = getBikeOnBridge(px);
  const pose = getRigPose(t, {
    x: bike.x,
    y: bike.y,
    scale: 1.0,
    wheelie: bike.wheelie,
    lean: bike.lean,
  });
  drawQingmingRig(g, pose);

  if (u > 0.35 && u < 5.65) {
    const sealAlpha = smoothstep(0.35, 0.85, u) * (1 - smoothstep(5.15, 5.65, u));
    g.push();
    g.drawingContext.globalAlpha = sealAlpha * 0.9;
    drawRedSeal(g, 926, 88, "汴京清明", 44, "#a4382a", "zhuwen");
    drawRedSeal(g, 926, 142, "虹桥", 34, "#a4382a", "baiwen");
    g.pop();
  }

  drawEraTitleCard(g, META, u);

  g.pop();
}
