/**
 * Scene #10 — 爪哇皮影戏 · Wayang Kulit (c. 1800), t in [59.0, 65.0).
 * Authentic Indonesian Javanese leather shadow theater:
 *  - Tightly stretched woven cotton Kelir screen backlit by a flickering Garuda-winged
 *    Blencong oil lamp producing a warm amber-gold halo, soft diagonal light rays, and
 *    smoked-sienna vignette;
 *  - Symmetrical flanking Gunungan (Kayon) Tree-of-Life shadow puppets planted into
 *    the horizontal Debog banana-trunk stage log whose upper edge aligns with ROAD_Y = 730;
 *  - Perforated buffalo-hide Wayang Pelican + Bicycle with genuine alpha-punched tatahan
 *    filigree cutouts, brass hinge rivets, 4 non-tangling buffalo-horn Cempurit control rods
 *    rising past the Debog from the Dalang's graceful shadow hands below;
 *  - Crisp 10 Hz retro temporal quantization (`quantizeTime(t, 10)`) in the interior,
 *    smoothly blending back to continuous `getScenePelicanX(u)` near both portals
 *    so #09 -> #10 and #10 -> #11 wheel crossings align to the sub-pixel.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  ROAD_Y,
  getScenePelicanX,
  lerp,
  quantizeTime,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[9];

// Reusable stateless scratch canvas for the flexing S-curve neck cutouts
let neckScratchCanvas = null;

function getNeckScratch(w, h) {
  if (!neckScratchCanvas) {
    neckScratchCanvas = document.createElement("canvas");
    neckScratchCanvas.width = w;
    neckScratchCanvas.height = h;
  }
  const ctx = neckScratchCanvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  return { canvas: neckScratchCanvas, ctx };
}

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Helper to draw a gleaming brass Wayang Kulit joint rivet.
 */
function drawBrassRivet(dc, x, y, r = 3.6) {
  dc.save();
  dc.beginPath();
  dc.arc(x, y, r + 1.1, 0, Math.PI * 2);
  dc.fillStyle = "#100703";
  dc.fill();

  const grad = dc.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.4, x, y, r);
  grad.addColorStop(0, "#fff2b6");
  grad.addColorStop(0.55, "#e2a43a");
  grad.addColorStop(1, "#6b3d0f");
  dc.beginPath();
  dc.arc(x, y, r, 0, Math.PI * 2);
  dc.fillStyle = grad;
  dc.fill();

  dc.beginPath();
  dc.arc(x, y, Math.max(0.9, r * 0.28), 0, Math.PI * 2);
  dc.fillStyle = "#2d1605";
  dc.fill();
  dc.restore();
}

/**
 * Helpers to punch crisp tatahan cutouts via destination-out.
 */
function punchDot(dc, x, y, r) {
  dc.beginPath();
  dc.arc(x, y, r, 0, Math.PI * 2);
  dc.fill();
}

function punchTeardrop(dc, x, y, len, wid, angle) {
  dc.save();
  dc.translate(x, y);
  dc.rotate(angle);
  dc.beginPath();
  dc.moveTo(len * 0.55, 0);
  dc.quadraticCurveTo(0, wid * 0.7, -len * 0.48, 0);
  dc.quadraticCurveTo(0, -wid * 0.7, len * 0.55, 0);
  dc.closePath();
  dc.fill();
  dc.restore();
}

function punchDiamond(dc, x, y, rx, ry, angle = 0) {
  dc.save();
  dc.translate(x, y);
  dc.rotate(angle);
  dc.beginPath();
  dc.moveTo(0, -ry);
  dc.lineTo(rx, 0);
  dc.lineTo(0, ry);
  dc.lineTo(-rx, 0);
  dc.closePath();
  dc.fill();
  dc.restore();
}

function punchCurvedSlit(dc, x0, y0, cx, cy, x1, y1, width) {
  dc.save();
  dc.lineCap = "round";
  dc.lineWidth = width;
  dc.beginPath();
  dc.moveTo(x0, y0);
  dc.quadraticCurveTo(cx, cy, x1, y1);
  dc.stroke();
  dc.restore();
}

/**
 * 1. Pre-bakes the stretched cotton Kelir screen backlit by the Blencong oil lamp (1840 x 1000).
 */
function bakeKelirBackdrop(pg) {
  const w = 1840;
  const h = 1000;
  const dc = pg.drawingContext;
  const rand = prng(101802);

  // Center of scene x=500 maps to buffer x=920
  const lampX = 920;
  const lampY = 310;

  dc.fillStyle = "#2b1307";
  dc.fillRect(0, 0, w, h);

  // Broad warm Blencong oil-lamp radial illumination across the woven cotton Kelir
  // Kept luminous across the flanking Gunungan wings so the dark Pelican still pops at portals!
  const mainGlow = dc.createRadialGradient(lampX, lampY, 40, lampX, lampY + 70, 1080);
  mainGlow.addColorStop(0.0, "#ffeca9");
  mainGlow.addColorStop(0.18, "#f7cc6f");
  mainGlow.addColorStop(0.42, "#e39f40");
  mainGlow.addColorStop(0.68, "#b76924");
  mainGlow.addColorStop(0.88, "#723613");
  mainGlow.addColorStop(1.0, "#3b1908");
  dc.fillStyle = mainGlow;
  dc.fillRect(0, 0, w, h);

  // Secondary warm stage wash illuminating ROAD_Y and both flanking Gunungan silhouettes
  const stageWash = dc.createRadialGradient(lampX, 530, 50, lampX, 520, 860);
  stageWash.addColorStop(0.0, "rgba(255, 236, 174, 0.36)");
  stageWash.addColorStop(0.62, "rgba(232, 162, 66, 0.2)");
  stageWash.addColorStop(1.0, "rgba(56, 24, 8, 0)");
  dc.fillStyle = stageWash;
  dc.fillRect(0, 0, w, h);

  // Subtle diagonal warm light-ray shafts fanning gently from the Blencong oil lamp
  dc.save();
  for (const [ang, spread, alpha] of [
    [-0.58, 0.16, 0.06],
    [-0.22, 0.14, 0.08],
    [0.04, 0.15, 0.09],
    [0.34, 0.14, 0.07],
    [0.64, 0.16, 0.055],
  ]) {
    const rayGrad = dc.createLinearGradient(lampX, 95, lampX + Math.sin(ang) * 760, 780);
    rayGrad.addColorStop(0, `rgba(255, 244, 198, ${alpha})`);
    rayGrad.addColorStop(0.7, `rgba(252, 206, 112, ${alpha * 0.45})`);
    rayGrad.addColorStop(1, "rgba(252, 206, 112, 0)");
    dc.fillStyle = rayGrad;
    dc.beginPath();
    dc.moveTo(lampX, 92);
    dc.lineTo(lampX + Math.sin(ang - spread) * 840, 92 + Math.cos(ang - spread) * 840);
    dc.lineTo(lampX + Math.sin(ang + spread) * 840, 92 + Math.cos(ang + spread) * 840);
    dc.closePath();
    dc.fill();
  }
  dc.restore();

  // Soft feathered organic smoke-patina & cotton cloud variations (no hard circular edges!)
  dc.save();
  for (let i = 0; i < 180; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 42 + rand() * 110;
    const dark = rand() > 0.45;
    const cloud = dc.createRadialGradient(x, y, 0, x, y, r);
    if (dark) {
      cloud.addColorStop(0, "rgba(74, 32, 10, 0.045)");
      cloud.addColorStop(1, "rgba(74, 32, 10, 0)");
    } else {
      cloud.addColorStop(0, "rgba(255, 232, 168, 0.04)");
      cloud.addColorStop(1, "rgba(255, 232, 168, 0)");
    }
    dc.fillStyle = cloud;
    dc.beginPath();
    dc.arc(x, y, r, 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();

  // Authentic woven raw-cotton warp & weft fabric cross-hatch grain
  dc.save();
  dc.strokeStyle = "rgba(84, 42, 14, 0.055)";
  dc.lineWidth = 1;
  dc.beginPath();
  for (let x = 0; x < w; x += 5) {
    dc.moveTo(x + 0.5, 0);
    dc.lineTo(x + 0.5, h);
  }
  for (let y = 0; y < h; y += 5) {
    dc.moveTo(0, y + 0.5);
    dc.lineTo(w, y + 0.5);
  }
  dc.stroke();

  // Subtle horizontal slub threads catching backlight
  dc.strokeStyle = "rgba(255, 242, 198, 0.045)";
  dc.beginPath();
  for (let y = 120; y < 740; y += 11) {
    dc.moveTo(140, y + 0.5);
    dc.lineTo(1700, y + 0.5);
  }
  dc.stroke();
  dc.restore();

  // Top soot shadow overhang & ornate Garuda-winged Blencong bronze oil-lamp silhouette (x = 920)
  const topShade = dc.createLinearGradient(0, 0, 0, 145);
  topShade.addColorStop(0, "rgba(22, 10, 4, 0.84)");
  topShade.addColorStop(0.55, "rgba(42, 19, 8, 0.3)");
  topShade.addColorStop(1, "rgba(42, 19, 8, 0)");
  dc.fillStyle = topShade;
  dc.fillRect(0, 0, w, 145);

  dc.save();
  dc.translate(lampX, 0);
  // Hanging chain links
  dc.strokeStyle = "rgba(24, 11, 5, 0.82)";
  dc.lineWidth = 3.2;
  dc.beginPath();
  dc.moveTo(0, 0);
  dc.lineTo(0, 38);
  dc.stroke();
  dc.fillStyle = "rgba(26, 12, 5, 0.78)";
  dc.beginPath();
  dc.arc(0, 38, 6.5, 0, Math.PI * 2);
  dc.fill();

  // Traditional Garuda-winged bronze Blencong canopy & stepped oil dish silhouette
  dc.fillStyle = "rgba(26, 11, 4, 0.68)";
  dc.beginPath();
  dc.moveTo(0, 36);
  // Right Garuda wing sweeping up & out
  dc.bezierCurveTo(18, 34, 44, 24, 62, 34);
  dc.quadraticCurveTo(54, 48, 38, 56);
  dc.quadraticCurveTo(46, 62, 30, 68);
  // Oil reservoir bowl & projecting lamp spout
  dc.quadraticCurveTo(18, 76, 12, 92);
  dc.lineTo(0, 99);
  dc.lineTo(-12, 92);
  dc.quadraticCurveTo(-18, 76, -30, 68);
  // Left Garuda wing mirrored
  dc.quadraticCurveTo(-46, 62, -38, 56);
  dc.quadraticCurveTo(-54, 48, -62, 34);
  dc.bezierCurveTo(-44, 24, -18, 34, 0, 36);
  dc.closePath();
  dc.fill();

  // Warm ambient lamp aura around spout
  const flameGlow = dc.createRadialGradient(0, 102, 4, 0, 104, 88);
  flameGlow.addColorStop(0, "rgba(255, 246, 198, 0.72)");
  flameGlow.addColorStop(0.45, "rgba(248, 192, 84, 0.26)");
  flameGlow.addColorStop(1, "rgba(248, 192, 84, 0)");
  dc.fillStyle = flameGlow;
  dc.beginPath();
  dc.arc(0, 104, 88, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // Warm toasted-sienna vignette at outer left/right edges (not pitch black, preserving contrast!)
  const leftVig = dc.createLinearGradient(0, 0, 300, 0);
  leftVig.addColorStop(0, "rgba(32, 14, 5, 0.45)");
  leftVig.addColorStop(1, "rgba(32, 14, 5, 0)");
  dc.fillStyle = leftVig;
  dc.fillRect(0, 0, 300, h);

  const rightVig = dc.createLinearGradient(w, 0, w - 300, 0);
  rightVig.addColorStop(0, "rgba(32, 14, 5, 0.45)");
  rightVig.addColorStop(1, "rgba(32, 14, 5, 0)");
  dc.fillStyle = rightVig;
  dc.fillRect(w - 300, 0, 300, h);
}

/**
 * 2. Pre-bakes a highly ornate Javanese Gunungan (Kayon / Sacred Tree of Life) shadow puppet.
 * Warm mid-ground toasted-umber tone with rich lacy cutouts so the darker foreground Pelican
 * always reads cleanly even when passing directly in front of the Gunungan.
 * Size: 260 x 540. Base aligns at local y = 490 (world ROAD_Y = 730).
 */
function bakeGunungan(pg) {
  const w = 260;
  const h = 540;
  const cx = w / 2; // 130
  const baseY = 490;
  const dc = pg.drawingContext;

  pg.clear();
  dc.save();

  // Outer serrated cosmic mountain-leaf silhouette (Mount Meru / Sacred Flame)
  dc.beginPath();
  dc.moveTo(cx, 16);
  dc.bezierCurveTo(cx + 15, 52, cx + 30, 88, cx + 42, 128);
  dc.quadraticCurveTo(cx + 58, 142, cx + 50, 166);
  dc.quadraticCurveTo(cx + 80, 192, cx + 70, 224);
  dc.quadraticCurveTo(cx + 102, 256, cx + 90, 294);
  dc.quadraticCurveTo(cx + 116, 330, cx + 104, 372);
  dc.quadraticCurveTo(cx + 120, 412, cx + 102, 450);
  dc.quadraticCurveTo(cx + 110, 472, cx + 98, baseY);
  dc.lineTo(cx - 98, baseY);
  dc.quadraticCurveTo(cx - 110, 472, cx - 102, 450);
  dc.quadraticCurveTo(cx - 120, 412, cx - 104, 372);
  dc.quadraticCurveTo(cx - 116, 330, cx - 90, 294);
  dc.quadraticCurveTo(cx - 102, 256, cx - 70, 224);
  dc.quadraticCurveTo(cx - 80, 192, cx - 50, 166);
  dc.quadraticCurveTo(cx - 58, 142, cx - 42, 128);
  dc.bezierCurveTo(cx - 30, 88, cx - 15, 52, cx, 16);
  dc.closePath();

  // Warmer translucent mid-ground umber (#4b240d -> #371807) for clean depth behind foreground Pelican
  const bodyGrad = dc.createLinearGradient(0, 18, 0, baseY);
  bodyGrad.addColorStop(0, "#47220c");
  bodyGrad.addColorStop(0.55, "#54290f");
  bodyGrad.addColorStop(1, "#3b1b08");
  dc.fillStyle = bodyGrad;
  dc.fill();

  dc.strokeStyle = "rgba(222, 144, 54, 0.34)";
  dc.lineWidth = 2.0;
  dc.stroke();

  // === GENUINE ALPHA-PUNCHED TATAHAN LACEWORK ===
  dc.globalCompositeOperation = "destination-out";
  dc.fillStyle = "#000000";
  dc.strokeStyle = "#000000";

  // A. Perimeter flame-dot border
  const rimDots = [
    [0, 42, 2.5],
    [9, 64, 2.6],
    [18, 90, 2.8],
    [28, 114, 2.9],
    [39, 144, 3.1],
    [50, 176, 3.3],
    [62, 208, 3.5],
    [72, 240, 3.6],
    [82, 274, 3.6],
    [91, 310, 3.6],
    [97, 346, 3.6],
    [100, 382, 3.6],
    [97, 418, 3.5],
    [92, 452, 3.3],
  ];
  for (const [dx, y, r] of rimDots) {
    punchDot(dc, cx + dx, y, r);
    if (dx > 0) punchDot(dc, cx - dx, y, r);
  }

  // B. Sacred Temple Portal (Gapura) & Winged Roof Eaves (y = 350..484)
  for (const side of [-1, 1]) {
    const px = cx + side * 26;
    dc.beginPath();
    dc.moveTo(px - 12, 478);
    dc.lineTo(px - 12, 422);
    dc.quadraticCurveTo(px, 396, px + 12, 422);
    dc.lineTo(px + 12, 478);
    dc.closePath();
    dc.fill();

    // Ornate temple side niches & guardian lotus tendrils
    punchTeardrop(dc, cx + side * 62, 454, 28, 12.5, side * -0.4);
    punchTeardrop(dc, cx + side * 74, 424, 22, 10, side * -0.58);
    punchTeardrop(dc, cx + side * 50, 418, 15, 7, side * -0.2);
    punchDot(dc, cx + side * 80, 470, 4.0);
    punchDot(dc, cx + side * 52, 472, 3.2);
  }

  for (let tier = 0; tier < 3; tier++) {
    const ty = 398 - tier * 14;
    const tw = 36 - tier * 8;
    punchCurvedSlit(dc, cx - tw, ty, cx, ty - 6, cx + tw, ty, 4.0);
  }
  punchDiamond(dc, cx, 354, 10, 14, 0);

  // C. Central Kala Guardian Mask & Sun Medallion (y = 284..338)
  for (const side of [-1, 1]) {
    punchTeardrop(dc, cx + side * 17, 312, 18, 9.5, side * -0.25);
    punchDot(dc, cx + side * 34, 304, 4.2);
    punchCurvedSlit(dc, cx + side * 10, 326, cx + side * 30, 338, cx + side * 48, 322, 3.8);
    // Flanking lotus wings of Kala
    punchTeardrop(dc, cx + side * 64, 366, 26, 10, side * -0.75);
    punchDot(dc, cx + side * 80, 344, 3.8);
  }
  punchDiamond(dc, cx, 292, 7.5, 10, 0);
  punchDiamond(dc, cx, 328, 13, 6.0, 0);

  // D. Lush Symmetrical Kalpataru Tree of Life Branches & Sulur Tendrils (y = 70..280)
  const branchPairs = [
    [262, 72, 24, 5.2],
    [224, 62, 21, 4.8],
    [186, 50, 19, 4.5],
    [148, 36, 16, 4.0],
    [110, 24, 13, 3.5],
  ];
  for (const [by, bx, lift, dr] of branchPairs) {
    for (const side of [-1, 1]) {
      punchCurvedSlit(
        dc,
        cx + side * 8,
        by + 8,
        cx + side * (bx * 0.55),
        by - lift,
        cx + side * bx,
        by - 4,
        4.6
      );
      punchCurvedSlit(
        dc,
        cx + side * (bx * 0.38),
        by + 12,
        cx + side * (bx * 0.74),
        by + 22,
        cx + side * (bx * 0.88),
        by + 6,
        3.4
      );
      punchDot(dc, cx + side * bx, by - 4, dr);
      punchTeardrop(dc, cx + side * (bx * 0.65), by - lift * 0.42, 16, 7.2, side * -0.5);
    }
    punchDiamond(dc, cx, by - 6, 4.8, 8.2, 0);
  }

  for (const side of [-1, 1]) {
    punchTeardrop(dc, cx + side * 50, 276, 24, 10.5, side * 0.35);
    punchDot(dc, cx + side * 35, 266, 3.6);
  }
  punchTeardrop(dc, cx, 78, 20, 7.5, Math.PI / 2);
  punchDot(dc, cx, 52, 3.5);

  dc.globalCompositeOperation = "source-over";

  // Vertical buffalo-horn Gapit spine handle stabbing into Debog
  const gapitGrad = dc.createLinearGradient(cx - 5, 0, cx + 5, 0);
  gapitGrad.addColorStop(0, "#241005");
  gapitGrad.addColorStop(0.5, "#7b461a");
  gapitGrad.addColorStop(1, "#241005");
  dc.fillStyle = gapitGrad;
  dc.beginPath();
  dc.moveTo(cx - 2.2, 66);
  dc.lineTo(cx + 2.2, 66);
  dc.lineTo(cx + 5.2, baseY + 42);
  dc.lineTo(cx, baseY + 48);
  dc.lineTo(cx - 5.2, baseY + 42);
  dc.closePath();
  dc.fill();

  drawBrassRivet(dc, cx, 195, 2.8);
  drawBrassRivet(dc, cx, 368, 3.1);
  drawBrassRivet(dc, cx, 480, 3.4);

  dc.restore();
}

/**
 * 3. Pre-bakes the horizontal Debog banana-trunk stage log (y = 730..782) & backlit lower theater apron.
 * Top of Debog log aligns strictly with local y = 10 -> world ROAD_Y = 730.
 */
function bakeDebogStage(pg) {
  const w = 1840;
  const h = 280;
  const debogTop = 10;
  const debogBot = 62;
  const dc = pg.drawingContext;
  const rand = prng(10730);

  pg.clear();

  // Warm backlit lower stage apron below the Debog (y = 782..1000)
  const apronGrad = dc.createLinearGradient(0, debogBot, 0, h);
  apronGrad.addColorStop(0.0, "#46220c");
  apronGrad.addColorStop(0.2, "#733b17");
  apronGrad.addColorStop(0.6, "#4d250d");
  apronGrad.addColorStop(1.0, "#1d0c04");
  dc.fillStyle = apronGrad;
  dc.fillRect(0, debogBot, w, h - debogBot);

  const lowerGlow = dc.createRadialGradient(920, 150, 24, 920, 150, 820);
  lowerGlow.addColorStop(0, "rgba(248, 184, 78, 0.4)");
  lowerGlow.addColorStop(0.55, "rgba(196, 110, 36, 0.18)");
  lowerGlow.addColorStop(1, "rgba(24, 10, 4, 0)");
  dc.fillStyle = lowerGlow;
  dc.fillRect(0, debogBot, w, h - debogBot);

  const botVig = dc.createLinearGradient(0, h - 42, 0, h);
  botVig.addColorStop(0, "rgba(14, 6, 2, 0)");
  botVig.addColorStop(1, "rgba(14, 6, 2, 0.62)");
  dc.fillStyle = botVig;
  dc.fillRect(0, h - 42, w, 42);

  // Cast shadow beneath Debog onto lower apron
  const underShadow = dc.createLinearGradient(0, debogBot, 0, debogBot + 16);
  underShadow.addColorStop(0, "rgba(10, 4, 1, 0.68)");
  underShadow.addColorStop(1, "rgba(10, 4, 1, 0)");
  dc.fillStyle = underShadow;
  dc.fillRect(0, debogBot, w, 16);

  // Cylindrical Debog banana-trunk shading
  const logGrad = dc.createLinearGradient(0, debogTop, 0, debogBot);
  logGrad.addColorStop(0.0, "#834c20");
  logGrad.addColorStop(0.14, "#542d12");
  logGrad.addColorStop(0.52, "#351a09");
  logGrad.addColorStop(0.88, "#1e0d05");
  logGrad.addColorStop(1.0, "#140903");
  dc.fillStyle = logGrad;
  dc.fillRect(0, debogTop, w, debogBot - debogTop);

  // Warm Blencong rim light along top edge of Debog (ROAD_Y = 730)
  const rimGrad = dc.createRadialGradient(920, debogTop, 40, 920, debogTop, 920);
  rimGrad.addColorStop(0, "rgba(255, 214, 118, 0.78)");
  rimGrad.addColorStop(0.65, "rgba(220, 140, 52, 0.4)");
  rimGrad.addColorStop(1, "rgba(130, 68, 22, 0.18)");
  dc.fillStyle = rimGrad;
  dc.fillRect(0, debogTop, w, 4.5);

  dc.fillStyle = "rgba(18, 9, 4, 0.72)";
  dc.fillRect(0, debogTop, w, 1.8);

  // Longitudinal banana-sheath ridges
  dc.save();
  for (let i = 0; i < 22; i++) {
    const fy = debogTop + 7 + (i / 22) * (debogBot - debogTop - 12);
    dc.strokeStyle = i % 2 === 0 ? "rgba(186, 120, 56, 0.18)" : "rgba(14, 6, 2, 0.36)";
    dc.lineWidth = 1.2 + rand() * 1.4;
    dc.beginPath();
    dc.moveTo(0, fy);
    for (let x = 80; x <= w; x += 80) {
      dc.lineTo(x, fy + Math.sin(x * 0.008 + i) * 2.1 + (rand() - 0.5) * 1.4);
    }
    dc.stroke();
  }
  dc.restore();

  // Rattan lashings along Debog
  for (let bx = 90; bx < w; bx += 276) {
    dc.save();
    dc.fillStyle = "rgba(14, 6, 2, 0.65)";
    dc.fillRect(bx - 6, debogTop, 12, debogBot - debogTop + 2);
    for (let k = -1; k <= 1; k++) {
      dc.strokeStyle = "#945a26";
      dc.lineWidth = 2.2;
      dc.beginPath();
      dc.moveTo(bx + k * 3.5, debogTop - 0.5);
      dc.quadraticCurveTo(bx + k * 3.5 + 3, (debogTop + debogBot) * 0.5, bx + k * 3.5, debogBot + 1);
      dc.stroke();
    }
    dc.restore();
  }
}

/**
 * 4. Pre-bakes a perforated buffalo-hide Wayang bicycle wheel (144 x 144, radius = 62).
 */
function bakeWayangWheel(pg) {
  const size = 144;
  const c = size / 2; // 72
  const R = 62;
  const dc = pg.drawingContext;

  pg.clear();
  dc.save();

  // Crisp deep ebony outer tire ring
  dc.fillStyle = "#0b0502";
  dc.beginPath();
  dc.arc(c, c, R, 0, Math.PI * 2);
  dc.arc(c, c, R - 9.0, 0, Math.PI * 2, true);
  dc.fill();

  // 6 sculpted S-curved Wayang spokes
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    dc.save();
    dc.translate(c, c);
    dc.rotate(a);
    dc.fillStyle = "#0c0602";
    dc.beginPath();
    dc.moveTo(10, -4.6);
    dc.bezierCurveTo(24, -9.2, 38, 3.8, R - 7, -3.8);
    dc.lineTo(R - 7, 3.8);
    dc.bezierCurveTo(38, 11.2, 24, -1.8, 10, 4.6);
    dc.closePath();
    dc.fill();

    if (i === 0) {
      dc.beginPath();
      dc.ellipse(34, 1, 11, 8.2, 0.1, 0, Math.PI * 2);
      dc.fill();
    }
    dc.restore();
  }

  // Carved lotus hub medallion
  dc.fillStyle = "#0b0502";
  dc.beginPath();
  dc.arc(c, c, 16, 0, Math.PI * 2);
  dc.fill();

  // Warm backlit golden rim contour highlight (separates wheel cleanly over dark Gunungan!)
  dc.strokeStyle = "rgba(232, 154, 56, 0.44)";
  dc.lineWidth = 1.5;
  dc.beginPath();
  dc.arc(c, c, R - 0.8, 0, Math.PI * 2);
  dc.stroke();

  // Alpha-punched tatahan cutouts
  dc.globalCompositeOperation = "destination-out";
  dc.fillStyle = "#000000";

  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    punchDot(dc, c + Math.cos(a) * (R - 4.5), c + Math.sin(a) * (R - 4.5), 1.75);
  }

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    dc.save();
    dc.translate(c, c);
    dc.rotate(a);
    if (i === 0) {
      punchDiamond(dc, 34, 1, 5.8, 4.0, 0.1);
      punchDot(dc, 21.5, 0, 2.0);
      punchDot(dc, 46.5, 0, 2.0);
    } else {
      punchDot(dc, 24, -1.3, 1.9);
      punchDot(dc, 37, 2.1, 2.1);
      punchDot(dc, 48, 0.4, 1.7);
    }
    dc.restore();
  }

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + Math.PI / 6;
    punchDot(dc, c + Math.cos(a) * 10.8, c + Math.sin(a) * 10.8, 2.1);
  }

  dc.globalCompositeOperation = "source-over";
  drawBrassRivet(dc, c, c, 4.5);
  dc.restore();
}

/**
 * 5. Pre-bakes the sculpted buffalo-hide Wayang bicycle frame, gussets, chain-guard & saddle (260 x 210).
 * Local origin (px, ROAD_Y) maps to (120, 195).
 */
function bakeWayangBikeFrame(pg) {
  const ox = 120;
  const oy = 195;
  const dc = pg.drawingContext;

  const pt = (lx, ly) => [ox + lx, oy + ly];
  const rearHub = pt(-86, -62);
  const frontHub = pt(86, -62);
  const bb = pt(-16, -58);
  const seatCluster = pt(-45, -126);
  const headTop = pt(52, -142);
  const headBot = pt(60, -116);
  const stemTop = pt(48, -158);
  const barGrip = pt(26, -156);
  const bellPos = pt(40, -164);
  const saddleRear = pt(-64, -136);
  const saddleFront = pt(-30, -134);

  pg.clear();
  dc.save();

  const drawStrut = (a, b, w0, w1) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    dc.beginPath();
    dc.moveTo(a[0] + nx * w0 * 0.5, a[1] + ny * w0 * 0.5);
    dc.lineTo(b[0] + nx * w1 * 0.5, b[1] + ny * w1 * 0.5);
    dc.lineTo(b[0] - nx * w1 * 0.5, b[1] - ny * w1 * 0.5);
    dc.lineTo(a[0] - nx * w0 * 0.5, a[1] - ny * w0 * 0.5);
    dc.closePath();
    dc.fill();
  };

  dc.fillStyle = "#0b0502";
  drawStrut(rearHub, bb, 6.2, 8.2);
  drawStrut(rearHub, seatCluster, 5.4, 7.6);
  drawStrut(bb, seatCluster, 7.4, 7.4);
  drawStrut(seatCluster, headTop, 7.6, 8.0);
  drawStrut(bb, headBot, 8.4, 7.4);
  drawStrut(headTop, headBot, 8.2, 8.2);
  drawStrut(frontHub, headBot, 5.6, 7.8);
  drawStrut(headTop, stemTop, 6.4, 5.8);
  drawStrut(stemTop, barGrip, 5.8, 4.8);

  // Carved Wayang scrollwork chain-guard along chainstay (rearHub -> bb)
  dc.beginPath();
  dc.moveTo(rearHub[0] + 6, rearHub[1] - 7);
  dc.quadraticCurveTo((rearHub[0] + bb[0]) * 0.5, bb[1] - 12, bb[0] - 4, bb[1] - 10);
  dc.lineTo(bb[0] - 4, bb[1] + 5);
  dc.quadraticCurveTo((rearHub[0] + bb[0]) * 0.5, bb[1] + 7, rearHub[0] + 6, rearHub[1] + 3);
  dc.closePath();
  dc.fill();

  // Ornate Javanese filigree gussets at seat cluster & head tube
  dc.beginPath();
  dc.moveTo(seatCluster[0] - 10, seatCluster[1] + 24);
  dc.quadraticCurveTo(seatCluster[0] + 12, seatCluster[1] + 8, seatCluster[0] + 30, seatCluster[1] - 4);
  dc.lineTo(seatCluster[0] + 2, seatCluster[1] - 3);
  dc.closePath();
  dc.fill();

  dc.beginPath();
  dc.moveTo(headTop[0] - 28, headTop[1] + 4);
  dc.quadraticCurveTo(headTop[0] - 9, headTop[1] + 18, headBot[0] - 20, headBot[1] + 16);
  dc.lineTo(headBot[0] + 2, headBot[1] - 2);
  dc.lineTo(headTop[0] + 2, headTop[1] + 2);
  dc.closePath();
  dc.fill();

  // Seatpost + Javanese upturned saddle
  drawStrut(seatCluster, [ox - 47, oy - 133], 5.8, 5.4);
  dc.beginPath();
  dc.moveTo(saddleRear[0] - 6, saddleRear[1] - 6);
  dc.quadraticCurveTo(ox - 48, oy - 132, saddleFront[0] + 3, saddleFront[1] - 2);
  dc.quadraticCurveTo(ox - 44, oy - 127, saddleRear[0], saddleRear[1] + 3);
  dc.closePath();
  dc.fill();

  // Carved Lotus Chainring
  dc.beginPath();
  dc.arc(bb[0], bb[1], 15.5, 0, Math.PI * 2);
  dc.fill();

  // Warm rim highlight along upper tubes
  dc.strokeStyle = "rgba(232, 154, 56, 0.36)";
  dc.lineWidth = 1.2;
  dc.beginPath();
  dc.moveTo(seatCluster[0], seatCluster[1] - 3.6);
  dc.lineTo(headTop[0], headTop[1] - 3.6);
  dc.stroke();

  // Punch crisp alpha cutouts in chainring, chain-guard & frame gussets
  dc.globalCompositeOperation = "destination-out";
  dc.fillStyle = "#000000";
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    punchDot(dc, bb[0] + Math.cos(a) * 9.2, bb[1] + Math.sin(a) * 9.2, 2.5);
  }
  for (const s of [0.28, 0.5, 0.72]) {
    punchDot(dc, lerp(rearHub[0], bb[0], s), lerp(rearHub[1], bb[1], s) - 2, 2.0);
  }
  punchDot(dc, headTop[0] - 11, headTop[1] + 12, 2.8);
  punchDot(dc, headTop[0] - 20, headTop[1] + 8, 2.0);
  punchDot(dc, seatCluster[0] + 6, seatCluster[1] + 9, 2.7);
  punchDot(dc, ox - 48, oy - 134, 1.9);
  punchDot(dc, ox - 56, oy - 136, 1.6);

  dc.globalCompositeOperation = "source-over";

  drawBrassRivet(dc, bellPos[0], bellPos[1], 4.2);
  drawBrassRivet(dc, bb[0], bb[1], 3.9);
  drawBrassRivet(dc, seatCluster[0], seatCluster[1], 3.4);
  drawBrassRivet(dc, headTop[0], headTop[1], 3.4);
  drawBrassRivet(dc, headBot[0], headBot[1], 3.0);

  dc.restore();
}

/**
 * 6. Pre-bakes the sculpted buffalo-hide Wayang Pelican torso + ornate 3-plume tail fan (190 x 150).
 * Anchor: pose.bodyCenter maps to (102, 76).
 */
function bakeWayangTorso(pg) {
  const cx = 102;
  const cy = 76;
  const dc = pg.drawingContext;

  pg.clear();
  dc.save();

  // Plump torso sweeping backward into 3 curling Javanese tail plumes
  dc.beginPath();
  dc.moveTo(cx - 54, cy + 7);
  dc.bezierCurveTo(cx - 72, cy - 12, cx - 86, cy - 14, cx - 84, cy - 26);
  dc.quadraticCurveTo(cx - 64, cy - 20, cx - 44, cy - 22);
  dc.bezierCurveTo(cx - 26, cy - 35, cx + 12, cy - 36, cx + 34, cy - 12);
  dc.bezierCurveTo(cx + 42, cy + 18, cx + 22, cy + 44, cx - 6, cy + 38);
  dc.bezierCurveTo(cx - 38, cy + 34, cx - 68, cy + 32, cx - 80, cy + 25);
  dc.quadraticCurveTo(cx - 64, cy + 16, cx - 82, cy + 2);
  dc.quadraticCurveTo(cx - 62, cy + 3, cx - 54, cy + 7);
  dc.closePath();

  dc.fillStyle = "#0b0502";
  dc.fill();

  dc.strokeStyle = "rgba(232, 154, 56, 0.45)";
  dc.lineWidth = 1.6;
  dc.stroke();

  dc.globalCompositeOperation = "destination-out";
  dc.fillStyle = "#000000";
  dc.strokeStyle = "#000000";

  // Central floral medallion (ceplok) on belly
  punchDot(dc, cx + 4, cy + 6, 4.6);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    punchTeardrop(dc, cx + 4 + Math.cos(a) * 12.5, cy + 6 + Math.sin(a) * 12.5, 9.0, 4.6, a);
  }

  punchCurvedSlit(dc, cx - 22, cy - 12, cx - 4, cy - 22, cx + 16, cy - 14, 3.2);
  punchCurvedSlit(dc, cx - 18, cy + 22, cx + 4, cy + 28, cx + 24, cy + 16, 3.0);

  for (const [dx, dy, r] of [
    [26, -2, 2.2],
    [29, 8, 2.3],
    [24, 18, 2.2],
    [16, 26, 2.0],
    [-22, 4, 2.4],
    [-32, 10, 2.3],
  ]) {
    punchDot(dc, cx + dx, cy + dy, r);
  }

  // Tail-feather filigree slits
  punchTeardrop(dc, cx - 60, cy - 13, 19, 5.2, -2.7);
  punchTeardrop(dc, cx - 59, cy + 1, 19, 5.0, 3.08);
  punchTeardrop(dc, cx - 57, cy + 16, 18, 5.0, 2.74);
  punchDot(dc, cx - 44, cy - 4, 2.2);
  punchDot(dc, cx - 42, cy + 14, 2.2);

  dc.globalCompositeOperation = "source-over";
  dc.restore();
}

/**
 * 7. Pre-bakes the Wayang Pelican head + royal Javanese crest + perforated upper beak (210 x 130).
 * Anchor: pose.head maps to (58, 66).
 */
function bakeWayangHeadBeak(pg) {
  const hx = 58;
  const hy = 66;
  const dc = pg.drawingContext;

  pg.clear();
  dc.save();

  dc.beginPath();
  dc.moveTo(hx - 12, hy + 16);
  dc.quadraticCurveTo(hx - 24, hy + 2, hx - 22, hy - 14);
  dc.quadraticCurveTo(hx - 35, hy - 22, hx - 26, hy - 31);
  dc.quadraticCurveTo(hx - 16, hy - 29, hx - 12, hy - 18);
  dc.quadraticCurveTo(hx - 22, hy - 36, hx - 10, hy - 39);
  dc.quadraticCurveTo(hx - 2, hy - 31, hx + 2, hy - 17);
  dc.quadraticCurveTo(hx + 10, hy - 18, hx + 16, hy - 12);
  dc.lineTo(hx + 114, hy + 12);
  dc.lineTo(hx + 117, hy + 20);
  dc.lineTo(hx + 109, hy + 18);
  dc.lineTo(hx + 14, hy + 2);
  dc.lineTo(hx + 6, hy + 18);
  dc.closePath();

  dc.fillStyle = "#0b0502";
  dc.fill();

  dc.strokeStyle = "rgba(232, 154, 56, 0.44)";
  dc.lineWidth = 1.4;
  dc.stroke();

  dc.globalCompositeOperation = "destination-out";
  dc.fillStyle = "#000000";
  dc.strokeStyle = "#000000";

  // Almond-shaped glowing Wayang eye socket
  dc.save();
  dc.translate(hx + 6, hy - 6);
  dc.rotate(-0.18);
  dc.beginPath();
  dc.moveTo(-8.5, 0);
  dc.quadraticCurveTo(0, -6.5, 8.8, -1);
  dc.quadraticCurveTo(0, 5.8, -8.5, 0);
  dc.closePath();
  dc.fill();
  dc.restore();

  punchCurvedSlit(dc, hx - 12, hy + 4, hx - 14, hy - 10, hx - 4, hy - 14, 2.5);
  punchDot(dc, hx - 19, hy - 23, 2.2);
  punchDot(dc, hx - 11, hy - 31, 2.1);
  punchDot(dc, hx - 2, hy + 8, 2.2);

  for (let i = 0; i < 10; i++) {
    const s = (i + 0.6) / 11;
    const bx = lerp(hx + 20, hx + 102, s);
    const by = lerp(hy - 5, hy + 13, s);
    const r = lerp(2.3, 1.25, s);
    punchDot(dc, bx, by, r);
  }

  dc.globalCompositeOperation = "source-over";
  dc.fillStyle = "#0c0602";
  dc.beginPath();
  dc.arc(hx + 7.2, hy - 6.2, 2.4, 0, Math.PI * 2);
  dc.fill();

  dc.restore();
}

/**
 * 8. Pre-bakes the large hinged Pelican throat pouch carved with dense leaf-vine filigree (160 x 110).
 * Anchor: pose.pouchBase maps to (24, 26).
 */
function bakeWayangPouch(pg) {
  const bx = 24;
  const by = 26;
  const dc = pg.drawingContext;

  pg.clear();
  dc.save();

  dc.beginPath();
  dc.moveTo(bx, by);
  dc.bezierCurveTo(bx + 34, by + 46, bx + 84, by + 40, bx + 104, by - 2);
  dc.lineTo(bx + 8, by - 17);
  dc.closePath();

  dc.fillStyle = "#0e0603";
  dc.fill();

  dc.strokeStyle = "rgba(232, 154, 56, 0.45)";
  dc.lineWidth = 1.4;
  dc.stroke();

  dc.globalCompositeOperation = "destination-out";
  dc.fillStyle = "#000000";
  dc.strokeStyle = "#000000";

  punchCurvedSlit(dc, bx + 12, by + 2, bx + 48, by + 22, bx + 86, by + 2, 3.2);
  punchDiamond(dc, bx + 46, by + 11, 9.0, 6.5, -0.05);
  punchTeardrop(dc, bx + 28, by + 8, 13.5, 6.4, 0.35);
  punchTeardrop(dc, bx + 65, by + 10, 13.5, 6.2, -0.28);
  punchTeardrop(dc, bx + 82, by + 2, 11.5, 5.0, -0.45);

  for (const [dx, dy, r] of [
    [16, 12, 2.3],
    [27, 21, 2.6],
    [40, 27, 2.7],
    [54, 27, 2.7],
    [68, 23, 2.5],
    [80, 15, 2.2],
    [91, 6, 1.9],
    [35, -3, 2.3],
    [54, -2, 2.3],
    [71, -3, 2.1],
  ]) {
    punchDot(dc, bx + dx, by + dy, r);
  }

  dc.globalCompositeOperation = "source-over";
  drawBrassRivet(dc, bx + 3, by - 5, 3.0);
  drawBrassRivet(dc, bx + 48, by + 33, 2.7);

  dc.restore();
}

/**
 * 9. Pre-bakes bone-aligned carved leather wing & leg segments (canonical bone length = 60 or 62).
 */
function bakeWayangSegment(pg, kind) {
  const dc = pg.drawingContext;
  pg.clear();
  dc.save();

  if (kind === "upperWing") {
    dc.fillStyle = "#0e0603";
    dc.beginPath();
    dc.moveTo(12, 32);
    dc.quadraticCurveTo(28, 14, 52, 16);
    dc.quadraticCurveTo(70, 18, 84, 30);
    dc.quadraticCurveTo(72, 46, 48, 46);
    dc.quadraticCurveTo(24, 46, 12, 32);
    dc.closePath();
    dc.fill();
    dc.strokeStyle = "rgba(232, 154, 56, 0.42)";
    dc.lineWidth = 1.3;
    dc.stroke();

    dc.globalCompositeOperation = "destination-out";
    dc.fillStyle = "#000000";
    punchTeardrop(dc, 36, 30, 14.5, 6.5, 0.08);
    punchTeardrop(dc, 56, 31, 13.5, 5.8, -0.1);
    punchDot(dc, 24, 29, 2.1);
    punchDot(dc, 69, 31, 2.0);
  } else if (kind === "lowerWing") {
    // Smooth Javanese Garuda swept trailing flight feathers
    dc.fillStyle = "#0c0502";
    dc.beginPath();
    dc.moveTo(10, 32);
    dc.quadraticCurveTo(32, 19, 64, 25);
    dc.quadraticCurveTo(84, 29, 88, 34);
    dc.quadraticCurveTo(78, 43, 58, 45);
    dc.quadraticCurveTo(47, 54, 40, 49);
    dc.quadraticCurveTo(38, 45, 34, 46);
    dc.quadraticCurveTo(24, 55, 19, 49);
    dc.quadraticCurveTo(18, 44, 14, 42);
    dc.quadraticCurveTo(10, 38, 10, 32);
    dc.closePath();
    dc.fill();
    dc.strokeStyle = "rgba(232, 154, 56, 0.42)";
    dc.lineWidth = 1.3;
    dc.stroke();

    dc.globalCompositeOperation = "destination-out";
    dc.fillStyle = "#000000";
    punchTeardrop(dc, 34, 34, 15.5, 5.4, 0.05);
    punchTeardrop(dc, 55, 34, 14.5, 4.8, 0.04);
    punchDot(dc, 72, 34, 2.1);
    punchDot(dc, 21, 34, 2.0);
  } else if (kind === "thigh") {
    dc.fillStyle = "#0c0602";
    dc.beginPath();
    dc.moveTo(10, 28);
    dc.quadraticCurveTo(28, 12, 54, 16);
    dc.quadraticCurveTo(74, 20, 86, 26);
    dc.quadraticCurveTo(86, 32, 74, 35);
    dc.quadraticCurveTo(44, 43, 10, 28);
    dc.closePath();
    dc.fill();
    dc.strokeStyle = "rgba(226, 148, 52, 0.36)";
    dc.lineWidth = 1.2;
    dc.stroke();

    dc.globalCompositeOperation = "destination-out";
    dc.fillStyle = "#000000";
    punchTeardrop(dc, 38, 28, 16.5, 5.8, 0.04);
    punchDot(dc, 56, 27, 2.4);
    punchDot(dc, 68, 27.5, 2.0);
  } else if (kind === "shin") {
    dc.fillStyle = "#0c0602";
    dc.beginPath();
    dc.moveTo(12, 24);
    dc.quadraticCurveTo(38, 16, 78, 21);
    dc.lineTo(86, 26);
    dc.lineTo(78, 31);
    dc.quadraticCurveTo(38, 36, 12, 28);
    dc.closePath();
    dc.fill();
    dc.strokeStyle = "rgba(226, 148, 52, 0.36)";
    dc.lineWidth = 1.1;
    dc.stroke();

    dc.globalCompositeOperation = "destination-out";
    dc.fillStyle = "#000000";
    punchDot(dc, 34, 26, 2.3);
    punchDot(dc, 47, 26, 2.1);
    punchDot(dc, 60, 26, 1.9);
  }

  dc.restore();
}

function drawBoneSegment(dc, img, boneLen, pA, pB, anchorX, anchorY, alpha = 1) {
  const dx = pB.x - pA.x;
  const dy = pB.y - pA.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);

  dc.save();
  dc.globalAlpha = alpha;
  dc.translate(pA.x, pA.y);
  dc.rotate(ang);
  dc.scale(dist / boneLen, 1);
  dc.drawImage(img.canvas, -anchorX, -anchorY);
  dc.restore();
}

/**
 * Draws the sculpted S-curve Wayang neck with genuine punched collar eyelets via a tiny scratch canvas.
 */
function drawWayangNeck(dc, neckCurve, torsoPivot, torsoTilt) {
  if (!neckCurve || neckCurve.length < 2) return;
  const minX = Math.min(...neckCurve.map((pt) => pt.x)) - 26;
  const minY = Math.min(...neckCurve.map((pt) => pt.y)) - 26;
  const maxX = Math.max(...neckCurve.map((pt) => pt.x)) + 26;
  const maxY = Math.max(...neckCurve.map((pt) => pt.y)) + 26;
  const w = Math.max(80, Math.ceil(maxX - minX));
  const h = Math.max(80, Math.ceil(maxY - minY));

  const { canvas, ctx } = getNeckScratch(Math.max(180, w), Math.max(180, h));

  const rotPt = (pt) => {
    if (Math.abs(torsoTilt) < 1e-4) return pt;
    const dx = pt.x - torsoPivot.x;
    const dy = pt.y - torsoPivot.y;
    const c = Math.cos(torsoTilt);
    const sn = Math.sin(torsoTilt);
    return {
      x: torsoPivot.x + dx * c - dy * sn,
      y: torsoPivot.y + dx * sn + dy * c,
    };
  };

  const pts = neckCurve.map(rotPt).map((pt) => ({ x: pt.x - minX, y: pt.y - minY }));

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = "rgba(232, 154, 56, 0.42)";
  ctx.lineWidth = 22.8;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  ctx.strokeStyle = "#0b0502";
  ctx.lineWidth = 19.6;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000000";
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    const r = lerp(3.6, 2.3, t);
    punchDot(ctx, pts[i].x, pts[i].y, r);
  }
  ctx.restore();

  dc.drawImage(canvas, 0, 0, w, h, minX, minY, w, h);
}

/**
 * Draws a slender translucent buffalo-horn Cempurit rod with curved flex and clamped tip.
 */
function drawCempuritRod(dc, x0, y0, x1, y1, bowX, widthBase, widthTip, alpha) {
  if (alpha <= 0.01) return;
  const mx = (x0 + x1) * 0.5 + bowX;
  const my = (y0 + y1) * 0.5;

  dc.save();
  dc.globalAlpha = alpha;
  dc.lineCap = "round";

  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  dc.fillStyle = "#180a03";
  dc.beginPath();
  dc.moveTo(x0 + nx * widthBase * 0.5, y0 + ny * widthBase * 0.5);
  dc.quadraticCurveTo(
    mx + nx * widthBase * 0.35,
    my + ny * widthBase * 0.35,
    x1 + nx * widthTip * 0.5,
    y1 + ny * widthTip * 0.5
  );
  dc.lineTo(x1 - nx * widthTip * 0.5, y1 - ny * widthTip * 0.5);
  dc.quadraticCurveTo(
    mx - nx * widthBase * 0.35,
    my - ny * widthBase * 0.35,
    x0 - nx * widthBase * 0.5,
    y0 - ny * widthBase * 0.5
  );
  dc.closePath();
  dc.fill();

  // Glowing translucent honey-amber horn core
  dc.strokeStyle = "rgba(226, 152, 58, 0.72)";
  dc.lineWidth = Math.max(1.3, widthTip * 0.55);
  dc.beginPath();
  dc.moveTo(x0, y0);
  dc.quadraticCurveTo(mx, my, x1, y1);
  dc.stroke();

  dc.strokeStyle = "rgba(255, 222, 140, 0.42)";
  dc.lineWidth = 0.9;
  dc.beginPath();
  dc.moveTo(x0 + nx * 0.8, y0 + ny * 0.8);
  dc.quadraticCurveTo(mx + nx * 0.8, my + ny * 0.8, x1 + nx * 0.6, y1 + ny * 0.6);
  dc.stroke();

  drawBrassRivet(dc, x1, y1, 2.7);
  dc.restore();
}

/**
 * Draws the Dalang's faint shadow hand silhouettes along the bottom edge (below Debog)
 * with soft feathered backlight penumbra and graceful Javanese puppetry finger postures.
 */
function drawDalangHands(dc, leftGrip, rightGrip, pouchPush, wingPush, alpha) {
  if (alpha <= 0.01) return;

  const drawHand = (gx, gy, flipX, fingerLift, wristLift) => {
    dc.save();
    dc.translate(gx, gy - wristLift);
    dc.scale(flipX, 1);
    dc.globalAlpha = alpha;

    // Soft feathered radial penumbra (no sharp oval border!)
    const penumbra = dc.createRadialGradient(2, 34, 6, 2, 34, 64);
    penumbra.addColorStop(0, "rgba(14, 6, 2, 0.34)");
    penumbra.addColorStop(0.6, "rgba(18, 8, 3, 0.14)");
    penumbra.addColorStop(1, "rgba(18, 8, 3, 0)");
    dc.fillStyle = penumbra;
    dc.beginPath();
    dc.arc(2, 34, 64, 0, Math.PI * 2);
    dc.fill();

    // Graceful Javanese puppeteer hand silhouette rising from bottom frame edge
    dc.fillStyle = "rgba(16, 7, 3, 0.62)";
    dc.beginPath();
    dc.moveTo(-20, 130);
    dc.quadraticCurveTo(-24, 64, -18, 32);
    // Thumb pinching the horn rod
    dc.quadraticCurveTo(-18, 6, -7, -6);
    dc.quadraticCurveTo(1, -8, 4, 8);
    // Extended index finger guiding inner Tuding rod
    dc.quadraticCurveTo(9, -18 - fingerLift, 16, -15 - fingerLift);
    dc.quadraticCurveTo(22, -6, 16, 16);
    // Graceful splayed middle & ring mudra fingers
    dc.quadraticCurveTo(28, -2 - fingerLift * 0.5, 34, 4 - fingerLift * 0.5);
    dc.quadraticCurveTo(37, 14, 24, 28);
    dc.quadraticCurveTo(36, 18, 40, 26);
    dc.quadraticCurveTo(40, 35, 24, 45);
    dc.quadraticCurveTo(24, 70, 15, 130);
    dc.closePath();
    dc.fill();

    // Subtle warm backlit rim on upper knuckle contour
    dc.strokeStyle = "rgba(232, 154, 62, 0.25)";
    dc.lineWidth = 1.4;
    dc.beginPath();
    dc.moveTo(-17, 30);
    dc.quadraticCurveTo(-16, 5, -7, -5);
    dc.quadraticCurveTo(10, -16 - fingerLift, 16, -13 - fingerLift);
    dc.stroke();

    dc.restore();
  };

  drawHand(leftGrip.x, leftGrip.y, 1, 2, 0);
  drawHand(rightGrip.x, rightGrip.y, -1, 5 + wingPush * 0.4, pouchPush * 0.4);
}

/**
 * Renders the full Wayang Kulit Pelican, Bicycle, 4 Non-Tangling Cempurit Rods, and Dalang Hands.
 */
function drawWayangRig(g, kit, pose, u, effT, quantBlend) {
  const dc = g.drawingContext;

  const wheelImg = kit.bakeLayer("s10_wheel_v2", 144, 144, bakeWayangWheel);
  const bikeFrameImg = kit.bakeLayer("s10_bike_frame_v2", 260, 210, bakeWayangBikeFrame);
  const torsoImg = kit.bakeLayer("s10_torso_v2", 190, 150, bakeWayangTorso);
  const headBeakImg = kit.bakeLayer("s10_head_beak_v2", 210, 130, bakeWayangHeadBeak);
  const pouchImg = kit.bakeLayer("s10_pouch_v2", 160, 110, bakeWayangPouch);
  const upperWingImg = kit.bakeLayer("s10_upper_wing_v2", 96, 64, (pg) =>
    bakeWayangSegment(pg, "upperWing")
  );
  const lowerWingImg = kit.bakeLayer("s10_lower_wing_v2", 108, 68, (pg) =>
    bakeWayangSegment(pg, "lowerWing")
  );
  const thighImg = kit.bakeLayer("s10_thigh_v2", 100, 56, (pg) =>
    bakeWayangSegment(pg, "thigh")
  );
  const shinImg = kit.bakeLayer("s10_shin_v2", 102, 52, (pg) =>
    bakeWayangSegment(pg, "shin")
  );

  // Bar 2 theatrical puppetry envelope (strictly 0 near portals!)
  const bar2Env = smoothstep(1.85, 2.18, u) * (1 - smoothstep(3.82, 4.15, u)) * quantBlend;
  // Control rods & Dalang shadow hands rise cleanly from behind Debog inside the Wayang stage
  const rodAlpha = smoothstep(0.24, 0.72, u) * (1 - smoothstep(5.28, 5.76, u));

  const puppetStepOsc = Math.sin(effT * Math.PI * 4);
  const puppetSnap = Math.sin(effT * Math.PI * 10);
  const torsoTilt = quantBlend * (0.018 * puppetStepOsc + bar2Env * 0.022 * Math.sin(effT * Math.PI * 2));
  const jawOpenAngle = bar2Env * (0.11 + 0.085 * puppetStepOsc) + quantBlend * 0.03 * puppetSnap;
  const wingElbowLift = bar2Env * (10 + 7 * Math.sin(effT * Math.PI * 4 + 0.8));

  const rotAround = (pivot, pt, ang) => {
    if (Math.abs(ang) < 1e-4) return pt;
    const dx = pt.x - pivot.x;
    const dy = pt.y - pivot.y;
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    return { x: pivot.x + dx * c - dy * sn, y: pivot.y + dx * sn + dy * c };
  };

  const torsoPivot = pose.hip;
  const headPos = rotAround(torsoPivot, pose.head, torsoTilt);
  const shoulderPos = rotAround(torsoPivot, pose.shoulder, torsoTilt);
  const wingElbowPos = {
    x: pose.wingElbow.x - wingElbowLift * 0.35,
    y: pose.wingElbow.y - wingElbowLift,
  };
  const pouchBasePos = rotAround(torsoPivot, pose.pouchBase, torsoTilt);

  // Soft warm amber contact glow & wheel ground shadow along Debog top rim
  dc.save();
  dc.globalAlpha = 0.2;
  dc.fillStyle = "#210c03";
  dc.beginPath();
  dc.ellipse(pose.x, ROAD_Y + 2, 130, 7, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // 1. Back (Left) Leg + Rear Crank
  drawBoneSegment(dc, thighImg, 62, pose.hip, pose.leftKnee, 18, 28, 0.85);
  drawBoneSegment(dc, shinImg, 62, pose.leftKnee, pose.leftPedal, 18, 26, 0.85);
  dc.save();
  dc.strokeStyle = "#1a0c04";
  dc.lineWidth = 4.2;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
  dc.stroke();
  dc.restore();

  // 2. Stepped 10Hz Wayang Perforated Wheels
  for (const hub of [pose.rearHub, pose.frontHub]) {
    dc.save();
    dc.translate(hub.x, hub.y);
    dc.rotate(pose.wheelRot);
    dc.drawImage(wheelImg.canvas, -72, -72);
    dc.restore();
  }

  // 3. Carved Perforated Bicycle Frame
  dc.drawImage(bikeFrameImg.canvas, pose.x - 120, pose.y - 195);

  // 4. Pelican Torso + Ornate Tail Fan
  dc.save();
  dc.translate(torsoPivot.x, torsoPivot.y);
  dc.rotate(torsoTilt);
  dc.translate(pose.bodyCenter.x - torsoPivot.x, pose.bodyCenter.y - torsoPivot.y);
  dc.drawImage(torsoImg.canvas, -102, -76);
  dc.restore();

  // 5. Flexing S-Curve Neck with genuinely punched collar eyelets
  drawWayangNeck(dc, pose.neckCurve, torsoPivot, torsoTilt);

  // 6. Hinged Throat Pouch
  dc.save();
  dc.translate(pouchBasePos.x, pouchBasePos.y);
  dc.rotate(torsoTilt + jawOpenAngle);
  dc.drawImage(pouchImg.canvas, -24, -26);
  dc.restore();

  // 7. Royal Javanese Head + Crest + Perforated Hooked Beak
  dc.save();
  dc.translate(headPos.x, headPos.y);
  dc.rotate(torsoTilt * 1.15);
  dc.drawImage(headBeakImg.canvas, -58, -66);
  dc.restore();

  // 8. Articulated Two-Piece Carved Wing reaching to Handlebars
  drawBoneSegment(dc, upperWingImg, 60, shoulderPos, wingElbowPos, 18, 32, 1.0);
  drawBoneSegment(dc, lowerWingImg, 60, wingElbowPos, pose.barGrip, 18, 34, 1.0);

  // 9. Front (Right) Leg + Front Crank + Carved Pedals
  drawBoneSegment(dc, thighImg, 62, pose.hip, pose.rightKnee, 18, 28, 1.0);
  drawBoneSegment(dc, shinImg, 62, pose.rightKnee, pose.rightPedal, 18, 26, 1.0);

  dc.save();
  dc.strokeStyle = "#120803";
  dc.lineWidth = 4.8;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(pose.bb.x, pose.bb.y);
  dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
  dc.stroke();

  dc.fillStyle = "#0c0502";
  dc.fillRect(pose.leftPedal.x - 8.5, pose.leftPedal.y - 3, 17, 6);
  dc.fillRect(pose.rightPedal.x - 9, pose.rightPedal.y - 3.2, 18, 6.4);
  dc.restore();

  // 10. Brass Hinge Rivets at ALL articulated puppet joints
  drawBrassRivet(dc, pose.hip.x, pose.hip.y, 4.0);
  drawBrassRivet(dc, pose.rightKnee.x, pose.rightKnee.y, 3.6);
  drawBrassRivet(dc, pose.rightPedal.x, pose.rightPedal.y, 3.4);
  drawBrassRivet(dc, pose.leftKnee.x, pose.leftKnee.y, 3.0);
  drawBrassRivet(dc, shoulderPos.x, shoulderPos.y, 3.8);
  drawBrassRivet(dc, wingElbowPos.x, wingElbowPos.y, 3.6);
  drawBrassRivet(dc, pose.barGrip.x, pose.barGrip.y, 3.4);
  drawBrassRivet(
    dc,
    rotAround(torsoPivot, pose.neckBase, torsoTilt).x,
    rotAround(torsoPivot, pose.neckBase, torsoTilt).y,
    3.2
  );

  // 11. Four Non-Tangling Buffalo-Horn Cempurit Control Rods + Dalang Shadow Hands
  if (rodAlpha > 0.01) {
    const localPouchAttach = { x: 48, y: 33 };
    const pouchAng = torsoTilt + jawOpenAngle;
    const pouchAttach = {
      x:
        pouchBasePos.x +
        localPouchAttach.x * Math.cos(pouchAng) -
        localPouchAttach.y * Math.sin(pouchAng),
      y:
        pouchBasePos.y +
        localPouchAttach.x * Math.sin(pouchAng) +
        localPouchAttach.y * Math.cos(pouchAng),
    };
    const torsoSpineAttach = rotAround(
      torsoPivot,
      { x: pose.bodyCenter.x - 2, y: pose.bodyCenter.y + 24 },
      torsoTilt
    );
    // Forewing attachment near handlebar wrist so Rod 3 never crosses Rod 2 at any crank angle
    const foreWingAttach = {
      x: lerp(wingElbowPos.x, pose.barGrip.x, 0.8),
      y: lerp(wingElbowPos.y, pose.barGrip.y, 0.8) + 4,
    };

    const leftHandGrip = { x: pose.x - 42, y: 888 };
    const rightHandGrip = { x: pose.x + 42, y: 882 };

    drawDalangHands(
      dc,
      leftHandGrip,
      rightHandGrip,
      jawOpenAngle * 42,
      wingElbowLift,
      rodAlpha * (0.72 + 0.28 * bar2Env)
    );

    // Ordered cleanly left-to-right with zero crossing across the full pedal cycle:
    // Rod 1 (Leftmost): Main Spine Gapit -> Torso Spine
    drawCempuritRod(
      dc,
      leftHandGrip.x - 14,
      1006,
      torsoSpineAttach.x,
      torsoSpineAttach.y,
      -5,
      6.4,
      3.4,
      rodAlpha
    );

    // Rod 2 (Mid-left): Pedal Ankle Tuding -> Right Pedal
    drawCempuritRod(
      dc,
      leftHandGrip.x + 6,
      992,
      pose.rightPedal.x,
      pose.rightPedal.y + 2,
      -3,
      4.5,
      2.4,
      rodAlpha
    );

    // Rod 3 (Mid-right): Wing Tuding -> Forewing Clamp
    drawCempuritRod(
      dc,
      rightHandGrip.x - 16,
      994,
      foreWingAttach.x,
      foreWingAttach.y,
      4,
      4.3,
      2.3,
      rodAlpha
    );

    // Rod 4 (Rightmost): Throat Pouch Tuding -> Hinged Pouch Belly
    drawCempuritRod(
      dc,
      rightHandGrip.x + 14,
      988,
      pouchAttach.x,
      pouchAttach.y,
      11,
      4.6,
      2.4,
      rodAlpha
    );
  }
}

export default function render(ctx) {
  const { p, g, kit, t, localTime } = ctx;
  const u = localTime;

  // Pure continuous motion near portals (u <= 0.52 and u >= 5.48) so wheels/beak/tail
  // crossing #09 -> #10 and #10 -> #11 align 100% seamlessly; smooth transition into
  // pure 10Hz stepped Wayang puppetry on [0.85..5.15].
  const quantBlend = smoothstep(0.52, 0.85, u) * (1 - smoothstep(5.15, 5.48, u));
  const tQuant = quantizeTime(t + 1e-6, 10);
  const uQuant = quantizeTime(u + 1e-6, 10);
  const effT = lerp(t, tQuant, quantBlend);
  const effU = lerp(u, uQuant, quantBlend);

  const kelir = kit.bakeLayer("s10_kelir_backdrop_v2", 1840, 1000, bakeKelirBackdrop);
  const gunungan = kit.bakeLayer("s10_gunungan_v2", 260, 540, bakeGunungan);
  const debogStage = kit.bakeLayer("s10_debog_stage_v2", 1840, 280, bakeDebogStage);

  // 1. Baked cotton Kelir screen backdrop
  p.push();
  p.imageMode(p.CENTER);
  p.image(kelir, 500, 500, 1840, 1000);
  p.pop();

  g.push();
  const dc = g.drawingContext;

  // 2. 10Hz quantized Blencong flame flicker, subtle warm halo & live flickering flame tongue
  const flickerWave = Math.sin(effT * 17.3) * 0.55 + Math.cos(effT * 27.1) * 0.45;
  const flickerAlpha = 0.055 + 0.035 * flickerWave;
  const lampDriftX = Math.sin(effT * 11.7) * 5.5;
  const lampDriftY = Math.cos(effT * 14.9) * 3.5;

  dc.save();
  const pulseGrad = dc.createRadialGradient(
    500 + lampDriftX,
    315 + lampDriftY,
    25,
    500 + lampDriftX,
    340 + lampDriftY,
    660
  );
  pulseGrad.addColorStop(0, `rgba(255, 238, 168, ${Math.max(0.01, flickerAlpha * 1.45).toFixed(3)})`);
  pulseGrad.addColorStop(0.55, `rgba(246, 182, 72, ${Math.max(0.005, flickerAlpha * 0.72).toFixed(3)})`);
  pulseGrad.addColorStop(1, "rgba(246, 182, 72, 0)");
  dc.fillStyle = pulseGrad;
  dc.fillRect(BLEED_LEFT, 0, BLEED_RIGHT - BLEED_LEFT, ROAD_Y);

  // Live 10Hz flickering flame tongue beneath the Garuda Blencong oil-lamp spout (x = 500, y = 96..114)
  const flameH = 14 + flickerWave * 4.5;
  const flameLean = Math.sin(effT * 23.1) * 2.5;
  dc.fillStyle = "rgba(255, 246, 198, 0.85)";
  dc.beginPath();
  dc.moveTo(500, 96);
  dc.quadraticCurveTo(506 + flameLean * 0.5, 96 + flameH * 0.45, 500 + flameLean, 96 + flameH);
  dc.quadraticCurveTo(494 + flameLean * 0.5, 96 + flameH * 0.45, 500, 96);
  dc.closePath();
  dc.fill();
  dc.restore();

  // 3. Symmetrical flanking Javanese Gunungan (Tree of Life) silhouettes planted on Debog
  const gununganBaseY = ROAD_Y - 490;
  dc.save();
  dc.globalAlpha = 0.9;
  dc.drawImage(gunungan.canvas, -245 - 130, gununganBaseY);
  dc.translate(1245, gununganBaseY);
  dc.scale(-1, 1);
  dc.drawImage(gunungan.canvas, -130, 0);
  dc.restore();

  // 4. Horizontal Debog banana-trunk stage log (top edge aligned at ROAD_Y = 730) & lower backlit apron
  g.image(debogStage, BLEED_LEFT, ROAD_Y - 10);

  // 5. Hero Wayang Kulit Pelican + Bicycle + 4 Cempurit Control Rods + Dalang Shadow Hands
  const px = getScenePelicanX(effU);
  const pose = getRigPose(effT, { x: px, y: ROAD_Y, scale: 1.0 });
  drawWayangRig(g, kit, pose, u, effT, quantBlend);

  // 6. Shadow-theater brass-riveted Title Card
  drawEraTitleCard(g, META, u);

  g.pop();
}
