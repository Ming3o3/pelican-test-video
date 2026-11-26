/**
 * Scene #05 — 宋代山水 · Song Dynasty Landscape (c. 1000 CE), t in [29.0, 35.0).
 * Tribute to Fan Kuan's "Travelers Among Mountains and Streams":
 * craggy organic granite peak textured with raindrop Cun-fa and split-bristle Feibai,
 * ribbon waterfall, layered silk valley mist, huge pull-back revealing the Pelican as a tiny speck,
 * followed by a smooth screen-anchored Bar 2 push-in past twin pines and a startled woodcutter & donkey.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  ROAD_Y,
  clamp,
  getSceneCamX,
  getScenePelicanX,
  hermite,
  lerp,
  smoothstep,
} from "../beat.js";
import {
  drawCunFa,
  drawFeibaiStroke,
  drawFoliageDots,
  drawInkWash,
  drawRedSeal,
  getInkPaperLayer,
} from "../kit/ink.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[4];

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function subdivideCraggy(pts, iterations = 3, roughness = 0.24, seed = 101) {
  const rand = prng(seed);
  let cur = pts.map((p) => [p[0], p[1]]);
  for (let it = 0; it < iterations; it++) {
    const next = [cur[0]];
    for (let i = 0; i < cur.length - 1; i++) {
      const a = cur[i];
      const b = cur[i + 1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const disp = (rand() - 0.48) * len * roughness;
      next.push([(a[0] + b[0]) * 0.5 + nx * disp, (a[1] + b[1]) * 0.5 + ny * disp]);
      next.push(b);
    }
    cur = next;
  }
  return cur;
}

function bakeMonumentalPeak(pg) {
  const w = 2400;
  const h = 2200;
  pg.clear();
  const dc = pg.drawingContext;

  // Far misty background ridges spanning edge-to-edge across widescreen
  const farLeft = subdivideCraggy(
    [
      [40, 1720],
      [210, 1260],
      [460, 960],
      [720, 1180],
    ],
    3,
    0.22,
    501
  );
  drawInkWash(pg, [...farLeft, [780, 1800], [30, 1800]], "#76776a", 0.25, { layers: 3, edgeAlpha: 0.12 });
  drawFeibaiStroke(pg, farLeft, 5, "#5c5d51", 0.55, 502);

  const farRight = subdivideCraggy(
    [
      [1640, 1140],
      [1940, 880],
      [2200, 1120],
      [2360, 1680],
    ],
    3,
    0.22,
    503
  );
  drawInkWash(pg, [[1560, 1800], ...farRight, [2380, 1800]], "#76776a", 0.26, { layers: 3, edgeAlpha: 0.12 });
  drawFeibaiStroke(pg, farRight, 5, "#5a5b4f", 0.55, 504);

  // Midground flanking granite shoulders
  const leftShoulder = subdivideCraggy(
    [
      [340, 1740],
      [450, 1180],
      [630, 820],
      [810, 950],
    ],
    3,
    0.25,
    505
  );
  drawInkWash(pg, [...leftShoulder, [860, 1820], [320, 1820]], "#515347", 0.36, { layers: 3, edgeAlpha: 0.2 });
  drawFeibaiStroke(pg, leftShoulder, 7, "#34362e", 0.48, 506);
  drawCunFa(pg, 460, 900, 320, 620, { count: 160, color: "#3d3f35", alpha: 0.3, seed: 507 });

  const rightShoulder = subdivideCraggy(
    [
      [1580, 900],
      [1780, 740],
      [1970, 1080],
      [2080, 1720],
    ],
    3,
    0.25,
    508
  );
  drawInkWash(pg, [[1540, 1820], ...rightShoulder, [1540, 1820]], "#4c4e43", 0.38, { layers: 3, edgeAlpha: 0.22 });
  drawFeibaiStroke(pg, rightShoulder, 7, "#30322a", 0.48, 509);
  drawCunFa(pg, 1620, 820, 360, 660, { count: 180, color: "#36382f", alpha: 0.32, seed: 510 });

  // Colossal Fan Kuan central granite monolith (craggy multi-lobed top)
  const mainPeakSilhouette = subdivideCraggy(
    [
      [680, 1780],
      [710, 1260],
      [785, 760],
      [855, 420],
      [965, 220],
      [1135, 115],
      [1315, 145],
      [1455, 290],
      [1520, 560],
      [1595, 920],
      [1685, 1360],
      [1740, 1780],
    ],
    3,
    0.22,
    511
  );
  drawInkWash(pg, mainPeakSilhouette, "#2f3129", 0.5, { layers: 4, edgeAlpha: 0.42, edgeWidth: 3.2 });

  // Secondary interior granite cliff ribs & deep right waterfall chasm
  const innerFacetA = subdivideCraggy(
    [
      [830, 580],
      [1040, 340],
      [1235, 390],
      [1285, 960],
      [1035, 1340],
      [790, 1060],
    ],
    2,
    0.18,
    512
  );
  drawInkWash(pg, innerFacetA, "#3c3e34", 0.36, { layers: 3, edgeAlpha: 0.28 });

  const rightChasm = subdivideCraggy(
    [
      [1285, 420],
      [1465, 370],
      [1575, 860],
      [1640, 1660],
      [1330, 1660],
      [1305, 960],
    ],
    2,
    0.18,
    513
  );
  drawInkWash(pg, rightChasm, "#1b1d18", 0.48, { layers: 3, edgeAlpha: 0.26 });

  // Craggy Feibai contour ridges across the mountain face
  drawFeibaiStroke(pg, mainPeakSilhouette, 10, "#171914", 0.4, 514);
  drawFeibaiStroke(
    pg,
    subdivideCraggy(
      [
        [930, 290],
        [1070, 440],
        [1190, 740],
        [1245, 1280],
      ],
      2,
      0.2,
      515
    ),
    7.5,
    "#1d1f19",
    0.46,
    516
  );
  drawFeibaiStroke(
    pg,
    subdivideCraggy(
      [
        [785, 820],
        [950, 680],
        [1130, 760],
        [1240, 910],
      ],
      2,
      0.22,
      517
    ),
    6.5,
    "#1f211b",
    0.48,
    518
  );

  // Dense Northern Song Raindrop Cun-fa (雨点皴) constrained inside mountain body
  drawCunFa(pg, 870, 230, 530, 640, { count: 480, color: "#1c1e18", minLen: 8, maxLen: 22, weight: 2.1, alpha: 0.56, seed: 521 });
  drawCunFa(pg, 745, 780, 790, 700, { count: 520, color: "#21231d", minLen: 9, maxLen: 25, weight: 2.2, alpha: 0.46, seed: 522 });
  drawCunFa(pg, 1320, 410, 260, 1060, { count: 290, color: "#141612", minLen: 9, maxLen: 24, weight: 2.3, alpha: 0.6, seed: 523 });

  // Dense summit & ridge scrub forest dots (胡椒点)
  const summitClusters = [
    [970, 225, 82, 42, 62],
    [1140, 135, 115, 52, 92],
    [1300, 170, 95, 44, 76],
    [1435, 295, 76, 38, 58],
    [860, 415, 65, 32, 48],
    [995, 705, 68, 28, 42],
    [635, 845, 65, 32, 44],
    [1775, 760, 62, 30, 42],
  ];
  for (let i = 0; i < summitClusters.length; i++) {
    const [cx, cy, rx, ry, cnt] = summitClusters[i];
    drawFoliageDots(pg, cx, cy, rx, ry, cnt, "#161813", 530 + i);
  }

  // Silver-white ribbon waterfall ("飞泉") plunging through right cleft
  dc.save();
  dc.fillStyle = "rgba(244, 238, 224, 0.9)";
  dc.beginPath();
  dc.moveTo(1372, 560);
  dc.lineTo(1390, 560);
  dc.bezierCurveTo(1394, 860, 1384, 1180, 1406, 1520);
  dc.lineTo(1366, 1520);
  dc.bezierCurveTo(1374, 1180, 1362, 860, 1372, 560);
  dc.closePath();
  dc.fill();
  dc.strokeStyle = "rgba(72, 74, 66, 0.34)";
  dc.lineWidth = 1.4;
  for (let wx = -5; wx <= 6; wx += 5) {
    dc.beginPath();
    dc.moveTo(1380 + wx, 600);
    dc.lineTo(1384 + wx * 1.4, 1490);
    dc.stroke();
  }
  dc.restore();

  // Mid-mountain hidden temple roof eaves peeking above mist
  pg.push();
  pg.fill("#22241e");
  pg.noStroke();
  pg.beginShape();
  pg.vertex(1455, 1190);
  pg.vertex(1505, 1156);
  pg.vertex(1558, 1190);
  pg.vertex(1545, 1197);
  pg.vertex(1468, 1197);
  pg.endShape("close");
  pg.fill("#3b3d33");
  pg.rect(1478, 1197, 56, 26);
  pg.pop();

  // Soft billowing valley mist completely dissolving any bottom polygon seams
  dc.save();
  const mistGrad = dc.createLinearGradient(0, 1300, 0, 1880);
  mistGrad.addColorStop(0, "rgba(228, 216, 190, 0)");
  mistGrad.addColorStop(0.32, "rgba(228, 216, 190, 0.86)");
  mistGrad.addColorStop(0.58, "rgba(228, 216, 190, 1.0)");
  mistGrad.addColorStop(0.84, "rgba(228, 216, 190, 0.96)");
  mistGrad.addColorStop(1, "rgba(228, 216, 190, 0)");
  dc.fillStyle = mistGrad;
  dc.fillRect(0, 1300, w, 620);

  // Soft misty cloud plumes drifting through mountain ravine
  const rand = prng(555);
  for (let i = 0; i < 26; i++) {
    const mx = 180 + rand() * 2040;
    const my = 1280 + rand() * 340;
    const rx = 160 + rand() * 260;
    const ry = 40 + rand() * 65;
    const cg = dc.createRadialGradient(mx, my, 10, mx, my, rx);
    cg.addColorStop(0, "rgba(228, 216, 190, 0.72)");
    cg.addColorStop(1, "rgba(228, 216, 190, 0)");
    dc.fillStyle = cg;
    dc.beginPath();
    dc.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();
}

function drawSongPine(g, x, y, scale, lean = 1) {
  g.push();
  g.translate(x, y);
  g.scale(lean * scale, scale);

  drawFeibaiStroke(
    g,
    [
      [0, 0],
      [-14, -75],
      [18, -165],
      [-10, -255],
      [26, -335],
    ],
    15,
    "#1e201a",
    0.4,
    601
  );

  const limbs = [
    [[4, -145], [88, -162], [148, -148]],
    [[-6, -215], [-92, -235], [-145, -218]],
    [[14, -295], [108, -322], [166, -305]],
    [[24, -332], [-22, -372], [-75, -365]],
  ];
  for (let i = 0; i < limbs.length; i++) {
    drawFeibaiStroke(g, limbs[i], 7, "#1e201a", 0.35, 610 + i);
  }

  const needleFans = [
    [138, -158, 54, 18],
    [76, -166, 44, 15],
    [-132, -228, 52, 18],
    [-68, -238, 42, 14],
    [152, -315, 56, 19],
    [82, -325, 45, 15],
    [-58, -374, 52, 17],
    [18, -366, 46, 16],
  ];
  for (let i = 0; i < needleFans.length; i++) {
    const [nx, ny, rx, ry] = needleFans[i];
    drawInkWash(
      g,
      [
        [nx - rx, ny],
        [nx, ny - ry],
        [nx + rx, ny],
        [nx, ny + ry * 0.5],
      ],
      "#2d3228",
      0.34,
      { layers: 2, edgeAlpha: 0.2 }
    );
    drawFoliageDots(g, nx, ny - 2, rx * 0.85, ry * 0.7, 36, "#171a14", 620 + i);
  }

  g.pop();
}

function drawTravelerAndDonkey(g, x, y, lookBack) {
  g.push();
  g.translate(x, y);

  // Small pack donkey stopped ahead on the rocky trail
  g.stroke("#2c2a24");
  g.strokeWeight(3.2);
  g.line(-24, -12, -26, 4);
  g.line(-16, -12, -14, 4);
  g.line(6, -12, 4, 4);
  g.line(14, -12, 16, 4);

  g.fill("#7d7768");
  g.stroke("#23221d");
  g.strokeWeight(1.8);
  g.ellipse(-5, -20, 42, 22);
  g.fill("#9c8a6b");
  g.rect(-16, -32, 22, 14, 3);

  g.push();
  g.translate(-22, -24);
  g.rotate(-lookBack * 0.16);
  g.fill("#7d7768");
  g.beginShape();
  g.vertex(4, 6);
  g.vertex(-6, -14);
  g.vertex(-18, -10);
  g.vertex(-16, -2);
  g.vertex(-2, 8);
  g.endShape("close");
  g.line(-5, -14, -2, -26);
  g.line(-8, -13, -8, -25);
  g.pop();

  // Song woodcutter / muleteer turning back to stare in disbelief
  g.push();
  g.translate(32, 0);
  g.fill("#5f5a4c");
  g.stroke("#1d1e19");
  g.strokeWeight(1.8);
  g.beginShape();
  g.vertex(-10, -48);
  g.vertex(10, -48);
  g.vertex(14, -6);
  g.vertex(-13, -6);
  g.endShape("close");
  g.line(-5, -6, -6, 4);
  g.line(5, -6, 6, 4);
  g.stroke("#352d22");
  g.strokeWeight(2.4);
  g.line(15, -52, 18, 4);
  g.push();
  g.translate(0, -56);
  g.rotate(-lookBack * 0.35);
  g.fill("#d4c3a4");
  g.stroke("#1d1e19");
  g.strokeWeight(1.6);
  g.circle(0, 0, 14);
  g.fill("#b89e72");
  g.triangle(-16, -3, 16, -3, 0, -14);
  g.pop();
  g.pop();

  g.pop();
}

function drawSongInkRig(g, pose) {
  const s = pose.scale;
  const ink = "#181a15";
  const midInk = "#4e5146";
  const bamboo = "#8d7854";
  const pouchTint = "#c8a97b";
  const dc = g.drawingContext;

  for (const hub of [pose.rearHub, pose.frontHub]) {
    g.noFill();
    g.stroke(ink);
    g.strokeWeight(4.6 * s);
    g.circle(hub.x, hub.y, pose.wheelRadius * 2);
    g.stroke(midInk);
    g.strokeWeight(1.5 * s);
    for (let i = 0; i < 8; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 4;
      g.line(
        hub.x,
        hub.y,
        hub.x + Math.cos(a) * (pose.wheelRadius - 2.5 * s),
        hub.y + Math.sin(a) * (pose.wheelRadius - 2.5 * s)
      );
    }
    g.fill(ink);
    g.noStroke();
    g.circle(hub.x, hub.y, 9 * s);
  }

  g.strokeCap("round");
  g.stroke(midInk);
  g.strokeWeight(6.5 * s);
  g.noFill();
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.leftKnee.x, pose.leftKnee.y);
  g.vertex(pose.leftPedal.x, pose.leftPedal.y);
  g.endShape();

  g.stroke(bamboo);
  g.strokeWeight(6.5 * s);
  g.line(pose.rearHub.x, pose.rearHub.y, pose.bb.x, pose.bb.y);
  g.line(pose.rearHub.x, pose.rearHub.y, pose.seatCluster.x, pose.seatCluster.y);
  g.line(pose.bb.x, pose.bb.y, pose.seatCluster.x, pose.seatCluster.y);
  g.line(pose.seatCluster.x, pose.seatCluster.y, pose.headTop.x, pose.headTop.y);
  g.line(pose.bb.x, pose.bb.y, pose.headBot.x, pose.headBot.y);
  g.line(pose.frontHub.x, pose.frontHub.y, pose.headTop.x, pose.headTop.y);
  g.line(pose.headTop.x, pose.headTop.y, pose.stemTop.x, pose.stemTop.y);
  g.line(pose.stemTop.x, pose.stemTop.y, pose.barGrip.x, pose.barGrip.y);
  g.stroke(ink);
  g.strokeWeight(1.8 * s);
  g.line(pose.seatCluster.x, pose.seatCluster.y, pose.headTop.x, pose.headTop.y);
  g.line(pose.bb.x, pose.bb.y, pose.headBot.x, pose.headBot.y);

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
  dc.fillStyle = "#f2ebdc";
  dc.fill();
  dc.strokeStyle = ink;
  dc.lineWidth = 3 * s;
  dc.stroke();
  dc.restore();

  g.noFill();
  g.stroke(ink);
  g.strokeWeight(22 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();
  g.stroke("#efe7d5");
  g.strokeWeight(16.5 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();

  g.fill("#f2ebdc");
  g.stroke(ink);
  g.strokeWeight(2.5 * s);
  g.circle(pose.head.x, pose.head.y, 33 * s);

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
  dc.fillStyle = pouchTint;
  dc.fill();
  dc.strokeStyle = ink;
  dc.lineWidth = 2.4 * s;
  dc.stroke();
  dc.restore();

  g.fill("#b48d56");
  g.stroke(ink);
  g.strokeWeight(2.3 * s);
  g.beginShape();
  g.vertex(pose.beakBaseTop.x, pose.beakBaseTop.y);
  g.vertex(pose.beakTip.x, pose.beakTip.y);
  g.vertex(pose.beakHook.x, pose.beakHook.y);
  g.vertex(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  g.vertex(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  g.endShape("close");

  // Song conical woven bamboo rain hat ("斗笠")
  g.push();
  g.translate(pose.head.x - 4 * s, pose.head.y - 16 * s);
  g.rotate(-0.1);
  g.fill("#bfa36f");
  g.stroke(ink);
  g.strokeWeight(2.2 * s);
  g.beginShape();
  g.vertex(-36 * s, 6 * s);
  g.vertex(0, -16 * s);
  g.vertex(36 * s, 6 * s);
  g.endShape("close");
  g.stroke("#6b5636");
  g.strokeWeight(1.2 * s);
  g.line(-22 * s, 0, 22 * s, 0);
  g.pop();

  g.fill(ink);
  g.noStroke();
  g.circle(pose.eye.x + 1 * s, pose.eye.y, 4.5 * s);

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
  dc.fillStyle = "#dfd4bc";
  dc.fill();
  dc.strokeStyle = ink;
  dc.lineWidth = 2.6 * s;
  dc.stroke();
  dc.restore();

  g.noFill();
  g.stroke(ink);
  g.strokeWeight(6.5 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.rightKnee.x, pose.rightKnee.y);
  g.vertex(pose.rightPedal.x, pose.rightPedal.y);
  g.endShape();
}

export default function render(ctx) {
  const { p, brush, g, kit, t, localTime } = ctx;
  const u = localTime;

  const silkPaper = getInkPaperLayer(kit, "shanShui", 1840, 1000);
  const mountain = kit.bakeLayer("s05_fan_kuan_peak_v2", 2400, 2200, bakeMonumentalPeak);

  // 1. Aged Northern Song silk substrate
  p.push();
  p.imageMode(p.CENTER);
  p.image(silkPaper, 500, 500, 1840, 1000);
  p.pop();

  const px = getScenePelicanX(u);
  const viewCenterX = getSceneCamX(clamp(u, 0, 6));

  // Screen-anchored zoom interpolation so ROAD_Y glides smoothly without dropping offscreen mid-zoom
  const wideZ = 0.145;
  const wideScreenOffsetY = (-2020 - ROAD_Y) * wideZ; // -398.75
  const nearZ = 1.15;
  const nearScreenOffsetY = (575 - ROAD_Y) * nearZ; // -178.25
  const exitZ = 1.0;
  const exitScreenOffsetY = (500 - ROAD_Y) * exitZ; // -230

  let zoom = 1.0;
  let targetX = viewCenterX;
  let screenOffY = exitScreenOffsetY;

  if (u > 0.35 && u <= 1.55) {
    const k = hermite(0, 0, 1, 0, (u - 0.35) / 1.2);
    zoom = Math.exp(lerp(Math.log(1.0), Math.log(wideZ), k));
    targetX = lerp(viewCenterX, 550, k);
    screenOffY = lerp(exitScreenOffsetY, wideScreenOffsetY, k);
  } else if (u > 1.55 && u <= 2.55) {
    zoom = wideZ;
    targetX = 550;
    screenOffY = wideScreenOffsetY;
  } else if (u > 2.55 && u <= 3.75) {
    const k = hermite(0, 0, 1, 0, (u - 2.55) / 1.2);
    zoom = Math.exp(lerp(Math.log(wideZ), Math.log(nearZ), k));
    targetX = lerp(550, px + 45, k);
    screenOffY = lerp(wideScreenOffsetY, nearScreenOffsetY, k);
  } else if (u > 3.75 && u <= 4.75) {
    const k = smoothstep(3.75, 4.75, u);
    zoom = lerp(nearZ, 1.08, k);
    targetX = px + lerp(45, 12, k);
    screenOffY = lerp(nearScreenOffsetY, (525 - ROAD_Y) * 1.08, k);
  } else if (u > 4.75 && u <= 5.45) {
    const k = hermite(0, 0, 1, 0, (u - 4.75) / 0.7);
    zoom = lerp(1.08, 1.0, k);
    targetX = lerp(px + 12, viewCenterX, k);
    screenOffY = lerp((525 - ROAD_Y) * 1.08, exitScreenOffsetY, k);
  }

  const targetY = ROAD_Y + screenOffY / zoom;

  // p5.brush charcoal anchor strokes at portal seam
  if (Math.abs(zoom - 1.0) < 0.08) {
    brush.set("charcoal", "#3a3931", 1.8);
    brush.line(BLEED_LEFT, ROAD_Y + 3, BLEED_RIGHT, ROAD_Y + 3);
  }

  // 2. Zoomed Northern Song Landscape + Foreground World
  g.push();

  g.push();
  g.translate(viewCenterX, 500);
  g.scale(zoom);
  g.translate(-targetX, -targetY);

  // Monumental Fan Kuan peak spanning wide horizon [-4100..5500] x [-5250..1200]
  g.image(mountain, -4100, -5250, 9600, 6450);

  // Continuous foreground stone bank across bleed & world
  drawInkWash(
    g,
    [
      [-5500, ROAD_Y],
      [6500, ROAD_Y],
      [6500, ROAD_Y + 420],
      [-5500, ROAD_Y + 420],
    ],
    "#57584a",
    0.42,
    { layers: 3, edgeAlpha: 0.35 }
  );
  drawFeibaiStroke(
    g,
    [
      [-4000, ROAD_Y + 2],
      [0, ROAD_Y + 2],
      [500, ROAD_Y + 4],
      [1420, ROAD_Y + 2],
      [4500, ROAD_Y + 2],
    ],
    7,
    "#1c1e18",
    0.45,
    650
  );

  // Craggy Northern Song granite boulders flanking the trail (organic jagged outlines)
  const boulders = [
    subdivideCraggy(
      [
        [-210, ROAD_Y + 8],
        [-145, ROAD_Y - 115],
        [-30, ROAD_Y - 125],
        [40, ROAD_Y - 75],
        [105, ROAD_Y + 8],
      ],
      2,
      0.18,
      661
    ),
    subdivideCraggy(
      [
        [960, ROAD_Y + 12],
        [1020, ROAD_Y - 95],
        [1135, ROAD_Y - 145],
        [1245, ROAD_Y - 90],
        [1315, ROAD_Y + 12],
      ],
      2,
      0.18,
      662
    ),
  ];
  for (let i = 0; i < boulders.length; i++) {
    drawInkWash(g, boulders[i], "#3d3f35", 0.56, { layers: 3, edgeAlpha: 0.45 });
    drawFeibaiStroke(g, boulders[i], 6, "#181a15", 0.42, 665 + i);
    drawCunFa(g, boulders[i][0][0] + 30, ROAD_Y - 105, 190, 95, {
      count: 48,
      color: "#1b1d17",
      angle: 0.72,
      seed: 670 + i,
    });
  }

  // Twin Song Pines anchored on the rocky banks
  drawSongPine(g, 115, ROAD_Y - 45, 0.92, 1);
  drawSongPine(g, 1065, ROAD_Y - 60, 1.02, -1);

  // Startled Song woodcutter & pack donkey ahead on the path, clear of the bike wheels
  const lookBack = smoothstep(2.9, 3.6, u);
  drawTravelerAndDonkey(g, 955, ROAD_Y - 4, lookBack);

  // Song-ink Pelican cycling along the mountain road
  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
  drawSongInkRig(g, pose);

  // Subtle cinnabar-red ink finder ring during the grand wide shot (u in [1.7..2.75])
  if (u >= 1.7 && u <= 2.75) {
    const ringAlpha = smoothstep(1.7, 1.95, u) * (1 - smoothstep(2.5, 2.75, u));
    if (ringAlpha > 0.02) {
      const pulse = 1 + 0.08 * Math.sin(u * 12);
      g.push();
      g.drawingContext.globalAlpha = ringAlpha * 0.88;
      g.noFill();
      g.stroke("#a82d22");
      g.strokeWeight(16);
      g.circle(px, ROAD_Y - 95, 420 * pulse);
      g.fill("#a82d22");
      g.noStroke();
      g.textAlign("center", "bottom");
      g.textFont("Songti SC, STSong, serif");
      g.textStyle("bold");
      g.textSize(145);
      g.text("在此 ↓", px, ROAD_Y - 350);
      g.pop();
    }
  }

  g.pop(); // End world zoom

  // 3. Collector red seals in upper right scroll margin
  if (u > 0.4 && u < 5.6) {
    const marginAlpha = smoothstep(0.4, 0.9, u) * (1 - smoothstep(5.1, 5.6, u));
    g.push();
    g.drawingContext.globalAlpha = marginAlpha * 0.92;
    drawRedSeal(g, 926, 92, "溪山奇观", 46, "#992e24", "zhuwen");
    drawRedSeal(g, 926, 152, "鹈鹕清玩", 38, "#992e24", "baiwen");
    g.pop();
  }

  // Antique mounted scroll Title Card
  drawEraTitleCard(g, META, u);

  g.pop();
}
