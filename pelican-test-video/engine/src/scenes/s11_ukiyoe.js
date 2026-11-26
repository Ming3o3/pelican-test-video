/**
 * Scene #11 — 浮世绘 · Tōkaidō Ukiyo-e (1830s), t in [65.0, 71.0).
 * Utagawa Hiroshige "Fifty-Three Stations of the Tōkaidō" polychrome woodblock print (木版多色套印):
 * - Cream hōsho paper with subtle horizontal woodblock board grain (木目摺)
 * - Ichimonji bokashi Prussian blue upper sky & vermilion-rose horizon sunset glow
 * - Snow-capped Mount Fuji & white-sailed boats on Suruga Bay in the right-rear distance
 * - Pre-baked gnarled black pine variants swaying in the wind, thatched teahouse ("名代团子"),
 *   and wooden post marker ("鹈鹕宿")
 * - Stepped ochre & spring-green Tōkaidō road aligned strictly at ROAD_Y = 730
 * - Top-right vertical vermilion cartouche ("东海道 · 鹈鹕道中") & circular publisher's seal
 * - Bar 2 (u in [2.0, 4.0)) gale gag: Hiroshige diagonal indigo-and-white woodblock wind lines
 *   and swirling pine needles sweep past as the Pelican rockets by, knocking the front traveler's
 *   round bamboo hat (sugegasa) soaring into mid-air while both travelers whip their heads back in shock!
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

const META = SCENES_META[10];

// Edo Nishiki-e woodblock pigment palette
const SUMI = "#171a20";
const PAPER_CREAM = "#f1e3c6";
const VERMILION = "#ce442d";
const VERMILION_DARK = "#9e2b1a";
const PINE_DARK = "#2d492b";
const PINE_MID = "#4a6c40";
const PINE_LIGHT = "#769458";
const ROAD_OCHRE = "#cfa972";

const EXT_LEFT = BLEED_LEFT - 24;
const EXT_RIGHT = BLEED_RIGHT + 24;
const EXT_W = EXT_RIGHT - EXT_LEFT;

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Draws a hand-carved tapered woodblock stroke onto Canvas2D.
 */
function drawWoodblockTaper(dc, x0, y0, x1, y1, width, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (width * 0.5);
  const ny = (dx / len) * (width * 0.5);
  const mx = (x0 + x1) * 0.5;
  const my = (y0 + y1) * 0.5;

  dc.save();
  dc.fillStyle = color;
  dc.beginPath();
  dc.moveTo(x0, y0);
  dc.quadraticCurveTo(mx + nx, my + ny, x1, y1);
  dc.quadraticCurveTo(mx - nx, my - ny, x0, y0);
  dc.closePath();
  dc.fill();
  dc.restore();
}

/**
 * Draws a soft layered Hiroshige bokashi mist band (霞云 / Suyari-gasumi).
 */
function drawSuyariMist(dc, x0, y0, w, h) {
  dc.save();
  const grad = dc.createLinearGradient(x0, y0, x0 + w, y0);
  grad.addColorStop(0, "rgba(246, 236, 214, 0)");
  grad.addColorStop(0.18, "rgba(246, 236, 214, 0.68)");
  grad.addColorStop(0.5, "rgba(248, 240, 222, 0.82)");
  grad.addColorStop(0.82, "rgba(246, 236, 214, 0.68)");
  grad.addColorStop(1, "rgba(246, 236, 214, 0)");

  const r = h * 0.5;
  dc.fillStyle = grad;
  dc.beginPath();
  dc.moveTo(x0 + r, y0);
  dc.lineTo(x0 + w - r, y0);
  dc.arc(x0 + w - r, y0 + r, r, -Math.PI * 0.5, Math.PI * 0.5);
  dc.lineTo(x0 + r, y0 + h);
  dc.arc(x0 + r, y0 + r, r, Math.PI * 0.5, Math.PI * 1.5);
  dc.closePath();
  dc.fill();

  dc.beginPath();
  const x1 = x0 + w * 0.18;
  const w1 = w * 0.68;
  const y1 = y0 + h * 0.52;
  const r1 = h * 0.36;
  dc.moveTo(x1 + r1, y1);
  dc.lineTo(x1 + w1 - r1, y1);
  dc.arc(x1 + w1 - r1, y1 + r1, r1, -Math.PI * 0.5, Math.PI * 0.5);
  dc.lineTo(x1 + r1, y1 + r1 * 2);
  dc.arc(x1 + r1, y1 + r1, r1, Math.PI * 0.5, Math.PI * 1.5);
  dc.closePath();
  dc.fill();
  dc.restore();
}

/**
 * Draws Mount Fuji with indigo-blue bokashi base, ivory snowcap, jagged snow gullies, and sumi contour.
 */
function drawMountFuji(pg) {
  const dc = pg.drawingContext;
  const cx = 815;
  const peakY = 334;
  const baseY = 498;

  dc.save();
  const halo = dc.createRadialGradient(cx, 415, 25, cx, 425, 215);
  halo.addColorStop(0, "rgba(247, 236, 212, 0.78)");
  halo.addColorStop(0.65, "rgba(247, 236, 212, 0.3)");
  halo.addColorStop(1, "rgba(247, 236, 212, 0)");
  dc.fillStyle = halo;
  dc.beginPath();
  dc.ellipse(cx, 420, 220, 124, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  const traceFuji = () => {
    dc.beginPath();
    dc.moveTo(cx - 190, baseY);
    dc.bezierCurveTo(cx - 104, baseY - 22, cx - 44, peakY + 48, cx - 18, peakY + 1);
    dc.lineTo(cx - 6, peakY + 3);
    dc.lineTo(cx + 8, peakY);
    dc.lineTo(cx + 20, peakY + 2);
    dc.bezierCurveTo(cx + 46, peakY + 50, cx + 108, baseY - 20, cx + 195, baseY);
    dc.closePath();
  };

  dc.save();
  traceFuji();
  const fujiGrad = dc.createLinearGradient(cx, peakY, cx, baseY);
  fujiGrad.addColorStop(0, "#1a3f66");
  fujiGrad.addColorStop(0.32, "#2c6494");
  fujiGrad.addColorStop(0.75, "#4c80a6");
  fujiGrad.addColorStop(1, "#74a0bd");
  dc.fillStyle = fujiGrad;
  dc.fill();

  dc.clip();

  dc.beginPath();
  dc.moveTo(cx - 125, peakY - 10);
  dc.lineTo(cx + 125, peakY - 10);
  dc.lineTo(cx + 105, peakY + 74);
  dc.lineTo(cx + 68, peakY + 58);
  dc.lineTo(cx + 56, peakY + 88);
  dc.lineTo(cx + 28, peakY + 62);
  dc.lineTo(cx + 14, peakY + 97);
  dc.lineTo(cx - 4, peakY + 66);
  dc.lineTo(cx - 22, peakY + 100);
  dc.lineTo(cx - 38, peakY + 64);
  dc.lineTo(cx - 64, peakY + 86);
  dc.lineTo(cx - 76, peakY + 55);
  dc.lineTo(cx - 110, peakY + 70);
  dc.closePath();
  dc.fillStyle = "#faf3e4";
  dc.fill();

  dc.beginPath();
  dc.moveTo(cx - 6, peakY + 3);
  dc.lineTo(cx - 32, peakY + 64);
  dc.lineTo(cx - 22, peakY + 100);
  dc.lineTo(cx - 4, peakY + 66);
  dc.lineTo(cx + 14, peakY + 97);
  dc.lineTo(cx + 22, peakY + 58);
  dc.lineTo(cx + 8, peakY + 36);
  dc.closePath();
  dc.fillStyle = "rgba(112, 145, 174, 0.45)";
  dc.fill();

  dc.strokeStyle = "rgba(25, 48, 76, 0.55)";
  dc.lineWidth = 1.4;
  for (const gx of [-32, -8, 18, 42]) {
    dc.beginPath();
    dc.moveTo(cx + gx * 0.35, peakY + 12);
    dc.lineTo(cx + gx * 1.4, peakY + 78);
    dc.stroke();
  }
  dc.restore();

  dc.save();
  dc.strokeStyle = "#1a2f4a";
  dc.lineWidth = 2.2;
  dc.lineJoin = "round";
  dc.beginPath();
  dc.moveTo(cx - 186, baseY - 2);
  dc.bezierCurveTo(cx - 104, baseY - 22, cx - 44, peakY + 48, cx - 18, peakY + 1);
  dc.lineTo(cx - 6, peakY + 3);
  dc.lineTo(cx + 8, peakY);
  dc.lineTo(cx + 20, peakY + 2);
  dc.bezierCurveTo(cx + 46, peakY + 50, cx + 108, baseY - 20, cx + 190, baseY - 2);
  dc.stroke();
  dc.restore();
}

/**
 * Draws tiny Edo square-rigged sailboats (帆かけ船) on Suruga Bay.
 */
function drawBaySailboat(dc, x, y, s) {
  dc.save();
  dc.translate(x, y);
  dc.scale(s, s);

  dc.fillStyle = "rgba(248, 240, 222, 0.38)";
  dc.fillRect(-10, 4, 20, 2.5);
  dc.fillRect(-6, 8, 12, 1.5);

  dc.fillStyle = "#5c3d24";
  dc.strokeStyle = SUMI;
  dc.lineWidth = 1.1;
  dc.beginPath();
  dc.moveTo(-16, -2);
  dc.lineTo(15, -2);
  dc.lineTo(11, 3);
  dc.lineTo(-12, 3);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.fillStyle = "#f9f2e2";
  dc.beginPath();
  dc.moveTo(-8, -29);
  dc.lineTo(9, -28);
  dc.quadraticCurveTo(11, -14, 8, -3);
  dc.lineTo(-9, -3);
  dc.quadraticCurveTo(-7, -14, -8, -29);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.strokeStyle = "rgba(92, 68, 42, 0.45)";
  dc.lineWidth = 0.8;
  dc.beginPath();
  dc.moveTo(-2, -28);
  dc.lineTo(-2, -3);
  dc.moveTo(3, -28);
  dc.lineTo(3, -3);
  dc.stroke();

  dc.restore();
}

/**
 * Draws the thatched-roof Edo teahouse ("名代团子") at x = 56, ground y = 706.
 */
function drawTeahouse(pg) {
  const dc = pg.drawingContext;
  const cx = 56;
  const gy = 706;

  pg.fill("#8e8575");
  pg.stroke(SUMI);
  pg.strokeWeight(1.8);
  pg.rect(cx - 96, gy - 12, 192, 12, 1);

  pg.fill("#dfd0b2");
  pg.rect(cx - 88, gy - 98, 176, 86);
  pg.fill("#3a2b1f");
  pg.noStroke();
  pg.rect(cx - 56, gy - 92, 114, 80);

  pg.fill("#f4e8cd");
  pg.stroke(SUMI);
  pg.strokeWeight(1.5);
  pg.rect(cx - 84, gy - 92, 28, 76);
  for (let sy = gy - 76; sy <= gy - 32; sy += 16) {
    pg.line(cx - 84, sy, cx - 56, sy);
  }
  pg.line(cx - 70, gy - 92, cx - 70, gy - 16);

  pg.fill("#d4662a");
  pg.noStroke();
  pg.ellipse(cx - 12, gy - 26, 22, 10);
  pg.fill("#1d1916");
  pg.ellipse(cx - 12, gy - 34, 18, 14);

  for (const offset of [-48, -22, 4, 30]) {
    const nx = cx + offset;
    pg.fill("#1f4c7d");
    pg.stroke(SUMI);
    pg.strokeWeight(1.6);
    pg.rect(nx, gy - 96, 24, 38);
    pg.fill("#f7efe0");
    pg.noStroke();
    pg.circle(nx + 12, gy - 77, 11);
    pg.fill("#1f4c7d");
    pg.circle(nx + 12, gy - 77, 5);
  }

  pg.fill("#6a4629");
  pg.stroke(SUMI);
  pg.strokeWeight(2);
  pg.rect(cx - 90, gy - 104, 10, 96);
  pg.rect(cx + 76, gy - 104, 10, 96);
  pg.rect(cx - 56, gy - 104, 8, 96);
  pg.rect(cx + 50, gy - 104, 8, 96);
  pg.fill("#56371e");
  pg.rect(cx - 94, gy - 104, 188, 10);

  pg.fill("#4d321c");
  pg.stroke(SUMI);
  pg.strokeWeight(1.5);
  pg.rect(cx - 32, gy - 24, 6, 24);
  pg.rect(cx + 28, gy - 24, 6, 24);
  pg.fill("#c53d29");
  pg.rect(cx - 42, gy - 34, 86, 13, 2);
  pg.beginShape();
  pg.vertex(cx - 42, gy - 21);
  pg.vertex(cx - 26, gy - 21);
  pg.vertex(cx - 26, gy - 11);
  pg.vertex(cx - 42, gy - 14);
  pg.endShape("close");

  pg.fill("#634125");
  pg.rect(cx - 18, gy - 41, 34, 7);
  pg.fill("#e89396");
  pg.circle(cx - 10, gy - 45, 5.5);
  pg.fill("#f7f0e0");
  pg.circle(cx - 4, gy - 45, 5.5);
  pg.fill("#6e9654");
  pg.circle(cx + 2, gy - 45, 5.5);
  pg.fill("#28292e");
  pg.ellipse(cx + 12, gy - 46, 11, 9);

  pg.fill("#f7ebd0");
  pg.stroke(SUMI);
  pg.strokeWeight(1.4);
  pg.ellipse(cx - 72, gy - 78, 14, 18);
  pg.fill(VERMILION);
  pg.noStroke();
  pg.rect(cx - 76, gy - 87, 8, 3);
  pg.rect(cx - 76, gy - 71, 8, 3);

  pg.fill("#e7cb96");
  pg.stroke(SUMI);
  pg.strokeWeight(1.8);
  pg.rect(cx + 68, gy - 94, 24, 70, 2);
  pg.fill(SUMI);
  pg.noStroke();
  pg.textAlign("center", "center");
  pg.textFont("Songti SC, STSong, serif");
  pg.textStyle("bold");
  pg.textSize(14);
  const signChars = ["名", "代", "团", "子"];
  for (let i = 0; i < signChars.length; i++) {
    pg.text(signChars[i], cx + 80, gy - 82 + i * 15);
  }

  dc.save();
  dc.beginPath();
  dc.moveTo(cx - 116, gy - 98);
  dc.quadraticCurveTo(cx - 72, gy - 150, cx - 52, gy - 186);
  dc.lineTo(cx + 52, gy - 186);
  dc.quadraticCurveTo(cx + 72, gy - 150, cx + 116, gy - 98);
  dc.quadraticCurveTo(cx, gy - 103, cx - 116, gy - 98);
  dc.closePath();

  const roofGrad = dc.createLinearGradient(cx, gy - 186, cx, gy - 98);
  roofGrad.addColorStop(0, "#9e865e");
  roofGrad.addColorStop(0.55, "#7e6844");
  roofGrad.addColorStop(1, "#5c4a30");
  dc.fillStyle = roofGrad;
  dc.fill();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.6;
  dc.lineJoin = "round";
  dc.stroke();

  dc.fillStyle = "#4d3c25";
  dc.beginPath();
  dc.moveTo(cx - 115, gy - 98);
  dc.quadraticCurveTo(cx, gy - 103, cx + 115, gy - 98);
  dc.lineTo(cx + 110, gy - 91);
  dc.quadraticCurveTo(cx, gy - 95, cx - 110, gy - 91);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.strokeStyle = "rgba(28, 22, 16, 0.45)";
  dc.lineWidth = 1.2;
  for (let i = -8; i <= 8; i++) {
    const tx = cx + i * 5.6;
    const bx = cx + i * 12;
    dc.beginPath();
    dc.moveTo(tx, gy - 182);
    dc.quadraticCurveTo((tx + bx) * 0.5, gy - 140, bx, gy - 99);
    dc.stroke();
  }

  dc.fillStyle = "#5c492d";
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2;
  dc.fillRect(cx - 58, gy - 193, 116, 8);
  dc.strokeRect(cx - 58, gy - 193, 116, 8);
  for (let kx = cx - 42; kx <= cx + 42; kx += 21) {
    dc.beginPath();
    dc.moveTo(kx - 4, gy - 197);
    dc.lineTo(kx + 4, gy - 182);
    dc.moveTo(kx + 4, gy - 197);
    dc.lineTo(kx - 4, gy - 182);
    dc.stroke();
  }
  dc.restore();
}

/**
 * Draws the Edo wooden post-station marker pillar ("鹈鹕宿") at x = 805, ground y = 708.
 */
function drawPostMarker(pg) {
  const px = 805;
  const gy = 708;

  pg.fill("#7d786c");
  pg.stroke(SUMI);
  pg.strokeWeight(1.8);
  pg.beginShape();
  pg.vertex(px - 24, gy);
  pg.vertex(px - 16, gy - 13);
  pg.vertex(px + 18, gy - 12);
  pg.vertex(px + 25, gy);
  pg.endShape("close");

  pg.fill("#ddc08d");
  pg.rect(px - 13, gy - 124, 26, 114, 1);
  pg.fill("#b48d57");
  pg.rect(px + 5, gy - 124, 8, 114);

  pg.stroke("rgba(48, 34, 20, 0.3)");
  pg.strokeWeight(1);
  pg.line(px - 8, gy - 110, px - 8, gy - 20);
  pg.line(px - 1, gy - 95, px - 1, gy - 16);

  pg.fill("#66482b");
  pg.stroke(SUMI);
  pg.strokeWeight(2);
  pg.beginShape();
  pg.vertex(px - 18, gy - 122);
  pg.vertex(px, gy - 136);
  pg.vertex(px + 18, gy - 122);
  pg.endShape("close");

  pg.fill(SUMI);
  pg.noStroke();
  pg.textAlign("center", "center");
  pg.textFont("Songti SC, STSong, serif");
  pg.textStyle("bold");
  pg.textSize(20);
  const chars = ["鹈", "鹕", "宿"];
  for (let i = 0; i < chars.length; i++) {
    pg.text(chars[i], px - 2, gy - 103 + i * 26);
  }
}

/**
 * Draws a weathered Edo stone wayside lantern.
 */
function drawStoneLantern(pg, x, gy, scale = 1) {
  pg.push();
  pg.translate(x, gy);
  pg.scale(scale);
  pg.stroke(SUMI);
  pg.strokeWeight(1.8);
  pg.fill("#8c887c");
  pg.rect(-16, -12, 32, 12, 2);
  pg.fill("#9c988c");
  pg.rect(-7, -56, 14, 44);
  pg.fill("#878377");
  pg.rect(-12, -78, 24, 22);
  pg.fill("#e9b85b");
  pg.rect(-5, -73, 10, 12);
  pg.fill("#737065");
  pg.beginShape();
  pg.vertex(-22, -77);
  pg.vertex(0, -94);
  pg.vertex(22, -77);
  pg.endShape("close");
  pg.fill("#8c887c");
  pg.circle(0, -97, 8);
  pg.pop();
}

/**
 * Draws the traditional top-right vertical vermilion cartouche ("东海道 · 鹈鹕道中") & circular publisher's seal.
 */
function drawTopRightCartouche(pg) {
  const dc = pg.drawingContext;
  const cx = 942;
  const topY = 34;
  const w = 48;
  const h = 218;
  const x0 = cx - w * 0.5;

  pg.noStroke();
  pg.fill(23, 26, 32, 42);
  pg.rect(x0 + 3, topY + 3, w, h, 2);

  pg.fill(VERMILION);
  pg.stroke(SUMI);
  pg.strokeWeight(2);
  pg.rect(x0, topY, w, h, 2);

  pg.fill(VERMILION_DARK);
  pg.noStroke();
  pg.rect(x0 + 3, topY + 3, w - 6, 60);

  pg.fill("#f7efe0");
  pg.textAlign("center", "center");
  pg.textFont("Songti SC, STSong, serif");
  pg.textStyle("bold");
  pg.textSize(14);
  pg.text("东", cx, topY + 14);
  pg.text("海", cx, topY + 33);
  pg.text("道", cx, topY + 52);

  pg.fill("#f7edd7");
  pg.stroke("#e0b158");
  pg.strokeWeight(1.5);
  pg.rect(x0 + 5, topY + 67, w - 10, h - 73);

  pg.fill(SUMI);
  pg.noStroke();
  pg.textSize(25);
  const titleChars = ["鹈", "鹕", "道", "中"];
  for (let i = 0; i < titleChars.length; i++) {
    pg.text(titleChars[i], cx, topY + 89 + i * 33);
  }

  // Circular publisher's seal (圆形版元小印)
  const sealY = topY + h + 28;
  dc.save();
  dc.fillStyle = VERMILION;
  dc.beginPath();
  dc.arc(cx, sealY, 18, 0, Math.PI * 2);
  dc.fill();
  dc.strokeStyle = "#f7efe0";
  dc.lineWidth = 1.6;
  dc.beginPath();
  dc.arc(cx, sealY, 14, 0, Math.PI * 2);
  dc.stroke();
  dc.restore();

  pg.fill("#f7efe0");
  pg.textAlign("center", "center");
  pg.textFont("Songti SC, STSong, serif");
  pg.textStyle("bold");
  pg.textSize(15);
  pg.text("鹈", cx, sealY + 1);
}

/**
 * Bakes the static 1840x1000 Hiroshige woodblock print backdrop once per scene key.
 */
function bakeUkiyoeBackdrop(pg) {
  const dc = pg.drawingContext;
  const rand = prng(18330);

  pg.push();
  pg.translate(-BLEED_LEFT, 0);

  pg.background(PAPER_CREAM);

  dc.save();
  for (let i = 0; i < 155; i++) {
    const baseY = (i / 155) * 1000 + (rand() - 0.5) * 6;
    const amp = 2 + rand() * 5;
    const freq = 0.002 + rand() * 0.0035;
    const phase = rand() * Math.PI * 2;
    dc.strokeStyle = `rgba(170, 140, 98, ${(0.045 + rand() * 0.065).toFixed(3)})`;
    dc.lineWidth = 0.9 + rand() * 1.6;
    dc.beginPath();
    for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 40) {
      const y = baseY + Math.sin(x * freq + phase) * amp;
      if (x === EXT_LEFT) dc.moveTo(x, y);
      else dc.lineTo(x, y);
    }
    dc.stroke();
  }
  for (let i = 0; i < 750; i++) {
    const fx = EXT_LEFT + rand() * EXT_W;
    const fy = rand() * 1000;
    const fl = 4 + rand() * 14;
    const fa = (rand() - 0.5) * 0.6;
    dc.strokeStyle = `rgba(146, 118, 84, ${(0.08 + rand() * 0.09).toFixed(3)})`;
    dc.lineWidth = 0.8;
    dc.beginPath();
    dc.moveTo(fx, fy);
    dc.lineTo(fx + Math.cos(fa) * fl, fy + Math.sin(fa) * fl);
    dc.stroke();
  }
  dc.restore();

  // Ichimonji Bokashi Prussian blue sky
  dc.save();
  const topSky = dc.createLinearGradient(0, 0, 0, 208);
  topSky.addColorStop(0, "rgba(21, 56, 96, 0.94)");
  topSky.addColorStop(0.32, "rgba(38, 91, 142, 0.85)");
  topSky.addColorStop(0.68, "rgba(88, 145, 188, 0.45)");
  topSky.addColorStop(0.92, "rgba(155, 194, 214, 0.14)");
  topSky.addColorStop(1, "rgba(241, 227, 198, 0)");
  dc.fillStyle = topSky;
  dc.fillRect(EXT_LEFT, 0, EXT_W, 212);

  for (let i = 0; i < 120; i++) {
    const bx = EXT_LEFT + rand() * EXT_W;
    const by = 120 + rand() * 82;
    const bw = 28 + rand() * 90;
    dc.fillStyle = "rgba(42, 92, 140, 0.05)";
    dc.fillRect(bx, by, bw, 2 + rand() * 3);
  }
  dc.restore();

  // Vermilion-coral sunset horizon bokashi
  dc.save();
  const sunset = dc.createLinearGradient(0, 345, 0, 515);
  sunset.addColorStop(0, "rgba(241, 227, 198, 0)");
  sunset.addColorStop(0.38, "rgba(242, 182, 138, 0.34)");
  sunset.addColorStop(0.75, "rgba(226, 118, 84, 0.56)");
  sunset.addColorStop(1, "rgba(206, 72, 48, 0.64)");
  dc.fillStyle = sunset;
  dc.fillRect(EXT_LEFT, 345, EXT_W, 170);
  dc.restore();

  // Distant Suruga Bay
  dc.save();
  const seaGrad = dc.createLinearGradient(0, 492, 0, 610);
  seaGrad.addColorStop(0, "#295982");
  seaGrad.addColorStop(0.35, "#4c83a8");
  seaGrad.addColorStop(0.78, "#82b0c8");
  seaGrad.addColorStop(1, "#acc7cf");
  dc.fillStyle = seaGrad;
  dc.fillRect(280, 494, EXT_RIGHT - 280, 116);

  dc.strokeStyle = "rgba(248, 240, 222, 0.58)";
  dc.lineWidth = 1.4;
  for (let i = 0; i < 40; i++) {
    const wx = 430 + rand() * 980;
    const wy = 502 + rand() * 68;
    const wl = 18 + rand() * 48;
    dc.beginPath();
    dc.moveTo(wx, wy);
    dc.lineTo(wx + wl, wy);
    dc.stroke();
  }
  dc.restore();

  drawMountFuji(pg);

  drawBaySailboat(dc, 535, 515, 0.85);
  drawBaySailboat(dc, 608, 526, 1.0);
  drawBaySailboat(dc, 676, 511, 0.72);
  drawBaySailboat(dc, 956, 518, 0.92);
  drawBaySailboat(dc, 1095, 528, 1.05);

  // Distant layered foothills
  dc.save();
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 615);
  dc.lineTo(EXT_LEFT, 470);
  dc.quadraticCurveTo(-220, 438, -20, 466);
  dc.quadraticCurveTo(160, 488, 320, 458);
  dc.quadraticCurveTo(445, 442, 565, 495);
  dc.lineTo(545, 515);
  dc.lineTo(510, 615);
  dc.closePath();
  const distantHillGrad = dc.createLinearGradient(0, 445, 0, 585);
  distantHillGrad.addColorStop(0, "#517078");
  distantHillGrad.addColorStop(0.55, "#6b8885");
  distantHillGrad.addColorStop(1, "#7b9478");
  dc.fillStyle = distantHillGrad;
  dc.fill();
  dc.strokeStyle = "#2b424d";
  dc.lineWidth = 1.6;
  dc.stroke();

  dc.fillStyle = "#5a4937";
  for (const vx of [432, 456, 480, 502]) {
    dc.beginPath();
    dc.moveTo(vx - 11, 497);
    dc.lineTo(vx, 486);
    dc.lineTo(vx + 11, 497);
    dc.closePath();
    dc.fill();
  }

  drawSuyariMist(dc, -360, 484, 420, 18);
  drawSuyariMist(dc, 165, 474, 300, 16);
  drawSuyariMist(dc, 600, 486, 440, 14);
  dc.restore();

  // Midground stepped green & ochre Tōkaidō roadside embankment
  dc.save();
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 708);
  dc.lineTo(EXT_LEFT, 586);
  dc.bezierCurveTo(-180, 558, -40, 582, 130, 552);
  dc.bezierCurveTo(285, 526, 410, 568, 575, 560);
  dc.bezierCurveTo(750, 552, 920, 585, 1120, 556);
  dc.bezierCurveTo(1260, 538, 1350, 562, EXT_RIGHT, 568);
  dc.lineTo(EXT_RIGHT, 708);
  dc.closePath();
  const hillGrad = dc.createLinearGradient(0, 535, 0, 708);
  hillGrad.addColorStop(0, "#aab878");
  hillGrad.addColorStop(0.45, "#749257");
  hillGrad.addColorStop(1, "#4c6b3d");
  dc.fillStyle = hillGrad;
  dc.fill();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2;
  dc.stroke();

  dc.beginPath();
  dc.moveTo(EXT_LEFT, 708);
  dc.lineTo(EXT_LEFT, 650);
  dc.bezierCurveTo(-160, 628, 220, 646, 510, 632);
  dc.bezierCurveTo(760, 620, 1120, 646, EXT_RIGHT, 636);
  dc.lineTo(EXT_RIGHT, 708);
  dc.closePath();
  const terraceGrad = dc.createLinearGradient(0, 622, 0, 708);
  terraceGrad.addColorStop(0, "rgba(74, 106, 56, 0.72)");
  terraceGrad.addColorStop(1, "rgba(56, 84, 44, 0.35)");
  dc.fillStyle = terraceGrad;
  dc.fill();
  dc.strokeStyle = "rgba(23, 26, 32, 0.45)";
  dc.lineWidth = 1.4;
  dc.stroke();

  for (const [bx, by, bs] of [
    [-310, 638, 1.0], [-55, 632, 0.9], [220, 642, 0.85], [470, 634, 1.1],
    [680, 636, 0.95], [910, 638, 1.0], [1190, 642, 0.95],
  ]) {
    dc.fillStyle = "#3f5d34";
    dc.strokeStyle = SUMI;
    dc.lineWidth = 1.4;
    dc.beginPath();
    dc.arc(bx - 10 * bs, by, 10 * bs, Math.PI, Math.PI * 2);
    dc.arc(bx, by - 4 * bs, 13 * bs, Math.PI, Math.PI * 2);
    dc.arc(bx + 11 * bs, by + 1 * bs, 9 * bs, Math.PI, Math.PI * 2);
    dc.closePath();
    dc.fill();
    dc.stroke();
  }
  dc.restore();

  drawStoneLantern(pg, -172, 706, 0.92);
  drawTeahouse(pg);
  drawPostMarker(pg);
  drawStoneLantern(pg, 1142, 706, 0.95);

  // Foreground Stepped Earthen Tōkaidō Post Road (aligned at ROAD_Y = 730)
  dc.save();
  const roadGrad = dc.createLinearGradient(0, 704, 0, 842);
  roadGrad.addColorStop(0, "#ba945e");
  roadGrad.addColorStop(0.18, ROAD_OCHRE);
  roadGrad.addColorStop(0.55, "#dab882");
  roadGrad.addColorStop(1, "#ba9159");
  dc.fillStyle = roadGrad;
  dc.fillRect(EXT_LEFT, 704, EXT_W, 140);

  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.4;
  dc.beginPath();
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 40) {
    const vy = 704 + Math.sin(x * 0.017) * 2.2;
    if (x === EXT_LEFT) dc.moveTo(x, vy);
    else dc.lineTo(x, vy);
  }
  dc.stroke();

  dc.fillStyle = "rgba(162, 116, 62, 0.25)";
  dc.fillRect(EXT_LEFT, ROAD_Y - 3, EXT_W, 28);

  dc.strokeStyle = "rgba(92, 63, 33, 0.24)";
  dc.lineWidth = 1.3;
  for (let i = 0; i < 160; i++) {
    const rx = EXT_LEFT + rand() * EXT_W;
    const ry = 710 + rand() * 120;
    const rl = 18 + rand() * 58;
    dc.beginPath();
    dc.moveTo(rx, ry);
    dc.lineTo(rx + rl, ry + (rand() - 0.5) * 2.5);
    dc.stroke();
  }
  for (let i = 0; i < 85; i++) {
    const px = EXT_LEFT + rand() * EXT_W;
    const py = 712 + rand() * 118;
    dc.fillStyle = rand() > 0.5 ? "rgba(72, 52, 32, 0.34)" : "rgba(244, 229, 198, 0.38)";
    dc.beginPath();
    dc.ellipse(px, py, 2.5 + rand() * 4, 1.5 + rand() * 2, 0, 0, Math.PI * 2);
    dc.fill();
  }

  const fgGrass = dc.createLinearGradient(0, 838, 0, 1000);
  fgGrass.addColorStop(0, "#839f5e");
  fgGrass.addColorStop(0.35, "#5c7a43");
  fgGrass.addColorStop(1, "#324926");
  dc.fillStyle = fgGrass;
  dc.beginPath();
  dc.moveTo(EXT_LEFT, 838);
  for (let x = EXT_LEFT; x <= EXT_RIGHT; x += 40) {
    dc.lineTo(x, 838 + Math.sin(x * 0.014) * 5);
  }
  dc.lineTo(EXT_RIGHT, 838 + Math.sin(EXT_RIGHT * 0.014) * 5);
  dc.lineTo(EXT_RIGHT, 1005);
  dc.lineTo(EXT_LEFT, 1005);
  dc.closePath();
  dc.fill();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.6;
  dc.stroke();

  dc.strokeStyle = "#1b2817";
  dc.lineWidth = 1.7;
  for (let i = 0; i < 28; i++) {
    const gx = EXT_LEFT + 28 + i * 66 + (rand() - 0.5) * 26;
    const gy = 843 + Math.sin(gx * 0.014) * 5;
    const blades = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < blades; k++) {
      const ox = (k - blades * 0.5) * 4.5;
      const lean = 4 + rand() * 8;
      const bh = 10 + rand() * 11;
      dc.beginPath();
      dc.moveTo(gx + ox, gy + 7);
      dc.quadraticCurveTo(gx + ox + lean * 0.4, gy - bh * 0.4, gx + ox + lean, gy - bh);
      dc.stroke();
    }
  }
  dc.restore();

  drawTopRightCartouche(pg);
  pg.pop();
}

/**
 * Helper to draw a scalloped Hiroshige pine pad onto a pre-baked sprite canvas.
 */
function drawPinePad(dc, cx, cy, rx, ry, rotRad) {
  dc.save();
  dc.translate(cx, cy);
  dc.rotate(rotRad);

  const lobes = 7;
  const drawPad = (scaleX, scaleY, col, strokeCol) => {
    dc.beginPath();
    for (let i = 0; i <= lobes * 6; i++) {
      const a = (i / (lobes * 6)) * Math.PI * 2;
      const scallop = 0.86 + 0.14 * Math.abs(Math.sin(a * lobes * 0.5));
      const px = Math.cos(a) * rx * scaleX * scallop;
      const py = Math.sin(a) * ry * scaleY * scallop;
      if (i === 0) dc.moveTo(px, py);
      else dc.lineTo(px, py);
    }
    dc.closePath();
    dc.fillStyle = col;
    dc.fill();
    if (strokeCol) {
      dc.strokeStyle = strokeCol;
      dc.lineWidth = 2.2;
      dc.stroke();
    }
  };

  drawPad(1.0, 1.0, PINE_DARK, SUMI);
  dc.translate(0, -ry * 0.16);
  drawPad(0.84, 0.78, PINE_MID, null);
  dc.translate(-rx * 0.08, -ry * 0.12);
  drawPad(0.56, 0.46, PINE_LIGHT, null);

  dc.strokeStyle = "rgba(23, 26, 32, 0.55)";
  dc.lineWidth = 1.2;
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI * 0.5 + i * 0.34;
    dc.beginPath();
    dc.moveTo(0, ry * 0.25);
    dc.lineTo(Math.cos(a) * rx * 0.78, Math.sin(a) * ry * 0.75);
    dc.stroke();
  }
  dc.restore();
}

/**
 * Pre-bakes a rich woodblock pine tree sprite (`root` at local x = 160, y = 478 inside 340x490)
 * so per-frame wind bending costs < 0.3 ms total across all 5 pines!
 */
function bakePineSprite(pg, seed = 101) {
  const dc = pg.drawingContext;
  const rand = prng(seed);
  pg.clear();
  dc.save();
  dc.translate(160, 478);

  const traceTrunk = () => {
    dc.beginPath();
    dc.moveTo(-22, 4);
    dc.bezierCurveTo(-18, -85, -52, -165, -24, -270);
    dc.bezierCurveTo(-6, -340, 22, -395, 58, -420);
    dc.lineTo(68, -412);
    dc.bezierCurveTo(38, -385, 16, -334, 4, -264);
    dc.bezierCurveTo(-20, -165, 16, -85, 22, 4);
    dc.closePath();
  };
  traceTrunk();
  dc.fillStyle = "#6e4c30";
  dc.fill();

  dc.save();
  traceTrunk();
  dc.clip();
  dc.fillStyle = "rgba(42, 28, 17, 0.42)";
  dc.fillRect(-55, -430, 52, 440);
  dc.strokeStyle = "rgba(23, 26, 32, 0.72)";
  dc.lineWidth = 1.6;
  for (let by = -20; by > -390; by -= 24) {
    const bx = -8 + Math.sin(by * 0.02) * 14 + (rand() - 0.5) * 12;
    dc.beginPath();
    dc.ellipse(bx, by, 7 + rand() * 4, 9 + rand() * 5, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
    dc.stroke();
  }
  dc.restore();

  traceTrunk();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.6;
  dc.lineJoin = "round";
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-8, -225);
  dc.quadraticCurveTo(-56, -246, -98, -242);
  dc.lineTo(-96, -230);
  dc.quadraticCurveTo(-50, -230, -2, -206);
  dc.closePath();
  dc.fillStyle = "#614228";
  dc.fill();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.2;
  dc.stroke();

  drawPinePad(dc, 60, -424, 80, 26, 0);
  drawPinePad(dc, 16, -396, 60, 20, -0.05);
  drawPinePad(dc, 102, -402, 62, 21, 0.06);
  drawPinePad(dc, -94, -242, 54, 19, -0.04);

  dc.restore();
}

function drawDynamicPineTrees(g, pineSprite, u, gust) {
  const baseBend = gust * (0.12 + 0.03 * Math.sin(u * 18));
  const idle = Math.sin(u * 2.1) * 0.012;

  const trees = [
    { x: -258, y: 706, s: 0.92, flip: -1 },
    { x: -118, y: 706, s: 0.78, flip: 1 },
    { x: 412, y: 706, s: 0.96, flip: -1 },
    { x: 1048, y: 706, s: 0.95, flip: 1 },
    { x: 1285, y: 706, s: 0.88, flip: -1 },
  ];

  for (let idx = 0; idx < trees.length; idx++) {
    const tr = trees[idx];
    const worldBend = baseBend + idle * (idx % 2 === 0 ? 1 : -1);

    g.push();
    g.translate(tr.x, tr.y);
    g.noStroke();
    g.fill(35, 48, 28, 70);
    g.ellipse(0, 2, 58 * tr.s, 12 * tr.s);

    g.rotate(worldBend * 0.55);
    g.scale(tr.flip * tr.s, tr.s);
    g.imageMode("corner");
    g.image(pineSprite, -160, -478, 340, 490);
    g.pop();
  }
}

/**
 * Draws iconic Hiroshige diagonal woodblock wind lines & swirling pine needles during Bar 2.
 */
function drawHiroshigeWind(g, u, gust) {
  if (gust <= 0.02) return;
  const dc = g.drawingContext;
  dc.save();
  dc.globalAlpha = clamp(gust, 0, 1);

  const windCount = 28;
  for (let i = 0; i < windCount; i++) {
    const speed = 820 + (i % 5) * 190;
    const rawX = ((u - 1.9) * speed + i * 160) % 1920;
    const x0 = BLEED_LEFT - 140 + rawX;
    const y0 = 175 + ((i * 107) % 545);
    const len = 145 + (i % 4) * 75;
    const x1 = x0 + len;
    const y1 = y0 - len * 0.195;

    if (i % 2 === 0) {
      drawWoodblockTaper(dc, x0, y0, x1, y1, 4.8, "rgba(38, 76, 112, 0.32)");
      drawWoodblockTaper(dc, x0 + 18, y0 - 4, x1 + 12, y1 - 3, 2.8, "rgba(252, 246, 232, 0.88)");
    } else {
      drawWoodblockTaper(dc, x0, y0, x1, y1, 3.8, "rgba(252, 246, 232, 0.9)");
      drawWoodblockTaper(dc, x0 + 22, y0 + 3, x1 - 10, y1 + 2, 1.5, "rgba(32, 62, 92, 0.28)");
    }
  }

  const leafCount = 30;
  for (let i = 0; i < leafCount; i++) {
    const speed = 490 + (i % 4) * 130;
    const lx = BLEED_LEFT + (((u - 1.9) * speed + i * 138) % 1840);
    const baseLy = 275 + ((i * 89) % 425);
    const ly = baseLy - (lx - 100) * 0.13 + Math.sin(u * 9.5 + i * 1.3) * 26;
    const rot = u * 8.5 + i * 1.1;

    dc.strokeStyle = "rgba(44, 82, 116, 0.35)";
    dc.lineWidth = 1.4;
    dc.beginPath();
    dc.moveTo(lx - 26, ly + 5);
    dc.lineTo(lx - 4, ly);
    dc.stroke();

    dc.save();
    dc.translate(lx, ly);
    dc.rotate(rot);
    if (i % 3 === 0) {
      dc.fillStyle = "#c84e2e";
      dc.strokeStyle = SUMI;
      dc.lineWidth = 1.2;
      dc.beginPath();
      dc.ellipse(0, 0, 8.5, 3.8, 0, 0, Math.PI * 2);
      dc.fill();
      dc.stroke();
    } else {
      dc.strokeStyle = i % 2 === 0 ? PINE_DARK : PINE_MID;
      dc.lineWidth = 2.1;
      dc.beginPath();
      dc.moveTo(-8, 0);
      dc.lineTo(9, -3.5);
      dc.moveTo(-8, 0);
      dc.lineTo(9, 3.5);
      dc.stroke();
    }
    dc.restore();
  }

  dc.restore();
}

/**
 * Draws the woven round bamboo conical hat (Sugegasa / 竹笠).
 */
function drawSugegasaHat(dc, x, y, tilt, airborne = false, gust = 0) {
  dc.save();
  dc.translate(x, y);
  dc.rotate(tilt);

  if (airborne) {
    dc.strokeStyle = VERMILION;
    dc.lineWidth = 2.6;
    dc.lineCap = "round";
    dc.beginPath();
    dc.moveTo(-16, 6);
    dc.quadraticCurveTo(-30 - gust * 16, 22, -40 - gust * 20, 34);
    dc.moveTo(16, 6);
    dc.quadraticCurveTo(24 - gust * 12, 24, 10 - gust * 16, 40);
    dc.stroke();

    dc.fillStyle = "#c99f54";
    dc.strokeStyle = SUMI;
    dc.lineWidth = 2.5;
    dc.beginPath();
    dc.ellipse(0, 2, 40, 22, 0, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();

    dc.strokeStyle = "rgba(82, 54, 22, 0.55)";
    dc.lineWidth = 1.3;
    dc.beginPath();
    dc.ellipse(0, 2, 29, 15, 0, 0, Math.PI * 2);
    dc.stroke();
    dc.beginPath();
    dc.ellipse(0, 2, 18, 9, 0, 0, Math.PI * 2);
    dc.stroke();

    dc.fillStyle = "#4d351c";
    dc.strokeStyle = SUMI;
    dc.lineWidth = 1.6;
    dc.beginPath();
    dc.ellipse(0, 4, 12, 6, 0, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();

    dc.strokeStyle = "#f2dcab";
    dc.lineWidth = 1.6;
    dc.beginPath();
    dc.arc(0, -1, 34, Math.PI * 1.12, Math.PI * 1.88);
    dc.stroke();
  } else {
    dc.beginPath();
    dc.moveTo(-38, 4);
    dc.quadraticCurveTo(-18, -15, 0, -23);
    dc.quadraticCurveTo(18, -15, 38, 4);
    dc.quadraticCurveTo(0, 11, -38, 4);
    dc.closePath();

    const hatGrad = dc.createLinearGradient(0, -23, 0, 8);
    hatGrad.addColorStop(0, "#ebd094");
    hatGrad.addColorStop(0.6, "#d2aa62");
    hatGrad.addColorStop(1, "#ad8240");
    dc.fillStyle = hatGrad;
    dc.fill();
    dc.strokeStyle = SUMI;
    dc.lineWidth = 2.4;
    dc.lineJoin = "round";
    dc.stroke();

    dc.strokeStyle = "rgba(92, 62, 28, 0.55)";
    dc.lineWidth = 1.2;
    for (const frac of [0.35, 0.65]) {
      dc.beginPath();
      dc.moveTo(-38 * frac, 4 - (1 - frac) * 15);
      dc.quadraticCurveTo(0, 8 - (1 - frac) * 16, 38 * frac, 4 - (1 - frac) * 15);
      dc.stroke();
    }
  }

  dc.restore();
}

/**
 * Draws the two Edo travelers in straw mino raincoats & round bamboo hats.
 */
function drawEdoTravelers(g, u, gust) {
  const dc = g.drawingContext;
  const ts = 1.15;

  // --- TRAVELER A (Front traveler walking left, stops at x ≈ 186) ---
  const stopA = smoothstep(1.86, 2.02, u);
  const walkClockA = u < 1.86 ? u : lerp(u, 1.94, stopA);
  const ax = 236 - Math.min(walkClockA, 1.95) * 26;
  const ay = 716;
  const strideA = (1 - stopA) * Math.sin(walkClockA * 6.2) * 11;
  const lookBackA = smoothstep(1.94, 2.14, u) * (1 - smoothstep(4.9, 5.6, u));
  const startleRecoil = smoothstep(1.96, 2.18, u) * (1 - smoothstep(4.4, 5.2, u));

  dc.save();
  dc.translate(ax, ay);
  dc.scale(ts, ts);

  dc.fillStyle = "rgba(38, 28, 18, 0.25)";
  dc.beginPath();
  dc.ellipse(0, 1, 22, 6, 0, 0, Math.PI * 2);
  dc.fill();

  for (const leg of [
    { x0: -5, x1: -10 - strideA, col: "#20446e" },
    { x0: 5, x1: 10 + strideA, col: "#2a5788" },
  ]) {
    dc.strokeStyle = SUMI;
    dc.lineCap = "round";
    dc.lineWidth = 8.5;
    dc.beginPath();
    dc.moveTo(leg.x0, -34);
    dc.lineTo(leg.x1, -3);
    dc.stroke();
    dc.strokeStyle = leg.col;
    dc.lineWidth = 5.5;
    dc.beginPath();
    dc.moveTo(leg.x0, -34);
    dc.lineTo(leg.x1, -10);
    dc.stroke();
    dc.fillStyle = "#d9b676";
    dc.strokeStyle = SUMI;
    dc.lineWidth = 1.6;
    dc.beginPath();
    dc.ellipse(leg.x1 - 2, -1, 9, 3.5, 0, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
  }

  const minoFlare = gust * 15;
  dc.save();
  dc.rotate(-startleRecoil * 0.13);
  dc.fillStyle = "#21456f";
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.2;
  dc.beginPath();
  dc.moveTo(-14, -46);
  dc.lineTo(14 + minoFlare * 0.4, -46);
  dc.lineTo(18 + minoFlare * 0.6, -24);
  dc.lineTo(-16, -24);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-14, -84);
  dc.lineTo(14, -84);
  dc.quadraticCurveTo(22 + minoFlare, -58, 25 + minoFlare, -32);
  dc.lineTo(-20 + minoFlare * 0.35, -34);
  dc.quadraticCurveTo(-20, -58, -14, -84);
  dc.closePath();
  dc.fillStyle = "#c99f54";
  dc.fill();
  dc.stroke();

  dc.strokeStyle = "rgba(42, 30, 16, 0.55)";
  dc.lineWidth = 1.4;
  for (let sx = -12; sx <= 16; sx += 5) {
    dc.beginPath();
    dc.moveTo(sx, -78);
    dc.lineTo(sx + minoFlare * 0.65, -34);
    dc.stroke();
  }

  const bx = lerp(-14, 14, lookBackA);
  dc.fillStyle = "#235282";
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.1;
  dc.beginPath();
  dc.ellipse(bx, -58, 16, 13, 0.18, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.fillStyle = "#f4e9d2";
  dc.beginPath();
  dc.arc(bx - 4, -61, 2.5, 0, Math.PI * 2);
  dc.arc(bx + 5, -56, 2.5, 0, Math.PI * 2);
  dc.arc(bx - 1, -53, 2, 0, Math.PI * 2);
  dc.fill();

  dc.strokeStyle = SUMI;
  dc.lineWidth = 4.6;
  dc.beginPath();
  dc.moveTo(4, -76);
  dc.quadraticCurveTo(bx + 6, -68, bx + 4, -56);
  dc.stroke();
  dc.strokeStyle = "#21456f";
  dc.lineWidth = 2.6;
  dc.stroke();

  const headX = lerp(-3, 4, lookBackA);
  const headY = -94;
  dc.save();
  dc.translate(headX, headY);
  dc.rotate(lerp(-0.18, 0.08, lookBackA));

  dc.fillStyle = "#edd0aa";
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.1;
  dc.beginPath();
  dc.arc(0, 0, 11.5, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.fillStyle = SUMI;
  dc.beginPath();
  dc.arc(-1, -3, 11, Math.PI * 0.88, Math.PI * 2.06);
  dc.fill();
  dc.beginPath();
  dc.ellipse(lookBackA > 0.4 ? -2 : 2, -13, 7.5, 3.8, lookBackA > 0.4 ? -0.25 : 0.25, 0, Math.PI * 2);
  dc.fill();

  if (lookBackA > 0.35) {
    dc.fillStyle = "#ffffff";
    dc.strokeStyle = SUMI;
    dc.lineWidth = 1.4;
    dc.beginPath();
    dc.arc(5, -2, 3.8, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
    dc.fillStyle = SUMI;
    dc.beginPath();
    dc.arc(6.3, -2, 1.5, 0, Math.PI * 2);
    dc.fill();
    dc.fillStyle = "#8f2a20";
    dc.beginPath();
    dc.ellipse(6.5, 5.2, 2.8, 3.8, 0, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
  } else {
    dc.fillStyle = SUMI;
    dc.beginPath();
    dc.arc(-5, -1, 1.5, 0, Math.PI * 2);
    dc.fill();
  }

  if (gust > 0.15) {
    dc.strokeStyle = VERMILION;
    dc.lineWidth = 2.1;
    for (const ang of [-2.25, -1.6, -0.92]) {
      dc.beginPath();
      dc.moveTo(Math.cos(ang) * 18, Math.sin(ang) * 18);
      dc.lineTo(Math.cos(ang) * 29, Math.sin(ang) * 29);
      dc.stroke();
    }
  }
  dc.restore();
  dc.restore();
  dc.restore();

  // --- TRAVELER A's ROUND BAMBOO HAT ---
  let hatX = ax - 5 * ts;
  let hatY = ay - 103 * ts;
  let hatTilt = -0.22;
  let hatAirborne = false;

  if (u > 1.95) {
    hatAirborne = true;
    if (u <= 3.1) {
      const s = smoothstep(1.95, 3.1, u);
      const lift = 1 - Math.pow(1 - s, 2.1);
      hatX = lerp(ax - 5 * ts, ax + 68, s) + Math.sin(u * 14) * 4 * gust;
      hatY = lerp(ay - 103 * ts, 434, lift);
      hatTilt = lerp(-0.22, -0.44, s) + Math.sin(u * 11) * 0.12;
    } else {
      const d = smoothstep(3.1, 5.15, u);
      hatX = lerp(ax + 68, ax + 162, d) + Math.sin(u * 8) * 5 * (1 - d);
      hatY = lerp(434, 706, d * d);
      hatTilt = lerp(-0.44, 0.25, d) + Math.sin(u * 7) * 0.16 * (1 - d);
    }
  }

  // Broken curved woodblock wind-lift arcs (instead of a continuous kite-string line!)
  if (hatAirborne && gust > 0.08) {
    dc.save();
    dc.globalAlpha = clamp(gust * 0.88, 0, 1);
    const drawCurvedLiftDash = (t0, t1, offsetX, col, w) => {
      const mx = ax + 24 + offsetX;
      const my = (ay - 122 + hatY) * 0.5 + 8;
      const sx = lerp(ax + 4 + offsetX * 0.3, hatX - 18 + offsetX * 0.5, t0);
      const sy = lerp(ay - 124, hatY + 22, t0);
      const ex = lerp(ax + 4 + offsetX * 0.3, hatX - 18 + offsetX * 0.5, t1);
      const ey = lerp(ay - 124, hatY + 22, t1);
      drawWoodblockTaper(dc, sx, sy, ex, ey, w, col);
      void mx;
      void my;
    };
    drawCurvedLiftDash(0.14, 0.42, -6, "rgba(252, 246, 232, 0.85)", 3.2);
    drawCurvedLiftDash(0.54, 0.82, 8, "rgba(252, 246, 232, 0.85)", 3.2);
    drawCurvedLiftDash(0.28, 0.64, 16, "rgba(38, 76, 112, 0.48)", 2.4);
    dc.restore();
  }
  drawSugegasaHat(dc, hatX, hatY, hatTilt, hatAirborne, gust);

  // --- TRAVELER B (Rear traveler with shoulder pole & baskets, stops at x ≈ 278) ---
  const stopB = smoothstep(2.0, 2.16, u);
  const walkClockB = u < 2.0 ? u : lerp(u, 2.08, stopB);
  const bxPos = 332 - Math.min(walkClockB, 2.08) * 26;
  const byPos = 716;
  const strideB = (1 - stopB) * Math.sin(walkClockB * 6.2 + 1.4) * 10;
  const lookBackB = smoothstep(2.04, 2.24, u) * (1 - smoothstep(4.9, 5.6, u));

  dc.save();
  dc.translate(bxPos, byPos);
  dc.scale(ts, ts);

  dc.fillStyle = "rgba(38, 28, 18, 0.25)";
  dc.beginPath();
  dc.ellipse(0, 1, 22, 6, 0, 0, Math.PI * 2);
  dc.fill();

  for (const leg of [
    { x0: -5, x1: -9 - strideB, col: "#364d3b" },
    { x0: 5, x1: 9 + strideB, col: "#44614a" },
  ]) {
    dc.strokeStyle = SUMI;
    dc.lineWidth = 8.5;
    dc.lineCap = "round";
    dc.beginPath();
    dc.moveTo(leg.x0, -34);
    dc.lineTo(leg.x1, -3);
    dc.stroke();
    dc.strokeStyle = leg.col;
    dc.lineWidth = 5.5;
    dc.beginPath();
    dc.moveTo(leg.x0, -34);
    dc.lineTo(leg.x1, -10);
    dc.stroke();
    dc.fillStyle = "#d9b676";
    dc.strokeStyle = SUMI;
    dc.lineWidth = 1.6;
    dc.beginPath();
    dc.ellipse(leg.x1 - 2, -1, 9, 3.5, 0, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
  }

  const flareB = gust * 14;
  dc.fillStyle = "#3f5946";
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.2;
  dc.beginPath();
  dc.moveTo(-14, -46);
  dc.lineTo(14 + flareB * 0.35, -46);
  dc.lineTo(17 + flareB * 0.55, -24);
  dc.lineTo(-15, -24);
  dc.closePath();
  dc.fill();
  dc.stroke();

  dc.beginPath();
  dc.moveTo(-13, -82);
  dc.lineTo(13, -82);
  dc.quadraticCurveTo(21 + flareB, -56, 23 + flareB, -33);
  dc.lineTo(-19 + flareB * 0.3, -35);
  dc.quadraticCurveTo(-19, -58, -13, -82);
  dc.closePath();
  dc.fillStyle = "#ba914a";
  dc.fill();
  dc.stroke();

  const poleSwing = gust * (0.14 + 0.08 * Math.sin(u * 13));
  dc.save();
  dc.translate(0, -82);
  dc.rotate(poleSwing * 0.35);
  dc.strokeStyle = "#7a582e";
  dc.lineWidth = 4.2;
  dc.beginPath();
  dc.moveTo(-36, 4);
  dc.quadraticCurveTo(0, -2, 38, 6);
  dc.stroke();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 1.3;
  dc.stroke();

  for (const [pxEnd, pyEnd] of [[-32, 4], [34, 6]]) {
    dc.save();
    dc.translate(pxEnd, pyEnd);
    dc.rotate(-poleSwing * 1.4 - gust * 0.25);
    dc.strokeStyle = SUMI;
    dc.lineWidth = 1.5;
    dc.beginPath();
    dc.moveTo(0, 0);
    dc.lineTo(-7, 22);
    dc.moveTo(0, 0);
    dc.lineTo(7, 22);
    dc.stroke();
    dc.fillStyle = "#c99f5e";
    dc.fillRect(-10, 22, 20, 16);
    dc.strokeRect(-10, 22, 20, 16);
    dc.restore();
  }
  dc.restore();

  const headXB = lerp(-3, 5, lookBackB);
  dc.save();
  dc.translate(headXB, -92);
  dc.fillStyle = "#edd0aa";
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.1;
  dc.beginPath();
  dc.arc(0, 0, 11, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  if (lookBackB > 0.35) {
    dc.fillStyle = "#ffffff";
    dc.beginPath();
    dc.arc(5, -1, 3.6, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
    dc.fillStyle = SUMI;
    dc.beginPath();
    dc.arc(6.2, -1, 1.4, 0, Math.PI * 2);
    dc.fill();
    dc.fillStyle = "#8f2a20";
    dc.beginPath();
    dc.arc(6.2, 5.2, 2.4, 0, Math.PI * 2);
    dc.fill();
  }
  dc.restore();

  if (gust > 0.15) {
    dc.strokeStyle = SUMI;
    dc.lineWidth = 5;
    dc.beginPath();
    dc.moveTo(-8, -76);
    dc.lineTo(-19, -98);
    dc.stroke();
    dc.strokeStyle = "#3f5946";
    dc.lineWidth = 3;
    dc.stroke();
  }

  // Hat tilts cleanly up-back so Traveler B's shocked face stays unobstructed!
  const hatTiltB = lerp(-0.18, -0.58, gust) + Math.sin(u * 16) * 0.05 * gust;
  drawSugegasaHat(dc, headXB - 7 * gust - 4, -102 - gust * 6, hatTiltB, false, gust);

  dc.restore();
}

/**
 * Draws crisp woodblock speed wind streaks & dust curls trailing behind the Pelican's wheels.
 */
function drawPelicanWake(g, pose, u, gust) {
  const dc = g.drawingContext;
  const s = pose.scale;
  const intensity = 0.35 + gust * 0.85;

  dc.save();
  dc.globalAlpha = clamp(intensity, 0, 1);

  const streaks = [
    [-125, -22, 125 + gust * 85],
    [-142, -52, 105 + gust * 75],
    [-118, -118, 130 + gust * 80],
    [-132, -162, 105 + gust * 68],
  ];
  for (let i = 0; i < streaks.length; i++) {
    const [ox, oy, len] = streaks[i];
    const phase = Math.sin(u * 20 + i * 1.7) * 8;
    const x1 = pose.x + ox * s;
    const y1 = pose.y + oy * s;
    const x0 = x1 - (len + phase) * s;
    const y0 = y1 + (4 + gust * 6) * s;
    drawWoodblockTaper(dc, x0, y0, x1, y1, (3.2 + gust * 1.8) * s, "#fbf3e3");
    drawWoodblockTaper(dc, x0 + 18 * s, y0 + 2 * s, x1, y1 + 1.5 * s, 1.8 * s, "rgba(32, 62, 92, 0.5)");
  }

  const beatFrac = ((u * 2) % 1 + 1) % 1;
  for (let i = 0; i < 3; i++) {
    const age = (beatFrac + i * 0.25) % 0.85;
    const dx = pose.rearHub.x - (16 + age * (48 + gust * 38)) * s;
    const dy = ROAD_Y - (6 + age * 18) * s;
    const r = Math.max(0.5, (6 + age * 11) * s);
    dc.globalAlpha = clamp((1 - age) * 0.72 * intensity, 0, 1);
    dc.fillStyle = "#efe0c2";
    dc.strokeStyle = SUMI;
    dc.lineWidth = 1.4 * s;
    dc.beginPath();
    dc.arc(dx, dy, r, Math.PI * 0.75, Math.PI * 2.15);
    dc.fill();
    dc.stroke();
  }
  dc.restore();
}

/**
 * Draws the Ukiyo-e polychrome woodblock Pelican + indigo bicycle synced to getRigPose.
 */
function drawUkiyoeRig(g, pose, u, gust) {
  const dc = g.drawingContext;
  const s = pose.scale;
  const indigoTube = "#1c4a7e";
  const ivoryPlumage = "#f7efe0";
  const grayShadow = "#d3cbb9";

  dc.save();
  dc.fillStyle = "rgba(44, 34, 22, 0.22)";
  dc.beginPath();
  dc.ellipse(pose.x, pose.y + 2 * s, 118 * s, 9 * s, 0, 0, Math.PI * 2);
  dc.fill();
  dc.restore();

  const drawWheel = (hub) => {
    dc.save();
    dc.translate(hub.x, hub.y);

    if (gust > 0.15) {
      dc.strokeStyle = `rgba(23, 26, 32, ${(gust * 0.45).toFixed(3)})`;
      dc.lineWidth = 2.0 * s;
      for (let k = 0; k < 3; k++) {
        const a0 = pose.wheelRot * 1.5 + k * 2.1;
        dc.beginPath();
        dc.arc(0, 0, pose.wheelRadius - (11 + k * 8) * s, a0, a0 + 0.9);
        dc.stroke();
      }
    }

    dc.strokeStyle = indigoTube;
    dc.lineWidth = 1.9 * s;
    for (let i = 0; i < 8; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 4;
      dc.beginPath();
      dc.moveTo(0, 0);
      dc.lineTo(Math.cos(a) * (pose.wheelRadius - 4 * s), Math.sin(a) * (pose.wheelRadius - 4 * s));
      dc.stroke();
    }

    dc.strokeStyle = SUMI;
    dc.lineWidth = 6.5 * s;
    dc.beginPath();
    dc.arc(0, 0, pose.wheelRadius, 0, Math.PI * 2);
    dc.stroke();

    dc.strokeStyle = "#e8dcc4";
    dc.lineWidth = 1.5 * s;
    dc.beginPath();
    dc.arc(0, 0, pose.wheelRadius - 3.6 * s, 0, Math.PI * 2);
    dc.stroke();

    dc.fillStyle = indigoTube;
    dc.strokeStyle = SUMI;
    dc.lineWidth = 1.8 * s;
    dc.beginPath();
    dc.arc(0, 0, 6 * s, 0, Math.PI * 2);
    dc.fill();
    dc.stroke();
    dc.restore();
  };

  g.push();
  g.strokeCap("round");
  g.strokeJoin("round");
  g.noFill();
  g.stroke(SUMI);
  g.strokeWeight(9.5 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.leftKnee.x, pose.leftKnee.y);
  g.vertex(pose.leftPedal.x, pose.leftPedal.y);
  g.endShape();
  g.stroke("#b05626");
  g.strokeWeight(5.2 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.leftKnee.x, pose.leftKnee.y);
  g.vertex(pose.leftPedal.x, pose.leftPedal.y);
  g.endShape();
  g.pop();

  drawWheel(pose.rearHub);
  drawWheel(pose.frontHub);

  const frameSegs = [
    [pose.rearHub, pose.bb],
    [pose.rearHub, pose.seatCluster],
    [pose.bb, pose.seatCluster],
    [pose.seatCluster, pose.headTop],
    [pose.bb, pose.headBot],
    [pose.frontHub, pose.headTop],
    [pose.headTop, pose.stemTop],
    [pose.stemTop, pose.barGrip],
    [pose.seatCluster, { x: (pose.saddleRear.x + pose.saddleFront.x) * 0.5, y: pose.saddleRear.y + 3 * s }],
  ];

  dc.save();
  dc.lineCap = "round";
  dc.lineJoin = "round";
  dc.strokeStyle = SUMI;
  dc.lineWidth = 8.4 * s;
  for (const [a, b] of frameSegs) {
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.stroke();
  }
  dc.strokeStyle = indigoTube;
  dc.lineWidth = 4.6 * s;
  for (const [a, b] of frameSegs) {
    dc.beginPath();
    dc.moveTo(a.x, a.y);
    dc.lineTo(b.x, b.y);
    dc.stroke();
  }

  dc.strokeStyle = SUMI;
  dc.lineWidth = 9 * s;
  dc.beginPath();
  dc.moveTo(pose.saddleRear.x, pose.saddleRear.y);
  dc.lineTo(pose.saddleFront.x, pose.saddleFront.y);
  dc.stroke();
  dc.strokeStyle = "#7a4d2b";
  dc.lineWidth = 5 * s;
  dc.stroke();

  dc.fillStyle = indigoTube;
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.2 * s;
  dc.beginPath();
  dc.arc(pose.bb.x, pose.bb.y, 9.5 * s, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();

  dc.fillStyle = "#d99b38";
  dc.beginPath();
  dc.arc(pose.bellPos.x, pose.bellPos.y, 5 * s, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.restore();

  const traceBody = () => {
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
  };

  dc.save();
  traceBody();
  dc.fillStyle = ivoryPlumage;
  dc.fill();
  dc.save();
  traceBody();
  dc.clip();
  dc.fillStyle = grayShadow;
  dc.beginPath();
  dc.ellipse(pose.bodyCenter.x - 4 * s, pose.bodyCenter.y + 22 * s, 68 * s, 26 * s, -0.08, 0, Math.PI * 2);
  dc.fill();
  dc.restore();
  traceBody();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 3.5 * s;
  dc.lineJoin = "round";
  dc.stroke();
  dc.restore();

  g.push();
  g.noFill();
  g.strokeCap("round");
  g.stroke(SUMI);
  g.strokeWeight(25.5 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();
  g.stroke(ivoryPlumage);
  g.strokeWeight(18.5 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x, pt.y);
  g.endShape();
  g.stroke(grayShadow);
  g.strokeWeight(4.5 * s);
  g.beginShape();
  for (const pt of pose.neckCurve) g.vertex(pt.x - 3 * s, pt.y + 2 * s);
  g.endShape();
  g.pop();

  g.push();
  g.fill(ivoryPlumage);
  g.stroke(SUMI);
  g.strokeWeight(3.3 * s);
  g.beginShape();
  g.vertex(pose.crest1.x, pose.crest1.y);
  g.vertex(pose.head.x - 6 * s, pose.head.y - 16 * s);
  g.vertex(pose.crest2.x, pose.crest2.y);
  g.vertex(pose.head.x + 6 * s, pose.head.y - 17 * s);
  g.endShape();
  g.circle(pose.head.x, pose.head.y, 35 * s);
  g.pop();

  const tracePouch = () => {
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
  dc.save();
  tracePouch();
  dc.fillStyle = VERMILION;
  dc.fill();
  dc.save();
  tracePouch();
  dc.clip();
  dc.fillStyle = VERMILION_DARK;
  dc.beginPath();
  dc.ellipse(pose.pouchMid.x + 4 * s, pose.pouchMid.y + 12 * s, 52 * s, 16 * s, -0.05, 0, Math.PI * 2);
  dc.fill();
  dc.restore();
  tracePouch();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 3.2 * s;
  dc.lineJoin = "round";
  dc.stroke();
  dc.restore();

  dc.save();
  dc.beginPath();
  dc.moveTo(pose.beakBaseTop.x, pose.beakBaseTop.y);
  dc.lineTo(pose.beakTip.x, pose.beakTip.y);
  dc.lineTo(pose.beakHook.x, pose.beakHook.y);
  dc.lineTo(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  dc.lineTo(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  dc.closePath();
  dc.fillStyle = "#dc8e36";
  dc.fill();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 3 * s;
  dc.lineJoin = "round";
  dc.stroke();
  dc.restore();

  dc.save();
  dc.fillStyle = "#ffffff";
  dc.strokeStyle = SUMI;
  dc.lineWidth = 2.2 * s;
  dc.beginPath();
  dc.ellipse(pose.eye.x, pose.eye.y, 5.5 * s, 4.4 * s, 0, 0, Math.PI * 2);
  dc.fill();
  dc.stroke();
  dc.fillStyle = SUMI;
  dc.beginPath();
  dc.arc(pose.eye.x + 1.4 * s, pose.eye.y, 2.2 * s, 0, Math.PI * 2);
  dc.fill();
  dc.lineWidth = 2.4 * s;
  dc.beginPath();
  dc.moveTo(pose.eye.x - 7 * s, pose.eye.y - 3 * s);
  dc.quadraticCurveTo(pose.eye.x, pose.eye.y - 7 * s, pose.eye.x + 8 * s, pose.eye.y - 2 * s);
  dc.stroke();
  dc.restore();

  const traceWing = () => {
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
  };
  dc.save();
  traceWing();
  dc.fillStyle = grayShadow;
  dc.fill();
  dc.strokeStyle = SUMI;
  dc.lineWidth = 3 * s;
  dc.stroke();
  dc.strokeStyle = "rgba(23, 26, 32, 0.55)";
  dc.lineWidth = 1.6 * s;
  dc.beginPath();
  dc.moveTo(pose.shoulder.x - 2 * s, pose.shoulder.y + 2 * s);
  dc.quadraticCurveTo(pose.wingElbow.x, pose.wingElbow.y + 4 * s, pose.barGrip.x - 8 * s, pose.barGrip.y + 6 * s);
  dc.stroke();
  dc.restore();

  g.push();
  g.noFill();
  g.strokeCap("round");
  g.strokeJoin("round");
  g.stroke(SUMI);
  g.strokeWeight(10 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.rightKnee.x, pose.rightKnee.y);
  g.vertex(pose.rightPedal.x, pose.rightPedal.y);
  g.endShape();
  g.stroke("#d96f2a");
  g.strokeWeight(5.8 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.rightKnee.x, pose.rightKnee.y);
  g.vertex(pose.rightPedal.x, pose.rightPedal.y);
  g.endShape();

  g.stroke(SUMI);
  g.strokeWeight(5.5 * s);
  g.line(pose.bb.x, pose.bb.y, pose.rightPedal.x, pose.rightPedal.y);
  g.stroke(indigoTube);
  g.strokeWeight(3 * s);
  g.line(pose.bb.x, pose.bb.y, pose.rightPedal.x, pose.rightPedal.y);

  g.fill(SUMI);
  g.noStroke();
  g.rect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 3 * s, 16 * s, 6 * s, 2 * s);
  g.rect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s, 2 * s);
  g.pop();
}

export default function render(ctx) {
  const { p, g, kit, t, localTime } = ctx;
  const u = localTime;

  const backdrop = kit.bakeLayer("s11_ukiyoe_backdrop_v3", 1840, 1000, bakeUkiyoeBackdrop);
  const pineSprite = kit.bakeLayer("s11_pine_sprite_v1", 340, 490, (pg) => bakePineSprite(pg, 101));

  // 1. Baked Edo woodblock print backdrop
  p.push();
  p.imageMode(p.CENTER);
  p.image(backdrop, 500, 500, 1840, 1000);
  p.pop();

  // 2. Dynamic 2D foreground layers
  g.push();

  const px = getScenePelicanX(u);
  const gust = smoothstep(1.90, 2.12, u) * (1 - smoothstep(3.85, 4.45, u));

  // Pre-baked swaying Hiroshige black pine trees
  drawDynamicPineTrees(g, pineSprite, u, gust);

  // Travelers + Bar 2 soaring circular bamboo hat
  drawEdoTravelers(g, u, gust);

  // Woodblock speed wind & dust wake behind Pelican
  const pose = getRigPose(t, {
    x: px,
    y: ROAD_Y,
    scale: 1.0,
    lean: gust * 0.045,
  });
  drawPelicanWake(g, pose, u, gust);

  // Woodblock polychrome Pelican & indigo bicycle
  drawUkiyoeRig(g, pose, u, gust);

  // Diagonal Hiroshige woodblock wind lines & pine needles in Bar 2
  drawHiroshigeWind(g, u, gust);

  // Era Title Card
  drawEraTitleCard(g, META, u);

  g.pop();
}
