/**
 * Scene #16 — 8-bit 像素游戏 · 8-bit Platformer (1980s), t in [95.0, 101.0).
 * 1980s home-console side-scrolling platformer rendered in a strict 16-color palette
 * on a 6px pixel grid with 12fps cartridge frame quantization (smoothly blending to 60fps
 * at portal seams u <= 0.22 and u >= 5.78 so adjacent frames lock cleanly at ROAD_Y = 730).
 *
 * 100% original fictional tiles, rune blocks, diamond coins, star-berry, and HUD
 * (no real game pipes, ? blocks, caps, mushrooms, or trademarks).
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

const META = SCENES_META[15];

const PX = 6; // Canonical 6x6 sprite & world pixel block
const PIT_L = 282; // 47 * 6 — right past front wheel contact (279) at u = 2.00
const PIT_R = 402; // 67 * 6 — cleared by rear wheel contact (414) at u = 3.00

// Strict 16-color 1980s 8-bit palette
const PAL = {
  ink: "#0f1224", // 01: Deep midnight / abyss void & sprite outline
  navy: "#1c2347", // 02: Dark HUD navy / tire / mountain shadow
  sky: "#3b82d6", // 03: Cobalt sky (META.bg)
  skyLight: "#69b3ff", // 04: Cyan-sky highlight / dither / HUD accent
  white: "#f8f8f8", // 05: Pure crisp white (feathers, snow, clouds, text)
  silver: "#b8cce8", // 06: Cool feather shadow / rim / cloud shade
  pine: "#246b45", // 07: Deep emerald (watchtowers, hedges)
  lime: "#44b868", // 08: Bright emerald-lime (hedge top, 1UP flash)
  ochre: "#e5a93c", // 09: Golden turf / pouch shade / coin rim
  gold: "#f7d84b", // 10: Bright gold (coins, beak, 1UP banner)
  brick: "#b85525", // 11: Terracotta brick base (META.roadColor)
  mortar: "#7d3414", // 12: Dark mortar / cliff shadow / back leg
  bevel: "#d97c3e", // 13: Warm brick bevel / pelican leg orange
  cyan: "#42d4c8", // 14: Cyan rune sigil / bell / accent
  crimson: "#e03848", // 15: Crimson bike frame / star-berry / hearts
  blush: "#ffd4d8", // 16: Pale specular glint on berry / hearts / frame
};

// Crisp 5x7 (variable width) 8-bit bitmap font
const FONT_5X7 = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["0110", "1110", "0110", "0110", "0110", "0110", "1111"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["10010", "10010", "10010", "11111", "00010", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "-": ["0000", "0000", "0000", "1111", "0000", "0000", "0000"],
  "!": ["11", "11", "11", "11", "11", "00", "11"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
};

function posMod(v, m) {
  return ((v % m) + m) % m;
}

function snap6(v) {
  return Math.round(v / PX) * PX;
}

function snapFloor6(v) {
  return Math.floor(v / PX) * PX;
}

function pxRect(dc, x, y, w, h, col) {
  dc.fillStyle = col;
  dc.fillRect(x, y, w, h);
}

function pxBlock(dc, x, y, col, wCells = 1, hCells = 1) {
  dc.fillStyle = col;
  dc.fillRect(x, y, wCells * PX, hCells * PX);
}

function measureBitmapText(text, cellSize) {
  let cols = 0;
  for (let i = 0; i < text.length; i++) {
    const g = FONT_5X7[text[i]] || FONT_5X7[" "];
    cols += g[0].length + (i < text.length - 1 ? 1 : 0);
  }
  return cols * cellSize;
}

function drawBitmapText(dc, text, x, y, cellSize, color, shadowColor = null, outlineColor = null) {
  const glyphs = [];
  let cursor = 0;
  for (let i = 0; i < text.length; i++) {
    const glyph = FONT_5X7[text[i]] || FONT_5X7[" "];
    glyphs.push({ glyph, offset: cursor });
    cursor += glyph[0].length + 1;
  }

  const paintGlyphs = (ox, oy, col) => {
    dc.fillStyle = col;
    for (const { glyph, offset } of glyphs) {
      for (let r = 0; r < glyph.length; r++) {
        const row = glyph[r];
        for (let c = 0; c < row.length; c++) {
          if (row[c] === "1") {
            dc.fillRect(ox + (offset + c) * cellSize, oy + r * cellSize, cellSize, cellSize);
          }
        }
      }
    }
  };

  if (outlineColor) {
    paintGlyphs(x - cellSize, y, outlineColor);
    paintGlyphs(x + cellSize, y, outlineColor);
    paintGlyphs(x, y - cellSize, outlineColor);
    paintGlyphs(x, y + cellSize, outlineColor);
    paintGlyphs(x - cellSize, y - cellSize, outlineColor);
    paintGlyphs(x + cellSize, y - cellSize, outlineColor);
    paintGlyphs(x - cellSize, y + cellSize, outlineColor);
    paintGlyphs(x + cellSize, y + cellSize, outlineColor);
  }
  if (shadowColor) {
    paintGlyphs(x + cellSize, y + cellSize, shadowColor);
  }
  paintGlyphs(x, y, color);
}

/**
 * Draws a crisp 6px-grid emerald watchtower/fortress in the distant landscape.
 * Uses strictly fictional stepped geometric crenellations and pixel pennants.
 */
function drawEmeraldWatchtower(dc, cx, baseY, heightCells, hasBanner = true) {
  const halfW = 5;
  const x0 = cx - halfW * PX;
  const topY = baseY - heightCells * PX;

  // Main tower shaft
  pxRect(dc, x0, topY + 3 * PX, halfW * 2 * PX, (heightCells - 3) * PX, PAL.pine);
  // Left sunlit bevel
  pxRect(dc, x0, topY + 3 * PX, 2 * PX, (heightCells - 3) * PX, PAL.lime);
  // Dark right rim
  pxRect(dc, x0 + (halfW * 2 - 1) * PX, topY + 3 * PX, PX, (heightCells - 3) * PX, PAL.ink);
  pxRect(dc, x0 - PX, topY + 3 * PX, PX, (heightCells - 3) * PX, PAL.ink);

  // Overhanging stepped parapet / zigzag battlement crown
  const crownX = x0 - 2 * PX;
  const crownW = (halfW * 2 + 4) * PX;
  pxRect(dc, crownX, topY + 2 * PX, crownW, 2 * PX, PAL.pine);
  pxRect(dc, crownX, topY + 2 * PX, 3 * PX, 2 * PX, PAL.lime);
  pxRect(dc, crownX - PX, topY + 2 * PX, PX, 2 * PX, PAL.ink);
  pxRect(dc, crownX + crownW, topY + 2 * PX, PX, 2 * PX, PAL.ink);

  // Geometric stepped merlons (NO pipes!)
  for (let i = 0; i < halfW * 2 + 4; i += 3) {
    pxBlock(dc, crownX + i * PX, topY, i === 0 ? PAL.lime : PAL.pine, 2, 2);
    pxBlock(dc, crownX + i * PX, topY, PAL.ink, 2, 0.5);
  }

  // Pixel arrow-slit windows
  for (let row = 6; row < heightCells - 4; row += 6) {
    pxBlock(dc, cx - PX, topY + row * PX, PAL.ink, 2, 3);
    pxBlock(dc, cx - PX, topY + row * PX, PAL.skyLight, 1, 1);
  }

  // Small diagonal crimson pennant on mast
  if (hasBanner) {
    const mastX = cx;
    pxRect(dc, mastX, topY - 5 * PX, PX, 5 * PX, PAL.silver);
    pxBlock(dc, mastX + PX, topY - 5 * PX, PAL.crimson, 4, 1);
    pxBlock(dc, mastX + PX, topY - 4 * PX, PAL.crimson, 3, 1);
    pxBlock(dc, mastX + PX, topY - 3 * PX, PAL.gold, 2, 1);
  }
}

/**
 * Static 1840x1000 baked backdrop in buffer coordinates (bx = sceneX - BLEED_LEFT).
 */
function bakeBackdrop(pg) {
  const dc = pg.drawingContext;
  dc.imageSmoothingEnabled = false;

  const bxOf = (sceneX) => sceneX - BLEED_LEFT;

  // 1. Bright cobalt 8-bit sky + dithered lower sky band
  pxRect(dc, 0, 0, BUFFER_W, BUFFER_H, PAL.sky);

  // Horizon cyan sky band + 6px checkerboard dither
  pxRect(dc, 0, 622, BUFFER_W, 108, PAL.skyLight);
  for (let y = 550; y < 622; y += PX) {
    const rowIdx = Math.floor((y - 550) / PX);
    const dense = y >= 586;
    for (let x = 0; x < BUFFER_W; x += PX) {
      const colIdx = Math.floor(x / PX);
      if (dense ? (rowIdx + colIdx) % 2 === 0 : rowIdx % 2 === 0 && colIdx % 2 === 0) {
        pxBlock(dc, x, y, PAL.skyLight);
      }
    }
  }

  // 2. Stepped snowy mountain peaks with diagonal 6px pixel dithering
  const peaks = [
    { cx: -240, baseW: 360, h: 288 },
    { cx: 120, baseW: 408, h: 306 },
    { cx: 540, baseW: 336, h: 210 },
    { cx: 920, baseW: 432, h: 324 },
    { cx: 1280, baseW: 396, h: 288 },
  ];
  for (const pk of peaks) {
    const cx = bxOf(pk.cx);
    const rows = Math.floor(pk.h / PX);
    for (let r = 0; r < rows; r++) {
      const y = ROAD_Y - (rows - r) * PX;
      const halfSpan = Math.max(1, Math.round(((r + 1) / rows) * (pk.baseW / (2 * PX))));
      const xStart = cx - halfSpan * PX;
      const xEnd = cx + halfSpan * PX;
      const snowLimit = Math.floor(rows * 0.28) + ((r % 3 === 0 ? 1 : 0) - 1);

      for (let gx = -halfSpan; gx <= halfSpan; gx++) {
        const pxX = cx + gx * PX;
        if (pxX < -PX || pxX > BUFFER_W) continue;
        let col;
        if (r <= snowLimit + (gx < 0 ? 1 : -1)) {
          col = gx <= 1 ? PAL.white : PAL.silver;
        } else if (gx <= -halfSpan + 1) {
          col = PAL.skyLight;
        } else if (gx <= 0) {
          col = (r + gx) % 3 === 0 ? PAL.skyLight : PAL.sky;
        } else {
          col = (r + gx) % 2 === 0 ? PAL.navy : PAL.sky;
        }
        pxBlock(dc, pxX, y, col);
      }
      // Crisp left/right ridge pixel outline
      if (xStart >= 0 && xStart < BUFFER_W) pxBlock(dc, xStart - PX, y, PAL.ink);
      if (xEnd >= 0 && xEnd < BUFFER_W) pxBlock(dc, xEnd + PX, y, PAL.ink);
    }
  }

  // 3. Distant emerald pixel watchtowers (positioned clear of central jump zone)
  drawEmeraldWatchtower(dc, bxOf(-144), ROAD_Y, 26, true);
  drawEmeraldWatchtower(dc, bxOf(120), ROAD_Y, 22, true);
  drawEmeraldWatchtower(dc, bxOf(912), ROAD_Y, 28, true);
  drawEmeraldWatchtower(dc, bxOf(1194), ROAD_Y, 24, false);

  // 4. Fictional pixel bridge guardrail pillars & rail behind the foreground ground
  const drawGuardrailSpan = (sx0, sx1) => {
    const x0 = bxOf(sx0);
    const x1 = bxOf(sx1);
    pxRect(dc, x0, ROAD_Y - 30, x1 - x0, PX, PAL.silver);
    pxRect(dc, x0, ROAD_Y - 36, x1 - x0, PX, PAL.navy);
    for (let sx = sx0; sx <= sx1; sx += 72) {
      const bx = bxOf(sx);
      pxBlock(dc, bx, ROAD_Y - 42, PAL.ink, 2, 7);
      pxBlock(dc, bx, ROAD_Y - 42, PAL.silver, 1, 7);
      pxBlock(dc, bx, ROAD_Y - 42, PAL.bevel, 2, 1);
    }
  };
  drawGuardrailSpan(-420, PIT_L - 12);
  drawGuardrailSpan(PIT_R + 12, 1420);

  // 5. Continuous ground turf + terracotta mortar bricks (y >= 730), split by abyss pit
  const pitL_bx = bxOf(PIT_L);
  const pitR_bx = bxOf(PIT_R);

  const drawGroundSpan = (bxStart, bxEnd) => {
    const spanW = bxEnd - bxStart;
    if (spanW <= 0) return;

    // 18px (3 rows of 6px) golden turf top crust
    pxRect(dc, bxStart, ROAD_Y, spanW, PX, PAL.gold);
    pxRect(dc, bxStart, ROAD_Y + PX, spanW, PX, PAL.ochre);
    pxRect(dc, bxStart, ROAD_Y + 2 * PX, spanW, PX, PAL.mortar);

    // Stepped turf notches & overhang teeth
    for (let bx = bxStart; bx < bxEnd; bx += PX) {
      const col = Math.floor(bx / PX);
      if (col % 4 === 0) pxBlock(dc, bx, ROAD_Y, PAL.ochre);
      if (col % 3 !== 1) pxBlock(dc, bx, ROAD_Y + 2 * PX, PAL.ochre);
      if (col % 5 === 2) pxBlock(dc, bx, ROAD_Y + 3 * PX, PAL.ochre);
    }

    // Terracotta brick courses below y = 748 (24px = 4x6px tall, 48px = 8x6px wide)
    const brickStartY = ROAD_Y + 3 * PX; // 748
    const brickH = 4 * PX; // 24
    const brickW = 8 * PX; // 48

    pxRect(dc, bxStart, brickStartY, spanW, BUFFER_H - brickStartY, PAL.brick);

    for (let row = 0; brickStartY + row * brickH < BUFFER_H; row++) {
      const y = brickStartY + row * brickH;
      const stagger = row % 2 === 1 ? brickW / 2 : 0;

      // Dark horizontal mortar line along bottom of each course
      pxRect(dc, bxStart, y + brickH - PX, spanW, PX, PAL.mortar);
      // Warm bevel highlight along top of each course
      pxRect(dc, bxStart, y, spanW, PX, PAL.bevel);

      for (let bx = snapFloor6(bxStart - stagger); bx < bxEnd; bx += brickW) {
        const brickX = bx + stagger;
        const left = Math.max(bxStart, brickX);
        const right = Math.min(bxEnd, brickX + brickW);
        if (right <= left) continue;

        // Vertical mortar joint on right edge of brick
        if (brickX + brickW - PX >= bxStart && brickX + brickW <= bxEnd) {
          pxRect(dc, brickX + brickW - PX, y, PX, brickH, PAL.mortar);
        }
        // Left bevel inside brick
        if (brickX >= bxStart && brickX + PX <= bxEnd) {
          pxRect(dc, brickX, y, PX, brickH - PX, PAL.bevel);
        }
        // Subtle checkerboard pixel accent inside alternating bricks
        const brickIdx = Math.floor((brickX + row * 17) / brickW);
        if (posMod(brickIdx, 3) === 0 && brickX + 3 * PX < bxEnd && brickX + 2 * PX >= bxStart) {
          pxBlock(dc, brickX + 2 * PX, y + 2 * PX, PAL.mortar);
        }
        if (posMod(brickIdx, 4) === 1 && brickX + 5 * PX < bxEnd && brickX + 4 * PX >= bxStart) {
          pxBlock(dc, brickX + 4 * PX, y + PX, PAL.ochre);
        }
      }
    }
  };

  drawGroundSpan(0, pitL_bx);
  drawGroundSpan(pitR_bx, BUFFER_W);

  // 6. Pitch-black bottomless abyss pit (x in [PIT_L, PIT_R], y in [ROAD_Y, 1000])
  pxRect(dc, pitL_bx, ROAD_Y, pitR_bx - pitL_bx, BUFFER_H - ROAD_Y, PAL.ink);

  // Sharp bevelled brick cliff walls framing both sides of the abyss pit
  for (let y = ROAD_Y; y < BUFFER_H; y += PX) {
    const r = Math.floor((y - ROAD_Y) / PX);
    // Left cliff edge (faces right into pit)
    if (r < 3) {
      pxBlock(dc, pitL_bx - 2 * PX, y, r === 0 ? PAL.gold : PAL.ochre, 2, 1);
      pxBlock(dc, pitL_bx - PX, y, PAL.mortar);
    } else {
      pxBlock(dc, pitL_bx - 2 * PX, y, r % 4 === 3 ? PAL.mortar : PAL.bevel);
      pxBlock(dc, pitL_bx - PX, y, r % 2 === 0 ? PAL.mortar : PAL.navy);
    }
    // Right cliff edge (faces left into pit)
    if (r < 3) {
      pxBlock(dc, pitR_bx, y, r === 0 ? PAL.gold : PAL.ochre, 2, 1);
      pxBlock(dc, pitR_bx, y, PAL.bevel);
    } else {
      pxBlock(dc, pitR_bx, y, r % 4 === 3 ? PAL.mortar : PAL.bevel);
      pxBlock(dc, pitR_bx + PX, y, r % 2 === 0 ? PAL.bevel : PAL.brick);
    }
    // Subtle dark-navy dither shadow hugging inside pit cliff walls
    if (r % 2 === 0) {
      pxBlock(dc, pitL_bx, y, PAL.navy);
      pxBlock(dc, pitR_bx - PX, y, PAL.navy);
    }
  }
}

/**
 * Draws scrolling 6px-snapped pixel clouds & far sky puffs.
 */
function drawClouds(dc, uAnim) {
  const clouds = [
    { baseX: -120, y: 150, wCells: 14, speed: 28 },
    { baseX: 290, y: 204, wCells: 18, speed: 24 },
    { baseX: 740, y: 162, wCells: 16, speed: 30 },
    { baseX: 1180, y: 222, wCells: 14, speed: 26 },
    { baseX: 1580, y: 174, wCells: 16, speed: 28 },
  ];
  const wrapSpan = 1980;
  for (const c of clouds) {
    const rawX = posMod(c.baseX - uAnim * c.speed - BLEED_LEFT, wrapSpan) + BLEED_LEFT - 90;
    const x = snap6(rawX);
    const y = c.y;
    const w = c.wCells;

    // Stepped 8-bit flat-bottom pixel cloud (no faces/real-game sprites)
    pxBlock(dc, x + 3 * PX, y, PAL.white, w - 6, 1);
    pxBlock(dc, x + 2 * PX, y + PX, PAL.white, w - 4, 1);
    pxBlock(dc, x + PX, y + 2 * PX, PAL.white, w - 2, 2);
    pxBlock(dc, x, y + 4 * PX, PAL.white, w, 1);
    pxBlock(dc, x, y + 5 * PX, PAL.silver, w, 1);
    pxBlock(dc, x + PX, y + 6 * PX, PAL.skyLight, w - 2, 1);

    // Subtle step highlights
    pxBlock(dc, x + 4 * PX, y - PX, PAL.white, Math.max(4, w - 10), 1);
    pxBlock(dc, x + 2 * PX, y + 5 * PX, PAL.white, 2, 1);
  }
}

/**
 * Draws ground-anchored geometric emerald pixel hedges (6px aligned, clear of abyss pit).
 */
function drawPixelHedges(dc, uAnim) {
  const shimmer = posMod(Math.floor(uAnim * 4), 2);
  const hedges = [
    { x: -240, wCells: 12, hCells: 5 },
    { x: 48, wCells: 14, hCells: 6 },
    { x: 186, wCells: 10, hCells: 4 },
    { x: 528, wCells: 14, hCells: 6 },
    { x: 852, wCells: 12, hCells: 5 },
    { x: 1122, wCells: 14, hCells: 6 },
  ];

  for (let i = 0; i < hedges.length; i++) {
    const h = hedges[i];
    const w = h.wCells;
    const rows = h.hCells;
    const x = h.x;
    const yBottom = ROAD_Y;

    // Crisp 6px rounded-dome bush resting wide on ROAD_Y and tapering upward
    let prevRx = null;
    let prevSpan = 0;
    for (let r = 0; r < rows; r++) {
      const inset = r === 0 ? 0 : r === 1 ? 0 : r === rows - 1 ? r : r - 1;
      const span = Math.max(4, w - inset * 2);
      const rx = x + inset * PX;
      const ry = yBottom - (r + 1) * PX;

      pxBlock(dc, rx - PX, ry, PAL.ink, span + 2, 1);
      pxBlock(dc, rx, ry, r >= rows - 2 ? PAL.lime : PAL.pine, span, 1);

      // Stepped border shelves when tapering inward
      if (prevRx !== null && rx > prevRx) {
        pxBlock(dc, prevRx, ry, PAL.ink, Math.round((rx - prevRx) / PX), 1);
        const rightShelf = prevRx + prevSpan * PX;
        const curRight = rx + span * PX;
        if (rightShelf > curRight) {
          pxBlock(dc, curRight, ry, PAL.ink, Math.round((rightShelf - curRight) / PX), 1);
        }
      }
      if (r === rows - 1) {
        pxBlock(dc, rx, ry - PX, PAL.ink, span, 1);
      }
      // Subtle 12fps leaf pixel twinkle
      if (r > 0 && r < rows - 1 && span >= 4) {
        const dotOffset = ((i + r + shimmer) % Math.max(2, span - 2)) + 1;
        pxBlock(dc, rx + dotOffset * PX, ry, r >= rows - 2 ? PAL.gold : PAL.lime);
      }
      prevRx = rx;
      prevSpan = span;
    }
  }
}

/**
 * Draws 3 bevelled bronze & cyan geometric rune blocks at x in [620, 812], y = 504.
 * Strictly NO "?" blocks or bricks from real games.
 */
function drawRuneBlocks(dc, uAnim) {
  const blockPositions = [624, 690, 756]; // Each 54x54 (9x9 blocks of 6px), right edge 810
  const y0 = 504;
  const sigilPulse = posMod(Math.floor(uAnim * 6), 2);
  const sigilCol = sigilPulse === 0 ? PAL.cyan : PAL.skyLight;

  for (let b = 0; b < blockPositions.length; b++) {
    const x0 = blockPositions[b];
    // 9x9 block outer frame
    pxBlock(dc, x0, y0, PAL.ink, 9, 9);
    // Inner bronze body (7x7)
    pxBlock(dc, x0 + PX, y0 + PX, PAL.brick, 7, 7);
    // Top-left bevel highlight
    pxBlock(dc, x0 + PX, y0 + PX, PAL.ochre, 7, 1);
    pxBlock(dc, x0 + PX, y0 + PX, PAL.ochre, 1, 7);
    pxBlock(dc, x0 + PX, y0 + PX, PAL.gold, 1, 1);
    // Bottom-right bevel shadow
    pxBlock(dc, x0 + PX, y0 + 7 * PX, PAL.mortar, 7, 1);
    pxBlock(dc, x0 + 7 * PX, y0 + PX, PAL.mortar, 1, 7);
    // Dark corner rivets
    pxBlock(dc, x0 + 2 * PX, y0 + 2 * PX, PAL.ink);
    pxBlock(dc, x0 + 6 * PX, y0 + 2 * PX, PAL.ink);
    pxBlock(dc, x0 + 2 * PX, y0 + 6 * PX, PAL.ink);
    pxBlock(dc, x0 + 6 * PX, y0 + 6 * PX, PAL.ink);

    // Center geometric rune sigil (5x5 area at +2..+6)
    if (b === 0) {
      // Solid cyan diamond sigil
      pxBlock(dc, x0 + 4 * PX, y0 + 2 * PX, sigilCol);
      pxBlock(dc, x0 + 3 * PX, y0 + 3 * PX, sigilCol, 3, 1);
      pxBlock(dc, x0 + 2 * PX, y0 + 4 * PX, sigilCol, 5, 1);
      pxBlock(dc, x0 + 3 * PX, y0 + 5 * PX, sigilCol, 3, 1);
      pxBlock(dc, x0 + 4 * PX, y0 + 6 * PX, sigilCol);
      pxBlock(dc, x0 + 4 * PX, y0 + 4 * PX, PAL.white);
    } else if (b === 1) {
      // Cross / compass rune sigil
      pxBlock(dc, x0 + 4 * PX, y0 + 2 * PX, sigilCol, 1, 5);
      pxBlock(dc, x0 + 2 * PX, y0 + 4 * PX, sigilCol, 5, 1);
      pxBlock(dc, x0 + 4 * PX, y0 + 4 * PX, PAL.white);
    } else {
      // Hollow rune ring
      pxBlock(dc, x0 + 4 * PX, y0 + 2 * PX, sigilCol);
      pxBlock(dc, x0 + 3 * PX, y0 + 3 * PX, sigilCol);
      pxBlock(dc, x0 + 5 * PX, y0 + 3 * PX, sigilCol);
      pxBlock(dc, x0 + 2 * PX, y0 + 4 * PX, sigilCol);
      pxBlock(dc, x0 + 6 * PX, y0 + 4 * PX, sigilCol);
      pxBlock(dc, x0 + 3 * PX, y0 + 5 * PX, sigilCol);
      pxBlock(dc, x0 + 5 * PX, y0 + 5 * PX, sigilCol);
      pxBlock(dc, x0 + 4 * PX, y0 + 6 * PX, sigilCol);
      pxBlock(dc, x0 + 4 * PX, y0 + 4 * PX, PAL.gold);
    }
  }
}

/**
 * Draws a spinning 8-bit gold diamond coin at (cx, cy) or a crimson-gold star-berry.
 */
function drawSpinningCoin(dc, cx, cy, frameIdx) {
  const x = snap6(cx);
  const y = snap6(cy);

  const spriteFull = [
    "001100",
    "012310",
    "124421",
    "124321",
    "123321",
    "012210",
    "001100",
  ];
  const spriteMed = [
    "0110",
    "1231",
    "1421",
    "1421",
    "1321",
    "1221",
    "0110",
  ];
  const spriteEdge = [
    "11",
    "13",
    "14",
    "14",
    "12",
    "12",
    "11",
  ];

  const art = frameIdx === 0 ? spriteFull : frameIdx === 2 ? spriteEdge : spriteMed;
  const cols = art[0].length;
  const rows = art.length;
  const x0 = x - Math.floor(cols / 2) * PX;
  const y0 = y - Math.floor(rows / 2) * PX;

  const colorMap = {
    "1": PAL.ink,
    "2": PAL.ochre,
    "3": PAL.gold,
    "4": PAL.white,
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = art[r][c];
      if (ch !== "0") {
        pxBlock(dc, x0 + c * PX, y0 + r * PX, colorMap[ch]);
      }
    }
  }
}

function drawStarBerry(dc, cx, cy, uAnim) {
  const x = snap6(cx);
  const y = snap6(cy);
  const flash = posMod(Math.floor(uAnim * 12), 2);

  // Original 8-bit crimson-gold star-berry sprite (7x8 blocks, zero mushroom!)
  const art = [
    "0015510",
    "0152210",
    "1434341",
    "1344431",
    "1334331",
    "0133310",
    "0012100",
    "0001000",
  ];
  const x0 = x - 3 * PX;
  const y0 = y - 4 * PX;

  const map = {
    "1": PAL.ink,
    "2": flash === 0 ? PAL.gold : PAL.ochre,
    "3": flash === 0 ? PAL.crimson : PAL.gold,
    "4": flash === 0 ? PAL.blush : PAL.white,
    "5": PAL.lime,
  };

  for (let r = 0; r < art.length; r++) {
    for (let c = 0; c < art[r].length; c++) {
      const ch = art[r][c];
      if (ch !== "0") {
        pxBlock(dc, x0 + c * PX, y0 + r * PX, map[ch]);
      }
    }
  }
}

function drawCollectBurst(dc, cx, cy, dt, tag, isBerry = false) {
  const x = snap6(cx);
  const y = snap6(cy);
  const dist = PX + Math.floor(dt * 84 / PX) * PX;
  const flash = posMod(Math.floor(dt * 24), 2);
  const sparkCol = isBerry
    ? flash === 0 ? PAL.crimson : PAL.gold
    : flash === 0 ? PAL.white : PAL.gold;

  // 4-corner expanding pixel sparkles
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = x + sx * dist;
    const py = y + sy * dist;
    pxBlock(dc, px - PX, py - PX, PAL.ink, 3, 3);
    pxBlock(dc, px, py - PX, sparkCol);
    pxBlock(dc, px - PX, py, sparkCol, 3, 1);
    pxBlock(dc, px, py + PX, sparkCol);
  }

  // Rising pixel score tag
  const riseY = y - 24 - Math.floor(dt * 72 / PX) * PX;
  const tagW = measureBitmapText(tag, 3);
  drawBitmapText(
    dc,
    tag,
    snap6(x - tagW / 2),
    riseY,
    3,
    isBerry ? PAL.blush : PAL.gold,
    PAL.ink,
    PAL.ink
  );
}

/**
 * Lightweight per-frame integer grid canvas for rasterizing 6px-block sprites with crisp 1-block borders.
 */
function makePixelLayer() {
  return new Map();
}

function packKey(gx, gy) {
  return (gx + 512) * 1024 + (gy + 512);
}

function unpackKey(key) {
  const gy = (key % 1024) - 512;
  const gx = Math.floor(key / 1024) - 512;
  return [gx, gy];
}

function setCell(map, gx, gy, col) {
  map.set(packKey(gx, gy), col);
}

function paintLine(map, x0, y0, x1, y1, col, radius = 0) {
  let ix0 = x0;
  let iy0 = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  const stamp = (cx, cy) => {
    if (radius <= 0) {
      setCell(map, cx, cy, col);
      return;
    }
    const rCeil = Math.ceil(radius);
    const r2 = radius * radius + 0.25;
    for (let oy = -rCeil; oy <= rCeil; oy++) {
      for (let ox = -rCeil; ox <= rCeil; ox++) {
        if (ox * ox + oy * oy <= r2) {
          setCell(map, cx + ox, cy + oy, col);
        }
      }
    }
  };

  while (true) {
    stamp(ix0, iy0);
    if (ix0 === x1 && iy0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      ix0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      iy0 += sy;
    }
  }
}

function paintDisk(map, cx, cy, r, col) {
  const rCeil = Math.ceil(r);
  const r2 = r * r + 0.3;
  for (let oy = -rCeil; oy <= rCeil; oy++) {
    for (let ox = -rCeil; ox <= rCeil; ox++) {
      if (ox * ox + oy * oy <= r2) {
        setCell(map, cx + ox, cy + oy, col);
      }
    }
  }
}

function paintPoly(map, pts, col) {
  if (pts.length < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(a[0] + t * (b[0] - a[0]));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xStart = Math.round(xs[k]);
      const xEnd = Math.round(xs[k + 1]);
      for (let x = xStart; x <= xEnd; x++) {
        setCell(map, x, y, col);
      }
    }
  }
}

function commitWithOutline(dest, layer, outlineCol = PAL.ink) {
  for (const key of layer.keys()) {
    const [gx, gy] = unpackKey(key);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nKey = packKey(gx + dx, gy + dy);
      if (!layer.has(nKey)) {
        dest.set(nKey, outlineCol);
      }
    }
  }
  for (const [key, col] of layer.entries()) {
    dest.set(key, col);
  }
}

/**
 * Renders the Pelican + Bicycle from `pose` onto a 6px-snapped pixel sprite grid.
 */
function drawPixelPelicanRig(dc, pose, baseOriginX, baseOriginY, snapOriginX, snapOriginY) {
  const gPt = (pt) => [
    Math.round((pt.x - baseOriginX) / PX - 0.5),
    Math.round((pt.y - baseOriginY) / PX - 0.5),
  ];

  const finalMap = makePixelLayer();

  // 1. Back leg & rear crank (behind bike frame)
  const backLegLayer = makePixelLayer();
  const bb = gPt(pose.bb);
  const leftPedal = gPt(pose.leftPedal);
  const leftKnee = gPt(pose.leftKnee);
  const hip = gPt(pose.hip);
  paintLine(backLegLayer, bb[0], bb[1], leftPedal[0], leftPedal[1], PAL.navy);
  paintLine(backLegLayer, hip[0], hip[1], leftKnee[0], leftKnee[1], PAL.mortar, 0.7);
  paintLine(backLegLayer, leftKnee[0], leftKnee[1], leftPedal[0], leftPedal[1], PAL.mortar, 0.7);
  paintLine(backLegLayer, leftPedal[0] - 1, leftPedal[1], leftPedal[0] + 1, leftPedal[1], PAL.navy);
  commitWithOutline(finalMap, backLegLayer, PAL.ink);

  // 2. Bicycle wheels (rear & front) with rotating spokes & pixel tread notches
  const drawPixelWheel = (hubPt) => {
    const wheelLayer = makePixelLayer();
    const [hx, hy] = gPt(hubPt);
    const rOuter = 10;

    // 6 rotating stepped pixel spokes
    for (let i = 0; i < 6; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 3;
      const sx = hx + Math.round(Math.cos(a) * 7.6);
      const sy = hy + Math.round(Math.sin(a) * 7.6);
      paintLine(wheelLayer, hx, hy, sx, sy, i % 3 === 0 ? PAL.skyLight : PAL.silver);
    }

    // Rim & tire ring
    for (let dy = -rOuter; dy <= rOuter; dy++) {
      for (let dx = -rOuter; dx <= rOuter; dx++) {
        const d = Math.hypot(dx, dy);
        if (d >= 7.5 && d < 8.7) {
          setCell(wheelLayer, hx + dx, hy + dy, dx + dy < -4 ? PAL.white : PAL.silver);
        } else if (d >= 8.7 && d <= 10.35) {
          const ang = posMod(Math.atan2(dy, dx) - pose.wheelRot, Math.PI / 2);
          const tread = d > 9.5 && ang < 0.22;
          setCell(wheelLayer, hx + dx, hy + dy, tread ? PAL.silver : PAL.navy);
        }
      }
    }

    // Center hub cap
    paintDisk(wheelLayer, hx, hy, 1.2, PAL.crimson);
    setCell(wheelLayer, hx, hy, PAL.white);

    commitWithOutline(finalMap, wheelLayer, PAL.ink);
  };

  drawPixelWheel(pose.rearHub);
  drawPixelWheel(pose.frontHub);

  // 3. Bicycle diamond frame, saddle, handlebars, chainring & bell
  const frameLayer = makePixelLayer();
  const rearHub = gPt(pose.rearHub);
  const frontHub = gPt(pose.frontHub);
  const seatCluster = gPt(pose.seatCluster);
  const headTop = gPt(pose.headTop);
  const headBot = gPt(pose.headBot);
  const stemTop = gPt(pose.stemTop);
  const barGrip = gPt(pose.barGrip);
  const saddleRear = gPt(pose.saddleRear);
  const saddleFront = gPt(pose.saddleFront);
  const bellPos = gPt(pose.bellPos);

  paintLine(frameLayer, rearHub[0], rearHub[1], bb[0], bb[1], PAL.crimson);
  paintLine(frameLayer, rearHub[0], rearHub[1], seatCluster[0], seatCluster[1], PAL.crimson);
  paintLine(frameLayer, bb[0], bb[1], seatCluster[0], seatCluster[1], PAL.crimson);
  paintLine(frameLayer, seatCluster[0], seatCluster[1], headTop[0], headTop[1], PAL.crimson);
  paintLine(frameLayer, bb[0], bb[1], headBot[0], headBot[1], PAL.crimson);
  paintLine(frameLayer, frontHub[0], frontHub[1], headTop[0], headTop[1], PAL.crimson);
  // Top highlight pixel along top tube
  paintLine(
    frameLayer,
    seatCluster[0],
    seatCluster[1] - 1,
    headTop[0],
    headTop[1] - 1,
    PAL.blush
  );

  // Stem, handlebars & seatpost
  paintLine(frameLayer, headTop[0], headTop[1], stemTop[0], stemTop[1], PAL.silver);
  paintLine(frameLayer, stemTop[0], stemTop[1], barGrip[0], barGrip[1], PAL.silver);
  const saddleMid = [Math.round((saddleRear[0] + saddleFront[0]) / 2), saddleRear[1]];
  paintLine(frameLayer, seatCluster[0], seatCluster[1], saddleMid[0], saddleMid[1], PAL.silver);
  paintLine(frameLayer, saddleRear[0], saddleRear[1], saddleFront[0], saddleFront[1], PAL.navy, 0.7);
  paintDisk(frameLayer, bb[0], bb[1], 1.6, PAL.silver);
  setCell(frameLayer, bb[0], bb[1], PAL.navy);
  setCell(frameLayer, bellPos[0], bellPos[1], PAL.gold);

  commitWithOutline(finalMap, frameLayer, PAL.ink);

  // 4. Pelican body, tail, S-curve neck, head & crest feathers
  const bodyLayer = makePixelLayer();
  const bodyC = gPt(pose.bodyCenter);
  const tailTip = gPt(pose.tailTip);
  const neckBase = gPt(pose.neckBase);
  const head = gPt(pose.head);
  const crest1 = gPt(pose.crest1);
  const crest2 = gPt(pose.crest2);

  // Plump feathered torso & pointed tail
  paintPoly(
    bodyLayer,
    [
      tailTip,
      [bodyC[0] - 4, bodyC[1] - 4],
      [bodyC[0] + 3, bodyC[1] - 5],
      [neckBase[0] + 2, neckBase[1]],
      [bodyC[0] + 4, bodyC[1] + 4],
      [hip[0] + 2, hip[1] + 2],
      [tailTip[0] + 2, tailTip[1] + 2],
    ],
    PAL.white
  );
  paintDisk(bodyLayer, bodyC[0], bodyC[1], 4.8, PAL.white);

  // Cool silver-blue belly & under-tail shading
  paintPoly(
    bodyLayer,
    [
      [tailTip[0] + 1, tailTip[1] + 1],
      [bodyC[0], bodyC[1] + 2],
      [hip[0] + 2, hip[1] + 2],
      [bodyC[0] + 4, bodyC[1] + 4],
      [tailTip[0] + 2, tailTip[1] + 2],
    ],
    PAL.silver
  );

  // S-curve neck
  for (let i = 0; i < pose.neckCurve.length - 1; i++) {
    const a = gPt(pose.neckCurve[i]);
    const b = gPt(pose.neckCurve[i + 1]);
    paintLine(bodyLayer, a[0], a[1], b[0], b[1], PAL.white, 1.5);
    paintLine(bodyLayer, a[0] - 1, a[1], b[0] - 1, b[1], PAL.silver);
  }

  // Round head + 2 playful pixel crest tufts
  paintDisk(bodyLayer, head[0], head[1], 3.0, PAL.white);
  paintLine(bodyLayer, crest1[0], crest1[1], head[0] - 1, head[1] - 2, PAL.white);
  paintLine(bodyLayer, crest2[0], crest2[1], head[0] + 1, head[1] - 3, PAL.white);

  commitWithOutline(finalMap, bodyLayer, PAL.ink);

  // 5. Iconic oversized Pelican throat pouch + upper mandible + hook
  const beakLayer = makePixelLayer();
  const beakBaseTop = gPt(pose.beakBaseTop);
  const beakTip = gPt(pose.beakTip);
  const beakHook = gPt(pose.beakHook);
  const pouchMid = gPt(pose.pouchMid);
  const pouchBase = gPt(pose.pouchBase);

  // Throat pouch
  paintPoly(
    beakLayer,
    [
      pouchBase,
      [pouchMid[0] - 3, pouchMid[1] + 1],
      [pouchMid[0] + 4, pouchMid[1]],
      [beakTip[0] - 1, beakTip[1] + 1],
      [beakBaseTop[0], beakBaseTop[1] + 2],
    ],
    PAL.ochre
  );
  // Warm lower shadow on pouch
  paintLine(
    beakLayer,
    pouchMid[0] - 2,
    pouchMid[1] + 1,
    pouchMid[0] + 3,
    pouchMid[1] + 1,
    PAL.bevel
  );

  // Upper beak & tip hook
  paintPoly(
    beakLayer,
    [
      beakBaseTop,
      beakTip,
      beakHook,
      [beakTip[0] - 1, beakTip[1] + 1],
      [beakBaseTop[0], beakBaseTop[1] + 2],
    ],
    PAL.gold
  );
  paintLine(beakLayer, beakBaseTop[0] + 1, beakBaseTop[1], beakTip[0] - 1, beakTip[1], PAL.white);
  setCell(beakLayer, beakHook[0], beakHook[1], PAL.bevel);

  commitWithOutline(finalMap, beakLayer, PAL.ink);

  // 6. Wing reaching to handlebars
  const wingLayer = makePixelLayer();
  const shoulder = gPt(pose.shoulder);
  const wingElbow = gPt(pose.wingElbow);
  paintPoly(
    wingLayer,
    [
      [shoulder[0] - 1, shoulder[1] - 1],
      [wingElbow[0] - 1, wingElbow[1] + 2],
      [barGrip[0] - 1, barGrip[1] + 2],
      barGrip,
      [wingElbow[0] + 1, wingElbow[1] - 1],
      [shoulder[0] + 2, shoulder[1] - 1],
    ],
    PAL.white
  );
  paintLine(
    wingLayer,
    shoulder[0],
    shoulder[1] + 1,
    wingElbow[0],
    wingElbow[1] + 1,
    PAL.silver
  );
  paintLine(
    wingLayer,
    wingElbow[0],
    wingElbow[1] + 1,
    barGrip[0] - 1,
    barGrip[1] + 1,
    PAL.silver
  );
  commitWithOutline(finalMap, wingLayer, PAL.ink);

  // 7. Front leg, webbed foot & front crank
  const frontLegLayer = makePixelLayer();
  const rightPedal = gPt(pose.rightPedal);
  const rightKnee = gPt(pose.rightKnee);
  paintLine(frontLegLayer, bb[0], bb[1], rightPedal[0], rightPedal[1], PAL.silver);
  paintLine(frontLegLayer, hip[0], hip[1], rightKnee[0], rightKnee[1], PAL.bevel, 0.7);
  paintLine(frontLegLayer, rightKnee[0], rightKnee[1], rightPedal[0], rightPedal[1], PAL.bevel, 0.7);
  // Webbed foot + pedal block
  paintLine(frontLegLayer, rightPedal[0] - 1, rightPedal[1], rightPedal[0] + 2, rightPedal[1], PAL.ochre);
  paintLine(frontLegLayer, rightPedal[0] - 1, rightPedal[1] + 1, rightPedal[0] + 1, rightPedal[1] + 1, PAL.navy);
  commitWithOutline(finalMap, frontLegLayer, PAL.ink);

  // 8. Crisp 8-bit eye
  const eye = gPt(pose.eye);
  setCell(finalMap, eye[0] - 1, eye[1], PAL.white);
  setCell(finalMap, eye[0], eye[1], PAL.ink);
  setCell(finalMap, eye[0], eye[1] - 1, PAL.white);

  // Flush final 6x6 blocks onto Canvas2D
  for (const [key, col] of finalMap.entries()) {
    const [gx, gy] = unpackKey(key);
    pxBlock(dc, snapOriginX + gx * PX, snapOriginY + gy * PX, col);
  }
}

/**
 * Draws chunky landing dust pixel clouds kicking outward from both rear & front wheels upon landing.
 */
function drawLandingDust(dc, px, uAnim) {
  const dt = uAnim - 2.98;
  if (dt < 0 || dt > 0.50) return;

  const spread = Math.floor(dt * 96 / PX) * PX;
  const rise = Math.floor(dt * 30 / PX) * PX;
  const flicker = posMod(Math.floor(dt * 20), 2);
  const colMain = flicker === 0 ? PAL.white : PAL.silver;
  const colAccent = PAL.ochre;

  // Rear wheel landed at px - 86, front wheel at px + 86 — place plumes clearly outside tire footprints
  for (const wheelX of [px - 86, px + 86]) {
    for (const dir of [-1, 1]) {
      const cx = snap6(wheelX + dir * (48 + spread));
      const cy = ROAD_Y - 18 - rise;
      pxBlock(dc, cx - PX, cy, PAL.ink, 4, 3);
      pxBlock(dc, cx - PX, cy, colMain, 3, 2);
      pxBlock(dc, cx, cy + PX, colAccent, 2, 1);
      if (dt < 0.34) {
        pxBlock(dc, cx + dir * 2 * PX, cy - PX, PAL.ink, 2, 2);
        pxBlock(dc, cx + dir * 2 * PX, cy - PX, colMain, 1, 1);
      }
    }
  }
}

/**
 * Draws blinking gold/lime stepped pixel "1UP!" banner and "+1000" floating above the Pelican.
 */
function drawOneUpBanner(dc, px, uAnim) {
  const dt = uAnim - 2.98;
  if (dt < 0 || dt > 1.37) return;

  const rise = Math.floor(Math.min(dt, 1.1) * 78 / PX) * PX;
  const flash = posMod(Math.floor(uAnim * 8), 2);
  const cx = snap6(px);
  const bannerY = 306 - rise;

  const label = "1UP!";
  const cell = PX; // 6px per pixel bit
  const textW = measureBitmapText(label, cell);
  const boxW = snap6(textW + 4 * PX);
  const boxH = 11 * PX;
  const boxX = snap6(cx - boxW / 2);
  const boxY = snap6(bannerY);

  // Stepped pixel plaque behind 1UP! (keeps banner hyper-legible against clouds/sky)
  pxRect(dc, boxX - PX, boxY + PX, boxW + 2 * PX, boxH - 2 * PX, PAL.ink);
  pxRect(dc, boxX + PX, boxY - PX, boxW - 2 * PX, boxH + 2 * PX, PAL.ink);
  pxRect(dc, boxX, boxY, boxW, boxH, flash === 0 ? PAL.navy : PAL.pine);
  pxRect(dc, boxX + PX, boxY, boxW - 2 * PX, PX, flash === 0 ? PAL.gold : PAL.lime);
  pxRect(dc, boxX + PX, boxY + boxH - PX, boxW - 2 * PX, PX, flash === 0 ? PAL.gold : PAL.lime);

  drawBitmapText(
    dc,
    label,
    snap6(cx - textW / 2),
    boxY + 2 * PX,
    cell,
    flash === 0 ? PAL.gold : PAL.lime,
    PAL.ink,
    PAL.ink
  );

  // Floating +1000 beneath the 1UP! plaque
  const bonus = "+1000";
  const bonusW = measureBitmapText(bonus, 4);
  drawBitmapText(
    dc,
    bonus,
    snap6(cx - bonusW / 2),
    boxY + boxH + PX,
    4,
    flash === 0 ? PAL.white : PAL.gold,
    PAL.ink,
    PAL.ink
  );
}

/**
 * Draws Top-Right Fictional 8-bit HUD (x in [450, 966], y in [36, 114]).
 */
function drawEightBitHud(dc, coinsCollected, landed, uAnim) {
  const x0 = 450;
  const y0 = 36;
  const w = 516;
  const h = 78;

  // Stepped pixel dark-navy HUD frame (zero rounded corners)
  pxRect(dc, x0 + PX, y0, w - 2 * PX, h, PAL.ink);
  pxRect(dc, x0, y0 + PX, w, h - 2 * PX, PAL.ink);
  pxRect(dc, x0 + PX, y0 + PX, w - 2 * PX, h - 2 * PX, PAL.navy);
  // Crisp cyan-white pixel border trim
  pxRect(dc, x0 + PX, y0 + PX, w - 2 * PX, 3, PAL.skyLight);
  pxRect(dc, x0 + PX, y0 + h - PX - 3, w - 2 * PX, 3, PAL.sky);
  pxRect(dc, x0 + PX, y0 + PX, 3, h - 2 * PX, PAL.skyLight);
  pxRect(dc, x0 + w - PX - 3, y0 + PX, 3, h - 2 * PX, PAL.sky);

  const scoreVal = 2400 + coinsCollected * 200 + (landed ? 1000 : 0);
  const scoreStr = String(scoreVal).padStart(6, "0");
  const coinStr = `x${String(coinsCollected).padStart(2, "0")}`;
  const scoreFlash = landed && uAnim < 3.5 && posMod(Math.floor(uAnim * 10), 2) === 0;

  // Column 1: SCORE
  drawBitmapText(dc, "SCORE", 471, 48, 3, PAL.skyLight, PAL.ink);
  drawBitmapText(dc, scoreStr, 471, 75, 3, scoreFlash ? PAL.gold : PAL.white, PAL.ink);

  // Column 2: Diamond Coin Counter
  drawBitmapText(dc, "COINS", 603, 48, 3, PAL.skyLight, PAL.ink);
  // Mini pixel diamond icon
  const dx = 603;
  const dy = 75;
  pxRect(dc, dx + 6, dy, 3, 21, PAL.gold);
  pxRect(dc, dx + 3, dy + 3, 9, 15, PAL.gold);
  pxRect(dc, dx, dy + 6, 15, 9, PAL.ochre);
  pxRect(dc, dx + 3, dy + 6, 6, 9, PAL.gold);
  pxRect(dc, dx + 6, dy + 6, 3, 6, PAL.white);
  drawBitmapText(dc, coinStr, 624, 75, 3, PAL.white, PAL.ink);

  // Column 3: STAGE 16-B
  drawBitmapText(dc, "STAGE", 708, 48, 3, PAL.skyLight, PAL.ink);
  drawBitmapText(dc, "16-B", 708, 75, 3, PAL.white, PAL.ink);

  // Column 4: PELICAN Hearts (+1 after landing!)
  drawBitmapText(dc, "PELICAN", 813, 48, 3, PAL.skyLight, PAL.ink);
  for (let i = 0; i < 3; i++) {
    const hx = 813 + i * 24;
    const hy = 76;
    pxRect(dc, hx + 3, hy, 6, 3, PAL.crimson);
    pxRect(dc, hx + 12, hy, 6, 3, PAL.crimson);
    pxRect(dc, hx, hy + 3, 21, 6, PAL.crimson);
    pxRect(dc, hx + 3, hy + 9, 15, 3, PAL.crimson);
    pxRect(dc, hx + 6, hy + 12, 9, 3, PAL.crimson);
    pxRect(dc, hx + 9, hy + 15, 3, 3, PAL.crimson);
    pxRect(dc, hx + 3, hy + 3, 3, 3, PAL.blush);
  }
  if (landed) {
    const plusCol = posMod(Math.floor(uAnim * 8), 2) === 0 ? PAL.lime : PAL.gold;
    drawBitmapText(dc, "+1", 891, 75, 3, plusCol, PAL.ink);
  }
}

export default function render(ctx) {
  const { p, g, kit, localTime } = ctx;
  const u = localTime;
  const dc = g.drawingContext;

  // 12fps retro cartridge quantization with seamless 60fps portals (u <= 0.22 & u >= 5.78)
  const qBlend = smoothstep(0.22, 0.48, u) * (1 - smoothstep(5.52, 5.78, u));
  const uQuant = Math.floor(u * 12) / 12;
  const uAnim = lerp(u, uQuant, qBlend);
  const tAnim = 95.0 + uAnim;

  // Parabolic pit jump across u in [2.00, 3.00]
  const sJump = clamp((uAnim - 2.0) / 1.0, 0, 1);
  const jumpOffset = -4 * 176 * sJump * (1 - sJump);
  const wheelie = -0.26 * Math.sin(sJump * Math.PI);

  const px = getScenePelicanX(uAnim);
  const pose = getRigPose(tAnim, {
    x: px,
    y: ROAD_Y + jumpOffset,
    scale: 1.0,
    wheelie,
  });

  // 1. Baked static 8-bit backdrop (sky, snowy dithered peaks, watchtowers, ground, abyss pit)
  const backdrop = kit.bakeLayer("s16_8bit_backdrop_v2", BUFFER_W, BUFFER_H, bakeBackdrop);
  p.push();
  p.imageMode(p.CENTER);
  p.image(backdrop, 500, 500, BUFFER_W, BUFFER_H);
  p.pop();

  // 2. Crisp 2D pixel gameplay layers (zero anti-aliasing for image draws)
  dc.save();
  dc.imageSmoothingEnabled = false;

  drawClouds(dc, uAnim);
  drawPixelHedges(dc, uAnim);
  drawRuneBlocks(dc, uAnim);

  // 3 spinning gold diamond coins + 1 flashing crimson-gold star-berry
  const coins = [
    { x: 305, y: 596, idx: 0 },
    { x: 368, y: 554, idx: 1 },
    { x: 432, y: 584, idx: 2 },
  ];
  const berry = { x: 472, y: 628 };

  let coinsCollected = 0;
  const pendingBursts = [];
  for (const c of coins) {
    const triggerX = c.x - 16;
    if (px >= triggerX) {
      coinsCollected++;
      const uCollect = (triggerX - BLEED_LEFT) / ((BLEED_RIGHT - BLEED_LEFT) / 6);
      const dt = uAnim - uCollect;
      if (dt >= 0 && dt <= 0.48) {
        pendingBursts.push({ x: c.x, y: c.y, dt, tag: "+200", isBerry: false });
      }
    } else {
      const hoverY = Math.round(Math.sin(uAnim * 5 + c.idx * 1.4)) * PX;
      const spinFrame = posMod(Math.floor(uAnim * 8) + c.idx + 1, 4);
      drawSpinningCoin(dc, c.x, c.y + hoverY, spinFrame);
    }
  }

  const berryTriggerX = berry.x - 16;
  if (px >= berryTriggerX) {
    const uCollect = (berryTriggerX - BLEED_LEFT) / ((BLEED_RIGHT - BLEED_LEFT) / 6);
    const dt = uAnim - uCollect;
    if (dt >= 0 && dt <= 0.48) {
      pendingBursts.push({ x: berry.x, y: berry.y, dt, tag: "STAR!", isBerry: true });
    }
  } else {
    const berryHover = Math.round(Math.sin(uAnim * 6)) * PX;
    drawStarBerry(dc, berry.x, berry.y + berryHover, uAnim);
  }

  // Snap sprite origin cleanly to 6px grid inside cartridge region, smooth 60fps at portals
  const baseOriginY = ROAD_Y + jumpOffset;
  const snapOriginX = lerp(px, snap6(px), qBlend);
  const snapOriginY = lerp(baseOriginY, snap6(baseOriginY), qBlend);
  drawPixelPelicanRig(dc, pose, px, baseOriginY, snapOriginX, snapOriginY);

  // Foreground FX: collection sparkles/+200, landing dust clouds, and 1UP! banner
  for (const b of pendingBursts) {
    drawCollectBurst(dc, b.x, b.y, b.dt, b.tag, b.isBerry);
  }

  const landed = uAnim >= 2.98;
  if (landed) {
    drawLandingDust(dc, px, uAnim);
    drawOneUpBanner(dc, px, uAnim);
  }

  // Top-right fictional 8-bit HUD scoreboard
  drawEightBitHud(dc, coinsCollected, landed, uAnim);

  dc.restore();

  // 3. Era Title Card (top-left of canonical square)
  drawEraTitleCard(g, META, u);
}
