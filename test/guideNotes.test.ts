import { describe, expect, it } from "vitest"
import { guideNotes, MAX_GUIDE_PITCH, MIN_GUIDE_PITCH } from "../src/core/guideNotes.js"

describe("guideNotes", () => {
  it("emits every chord tone in every octave of the default guide range", () => {
    const notes = guideNotes("Cmaj", 4)
    expect(notes.every(n => [0, 4, 7].includes(n.pitch % 12))).toBe(true)
    expect(notes.filter(n => n.pitch % 12 === 0).map(n => n.pitch)).toEqual([48, 60, 72, 84])
  })

  it("stays within the guide range", () => {
    const notes = guideNotes("Am7", 4)
    expect(notes.every(n => n.pitch >= MIN_GUIDE_PITCH && n.pitch <= MAX_GUIDE_PITCH)).toBe(true)
  })

  it("respects a custom range", () => {
    const notes = guideNotes("Cmaj", 4, { low: 60, high: 72 })
    expect(notes.map(n => n.pitch)).toEqual([60, 64, 67, 72])
  })

  it("spans the full clip duration at velocity 127", () => {
    const notes = guideNotes("Am7", 8)
    expect(notes.every(n => n.startTime === 0 && n.duration === 8 && n.velocity === 127)).toBe(true)
  })

  it("covers all four tones of a seventh chord", () => {
    const chromas = new Set(guideNotes("G7", 1).map(n => n.pitch % 12))
    expect(chromas).toEqual(new Set([7, 11, 2, 5]))
  })

  it("returns empty for an unknown chord", () => {
    expect(guideNotes("???", 4)).toEqual([])
  })
})
