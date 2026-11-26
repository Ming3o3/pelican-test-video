/**
 * Scene #17 — 早期聊天窗口 · Early Messenger (2000s), t in [101.0, 107.0).
 * 100% original fictional 2000s desktop IM ("飞鸽传书 IM 2004" / PigeonChat v2.1):
 * - Calm 2000s corporate-blue desktop wallpaper across [-444..1444] x [0..1000]
 *   with continuous slate-blue horizon road at ROAD_Y = 730, pixel desktop shortcuts,
 *   and a classic 3D bevelled bottom taskbar.
 * - Centered 3D bevelled IM window with metallic gradient title bar ("对方正在输入..."),
 *   toolbar, chat bubble with attachment badge, sunken GIF viewport aligned flush
 *   with ROAD_Y = 730, system alert strip, and incremental typing composer.
 * - Smooth 60fps Pelican across portals #16->#17 and #17->#18, riding directly over
 *   the window bevel seam into a 9fps, 216-Web-safe-color + 4x4 Bayer ordered-dithered
 *   retro GIF inside [106, 894] x [302, 768].
 * - Bar 2 signature gag (u in [2.0, 4.0)): beat-synced "Window Nudge" jolts on
 *   u = 2.0, 2.5, 3.0, 3.5 with vibration ghost brackets and system alert pill.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  ROAD_Y,
  getScenePelicanX,
  lerp,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { drawRig2D, getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[16];
const SCENE_START_T = 101.0;

const EXT_LEFT = BLEED_LEFT - 24; // -444
const EXT_RIGHT = BLEED_RIGHT + 24; // 1444
const EXT_W = EXT_RIGHT - EXT_LEFT; // 1888

// Centered IM window bounds (cleanly below Title Card [34..402] x [32..126])
const WIN_X = 76;
const WIN_Y = 138;
const WIN_W = 848; // 76..924
const WIN_H = 800; // 138..938

// Embedded GIF viewport bounds inside the IM window (horizon flush with ROAD_Y = 730)
const GIF_X = 106;
const GIF_Y = 302;
const GIF_W = 788; // 106..894
const GIF_H = 466; // 302..768
const GIF_SCALE = 3;
const GIF_PW = Math.ceil(GIF_W / GIF_SCALE); // 263
const GIF_PH = Math.ceil(GIF_H / GIF_SCALE); // 156

const NUDGE_BEATS = [2.0, 2.5, 3.0, 3.5];
const COMPOSER_FULL_TEXT = "「这只鸟怎么一直在骑…」";

// 4x4 Bayer ordered-dither matrix (0..15) and precomputed 216-color Web-safe LUT
const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

const WEBSAFE_LUT = (() => {
  const lut = new Uint8Array(16 * 256);
  for (let b = 0; b < 16; b++) {
    const threshold = (BAYER_4X4[b] + 0.5) / 16 - 0.5;
    for (let c = 0; c < 256; c++) {
      const level = Math.round(c / 51 + threshold);
      const clamped = level < 0 ? 0 : level > 5 ? 5 : level;
      lut[b * 256 + c] = clamped * 51;
    }
  }
  return lut;
})();

const DESKTOP_RIG_PALETTE = {
  frame: "#2b4d7e",
  tire: "#182438",
  feather: "#f8f9fc",
  featherShade: "#d4e0f0",
  beak: "#ee8822",
  pouch: "#f7b544",
  leg: "#d46a18",
  outline: "#18263d",
};

const GIF_RIG_PALETTE = {
  frame: "#264e88",
  tire: "#162236",
  feather: "#faf6ee",
  featherShade: "#c6d6ec",
  beak: "#f58a1f",
  pouch: "#ffba42",
  leg: "#d86514",
  outline: "#121c2e",
};

function posMod(v, m) {
  return ((v % m) + m) % m;
}

/**
 * Draws a crisp 2000s 3D raised or sunken bevelled box.
 */
function drawBevelRect(g, x, y, w, h, fillCol, inset = false, borderCol = "#4f6280") {
  const dc = g.drawingContext;
  dc.save();
  dc.fillStyle = fillCol;
  dc.fillRect(x, y, w, h);

  const tl = inset ? "#5e708c" : "#ffffff";
  const tlInner = inset ? "#8a9bb5" : "#eef4fc";
  const br = inset ? "#ffffff" : "#5e708c";
  const brInner = inset ? "#dce6f4" : "#8fa2bd";

  dc.lineWidth = 1.5;
  dc.strokeStyle = tl;
  dc.beginPath();
  dc.moveTo(x + 1, y + h - 1);
  dc.lineTo(x + 1, y + 1);
  dc.lineTo(x + w - 1, y + 1);
  dc.stroke();

  dc.strokeStyle = tlInner;
  dc.beginPath();
  dc.moveTo(x + 2.5, y + h - 2.5);
  dc.lineTo(x + 2.5, y + 2.5);
  dc.lineTo(x + w - 2.5, y + 2.5);
  dc.stroke();

  dc.strokeStyle = br;
  dc.beginPath();
  dc.moveTo(x + w - 1, y + 1);
  dc.lineTo(x + w - 1, y + h - 1);
  dc.lineTo(x + 1, y + h - 1);
  dc.stroke();

  dc.strokeStyle = brInner;
  dc.beginPath();
  dc.moveTo(x + w - 2.5, y + 2.5);
  dc.lineTo(x + w - 2.5, y + h - 2.5);
  dc.lineTo(x + 2.5, y + h - 2.5);
  dc.stroke();

  if (borderCol) {
    dc.strokeStyle = borderCol;
    dc.lineWidth = 1;
    dc.strokeRect(x, y, w, h);
  }
  dc.restore();
}

/**
 * Draws our 100% original geometric paper-pigeon mascot icon (PigeonChat v2.1).
 */
function drawPaperPigeonIcon(g, cx, cy, size) {
  const dc = g.drawingContext;
  const s = size * 0.5;
  dc.save();
  dc.translate(cx, cy);

  // Main origami wing & body
  dc.beginPath();
  dc.moveTo(-s * 0.9, -s * 0.15);
  dc.lineTo(s * 0.15, -s * 0.72);
  dc.lineTo(s * 0.65, -s * 0.12);
  dc.lineTo(-s * 0.15, s * 0.65);
  dc.closePath();
  dc.fillStyle = "#f2f7ff";
  dc.fill();
  dc.strokeStyle = "#1b3b6e";
  dc.lineWidth = 1.3;
  dc.stroke();

  // Folded chest triangle
  dc.beginPath();
  dc.moveTo(-s * 0.9, -s * 0.15);
  dc.lineTo(s * 0.15, -s * 0.05);
  dc.lineTo(-s * 0.15, s * 0.65);
  dc.closePath();
  dc.fillStyle = "#9ec3f5";
  dc.fill();

  // Small orange origami beak pointing right
  dc.beginPath();
  dc.moveTo(s * 0.62, -s * 0.18);
  dc.lineTo(s * 1.0, -s * 0.02);
  dc.lineTo(s * 0.58, s * 0.12);
  dc.closePath();
  dc.fillStyle = "#f4962c";
  dc.fill();

  dc.restore();
}

/**
 * Draws crisp 2000s pixel-style UI mini-icons (avoiding modern color emojis).
 */
function drawMiniIcon(dc, kind, cx, cy) {
  dc.save();
  dc.translate(cx, cy);
  if (kind === "folder") {
    dc.fillStyle = "#d99e2b";
    dc.fillRect(-6, -5, 5, 2);
    dc.fillStyle = "#f4c85b";
    dc.fillRect(-7, -3, 14, 9);
    dc.strokeStyle = "#4b3818";
    dc.lineWidth = 1;
    dc.strokeRect(-7, -3, 14, 9);
  } else if (kind === "bolt") {
    dc.beginPath();
    dc.moveTo(1, -6.5);
    dc.lineTo(-4.5, 0.5);
    dc.lineTo(-0.2, 0.5);
    dc.lineTo(-2, 6.5);
    dc.lineTo(4.5, -0.5);
    dc.lineTo(0.2, -0.5);
    dc.closePath();
    dc.fillStyle = "#f59d1a";
    dc.fill();
    dc.strokeStyle = "#7a2308";
    dc.lineWidth = 1.1;
    dc.stroke();
  } else if (kind === "clock") {
    dc.beginPath();
    dc.arc(0, 0, 5.5, 0, Math.PI * 2);
    dc.fillStyle = "#ffffff";
    dc.fill();
    dc.strokeStyle = "#2b4d7e";
    dc.lineWidth = 1.3;
    dc.stroke();
    dc.beginPath();
    dc.moveTo(0, 0);
    dc.lineTo(0, -3.2);
    dc.moveTo(0, 0);
    dc.lineTo(2.8, 1.2);
    dc.stroke();
  } else if (kind === "chat") {
    dc.fillStyle = "#e8f2ff";
    dc.strokeStyle = "#3a5b8c";
    dc.lineWidth = 1.1;
    dc.fillRect(-6, -5, 12, 8);
    dc.strokeRect(-6, -5, 12, 8);
    dc.fillStyle = "#3a5b8c";
    dc.fillRect(-3, -2, 6, 1.5);
    dc.fillRect(-3, 0.5, 4, 1.5);
  } else if (kind === "smile") {
    dc.beginPath();
    dc.arc(0, 0, 5.5, 0, Math.PI * 2);
    dc.fillStyle = "#ffd659";
    dc.fill();
    dc.strokeStyle = "#6e4e10";
    dc.lineWidth = 1.1;
    dc.stroke();
    dc.fillStyle = "#4d3408";
    dc.fillRect(-2.4, -2, 1.5, 1.8);
    dc.fillRect(1.1, -2, 1.5, 1.8);
    dc.beginPath();
    dc.arc(0, 0.4, 2.8, 0.2, Math.PI - 0.2);
    dc.stroke();
  } else if (kind === "camera") {
    dc.fillStyle = "#5c769c";
    dc.fillRect(-6.5, -3.5, 13, 8);
    dc.fillStyle = "#364c6e";
    dc.fillRect(-3, -5.5, 6, 2);
    dc.beginPath();
    dc.arc(0, 0.5, 2.5, 0, Math.PI * 2);
    dc.fillStyle = "#bfe0ff";
    dc.fill();
  } else if (kind === "cut") {
    dc.strokeStyle = "#354d73";
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.arc(-3, 3, 2, 0, Math.PI * 2);
    dc.moveTo(3, 3);
    dc.arc(3, 3, 2, 0, Math.PI * 2);
    dc.stroke();
    dc.beginPath();
    dc.moveTo(-2, 1.5);
    dc.lineTo(3.5, -4.5);
    dc.moveTo(2, 1.5);
    dc.lineTo(-3.5, -4.5);
    dc.stroke();
  }
  dc.restore();
}

/**
 * Bakes the static 2000s corporate-blue desktop wallpaper + horizon road across [-444..1444].
 */
function bakeDesktopBackdrop(pg) {
  const dc = pg.drawingContext;
  dc.save();
  dc.translate(-EXT_LEFT, 0);

  // Calm azure desktop wallpaper above ROAD_Y = 730
  const skyGrad = dc.createLinearGradient(0, 0, 0, ROAD_Y);
  skyGrad.addColorStop(0, "#9cb8e2");
  skyGrad.addColorStop(0.55, "#bfd4f0");
  skyGrad.addColorStop(1, "#dce7f7");
  dc.fillStyle = skyGrad;
  dc.fillRect(EXT_LEFT, 0, EXT_W, ROAD_Y);

  // Subtle retro 2000s dot-matrix wallpaper grid
  dc.fillStyle = "rgba(86, 118, 168, 0.28)";
  for (let y = 24; y < ROAD_Y - 10; y += 28) {
    for (let x = EXT_LEFT + 16; x <= EXT_RIGHT - 16; x += 28) {
      dc.fillRect(x, y, 2, 2);
    }
  }

  // Subtle translucent desktop window-grid contour lines for spatial pan cues
  dc.strokeStyle = "rgba(255, 255, 255, 0.18)";
  dc.lineWidth = 1;
  for (let x = -300; x <= 1300; x += 400) {
    dc.beginPath();
    dc.moveTo(x, 0);
    dc.lineTo(x, ROAD_Y);
    dc.stroke();
  }

  // Muted slate-blue road curb + asphalt band at ROAD_Y = 730..792
  dc.fillStyle = "#b8cae3";
  dc.fillRect(EXT_LEFT, ROAD_Y - 3, EXT_W, 3);

  const roadGrad = dc.createLinearGradient(0, ROAD_Y, 0, 792);
  roadGrad.addColorStop(0, "#667b9c");
  roadGrad.addColorStop(0.18, "#5c7192");
  roadGrad.addColorStop(1, "#4d6180");
  dc.fillStyle = roadGrad;
  dc.fillRect(EXT_LEFT, ROAD_Y, EXT_W, 792 - ROAD_Y);

  // Top bevel curb line at exact ROAD_Y = 730
  dc.fillStyle = "#7589aa";
  dc.fillRect(EXT_LEFT, ROAD_Y, EXT_W, 4);
  dc.fillStyle = "#92a7c7";
  dc.fillRect(EXT_LEFT, ROAD_Y, EXT_W, 1.5);

  // Subtle dashed lane ticks & distance rivets along road deck
  dc.fillStyle = "rgba(218, 230, 248, 0.45)";
  for (let x = EXT_LEFT + 20; x < EXT_RIGHT; x += 64) {
    dc.fillRect(x, 760, 28, 3);
  }
  dc.fillStyle = "#3c4d69";
  dc.fillRect(EXT_LEFT, 792, EXT_W, 3);

  // Lower desktop wallpaper below road down to taskbar (y = 795..956)
  const lowGrad = dc.createLinearGradient(0, 795, 0, 956);
  lowGrad.addColorStop(0, "#b9cde8");
  lowGrad.addColorStop(1, "#9cb8e2");
  dc.fillStyle = lowGrad;
  dc.fillRect(EXT_LEFT, 795, EXT_W, 956 - 795);

  dc.fillStyle = "rgba(86, 118, 168, 0.22)";
  for (let y = 816; y < 944; y += 28) {
    for (let x = EXT_LEFT + 16; x <= EXT_RIGHT - 16; x += 28) {
      dc.fillRect(x, y, 2, 2);
    }
  }

  dc.restore();
}

/**
 * Draws retro pixel-styled desktop shortcut icons on far left/right bleed margins.
 */
function drawDesktopShortcut(g, cx, cy, label, kind) {
  const dc = g.drawingContext;
  dc.save();
  dc.translate(cx, cy);

  if (kind === "folder") {
    dc.fillStyle = "#d99e2b";
    dc.fillRect(-20, -18, 16, 6);
    dc.fillStyle = "#f2c45a";
    dc.fillRect(-22, -13, 44, 30);
    dc.strokeStyle = "#4b3818";
    dc.lineWidth = 1.6;
    dc.strokeRect(-22, -13, 44, 30);
    dc.fillStyle = "#fff1b8";
    dc.fillRect(-20, -11, 40, 4);
  } else if (kind === "gif") {
    dc.fillStyle = "#ffffff";
    dc.fillRect(-18, -22, 36, 44);
    dc.strokeStyle = "#3c5478";
    dc.lineWidth = 1.6;
    dc.strokeRect(-18, -22, 36, 44);
    // Dog-ear page fold
    dc.fillStyle = "#c8d9f0";
    dc.fillRect(8, -22, 10, 10);
    // Mini pixel sunset & bird badge
    dc.fillStyle = "#6ca4e8";
    dc.fillRect(-13, -12, 26, 18);
    dc.fillStyle = "#f49830";
    dc.fillRect(-4, -5, 10, 4);
    dc.fillStyle = "#2b4d7e";
    dc.fillRect(-13, 6, 26, 4);
    dc.fillStyle = "#1b4788";
    dc.font = "bold 9px Menlo, monospace";
    dc.textAlign = "center";
    dc.fillText("GIF", 0, 18);
  } else {
    // Classic pixel recycle bin
    dc.fillStyle = "#b5c6dc";
    dc.fillRect(-15, -14, 30, 34);
    dc.strokeStyle = "#394d6b";
    dc.lineWidth = 1.6;
    dc.strokeRect(-15, -14, 30, 34);
    dc.fillStyle = "#d6e2f2";
    dc.fillRect(-18, -18, 36, 6);
    dc.strokeRect(-18, -18, 36, 6);
    dc.fillStyle = "#6e84a6";
    for (let rx = -9; rx <= 9; rx += 6) {
      dc.fillRect(rx, -8, 3, 22);
    }
  }

  // Classic white desktop shortcut text with crisp 1px dark drop shadow
  dc.font = 'bold 13px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.textAlign = "center";
  dc.textBaseline = "top";
  dc.fillStyle = "rgba(14, 28, 54, 0.9)";
  dc.fillText(label, 1, 29);
  dc.fillText(label, 0, 29);
  dc.fillStyle = "#ffffff";
  dc.fillText(label, 0, 28);
  dc.restore();
}

function drawDesktopShortcuts(g) {
  // Left bleed shortcuts (visible during portal entry & wide view)
  drawDesktopShortcut(g, -220, 220, "考古群资料", "folder");
  drawDesktopShortcut(g, -220, 338, "pelican.gif", "gif");
  drawDesktopShortcut(g, -220, 456, "回收站", "trash");

  // Right bleed shortcuts (visible during portal exit & wide view)
  drawDesktopShortcut(g, 1160, 220, "考古群资料", "folder");
  drawDesktopShortcut(g, 1160, 338, "pelican.gif", "gif");
  drawDesktopShortcut(g, 1160, 456, "回收站", "trash");
}

/**
 * Draws the 2000s 3D bevelled taskbar across [EXT_LEFT..EXT_RIGHT] at y in [956, 1000].
 */
function drawTaskbar(g, u) {
  const dc = g.drawingContext;
  dc.save();

  // Raised taskbar body
  const barGrad = dc.createLinearGradient(0, 956, 0, 1000);
  barGrad.addColorStop(0, "#dce5f2");
  barGrad.addColorStop(0.14, "#cfd9e8");
  barGrad.addColorStop(1, "#b4c3da");
  dc.fillStyle = barGrad;
  dc.fillRect(EXT_LEFT, 956, EXT_W, 44);

  dc.fillStyle = "#ffffff";
  dc.fillRect(EXT_LEFT, 956, EXT_W, 2);
  dc.fillStyle = "#7b8ea8";
  dc.fillRect(EXT_LEFT, 955, EXT_W, 1);

  // [ ◈ 桌面 ] button on left
  drawBevelRect(g, -365, 962, 126, 32, "#d8e4f5", false, "#3d5478");
  dc.fillStyle = "#1b4788";
  dc.font = 'bold 15px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText("◈ 桌面", -302, 978);

  // Inactive folder task tab
  drawBevelRect(g, -225, 962, 148, 32, "#cfdbed", false, "#5a7091");
  drawMiniIcon(dc, "folder", -202, 978);
  dc.fillStyle = "#263b5e";
  dc.font = '14px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.textAlign = "left";
  dc.fillText("考古群资料", -186, 978);

  // Flashing / active IM task button
  const inBar2 = u >= 2.0 && u < 4.0;
  const flashPhase = inBar2 && posMod(u * 2, 1) < 0.52;
  const tabFill = flashPhase ? "#f5ab42" : "#b8cbe6";
  drawBevelRect(g, -65, 962, 298, 32, tabFill, !flashPhase, "#31496e");
  drawPaperPigeonIcon(g, -42, 978, 18);
  dc.fillStyle = flashPhase ? "#451904" : "#142747";
  dc.font = 'bold 14px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.textAlign = "left";
  dc.fillText("飞鸽传书 IM 2004 (闪烁)", -24, 978);

  // System tray on right (sunken box)
  drawBevelRect(g, 1188, 962, 148, 32, "#c5d3e8", true, "#6c809e");
  // Pixel speaker & network glyph
  dc.fillStyle = "#304970";
  dc.fillRect(1206, 974, 5, 8);
  dc.beginPath();
  dc.moveTo(1211, 974);
  dc.lineTo(1217, 969);
  dc.lineTo(1217, 987);
  dc.lineTo(1211, 982);
  dc.closePath();
  dc.fill();

  dc.fillStyle = "#2b7a4b";
  dc.fillRect(1232, 979, 4, 6);
  dc.fillRect(1238, 975, 4, 10);
  dc.fillRect(1244, 971, 4, 14);

  dc.fillStyle = "#182b49";
  dc.font = "bold 15px Menlo, Monaco, monospace";
  dc.textAlign = "right";
  dc.fillText("14:20", 1322, 979);

  dc.restore();
}

/**
 * Renders the retro GIF interior into scratch graphics (`GIF_PW x GIF_PH`)
 * and quantizes all pixels via 4x4 Bayer ordered dithering into Web-safe 216 colors.
 */
function renderDitheredGifBuffer(gifPg, u, tAnim, px, pelicanOffsetX, pelicanOffsetY) {
  const dc = gifPg.drawingContext;
  dc.save();
  dc.setTransform(1, 0, 0, 1, 0, 0);
  dc.clearRect(0, 0, GIF_PW, GIF_PH);

  // 1. Sky gradient (will dither smoothly into 4x4 Bayer bands)
  const horizonLocalY = (ROAD_Y - GIF_Y) / GIF_SCALE;
  const skyGrad = dc.createLinearGradient(0, 0, 0, horizonLocalY);
  skyGrad.addColorStop(0, "#4c82d0");
  skyGrad.addColorStop(0.55, "#8ec1f4");
  skyGrad.addColorStop(1, "#dceefd");
  dc.fillStyle = skyGrad;
  dc.fillRect(0, 0, GIF_PW, horizonLocalY);

  // 2. Soft drifting clouds (quantized to 9fps via tAnim)
  const cloudDrift = (tAnim - SCENE_START_T) * 14;
  const clouds = [
    { baseX: 52, y: 24, r: 16 },
    { baseX: 162, y: 18, r: 19 },
    { baseX: 248, y: 31, r: 14 },
  ];
  for (const c of clouds) {
    const cx = posMod(c.baseX - cloudDrift, GIF_PW + 70) - 35;
    const cg = dc.createRadialGradient(cx, c.y - 2, 2, cx, c.y, c.r * 1.4);
    cg.addColorStop(0, "#ffffff");
    cg.addColorStop(0.65, "#e6f0fc");
    cg.addColorStop(1, "rgba(180, 212, 248, 0)");
    dc.fillStyle = cg;
    for (const [ox, oy, mr] of [
      [-c.r * 0.65, 3, c.r * 0.75],
      [0, -2, c.r],
      [c.r * 0.7, 4, c.r * 0.7],
    ]) {
      dc.beginPath();
      dc.arc(cx + ox, c.y + oy, Math.max(0.5, mr), 0, Math.PI * 2);
      dc.fill();
    }
  }

  // 3. Soft distant rolling hills right above horizon road (shaded for Bayer texture)
  const hillGrad = dc.createLinearGradient(0, horizonLocalY - 34, 0, horizonLocalY);
  hillGrad.addColorStop(0, "#75a66e");
  hillGrad.addColorStop(1, "#4d7c58");
  dc.fillStyle = hillGrad;
  dc.beginPath();
  dc.moveTo(0, horizonLocalY);
  for (let x = 0; x <= GIF_PW; x += 6) {
    const worldX = GIF_X + x * GIF_SCALE + cloudDrift * 2.2;
    const h = 15 + Math.sin(worldX * 0.011) * 9 + Math.cos(worldX * 0.023) * 5;
    dc.lineTo(x, horizonLocalY - h);
  }
  dc.lineTo(GIF_PW, horizonLocalY);
  dc.closePath();
  dc.fill();

  // 4. GIF internal road lined up flush with world ROAD_Y = 730
  const roadGrad = dc.createLinearGradient(0, horizonLocalY, 0, GIF_PH);
  roadGrad.addColorStop(0, "#667b9c");
  roadGrad.addColorStop(0.25, "#5c7192");
  roadGrad.addColorStop(1, "#485a78");
  dc.fillStyle = roadGrad;
  dc.fillRect(0, horizonLocalY, GIF_PW, GIF_PH - horizonLocalY);

  // Curb highlight at exact ROAD_Y
  dc.fillStyle = "#92a7c7";
  dc.fillRect(0, horizonLocalY, GIF_PW, 1.4);

  // Dashed lane marks inside GIF
  dc.fillStyle = "#c8d6eb";
  const dashShift = posMod((tAnim - SCENE_START_T) * 28, 22);
  for (let dx = -22; dx < GIF_PW + 22; dx += 22) {
    dc.fillRect(dx - dashShift, horizonLocalY + 8, 10, 1.5);
  }

  // 5. Soft shadow ellipse beneath the Pelican on the GIF road
  const pelGifX = (px + pelicanOffsetX - GIF_X) / GIF_SCALE;
  const pelGifY = (ROAD_Y + pelicanOffsetY - GIF_Y) / GIF_SCALE;
  const shGrad = dc.createRadialGradient(pelGifX, pelGifY + 1, 2, pelGifX, pelGifY + 1, 38);
  shGrad.addColorStop(0, "rgba(24, 34, 52, 0.75)");
  shGrad.addColorStop(1, "rgba(24, 34, 52, 0)");
  dc.fillStyle = shGrad;
  dc.beginPath();
  dc.ellipse(pelGifX, pelGifY + 1, 38, 4, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // 6. Render Pelican rig into low-res GIF buffer using shared rig + drawRig2D
  const pose = getRigPose(tAnim, {
    x: px + pelicanOffsetX,
    y: ROAD_Y + pelicanOffsetY,
    scale: 1.0,
  });
  gifPg.push();
  gifPg.scale(1 / GIF_SCALE);
  gifPg.translate(-GIF_X, -GIF_Y);
  drawRig2D(gifPg, pose, GIF_RIG_PALETTE);
  gifPg.pop();

  // 7. Apply fast 4x4 Bayer ordered dither + 216-color Web-safe quantization across all pixels
  const imgData = dc.getImageData(0, 0, GIF_PW, GIF_PH);
  const data = imgData.data;
  for (let y = 0; y < GIF_PH; y++) {
    const rowShift = (y & 3) * 4;
    let pIdx = y * GIF_PW * 4;
    for (let x = 0; x < GIF_PW; x++) {
      const bOff = (rowShift + (x & 3)) * 256;
      data[pIdx] = WEBSAFE_LUT[bOff + data[pIdx]];
      data[pIdx + 1] = WEBSAFE_LUT[bOff + data[pIdx + 1]];
      data[pIdx + 2] = WEBSAFE_LUT[bOff + data[pIdx + 2]];
      data[pIdx + 3] = 255;
      pIdx += 4;
    }
  }
  dc.putImageData(imgData, 0, 0);
}

/**
 * Draws the IM window title bar, toolbar, chat history bubble, scrollbar,
 * sunken GIF bevel frame, alert strip, and incremental composer pane.
 */
function drawIMWindowChrome(g, u, joltEnv) {
  const dc = g.drawingContext;

  // Drop shadow behind main IM window
  dc.save();
  dc.fillStyle = "rgba(18, 30, 52, 0.34)";
  dc.fillRect(WIN_X + 6, WIN_Y + 7, WIN_W, WIN_H);
  dc.restore();

  // Outer raised 3D grey-blue window body
  drawBevelRect(g, WIN_X, WIN_Y, WIN_W, WIN_H, "#dce5f2", false, "#293a54");

  // 1. Metallic gradient Title Bar (y in [142, 174])
  dc.save();
  const tbX = WIN_X + 4;
  const tbY = WIN_Y + 4; // 142
  const tbW = WIN_W - 8;
  const tbH = 32;
  const tbGrad = dc.createLinearGradient(tbX, tbY, tbX + tbW, tbY);
  tbGrad.addColorStop(0, "#1b4788");
  tbGrad.addColorStop(0.55, "#3266b4");
  tbGrad.addColorStop(1, "#5289db");
  dc.fillStyle = tbGrad;
  dc.fillRect(tbX, tbY, tbW, tbH);

  // Subtle top metallic sheen
  dc.fillStyle = "rgba(255, 255, 255, 0.16)";
  dc.fillRect(tbX, tbY, tbW, 14);
  dc.restore();

  // Geometric paper-pigeon badge
  drawPaperPigeonIcon(g, tbX + 18, tbY + 16, 20);

  // Calm cycling typing dots (1-3 dots on beat)
  const dotCount = 1 + Math.floor(posMod(u * 2, 3));
  const titleText = `飞鸽传书 IM 2004 — 与 [匿名历史学家] 对话中 (对方正在输入${".".repeat(dotCount)})`;
  dc.save();
  dc.fillStyle = "#ffffff";
  dc.font = 'bold 14.5px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  dc.fillText(titleText, tbX + 36, tbY + 16.5);
  dc.restore();

  // Bevelled [_][□][×] title bar buttons
  const btnX0 = WIN_X + WIN_W - 82;
  const btnY0 = tbY + 5;
  for (let i = 0; i < 3; i++) {
    const bx = btnX0 + i * 25;
    drawBevelRect(g, bx, btnY0, 22, 22, "#dce5f2", false, "#24395c");
    dc.save();
    dc.strokeStyle = "#182b49";
    dc.lineWidth = 2;
    if (i === 0) {
      dc.beginPath();
      dc.moveTo(bx + 5, btnY0 + 16);
      dc.lineTo(bx + 17, btnY0 + 16);
      dc.stroke();
    } else if (i === 1) {
      dc.strokeRect(bx + 5, btnY0 + 5, 12, 11);
      dc.fillStyle = "#182b49";
      dc.fillRect(bx + 5, btnY0 + 5, 12, 3);
    } else {
      dc.beginPath();
      dc.moveTo(bx + 6, btnY0 + 6);
      dc.lineTo(bx + 16, btnY0 + 16);
      dc.moveTo(bx + 16, btnY0 + 6);
      dc.lineTo(bx + 6, btnY0 + 16);
      dc.stroke();
    }
    dc.restore();
  }

  // 2. Toolbar (y in [174, 206])
  dc.save();
  dc.fillStyle = "#d5e0ef";
  dc.fillRect(WIN_X + 4, 174, WIN_W - 8, 32);
  dc.fillStyle = "#ffffff";
  dc.fillRect(WIN_X + 4, 174, WIN_W - 8, 1);
  dc.fillStyle = "#96a9c4";
  dc.fillRect(WIN_X + 4, 205, WIN_W - 8, 1);
  dc.restore();

  const tools = [
    { label: "传文件", icon: "folder", x: 92, w: 86 },
    { label: "^_^ 颜文字", icon: null, x: 186, w: 94 },
    { label: "窗口抖动", icon: "bolt", x: 288, w: 102, active: joltEnv > 0.02 },
    { label: "聊天记录", icon: "clock", x: 398, w: 98 },
  ];
  for (const tool of tools) {
    drawBevelRect(
      g,
      tool.x,
      178,
      tool.w,
      24,
      tool.active ? "#ffdfb0" : "#e3ecf8",
      tool.active,
      tool.active ? "#b85520" : "#7b8eab"
    );
    const actOff = tool.active ? 1 : 0;
    if (tool.icon) {
      drawMiniIcon(dc, tool.icon, tool.x + 16 + actOff, 190 + actOff);
    }
    dc.save();
    dc.fillStyle = tool.active ? "#8a290c" : "#1d3254";
    dc.font = 'bold 12.5px "PingFang SC", "Helvetica Neue", sans-serif';
    dc.textAlign = tool.icon ? "left" : "center";
    dc.textBaseline = "middle";
    const tx = tool.icon ? tool.x + 28 + actOff : tool.x + tool.w / 2 + actOff;
    dc.fillText(tool.label, tx, 190.5 + actOff);
    dc.restore();
  }

  dc.save();
  dc.fillStyle = "#5a6e8c";
  dc.font = "bold 12px Menlo, Monaco, monospace";
  dc.textAlign = "right";
  dc.textBaseline = "middle";
  dc.fillText("PigeonChat v2.1", WIN_X + WIN_W - 18, 190);
  dc.restore();

  // 3. Sunken chat log container + metallic scrollbar
  drawBevelRect(g, 94, 210, 818, 560, "#f2f6fc", true, "#7084a1");

  // Metallic right scrollbar (x in [896, 910], y in [212, 768])
  drawBevelRect(g, 896, 212, 14, 16, "#dce5f2", false, "#6f829e");
  drawBevelRect(g, 896, 752, 14, 16, "#dce5f2", false, "#6f829e");
  dc.save();
  dc.fillStyle = "#e6eef8";
  dc.fillRect(896, 228, 14, 524);
  const sbGrad = dc.createLinearGradient(896, 0, 910, 0);
  sbGrad.addColorStop(0, "#eef4fc");
  sbGrad.addColorStop(0.5, "#b7c9e2");
  sbGrad.addColorStop(1, "#8ca3c4");
  dc.fillStyle = sbGrad;
  dc.fillRect(897, 360, 12, 160);
  dc.strokeStyle = "#5a6f8f";
  dc.lineWidth = 1;
  dc.strokeRect(897, 360, 12, 160);
  // Up/down arrows
  dc.fillStyle = "#1d3254";
  dc.font = "9px sans-serif";
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText("▲", 903, 220);
  dc.fillText("▼", 903, 760);
  dc.restore();

  // 4. Top Chat Bubble (y in [214, 292])
  drawBevelRect(g, 106, 216, 784, 76, "#e8f0fb", false, "#9cb2d1");

  // Original pixel scholar avatar (zero real IM brand)
  drawBevelRect(g, 118, 228, 50, 50, "#c8daf2", true, "#5e7699");
  dc.save();
  dc.fillStyle = "#2c4c7e";
  dc.fillRect(131, 237, 24, 16); // pixel hat/hair
  dc.fillStyle = "#f2c6a0";
  dc.fillRect(133, 247, 20, 14); // pixel face
  dc.fillStyle = "#182b49";
  dc.fillRect(136, 251, 5, 4); // pixel glasses left
  dc.fillRect(145, 251, 5, 4); // pixel glasses right
  dc.fillRect(141, 252, 4, 2); // bridge
  dc.fillStyle = "#3a6bb0";
  dc.fillRect(128, 261, 30, 14); // collar
  // Online green status pixel dot
  dc.fillStyle = "#2db84d";
  dc.beginPath();
  dc.arc(163, 272, 4.5, 0, Math.PI * 2);
  dc.fill();
  dc.strokeStyle = "#ffffff";
  dc.lineWidth = 1.2;
  dc.stroke();

  // Sender timestamp & message line
  dc.fillStyle = "#225399";
  dc.font = 'bold 14px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.textAlign = "left";
  dc.textBaseline = "top";
  dc.fillText("[匿名历史学家]  14:19:52", 180, 226);

  dc.fillStyle = "#14243d";
  dc.font = 'bold 19px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.fillText("「你看这个，考古群刚传疯了」", 176, 252);

  // Attachment badge on right side of bubble (generous width so "256色" stays inset cleanly)
  drawBevelRect(g, 522, 235, 358, 36, "#ffffff", true, "#8ea4c4");
  dc.fillStyle = "#3b6eb5";
  dc.fillRect(532, 243, 22, 20);
  dc.fillStyle = "#ffffff";
  dc.font = "bold 9px Menlo, monospace";
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText("GIF", 543, 253);

  dc.fillStyle = "#1b365d";
  dc.font = "bold 12px Menlo, Monaco, monospace";
  dc.textAlign = "left";
  dc.fillText("pelican_bike_final.gif · 128 KB · 256色", 561, 253.5);
  dc.restore();

  // 5. Sunken bevel rim around Embedded GIF Viewport [106, 302, 788, 466]
  drawBevelRect(g, GIF_X - 2, GIF_Y - 2, GIF_W + 4, GIF_H + 4, "#243754", true, "#536785");
}

/**
 * Draws the GIF corner tag, system alert strip, and bottom composer pane.
 */
function drawIMLowerUI(g, u, joltEnv) {
  const dc = g.drawingContext;

  // Crisp corner badge inside GIF viewport
  dc.save();
  dc.fillStyle = "rgba(18, 32, 56, 0.82)";
  dc.fillRect(GIF_X + GIF_W - 182, GIF_Y + 10, 172, 24);
  dc.strokeStyle = "#82b4f2";
  dc.lineWidth = 1;
  dc.strokeRect(GIF_X + GIF_W - 182, GIF_Y + 10, 172, 24);
  dc.fillStyle = "#d9ecff";
  dc.font = "bold 11.5px Menlo, Monaco, monospace";
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText("GIF89a · 9fps · 256c", GIF_X + GIF_W - 96, GIF_Y + 22.5);
  dc.restore();

  // 6. System Alert Strip (y in [772, 804])
  const alertActive = u >= 2.0 && u < 4.15;
  if (alertActive) {
    const pulseMix = 0.35 + 0.65 * joltEnv;
    drawBevelRect(
      g,
      94,
      774,
      818,
      30,
      joltEnv > 0.15 ? "#ffe3c2" : "#fff1d9",
      true,
      "#cc3b22"
    );
    dc.save();
    dc.fillStyle = `rgba(214, 58, 32, ${0.14 * pulseMix})`;
    dc.fillRect(96, 776, 814, 26);

    drawMiniIcon(dc, "bolt", 116, 789);
    dc.fillStyle = "#b82414";
    dc.font = 'bold 14.5px "PingFang SC", "Helvetica Neue", sans-serif';
    dc.textAlign = "left";
    dc.textBaseline = "middle";
    dc.fillText("[ 系统提示：对方发送了一个窗口抖动！ ]", 128, 789.5);

    dc.fillStyle = "#8c3520";
    dc.font = "bold 12px Menlo, Monaco, monospace";
    dc.textAlign = "right";
    dc.fillText("NUDGE! 120 BPM", 898, 789.5);
    dc.restore();
  } else {
    drawBevelRect(g, 94, 774, 818, 30, "#d0dced", true, "#8fa2bd");
    drawMiniIcon(dc, "chat", 116, 789);
    dc.save();
    dc.fillStyle = "#485d7d";
    dc.font = '13px "PingFang SC", "Helvetica Neue", sans-serif';
    dc.textAlign = "left";
    dc.textBaseline = "middle";
    dc.fillText("对方已传送动态图片 pelican_bike_final.gif (128 KB)", 129, 789.5);
    dc.restore();
  }

  // 7. Bottom Composer Pane (y in [810, 928])
  drawBevelRect(g, 94, 810, 818, 118, "#d8e3f2", false, "#7c91af");

  // Mini formatting bar with crisp pixel icons
  dc.save();
  dc.fillStyle = "#354d73";
  dc.font = 'bold 13px Menlo, "PingFang SC", sans-serif';
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  dc.fillText("A   B   I", 110, 823);
  drawMiniIcon(dc, "smile", 190, 823);
  drawMiniIcon(dc, "cut", 214, 823);
  drawMiniIcon(dc, "camera", 238, 823);
  dc.font = '12.5px "PingFang SC", Menlo, sans-serif';
  dc.fillText("字体: 宋体 12pt", 260, 823);
  dc.restore();

  // Sunken white textarea
  drawBevelRect(g, 102, 836, 802, 48, "#ffffff", true, "#697b96");

  // Incremental typing across u in [0.35, 4.35]
  const totalChars = COMPOSER_FULL_TEXT.length;
  const typedCount = Math.min(
    totalChars,
    Math.max(1, Math.floor(smoothstep(0.25, 4.1, u) * totalChars + 0.5))
  );
  const typedText = COMPOSER_FULL_TEXT.slice(0, typedCount);
  const cursorVisible = posMod(u * 2, 1) < 0.55;

  dc.save();
  dc.fillStyle = "#162640";
  dc.font = '17.5px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  const textX = 114;
  const textY = 860.5;
  dc.fillText(typedText, textX, textY);
  if (cursorVisible) {
    const tw = dc.measureText(typedText).width;
    dc.fillStyle = "#1b4788";
    dc.fillRect(textX + tw + 2, textY - 10, 2, 20);
  }
  dc.restore();

  // Tactile 3D bevel buttons: [ ⚡ 窗口抖动 ] (depressed during jolts) and [ 发送(S) ]
  const nudgeDepressed = joltEnv > 0.02;
  drawBevelRect(
    g,
    598,
    891,
    154,
    30,
    nudgeDepressed ? "#f7cca0" : "#dce5f2",
    nudgeDepressed,
    nudgeDepressed ? "#b5411c" : "#4b6182"
  );
  const dOff = nudgeDepressed ? 1 : 0;
  drawMiniIcon(dc, "bolt", 632 + dOff, 906 + dOff);
  dc.save();
  dc.fillStyle = nudgeDepressed ? "#7c1f08" : "#182b49";
  dc.font = 'bold 14px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  dc.fillText("窗口抖动", 646 + dOff, 906.5 + dOff);
  dc.restore();

  drawBevelRect(g, 764, 891, 138, 30, "#c8daf2", false, "#1d4580");
  dc.save();
  dc.fillStyle = "#13294d";
  dc.font = 'bold 14px "PingFang SC", "Helvetica Neue", sans-serif';
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText("发送(S)", 833, 906.5);
  dc.restore();
}

/**
 * Draws comic/XP-era double vibration ghost brackets beside the IM window during jolts.
 */
function drawNudgeGhostBrackets(g, nudgeX, nudgeY, joltEnv) {
  if (joltEnv <= 0.02) return;
  const dc = g.drawingContext;
  dc.save();

  // Trailing ghost window silhouette
  dc.globalAlpha = joltEnv * 0.24;
  dc.strokeStyle = "#3b6eb5";
  dc.lineWidth = 2.5;
  dc.strokeRect(
    WIN_X - nudgeX * 0.55,
    WIN_Y - nudgeY * 0.55,
    WIN_W,
    WIN_H
  );

  // Double vibration brackets left and right of the IM window
  dc.globalAlpha = joltEnv * 0.88;
  dc.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) {
    const spread = pass * 14;
    dc.strokeStyle = pass === 0 ? "#d94b27" : "#2758a3";
    dc.lineWidth = pass === 0 ? 3.5 : 2.5;

    // Left outer & inner curved vibration marks
    for (const [cy, span] of [
      [330, 56],
      [540, 74],
      [750, 56],
    ]) {
      const lx = WIN_X - 18 - spread + nudgeX * 0.35;
      dc.beginPath();
      dc.moveTo(lx + 10, cy - span);
      dc.quadraticCurveTo(lx - 12, cy, lx + 10, cy + span);
      dc.stroke();

      const rx = WIN_X + WIN_W + 18 + spread + nudgeX * 0.35;
      dc.beginPath();
      dc.moveTo(rx - 10, cy - span);
      dc.quadraticCurveTo(rx + 12, cy, rx - 10, cy + span);
      dc.stroke();
    }
  }
  dc.restore();
}

export default function render(ctx) {
  const { p, g, kit, localTime, meta } = ctx;
  const u = localTime;
  const sceneMeta = meta || META;

  // 1. Pre-baked static 2000s desktop wallpaper & continuous ROAD_Y = 730 horizon
  const desktopBg = kit.bakeLayer("s17_desktop_bg_v1", EXT_W, 1000, bakeDesktopBackdrop);
  p.push();
  p.imageMode(p.CENTER);
  p.image(desktopBg, 500, 500, EXT_W, 1000);
  p.pop();

  // 2. Bar 2 signature Window Nudge calculation (u in [2.0, 4.0) beats 2.0, 2.5, 3.0, 3.5)
  let nudgeX = 0;
  let nudgeY = 0;
  let joltEnv = 0;
  for (const beatTrigger of NUDGE_BEATS) {
    const du = u - beatTrigger;
    if (du >= 0 && du < 0.28) {
      const env = 1 - du / 0.28;
      joltEnv = env;
      nudgeX = Math.round(Math.sin(du * 96) * 16 * env);
      nudgeY = Math.round(Math.cos(du * 118) * 10 * env);
      break;
    }
  }

  // 3. Smooth 60fps portals outside [106, 894] <-> 9fps quantized GIF inside [106, 894]
  const rawX = getScenePelicanX(u);
  const inGif = smoothstep(106, 156, rawX) * (1 - smoothstep(844, 894, rawX));
  const uQuant = Math.floor(u * 9) / 9;
  const uAnim = lerp(u, uQuant, inGif);
  const px = getScenePelicanX(uAnim);
  const tAnim = SCENE_START_T + uAnim;

  const pelicanNudgeX = nudgeX * inGif;
  const pelicanNudgeY = nudgeY * inGif;

  // 4. Desktop pixel shortcuts & 2000s taskbar
  g.push();
  drawDesktopShortcuts(g);
  drawTaskbar(g, u);

  // Vibration ghost brackets behind/beside the nudged IM window
  drawNudgeGhostBrackets(g, nudgeX, nudgeY, joltEnv);

  // 5. IM Window chrome + sunken GIF frame translated by (nudgeX, nudgeY)
  const gifScreenX = GIF_X + nudgeX;
  const gifScreenY = GIF_Y + nudgeY;

  g.push();
  g.translate(nudgeX, nudgeY);
  drawIMWindowChrome(g, u, joltEnv);
  g.pop();

  // 6. Render 9fps 256-color 4x4 Bayer ordered-dithered GIF inside the sunken GIF viewport
  const gifPg = kit.bakeLayer("s17_gif_scratch_v1", GIF_PW, GIF_PH, () => {});
  renderDitheredGifBuffer(
    gifPg,
    u,
    tAnim,
    px,
    pelicanNudgeX - nudgeX,
    pelicanNudgeY - nudgeY
  );

  const dc = g.drawingContext;
  dc.save();
  dc.beginPath();
  dc.rect(gifScreenX, gifScreenY, GIF_W, GIF_H);
  dc.clip();
  dc.imageSmoothingEnabled = false;
  dc.drawImage(
    gifPg.drawingContext.canvas,
    gifScreenX,
    gifScreenY,
    GIF_PW * GIF_SCALE,
    GIF_PH * GIF_SCALE
  );
  dc.restore();

  // 7. IM lower UI (GIF corner badge, alert strip, composer) inside translated window space
  g.push();
  g.translate(nudgeX, nudgeY);
  drawIMLowerUI(g, u, joltEnv);
  g.pop();

  // 8. Smooth 60fps desktop Pelican clipped strictly OUTSIDE the GIF viewport so it
  //    visibly rides right over the window bevel seam into/out of the dithered GIF!
  dc.save();
  dc.beginPath();
  dc.rect(EXT_LEFT, 0, EXT_W, 1000);
  dc.rect(gifScreenX, gifScreenY, GIF_W, GIF_H);
  dc.clip("evenodd");

  // Ground contact shadow on desktop road
  const shGrad = dc.createRadialGradient(
    px + pelicanNudgeX,
    ROAD_Y + pelicanNudgeY + 3,
    4,
    px + pelicanNudgeX,
    ROAD_Y + pelicanNudgeY + 3,
    112
  );
  shGrad.addColorStop(0, "rgba(24, 38, 62, 0.34)");
  shGrad.addColorStop(1, "rgba(24, 38, 62, 0)");
  dc.fillStyle = shGrad;
  dc.beginPath();
  dc.ellipse(px + pelicanNudgeX, ROAD_Y + pelicanNudgeY + 3, 112, 11, 0, 0, Math.PI * 2);
  dc.fill();

  const outerPose = getRigPose(tAnim, {
    x: px + pelicanNudgeX,
    y: ROAD_Y + pelicanNudgeY,
    scale: 1.0,
  });
  drawRig2D(g, outerPose, DESKTOP_RIG_PALETTE);
  dc.restore();

  // 9. Steady museum Title Card in desktop coordinates (never shakes!)
  drawEraTitleCard(g, sceneMeta, u);

  g.pop();
}
