import { describe, expect, it } from "vitest"
import { beatPitches, detectBeatChord } from "../src/core/chordDetect.js"
import { chordNotes, note } from "./helpers.js"

describe("beatPitches", () => {
  it("includes a sustained note in every beat it overlaps", () => {
    const beats = beatPitches([note(60, 0, 4)], 0, 4)
    expect(beats).toEqual([[60], [60], [60], [60]])
  })

  it("excludes a note from the beat it ends on", () => {
    const beats = beatPitches([note(60, 0, 2)], 0, 4)
    expect(beats).toEqual([[60], [60], [], []])
  })

  it("returns sorted distinct pitches", () => {
    const beats = beatPitches([note(64, 0, 1), note(60, 0, 1), note(60, 0, 1)], 0, 1)
    expect(beats).toEqual([[60, 64]])
  })
})

describe("detectBeatChord", () => {
  it("detects a major triad", () => {
    const chord = detectBeatChord([60, 64, 67], null)
    expect(chord?.symbol).toBe("Cmaj")
    expect(chord?.chromas).toEqual(new Set([0, 4, 7]))
  })

  it("detects a minor triad", () => {
    expect(detectBeatChord([57, 60, 64], null)?.symbol).toBe("Am")
  })

  it("detects a dominant seventh", () => {
    expect(detectBeatChord([60, 64, 67, 70], null)?.symbol).toBe("C7")
  })

  it("detects a power chord", () => {
    expect(detectBeatChord([48, 55], null)?.symbol).toBe("C5")
  })

  it("returns null for a rest", () => {
    expect(detectBeatChord([], null)).toBeNull()
  })

  it("returns null for a lone pitch with no context", () => {
    expect(detectBeatChord([60], null)).toBeNull()
  })

  it("carries the previous chord when pitches are a subset of its tones", () => {
    const cmaj = detectBeatChord([60, 64, 67], null)
    expect(detectBeatChord([64], cmaj)).toBe(cmaj)
    expect(detectBeatChord([48, 76], cmaj)).toBe(cmaj)
  })

  it("re-detects when a pitch leaves the previous chord", () => {
    const cmaj = detectBeatChord([60, 64, 67], null)
    const next = detectBeatChord([57, 60, 64], cmaj)
    expect(next?.symbol).toBe("Am")
  })

  it("resolves first-inversion C major to Cmaj, not an E chord", () => {
    expect(detectBeatChord([52, 55, 60], null)?.symbol).toBe("Cmaj")
  })

  it("uses the bass to disambiguate Am7 vs C6", () => {
    expect(detectBeatChord([57, 60, 64, 67], null)?.symbol).toBe("Am7")
    expect(detectBeatChord([60, 64, 67, 69], null)?.symbol).toBe("C6")
  })
})
