/**
 * Scene #19 — 竖屏短视频 · Vertical Short Video (2020s), t in [113.0, 119.0).
 * Snaps suddenly into a centered 9:16 mobile viewport with pure-black sidebars,
 * golden-hour riverside cycleway parallax, Bar 2 pinch-to-zoom + AF focus lock,
 * 100% original fictional App UI, rising hearts & comment danmaku,
 * and a bottom progress bar that hits 100% right at the Portal 20 exit downbeat.
 */

import {
  BLEED_LEFT,
  BLEED_RIGHT,
  CROSS_SPEED,
  ROAD_Y,
  SCENE_DUR,
  clamp,
  hermite,
  lerp,
  smoothstep,
} from "../beat.js";
import { drawEraTitleCard } from "../kit/titleCard.js";
import { drawRig2D, getRigPose } from "../rig.js";
import { SCENES_META } from "./registry.js";

const META = SCENES_META[18];

// Centered 9:16 vertical viewport inside 1000-tall unit space (562.5 x 1000 -> 607.5 x 1080 px)
const PHONE_W = 562.5;
const PHONE_LEFT = (1000 - PHONE_W) / 2; // 218.75
const PHONE_RIGHT = PHONE_LEFT + PHONE_W; // 781.25

function getShortVideoPelicanX(u) {
  if (u <= 0) return BLEED_LEFT + CROSS_SPEED * u;
  if (u <= 1.0) return hermite(BLEED_LEFT, CROSS_SPEED * 1.0, 462, 18 * 1.0, u / 1.0);
  if (u <= 4.9) return lerp(462, 532, (u - 1.0) / 3.9);
  if (u <= SCENE_DUR) return hermite(532, 18 * 1.1, BLEED_RIGHT, CROSS_SPEED * 1.1, (u - 4.9) / 1.1);
  return BLEED_RIGHT + CROSS_SPEED * (u - SCENE_DUR);
}

function drawHeart(g, x, y, size, fillCol, strokeCol = null, alpha = 1) {
  const dc = g.drawingContext;
  dc.save();
  dc.globalAlpha *= alpha;
  dc.translate(x, y);
  dc.beginPath();
  const s = size * 0.5;
  dc.moveTo(0, s * 0.72);
  dc.bezierCurveTo(-s * 1.15, s * 0.05, -s * 1.15, -s * 0.95, 0, -s * 0.35);
  dc.bezierCurveTo(s * 1.15, -s * 0.95, s * 1.15, s * 0.05, 0, s * 0.72);
  dc.closePath();
  if (fillCol) {
    dc.fillStyle = fillCol;
    dc.fill();
  }
  if (strokeCol) {
    dc.strokeStyle = strokeCol;
    dc.lineWidth = 2.2;
    dc.stroke();
  }
  dc.restore();
}

function bakeCityBackdrop(pg) {
  const w = 1840;
  const h = 1000;
  const dc = pg.drawingContext;
  const grad = dc.createLinearGradient(0, 0, 0, ROAD_Y);
  grad.addColorStop(0, "#231942");
  grad.addColorStop(0.42, "#7e3b5c");
  grad.addColorStop(0.76, "#dc7454");
  grad.addColorStop(1, "#f6b56e");
  dc.fillStyle = grad;
  dc.fillRect(0, 0, w, ROAD_Y);

  // Warm sunset sun glow
  const sunGrad = dc.createRadialGradient(1180, 420, 12, 1180, 420, 260);
  sunGrad.addColorStop(0, "rgba(255, 244, 200, 0.95)");
  sunGrad.addColorStop(0.35, "rgba(255, 190, 108, 0.45)");
  sunGrad.addColorStop(1, "rgba(255, 140, 80, 0)");
  dc.fillStyle = sunGrad;
  dc.fillRect(880, 120, 600, 560);

  // Ground asphalt & river promenade base
  pg.noStroke();
  pg.fill("#22252e");
  pg.rect(0, ROAD_Y, w, h - ROAD_Y);
}

const COMMENTS_FEED = [
  { user: "路人甲", text: "？？？刚路过江边，我没眼花吧", start: 0.75, lane: 0 },
  { user: "物理课代表", text: "踩踏频率稳稳卡在 120 BPM", start: 1.45, lane: 1 },
  { user: "艺术史助教", text: "宋代山水卷轴里好像也见过它…", start: 2.15, lane: 0 },
  { user: "夜猫子", text: "大喉囊里装的是蓝牙低音炮吗", start: 2.85, lane: 1 },
  { user: "自行车协会", text: "这踏频和重心控制比我强多了", start: 3.55, lane: 0 },
  { user: "考据党", text: "一本正经地全速赶往下一个时代", start: 4.25, lane: 1 },
];

const DANMAKU_TOP = [
  { text: "前方高能：大喉囊空气动力学", start: 1.1, y: 148, speed: 155 },
  { text: "2020s 经典街拍名场面预定", start: 2.05, y: 186, speed: 175 },
  { text: "进度条怎么刚好卡拍子？！", start: 3.3, y: 164, speed: 165 },
];

export default function render(ctx) {
  const { p, brush, g, kit, t, localTime, beat } = ctx;
  const u = localTime;

  const backdrop = kit.bakeLayer("s19_sunset_city_v1", 1840, 1000, bakeCityBackdrop);
  p.push();
  p.imageMode(p.CENTER);
  p.image(backdrop, 500, 500, 1840, 1000);
  p.pop();

  // Subtle p5.brush road anchor for clean portal continuity
  brush.set("marker", "#2e3340", 3.0);
  brush.line(BLEED_LEFT, ROAD_Y + 4, BLEED_RIGHT, ROAD_Y + 4);

  g.push();

  // Shutter snap progress: open at u = 0 -> locked at 9:16 by u = 0.48s (Beat 2!)
  // Near exit (u > 5.35), Pelican breaks out of the right edge toward Portal 20 in full color.
  const px = getShortVideoPelicanX(u);
  const snap = smoothstep(0.1, 0.46, u);
  const clipLeft = lerp(BLEED_LEFT, PHONE_LEFT, snap);
  const baseClipRight = lerp(BLEED_RIGHT, PHONE_RIGHT, snap);
  const breakRight = u > 5.2 ? Math.max(baseClipRight, px + 145) : baseClipRight;
  const clipRight = Math.min(BLEED_RIGHT + 20, breakRight);

  const dc = g.drawingContext;
  dc.save();
  dc.beginPath();
  dc.rect(clipLeft, 0, clipRight - clipLeft, 1000);
  dc.clip();

  // Handheld phone sway + excited Bar 2 pinch-to-zoom (u in [1.9, 3.65])
  const zoomCurve = smoothstep(1.88, 2.15, u) * (1 - smoothstep(3.1, 3.75, u));
  const phoneZoom = 1 + 0.22 * zoomCurve;
  const swayX = snap * (Math.sin(u * 5.2) * 3.2 + Math.cos(u * 8.1) * 1.4);
  const swayY = snap * (Math.cos(u * 4.4) * 2.4 + beat.beatPulse * 2.2);

  g.push();
  g.translate(500 + swayX, 580 + swayY);
  g.scale(phoneZoom);
  g.translate(-500 - zoomCurve * (px - 500) * 0.55, -580 - zoomCurve * 35);

  // Parallax skyline silhouettes drifting gently leftward
  const skyShift = ((u * 85) % 420);
  g.noStroke();
  g.fill("rgba(34, 24, 54, 0.72)");
  const towers = [
    [60, 140],
    [130, 210],
    [205, 165],
    [280, 250],
    [360, 185],
    [435, 225],
    [520, 155],
  ];
  for (let rep = -1; rep <= 3; rep++) {
    for (let i = 0; i < towers.length; i++) {
      const bx = rep * 420 + towers[i][0] - skyShift;
      const bh = towers[i][1];
      g.rect(bx, ROAD_Y - 78 - bh, 58, bh + 78);
      // Warm lit skyscraper windows
      g.fill("rgba(255, 214, 130, 0.35)");
      for (let wy = ROAD_Y - 78 - bh + 16; wy < ROAD_Y - 105; wy += 24) {
        g.rect(bx + 12, wy, 10, 8);
        g.rect(bx + 34, wy, 10, 8);
      }
      g.fill("rgba(34, 24, 54, 0.72)");
    }
  }

  // Riverside promenade trees & streetlamps rushing past (high-speed 60fps parallax!)
  const treeShift = (u * 380) % 240;
  for (let tx = -360; tx <= 1500; tx += 240) {
    const lx = tx - treeShift;
    // Streetlamp
    g.stroke("#353946");
    g.strokeWeight(4);
    g.line(lx, ROAD_Y - 22, lx, ROAD_Y - 175);
    g.line(lx, ROAD_Y - 175, lx + 26, ROAD_Y - 175);
    g.noStroke();
    g.fill("rgba(255, 224, 150, 0.65)");
    g.circle(lx + 24, ROAD_Y - 170, 14);
    // Guardrail posts
    g.fill("#484f60");
    g.rect(lx + 115, ROAD_Y - 46, 8, 46);
  }
  // Horizontal guardrail bar
  g.fill("#586175");
  g.noStroke();
  g.rect(BLEED_LEFT - 100, ROAD_Y - 40, BLEED_RIGHT - BLEED_LEFT + 200, 6);

  // Asphalt riverside cycleway & fast scrolling dashed lane stripes
  g.fill("#222630");
  g.rect(BLEED_LEFT - 100, ROAD_Y, BLEED_RIGHT - BLEED_LEFT + 200, 290);
  g.fill("#2b6659"); // Green urban cycleway shoulder strip
  g.rect(BLEED_LEFT - 100, ROAD_Y + 4, BLEED_RIGHT - BLEED_LEFT + 200, 12);

  const dashShift = (u * 560) % 130;
  g.fill("rgba(242, 244, 248, 0.75)");
  for (let dx = -480; dx <= 1580; dx += 130) {
    g.rect(dx - dashShift, ROAD_Y + 62, 62, 6, 3);
  }

  // Stylized urban-realist Pelican & sleek red-accent road bike
  const pose = getRigPose(t * 1.15, { x: px, y: ROAD_Y, scale: 1.0 });
  drawRig2D(g, pose, {
    frame: "#e63956",
    tire: "#14161c",
    feather: "#faf7f0",
    featherShade: "#e3ded2",
    beak: "#f09b2c",
    pouch: "#f6b84c",
    leg: "#de7b1c",
    outline: "#181a20",
  });

  // Yellow Camera Auto-Focus Box locking onto the Pelican's head during Bar 2 pinch-zoom!
  if (zoomCurve > 0.15) {
    g.push();
    g.drawingContext.globalAlpha = zoomCurve;
    const fx = pose.head.x + 28;
    const fy = pose.head.y + 8;
    const bw = 128;
    const bh = 98;
    const arm = 18;
    g.noFill();
    g.stroke("#ffd84d");
    g.strokeWeight(2.5);
    // Corner brackets
    g.line(fx - bw / 2, fy - bh / 2, fx - bw / 2 + arm, fy - bh / 2);
    g.line(fx - bw / 2, fy - bh / 2, fx - bw / 2, fy - bh / 2 + arm);
    g.line(fx + bw / 2, fy - bh / 2, fx + bw / 2 - arm, fy - bh / 2);
    g.line(fx + bw / 2, fy - bh / 2, fx + bw / 2, fy - bh / 2 + arm);
    g.line(fx - bw / 2, fy + bh / 2, fx - bw / 2 + arm, fy + bh / 2);
    g.line(fx - bw / 2, fy + bh / 2, fx - bw / 2, fy + bh / 2 - arm);
    g.line(fx + bw / 2, fy + bh / 2, fx + bw / 2 - arm, fy + bh / 2);
    g.line(fx + bw / 2, fy + bh / 2, fx + bw / 2, fy + bh / 2 - arm);

    g.fill("#ffd84d");
    g.noStroke();
    g.textAlign("left", "bottom");
    g.textFont("Menlo, monospace");
    g.textSize(12);
    g.text("AF · 鹈鹕追踪", fx - bw / 2, fy - bh / 2 - 5);
    g.pop();
  }

  g.pop(); // End handheld phone camera

  // --- Original Fictional Short-Video App UI Overlay (fades in smoothly as 9:16 snaps) ---
  const uiAlpha = smoothstep(0.28, 0.58, u) * (1 - smoothstep(5.72, 5.98, u));
  if (uiAlpha > 0.01) {
    g.push();
    g.drawingContext.globalAlpha = uiAlpha;

    // Top & bottom subtle readability gradient vignettes inside 9:16 screen
    const topGrad = dc.createLinearGradient(0, 0, 0, 150);
    topGrad.addColorStop(0, "rgba(0,0,0,0.62)");
    topGrad.addColorStop(1, "rgba(0,0,0,0)");
    dc.fillStyle = topGrad;
    dc.fillRect(PHONE_LEFT, 0, PHONE_W, 150);

    const botGrad = dc.createLinearGradient(0, 740, 0, 1000);
    botGrad.addColorStop(0, "rgba(0,0,0,0)");
    botGrad.addColorStop(1, "rgba(0,0,0,0.82)");
    dc.fillStyle = botGrad;
    dc.fillRect(PHONE_LEFT, 740, PHONE_W, 260);

    // Top Nav Bar: Fictional App Header
    g.fill("rgba(255,255,255,0.62)");
    g.noStroke();
    g.textAlign("center", "center");
    g.textFont("PingFang SC, Helvetica Neue, sans-serif");
    g.textSize(19);
    g.text("关注", 408, 46);
    g.text("同城", 495, 46);
    g.fill("#ffffff");
    g.textStyle("bold");
    g.text("热榜", 582, 46);
    g.fill("#fe2c55");
    g.rect(566, 62, 32, 3.5, 2);

    // Live viewer pill top-left inside phone
    g.fill("rgba(18, 20, 26, 0.56)");
    g.rect(PHONE_LEFT + 16, 32, 126, 28, 14);
    g.fill("#fe2c55");
    g.circle(PHONE_LEFT + 31, 46, 7 + beat.beatPulse * 2);
    g.fill("#f6f7fa");
    g.textStyle("normal");
    g.textAlign("left", "center");
    g.textSize(12);
    g.text("14.2w 人围观", PHONE_LEFT + 41, 46);

    // Top-right search magnifier icon (pure geometric)
    g.noFill();
    g.stroke("#ffffff");
    g.strokeWeight(2.2);
    g.circle(PHONE_RIGHT - 34, 44, 15);
    g.line(PHONE_RIGHT - 28, 50, PHONE_RIGHT - 21, 57);

    // Upper Danmaku drifting across top of 9:16 screen
    for (const d of DANMAKU_TOP) {
      const age = u - d.start;
      if (age >= 0 && age <= 3.6) {
        const dx = PHONE_RIGHT + 30 - age * d.speed;
        g.fill("rgba(10, 12, 16, 0.42)");
        g.noStroke();
        g.rect(dx - 8, d.y - 14, d.text.length * 15 + 18, 26, 13);
        g.fill("rgba(255,255,255,0.92)");
        g.textAlign("left", "center");
        g.textSize(14);
        g.text(d.text, dx + 2, d.y - 1);
      }
    }

    // Rising translucent comment stream on lower-left ("评论弹幕往上飘")
    for (const c of COMMENTS_FEED) {
      const age = u - c.start;
      if (age >= 0 && age <= 2.9) {
        const riseY = 815 - age * 115;
        const cAlpha = smoothstep(0, 0.25, age) * (1 - smoothstep(2.2, 2.9, age));
        const cx = PHONE_LEFT + 18 + c.lane * 14;
        g.push();
        g.drawingContext.globalAlpha *= cAlpha;
        g.fill("rgba(16, 18, 24, 0.68)");
        g.noStroke();
        const boxW = Math.min(365, c.user.length * 14 + c.text.length * 14 + 34);
        g.rect(cx, riseY, boxW, 32, 16);
        g.fill("#ffd36e");
        g.textAlign("left", "center");
        g.textStyle("bold");
        g.textSize(13.5);
        g.text(`${c.user}：`, cx + 12, riseY + 16);
        g.fill("#f4f6fa");
        g.textStyle("normal");
        g.text(c.text, cx + 16 + c.user.length * 14 + 6, riseY + 16);
        g.pop();
      }
    }

    // Rising geometric heart fountain above bottom-right like rail
    for (let i = 0; i < 12; i++) {
      const period = 1.6;
      const phase = ((u + i * 0.27) % period) / period;
      const hx = PHONE_RIGHT - 42 + Math.sin(phase * Math.PI * 3 + i * 1.7) * 20;
      const hy = 625 - phase * 240;
      const hAlpha = smoothstep(0, 0.15, phase) * (1 - smoothstep(0.65, 1.0, phase));
      const hCol = i % 3 === 0 ? "#ff6b8b" : i % 3 === 1 ? "#fe2c55" : "#ffd166";
      drawHeart(g, hx, hy, 18 - phase * 4, hCol, null, hAlpha * 0.85);
    }

    // Right Interaction Rail (Fictional Geometric Icons)
    const railX = PHONE_RIGHT - 42;
    // Creator Avatar
    g.fill("#1d2330");
    g.stroke("#ffffff");
    g.strokeWeight(2);
    g.circle(railX, 540, 44);
    g.fill("#f5efe2");
    g.noStroke();
    g.textAlign("center", "center");
    g.textFont("Songti SC, serif");
    g.textStyle("bold");
    g.textSize(20);
    g.text("鹈", railX, 541);
    // Red follow badge
    g.fill("#fe2c55");
    g.circle(railX, 562, 18);
    g.fill("#ffffff");
    g.textFont("Helvetica Neue, sans-serif");
    g.textSize(14);
    g.text("+", railX, 562);

    // Heart Like Icon + Climbing Counter (bursts on u = 2.0s)
    const likeBeat = Math.floor(u * 2);
    const likeCount = (92.4 + likeBeat * 1.3 + smoothstep(1.9, 2.5, u) * 5.2).toFixed(1);
    const heartPulse = 1 + 0.16 * beat.beatPulse;
    drawHeart(g, railX, 620, 32 * heartPulse, u >= 1.95 ? "#fe2c55" : "#ffffff", null, 1);
    g.fill("#ffffff");
    g.textStyle("bold");
    g.textFont("Helvetica Neue, sans-serif");
    g.textSize(13);
    g.text(`${likeCount}w`, railX, 646);

    // Comment Bubble Icon
    g.fill("rgba(255,255,255,0.92)");
    g.ellipse(railX, 692, 30, 24);
    g.triangle(railX - 8, 700, railX - 13, 709, railX - 1, 702);
    g.fill("#1d2028");
    g.circle(railX - 7, 692, 3.5);
    g.circle(railX, 692, 3.5);
    g.circle(railX + 7, 692, 3.5);
    g.fill("#ffffff");
    g.text("5.8w", railX, 720);

    // Star Bookmark Icon (5-point polygon)
    g.push();
    g.translate(railX, 764);
    g.fill("#ffd166");
    g.beginShape();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rad = k % 2 === 0 ? 15 : 6.5;
      g.vertex(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.endShape("close");
    g.pop();
    g.fill("#ffffff");
    g.text("3.1w", railX, 790);

    // Share Arrow Icon
    g.stroke("#ffffff");
    g.strokeWeight(2.4);
    g.noFill();
    g.beginShape();
    g.vertex(railX - 10, 840);
    g.vertex(railX + 10, 830);
    g.vertex(railX + 2, 850);
    g.vertex(railX - 2, 842);
    g.endShape("close");
    g.noStroke();
    g.fill("#ffffff");
    g.text("8.4w", railX, 862);

    // Spinning Disc at bottom-right
    g.push();
    g.translate(railX, 926);
    g.rotate(u * 4.5);
    g.fill("#1f222a");
    g.stroke("#8892a4");
    g.strokeWeight(3);
    g.circle(0, 0, 38);
    g.fill("#fe2c55");
    g.noStroke();
    g.circle(0, 0, 14);
    g.fill("#ffffff");
    g.circle(5, 0, 3);
    g.pop();

    // Bottom Left Author & Caption
    g.fill("#ffffff");
    g.textAlign("left", "bottom");
    g.textFont("PingFang SC, Helvetica Neue, sans-serif");
    g.textStyle("bold");
    g.textSize(19);
    g.text("@城市迷惑行为实录", PHONE_LEFT + 18, 882);

    g.fill("#e9edf5");
    g.textStyle("normal");
    g.textSize(15.5);
    g.text("下班路上偶遇鹈鹕骑车，甚至比我还会卡点", PHONE_LEFT + 18, 912);
    g.fill("#a8d4ff");
    g.text("#鹈鹕测试  #人类迷惑行为  #120BPM", PHONE_LEFT + 18, 936);

    // Original music ticker
    g.fill("rgba(255,255,255,0.85)");
    g.textFont("Menlo, PingFang SC, sans-serif");
    g.textSize(13);
    g.text("◈ 原创配乐 - 鹈鹕骑行主旋律 (120BPM)", PHONE_LEFT + 18, 964);

    // Exact Beat-Locked Bottom Progress Bar: hits 100% right at u = 6.0s Portal 20 exit!
    const progress = clamp(u / SCENE_DUR, 0, 1);
    const barY = 990;
    g.noStroke();
    g.fill("rgba(255, 255, 255, 0.24)");
    g.rect(PHONE_LEFT, barY, PHONE_W, 6);
    g.fill("#fe2c55");
    g.rect(PHONE_LEFT, barY, PHONE_W * progress, 6);
    g.fill("#ffffff");
    g.circle(PHONE_LEFT + PHONE_W * progress, barY + 3, 12);

    // Timecode readout above progress bar right side
    g.fill("rgba(255, 255, 255, 0.72)");
    g.textAlign("right", "bottom");
    g.textFont("Menlo, monospace");
    g.textSize(11.5);
    const secStr = String(Math.min(6, Math.floor(u))).padStart(2, "0");
    g.text(`00:${secStr} / 00:06`, PHONE_RIGHT - 16, 982);

    g.pop(); // End UI alpha
  }

  dc.restore(); // End 9:16 clip

  // Pure black vertical sidebars closing in at Beat 2 (u = 0.48s)
  if (snap > 0.01) {
    g.noStroke();
    g.fill("#07080b");
    if (clipLeft > BLEED_LEFT) {
      g.rect(BLEED_LEFT - 10, 0, clipLeft - (BLEED_LEFT - 10), 1000);
    }
    if (clipRight < BLEED_RIGHT) {
      g.rect(clipRight, 0, BLEED_RIGHT + 10 - clipRight, 1000);
    }
    // Crisp subtle glass edge framing the 9:16 vertical screen
    g.stroke("rgba(255,255,255,0.16)");
    g.strokeWeight(2);
    g.line(clipLeft, 0, clipLeft, 1000);
    g.line(clipRight, 0, clipRight, 1000);
  }

  // Compact Title Card inside left black pillarbox (clear at 1080p, never blocks 9:16 screen)
  drawEraTitleCard(g, META, u);

  g.pop();
}
