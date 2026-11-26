/**
 * Scene #04 — 唐代白描 · Tang Baimiao Linework (c. 750 CE), t in [23.0, 29.0).
 * Homage to High Tang Wu Daozi's "Wu's Ribbons Billowing in the Wind" (吴带当风):
 * pure monochrome ink linework (兰叶描 / 莼菜条 / 飞白) on warm Xuan paper, with zero
 * flat color fills (only the mounted scroll Title Card & upper-right collector seals use cinnabar).
 * Two pure-baimiao Tang celestial musicians on drifting clouds make way and look askance,
 * while in Bar 2 (u in [2.0, 4.0)) a sudden fierce gale sweeps diagonally across the scroll,
 * whipping the Pelican's crest plumes, layered wing feathers, and 5 long Tang silk ribbons (披帛)
 * backward in dramatic standing/traveling waves as the Pelican keeps pedaling deadpan at 120 BPM.
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
import {
  INK_MODES,
  drawFeibaiStroke,
  drawRedSeal,
  getInkPaperLayer,
} from "../kit/ink.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[3];
const PAL = INK_MODES.baimiao;

// ---------- Deterministic PRNG & Curve Samplers ----------

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sampleCubicBezier(p0, p1, p2, p3, steps = 18) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const u = 1 - s;
    const x =
      u * u * u * p0[0] +
      3 * u * u * s * p1[0] +
      3 * u * s * s * p2[0] +
      s * s * s * p3[0];
    const y =
      u * u * u * p0[1] +
      3 * u * u * s * p1[1] +
      3 * u * s * s * p2[1] +
      s * s * s * p3[1];

    let dx =
      3 * u * u * (p1[0] - p0[0]) +
      6 * u * s * (p2[0] - p1[0]) +
      3 * s * s * (p3[0] - p2[0]);
    let dy =
      3 * u * u * (p1[1] - p0[1]) +
      6 * u * s * (p2[1] - p1[1]) +
      3 * s * s * (p3[1] - p2[1]);
    let len = Math.hypot(dx, dy);
    if (len < 1e-4) {
      dx = p3[0] - p0[0];
      dy = p3[1] - p0[1];
      len = Math.hypot(dx, dy) || 1;
    }
    pts.push({ x, y, tx: dx / len, ty: dy / len, s });
  }
  return pts;
}

function sampleCatmullRom(ctrlPts, segSteps = 8) {
  if (!ctrlPts || ctrlPts.length < 2) return [];
  if (ctrlPts.length === 2) {
    const [a, b] = ctrlPts;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const out = [];
    for (let i = 0; i <= segSteps; i++) {
      const s = i / segSteps;
      out.push({
        x: lerp(a[0], b[0], s),
        y: lerp(a[1], b[1], s),
        tx: dx / len,
        ty: dy / len,
        s,
      });
    }
    return out;
  }

  const n = ctrlPts.length;
  const ext = [
    [2 * ctrlPts[0][0] - ctrlPts[1][0], 2 * ctrlPts[0][1] - ctrlPts[1][1]],
    ...ctrlPts,
    [2 * ctrlPts[n - 1][0] - ctrlPts[n - 2][0], 2 * ctrlPts[n - 1][1] - ctrlPts[n - 2][1]],
  ];

  const raw = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1];
    const p1 = ext[i];
    const p2 = ext[i + 1];
    const p3 = ext[i + 2];
    const endStep = i === ext.length - 3 ? segSteps : segSteps - 1;
    for (let k = 0; k <= endStep; k++) {
      const t = k / segSteps;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      const dx =
        0.5 *
        ((-p0[0] + p2[0]) +
          2 * (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t +
          3 * (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t2);
      const dy =
        0.5 *
        ((-p0[1] + p2[1]) +
          2 * (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t +
          3 * (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t2);
      const len = Math.hypot(dx, dy) || 1;
      raw.push({ x, y, tx: dx / len, ty: dy / len, s: 0 });
    }
  }
  const total = Math.max(1, raw.length - 1);
  for (let i = 0; i < raw.length; i++) raw[i].s = i / total;
  return raw;
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ---------- Calligraphic Baimiao Stroke Engine (兰叶描 / 莼菜条) ----------

function drawBaimiaoStroke(g, samples, opts = {}) {
  if (!samples || samples.length < 2) return;
  const width = opts.width ?? 2.6;
  const minW = opts.minWidth ?? 0.28;
  const style = opts.style ?? "lanye";
  const color = opts.color ?? PAL.inkDark;
  const alpha = opts.alpha ?? 0.94;
  const phase = opts.phase ?? 0;

  const [r, gr, b] = hexToRgb(color);
  const dc = g.drawingContext;
  const n = samples.length;

  const leftPts = new Array(n);
  const rightPts = new Array(n);

  for (let i = 0; i < n; i++) {
    const pt = samples[i];
    const s = pt.s ?? i / (n - 1);

    let profile = 1.0;
    if (style === "lanye") {
      const entry = smoothstep(0.0, 0.07, s);
      const belly = Math.pow(Math.sin(Math.PI * Math.pow(s, 0.86)), 0.72);
      const rhythm = 0.88 + 0.14 * Math.sin(s * Math.PI * 2.2 + phase);
      profile = (0.14 + 0.86 * belly * (0.45 + 0.55 * entry)) * rhythm;
    } else if (style === "chuncai") {
      const ends = Math.pow(Math.sin(Math.PI * clamp(0.06 + s * 0.88, 0, 1)), 0.36);
      const breath = 0.86 + 0.18 * Math.sin(s * Math.PI * 2.5 + phase);
      profile = ends * breath;
    } else if (style === "taperOut") {
      const head = 0.72 + 0.28 * Math.sin(Math.min(1, s * 10) * (Math.PI / 2));
      const tail = Math.pow(1 - s, 0.82);
      profile = head * tail;
    } else if (style === "taperBoth") {
      profile = Math.pow(Math.sin(Math.PI * s), 0.62);
    }

    const hw = Math.max(minW * 0.5, width * 0.5 * profile);
    const nx = -pt.ty;
    const ny = pt.tx;
    leftPts[i] = [pt.x + nx * hw, pt.y + ny * hw];
    rightPts[i] = [pt.x - nx * hw, pt.y - ny * hw];
  }

  dc.save();
  dc.fillStyle = `rgba(${r},${gr},${b},${alpha.toFixed(3)})`;
  dc.beginPath();
  dc.moveTo(leftPts[0][0], leftPts[0][1]);
  for (let i = 1; i < n; i++) dc.lineTo(leftPts[i][0], leftPts[i][1]);
  for (let i = n - 1; i >= 0; i--) dc.lineTo(rightPts[i][0], rightPts[i][1]);
  dc.closePath();
  dc.fill();
  dc.restore();
}

function drawBaimiaoCubic(g, p0, p1, p2, p3, opts = {}, steps = 18) {
  drawBaimiaoStroke(g, sampleCubicBezier(p0, p1, p2, p3, steps), opts);
}

function drawBaimiaoSpline(g, ctrlPts, opts = {}, segSteps = 8) {
  drawBaimiaoStroke(g, sampleCatmullRom(ctrlPts, segSteps), opts);
}

/**
 * Draws a twisting 3D Tang silk ribbon (披帛) using two crossing ink-line edges
 * and a sheer Xuan-paper ground reserve so twists & crossings read vividly.
 */
function drawSilkRibbon(g, spineSamples, opts = {}) {
  if (!spineSamples || spineSamples.length < 3) return;
  const halfW = opts.halfWidth ?? 6.5;
  const twistFreq = opts.twistFreq ?? 6.2;
  const twistPhase = opts.twistPhase ?? 0;
  const edgeWidth = opts.edgeWidth ?? 2.15;
  const color = opts.color ?? PAL.inkDark;
  const alpha = opts.alpha ?? 0.92;
  const veilAlpha = opts.veilAlpha ?? 0.44;
  const foldAlpha = opts.foldAlpha ?? 0.22;

  const n = spineSamples.length;
  const edgeA = new Array(n);
  const edgeB = new Array(n);
  const midPts = new Array(n);

  for (let i = 0; i < n; i++) {
    const pt = spineSamples[i];
    const s = pt.s;
    const taper =
      smoothstep(0.0, 0.08, s) * 0.56 + 0.44 * (1 - smoothstep(0.68, 1.0, s));
    const finalTip = 1 - Math.pow(s, 3.1);
    const twist = Math.cos(twistPhase + s * twistFreq);
    const hw = halfW * taper * finalTip * twist;
    const nx = -pt.ty;
    const ny = pt.tx;

    edgeA[i] = { x: pt.x + nx * hw, y: pt.y + ny * hw, tx: pt.tx, ty: pt.ty, s };
    edgeB[i] = { x: pt.x - nx * hw, y: pt.y - ny * hw, tx: pt.tx, ty: pt.ty, s };
    midPts[i] = { x: pt.x + nx * hw * 0.16, y: pt.y + ny * hw * 0.16, tx: pt.tx, ty: pt.ty, s };
  }

  if (veilAlpha > 0.01) {
    const dc = g.drawingContext;
    dc.save();
    dc.fillStyle = `rgba(239, 230, 210, ${veilAlpha.toFixed(3)})`;
    dc.beginPath();
    dc.moveTo(edgeA[0].x, edgeA[0].y);
    for (let i = 1; i < n; i++) dc.lineTo(edgeA[i].x, edgeA[i].y);
    for (let i = n - 1; i >= 0; i--) dc.lineTo(edgeB[i].x, edgeB[i].y);
    dc.closePath();
    dc.fill();
    dc.restore();
  }

  if (foldAlpha > 0.01) {
    drawBaimiaoStroke(g, midPts, {
      width: edgeWidth * 0.45,
      minWidth: 0.2,
      style: "taperBoth",
      color: PAL.inkMid,
      alpha: foldAlpha,
    });
  }

  drawBaimiaoStroke(g, edgeA, {
    width: edgeWidth,
    minWidth: 0.26,
    style: "lanye",
    color,
    alpha,
    phase: twistPhase,
  });
  drawBaimiaoStroke(g, edgeB, {
    width: edgeWidth * 0.88,
    minWidth: 0.24,
    style: "chuncai",
    color,
    alpha: alpha * 0.9,
    phase: twistPhase + 1.2,
  });
}

// ---------- Static Baked Backdrop (Distant Tang Arc Ridges & Cursive Ink Road) ----------

function bakeTangBackdrop(pg) {
  pg.clear();
  pg.push();
  pg.translate(-BLEED_LEFT, 0);

  // 1. Serene undulating High Tang distant mountain contours (pure pale-ink chuncai arcs)
  const farRidges = [
    {
      pts: [
        [-440, 610],
        [-240, 520],
        [-30, 565],
        [190, 470],
        [430, 545],
        [670, 462],
        [920, 532],
        [1180, 476],
        [1440, 558],
      ],
      width: 2.3,
      color: PAL.inkLight,
      alpha: 0.46,
    },
    {
      pts: [
        [-430, 642],
        [-180, 578],
        [60, 612],
        [320, 548],
        [560, 608],
        [810, 538],
        [1060, 595],
        [1290, 548],
        [1440, 612],
      ],
      width: 2.8,
      color: PAL.inkMid,
      alpha: 0.42,
    },
    {
      pts: [
        [-360, 560],
        [-238, 534],
        [-145, 562],
      ],
      width: 1.5,
      color: PAL.inkLight,
      alpha: 0.36,
    },
    {
      pts: [
        [120, 535],
        [192, 488],
        [278, 522],
      ],
      width: 1.5,
      color: PAL.inkLight,
      alpha: 0.4,
    },
    {
      pts: [
        [595, 520],
        [672, 476],
        [758, 514],
      ],
      width: 1.6,
      color: PAL.inkLight,
      alpha: 0.42,
    },
    {
      pts: [
        [1100, 528],
        [1182, 492],
        [1255, 526],
      ],
      width: 1.5,
      color: PAL.inkLight,
      alpha: 0.38,
    },
  ];
  for (let i = 0; i < farRidges.length; i++) {
    const r = farRidges[i];
    drawBaimiaoSpline(
      pg,
      r.pts,
      { width: r.width, minWidth: 0.35, style: "chuncai", color: r.color, alpha: r.alpha, phase: i },
      12
    );
  }

  // Distant hillside ink-line cypress/pine cluster & tiny Tang curved-eave pavilion
  const drawDistantTree = (tx, ty, s) => {
    drawBaimiaoSpline(
      pg,
      [
        [tx, ty],
        [tx - 2 * s, ty - 16 * s],
        [tx + 1 * s, ty - 34 * s],
      ],
      { width: 1.6 * s, style: "taperOut", color: PAL.inkMid, alpha: 0.45 },
      6
    );
    for (let k = 0; k < 3; k++) {
      const ly = ty - (16 + k * 7) * s;
      const w = (14 - k * 3) * s;
      drawBaimiaoSpline(
        pg,
        [
          [tx - w, ly + 2 * s],
          [tx, ly - 3 * s],
          [tx + w, ly + 2 * s],
        ],
        { width: 1.3 * s, style: "chuncai", color: PAL.inkMid, alpha: 0.38 },
        5
      );
    }
  };
  drawDistantTree(255, 510, 0.88);
  drawDistantTree(274, 516, 0.72);
  drawDistantTree(1015, 578, 0.82);

  pg.push();
  pg.noFill();
  pg.stroke(PAL.inkMid);
  pg.strokeWeight(1.1);
  pg.drawingContext.globalAlpha = 0.42;
  pg.beginShape();
  pg.vertex(742, 540);
  pg.vertex(760, 530);
  pg.vertex(778, 540);
  pg.endShape();
  pg.line(749, 540, 749, 550);
  pg.line(771, 540, 771, 550);
  pg.line(744, 550, 776, 550);
  pg.pop();

  // 2. Continuous ancient Tang road at ROAD_Y = 730 (fluid cursive brushwork across bleed)
  drawFeibaiStroke(
    pg,
    [
      [-420, ROAD_Y],
      [-160, ROAD_Y + 0.5],
      [140, ROAD_Y - 0.5],
      [500, ROAD_Y + 0.5],
      [880, ROAD_Y - 0.5],
      [1180, ROAD_Y + 0.5],
      [1420, ROAD_Y],
    ],
    4.2,
    PAL.inkDark,
    0.45,
    401
  );
  drawBaimiaoSpline(
    pg,
    [
      [-420, ROAD_Y],
      [20, ROAD_Y + 0.8],
      [500, ROAD_Y],
      [980, ROAD_Y + 0.8],
      [1420, ROAD_Y],
    ],
    { width: 2.4, minWidth: 0.9, style: "chuncai", color: PAL.inkDark, alpha: 0.88 },
    16
  );

  // Flowing cursive Tang calligraphy ground curves & terrace ink strokes below ROAD_Y
  const rand = prng(75009);
  const groundRibbons = [
    [
      [-405, ROAD_Y + 9],
      [-260, ROAD_Y + 13],
      [-90, ROAD_Y + 7],
      [90, ROAD_Y + 14],
    ],
    [
      [55, ROAD_Y + 21],
      [285, ROAD_Y + 13],
      [510, ROAD_Y + 22],
      [755, ROAD_Y + 12],
    ],
    [
      [720, ROAD_Y + 9],
      [940, ROAD_Y + 18],
      [1180, ROAD_Y + 10],
      [1405, ROAD_Y + 14],
    ],
    [
      [-340, ROAD_Y + 32],
      [-150, ROAD_Y + 42],
      [45, ROAD_Y + 29],
      [210, ROAD_Y + 38],
    ],
    [
      [350, ROAD_Y + 36],
      [590, ROAD_Y + 47],
      [860, ROAD_Y + 31],
      [1140, ROAD_Y + 43],
      [1350, ROAD_Y + 35],
    ],
  ];
  for (let i = 0; i < groundRibbons.length; i++) {
    drawBaimiaoSpline(
      pg,
      groundRibbons[i],
      {
        width: 2.5 - (i % 2) * 0.55,
        minWidth: 0.25,
        style: i % 2 === 0 ? "lanye" : "chuncai",
        color: i < 3 ? PAL.inkMid : PAL.inkLight,
        alpha: i < 3 ? 0.62 : 0.44,
        phase: i * 1.1,
      },
      14
    );
  }

  // Smoothly curved dry-brush (飞白) cursive accents along the road edge
  for (let i = 0; i < 7; i++) {
    const x0 = -350 + i * 255 + (rand() - 0.5) * 40;
    const y0 = ROAD_Y + 11 + rand() * 24;
    const len = 115 + rand() * 85;
    const curve = sampleCatmullRom(
      [
        [x0, y0],
        [x0 + len * 0.35, y0 + (rand() - 0.5) * 9],
        [x0 + len * 0.72, y0 + (rand() - 0.5) * 10],
        [x0 + len, y0 + (rand() - 0.5) * 7],
      ],
      6
    ).map((pt) => [pt.x, pt.y]);
    drawFeibaiStroke(pg, curve, 3.2 + rand() * 1.8, PAL.inkMid, 0.62, 430 + i);
  }

  // Organic pure-ink stone contours scattered along the trail
  for (let i = 0; i < 14; i++) {
    const sx = -320 + i * 124 + (rand() - 0.5) * 40;
    const sy = ROAD_Y + 14 + rand() * 38;
    const rx = 6 + rand() * 8;
    const ry = 2.6 + rand() * 3.2;
    drawBaimiaoSpline(
      pg,
      [
        [sx - rx, sy + 1],
        [sx - rx * 0.3, sy - ry],
        [sx + rx * 0.6, sy - ry * 0.5],
        [sx + rx, sy + 1],
      ],
      { width: 1.4, minWidth: 0.22, style: "lanye", color: PAL.inkMid, alpha: 0.5 },
      5
    );
  }

  pg.pop();
}

// ---------- Flowing Tang Rolling Clouds (流动唐代如意卷云) ----------

function drawTangCloud(g, cx, cy, scale, dir, driftX, windFactor, alpha = 0.65) {
  g.push();
  g.translate(cx + driftX, cy);
  g.scale(dir * scale, scale);

  const stretch = 1 + windFactor * 0.28;
  const flutter = Math.sin(driftX * 0.08 + cx * 0.01) * (2.5 + windFactor * 6.5);

  // Main Tang ruyi-head spiral (pure chuncai line)
  drawBaimiaoSpline(
    g,
    [
      [-74 * stretch, 12],
      [-34 * stretch, 15 + flutter * 0.2],
      [-8, -5],
      [18, -23],
      [43, -16],
      [49, 2],
      [35, 14],
      [19, 9],
      [23, -3],
    ],
    { width: 2.35, minWidth: 0.28, style: "chuncai", color: PAL.inkMid, alpha },
    7
  );

  // Secondary upper ruyi crest coil
  drawBaimiaoSpline(
    g,
    [
      [-18, -8],
      [-2, -29],
      [24, -37],
      [53, -29],
      [65, -10],
      [53, 2],
    ],
    { width: 1.9, minWidth: 0.24, style: "lanye", color: PAL.inkMid, alpha: alpha * 0.85 },
    7
  );

  // Inner smaller sister coil for authentic multi-lobed Tang cloud silhouette
  drawBaimiaoSpline(
    g,
    [
      [-46 * stretch, 6],
      [-32 * stretch, -12],
      [-14, -18],
      [-4, -8],
    ],
    { width: 1.6, minWidth: 0.22, style: "lanye", color: PAL.inkLight, alpha: alpha * 0.85 },
    6
  );

  // Long streaming horizontal cloud tendrils ("流云尾")
  drawBaimiaoSpline(
    g,
    [
      [-132 * stretch, 24 + flutter * 0.45],
      [-68 * stretch, 18 + flutter * 0.2],
      [4, 24],
      [82 * stretch, 18 - flutter * 0.2],
      [134 * stretch, 8 - flutter * 0.5],
    ],
    { width: 1.75, minWidth: 0.22, style: "taperBoth", color: PAL.inkLight, alpha: alpha * 0.9 },
    8
  );

  drawBaimiaoSpline(
    g,
    [
      [-98 * stretch, 4 + flutter * 0.3],
      [-42 * stretch, -4],
      [8, -14],
    ],
    { width: 1.4, minWidth: 0.2, style: "taperBoth", color: PAL.inkLight, alpha: alpha * 0.78 },
    7
  );

  g.pop();
}

// ---------- Wind-Whipped Wild Grass Tufts (纯墨线风吹野草) ----------

function drawWindGrassTuft(g, x, y, scale, windBend, timePhase, seedOffset) {
  g.push();
  g.translate(x, y);
  g.scale(scale, scale);

  const blades = [
    { ox: -11, h: 38, lean: -0.45, w: 2.3 },
    { ox: -4, h: 50, lean: -0.22, w: 2.6 },
    { ox: 2, h: 44, lean: -0.08, w: 2.3 },
    { ox: 8, h: 33, lean: 0.14, w: 2.0 },
    { ox: 15, h: 25, lean: 0.28, w: 1.8 },
  ];

  for (let i = 0; i < blades.length; i++) {
    const b = blades[i];
    const gustWave = Math.sin(timePhase * (5.5 + windBend * 10) + seedOffset + i * 0.9);
    const bendX = -windBend * (25 + b.h * 0.72) + gustWave * (1.6 + windBend * 5.6);
    const tipY = -b.h * (1 - windBend * 0.38);
    drawBaimiaoCubic(
      g,
      [b.ox, 2],
      [b.ox + b.lean * 12 + bendX * 0.25, -b.h * 0.45],
      [b.ox + b.lean * 18 + bendX * 0.68, tipY * 0.85],
      [b.ox + b.lean * 18 + bendX, tipY],
      { width: b.w, minWidth: 0.2, style: "taperOut", color: PAL.inkDark, alpha: 0.9 },
      10
    );
  }
  g.pop();
}

// ---------- Two Pure-Baimiao Tang Celestial Musicians (乘云让路侧目) ----------

function drawTangMusician(g, spec, px, u, windGust, t) {
  const { baseX, baseY, facing, instrument, seed } = spec;

  const dxPelican = px - baseX;
  const yieldAmount = smoothstep(540, 140, Math.abs(dxPelican));
  const hoverBob = Math.sin(t * 2.0 + seed) * 5.5;
  const yieldLift = -yieldAmount * 22;
  const yieldShift = -facing * yieldAmount * 18;

  const mx = baseX + yieldShift;
  const my = baseY + hoverBob + yieldLift;

  const gazeNorm = clamp(dxPelican / 360, -1, 1);
  const headTurn = gazeNorm * (0.14 + 0.18 * yieldAmount);
  // Subtle Wu Daozi flying S-pose lean away from wind / toward riding cloud
  const bodyLean = -0.06 * facing - windGust * 0.08;

  g.push();
  g.translate(mx, my);
  g.scale(1.26, 1.26);

  // 1. Rich multi-layered auspicious Tang cloud cushion beneath her robe
  drawTangCloud(g, 0, 56, 0.95, facing, 0, windGust, 0.84);
  drawTangCloud(g, -facing * 26, 63, 0.62, -facing, 0, windGust, 0.56);

  // 2. Musician's long Tang Pibo silk ribbons: gentle draped loops in Bar 1 -> fierce backward waves in Bar 2
  const ribbonAnchors = [
    { ax: -facing * 12, ay: -28, len: 155, calmDrop: 24, amp: 16, freq: 6.4, phase: seed },
    { ax: facing * 10, ay: -25, len: 180, calmDrop: 36, amp: 20, freq: 7.4, phase: seed + 1.9 },
  ];
  for (let ri = 0; ri < ribbonAnchors.length; ri++) {
    const rb = ribbonAnchors[ri];
    const rPts = [];
    const totalLen = rb.len * (0.72 + 0.45 * windGust);
    const segs = 24;
    for (let k = 0; k <= segs; k++) {
      const s = k / segs;
      const sx = rb.ax - s * totalLen;
      const waveFreq = rb.freq + windGust * 8.0;
      const waveAmp = (4 + rb.amp * (0.25 + 1.05 * windGust)) * smoothstep(0.0, 0.35, s);
      const wave =
        Math.sin(s * 5.2 - t * waveFreq + rb.phase) * waveAmp +
        Math.sin(s * 9.2 - t * waveFreq * 1.35 + rb.phase) * waveAmp * 0.35;
      const calmArch = rb.calmDrop * Math.sin(s * Math.PI * 0.85) * (1 - windGust * 0.95);
      const windLift = -windGust * (18 + ri * 8) * Math.pow(s, 1.05);
      const sy = rb.ay + calmArch + windLift + wave;
      rPts.push([sx, sy]);
    }
    drawSilkRibbon(g, sampleCatmullRom(rPts, 2), {
      halfWidth: 5.0,
      twistFreq: 5.8 + windGust * 3.5,
      twistPhase: -t * (2.6 + windGust * 4.2) + rb.phase,
      edgeWidth: 1.55,
      color: PAL.inkDark,
      alpha: 0.9,
      veilAlpha: 0.44,
      foldAlpha: 0.18,
    });
  }

  g.push();
  g.rotate(bodyLean);

  // 3. Subtle Xuan-paper body reserve so cloud swirls underneath stay crisp
  const dc = g.drawingContext;
  const hemShift = -windGust * 28;
  dc.save();
  dc.fillStyle = "rgba(239, 230, 210, 0.90)";
  dc.beginPath();
  dc.moveTo(-16, -42);
  dc.lineTo(16, -42);
  dc.bezierCurveTo(28, -8, 36, 32, 24 + hemShift * 0.4, 52);
  dc.bezierCurveTo(2, 58, -24 + hemShift * 0.6, 56, -42 + hemShift, 48);
  dc.bezierCurveTo(-32, 12, -26, -16, -16, -42);
  dc.closePath();
  dc.fill();
  dc.restore();

  // 4. Flowing Tang high-waisted Ruqun skirt (齐胸襦裙) with sinuous drapery lines
  drawBaimiaoCubic(
    g,
    [-13, -25],
    [-22, 6],
    [-31 + hemShift * 0.65, 32],
    [-42 + hemShift, 49],
    { width: 2.3, style: "lanye", color: PAL.inkDark, alpha: 0.94 },
    16
  );
  drawBaimiaoCubic(
    g,
    [13, -25],
    [24, 6],
    [29 + hemShift * 0.35, 34],
    [20 + hemShift * 0.45, 52],
    { width: 2.2, style: "lanye", color: PAL.inkDark, alpha: 0.92 },
    16
  );
  drawBaimiaoSpline(
    g,
    [
      [-42 + hemShift, 49],
      [-18 + hemShift * 0.7, 55],
      [3 + hemShift * 0.5, 51],
      [20 + hemShift * 0.45, 52],
    ],
    { width: 1.8, style: "chuncai", color: PAL.inkDark, alpha: 0.85 },
    6
  );

  // Flowing interior skirt pleats (莼菜条)
  for (let pIdx = -2; pIdx <= 2; pIdx++) {
    const topX = pIdx * 4.8;
    const botX = pIdx * 9.5 + hemShift * (0.72 - pIdx * 0.08);
    drawBaimiaoCubic(
      g,
      [topX, -20],
      [topX - 4 + hemShift * 0.2, 6],
      [botX - hemShift * 0.1, 30],
      [botX, 50],
      { width: 1.15, minWidth: 0.18, style: "taperBoth", color: PAL.inkMid, alpha: 0.72 },
      12
    );
  }

  // Chest-high Ruqun sash tie & wind-blown hanging ribbon ends
  drawBaimiaoSpline(
    g,
    [
      [-12, -23],
      [0, -20],
      [12, -23],
    ],
    { width: 1.85, style: "chuncai", color: PAL.inkDark, alpha: 0.9 },
    5
  );
  drawBaimiaoCubic(
    g,
    [2, -20],
    [-4 - windGust * 12, -4],
    [-12 - windGust * 22, 12],
    [-16 - windGust * 30, 26],
    { width: 1.35, style: "taperOut", color: PAL.inkDark, alpha: 0.82 },
    10
  );

  // 5. Upper blouse & flowing Tang sleeves (广袖)
  drawBaimiaoCubic(
    g,
    [-11, -45],
    [-15, -36],
    [-14, -28],
    [-12, -23],
    { width: 1.9, style: "chuncai", color: PAL.inkDark, alpha: 0.92 },
    10
  );
  drawBaimiaoCubic(
    g,
    [11, -45],
    [15, -36],
    [14, -28],
    [12, -23],
    { width: 1.9, style: "chuncai", color: PAL.inkDark, alpha: 0.92 },
    10
  );
  drawBaimiaoSpline(
    g,
    [
      [-6.5, -46],
      [0, -34],
      [6.5, -46],
    ],
    { width: 1.35, style: "chuncai", color: PAL.inkDark, alpha: 0.88 },
    5
  );

  // Wide draped Tang sleeves billowing leftward in Bar 2
  const slvWind = -windGust * 18;
  drawBaimiaoCubic(
    g,
    [-13, -43],
    [-27, -32],
    [-26 + slvWind, -14],
    [-10 + slvWind * 0.5, -18],
    { width: 1.85, style: "lanye", color: PAL.inkDark, alpha: 0.9 },
    12
  );
  drawBaimiaoCubic(
    g,
    [13, -43],
    [24, -30],
    [17 + slvWind * 0.35, -14],
    [4, -22],
    { width: 1.75, style: "lanye", color: PAL.inkDark, alpha: 0.88 },
    12
  );

  // 6. Musical Instrument ("曲项琵琶" or "横笛") + graceful hands cradling it
  if (instrument === "pipa") {
    g.push();
    g.translate(facing * 4, -28);
    g.rotate(facing * (0.42 - yieldAmount * 0.14));

    dc.save();
    dc.fillStyle = "rgba(239, 230, 210, 0.94)";
    dc.beginPath();
    dc.ellipse(0, 8, 12, 16, 0, 0, Math.PI * 2);
    dc.fill();
    dc.restore();

    drawBaimiaoCubic(
      g,
      [0, -10],
      [14, -6],
      [15, 20],
      [0, 24],
      { width: 1.8, style: "chuncai", color: PAL.inkDark, alpha: 0.94 },
      12
    );
    drawBaimiaoCubic(
      g,
      [0, -10],
      [-14, -6],
      [-15, 20],
      [0, 24],
      { width: 1.8, style: "chuncai", color: PAL.inkDark, alpha: 0.94 },
      12
    );
    drawBaimiaoSpline(
      g,
      [
        [0, -10],
        [0, -24],
        [-7 * facing, -31],
      ],
      { width: 2.0, style: "chuncai", color: PAL.inkDark, alpha: 0.94 },
      6
    );
    g.stroke(PAL.inkDark);
    g.strokeWeight(0.95);
    g.line(-4 * facing, -27, 4 * facing, -27);
    g.line(-4 * facing, -30, 4 * facing, -30);
    g.strokeWeight(0.6);
    for (let sx = -3; sx <= 3; sx += 2) {
      g.line(sx, -22, sx, 16);
    }
    g.strokeWeight(1.0);
    g.line(-5, 16, 5, 16);

    // Graceful plucking hand over Pipa soundboard
    g.fill(PAL.paper);
    g.stroke(PAL.inkDark);
    g.strokeWeight(1.1);
    g.ellipse(4 * facing, 6, 6.5, 4.2);
    g.pop();
  } else {
    // Transverse bamboo flute (横笛) lowered slightly in Bar 2 amazement
    const surpriseDrop = yieldAmount * 9 + windGust * 5;
    g.push();
    g.translate(facing * 5, -45 + surpriseDrop);
    g.rotate(-facing * (0.12 + yieldAmount * 0.24));
    drawBaimiaoSpline(
      g,
      [
        [-28, 0],
        [0, 0],
        [30, 0],
      ],
      { width: 2.1, style: "chuncai", color: PAL.inkDark, alpha: 0.94 },
      6
    );
    g.fill(PAL.inkDark);
    g.noStroke();
    for (let hx = -10; hx <= 14; hx += 6) g.circle(hx, 0, 1.7);
    // Two slender hands holding flute
    g.fill(PAL.paper);
    g.stroke(PAL.inkDark);
    g.strokeWeight(1.0);
    g.ellipse(-8, 1.5, 6, 3.8);
    g.ellipse(8, 1.5, 6, 3.8);
    // Wind-blown pure ink flute tassel (笛穗)
    drawBaimiaoCubic(
      g,
      [26, 1],
      [22 - windGust * 18, 10],
      [16 - windGust * 32, 15],
      [10 - windGust * 40, 21],
      { width: 1.45, style: "taperOut", color: PAL.inkMid, alpha: 0.85 },
      8
    );
    g.pop();
  }

  // 7. Plump Tang Face, High Double-Loop Chignon (双环高髻), Buyao Hairpins, & Sidelong Gaze (侧目)
  g.push();
  g.translate(0, -58);
  g.rotate(headTurn);

  dc.save();
  dc.fillStyle = "rgba(239, 230, 210, 0.96)";
  dc.beginPath();
  dc.ellipse(0, 0, 11.2, 13.0, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // Tang high chignon ("高髻") + delicate side-lock wisps ("垂鬓")
  drawBaimiaoCubic(
    g,
    [-11, -3],
    [-15, -18],
    [-5, -28],
    [1, -24],
    { width: 2.3, style: "lanye", color: PAL.inkDark, alpha: 0.95 },
    10
  );
  drawBaimiaoCubic(
    g,
    [1, -24],
    [12, -26],
    [15, -15],
    [11, -3],
    { width: 2.3, style: "lanye", color: PAL.inkDark, alpha: 0.95 },
    10
  );
  // Top twin silk loops ("双环望仙髻")
  drawBaimiaoSpline(
    g,
    [
      [-7, -19],
      [-4, -30],
      [0, -22],
      [4, -30],
      [7, -19],
    ],
    { width: 1.65, style: "chuncai", color: PAL.inkDark, alpha: 0.9 },
    6
  );
  // Swept hairpin & wind-swaying buyao pearl pendants ("步摇")
  drawBaimiaoSpline(
    g,
    [
      [-14, -17],
      [0, -15],
      [15, -18],
    ],
    { width: 1.25, style: "taperBoth", color: PAL.inkDark, alpha: 0.9 },
    5
  );
  const buyaoSway = -windGust * 8 + Math.sin(t * 9 + seed) * (1 + windGust * 3);
  g.noFill();
  g.stroke(PAL.inkDark);
  g.strokeWeight(1.0);
  g.line(-14, -17, -15 + buyaoSway * 0.7, -9);
  g.circle(-15 + buyaoSway * 0.7, -7, 3.0);
  g.line(15, -18, 15 + buyaoSway * 0.7, -10);
  g.circle(15 + buyaoSway * 0.7, -8, 3.0);

  // Soft rounded Tang oval cheek contour
  drawBaimiaoCubic(
    g,
    [-11, -4],
    [-11.5, 7],
    [-5, 13.5],
    [0, 13.8],
    { width: 1.6, style: "chuncai", color: PAL.inkDark, alpha: 0.94 },
    10
  );
  drawBaimiaoCubic(
    g,
    [11, -4],
    [11.5, 7],
    [5, 13.5],
    [0, 13.8],
    { width: 1.6, style: "chuncai", color: PAL.inkDark, alpha: 0.94 },
    10
  );
  // Hairline crescent at forehead
  drawBaimiaoSpline(
    g,
    [
      [-9.5, -5],
      [0, -8.5],
      [9.5, -5],
    ],
    { width: 1.2, style: "taperBoth", color: PAL.inkDark, alpha: 0.84 },
    5
  );

  // Expressive Tang sidelong eyes ("侧目") clearly glancing toward Pelican!
  const eyeShift = gazeNorm * 2.8;
  g.noFill();
  g.stroke(PAL.inkDark);
  g.strokeWeight(1.0);
  // Arched Tang e-mei brows
  g.arc(-4.8, -2.2, 6.2, 3.2, Math.PI + 0.3, -0.3);
  g.arc(4.8, -2.2, 6.2, 3.2, Math.PI + 0.3, -0.3);
  // Almond eye upper & lower lid lines
  g.line(-7.4, 0.4, -1.8, 0.8);
  g.line(1.8, 0.8, 7.4, 0.4);
  // Shifted iris looking askance
  g.fill(PAL.inkDark);
  g.noStroke();
  g.circle(-4.6 + eyeShift, 0.8, 2.75);
  g.circle(4.6 + eyeShift, 0.8, 2.75);
  // Delicate curved nose & tiny cherry mouth
  g.noFill();
  g.stroke(PAL.inkDark);
  g.strokeWeight(0.85);
  g.line(0, 1.5, gazeNorm * 1.4, 5.8);
  g.line(-1.6, 9.2, 1.6, 9.2);

  g.pop();
  g.pop();
  g.pop();
}

// ---------- Tang Baimiao Pelican + Bicycle + 5 Long Pibo Silk Ribbons ----------

function drawTangBaimiaoRig(g, pose, windGust, t) {
  const s = pose.scale;
  const dc = g.drawingContext;

  // 1. Wheels (calligraphic double-ring ink rims + 10 slender spokes + cloud-rotation arcs)
  const drawBaimiaoWheel = (hub) => {
    const r = pose.wheelRadius;
    g.push();
    g.translate(hub.x, hub.y);

    g.noFill();
    g.stroke(PAL.inkDark);
    g.strokeWeight(3.4 * s);
    g.circle(0, 0, r * 2);

    g.stroke(PAL.inkMid);
    g.strokeWeight(1.2 * s);
    g.circle(0, 0, (r - 4.5) * 2);

    g.stroke(PAL.inkMid);
    g.strokeWeight(1.3 * s);
    for (let i = 0; i < 10; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 5;
      g.line(0, 0, Math.cos(a) * (r - 5 * s), Math.sin(a) * (r - 5 * s));
    }

    // Cloud-like motion arcs rotating with wheel
    g.noFill();
    g.stroke(PAL.inkLight);
    g.strokeWeight(1.25 * s);
    const arcSpin = pose.wheelRot * 0.7;
    g.arc(0, 0, (r + 8) * 2, (r + 8) * 2, arcSpin + 2.3, arcSpin + 3.4);
    g.arc(0, 0, (r + 12) * 2, (r + 12) * 2, arcSpin + 3.9, arcSpin + 4.7);

    g.fill(PAL.paper);
    g.stroke(PAL.inkDark);
    g.strokeWeight(2.0 * s);
    g.circle(0, 0, 10 * s);
    g.fill(PAL.inkDark);
    g.noStroke();
    g.circle(0, 0, 3.6 * s);

    g.pop();
  };

  drawBaimiaoWheel(pose.rearHub);
  drawBaimiaoWheel(pose.frontHub);

  // 2. Back leg & rear crank (pure ink linework)
  g.push();
  g.strokeCap("round");
  g.strokeJoin("round");
  g.noFill();
  g.stroke(PAL.inkMid);
  g.strokeWeight(4.5 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.leftKnee.x, pose.leftKnee.y);
  g.vertex(pose.leftPedal.x, pose.leftPedal.y);
  g.endShape();

  g.stroke(PAL.inkMid);
  g.strokeWeight(2.2 * s);
  g.line(pose.bb.x, pose.bb.y, pose.leftPedal.x, pose.leftPedal.y);
  g.pop();

  // 3. Calligraphic Bicycle Frame
  const drawTube = (a, b, w = 3.2) => {
    drawBaimiaoSpline(
      g,
      [
        [a.x, a.y],
        [(a.x + b.x) * 0.5, (a.y + b.y) * 0.5],
        [b.x, b.y],
      ],
      { width: w * s, minWidth: 1.35 * s, style: "chuncai", color: PAL.inkDark, alpha: 0.92 },
      4
    );
  };
  drawTube(pose.rearHub, pose.bb, 3.2);
  drawTube(pose.rearHub, pose.seatCluster, 3.0);
  drawTube(pose.bb, pose.seatCluster, 3.4);
  drawTube(pose.seatCluster, pose.headTop, 3.6);
  drawTube(pose.bb, pose.headBot, 3.8);
  drawTube(pose.frontHub, pose.headTop, 3.4);
  drawTube(pose.headTop, pose.stemTop, 3.2);
  drawTube(pose.stemTop, pose.barGrip, 3.4);

  const midSaddle = {
    x: (pose.saddleRear.x + pose.saddleFront.x) * 0.5,
    y: pose.saddleRear.y + 3 * s,
  };
  drawTube(pose.seatCluster, midSaddle, 2.8);
  drawBaimiaoSpline(
    g,
    [
      [pose.saddleRear.x, pose.saddleRear.y - 1 * s],
      [midSaddle.x, pose.saddleRear.y + 2 * s],
      [pose.saddleFront.x, pose.saddleFront.y],
    ],
    { width: 5.4 * s, minWidth: 2.2 * s, style: "lanye", color: PAL.inkDark, alpha: 0.95 },
    5
  );

  g.noFill();
  g.stroke(PAL.inkDark);
  g.strokeWeight(2.1 * s);
  g.circle(pose.bb.x, pose.bb.y, 17 * s);
  g.strokeWeight(1.0 * s);
  g.circle(pose.bb.x, pose.bb.y, 11 * s);
  g.strokeWeight(1.8 * s);
  g.circle(pose.bellPos.x, pose.bellPos.y, 8 * s);

  // 4. Pelican Body + Wind-Ruffled Tail Feathers (zero flat color blocks!)
  dc.save();
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
  const bodyGrad = dc.createLinearGradient(
    pose.bodyCenter.x,
    pose.bodyCenter.y - 34 * s,
    pose.bodyCenter.x,
    pose.hip.y + 16 * s
  );
  bodyGrad.addColorStop(0, "rgba(239, 230, 210, 0.90)");
  bodyGrad.addColorStop(0.68, "rgba(239, 230, 210, 0.90)");
  bodyGrad.addColorStop(1, "rgba(182, 169, 145, 0.88)");
  dc.fillStyle = bodyGrad;
  dc.fill();
  dc.restore();

  drawBaimiaoCubic(
    g,
    [pose.tailTip.x, pose.tailTip.y],
    [pose.bodyCenter.x - 42 * s, pose.bodyCenter.y - 28 * s],
    [pose.bodyCenter.x + 26 * s, pose.bodyCenter.y - 34 * s],
    [pose.neckBase.x + 12 * s, pose.neckBase.y + 8 * s],
    { width: 3.3 * s, style: "lanye", color: PAL.inkDark, alpha: 0.96 },
    18
  );
  drawBaimiaoCubic(
    g,
    [pose.neckBase.x + 12 * s, pose.neckBase.y + 8 * s],
    [pose.bodyCenter.x + 36 * s, pose.bodyCenter.y + 24 * s],
    [pose.hip.x + 16 * s, pose.hip.y + 12 * s],
    [pose.tailTip.x, pose.tailTip.y],
    { width: 3.1 * s, style: "lanye", color: PAL.inkDark, alpha: 0.95 },
    18
  );

  // Scalloped body plumage arcs ("羽片叠描")
  const plumageArcs = [
    [-25, -8, -7, 4],
    [-12, 3, 7, 11],
    [-31, 7, -14, 17],
  ];
  for (let i = 0; i < plumageArcs.length; i++) {
    const [dx0, dy0, dx1, dy1] = plumageArcs[i];
    drawBaimiaoCubic(
      g,
      [pose.bodyCenter.x + dx0 * s, pose.bodyCenter.y + dy0 * s],
      [pose.bodyCenter.x + (dx0 + dx1) * 0.5 * s, pose.bodyCenter.y + (dy0 + dy1 + 10) * 0.5 * s],
      [pose.bodyCenter.x + dx1 * s - 4 * s, pose.bodyCenter.y + dy1 * s + 4 * s],
      [pose.bodyCenter.x + dx1 * s, pose.bodyCenter.y + dy1 * s],
      { width: 1.55 * s, style: "taperBoth", color: PAL.inkMid, alpha: 0.78 },
      10
    );
  }

  // 5 Wind-whipped tail feathers fanning backward from pose.tailTip
  for (let tf = 0; tf < 5; tf++) {
    const angOffset = (-0.28 + tf * 0.14) - windGust * 0.12;
    const flutter = Math.sin(t * (7 + windGust * 14) + tf * 1.3) * (1.2 + windGust * 7.5);
    const tailLen = (20 + (2 - Math.abs(tf - 2)) * 9 + windGust * 20) * s;
    const tx = pose.tailTip.x - Math.cos(angOffset) * tailLen;
    const ty = pose.tailTip.y + Math.sin(angOffset) * tailLen * 0.65 + flutter;
    drawBaimiaoCubic(
      g,
      [pose.tailTip.x + 5 * s, pose.tailTip.y + (tf - 2) * 2.5 * s],
      [pose.tailTip.x - tailLen * 0.35, pose.tailTip.y + (tf - 2) * 3.5 * s + flutter * 0.4],
      [tx + tailLen * 0.25, ty - 2 * s],
      [tx, ty],
      { width: 2.0 * s, style: "taperOut", color: PAL.inkDark, alpha: 0.9 },
      10
    );
  }

  // 5. S-Curve Neck
  const neckSamples = sampleCatmullRom(
    pose.neckCurve.map((pt) => [pt.x, pt.y]),
    6
  );
  const neckFront = [];
  const neckBack = [];
  for (let i = 0; i < neckSamples.length; i++) {
    const np = neckSamples[i];
    const rNeck = lerp(10.5, 8.2, np.s) * s;
    const nx = -np.ty;
    const ny = np.tx;
    neckFront.push({ x: np.x + nx * rNeck, y: np.y + ny * rNeck, tx: np.tx, ty: np.ty, s: np.s });
    neckBack.push({ x: np.x - nx * rNeck, y: np.y - ny * rNeck, tx: np.tx, ty: np.ty, s: np.s });
  }
  dc.save();
  dc.fillStyle = "rgba(239, 230, 210, 0.90)";
  dc.beginPath();
  dc.moveTo(neckFront[0].x, neckFront[0].y);
  for (let i = 1; i < neckFront.length; i++) dc.lineTo(neckFront[i].x, neckFront[i].y);
  for (let i = neckBack.length - 1; i >= 0; i--) dc.lineTo(neckBack[i].x, neckBack[i].y);
  dc.closePath();
  dc.fill();
  dc.restore();

  drawBaimiaoStroke(g, neckFront, { width: 2.7 * s, style: "lanye", color: PAL.inkDark, alpha: 0.95 });
  drawBaimiaoStroke(g, neckBack, { width: 2.5 * s, style: "chuncai", color: PAL.inkDark, alpha: 0.94 });

  // Nape feather wisps flying back in the wind
  for (let ni = 0; ni < 3; ni++) {
    const idx = Math.floor(neckBack.length * (0.35 + ni * 0.2));
    const anchor = neckBack[idx];
    const nWave = Math.sin(t * (8 + windGust * 15) + ni * 1.4) * (1.0 + windGust * 5);
    const nLen = (9 + windGust * 20) * s;
    drawBaimiaoCubic(
      g,
      [anchor.x, anchor.y],
      [anchor.x - nLen * 0.4, anchor.y - 3 * s],
      [anchor.x - nLen * 0.8, anchor.y - 4 * s + nWave],
      [anchor.x - nLen, anchor.y - 2 * s + nWave],
      { width: 1.5 * s, style: "taperOut", color: PAL.inkMid, alpha: 0.85 },
      8
    );
  }

  // 6. Head + Wind-Whipped Crest Feathers (头冠羽)
  dc.save();
  dc.fillStyle = "rgba(239, 230, 210, 0.92)";
  dc.beginPath();
  dc.arc(pose.head.x, pose.head.y, 16.5 * s, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  const headPts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    headPts.push([
      pose.head.x + Math.cos(a) * 16.5 * s,
      pose.head.y + Math.sin(a) * 15.8 * s,
    ]);
  }
  drawBaimiaoSpline(g, headPts, { width: 2.5 * s, style: "chuncai", color: PAL.inkDark, alpha: 0.95 }, 2);

  // 4 flowing crest plumes: curled gently upward in Bar 1 -> blown flat & whipping fast in Bar 2!
  const crestSpecs = [
    { ox: -10, oy: -13, len: 24, rise: -15 },
    { ox: -6, oy: -15, len: 31, rise: -22 },
    { ox: -2, oy: -15, len: 27, rise: -13 },
    { ox: -13, oy: -10, len: 19, rise: -7 },
  ];
  for (let ci = 0; ci < crestSpecs.length; ci++) {
    const cs = crestSpecs[ci];
    const sx = pose.head.x + cs.ox * s;
    const sy = pose.head.y + cs.oy * s;
    const cWave = Math.sin(t * (7.5 + windGust * 18) + ci * 1.1) * (1.4 + windGust * 7.5);
    const cLen = cs.len * (0.82 + windGust * 0.95) * s;
    const cRise = cs.rise * (1 - windGust * 0.62) * s;
    drawBaimiaoCubic(
      g,
      [sx, sy],
      [sx - cLen * 0.35, sy + cRise * 0.72],
      [sx - cLen * 0.72, sy + cRise + cWave * 0.7],
      [sx - cLen, sy + cRise * 0.6 + cWave],
      { width: 2.1 * s, style: "taperOut", color: PAL.inkDark, alpha: 0.94 },
      10
    );
  }

  // 7. Throat Pouch & Upper Beak
  dc.save();
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
  const pouchGrad = dc.createLinearGradient(
    pose.beakBaseTop.x,
    pose.beakBaseTop.y + 10 * s,
    pose.pouchMid.x,
    pose.pouchMid.y + 14 * s
  );
  pouchGrad.addColorStop(0, "rgba(239, 230, 210, 0.88)");
  pouchGrad.addColorStop(1, "rgba(186, 173, 150, 0.76)");
  dc.fillStyle = pouchGrad;
  dc.fill();
  dc.restore();

  drawBaimiaoCubic(
    g,
    [pose.pouchBase.x, pose.pouchBase.y],
    [pose.pouchMid.x - 16 * s, pose.pouchMid.y + 12 * s],
    [pose.pouchMid.x + 34 * s, pose.pouchMid.y + 6 * s],
    [pose.beakTip.x - 4 * s, pose.beakTip.y + 4 * s],
    { width: 2.7 * s, style: "lanye", color: PAL.inkDark, alpha: 0.95 },
    16
  );
  for (let pf = 1; pf <= 3; pf++) {
    const mix = pf * 0.24;
    drawBaimiaoCubic(
      g,
      [lerp(pose.pouchBase.x, pose.beakBaseTop.x, 0.25), lerp(pose.pouchBase.y, pose.beakBaseTop.y + 12 * s, mix)],
      [pose.pouchMid.x - 10 * s, lerp(pose.pouchMid.y + 6 * s, pose.beakBaseTop.y + 16 * s, mix)],
      [pose.pouchMid.x + 24 * s, lerp(pose.pouchMid.y + 2 * s, pose.beakTip.y + 6 * s, mix)],
      [pose.beakTip.x - 10 * s, pose.beakTip.y + 5 * s],
      { width: 1.15 * s, style: "taperBoth", color: PAL.inkMid, alpha: 0.68 },
      12
    );
  }

  dc.save();
  dc.fillStyle = "rgba(239, 230, 210, 0.92)";
  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
  dc.lineTo(pose.beakTip.x, pose.beakTip.y);
  dc.lineTo(pose.beakHook.x, pose.beakHook.y);
  dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  dc.closePath();
  dc.fill();
  dc.restore();

  drawBaimiaoSpline(
    g,
    [
      [pose.beakBaseTop.x, pose.beakBaseTop.y],
      [(pose.beakBaseTop.x + pose.beakTip.x) * 0.5, (pose.beakBaseTop.y + pose.beakTip.y) * 0.5 - 1 * s],
      [pose.beakTip.x, pose.beakTip.y],
      [pose.beakHook.x, pose.beakHook.y],
      [pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s],
    ],
    { width: 2.5 * s, style: "lanye", color: PAL.inkDark, alpha: 0.96 },
    5
  );
  drawBaimiaoSpline(
    g,
    [
      [pose.beakBaseTop.x, pose.beakBaseTop.y + 12 * s],
      [pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s],
    ],
    { width: 2.0 * s, style: "chuncai", color: PAL.inkDark, alpha: 0.92 },
    4
  );
  drawBaimiaoSpline(
    g,
    [
      [pose.beakBaseTop.x + 6 * s, pose.beakBaseTop.y + 5 * s],
      [pose.beakTip.x - 10 * s, pose.beakTip.y + 3 * s],
    ],
    { width: 1.0 * s, style: "taperBoth", color: PAL.inkMid, alpha: 0.72 },
    4
  );

  // Deadpan serene Tang Baimiao eye
  g.push();
  g.noFill();
  g.stroke(PAL.inkDark);
  g.strokeWeight(1.8 * s);
  g.line(pose.eye.x - 6 * s, pose.eye.y - 1.5 * s, pose.eye.x + 6 * s, pose.eye.y - 1 * s);
  g.strokeWeight(1.2 * s);
  g.arc(pose.eye.x, pose.eye.y, 10.5 * s, 7.5 * s, 0.1, Math.PI - 0.1);
  g.fill(PAL.inkDark);
  g.noStroke();
  g.circle(pose.eye.x + 1.2 * s, pose.eye.y + 0.3 * s, 4.2 * s);
  g.pop();

  // 8. 5 Long Winding Tang Silk Ribbons (5 条长达 200+ 单位的蜿蜒盛唐丝绸长飘带 / 披帛)!
  // Separated into 5 graceful lanes with billowing Wu Daozi S-waves & 3D ribbon twists.
  const ribbonSpecs = [
    // #1: Upper Crown/Nape High Banner (~295u in Bar 2)
    {
      ax: pose.neckCurve[2].x - 6 * s,
      ay: pose.neckCurve[2].y - 5 * s,
      calmLen: 175,
      galeLen: 295,
      calmDroop: 34,
      galeLift: -64,
      amp: 36,
      freq: 8.6,
      phase: 0.3,
      hw: 7.8,
      ew: 2.25,
    },
    // #2: Shoulder Collar Silk Streamer (~320u in Bar 2)
    {
      ax: pose.neckBase.x - 2 * s,
      ay: pose.neckBase.y + 2 * s,
      calmLen: 195,
      galeLen: 320,
      calmDroop: 46,
      galeLift: -24,
      amp: 42,
      freq: 7.8,
      phase: 1.7,
      hw: 8.6,
      ew: 2.4,
    },
    // #3: Grand Wing-Elbow U-Loop Pibo (~340u in Bar 2)
    {
      ax: pose.wingElbow.x,
      ay: pose.wingElbow.y + 6 * s,
      calmLen: 205,
      galeLen: 340,
      calmDroop: 58,
      galeLift: 12,
      amp: 45,
      freq: 7.4,
      phase: 3.1,
      hw: 9.0,
      ew: 2.5,
      uLoop: true,
    },
    // #4: Waist/Hip Flowing Sash (~280u in Bar 2)
    {
      ax: pose.hip.x - 4 * s,
      ay: pose.hip.y - 6 * s,
      calmLen: 168,
      galeLen: 280,
      calmDroop: 36,
      galeLift: 42,
      amp: 34,
      freq: 8.8,
      phase: 4.4,
      hw: 7.4,
      ew: 2.1,
    },
    // #5: Chest/Handlebar Lower Ribbon (~260u in Bar 2)
    {
      ax: pose.shoulder.x + 6 * s,
      ay: pose.shoulder.y + 8 * s,
      calmLen: 158,
      galeLen: 260,
      calmDroop: 48,
      galeLift: 68,
      amp: 32,
      freq: 9.4,
      phase: 5.5,
      hw: 7.0,
      ew: 1.95,
    },
  ];

  // Smooth transition from relaxed drooping Bar 1 arc to whipped Bar 2 billowing gale
  const galeMix = smoothstep(0.18, 0.72, windGust);

  for (let ri = 0; ri < ribbonSpecs.length; ri++) {
    const rb = ribbonSpecs[ri];
    const pts = [];
    const curLen = lerp(rb.calmLen, rb.galeLen, galeMix) * s;
    const segs = 34;
    for (let k = 0; k <= segs; k++) {
      const p = k / segs;
      const uDipX = rb.uLoop ? Math.sin(p * Math.PI) * 32 * (1 - galeMix * 0.85) : 0;
      const rx = rb.ax - p * curLen + uDipX * s;

      const wSpeed = (4.2 + windGust * 10.5) * (1 + ri * 0.05);
      const standing = Math.sin(p * Math.PI * 2.8) * Math.sin(t * wSpeed * 0.68 + rb.phase);
      const traveling = Math.sin(p * rb.freq - t * wSpeed + rb.phase);
      const harmonic = 0.34 * Math.sin(p * rb.freq * 1.75 - t * wSpeed * 1.35 + rb.phase);

      const env = smoothstep(0.0, 0.22, p) * (0.34 + 0.66 * p);
      const waveAmp = (5 + rb.amp * (0.14 + 0.96 * windGust)) * env * s;
      const basePathY = lerp(
        rb.calmDroop * Math.sin(p * Math.PI * 0.85),
        rb.galeLift * Math.pow(p, 0.88),
        galeMix
      ) * s;

      const ry = rb.ay + basePathY + (traveling * 0.65 + standing * 0.35 + harmonic) * waveAmp;
      pts.push([rx, ry]);
    }

    drawSilkRibbon(g, sampleCatmullRom(pts, 2), {
      halfWidth: rb.hw * s,
      twistFreq: 6.4 + galeMix * 2.4,
      twistPhase: -t * (2.8 + windGust * 4.8) + rb.phase,
      edgeWidth: rb.ew * s,
      color: PAL.inkDark,
      alpha: 0.93,
      veilAlpha: 0.5,
      foldAlpha: 0.22,
    });
  }

  // Tang silk sash collar ring around Pelican chest/neck base (ties the ribbons cleanly to the bird)
  drawBaimiaoSpline(
    g,
    [
      [pose.neckBase.x - 10 * s, pose.neckBase.y + 4 * s],
      [pose.neckBase.x + 2 * s, pose.neckBase.y + 10 * s],
      [pose.neckBase.x + 14 * s, pose.neckBase.y + 5 * s],
    ],
    { width: 3.0 * s, style: "chuncai", color: PAL.inkDark, alpha: 0.92 },
    6
  );

  // 9. Layered Wing & Wind-Lifted Flight Feathers (双翅层羽)
  dc.save();
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
  dc.fillStyle = "rgba(239, 230, 210, 0.92)";
  dc.fill();
  dc.restore();

  drawBaimiaoCubic(
    g,
    [pose.shoulder.x - 8 * s, pose.shoulder.y - 6 * s],
    [pose.wingElbow.x - 10 * s, pose.wingElbow.y + 18 * s],
    [pose.barGrip.x - 12 * s, pose.barGrip.y + 16 * s],
    [pose.barGrip.x + 2 * s, pose.barGrip.y + 2 * s],
    { width: 2.7 * s, style: "lanye", color: PAL.inkDark, alpha: 0.96 },
    14
  );
  drawBaimiaoCubic(
    g,
    [pose.shoulder.x - 8 * s, pose.shoulder.y - 6 * s],
    [pose.shoulder.x + 12 * s, pose.shoulder.y - 10 * s],
    [pose.wingElbow.x + 8 * s, pose.wingElbow.y - 8 * s],
    [pose.barGrip.x + 2 * s, pose.barGrip.y + 2 * s],
    { width: 2.5 * s, style: "chuncai", color: PAL.inkDark, alpha: 0.94 },
    14
  );

  // Interior wing covert feather scallops (sleek in Bar 1, wind-lifted flight feathers in Bar 2!)
  for (let wf = 0; wf < 5; wf++) {
    const frac = 0.16 + wf * 0.15;
    const ax = lerp(pose.shoulder.x - 3 * s, pose.wingElbow.x + 6 * s, frac);
    const ay = lerp(pose.shoulder.y + 1 * s, pose.wingElbow.y + 10 * s, frac);
    const fWave = Math.sin(t * (9 + windGust * 18) + wf * 1.15) * (0.6 + windGust * 6.5);
    const fLen = (11 + (4 - wf) * 2.5 + galeMix * 30) * s;
    const liftY = (3 * (1 - galeMix) - galeMix * (12 + wf * 2.8)) * s + fWave;
    drawBaimiaoCubic(
      g,
      [ax, ay],
      [ax - fLen * 0.45, ay + 3 * s + liftY * 0.4],
      [ax - fLen * 0.85, ay + 2 * s + liftY * 0.85],
      [ax - fLen, ay + liftY],
      { width: 1.75 * s, style: "taperOut", color: PAL.inkDark, alpha: 0.9 },
      10
    );
  }

  // 10. Front Leg & Crank (with thin Xuan-paper halo to separate cleanly from frame tubes)
  drawBaimiaoCubic(
    g,
    [pose.hip.x, pose.hip.y],
    [lerp(pose.hip.x, pose.rightKnee.x, 0.5) + 4 * s, lerp(pose.hip.y, pose.rightKnee.y, 0.5)],
    [lerp(pose.hip.x, pose.rightKnee.x, 0.85), lerp(pose.hip.y, pose.rightKnee.y, 0.85)],
    [pose.rightKnee.x, pose.rightKnee.y],
    { width: 8.6 * s, minWidth: 4.5 * s, style: "chuncai", color: PAL.paper, alpha: 0.88 },
    10
  );
  drawBaimiaoCubic(
    g,
    [pose.hip.x, pose.hip.y],
    [lerp(pose.hip.x, pose.rightKnee.x, 0.5) + 4 * s, lerp(pose.hip.y, pose.rightKnee.y, 0.5)],
    [lerp(pose.hip.x, pose.rightKnee.x, 0.85), lerp(pose.hip.y, pose.rightKnee.y, 0.85)],
    [pose.rightKnee.x, pose.rightKnee.y],
    { width: 5.8 * s, minWidth: 2.2 * s, style: "lanye", color: PAL.inkDark, alpha: 0.95 },
    10
  );
  drawBaimiaoSpline(
    g,
    [
      [pose.rightKnee.x, pose.rightKnee.y],
      [lerp(pose.rightKnee.x, pose.rightPedal.x, 0.5), lerp(pose.rightKnee.y, pose.rightPedal.y, 0.5)],
      [pose.rightPedal.x, pose.rightPedal.y],
    ],
    { width: 7.4 * s, minWidth: 4.0 * s, style: "chuncai", color: PAL.paper, alpha: 0.88 },
    6
  );
  drawBaimiaoSpline(
    g,
    [
      [pose.rightKnee.x, pose.rightKnee.y],
      [lerp(pose.rightKnee.x, pose.rightPedal.x, 0.5), lerp(pose.rightKnee.y, pose.rightPedal.y, 0.5)],
      [pose.rightPedal.x, pose.rightPedal.y],
    ],
    { width: 4.6 * s, minWidth: 2.0 * s, style: "chuncai", color: PAL.inkDark, alpha: 0.95 },
    6
  );

  g.stroke(PAL.inkDark);
  g.strokeWeight(2.8 * s);
  g.line(pose.bb.x, pose.bb.y, pose.rightPedal.x, pose.rightPedal.y);
  g.fill(PAL.inkDark);
  g.noStroke();
  g.rect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 2.5 * s, 16 * s, 5 * s, 2 * s);
  g.rect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 2.5 * s, 16 * s, 5 * s, 2 * s);
}

// ---------- Bar 2 Flowing Feibai Diagonal Wind Gusts & Ink Leaves ----------

function drawGaleWindLines(g, windGust, u, t) {
  const galeMix = smoothstep(0.24, 0.72, windGust);
  if (galeMix <= 0.02) return;

  // 9 crisp, gracefully arched diagonal feibai gale streaks rushing diagonally across open sky & hills
  const streakSpecs = [
    { y0: 215, len: 470, speed: 1280, width: 5.6, pitch: 84, curve: 20, seed: 811 },
    { y0: 365, len: 540, speed: 1510, width: 6.4, pitch: 98, curve: -22, seed: 812 },
    { y0: 448, len: 590, speed: 1380, width: 6.0, pitch: 92, curve: 18, seed: 813 },
    { y0: 542, len: 560, speed: 1590, width: 6.8, pitch: 102, curve: -20, seed: 814 },
    { y0: 635, len: 510, speed: 1340, width: 5.4, pitch: 76, curve: 16, seed: 815 },
    { y0: 695, len: 460, speed: 1440, width: 5.2, pitch: 66, curve: 14, seed: 816 },
    { y0: 295, len: 430, speed: 1390, width: 5.0, pitch: 78, curve: -15, seed: 817 },
    { y0: 502, len: 520, speed: 1490, width: 5.8, pitch: 88, curve: 21, seed: 818 },
    { y0: 408, len: 480, speed: 1630, width: 5.5, pitch: 82, curve: -17, seed: 819 },
  ];

  g.push();
  g.drawingContext.globalAlpha = clamp(galeMix * 0.72, 0, 0.74);
  for (let i = 0; i < streakSpecs.length; i++) {
    const st = streakSpecs[i];
    const span = 1950;
    const rawX = 1440 - ((t * st.speed + i * 235) % span);
    const ctrl = [];
    for (let k = 0; k <= 4; k++) {
      const f = k / 4;
      ctrl.push([
        rawX + f * st.len,
        st.y0 - f * st.pitch + Math.sin(f * Math.PI * 1.4 + i) * st.curve,
      ]);
    }
    const densePts = sampleCatmullRom(ctrl, 5).map((pt) => [pt.x, pt.y]);
    drawFeibaiStroke(
      g,
      densePts,
      st.width,
      i % 2 === 0 ? PAL.inkDark : PAL.inkMid,
      0.56,
      st.seed
    );
  }

  // Graceful curling Lanye Miao air-vortex trails & tumbling ink willow/bamboo leaves
  g.drawingContext.globalAlpha = clamp(galeMix * 0.88, 0, 0.9);
  for (let i = 0; i < 8; i++) {
    const lx = 1420 - ((t * (960 + i * 115) + i * 245) % 1920);
    const ly = 235 + i * 64 + Math.sin(t * 6.5 + i * 1.4) * 16;

    drawBaimiaoCubic(
      g,
      [lx + 105, ly - 22],
      [lx + 56, ly + 10],
      [lx + 18, ly - 12],
      [lx - 8, ly + 6],
      { width: 2.0, minWidth: 0.2, style: "taperBoth", color: PAL.inkMid, alpha: 0.7 },
      12
    );

    g.push();
    g.translate(lx - 22, ly + 8);
    g.rotate(t * 5.6 + i * 0.9);
    drawBaimiaoSpline(
      g,
      [
        [-9, 0],
        [0, -3.2],
        [9, 0],
        [0, 3.2],
      ],
      { width: 1.55, style: "lanye", color: PAL.inkDark, alpha: 0.88 },
      4
    );
    g.pop();
  }
  g.pop();
}

// ---------- Main Pure Scene Render Entry ----------

export default function render(ctx) {
  const { p, brush, g, kit, t, localTime } = ctx;
  const u = localTime;

  const paper = getInkPaperLayer(kit, "baimiao", 1840, 1000);
  const backdrop = kit.bakeLayer("s04_tang_backdrop_v2", 1840, 1000, bakeTangBackdrop);

  // 1. Warm High Tang Xuan paper & baked distant mountain/road calligraphy
  p.push();
  p.imageMode(p.CENTER);
  p.image(paper, 500, 500, 1840, 1000);
  p.image(backdrop, 500, 500, 1840, 1000);
  p.pop();

  brush.set("pen", PAL.inkDark, 1.35);
  brush.line(BLEED_LEFT, ROAD_Y, BLEED_RIGHT, ROAD_Y);

  // 2. Bar 2 Gale Wind Envelopes (calm breeze in Bar 1/3 -> sudden gale at u=2.0..4.0)
  const breezeBase = 0.12;
  const galeRamp = smoothstep(1.88, 2.15, u) * (1 - smoothstep(3.92, 4.35, u));
  const beatAge = u >= 2.0 ? (u - 2.0) % 0.5 : 1.0;
  const beatGust = u >= 2.0 && u <= 4.1 ? 0.2 * Math.exp(-beatAge * 5.2) : 0;
  const windGust = clamp(breezeBase + galeRamp * 0.78 + beatGust, 0, 1.05);

  const px = getScenePelicanX(u);

  // 3. 2D Baimiao Foreground Layer
  g.push();

  // Flowing Tang rolling clouds drifting gracefully across sky
  const cloudSpecs = [
    { cx: -145, cy: 235, s: 0.96, dir: 1, speed: -24, alpha: 0.5 },
    { cx: 430, cy: 195, s: 0.8, dir: -1, speed: -18, alpha: 0.44 },
    { cx: 705, cy: 375, s: 1.08, dir: 1, speed: -28, alpha: 0.54 },
    { cx: 1125, cy: 215, s: 0.92, dir: -1, speed: -22, alpha: 0.48 },
    { cx: 1320, cy: 405, s: 0.98, dir: 1, speed: -30, alpha: 0.52 },
  ];
  for (let i = 0; i < cloudSpecs.length; i++) {
    const c = cloudSpecs[i];
    const drift = -u * (Math.abs(c.speed) + windGust * 36);
    drawTangCloud(g, c.cx, c.cy, c.s, c.dir, drift, windGust, c.alpha);
  }

  // Two pure-baimiao Tang celestial musicians on clouds yielding & looking sidelong at Pelican
  const musicians = [
    { baseX: 215, baseY: 318, facing: 1, instrument: "pipa", seed: 1.1 },
    { baseX: 845, baseY: 292, facing: -1, instrument: "flute", seed: 2.7 },
  ];
  for (let i = 0; i < musicians.length; i++) {
    drawTangMusician(g, musicians[i], px, u, windGust, t);
  }

  // Wind-whipped wild grass tufts along the ancient Tang road (ROAD_Y = 730)
  const grassTufts = [
    { x: -245, y: ROAD_Y + 4, s: 0.92 },
    { x: 138, y: ROAD_Y + 3, s: 1.05 },
    { x: 745, y: ROAD_Y + 5, s: 0.95 },
    { x: 1140, y: ROAD_Y + 4, s: 1.0 },
  ];
  for (let i = 0; i < grassTufts.length; i++) {
    const gt = grassTufts[i];
    drawWindGrassTuft(g, gt.x, gt.y, gt.s, windGust, t, i * 1.7);
  }

  // Bar 2 curved feibai gale wind lines & tumbling leaves
  drawGaleWindLines(g, windGust, u, t);

  // Tang Baimiao Pelican + Bicycle + 5 Long Winding Pibo Ribbons (ROAD_Y = 730, scale = 1.0)
  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
  drawTangBaimiaoRig(g, pose, windGust, t);

  // Upper-right Tang collector red seals (sole cinnabar accent alongside Title Card)
  if (u > 0.35 && u < 5.65) {
    const sealAlpha = smoothstep(0.35, 0.85, u) * (1 - smoothstep(5.15, 5.65, u));
    g.push();
    g.drawingContext.globalAlpha = sealAlpha * 0.92;
    drawRedSeal(g, 926, 92, "吴带当风", 46, PAL.seal, "zhuwen");
    drawRedSeal(g, 926, 152, "白描神品", 38, PAL.seal, "baiwen");
    g.pop();
  }

  // Tang mounted scroll Title Card ("题签")
  drawEraTitleCard(g, META, u);

  g.pop();
}
