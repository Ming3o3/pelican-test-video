/**
 * Scene #01 — 撒哈拉岩画 · Tassili Rock Art (c. 4000 BCE), t in [5.0, 11.0).
 * Weathered sandstone cliff wall with negative hand stencils, upper hunting glyphs,
 * Tassili bicolored long-horned cattle & slender herders who freeze in Bar 2 to gawk
 * at the ochre-pigment Pelican riding across the desert rock ledge.
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

const META = SCENES_META[0];

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawHandStencil(pg, cx, cy, scale, angle) {
  pg.push();
  pg.translate(cx, cy);
  pg.rotate(angle);
  pg.scale(scale);
  // Blown ochre halo
  pg.noStroke();
  for (let r = 82; r >= 22; r -= 10) {
    pg.fill(124, 38, 16, 16);
    pg.ellipse(0, -10, r * 1.15, r * 1.35);
  }
  // Exposed bare sandstone hand silhouette inside halo
  pg.fill(218, 160, 102, 165);
  pg.ellipse(0, 6, 30, 36);
  const fingers = [
    [-22, 6, -0.65, 22],
    [-12, -16, -0.25, 32],
    [0, -21, 0.0, 36],
    [12, -17, 0.24, 33],
    [22, -8, 0.55, 25],
  ];
  for (const [fx, fy, fa, fl] of fingers) {
    pg.push();
    pg.translate(fx, fy);
    pg.rotate(fa);
    pg.rect(-4, -fl, 8, fl, 4);
    pg.pop();
  }
  pg.pop();
}

function drawDistantGazelle(pg, x, y, s, dir = 1) {
  pg.push();
  pg.translate(x, y);
  pg.scale(dir * s, s);
  pg.stroke("#efe0c4");
  pg.strokeWeight(2.5);
  pg.noFill();
  // Slender leaping body + swept horns
  pg.fill("rgba(112, 42, 18, 0.7)");
  pg.beginShape();
  pg.vertex(-24, 0);
  pg.vertex(14, -4);
  pg.vertex(22, -16);
  pg.vertex(28, -14);
  pg.vertex(18, 4);
  pg.vertex(-20, 8);
  pg.endShape("close");
  pg.noFill();
  pg.line(-20, 6, -32, 22);
  pg.line(-16, 7, -20, 24);
  pg.line(12, 2, 22, 20);
  pg.line(16, 2, 28, 18);
  // Swept horns
  pg.line(23, -17, 10, -34);
  pg.line(26, -17, 15, -33);
  pg.pop();
}

function bakeSandstoneWall(pg) {
  const w = 1840;
  const h = 1000;
  const rand = prng(40001);

  pg.background("#c7854d");

  // Sedimentary horizontal & slightly tilted sandstone strata bands
  pg.noStroke();
  for (let i = 0; i < 42; i++) {
    const y = rand() * h;
    const bandH = 18 + rand() * 75;
    const tone = rand();
    if (tone < 0.33) pg.fill(175, 106, 54, 42);
    else if (tone < 0.66) pg.fill(216, 158, 98, 38);
    else pg.fill(138, 70, 34, 28);
    pg.beginShape();
    pg.vertex(0, y);
    for (let x = 0; x <= w; x += 180) {
      pg.vertex(x, y + (rand() - 0.5) * 18);
    }
    pg.vertex(w, y + bandH);
    pg.vertex(0, y + bandH);
    pg.endShape("close");
  }

  // Mottled mineral blotches & pitted rock grain
  for (let i = 0; i < 1100; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 4 + rand() * 34;
    pg.fill(rand() > 0.45 ? 110 : 230, rand() > 0.45 ? 48 : 185, rand() > 0.45 ? 24 : 130, 16);
    pg.circle(x, y, r);
  }

  // Natural sandstone rock fissures
  for (let c = 0; c < 14; c++) {
    let cx = 60 + rand() * (w - 120);
    let cy = rand() * 820;
    const steps = 6 + Math.floor(rand() * 7);
    const pts = [[cx, cy]];
    for (let k = 0; k < steps; k++) {
      cx += (rand() - 0.35) * 75;
      cy += 25 + rand() * 65;
      pts.push([cx, cy]);
    }
    pg.noFill();
    pg.stroke(78, 32, 14, 105);
    pg.strokeWeight(2.4);
    pg.beginShape();
    for (const [px, py] of pts) pg.vertex(px, py);
    pg.endShape();

    pg.stroke(236, 198, 148, 65);
    pg.strokeWeight(1.2);
    pg.beginShape();
    for (const [px, py] of pts) pg.vertex(px + 2, py + 1.5);
    pg.endShape();
  }

  // Rock ledge shelf shadow around y = 548 (where cattle & herders stand cleanly above Pelican)
  pg.noStroke();
  pg.fill(92, 42, 20, 48);
  pg.rect(0, 546, w, 12);
  pg.fill(228, 184, 130, 45);
  pg.rect(0, 540, w, 6);

  // Cave overhang shadow at top & ground shadow at bottom
  for (let y = 0; y < 120; y += 6) {
    pg.fill(58, 26, 12, Math.round((1 - y / 120) * 95));
    pg.rect(0, y, w, 6);
  }
  for (let y = 760; y < 1000; y += 6) {
    pg.fill(66, 30, 14, Math.round(((y - 760) / 240) * 115));
    pg.rect(0, y, w, 6);
  }

  // Prehistoric negative hand stencils & distant upper-cliff gazelles
  drawHandStencil(pg, 1110, 148, 0.82, -0.18);
  drawHandStencil(pg, 1215, 182, 0.76, 0.12);
  drawHandStencil(pg, 1305, 138, 0.8, 0.25);

  drawDistantGazelle(pg, 880, 195, 0.92, 1);
  drawDistantGazelle(pg, 975, 175, 0.78, 1);
  drawDistantGazelle(pg, 1055, 222, 0.7, -1);

  // Small distant archer figure near gazelles
  pg.push();
  pg.translate(805, 214);
  pg.stroke("#5c2010");
  pg.strokeWeight(3.2);
  pg.line(0, -18, 0, 10);
  pg.line(0, 10, -10, 28);
  pg.line(0, 10, 12, 26);
  pg.line(0, -10, 18, -14);
  pg.noFill();
  pg.arc(18, -14, 24, 34, -Math.PI * 0.45, Math.PI * 0.45);
  pg.fill("#5c2010");
  pg.noStroke();
  pg.circle(0, -25, 11);
  pg.pop();
}

function drawTassiliCow(g, x, y, scale, dir, walkPhase, headTurn) {
  g.push();
  g.translate(x, y);
  g.scale(dir * scale, scale);

  const dc = g.drawingContext;
  const stride = Math.sin(walkPhase) * 9;

  // Four slender tapered Tassili cattle legs
  g.stroke("#6f2210");
  g.strokeWeight(4.5);
  g.strokeCap("round");
  g.line(-34, -12, -38 - stride, 30);
  g.line(-22, -12, -20 + stride * 0.7, 30);
  g.line(24, -12, 20 - stride * 0.7, 30);
  g.line(36, -12, 40 + stride, 30);

  // White hooves/ankles
  g.stroke("#f2e4c8");
  g.strokeWeight(3.5);
  g.line(-38 - stride, 24, -38 - stride, 30);
  g.line(40 + stride, 24, 40 + stride, 30);

  // Curved Tassili torso (red-ochre base with chalk-white dappled hide patch)
  dc.save();
  dc.beginPath();
  dc.moveTo(-46, -24);
  dc.bezierCurveTo(-18, -42, 16, -40, 44, -26);
  dc.bezierCurveTo(50, -10, 42, 2, 24, 2);
  dc.bezierCurveTo(2, 6, -24, 4, -44, -8);
  dc.closePath();
  dc.fillStyle = "#7a2511";
  dc.fill();
  dc.strokeStyle = "#f0dfc0";
  dc.lineWidth = 1.6;
  dc.stroke();

  // Iconic Tassili bicolored white hide saddle patch
  dc.beginPath();
  dc.ellipse(-4, -18, 22, 14, -0.1, 0, Math.PI * 2);
  dc.fillStyle = "#efe0c2";
  dc.fill();
  dc.fillStyle = "#7a2511";
  dc.beginPath();
  dc.arc(-10, -20, 4.5, 0, Math.PI * 2);
  dc.fill();
  dc.beginPath();
  dc.arc(6, -15, 3.8, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  // Tail with tufted tip
  g.noFill();
  g.stroke("#6f2210");
  g.strokeWeight(2.5);
  g.line(-45, -22, -58, -4);
  g.fill("#efe0c2");
  g.noStroke();
  g.ellipse(-59, -2, 6, 9);

  // Neck + head + sweeping lyre horns (turning toward the Pelican in Bar 2!)
  g.push();
  g.translate(40, -24);
  g.rotate(headTurn * dir);
  g.fill("#7a2511");
  g.stroke("#f0dfc0");
  g.strokeWeight(1.5);
  g.beginShape();
  g.vertex(-6, 6);
  g.vertex(16, -16);
  g.vertex(30, -12);
  g.vertex(28, -2);
  g.vertex(6, 12);
  g.endShape("close");

  // Lyre horns
  g.noFill();
  g.stroke("#f4e8ce");
  g.strokeWeight(3.4);
  dc.beginPath();
  dc.moveTo(16, -16);
  dc.bezierCurveTo(6, -42, -8, -48, 2, -62);
  dc.stroke();
  dc.beginPath();
  dc.moveTo(21, -15);
  dc.bezierCurveTo(22, -42, 34, -46, 26, -60);
  dc.stroke();

  // Wide white eye dot when startled
  if (Math.abs(headTurn) > 0.08) {
    g.fill("#f7eedb");
    g.noStroke();
    g.circle(20, -11, 5.5);
    g.fill("#2c1108");
    g.circle(21, -11, 2.5);
  }
  g.pop();

  g.pop();
}

function drawTassiliHerder(g, x, y, pose) {
  const { stride, headTilt, pointArm, crouching, awePulse } = pose;
  g.push();
  g.translate(x, y);

  if (crouching) {
    // Rock-painter crouched, frantically sketching a bike glyph on the wall
    g.fill("#661f0e");
    g.stroke("#ebd8b7");
    g.strokeWeight(1.5);
    g.ellipse(-6, -26, 24, 34);
    g.circle(6, -46, 14);
    g.stroke("#661f0e");
    g.strokeWeight(5);
    g.line(-10, -12, -18, 8);
    g.line(4, -12, 16, 8);
    g.line(8, -32, 34, -36 + Math.sin(awePulse * 14) * 3);

    // Fresh white-chalk miniature sketch on the sandstone right beside them!
    g.noFill();
    g.stroke("rgba(245, 233, 208, 0.85)");
    g.strokeWeight(2);
    g.circle(46, -28, 14);
    g.circle(68, -28, 14);
    g.line(46, -28, 68, -28);
    g.line(54, -44, 62, -44);
    g.line(62, -44, 74, -41);
    g.pop();
    return;
  }

  // Slender Pastoral-style legs
  g.stroke("#691f0e");
  g.strokeWeight(5);
  g.strokeCap("round");
  g.line(-4, -36, -12 - stride, 8);
  g.line(4, -36, 12 + stride, 8);

  // Iconic Tassili triangular ochre torso + white crossed chest bands
  g.fill("#742310");
  g.stroke("#efe0c4");
  g.strokeWeight(1.4);
  g.beginShape();
  g.vertex(-16, -74);
  g.vertex(16, -74);
  g.vertex(5, -36);
  g.vertex(-5, -36);
  g.endShape("close");

  g.stroke("#f2e3c8");
  g.strokeWeight(2.2);
  g.line(-13, -71, 6, -44);
  g.line(13, -71, -6, -44);

  // Staff arm + pointing arm
  g.stroke("#691f0e");
  g.strokeWeight(4);
  g.line(-15, -70, -24, -42);
  g.stroke("#ebd8b6");
  g.strokeWeight(2.8);
  g.line(-24, -92, -24, 8); // tall herding staff

  g.stroke("#691f0e");
  g.strokeWeight(4);
  if (pointArm > 0.1) {
    g.line(15, -70, 36, -54 + pointArm * 18);
  } else {
    g.line(15, -70, 22, -42);
  }

  // Head + twin ceremonial plumes turning to watch the Pelican
  g.push();
  g.translate(0, -84);
  g.rotate(headTilt);
  g.fill("#742310");
  g.stroke("#efe0c4");
  g.strokeWeight(1.4);
  g.circle(0, 0, 15);
  // Feather plumes
  g.stroke("#f4e8cf");
  g.strokeWeight(2);
  g.line(-2, -7, -9, -20);
  g.line(2, -7, 8, -19);
  g.pop();

  // Prehistoric chalk awe marks pulsing on strong beats
  if (awePulse > 0.08) {
    g.push();
    g.drawingContext.globalAlpha = awePulse;
    g.stroke("#f7ebd2");
    g.strokeWeight(2.2);
    for (let k = -1; k <= 1; k++) {
      const ang = -Math.PI / 2 + k * 0.45;
      g.line(
        Math.cos(ang) * 20,
        -96 + Math.sin(ang) * 20,
        Math.cos(ang) * 32,
        -96 + Math.sin(ang) * 32
      );
    }
    g.pop();
  }

  g.pop();
}

function drawPigmentCircle(g, cx, cy, r, strokeCol, weight, seedOffset) {
  const steps = 28;
  g.noFill();
  g.stroke(strokeCol);
  g.strokeWeight(weight);
  g.beginShape();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wob = Math.sin(a * 5 + seedOffset) * 1.4 + Math.cos(a * 3 - seedOffset) * 1.1;
    g.vertex(cx + Math.cos(a) * (r + wob), cy + Math.sin(a) * (r + wob));
  }
  g.endShape("close");
}

function drawSaharaRig(g, pose, u) {
  const s = pose.scale;
  const ochreDark = "#5e1c0c";
  const ochreMid = "#8a2d15";
  const chalk = "#f3e5c7";
  const dc = g.drawingContext;

  // Chalk-white hand-drawn wheel rings & irregular spokes
  for (const hub of [pose.rearHub, pose.frontHub]) {
    drawPigmentCircle(g, hub.x, hub.y, pose.wheelRadius, ochreDark, 6.2 * s, 0.7);
    drawPigmentCircle(g, hub.x, hub.y, pose.wheelRadius - 2 * s, chalk, 1.8 * s, 2.1);
    g.stroke(ochreDark);
    g.strokeWeight(2 * s);
    for (let i = 0; i < 6; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 3;
      g.line(
        hub.x,
        hub.y,
        hub.x + Math.cos(a) * (pose.wheelRadius - 3 * s),
        hub.y + Math.sin(a) * (pose.wheelRadius - 3 * s)
      );
    }
    g.fill(chalk);
    g.noStroke();
    g.circle(hub.x, hub.y, 9 * s);
  }

  // Dust puffs kicked up from rear wheel on each beat
  const beatFrac = (u * 2) % 1;
  if (beatFrac < 0.7) {
    g.push();
    g.noStroke();
    for (let i = 0; i < 4; i++) {
      const puffAge = (beatFrac + i * 0.14) % 0.8;
      g.fill(238, 206, 152, Math.round((1 - puffAge) * 95));
      g.circle(
        pose.rearHub.x - 18 * s - puffAge * 42 * s,
        ROAD_Y - 5 * s - puffAge * 18 * s,
        (7 + puffAge * 14) * s
      );
    }
    g.pop();
  }

  // Rear leg
  g.strokeCap("round");
  g.stroke(ochreMid);
  g.strokeWeight(7 * s);
  g.noFill();
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.leftKnee.x, pose.leftKnee.y);
  g.vertex(pose.leftPedal.x, pose.leftPedal.y);
  g.endShape();

  // Mineral-pigment bicycle frame
  g.stroke(ochreDark);
  g.strokeWeight(5 * s);
  g.line(pose.rearHub.x, pose.rearHub.y, pose.bb.x, pose.bb.y);
  g.line(pose.rearHub.x, pose.rearHub.y, pose.seatCluster.x, pose.seatCluster.y);
  g.line(pose.bb.x, pose.bb.y, pose.seatCluster.x, pose.seatCluster.y);
  g.line(pose.seatCluster.x, pose.seatCluster.y, pose.headTop.x, pose.headTop.y);
  g.line(pose.bb.x, pose.bb.y, pose.headBot.x, pose.headBot.y);
  g.line(pose.frontHub.x, pose.frontHub.y, pose.headTop.x, pose.headTop.y);
  g.line(pose.headTop.x, pose.headTop.y, pose.stemTop.x, pose.stemTop.y);
  g.line(pose.stemTop.x, pose.stemTop.y, pose.barGrip.x, pose.barGrip.y);
  g.stroke(chalk);
  g.strokeWeight(1.5 * s);
  g.line(pose.seatCluster.x, pose.seatCluster.y + 3 * s, pose.headTop.x, pose.headTop.y + 3 * s);

  // Body (deep ochre rock-art silhouette with chalk outline)
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
  dc.fillStyle = ochreDark;
  dc.fill();
  dc.strokeStyle = chalk;
  dc.lineWidth = 2 * s;
  dc.stroke();
  dc.restore();

  // S-neck
  g.noFill();
  g.stroke(chalk);
  g.strokeWeight(23 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();
  g.stroke(ochreDark);
  g.strokeWeight(18 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();

  // Head + crest
  g.fill(ochreDark);
  g.stroke(chalk);
  g.strokeWeight(2 * s);
  g.beginShape();
  g.vertex(pose.crest1.x, pose.crest1.y);
  g.vertex(pose.head.x - 6 * s, pose.head.y - 16 * s);
  g.vertex(pose.crest2.x, pose.crest2.y);
  g.vertex(pose.head.x + 6 * s, pose.head.y - 17 * s);
  g.endShape();
  g.circle(pose.head.x, pose.head.y, 33 * s);

  // Throat pouch (rich red-ochre with ceremonial chalk dots)
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
  dc.fillStyle = ochreMid;
  dc.fill();
  dc.strokeStyle = chalk;
  dc.lineWidth = 2 * s;
  dc.stroke();
  dc.restore();

  // Ritual chalk dots along pouch
  g.fill(chalk);
  g.noStroke();
  for (let d = 0.22; d <= 0.78; d += 0.18) {
    g.circle(
      lerp(pose.pouchBase.x, pose.beakTip.x, d),
      lerp(pose.pouchBase.y + 12 * s, pose.pouchMid.y, Math.sin(d * Math.PI)),
      4 * s
    );
  }

  // Upper beak
  g.fill(ochreDark);
  g.stroke(chalk);
  g.strokeWeight(2 * s);
  g.beginShape();
  g.vertex(pose.beakBaseTop.x, pose.beakBaseTop.y);
  g.vertex(pose.beakTip.x, pose.beakTip.y);
  g.vertex(pose.beakHook.x, pose.beakHook.y);
  g.vertex(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  g.vertex(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  g.endShape("close");

  // Rock-art concentric eye
  g.fill(chalk);
  g.noStroke();
  g.circle(pose.eye.x, pose.eye.y, 9 * s);
  g.fill(ochreDark);
  g.circle(pose.eye.x + 1 * s, pose.eye.y, 4 * s);

  // Wing with chalk stripe
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
  dc.fillStyle = "#4d1508";
  dc.fill();
  dc.strokeStyle = chalk;
  dc.lineWidth = 2 * s;
  dc.stroke();
  dc.restore();

  // Front leg
  g.noFill();
  g.stroke(chalk);
  g.strokeWeight(9 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.rightKnee.x, pose.rightKnee.y);
  g.vertex(pose.rightPedal.x, pose.rightPedal.y);
  g.endShape();
  g.stroke(ochreDark);
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

  const wall = kit.bakeLayer("s01_sandstone_wall_v1", 1840, 1000, bakeSandstoneWall);

  // 1. Baked sandstone cliff backdrop
  p.push();
  p.imageMode(p.CENTER);
  p.image(wall, 500, 500, 1840, 1000);
  p.pop();

  // 2. Organic p5.brush geological rock lines & trail strokes
  brush.set("charcoal", "#592210", 2.4);
  brush.line(BLEED_LEFT, ROAD_Y + 2, BLEED_RIGHT, ROAD_Y + 2);
  brush.set("crayon", "#f0dec0", 1.1);
  brush.line(BLEED_LEFT, ROAD_Y + 10, BLEED_RIGHT, ROAD_Y + 10);
  brush.set("charcoal", "#7d3518", 1.3);
  brush.line(BLEED_LEFT, 544, BLEED_RIGHT, 544);

  // 3. 2D Foreground: Cattle, Herders, Pelican, Title Card
  g.push();

  const px = getScenePelicanX(u);
  // Bar 1 walking -> Bar 2 sudden freeze & neck-craning gawk at u = 2.0s!
  const stopBlend = smoothstep(1.85, 2.02, u);
  const walkClock = Math.min(u, 1.95);
  const beatAge = (u - 2.0) >= 0 ? (u - 2.0) % 0.5 : 1;
  const awePulse = u >= 2.0 && u <= 4.3 ? Math.exp(-beatAge * 6.5) : 0;

  // Cattle & herders positioned cleanly along the upper rock shelf (y = 510..538) above the Pelican
  const cattleSpecs = [
    { baseX: 165, y: 510, s: 0.92, dir: 1 },
    { baseX: 345, y: 516, s: 1.04, dir: -1 },
    { baseX: 605, y: 512, s: 0.98, dir: 1 },
    { baseX: 830, y: 515, s: 0.9, dir: -1 },
  ];
  for (let i = 0; i < cattleSpecs.length; i++) {
    const c = cattleSpecs[i];
    const cx = c.baseX + (1 - stopBlend) * c.dir * (walkClock - 1.95) * 18;
    const lookDx = clamp((px - cx) / 360, -0.5, 0.5);
    const headTurn = stopBlend * (0.36 + lookDx * 0.25);
    drawTassiliCow(
      g,
      cx,
      c.y,
      c.s,
      c.dir,
      (1 - stopBlend) * walkClock * 5.5 + i,
      headTurn
    );
  }

  const herderSpecs = [
    { x: 255, y: 534, crouch: false },
    { x: 478, y: 537, crouch: false },
    { x: 702, y: 536, crouch: true },
  ];
  for (let i = 0; i < herderSpecs.length; i++) {
    const hSpec = herderSpecs[i];
    const hx = hSpec.x - (1 - stopBlend) * (walkClock - 1.95) * 16;
    const lookAngle = stopBlend * clamp(Math.atan2(ROAD_Y - 120 - (hSpec.y - 84), px - hx) * 0.35, -0.35, 0.48);
    drawTassiliHerder(g, hx, hSpec.y, {
      stride: (1 - stopBlend) * Math.sin(walkClock * 6 + i) * 7,
      headTilt: lookAngle,
      pointArm: i === 1 ? stopBlend : 0,
      crouching: hSpec.crouch && u >= 1.95,
      awePulse: i < 2 ? awePulse : u,
    });
  }

  // Rough ochre trail pebbles & desert grass tufts along ROAD_Y
  g.stroke("#5d2410");
  g.strokeWeight(2);
  for (let gx = -360; gx <= 1360; gx += 155) {
    g.line(gx, ROAD_Y + 6, gx - 5, ROAD_Y - 8);
    g.line(gx + 3, ROAD_Y + 6, gx + 6, ROAD_Y - 6);
  }

  // Pelican + bicycle in mineral ochre rock-art pigment
  const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
  drawSaharaRig(g, pose, u);

  // Sandstone Title Card
  drawEraTitleCard(g, META, u);

  g.pop();
}
