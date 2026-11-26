/**
 * Musical Score, Leitmotif & Modal Scales (`audio/score.js`).
 * 120 BPM (1 beat = 0.5s, 1 bar = 2.0s), root pitch D4 (MIDI 62).
 * Every era interprets the same 12-beat Pelican Theme in its cultural scale and timbre.
 */

import { midiToFreq } from "./dsp.js";

export const BPM = 120;
export const BEAT_SEC = 60 / BPM; // 0.5s
export const BAR_SEC = BEAT_SEC * 4; // 2.0s
export const ERA_DUR = 6.0; // 3 bars = 12 beats
export const ROOT_D4_MIDI = 62;

export const SCALES = {
  pentatonicMajor: [0, 2, 4, 7, 9], // D E F# A B
  saharaMinorPent: [0, 3, 5, 7, 10], // D F G A C
  hijazEgypt: [0, 1, 4, 5, 7, 8, 10], // D Eb F# G A Bb C
  ragaKhamaj: [0, 2, 4, 5, 7, 9, 10], // D E F# G A B C
  pelogGamelan: [0, 1, 3, 7, 8], // D Eb F A Bb
  diatonicMajor: [0, 2, 4, 5, 7, 9, 11], // D E F# G A B C#
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11], // D E F G A Bb C#
  yoJapanese: [0, 2, 5, 7, 9], // D E G A B
  hirajoshi: [0, 2, 3, 7, 8], // D E F A Bb
};

/**
 * 12-beat (3-bar) original Pelican Leitmotif:
 * [beatStart, durBeats, scaleDegree, octaveOffset, accent]
 */
export const PELICAN_MOTIF = [
  // Bar 1 (beats 0..4): jaunty walking arrival
  [0.0, 0.78, 0, 0, 0.96],
  [1.0, 0.45, 1, 0, 0.78],
  [1.5, 0.45, 2, 0, 0.85],
  [2.0, 0.92, 4, 0, 0.94],
  [3.0, 0.45, 2, 0, 0.76],
  [3.5, 0.45, 4, 0, 0.84],

  // Bar 2 (beats 4..8): comic era gag leap & turn
  [4.0, 0.82, 5, 0, 1.0],
  [5.0, 0.45, 4, 0, 0.86],
  [5.5, 0.45, 2, 0, 0.82],
  [6.0, 0.45, 1, 0, 0.80],
  [6.5, 0.45, 2, 0, 0.85],
  [7.0, 0.88, 4, 0, 0.92],

  // Bar 3 (beats 8..12): forward cadence driving into the next portal
  [8.0, 0.78, 2, 0, 0.90],
  [9.0, 0.45, 1, 0, 0.80],
  [9.5, 0.45, 0, 0, 0.86],
  [10.0, 0.45, -1, 0, 0.78],
  [10.5, 0.45, 0, 0, 0.84],
  [11.0, 0.82, 1, 0, 0.88],
];

/**
 * Supporting 3-bar bass / drone roots [beatStart, durBeats, scaleDegree].
 */
export const BASS_PROGRESSION = [
  [0.0, 2.0, 0],
  [2.0, 2.0, 3],
  [4.0, 2.0, 4],
  [6.0, 2.0, 3],
  [8.0, 2.0, 0],
  [10.0, 1.0, 4],
  [11.0, 1.0, 0],
];

/**
 * Maps an arbitrary integer scale degree (including negatives and > scale.length)
 * cleanly to a MIDI note anchored at `rootMidi`.
 */
export function scaleDegreeToMidi(scale, degree, octaveOffset = 0, rootMidi = ROOT_D4_MIDI) {
  const n = scale.length;
  const octShift = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return rootMidi + (octShift + octaveOffset) * 12 + scale[idx];
}

export function scaleDegreeToFreq(scale, degree, octaveOffset = 0, rootMidi = ROOT_D4_MIDI) {
  return midiToFreq(scaleDegreeToMidi(scale, degree, octaveOffset, rootMidi));
}

/**
 * Builds resolved frequency/time note events for one 3-bar era block starting at `tStart`.
 */
export function buildMotifNotes(tStart, scale, opts = {}) {
  const {
    octaveOffset = 0,
    rootMidi = ROOT_D4_MIDI,
    beatSec = BEAT_SEC,
    motif = PELICAN_MOTIF,
  } = opts;
  return motif.map(([b0, durB, deg, oct, vel]) => ({
    t0: tStart + b0 * beatSec,
    dur: durB * beatSec,
    freq: scaleDegreeToFreq(scale, deg, oct + octaveOffset, rootMidi),
    midi: scaleDegreeToMidi(scale, deg, oct + octaveOffset, rootMidi),
    vel,
    beat: b0,
  }));
}
