import { describe, expect, it } from "vitest"
import { guideNotes, MAX_GUIDE_PITCH, MIN_GUIDE_PITCH } from "../src/core/guideNotes.js"

describe("guideNotes", () => {
  it("emits every chord tone in every octave of the guide range", () => {
    const notes = guideNotes("Cmaj", 4)
    expect(notes.every(n => [0, 4, 7].includes(n.pitch % 12))).toBe(true)
    expect(notes.filter(n => n.pitch % 12 === 0).map(n => n.pitch)).toEqual([36, 48, 60, 72, 84, 96])
  })

  it("stays within the musical guide range", () => {
    const notes = guideNotes("Am7", 4)
    expect(notes.every(n => n.pitch >= MIN_GUIDE_PITCH && n.pitch <= MAX_GUIDE_PITCH)).toBe(true)
  })

  it("spans the full clip duration at velocity 100", () => {
    const notes = guideNotes("Am7", 8)
    expect(notes.every(n => n.startTime === 0 && n.duration === 8 && n.velocity === 100)).toBe(true)
  })

  it("covers all four tones of a seventh chord", () => {
    const chromas = new Set(guideNotes("G7", 1).map(n => n.pitch % 12))
    expect(chromas).toEqual(new Set([7, 11, 2, 5]))
  })

  it("returns empty for an unknown chord", () => {
    expect(guideNotes("???", 4)).toEqual([])
  })
})
