/**
 * Scene #18 — Vaporwave 2-Stage Cassette Tape Engine (`audio/vaporwave.js`).
 * Stage A: Renders an original 80s mall smooth-jazz track at 151.2 BPM (+4 semitones, F# major)
 *          featuring DX7-style FM electric piano (Maj7/Min9), portamento fretless bass,
 *          FM saxophone lead, and 80s gated-reverb drums in an OfflineAudioContext.
 * Stage B: Plays back that AudioBuffer as an aged cassette slowed to 0.7937x (-4 semitones -> D,
 *          151.2 -> 120.0 BPM), with 4kHz LP, 4.2s lush wet mall hall reverb, 0.5Hz wow/flutter,
 *          cassette hiss, entry slowdown, Bar-2 4x half-beat loop stutter, and exit speedup.
 */

import {
  SAMPLE_RATE,
  clampFreq,
  connectPanAndSend,
  getGated80sDrumIR,
  getPinkNoiseBuffer,
  getStudioRoomIR,
  midiToFreq,
  playDrum,
  playFMVoice,
  playPluck,
} from "./dsp.js";
import { ROOT_D4_MIDI, SCALES, buildMotifNotes } from "./score.js";

const SRC_BPM = 151.2;
const SRC_BEAT = 60 / SRC_BPM; // 0.396825397s
const SRC_BAR = SRC_BEAT * 4; // 1.587301587s
const SRC_ROOT_MIDI = ROOT_D4_MIDI + 4; // F#4 (MIDI 66 = +4 semitones)
export const TAPE_SLOW_RATE = Math.pow(2, -4 / 12); // ~0.793700526

function playFretlessBass(ctx, dest, freq, prevFreq, t0, dur, gain = 0.25) {
  const start = Math.max(0, t0);
  const stop = start + Math.max(0.06, dur);
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o1.type = "sawtooth";
  o2.type = "triangle";

  const fStart = clampFreq(prevFreq || freq);
  const fTarget = clampFreq(freq);
  o1.frequency.setValueAtTime(fStart, start);
  o2.frequency.setValueAtTime(fStart, start);
  o1.frequency.exponentialRampToValueAtTime(fTarget, start + 0.055);
  o2.frequency.exponentialRampToValueAtTime(fTarget, start + 0.055);

  const mix = ctx.createGain();
  mix.gain.value = 0.75;
  o1.connect(mix);
  o2.connect(mix);

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 2.6;
  lp.frequency.setValueAtTime(clampFreq(fTarget * 4.5), start);
  lp.frequency.exponentialRampToValueAtTime(clampFreq(fTarget * 1.9), start + Math.min(dur, 0.28));

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + 0.014);
  env.gain.setValueAtTime(gain * 0.85, Math.max(start + 0.02, stop - 0.05));
  env.gain.linearRampToValueAtTime(0, stop);

  mix.connect(lp);
  lp.connect(env);
  env.connect(dest);

  o1.start(start);
  o2.start(start);
  o1.stop(stop + 0.02);
  o2.stop(stop + 0.02);
}

/**
 * Stage A: Renders 4 bars (~6.35s + tail -> 7.2s) of 151.2 BPM +4-semitone 80s Mall Jazz.
 */
export async function renderVaporwaveSourceBuffer(sampleRate = SAMPLE_RATE) {
  const dur = 7.4;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);

  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const gatedConv = ctx.createConvolver();
  gatedConv.buffer = getGated80sDrumIR(ctx);
  const gatedGain = ctx.createGain();
  gatedGain.gain.value = 0.78;
  gatedConv.connect(gatedGain);
  gatedGain.connect(master);

  const plateConv = ctx.createConvolver();
  plateConv.buffer = getStudioRoomIR(ctx);
  const plateGain = ctx.createGain();
  plateGain.gain.value = 0.24;
  plateConv.connect(plateGain);
  plateGain.connect(master);

  // Smooth Jazz Maj7 / Min9 progression in F# Major (bars 0..3)
  const chords = [
    // Bar 1: F#maj7
    { bar: 0, bass: 42, tones: [54, 58, 61, 65, 68] },
    // Bar 2: D#m9 -> G#m9 (hit at beat 0 of bar 2 sounds great during the loop stutter!)
    { bar: 1, bass: 44, tones: [56, 59, 63, 66, 70] },
    // Bar 3: C#13sus4 -> F#maj7
    { bar: 2, bass: 37, tones: [54, 59, 61, 66, 68] },
    // Bar 4: Bmaj7 -> C#9
    { bar: 3, bass: 47, tones: [54, 59, 63, 66, 70] },
  ];

  let prevBassFreq = midiToFreq(42);
  for (const ch of chords) {
    const barT = ch.bar * SRC_BAR;
    // DX7 Rhodes E-piano comping hits (beat 0, syncopated 2.5, 3.5)
    for (const [bOff, lenB, amp] of [
      [0.0, 2.2, 0.085],
      [2.5, 1.3, 0.068],
    ]) {
      const tHit = barT + bOff * SRC_BEAT;
      const dHit = lenB * SRC_BEAT;
      for (let k = 0; k < ch.tones.length; k++) {
        playFMVoice(ctx, master, midiToFreq(ch.tones[k]), tHit + k * 0.008, dHit, {
          gain: amp,
          pan: -0.25 + k * 0.12,
          modRatio: 1.0,
          modIndexStart: 1.85,
          modIndexEnd: 0.22,
          attack: 0.008,
          decay: dHit * 0.6,
          sustain: 0.35,
          release: 0.08,
          bellRatio: 7.0,
          bellLevel: 0.09,
          sendDest: plateConv,
          sendAmt: 0.3,
        });
      }
    }

    // Fretless walking bass (root -> fifth -> octave slide)
    const bassSteps = [
      [0.0, 1.4, ch.bass],
      [1.5, 0.9, ch.bass + 7],
      [2.5, 0.9, ch.bass + 12],
      [3.5, 0.5, ch.bass + 7],
    ];
    for (const [bOff, lenB, midi] of bassSteps) {
      const f = midiToFreq(midi);
      playFretlessBass(ctx, master, f, prevBassFreq, barT + bOff * SRC_BEAT, lenB * SRC_BEAT, 0.26);
      prevBassFreq = f;
    }

    // Gentle 80s Mall Drums (kick + gated snare + brushed 8th hats)
    for (let b = 0; b < 4; b++) {
      const tb = barT + b * SRC_BEAT;
      if (b === 0 || b === 2) {
        playDrum(ctx, master, "kick909", tb, 0.54, { pan: 0 });
      }
      if (b === 1 || b === 3) {
        playDrum(ctx, master, "snarePop", tb, 0.42, {
          pan: 0.05,
          sendDest: gatedConv,
          sendAmt: 0.95,
        });
      }
      playDrum(ctx, master, "hatClosed", tb, 0.24, { pan: 0.22, sendDest: plateConv, sendAmt: 0.12 });
      playDrum(ctx, master, "hatClosed", tb + SRC_BEAT * 0.5, 0.16, { pan: 0.22 });
    }
    // Syncopated tom/kick pickup on beat 2.5
    playDrum(ctx, master, "kick909", barT + 2.5 * SRC_BEAT, 0.36, { pan: 0 });
  }

  // FM Saxophone Lead playing the Pelican Theme (+4 semitones, bars 0..2 + bar 3 continuation)
  const leadNotes = [
    ...buildMotifNotes(0, SCALES.diatonicMajor, {
      rootMidi: SRC_ROOT_MIDI,
      beatSec: SRC_BEAT,
    }),
    // Bar 4 smooth coda turnaround so exit acceleration stays lush until buffer end
    ...buildMotifNotes(3 * SRC_BAR, SCALES.diatonicMajor, {
      rootMidi: SRC_ROOT_MIDI,
      beatSec: SRC_BEAT,
      motif: [
        [0.0, 0.9, 4, 0, 0.92],
        [1.0, 0.5, 2, 0, 0.84],
        [1.5, 0.5, 1, 0, 0.82],
        [2.0, 1.8, 0, 0, 0.9],
      ],
    }),
  ];

  for (const n of leadNotes) {
    playFMVoice(ctx, master, n.freq, n.t0, n.dur * 1.05, {
      gain: 0.21 * n.vel,
      pan: 0.12,
      modRatio: 1.0,
      modIndexStart: 1.65,
      modIndexEnd: 0.95,
      attack: 0.028,
      decay: 0.12,
      sustain: 0.68,
      release: 0.06,
      vibratoHz: 5.2,
      vibratoCents: 18,
      vibratoDelay: 0.08,
      lpCutoff: 6400,
      sendDest: plateConv,
      sendAmt: 0.32,
    });
    // Subtle sax reed puff transient
    playPluck(ctx, master, n.freq, n.t0, 0.05, {
      gain: 0.045,
      waveform: "triangle",
      subTriangle: 0,
      pickNoise: 0.85,
      brightMult: 3.0,
    });
  }

  return await ctx.startRendering();
}

/**
 * Schedules a single chunk of `vaporBuffer` cleanly through the Tape Bus with wow/flutter detune
 * and click-free raised edges.
 */
function triggerTapeSlice(ctx, bus, buffer, wowLfoGain, tStart, playDur, srcOffset, fadeMs = 0.007) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.setValueAtTime(TAPE_SLOW_RATE, tStart);
  wowLfoGain.connect(src.detune);

  const env = ctx.createGain();
  const stopT = tStart + playDur;
  env.gain.setValueAtTime(0, tStart);
  env.gain.linearRampToValueAtTime(1.0, tStart + fadeMs);
  env.gain.setValueAtTime(1.0, Math.max(tStart + fadeMs + 0.002, stopT - fadeMs));
  env.gain.linearRampToValueAtTime(0, stopT);

  src.connect(env);
  env.connect(bus);
  src.start(tStart, Math.max(0, srcOffset), Math.min(buffer.duration - srcOffset, playDur + 0.18));
  src.stop(stopT + 0.01);
  return src;
}

/**
 * Stage B: Schedules `#18` Vaporwave (107.0 .. 113.0s) onto `mainCtx`.
 */
export function scheduleVaporwaveCassette(ctx, dest, vaporBuffer, mallHallIR, tStart = 0.0) {
  const tEnd = tStart + 6.0;

  // Tape Master Bus with window closing right after portal exit so 4.2s hall doesn't smudge #19
  const tapeOut = ctx.createGain();
  tapeOut.gain.setValueAtTime(0, Math.max(0, tStart - 0.01));
  tapeOut.gain.linearRampToValueAtTime(0.95, tStart + 0.02);
  tapeOut.gain.setValueAtTime(0.95, tEnd - 0.03);
  tapeOut.gain.linearRampToValueAtTime(0, tEnd + 0.16);
  tapeOut.connect(dest);

  // 4 kHz cassette muffled low-pass filter
  const tapeLP = ctx.createBiquadFilter();
  tapeLP.type = "lowpass";
  tapeLP.frequency.value = 3950;
  tapeLP.Q.value = 0.72;

  // High wet ratio (60% mall reverb hall + 50% dry)
  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.52;
  tapeLP.connect(dryGain);
  dryGain.connect(tapeOut);

  const hallConv = ctx.createConvolver();
  hallConv.buffer = mallHallIR;
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.62;
  tapeLP.connect(hallConv);
  hallConv.connect(wetGain);
  wetGain.connect(tapeOut);

  // 0.5 Hz cassette pitch wow/flutter LFO (+/- 18 cents)
  const wowOsc = ctx.createOscillator();
  wowOsc.type = "sine";
  wowOsc.frequency.value = 0.5;
  const wowDepth = ctx.createGain();
  wowDepth.gain.value = 18;
  wowOsc.connect(wowDepth);
  wowOsc.start(tStart);
  wowOsc.stop(tEnd + 0.25);

  // Light analog cassette hiss
  const hiss = ctx.createBufferSource();
  hiss.buffer = getPinkNoiseBuffer(ctx);
  hiss.loop = true;
  const hissBP = ctx.createBiquadFilter();
  hissBP.type = "bandpass";
  hissBP.frequency.value = 1850;
  hissBP.Q.value = 0.85;
  const hissEnv = ctx.createGain();
  hissEnv.gain.setValueAtTime(0, tStart);
  hissEnv.gain.linearRampToValueAtTime(0.022, tStart + 0.08);
  hissEnv.gain.setValueAtTime(0.022, tEnd - 0.05);
  hissEnv.gain.linearRampToValueAtTime(0, tEnd + 0.05);
  hiss.connect(hissBP);
  hissBP.connect(hissEnv);
  hissEnv.connect(tapeOut);
  hiss.start(tStart);
  hiss.stop(tEnd + 0.1);

  // 1) Bar 1 (107.00 .. 109.00s): Entry tape slow-down 1.00 -> 0.7937 across first 0.36s
  const src1 = triggerTapeSlice(ctx, tapeLP, vaporBuffer, wowDepth, tStart, 2.008, 0);
  src1.playbackRate.setValueAtTime(1.0, tStart);
  src1.playbackRate.exponentialRampToValueAtTime(TAPE_SLOW_RATE, tStart + 0.36);

  // 2) Bar 2 Gag (109.00 .. 110.00s): Repeat Bar-2 beat-1 half-beat slice 4x cleanly at 0.25s intervals
  const stutterOffset = SRC_BAR; // 1.5873s
  for (let k = 0; k < 4; k++) {
    triggerTapeSlice(ctx, tapeLP, vaporBuffer, wowDepth, tStart + 2.0 + k * 0.25, 0.252, stutterOffset, 0.006);
  }

  // 3) Bar 2 Beat 3 -> Bar 3 Exit (110.00 .. 113.00s): Resume smoothly, then spin back up to 1.00x on t=113.00!
  const resumeOffset = SRC_BAR + 2 * SRC_BEAT; // 2.3810s
  const src3 = triggerTapeSlice(ctx, tapeLP, vaporBuffer, wowDepth, tStart + 2.996, 3.014, resumeOffset, 0.007);
  src3.playbackRate.setValueAtTime(TAPE_SLOW_RATE, tStart + 5.62);
  src3.playbackRate.exponentialRampToValueAtTime(1.0, tEnd);

  // Slight tape rewind/flutter transient click at stutter onset for comic needle-skip realism
  for (let k = 0; k < 4; k++) {
    playDrum(ctx, tapeOut, "woodblock", tStart + 2.0 + k * 0.25, 0.06, { pan: 0 });
  }
}
