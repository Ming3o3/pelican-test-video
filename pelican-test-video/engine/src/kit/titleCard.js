/**
 * Era-styled Title Card renderer (`src/kit/titleCard.js`).
 * Renders Chinese Name + English Name + Era inside [0..1000] x [0..1000] with era-bespoke
 * museum framing while guaranteeing crisp readability at 1080p.
 */

import { clamp, smoothstep } from "../beat.js";
import { drawRedSeal } from "./ink.js";

export function drawEraTitleCard(g, meta, localTime) {
  const fadeIn = smoothstep(0.06, 0.36, localTime);
  const fadeOut = 1 - smoothstep(5.45, 5.9, localTime);
  const alpha = clamp(fadeIn * fadeOut, 0, 1);
  if (alpha <= 0.01) return;

  const numStr = String(meta.num).padStart(2, "0");

  // Bespoke compact pill inside the left black pillarbox for #19 Vertical Short Video
  if (meta.family === "mobile") {
    g.push();
    g.translate(16, 36);
    g.drawingContext.globalAlpha = alpha;
    const w = 186;
    const h = 106;
    g.fill("rgba(22, 24, 30, 0.9)");
    g.stroke("#fe2c55");
    g.strokeWeight(1.8);
    g.rect(0, 0, w, h, 8);
    g.noStroke();
    g.fill("#fe2c55");
    g.rect(0, 0, 5, h, 8, 0, 0, 8);

    g.fill("#ff7992");
    g.textAlign("left", "top");
    g.textFont("Menlo, monospace");
    g.textSize(12);
    g.text(`#${numStr} · ${meta.era}`, 15, 13);

    g.fill("#f6f8fc");
    g.textFont("PingFang SC, Helvetica Neue, sans-serif");
    g.textStyle("bold");
    g.textSize(24);
    g.text(meta.zh, 15, 34);

    g.fill("#aeb7c6");
    g.textStyle("normal");
    g.textFont("Helvetica Neue, Arial, sans-serif");
    g.textSize(13);
    g.text(meta.en, 15, 72);
    g.pop();
    return;
  }

  // Bespoke weathered sandstone plaque for #01 Sahara Rock Art
  if (meta.family === "ochre") {
    g.push();
    const slideOffset = (1 - fadeIn) * -16;
    g.translate(34 + slideOffset, 32);
    g.drawingContext.globalAlpha = alpha;
    const cardW = 356;
    const cardH = 92;

    g.noStroke();
    g.fill(44, 18, 8, 120);
    g.rect(5, 6, cardW, cardH, 6);

    g.fill("rgba(76, 34, 17, 0.9)");
    g.stroke("#f0dec0");
    g.strokeWeight(2);
    g.rect(0, 0, cardW, cardH, 6);

    g.noFill();
    g.stroke("#c96b3b");
    g.strokeWeight(1.2);
    g.rect(5, 5, cardW - 10, cardH - 10, 4);

    // Prehistoric dot ornament
    g.fill("#f0dec0");
    g.noStroke();
    for (let dy = 20; dy <= 72; dy += 13) g.circle(16, dy, 4);

    g.fill("#f4b97a");
    g.textAlign("left", "top");
    g.textFont("Georgia, serif");
    g.textSize(14);
    g.text(`#${numStr} · ${meta.era} (${meta.eraEn})`, 30, 13);

    g.fill("#fbf3e4");
    g.textFont("Songti SC, STSong, serif");
    g.textStyle("bold");
    g.textSize(29);
    g.text(meta.zh, 30, 32);

    g.fill("#e2c7a4");
    g.textStyle("normal");
    g.textFont("Georgia, serif");
    g.textSize(15);
    g.text(meta.en, 31, 66);
    g.pop();
    return;
  }

  // Bespoke Chinese mounted scroll slip ("题签") for Ink eras (#03, #04, #05, #06, #09)
  if (meta.family === "ink") {
    g.push();
    const slideOffset = (1 - fadeIn) * -16;
    g.translate(34 + slideOffset, 32);
    g.drawingContext.globalAlpha = alpha;
    const cardW = 368;
    const cardH = 94;
    const isRubbing = meta.inkMode === "rubbing";

    g.noStroke();
    g.fill(0, 0, 0, isRubbing ? 140 : 65);
    g.rect(4, 5, cardW, cardH, 2);

    // Brocade mounting border
    g.fill(isRubbing ? "#252320" : "#5a4631");
    g.stroke(isRubbing ? "#c93b2b" : "#3a2c1e");
    g.strokeWeight(1.5);
    g.rect(0, 0, cardW, cardH, 2);

    // Ivory paper slip inside brocade
    g.fill(isRubbing ? "#1b1a17" : "#f7efe0");
    g.noStroke();
    g.rect(6, 6, cardW - 12, cardH - 12, 1);

    // Tiny collector red seal on right side of title slip
    drawRedSeal(g, cardW - 28, cardH / 2, "鹈", 28, meta.accent || "#992e24", "baiwen");

    g.fill(meta.accent || "#992e24");
    g.textAlign("left", "top");
    g.textFont("Georgia, serif");
    g.textSize(13.5);
    g.text(`#${numStr} · ${meta.era} (${meta.eraEn})`, 18, 14);

    g.fill(isRubbing ? "#f2ede2" : "#1a1815");
    g.textFont("Songti SC, STSong, serif");
    g.textStyle("bold");
    g.textSize(29);
    g.text(meta.zh, 18, 33);

    g.fill(isRubbing ? "#bcb4a4" : "#5b5143");
    g.textStyle("normal");
    g.textFont("Georgia, serif");
    g.textSize(14.5);
    g.text(meta.en, 19, 67);
    g.pop();
    return;
  }

  // Bespoke 8-bit Pixel Platformer plaque (#16)
  if (meta.family === "pixel") {
    g.push();
    const slideOffset = Math.round((1 - fadeIn) * -16);
    g.translate(34 + slideOffset, 32);
    g.drawingContext.globalAlpha = alpha;
    const w = 368;
    const h = 92;

    // Hard pixel drop shadow
    g.noStroke();
    g.fill(4, 8, 22, 185);
    g.rect(6, 6, w, h);

    // Outer navy body + crisp gold/white double pixel frame
    g.fill("#0e152d");
    g.stroke("#f7c73b");
    g.strokeWeight(3);
    g.rect(0, 0, w, h);

    g.noFill();
    g.stroke("#ffffff");
    g.strokeWeight(1.5);
    g.rect(5, 5, w - 10, h - 10);

    // 4 pixel corner rivets
    g.noStroke();
    g.fill("#f7c73b");
    for (const [rx, ry] of [[8, 8], [w - 14, 8], [8, h - 14], [w - 14, h - 14]]) {
      g.rect(rx, ry, 6, 6);
    }

    // Stepped pixel diamond-coin badge on right
    const bx = w - 34;
    const by = h / 2;
    g.fill("#d97e1e");
    g.rect(bx - 12, by - 9, 24, 18);
    g.rect(bx - 9, by - 12, 18, 24);
    g.fill("#f7c73b");
    g.rect(bx - 9, by - 9, 18, 18);
    g.rect(bx - 6, by - 12, 12, 24);
    g.fill("#fff4a3");
    g.rect(bx - 3, by - 6, 6, 12);

    g.fill("#f7c73b");
    g.textAlign("left", "top");
    g.textFont("Menlo, Monaco, monospace");
    g.textSize(13);
    g.text(`#${numStr} · ${meta.era} (${meta.eraEn})`, 22, 13);

    g.fill("#ffffff");
    g.textFont("PingFang SC, Menlo, monospace");
    g.textStyle("bold");
    g.textSize(27);
    g.text(meta.zh, 22, 32);

    g.fill("#8ce4ff");
    g.textStyle("normal");
    g.textFont("Menlo, Monaco, monospace");
    g.textSize(14);
    g.text(meta.en, 22, 66);
    g.pop();
    return;
  }

  // Bespoke 2000s 3D Raised Bevel Dialog Box (#17)
  if (meta.family === "ui2000") {
    g.push();
    const slideOffset = (1 - fadeIn) * -16;
    g.translate(34 + slideOffset, 32);
    g.drawingContext.globalAlpha = alpha;
    const dc = g.drawingContext;
    const w = 368;
    const h = 94;

    // Shadow & classic 3D raised bevel window body
    g.noStroke();
    g.fill(20, 32, 54, 78);
    g.rect(4, 5, w, h);

    g.fill("#dce4f0");
    g.stroke("#2b3648");
    g.strokeWeight(1.5);
    g.rect(0, 0, w, h);

    // Light top/left highlight & dark bottom/right inner bevel
    g.stroke("#ffffff");
    g.strokeWeight(2);
    g.line(2, 2, w - 3, 2);
    g.line(2, 2, 2, h - 3);
    g.stroke("#68778d");
    g.line(2, h - 2, w - 2, h - 2);
    g.line(w - 2, 2, w - 2, h - 2);

    // Classic blue gradient title bar across top
    const barGrad = dc.createLinearGradient(4, 4, w - 4, 4);
    barGrad.addColorStop(0, "#1e4b8f");
    barGrad.addColorStop(1, "#4d84d6");
    dc.fillStyle = barGrad;
    dc.fillRect(4, 4, w - 8, 22);

    // Miniature [_][□][×] bevelled caption buttons
    for (let i = 0; i < 3; i++) {
      const bx = w - 60 + i * 18;
      const by = 7;
      g.noStroke();
      g.fill("#dce4f0");
      g.rect(bx, by, 15, 15);
      g.stroke("#ffffff");
      g.strokeWeight(1);
      g.line(bx, by, bx + 14, by);
      g.line(bx, by, bx, by + 14);
      g.stroke("#4a5870");
      g.line(bx, by + 14, bx + 14, by + 14);
      g.line(bx + 14, by, bx + 14, by + 14);
      g.stroke("#182b49");
      g.strokeWeight(1.4);
      if (i === 0) {
        g.line(bx + 3, by + 11, bx + 11, by + 11);
      } else if (i === 1) {
        g.noFill();
        g.rect(bx + 3.5, by + 3.5, 8, 8);
      } else {
        g.line(bx + 4, by + 4, bx + 11, by + 11);
        g.line(bx + 11, by + 4, bx + 4, by + 11);
      }
    }

    g.noStroke();
    g.fill("#ffffff");
    g.textAlign("left", "top");
    g.textFont("Helvetica Neue, Arial, sans-serif");
    g.textStyle("bold");
    g.textSize(12.5);
    g.text(`#${numStr} · ${meta.era} (${meta.eraEn})`, 11, 8);

    g.fill("#14243d");
    g.textFont("PingFang SC, Helvetica Neue, sans-serif");
    g.textStyle("bold");
    g.textSize(27);
    g.text(meta.zh, 14, 33);

    g.fill("#445670");
    g.textStyle("normal");
    g.textFont("Helvetica Neue, Arial, sans-serif");
    g.textSize(14);
    g.text(meta.en, 15, 68);
    g.pop();
    return;
  }

  // Bespoke 2010s Vaporwave Neon Plaque (#18)
  if (meta.family === "vapor") {
    g.push();
    const slideOffset = (1 - fadeIn) * -16;
    g.translate(34 + slideOffset, 32);
    g.drawingContext.globalAlpha = alpha;
    const dc = g.drawingContext;
    const w = 368;
    const h = 92;

    g.noStroke();
    g.fill(10, 2, 24, 155);
    g.rect(5, 6, w, h, 4);

    g.fill("rgba(24, 9, 46, 0.92)");
    g.stroke("#4cf2ea");
    g.strokeWeight(2.4);
    g.rect(0, 0, w, h, 4);

    g.noFill();
    g.stroke("#ff5ac8");
    g.strokeWeight(1.4);
    g.rect(5, 5, w - 10, h - 10, 2);

    // Miniature horizontal-striped retro sunset badge on right
    const sx = w - 34;
    const sy = h / 2;
    const sr = 18;
    dc.save();
    dc.beginPath();
    dc.arc(sx, sy, sr, 0, Math.PI * 2);
    dc.clip();
    const sunG = dc.createLinearGradient(sx, sy - sr, sx, sy + sr);
    sunG.addColorStop(0, "#ffe46b");
    sunG.addColorStop(0.55, "#ff7b54");
    sunG.addColorStop(1, "#ff2ca8");
    dc.fillStyle = sunG;
    dc.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    dc.fillStyle = "rgba(24, 9, 46, 0.92)";
    for (const [cy, ch] of [[sy + 2, 2], [sy + 7, 2.5], [sy + 12, 3]]) {
      dc.fillRect(sx - sr, cy, sr * 2, ch);
    }
    dc.restore();

    g.noStroke();
    g.fill("#4cf2ea");
    g.textAlign("left", "top");
    g.textFont("Helvetica Neue, Arial, sans-serif");
    g.textSize(13.5);
    g.text(`#${numStr} · ${meta.era} (${meta.eraEn})`, 18, 13);

    g.fill("#fff0fb");
    g.textFont("PingFang SC, Helvetica Neue, sans-serif");
    g.textStyle("bold");
    g.textSize(28);
    g.text(meta.zh, 18, 32);

    g.fill("#ff8be0");
    g.textStyle("normal");
    g.textFont("Helvetica Neue, Arial, sans-serif");
    g.textSize(14.5);
    g.text(meta.en, 19, 66);
    g.pop();
    return;
  }

  // Bespoke 2020s Dark IDE Tab Plaque (#20)
  if (meta.family === "editor") {
    g.push();
    const slideOffset = (1 - fadeIn) * -16;
    g.translate(34 + slideOffset, 32);
    g.drawingContext.globalAlpha = alpha;
    const w = 368;
    const h = 92;

    g.noStroke();
    g.fill(0, 0, 0, 140);
    g.rect(4, 5, w, h, 6);

    g.fill("#161b22");
    g.stroke("#30363d");
    g.strokeWeight(1.8);
    g.rect(0, 0, w, h, 6);

    // Active IDE tab blue top bar
    g.noStroke();
    g.fill("#79c0ff");
    g.rect(0, 0, w, 3.5, 6, 6, 0, 0);

    // Subtle traffic-light status dots & right "</>" chip
    for (let i = 0; i < 3; i++) {
      g.fill(["#ff7b72", "#f2cc60", "#7ee787"][i]);
      g.circle(w - 66 + i * 11, 18, 6);
    }
    g.fill("#21262d");
    g.stroke("#30363d");
    g.strokeWeight(1);
    g.rect(w - 72, 38, 54, 28, 4);
    g.noStroke();
    g.fill("#79c0ff");
    g.textAlign("center", "center");
    g.textFont("Menlo, Monaco, monospace");
    g.textStyle("bold");
    g.textSize(14);
    g.text("</>", w - 45, 52);

    g.fill("#7ee787");
    g.textAlign("left", "top");
    g.textFont("Menlo, Monaco, monospace");
    g.textStyle("normal");
    g.textSize(13);
    g.text(`#${numStr} · ${meta.era}`, 18, 13);

    g.fill("#e6edf3");
    g.textFont("PingFang SC, Menlo, monospace");
    g.textStyle("bold");
    g.textSize(28);
    g.text(meta.zh, 18, 32);

    g.fill("#8b949e");
    g.textStyle("normal");
    g.textFont("Menlo, Monaco, monospace");
    g.textSize(14);
    g.text(meta.en, 19, 66);
    g.pop();
    return;
  }

  // Bespoke Batch 3B & 3C era plaques
  const ERA_CARD_STYLES = {
    fresco: {
      x: 34,
      y: 32,
      w: 364,
      h: 92,
      bg: "rgba(235, 212, 162, 0.94)",
      outer: "#1f5a73",
      inner: "#b44329",
      eraCol: "#1f5a73",
      titleCol: "#1f1912",
      subCol: "#5e4830",
      badge: "sun",
    },
    codex: {
      x: 34,
      y: 32,
      w: 360,
      h: 92,
      bg: "rgba(230, 214, 182, 0.94)",
      outer: "#a83324",
      inner: "#287c8c",
      eraCol: "#a83324",
      titleCol: "#221a14",
      subCol: "#4f3e2e",
      badge: "step",
    },
    miniature: {
      x: 52,
      y: 46,
      w: 356,
      h: 90,
      bg: "rgba(246, 232, 202, 0.94)",
      outer: "#c9922b",
      inner: "#1f4788",
      eraCol: "#962834",
      titleCol: "#221923",
      subCol: "#5a4636",
      badge: "gold",
    },
    shadow: {
      x: 34,
      y: 32,
      w: 360,
      h: 92,
      bg: "rgba(28, 17, 10, 0.9)",
      outer: "#d6943a",
      inner: "#9e2d20",
      eraCol: "#f2ba5a",
      titleCol: "#fae9c8",
      subCol: "#d4b484",
      badge: "rivets",
      dark: true,
    },
    woodblock: {
      x: 34,
      y: 32,
      w: 360,
      h: 92,
      bg: "rgba(246, 235, 212, 0.93)",
      outer: "#1d3f66",
      inner: "#c84630",
      eraCol: "#c84630",
      titleCol: "#16202e",
      subCol: "#485666",
      badge: "tanzaku",
    },
    impasto: {
      x: 34,
      y: 32,
      w: 362,
      h: 92,
      bg: "rgba(16, 30, 64, 0.9)",
      outer: "#f4ce52",
      inner: "#5b8bd9",
      eraCol: "#f4ce52",
      titleCol: "#f7f3e4",
      subCol: "#b4ccf2",
      badge: "star",
      dark: true,
    },
    expressionist: {
      x: 34,
      y: 32,
      w: 362,
      h: 92,
      bg: "rgba(26, 22, 34, 0.9)",
      outer: "#d9532f",
      inner: "#f0a943",
      eraCol: "#f0a943",
      titleCol: "#f7efe4",
      subCol: "#e0b392",
      badge: "wave",
      dark: true,
    },
    silentfilm: {
      x: 34,
      y: 32,
      w: 364,
      h: 92,
      bg: "rgba(14, 14, 12, 0.92)",
      outer: "#e4decb",
      inner: "#8c8676",
      eraCol: "#c9c2ae",
      titleCol: "#f6f2e6",
      subCol: "#b8b19e",
      badge: "intertitle",
      dark: true,
    },
    crt: {
      x: 34,
      y: 32,
      w: 368,
      h: 92,
      bg: "rgba(5, 14, 9, 0.92)",
      outer: "#42ff7a",
      inner: "#1f7a3c",
      eraCol: "#82ffa8",
      titleCol: "#c8ffd8",
      subCol: "#68cf88",
      badge: "crtRivets",
      fontTitle: "PingFang SC, Menlo, monospace",
      fontSub: "Menlo, Monaco, monospace",
      dark: true,
    },
  };

  if (ERA_CARD_STYLES[meta.family]) {
    const st = ERA_CARD_STYLES[meta.family];
    g.push();
    const slideOffset = (1 - fadeIn) * -16;
    g.translate(st.x + slideOffset, st.y);
    g.drawingContext.globalAlpha = alpha;

    g.noStroke();
    g.fill(0, 0, 0, st.dark ? 130 : 65);
    g.rect(4, 5, st.w, st.h, 3);

    g.fill(st.bg);
    g.stroke(st.outer);
    g.strokeWeight(2.4);
    g.rect(0, 0, st.w, st.h, 3);

    g.noFill();
    g.stroke(st.inner);
    g.strokeWeight(1.4);
    g.rect(5, 5, st.w - 10, st.h - 10, 2);

    if (st.badge === "sun") {
      g.fill("#d49635");
      g.stroke("#9c351e");
      g.strokeWeight(1.3);
      g.circle(st.w - 28, st.h / 2, 22);
      g.noFill();
      g.stroke("#1f5a73");
      g.circle(st.w - 28, st.h / 2, 8);
    } else if (st.badge === "step") {
      g.fill("#287c8c");
      g.noStroke();
      g.rect(10, 12, 6, st.h - 24);
      g.fill("#a83324");
      g.rect(10, 12, 6, 16);
      g.rect(10, st.h - 28, 6, 16);
    } else if (st.badge === "rivets" || st.badge === "crtRivets") {
      g.fill(st.badge === "crtRivets" ? "#42ff7a" : "#e0a64b");
      g.noStroke();
      for (const [rx, ry] of [[12, 12], [st.w - 12, 12], [12, st.h - 12], [st.w - 12, st.h - 12]]) {
        g.circle(rx, ry, 4.5);
      }
    } else if (st.badge === "gold") {
      g.fill("#d19b38");
      g.noStroke();
      g.circle(st.w - 26, st.h / 2, 16);
      g.fill("#962834");
      g.circle(st.w - 26, st.h / 2, 7);
    } else if (st.badge === "tanzaku" || st.badge === "wave") {
      g.fill(st.badge === "wave" ? "#f0a943" : "#c84630");
      g.noStroke();
      g.rect(10, 10, 5, st.h - 20);
    } else if (st.badge === "star") {
      g.fill("rgba(244, 206, 82, 0.25)");
      g.noStroke();
      g.circle(st.w - 28, st.h / 2, 26);
      g.fill("#f7df74");
      g.circle(st.w - 28, st.h / 2, 10);
    } else if (st.badge === "intertitle") {
      g.stroke("#e4decb");
      g.strokeWeight(1.5);
      g.noFill();
      for (const [cx, cy, sx, sy] of [[10, 10, 1, 1], [st.w - 10, 10, -1, 1], [10, st.h - 10, 1, -1], [st.w - 10, st.h - 10, -1, -1]]) {
        g.line(cx, cy, cx + sx * 10, cy);
        g.line(cx, cy, cx, cy + sy * 10);
      }
    }

    const tx = ["step", "tanzaku", "wave"].includes(st.badge) ? 24 : 18;
    g.fill(st.eraCol);
    g.textAlign("left", "top");
    g.textFont(st.fontSub || "Georgia, serif");
    g.textSize(13.5);
    g.text(`#${numStr} · ${meta.era} (${meta.eraEn})`, tx, 13);

    g.fill(st.titleCol);
    g.textFont(st.fontTitle || "Songti SC, STSong, serif");
    g.textStyle("bold");
    g.textSize(29);
    g.text(meta.zh, tx, 32);

    g.fill(st.subCol);
    g.textStyle("normal");
    g.textFont(st.fontSub || "Georgia, serif");
    g.textSize(14.5);
    g.text(meta.en, tx + 1, 66);
    g.pop();
    return;
  }

  // Clean general era card for remaining Stage 1 / Stage 3 eras
  const isDarkBg = [
    "impasto",
    "silentfilm",
    "crt",
    "pixel",
    "vapor",
    "editor",
  ].includes(meta.family);

  const cardBg = isDarkBg ? "rgba(14, 16, 20, 0.8)" : "rgba(250, 244, 232, 0.88)";
  const borderCol = meta.accent || meta.fg;
  const titleCol = isDarkBg ? "#f6f2e8" : "#1b1814";
  const subCol = isDarkBg ? "#cbd3df" : "#51473b";

  let fontTitle = "Songti SC, STSong, PingFang SC, serif";
  let fontSub = "Georgia, serif";
  if (meta.family === "crt" || meta.family === "editor" || meta.family === "pixel") {
    fontTitle = "PingFang SC, Menlo, monospace";
    fontSub = "Menlo, Monaco, monospace";
  } else if (meta.family === "ui2000" || meta.family === "vapor") {
    fontTitle = "PingFang SC, Helvetica Neue, sans-serif";
    fontSub = "Helvetica Neue, Arial, sans-serif";
  }

  g.push();
  const slideOffset = (1 - fadeIn) * -18;
  g.translate(36 + slideOffset, 34);
  g.drawingContext.globalAlpha = alpha;

  const cardW = 360;
  const cardH = 92;

  g.noStroke();
  g.fill(0, 0, 0, isDarkBg ? 120 : 55);
  g.rect(4, 5, cardW, cardH, 4);

  g.fill(cardBg);
  g.stroke(borderCol);
  g.strokeWeight(2);
  g.rect(0, 0, cardW, cardH, 4);

  g.noStroke();
  g.fill(borderCol);
  g.rect(0, 0, 7, cardH, 4, 0, 0, 4);

  g.fill(borderCol);
  g.textAlign("left", "top");
  g.textFont(fontSub);
  g.textSize(14);
  g.text(`#${numStr} · ${meta.era} (${meta.eraEn})`, 20, 12);

  g.fill(titleCol);
  g.textFont(fontTitle);
  g.textStyle("bold");
  g.textSize(29);
  g.text(meta.zh, 20, 32);

  g.fill(subCol);
  g.textStyle("normal");
  g.textFont(fontSub);
  g.textSize(15);
  g.text(meta.en, 21, 66);

  g.pop();
}
