/**
 * Intro Scene (`src/scenes/intro.js`), t in [0.0, 5.0).
 * Archival paper texture, serif documentary typography, corner sketch plate
 * ("图一 鹈鹕骑行图（摹本）"), beat-timed subtitle reveal, and pickup ride into Portal 1.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  ROAD_Y,
  clamp,
  getIntroPelicanX,
  smoothstep,
} from "../beat.js";
import { drawRig2D, getRigPose } from "../rig.js";

function drawArchivalPaper(pg, w, h) {
  pg.background("#efe5cf");
  let s = 42019;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  pg.noStroke();
  for (let i = 0; i < 360; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 40 + rand() * 140;
    pg.fill(214, 198, 166, 18);
    pg.circle(x, y, r);
  }
  for (let i = 0; i < 1400; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 5 + rand() * 18;
    const a = rand() * Math.PI * 2;
    pg.stroke(166, 146, 114, 28);
    pg.strokeWeight(0.9);
    pg.line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  // Subtle archival foxing vignette near edges
  pg.noFill();
  for (let k = 0; k < 16; k++) {
    pg.stroke(130, 108, 76, 6);
    pg.strokeWeight(24);
    pg.rect(0, 0, w, h);
  }
}

export function renderIntro({ p, brush, g, kit, t }) {
  const paper = kit.bakeLayer("intro_archival_paper_1840x1000", 1840, 1000, (pg) => {
    drawArchivalPaper(pg, 1840, 1000);
  });

  // 1. Background paper layer in slot
  p.push();
  p.imageMode(p.CENTER);
  p.image(paper, 500, 500, 1840, 1000);
  p.pop();

  // 2. Organic p5.brush archival borders, road line & corner plate sketch frame
  brush.set("HB", "#5e4c36", 1.3);
  brush.line(BLEED_LEFT, ROAD_Y, BLEED_RIGHT, ROAD_Y);
  brush.set("2H", "#8c765a", 0.9);
  brush.line(BLEED_LEFT, ROAD_Y + 6, BLEED_RIGHT, ROAD_Y + 6);

  // Corner archival sketch plate frame (top-right inside canonical square)
  const plateAlpha = smoothstep(0.0, 0.55, t);
  if (plateAlpha > 0.02) {
    brush.set("charcoal", "#4e3e2d", 1.2);
    brush.rect(628, 96, 316, 250);
    brush.set("2H", "#7c674f", 0.8);
    brush.rect(636, 104, 300, 234);
  }

  // 3. 2D layer: corner sepia sketch + serif documentary subtitles + pickup pelican
  g.push();
  if (plateAlpha > 0.01) {
    g.push();
    g.drawingContext.globalAlpha = plateAlpha;
    g.fill("#f7eedc");
    g.stroke("#8c775b");
    g.strokeWeight(1.5);
    g.rect(636, 104, 300, 234);

    // Subtle inner plate hairline border & archival registration marks
    g.noFill();
    g.stroke("#b9a585");
    g.strokeWeight(0.8);
    g.rect(643, 111, 286, 220);
    g.stroke("#7b674c");
    for (const [cx, cy, sx, sy] of [
      [632, 100, 1, 1],
      [940, 100, -1, 1],
      [632, 342, 1, -1],
      [940, 342, -1, -1],
    ]) {
      g.line(cx, cy, cx + sx * 8, cy);
      g.line(cx, cy, cx, cy + sy * 8);
    }

    // Small archival catalog plate number
    g.noStroke();
    g.fill("#7b674c");
    g.textAlign("right", "top");
    g.textFont("Georgia, serif");
    g.textSize(9.5);
    g.text("PLATE I · ARCHIVE NO. 001", 923, 116);

    // Corner sepia sketch of the pelican riding
    const sketchPose = getRigPose(0.18, { x: 786, y: 274, scale: 0.54 });
    drawRig2D(g, sketchPose, {
      frame: "#5c4a35",
      tire: "#453726",
      feather: "#f2e7cf",
      featherShade: "#e3d3b2",
      beak: "#b38850",
      pouch: "#c79b60",
      leg: "#8f6537",
      outline: "#3d2f20",
    });

    // Caption under plate
    g.fill("#3b2f21");
    g.noStroke();
    g.textAlign("center", "top");
    g.textFont("Songti SC, STSong, serif");
    g.textSize(16);
    g.text("图一  鹈鹕骑行图（摹本）", 786, 305);
    g.pop();
  }

  // Documentary subtitles on the left/center
  const sub1Alpha = smoothstep(0.15, 0.75, t);
  const sub2Alpha = smoothstep(1.92, 2.18, t); // Lands on bar 2 strong beat t = 2.0s!
  const citeAlpha = smoothstep(2.15, 2.65, t);

  if (sub1Alpha > 0.01) {
    g.push();
    g.drawingContext.globalAlpha = sub1Alpha;
    g.fill("#221b13");
    g.noStroke();
    g.textAlign("left", "top");
    g.textFont("Songti SC, STSong, serif");
    g.textStyle("bold");
    g.textSize(37);
    g.text("人类自古以来就痴迷于", 64, 210);
    g.text("画鹈鹕骑自行车。", 64, 266);
    g.pop();
  }

  if (sub2Alpha > 0.01) {
    g.push();
    g.drawingContext.globalAlpha = sub2Alpha;
    // Slight impact scale right on t = 2.0s downbeat
    const beatPunch = 1 + 0.03 * Math.exp(-Math.max(0, t - 2.0) * 10);
    g.translate(64, 344);
    g.scale(beatPunch);
    g.fill("#7d281b");
    g.noStroke();
    g.textAlign("left", "top");
    g.textFont("Songti SC, STSong, serif");
    g.textStyle("bold");
    g.textSize(40);
    g.text("——早在自行车被发明之前。", 0, 0);
    g.pop();
  }

  if (citeAlpha > 0.01) {
    g.push();
    g.drawingContext.globalAlpha = citeAlpha;
    g.fill("#5e4f3d");
    g.noStroke();
    g.textAlign("left", "top");
    g.textFont("Songti SC, STSong, serif");
    g.textSize(20);
    g.text("——《鹈鹕骑行艺术通史》，卷一", 104, 412);
    g.pop();
  }

  // Road distance ticks (gives subtle motion reference on ride-out)
  g.stroke("#9c8669");
  g.strokeWeight(1.5);
  for (let rx = -300; rx <= 1400; rx += 120) {
    g.line(rx, ROAD_Y, rx - 8, ROAD_Y + 12);
  }

  // Pickup bar (t in [3.5, 5.0]): Pelican rides off the paper toward Portal 1
  const px = getIntroPelicanX(t);
  if (px !== null) {
    const enterFade = clamp((t - 3.5) / 0.25, 0, 1);
    g.push();
    g.drawingContext.globalAlpha = enterFade;
    const pose = getRigPose(t, { x: px, y: ROAD_Y, scale: 1.0 });
    drawRig2D(g, pose, {
      frame: "#3a3126",
      tire: "#211c16",
      feather: "#faf4e6",
      featherShade: "#e3d6be",
      beak: "#cf8b36",
      pouch: "#dfa44d",
      leg: "#b86b24",
      outline: "#251e16",
    });
    g.pop();
  }

  g.pop();
}
