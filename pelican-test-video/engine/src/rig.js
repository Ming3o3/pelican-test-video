/**
 * Parametric Pelican + Bicycle Skeleton Rig (`src/rig.js`).
 * Pure function `getRigPose(t, opts)` returns exact joint coordinates & angles so every era
 * can render the same continuous motion in its own artistic medium.
 */

function solveTwoBoneIK(ax, ay, tx, ty, L1, L2, bendDir = 1) {
  const dx = tx - ax;
  const dy = ty - ay;
  const rawDist = Math.hypot(dx, dy) || 0.001;
  const minDist = Math.abs(L1 - L2) + 2;
  const maxDist = L1 + L2 - 2;
  const d = Math.max(minDist, Math.min(maxDist, rawDist));

  const baseAngle = Math.atan2(dy, dx);
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const clampedCos = Math.max(-1, Math.min(1, cosA));
  const bendAngle = Math.acos(clampedCos);
  // bendDir = -1 bends knee forward (+x when pointing down in screen coords)
  const theta1 = baseAngle + bendDir * bendAngle;

  const kx = ax + Math.cos(theta1) * L1;
  const ky = ay + Math.sin(theta1) * L1;
  return { x: kx, y: ky };
}

function cubicBezierPt(p0, p1, p2, p3, s) {
  const u = 1 - s;
  return {
    x: u * u * u * p0.x + 3 * u * u * s * p1.x + 3 * u * s * s * p2.x + s * s * s * p3.x,
    y: u * u * u * p0.y + 3 * u * u * s * p1.y + 3 * u * s * s * p2.y + s * s * s * p3.y,
  };
}

/**
 * Computes full pelican + bicycle skeleton in scene coordinates.
 * @param {number} t - Animation time (seconds).
 * @param {object} opts
 * @param {number} opts.x - Ground contact center X in scene units.
 * @param {number} opts.y - Road Y in scene units (typically 730).
 * @param {number} [opts.scale=1] - Uniform rig scale.
 * @param {number} [opts.pedalPhase] - Optional override for pedal angle (default 2*PI*t).
 * @param {number} [opts.lean=0] - Extra torso/frame tilt radians.
 * @param {number} [opts.wheelie=0] - Optional front-wheel lift angle (e.g. jumps).
 * @param {number} [opts.poseMode=0] - Optional stylistic nod/bounce factor.
 */
export function getRigPose(t, opts = {}) {
  const x = opts.x ?? 500;
  const y = opts.y ?? 730;
  const scale = opts.scale ?? 1;
  const pedalAngle = opts.pedalPhase ?? t * Math.PI * 2;
  const beatAngle = t * Math.PI * 2;
  const lean = opts.lean ?? 0;
  const wheelie = opts.wheelie ?? 0;

  // Helpers converting local rig offsets (origin at ground beneath bike center) to scene space
  const pt = (lx, ly) => {
    const rx = lx * Math.cos(wheelie) - ly * Math.sin(wheelie);
    const ry = lx * Math.sin(wheelie) + ly * Math.cos(wheelie);
    return { x: x + rx * scale, y: y + ry * scale };
  };

  const R = 62;
  const rearHubLocal = { x: -86, y: -R };
  const frontHubLocal = { x: 86, y: -R };
  const bbLocal = { x: -16, y: -58 };
  const seatClusterLocal = { x: -45, y: -126 };
  const headTopLocal = { x: 52, y: -142 };
  const headBotLocal = { x: 60, y: -116 };
  const stemTopLocal = { x: 48, y: -158 };
  const barGripLocal = { x: 26, y: -156 };
  const saddleRearLocal = { x: -64, y: -136 };
  const saddleFrontLocal = { x: -30, y: -134 };

  // Wheel rotation directly linked to horizontal road distance x
  const wheelRot = x / (R * scale);

  // Crank pedals
  const crankLen = 24;
  const rightPedalLocal = {
    x: bbLocal.x + Math.cos(pedalAngle) * crankLen,
    y: bbLocal.y + Math.sin(pedalAngle) * crankLen,
  };
  const leftPedalLocal = {
    x: bbLocal.x + Math.cos(pedalAngle + Math.PI) * crankLen,
    y: bbLocal.y + Math.sin(pedalAngle + Math.PI) * crankLen,
  };

  // Beat-synced torso bounce & throat pouch spring
  const bounce = -4.5 * Math.abs(Math.sin(pedalAngle));
  const headNod = 3.5 * Math.sin(beatAngle * 2 - 0.5);
  const pouchBob = 4.5 * Math.sin(beatAngle * 2 - 1.0);

  const hipLocal = { x: -46 + lean * 12, y: -144 + bounce };
  const bodyCenterLocal = { x: hipLocal.x - 8, y: hipLocal.y - 32 };
  const tailTipLocal = { x: bodyCenterLocal.x - 56, y: bodyCenterLocal.y + 8 + bounce * 0.4 };
  const shoulderLocal = { x: bodyCenterLocal.x + 14, y: bodyCenterLocal.y - 8 };

  // Two-bone leg IK (bendDir = -1 keeps knee bent forward toward handlebars)
  const L1 = 62;
  const L2 = 62;
  const rightKneeLocal = solveTwoBoneIK(
    hipLocal.x,
    hipLocal.y,
    rightPedalLocal.x,
    rightPedalLocal.y,
    L1,
    L2,
    -1
  );
  const leftKneeLocal = solveTwoBoneIK(
    hipLocal.x - 4,
    hipLocal.y - 2,
    leftPedalLocal.x,
    leftPedalLocal.y,
    L1,
    L2,
    -1
  );

  // Neck S-curve from upper chest to head
  const neckBaseLocal = { x: bodyCenterLocal.x + 22, y: bodyCenterLocal.y - 20 };
  const headLocal = { x: bodyCenterLocal.x + 36 + lean * 18, y: bodyCenterLocal.y - 88 + headNod };
  const neckC1 = { x: neckBaseLocal.x + 14, y: neckBaseLocal.y - 28 };
  const neckC2 = { x: headLocal.x - 16, y: headLocal.y + 24 };
  const neckCurve = [0, 0.25, 0.5, 0.75, 1].map((s) =>
    pt(...Object.values(cubicBezierPt(neckBaseLocal, neckC1, neckC2, headLocal, s)))
  );

  // Beak + large iconic Pelican throat pouch
  const beakBaseTopLocal = { x: headLocal.x + 14, y: headLocal.y - 11 };
  const beakTipLocal = { x: headLocal.x + 114, y: headLocal.y + 12 };
  const beakHookLocal = { x: headLocal.x + 117, y: headLocal.y + 20 };
  const pouchMidLocal = { x: headLocal.x + 56, y: headLocal.y + 52 + pouchBob };
  const pouchBaseLocal = { x: headLocal.x + 6, y: headLocal.y + 18 };
  const eyeLocal = { x: headLocal.x + 6, y: headLocal.y - 6 };
  const crest1Local = { x: headLocal.x - 24, y: headLocal.y - 18 + headNod * 0.6 };
  const crest2Local = { x: headLocal.x - 18, y: headLocal.y - 25 + headNod * 0.4 };

  // Wing reaching gracefully to handlebars
  const wingElbowLocal = {
    x: (shoulderLocal.x + barGripLocal.x) * 0.45 - 6,
    y: (shoulderLocal.y + barGripLocal.y) * 0.5 + 14,
  };

  return {
    x,
    y,
    scale,
    wheelRadius: R * scale,
    wheelRot,
    pedalAngle,
    rearHub: pt(rearHubLocal.x, rearHubLocal.y),
    frontHub: pt(frontHubLocal.x, frontHubLocal.y),
    bb: pt(bbLocal.x, bbLocal.y),
    seatCluster: pt(seatClusterLocal.x, seatClusterLocal.y),
    headTop: pt(headTopLocal.x, headTopLocal.y),
    headBot: pt(headBotLocal.x, headBotLocal.y),
    stemTop: pt(stemTopLocal.x, stemTopLocal.y),
    barGrip: pt(barGripLocal.x, barGripLocal.y),
    bellPos: pt(barGripLocal.x + 14, barGripLocal.y - 8),
    saddleRear: pt(saddleRearLocal.x, saddleRearLocal.y),
    saddleFront: pt(saddleFrontLocal.x, saddleFrontLocal.y),
    rightPedal: pt(rightPedalLocal.x, rightPedalLocal.y),
    leftPedal: pt(leftPedalLocal.x, leftPedalLocal.y),
    rightKnee: pt(rightKneeLocal.x, rightKneeLocal.y),
    leftKnee: pt(leftKneeLocal.x, leftKneeLocal.y),
    hip: pt(hipLocal.x, hipLocal.y),
    bodyCenter: pt(bodyCenterLocal.x, bodyCenterLocal.y),
    tailTip: pt(tailTipLocal.x, tailTipLocal.y),
    shoulder: pt(shoulderLocal.x, shoulderLocal.y),
    wingElbow: pt(wingElbowLocal.x, wingElbowLocal.y),
    neckBase: pt(neckBaseLocal.x, neckBaseLocal.y),
    neckCurve,
    head: pt(headLocal.x, headLocal.y),
    eye: pt(eyeLocal.x, eyeLocal.y),
    beakBaseTop: pt(beakBaseTopLocal.x, beakBaseTopLocal.y),
    beakTip: pt(beakTipLocal.x, beakTipLocal.y),
    beakHook: pt(beakHookLocal.x, beakHookLocal.y),
    pouchMid: pt(pouchMidLocal.x, pouchMidLocal.y),
    pouchBase: pt(pouchBaseLocal.x, pouchBaseLocal.y),
    crest1: pt(crest1Local.x, crest1Local.y),
    crest2: pt(crest2Local.x, crest2Local.y),
  };
}

/**
 * Clean illustrative vector/brush renderer used in Stage 1 placeholders and Intro sketch.
 * Style-specific scenes in Stages 2 & 3 supply custom drawers consuming `pose`.
 */
export function drawRig2D(g, pose, palette = {}) {
  const s = pose.scale;
  const frameCol = palette.frame || "#2d3436";
  const tireCol = palette.tire || "#1e2124";
  const featherCol = palette.feather || "#faf5ea";
  const featherShade = palette.featherShade || "#dfd6c5";
  const beakCol = palette.beak || "#e89830";
  const pouchCol = palette.pouch || "#f3b34c";
  const legCol = palette.leg || "#d97b24";
  const outline = palette.outline || "#1d1a16";
  const silhouette = Boolean(palette.silhouette);

  const drawWheel = (hub, alpha = 1) => {
    g.push();
    g.translate(hub.x, hub.y);
    g.noFill();
    g.stroke(tireCol);
    g.strokeWeight(5.5 * s);
    g.circle(0, 0, pose.wheelRadius * 2);

    g.stroke(silhouette ? tireCol : frameCol);
    g.strokeWeight(1.8 * s);
    for (let i = 0; i < 8; i++) {
      const a = pose.wheelRot + (i * Math.PI) / 4;
      g.line(0, 0, Math.cos(a) * (pose.wheelRadius - 3 * s), Math.sin(a) * (pose.wheelRadius - 3 * s));
    }
    g.fill(frameCol);
    g.noStroke();
    g.circle(0, 0, 10 * s);
    g.pop();
    void alpha;
  };

  // Back leg & pedal (behind frame)
  g.push();
  g.strokeCap("round");
  g.strokeJoin("round");
  g.noFill();
  g.stroke(silhouette ? outline : "#b86319");
  g.strokeWeight(7 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.leftKnee.x, pose.leftKnee.y);
  g.vertex(pose.leftPedal.x, pose.leftPedal.y);
  g.endShape();

  // Rear crank
  g.stroke(frameCol);
  g.strokeWeight(3.5 * s);
  g.line(pose.bb.x, pose.bb.y, pose.leftPedal.x, pose.leftPedal.y);

  // Wheels
  drawWheel(pose.rearHub);
  drawWheel(pose.frontHub);

  // Bicycle frame
  g.stroke(frameCol);
  g.strokeWeight(5 * s);
  g.noFill();
  g.line(pose.rearHub.x, pose.rearHub.y, pose.bb.x, pose.bb.y);
  g.line(pose.rearHub.x, pose.rearHub.y, pose.seatCluster.x, pose.seatCluster.y);
  g.line(pose.bb.x, pose.bb.y, pose.seatCluster.x, pose.seatCluster.y);
  g.line(pose.seatCluster.x, pose.seatCluster.y, pose.headTop.x, pose.headTop.y);
  g.line(pose.bb.x, pose.bb.y, pose.headBot.x, pose.headBot.y);
  g.line(pose.frontHub.x, pose.frontHub.y, pose.headTop.x, pose.headTop.y);
  g.line(pose.headTop.x, pose.headTop.y, pose.stemTop.x, pose.stemTop.y);
  g.line(pose.stemTop.x, pose.stemTop.y, pose.barGrip.x, pose.barGrip.y);

  // Seatpost & saddle
  g.line(pose.seatCluster.x, pose.seatCluster.y, (pose.saddleRear.x + pose.saddleFront.x) / 2, pose.saddleRear.y + 3 * s);
  g.stroke(outline);
  g.strokeWeight(7 * s);
  g.line(pose.saddleRear.x, pose.saddleRear.y, pose.saddleFront.x, pose.saddleFront.y);

  // Chainring & bell
  g.fill(frameCol);
  g.noStroke();
  g.circle(pose.bb.x, pose.bb.y, 18 * s);
  if (!silhouette) {
    g.fill(beakCol);
    g.circle(pose.bellPos.x, pose.bellPos.y, 9 * s);
  }

  const drawBezierPath = (fillCol, strokeCol, strokeW, drawFn) => {
    const dc = g.drawingContext;
    dc.save();
    dc.beginPath();
    drawFn(dc);
    if (fillCol) {
      dc.fillStyle = fillCol;
      dc.fill();
    }
    if (strokeCol && strokeW > 0) {
      dc.strokeStyle = strokeCol;
      dc.lineWidth = strokeW;
      dc.lineJoin = "round";
      dc.lineCap = "round";
      dc.stroke();
    }
    dc.restore();
  };

  // Pelican body & tail
  drawBezierPath(silhouette ? outline : featherCol, outline, 2.5 * s, (dc) => {
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
  });

  // S-curve neck
  g.noFill();
  g.stroke(outline);
  g.strokeWeight(23 * s);
  g.beginShape();
  for (const p of pose.neckCurve) g.vertex(p.x, p.y);
  g.endShape();

  g.stroke(silhouette ? outline : featherCol);
  g.strokeWeight(18 * s);
  g.beginShape();
  for (const p of pose.neckCurve) g.vertex(p.x, p.y);
  g.endShape();

  // Head + crest tufts
  g.fill(silhouette ? outline : featherCol);
  g.stroke(outline);
  g.strokeWeight(2.5 * s);
  g.beginShape();
  g.vertex(pose.crest1.x, pose.crest1.y);
  g.vertex(pose.head.x - 6 * s, pose.head.y - 16 * s);
  g.vertex(pose.crest2.x, pose.crest2.y);
  g.vertex(pose.head.x + 6 * s, pose.head.y - 17 * s);
  g.endShape();
  g.circle(pose.head.x, pose.head.y, 34 * s);

  // Throat pouch (large curved pelican sac)
  drawBezierPath(silhouette ? outline : pouchCol, outline, 2.5 * s, (dc) => {
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
  });

  // Upper mandible + hook
  g.fill(silhouette ? outline : beakCol);
  g.stroke(outline);
  g.strokeWeight(2.5 * s);
  g.beginShape();
  g.vertex(pose.beakBaseTop.x, pose.beakBaseTop.y);
  g.vertex(pose.beakTip.x, pose.beakTip.y);
  g.vertex(pose.beakHook.x, pose.beakHook.y);
  g.vertex(pose.beakTip.x - 5 * s, pose.beakTip.y + 6 * s);
  g.vertex(pose.beakBaseTop.x, pose.beakBaseTop.y + 13 * s);
  g.endShape("close");

  // Eye
  if (!silhouette) {
    g.fill("#ffffff");
    g.stroke(outline);
    g.strokeWeight(1.8 * s);
    g.circle(pose.eye.x, pose.eye.y, 10 * s);
    g.fill("#141414");
    g.noStroke();
    g.circle(pose.eye.x + 1.5 * s, pose.eye.y, 4.5 * s);
  }

  // Wing reaching to handlebars
  drawBezierPath(silhouette ? outline : featherShade, outline, 2.4 * s, (dc) => {
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
  });

  // Front leg & crank (in front of frame)
  g.noFill();
  g.stroke(silhouette ? outline : legCol);
  g.strokeWeight(7.5 * s);
  g.beginShape();
  g.vertex(pose.hip.x, pose.hip.y);
  g.vertex(pose.rightKnee.x, pose.rightKnee.y);
  g.vertex(pose.rightPedal.x, pose.rightPedal.y);
  g.endShape();

  g.stroke(frameCol);
  g.strokeWeight(4 * s);
  g.line(pose.bb.x, pose.bb.y, pose.rightPedal.x, pose.rightPedal.y);
  g.fill(outline);
  g.noStroke();
  g.rect(pose.rightPedal.x - 8 * s, pose.rightPedal.y - 3 * s, 16 * s, 6 * s, 2 * s);
  g.rect(pose.leftPedal.x - 8 * s, pose.leftPedal.y - 3 * s, 16 * s, 6 * s, 2 * s);

  g.pop();
}
