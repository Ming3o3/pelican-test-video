/**
 * Multi-Era Instrumental Arrangements (`audio/instruments.js`).
 * Synthesizes Intro, all 20 eras (#01..#20 except #18 cassette in vaporwave.js),
 * and the Outro 20-instrument Tutti + decrescendo cleanly in pure Web Audio API.
 */

import {
  clampFreq,
  connectPanAndSend,
  getPinkNoiseBuffer,
  midiToFreq,
  playBowedString,
  playDrum,
  playFMVoice,
  playFluteReed,
  playPluck,
} from "./dsp.js";
import {
  BAR_SEC,
  BEAT_SEC,
  ERA_DUR,
  PELICAN_MOTIF,
  ROOT_D4_MIDI,
  SCALES,
  buildMotifNotes,
  scaleDegreeToFreq,
} from "./score.js";

/**
 * Helper to create an isolated bus for an era so tail decays never smudge quiet neighbors.
 */
function makeEraBus(ctx, dest, tStart, dur = ERA_DUR, tailPad = 0.28, gain = 1.0) {
  const g = ctx.createGain();
  const s = Math.max(0, tStart);
  const end = s + dur;
  g.gain.setValueAtTime(0, Math.max(0, s - 0.015));
  g.gain.linearRampToValueAtTime(gain, s + 0.012);
  g.gain.setValueAtTime(gain, end);
  g.gain.linearRampToValueAtTime(0, end + tailPad);
  g.connect(dest);
  return g;
}

/**
 * Desert human vocal chant syllable using 3 parallel formant bandpass filters over glottal buzz.
 */
function playChantVoice(ctx, dest, freq, t0, dur, vowelIdx = 0, gain = 0.24, pan = 0, sendDest = null) {
  const start = Math.max(0, t0);
  const stop = start + Math.max(0.08, dur);
  const formants = [
    [720, 1180, 2450], // "Ah"
    [460, 820, 2320], // "Oh"
    [350, 740, 2240], // "Oo"
  ][vowelIdx % 3];

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(clampFreq(freq * 0.97), start);
  osc.frequency.exponentialRampToValueAtTime(clampFreq(freq), start + 0.045);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.1;
  const lg = ctx.createGain();
  lg.gain.value = 16;
  lfo.connect(lg);
  lg.connect(osc.detune);

  const fMix = ctx.createGain();
  fMix.gain.value = 0.65;
  for (let i = 0; i < 3; i++) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = formants[i];
    bp.Q.value = i === 0 ? 4.5 : 6.0;
    const fg = ctx.createGain();
    fg.gain.value = i === 0 ? 1.0 : i === 1 ? 0.65 : 0.35;
    osc.connect(bp);
    bp.connect(fg);
    fg.connect(fMix);
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + Math.min(0.06, dur * 0.3));
  env.gain.setValueAtTime(gain * 0.85, Math.max(start + 0.07, stop - 0.07));
  env.gain.linearRampToValueAtTime(0, stop);
  fMix.connect(env);
  connectPanAndSend(ctx, env, dest, 1.0, pan, sendDest, 0.24);

  osc.start(start);
  osc.stop(stop + 0.02);
  lfo.start(start);
  lfo.stop(stop + 0.02);
}

/**
 * Intro (0.0 .. 5.0s): Documentary low cello/contrabass, t=2.00s beat drop, pickup pizzicato.
 */
export function scheduleIntroMusic(ctx, dest, roomConv) {
  const bus = makeEraBus(ctx, dest, 0, 5.0, 0.22, 1.0);

  // Solemn sustained contrabass drone D2 + fifth A2
  playBowedString(ctx, bus, midiToFreq(38), 0.05, 4.95, {
    gain: 0.28,
    pan: -0.15,
    attack: 0.42,
    release: 0.28,
    lpFreq: 950,
    vibratoCents: 6,
    sendDest: roomConv,
    sendAmt: 0.24,
  });
  playBowedString(ctx, bus, midiToFreq(45), 0.35, 4.65, {
    gain: 0.16,
    pan: 0.18,
    attack: 0.55,
    release: 0.28,
    lpFreq: 1150,
    vibratoCents: 8,
    sendDest: roomConv,
    sendAmt: 0.24,
  });

  // Mysterious upper minor theme hint during first sentence (0.5..1.9s)
  for (const [ts, d, m] of [
    [0.5, 0.65, 62],
    [1.25, 0.6, 65],
  ]) {
    playBowedString(ctx, bus, midiToFreq(m), ts, d, {
      gain: 0.15,
      pan: 0.08,
      attack: 0.09,
      release: 0.1,
      lpFreq: 2200,
      sendDest: roomConv,
    });
  }

  // Bar 2 Strong Beat t = 2.00s: "——早在自行车被发明之前。" documentary deadpan hit!
  playDrum(ctx, bus, "taikoCeremonial", 2.0, 0.78, { pan: 0, sendDest: roomConv, sendAmt: 0.28 });
  playBowedString(ctx, bus, midiToFreq(38), 2.0, 1.45, {
    gain: 0.26,
    pan: 0,
    attack: 0.025,
    lpFreq: 1800,
    sendDest: roomConv,
  });
  playPluck(ctx, bus, midiToFreq(62), 2.0, 0.9, {
    gain: 0.2,
    pan: -0.18,
    brightMult: 4.0,
    sendDest: roomConv,
  });

  // Pickup Bar (3.5..5.0s): jaunty cello pizzicato walking into Portal 1
  for (const [tp, deg] of [
    [3.5, 0],
    [4.0, 2],
    [4.5, 4],
    [4.75, 5],
  ]) {
    playPluck(ctx, bus, scaleDegreeToFreq(SCALES.harmonicMinor, deg, -1), tp, 0.42, {
      gain: 0.24,
      pan: 0.08,
      waveform: "triangle",
      subTriangle: 0.5,
      brightMult: 3.4,
      pickNoise: 0.08,
      sendDest: roomConv,
    });
  }
}

/**
 * #01 Sahara Rock Art (5.0 .. 11.0s): Hand drums + desert vocal chanting.
 */
function scheduleEra01Sahara(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.saharaMinorPent, { octaveOffset: -1 });
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    playChantVoice(ctx, bus, n.freq, n.t0, n.dur, i, 0.50 * n.vel, -0.1, roomConv);
    // Fifth drone call during Bar 2
    if (i % 3 === 0) {
      playChantVoice(ctx, bus, n.freq * 1.5, n.t0, n.dur * 1.1, i + 1, 0.28 * n.vel, 0.18, roomConv);
    }
  }
  // Energetic North-African djembe groove across 12 beats
  for (let b = 0; b < 12; b++) {
    const tb = t0 + b * BEAT_SEC;
    playDrum(ctx, bus, "djembeLow", tb, b % 4 === 0 ? 0.9 : 0.68, { pan: -0.16, sendDest: roomConv });
    playDrum(ctx, bus, "djembeSlap", tb + 0.25, b % 2 === 1 ? 0.78 : 0.56, { pan: 0.2, sendDest: roomConv });
    if (b % 4 === 3) {
      playDrum(ctx, bus, "djembeSlap", tb + 0.375, 0.66, { pan: 0.24, sendDest: roomConv });
    }
  }
}

/**
 * #02 Egyptian Mural (11.0 .. 17.0s): Arched harp + sistrum rattle + Bar 2 pose hold.
 */
function scheduleEra02Egypt(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.hijazEgypt);
  for (const n of notes) {
    const isFreeze = n.beat >= 4.0 && n.beat < 5.5;
    playPluck(ctx, bus, n.freq, n.t0, isFreeze ? 1.15 : n.dur * 1.35, {
      gain: 0.24 * n.vel,
      pan: -0.18 + (n.beat % 4) * 0.12,
      waveform: "triangle",
      subTriangle: 0.6,
      brightMult: 6.2,
      decayMult: 1.5,
      bodyFreq: 380,
      pickNoise: 0.14,
      sendDest: roomConv,
      sendAmt: 0.26,
    });
  }
  // Rolled royal Hijaz harp chords at beats 0, 4 (freeze chord), 8
  for (const chB of [0, 4, 8]) {
    const tc = t0 + chB * BEAT_SEC;
    const degs = chB === 4 ? [0, 2, 4, 5] : [0, 2, 4];
    for (let k = 0; k < degs.length; k++) {
      playPluck(ctx, bus, scaleDegreeToFreq(SCALES.hijazEgypt, degs[k], chB === 4 ? 0 : -1), tc + k * 0.04, 1.4, {
        gain: 0.15,
        pan: -0.25 + k * 0.16,
        waveform: "triangle",
        brightMult: 5.0,
        sendDest: roomConv,
        sendAmt: 0.3,
      });
    }
  }
  for (let b = 0; b < 12; b++) {
    if (b === 5) continue; // comedic pose pause breath!
    playDrum(ctx, bus, "sistrum", t0 + b * BEAT_SEC + 0.25, b % 2 === 1 ? 0.38 : 0.22, { pan: 0.26, sendDest: roomConv });
  }
}

/**
 * #03 Han Stone Rubbing (17.0 .. 23.0s): Bronze Bianzhong chime bells + stately court drum.
 */
function scheduleEra03Han(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.pentatonicMajor);
  for (const n of notes) {
    playFMVoice(ctx, bus, n.freq, n.t0, n.dur * 1.55, {
      gain: 0.24 * n.vel,
      pan: -0.28 + ((n.midi % 7) / 6) * 0.56,
      modRatio: 2.0,
      modIndexStart: 1.45,
      modIndexEnd: 0.18,
      attack: 0.004,
      decay: 0.55,
      sustain: 0.15,
      release: 0.16,
      bellRatio: 2.41,
      bellLevel: 0.34,
      sendDest: roomConv,
      sendAmt: 0.28,
    });
  }
  // Low bronze bell drone & ceremonial drums on Bar 1, 2, 3 downbeats
  for (const b of [0, 2, 4, 6, 8, 10]) {
    const tb = t0 + b * BEAT_SEC;
    playFMVoice(ctx, bus, scaleDegreeToFreq(SCALES.pentatonicMajor, b === 4 ? 3 : 0, -2), tb, 1.35, {
      gain: 0.22,
      pan: 0,
      modRatio: 1.5,
      modIndexStart: 1.1,
      modIndexEnd: 0.15,
      bellRatio: 2.38,
      bellLevel: 0.26,
      sendDest: roomConv,
    });
    if (b % 4 === 0) {
      playDrum(ctx, bus, "taikoCeremonial", tb, 0.72, { pan: -0.1, sendDest: roomConv });
    }
  }
}

/**
 * #04 Tang Dynasty Baimiao (23.0 .. 29.0s): Crisp Pipa plucks + rapid Bar-2 lunzhi tremolo!
 */
function scheduleEra04Tang(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.pentatonicMajor);
  for (const n of notes) {
    const isLunzhi = Math.abs(n.beat - 4.0) < 0.05 || Math.abs(n.beat - 7.0) < 0.05;
    if (isLunzhi) {
      // 5-finger lunzhi tremolo cascade
      for (let k = 0; k < 5; k++) {
        playPluck(ctx, bus, n.freq, n.t0 + k * 0.068, 0.26, {
          gain: 0.27 * (1 - k * 0.08),
          pan: -0.05 + k * 0.04,
          brightMult: 8.8,
          bodyFreq: 680,
          pickNoise: 0.26,
          sendDest: roomConv,
        });
      }
    } else {
      playPluck(ctx, bus, n.freq, n.t0, n.dur * 1.15, {
        gain: 0.35 * n.vel,
        pan: 0.08,
        brightMult: 8.5,
        decayMult: 2.0,
        bodyFreq: 660,
        pickNoise: 0.24,
        sendDest: roomConv,
      });
    }
  }
  for (let b = 0; b < 12; b++) {
    if (b % 2 === 0) {
      playPluck(ctx, bus, scaleDegreeToFreq(SCALES.pentatonicMajor, b % 4 === 0 ? 0 : 3, -1), t0 + b * BEAT_SEC, 0.45, {
        gain: 0.23,
        pan: -0.2,
        brightMult: 5.5,
        bodyFreq: 520,
        sendDest: roomConv,
      });
    }
  }
}

/**
 * #05 Song Dynasty Shan-shui (29.0 .. 35.0s): Deep Guqin silk plucks, sliding yin/nao, crystal harmonics.
 */
function scheduleEra05Song(ctx, bus, roomConv, t0) {
  // Spacious poetic phrasing centered on Bar 2 zoom reveal
  const guqinLine = [
    [0.0, 1.4, 0, -1, 0.9, 0],
    [2.0, 1.5, 2, -1, 0.88, 1.5], // expressive upwards silk slide
    [4.0, 1.6, 5, -1, 0.96, -2.0], // Bar 2 zoom peak + yin/nao slide!
    [6.0, 1.3, 4, -1, 0.85, 0],
    [8.0, 1.2, 2, -1, 0.88, 0],
    [9.5, 1.2, 0, -1, 0.85, 0],
    [11.0, 0.9, 1, -1, 0.8, 0],
  ];
  for (const [b0, durB, deg, oct, vel, bend] of guqinLine) {
    playPluck(ctx, bus, scaleDegreeToFreq(SCALES.pentatonicMajor, deg, oct), t0 + b0 * BEAT_SEC, durB * BEAT_SEC * 1.25, {
      gain: 0.28 * vel,
      pan: -0.06,
      waveform: "triangle",
      subTriangle: 0.65,
      brightMult: 4.5,
      decayMult: 1.25,
      bodyFreq: 210,
      pickNoise: 0.09,
      bendSemis: bend,
      bendTime: 0.24,
      sendDest: roomConv,
      sendAmt: 0.34,
    });
  }
  // Crystalline high Fanyin overtone notes hovering like mountain mist
  for (const [bh, deg] of [
    [1.0, 4],
    [5.0, 5],
    [7.0, 4],
    [10.0, 0],
  ]) {
    playFMVoice(ctx, bus, scaleDegreeToFreq(SCALES.pentatonicMajor, deg, 1), t0 + bh * BEAT_SEC, 1.4, {
      gain: 0.11,
      pan: 0.22,
      modRatio: 1.0,
      modIndexStart: 0.25,
      modIndexEnd: 0.05,
      attack: 0.004,
      decay: 0.9,
      sustain: 0.05,
      sendDest: roomConv,
      sendAmt: 0.4,
    });
  }
}

/**
 * #06 Qingming Scroll (35.0 .. 41.0s): Bright Dizi flute + festive Bianjing drum, clapper, gong!
 */
function scheduleEra06Qingming(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.pentatonicMajor, { octaveOffset: 1 });
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    playFluteReed(ctx, bus, n.freq, n.t0, n.dur * 1.04, {
      gain: 0.2 * n.vel,
      pan: 0.05,
      attack: 0.025,
      breathAmt: 0.1,
      chiffAmt: 0.18,
      diziBuzz: 0.65,
      vibratoHz: 5.8,
      vibratoCents: 16,
      bendFromSemis: i === 0 || i === 6 ? -1.5 : 0,
      sendDest: roomConv,
    });
  }
  for (let b = 0; b < 12; b++) {
    const tb = t0 + b * BEAT_SEC;
    if (b % 2 === 0) playDrum(ctx, bus, "tanggu", tb, 0.56, { pan: -0.18, sendDest: roomConv });
    playDrum(ctx, bus, "woodblock", tb + 0.25, 0.44, { pan: 0.24, sendDest: roomConv });
  }
  // Rainbow bridge festive brass gong crest at Bar 2 (t0 + 2.0s)
  playDrum(ctx, bus, "gong", t0 + 2.0, 0.62, { pitch: 146.8, pan: 0, sendDest: roomConv });
}

/**
 * #07 Maya Codex (41.0 .. 47.0s): Warm clay Ocarina + wooden slit-drum (teponaztli).
 */
function scheduleEra07Maya(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.saharaMinorPent, { octaveOffset: 1 });
  for (const n of notes) {
    playFluteReed(ctx, bus, n.freq, n.t0, n.dur * 1.05, {
      gain: 0.22 * n.vel,
      pan: 0.08,
      attack: 0.032,
      breathAmt: 0.18,
      chiffAmt: 0.24,
      harmonic2: 0.08,
      harmonic3: 0.02,
      vibratoHz: 4.8,
      vibratoCents: 12,
      sendDest: roomConv,
      sendAmt: 0.24,
    });
  }
  // Teponaztli two-tone wooden slit-drum syncopation
  for (let b = 0; b < 12; b++) {
    const tb = t0 + b * BEAT_SEC;
    playDrum(ctx, bus, "logDrum", tb, b % 4 === 0 ? 0.72 : 0.5, { pitch: 220, pan: -0.22, sendDest: roomConv });
    playDrum(ctx, bus, "logDrum", tb + 0.25, 0.42, { pitch: 294, pan: 0.22, sendDest: roomConv });
  }
}

/**
 * #08 Mughal Miniature (47.0 .. 53.0s): Jawari Sitar + Tanpura drone + Tabla bayān/dayān.
 */
function scheduleEra08Mughal(ctx, bus, roomConv, t0) {
  // Subtle tanpura drone (D3 + A3)
  for (const m of [50, 57]) {
    playPluck(ctx, bus, midiToFreq(m), t0, 5.8, {
      gain: 0.11,
      pan: m === 50 ? -0.35 : 0.35,
      jawari: 0.35,
      brightMult: 3.4,
      decayMult: 1.4,
      sendDest: roomConv,
    });
  }
  const notes = buildMotifNotes(t0, SCALES.ragaKhamaj);
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    playPluck(ctx, bus, n.freq, n.t0, n.dur * 1.2, {
      gain: 0.28 * n.vel,
      pan: 0.06,
      jawari: 0.55,
      brightMult: 6.8,
      filterQ: 2.0,
      bodyFreq: 580,
      bendSemis: i === 6 ? 1.5 : i === 8 ? -1.0 : 0, // expressive meend bend!
      bendTime: 0.16,
      sendDest: roomConv,
    });
  }
  for (let b = 0; b < 12; b++) {
    const tb = t0 + b * BEAT_SEC;
    if (b % 2 === 0) playDrum(ctx, bus, "tablaBayan", tb, 0.65, { pan: -0.2, sendDest: roomConv });
    playDrum(ctx, bus, "tablaDayan", tb + 0.25, 0.5, { pitch: b % 4 === 3 ? 330 : 294, pan: 0.22, sendDest: roomConv });
  }
}

/**
 * #09 Bada Shanren (53.0 .. 59.0s): Sparse meditative Solo Xiao over Zen ink negative space.
 */
function scheduleEra09Bada(ctx, bus, roomConv, t0) {
  // Generous breathy rests framing the bird's wry Bar 2 eye-roll
  const xiaoPhrases = [
    [0.0, 1.35, 0, 0, 0.9, -1.5],
    [2.0, 1.5, 2, 0, 0.88, 0],
    [4.0, 1.8, 4, 0, 0.95, 1.2], // Bar 2 cheeky eye-roll upward scoop!
    [7.0, 1.2, 2, 0, 0.84, 0],
    [9.25, 1.6, 0, 0, 0.88, -1.0],
  ];
  for (const [b0, durB, deg, oct, vel, bend] of xiaoPhrases) {
    playFluteReed(ctx, bus, scaleDegreeToFreq(SCALES.pentatonicMajor, deg, oct), t0 + b0 * BEAT_SEC, durB * BEAT_SEC, {
      gain: 0.24 * vel,
      pan: 0,
      attack: 0.085,
      release: 0.12,
      breathAmt: 0.24,
      chiffAmt: 0.18,
      harmonic2: 0.12,
      vibratoHz: 4.3,
      vibratoCents: 11,
      bendFromSemis: bend,
      bendDur: 0.14,
      sendDest: roomConv,
      sendAmt: 0.36,
    });
  }
}

/**
 * #10 Wayang Kulit (59.0 .. 65.0s): Javanese Gamelan paired-detuned bronze + Gong Ageng.
 */
function scheduleEra10Wayang(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.pelogGamelan);
  for (const n of notes) {
    // Classic Javanese pengisep / pengumbang pair creating shimmering beating (~8 Hz)
    for (const detHz of [-4.2, 4.2]) {
      playFMVoice(ctx, bus, n.freq + detHz, n.t0, n.dur * 1.4, {
        gain: 0.21 * n.vel,
        pan: detHz < 0 ? -0.25 : 0.25,
        modRatio: 2.0,
        modIndexStart: 1.6,
        modIndexEnd: 0.15,
        attack: 0.003,
        decay: 0.5,
        sustain: 0.12,
        bellRatio: 2.75,
        bellLevel: 0.28,
        sendDest: roomConv,
      });
    }
  }
  // Colotomic gong punctuation on Bar 1, 2, 3 starts & jerky puppeteer kendhang beats
  for (const b of [0, 4, 8]) {
    playDrum(ctx, bus, "gong", t0 + b * BEAT_SEC, b === 4 ? 0.82 : 0.58, { pitch: 82, pan: 0, sendDest: roomConv });
  }
  for (let b = 0; b < 12; b++) {
    playDrum(ctx, bus, "woodblock", t0 + b * BEAT_SEC, b % 2 === 0 ? 0.44 : 0.3, { pan: 0.15 });
  }
}

/**
 * #11 Ukiyo-e Tokaido (65.0 .. 71.0s): Edo Shamisen skin-slap + Hyoshigi wooden clappers.
 */
function scheduleEra11Ukiyoe(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.yoJapanese);
  for (const n of notes) {
    playPluck(ctx, bus, n.freq, n.t0, n.dur * 0.95, {
      gain: 0.38 * n.vel,
      pan: -0.08,
      waveform: "sawtooth",
      subTriangle: 0.15,
      brightMult: 9.5,
      decayMult: 2.2,
      bodyFreq: 860,
      bodyQ: 3.0,
      pickNoise: 0.34, // sharp bachi slap on cat-skin bridge!
      sendDest: roomConv,
    });
  }
  // Shamisen driving off-beat root ostinato + kabuki hyoshigi clacks
  for (let b = 0; b < 12; b++) {
    const tb = t0 + b * BEAT_SEC;
    playPluck(ctx, bus, scaleDegreeToFreq(SCALES.yoJapanese, 0, -1), tb, 0.34, {
      gain: 0.25,
      pan: 0.2,
      brightMult: 7.0,
      pickNoise: 0.28,
    });
    if (b % 2 === 1) {
      playDrum(ctx, bus, "woodblock", tb + 0.25, 0.45, { pan: -0.25 });
    }
  }
}

/**
 * #12 Van Gogh Starry Night (71.0 .. 77.0s): Lush swirling Impressionist/Romantic strings.
 */
function scheduleEra12StarryNight(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.diatonicMajor);
  for (const n of notes) {
    playBowedString(ctx, bus, n.freq, n.t0, n.dur * 1.12, {
      gain: 0.19 * n.vel,
      pan: -0.14,
      attack: 0.055,
      lpFreq: 3800,
      vibratoCents: 16,
      sendDest: roomConv,
      sendAmt: 0.28,
    });
    // Octave violin shimmer above
    playBowedString(ctx, bus, n.freq * 2, n.t0, n.dur * 1.1, {
      gain: 0.095 * n.vel,
      pan: 0.22,
      attack: 0.075,
      lpFreq: 4200,
      sendDest: roomConv,
      sendAmt: 0.3,
    });
  }
  // Swirling triplet cello ostinato locked to spinning star vortices in Bar 2
  const tripBeats = 36;
  const stepDur = ERA_DUR / tripBeats;
  const degCycle = [0, 2, 4, 2];
  for (let i = 0; i < tripBeats; i++) {
    const ts = t0 + i * stepDur;
    const isSwirl = i >= 12 && i < 24;
    playBowedString(
      ctx,
      bus,
      scaleDegreeToFreq(SCALES.diatonicMajor, degCycle[i % 4] + (isSwirl ? 1 : 0), -1),
      ts,
      stepDur * 1.15,
      {
        gain: isSwirl ? 0.16 : 0.11,
        pan: Math.sin(i * 0.6) * 0.35,
        attack: 0.02,
        release: 0.04,
        lpFreq: isSwirl ? 2400 : 1400,
        vibratoCents: 6,
        sendDest: roomConv,
      }
    );
  }
}

/**
 * #13 Munch The Scream (77.0 .. 83.0s): Strings -> Bar 2 wild out-of-tune Scream glissando shriek!
 */
function scheduleEra13Munch(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.harmonicMinor);
  for (const n of notes) {
    if (n.beat >= 4.0 && n.beat < 7.0) {
      // Bar 2 (79.00 .. 80.50s): TERRIFIED OUT-OF-TUNE SCREAM SHRIEK CLUSTER!
      playBowedString(ctx, bus, n.freq, n.t0, n.dur * 1.35, {
        gain: 0.22 * n.vel,
        pan: -0.22,
        attack: 0.02,
        lpFreq: 6800,
        vibratoHz: 11.5,
        vibratoCents: 48,
        glideToFreq: n.freq * 1.24, // jarring sharp upward screech!
        glideStart: 0.04,
        glideDur: n.dur * 0.9,
        sendDest: roomConv,
        sendAmt: 0.35,
      });
      playBowedString(ctx, bus, n.freq * 1.045, n.t0 + 0.015, n.dur * 1.25, {
        gain: 0.14 * n.vel,
        pan: 0.24,
        attack: 0.025,
        lpFreq: 6500,
        vibratoHz: 13.0,
        vibratoCents: 55,
        glideToFreq: n.freq * 1.36, // minor-second + tritone expressionist shriek!
        glideStart: 0.03,
        glideDur: n.dur * 0.9,
        sendDest: roomConv,
      });
    } else {
      playBowedString(ctx, bus, n.freq, n.t0, n.dur * 1.05, {
        gain: 0.2 * n.vel,
        pan: 0,
        attack: 0.04,
        lpFreq: 3000,
        sendDest: roomConv,
      });
    }
  }
  // Low anxious string ostinato
  for (let b = 0; b < 12; b++) {
    const isScream = b >= 4 && b < 7;
    playBowedString(ctx, bus, midiToFreq(isScream ? 45 : 38), t0 + b * BEAT_SEC, 0.42, {
      gain: isScream ? 0.24 : 0.15,
      pan: 0,
      attack: 0.015,
      lpFreq: isScream ? 2600 : 900,
      sendDest: roomConv,
    });
  }
}

/**
 * #14 Nosferatu (83.0 .. 89.0s): 1922 Gothic pipe organ + silent-film tack piano!
 */
function scheduleEra14Nosferatu(ctx, bus, roomConv, t0) {
  // Brooding pipe organ pedal & dark minor chords (bars 0..2)
  for (const [bStart, durB, bassMidi, chord] of [
    [0, 4, 38, [50, 53, 57]], // Dm
    [4, 4, 37, [49, 53, 56]], // eerie C# diminished climb!
    [8, 4, 38, [50, 53, 57, 61]], // Dm(maj7)
  ]) {
    const ts = t0 + bStart * BEAT_SEC;
    const d = durB * BEAT_SEC;
    for (const m of [bassMidi, ...chord]) {
      playFluteReed(ctx, bus, midiToFreq(m), ts, d, {
        gain: m === bassMidi ? 0.15 : 0.068,
        pan: m === bassMidi ? 0 : (m % 2 === 0 ? -0.2 : 0.2),
        attack: 0.07,
        release: 0.1,
        breathAmt: 0.04,
        chiffAmt: 0.04,
        harmonic2: 0.45,
        harmonic3: 0.25,
        vibratoCents: 4,
        sendDest: roomConv,
        sendAmt: 0.3,
      });
    }
  }

  // Slightly detuned 1922 silent-film tack piano playing staccato creeping motif
  const notes = buildMotifNotes(t0, SCALES.harmonicMinor);
  for (const n of notes) {
    for (const det of [0.996, 1.005]) {
      playPluck(ctx, bus, n.freq * det, n.t0, n.dur * 0.85, {
        gain: 0.135 * n.vel,
        pan: det < 1 ? -0.15 : 0.15,
        waveform: "sawtooth",
        subTriangle: 0.25,
        brightMult: 8.0,
        decayMult: 2.2,
        pickNoise: 0.3, // metallic upright piano tack hammer!
        sendDest: roomConv,
      });
    }
  }
}

/**
 * #15 Oscilloscope Vector (89.0 .. 95.0s): Sine CRT melody + 60/120Hz hum + Bar 2 Lissajous warp!
 */
function scheduleEra15Oscilloscope(ctx, bus, t0) {
  // Constant 60 Hz + 120 Hz vacuum tube power-supply hum
  for (const [hz, amp] of [
    [60, 0.085],
    [120, 0.045],
    [180, 0.015],
  ]) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(amp, t0 + 0.08);
    g.gain.setValueAtTime(amp, t0 + 5.9);
    g.gain.linearRampToValueAtTime(0, t0 + 6.0);
    o.connect(g);
    g.connect(bus);
    o.start(t0);
    o.stop(t0 + 6.05);
  }

  const notes = buildMotifNotes(t0, SCALES.diatonicMajor);
  for (const n of notes) {
    const isLissa = n.beat >= 4.0 && n.beat < 6.0; // u in [2.0, 3.0) -> knob turned wrong!
    if (isLissa) {
      // Frequency and phase warped by extreme 3:4 Lissajous FM!
      playFMVoice(ctx, bus, n.freq * (1.18 + Math.sin(n.beat * 4) * 0.14), n.t0, n.dur * 1.1, {
        gain: 0.22 * n.vel,
        pan: Math.sin(n.beat * 5) * 0.55,
        modRatio: 1.3333, // 4:3 harmonic ratio matching visual Lissajous!
        modIndexStart: 5.5,
        modIndexEnd: 2.8,
        attack: 0.008,
        decay: n.dur * 0.7,
        sustain: 0.65,
        vibratoHz: 14,
        vibratoCents: 65,
      });
    } else {
      // Crisp pure sine XY-scope vector tone
      playFMVoice(ctx, bus, n.freq, n.t0, n.dur * 0.95, {
        gain: 0.22 * n.vel,
        pan: 0,
        modRatio: 2.0,
        modIndexStart: 0.18,
        modIndexEnd: 0.04,
        attack: 0.006,
        decay: 0.15,
        sustain: 0.78,
      });
    }
  }

  // Sharp sine snap-back lock ping on Beat 3 (u = 3.0s -> t0 + 3.0s = 92.00s)
  playFMVoice(ctx, bus, midiToFreq(74), t0 + 3.0, 0.32, {
    gain: 0.24,
    modRatio: 2.0,
    modIndexStart: 1.2,
    modIndexEnd: 0.05,
    attack: 0.002,
    decay: 0.25,
    sustain: 0.1,
  });
}

/**
 * #16 8-bit Platformer (95.0 .. 101.0s): 4-channel NES chiptune (2 squares + 1 triangle + noise).
 */
function scheduleEra16Chiptune(ctx, bus, t0) {
  // Channel 1 (Lead Square) & Channel 2 (Counter-Pulse Arp), ducked slightly during Jump SFX (beats 4..6)
  const notes = buildMotifNotes(t0, SCALES.diatonicMajor);
  for (const n of notes) {
    const isSfxZone = n.beat >= 4.0 && n.beat < 6.2;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(n.freq, n.t0);
    const g = ctx.createGain();
    const lv = (isSfxZone ? 0.065 : 0.13) * n.vel;
    g.gain.setValueAtTime(0, n.t0);
    g.gain.linearRampToValueAtTime(lv, n.t0 + 0.004);
    g.gain.setValueAtTime(lv * 0.85, n.t0 + Math.max(0.01, n.dur - 0.025));
    g.gain.linearRampToValueAtTime(0, n.t0 + n.dur);
    o.connect(g);
    connectPanAndSend(ctx, g, bus, 1.0, -0.18);
    o.start(n.t0);
    o.stop(n.t0 + n.dur + 0.015);
  }

  // Channel 2: bubbly 16th/8th square harmony arp
  const arpSteps = 24;
  const arpChord = [0, 2, 4, 2];
  for (let i = 0; i < arpSteps; i++) {
    const ta = t0 + i * 0.25;
    const isSfxZone = i >= 8 && i < 13;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(scaleDegreeToFreq(SCALES.diatonicMajor, arpChord[i % 4], 0), ta);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ta);
    g.gain.linearRampToValueAtTime(isSfxZone ? 0.032 : 0.068, ta + 0.003);
    g.gain.linearRampToValueAtTime(0, ta + 0.14);
    o.connect(g);
    connectPanAndSend(ctx, g, bus, 1.0, 0.22);
    o.start(ta);
    o.stop(ta + 0.16);
  }

  // Channel 3: Classic punchy triangle bassline
  for (let i = 0; i < 12; i++) {
    const tb = t0 + i * BEAT_SEC;
    const rootDeg = i >= 4 && i < 8 ? 3 : i === 10 ? 4 : 0;
    const f = scaleDegreeToFreq(SCALES.diatonicMajor, i % 2 === 0 ? rootDeg : rootDeg + 4, -2);
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, tb);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, tb);
    g.gain.linearRampToValueAtTime(0.24, tb + 0.005);
    g.gain.setValueAtTime(0.2, tb + 0.36);
    g.gain.linearRampToValueAtTime(0, tb + 0.44);
    o.connect(g);
    g.connect(bus);
    o.start(tb);
    o.stop(tb + 0.46);
  }

  // Channel 4: Noise drums
  for (let i = 0; i < 24; i++) {
    const td = t0 + i * 0.25;
    playDrum(ctx, bus, i % 4 === 2 ? "snarePop" : "hatClosed", td, i % 4 === 2 ? 0.35 : 0.2, { pan: 0.1 });
  }
}

/**
 * #17 Early Messenger (101.0 .. 107.0s): 2000s MIDI ringtone lead + 3-tone IM message pops.
 */
function scheduleEra17Chat(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.diatonicMajor);
  for (const n of notes) {
    playFMVoice(ctx, bus, n.freq, n.t0, n.dur * 0.95, {
      gain: 0.32 * n.vel,
      pan: -0.1,
      modRatio: 3.0, // crisp bright early-2000s General MIDI phone timbre
      modIndexStart: 1.9,
      modIndexEnd: 0.4,
      attack: 0.004,
      decay: 0.2,
      sustain: 0.45,
      bellRatio: 2.0,
      bellLevel: 0.25,
      sendDest: roomConv,
    });
  }
  // Original 3-tone cheerful IM message notification chimes as off-beat percussion!
  for (let b = 0; b < 12; b++) {
    const tb = t0 + b * BEAT_SEC;
    if (b % 2 === 1) {
      for (let k = 0; k < 2; k++) {
        playFMVoice(ctx, bus, midiToFreq(k === 0 ? 74 : 81), tb + k * 0.055, 0.14, {
          gain: 0.17,
          pan: 0.28,
          modRatio: 2.0,
          modIndexStart: 0.6,
          modIndexEnd: 0.1,
          attack: 0.003,
          decay: 0.1,
          sustain: 0.1,
        });
      }
    }
    playDrum(ctx, bus, b % 4 === 0 ? "kick909" : "hatClosed", tb, b % 4 === 0 ? 0.56 : 0.32, { pan: 0 });
  }
}

/**
 * #19 Vertical Short Video (113.0 .. 119.0s): Punchy 2020s pop beat & bouncy pluck hook.
 */
function scheduleEra19ShortVideo(ctx, bus, roomConv, t0) {
  const notes = buildMotifNotes(t0, SCALES.diatonicMajor);
  for (const n of notes) {
    playPluck(ctx, bus, n.freq, n.t0, n.dur * 0.8, {
      gain: 0.32 * n.vel,
      pan: 0.08,
      waveform: "sawtooth",
      subTriangle: 0.4,
      brightMult: 8.0,
      decayMult: 1.8,
      pickNoise: 0.05,
      sendDest: roomConv,
    });
  }
  // Modern tight pop kick + clap + 16th-note trap hi-hat groove
  for (let b = 0; b < 12; b++) {
    const tb = t0 + b * BEAT_SEC;
    if (b % 2 === 0 || b === 5 || b === 11) {
      playDrum(ctx, bus, "kick909", tb, 0.86, { pan: 0 });
    }
    if (b % 2 === 1) {
      playDrum(ctx, bus, "clap", tb, 0.7, { pan: 0, sendDest: roomConv, sendAmt: 0.18 });
    }
    for (let s = 0; s < 4; s++) {
      // Crisp 16th hi-hats with Bar-2 double-time roll!
      if (s % 2 === 0 || (b >= 4 && b < 8)) {
        playDrum(ctx, bus, "hatClosed", tb + s * 0.125, s === 0 ? 0.42 : 0.25, { pan: 0.24 });
      }
    }
  }
}

/**
 * #20 Code Aesthetics (119.0 .. 125.0s): Clean felt piano, warm synth pad & ascending code arps.
 */
function scheduleEra20Code(ctx, bus, roomConv, t0) {
  const chords = [
    [0, 4, [50, 57, 62, 66, 69]], // Dmaj9
    [4, 4, [47, 54, 59, 62, 66]], // Bm7
    [8, 4, [43, 55, 59, 62, 66]], // Gmaj7 -> lifting triumphantly into Outro!
  ];
  for (const [b0, dB, midis] of chords) {
    const ts = t0 + b0 * BEAT_SEC;
    const dur = dB * BEAT_SEC;
    for (let i = 0; i < midis.length; i++) {
      playBowedString(ctx, bus, midiToFreq(midis[i]), ts, dur, {
        gain: 0.088,
        pan: -0.3 + i * 0.15,
        attack: 0.16,
        release: 0.18,
        lpFreq: 2400,
        vibratoCents: 6,
        bowAir: 0,
        sendDest: roomConv,
        sendAmt: 0.28,
      });
    }
  }
  // Studio felt piano playing clean final statement of the theme
  const notes = buildMotifNotes(t0, SCALES.diatonicMajor);
  for (const n of notes) {
    playFMVoice(ctx, bus, n.freq, n.t0, n.dur * 1.4, {
      gain: 0.29 * n.vel,
      pan: -0.08,
      modRatio: 1.0,
      modIndexStart: 1.1,
      modIndexEnd: 0.15,
      attack: 0.005,
      decay: 0.5,
      sustain: 0.2,
      bellRatio: 2.0,
      bellLevel: 0.2,
      lpCutoff: 5200,
      sendDest: roomConv,
      sendAmt: 0.28,
    });
  }
  // Shimmering 8th-note code arpeggio ticking along grid
  const arp = [62, 66, 69, 74, 69, 66];
  for (let i = 0; i < 24; i++) {
    playFMVoice(ctx, bus, midiToFreq(arp[i % arp.length]), t0 + i * 0.25, 0.24, {
      gain: 0.1,
      pan: 0.22,
      modRatio: 2.0,
      modIndexStart: 0.65,
      modIndexEnd: 0.1,
      attack: 0.004,
      decay: 0.15,
      sustain: 0.05,
      sendDest: roomConv,
    });
  }
}

/**
 * Outro Press Conference (125.0 .. 137.0s):
 * - uOutro [0, 4): Grand Multi-Era Tutti playing Pelican Theme in D Major!
 * - uOutro [4, 8): Smooth decrescendo fade-out during Slot 21 camera push-in.
 * - uOutro [8, 12]: Silence before solo fly-by bell SFX.
 */
export function scheduleOutroMusic(ctx, dest, roomConv, tOutro = 125.0) {
  // Decrescendo envelope windowing Tutti cleanly to silence by tOutro + 7.6s (132.6s)
  const tuttiBus = ctx.createGain();
  tuttiBus.gain.setValueAtTime(0, Math.max(0, tOutro - 0.015));
  tuttiBus.gain.linearRampToValueAtTime(1.0, tOutro + 0.02);
  tuttiBus.gain.setValueAtTime(1.0, tOutro + 4.0);
  tuttiBus.gain.exponentialRampToValueAtTime(0.08, tOutro + 6.9);
  tuttiBus.gain.linearRampToValueAtTime(0, tOutro + 7.6);
  tuttiBus.connect(dest);

  // 16-beat (8s) Grand Finale Theme variation: Bars 1-2 joyful Tutti + Bar 3-4 held resolution
  const tuttiMotif = [
    ...PELICAN_MOTIF.slice(0, 12), // 8 beats of crisp theme in D major
    [8.0, 2.0, 2, 0, 0.92],
    [10.0, 2.0, 4, 0, 0.88],
    [12.0, 3.2, 0, 0, 0.95], // grand final D major chord hold fading as camera zooms into Slot 21
  ];
  const notes = buildMotifNotes(tOutro, SCALES.diatonicMajor, { motif: tuttiMotif });

  for (const n of notes) {
    // Strings lead
    playBowedString(ctx, tuttiBus, n.freq, n.t0, n.dur * 1.15, {
      gain: 0.16 * n.vel,
      pan: -0.25,
      attack: 0.04,
      lpFreq: 4200,
      sendDest: roomConv,
      sendAmt: 0.25,
    });
    // Flute & Ocarina shimmer octave above
    playFluteReed(ctx, tuttiBus, n.freq * 2, n.t0, n.dur * 1.05, {
      gain: 0.095 * n.vel,
      pan: 0.28,
      attack: 0.03,
      breathAmt: 0.12,
      diziBuzz: 0.25,
      sendDest: roomConv,
    });
    // Bronze Bianzhong / Gamelan chime accent + Pipa/Harp pluck
    if (n.beat % 1 === 0) {
      playFMVoice(ctx, tuttiBus, n.freq, n.t0, n.dur * 1.35, {
        gain: 0.13 * n.vel,
        pan: 0.12,
        modRatio: 2.0,
        modIndexStart: 1.3,
        modIndexEnd: 0.15,
        bellRatio: 2.41,
        bellLevel: 0.24,
        sendDest: roomConv,
      });
      playPluck(ctx, tuttiBus, n.freq, n.t0, n.dur * 1.2, {
        gain: 0.12 * n.vel,
        pan: -0.15,
        brightMult: 6.8,
        sendDest: roomConv,
      });
    }
  }

  // Grand orchestral bass & world percussion during Bars 1 & 2 of Outro (125.0 .. 129.0s)
  for (let b = 0; b < 8; b++) {
    const tb = tOutro + b * BEAT_SEC;
    const bassMidi = b < 4 ? 38 : b < 6 ? 43 : 45;
    playBowedString(ctx, tuttiBus, midiToFreq(bassMidi), tb, 0.55, {
      gain: 0.22,
      pan: 0,
      attack: 0.02,
      lpFreq: 1400,
      sendDest: roomConv,
    });
    playDrum(ctx, tuttiBus, b % 2 === 0 ? "taikoCeremonial" : "djembeSlap", tb, b % 2 === 0 ? 0.68 : 0.45, {
      pan: b % 2 === 0 ? -0.14 : 0.18,
      sendDest: roomConv,
    });
  }
  playDrum(ctx, tuttiBus, "gong", tOutro + 4.0, 0.55, { pitch: 98, pan: 0, sendDest: roomConv });
  // Held warm wind-pad shimmer fading out with camera zoom (129..132.5s)
  const padChords = [38, 50, 54, 57, 62];
  for (const m of padChords) {
    playBowedString(ctx, tuttiBus, midiToFreq(m), tOutro + 4.0, 3.5, {
      gain: 0.068,
      pan: 0,
      attack: 0.15,
      lpFreq: 2000,
      sendDest: roomConv,
    });
  }
}

const ERA_SCHEDULERS = [
  scheduleEra01Sahara,
  scheduleEra02Egypt,
  scheduleEra03Han,
  scheduleEra04Tang,
  scheduleEra05Song,
  scheduleEra06Qingming,
  scheduleEra07Maya,
  scheduleEra08Mughal,
  scheduleEra09Bada,
  scheduleEra10Wayang,
  scheduleEra11Ukiyoe,
  scheduleEra12StarryNight,
  scheduleEra13Munch,
  scheduleEra14Nosferatu,
  scheduleEra15Oscilloscope,
  scheduleEra16Chiptune,
  scheduleEra17Chat,
  null, // #18 Vaporwave uses dedicated cassette engine in audio/vaporwave.js
  scheduleEra19ShortVideo,
  scheduleEra20Code,
];

/**
 * Schedules a single non-cassette era (#01..#17, #19..#20) starting at `t0`.
 */
export function scheduleEraBlock(ctx, dest, roomConv, eraIndex, t0 = 5.0 + eraIndex * ERA_DUR) {
  const fn = ERA_SCHEDULERS[eraIndex];
  if (!fn) return;
  const bus = makeEraBus(ctx, dest, t0, ERA_DUR, 0.24, 1.0);
  if (eraIndex === 14 || eraIndex === 15) {
    fn(ctx, bus, t0);
  } else {
    fn(ctx, bus, roomConv, t0);
  }
}
