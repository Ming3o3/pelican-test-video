/**
 * Scene #15 — 示波器矢量图 · Oscilloscope Vector (1950s), t in [89.0, 95.0).
 * 1950s laboratory analog X-Y oscilloscope (fictional "PEL-50 XY-SCOPE") featuring:
 * - Pre-baked gunmetal/wrinkle-enamel instrument front panel across [-420..1420] x [0..1000]
 *   with rotary dials (X-POS, Y-POS, FREQ, GAIN, INTENSITY, FOCUS, SWEEP, X-Y PHASE),
 *   toggle switches, analog mA beam meter, and central 870-unit circular dark-green P1 CRT
 *   with etched coordinate graticule.
 * - Seamless 14 -> 15 power-on transition along ROAD_Y = 730 with cyan-green arc sparks (u <= 0.45).
 * - Full P1 phosphor electron-beam vector Pelican + bicycle (#42ff7a bloom + #c8ffd8 core),
 *   3-layer decaying persistence afterglow trails, and subtle 60Hz scan jitter.
 * - Bar 2 gag (u in [2.0, 3.0)): a researcher's wristwatch-wearing silhouette hand reaches in from
 *   bottom-right and clicks X-Y PHASE one notch off; SIGNAL ERR flashes red as all sampled vector
 *   contours smoothly morph into a rapid 3D rotating 3:4 Lissajous curve with rich trails,
 *   then snaps cleanly back into the pedaling vector Pelican on Beat 3 (u = 3.0s).
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  ROAD_Y,
  clamp,
  getScenePelicanX,
  lerp,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[14];

const CRT_CX = 500;
const CRT_CY = 500;
const CRT_R = 435;
const BEZEL_OUTER_R = 472;

const PHASE_KNOB_X = 920;
const PHASE_KNOB_Y = 845;
const ERR_LAMP_X = 830;
const ERR_LAMP_Y = 882;
const PWR_LAMP_X = 950;
const PWR_LAMP_Y = 165;

function posMod(a, n) {
  return ((a % n) + n) % n;
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

function sampleSegment(x0, y0, x1, y1, steps = 8) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    pts.push({ x: lerp(x0, x1, k), y: lerp(y0, y1, k) });
  }
  return pts;
}

function sampleCircle(cx, cy, r, steps = 32, startAngle = 0) {
  const safeR = Math.max(0.5, r);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (i / steps) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * safeR, y: cy + Math.sin(a) * safeR });
  }
  return pts;
}

function sampleCubic(p0, p1, p2, p3, steps = 16) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(cubicBezierPt(p0, p1, p2, p3, i / steps));
  }
  return pts;
}

/**
 * Draws a baked static rotary dial ring with degree ticks and engraved label.
 */
function bakeDialBase(dc, x, y, r, label, opts = {}) {
  const safeR = Math.max(0.5, r);
  const ticks = opts.ticks ?? 11;
  const startDeg = -135;
  const endDeg = 135;

  dc.save();
  dc.translate(x, y);

  // Recessed shadow ring
  dc.fillStyle = "rgba(5, 8, 6, 0.72)";
  dc.beginPath();
  dc.arc(2, 3, safeR + 8, 0, Math.PI * 2);
  dc.fill();

  // Aluminum calibration collar
  dc.strokeStyle = "rgba(182, 206, 188, 0.35)";
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.arc(0, 0, safeR + 9, 0, Math.PI * 2);
  dc.stroke();

  // Radial scale tick marks
  for (let i = 0; i < ticks; i++) {
    const f = ticks > 1 ? i / (ticks - 1) : 0.5;
    const ang = ((lerp(startDeg, endDeg, f) - 90) * Math.PI) / 180;
    const isMajor = i % 2 === 0;
    const r0 = safeR + 6;
    const r1 = safeR + (isMajor ? 14 : 10);
    dc.strokeStyle = isMajor ? "rgba(218, 236, 222, 0.75)" : "rgba(170, 198, 176, 0.45)";
    dc.lineWidth = isMajor ? 1.8 : 1.1;
    dc.beginPath();
    dc.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    dc.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    dc.stroke();
  }

  // Optional LOCK / ERR markings for X-Y PHASE hero knob
  if (opts.isPhaseKnob) {
    // Green LOCK tick at 0 deg (top)
    const lockAng = -Math.PI / 2;
    dc.strokeStyle = "#42ff7a";
    dc.lineWidth = 2.6;
    dc.beginPath();
    dc.moveTo(Math.cos(lockAng) * (safeR + 5), Math.sin(lockAng) * (safeR + 5));
    dc.lineTo(Math.cos(lockAng) * (safeR + 18), Math.sin(lockAng) * (safeR + 18));
    dc.stroke();

    dc.fillStyle = "#82ffa8";
    dc.font = "bold 11px Menlo, monospace";
    dc.textAlign = "center";
    dc.textBaseline = "bottom";
    dc.fillText("LOCK", 0, -(safeR + 20));

    // Red/amber ERR notch at +52 deg
    const errAng = -Math.PI / 2 + 0.91;
    dc.strokeStyle = "#ff5349";
    dc.lineWidth = 2.8;
    dc.beginPath();
    dc.moveTo(Math.cos(errAng) * (safeR + 5), Math.sin(errAng) * (safeR + 5));
    dc.lineTo(Math.cos(errAng) * (safeR + 18), Math.sin(errAng) * (safeR + 18));
    dc.stroke();

    dc.fillStyle = "#ff7d73";
    dc.font = "bold 11px Menlo, monospace";
    dc.textAlign = "left";
    dc.textBaseline = "middle";
    dc.fillText("ERR", Math.cos(errAng) * (safeR + 22), Math.sin(errAng) * (safeR + 22));
  }

  // Engraved label plate below dial
  dc.fillStyle = "rgba(10, 14, 11, 0.85)";
  dc.strokeStyle = "rgba(170, 194, 176, 0.36)";
  dc.lineWidth = 1;
  const plateW = Math.max(72, label.length * 9 + 18);
  dc.fillRect(-plateW / 2, safeR + 18, plateW, 20);
  dc.strokeRect(-plateW / 2, safeR + 18, plateW, 20);

  dc.fillStyle = "#d9e8dc";
  dc.font = "bold 11.5px Menlo, Monaco, monospace";
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText(label, 0, safeR + 28.5);

  dc.restore();
}

function bakeToggleSwitch(dc, x, y, label, up = true) {
  dc.save();
  dc.translate(x, y);

  // Hex nut bushing
  dc.fillStyle = "#5c6860";
  dc.strokeStyle = "#161b18";
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.arc(0, 0, 12, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.fillStyle = "#222925";
  dc.beginPath();
  dc.arc(0, 0, 6.5, 0, Math.PI * 2);
  dc.fill();

  // Chrome bat-handle lever
  const dir = up ? -1 : 1;
  const grad = dc.createLinearGradient(-5, 0, 5, dir * 24);
  grad.addColorStop(0, "#d8e2db");
  grad.addColorStop(1, "#5c6760");
  dc.strokeStyle = grad;
  dc.lineWidth = 5.5;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(0, 0);
  dc.lineTo(0, dir * 20);
  dc.stroke();

  dc.fillStyle = "#e5efe8";
  dc.beginPath();
  dc.arc(0, dir * 20, 4, 0, Math.PI * 2);
  dc.fill();

  dc.fillStyle = "#b8cbbd";
  dc.font = "bold 10.5px Menlo, monospace";
  dc.textAlign = "center";
  dc.textBaseline = "top";
  dc.fillText(label, 0, 26);

  dc.restore();
}

function bakeBananaJack(dc, x, y, ringCol, label) {
  dc.save();
  dc.translate(x, y);

  dc.fillStyle = "#0b0e0c";
  dc.beginPath();
  dc.arc(0, 0, 13, 0, Math.PI * 2);
  dc.fill();

  dc.strokeStyle = ringCol;
  dc.lineWidth = 3.2;
  dc.beginPath();
  dc.arc(0, 0, 10, 0, Math.PI * 2);
  dc.stroke();

  dc.fillStyle = "#8d9991";
  dc.beginPath();
  dc.arc(0, 0, 5.5, 0, Math.PI * 2);
  dc.fill();

  dc.fillStyle = "#050706";
  dc.beginPath();
  dc.arc(0, 0, 3, 0, Math.PI * 2);
  dc.fill();

  dc.fillStyle = "#adc0b2";
  dc.font = "bold 10px Menlo, monospace";
  dc.textAlign = "center";
  dc.textBaseline = "top";
  dc.fillText(label, 0, 16);

  dc.restore();
}

function bakeScrew(dc, x, y, r = 6.5, angle = 0.4) {
  const safeR = Math.max(0.5, r);
  dc.save();
  dc.translate(x, y);
  dc.rotate(angle);

  dc.fillStyle = "rgba(0,0,0,0.45)";
  dc.beginPath();
  dc.arc(1.2, 1.5, safeR, 0, Math.PI * 2);
  dc.fill();

  const g = dc.createLinearGradient(-safeR, -safeR, safeR, safeR);
  g.addColorStop(0, "#8d9a92");
  g.addColorStop(1, "#39423d");
  dc.fillStyle = g;
  dc.beginPath();
  dc.arc(0, 0, safeR, 0, Math.PI * 2);
  dc.fill();

  dc.strokeStyle = "#161b18";
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.moveTo(-safeR * 0.68, 0);
  dc.lineTo(safeR * 0.68, 0);
  dc.stroke();

  dc.restore();
}

function bakeOscilloscopeChassis(pg) {
  const dc = pg.drawingContext;
  const rand = prng(195415);

  dc.save();
  dc.translate(-BLEED_LEFT, 0); // Use canonical scene coords [-420..1420] x [0..1000]

  // 1. 1950s wrinkle-enamel dark slate laboratory front panel
  const panelGrad = dc.createLinearGradient(0, 0, 0, 1000);
  panelGrad.addColorStop(0, "#212924");
  panelGrad.addColorStop(0.5, "#19201c");
  panelGrad.addColorStop(1, "#121714");
  dc.fillStyle = panelGrad;
  dc.fillRect(BLEED_LEFT - 10, 0, BLEED_RIGHT - BLEED_LEFT + 20, 1000);

  // Subtle metallic vignette toward outer rack edges
  const sideGrad = dc.createLinearGradient(BLEED_LEFT, 0, BLEED_RIGHT, 0);
  sideGrad.addColorStop(0, "rgba(4, 7, 5, 0.48)");
  sideGrad.addColorStop(0.25, "rgba(4, 7, 5, 0.05)");
  sideGrad.addColorStop(0.5, "rgba(40, 56, 46, 0.08)");
  sideGrad.addColorStop(0.75, "rgba(4, 7, 5, 0.05)");
  sideGrad.addColorStop(1, "rgba(4, 7, 5, 0.48)");
  dc.fillStyle = sideGrad;
  dc.fillRect(BLEED_LEFT - 10, 0, BLEED_RIGHT - BLEED_LEFT + 20, 1000);

  // Wrinkle-enamel speckle texture
  for (let i = 0; i < 1600; i++) {
    const sx = BLEED_LEFT + rand() * (BLEED_RIGHT - BLEED_LEFT);
    const sy = rand() * 1000;
    const sr = 0.8 + rand() * 1.9;
    dc.fillStyle = rand() > 0.5 ? "rgba(210, 235, 218, 0.032)" : "rgba(4, 8, 5, 0.08)";
    dc.beginPath();
    dc.arc(sx, sy, sr, 0, Math.PI * 2);
    dc.fill();
  }

  // Brushed horizontal panel seam lines & section dividers
  dc.strokeStyle = "rgba(8, 12, 9, 0.65)";
  dc.lineWidth = 2;
  for (const xLine of [-350, 18, 982, 1350]) {
    dc.beginPath();
    dc.moveTo(xLine, 16);
    dc.lineTo(xLine, 984);
    dc.stroke();
  }
  dc.strokeStyle = "rgba(180, 205, 188, 0.14)";
  dc.lineWidth = 1.2;
  dc.strokeRect(-338, 18, 1676, 964);

  // Cooling louvers on far-left & far-right margins
  for (const lx of [-395, 1365]) {
    for (let ly = 70; ly <= 340; ly += 24) {
      dc.fillStyle = "#080b09";
      dc.fillRect(lx, ly, 36, 9);
      dc.fillStyle = "rgba(165, 188, 172, 0.2)";
      dc.fillRect(lx, ly + 9, 36, 2);
    }
    for (let ly = 770; ly <= 940; ly += 24) {
      dc.fillStyle = "#080b09";
      dc.fillRect(lx, ly, 36, 9);
      dc.fillStyle = "rgba(165, 188, 172, 0.2)";
      dc.fillRect(lx, ly + 9, 36, 2);
    }
  }

  // Corner chassis bolts
  for (const [bx, by] of [
    [-322, 34], [-322, 966],
    [34, 966], [966, 966],
    [1322, 34], [1322, 966],
  ]) {
    bakeScrew(dc, bx, by, 7.5, rand() * Math.PI);
  }

  // 2. Dark recessed electron-beam trace guide band across ROAD_Y corridor
  //    Ensures bright green vector Pelican & ROAD_Y = 730 baseline pop cleanly across portals!
  const guideGrad = dc.createLinearGradient(0, 395, 0, 765);
  guideGrad.addColorStop(0, "rgba(4, 10, 6, 0)");
  guideGrad.addColorStop(0.14, "rgba(4, 10, 6, 0.72)");
  guideGrad.addColorStop(0.86, "rgba(4, 10, 6, 0.78)");
  guideGrad.addColorStop(1, "rgba(4, 10, 6, 0)");
  dc.fillStyle = guideGrad;
  dc.fillRect(BLEED_LEFT - 10, 395, BLEED_RIGHT - BLEED_LEFT + 20, 370);

  // Subtle rail ticks along ROAD_Y outside the CRT so motion reads smoothly in Bar 1 & Bar 3
  dc.strokeStyle = "rgba(56, 175, 96, 0.22)";
  dc.lineWidth = 1.2;
  for (let tx = -400; tx <= 1400; tx += 40) {
    if (tx > 125 && tx < 875) continue;
    dc.beginPath();
    dc.moveTo(tx, ROAD_Y - 5);
    dc.lineTo(tx, ROAD_Y + 5);
    dc.stroke();
  }

  // 3. Central Circular CRT Bezel (cx=500, cy=500, R=435)
  // Cast-metal bezel shadow
  dc.fillStyle = "rgba(3, 5, 4, 0.72)";
  dc.beginPath();
  dc.arc(CRT_CX + 6, CRT_CY + 8, BEZEL_OUTER_R + 6, 0, Math.PI * 2);
  dc.fill();

  // Outer machined bezel ring
  const bezelGrad = dc.createLinearGradient(
    CRT_CX - BEZEL_OUTER_R,
    CRT_CY - BEZEL_OUTER_R,
    CRT_CX + BEZEL_OUTER_R,
    CRT_CY + BEZEL_OUTER_R
  );
  bezelGrad.addColorStop(0, "#515f56");
  bezelGrad.addColorStop(0.35, "#333d37");
  bezelGrad.addColorStop(0.7, "#1e2521");
  bezelGrad.addColorStop(1, "#101412");
  dc.fillStyle = bezelGrad;
  dc.beginPath();
  dc.arc(CRT_CX, CRT_CY, BEZEL_OUTER_R, 0, Math.PI * 2);
  dc.fill();

  // Bevel highlight ring
  dc.strokeStyle = "rgba(195, 220, 202, 0.28)";
  dc.lineWidth = 2;
  dc.beginPath();
  dc.arc(CRT_CX, CRT_CY, BEZEL_OUTER_R - 2, 0, Math.PI * 2);
  dc.stroke();

  // Dark inner rubber hood lip
  dc.fillStyle = "#0a0e0b";
  dc.beginPath();
  dc.arc(CRT_CX, CRT_CY, CRT_R + 10, 0, Math.PI * 2);
  dc.fill();

  // 8 perimeter bezel mounting screws
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 + Math.PI / 8;
    const sr = (BEZEL_OUTER_R + CRT_R + 10) * 0.5;
    bakeScrew(dc, CRT_CX + Math.cos(ang) * sr, CRT_CY + Math.sin(ang) * sr, 6.2, ang + 0.5);
  }

  // 4. Deep dark P1 green CRT glass & etched Graticule (clipped to R = 435)
  dc.save();
  dc.beginPath();
  dc.arc(CRT_CX, CRT_CY, CRT_R, 0, Math.PI * 2);
  dc.clip();

  const crtBg = dc.createRadialGradient(CRT_CX, CRT_CY, 25, CRT_CX, CRT_CY, CRT_R);
  crtBg.addColorStop(0, "#09190e");
  crtBg.addColorStop(0.6, "#050e08");
  crtBg.addColorStop(0.92, "#030805");
  crtBg.addColorStop(1, "#010402");
  dc.fillStyle = crtBg;
  dc.fillRect(CRT_CX - CRT_R, CRT_CY - CRT_R, CRT_R * 2, CRT_R * 2);

  // Subtle horizontal CRT phosphor scanlines
  dc.fillStyle = "rgba(28, 92, 48, 0.11)";
  for (let y = CRT_CY - CRT_R; y <= CRT_CY + CRT_R; y += 5) {
    dc.fillRect(CRT_CX - CRT_R, y, CRT_R * 2, 1.5);
  }

  // Graticule coordinate grid: 10 divisions across 870 units -> 87 units/div
  const DIV = 87;
  dc.strokeStyle = "rgba(56, 198, 102, 0.22)";
  dc.lineWidth = 1.1;
  for (let k = -5; k <= 5; k++) {
    const x = CRT_CX + k * DIV;
    const y = CRT_CY + k * DIV;
    dc.beginPath();
    dc.moveTo(x, CRT_CY - CRT_R);
    dc.lineTo(x, CRT_CY + CRT_R);
    dc.stroke();

    dc.beginPath();
    dc.moveTo(CRT_CX - CRT_R, y);
    dc.lineTo(CRT_CX + CRT_R, y);
    dc.stroke();
  }

  // Brighter central crosshair axes (x=500, y=500) + fine sub-ticks
  dc.strokeStyle = "rgba(76, 224, 124, 0.36)";
  dc.lineWidth = 1.5;
  dc.beginPath();
  dc.moveTo(CRT_CX - CRT_R, CRT_CY);
  dc.lineTo(CRT_CX + CRT_R, CRT_CY);
  dc.moveTo(CRT_CX, CRT_CY - CRT_R);
  dc.lineTo(CRT_CX, CRT_CY + CRT_R);
  dc.stroke();

  const SUB = DIV / 5;
  dc.lineWidth = 1.2;
  for (let d = -CRT_R + SUB; d < CRT_R; d += SUB) {
    dc.beginPath();
    dc.moveTo(CRT_CX + d, CRT_CY - 6);
    dc.lineTo(CRT_CX + d, CRT_CY + 6);
    dc.moveTo(CRT_CX - 6, CRT_CY + d);
    dc.lineTo(CRT_CX + 6, CRT_CY + d);
    dc.stroke();
  }

  // Faint circular calibration rings inside graticule
  dc.strokeStyle = "rgba(62, 200, 108, 0.14)";
  dc.setLineDash([5, 7]);
  dc.beginPath();
  dc.arc(CRT_CX, CRT_CY, DIV * 3, 0, Math.PI * 2);
  dc.stroke();
  dc.setLineDash([]);

  // Subtle etched graticule legend text
  dc.fillStyle = "rgba(96, 225, 138, 0.36)";
  dc.font = "11px Menlo, Monaco, monospace";
  dc.textAlign = "left";
  dc.fillText("P1-PHOSPHOR · 10ms/DIV", CRT_CX - 165, CRT_CY - 356);
  dc.textAlign = "right";
  dc.fillText("+2.0V/DIV · XY-MODE", CRT_CX + 165, CRT_CY - 356);

  // Inner bezel shadow vignette
  const rimShadow = dc.createRadialGradient(CRT_CX, CRT_CY, CRT_R - 36, CRT_CX, CRT_CY, CRT_R);
  rimShadow.addColorStop(0, "rgba(0, 0, 0, 0)");
  rimShadow.addColorStop(1, "rgba(0, 0, 0, 0.65)");
  dc.fillStyle = rimShadow;
  dc.fillRect(CRT_CX - CRT_R, CRT_CY - CRT_R, CRT_R * 2, CRT_R * 2);

  dc.restore();

  // 5. Top-Right Fictional Lab Nameplate ("PEL-50 XY-SCOPE")
  dc.save();
  const npX = 955;
  const npY = 44;
  const npW = 330;
  const npH = 78;
  dc.fillStyle = "#101512";
  dc.strokeStyle = "#8da393";
  dc.lineWidth = 2;
  dc.fillRect(npX, npY, npW, npH);
  dc.strokeRect(npX, npY, npW, npH);
  dc.strokeStyle = "rgba(141, 163, 147, 0.35)";
  dc.lineWidth = 1;
  dc.strokeRect(npX + 5, npY + 5, npW - 10, npH - 10);

  bakeScrew(dc, npX + 14, npY + 14, 4, 0.2);
  bakeScrew(dc, npX + npW - 14, npY + 14, 4, 1.1);
  bakeScrew(dc, npX + 14, npY + npH - 14, 4, 0.8);
  bakeScrew(dc, npX + npW - 14, npY + npH - 14, 4, 2.0);

  dc.fillStyle = "#e6f2e9";
  dc.font = "bold 24px Menlo, Monaco, monospace";
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText("PEL-50 XY-SCOPE", npX + npW / 2, npY + 30);

  dc.fillStyle = "#8cb899";
  dc.font = "11.5px Menlo, Monaco, monospace";
  dc.fillText("CATHODE RAY VECTOR LAB · 1954", npX + npW / 2, npY + 57);
  dc.restore();

  // 6. Left Instrument Controls (outside Title Card [34..402] x [32..124])
  // Upper-left mini mA Beam Gauge
  dc.save();
  dc.translate(-132, 110);
  dc.fillStyle = "#0b0f0c";
  dc.strokeStyle = "#6c7c71";
  dc.lineWidth = 2;
  dc.fillRect(-74, -40, 148, 80);
  dc.strokeRect(-74, -40, 148, 80);

  // Cream/warm vintage dial window
  dc.fillStyle = "#ded8c4";
  dc.fillRect(-62, -30, 124, 52);
  dc.strokeStyle = "#222924";
  dc.lineWidth = 1.5;
  dc.strokeRect(-62, -30, 124, 52);

  // Scale arc
  dc.strokeStyle = "#1d221f";
  dc.lineWidth = 1.4;
  dc.beginPath();
  dc.arc(0, 26, 46, -Math.PI * 0.78, -Math.PI * 0.22);
  dc.stroke();
  for (let i = 0; i <= 6; i++) {
    const a = lerp(-Math.PI * 0.78, -Math.PI * 0.22, i / 6);
    dc.beginPath();
    dc.moveTo(Math.cos(a) * 40, 26 + Math.sin(a) * 40);
    dc.lineTo(Math.cos(a) * 49, 26 + Math.sin(a) * 49);
    dc.stroke();
  }
  dc.fillStyle = "#1d221f";
  dc.font = "bold 9.5px Menlo, monospace";
  dc.textAlign = "center";
  dc.fillText("BEAM mA", 0, 14);
  dc.restore();

  // Upper-left knobs: X-POS, Y-POS
  bakeDialBase(dc, -195, 245, 34, "X-POS", { ticks: 11 });
  bakeDialBase(dc, -70, 245, 34, "Y-POS", { ticks: 11 });
  bakeToggleSwitch(dc, -280, 245, "AC/DC", true);

  // Lower-left knobs & switches: INTENSITY, FOCUS, Z-MOD
  bakeDialBase(dc, -195, 845, 32, "INTENSITY", { ticks: 11 });
  bakeDialBase(dc, -70, 845, 32, "FOCUS", { ticks: 11 });
  bakeToggleSwitch(dc, -280, 845, "PWR", true);
  bakeBananaJack(dc, 62, 882, "#42ff7a", "X-IN");
  bakeBananaJack(dc, 128, 922, "#92a397", "GND");

  // 7. Right Instrument Controls
  // Upper-right knobs: FREQ, GAIN + switches
  bakeDialBase(dc, 1020, 225, 34, "FREQ", { ticks: 11 });
  bakeDialBase(dc, 1160, 225, 34, "GAIN", { ticks: 11 });
  bakeToggleSwitch(dc, 1265, 225, "XY-MOD", true);
  bakeBananaJack(dc, 1020, 325, "#e6b84c", "CAL 1kHz");
  bakeBananaJack(dc, 1110, 325, "#42ff7a", "Y-IN");
  bakeBananaJack(dc, 1200, 325, "#92a397", "TRIG");

  // POWER pilot lamp housing
  dc.save();
  dc.translate(PWR_LAMP_X, PWR_LAMP_Y);
  dc.fillStyle = "#0b0e0c";
  dc.strokeStyle = "#7c8d81";
  dc.lineWidth = 2;
  dc.beginPath();
  dc.arc(0, 0, 16, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.fillStyle = "#b8cbbd";
  dc.font = "bold 10.5px Menlo, monospace";
  dc.textAlign = "left";
  dc.textBaseline = "middle";
  dc.fillText("POWER", 24, 0);
  dc.restore();

  // Lower-right Hero Zone: SIGNAL ERR lamp housing + X-Y PHASE hero knob + SWEEP knob
  dc.save();
  dc.translate(ERR_LAMP_X, ERR_LAMP_Y);
  dc.fillStyle = "#0b0e0c";
  dc.strokeStyle = "#7c8d81";
  dc.lineWidth = 2.2;
  dc.beginPath();
  dc.arc(0, 0, 19, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.fillStyle = "#140808";
  dc.strokeStyle = "#d95b54";
  dc.lineWidth = 1.2;
  dc.fillRect(-46, 25, 92, 20);
  dc.strokeRect(-46, 25, 92, 20);
  dc.fillStyle = "#ff968e";
  dc.font = "bold 11px Menlo, Monaco, monospace";
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText("SIGNAL ERR", 0, 35.5);
  dc.restore();

  bakeDialBase(dc, PHASE_KNOB_X, PHASE_KNOB_Y, 42, "X-Y PHASE", {
    ticks: 13,
    isPhaseKnob: true,
  });
  bakeDialBase(dc, 1140, 850, 34, "SWEEP", { ticks: 11 });
  bakeToggleSwitch(dc, 1260, 850, "SYNC", true);

  // Spec plate bottom-left
  dc.save();
  dc.fillStyle = "#0d120f";
  dc.strokeStyle = "rgba(154, 178, 160, 0.35)";
  dc.lineWidth = 1;
  dc.fillRect(-255, 932, 240, 26);
  dc.strokeRect(-255, 932, 240, 26);
  dc.fillStyle = "#88a190";
  dc.font = "10.5px Menlo, monospace";
  dc.textAlign = "center";
  dc.textBaseline = "middle";
  dc.fillText("PAT. NO. 1954-P1 · TUBE SER. 015", -135, 945.5);
  dc.restore();

  dc.restore();
}

/**
 * Draws a dynamic rotary bakelite knob rotated to `angleRad`.
 */
function drawDynamicKnob(dc, x, y, r, angleRad, highlight = false) {
  const safeR = Math.max(0.5, r);
  dc.save();
  dc.translate(x, y);

  // Drop shadow
  dc.fillStyle = "rgba(0, 0, 0, 0.58)";
  dc.beginPath();
  dc.arc(3, 5, safeR, 0, Math.PI * 2);
  dc.fill();

  dc.rotate(angleRad);

  // Fluted 1950s bakelite knob skirt
  dc.fillStyle = "#141816";
  dc.strokeStyle = highlight ? "rgba(255, 130, 120, 0.55)" : "rgba(180, 200, 186, 0.25)";
  dc.lineWidth = 1.6;
  dc.beginPath();
  const lobes = 10;
  for (let i = 0; i <= lobes * 4; i++) {
    const a = (i / (lobes * 4)) * Math.PI * 2;
    const rr = safeR * (0.94 + 0.06 * Math.cos(a * lobes));
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) dc.moveTo(px, py);
    else dc.lineTo(px, py);
  }
  dc.closePath();
  dc.fill();
  dc.stroke();

  // Inner brushed aluminum cap
  const capR = Math.max(0.5, safeR * 0.62);
  const capGrad = dc.createLinearGradient(-capR, -capR, capR, capR);
  capGrad.addColorStop(0, "#adbab0");
  capGrad.addColorStop(0.5, "#67756b");
  capGrad.addColorStop(1, "#2f3732");
  dc.fillStyle = capGrad;
  dc.beginPath();
  dc.arc(0, 0, capR, 0, Math.PI * 2);
  dc.fill();

  // Crisp pointer notch line
  dc.strokeStyle = "#f2faf4";
  dc.lineWidth = 3.2;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(0, -safeR * 0.18);
  dc.lineTo(0, -safeR * 0.92);
  dc.stroke();

  dc.restore();
}

/**
 * Builds densely sampled vector polylines for the Pelican + Bicycle rig so every tube,
 * feather, spoke, and beak curve morphs smoothly into a continuous 3:4 Lissajous curve.
 */
function buildVectorRigPolylines(pose) {
  const s = pose.scale;
  const strokes = [];

  // 1. Rear wheel rim + 4 diametric spokes
  strokes.push(sampleCircle(pose.rearHub.x, pose.rearHub.y, pose.wheelRadius, 32, 0));
  for (let i = 0; i < 4; i++) {
    const a = pose.wheelRot + (i * Math.PI) / 4;
    const rx = Math.cos(a) * (pose.wheelRadius - 2 * s);
    const ry = Math.sin(a) * (pose.wheelRadius - 2 * s);
    strokes.push(sampleSegment(pose.rearHub.x - rx, pose.rearHub.y - ry, pose.rearHub.x + rx, pose.rearHub.y + ry, 8));
  }

  // 2. Front wheel rim + 4 diametric spokes
  strokes.push(sampleCircle(pose.frontHub.x, pose.frontHub.y, pose.wheelRadius, 32, Math.PI));
  for (let i = 0; i < 4; i++) {
    const a = pose.wheelRot + (i * Math.PI) / 4;
    const rx = Math.cos(a) * (pose.wheelRadius - 2 * s);
    const ry = Math.sin(a) * (pose.wheelRadius - 2 * s);
    strokes.push(sampleSegment(pose.frontHub.x - rx, pose.frontHub.y - ry, pose.frontHub.x + rx, pose.frontHub.y + ry, 8));
  }

  // 3. Bicycle frame tubes + fork + handlebars + saddle
  strokes.push(sampleSegment(pose.rearHub.x, pose.rearHub.y, pose.bb.x, pose.bb.y, 7));
  strokes.push(sampleSegment(pose.rearHub.x, pose.rearHub.y, pose.seatCluster.x, pose.seatCluster.y, 7));
  strokes.push(sampleSegment(pose.bb.x, pose.bb.y, pose.seatCluster.x, pose.seatCluster.y, 7));
  strokes.push(sampleSegment(pose.seatCluster.x, pose.seatCluster.y, pose.headTop.x, pose.headTop.y, 9));
  strokes.push(sampleSegment(pose.bb.x, pose.bb.y, pose.headBot.x, pose.headBot.y, 9));
  strokes.push(sampleSegment(pose.headTop.x, pose.headTop.y, pose.headBot.x, pose.headBot.y, 4));
  strokes.push(sampleSegment(pose.frontHub.x, pose.frontHub.y, pose.headTop.x, pose.headTop.y, 9));
  strokes.push(sampleSegment(pose.headTop.x, pose.headTop.y, pose.stemTop.x, pose.stemTop.y, 4));
  strokes.push(sampleSegment(pose.stemTop.x, pose.stemTop.y, pose.barGrip.x, pose.barGrip.y, 5));
  strokes.push(
    sampleSegment(
      pose.seatCluster.x,
      pose.seatCluster.y,
      (pose.saddleRear.x + pose.saddleFront.x) * 0.5,
      pose.saddleRear.y + 3 * s,
      4
    )
  );
  strokes.push(sampleSegment(pose.saddleRear.x, pose.saddleRear.y, pose.saddleFront.x, pose.saddleFront.y, 6));
  strokes.push(sampleCircle(pose.bb.x, pose.bb.y, 9.5 * s, 12));
  strokes.push(sampleCircle(pose.bellPos.x, pose.bellPos.y, 4.5 * s, 10));

  // 4. Cranks, pedals & both IK legs
  strokes.push(sampleSegment(pose.bb.x, pose.bb.y, pose.leftPedal.x, pose.leftPedal.y, 5));
  strokes.push(sampleSegment(pose.leftPedal.x - 8 * s, pose.leftPedal.y, pose.leftPedal.x + 8 * s, pose.leftPedal.y, 3));
  strokes.push(sampleSegment(pose.hip.x, pose.hip.y, pose.leftKnee.x, pose.leftKnee.y, 7));
  strokes.push(sampleSegment(pose.leftKnee.x, pose.leftKnee.y, pose.leftPedal.x, pose.leftPedal.y, 7));

  strokes.push(sampleSegment(pose.bb.x, pose.bb.y, pose.rightPedal.x, pose.rightPedal.y, 5));
  strokes.push(sampleSegment(pose.rightPedal.x - 8 * s, pose.rightPedal.y, pose.rightPedal.x + 8 * s, pose.rightPedal.y, 3));
  strokes.push(sampleSegment(pose.hip.x, pose.hip.y, pose.rightKnee.x, pose.rightKnee.y, 7));
  strokes.push(sampleSegment(pose.rightKnee.x, pose.rightKnee.y, pose.rightPedal.x, pose.rightPedal.y, 7));

  // 5. Pelican body & tail contour (2 cubic curves)
  const bodyTop = sampleCubic(
    pose.tailTip,
    { x: pose.bodyCenter.x - 42 * s, y: pose.bodyCenter.y - 28 * s },
    { x: pose.bodyCenter.x + 26 * s, y: pose.bodyCenter.y - 34 * s },
    { x: pose.neckBase.x + 12 * s, y: pose.neckBase.y + 8 * s },
    14
  );
  const bodyBot = sampleCubic(
    { x: pose.neckBase.x + 12 * s, y: pose.neckBase.y + 8 * s },
    { x: pose.bodyCenter.x + 36 * s, y: pose.bodyCenter.y + 24 * s },
    { x: pose.hip.x + 16 * s, y: pose.hip.y + 12 * s },
    pose.tailTip,
    14
  );
  strokes.push(bodyTop.concat(bodyBot.slice(1)));

  // 6. Wing contour reaching to handlebars
  const wingTop = sampleCubic(
    { x: pose.shoulder.x - 8 * s, y: pose.shoulder.y - 6 * s },
    { x: pose.wingElbow.x - 10 * s, y: pose.wingElbow.y + 18 * s },
    { x: pose.barGrip.x - 12 * s, y: pose.barGrip.y + 16 * s },
    { x: pose.barGrip.x + 2 * s, y: pose.barGrip.y + 2 * s },
    12
  );
  const wingBot = sampleCubic(
    { x: pose.barGrip.x + 2 * s, y: pose.barGrip.y + 2 * s },
    { x: pose.wingElbow.x + 8 * s, y: pose.wingElbow.y - 8 * s },
    { x: pose.shoulder.x + 12 * s, y: pose.shoulder.y - 10 * s },
    { x: pose.shoulder.x - 8 * s, y: pose.shoulder.y - 6 * s },
    12
  );
  strokes.push(wingTop.concat(wingBot.slice(1)));

  // 7. S-curve neck (exact rig.js cubic Bezier control points for true tubular S-curve)
  const neckC1 = { x: pose.neckBase.x + 14 * s, y: pose.neckBase.y - 28 * s };
  const neckC2 = { x: pose.head.x - 16 * s, y: pose.head.y + 24 * s };
  const neckFront = [];
  const neckBack = [];
  const neckSub = 16;
  for (let i = 0; i <= neckSub; i++) {
    const f = i / neckSub;
    const p = cubicBezierPt(pose.neckBase, neckC1, neckC2, pose.head, f);
    const pNext = cubicBezierPt(pose.neckBase, neckC1, neckC2, pose.head, Math.min(1, f + 0.04));
    const pPrev = cubicBezierPt(pose.neckBase, neckC1, neckC2, pose.head, Math.max(0, f - 0.04));
    const dx = pNext.x - pPrev.x;
    const dy = pNext.y - pPrev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 9.0 * s;
    const ny = (dx / len) * 9.0 * s;
    neckFront.push({ x: p.x + nx, y: p.y + ny });
    neckBack.push({ x: p.x - nx, y: p.y - ny });
  }
  strokes.push(neckFront);
  strokes.push(neckBack);

  // Wheel hubs & wing primary feather ribs for richer CRT vector detail
  strokes.push(sampleCircle(pose.rearHub.x, pose.rearHub.y, 5.5 * s, 10));
  strokes.push(sampleCircle(pose.frontHub.x, pose.frontHub.y, 5.5 * s, 10));
  strokes.push(
    sampleCubic(
      { x: pose.shoulder.x - 4 * s, y: pose.shoulder.y - 1 * s },
      { x: pose.wingElbow.x - 3 * s, y: pose.wingElbow.y + 8 * s },
      { x: pose.barGrip.x - 8 * s, y: pose.barGrip.y + 9 * s },
      { x: pose.barGrip.x, y: pose.barGrip.y + 2 * s },
      8
    )
  );

  // 8. Head circle, crest tufts & eye (with pupil center ring)
  strokes.push(sampleCircle(pose.head.x, pose.head.y, 16.5 * s, 20));
  strokes.push([
    pose.crest1,
    { x: pose.head.x - 6 * s, y: pose.head.y - 16 * s },
    pose.crest2,
    { x: pose.head.x + 6 * s, y: pose.head.y - 17 * s },
  ]);
  strokes.push(sampleCircle(pose.eye.x, pose.eye.y, 4.8 * s, 10));
  strokes.push(sampleCircle(pose.eye.x + 1.2 * s, pose.eye.y, 1.4 * s, 6));

  // 9. Iconic Pelican throat pouch & upper mandible with hook + ridge line
  const pouchPts = sampleCubic(
    pose.pouchBase,
    { x: pose.pouchMid.x - 16 * s, y: pose.pouchMid.y + 12 * s },
    { x: pose.pouchMid.x + 34 * s, y: pose.pouchMid.y + 6 * s },
    { x: pose.beakTip.x - 4 * s, y: pose.beakTip.y + 4 * s },
    16
  );
  strokes.push(pouchPts);
  strokes.push([
    ...sampleSegment(pose.beakBaseTop.x, pose.beakBaseTop.y, pose.beakTip.x, pose.beakTip.y, 6),
    pose.beakHook,
    ...sampleSegment(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s, pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s, 6),
    pose.beakBaseTop,
  ]);
  strokes.push(
    sampleSegment(
      pose.beakBaseTop.x + 6 * s,
      pose.beakBaseTop.y + 6 * s,
      pose.beakTip.x - 10 * s,
      pose.beakTip.y + 3 * s,
      5
    )
  );

  return strokes;
}

/**
 * Computes Bar 2 Lissajous distortion envelope (0 outside [2.0, 3.0), snappy morph into 1.0,
 * and elastic snap-back at Beat 3 u = 3.0s).
 */
function getLissajousState(u) {
  if (u < 1.97 || u > 3.16) {
    return { morph: 0, delta: 0, snapPop: 0 };
  }
  const delta = (u - 2.0) * 11.6;
  if (u < 2.22) {
    const m = smoothstep(1.98, 2.20, u);
    const overshoot = Math.sin(clamp((u - 1.98) / 0.24, 0, 1) * Math.PI) * 0.08;
    return { morph: clamp(m + overshoot, 0, 1), delta, snapPop: 0 };
  }
  if (u <= 2.93) {
    return { morph: 1.0, delta, snapPop: 0 };
  }
  if (u <= 3.02) {
    // Rapid snap back right onto Beat 3 downbeat u = 3.0s
    const back = 1 - smoothstep(2.93, 3.01, u);
    return { morph: back, delta, snapPop: 1 - back };
  }
  // Tiny damped post-snap ringing over 3.02..3.16
  const age = u - 3.02;
  const ring = Math.exp(-age * 28) * Math.sin(age * 52) * 0.045;
  return { morph: ring, delta, snapPop: Math.exp(-age * 16) };
}

/**
 * Warps all vector rig polylines into the spinning 3D 3:4 Lissajous curve:
 * x = cx + A sin(3θ + δ), y = cy + B sin(4θ), with true 3D perspective depth projection.
 */
function warpPolylinesToLissajous(strokes, morph, delta, px, u, jitterX, jitterY) {
  let totalSegs = 0;
  for (const st of strokes) totalSegs += Math.max(1, st.length - 1);

  const mClamped = clamp(morph, 0, 1);
  const lissCx = lerp(px, 492, 0.65 * mClamped);
  const lissCy = lerp(ROAD_Y - 155, 505, mClamped);
  const lissA = 210;
  const lissB = 175;
  const absM = Math.abs(morph);

  const warped = [];
  let cumSeg = 0;

  for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
    const st = strokes[sIdx];
    const out = [];
    for (let i = 0; i < st.length; i++) {
      const pt = st[i];
      const segIdx = cumSeg + i;
      const theta = (segIdx / totalSegs) * Math.PI * 2;

      if (absM > 0.002) {
        const z = Math.cos(3 * theta + delta);
        const persp = 1 / (1 - 0.17 * z);
        const lx = lissCx + lissA * Math.sin(3 * theta + delta) * persp;
        const ly = lissCy + lissB * Math.sin(4 * theta) * persp;
        const swirl = Math.sin(Math.PI * mClamped) * 26;
        const wx =
          lerp(pt.x, lx, morph) +
          Math.sin(theta * 3 + delta) * swirl * 0.38 +
          jitterX;
        const wy =
          lerp(pt.y, ly, morph) +
          Math.cos(theta * 4 + u * 8) * swirl * 0.28 +
          jitterY;
        out.push({ x: wx, y: wy, z, theta });
      } else {
        out.push({ x: pt.x + jitterX, y: pt.y + jitterY, z: 0, theta });
      }
    }
    cumSeg += Math.max(1, st.length - 1);
    warped.push(out);
  }

  return { warped, lissCx, lissCy, lissA, lissB };
}

/**
 * Traces all polylines onto a Canvas2D path in a single batched stroke pass.
 */
function tracePolylines(dc, polylines) {
  dc.beginPath();
  for (const pts of polylines) {
    if (pts.length < 2) continue;
    dc.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      dc.lineTo(pts[i].x, pts[i].y);
    }
  }
}

/**
 * Draws the researcher's silhouette arm + vintage wristwatch reaching in from bottom-right
 * to mis-turn the X-Y PHASE knob at u = 1.94..2.02 and snap it back on Beat 3 (u = 3.0s).
 */
function drawResearcherHand(dc, u, knobX, knobY) {
  if (u < 1.74 || u > 3.22) return;

  // Compute hand anchor relative to knob (knobX=920, knobY=845)
  const restX = knobX + 310;
  const restY = 1120;
  const grabX = knobX + 10;
  const grabY = knobY + 8;
  const hoverX = knobX + 68;
  const hoverY = knobY + 46;

  let hx = restX;
  let hy = restY;
  let wristTwist = -0.18;
  let gripClosed = 0;

  if (u < 1.94) {
    const p = smoothstep(1.74, 1.94, u);
    hx = lerp(restX, grabX, p);
    hy = lerp(restY, grabY, p);
    wristTwist = lerp(-0.22, -0.05, p);
    gripClosed = smoothstep(1.86, 1.94, u);
  } else if (u < 2.04) {
    const p = smoothstep(1.94, 2.02, u);
    hx = grabX;
    hy = grabY;
    wristTwist = lerp(-0.05, 0.72, p); // sharp wrong-click twist!
    gripClosed = 1;
  } else if (u < 2.18) {
    const p = smoothstep(2.04, 2.18, u);
    hx = lerp(grabX, hoverX, p);
    hy = lerp(grabY, hoverY, p);
    wristTwist = lerp(0.72, 0.14, p);
    gripClosed = 1 - p;
  } else if (u < 2.86) {
    // Nervous slight hover right near knob so knob, SIGNAL ERR & wristwatch all stay clearly visible
    const wobble = Math.sin((u - 2.18) * 14) * 2.5;
    hx = hoverX + wobble;
    hy = hoverY + Math.cos((u - 2.18) * 11) * 2.0;
    wristTwist = 0.12 + Math.sin((u - 2.18) * 9) * 0.04;
    gripClosed = 0.25;
  } else if (u < 2.95) {
    const p = smoothstep(2.86, 2.95, u);
    hx = lerp(hoverX, grabX, p);
    hy = lerp(hoverY, grabY, p);
    wristTwist = lerp(0.12, 0.72, p);
    gripClosed = p;
  } else if (u <= 3.02) {
    const p = smoothstep(2.95, 3.01, u);
    hx = grabX;
    hy = grabY;
    wristTwist = lerp(0.72, -0.08, p); // snaps knob straight back to LOCK!
    gripClosed = 1;
  } else {
    const p = smoothstep(3.02, 3.22, u);
    hx = lerp(grabX, restX, p);
    hy = lerp(grabY, restY, p);
    wristTwist = lerp(-0.08, -0.25, p);
    gripClosed = 1 - smoothstep(3.02, 3.10, u);
  }

  dc.save();
  dc.translate(hx, hy);
  dc.rotate(wristTwist);
  dc.scale(0.95, 0.95);

  const armAngle = 0.56;
  dc.save();
  dc.rotate(armAngle);

  // Drop shadow on panel
  dc.fillStyle = "rgba(0, 0, 0, 0.52)";
  dc.beginPath();
  dc.ellipse(104, 14, 150, 32, 0.04, 0, Math.PI * 2);
  dc.fill();

  // Lab-coat sleeve cuff further down forearm
  dc.fillStyle = "#18201c";
  dc.strokeStyle = "rgba(154, 198, 168, 0.34)";
  dc.lineWidth = 2.0;
  dc.beginPath();
  dc.roundRect(128, -32, 240, 64, 12);
  dc.fill();
  dc.stroke();

  // Single unified organic hand + articulated fingers + wrist silhouette (no internal overlap seams)
  const pinch = lerp(17, 7, gripClosed);
  dc.fillStyle = "#080b09";
  dc.strokeStyle = "rgba(148, 226, 174, 0.42)";
  dc.lineWidth = 1.9;
  dc.lineJoin = "round";
  dc.beginPath();
  // Wrist top -> back of hand -> upper thumb
  dc.moveTo(132, -23);
  dc.quadraticCurveTo(75, -24, 34, -27);
  dc.quadraticCurveTo(6, -29, -18, -pinch - 8);
  dc.quadraticCurveTo(-44, -pinch - 14, -52, -pinch - 3);
  dc.quadraticCurveTo(-53, -pinch + 6, -34, -pinch + 8);
  // Web of thumb to index finger
  dc.quadraticCurveTo(-14, -6, -20, -2);
  dc.quadraticCurveTo(-56, -4, -62, 5);
  dc.quadraticCurveTo(-63, 13, -44, 13);
  dc.lineTo(-18, 12);
  // Middle/ring curled fingers
  dc.quadraticCurveTo(-44, 15, -46, 22);
  dc.quadraticCurveTo(-44, 28, -24, 26);
  dc.quadraticCurveTo(4, 29, 36, 26);
  // Palm heel -> wrist bottom
  dc.quadraticCurveTo(76, 24, 132, 23);
  dc.closePath();
  dc.fill();
  dc.stroke();

  // Vintage 1950s Analog Wristwatch on the wrist
  const wx = 82;
  const wy = 0;
  // Stitched dark watch strap across wrist
  dc.fillStyle = "#1c221e";
  dc.strokeStyle = "rgba(185, 206, 192, 0.48)";
  dc.lineWidth = 1.4;
  dc.fillRect(wx - 11, -27, 22, 54);
  dc.strokeRect(wx - 11, -27, 22, 54);

  // Watch lugs + round metallic case + winding crown
  dc.fillStyle = "#97a69c";
  dc.fillRect(wx - 8, -23, 16, 46);
  dc.beginPath();
  dc.arc(wx, wy, 20, 0, Math.PI * 2);
  dc.fill();
  dc.strokeStyle = "#2b332e";
  dc.lineWidth = 1.2;
  dc.stroke();

  dc.fillStyle = "#c8d6cd";
  dc.fillRect(wx - 3, -24.5, 6, 4.5);

  // Radium-cream vintage watch face + crisp dial markers & hands
  dc.fillStyle = "#e6ecd8";
  dc.beginPath();
  dc.arc(wx, wy, 15.2, 0, Math.PI * 2);
  dc.fill();

  dc.strokeStyle = "#19201b";
  dc.lineWidth = 1.5;
  for (let tick = 0; tick < 12; tick++) {
    const a = (tick / 12) * Math.PI * 2;
    dc.beginPath();
    dc.moveTo(wx + Math.cos(a) * 11.2, wy + Math.sin(a) * 11.2);
    dc.lineTo(wx + Math.cos(a) * 14.0, wy + Math.sin(a) * 14.0);
    dc.stroke();
  }
  dc.lineWidth = 2.2;
  dc.lineCap = "round";
  dc.beginPath();
  dc.moveTo(wx, wy);
  dc.lineTo(wx + 7.5, wy - 4.5);
  dc.moveTo(wx, wy);
  dc.lineTo(wx - 3.5, wy - 10.5);
  dc.stroke();

  dc.restore();
  dc.restore();
}

export default function render(ctx) {
  const { p, g, kit, t, localTime } = ctx;
  const u = localTime;
  const dc = g.drawingContext;

  // 1. Baked 1950s Oscilloscope front panel & P1 CRT graticule
  const chassis = kit.bakeLayer("s15_osc_chassis_v1", 1840, 1000, bakeOscilloscopeChassis);
  p.push();
  p.imageMode(p.CENTER);
  p.image(chassis, 500, 500, 1840, 1000);
  p.pop();

  // 2. Dynamic instrument panel controls & indicator lamps
  // X-Y PHASE knob angle: 0 at LOCK, snaps +0.91 rad (+52 deg) at u=1.94..2.02, snaps back at u=2.95..3.01
  let phaseKnobAngle = 0;
  if (u >= 1.94 && u < 2.95) {
    phaseKnobAngle = 0.91 * smoothstep(1.94, 2.02, u);
  } else if (u >= 2.95 && u < 3.04) {
    phaseKnobAngle = 0.91 * (1 - smoothstep(2.95, 3.01, u));
  }

  const isErrActive = u >= 1.98 && u < 3.04;
  const errFlash = isErrActive
    ? (0.76 + 0.24 * Math.abs(Math.sin((u - 1.98) * Math.PI * 5))) *
      (u > 3.0 ? 1 - smoothstep(3.0, 3.04, u) : 1)
    : 0;

  // Static panel knobs with slight alive dial settings + hero X-Y PHASE knob
  drawDynamicKnob(dc, -195, 245, 34, -0.42);
  drawDynamicKnob(dc, -70, 245, 34, 0.25);
  drawDynamicKnob(dc, -195, 845, 32, 0.65);
  drawDynamicKnob(dc, -70, 845, 32, -0.15);
  drawDynamicKnob(dc, 1020, 225, 34, 0.48 + (isErrActive ? 0.08 * Math.sin(u * 40) : 0));
  drawDynamicKnob(dc, 1160, 225, 34, -0.32);
  drawDynamicKnob(dc, PHASE_KNOB_X, PHASE_KNOB_Y, 42, phaseKnobAngle, errFlash > 0.1);
  drawDynamicKnob(dc, 1140, 850, 34, 0.18);

  // Dynamic BEAM mA meter needle
  dc.save();
  dc.translate(-132, 110);
  const turnOnSurge = u <= 0.45 ? Math.exp(-Math.max(0, u + 0.1) * 6) * 0.35 : 0;
  const meterVal = clamp(
    0.58 +
      0.04 * Math.sin(t * 24) +
      turnOnSurge +
      (isErrActive ? 0.28 + 0.12 * Math.sin(u * 45) : 0),
    0.05,
    0.98
  );
  const needleAng = lerp(-Math.PI * 0.78, -Math.PI * 0.22, meterVal);
  dc.strokeStyle = "#b82d22";
  dc.lineWidth = 2;
  dc.beginPath();
  dc.moveTo(0, 22);
  dc.lineTo(Math.cos(needleAng) * 46, 26 + Math.sin(needleAng) * 46);
  dc.stroke();
  dc.restore();

  // Steady emerald POWER pilot jewel
  dc.save();
  const pwrPulse = 0.88 + 0.12 * Math.sin(t * 6.283);
  const pwrGrad = dc.createRadialGradient(PWR_LAMP_X, PWR_LAMP_Y, 1, PWR_LAMP_X, PWR_LAMP_Y, 26);
  pwrGrad.addColorStop(0, `rgba(200, 255, 216, ${0.95 * pwrPulse})`);
  pwrGrad.addColorStop(0.35, `rgba(66, 255, 122, ${0.75 * pwrPulse})`);
  pwrGrad.addColorStop(1, "rgba(66, 255, 122, 0)");
  dc.fillStyle = pwrGrad;
  dc.beginPath();
  dc.arc(PWR_LAMP_X, PWR_LAMP_Y, 26, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // SIGNAL ERR warning jewel lamp (dim ruby when off, blazing red alert during Bar 2 error)
  dc.save();
  dc.fillStyle = errFlash > 0.01 ? "#ff2c22" : "#330b09";
  dc.beginPath();
  dc.arc(ERR_LAMP_X, ERR_LAMP_Y, 13.5, 0, Math.PI * 2);
  dc.fill();
  if (errFlash > 0.01) {
    const errHalo = dc.createRadialGradient(ERR_LAMP_X, ERR_LAMP_Y, 2, ERR_LAMP_X, ERR_LAMP_Y, 64);
    errHalo.addColorStop(0, `rgba(255, 240, 236, ${0.98 * errFlash})`);
    errHalo.addColorStop(0.18, `rgba(255, 62, 50, ${0.94 * errFlash})`);
    errHalo.addColorStop(0.45, `rgba(255, 34, 24, ${0.52 * errFlash})`);
    errHalo.addColorStop(1, "rgba(255, 34, 24, 0)");
    dc.fillStyle = errHalo;
    dc.beginPath();
    dc.arc(ERR_LAMP_X, ERR_LAMP_Y, 64, 0, Math.PI * 2);
    dc.fill();

    // Glowing lit crimson jewel highlight + illuminated SIGNAL ERR badge border
    dc.fillStyle = `rgba(255, 215, 210, ${0.9 * errFlash})`;
    dc.beginPath();
    dc.arc(ERR_LAMP_X - 3, ERR_LAMP_Y - 3, 4.2, 0, Math.PI * 2);
    dc.fill();

    dc.strokeStyle = `rgba(255, 86, 74, ${0.95 * errFlash})`;
    dc.lineWidth = 2.0;
    dc.strokeRect(ERR_LAMP_X - 46, ERR_LAMP_Y + 25, 92, 20);
  }
  dc.restore();

  // 3. Electron-Beam Phosphor Traces (additive "lighter" blend for authentic P1 glow!)
  dc.save();
  dc.globalCompositeOperation = "lighter";
  dc.lineCap = "round";
  dc.lineJoin = "round";

  const { morph, delta, snapPop } = getLissajousState(u);

  // Subtle 60Hz scan hum & beam flicker (tapered near portal seams so x=-420 & x=1420 lock cleanly)
  const portalQuiet = smoothstep(0.0, 0.18, u) * (1 - smoothstep(5.82, 6.0, u));
  const jitterX = (Math.sin(t * 377.0) * 0.65 + Math.cos(t * 239.0) * 0.32) * portalQuiet;
  const jitterY = (Math.cos(t * 377.0 + 1.1) * 0.55 + Math.sin(t * 188.5) * 0.25) * portalQuiet;
  const beamFlicker = 0.94 + 0.06 * Math.sin(t * 377.0);

  // 3a. Continuous glowing ROAD_Y = 730 horizontal phosphor baseline
  const basePts = [];
  const stepX = 16;
  for (let bx = BLEED_LEFT - 20; bx <= BLEED_RIGHT + 20; bx += stepX) {
    let by = ROAD_Y;
    // Slight oscilloscope trace ripple strictly inside central CRT window
    if (bx > 135 && bx < 865) {
      const env = Math.sin(((bx - 135) / 730) * Math.PI);
      const errRipple =
        Math.abs(morph) > 0.05
          ? Math.sin(bx * 0.08 + t * 42) * 5.5 * Math.abs(morph)
          : Math.sin(bx * 0.14 + t * 28) * 0.65;
      const surgeRipple = u <= 0.45 ? Math.sin(bx * 0.19 - u * 45) * 3.5 * (1 - smoothstep(0.0, 0.45, u)) : 0;
      by += (errRipple + surgeRipple) * env;
    }
    basePts.push({ x: bx, y: by });
  }
  const baseArr = [basePts];
  dc.strokeStyle = "rgba(66, 255, 122, 0.18)";
  dc.lineWidth = 10;
  tracePolylines(dc, baseArr);
  dc.stroke();

  dc.strokeStyle = "rgba(66, 255, 122, 0.58)";
  dc.lineWidth = 3.8;
  tracePolylines(dc, baseArr);
  dc.stroke();

  dc.strokeStyle = "#c8ffd8";
  dc.lineWidth = 1.5;
  tracePolylines(dc, baseArr);
  dc.stroke();

  // 3b. 3 Decaying Persistence Afterglow Trail Layers (oldest -> newest)
  const isLissMode = Math.abs(morph) > 0.08;
  const trailOffsets = isLissMode ? [0.108, 0.072, 0.036] : [0.096, 0.062, 0.030];
  const trailAlphas = isLissMode ? [0.24, 0.40, 0.62] : [0.12, 0.23, 0.38];

  for (let ti = 0; ti < trailOffsets.length; ti++) {
    const dt = trailOffsets[ti];
    const tTrail = t - dt;
    const uTrail = u - dt;
    const pxTrail = getScenePelicanX(uTrail);
    const poseTrail = getRigPose(tTrail, { x: pxTrail, y: ROAD_Y, scale: 1.0 });
    const strokesTrail = buildVectorRigPolylines(poseTrail);
    const stTrail = getLissajousState(uTrail);
    const jxTrail = Math.sin(tTrail * 377.0) * 0.45 * portalQuiet;
    const jyTrail = Math.cos(tTrail * 377.0 + 1.1) * 0.4 * portalQuiet;
    const { warped: trailPolys } = warpPolylinesToLissajous(
      strokesTrail,
      stTrail.morph,
      stTrail.delta,
      pxTrail,
      uTrail,
      jxTrail,
      jyTrail
    );

    const a = trailAlphas[ti];
    dc.strokeStyle = `rgba(38, 215, 96, ${a * 0.40})`;
    dc.lineWidth = 9.5;
    tracePolylines(dc, trailPolys);
    dc.stroke();

    dc.strokeStyle = `rgba(66, 255, 122, ${a * 0.88})`;
    dc.lineWidth = 2.6;
    tracePolylines(dc, trailPolys);
    dc.stroke();
  }

  // 3c. Active Current Electron-Beam Vector Pelican / Lissajous
  const px = getScenePelicanX(u);
  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
  const activeStrokes = buildVectorRigPolylines(pose);
  const { warped: activePolys, lissCx, lissCy, lissA, lissB } = warpPolylinesToLissajous(
    activeStrokes,
    morph,
    delta,
    px,
    u,
    jitterX,
    jitterY
  );

  // Outer P1 bloom (#42ff7a)
  dc.strokeStyle = `rgba(66, 255, 122, ${0.18 * beamFlicker})`;
  dc.lineWidth = 13.5;
  tracePolylines(dc, activePolys);
  dc.stroke();

  // Mid glowing P1 trace (#42ff7a)
  dc.strokeStyle = `rgba(66, 255, 122, ${0.60 * beamFlicker})`;
  dc.lineWidth = 5.2;
  tracePolylines(dc, activePolys);
  dc.stroke();

  // Bright electron beam core (#c8ffd8)
  dc.strokeStyle = "#c8ffd8";
  dc.lineWidth = 2.0;
  tracePolylines(dc, activePolys);
  dc.stroke();

  // Extra 3D spatial depth highlight on front-facing arcs (z > 0.22) during Lissajous rotation
  if (Math.abs(morph) > 0.15) {
    dc.beginPath();
    for (const pts of activePolys) {
      for (let i = 0; i < pts.length - 1; i++) {
        if (pts[i].z > 0.22) {
          dc.moveTo(pts[i].x, pts[i].y);
          dc.lineTo(pts[i + 1].x, pts[i + 1].y);
        }
      }
    }
    dc.strokeStyle = `rgba(224, 255, 236, ${0.82 * Math.min(1, Math.abs(morph))})`;
    dc.lineWidth = 3.2;
    dc.stroke();

    // Hot electron beam scanning spot racing along the 3:4 Lissajous curve
    const spotTheta = posMod(u * 14.5, Math.PI * 2);
    const sz = Math.cos(3 * spotTheta + delta);
    const sPersp = 1 / (1 - 0.17 * sz);
    const sx = lissCx + lissA * Math.sin(3 * spotTheta + delta) * sPersp;
    const sy = lissCy + lissB * Math.sin(4 * spotTheta) * sPersp;
    const spotGrad = dc.createRadialGradient(sx, sy, 1, sx, sy, 22);
    spotGrad.addColorStop(0, "#ffffff");
    spotGrad.addColorStop(0.35, "rgba(200, 255, 216, 0.85)");
    spotGrad.addColorStop(1, "rgba(66, 255, 122, 0)");
    dc.fillStyle = spotGrad;
    dc.beginPath();
    dc.arc(sx, sy, 22, 0, Math.PI * 2);
    dc.fill();
  }

  // 3d. 14 -> 15 Power-On Cyan-Green Electric Arc Sparks (u <= 0.45)
  if (u >= -0.35 && u <= 0.45) {
    const sparkEnv = smoothstep(-0.30, -0.02, u) * (1 - smoothstep(0.10, 0.45, u));
    if (sparkEnv > 0.02) {
      const anchors = [
        pose.rearHub,
        pose.frontHub,
        pose.head,
        pose.beakTip,
        pose.saddleFront,
        pose.barGrip,
        { x: px - 68, y: ROAD_Y - 4 },
        { x: px + 68, y: ROAD_Y - 4 },
      ];
      const sparkStep = Math.floor(posMod(u * 28, 100));
      const sRand = prng(1500 + sparkStep * 97);
      const sparkNodes = [];

      dc.beginPath();
      for (let k = 0; k < anchors.length; k++) {
        const a = anchors[k];
        let cx = a.x;
        let cy = Math.min(ROAD_Y - 2, a.y);
        dc.moveTo(cx, cy);
        const segs = 4;
        for (let m = 1; m <= segs; m++) {
          cx += (sRand() - 0.40) * 28;
          cy = Math.min(ROAD_Y - 2, cy + (sRand() - 0.62) * 24);
          dc.lineTo(cx, cy);
          if (m === segs) sparkNodes.push({ x: cx, y: cy });
        }
      }
      dc.strokeStyle = `rgba(98, 255, 228, ${0.52 * sparkEnv})`;
      dc.lineWidth = 4.8;
      dc.stroke();

      dc.strokeStyle = `rgba(225, 255, 248, ${0.98 * sparkEnv})`;
      dc.lineWidth = 1.7;
      dc.stroke();

      dc.fillStyle = `rgba(195, 255, 245, ${0.9 * sparkEnv})`;
      for (const sn of sparkNodes) {
        dc.beginPath();
        dc.arc(sn.x, sn.y, 2.4, 0, Math.PI * 2);
        dc.fill();
      }
    }
  }

  // 3e. Beat 3 Snap-Back Sync Pulse Ring (u in [2.98, 3.20])
  if (snapPop > 0.03) {
    const ringR = Math.max(0.5, 45 + (1 - snapPop) * 220);
    dc.strokeStyle = `rgba(180, 255, 208, ${0.42 * snapPop})`;
    dc.lineWidth = 2.4;
    dc.beginPath();
    dc.arc(px, ROAD_Y - 130, ringR, 0, Math.PI * 2);
    dc.stroke();
  }

  dc.restore();

  // 4. Subtle CRT glass specular arc over the active phosphor inside the circular bezel
  dc.save();
  dc.beginPath();
  dc.arc(CRT_CX, CRT_CY, CRT_R, 0, Math.PI * 2);
  dc.clip();
  const glassGloss = dc.createLinearGradient(120, 90, 480, 420);
  glassGloss.addColorStop(0, "rgba(180, 255, 210, 0.055)");
  glassGloss.addColorStop(0.55, "rgba(180, 255, 210, 0.015)");
  glassGloss.addColorStop(1, "rgba(180, 255, 210, 0)");
  dc.fillStyle = glassGloss;
  dc.beginPath();
  dc.ellipse(315, 255, 275, 130, -0.52, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // 5. Researcher's silhouette hand with vintage wristwatch (u in [1.74, 3.30])
  drawResearcherHand(dc, u, PHASE_KNOB_X, PHASE_KNOB_Y);

  // 6. Era Title Card (P1 CRT monospace phosphor plate)
  drawEraTitleCard(g, META, u);
}
