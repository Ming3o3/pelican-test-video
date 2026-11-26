/**
 * Outro Press Conference Scene (`src/scenes/outro.js`), t in [125.0, 137.0].
 * 7x3 gallery wall (~90% width) showing all 20 frozen eras + Slot 21 empty press desk,
 * camera push-in onto Slot 21, beat flashes, centered subtitles, and final fly-by pelican.
 */

import {
  CANVAS_H,
  CANVAS_W,
  hermite,
  lerp,
  smoothstep,
} from "../beat.js";
import { drawRig2D, getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

export function renderOutro({ p, g, t, uOutro, thumbnails }) {
  // 7 columns x 3 rows grid occupying ~90% screen width (1722 px)
  const cols = 7;
  const rows = 3;
  const gap = 14;
  const cellW = 234;
  const cellH = 234;
  const wallW = cols * cellW + (cols - 1) * gap; // 1722 px (89.7% of 1920)
  const wallLeft = (CANVAS_W - wallW) / 2;
  const wallTop = 104;

  const slot21X = wallLeft + 6 * (cellW + gap) + cellW / 2;
  const slot21Y = wallTop + 2 * (cellH + gap) + cellH / 2;

  let zoom = 1.0;
  let focusX = CANVAS_W / 2;
  let focusY = CANVAS_H / 2;

  if (uOutro < 1.2) {
    const k = smoothstep(0, 1.2, uOutro);
    zoom = lerp(1.22, 1.0, k);
    focusX = lerp(slot21X - 240, CANVAS_W / 2, k);
    focusY = lerp(CANVAS_H / 2 - 40, CANVAS_H / 2, k);
  } else if (uOutro >= 4.0 && uOutro < 8.0) {
    const k = hermite(0, 0, 1, 0, (uOutro - 4.0) / 4.0);
    zoom = lerp(1.0, 3.15, k);
    focusX = lerp(CANVAS_W / 2, slot21X, k);
    focusY = lerp(CANVAS_H / 2, slot21Y + 14, k);
  } else if (uOutro >= 8.0) {
    zoom = 3.15;
    focusX = slot21X;
    focusY = slot21Y + 14;
  }

  // 1. WebGL background + 20 cached Framebuffer thumbnails
  p.background("#141312");
  p.push();
  p.resetMatrix();
  p.scale(zoom);
  p.translate(-(focusX - CANVAS_W / 2), -(focusY - CANVAS_H / 2));
  p.imageMode(p.CORNER);
  p.noStroke();

  for (let i = 0; i < 20; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = wallLeft + col * (cellW + gap);
    const y = wallTop + row * (cellH + gap);
    const wx = x - CANVAS_W / 2;
    const wy = y - CANVAS_H / 2;

    const thumb = thumbnails?.[i];
    if (thumb) {
      p.image(thumb, wx, wy, cellW, cellH);
    } else {
      p.fill(SCENES_META[i].bg);
      p.rect(wx, wy, cellW, cellH);
    }
  }
  p.pop();

  // 2. Transparent 2D overlay: borders, plaques, Slot 21 press seat, flashes, subtitles
  g.push();
  g.clear();

  g.push();
  g.translate(CANVAS_W / 2, CANVAS_H / 2);
  g.scale(zoom);
  g.translate(-focusX, -focusY);

  for (let i = 0; i < 21; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = wallLeft + col * (cellW + gap);
    const y = wallTop + row * (cellH + gap);

    if (i < 20) {
      const meta = SCENES_META[i];
      g.noFill();
      g.stroke("#2b251e");
      g.strokeWeight(5);
      g.rect(x - 2, y - 2, cellW + 4, cellH + 4, 3);
      g.stroke(meta.accent);
      g.strokeWeight(2);
      g.rect(x, y, cellW, cellH, 2);

      // Small plaque at bottom of each cell
      g.noStroke();
      g.fill("rgba(16, 15, 13, 0.82)");
      g.rect(x + 8, y + cellH - 26, cellW - 16, 20, 3);
      g.fill("#ede6d8");
      g.textAlign("center", "center");
      g.textFont("PingFang SC, Songti SC, sans-serif");
      g.textSize(11);
      g.text(`${String(i + 1).padStart(2, "0")} · ${meta.zh}`, x + cellW / 2, y + cellH - 16);
    } else {
      drawPressConferenceCell(g, x, y, cellW, cellH, uOutro, t);
    }
  }

  g.pop();

  // Beat-synced strobe flashes during push-in (strong beats at uOutro = 5.0, 6.0, 7.0)
  let flash = 0;
  for (const ft of [5.0, 6.0, 7.0]) {
    if (uOutro >= ft) {
      flash = Math.max(flash, Math.exp(-(uOutro - ft) * 11.0));
    }
  }
  if (flash > 0.02) {
    g.noStroke();
    g.fill(255, 252, 244, Math.round(135 * flash));
    g.rect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Centered bottom subtitles
  let subText = "";
  let subAlpha = 0;
  if (uOutro >= 0.4 && uOutro < 4.5) {
    subText = "截至目前，人类共提交了 20 份答卷。";
    subAlpha = smoothstep(0.4, 0.9, uOutro) * (1 - smoothstep(4.0, 4.5, uOutro));
  } else if (uOutro >= 8.0) {
    subText = "鹈鹕本人对此尚未发表评论。";
    subAlpha = smoothstep(8.0, 8.45, uOutro);
  }

  if (subText && subAlpha > 0.01) {
    g.push();
    g.drawingContext.globalAlpha = subAlpha;
    g.noStroke();
    g.fill("rgba(10, 10, 11, 0.78)");
    g.rectMode("center");
    g.rect(CANVAS_W / 2, 972, 840, 64, 8);
    g.fill("#f7f2e8");
    g.textAlign("center", "center");
    g.textFont("Songti SC, STSong, serif");
    g.textStyle("bold");
    g.textSize(34);
    g.text(subText, CANVAS_W / 2, 972);
    g.pop();
  }

  g.pop();

  p.push();
  p.resetMatrix();
  p.imageMode(p.CENTER);
  p.image(g, 0, 0, CANVAS_W, CANVAS_H);
  p.pop();
}

function drawPressConferenceCell(g, x, y, w, h, uOutro, t) {
  g.push();
  g.translate(x, y);

  g.drawingContext.save();
  g.drawingContext.beginPath();
  g.drawingContext.rect(0, 0, w, h);
  g.drawingContext.clip();

  g.noStroke();
  g.fill("#1d2633");
  g.rect(0, 0, w, h);

  // Subtle unbranded press backdrop pattern
  g.fill("#263242");
  for (let row = 18; row < h * 0.68; row += 28) {
    for (let col = 14; col < w; col += 46) {
      g.ellipse(col + (row % 56 === 18 ? 0 : 23), row, 18, 6);
    }
  }

  // Spotlight & strobe illumination
  let flashBoost = 0;
  for (const ft of [5.0, 6.0, 7.0]) {
    if (uOutro >= ft) flashBoost = Math.max(flashBoost, Math.exp(-(uOutro - ft) * 10.0));
  }
  g.fill(255, 248, 224, 24 + Math.round(70 * flashBoost));
  g.triangle(w * 0.5, -10, w * 0.14, h * 0.78, w * 0.86, h * 0.78);

  // Final beat fly-by: pelican rides swiftly behind the empty chair without looking back
  if (uOutro >= 10.3 && uOutro <= 11.45) {
    const flyFrac = (uOutro - 10.3) / 1.15;
    const flyX = lerp(-75, w + 90, flyFrac);
    const flyPose = getRigPose(t * 1.4, { x: flyX, y: h * 0.69, scale: 0.34 });

    // Subtle motion-wind streaks trailing the speeding Pelican inside Slot 21
    g.push();
    g.stroke("rgba(247, 238, 214, 0.34)");
    g.strokeWeight(1.4);
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const sy = flyPose.bodyCenter.y - 8 + sIdx * 11;
      const sx1 = flyPose.bodyCenter.x - 16 - sIdx * 6;
      const sx0 = sx1 - 30 - sIdx * 8;
      g.line(sx0, sy, sx1, sy);
    }
    g.pop();

    drawRig2D(g, flyPose, {
      frame: "#b4becb",
      tire: "#0e1218",
      feather: "#f8f4ea",
      featherShade: "#d9d2c4",
      beak: "#e89830",
      pouch: "#f3b34c",
      leg: "#d97b24",
      outline: "#10141b",
    });

    // Expanding golden acoustic rings centered on handlebar bell at uOutro >= 10.65 (135.65s)
    if (uOutro >= 10.65 && flyPose.bellPos) {
      const ringAge = uOutro - 10.65;
      const ringAlpha = Math.exp(-ringAge * 2.8);
      if (ringAlpha > 0.05) {
        g.push();
        g.noFill();
        for (let k = 0; k < 3; k++) {
          const r = 6 + k * 8 + ringAge * 34;
          const a = Math.round(215 * ringAlpha * (1 - k * 0.25));
          g.stroke(243, 207, 122, a);
          g.strokeWeight(1.5 - k * 0.3);
          g.circle(flyPose.bellPos.x, flyPose.bellPos.y, r * 2);
        }
        g.pop();
      }
    }
  }

  // Empty chair with tufted leather cushion & brass tacks
  const chairX = w * 0.5;
  const chairBackTop = h * 0.36;
  g.fill("#2b2320");
  g.stroke("#14100e");
  g.strokeWeight(1.5);
  g.rect(chairX - 24, chairBackTop, 48, 56, 6);
  g.fill("#3c302b");
  g.rect(chairX - 20, chairBackTop + 5, 40, 40, 4);
  g.stroke("#2c221e");
  g.strokeWeight(0.9);
  g.line(chairX - 14, chairBackTop + 14, chairX + 14, chairBackTop + 36);
  g.line(chairX + 14, chairBackTop + 14, chairX - 14, chairBackTop + 36);
  g.noStroke();
  g.fill("#c8a252");
  for (const [tx, ty] of [
    [chairX - 11, chairBackTop + 15],
    [chairX + 11, chairBackTop + 15],
    [chairX - 11, chairBackTop + 35],
    [chairX + 11, chairBackTop + 35],
  ]) {
    g.circle(tx, ty, 2.2);
  }

  // Wood-panelled press desk
  g.noStroke();
  g.fill("#5e3e28");
  g.rect(0, h * 0.65, w, h * 0.35);
  g.fill("#785236");
  g.rect(0, h * 0.65, w, 9);
  g.fill("#c8a252");
  g.rect(0, h * 0.65 + 8, w, 1.5);
  g.stroke("#472c1a");
  g.strokeWeight(1.2);
  g.fill("#543723");
  g.rect(12, h * 0.65 + 16, w * 0.5 - 20, h * 0.35 - 24, 2);
  g.rect(w * 0.5 + 8, h * 0.65 + 16, w * 0.5 - 20, h * 0.35 - 24, 2);

  // Unbranded microphones (5 stands)
  const micXs = [w * 0.22, w * 0.36, w * 0.5, w * 0.64, w * 0.78];
  for (let i = 0; i < micXs.length; i++) {
    const mx = micXs[i];
    const lean = i < 2 ? 4 : i > 2 ? -4 : 0;
    const tipY = i === 2 ? h * 0.555 : h * 0.54;
    g.stroke("#15171a");
    g.strokeWeight(2.2);
    g.line(mx, h * 0.66, mx + lean, tipY);
    g.noStroke();
    g.fill("#1d2024");
    g.rect(mx - 6, h * 0.65, 12, 4, 1);
    g.fill(i % 2 === 0 ? "#242830" : "#8b332b");
    g.ellipse(mx + lean, tipY - 3, 8, 12);
  }

  // Seat card: "鹈鹕（本人）"
  g.fill("#f5efe2");
  g.stroke("#2c251d");
  g.strokeWeight(1.2);
  g.rect(w * 0.5 - 46, h * 0.695, 92, 24, 2);
  g.noStroke();
  g.fill("#1d1812");
  g.textAlign("center", "center");
  g.textFont("Songti SC, STSong, serif");
  g.textStyle("bold");
  g.textSize(12);
  g.text("鹈鹕（本人）", w * 0.5, h * 0.695 + 12);

  g.drawingContext.restore();

  g.noFill();
  g.stroke("#d4ad58");
  g.strokeWeight(2.5);
  g.rect(0, 0, w, h, 2);

  g.pop();
}
