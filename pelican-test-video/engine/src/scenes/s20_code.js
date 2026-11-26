/**
 * Scene #20 — 代码美学 · Code Aesthetics (2020s · LLM Era), t in [119.0, 125.0).
 * Minimalist precision dark IDE & CAD vector workspace:
 * - Upper split glass IDE (DOM inspector + real-time telemetry on left, live SVG codegen on right)
 * - Lower stage unobstructed (y >= 430) for the progressive blueprint-to-silk-vector Pelican
 * - Portal-continuous across #19 -> #20 (u <= 0.18) and #20 -> Outro (u >= 5.82) along ROAD_Y = 730.
 */

import {
  BLEED_LEFT,
  ROAD_Y,
  clamp,
  getScenePelicanX,
  lerp,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[19];
const EXT_LEFT = -444;
const EXT_RIGHT = 1444;

const posMod = (v, m) => ((v % m) + m) % m;

function cubicBezierPt(p0, p1, p2, p3, s) {
  const u = 1 - s;
  return {
    x: u * u * u * p0.x + 3 * u * u * s * p1.x + 3 * u * s * s * p2.x + s * s * s * p3.x,
    y: u * u * u * p0.y + 3 * u * u * s * p1.y + 3 * u * s * s * p2.y + s * s * s * p3.y,
  };
}

function cubicBezierTangent(p0, p1, p2, p3, s) {
  const u = 1 - s;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * s * (p2.x - p1.x) + 3 * s * s * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * s * (p2.y - p1.y) + 3 * s * s * (p3.y - p2.y),
  };
}

function drawRoundedRectPath(dc, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  dc.beginPath();
  dc.moveTo(x + rr, y);
  dc.lineTo(x + w - rr, y);
  dc.quadraticCurveTo(x + w, y, x + w, y + rr);
  dc.lineTo(x + w, y + h - rr);
  dc.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  dc.lineTo(x + rr, y + h);
  dc.quadraticCurveTo(x, y + h, x, y + h - rr);
  dc.lineTo(x, y + rr);
  dc.quadraticCurveTo(x, y, x + rr, y);
  dc.closePath();
}

function drawGlowDot(dc, x, y, r, color, glowColor, alpha = 1) {
  dc.save();
  dc.globalAlpha *= alpha;
  dc.fillStyle = glowColor;
  dc.beginPath();
  dc.arc(x, y, Math.max(0.5, r * 2.4), 0, Math.PI * 2);
  dc.fill();
  dc.fillStyle = color;
  dc.beginPath();
  dc.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  dc.fill();
  dc.restore();
}

function drawSquareHandle(dc, x, y, size, strokeCol, fillCol = "#0d1117") {
  const half = size * 0.5;
  dc.fillStyle = fillCol;
  dc.fillRect(x - half, y - half, size, size);
  dc.strokeStyle = strokeCol;
  dc.lineWidth = 1.3;
  dc.strokeRect(x - half, y - half, size, size);
}

// GitHub-Dark tokenized SVG code lines (18 lines, max 54 chars each for crisp 1080p legibility)
const CODE_LINES = [
  [["<!-- LLM Codegen · pelican_finale.svg -->", "#7ee787"]],
  [
    ["<svg", "#ff7b72"],
    [" viewBox", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"0 0 1000 1000"', "#a5d6ff"],
    [">", "#ff7b72"],
  ],
  [
    ["  <g", "#ff7b72"],
    [" id", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"bicycle"', "#a5d6ff"],
    [" stroke", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"#79c0ff"', "#a5d6ff"],
    [">", "#ff7b72"],
  ],
  [
    ["    <circle", "#ff7b72"],
    [" id", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"wheel-rear"', "#a5d6ff"],
    [" r", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"62"', "#d2a8ff"],
    ["/>", "#ff7b72"],
  ],
  [
    ["    <circle", "#ff7b72"],
    [" id", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"wheel-front"', "#a5d6ff"],
    [" r", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"62"', "#d2a8ff"],
    ["/>", "#ff7b72"],
  ],
  [
    ["    <path", "#ff7b72"],
    [" id", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"frame-titanium"', "#a5d6ff"],
    [" d", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"M-86 -62 L-16 -58"', "#a5d6ff"],
    ["/>", "#ff7b72"],
  ],
  [["  </g>", "#ff7b72"]],
  [["  <defs>", "#ff7b72"]],
  [
    ["    <linearGradient", "#ff7b72"],
    [" id", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"silk-plumage"', "#a5d6ff"],
    [">", "#ff7b72"],
  ],
  [
    ["      <stop", "#ff7b72"],
    [" offset", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"0%"', "#d2a8ff"],
    [" stop-color", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"#ffffff"', "#a5d6ff"],
    ["/>", "#ff7b72"],
  ],
  [
    ["      <stop", "#ff7b72"],
    [" offset", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"100%"', "#d2a8ff"],
    [" stop-color", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"#8ab8f0"', "#a5d6ff"],
    ["/>", "#ff7b72"],
  ],
  [["    </linearGradient>", "#ff7b72"]],
  [
    ["    <filter", "#ff7b72"],
    [" id", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"lumina"', "#a5d6ff"],
    ["><feGaussianBlur/></filter>", "#ff7b72"],
  ],
  [["  </defs>", "#ff7b72"]],
  [
    ["  <g", "#ff7b72"],
    [" filter", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"url(#lumina)"', "#a5d6ff"],
    [">", "#ff7b72"],
  ],
  [
    ["    <path", "#ff7b72"],
    [" id", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"plumage"', "#a5d6ff"],
    [" fill", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"url(#silk-plumage)"', "#a5d6ff"],
    ["/>", "#ff7b72"],
  ],
  [
    ["    <path", "#ff7b72"],
    [" id", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"beak-pouch"', "#a5d6ff"],
    [" d", "#79c0ff"],
    ["=", "#e6edf3"],
    ['"M6 18 C40 64 90 58"', "#a5d6ff"],
    ["/>", "#ff7b72"],
  ],
  [["  </g></svg>", "#ff7b72"]],
];

const LINE_CHAR_COUNTS = CODE_LINES.map((tokens) =>
  tokens.reduce((sum, [txt]) => sum + txt.length, 0)
);
const TOTAL_CODE_CHARS = LINE_CHAR_COUNTS.reduce((a, b) => a + b, 0);

const DOM_NODES = [
  { id: "wheels", tag: '<circle id="wheels">', start: 0.28, done: 0.92, col: "#79c0ff" },
  { id: "frame", tag: '<path id="frame">', start: 0.85, done: 1.52, col: "#79c0ff" },
  { id: "plumage", tag: '<path id="plumage">', start: 1.48, done: 2.20, col: "#a5d6ff" },
  { id: "pouch", tag: '<path id="pouch">', start: 2.20, done: 2.84, col: "#f2cc60" },
];

/**
 * Baked static GitHub-Dark IDE / CAD blueprint backdrop (1840 x 1000, covering [-420..1420]).
 */
function bakeCodeWorkspace(pg) {
  const w = pg.width;
  const h = pg.height;
  const dc = pg.drawingContext;

  pg.background("#0d1117");
  pg.push();
  pg.translate(-BLEED_LEFT, 0);

  // Subtle ambient slate radial glow centered over the workspace stage
  const glow = dc.createRadialGradient(500, 520, 40, 500, 520, 820);
  glow.addColorStop(0, "#131922");
  glow.addColorStop(0.6, "#10151d");
  glow.addColorStop(1, "#0d1117");
  dc.fillStyle = glow;
  dc.fillRect(EXT_LEFT, 0, EXT_RIGHT - EXT_LEFT, h);

  // Subtle cyan atmospheric wash hovering slightly above ROAD_Y = 730
  const horizonGlow = dc.createLinearGradient(0, ROAD_Y - 120, 0, ROAD_Y);
  horizonGlow.addColorStop(0, "rgba(121, 192, 255, 0)");
  horizonGlow.addColorStop(1, "rgba(121, 192, 255, 0.045)");
  dc.fillStyle = horizonGlow;
  dc.fillRect(EXT_LEFT, ROAD_Y - 120, EXT_RIGHT - EXT_LEFT, 120);

  // Fine 50px CAD blueprint grid
  dc.strokeStyle = "#161b22";
  dc.lineWidth = 1;
  dc.beginPath();
  for (let gx = -400; gx <= 1400; gx += 50) {
    dc.moveTo(gx + 0.5, 0);
    dc.lineTo(gx + 0.5, h);
  }
  for (let gy = 50; gy < h; gy += 50) {
    dc.moveTo(EXT_LEFT, gy + 0.5);
    dc.lineTo(EXT_RIGHT, gy + 0.5);
  }
  dc.stroke();

  // Slightly clearer 200px structural CAD divisions
  dc.strokeStyle = "#1b222c";
  dc.lineWidth = 1;
  dc.beginPath();
  for (let gx = -400; gx <= 1400; gx += 200) {
    dc.moveTo(gx + 0.5, 0);
    dc.lineTo(gx + 0.5, h);
  }
  for (let gy = 200; gy <= 800; gy += 200) {
    dc.moveTo(EXT_LEFT, gy + 0.5);
    dc.lineTo(EXT_RIGHT, gy + 0.5);
  }
  dc.stroke();

  // Delicate 100px micro crosshairs (+)
  dc.strokeStyle = "#262d38";
  dc.lineWidth = 1.2;
  dc.beginPath();
  for (let gx = -400; gx <= 1400; gx += 100) {
    for (let gy = 100; gy <= 900; gy += 100) {
      dc.moveTo(gx - 4.5, gy);
      dc.lineTo(gx + 4.5, gy);
      dc.moveTo(gx, gy - 4.5);
      dc.lineTo(gx, gy + 4.5);
    }
  }
  dc.stroke();

  // Canonical 1000x1000 stage artboard boundary hairlines & corner crop marks
  dc.save();
  dc.strokeStyle = "rgba(121, 192, 255, 0.14)";
  dc.lineWidth = 1;
  dc.setLineDash([4, 6]);
  dc.beginPath();
  dc.moveTo(0.5, 18);
  dc.lineTo(0.5, ROAD_Y);
  dc.moveTo(1000.5, 18);
  dc.lineTo(1000.5, ROAD_Y);
  dc.stroke();
  dc.restore();

  // Dark precision road deck below ROAD_Y = 730 across [-444..1444]
  const deckGrad = dc.createLinearGradient(0, ROAD_Y, 0, h);
  deckGrad.addColorStop(0, "#1c232d");
  deckGrad.addColorStop(0.18, "#151b23");
  deckGrad.addColorStop(0.55, "#10141b");
  deckGrad.addColorStop(1, "#0d1117");
  dc.fillStyle = deckGrad;
  dc.fillRect(EXT_LEFT, ROAD_Y, EXT_RIGHT - EXT_LEFT, h - ROAD_Y);

  // Subtle lower structural rail hairline at y = 772
  dc.strokeStyle = "#28313e";
  dc.lineWidth = 1;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, ROAD_Y + 42);
  dc.lineTo(EXT_RIGHT, ROAD_Y + 42);
  dc.stroke();

  // Subtle repeating CAD rail grid ticks inside the deck band
  dc.strokeStyle = "rgba(121, 192, 255, 0.18)";
  dc.lineWidth = 1;
  dc.beginPath();
  for (let tx = -425; tx <= 1425; tx += 25) {
    const tickH = posMod(tx, 50) === 0 ? 8 : 4.5;
    dc.moveTo(tx + 0.5, ROAD_Y + 1);
    dc.lineTo(tx + 0.5, ROAD_Y + tickH);
  }
  dc.stroke();

  // Gold #f2cc60 major ticks every 100px along ROAD_Y
  dc.strokeStyle = "#f2cc60";
  dc.lineWidth = 1.6;
  dc.beginPath();
  for (let tx = -400; tx <= 1400; tx += 100) {
    dc.moveTo(tx + 0.5, ROAD_Y + 1);
    dc.lineTo(tx + 0.5, ROAD_Y + 13);
  }
  dc.stroke();

  // Glowing #79c0ff 2.5px crisp baseline rail strictly at ROAD_Y = 730
  dc.strokeStyle = "rgba(121, 192, 255, 0.14)";
  dc.lineWidth = 9;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, ROAD_Y);
  dc.lineTo(EXT_RIGHT, ROAD_Y);
  dc.stroke();

  dc.strokeStyle = "rgba(121, 192, 255, 0.34)";
  dc.lineWidth = 4.5;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, ROAD_Y);
  dc.lineTo(EXT_RIGHT, ROAD_Y);
  dc.stroke();

  dc.strokeStyle = "#79c0ff";
  dc.lineWidth = 2.5;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, ROAD_Y);
  dc.lineTo(EXT_RIGHT, ROAD_Y);
  dc.stroke();

  dc.strokeStyle = "#d9eeff";
  dc.lineWidth = 0.8;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, ROAD_Y - 0.5);
  dc.lineTo(EXT_RIGHT, ROAD_Y - 0.5);
  dc.stroke();

  // Crisp muted coordinate margin rulers (0, 200, 400, 600, 800, 1000)
  dc.font = "500 10.5px Menlo, Monaco, monospace";
  dc.fillStyle = "#566171";
  dc.textAlign = "center";
  dc.textBaseline = "top";
  for (let rx = -400; rx <= 1400; rx += 200) {
    const isCanonical = rx >= 0 && rx <= 1000;
    dc.fillStyle = isCanonical ? "#6e7b8e" : "#444d5b";
    dc.fillText(String(rx), rx, ROAD_Y + 18);
  }

  // Vertical Y-axis coordinate margin markers at canonical left edge (0..1000)
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  for (const ry of [0, 200, 400, 600, 800, 1000]) {
    const drawY = ry === 0 ? 11 : ry === 1000 ? 987 : ry;
    dc.fillStyle = "#546072";
    dc.fillText(String(ry), 12, drawY);
    if (ry > 0 && ry < 1000) {
      dc.strokeStyle = "#30363d";
      dc.lineWidth = 1;
      dc.beginPath();
      dc.moveTo(0, ry + 0.5);
      dc.lineTo(7, ry + 0.5);
      dc.stroke();
    }
  }

  // Subtle artboard viewBox annotation at top-right of canonical square
  dc.textAlign = "right";
  dc.textBaseline = "top";
  dc.fillStyle = "rgba(121, 192, 255, 0.34)";
  dc.fillText('viewBox="0 0 1000 1000"', 992, 10);

  pg.pop();
  void w;
}

/**
 * Computes knee bend angle in degrees from hip -> knee -> pedal.
 */
function computeKneeAngleDeg(pose) {
  const a1 = Math.atan2(pose.hip.y - pose.rightKnee.y, pose.hip.x - pose.rightKnee.x);
  const a2 = Math.atan2(pose.rightPedal.y - pose.rightKnee.y, pose.rightPedal.x - pose.rightKnee.x);
  let deg = Math.abs(((a2 - a1) * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

/**
 * Left Telemetry & SVG DOM Inspector Panel: x in [34, 402], y in [138, 416].
 */
function drawInspectorPanel(g, t, u, beat, px, pose, kneeDeg, uiAlpha) {
  if (uiAlpha <= 0.01) return;
  const dc = g.drawingContext;
  const x = 34;
  const y = 138;
  const w = 368;
  const h = 278;

  dc.save();
  dc.globalAlpha *= uiAlpha;

  // Soft shadow
  dc.fillStyle = "rgba(0, 0, 0, 0.45)";
  drawRoundedRectPath(dc, x + 4, y + 6, w, h, 8);
  dc.fill();

  // Frosted dark glass body
  dc.fillStyle = "rgba(22, 27, 34, 0.90)";
  drawRoundedRectPath(dc, x, y, w, h, 8);
  dc.fill();

  dc.strokeStyle = "#30363d";
  dc.lineWidth = 1.2;
  dc.stroke();

  // Subtle top glass rim highlight
  dc.strokeStyle = "rgba(255, 255, 255, 0.08)";
  dc.lineWidth = 1;
  dc.beginPath();
  dc.moveTo(x + 10, y + 1);
  dc.lineTo(x + w - 10, y + 1);
  dc.stroke();

  // Panel header bar
  dc.save();
  drawRoundedRectPath(dc, x, y, w, h, 8);
  dc.clip();
  dc.fillStyle = "rgba(28, 33, 40, 0.96)";
  dc.fillRect(x, y, w, 30);
  dc.strokeStyle = "#282e37";
  dc.lineWidth = 1;
  dc.beginPath();
  dc.moveTo(x, y + 30.5);
  dc.lineTo(x + w, y + 30.5);
  dc.stroke();
  dc.restore();

  dc.font = "600 11px Menlo, Monaco, monospace";
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  dc.fillStyle = "#79c0ff";
  dc.fillText("◈", x + 13, y + 15.5);
  dc.fillStyle = "#c9d1d9";
  dc.fillText("TELEMETRY & SVG DOM", x + 29, y + 15.5);

  // Beat-synced LIVE indicator
  const livePulse = 0.55 + 0.45 * beat.beatPulse;
  drawGlowDot(dc, x + w - 54, y + 15.5, 3, "#7ee787", `rgba(126, 231, 135, ${0.35 * livePulse})`, 1);
  dc.fillStyle = "#7ee787";
  dc.font = "600 10px Menlo, Monaco, monospace";
  dc.textAlign = "right";
  dc.fillText("LIVE", x + w - 14, y + 15.5);

  // Telemetry grid (2 columns x 3 rows)
  const wheelDeg = posMod((pose.wheelRot * 180) / Math.PI, 360);
  const telemetry = [
    ["t", `${t.toFixed(2)}s`, "#a5d6ff"],
    ["u", `${u.toFixed(2)}s`, "#a5d6ff"],
    ["pelican.x", `${px.toFixed(1)}`, "#79c0ff"],
    ["wheel.rot", `${wheelDeg.toFixed(0)}°`, "#d2a8ff"],
    ["IK.knee", `${kneeDeg.toFixed(1)}°`, "#f2cc60"],
    ["fps", "60.0", "#7ee787"],
  ];

  dc.font = "500 11.5px Menlo, Monaco, monospace";
  dc.textBaseline = "middle";
  for (let i = 0; i < telemetry.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cellX = x + 14 + col * 174;
    const cellY = y + 48 + row * 24;

    dc.fillStyle = "rgba(13, 17, 23, 0.58)";
    drawRoundedRectPath(dc, cellX, cellY - 9.5, 166, 20, 4);
    dc.fill();
    dc.strokeStyle = "#21262d";
    dc.lineWidth = 1;
    dc.stroke();

    const [label, val, valCol] = telemetry[i];
    dc.textAlign = "left";
    dc.fillStyle = "#8b949e";
    dc.fillText(`${label}:`, cellX + 8, cellY + 0.5);
    dc.textAlign = "right";
    dc.fillStyle = valCol;
    dc.fillText(val, cellX + 158, cellY + 0.5);
  }

  // Divider between telemetry & DOM tree
  dc.strokeStyle = "#282e37";
  dc.lineWidth = 1;
  dc.beginPath();
  dc.moveTo(x + 14, y + 123.5);
  dc.lineTo(x + w - 14, y + 123.5);
  dc.stroke();

  // Root SVG node
  dc.textAlign = "left";
  dc.font = "600 11px Menlo, Monaco, monospace";
  dc.fillStyle = "#ff7b72";
  dc.fillText("<svg", x + 16, y + 141);
  const wSvg = dc.measureText("<svg").width;
  dc.fillStyle = "#79c0ff";
  dc.fillText(" id=", x + 16 + wSvg, y + 141);
  const wId = dc.measureText(" id=").width;
  dc.fillStyle = "#a5d6ff";
  dc.fillText('"pelican-finale">', x + 16 + wSvg + wId, y + 141);

  // Interactive child DOM nodes lighting sequentially
  dc.font = "500 11.5px Menlo, Monaco, monospace";
  for (let i = 0; i < DOM_NODES.length; i++) {
    const node = DOM_NODES[i];
    const rowY = y + 167 + i * 26;
    const isDone = u >= node.done;
    const isActive = u >= node.start && u < node.done;
    const isStarted = u >= node.start;

    if (isActive || isDone) {
      dc.fillStyle = isActive ? "rgba(121, 192, 255, 0.12)" : "rgba(126, 231, 135, 0.06)";
      drawRoundedRectPath(dc, x + 28, rowY - 10.5, w - 42, 22, 4);
      dc.fill();
      if (isActive) {
        dc.fillStyle = "#79c0ff";
        dc.fillRect(x + 28, rowY - 10.5, 2.5, 22);
      }
    }

    // Tree connector glyph
    dc.strokeStyle = "#3b434e";
    dc.lineWidth = 1.1;
    dc.beginPath();
    dc.moveTo(x + 22, rowY - 14);
    dc.lineTo(x + 22, i === DOM_NODES.length - 1 ? rowY : rowY + 12);
    dc.moveTo(x + 22, rowY);
    dc.lineTo(x + 28, rowY);
    dc.stroke();

    // Node syntax text
    dc.textAlign = "left";
    const textX = x + 36;
    if (!isStarted) {
      dc.fillStyle = "#545d68";
      dc.fillText(node.tag, textX, rowY);
    } else {
      const splitIdx = node.tag.indexOf(" ");
      const tagPart = node.tag.slice(0, splitIdx);
      const attrPart = node.tag.slice(splitIdx);
      dc.fillStyle = "#ff7b72";
      dc.fillText(tagPart, textX, rowY);
      const tw = dc.measureText(tagPart).width;
      dc.fillStyle = node.col;
      dc.fillText(attrPart, textX + tw, rowY);
    }

    // Right status indicator
    dc.textAlign = "right";
    if (isDone) {
      drawGlowDot(dc, x + w - 46, rowY, 2.4, "#7ee787", "rgba(126, 231, 135, 0.28)", 1);
      dc.fillStyle = "#7ee787";
      dc.fillText("✓", x + w - 22, rowY);
    } else if (isActive) {
      const blink = 0.55 + 0.45 * Math.sin(u * 14);
      drawGlowDot(dc, x + w - 46, rowY, 2.4, "#f2cc60", `rgba(242, 204, 96, ${0.3 * blink})`, 1);
      dc.fillStyle = "#f2cc60";
      dc.fillText("⋯", x + w - 22, rowY);
    } else {
      dc.fillStyle = "#444c56";
      dc.fillText("○", x + w - 22, rowY);
    }
  }

  dc.restore();
}

/**
 * Right Main SVG Code Editor: x in [418, 968], y in [32, 422].
 */
function drawCodeEditor(g, u, uiAlpha) {
  if (uiAlpha <= 0.01) return;
  const dc = g.drawingContext;
  const x = 418;
  const y = 32;
  const w = 550;
  const h = 390;

  dc.save();
  dc.globalAlpha *= uiAlpha;

  // Soft shadow
  dc.fillStyle = "rgba(0, 0, 0, 0.48)";
  drawRoundedRectPath(dc, x + 5, y + 7, w, h, 8);
  dc.fill();

  // Editor background
  dc.fillStyle = "rgba(13, 17, 23, 0.94)";
  drawRoundedRectPath(dc, x, y, w, h, 8);
  dc.fill();
  dc.strokeStyle = "#30363d";
  dc.lineWidth = 1.2;
  dc.stroke();

  // Subtle top edge highlight
  dc.strokeStyle = "rgba(255, 255, 255, 0.08)";
  dc.lineWidth = 1;
  dc.beginPath();
  dc.moveTo(x + 10, y + 1);
  dc.lineTo(x + w - 10, y + 1);
  dc.stroke();

  // Clip interior chrome
  dc.save();
  drawRoundedRectPath(dc, x, y, w, h, 8);
  dc.clip();

  // Top IDE tab bar (32px)
  dc.fillStyle = "#161b22";
  dc.fillRect(x, y, w, 32);
  dc.strokeStyle = "#282e37";
  dc.lineWidth = 1;
  dc.beginPath();
  dc.moveTo(x, y + 32.5);
  dc.lineTo(x + w, y + 32.5);
  dc.stroke();

  // Window traffic-light dots
  const dotColors = ["#ff7b72", "#f2cc60", "#7ee787"];
  for (let i = 0; i < 3; i++) {
    dc.fillStyle = dotColors[i];
    dc.beginPath();
    dc.arc(x + 17 + i * 14, y + 16, 4.2, 0, Math.PI * 2);
    dc.fill();
  }

  // Active file tab
  dc.fillStyle = "#0d1117";
  dc.fillRect(x + 64, y + 2, 232, 30);
  dc.fillStyle = "#79c0ff";
  dc.fillRect(x + 64, y, 232, 2.2);
  dc.strokeStyle = "#282e37";
  dc.lineWidth = 1;
  dc.strokeRect(x + 64, y + 2, 232, 30);

  dc.font = "500 11.5px Menlo, Monaco, monospace";
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  dc.fillStyle = "#e6edf3";
  dc.fillText("pelican_finale.svg", x + 76, y + 17);
  dc.fillStyle = "#79c0ff";
  dc.font = "500 10px Menlo, Monaco, monospace";
  dc.fillText("· LLM Codegen", x + 206, y + 17);

  // Typing progress across u in [0.15, 3.40]
  const rawTypeProg = clamp((u - 0.15) / (3.40 - 0.15), 0, 1);
  const typeProg = Math.pow(rawTypeProg, 0.84);
  const charsTyped = Math.floor(typeProg * TOTAL_CODE_CHARS);

  // Header badge on right
  const pct = Math.round(typeProg * 100);
  dc.textAlign = "right";
  dc.fillStyle = pct >= 100 ? "#7ee787" : "#8b949e";
  dc.font = "500 10.5px Menlo, Monaco, monospace";
  dc.fillText(`SVG 2.0 · ${pct}%`, x + w - 14, y + 16.5);

  // Gutter column (x in [418..452], y in [64..394])
  const bodyTop = y + 32;
  const bodyH = h - 32 - 26;
  dc.fillStyle = "#11161d";
  dc.fillRect(x, bodyTop, 36, bodyH);
  dc.strokeStyle = "#21262d";
  dc.lineWidth = 1;
  dc.beginPath();
  dc.moveTo(x + 36.5, bodyTop);
  dc.lineTo(x + 36.5, bodyTop + bodyH);
  dc.stroke();

  // Locate active cursor line & column
  let remaining = charsTyped;
  let activeLine = 0;
  for (let i = 0; i < CODE_LINES.length; i++) {
    const len = LINE_CHAR_COUNTS[i];
    if (remaining <= len || i === CODE_LINES.length - 1) {
      activeLine = i;
      break;
    }
    remaining -= len;
  }

  const lineH = 17.8;
  const codeStartY = bodyTop + 14;
  const codeX = x + 46;

  // Highlight active cursor line
  const activeY = codeStartY + activeLine * lineH;
  dc.fillStyle = "rgba(56, 139, 253, 0.10)";
  dc.fillRect(x + 37, activeY - 8.5, w - 37, lineH);
  dc.fillStyle = "#79c0ff";
  dc.fillRect(x + 37, activeY - 8.5, 2, lineH);

  // Render line numbers & tokenized lines
  dc.font = "500 11.6px Menlo, Monaco, monospace";
  dc.textBaseline = "middle";

  let budget = charsTyped;
  let caretX = codeX;
  let caretY = activeY;

  for (let i = 0; i < CODE_LINES.length; i++) {
    const ly = codeStartY + i * lineH;
    // Line number
    dc.textAlign = "right";
    dc.fillStyle = i === activeLine ? "#79c0ff" : "#484f58";
    dc.fillText(String(i + 1).padStart(2, "0"), x + 29, ly);

    if (budget <= 0 && i > 0) continue;

    let curX = codeX;
    let lineRem = Math.min(budget, LINE_CHAR_COUNTS[i]);
    const isLineActive = i === activeLine;

    dc.textAlign = "left";
    for (const [txt, col] of CODE_LINES[i]) {
      if (lineRem <= 0) break;
      const chunk = lineRem >= txt.length ? txt : txt.slice(0, lineRem);
      dc.fillStyle = col;
      dc.fillText(chunk, curX, ly);
      curX += dc.measureText(chunk).width;
      lineRem -= chunk.length;
    }

    if (isLineActive) {
      caretX = curX + 1;
      caretY = ly;
    }
    budget -= LINE_CHAR_COUNTS[i];
  }

  // Blinking | caret
  const caretOn = posMod(u * 2.4, 1.0) < 0.62;
  if (caretOn) {
    dc.fillStyle = "#79c0ff";
    dc.fillRect(caretX, caretY - 7.5, 2, 14.5);
  }

  // Bottom editor status bar (y in [396..422])
  const barY = y + h - 26;
  const statusReady = smoothstep(2.85, 3.08, u);
  dc.fillStyle = statusReady > 0.05 ? `rgba(22, 42, 33, ${0.95 * statusReady + 0.05})` : "#161b22";
  if (statusReady < 0.99) {
    dc.fillStyle = "#161b22";
    dc.fillRect(x, barY, w, 26);
    if (statusReady > 0.01) {
      dc.fillStyle = `rgba(35, 134, 54, ${0.24 * statusReady})`;
      dc.fillRect(x, barY, w, 26);
    }
  } else {
    dc.fillStyle = "#14261d";
    dc.fillRect(x, barY, w, 26);
  }

  dc.strokeStyle = statusReady > 0.5 ? "rgba(126, 231, 135, 0.35)" : "#282e37";
  dc.lineWidth = 1;
  dc.beginPath();
  dc.moveTo(x, barY + 0.5);
  dc.lineTo(x + w, barY + 0.5);
  dc.stroke();

  dc.font = "500 11px Menlo, Monaco, monospace";
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  dc.fillStyle = statusReady > 0.5 ? "#a5d6ff" : "#8b949e";
  dc.fillText("UTF-8 · SVG 2.0", x + 14, barY + 13.5);

  dc.textAlign = "right";
  if (statusReady > 0.02) {
    const statusText = "✓ render: 100% · 60fps verified";
    dc.font = "600 11px Menlo, Monaco, monospace";
    const textW = dc.measureText(statusText).width;
    const glowA = 0.35 * statusReady;
    drawGlowDot(dc, x + w - 14 - textW - 11, barY + 13.5, 2.5, "#7ee787", `rgba(126, 231, 135, ${glowA})`, statusReady);
    dc.fillStyle = "#7ee787";
    dc.fillText(statusText, x + w - 14, barY + 13.5);
  } else {
    dc.fillStyle = "#f2cc60";
    dc.fillText(`generating paths... ${pct}%`, x + w - 14, barY + 13.5);
  }

  dc.restore();
  dc.restore();
}

/**
 * CAD Construction Circles, IK Knee Arc, Live Bezier Handles, and IDE Leader Lines.
 */
function drawBlueprintGuides(g, u, px, pose, kneeDeg, guideAlpha) {
  if (guideAlpha <= 0.01) return;
  const dc = g.drawingContext;
  const s = pose.scale;

  dc.save();

  // 1. Delicate 0.8px leader lines from Inspector / Code Editor to active Pelican SVG parts
  const leaderVis =
    smoothstep(220, 295, px) *
    (1 - smoothstep(805, 880, px)) *
    smoothstep(0.18, 0.45, u) *
    (1 - smoothstep(5.50, 5.85, u));

  if (leaderVis > 0.01) {
    const lAlpha = leaderVis * lerp(0.85, 0.42, smoothstep(2.4, 3.2, u));
    dc.save();
    dc.globalAlpha *= lAlpha;
    dc.lineWidth = 0.8;

    // Leader 1: Left Inspector -> Wing Elbow / Shoulder
    const src1 = { x: 296, y: 416 };
    const dst1 = pose.wingElbow;
    dc.strokeStyle = "#79c0ff";
    dc.setLineDash([4, 4]);
    dc.beginPath();
    dc.moveTo(src1.x, src1.y);
    dc.lineTo(dst1.x, dst1.y);
    dc.stroke();
    dc.setLineDash([]);
    drawGlowDot(dc, src1.x, src1.y, 2.2, "#79c0ff", "rgba(121, 192, 255, 0.35)", 1);
    dc.beginPath();
    dc.arc(dst1.x, dst1.y, 4.5, 0, Math.PI * 2);
    dc.stroke();

    // Leader 2: Right Code Editor -> Throat Pouch Mid
    const src2 = { x: 642, y: 422 };
    const dst2 = pose.pouchMid;
    dc.strokeStyle = "#f2cc60";
    dc.setLineDash([4, 4]);
    dc.beginPath();
    dc.moveTo(src2.x, src2.y);
    dc.lineTo(dst2.x, dst2.y);
    dc.stroke();
    dc.setLineDash([]);
    drawGlowDot(dc, src2.x, src2.y, 2.2, "#f2cc60", "rgba(242, 204, 96, 0.35)", 1);
    dc.beginPath();
    dc.arc(dst2.x, dst2.y, 4.5, 0, Math.PI * 2);
    dc.stroke();
    dc.restore();
  }

  dc.globalAlpha *= guideAlpha;

  // 2. Architectural construction circles & rotating angle degree ticks around wheels
  const drawWheelGuide = (hub, label, labelSide) => {
    const outerR = pose.wheelRadius + 12 * s;
    const innerR = pose.wheelRadius * 0.62;

    // Outer cyan dashed CAD circle
    dc.save();
    dc.strokeStyle = "#79c0ff";
    dc.lineWidth = 1.1;
    dc.setLineDash([5, 4]);
    dc.beginPath();
    dc.arc(hub.x, hub.y, Math.max(0.5, outerR), 0, Math.PI * 2);
    dc.stroke();

    // Inner golden pitch circle
    dc.strokeStyle = "#f2cc60";
    dc.lineWidth = 0.9;
    dc.setLineDash([3, 5]);
    dc.beginPath();
    dc.arc(hub.x, hub.y, Math.max(0.5, innerR), 0, Math.PI * 2);
    dc.stroke();
    dc.setLineDash([]);

    // Rotating angle degree ticks (every 30 deg)
    dc.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 6;
      const major = i % 3 === 0;
      const r0 = outerR - (major ? 4 : 2);
      const r1 = outerR + (major ? 6 : 3);
      dc.moveTo(hub.x + Math.cos(a) * r0, hub.y + Math.sin(a) * r0);
      dc.lineTo(hub.x + Math.cos(a) * r1, hub.y + Math.sin(a) * r1);
    }
    dc.strokeStyle = "#f2cc60";
    dc.lineWidth = 1.1;
    dc.stroke();

    // Tangent contact datum crosshair on ROAD_Y
    dc.strokeStyle = "#79c0ff";
    dc.lineWidth = 1;
    dc.beginPath();
    dc.moveTo(hub.x - 10, ROAD_Y);
    dc.lineTo(hub.x + 10, ROAD_Y);
    dc.moveTo(hub.x, ROAD_Y - 5);
    dc.lineTo(hub.x, ROAD_Y + 5);
    dc.stroke();

    // Dimension callout with crisp dark pill backing
    dc.font = "500 10.5px Menlo, Monaco, monospace";
    const tw = dc.measureText(label).width;
    const lx = hub.x + labelSide * (outerR + 8);
    const ly = hub.y + 34;
    const pillX = labelSide < 0 ? lx - tw - 6 : lx - 4;
    dc.fillStyle = "rgba(13, 17, 23, 0.82)";
    drawRoundedRectPath(dc, pillX, ly - 8, tw + 10, 16, 3);
    dc.fill();
    dc.fillStyle = labelSide < 0 ? "#f2cc60" : "#79c0ff";
    dc.textAlign = labelSide < 0 ? "right" : "left";
    dc.textBaseline = "middle";
    dc.fillText(label, lx, ly + 0.5);
    dc.restore();
  };

  drawWheelGuide(pose.rearHub, "r=62", -1);
  drawWheelGuide(pose.frontHub, `cx=${Math.round(pose.frontHub.x)}`, 1);

  // 3. IK_knee angle callout arc near pose.rightKnee
  {
    const k = pose.rightKnee;
    const aThigh = Math.atan2(pose.hip.y - k.y, pose.hip.x - k.x);
    const aShin = Math.atan2(pose.rightPedal.y - k.y, pose.rightPedal.x - k.x);
    let diff = posMod(aShin - aThigh, Math.PI * 2);
    const ccw = diff > Math.PI;

    dc.save();
    dc.strokeStyle = "#f2cc60";
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.arc(k.x, k.y, 20 * s, aThigh, aShin, ccw);
    dc.stroke();

    // Joint ring
    dc.fillStyle = "#0d1117";
    dc.beginPath();
    dc.arc(k.x, k.y, 3.8, 0, Math.PI * 2);
    dc.fill();
    dc.strokeStyle = "#f2cc60";
    dc.lineWidth = 1.4;
    dc.stroke();

    // Elbow leader + IK_knee angle tag with crisp dark pill backing
    const tx = k.x + 28;
    const ty = k.y - 26;
    const tagText = `IK_knee ${kneeDeg.toFixed(0)}°`;
    dc.font = "500 10.5px Menlo, Monaco, monospace";
    const tagW = dc.measureText(tagText).width;

    dc.strokeStyle = "rgba(242, 204, 96, 0.78)";
    dc.lineWidth = 1;
    dc.beginPath();
    dc.moveTo(k.x + 4, k.y - 3);
    dc.lineTo(tx - 4, ty);
    dc.lineTo(tx, ty);
    dc.stroke();

    dc.fillStyle = "rgba(13, 17, 23, 0.88)";
    drawRoundedRectPath(dc, tx, ty - 9, tagW + 10, 17, 3);
    dc.fill();
    dc.strokeStyle = "rgba(242, 204, 96, 0.45)";
    dc.lineWidth = 0.9;
    dc.stroke();

    dc.fillStyle = "#f2cc60";
    dc.textAlign = "left";
    dc.textBaseline = "middle";
    dc.fillText(tagText, tx + 5, ty);
    dc.restore();
  }

  // 4. Live Cubic Bezier Tangent Handles (S-neck, wing curve, and gular throat pouch)
  const drawBezierHandles = (p0, c1, c2, p3, color) => {
    dc.save();
    dc.strokeStyle = color;
    dc.lineWidth = 1;
    dc.setLineDash([3.5, 3]);
    dc.beginPath();
    dc.moveTo(p0.x, p0.y);
    dc.lineTo(c1.x, c1.y);
    dc.moveTo(p3.x, p3.y);
    dc.lineTo(c2.x, c2.y);
    dc.stroke();
    dc.setLineDash([]);

    drawSquareHandle(dc, c1.x, c1.y, 5.2, color);
    drawSquareHandle(dc, c2.x, c2.y, 5.2, color);
    drawGlowDot(dc, p0.x, p0.y, 2.3, color, "rgba(121, 192, 255, 0.25)", 1);
    drawGlowDot(dc, p3.x, p3.y, 2.3, color, "rgba(121, 192, 255, 0.25)", 1);
    dc.restore();
  };

  // S-neck handles
  const neckC1 = { x: pose.neckBase.x + 14 * s, y: pose.neckBase.y - 28 * s };
  const neckC2 = { x: pose.head.x - 16 * s, y: pose.head.y + 24 * s };
  drawBezierHandles(pose.neckBase, neckC1, neckC2, pose.head, "#79c0ff");

  // Wing handles
  const wingStart = { x: pose.shoulder.x - 8 * s, y: pose.shoulder.y - 6 * s };
  const wingEnd = { x: pose.barGrip.x + 2 * s, y: pose.barGrip.y + 2 * s };
  const wingC1 = { x: pose.wingElbow.x - 10 * s, y: pose.wingElbow.y + 18 * s };
  const wingC2 = { x: pose.barGrip.x - 12 * s, y: pose.barGrip.y + 16 * s };
  drawBezierHandles(wingStart, wingC1, wingC2, wingEnd, "#79c0ff");

  // Throat pouch handles
  const pouchEnd = { x: pose.beakTip.x - 4 * s, y: pose.beakTip.y + 4 * s };
  const pouchC1 = { x: pose.pouchMid.x - 16 * s, y: pose.pouchMid.y + 12 * s };
  const pouchC2 = { x: pose.pouchMid.x + 34 * s, y: pose.pouchMid.y + 6 * s };
  drawBezierHandles(pose.pouchBase, pouchC1, pouchC2, pouchEnd, "#f2cc60");
  drawGlowDot(dc, pose.pouchMid.x, pose.pouchMid.y, 2.4, "#f2cc60", "rgba(242, 204, 96, 0.32)", 1);

  dc.restore();
}

/**
 * Draws the progressive CAD wireframe skeleton + finished multi-gradient silk vector Pelican & Bicycle.
 */
function drawCodePelicanRig(g, u, pose, bikeSolid, fillAlpha) {
  const dc = g.drawingContext;
  const s = pose.scale;

  const neckC1 = { x: pose.neckBase.x + 14 * s, y: pose.neckBase.y - 28 * s };
  const neckC2 = { x: pose.head.x - 16 * s, y: pose.head.y + 24 * s };

  // Road contact shadow / cyan rail illumination directly under tires
  dc.save();
  for (const hub of [pose.rearHub, pose.frontHub]) {
    const cg = dc.createRadialGradient(hub.x, ROAD_Y, 1, hub.x, ROAD_Y, 32 * s);
    cg.addColorStop(0, "rgba(121, 192, 255, 0.42)");
    cg.addColorStop(0.5, "rgba(121, 192, 255, 0.14)");
    cg.addColorStop(1, "rgba(121, 192, 255, 0)");
    dc.fillStyle = cg;
    dc.fillRect(hub.x - 34 * s, ROAD_Y - 12 * s, 68 * s, 24 * s);
  }
  dc.restore();

  // Helper: draws a brushed cyan-silver titanium frame tube
  const drawTitaniumTube = (pA, pB, widthScale = 1.0) => {
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 0.9 * s;
    const ny = (dx / len) * 0.9 * s;

    dc.save();
    dc.lineCap = "round";
    dc.lineJoin = "round";

    // Deep steel under-stroke
    dc.strokeStyle = "#314154";
    dc.lineWidth = 6.4 * widthScale * s;
    dc.beginPath();
    dc.moveTo(pA.x, pA.y);
    dc.lineTo(pB.x, pB.y);
    dc.stroke();

    // Brushed titanium mid body
    dc.strokeStyle = "#8bb6dd";
    dc.lineWidth = 3.8 * widthScale * s;
    dc.beginPath();
    dc.moveTo(pA.x, pA.y);
    dc.lineTo(pB.x, pB.y);
    dc.stroke();

    // Crisp white/cyan axial specular highlight
    dc.strokeStyle = "#e6f4ff";
    dc.lineWidth = 1.25 * widthScale * s;
    dc.beginPath();
    dc.moveTo(pA.x + nx, pA.y + ny);
    dc.lineTo(pB.x + nx, pB.y + ny);
    dc.stroke();
    dc.restore();
  };

  // Helper: draws 12-spoke wheel with cyan rim glow + gold hub
  const drawPrecisionWheel = (hub, solidAlpha, wireAlpha) => {
    const R = pose.wheelRadius;
    if (wireAlpha > 0.01) {
      dc.save();
      dc.globalAlpha *= wireAlpha;
      dc.strokeStyle = "#79c0ff";
      dc.lineWidth = 1.8 * s;
      dc.beginPath();
      dc.arc(hub.x, hub.y, Math.max(0.5, R), 0, Math.PI * 2);
      dc.stroke();
      dc.strokeStyle = "rgba(121, 192, 255, 0.55)";
      dc.lineWidth = 1.0 * s;
      dc.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = pose.wheelRot + (i * Math.PI) / 6;
        dc.moveTo(hub.x, hub.y);
        dc.lineTo(hub.x + Math.cos(a) * (R - 2 * s), hub.y + Math.sin(a) * (R - 2 * s));
      }
      dc.stroke();
      dc.restore();
    }

    if (solidAlpha > 0.01) {
      dc.save();
      dc.globalAlpha *= solidAlpha;

      // 12 crisp radial spokes
      dc.strokeStyle = "rgba(195, 224, 250, 0.72)";
      dc.lineWidth = 1.25 * s;
      dc.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = pose.wheelRot + (i * Math.PI) / 6;
        dc.moveTo(hub.x, hub.y);
        dc.lineTo(hub.x + Math.cos(a) * (R - 4 * s), hub.y + Math.sin(a) * (R - 4 * s));
      }
      dc.stroke();

      // Subtle cyan outer rim glow
      dc.strokeStyle = "rgba(121, 192, 255, 0.24)";
      dc.lineWidth = 10 * s;
      dc.beginPath();
      dc.arc(hub.x, hub.y, Math.max(0.5, R), 0, Math.PI * 2);
      dc.stroke();

      // Tire body
      dc.strokeStyle = "#192029";
      dc.lineWidth = 6.2 * s;
      dc.beginPath();
      dc.arc(hub.x, hub.y, Math.max(0.5, R), 0, Math.PI * 2);
      dc.stroke();

      // Inner brushed cyan-alloy rim ring
      dc.strokeStyle = "#8bc8ff";
      dc.lineWidth = 1.9 * s;
      dc.beginPath();
      dc.arc(hub.x, hub.y, Math.max(0.5, R - 3.0 * s), 0, Math.PI * 2);
      dc.stroke();

      // Gold-brass wheel hub + jewel center
      const hubGrad = dc.createRadialGradient(hub.x - 1.5, hub.y - 1.5, 0.5, hub.x, hub.y, 7 * s);
      hubGrad.addColorStop(0, "#fff2bd");
      hubGrad.addColorStop(0.5, "#f2cc60");
      hubGrad.addColorStop(1, "#b47d24");
      dc.fillStyle = hubGrad;
      dc.beginPath();
      dc.arc(hub.x, hub.y, Math.max(0.5, 6.2 * s), 0, Math.PI * 2);
      dc.fill();
      dc.fillStyle = "#161b22";
      dc.beginPath();
      dc.arc(hub.x, hub.y, Math.max(0.5, 2.0 * s), 0, Math.PI * 2);
      dc.fill();

      dc.restore();
    }
  };

  // --- LAYER 1: Back Leg & Rear Crank ---
  const wireLegAlpha = clamp(1 - fillAlpha * 0.9, 0, 1);
  if (wireLegAlpha > 0.01) {
    dc.save();
    dc.globalAlpha *= wireLegAlpha * 0.85;
    dc.strokeStyle = "#f2cc60";
    dc.lineWidth = 2.0 * s;
    dc.setLineDash([4, 3]);
    dc.beginPath();
    dc.moveTo(pose.hip.x, pose.hip.y);
    dc.lineTo(pose.leftKnee.x, pose.leftKnee.y);
    dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
    dc.stroke();
    dc.restore();
  }
  if (fillAlpha > 0.01) {
    dc.save();
    dc.globalAlpha *= fillAlpha;
    dc.lineCap = "round";
    dc.lineJoin = "round";
    dc.strokeStyle = "#944d15";
    dc.lineWidth = 7.2 * s;
    dc.beginPath();
    dc.moveTo(pose.hip.x, pose.hip.y);
    dc.lineTo(pose.leftKnee.x, pose.leftKnee.y);
    dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
    dc.stroke();
    dc.strokeStyle = "#c97428";
    dc.lineWidth = 4.4 * s;
    dc.stroke();
    dc.restore();
  }

  // Rear crank & left pedal
  if (bikeSolid > 0.01) {
    dc.save();
    dc.globalAlpha *= bikeSolid;
    dc.strokeStyle = "#485769";
    dc.lineWidth = 3.8 * s;
    dc.lineCap = "round";
    dc.beginPath();
    dc.moveTo(pose.bb.x, pose.bb.y);
    dc.lineTo(pose.leftPedal.x, pose.leftPedal.y);
    dc.stroke();
    dc.fillStyle = "#222933";
    drawRoundedRectPath(dc, pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s, 2 * s);
    dc.fill();
    dc.restore();
  }

  // --- LAYER 2: Bicycle Wheels & Frame ---
  const bikeWire = clamp(1 - bikeSolid * 0.85, 0, 1);
  drawPrecisionWheel(pose.rearHub, bikeSolid, bikeWire);
  drawPrecisionWheel(pose.frontHub, bikeSolid, bikeWire);

  const frameSegments = [
    [pose.rearHub, pose.bb, 0.86],
    [pose.rearHub, pose.seatCluster, 0.84],
    [pose.bb, pose.seatCluster, 0.96],
    [pose.seatCluster, pose.headTop, 0.98],
    [pose.bb, pose.headBot, 1.0],
    [pose.frontHub, pose.headTop, 0.92],
    [pose.headTop, pose.stemTop, 0.88],
    [pose.stemTop, pose.barGrip, 0.85],
    [
      pose.seatCluster,
      { x: (pose.saddleRear.x + pose.saddleFront.x) * 0.5, y: pose.saddleRear.y + 3 * s },
      0.78,
    ],
  ];

  // Frame wireframe in Bar 1
  if (bikeWire > 0.01) {
    dc.save();
    dc.globalAlpha *= bikeWire;
    dc.strokeStyle = "#79c0ff";
    dc.lineWidth = 2.1 * s;
    dc.lineCap = "round";
    dc.beginPath();
    for (const [a, b] of frameSegments) {
      dc.moveTo(a.x, a.y);
      dc.lineTo(b.x, b.y);
    }
    dc.stroke();
    for (const j of [pose.bb, pose.seatCluster, pose.headTop, pose.headBot, pose.barGrip]) {
      drawGlowDot(dc, j.x, j.y, 2.8, "#f2cc60", "rgba(242, 204, 96, 0.3)", 1);
    }
    dc.restore();
  }

  // Brushed titanium frame + warm gold-brass fittings
  if (bikeSolid > 0.01) {
    dc.save();
    dc.globalAlpha *= bikeSolid;
    for (const [a, b, ws] of frameSegments) {
      drawTitaniumTube(a, b, ws);
    }

    // Gold-brass headset & stem accents
    for (const gp of [pose.headTop, pose.headBot, pose.stemTop, pose.seatCluster]) {
      dc.fillStyle = "#f2cc60";
      dc.beginPath();
      dc.arc(gp.x, gp.y, Math.max(0.5, 3.3 * s), 0, Math.PI * 2);
      dc.fill();
    }

    // Sculpted saddle
    dc.strokeStyle = "#f2cc60";
    dc.lineWidth = 2.0 * s;
    dc.beginPath();
    dc.moveTo(pose.saddleRear.x + 6 * s, pose.saddleRear.y + 3.5 * s);
    dc.lineTo(pose.saddleFront.x - 4 * s, pose.saddleFront.y + 3.5 * s);
    dc.stroke();

    dc.strokeStyle = "#19202a";
    dc.lineWidth = 7.5 * s;
    dc.lineCap = "round";
    dc.beginPath();
    dc.moveTo(pose.saddleRear.x, pose.saddleRear.y);
    dc.lineTo(pose.saddleFront.x, pose.saddleFront.y);
    dc.stroke();
    dc.strokeStyle = "#48586b";
    dc.lineWidth = 2.0 * s;
    dc.beginPath();
    dc.moveTo(pose.saddleRear.x + 2 * s, pose.saddleRear.y - 2 * s);
    dc.lineTo(pose.saddleFront.x - 2 * s, pose.saddleFront.y - 1.5 * s);
    dc.stroke();

    // Gold-brass chainring & crank spider
    const crGrad = dc.createRadialGradient(pose.bb.x - 2, pose.bb.y - 2, 1, pose.bb.x, pose.bb.y, 11 * s);
    crGrad.addColorStop(0, "#fff2bd");
    crGrad.addColorStop(0.55, "#f2cc60");
    crGrad.addColorStop(1, "#b67e22");
    dc.fillStyle = crGrad;
    dc.beginPath();
    dc.arc(pose.bb.x, pose.bb.y, Math.max(0.5, 10.5 * s), 0, Math.PI * 2);
    dc.fill();
    dc.fillStyle = "#171d26";
    dc.beginPath();
    dc.arc(pose.bb.x, pose.bb.y, Math.max(0.5, 5.2 * s), 0, Math.PI * 2);
    dc.fill();
    dc.fillStyle = "#f2cc60";
    dc.beginPath();
    dc.arc(pose.bb.x, pose.bb.y, Math.max(0.5, 2.2 * s), 0, Math.PI * 2);
    dc.fill();

    // Gold-brass bicycle bell
    const bellGrad = dc.createRadialGradient(
      pose.bellPos.x - 1.5,
      pose.bellPos.y - 2,
      0.5,
      pose.bellPos.x,
      pose.bellPos.y,
      6 * s
    );
    bellGrad.addColorStop(0, "#fff8d6");
    bellGrad.addColorStop(0.55, "#f2cc60");
    bellGrad.addColorStop(1, "#bc7e1e");
    dc.fillStyle = bellGrad;
    dc.beginPath();
    dc.arc(pose.bellPos.x, pose.bellPos.y, Math.max(0.5, 5.2 * s), 0, Math.PI * 2);
    dc.fill();
    dc.strokeStyle = "#7a5010";
    dc.lineWidth = 1.0 * s;
    dc.stroke();

    dc.restore();
  }

  // --- Shared Pelican Vector Paths ---
  const traceBodyPath = () => {
    dc.beginPath();
    dc.moveTo(pose.tailTip.x - 10 * s, pose.tailTip.y - 4 * s);
    dc.bezierCurveTo(
      pose.bodyCenter.x - 42 * s,
      pose.bodyCenter.y - 29 * s,
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
      pose.tailTip.x - 4 * s,
      pose.tailTip.y + 6 * s
    );
    // Crisp sculpted forked tail feathers
    dc.lineTo(pose.tailTip.x - 14 * s, pose.tailTip.y + 9 * s);
    dc.lineTo(pose.tailTip.x - 6 * s, pose.tailTip.y + 2 * s);
    dc.lineTo(pose.tailTip.x - 18 * s, pose.tailTip.y + 2 * s);
    dc.lineTo(pose.tailTip.x - 7 * s, pose.tailTip.y - 2 * s);
    dc.closePath();
  };

  const getNeckEdgePoints = () => {
    const steps = 14;
    const leftPts = [];
    const rightPts = [];
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const center = cubicBezierPt(pose.neckBase, neckC1, neckC2, pose.head, k);
      const tang = cubicBezierTangent(pose.neckBase, neckC1, neckC2, pose.head, k);
      const len = Math.hypot(tang.x, tang.y) || 1;
      const nx = -tang.y / len;
      const ny = tang.x / len;
      const halfW = lerp(12.8, 9.4, k) * s;
      leftPts.push({ x: center.x + nx * halfW, y: center.y + ny * halfW });
      rightPts.push({ x: center.x - nx * halfW, y: center.y - ny * halfW });
    }
    return { leftPts, rightPts };
  };

  const traceNeckTaperedPath = () => {
    const { leftPts, rightPts } = getNeckEdgePoints();
    dc.beginPath();
    dc.moveTo(leftPts[0].x, leftPts[0].y);
    for (let i = 1; i < leftPts.length; i++) dc.lineTo(leftPts[i].x, leftPts[i].y);
    for (let i = rightPts.length - 1; i >= 0; i--) dc.lineTo(rightPts[i].x, rightPts[i].y);
    dc.closePath();
  };

  const strokeNeckOuterEdges = (strokeCol, lineW) => {
    const { leftPts, rightPts } = getNeckEdgePoints();
    dc.strokeStyle = strokeCol;
    dc.lineWidth = lineW;
    dc.beginPath();
    dc.moveTo(leftPts[0].x, leftPts[0].y);
    for (let i = 1; i < leftPts.length; i++) dc.lineTo(leftPts[i].x, leftPts[i].y);
    dc.stroke();
    dc.beginPath();
    dc.moveTo(rightPts[0].x, rightPts[0].y);
    for (let i = 1; i < rightPts.length; i++) dc.lineTo(rightPts[i].x, rightPts[i].y);
    dc.stroke();
  };

  const tracePouchPath = () => {
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

  const traceUpperMandiblePath = () => {
    dc.beginPath();
    dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
    dc.quadraticCurveTo(
      (pose.beakBaseTop.x + pose.beakTip.x) * 0.55,
      (pose.beakBaseTop.y + pose.beakTip.y) * 0.5 - 3 * s,
      pose.beakTip.x,
      pose.beakTip.y
    );
    dc.quadraticCurveTo(pose.beakHook.x + 1.5 * s, pose.beakHook.y - 3 * s, pose.beakHook.x, pose.beakHook.y);
    dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
    dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
    dc.closePath();
  };

  const traceWingCovertPath = () => {
    dc.beginPath();
    dc.moveTo(pose.shoulder.x - 10 * s, pose.shoulder.y - 7 * s);
    dc.bezierCurveTo(
      pose.wingElbow.x - 10 * s,
      pose.wingElbow.y + 16 * s,
      pose.barGrip.x - 12 * s,
      pose.barGrip.y + 14 * s,
      pose.barGrip.x + 3 * s,
      pose.barGrip.y + 2 * s
    );
    dc.bezierCurveTo(
      pose.wingElbow.x + 9 * s,
      pose.wingElbow.y - 8 * s,
      pose.shoulder.x + 12 * s,
      pose.shoulder.y - 11 * s,
      pose.shoulder.x - 10 * s,
      pose.shoulder.y - 7 * s
    );
    dc.closePath();
  };

  // --- LAYER 3: Luminous CAD Blueprint Wireframe Pelican (fades gracefully as silk fills in) ---
  const birdWireAlpha = clamp(1 - fillAlpha * 0.85, 0, 1);
  if (birdWireAlpha > 0.01) {
    dc.save();
    dc.globalAlpha *= birdWireAlpha;
    dc.lineCap = "round";
    dc.lineJoin = "round";

    // Body, S-neck, head, wing in luminous cyan #79c0ff
    dc.strokeStyle = "#79c0ff";
    dc.lineWidth = 1.8 * s;
    traceBodyPath();
    dc.stroke();
    strokeNeckOuterEdges("#79c0ff", 1.8 * s);
    traceWingCovertPath();
    dc.stroke();

    dc.beginPath();
    dc.arc(pose.head.x, pose.head.y, Math.max(0.5, 17 * s), Math.PI * 0.72, Math.PI * 2.12);
    dc.stroke();

    // Crest wireframe
    dc.beginPath();
    dc.moveTo(pose.head.x - 6 * s, pose.head.y - 15 * s);
    dc.lineTo(pose.crest1.x, pose.crest1.y);
    dc.lineTo(pose.head.x - 10 * s, pose.head.y - 11 * s);
    dc.moveTo(pose.head.x + 2 * s, pose.head.y - 16 * s);
    dc.lineTo(pose.crest2.x, pose.crest2.y);
    dc.stroke();

    // Throat pouch & mandible in radiant gold #f2cc60
    dc.strokeStyle = "#f2cc60";
    dc.lineWidth = 1.9 * s;
    tracePouchPath();
    dc.stroke();
    traceUpperMandiblePath();
    dc.stroke();

    // Eye wireframe circle
    dc.beginPath();
    dc.arc(pose.eye.x, pose.eye.y, Math.max(0.5, 4.8 * s), 0, Math.PI * 2);
    dc.stroke();

    dc.restore();
  }

  // --- LAYER 4: Sculpted Multi-Gradient Vector Silk Pelican ---
  if (fillAlpha > 0.01) {
    dc.save();
    dc.globalAlpha *= fillAlpha;
    dc.lineCap = "round";
    dc.lineJoin = "round";

    // 4a. Torso & forked tail silk plumage
    const bodyGrad = dc.createLinearGradient(
      pose.bodyCenter.x + 20 * s,
      pose.bodyCenter.y - 38 * s,
      pose.tailTip.x - 14 * s,
      pose.hip.y + 18 * s
    );
    bodyGrad.addColorStop(0, "#ffffff");
    bodyGrad.addColorStop(0.45, "#e2f0ff");
    bodyGrad.addColorStop(0.8, "#b7d6f7");
    bodyGrad.addColorStop(1, "#8ab8f0");
    traceBodyPath();
    dc.fillStyle = bodyGrad;
    dc.fill();
    dc.strokeStyle = "#5f84b0";
    dc.lineWidth = 1.6 * s;
    dc.stroke();

    // Subtle belly & breast silk sheen
    dc.strokeStyle = "rgba(255, 255, 255, 0.72)";
    dc.lineWidth = 1.3 * s;
    dc.beginPath();
    dc.moveTo(pose.tailTip.x + 6 * s, pose.tailTip.y - 5 * s);
    dc.bezierCurveTo(
      pose.bodyCenter.x - 32 * s,
      pose.bodyCenter.y - 24 * s,
      pose.bodyCenter.x + 18 * s,
      pose.bodyCenter.y - 28 * s,
      pose.neckBase.x + 8 * s,
      pose.neckBase.y + 6 * s
    );
    dc.stroke();

    // 4b. Tapered S-curve neck (outer contours only for seamless chest/head junction)
    const neckGrad = dc.createLinearGradient(
      pose.head.x - 14 * s,
      pose.head.y,
      pose.neckBase.x + 14 * s,
      pose.neckBase.y
    );
    neckGrad.addColorStop(0, "#ffffff");
    neckGrad.addColorStop(0.5, "#e6f2ff");
    neckGrad.addColorStop(1, "#a7ccf4");
    traceNeckTaperedPath();
    dc.fillStyle = neckGrad;
    dc.fill();
    strokeNeckOuterEdges("#5f84b0", 1.6 * s);

    // 4c. Crest feather plumes
    const drawCrestPlume = (tip, baseOffset, width) => {
      dc.beginPath();
      dc.moveTo(pose.head.x + baseOffset.x, pose.head.y + baseOffset.y);
      dc.quadraticCurveTo(
        (pose.head.x + tip.x) * 0.5 + 2 * s,
        tip.y - 4 * s,
        tip.x,
        tip.y
      );
      dc.quadraticCurveTo(
        (pose.head.x + tip.x) * 0.5 - 3 * s,
        tip.y + 4 * s,
        pose.head.x + baseOffset.x - 3 * s,
        pose.head.y + baseOffset.y + width
      );
      dc.closePath();
      const cg = dc.createLinearGradient(pose.head.x, pose.head.y - 16 * s, tip.x, tip.y);
      cg.addColorStop(0, "#ffffff");
      cg.addColorStop(1, "#9cc6f2");
      dc.fillStyle = cg;
      dc.fill();
      dc.strokeStyle = "#5f84b0";
      dc.lineWidth = 1.2 * s;
      dc.stroke();
    };
    drawCrestPlume(pose.crest1, { x: -8 * s, y: -13 * s }, 5 * s);
    drawCrestPlume(pose.crest2, { x: -2 * s, y: -15 * s }, 5.5 * s);

    // 4d. Head sphere (stroke upper crown & back arc so neck blends smoothly into cheek)
    const headGrad = dc.createRadialGradient(
      pose.head.x + 3 * s,
      pose.head.y - 5 * s,
      2 * s,
      pose.head.x,
      pose.head.y,
      19 * s
    );
    headGrad.addColorStop(0, "#ffffff");
    headGrad.addColorStop(0.55, "#e5f2ff");
    headGrad.addColorStop(1, "#a4caf3");
    dc.fillStyle = headGrad;
    dc.beginPath();
    dc.arc(pose.head.x, pose.head.y, Math.max(0.5, 17 * s), 0, Math.PI * 2);
    dc.fill();
    dc.strokeStyle = "#5f84b0";
    dc.lineWidth = 1.6 * s;
    dc.beginPath();
    dc.arc(pose.head.x, pose.head.y, Math.max(0.5, 17 * s), Math.PI * 0.78, Math.PI * 2.08);
    dc.stroke();

    // 4e. Radiant Amber-Gold -> Coral-Orange Throat Pouch + Inner Rib Lines
    const pouchGrad = dc.createLinearGradient(
      pose.pouchBase.x,
      pose.pouchBase.y - 4 * s,
      pose.pouchMid.x + 16 * s,
      pose.pouchMid.y + 12 * s
    );
    pouchGrad.addColorStop(0, "#ffe082");
    pouchGrad.addColorStop(0.48, "#ff9e40");
    pouchGrad.addColorStop(1, "#e85d24");
    tracePouchPath();
    dc.fillStyle = pouchGrad;
    dc.fill();
    dc.strokeStyle = "#9c3f18";
    dc.lineWidth = 1.6 * s;
    dc.stroke();

    // Delicate specular inner rib lines inside pouch
    dc.strokeStyle = "rgba(255, 245, 205, 0.48)";
    dc.lineWidth = 1.05 * s;
    for (let r = 0; r < 3; r++) {
      const k = 0.25 + r * 0.24;
      dc.beginPath();
      dc.moveTo(lerp(pose.pouchBase.x + 6 * s, pose.beakBaseTop.x + 4 * s, k), lerp(pose.pouchBase.y + 2 * s, pose.beakBaseTop.y + 11 * s, k));
      dc.quadraticCurveTo(
        pose.pouchMid.x + (r - 1) * 14 * s,
        pose.pouchMid.y - 3 * s + r * 2.5 * s,
        lerp(pose.pouchMid.x + 12 * s, pose.beakTip.x - 12 * s, k),
        lerp(pose.pouchMid.y + 4 * s, pose.beakTip.y + 5 * s, k)
      );
      dc.stroke();
    }

    // 4f. Sculpted Upper Mandible & Crisp Hook
    const beakGrad = dc.createLinearGradient(
      pose.beakBaseTop.x,
      pose.beakBaseTop.y,
      pose.beakTip.x,
      pose.beakHook.y
    );
    beakGrad.addColorStop(0, "#ffebb2");
    beakGrad.addColorStop(0.45, "#f7a93c");
    beakGrad.addColorStop(0.88, "#e36826");
    beakGrad.addColorStop(1, "#cc3d18");
    traceUpperMandiblePath();
    dc.fillStyle = beakGrad;
    dc.fill();
    dc.strokeStyle = "#8e3514";
    dc.lineWidth = 1.5 * s;
    dc.stroke();

    // Culmen top highlight ridge
    dc.strokeStyle = "rgba(255, 248, 224, 0.72)";
    dc.lineWidth = 1.15 * s;
    dc.beginPath();
    dc.moveTo(pose.beakBaseTop.x + 4 * s, pose.beakBaseTop.y + 2.2 * s);
    dc.quadraticCurveTo(
      (pose.beakBaseTop.x + pose.beakTip.x) * 0.55,
      (pose.beakBaseTop.y + pose.beakTip.y) * 0.5 - 1.2 * s,
      pose.beakTip.x - 5 * s,
      pose.beakTip.y + 0.5 * s
    );
    dc.stroke();

    // 4g. Glossy Deep-Sapphire Eye with Dual Specular Catchlights
    dc.fillStyle = "#fff9ec";
    dc.strokeStyle = "#5a7ea8";
    dc.lineWidth = 1.2 * s;
    dc.beginPath();
    dc.arc(pose.eye.x, pose.eye.y, Math.max(0.5, 5.2 * s), 0, Math.PI * 2);
    dc.fill();
    dc.stroke();

    const irisGrad = dc.createRadialGradient(
      pose.eye.x - 0.8 * s,
      pose.eye.y - 0.8 * s,
      0.4 * s,
      pose.eye.x + 0.6 * s,
      pose.eye.y,
      4.2 * s
    );
    irisGrad.addColorStop(0, "#2c74d6");
    irisGrad.addColorStop(0.65, "#113778");
    irisGrad.addColorStop(1, "#081838");
    dc.fillStyle = irisGrad;
    dc.beginPath();
    dc.arc(pose.eye.x + 0.6 * s, pose.eye.y, Math.max(0.5, 3.8 * s), 0, Math.PI * 2);
    dc.fill();

    // Pupil
    dc.fillStyle = "#040a16";
    dc.beginPath();
    dc.arc(pose.eye.x + 0.8 * s, pose.eye.y, Math.max(0.5, 1.9 * s), 0, Math.PI * 2);
    dc.fill();

    // Dual specular catchlights
    dc.fillStyle = "#ffffff";
    dc.beginPath();
    dc.arc(pose.eye.x - 0.4 * s, pose.eye.y - 1.3 * s, Math.max(0.5, 1.25 * s), 0, Math.PI * 2);
    dc.fill();
    dc.fillStyle = "#9fd8ff";
    dc.beginPath();
    dc.arc(pose.eye.x + 1.8 * s, pose.eye.y + 1.1 * s, Math.max(0.5, 0.7 * s), 0, Math.PI * 2);
    dc.fill();

    // 4h. 6 Individually Scalloped, Layered Primary Wing Feathers + Wing Covert Mantle
    const wingP0 = { x: pose.shoulder.x - 4 * s, y: pose.shoulder.y + 2 * s };
    const wingC1 = { x: pose.wingElbow.x - 5 * s, y: pose.wingElbow.y + 13 * s };
    const wingC2 = { x: pose.barGrip.x - 12 * s, y: pose.barGrip.y + 11 * s };
    const wingP3 = { x: pose.barGrip.x - 2 * s, y: pose.barGrip.y + 3 * s };

    for (let f = 5; f >= 0; f--) {
      const frac = 0.10 + f * 0.135;
      const root = cubicBezierPt(wingP0, wingC1, wingC2, wingP3, frac);
      const tang = cubicBezierTangent(wingP0, wingC1, wingC2, wingP3, frac);
      const tLen = Math.hypot(tang.x, tang.y) || 1;
      const tx = tang.x / tLen;
      const ty = tang.y / tLen;
      const nx = -ty;
      const ny = tx;

      // Swept-back graceful primary feather orientation toward rear-downward
      const fLen = (25 - f * 1.6) * s;
      const fW = (6.4 - f * 0.25) * s;
      const tip = {
        x: root.x - tx * fLen * 0.78 + nx * fLen * 0.52,
        y: root.y - ty * fLen * 0.78 + ny * fLen * 0.52,
      };
      const ctrlA = {
        x: (root.x + tip.x) * 0.5 - tx * fW * 1.15 - nx * fW * 0.25,
        y: (root.y + tip.y) * 0.5 - ty * fW * 1.15 - ny * fW * 0.25,
      };
      const ctrlB = {
        x: (root.x + tip.x) * 0.5 + tx * fW * 0.95 + nx * fW * 0.35,
        y: (root.y + tip.y) * 0.5 + ty * fW * 0.95 + ny * fW * 0.35,
      };

      const fGrad = dc.createLinearGradient(root.x, root.y, tip.x, tip.y);
      fGrad.addColorStop(0, "#f5faff");
      fGrad.addColorStop(0.55, "#c5e0fb");
      fGrad.addColorStop(1, "#7da8dc");

      dc.beginPath();
      dc.moveTo(root.x - tx * fW * 0.45, root.y - ty * fW * 0.45);
      dc.quadraticCurveTo(ctrlA.x, ctrlA.y, tip.x, tip.y);
      dc.quadraticCurveTo(ctrlB.x, ctrlB.y, root.x + tx * fW * 0.45, root.y + ty * fW * 0.45);
      dc.closePath();
      dc.fillStyle = fGrad;
      dc.fill();
      dc.strokeStyle = "#5f84b0";
      dc.lineWidth = 1.1 * s;
      dc.stroke();

      // Feather shaft highlight
      dc.strokeStyle = "rgba(255, 255, 255, 0.58)";
      dc.lineWidth = 0.8 * s;
      dc.beginPath();
      dc.moveTo(root.x, root.y);
      dc.lineTo(lerp(root.x, tip.x, 0.78), lerp(root.y, tip.y, 0.78));
      dc.stroke();
    }

    // Upper wing mantle reaching gracefully to handlebar grip
    const wingGrad = dc.createLinearGradient(
      pose.shoulder.x,
      pose.shoulder.y - 10 * s,
      pose.barGrip.x,
      pose.barGrip.y + 8 * s
    );
    wingGrad.addColorStop(0, "#ffffff");
    wingGrad.addColorStop(0.55, "#dceeff");
    wingGrad.addColorStop(1, "#9cc4f0");
    traceWingCovertPath();
    dc.fillStyle = wingGrad;
    dc.fill();
    dc.strokeStyle = "#5f84b0";
    dc.lineWidth = 1.55 * s;
    dc.stroke();

    dc.restore();
  }

  // --- LAYER 5: Front Leg & Front Crank (in front of frame & wing) ---
  if (wireLegAlpha > 0.01) {
    dc.save();
    dc.globalAlpha *= wireLegAlpha;
    dc.strokeStyle = "#f2cc60";
    dc.lineWidth = 2.4 * s;
    dc.lineCap = "round";
    dc.lineJoin = "round";
    dc.beginPath();
    dc.moveTo(pose.hip.x, pose.hip.y);
    dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
    dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
    dc.stroke();
    dc.restore();
  }
  if (fillAlpha > 0.01) {
    dc.save();
    dc.globalAlpha *= fillAlpha;
    dc.lineCap = "round";
    dc.lineJoin = "round";

    // Leg shadow & golden-coral body
    dc.strokeStyle = "#a34f17";
    dc.lineWidth = 8.0 * s;
    dc.beginPath();
    dc.moveTo(pose.hip.x, pose.hip.y);
    dc.lineTo(pose.rightKnee.x, pose.rightKnee.y);
    dc.lineTo(pose.rightPedal.x, pose.rightPedal.y);
    dc.stroke();

    const legGrad = dc.createLinearGradient(pose.hip.x, pose.hip.y, pose.rightPedal.x, pose.rightPedal.y);
    legGrad.addColorStop(0, "#f5aa42");
    legGrad.addColorStop(1, "#de7324");
    dc.strokeStyle = legGrad;
    dc.lineWidth = 5.4 * s;
    dc.stroke();

    // Subtle warm specular rim on shin/thigh
    dc.strokeStyle = "rgba(255, 224, 160, 0.55)";
    dc.lineWidth = 1.3 * s;
    dc.stroke();

    // Webbed foot resting on pedal
    dc.fillStyle = "#e8842c";
    dc.strokeStyle = "#944212";
    dc.lineWidth = 1.1 * s;
    dc.beginPath();
    dc.moveTo(pose.rightPedal.x - 5 * s, pose.rightPedal.y - 2 * s);
    dc.lineTo(pose.rightPedal.x + 8 * s, pose.rightPedal.y - 1 * s);
    dc.lineTo(pose.rightPedal.x + 6 * s, pose.rightPedal.y + 3.5 * s);
    dc.lineTo(pose.rightPedal.x - 6 * s, pose.rightPedal.y + 3 * s);
    dc.closePath();
    dc.fill();
    dc.stroke();
    dc.restore();
  }

  // Front crank arm & pedal
  if (bikeSolid > 0.01) {
    dc.save();
    dc.globalAlpha *= bikeSolid;
    drawTitaniumTube(pose.bb, pose.rightPedal, 0.65);

    dc.fillStyle = "#192029";
    dc.strokeStyle = "#79c0ff";
    dc.lineWidth = 1.0 * s;
    drawRoundedRectPath(dc, pose.rightPedal.x - 8.5 * s, pose.rightPedal.y - 3.2 * s, 17 * s, 6.4 * s, 2.2 * s);
    dc.fill();
    dc.stroke();

    dc.fillStyle = "#f2cc60";
    dc.beginPath();
    dc.arc(pose.rightPedal.x, pose.rightPedal.y, Math.max(0.5, 2.1 * s), 0, Math.PI * 2);
    dc.fill();
    dc.restore();
  }
}

/**
 * Subtle glowing cyan-gold harmonic motes trailing behind rear wheel along ROAD_Y = 730 in Bar 3.
 */
function drawTrailingHarmonicMotes(g, t, u, pose) {
  const motesAlpha = smoothstep(2.9, 3.75, u) * (1 - smoothstep(5.55, 5.95, u));
  if (motesAlpha <= 0.01) return;

  const dc = g.drawingContext;
  const palette = ["#79c0ff", "#f2cc60", "#7ee787"];
  const count = 14;

  dc.save();
  for (let i = 0; i < count; i++) {
    const phase = posMod(t * 0.85 + i / count, 1.0);
    const trailDist = 28 + phase * 225;
    const mx = pose.rearHub.x - 42 - trailDist;
    const my = ROAD_Y - 8 - phase * 42 - Math.sin(t * 4.5 + i * 1.37) * 9;
    const lifeAlpha = Math.sin(phase * Math.PI);
    const a = motesAlpha * lifeAlpha * 0.88;
    if (a <= 0.02) continue;

    const col = palette[i % palette.length];
    const radius = Math.max(0.8, (1 - phase * 0.65) * 2.6);

    dc.globalAlpha = a * 0.32;
    dc.fillStyle = col;
    dc.beginPath();
    dc.arc(mx, my, Math.max(0.5, radius * 2.5), 0, Math.PI * 2);
    dc.fill();

    dc.globalAlpha = a;
    dc.beginPath();
    dc.arc(mx, my, Math.max(0.5, radius), 0, Math.PI * 2);
    dc.fill();

    // Tiny CAD sparkle cross on bright motes
    if (i % 3 === 0) {
      dc.strokeStyle = col;
      dc.lineWidth = 0.85;
      const arm = radius * 2.1;
      dc.beginPath();
      dc.moveTo(mx - arm, my);
      dc.lineTo(mx + arm, my);
      dc.moveTo(mx, my - arm);
      dc.lineTo(mx, my + arm);
      dc.stroke();
    }
  }
  dc.restore();
}

export default function render(ctx) {
  const { p, g, kit, t, localTime, beat, meta } = ctx;
  const u = localTime;
  const sceneMeta = meta || META;

  // 1. Baked precision dark IDE / CAD workspace
  const backdrop = kit.bakeLayer("s20_code_bg_v1", 1840, 1000, bakeCodeWorkspace);
  p.push();
  p.imageMode(p.CENTER);
  p.image(backdrop, 500, 500, 1840, 1000);
  p.pop();

  // 2. Rig pose & deterministic phase progressions
  const px = getScenePelicanX(u);
  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
  const kneeDeg = computeKneeAngleDeg(pose);

  // Portal continuity rule: solid at #19->#20 (u <= 0.18) and #20->Outro (u >= 5.82)
  const portalSolid = (1 - smoothstep(0.0, 0.25, u)) + smoothstep(5.75, 6.0, u);
  const fillAlpha = clamp(Math.max(portalSolid, smoothstep(1.35, 3.05, u)), 0, 1);
  const bikeSolid = clamp(Math.max(portalSolid, smoothstep(0.85, 1.85, u)), 0, 1);

  const guideEnvelope = smoothstep(0.06, 0.32, u) * (1 - smoothstep(5.55, 5.90, u));
  const guideAlpha = guideEnvelope * lerp(0.95, 0.32, smoothstep(2.35, 3.15, u));
  const uiAlpha = smoothstep(0.05, 0.32, u) * (1 - smoothstep(5.48, 5.88, u));

  g.push();

  // 3. Upper split IDE layout (strictly y <= 422, leaving y >= 430 unobstructed)
  drawInspectorPanel(g, t, u, beat, px, pose, kneeDeg, uiAlpha);
  drawCodeEditor(g, u, uiAlpha);

  // 4. Trailing harmonic motes along ROAD_Y in Bar 3
  drawTrailingHarmonicMotes(g, t, u, pose);

  // 5. Progressive blueprint-to-silk-vector Pelican & Bicycle + live Bezier guides
  drawCodePelicanRig(g, u, pose, bikeSolid, fillAlpha);
  drawBlueprintGuides(g, u, px, pose, kneeDeg, guideAlpha);

  // 6. Terminal-style Era Title Card ([34..402] x [32..124])
  drawEraTitleCard(g, sceneMeta, u);

  g.pop();
}
