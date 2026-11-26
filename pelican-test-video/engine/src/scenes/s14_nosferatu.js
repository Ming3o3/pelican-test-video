/**
 * Scene #14 — 《诺斯费拉图》 · Nosferatu (1922), t in [83.0, 89.0).
 * German Expressionist silver-gelatin silent film:
 * - Aged sepia-silver mottled plaster stairwell wall with stark diagonal moonlight/lantern
 *   chiaroscuro, glowing distorted diamond-pane casement projection, recessed gothic pointed
 *   archways, and angular Expressionist stone stairs + straight-flight handrail shadows;
 * - NO physical Pelican appears anywhere in this era: only a giant, eerily elongated pure-black
 *   silhouette glides onto the wall, climbing the staircase diagonal (x in [80, 920] rising to
 *   y ~= 545, then descending smoothly on [920, 1250] back to ROAD_Y = 730) with elliptical
 *   shadow wheels, alternating high-low pedaling webbed feet, Count Orlok hunched collar, and
 *   crooked Nosferatu wing-claws hooked onto the handlebars;
 * - Authentic 1922 nitrate silent-film texture: pre-baked silver-halide grain, crisp drifting
 *   vertical celluloid scratches, dust specks, subtle projector brightness flicker, heavy
 *   Expressionist iris vignette, and brief Weimar geometric corner filigree;
 * - 14 -> 15 Electrification Seam (u >= 5.45, x >= 1250):
 *   Strictly returns to y = ROAD_Y (730), scale = 1.0, wheelie = 0, skewX = 0, stretchY = 1.0.
 *   During elec = smoothstep(5.45, 5.98, u), black silhouette interior hollows out (alpha -> 0.06)
 *   while cyan-green electric arc sparks ignite and P1 CRT phosphor vector lines (#42ff7a bloom
 *   + #c8ffd8 bright core + 2 persistence trails) blaze over the vignette in "lighter" blend,
 *   aligning 100% seamlessly across the t = 89.0s portal frame into #15 Oscilloscope.
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

const META = SCENES_META[13];

const STAIR_START_X = 80;
const STAIR_PEAK_X = 920;
const STAIR_END_X = 1250;
const STAIR_PEAK_Y = 545;

// Reusable offscreen scratch canvas for seamless interior silhouette alpha hollowing
let rigScratchCanvas = null;

function getRigScratch(w, h) {
  if (!rigScratchCanvas) {
    rigScratchCanvas = document.createElement("canvas");
    rigScratchCanvas.width = w;
    rigScratchCanvas.height = h;
  }
  const dc = rigScratchCanvas.getContext("2d");
  dc.clearRect(0, 0, w, h);
  return { canvas: rigScratchCanvas, dc };
}

function posMod(n, m) {
  return ((n % m) + m) % m;
}

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function cubicBezierPt(p0, p1, p2, p3, s) {
  const u = 1 - s;
  return {
    x: u * u * u * p0.x + 3 * u * u * s * p1.x + 3 * u * s * s * p2.x + s * s * s * p3.x,
    y: u * u * u * p0.y + 3 * u * u * s * p1.y + 3 * u * s * s * p2.y + s * s * s * p3.y,
  };
}

/**
 * Pure C1-continuous staircase wall-projection profile as a function of scene X.
 * Strictly returns ROAD_Y = 730, scale = 1.0, wheelie = 0, shadowExag = 0
 * for all x <= -160 (including u <= 0) and all x >= 1250 (including u >= 5.45).
 */
function getStairState(px) {
  let rigY = ROAD_Y;
  let dyDx = 0;

  if (px > STAIR_START_X && px <= STAIR_PEAK_X) {
    const span = STAIR_PEAK_X - STAIR_START_X; // 840
    const s = (px - STAIR_START_X) / span;
    const d = 0.16;
    const k = 1 / (1 - d);
    let f = 0;
    let dfDs = 0;
    if (s < d) {
      f = (k * s * s) / (2 * d);
      dfDs = (k * s) / d;
    } else if (s <= 1 - d) {
      f = k * (s - d * 0.5);
      dfDs = k;
    } else {
      const r = 1 - s;
      f = 1 - (k * r * r) / (2 * d);
      dfDs = (k * r) / d;
    }
    const rise = ROAD_Y - STAIR_PEAK_Y; // 185
    rigY = ROAD_Y - rise * f;
    dyDx = (-rise / span) * dfDs;
  } else if (px > STAIR_PEAK_X && px < STAIR_END_X) {
    const span = STAIR_END_X - STAIR_PEAK_X; // 330
    const s = (px - STAIR_PEAK_X) / span;
    const f = s * s * (3 - 2 * s);
    const dfDs = 6 * s * (1 - s);
    const drop = ROAD_Y - STAIR_PEAK_Y;
    rigY = STAIR_PEAK_Y + drop * f;
    dyDx = (drop / span) * dfDs;
  }

  // Smooth Expressionist shadow exaggeration strictly confined inside (-160, 1250)
  const inRamp = smoothstep(-160, 75, px);
  const outRamp = 1 - smoothstep(1090, STAIR_END_X, px);
  const shadowExag = clamp(inRamp * outRamp, 0, 1);

  const scale = 1.0 + 0.34 * shadowExag;
  const stretchY = 1.0 + 0.22 * shadowExag;
  const skewX = -0.17 * shadowExag;

  let wheelie = 0;
  if (px > STAIR_START_X && px < STAIR_END_X) {
    wheelie = dyDx <= 0 ? Math.atan(dyDx) : Math.atan(dyDx * 0.42);
  }

  return {
    rigY,
    dyDx,
    wheelie,
    scale,
    stretchY,
    skewX,
    shadowExag,
  };
}

/**
 * Traces a tall German Expressionist Gothic pointed arch path on Canvas2D.
 */
function traceGothicArch(dc, cx, baseY, halfW, springY, apexY) {
  dc.beginPath();
  dc.moveTo(cx - halfW, baseY);
  dc.lineTo(cx - halfW, springY);
  dc.quadraticCurveTo(cx - halfW * 0.86, lerp(springY, apexY, 0.62), cx, apexY);
  dc.quadraticCurveTo(cx + halfW * 0.86, lerp(springY, apexY, 0.62), cx + halfW, springY);
  dc.lineTo(cx + halfW, baseY);
  dc.closePath();
}

/**
 * Draws a recessed stone Gothic pointed archway with beveled inner molding (no protruding bristles).
 */
function drawGothicArchway(dc, cx, baseY, halfW, springY, apexY, depthAlpha = 0.68) {
  dc.save();
  // Outer stone surround shadow
  traceGothicArch(dc, cx, baseY, halfW + 18, springY - 4, apexY - 20);
  dc.fillStyle = "rgba(38, 33, 26, 0.36)";
  dc.fill();

  // Inner chamfered stone arch step
  traceGothicArch(dc, cx, baseY, halfW + 7, springY, apexY - 8);
  dc.fillStyle = "rgba(24, 21, 16, 0.52)";
  dc.fill();

  // Deep vaulted doorway shadow interior
  traceGothicArch(dc, cx, baseY, halfW - 4, springY + 6, apexY + 6);
  const archVoid = dc.createLinearGradient(cx - halfW, apexY, cx + halfW, baseY);
  archVoid.addColorStop(0, `rgba(14, 12, 9, ${depthAlpha.toFixed(2)})`);
  archVoid.addColorStop(0.55, `rgba(26, 22, 17, ${(depthAlpha * 0.85).toFixed(2)})`);
  archVoid.addColorStop(1, `rgba(34, 29, 22, ${(depthAlpha * 0.72).toFixed(2)})`);
  dc.fillStyle = archVoid;
  dc.fill();

  // Subtle lit stone inner bevel along the right jamb (catching left chiaroscuro light)
  dc.strokeStyle = "rgba(218, 210, 186, 0.14)";
  dc.lineWidth = 2.4;
  dc.beginPath();
  dc.moveTo(cx, apexY + 6);
  dc.quadraticCurveTo(cx + (halfW - 4) * 0.86, lerp(springY + 6, apexY + 6, 0.62), cx + halfW - 4, springY + 6);
  dc.lineTo(cx + halfW - 4, baseY);
  dc.stroke();

  // Subtle recessed keystone line inside the upper arch molding
  dc.strokeStyle = "rgba(12, 10, 8, 0.42)";
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.moveTo(cx, apexY - 20);
  dc.lineTo(cx, apexY + 6);
  dc.stroke();

  dc.restore();
}

/**
 * Pre-bakes the 1922 sepia-silver stucco stairwell backdrop, diagonal moonlight chiaroscuro,
 * distorted casement window light panes, recessed gothic pointed archways, and angular
 * Expressionist stone steps & straight-flight handrail shadows.
 */
function bakeNosferatuWall(pg) {
  const w = 1840;
  const h = 1000;
  const dc = pg.drawingContext;
  const rand = prng(192214);
  const toBx = (x) => x - BLEED_LEFT; // scene X -> baked pixel X

  // 1. Base aged silver-gelatin warm plaster wash
  const baseGrad = dc.createLinearGradient(0, 0, w, h);
  baseGrad.addColorStop(0.0, "#756d5b");
  baseGrad.addColorStop(0.32, "#a39982");
  baseGrad.addColorStop(0.65, "#918771");
  baseGrad.addColorStop(1.0, "#433d32");
  dc.fillStyle = baseGrad;
  dc.fillRect(0, 0, w, h);

  // 2. Dramatic Expressionist diagonal chiaroscuro light beam illuminating the stair climb
  const beamGrad = dc.createLinearGradient(toBx(-60), 760, toBx(1040), 100);
  beamGrad.addColorStop(0.0, "rgba(232, 224, 200, 0.36)");
  beamGrad.addColorStop(0.35, "rgba(236, 228, 204, 0.64)");
  beamGrad.addColorStop(0.72, "rgba(218, 210, 187, 0.42)");
  beamGrad.addColorStop(1.0, "rgba(56, 50, 40, 0.10)");
  dc.save();
  dc.fillStyle = beamGrad;
  dc.beginPath();
  dc.moveTo(toBx(-270), 735);
  dc.lineTo(toBx(-110), 195);
  dc.lineTo(toBx(1160), 35);
  dc.lineTo(toBx(1265), 735);
  dc.closePath();
  dc.fill();
  dc.restore();

  // Soft overhead Expressionist diagonal beam shadow cutting upper-left ceiling
  dc.save();
  dc.fillStyle = "rgba(18, 16, 12, 0.36)";
  dc.beginPath();
  dc.moveTo(0, 0);
  dc.lineTo(toBx(620), 0);
  dc.lineTo(toBx(-120), 215);
  dc.lineTo(0, 265);
  dc.closePath();
  dc.fill();
  dc.restore();

  // Secondary warm radial highlight right behind mid-staircase climb (x = 420..820)
  const midGlow = dc.createRadialGradient(
    toBx(540),
    420,
    Math.max(0.5, 40),
    toBx(540),
    440,
    Math.max(0.5, 580)
  );
  midGlow.addColorStop(0.0, "rgba(242, 234, 212, 0.45)");
  midGlow.addColorStop(0.55, "rgba(216, 208, 185, 0.16)");
  midGlow.addColorStop(1.0, "rgba(216, 208, 185, 0)");
  dc.fillStyle = midGlow;
  dc.fillRect(0, 0, w, h);

  // 3. Faint weathered ashlar masonry joints beneath flaking stucco
  dc.save();
  dc.strokeStyle = "rgba(48, 42, 34, 0.085)";
  dc.lineWidth = 1.4;
  for (let row = 0; row < 12; row++) {
    const ry = 48 + row * 62;
    dc.beginPath();
    dc.moveTo(0, ry);
    dc.lineTo(w, ry + (rand() - 0.5) * 4);
    dc.stroke();
    const offset = (row % 2) * 55;
    for (let cx = offset; cx < w; cx += 118) {
      if (rand() < 0.65) {
        dc.beginPath();
        dc.moveTo(cx + (rand() - 0.5) * 6, ry);
        dc.lineTo(cx + (rand() - 0.5) * 6, ry + 62);
        dc.stroke();
      }
    }
  }
  dc.restore();

  // 4. Organic mottled lime-plaster clouds, water stains & hairline wall cracks
  dc.save();
  for (let i = 0; i < 280; i++) {
    const x = rand() * w;
    const y = rand() * 820;
    const r = Math.max(0.5, 24 + rand() * 92);
    const light = rand() > 0.54;
    const gPatch = dc.createRadialGradient(x, y, 0.5, x, y, r);
    if (light) {
      gPatch.addColorStop(0, "rgba(235, 227, 204, 0.065)");
      gPatch.addColorStop(1, "rgba(235, 227, 204, 0)");
    } else {
      gPatch.addColorStop(0, "rgba(38, 33, 25, 0.08)");
      gPatch.addColorStop(1, "rgba(38, 33, 25, 0)");
    }
    dc.fillStyle = gPatch;
    dc.beginPath();
    dc.arc(x, y, r, 0, Math.PI * 2);
    dc.fill();
  }

  // Vertical damp streaks from upper ceiling eaves
  for (let i = 0; i < 28; i++) {
    const sx = rand() * w;
    const sh = 110 + rand() * 260;
    const sw = 8 + rand() * 26;
    const streak = dc.createLinearGradient(sx, 0, sx, sh);
    streak.addColorStop(0, "rgba(22, 19, 14, 0.24)");
    streak.addColorStop(1, "rgba(22, 19, 14, 0)");
    dc.fillStyle = streak;
    dc.fillRect(sx, 0, sw, sh);
  }

  // Fine jagged plaster fissures
  dc.strokeStyle = "rgba(28, 24, 18, 0.30)";
  dc.lineWidth = 1.1;
  for (let c = 0; c < 16; c++) {
    let cx = 60 + rand() * (w - 120);
    let cy = 35 + rand() * 580;
    dc.beginPath();
    dc.moveTo(cx, cy);
    const segs = 5 + Math.floor(rand() * 6);
    for (let k = 0; k < segs; k++) {
      cx += (rand() - 0.45) * 44;
      cy += 16 + rand() * 42;
      dc.lineTo(cx, cy);
    }
    dc.stroke();
  }
  dc.restore();

  // 5. Glowing Projected Gothic Casement Diamond-Pane Window Light on Upper-Left Wall
  dc.save();
  dc.translate(toBx(248), 278);
  dc.transform(1, -0.22, -0.34, 1, 0, 0);

  // Soft outer moonlight spill
  const winGlow = dc.createRadialGradient(0, 0, Math.max(0.5, 10), 0, 0, Math.max(0.5, 165));
  winGlow.addColorStop(0, "rgba(248, 242, 222, 0.24)");
  winGlow.addColorStop(0.65, "rgba(235, 226, 202, 0.10)");
  winGlow.addColorStop(1, "rgba(235, 226, 202, 0)");
  dc.fillStyle = winGlow;
  dc.fillRect(-130, -145, 260, 290);

  // Illuminated window glass panes separated by stucco shadow mullions
  const paneCols = 3;
  const paneRows = 3;
  const pw = 38;
  const ph = 48;
  const gap = 8;
  const totalW = paneCols * pw + (paneCols - 1) * gap;
  const totalH = paneRows * ph + (paneRows - 1) * gap;
  for (let r = 0; r < paneRows; r++) {
    for (let c = 0; c < paneCols; c++) {
      const px = -totalW * 0.5 + c * (pw + gap);
      const py = -totalH * 0.5 + r * (ph + gap);
      dc.fillStyle = "rgba(248, 242, 224, 0.22)";
      dc.fillRect(px, py, pw, ph);
    }
  }
  dc.restore();

  // 6. Recessed Gothic Pointed Archways (Left Portal Arch, Upper Landing Arch, Right Cellar Niche)
  drawGothicArchway(dc, toBx(-185), ROAD_Y + 4, 84, 390, 225, 0.64);
  drawGothicArchway(dc, toBx(948), STAIR_PEAK_Y + 14, 84, 368, 205, 0.72);
  drawGothicArchway(dc, toBx(1210), ROAD_Y + 4, 58, 435, 290, 0.48);

  // 7. Straight-Flight German Expressionist Handrail & Iron Baluster Shadows
  // Drawn with angular straight architectural segments matching stone steps (no wavy curves!)
  dc.save();
  dc.strokeStyle = "rgba(20, 17, 13, 0.30)";
  dc.fillStyle = "rgba(20, 17, 13, 0.30)";
  dc.lineCap = "round";
  dc.lineJoin = "round";

  const railHeight = 88;
  const landingStartX = 900;
  const landingEndX = 980;
  const botRailY = ROAD_Y - railHeight;
  const topRailY = STAIR_PEAK_Y - railHeight;

  // Main straight-segment handrail bar
  dc.lineWidth = 8.2;
  dc.beginPath();
  dc.moveTo(toBx(STAIR_START_X - 18), botRailY + 4);
  dc.lineTo(toBx(STAIR_START_X), botRailY);
  dc.lineTo(toBx(landingStartX), topRailY);
  dc.lineTo(toBx(landingEndX), topRailY);
  dc.lineTo(toBx(STAIR_END_X), botRailY);
  dc.lineTo(toBx(STAIR_END_X + 14), botRailY + 4);
  dc.stroke();

  // Helper returning the straight handrail Y along each architectural flight
  const getRailTopY = (sx) => {
    if (sx <= STAIR_START_X) return botRailY;
    if (sx < landingStartX) return lerp(botRailY, topRailY, (sx - STAIR_START_X) / (landingStartX - STAIR_START_X));
    if (sx <= landingEndX) return topRailY;
    if (sx < STAIR_END_X) return lerp(topRailY, botRailY, (sx - landingEndX) / (STAIR_END_X - landingEndX));
    return botRailY;
  };

  // Tilted Expressionist iron balusters connecting steps up to straight handrail
  dc.lineWidth = 4.0;
  for (let sx = STAIR_START_X + 26; sx <= STAIR_END_X - 24; sx += 52) {
    if (Math.abs(sx - landingStartX) < 22 || Math.abs(sx - landingEndX) < 22) continue;
    const base = getStairState(sx).rigY;
    const top = getRailTopY(sx);
    const tilt = sx < landingStartX ? -6 : sx > landingEndX ? 6 : 0;
    dc.beginPath();
    dc.moveTo(toBx(sx), base + 4);
    dc.lineTo(toBx(sx) + tilt, top);
    dc.stroke();
  }

  // Ornate Gothic newel posts at bottom (80), landing corners (900, 980), and foot (1250)
  for (const [nx, nr] of [
    [STAIR_START_X, 9],
    [landingStartX, 9],
    [landingEndX, 9],
    [STAIR_END_X, 8],
  ]) {
    const ny = getStairState(nx).rigY;
    const ry = getRailTopY(nx);
    dc.lineWidth = 7.6;
    dc.beginPath();
    dc.moveTo(toBx(nx), ny + 6);
    dc.lineTo(toBx(nx), ry - 18);
    dc.stroke();
    dc.beginPath();
    dc.moveTo(toBx(nx) - nr, ry - 14);
    dc.lineTo(toBx(nx), ry - 36);
    dc.lineTo(toBx(nx) + nr, ry - 14);
    dc.closePath();
    dc.fill();
  }
  dc.restore();

  // 8. Angular Expressionist Stone Staircase Masonry Shadow (sharp treads & vertical risers!)
  dc.save();
  dc.beginPath();
  dc.moveTo(0, ROAD_Y);
  dc.lineTo(toBx(STAIR_START_X), ROAD_Y);

  // Ascent stone step risers & treads (15 angular steps climbing from x=80 to x=900)
  const ascSteps = 15;
  const stepHighlightCoords = [];
  for (let i = 0; i < ascSteps; i++) {
    const x0 = lerp(STAIR_START_X, landingStartX, i / ascSteps);
    const x1 = lerp(STAIR_START_X, landingStartX, (i + 1) / ascSteps);
    const y1 = getStairState(x1).rigY;
    dc.lineTo(toBx(x0), y1);
    dc.lineTo(toBx(x1), y1);
    stepHighlightCoords.push([toBx(x0), y1, toBx(x1), y1]);
  }

  // Upper stone landing plateau (x = 900..980)
  dc.lineTo(toBx(landingEndX), STAIR_PEAK_Y);
  stepHighlightCoords.push([toBx(landingStartX), STAIR_PEAK_Y, toBx(landingEndX), STAIR_PEAK_Y]);

  // Descent cellar stone steps (8 sharp horizontal treads + vertical risers down to x=1250, y=730)
  const descSteps = 8;
  for (let i = 0; i < descSteps; i++) {
    const x0 = lerp(landingEndX, STAIR_END_X, i / descSteps);
    const x1 = lerp(landingEndX, STAIR_END_X, (i + 1) / descSteps);
    const y0 = getStairState(x0).rigY;
    const y1 = getStairState(x1).rigY;
    dc.lineTo(toBx(x0), y1);
    dc.lineTo(toBx(x1), y1);
    stepHighlightCoords.push([toBx(x0), y1, toBx(x1), y1]);
    void y0;
  }

  dc.lineTo(toBx(STAIR_END_X), ROAD_Y);
  dc.lineTo(w, ROAD_Y);
  dc.lineTo(w, h);
  dc.lineTo(0, h);
  dc.closePath();

  const stairFill = dc.createLinearGradient(0, 540, 0, h);
  stairFill.addColorStop(0, "#1c1913");
  stairFill.addColorStop(0.32, "#13110d");
  stairFill.addColorStop(1, "#090806");
  dc.fillStyle = stairFill;
  dc.fill();

  // Crisp subtle stone tread bevel highlights along top surfaces of every step
  dc.strokeStyle = "rgba(198, 188, 162, 0.25)";
  dc.lineWidth = 2.0;
  for (const [tx0, ty0, tx1, ty1] of stepHighlightCoords) {
    dc.beginPath();
    dc.moveTo(tx0, ty0 + 1);
    dc.lineTo(tx1, ty1 + 1);
    dc.stroke();
  }

  // Continuous stone floor threshold highlight along ROAD_Y = 730 on entry & exit corridors
  dc.strokeStyle = "rgba(176, 166, 142, 0.26)";
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.moveTo(0, ROAD_Y + 1);
  dc.lineTo(toBx(STAIR_START_X), ROAD_Y + 1);
  dc.moveTo(toBx(STAIR_END_X), ROAD_Y + 1);
  dc.lineTo(w, ROAD_Y + 1);
  dc.stroke();

  // Subtle floor baseboard mortar line across the dark stairwell plinth at ROAD_Y = 730
  dc.strokeStyle = "rgba(92, 84, 68, 0.26)";
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.moveTo(0, ROAD_Y);
  dc.lineTo(w, ROAD_Y);
  dc.stroke();
  dc.restore();

  // 9. Upper ceiling overhang shadow & dark right-corridor cellar transition
  const topShadow = dc.createLinearGradient(0, 0, 0, 175);
  topShadow.addColorStop(0, "rgba(10, 9, 7, 0.86)");
  topShadow.addColorStop(0.55, "rgba(16, 14, 11, 0.32)");
  topShadow.addColorStop(1, "rgba(16, 14, 11, 0)");
  dc.fillStyle = topShadow;
  dc.fillRect(0, 0, w, 175);

  // Dark right-portal transitional cellar shadow (merges smoothly into #15's dark CRT edge)
  const rightCellar = dc.createLinearGradient(toBx(1210), 0, w, 0);
  rightCellar.addColorStop(0, "rgba(10, 9, 7, 0)");
  rightCellar.addColorStop(0.55, "rgba(9, 12, 9, 0.48)");
  rightCellar.addColorStop(1, "rgba(4, 10, 6, 0.84)");
  dc.fillStyle = rightCellar;
  dc.fillRect(toBx(1210), 0, w - toBx(1210), h);
}

/**
 * Pre-bakes a tileable 920 x 500 antique nitrate silver-halide film grain + micro-speck overlay.
 */
function bakeFilmGrainSheet(pg) {
  const w = 920;
  const h = 500;
  const dc = pg.drawingContext;
  const rand = prng(192299);

  pg.clear();
  for (let i = 0; i < 4600; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const sz = 0.8 + rand() * 2.0;
    const dark = rand() > 0.44;
    dc.fillStyle = dark
      ? `rgba(12, 10, 8, ${(0.045 + rand() * 0.085).toFixed(3)})`
      : `rgba(246, 238, 216, ${(0.04 + rand() * 0.08).toFixed(3)})`;
    dc.fillRect(x, y, sz, sz);
  }
  // Organic nitrate emulsion fiber hairs
  dc.strokeStyle = "rgba(15, 13, 10, 0.16)";
  dc.lineWidth = 0.85;
  for (let i = 0; i < 28; i++) {
    const hx = rand() * w;
    const hy = rand() * h;
    dc.beginPath();
    dc.moveTo(hx, hy);
    dc.quadraticCurveTo(hx + (rand() - 0.5) * 14, hy + (rand() - 0.5) * 14, hx + (rand() - 0.5) * 20, hy + (rand() - 0.5) * 20);
    dc.stroke();
  }
}

/**
 * Traces the Nosferatu Pelican + Bicycle geometry onto a Canvas2D context.
 * Shared helper for both solid black silhouette rendering and P1 green vector outline strokes.
 */
function drawShadowRigGeometry(dc, pose, shadowExag, mode, style = {}) {
  const s = pose.scale;
  const isFill = mode === "fill";
  const elec = style.elec ?? 0;

  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";

  const drawSegment = (a, b, w) => {
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.lineWidth = w;
    dc.stroke();
  };

  // 1. Wheels (circular in canonical space -> automatically sheared elliptical in wall shadow space!)
  for (const hub of [pose.rearHub, pose.frontHub]) {
    const r = Math.max(0.5, pose.wheelRadius);
    dc.beginPath();
    dc.arc(hub.x, hub.y, r, 0, Math.PI * 2);
    dc.lineWidth = isFill ? 6.4 * s : style.rimW;
    dc.strokeStyle = style.strokeCol;
    dc.stroke();

    // 8 rotating spokes (matching s15 diametric layout)
    dc.lineWidth = isFill ? 2.1 * s : style.spokeW;
    for (let i = 0; i < 4; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 4;
      const rx = Math.cos(a) * Math.max(0.5, r - 2.2 * s);
      const ry = Math.sin(a) * Math.max(0.5, r - 2.2 * s);
      dc.beginPath();
      dc.moveTo(hub.x - rx, hub.y - ry);
      dc.lineTo(hub.x + rx, hub.y + ry);
      dc.stroke();
    }

    // Hub
    if (isFill) {
      dc.beginPath();
      dc.arc(hub.x, hub.y, Math.max(0.5, 5.2 * s), 0, Math.PI * 2);
      dc.fillStyle = style.fillCol;
      dc.fill();
    }
  }

  // 2. Back leg (hip -> leftKnee -> leftPedal) + webbed foot
  dc.strokeStyle = isFill ? style.farCol || style.fillCol : style.strokeCol;
  dc.lineWidth = isFill ? 7.8 * s : style.limbW;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.leftKnee.x, pose.leftKnee.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();

  // Rear crank & pedal
  dc.strokeStyle = style.strokeCol;
  dc.lineWidth = isFill ? 4.2 * s : style.frameW * 0.8;
  drawSegment(pose.bb, pose.leftPedal, dc.lineWidth);
  drawSegment(
    { x: pose.leftPedal.x - 8 * s, y: pose.leftPedal.y },
    { x: pose.leftPedal.x + 8 * s, y: pose.leftPedal.y },
    isFill ? 5.2 * s : style.frameW
  );

  // 3. Bicycle diamond frame, fork, handlebars & saddle
  dc.strokeStyle = style.strokeCol;
  const fw = isFill ? 5.4 * s : style.frameW;
  drawSegment(pose.rearHub, pose.bb, fw);
  drawSegment(pose.rearHub, pose.seatCluster, fw);
  drawSegment(pose.bb, pose.seatCluster, fw);
  drawSegment(pose.seatCluster, pose.headTop, fw);
  drawSegment(pose.bb, pose.headBot, fw);
  drawSegment(pose.headTop, pose.headBot, fw);
  drawSegment(pose.frontHub, pose.headTop, fw);
  drawSegment(pose.headTop, pose.stemTop, fw * 0.9);
  drawSegment(pose.stemTop, pose.barGrip, fw * 0.85);
  drawSegment(
    pose.seatCluster,
    { x: (pose.saddleRear.x + pose.saddleFront.x) * 0.5, y: pose.saddleRear.y + 3 * s },
    fw * 0.9
  );
  drawSegment(pose.saddleRear, pose.saddleFront, isFill ? 7.2 * s : style.frameW * 1.15);

  // Chainring & handlebar bell
  dc.beginPath();
  dc.arc(pose.bb.x, pose.bb.y, Math.max(0.5, 9.5 * s), 0, Math.PI * 2);
  if (isFill) {
    dc.fillStyle = style.fillCol;
    dc.fill();
  } else {
    dc.lineWidth = style.lineW;
    dc.stroke();
  }
  dc.beginPath();
  dc.arc(pose.bellPos.x, pose.bellPos.y, Math.max(0.5, 4.5 * s), 0, Math.PI * 2);
  if (isFill) {
    dc.fillStyle = style.fillCol;
    dc.fill();
  } else {
    dc.lineWidth = style.lineW * 0.85;
    dc.stroke();
  }

  // 4. Pelican Body + Tail + Eerie Count Orlok High-Collar Hump (fades out cleanly as shadowExag -> 0)
  dc.beginPath();
  dc.moveTo(pose.tailTip.x - 10 * s * shadowExag, pose.tailTip.y - 3 * s * shadowExag);
  dc.bezierCurveTo(
    pose.bodyCenter.x - 42 * s,
    pose.bodyCenter.y - (28 + 13 * shadowExag) * s,
    pose.bodyCenter.x + 26 * s,
    pose.bodyCenter.y - (34 + 15 * shadowExag) * s,
    pose.neckBase.x + 12 * s,
    pose.neckBase.y + 8 * s
  );
  dc.bezierCurveTo(
    pose.bodyCenter.x + 36 * s,
    pose.bodyCenter.y + 24 * s,
    pose.hip.x + 16 * s,
    pose.hip.y + 12 * s,
    pose.tailTip.x - 10 * s * shadowExag,
    pose.tailTip.y - 3 * s * shadowExag
  );
  dc.closePath();
  if (isFill) {
    dc.fillStyle = style.fillCol;
    dc.fill();
  } else {
    dc.lineWidth = style.lineW;
    dc.strokeStyle = style.strokeCol;
    dc.stroke();
  }

  // Broad hunched Count Orlok upturned gothic cloak-collar behind shoulders when in shadow mode
  if (shadowExag > 0.04 && isFill) {
    dc.beginPath();
    dc.moveTo(pose.neckBase.x - 14 * s, pose.neckBase.y + 12 * s);
    dc.quadraticCurveTo(
      pose.neckBase.x - 24 * s * shadowExag,
      pose.neckBase.y - 16 * s * shadowExag,
      pose.neckBase.x - 8 * s * shadowExag,
      pose.neckBase.y - 24 * s * shadowExag
    );
    dc.quadraticCurveTo(
      pose.neckBase.x + 6 * s,
      pose.neckBase.y - 12 * s * shadowExag,
      pose.shoulder.x + 12 * s,
      pose.shoulder.y + 10 * s
    );
    dc.closePath();
    dc.fillStyle = style.fillCol;
    dc.fill();
  }

  // 5. S-curve Neck (solid gaunt neck in shadow mode -> hollow twin-contour CRT neck matching #15!)
  const nc = pose.neckCurve;
  if (isFill) {
    dc.beginPath();
    for (let i = 0; i < nc.length; i++) {
      const pt = nc[i];
      if (i === 0) dc.moveTo(pt.x, pt.y);
      else dc.lineTo(pt.x, pt.y);
    }
    dc.strokeStyle = style.fillCol;
    dc.lineWidth = (19.5 - 3.5 * shadowExag) * s;
    dc.stroke();
  } else {
    const neckFront = [];
    const neckBack = [];
    const neckSub = 14;
    for (let i = 0; i <= neckSub; i++) {
      const f = i / neckSub;
      const p = cubicBezierPt(nc[0], nc[1], nc[3], nc[4], f);
      const pNext = cubicBezierPt(nc[0], nc[1], nc[3], nc[4], Math.min(1, f + 0.04));
      const pPrev = cubicBezierPt(nc[0], nc[1], nc[3], nc[4], Math.max(0, f - 0.04));
      const dx = pNext.x - pPrev.x;
      const dy = pNext.y - pPrev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 9.5 * s;
      const ny = (dx / len) * 9.5 * s;
      neckFront.push({ x: p.x + nx, y: p.y + ny });
      neckBack.push({ x: p.x - nx, y: p.y - ny });
    }
    dc.strokeStyle = style.strokeCol;
    dc.lineWidth = style.lineW;
    for (const edge of [neckFront, neckBack]) {
      dc.beginPath();
      dc.moveTo(edge[0].x, edge[0].y);
      for (let i = 1; i < edge.length; i++) dc.lineTo(edge[i].x, edge[i].y);
      dc.stroke();
    }
  }

  // 6. Head + Spiky Crest + Hooked Upper Beak + Sagging Throat Pouch
  dc.beginPath();
  dc.moveTo(pose.crest1.x - 10 * s * shadowExag, pose.crest1.y - 8 * s * shadowExag);
  dc.lineTo(pose.head.x - 6 * s, pose.head.y - 16 * s);
  dc.lineTo(pose.crest2.x - 5 * s * shadowExag, pose.crest2.y - 10 * s * shadowExag);
  dc.lineTo(pose.head.x + 6 * s, pose.head.y - 17 * s);
  if (isFill) {
    dc.closePath();
    dc.fillStyle = style.fillCol;
    dc.fill();
  } else {
    dc.lineWidth = style.lineW;
    dc.strokeStyle = style.strokeCol;
    dc.stroke();
  }

  // Head skull
  dc.beginPath();
  dc.arc(pose.head.x, pose.head.y, Math.max(0.5, 16.5 * s), 0, Math.PI * 2);
  if (isFill) {
    dc.fillStyle = style.fillCol;
    dc.fill();
  } else {
    dc.lineWidth = style.lineW;
    dc.strokeStyle = style.strokeCol;
    dc.stroke();
  }

  // Hollow CRT Eye appears ONLY as rig electrifies into #15 Oscilloscope
  if (!isFill && elec > 0.05) {
    dc.save();
    dc.globalAlpha *= elec;
    dc.beginPath();
    dc.arc(pose.eye.x, pose.eye.y, Math.max(0.5, 4.6 * s), 0, Math.PI * 2);
    dc.lineWidth = style.lineW * 0.9;
    dc.strokeStyle = style.strokeCol;
    dc.stroke();
    dc.restore();
  }

  // Throat pouch
  dc.beginPath();
  dc.moveTo(pose.pouchBase.x, pose.pouchBase.y);
  dc.bezierCurveTo(
    pose.pouchMid.x - 16 * s,
    pose.pouchMid.y + (12 + 9 * shadowExag) * s,
    pose.pouchMid.x + 34 * s,
    pose.pouchMid.y + (6 + 5 * shadowExag) * s,
    pose.beakTip.x - 4 * s,
    pose.beakTip.y + 4 * s
  );
  if (isFill) {
    dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 12 * s);
    dc.closePath();
    dc.fillStyle = style.fillCol;
    dc.fill();
  } else {
    dc.lineWidth = style.lineW;
    dc.strokeStyle = style.strokeCol;
    dc.stroke();
  }

  // Upper beak + menacing Nosferatu beak hook
  const hookExt = 9 * s * shadowExag;
  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
  dc.lineTo(pose.beakTip.x + hookExt, pose.beakTip.y - 2 * s * shadowExag);
  dc.lineTo(pose.beakHook.x + hookExt * 0.95, pose.beakHook.y + 8 * s * shadowExag);
  dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  dc.closePath();
  if (isFill) {
    dc.fillStyle = style.fillCol;
    dc.fill();
  } else {
    dc.lineWidth = style.lineW;
    dc.strokeStyle = style.strokeCol;
    dc.stroke();
  }

  // 7. Wing reaching to handlebars + Nosferatu crooked wing-claws hooked onto barGrip!
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
  if (isFill) {
    dc.fillStyle = style.fillCol;
    dc.fill();
  } else {
    dc.lineWidth = style.lineW;
    dc.strokeStyle = style.strokeCol;
    dc.stroke();
  }

  // Three long crooked Nosferatu claws hooking over the handlebar grip
  if (shadowExag > 0.03) {
    const clawLen = 22 * s * shadowExag;
    dc.strokeStyle = style.strokeCol;
    dc.lineWidth = isFill ? 2.6 * s : style.lineW * 0.85;
    for (const [ox, oy, ang] of [
      [1 * s, -1 * s, -0.48],
      [3 * s, 2 * s, 0.04],
      [1 * s, 5 * s, 0.54],
    ]) {
      const cx = pose.barGrip.x + ox;
      const cy = pose.barGrip.y + oy;
      const midX = cx + Math.cos(ang - 0.32) * clawLen * 0.65;
      const midY = cy + Math.sin(ang - 0.32) * clawLen * 0.65 - 3.5 * s * shadowExag;
      const tipX = cx + Math.cos(ang + 0.48) * clawLen;
      const tipY = cy + Math.sin(ang + 0.48) * clawLen + 5.5 * s * shadowExag;
      dc.beginPath();
      dc.moveTo(cx, cy);
      dc.lineTo(midX, midY);
      dc.lineTo(tipX, tipY);
      dc.stroke();
    }
  }

  // 8. Front leg (hip -> rightKnee -> rightPedal) + webbed shadow foot & front crank
  dc.strokeStyle = style.strokeCol;
  dc.lineWidth = isFill ? 8.2 * s : style.limbW;
  dc.beginPath();
  dc.moveTo(pose.hip.x, pose.hip.y);
  dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  // Splayed webbed pelican toes on alternating pedals in shadow mode
  if (shadowExag > 0.05 && isFill) {
    dc.lineWidth = 2.6 * s;
    for (const ped of [pose.leftPedal, pose.rightPedal]) {
      dc.beginPath();
      dc.moveTo(ped.x - 4 * s, ped.y);
      dc.lineTo(ped.x + 13 * s * shadowExag, ped.y + 3.2 * s * shadowExag);
      dc.moveTo(ped.x - 2 * s, ped.y - 1 * s);
      dc.lineTo(ped.x + 11 * s * shadowExag, ped.y - 4.2 * s * shadowExag);
      dc.stroke();
    }
  }

  // Front crank & pedal
  dc.strokeStyle = style.strokeCol;
  dc.lineWidth = isFill ? 4.4 * s : style.frameW * 0.8;
  drawSegment(pose.bb, pose.rightPedal, dc.lineWidth);
  drawSegment(
    { x: pose.rightPedal.x - 8 * s, y: pose.rightPedal.y },
    { x: pose.rightPedal.x + 8 * s, y: pose.rightPedal.y },
    isFill ? 5.6 * s : style.frameW * 1.05
  );

  dc.restore();
}

/**
 * Draws the 14 -> 15 cyan-green electric arc sparks crackling around the silhouette perimeter
 * and jumping toward the right portal frame (x = 1420) and CRT floor line (ROAD_Y = 730).
 */
function drawElectricArcs(dc, pose, t, elec) {
  if (elec <= 0.015) return;

  const tick = Math.floor(Math.max(0, t + 100) * 26);
  const rand = prng(140015 + tick * 7919);

  // Peak crackling as electricity surges into #15
  const sparkIntensity = clamp(Math.sin(elec * Math.PI) * 0.55 + elec * 0.72, 0, 1);

  dc.save();
  dc.globalCompositeOperation = "lighter";
  dc.lineCap = "round";
  dc.lineJoin = "round";

  const drawJaggedArc = (x0, y0, x1, y1, jitter, steps, alpha, widthScale = 1) => {
    const pts = [[x0, y0]];
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      const mx = lerp(x0, x1, f) + (rand() - 0.5) * jitter;
      const my = lerp(y0, y1, f) + (rand() - 0.5) * jitter;
      pts.push([mx, my]);
    }
    pts.push([x1, y1]);

    // Outer cyan-green arc halo
    dc.strokeStyle = `rgba(98, 255, 228, ${(0.48 * alpha).toFixed(3)})`;
    dc.lineWidth = 4.6 * widthScale;
    dc.beginPath();
    dc.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) dc.lineTo(pts[i][0], pts[i][1]);
    dc.stroke();

    // Bright cyan-white electric core
    dc.strokeStyle = `rgba(218, 255, 246, ${(0.96 * alpha).toFixed(3)})`;
    dc.lineWidth = 1.6 * widthScale;
    dc.stroke();
  };

  // Perimeter silhouette anchors (positioned along outer rim/edges so arcs flare visibly outward!)
  const perimeterAnchors = [
    { x: pose.rearHub.x - pose.wheelRadius * 0.85, y: pose.rearHub.y - pose.wheelRadius * 0.55, nx: -0.8, ny: -0.5 },
    { x: pose.rearHub.x - pose.wheelRadius * 0.9, y: pose.rearHub.y + pose.wheelRadius * 0.3, nx: -0.9, ny: 0.2 },
    { x: pose.frontHub.x + pose.wheelRadius * 0.8, y: pose.frontHub.y - pose.wheelRadius * 0.6, nx: 0.8, ny: -0.5 },
    { x: pose.frontHub.x, y: pose.frontHub.y + pose.wheelRadius, nx: 0.2, ny: 0.6 },
    { x: pose.tailTip.x, y: pose.tailTip.y, nx: -0.9, ny: -0.3 },
    { x: pose.crest2.x, y: pose.crest2.y, nx: -0.3, ny: -0.9 },
    { x: pose.beakTip.x, y: pose.beakTip.y, nx: 0.9, ny: -0.2 },
    { x: pose.pouchMid.x, y: pose.pouchMid.y + 18, nx: 0.4, ny: 0.8 },
    { x: pose.barGrip.x, y: pose.barGrip.y, nx: 0.4, ny: -0.8 },
  ];

  // Outward-flaring jagged cyan-green arcs leaping off the silhouette perimeter
  for (let i = 0; i < 8; i++) {
    const p = perimeterAnchors[posMod(i + tick, perimeterAnchors.length)];
    const len = 26 + rand() * 38;
    const spreadAng = Math.atan2(p.ny, p.nx) + (rand() - 0.5) * 0.9;
    const ex = p.x + Math.cos(spreadAng) * len;
    const ey = p.y + Math.sin(spreadAng) * len;
    drawJaggedArc(p.x, p.y, ex, ey, 19, 5, sparkIntensity, 0.95);
  }

  // Forward arcs snapping between the bike/beak and the right portal column (x = 1420)
  if (pose.x > 1255) {
    const portalArcAlpha = sparkIntensity * smoothstep(1265, 1412, pose.x);
    for (const src of [pose.beakTip, pose.frontHub, pose.barGrip, pose.head]) {
      if (src.x < 1418 && portalArcAlpha > 0.04) {
        drawJaggedArc(
          src.x,
          src.y,
          Math.min(1420, src.x + 32 + rand() * 58),
          src.y + (rand() - 0.5) * 46,
          16,
          4,
          portalArcAlpha,
          1.05
        );
      }
    }
  }

  // Flying cyan-green spark particles around outer silhouette
  for (let i = 0; i < 16; i++) {
    const pAnchor = perimeterAnchors[i % perimeterAnchors.length];
    const sx = pAnchor.x + pAnchor.nx * (14 + rand() * 32) + (rand() - 0.5) * 28;
    const sy = pAnchor.y + pAnchor.ny * (14 + rand() * 32) + (rand() - 0.5) * 28;
    const sr = Math.max(0.5, 1.2 + rand() * 2.2);
    dc.fillStyle = rand() > 0.4 ? `rgba(218, 255, 246, ${(0.92 * sparkIntensity).toFixed(3)})` : `rgba(98, 255, 228, ${(0.78 * sparkIntensity).toFixed(3)})`;
    dc.beginPath();
    dc.arc(sx, sy, sr, 0, Math.PI * 2);
    dc.fill();
  }

  dc.restore();
}

/**
 * Draws brief delicate Weimar 1922 silent-film geometric filigree corner ornaments
 * ("纯几何默片花边框") without dark opaque boxes or Title Card / Pelican clashes.
 */
function drawSilentFilmBorderAccent(dc, u) {
  const cornerAlpha = (smoothstep(1.05, 1.50, u) * (1 - smoothstep(2.75, 3.35, u))) * 0.72;
  if (cornerAlpha <= 0.01) return;

  dc.save();
  dc.globalAlpha = cornerAlpha;
  dc.strokeStyle = "#dfd7c2";
  dc.fillStyle = "#dfd7c2";
  dc.lineCap = "square";

  // Open delicate silent-film stepped geometric corner brackets at top-right, bottom-left, bottom-right
  const corners = [
    [966, 32, -1, 1],
    [34, 968, 1, -1],
    [966, 968, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    dc.lineWidth = 1.8;
    dc.beginPath();
    dc.moveTo(cx, cy);
    dc.lineTo(cx + sx * 84, cy);
    dc.moveTo(cx, cy);
    dc.lineTo(cx, cy + sy * 54);
    dc.stroke();

    dc.lineWidth = 1.0;
    dc.beginPath();
    dc.moveTo(cx + sx * 7, cy + sy * 7);
    dc.lineTo(cx + sx * 68, cy + sy * 7);
    dc.moveTo(cx + sx * 7, cy + sy * 7);
    dc.lineTo(cx + sx * 7, cy + sy * 40);
    dc.stroke();

    // Small Weimar stepped diamond motif inside corner L
    const dx = cx + sx * 16;
    const dy = cy + sy * 16;
    dc.beginPath();
    dc.moveTo(dx, dy - 4.5);
    dc.lineTo(dx + 4.5, dy);
    dc.lineTo(dx, dy + 4.5);
    dc.lineTo(dx - 4.5, dy);
    dc.closePath();
    dc.fill();
  }

  dc.restore();
}

/**
 * Draws the 1922 silent-film post-processing atmosphere:
 * pre-baked silver-halide grain, crisp drifting vertical celluloid scratches, dust specks,
 * projector brightness flicker, and heavy German Expressionist iris vignette.
 * Note: runs BEFORE the 14->15 additive P1 CRT glow layer so the electrified green beam blazes unobstructed!
 */
function drawSilentFilmPost(dc, grainSheet, t, u, elec) {
  const filmStep = Math.floor(Math.max(0, t + 100) * 18);
  const rand = prng(192200 + filmStep * 4999);

  // 1. Pre-baked silver-halide grain tiled cleanly across [-420..1420] x [0..1000]
  const flipX = posMod(filmStep, 2) === 0 ? 1 : -1;
  const flipY = posMod(Math.floor(filmStep / 2), 2) === 0 ? 1 : -1;
  const gxShift = posMod(filmStep * 137, 230);
  const gyShift = posMod(filmStep * 97, 140);

  dc.save();
  dc.globalAlpha = lerp(0.92, 0.45, elec);
  for (let tx = -1; tx <= 2; tx++) {
    for (let ty = -1; ty <= 2; ty++) {
      const dx = BLEED_LEFT + tx * 920 + gxShift;
      const dy = ty * 500 + gyShift;
      if (dx > BLEED_RIGHT || dx + 920 < BLEED_LEFT || dy > 1000 || dy + 500 < 0) continue;
      dc.save();
      dc.translate(dx + 460, dy + 250);
      dc.scale(flipX, flipY);
      dc.drawImage(grainSheet.canvas, -460, -250);
      dc.restore();
    }
  }
  dc.restore();

  // 2. Crisp vertical celluloid nitrate scratches & jumping dust specks
  const scratchVis = 1 - elec * 0.72;
  if (scratchVis > 0.05) {
    dc.save();
    for (let i = 0; i < 8; i++) {
      const baseSx = BLEED_LEFT + posMod(i * 239 + filmStep * (i % 2 === 0 ? 17 : -11), 1840);
      const isBright = i % 3 === 1;
      const alpha = (i < 3 ? 0.17 + rand() * 0.11 : 0.09 + rand() * 0.09) * scratchVis;
      dc.strokeStyle = isBright
        ? `rgba(242, 234, 210, ${alpha.toFixed(3)})`
        : `rgba(10, 9, 7, ${alpha.toFixed(3)})`;
      dc.lineWidth = i < 3 ? 1.15 + rand() * 0.65 : 0.75 + rand() * 0.5;
      const yTop = rand() * 110;
      const yBot = 820 + rand() * 180;
      dc.beginPath();
      dc.moveTo(baseSx, yTop);
      dc.lineTo(baseSx + (rand() - 0.5) * 4.5, yBot);
      dc.stroke();
    }

    // Jumping nitrate dust specks & tiny hairs
    for (let i = 0; i < 14; i++) {
      const px = BLEED_LEFT + rand() * 1840;
      const py = rand() * 1000;
      const r = Math.max(0.5, 0.9 + rand() * 2.1);
      dc.fillStyle = rand() > 0.35
        ? `rgba(12, 10, 8, ${(0.28 * scratchVis).toFixed(3)})`
        : `rgba(242, 234, 210, ${(0.22 * scratchVis).toFixed(3)})`;
      dc.beginPath();
      dc.arc(px, py, r, 0, Math.PI * 2);
      dc.fill();
    }
    dc.restore();
  }

  // 3. Subtle 1922 silent-film projector brightness flicker (pure function of t)
  const flickerWave =
    0.036 * Math.sin(t * 29.3) +
    0.024 * Math.cos(t * 47.1) +
    0.016 * Math.sin(t * 11.7);
  const flickerStrength = flickerWave * (1 - elec * 0.8);
  if (Math.abs(flickerStrength) > 0.004) {
    dc.save();
    dc.fillStyle =
      flickerStrength > 0
        ? `rgba(244, 236, 212, ${clamp(flickerStrength, 0, 0.08).toFixed(3)})`
        : `rgba(8, 7, 5, ${clamp(-flickerStrength * 1.35, 0, 0.11).toFixed(3)})`;
    dc.fillRect(BLEED_LEFT, 0, BLEED_RIGHT - BLEED_LEFT, 1000);
    dc.restore();
  }

  // 4. Heavy German Expressionist silent-film iris vignette
  const portalEase = smoothstep(0.0, 0.65, u) * (1 - smoothstep(5.35, 5.95, u));
  const vigCenterX = lerp(500, 520, portalEase);
  const vigGrad = dc.createRadialGradient(
    vigCenterX,
    460,
    Math.max(0.5, 290),
    vigCenterX,
    475,
    Math.max(0.5, 920)
  );
  vigGrad.addColorStop(0.0, "rgba(0, 0, 0, 0)");
  vigGrad.addColorStop(0.56, "rgba(10, 9, 7, 0.14)");
  vigGrad.addColorStop(0.83, "rgba(8, 7, 5, 0.52)");
  vigGrad.addColorStop(1.0, "rgba(4, 5, 4, 0.84)");
  dc.fillStyle = vigGrad;
  dc.fillRect(BLEED_LEFT, 0, BLEED_RIGHT - BLEED_LEFT, 1000);
}

export default function render(ctx) {
  const { p, g, kit, t, localTime } = ctx;
  const u = localTime;

  const backdrop = kit.bakeLayer("s14_nosferatu_wall_v2", 1840, 1000, bakeNosferatuWall);
  const grainSheet = kit.bakeLayer("s14_film_grain_v2", 920, 500, bakeFilmGrainSheet);

  // 1. Baked 1922 sepia-silver stucco stairwell wall, gothic archways, and angular staircase shadows
  p.push();
  p.imageMode(p.CENTER);
  p.image(backdrop, 500, 500, 1840, 1000);
  p.pop();

  g.push();
  const dc = g.drawingContext;

  const px = getScenePelicanX(u);
  const st = getStairState(px);
  const elec = smoothstep(5.45, 5.98, u);

  // 2. The Giant Pure-Black Nosferatu Shadow (NO physical colored Pelican!)
  // Rendered through a reusable scratch canvas so hollowing out (alpha 0.95 -> 0.06) has zero joint seams.
  const pose = getRigPose(t, {
    x: px,
    y: st.rigY,
    scale: st.scale,
    wheelie: st.wheelie,
  });

  const scratchW = 600;
  const scratchH = 560;
  const anchorX = 260;
  const anchorY = 480;
  const { canvas: scCanvas, dc: scDc } = getRigScratch(scratchW, scratchH);

  scDc.save();
  scDc.translate(anchorX, anchorY);
  scDc.transform(1, 0, st.skewX, st.stretchY, 0, 0);
  scDc.translate(-px, -st.rigY);
  drawShadowRigGeometry(scDc, pose, st.shadowExag, "fill", {
    fillCol: "#070604",
    farCol: "#0e0c09",
    strokeCol: "#070604",
    elec,
  });
  scDc.restore();

  // Soft two-pass cast-shadow penumbra on textured plaster while climbing
  if (st.shadowExag > 0.02 && elec < 0.98) {
    const penVis = st.shadowExag * (1 - elec);
    dc.save();
    dc.globalAlpha = 0.09 * penVis;
    dc.drawImage(scCanvas, px - anchorX + 3.5 * st.shadowExag, st.rigY - anchorY + 2.2 * st.shadowExag);
    dc.globalAlpha = 0.06 * penVis;
    dc.drawImage(scCanvas, px - anchorX - 2.0 * st.shadowExag, st.rigY - anchorY - 1.5 * st.shadowExag);
    dc.restore();
  }

  // Solid black silhouette interior (smoothly hollows out to alpha = 0.06 as elec -> 1)
  const blackAlpha = lerp(0.95, 0.06, elec);
  dc.save();
  dc.globalAlpha = blackAlpha;
  dc.drawImage(scCanvas, px - anchorX, st.rigY - anchorY);
  dc.restore();

  // 3. Silent-Film Grain, Vertical Scratches, Flicker & Heavy Expressionist Vignette
  drawSilentFilmPost(dc, grainSheet, t, u, elec);

  // 4. Electrified 14 -> 15 Oscilloscope P1 Green Glow Outlines + Baseline + 2 Afterimages
  // Drawn AFTER vignette in "lighter" blend so brightness at t = 89.0 matches #15 100% seamlessly!
  if (elec > 0.005) {
    // Subtle dark cellar bridge & P1 emerald ambient glow behind the electrified Pelican
    dc.save();
    const glowR = Math.max(0.5, 300);
    const crtWash = dc.createRadialGradient(px, st.rigY - 120, Math.max(0.5, 20), px, st.rigY - 110, glowR);
    crtWash.addColorStop(0.0, `rgba(66, 255, 122, ${(0.18 * elec).toFixed(3)})`);
    crtWash.addColorStop(0.5, `rgba(18, 110, 48, ${(0.10 * elec).toFixed(3)})`);
    crtWash.addColorStop(1.0, "rgba(5, 11, 7, 0)");
    dc.globalCompositeOperation = "lighter";
    dc.fillStyle = crtWash;
    dc.fillRect(BLEED_LEFT, 0, BLEED_RIGHT - BLEED_LEFT, 1000);

    // Energize ROAD_Y = 730 baseline cleanly to match #15's exact 3-pass phosphor baseline at x = 1420
    const lineStart = 1100;
    const makeLineGrad = (a) => {
      const lg = dc.createLinearGradient(lineStart, ROAD_Y, BLEED_RIGHT, ROAD_Y);
      lg.addColorStop(0.0, "rgba(66, 255, 122, 0)");
      lg.addColorStop(0.55, `rgba(66, 255, 122, ${(a * elec).toFixed(3)})`);
      lg.addColorStop(1.0, `rgba(66, 255, 122, ${(a * elec).toFixed(3)})`);
      return lg;
    };
    const coreGrad = dc.createLinearGradient(lineStart, ROAD_Y, BLEED_RIGHT, ROAD_Y);
    coreGrad.addColorStop(0.0, "rgba(200, 255, 216, 0)");
    coreGrad.addColorStop(0.55, `rgba(200, 255, 216, ${(0.98 * elec).toFixed(3)})`);
    coreGrad.addColorStop(1.0, `rgba(200, 255, 216, ${(0.98 * elec).toFixed(3)})`);

    dc.lineCap = "round";
    dc.beginPath();
    dc.moveTo(lineStart, ROAD_Y);
    dc.lineTo(BLEED_RIGHT + 10, ROAD_Y);

    dc.strokeStyle = makeLineGrad(0.18);
    dc.lineWidth = 10;
    dc.stroke();

    dc.strokeStyle = makeLineGrad(0.58);
    dc.lineWidth = 3.8;
    dc.stroke();

    dc.strokeStyle = coreGrad;
    dc.lineWidth = 1.5;
    dc.stroke();

    // 2 faint P1 phosphor persistence trails
    const ghostSpecs = [
      [-0.072, 0.16],
      [-0.034, 0.34],
    ];
    for (const [dt, ghostAlpha] of ghostSpecs) {
      const gu = u + dt;
      const gx = BLEED_LEFT + CROSS_SPEED * gu;
      const gst = getStairState(gx);
      const gPose = getRigPose(t + dt, {
        x: gx,
        y: gst.rigY,
        scale: gst.scale,
        wheelie: gst.wheelie,
      });
      dc.save();
      dc.translate(gx, gst.rigY);
      dc.transform(1, 0, gst.skewX, gst.stretchY, 0, 0);
      dc.translate(-gx, -gst.rigY);

      dc.globalAlpha = ghostAlpha * 0.42 * elec;
      drawShadowRigGeometry(dc, gPose, gst.shadowExag, "stroke", {
        strokeCol: "#42ff7a",
        lineW: 8.5,
        frameW: 8.5,
        limbW: 8.5,
        rimW: 8.5,
        spokeW: 4.5,
        elec,
      });

      dc.globalAlpha = ghostAlpha * 0.90 * elec;
      drawShadowRigGeometry(dc, gPose, gst.shadowExag, "stroke", {
        strokeCol: "#42ff7a",
        lineW: 2.4,
        frameW: 2.6,
        limbW: 2.6,
        rimW: 2.6,
        spokeW: 1.4,
        elec,
      });
      dc.restore();
    }

    // Subtle 60Hz CRT beam scan jitter tapering cleanly at x = 1420 portal boundary
    const scanJitX = 0.42 * Math.sin(t * 377.0) * elec * (1 - smoothstep(5.94, 6.0, u));
    const scanJitY = 0.42 * Math.cos(t * 377.0 + 1.1) * elec * (1 - smoothstep(5.94, 6.0, u));

    dc.save();
    dc.translate(scanJitX, scanJitY);

    // Pass A: Wide P1 Green Outer Bloom (#42ff7a) matching s15
    dc.globalAlpha = 0.18 * elec;
    drawShadowRigGeometry(dc, pose, 0, "stroke", {
      strokeCol: "#42ff7a",
      lineW: 13.5,
      frameW: 13.5,
      limbW: 13.5,
      rimW: 13.5,
      spokeW: 7.5,
      elec,
    });

    // Pass B: Mid P1 Green Glow (#42ff7a) matching s15
    dc.globalAlpha = 0.60 * elec;
    drawShadowRigGeometry(dc, pose, 0, "stroke", {
      strokeCol: "#42ff7a",
      lineW: 5.2,
      frameW: 5.2,
      limbW: 5.2,
      rimW: 5.2,
      spokeW: 2.8,
      elec,
    });

    // Pass C: Crisp Electron-Beam Phosphor Core (#c8ffd8) matching s15
    dc.globalAlpha = 0.98 * elec;
    drawShadowRigGeometry(dc, pose, 0, "stroke", {
      strokeCol: "#c8ffd8",
      lineW: 2.0,
      frameW: 2.0,
      limbW: 2.0,
      rimW: 2.0,
      spokeW: 1.2,
      elec,
    });
    dc.restore();
    dc.restore();

    // Jumping cyan-green electric arc sparks
    drawElectricArcs(dc, pose, t, elec);
  }

  // 5. Brief 1922 Silent-Film Geometric Ornamental Corner Filigree
  drawSilentFilmBorderAccent(dc, u);

  // 6. Silent-Film Silver-Gelatin Title Card
  drawEraTitleCard(g, META, u);

  g.pop();
}
