import type { ClipView, KeyContext, SimpleNote } from "../src/core/types.js"

export const note = (pitch: number, startTime: number, duration: number): SimpleNote => ({
  pitch,
  startTime,
  duration,
})

export const chordNotes = (pitches: number[], startTime: number, duration: number): SimpleNote[] =>
  pitches.map(p => note(p, startTime, duration))

export const clipView = (notes: SimpleNote[], overrides: Partial<ClipView> = {}): ClipView => ({
  notes,
  startMarker: 0,
  endMarker: 16,
  looping: false,
  loopStart: 0,
  loopEnd: 16,
  ...overrides,
})

export const C_MAJOR: KeyContext = {
  rootChroma: 0,
  scaleName: "Major",
  scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
}

export const A_MINOR: KeyContext = {
  rootChroma: 9,
  scaleName: "Minor",
  scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
}

export const C_MINOR: KeyContext = {
  rootChroma: 0,
  scaleName: "Minor",
  scaleIntervals: [0, 2, 3, 5, 7, 8, 10],
}

export const F_LYDIAN: KeyContext = {
  rootChroma: 5,
  scaleName: "Lydian",
  scaleIntervals: [0, 2, 4, 6, 7, 9, 11],
}
